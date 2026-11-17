import { Evaluation } from '../models/Evaluation.js';
import { Submission } from '../models/Submission.js';
import { Team } from '../models/Team.js';
import { LeaderboardSnapshot, ILeaderboardEntry } from '../models/LeaderboardSnapshot.js';
import { logAudit } from './auditService.js';

export class LeaderboardService {
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
    // 1. Find all eligible (non-disqualified) teams
    const eligibleTeams = await Team.find({ disqualified: false });
    const eligibleTeamMap = new Map(eligibleTeams.map((t) => [t._id.toString(), t.teamName]));

    // 2. Fetch completed evaluations for cleaning stage
    const evaluations = await Evaluation.find({
      stage: 'cleaning',
      status: 'completed',
      targetTeamId: { $in: Array.from(eligibleTeamMap.keys()) },
    });

    const pendingEvaluations = await Evaluation.countDocuments({
      stage: 'cleaning',
      status: { $in: ['in_progress'] },
    });

    // 3. For each evaluation, fetch submission timestamp
    const subMap = new Map<string, Date>();
    const submissions = await Submission.find({
      stage: 'cleaning',
      teamId: { $in: Array.from(eligibleTeamMap.keys()) },
    });
    submissions.forEach((s) => {
      if (s.submittedAt) {
        subMap.set(s.teamId.toString(), s.submittedAt);
      }
    });

    // 4. Build draft entries
    const rawEntries = evaluations.map((ev) => {
      const teamIdStr = ev.targetTeamId.toString();
      const teamName = eligibleTeamMap.get(teamIdStr) || 'Unknown Team';
      const submissionTime = subMap.get(teamIdStr);

      return {
        teamId: ev.targetTeamId,
        teamName,
        score: ev.score,
        submissionTime,
      };
    });

    // 5. Sort based on tie-break policy
    rawEntries.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      if (tieBreakPolicy === 'score_desc_then_time_asc') {
        const timeA = a.submissionTime ? new Date(a.submissionTime).getTime() : Infinity;
        const timeB = b.submissionTime ? new Date(b.submissionTime).getTime() : Infinity;
        return timeA - timeB;
      }
      return 0;
    });

    // 6. Assign ranks
    const entries: ILeaderboardEntry[] = rawEntries.map((item, idx) => {
      let tieBreakReason = '';
      if (idx > 0 && rawEntries[idx - 1].score === item.score) {
        tieBreakReason = `Resolved by submission timestamp (${tieBreakPolicy})`;
      }
      return {
        rank: idx + 1,
        teamId: item.teamId,
        teamName: item.teamName,
        score: item.score,
        submissionTime: item.submissionTime,
        tieBreakReason,
      };
    });

    return {
      entries,
      sourceEvaluationsCount: evaluations.length,
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
   * Gets the latest published leaderboard snapshot
   */
  static async getPublishedCleaningLeaderboard() {
    return LeaderboardSnapshot.findOne({ stage: 'cleaning', published: true }).sort({ publishedAt: -1 });
  }
}
