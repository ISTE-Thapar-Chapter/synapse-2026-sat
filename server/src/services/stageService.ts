import { EventStage, StageIdentifier, VALID_STAGES } from '../models/EventStage.js';
import { Team } from '../models/Team.js';
import { Submission } from '../models/Submission.js';
import { Evaluation } from '../models/Evaluation.js';
import { LeaderboardSnapshot } from '../models/LeaderboardSnapshot.js';
import { CompanyAssignment } from '../models/CompanyAssignment.js';
import { logAudit } from './auditService.js';

export interface StageGateStatus {
  canAdvance: boolean;
  blockers: string[];
  metrics: Record<string, any>;
}

export class StageService {
  /**
   * Initializes stages in the database if empty.
   */
  static async initializeStages() {
    const count = await EventStage.countDocuments();
    if (count === 0) {
      for (let i = 0; i < VALID_STAGES.length; i++) {
        const sId = VALID_STAGES[i];
        await EventStage.create({
          stageId: sId,
          active: i === 0, // 'registration' active by default
          reason: 'Initial system initialization',
          updatedBy: 'system',
          transitionHistory: [],
        });
      }
      console.log('[StageService] Initialized default event stages.');
    }
  }

  /**
   * Get the current active stage.
   */
  static async getActiveStage(): Promise<StageIdentifier> {
    const active = await EventStage.findOne({ active: true });
    return active ? active.stageId : 'registration';
  }

  /**
   * Evaluates the completion condition gates for a given stage.
   */
  static async evaluateCompletionConditions(stage: StageIdentifier): Promise<StageGateStatus> {
    const blockers: string[] = [];
    const metrics: Record<string, any> = {};

    const eligibleTeams = await Team.find({ disqualified: false });
    const eligibleTeamIds = eligibleTeams.map((t) => t._id);
    metrics.eligibleTeamsCount = eligibleTeams.length;

    switch (stage) {
      case 'registration': {
        if (eligibleTeams.length === 0) {
          blockers.push('No eligible teams found in the event. Import or create at least one team.');
        }
        const teamsWithoutLeader = eligibleTeams.filter((t) => !t.leaderId);
        if (teamsWithoutLeader.length > 0) {
          blockers.push(`${teamsWithoutLeader.length} team(s) do not have an assigned leader.`);
        }
        break;
      }

      case 'cleaning': {
        const submissions = await Submission.find({
          stage: 'cleaning',
          status: 'submitted',
          teamId: { $in: eligibleTeamIds },
        });
        metrics.submissionsCount = submissions.length;

        const missingSubmissions = eligibleTeams.length - submissions.length;
        if (missingSubmissions > 0) {
          blockers.push(`${missingSubmissions} eligible team(s) have not submitted their cleaning answers.`);
        }

        const evaluations = await Evaluation.find({
          stage: 'cleaning',
          status: 'completed',
          targetTeamId: { $in: eligibleTeamIds },
        });
        metrics.completedEvaluations = evaluations.length;

        const missingEvaluations = submissions.length - evaluations.length;
        if (missingEvaluations > 0) {
          blockers.push(`${missingEvaluations} submitted target(s) are pending evaluator grading.`);
        }
        break;
      }

      case 'cleaning-leaderboard': {
        const publishedSnapshot = await LeaderboardSnapshot.findOne({ stage: 'cleaning', published: true });
        metrics.hasPublishedLeaderboard = !!publishedSnapshot;
        if (!publishedSnapshot) {
          blockers.push('The cleaning leaderboard has not yet been published by an administrator.');
        }
        break;
      }

      case 'model-training': {
        const submissions = await Submission.find({
          stage: 'model-training',
          status: 'submitted',
          teamId: { $in: eligibleTeamIds },
        });
        metrics.submissionsCount = submissions.length;

        const evaluations = await Evaluation.find({
          stage: 'model-training',
          status: 'completed',
          targetTeamId: { $in: eligibleTeamIds },
        });
        metrics.completedEvaluations = evaluations.length;

        const missingSubmissions = eligibleTeams.length - submissions.length;
        if (missingSubmissions > 0) {
          blockers.push(`${missingSubmissions} team(s) have not submitted model-training results.`);
        }

        const missingEvaluations = submissions.length - evaluations.length;
        if (missingEvaluations > 0) {
          blockers.push(`${missingEvaluations} target(s) are awaiting model evaluation.`);
        }
        break;
      }

      case 'ranking': {
        const publishedAssignments = await CompanyAssignment.findOne({ published: true });
        metrics.hasPublishedAssignments = !!publishedAssignments;
        if (!publishedAssignments) {
          blockers.push('Company assignments have not yet been published by an administrator.');
        }
        break;
      }

      case 'final-submission': {
        const submissions = await Submission.find({
          stage: 'final-submission',
          status: 'submitted',
          teamId: { $in: eligibleTeamIds },
        });
        metrics.finalSubmissionsCount = submissions.length;
        const missing = eligibleTeams.length - submissions.length;
        if (missing > 0) {
          blockers.push(`${missing} team(s) have not yet completed their final company submission.`);
        }
        break;
      }
    }

    return {
      canAdvance: blockers.length === 0,
      blockers,
      metrics,
    };
  }

  /**
   * Transition to a new stage.
   */
  static async transitionStage(
    toStage: StageIdentifier,
    adminEmail: string,
    reason: string,
    forceException = false
  ) {
    const currentActiveStage = await this.getActiveStage();

    if (currentActiveStage === toStage) {
      throw new Error(`Stage ${toStage} is already the active stage.`);
    }

    // Evaluate gates if advancing forward
    const currentIndex = VALID_STAGES.indexOf(currentActiveStage);
    const targetIndex = VALID_STAGES.indexOf(toStage);

    if (targetIndex > currentIndex && !forceException) {
      const gate = await this.evaluateCompletionConditions(currentActiveStage);
      if (!gate.canAdvance) {
        throw new Error(
          `Cannot advance stage: Completion conditions not met. Blockers: ${gate.blockers.join(' | ')}. Provide an administrator exception override if necessary.`
        );
      }
    }

    // Set all to inactive, set target active
    await EventStage.updateMany({}, { $set: { active: false } });

    const updated = await EventStage.findOneAndUpdate(
      { stageId: toStage },
      {
        $set: {
          active: true,
          reason,
          updatedBy: adminEmail.toLowerCase().trim(),
        },
        $push: {
          transitionHistory: {
            fromStage: currentActiveStage,
            toStage,
            reason: forceException ? `[EXCEPTION OVERRIDE] ${reason}` : reason,
            updatedBy: adminEmail.toLowerCase().trim(),
            timestamp: new Date(),
          },
        },
      },
      { new: true, upsert: true }
    );

    await logAudit(
      adminEmail,
      'STAGE_TRANSITION',
      'EventStage',
      toStage,
      {
        fromStage: currentActiveStage,
        toStage,
        forceException,
      },
      reason
    );

    return {
      previousStage: currentActiveStage,
      currentStage: toStage,
      updated,
    };
  }
}
