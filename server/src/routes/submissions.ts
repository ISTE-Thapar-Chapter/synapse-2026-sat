import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, requireTeamLeader, requireRole } from '../middleware/roles.js';
import { StageService } from '../services/stageService.js';
import { Submission, ISubmissionPayload } from '../models/Submission.js';
import { CompanyAssignment } from '../models/CompanyAssignment.js';
import { CompetitionConfig } from '../models/CompetitionConfig.js';
import { RoundRobinQueue } from '../models/RoundRobinQueue.js';
import { QuizScore } from '../models/QuizScore.js';
import { logAudit } from '../services/auditService.js';
import {
  CleaningSubmissionSchema,
  RequirementsSubmissionSchema,
  FeaturesSubmissionSchema,
  FinalProjectSubmissionSchema,
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
 * - Submissions for cleaning, requirements (5 features), and final project
 * - Assigned companies (from Round 1 selection and Auction)
 * - hasSelectedTwoCompanies
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

    const finalSubmission = await Submission.findOne({
      stage: 'final-submission',
      teamId: team._id,
    });

    const hasSubmittedCleaning = cleaningSubmission?.status === 'submitted';
    const hasSubmittedRequirements = requirementsSubmission?.status === 'submitted';
    const hasSubmittedFinal = finalSubmission?.status === 'submitted';

    // Single cleaning dataset: ONLY accessible if event is started
    let cleaningDataset = null;
    if (isEventStarted) {
      cleaningDataset = {
        title: config.cleaningDatasetTitle,
        fileUrl: config.cleaningDatasetUrl,
        description: config.cleaningDatasetDescription,
      };
    }

    // Validation Dataset: ONLY provided if team has submitted cleaning AND mentor has released it for this specific team
    const isValidationDatasetReleased = !!team.validationDatasetReleased;
    let validationDataset = null;
    if (hasSubmittedCleaning && isValidationDatasetReleased) {
      const vUrl = config.validationDatasetUrl || 'https://datasets.iste.org/synapse/validation/satellite-val-v1.parquet';
      validationDataset = {
        title: config.validationDatasetTitle || 'Satellite Sensor Validation Dataset',
        fileUrl: vUrl,
        url: vUrl,
        description: config.validationDatasetDescription || 'Official validation dataset used for evaluating accuracy and confidence metrics.',
      };
    }

    // 5 Requirement titles: ONLY revealed after cleaned dataset is submitted
    let requirements: string[] = [];
    if (hasSubmittedCleaning) {
      requirements = config.requirementTitles || [];
    }

    // Resolve assigned companies (from Round 1 selection and Auction / Round 2)
    const assignedCompanies: Array<{
      id: string;
      name: string;
      description: string;
      source: string;
    }> = [];

    // Check Queue 1
    const q1 = await RoundRobinQueue.findOne({ queueNumber: 1 });
    if (q1) {
      const qTeam = q1.teams.find((t) => t.teamId.toString() === team._id.toString());
      if (qTeam && qTeam.hasSelected && qTeam.selectedCompanyName) {
        assignedCompanies.push({
          id: qTeam.selectedCompanyId || 'q1_selected',
          name: qTeam.selectedCompanyName,
          description: qTeam.selectedCompanyDescription || 'Selected in Round 1',
          source: 'Selection Round 1',
        });
      }
    }

    // Check Queue 2 / Auction from QuizScore
    const quizScore = await QuizScore.findOne({ teamId: team._id });
    if (quizScore?.assignedCompanies?.auctionCompany?.name) {
      const ac = quizScore.assignedCompanies.auctionCompany;
      assignedCompanies.push({
        id: ac.id || 'auction_won',
        name: ac.name,
        description: ac.description || `Won in live auction for ${ac.price} tokens`,
        source: 'Live Auction',
      });
    } else {
      // Also check Queue 2
      const q2 = await RoundRobinQueue.findOne({ queueNumber: 2 });
      if (q2) {
        const q2Team = q2.teams.find((t) => t.teamId.toString() === team._id.toString());
        if (q2Team && q2Team.hasSelected && q2Team.selectedCompanyName) {
          assignedCompanies.push({
            id: q2Team.selectedCompanyId || 'q2_selected',
            name: q2Team.selectedCompanyName,
            description: q2Team.selectedCompanyDescription || 'Selected in Round 2',
            source: 'Selection Round 2',
          });
        }
      }
    }

    // Legacy published company assignment fallback
    if (assignedCompanies.length === 0) {
      const companyRecord = await CompanyAssignment.findOne({ published: true });
      if (companyRecord) {
        const match = companyRecord.assignments.find((a) => a.teamId.toString() === team._id.toString());
        if (match) {
          assignedCompanies.push({
            id: 'legacy_assigned',
            name: match.companyName,
            description: 'Assigned company',
            source: 'Assignment',
          });
        }
      }
    }

    const hasSelectedTwoCompanies = assignedCompanies.length >= 2;

    return res.json({
      isEventStarted,
      activeStage,
      team,
      isLeader: req.isLeader,
      isDisqualified: team.disqualified,
      isRestricted: !!req.participant?.restricted,
      cleaningDataset,
      validationDataset,
      isValidationDatasetReleased,
      hasSubmittedCleaning,
      hasSubmittedRequirements,
      hasSubmittedFinal,
      cleaningSubmission,
      requirementsSubmission,
      finalSubmission,
      requirements,
      submission: !hasSubmittedCleaning
        ? cleaningSubmission
        : !hasSubmittedRequirements
        ? requirementsSubmission
        : finalSubmission || requirementsSubmission,
      assignedCompanies,
      assignedCompany: assignedCompanies[0] || null,
      hasSelectedTwoCompanies,
      finalSubmissionOpen: !!config.finalSubmissionOpen,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Download validation dataset (strictly returns link ONLY if mentor released it for this specific team)
 */
router.get('/validation-dataset', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const team = req.team;
    if (!team) {
      return res.status(403).json({ error: 'No team linked to your account.' });
    }

    const cleaningSubmission = await Submission.findOne({
      stage: 'cleaning',
      teamId: team._id,
      status: 'submitted',
    });

    if (!cleaningSubmission) {
      return res.status(403).json({
        error: 'Prerequisite Required',
        message: 'You must submit your cleaned dataset before accessing the validation dataset.',
        released: false,
      });
    }

    if (!team.validationDatasetReleased) {
      return res.status(403).json({
        error: 'Validation Dataset Locked',
        message: 'The validation dataset has not been released for your team yet. Your mentor must review your cleaned dataset and release it specifically for your team.',
        released: false,
      });
    }

    let config = await CompetitionConfig.findOne();
    if (!config) config = await CompetitionConfig.create({});

    const vUrl = config.validationDatasetUrl || 'https://datasets.iste.org/synapse/validation/satellite-val-v1.parquet';
    return res.json({
      released: true,
      title: config.validationDatasetTitle || 'Satellite Sensor Validation Dataset',
      fileUrl: vUrl,
      url: vUrl,
      description: config.validationDatasetDescription || 'Official validation dataset used for evaluating accuracy and confidence metrics.',
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
    const rawPayload = req.body.payload || req.body;
    let requestedStage = req.body.stage;
    if (!requestedStage) {
      if (rawPayload.finalSubmission || rawPayload.productName) {
        requestedStage = 'final-submission';
      } else if (rawPayload.features || rawPayload.requirements) {
        requestedStage = 'requirements';
      } else {
        requestedStage = 'cleaning';
      }
    }
    const stage = requestedStage === 'final-submission' ? 'final-submission' : requestedStage === 'requirements' ? 'requirements' : 'cleaning';
    const payload: ISubmissionPayload = rawPayload;

    // Check pre-conditions
    if (stage === 'requirements') {
      const cleanSub = await Submission.findOne({ stage: 'cleaning', teamId: team._id, status: 'submitted' });
      if (!cleanSub) {
        return res.status(400).json({
          error: 'Prerequisite Required',
          message: 'You must submit your cleaned dataset before editing the five requirements.',
        });
      }
    } else if (stage === 'final-submission') {
      const reqSub = await Submission.findOne({ stage: 'requirements', teamId: team._id, status: 'submitted' });
      if (!reqSub) {
        return res.status(400).json({
          error: 'Prerequisite Required',
          message: 'You must submit your feature identifications before editing the final project submission.',
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
    let requestedStage = req.body.stage;
    if (!requestedStage) {
      if (rawPayload.finalSubmission || rawPayload.productName) {
        requestedStage = 'final-submission';
      } else if (rawPayload.features || rawPayload.requirements) {
        requestedStage = 'requirements';
      } else {
        requestedStage = 'cleaning';
      }
    }
    const stage = requestedStage === 'final-submission' ? 'final-submission' : requestedStage === 'requirements' ? 'requirements' : 'cleaning';

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
      if (rawPayload.features && Array.isArray(rawPayload.features)) {
        validatedPayload = FeaturesSubmissionSchema.parse(rawPayload);
      } else {
        validatedPayload = RequirementsSubmissionSchema.parse(rawPayload);
      }

      // Default accuracy and confidence score are 0, which mentors will fill up
      validatedPayload = {
        ...validatedPayload,
        mentorEvaluation: {
          mentorId: null,
          mentorName: 'Pending Mentor Review',
          featureGrades: [],
          totalFeatureMarks: 0,
          totalMarks: 0,
          overallAccuracyScore: 0,
          overallConfidenceScore: 0,
          feedback: 'Awaiting mentor review.',
          gradedAt: new Date(),
          isAutoCalculated: false,
        },
      };
    } else if (stage === 'final-submission') {
      if (!config.finalSubmissionOpen) {
        return res.status(403).json({
          error: 'Submissions Closed',
          message: 'Final project pitch submissions are not open yet. Administrators will enable submissions once the auction concludes.',
        });
      }

      const reqSub = await Submission.findOne({ stage: 'requirements', teamId: team._id, status: 'submitted' });
      if (!reqSub) {
        return res.status(400).json({
          error: 'Prerequisite Required',
          message: 'You must submit your feature identifications before submitting your final project.',
        });
      }

      // Verify that team has selected both companies
      let assignedCount = 0;
      const q1 = await RoundRobinQueue.findOne({ queueNumber: 1 });
      if (q1?.teams?.some((t) => t.teamId.toString() === team._id.toString() && t.hasSelected)) {
        assignedCount++;
      }
      const qScore = await QuizScore.findOne({ teamId: team._id });
      if (qScore?.assignedCompanies?.auctionCompany?.name) {
        assignedCount++;
      }
      if (assignedCount < 2) {
        return res.status(400).json({
          error: 'Prerequisite Required',
          message: 'Your team must acquire both partner organizations (Round 1 Selection and Auction) before submitting your final project pitch.',
        });
      }

      const parsedFinal = FinalProjectSubmissionSchema.parse(rawPayload.finalSubmission || rawPayload);
      validatedPayload = {
        ...parsedFinal,
        finalSubmission: {
          ...parsedFinal,
          submittedAt: new Date(),
        },
      };
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
