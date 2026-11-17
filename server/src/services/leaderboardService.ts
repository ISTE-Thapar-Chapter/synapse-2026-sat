import { Evaluation } from '../models/Evaluation.js';
import { Submission } from '../models/Submission.js';
import { Team } from '../models/Team.js';
import { LeaderboardSnapshot, ILeaderboardEntry } from '../models/LeaderboardSnapshot.js';
import { logAudit } from './auditService.js';

export class LeaderboardService {
  /**
   * Calculate live leaderboard entries across all teams.
   * Scores default to 0 for teams whose evaluations are pending or not yet graded.
   */
  static async calculateLiveLeaderboard(
    tieBreakPolicy: 'score_desc' | 'score_desc_then_time_asc' = 'score_desc_then_time_asc'
  ): Promise<{
    entries: Array<{
      rank: number;
      teamId: any;
      teamName: string;
      college?: string;
      score: number;
      status: string;
      submissionTime?: Date | null;
      tieBreakReason?: string;
      hasSubmittedCleaning: boolean;
      hasSubmittedRequirements: boolean;
    }>;
    totalTeams: number;
    evaluatedCount: number;
  }> {
    // 1. Fetch all eligible teams
    const eligibleTeams = await Team.find({ disqualified: false });

    // 2. Fetch all completed evaluations
    const evaluations = await Evaluation.find({
      status: 'completed',
    });
    const evalMap = new Map<string, number>();
    for (const ev of evaluations) {
      const tId = ev.targetTeamId.toString();
      // Keep highest or latest score
      const existing = evalMap.get(tId) ?? 0;
      evalMap.set(tId, Math.max(existing, ev.score));
    }

    // 3. Fetch submissions across cleaning and requirements
    const submissions = await Submission.find({
      teamId: { $in: eligibleTeams.map((t) => t._id) },
    });

    const subCleaningMap = new Map<string, Date>();
    const subReqMap = new Map<string, Date>();

    for (const s of submissions) {
      const tId = s.teamId.toString();
      if (s.status === 'submitted' && s.submittedAt) {
        if (s.stage === 'cleaning') {
          subCleaningMap.set(tId, s.submittedAt);
        } else if (s.stage === 'requirements' || s.stage === 'model-training' || s.stage === 'final-submission') {
          subReqMap.set(tId, s.submittedAt);
        }
      }
    }

    // 4. Construct entry for EVERY eligible team (defaulting to 0 score)
    const rawEntries = eligibleTeams.map((team) => {
      const tId = team._id.toString();
      const hasReq = subReqMap.has(tId);
      const hasClean = subCleaningMap.has(tId);
      const score = evalMap.has(tId) ? evalMap.get(tId)! : 0;
      const submissionTime = hasReq ? subReqMap.get(tId) : hasClean ? subCleaningMap.get(tId) : null;

      let status = 'In Progress';
      if (hasReq) status = 'Requirements Submitted';
      else if (hasClean) status = 'Cleaning Submitted';

      return {
        teamId: team._id,
        teamName: team.teamName,
        college: (team as any).college || 'Independent',
        score,
        status,
        hasSubmittedCleaning: hasClean,
        hasSubmittedRequirements: hasReq,
        submissionTime: submissionTime || null,
      };
    });

    // 5. Sort based on score desc, then submission time asc (earlier time wins), then team name asc
    rawEntries.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      const timeA = a.submissionTime ? new Date(a.submissionTime).getTime() : Infinity;
      const timeB = b.submissionTime ? new Date(b.submissionTime).getTime() : Infinity;
      if (timeA !== timeB) return timeA - timeB;
      return a.teamName.localeCompare(b.teamName);
    });

    // 6. Assign ranks
    const entries = rawEntries.map((item, idx) => {
      let tieBreakReason = '';
      if (idx > 0 && rawEntries[idx - 1].score === item.score) {
        tieBreakReason = `Resolved by submission timestamp (${tieBreakPolicy})`;
      }
      return {
        rank: idx + 1,
        ...item,
        tieBreakReason,
      };
    });

    return {
      entries,
      totalTeams: eligibleTeams.length,
      evaluatedCount: evalMap.size,
    };
  }

  /**
   * Calculate leaderboard entries from completed evaluations and submissions.
   */
  static async calculateCleaningLeaderboard(
    tieBreakPolicy: 'score_desc' | 'score_desc_then_time_asc' = 'score_desc_then_time_asc'
  ): Promise<{
    entries: ILeaderboardEntry[];
    sourceEvaluationsCount: number;
    pendingCount: number;
  }> {
    const live = await this.calculateLiveLeaderboard(tieBreakPolicy);
    const pendingEvaluations = await Evaluation.countDocuments({
      status: 'in_progress',
    });

    const entries: ILeaderboardEntry[] = live.entries.map((e) => ({
      rank: e.rank,
      teamId: e.teamId,
      teamName: e.teamName,
      score: e.score,
      submissionTime: e.submissionTime || undefined,
      tieBreakReason: e.tieBreakReason,
    }));

    return {
      entries,
      sourceEvaluationsCount: live.evaluatedCount,
      pendingCount: pendingEvaluations,
    };
  }

  /**
   * Publishes an immutable snapshot
   */
  static async publishCleaningLeaderboard(
    adminEmail: string,
    tieBreakPolicy: 'score_desc' | 'score_desc_then_time_asc' = 'score_desc_then_time_asc'
  ) {
    const calc = await this.calculateCleaningLeaderboard(tieBreakPolicy);

    // Unset prior published flag or archive
    await LeaderboardSnapshot.updateMany(
      { stage: 'cleaning', published: true },
      { $set: { published: false } }
    );

    const snapshot = new LeaderboardSnapshot({
      stage: 'cleaning',
      published: true,
      publishedAt: new Date(),
      publishedBy: adminEmail.toLowerCase().trim(),
      tieBreakPolicy,
      sourceEvaluationsCount: calc.sourceEvaluationsCount,
      entries: calc.entries,
    });

    await snapshot.save();

    await logAudit(
      adminEmail,
      'LEADERBOARD_PUBLISHED',
      'LeaderboardSnapshot',
      snapshot._id.toString(),
      {
        stage: 'cleaning',
        entriesCount: calc.entries.length,
        tieBreakPolicy,
      }
    );

    return snapshot;
  }

  /**
   * Gets the latest published leaderboard snapshot, or falls back to live computed leaderboard
   */
  static async getPublishedCleaningLeaderboard() {
    const published = await LeaderboardSnapshot.findOne({ stage: 'cleaning', published: true }).sort({ publishedAt: -1 });
    if (published) {
      return published;
    }
    const live = await this.calculateLiveLeaderboard();
    return {
      stage: 'cleaning',
      published: true,
      publishedAt: new Date(),
      publishedBy: 'system (live)',
      tieBreakPolicy: 'score_desc_then_time_asc',
      sourceEvaluationsCount: live.evaluatedCount,
      entries: live.entries,
    };
  }
}
