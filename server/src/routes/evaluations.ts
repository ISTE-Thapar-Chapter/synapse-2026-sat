import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, requireRole } from '../middleware/roles.js';
import { StageService } from '../services/stageService.js';
import { LeaseService } from '../services/leaseService.js';
import { Evaluation } from '../models/Evaluation.js';
import { Submission } from '../models/Submission.js';
import { Team } from '../models/Team.js';
import { logAudit } from '../services/auditService.js';
import { EvaluationSubmitSchema, ScoreCorrectionSchema } from '../schemas/validation.js';

const router = Router();
router.use(requireAuth, requireRole(['evaluator', 'mentor', 'admin']));

/**
 * Get evaluation queue for the current stage
 */
router.get('/queue', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const evaluatorEmail = req.user!.email;
    const stageQuery = req.query.stage as string;

    // Evaluators evaluate teams when they submit their company names and feature set methodologies ('requirements')
    const evalStage = stageQuery === 'cleaning' ? 'cleaning' : 'requirements';

    // 1. Eligible teams
    const eligibleTeams = await Team.find({ disqualified: false }).select('teamName college disqualified');
    const eligibleTeamIds = eligibleTeams.map((t) => t._id);

    // 2. Submissions submitted - fetch both cleaning and requirements/model-training submissions
    const [cleaningSubs, reqSubs, evaluations] = await Promise.all([
      Submission.find({ stage: 'cleaning', teamId: { $in: eligibleTeamIds } }),
      Submission.find({ stage: { $in: ['requirements', 'model-training'] }, teamId: { $in: eligibleTeamIds } }),
      Evaluation.find({ stage: { $in: [evalStage, 'requirements', 'model-training', 'cleaning'] }, targetTeamId: { $in: eligibleTeamIds } }),
    ]);

    const cleaningMap = new Map(cleaningSubs.map((s) => [s.teamId.toString(), s]));
    const reqMap = new Map(reqSubs.map((s) => [s.teamId.toString(), s]));
    const evalMap = new Map(evaluations.map((e) => [e.targetTeamId.toString(), e]));

    const now = new Date();

    const targets = eligibleTeams
      .filter((team) => {
        const teamIdStr = team._id.toString();
        const cSub = cleaningMap.get(teamIdStr);
        const rSub = reqMap.get(teamIdStr);
        // Include any team that submitted cleaning, submitted requirements, or has a mentor evaluation
        return (cSub && cSub.status === 'submitted') || (rSub && rSub.status === 'submitted') || rSub?.payload?.mentorEvaluation;
      })
      .map((team) => {
        const teamIdStr = team._id.toString();
        const cSub = cleaningMap.get(teamIdStr);
        const rSub = reqMap.get(teamIdStr);
        const existingEval = evalMap.get(teamIdStr);

        const mergedPayload = {
          cleanedDatasetUrl: cSub?.payload?.cleanedDatasetUrl || rSub?.payload?.cleanedDatasetUrl || '',
          cleaningNotes: cSub?.payload?.cleaningNotes || rSub?.payload?.cleaningNotes || '',
          mentorEvaluation: rSub?.payload?.mentorEvaluation || cSub?.payload?.mentorEvaluation || null,
          requirements: rSub?.payload?.requirements || [],
          companyName: rSub?.payload?.companyName || '',
          methodologySummary: rSub?.payload?.methodologySummary || '',
          generalNotes: rSub?.payload?.generalNotes || '',
        };

        const submittedAt = rSub?.submittedAt || cSub?.submittedAt || null;
        const submissionId = rSub?._id || cSub?._id || null;

        let leaseStatus: 'available' | 'leased_to_me' | 'locked_by_other' | 'completed' = 'available';
        let leaseExpiresInSec = 0;

        if (existingEval) {
          if (existingEval.status === 'completed') {
            leaseStatus = 'completed';
          } else if (existingEval.leaseExpiresAt && existingEval.leaseExpiresAt > now) {
            if (existingEval.evaluatorEmail === evaluatorEmail) {
              leaseStatus = 'leased_to_me';
              leaseExpiresInSec = Math.max(0, Math.floor((existingEval.leaseExpiresAt.getTime() - now.getTime()) / 1000));
            } else {
              leaseStatus = 'locked_by_other';
            }
          }
        }

        return {
          teamId: team._id.toString(),
          teamName: team.teamName,
          college: team.college,
          submissionId,
          submittedAt,
          payload: mergedPayload,
          evaluationId: existingEval?._id || null,
          score: existingEval?.score ?? null,
          feedback: existingEval?.feedback ?? null,
          leaseStatus,
          leaseExpiresInSec,
          evaluatorEmail: existingEval?.evaluatorEmail || null,
        };
      });

    return res.json({
      activeStage: evalStage,
      evaluatorEmail,
      targets,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Acquire evaluator lease
 */
router.post('/lease/acquire', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const evaluatorEmail = req.user!.email;
    const { targetTeamId, stage } = req.body;
    const evalStage = stage === 'cleaning' ? 'cleaning' : 'requirements';

    const result = await LeaseService.acquireLease(
      evalStage,
      evaluatorEmail,
      targetTeamId
    );

    if (!result.success) {
      return res.status(409).json({ error: result.message });
    }

    const team = await Team.findById(result.evaluation!.targetTeamId).select('teamName college');
    const [cleaningSub, reqSub] = await Promise.all([
      Submission.findOne({ stage: 'cleaning', teamId: result.evaluation!.targetTeamId }),
      Submission.findOne({ stage: { $in: ['requirements', 'model-training'] }, teamId: result.evaluation!.targetTeamId }),
    ]);

    const mergedPayload = {
      cleanedDatasetUrl: cleaningSub?.payload?.cleanedDatasetUrl || reqSub?.payload?.cleanedDatasetUrl || '',
      cleaningNotes: cleaningSub?.payload?.cleaningNotes || reqSub?.payload?.cleaningNotes || '',
      mentorEvaluation: reqSub?.payload?.mentorEvaluation || cleaningSub?.payload?.mentorEvaluation || null,
      requirements: reqSub?.payload?.requirements || [],
      companyName: reqSub?.payload?.companyName || '',
      methodologySummary: reqSub?.payload?.methodologySummary || '',
      generalNotes: reqSub?.payload?.generalNotes || '',
    };

    const hydratedEvaluation = {
      evaluationId: result.evaluation!._id,
      _id: result.evaluation!._id,
      stage: result.evaluation!.stage,
      teamId: result.evaluation!.targetTeamId?._id?.toString() || result.evaluation!.targetTeamId?.toString(),
      teamName: team?.teamName || (result.evaluation!.targetTeamId as any)?.teamName || 'Team',
      college: team?.college || '',
      status: result.evaluation!.status,
      score: result.evaluation!.score,
      feedback: result.evaluation!.feedback,
      leaseExpiresAt: result.evaluation!.leaseExpiresAt,
      evaluatorEmail: result.evaluation!.evaluatorEmail,
      payload: mergedPayload,
    };

    return res.json({
      message: 'Evaluator lease acquired successfully.',
      evaluation: hydratedEvaluation,
      submission: reqSub || cleaningSub,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Explicitly release lease
 */
router.post('/lease/release', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { evaluationId } = req.body;
    if (!evaluationId) {
      return res.status(400).json({ error: 'evaluationId is required' });
    }

    const isAdmin = req.user!.role === 'admin';
    const result = await LeaseService.releaseLease(evaluationId, req.user!.email, isAdmin);

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    return res.json({ message: 'Evaluator lease released successfully.' });
  } catch (err) {
    next(err);
  }
});

/**
 * Submit score and feedback (atomically completes evaluation and releases lease)
 */
router.post('/submit', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { evaluationId, score, feedback } = req.body;
    const parsed = EvaluationSubmitSchema.parse({ score: Number(score), feedback });

    const isAdmin = req.user!.role === 'admin';
    const result = await LeaseService.completeEvaluation(
      evaluationId,
      req.user!.email,
      parsed.score,
      parsed.feedback,
      isAdmin
    );

    if (!result.success) {
      return res.status(403).json({ error: result.message });
    }

    return res.json({
      message: 'Evaluation completed and lease released successfully.',
      evaluation: result.evaluation,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Admin score correction
 */
router.post('/:id/correct', requireRole(['admin']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const parsed = ScoreCorrectionSchema.parse(req.body);

    const evaluation = await Evaluation.findById(id).populate('targetTeamId', 'teamName');
    if (!evaluation) {
      return res.status(404).json({ error: 'Evaluation not found' });
    }

    const oldScore = evaluation.score;
    evaluation.score = parsed.newScore;
    evaluation.correctionHistory.push({
      modifiedBy: req.user!.email,
      oldScore,
      newScore: parsed.newScore,
      reason: parsed.reason,
      timestamp: new Date(),
    });

    await evaluation.save();

    await logAudit(
      req.user!.email,
      'EVALUATION_SCORE_CORRECTED',
      'Evaluation',
      evaluation._id.toString(),
      {
        targetTeam: (evaluation.targetTeamId as any)?.teamName,
        oldScore,
        newScore: parsed.newScore,
      },
      parsed.reason
    );

    return res.json({
      message: 'Score corrected successfully and logged to audit trail.',
      evaluation,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * View evaluation history
 */
router.get('/history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { stage } = req.query;
    const query: any = {};
    if (stage) query.stage = stage;

    const evaluations = await Evaluation.find(query)
      .populate('targetTeamId', 'teamName')
      .populate('submissionId')
      .sort({ completedAt: -1, createdAt: -1 });

    return res.json(evaluations);
  } catch (err) {
    next(err);
  }
});

export default router;
