import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, requireTeamLeader, requireRole } from '../middleware/roles.js';
import { StageService } from '../services/stageService.js';
import { Submission, ISubmissionPayload } from '../models/Submission.js';
import { CompanyAssignment } from '../models/CompanyAssignment.js';
import { CompetitionConfig } from '../models/CompetitionConfig.js';
import { logAudit } from '../services/auditService.js';
import {
  CleaningSubmissionSchema,
  ModelTrainingSubmissionSchema,
  FinalSubmissionSchema,
  ReopenSubmissionSchema,
} from '../schemas/validation.js';

const router = Router();
router.use(requireAuth);

/**
 * Get current team workspace context:
 * - Active stage
 * - Single dataset (ONLY visible if admin has started cleaning stage)
 * - 5 Requirement titles (ONLY visible after cleaning submission is submitted)
 */
router.get('/current', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const activeStage = await StageService.getActiveStage();
    const team = req.team;

    if (!team) {
      return res.json({
        activeStage,
        hasTeam: false,
        message: 'No team linked to your account.',
      });
    }

    // Get competition config for single dataset and requirements
    let config = await CompetitionConfig.findOne();
    if (!config) {
      config = await CompetitionConfig.create({});
    }

    // Submission for current active stage
    const currentSubmission = await Submission.findOne({
      stage: activeStage as any,
      teamId: team._id,
    });

    // Check if cleaning round was submitted by this team
    const cleaningSubmission = await Submission.findOne({
      stage: 'cleaning',
      teamId: team._id,
      status: 'submitted',
    });

    // Single cleaning dataset: ONLY accessible if stage is cleaning or later
    let cleaningDataset = null;
    const isCleaningOrLater = activeStage !== 'registration';
    if (isCleaningOrLater) {
      cleaningDataset = {
        title: config.cleaningDatasetTitle,
        fileUrl: config.cleaningDatasetUrl,
        description: config.cleaningDatasetDescription,
      };
    }

    // 5 Requirement titles: ONLY revealed after cleaned dataset & techniques are submitted
    let requirements: string[] = [];
    if (cleaningSubmission) {
      requirements = config.requirementTitles || [];
    }

    // If final-submission / ranking, resolve assigned company
    let assignedCompany = null;
    if (activeStage === 'final-submission' || activeStage === 'ranking') {
      const companyRecord = await CompanyAssignment.findOne({ published: true });
      if (companyRecord) {
        assignedCompany = companyRecord.assignments.find(
          (a) => a.teamId.toString() === team._id.toString()
        );
      }
    }

    return res.json({
      activeStage,
      team,
      isLeader: req.isLeader,
      isDisqualified: team.disqualified,
      isRestricted: !!req.participant?.restricted,
      submission: currentSubmission,
      cleaningDataset,
      hasSubmittedCleaning: !!cleaningSubmission,
      requirements,
      assignedCompany,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Save draft (leader only)
 */
router.put('/draft', requireTeamLeader, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const activeStage = await StageService.getActiveStage();
    if (!['cleaning', 'model-training', 'final-submission'].includes(activeStage)) {
      return res.status(400).json({ error: `Submissions are not accepted during stage '${activeStage}'.` });
    }

    const team = req.team!;
    const payload: ISubmissionPayload = req.body.payload || req.body;

    let submission = await Submission.findOne({ stage: activeStage as any, teamId: team._id });
    if (submission && submission.isLocked) {
      return res.status(403).json({
        error: 'Submission Locked',
        message: 'This submission has already been finalized and submitted.',
      });
    }

    if (!submission) {
      submission = new Submission({
        stage: activeStage as any,
        teamId: team._id,
        status: 'draft',
        payload,
        isLocked: false,
      });
    } else {
      submission.payload = { ...submission.payload, ...payload };
    }

    await submission.save();

    return res.json({
      message: 'Draft saved successfully.',
      submission,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Submit final response (leader only)
 */
router.post('/submit', requireTeamLeader, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const activeStage = await StageService.getActiveStage();
    if (!['cleaning', 'model-training', 'final-submission'].includes(activeStage)) {
      return res.status(400).json({ error: `Submissions are not accepted during stage '${activeStage}'.` });
    }

    const team = req.team!;
    const rawPayload = req.body.payload || req.body;

    let validatedPayload: any;
    if (activeStage === 'cleaning') {
      validatedPayload = CleaningSubmissionSchema.parse(rawPayload);
    } else if (activeStage === 'model-training') {
      validatedPayload = ModelTrainingSubmissionSchema.parse(rawPayload);
    } else if (activeStage === 'final-submission') {
      validatedPayload = FinalSubmissionSchema.parse(rawPayload);
    }

    const now = new Date();
    let submission = await Submission.findOne({
      stage: activeStage as any,
      teamId: team._id,
    });

    if (submission && submission.isLocked) {
      return res.status(403).json({
        error: 'Already Submitted',
        message: 'This submission has already been received.',
      });
    }

    if (!submission) {
      submission = new Submission({
        stage: activeStage as any,
        teamId: team._id,
      });
    }

    submission.status = 'submitted';
    submission.payload = validatedPayload;
    submission.isLocked = true;
    submission.submittedAt = now;
    submission.submittedBy = req.participant?._id || null;
    await submission.save();

    await logAudit(
      req.user!.email,
      'SUBMISSION_SUBMITTED',
      'Submission',
      submission._id.toString(),
      {
        stage: activeStage,
        teamId: team._id.toString(),
        teamName: team.teamName,
        submittedAt: now,
      }
    );

    return res.json({
      message: 'Submitted successfully.',
      submission,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Admin reopen submission
 */
router.post('/:id/reopen', requireRole(['admin']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const parsed = ReopenSubmissionSchema.parse(req.body);

    const submission = await Submission.findById(id).populate('teamId', 'teamName');
    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    submission.isLocked = false;
    submission.status = 'draft';
    submission.reopenHistory.push({
      reopenedBy: req.user!.email,
      reason: parsed.reason,
      reopenedAt: new Date(),
    });

    await submission.save();

    await logAudit(
      req.user!.email,
      'SUBMISSION_REOPENED',
      'Submission',
      submission._id.toString(),
      {
        stage: submission.stage,
        teamId: submission.teamId,
      },
      parsed.reason
    );

    return res.json({
      message: 'Submission reopened for team.',
      submission,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
