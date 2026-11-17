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
router.use(requireAuth, requireRole(['evaluator', 'admin']));

/**
 * Get evaluation queue for the current stage
 */
router.get('/queue', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const activeStage = await StageService.getActiveStage();
    const evaluatorEmail = req.user!.email;

    if (!['cleaning', 'model-training'].includes(activeStage)) {
      return res.json({
        activeStage,
        targets: [],
        message: `Evaluations are only active during 'cleaning' and 'model-training' stages. Current stage is '${activeStage}'.`,
      });
    }

    // 1. Eligible teams
    const eligibleTeams = await Team.find({ disqualified: false });
    const eligibleTeamIds = eligibleTeams.map((t) => t._id);

    // 2. Submissions submitted
    const submissions = await Submission.find({
      stage: activeStage as any,
      status: 'submitted',
      teamId: { $in: eligibleTeamIds },
    }).populate('teamId', 'teamName disqualified');

    // 3. Existing evaluations for this stage
    const evaluations = await Evaluation.find({
      stage: activeStage as any,
      targetTeamId: { $in: eligibleTeamIds },
    });

    const now = new Date();
    const evalMap = new Map(evaluations.map((e) => [e.targetTeamId.toString(), e]));

    const targets = submissions.map((sub) => {
      const teamIdStr = (sub.teamId as any)._id.toString();
      const existingEval = evalMap.get(teamIdStr);

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
        teamId: (sub.teamId as any)._id,
        teamName: (sub.teamId as any).teamName,
        submissionId: sub._id,
        submittedAt: sub.submittedAt,
        payload: sub.payload,
        evaluationId: existingEval?._id || null,
        score: existingEval?.score ?? null,
        feedback: existingEval?.feedback ?? null,
        leaseStatus,
        leaseExpiresInSec,
        evaluatorEmail: existingEval?.evaluatorEmail || null,
      };
    });

    return res.json({
      activeStage,
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
    const activeStage = await StageService.getActiveStage();
    const evaluatorEmail = req.user!.email;
    const { targetTeamId } = req.body;

    if (!['cleaning', 'model-training'].includes(activeStage)) {
      return res.status(400).json({ error: 'Evaluations are not currently active.' });
    }

    const result = await LeaseService.acquireLease(
      activeStage as 'cleaning' | 'model-training',
      evaluatorEmail,
      targetTeamId
    );

    if (!result.success) {
      return res.status(409).json({ error: result.message });
    }

    const sub = await Submission.findOne({ stage: activeStage as any, teamId: result.evaluation!.targetTeamId });

    return res.json({
      message: 'Evaluator lease acquired successfully.',
      evaluation: result.evaluation,
      submission: sub,
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
