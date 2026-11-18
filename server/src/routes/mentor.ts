import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, requireRole } from '../middleware/roles.js';
import { Team } from '../models/Team.js';
import { Submission, ISubmissionPayload, IMentorFeatureGrade } from '../models/Submission.js';
import { Evaluation } from '../models/Evaluation.js';
import { CompetitionConfig } from '../models/CompetitionConfig.js';
import { RoundRobinQueue } from '../models/RoundRobinQueue.js';
import { QuizScore } from '../models/QuizScore.js';
import { logAudit } from '../services/auditService.js';
import { MentorEvaluationSubmitSchema } from '../schemas/validation.js';

const router = Router();
router.use(requireAuth);

/**
 * List all teams with their feature submissions for mentor review
 */
router.get('/teams', requireRole(['mentor', 'evaluator', 'admin']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const teams = await Team.find({ disqualified: false }).populate('members', 'firstName lastName email role');
    const teamIds = teams.map((t) => t._id);

    const submissions = await Submission.find({
      teamId: { $in: teamIds },
      stage: { $in: ['requirements', 'model-training'] },
    });

    const subMap = new Map<string, any>();
    for (const sub of submissions) {
      subMap.set(sub.teamId.toString(), sub);
    }

    let config = await CompetitionConfig.findOne();
    if (!config) config = await CompetitionConfig.create({});
    const defaultFeatureTitles = config.requirementTitles || [];

    const teamsData = teams.map((team) => {
      const sub = subMap.get(team._id.toString());
      const payload: ISubmissionPayload = sub?.payload || {};

      // Resolve feature submissions
      let submittedFeatures: Array<{
        featureIndex: number;
        title: string;
        companyName: string;
      }> = [];

      if (payload.features && Array.isArray(payload.features)) {
        submittedFeatures = payload.features.map((f: any, idx: number) => ({
          featureIndex: typeof f.featureIndex === 'number' ? f.featureIndex : idx,
          title: f.title || defaultFeatureTitles[idx] || `Feature ${idx + 1}`,
          companyName: f.companyName || '',
        }));
      } else if (payload.requirements && Array.isArray(payload.requirements)) {
        submittedFeatures = payload.requirements.map((r: any, idx: number) => ({
          featureIndex: idx,
          title: r.title || defaultFeatureTitles[idx] || `Feature ${idx + 1}`,
          companyName: r.companyName || r.response || '',
        }));
      } else {
        // Default empty 5 features
        submittedFeatures = [0, 1, 2, 3, 4].map((idx) => ({
          featureIndex: idx,
          title: defaultFeatureTitles[idx] || `Feature ${idx + 1}`,
          companyName: '',
        }));
      }

      return {
        _id: team._id.toString(),
        teamId: team._id.toString(),
        teamName: team.teamName,
        submissionStatus: sub?.status || 'not_started',
        submittedAt: sub?.submittedAt || null,
        isLocked: !!sub?.isLocked,
        features: submittedFeatures,
        mentorEvaluation: payload.mentorEvaluation || null,
      };
    });

    return res.json({
      teams: teamsData,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Submit mentor grading for each feature set
 */
router.post('/grade-features', requireRole(['mentor', 'evaluator', 'admin']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = MentorEvaluationSubmitSchema.parse(req.body);
    const { teamId, featureGrades } = parsed;

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ error: 'Team not found', message: 'The specified team does not exist.' });
    }

    let submission = await Submission.findOne({
      teamId: team._id,
      stage: { $in: ['requirements', 'model-training'] },
    });

    if (!submission) {
      submission = new Submission({
        teamId: team._id,
        stage: 'requirements',
        status: 'draft',
        payload: {},
      });
    }

    // Calculate aggregated metrics
    let totalMarks = 0;
    let sumAccuracy = 0;
    let sumConfidence = 0;

    const formattedGrades: IMentorFeatureGrade[] = featureGrades.map((g) => {
      const marks = Math.min(10, Math.max(0, g.marks));
      const accuracy = Math.min(100, Math.max(0, g.accuracyScore));
      const confidence = Math.min(100, Math.max(0, g.confidenceScore));
      totalMarks += marks;
      sumAccuracy += accuracy;
      sumConfidence += confidence;

      return {
        featureIndex: g.featureIndex,
        companyName: g.companyName || '',
        marks,
        accuracyScore: accuracy,
        confidenceScore: confidence,
        feedback: g.feedback || '',
      };
    });

    const count = formattedGrades.length || 1;
    const overallAccuracyScore = Math.round(sumAccuracy / count);
    const overallConfidenceScore = Math.round(sumConfidence / count);

    const mentorEvaluation = {
      mentorId: null,
      mentorName: req.user?.name || req.user?.email || 'Mentor',
      mentorEmail: req.user?.email || '',
      featureGrades: formattedGrades,
      totalFeatureMarks: totalMarks,
      totalMarks,
      overallAccuracyScore,
      overallConfidenceScore,
      gradedAt: new Date(),
    };

    submission.payload = {
      ...submission.payload,
      mentorEvaluation,
    };
    await submission.save();

    // Upsert Evaluation document with status 'in_progress' so LeaderboardService incorporates preliminary marks
    // while leaving the official evaluation available for Evaluators / Admins to complete
    let evaluation = await Evaluation.findOne({
      stage: 'requirements',
      targetTeamId: team._id,
    });

    if (!evaluation) {
      evaluation = new Evaluation({
        stage: 'requirements',
        targetTeamId: team._id,
        submissionId: submission._id,
        evaluatorEmail: req.user!.email,
        score: totalMarks,
        feedback: `Mentor Review by ${mentorEvaluation.mentorName} (Accuracy: ${overallAccuracyScore}%, Confidence: ${overallConfidenceScore}%)`,
        status: 'in_progress',
        leaseExpiresAt: null,
      });
    } else if (evaluation.status !== 'completed') {
      evaluation.score = totalMarks;
      evaluation.feedback = `Mentor Review by ${mentorEvaluation.mentorName} (Accuracy: ${overallAccuracyScore}%, Confidence: ${overallConfidenceScore}%)`;
      evaluation.status = 'in_progress';
      evaluation.leaseExpiresAt = null;
    }
    await evaluation.save();

    await logAudit(
      req.user!.email,
      'MENTOR_EVALUATION_SUBMITTED',
      'Submission',
      submission._id.toString(),
      {
        teamId: team._id.toString(),
        teamName: team.teamName,
        totalMarks,
        overallAccuracyScore,
        overallConfidenceScore,
      }
    );

    return res.json({
      message: 'Feature grading recorded successfully.',
      mentorEvaluation,
      evaluation: mentorEvaluation,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * List final project pitch submissions for mentors and evaluators
 */
router.get('/final-submissions', requireRole(['mentor', 'evaluator', 'admin']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const finalSubmissions = await Submission.find({
      stage: 'final-submission',
    }).populate('teamId', 'teamName college');

    const teamIds = finalSubmissions.map((s) => s.teamId?._id || s.teamId).filter(Boolean);
    const q1 = await RoundRobinQueue.findOne({ queueNumber: 1 });
    const q2 = await RoundRobinQueue.findOne({ queueNumber: 2 });
    const quizScores = await QuizScore.find({ teamId: { $in: teamIds } });
    const quizMap = new Map<string, any>();
    for (const qs of quizScores) {
      quizMap.set(qs.teamId.toString(), qs);
    }

    const submissionsData = finalSubmissions.map((sub: any) => {
      const final = sub.payload?.finalSubmission || {};
      const teamIdStr = (sub.teamId?._id || sub.teamId)?.toString();
      const assignedCompanies: Array<{ name: string; description: string; source: string }> = [];

      if (q1) {
        const q1Team = q1.teams.find((t) => t.teamId.toString() === teamIdStr);
        if (q1Team?.hasSelected && q1Team.selectedCompanyName) {
          assignedCompanies.push({
            name: q1Team.selectedCompanyName,
            description: q1Team.selectedCompanyDescription || '',
            source: 'Round 1 Selection',
          });
        }
      }

      const qs = quizMap.get(teamIdStr);
      if (qs?.assignedCompanies?.auctionCompany?.name) {
        assignedCompanies.push({
          name: qs.assignedCompanies.auctionCompany.name,
          description: qs.assignedCompanies.auctionCompany.description || '',
          source: 'Live Auction',
        });
      } else if (q2) {
        const q2Team = q2.teams.find((t) => t.teamId.toString() === teamIdStr);
        if (q2Team?.hasSelected && q2Team.selectedCompanyName) {
          assignedCompanies.push({
            name: q2Team.selectedCompanyName,
            description: q2Team.selectedCompanyDescription || '',
            source: 'Round 2 Selection',
          });
        }
      }

      return {
        submissionId: sub._id,
        teamId: teamIdStr,
        _id: teamIdStr,
        teamName: sub.teamId?.teamName || 'Unknown Team',
        college: sub.teamId?.college || 'Independent',
        status: sub.status,
        submittedAt: sub.submittedAt,
        isLocked: sub.isLocked,
        productName: final.productName || sub.payload?.productName || '',
        productDescription: final.productDescription || sub.payload?.productDescription || '',
        prototypeUrl: final.prototypeUrl || sub.payload?.prototypeUrl || '',
        githubUrl: final.githubUrl || sub.payload?.githubUrl || '',
        finalSubmission: final,
        assignedCompanies,
      };
    });

    return res.json({
      submissions: submissionsData,
      finalSubmissions: submissionsData,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
