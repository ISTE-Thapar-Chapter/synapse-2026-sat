import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, requireRole, requireTeamLeader } from '../middleware/roles.js';
import { CompetitionConfig } from '../models/CompetitionConfig.js';
import { QuizSubmission } from '../models/QuizSubmission.js';
import { QuizScore } from '../models/QuizScore.js';
import { Team } from '../models/Team.js';
import { logAudit } from '../services/auditService.js';
import { DEFAULT_QUIZ_QUESTIONS } from '../data/defaultQuizQuestions.js';

const router = Router();

async function getOrInitConfig() {
  let config = await CompetitionConfig.findOne();
  if (!config) {
    config = await CompetitionConfig.create({
      quizQuestions: DEFAULT_QUIZ_QUESTIONS,
      quizStatus: 'not_started',
      quizMultiplier: 100000,
    });
  } else if (!config.quizQuestions || config.quizQuestions.length !== 20 || config.quizMultiplier === 100) {
    config.quizQuestions = DEFAULT_QUIZ_QUESTIONS as any;
    if (config.quizMultiplier === 100 || !config.quizMultiplier) {
      config.quizMultiplier = 100000;
    }
    await config.save();
  }
  return config;
}

/**
 * Public/Participant route: Get current assessment status
 */
router.get('/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const config = await getOrInitConfig();
    const quizStatus = config.quizStatus || 'not_started';
    const totalQuestions = config.quizQuestions?.length || 0;

    const team = req.team;
    let hasSubmitted = false;
    let submittedAt: Date | null = null;
    let savedAnswers: Array<{ questionId: number; selectedOption: number }> = [];

    if (team) {
      const submission = await QuizSubmission.findOne({ teamId: team._id });
      if (submission) {
        hasSubmitted = true;
        submittedAt = submission.submittedAt;
        savedAnswers = [];
      }
    }

    return res.json({
      quizStatus,
      totalQuestions,
      hasSubmitted,
      submittedAt,
      savedAnswers,
      tokensReleased: !!config.quizTokensReleased,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Participant route: Get questions
 * Answers (correct options) are strictly stripped out!
 */
router.get('/questions', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const config = await getOrInitConfig();
    const isStaff = req.user && ['admin', 'evaluator'].includes(req.user.role);

    // If participant, enforce quiz active or closed
    if (!isStaff) {
      if (config.quizStatus === 'not_started') {
        return res.status(400).json({
          error: 'Assessment Inactive',
          message: 'The knowledge assessment has not started yet. Please wait for the host to begin.',
        });
      }
      if (!req.team) {
        return res.status(403).json({
          error: 'Team Required',
          message: 'You must belong to an active team to participate in the assessment.',
        });
      }

      // Hide questions once team has submitted
      const existingSub = await QuizSubmission.findOne({ teamId: req.team._id });
      if (existingSub) {
        return res.json({
          quizStatus: config.quizStatus,
          hasSubmitted: true,
          questions: [],
          message: 'Your responses have already been submitted. Questions are now hidden.',
        });
      }
    }

    // Strip answer key for participants
    const questions = (config.quizQuestions || []).map((q) => {
      const difficulty = q.difficulty || (q.points === 3 ? 'hard' : q.points === 2 ? 'medium' : 'easy');
      if (isStaff) {
        return {
          id: q.id,
          question: q.question,
          options: q.options,
          correct: q.correct,
          image: q.image || '',
          type: q.type || 'multiple_choice',
          points: q.points || 1,
          difficulty,
        };
      }
      return {
        id: q.id,
        question: q.question,
        options: q.options,
        image: q.image || '',
        type: q.type || 'multiple_choice',
        points: q.points || 1,
        difficulty,
      };
    });

    return res.json({
      quizStatus: config.quizStatus,
      questions,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Participant route: Submit assessment responses in batch (Leader Only)
 * Answers are evaluated strictly on the backend.
 * Neither individual correctness nor total score is returned.
 */
router.post('/submit', requireAuth, requireTeamLeader, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const team = req.team;
    if (!team) {
      return res.status(403).json({
        error: 'Team Required',
        message: 'You must belong to a team to submit assessment responses.',
      });
    }

    if (team.disqualified) {
      return res.status(403).json({
        error: 'Team Disqualified',
        message: 'Your team is disqualified and cannot submit assessment responses.',
      });
    }

    const config = await getOrInitConfig();

    if (config.quizStatus === 'not_started') {
      return res.status(400).json({
        error: 'Assessment Inactive',
        message: 'The knowledge assessment has not started yet.',
      });
    }

    if (config.quizStatus === 'closed') {
      return res.status(400).json({
        error: 'Assessment Closed',
        message: 'The knowledge assessment has concluded. Submissions are now closed.',
      });
    }

    // Check if team has already submitted (one-time submission only)
    const existingSubmission = await QuizSubmission.findOne({ teamId: team._id });
    if (existingSubmission) {
      return res.status(400).json({
        error: 'Submission Locked',
        message: 'Your team has already submitted responses for this assessment. Responses cannot be modified once submitted.',
      });
    }

    const { answers } = req.body;
    if (!Array.isArray(answers)) {
      return res.status(400).json({
        error: 'Invalid Submission',
        message: 'Responses must be provided as an array.',
      });
    }

    // Sanitize and validate answers
    const sanitizedAnswers: Array<{ questionId: number; selectedOption: number }> = [];
    for (const item of answers) {
      const qId = Number(item.questionId);
      const opt = Number(item.selectedOption);
      if (!isNaN(qId) && !isNaN(opt) && opt >= 0 && opt < 10) {
        sanitizedAnswers.push({ questionId: qId, selectedOption: opt });
      }
    }

    // Backend evaluation against secret answer key
    const questions = config.quizQuestions || [];
    const questionMap = new Map<number, (typeof questions)[0]>();
    for (const q of questions) {
      questionMap.set(q.id, q);
    }

    let calculatedScore = 0;
    for (const ans of sanitizedAnswers) {
      const q = questionMap.get(ans.questionId);
      if (!q) continue;

      if (q.correct !== null && q.correct !== undefined) {
        if (Number(ans.selectedOption) === Number(q.correct)) {
          calculatedScore += Number(q.points) || 1;
        }
      } else if (q.type === 'poll' || q.correct === null) {
        // Poll question participation point
        calculatedScore += Number(q.points) || 1;
      }
    }

    const now = new Date();

    // Upsert QuizSubmission
    let submission = await QuizSubmission.findOne({ teamId: team._id });
    if (!submission) {
      submission = new QuizSubmission({
        teamId: team._id,
        teamName: team.teamName,
        submittedBy: req.participant?._id || null,
        submittedByName: req.user?.name || null,
        answers: sanitizedAnswers,
        score: calculatedScore,
        totalQuestions: questions.length,
        submittedAt: now,
        submissionCount: 1,
      });
    } else {
      submission.answers = sanitizedAnswers;
      submission.score = calculatedScore;
      submission.submittedBy = (req.participant?._id as any) || submission.submittedBy;
      submission.submittedByName = req.user?.name || submission.submittedByName;
      submission.submittedAt = now;
      submission.submissionCount = (submission.submissionCount || 1) + 1;
    }
    await submission.save();

    // Update QuizScore (Tokens are withheld until staff manually releases them)
    const multiplier = config.quizMultiplier || 100000;
    const tokensReleased = !!config.quizTokensReleased;
    const auctionBalance = tokensReleased ? Math.round(calculatedScore * multiplier) : 0;
    const remainingBalance = tokensReleased ? Math.max(0, auctionBalance) : 0;

    let qs = await QuizScore.findOne({ teamId: team._id });
    if (!qs) {
      qs = new QuizScore({
        teamId: team._id,
        teamName: team.teamName,
        quizMarks: calculatedScore,
        multiplier,
        tokensReleased,
        auctionBalance,
        spentTokens: 0,
        remainingBalance,
        submittedAt: now,
        autoEvaluated: true,
      });
    } else {
      qs.teamName = team.teamName;
      qs.quizMarks = calculatedScore;
      qs.multiplier = multiplier;
      qs.tokensReleased = tokensReleased;
      qs.auctionBalance = auctionBalance;
      qs.remainingBalance = remainingBalance;
      qs.submittedAt = now;
      qs.autoEvaluated = true;
    }
    await qs.save();

    await logAudit(
      req.user!.email,
      'QUIZ_RESPONSES_SUBMITTED',
      'QuizSubmission',
      submission._id.toString(),
      {
        teamId: team._id.toString(),
        teamName: team.teamName,
        answeredCount: sanitizedAnswers.length,
        submissionCount: submission.submissionCount,
      }
    );

    return res.json({
      success: true,
      message: 'Your responses have been recorded successfully.',
      submittedAt: now,
      totalAnswered: sanitizedAnswers.length,
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------
// Staff Controls (Admin & Evaluator)
// ---------------------------------------------------------------------

/**
 * Admin/Evaluator: Get full questions with answers
 */
router.get(
  '/admin/questions',
  requireAuth,
  requireRole(['admin', 'evaluator']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const config = await getOrInitConfig();
      return res.json({
        quizStatus: config.quizStatus,
        quizMultiplier: config.quizMultiplier,
        questions: config.quizQuestions || [],
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * Admin: Update question list
 */
router.put(
  '/admin/questions',
  requireAuth,
  requireRole(['admin']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { questions } = req.body;
      if (!Array.isArray(questions)) {
        return res.status(400).json({
          error: 'Invalid Request',
          message: 'Questions must be an array.',
        });
      }

      const config = await getOrInitConfig();

      const sanitized = questions.map((q: any, idx: number) => ({
        id: Number(q.id) || idx + 1,
        question: String(q.question || '').trim(),
        options: Array.isArray(q.options)
          ? q.options.map((o: any) => String(o).trim())
          : [],
        correct:
          q.correct !== null && q.correct !== undefined && !isNaN(Number(q.correct))
            ? Number(q.correct)
            : null,
        image: typeof q.image === 'string' ? q.image.trim() : '',
        type: q.type === 'poll' ? 'poll' : 'multiple_choice',
        points: Number(q.points) > 0 ? Number(q.points) : (q.difficulty === 'hard' ? 3 : q.difficulty === 'medium' ? 2 : 1),
        difficulty: ['easy', 'medium', 'hard'].includes(q.difficulty)
          ? q.difficulty
          : (Number(q.points) === 3 ? 'hard' : Number(q.points) === 2 ? 'medium' : 'easy'),
      }));

      config.quizQuestions = sanitized as any;
      await config.save();

      await logAudit(
        req.user!.email,
        'QUIZ_QUESTIONS_UPDATED',
        'CompetitionConfig',
        config._id.toString(),
        { count: sanitized.length }
      );

      return res.json({
        message: 'Assessment questions updated successfully.',
        questions: config.quizQuestions,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * Admin: Update quiz status (not_started | active | closed)
 */
router.post(
  '/admin/status',
  requireAuth,
  requireRole(['admin']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status } = req.body;
      if (!['not_started', 'active', 'closed'].includes(status)) {
        return res.status(400).json({
          error: 'Invalid Status',
          message: "Status must be 'not_started', 'active', or 'closed'.",
        });
      }

      const config = await getOrInitConfig();
      config.quizStatus = status;
      await config.save();

      await logAudit(
        req.user!.email,
        'QUIZ_STATUS_CHANGED',
        'CompetitionConfig',
        config._id.toString(),
        { newStatus: status }
      );

      return res.json({
        message: `Assessment status updated to '${status}'.`,
        quizStatus: config.quizStatus,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * Staff (Admin / Evaluator): Release bidding tokens to all teams
 */
router.post(
  '/admin/release-tokens',
  requireAuth,
  requireRole(['admin', 'evaluator']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const config = await getOrInitConfig();
      config.quizTokensReleased = true;
      config.quizTokensReleasedAt = new Date();
      await config.save();

      const multiplier = config.quizMultiplier || 100000;
      const allScores = await QuizScore.find();
      for (const qs of allScores) {
        qs.tokensReleased = true;
        qs.multiplier = multiplier;
        qs.auctionBalance = Math.round(qs.quizMarks * multiplier);
        qs.remainingBalance = Math.max(0, qs.auctionBalance - (qs.spentTokens || 0));
        await qs.save();
      }

      await logAudit(
        req.user!.email,
        'QUIZ_TOKENS_RELEASED',
        'CompetitionConfig',
        config._id.toString(),
        { count: allScores.length, multiplier }
      );

      return res.json({
        success: true,
        message: 'Auction bidding tokens have been released to all teams.',
        quizTokensReleased: true,
        releasedCount: allScores.length,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * Staff (Admin / Evaluator): Freeze / Revoke bidding tokens for adjustments
 */
router.post(
  '/admin/revoke-tokens',
  requireAuth,
  requireRole(['admin', 'evaluator']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const config = await getOrInitConfig();
      config.quizTokensReleased = false;
      await config.save();

      const allScores = await QuizScore.find();
      for (const qs of allScores) {
        qs.tokensReleased = false;
        qs.auctionBalance = 0;
        qs.remainingBalance = 0;
        await qs.save();
      }

      await logAudit(
        req.user!.email,
        'QUIZ_TOKENS_REVOKED',
        'CompetitionConfig',
        config._id.toString(),
        { count: allScores.length }
      );

      return res.json({
        success: true,
        message: 'Auction bidding tokens have been locked/frozen.',
        quizTokensReleased: false,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
