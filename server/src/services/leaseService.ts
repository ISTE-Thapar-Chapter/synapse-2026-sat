import mongoose from 'mongoose';
import { Evaluation, IEvaluation } from '../models/Evaluation.js';
import { Submission } from '../models/Submission.js';
import { Team } from '../models/Team.js';
import { logAudit } from './auditService.js';

const LEASE_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export class LeaseService {
  /**
   * Atomically acquires a lease on a target team submission for the given evaluator.
   * If targetTeamId is not provided, finds the next available submission in the stage.
   */
  static async acquireLease(
    stage: 'cleaning' | 'model-training' | 'requirements',
    evaluatorEmail: string,
    targetTeamId?: string
  ): Promise<{ success: boolean; evaluation?: IEvaluation; message?: string }> {
    const now = new Date();
    const normalizedEmail = evaluatorEmail.toLowerCase().trim();

    // 1. If evaluator already holds an active lease for this stage, return that
    const activeLease = await Evaluation.findOne({
      stage,
      evaluatorEmail: normalizedEmail,
      status: 'in_progress',
      leaseExpiresAt: { $gt: now },
    }).populate('targetTeamId');

    if (activeLease) {
      if (!targetTeamId || activeLease.targetTeamId._id.toString() === targetTeamId) {
        return { success: true, evaluation: activeLease };
      } else {
        return {
          success: false,
          message: `You already hold an active lease for team ${(activeLease.targetTeamId as any)?.teamName || 'another team'}. Release or finish it first.`,
        };
      }
    }

    // 2. Determine target candidates
    let candidateTeamIds: mongoose.Types.ObjectId[] = [];
    if (targetTeamId) {
      candidateTeamIds = [new mongoose.Types.ObjectId(targetTeamId)];
    } else {
      // Find all submitted (and non-disqualified) submissions in this stage
      const eligibleTeams = await Team.find({ disqualified: false }).select('_id');
      const eligibleIds = eligibleTeams.map((t) => t._id);

      const submissions = await Submission.find({
        stage,
        status: 'submitted',
        teamId: { $in: eligibleIds },
      }).select('teamId');

      candidateTeamIds = submissions.map((s) => s.teamId);
    }

    if (candidateTeamIds.length === 0) {
      return { success: false, message: 'No submissions available for evaluation in this stage.' };
    }

    // 3. Atomically attempt to lease one candidate
    const leaseExpiresAt = new Date(now.getTime() + LEASE_DURATION_MS);

    for (const teamId of candidateTeamIds) {
      // Fetch corresponding submission
      const sub = await Submission.findOne({ stage, teamId, status: 'submitted' });
      if (!sub) continue;

      // Atomically check & update or insert evaluation
      // Conditions:
      // A) No evaluation exists yet -> create with lease
      // B) Evaluation exists, status is in_progress, and lease is expired
      const existing = await Evaluation.findOne({ stage, targetTeamId: teamId });

      if (!existing) {
        try {
          const newEval = new Evaluation({
            stage,
            targetTeamId: teamId,
            submissionId: sub._id,
            evaluatorEmail: normalizedEmail,
            status: 'in_progress',
            leaseExpiresAt,
          });
          await newEval.save();

          await logAudit(
            normalizedEmail,
            'EVALUATOR_LEASE_ACQUIRED',
            'Evaluation',
            newEval._id.toString(),
            { stage, targetTeamId: teamId.toString(), leaseExpiresAt }
          );

          return { success: true, evaluation: await newEval.populate('targetTeamId') };
        } catch (err: any) {
          // Concurrency collision on unique index (stage, targetTeamId)
          continue;
        }
      } else if (existing.status === 'completed') {
        // Already scored
        continue;
      } else if (existing.status === 'in_progress') {
        // Check if expired or owned by same evaluator
        const isExpired = !existing.leaseExpiresAt || existing.leaseExpiresAt <= now;
        const isMine = existing.evaluatorEmail === normalizedEmail;

        if (isExpired || isMine) {
          const updated = await Evaluation.findOneAndUpdate(
            {
              _id: existing._id,
              status: 'in_progress',
              // Concurrency check: either still expired or still mine
              $or: [
                { leaseExpiresAt: { $lte: now } },
                { evaluatorEmail: normalizedEmail },
                { leaseExpiresAt: null },
              ],
            },
            {
              $set: {
                evaluatorEmail: normalizedEmail,
                leaseExpiresAt,
              },
            },
            { new: true }
          ).populate('targetTeamId');

          if (updated) {
            await logAudit(
              normalizedEmail,
              'EVALUATOR_LEASE_ACQUIRED',
              'Evaluation',
              updated._id.toString(),
              { stage, targetTeamId: teamId.toString(), leaseExpiresAt }
            );
            return { success: true, evaluation: updated };
          }
        }
      }
    }

    return {
      success: false,
      message: 'All available submissions are currently locked by other evaluators or already completed.',
    };
  }

  /**
   * Explicitly releases a lease so other evaluators can pick it up.
   */
  static async releaseLease(
    evaluationId: string,
    evaluatorEmail: string,
    isAdmin = false
  ): Promise<{ success: boolean; message?: string }> {
    const normalizedEmail = evaluatorEmail.toLowerCase().trim();
    const query: any = { _id: evaluationId, status: 'in_progress' };
    if (!isAdmin) {
      query.evaluatorEmail = normalizedEmail;
    }

    const updated = await Evaluation.findOneAndUpdate(
      query,
      {
        $set: {
          leaseExpiresAt: new Date(0), // expire immediately
        },
      },
      { new: true }
    );

    if (!updated) {
      return { success: false, message: 'Lease not found or already completed/released.' };
    }

    await logAudit(
      normalizedEmail,
      'EVALUATOR_LEASE_RELEASED',
      'Evaluation',
      evaluationId,
      { isAdmin }
    );

    return { success: true };
  }

  /**
   * Completes evaluation with score and feedback, atomically releasing the lease.
   */
  static async completeEvaluation(
    evaluationId: string,
    evaluatorEmail: string,
    score: number,
    feedback: string,
    isAdmin = false
  ): Promise<{ success: boolean; evaluation?: IEvaluation; message?: string }> {
    const normalizedEmail = evaluatorEmail.toLowerCase().trim();
    const now = new Date();

    const query: any = { _id: evaluationId };
    if (!isAdmin) {
      query.evaluatorEmail = normalizedEmail;
      query.status = 'in_progress';
      query.leaseExpiresAt = { $gt: now };
    }

    const evaluation = await Evaluation.findOne(query);
    if (!evaluation) {
      return {
        success: false,
        message: 'Active evaluation lease has expired or is not assigned to you.',
      };
    }

    evaluation.score = score;
    evaluation.feedback = feedback;
    evaluation.status = 'completed';
    evaluation.leaseExpiresAt = null;
    evaluation.completedAt = now;
    await evaluation.save();

    await logAudit(
      normalizedEmail,
      'EVALUATION_COMPLETED',
      'Evaluation',
      evaluationId,
      { score, feedback, stage: evaluation.stage, targetTeamId: evaluation.targetTeamId }
    );

    return { success: true, evaluation };
  }
}
