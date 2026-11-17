import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, requireTeamLeader, requireRole } from '../middleware/roles.js';
import { StageService } from '../services/stageService.js';
import { Submission, ISubmissionPayload } from '../models/Submission.js';
import { CompanyAssignment } from '../models/CompanyAssignment.js';
import { CompetitionConfig } from '../models/CompetitionConfig.js';
import { logAudit } from '../services/auditService.js';
import {
  CleaningSubmissionSchema,
  RequirementsSubmissionSchema,
  ModelTrainingSubmissionSchema,
  FinalSubmissionSchema,
  ReopenSubmissionSchema,
} from '../schemas/validation.js';

const router = Router();
router.use(requireAuth);

/**
 * Get current team workspace context:
 * - isEventStarted
 * - Single dataset (ONLY visible if event is started)
 * - 5 Requirement titles (ONLY visible after cleaning submission is submitted)
 * - Submissions for cleaning & requirements
 */
router.get('/current', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const activeStage = await StageService.getActiveStage();
    const team = req.team;

    let config = await CompetitionConfig.findOne();
    if (!config) {
      config = await CompetitionConfig.create({});
    }

    const isEventStarted = !!config.isEventStarted || activeStage !== 'registration';

    if (!team) {
      return res.json({
        isEventStarted,
        activeStage,
        hasTeam: false,
        message: 'No team linked to your account.',
      });
    }

    // Submissions
    const cleaningSubmission = await Submission.findOne({
      stage: 'cleaning',
      teamId: team._id,
    });

    const requirementsSubmission = await Submission.findOne({
      stage: { $in: ['requirements', 'model-training'] },
      teamId: team._id,
    });

    const hasSubmittedCleaning = cleaningSubmission?.status === 'submitted';
    const hasSubmittedRequirements = requirementsSubmission?.status === 'submitted';

    // Single cleaning dataset: ONLY accessible if event is started
    let cleaningDataset = null;
    if (isEventStarted) {
      cleaningDataset = {
        title: config.cleaningDatasetTitle,
        fileUrl: config.cleaningDatasetUrl,
        description: config.cleaningDatasetDescription,
      };
    }

    // 5 Requirement titles: ONLY revealed after cleaned dataset & techniques are submitted
    let requirements: string[] = [];
    if (hasSubmittedCleaning) {
      requirements = config.requirementTitles || [];
    }

    // Resolve assigned company if any
    let assignedCompany = null;
    const companyRecord = await CompanyAssignment.findOne({ published: true });
    if (companyRecord) {
      assignedCompany = companyRecord.assignments.find(
        (a) => a.teamId.toString() === team._id.toString()
      );
    }

    return res.json({
      isEventStarted,
      activeStage,
      team,
      isLeader: req.isLeader,
      isDisqualified: team.disqualified,
      isRestricted: !!req.participant?.restricted,
      cleaningDataset,
      hasSubmittedCleaning,
      hasSubmittedRequirements,
      cleaningSubmission,
      requirementsSubmission,
      requirements,
      submission: !hasSubmittedCleaning ? cleaningSubmission : requirementsSubmission,
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
    let config = await CompetitionConfig.findOne();
    if (!config) config = await CompetitionConfig.create({});

    const activeStage = await StageService.getActiveStage();
    const isEventStarted = !!config.isEventStarted || activeStage !== 'registration';

    if (!isEventStarted) {
      return res.status(400).json({ error: 'Event Not Started', message: 'The event has not started yet.' });
    }

    const team = req.team!;
    const requestedStage = req.body.stage || (req.body.payload?.requirements ? 'requirements' : 'cleaning');
    const stage = requestedStage === 'requirements' ? 'requirements' : 'cleaning';
    const payload: ISubmissionPayload = req.body.payload || req.body;

    // Check pre-condition for requirements draft
    if (stage === 'requirements') {
      const cleanSub = await Submission.findOne({ stage: 'cleaning', teamId: team._id, status: 'submitted' });
      if (!cleanSub) {
        return res.status(400).json({
          error: 'Prerequisite Required',
          message: 'You must submit your cleaned dataset before editing the five requirements.',
        });
      }
    }

    let submission = await Submission.findOne({ stage, teamId: team._id });
    if (submission && submission.isLocked) {
      return res.status(403).json({
        error: 'Submission Locked',
        message: 'This submission has already been finalized and submitted.',
      });
    }

    if (!submission) {
      submission = new Submission({
        stage,
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
    let config = await CompetitionConfig.findOne();
    if (!config) config = await CompetitionConfig.create({});

    const activeStage = await StageService.getActiveStage();
    const isEventStarted = !!config.isEventStarted || activeStage !== 'registration';

    if (!isEventStarted) {
      return res.status(400).json({ error: 'Event Not Started', message: 'The event has not started yet.' });
    }

    const team = req.team!;
    const rawPayload = req.body.payload || req.body;
    const requestedStage = req.body.stage || (rawPayload.requirements ? 'requirements' : 'cleaning');
    const stage = requestedStage === 'requirements' ? 'requirements' : 'cleaning';

    let validatedPayload: any;
    if (stage === 'cleaning') {
      validatedPayload = CleaningSubmissionSchema.parse(rawPayload);
    } else if (stage === 'requirements') {
      const cleanSub = await Submission.findOne({ stage: 'cleaning', teamId: team._id, status: 'submitted' });
      if (!cleanSub) {
        return res.status(400).json({
          error: 'Prerequisite Required',
          message: 'You must submit your cleaned dataset before submitting requirements.',
        });
      }
      validatedPayload = RequirementsSubmissionSchema.parse(rawPayload);
    }

    const now = new Date();
    let submission = await Submission.findOne({
      stage,
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
        stage,
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
        stage,
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
