import { Evaluation } from '../models/Evaluation.js';
import { Submission } from '../models/Submission.js';
import { Team } from '../models/Team.js';
import { CompanyAssignment, ICompanyAssignmentItem } from '../models/CompanyAssignment.js';
import { logAudit } from './auditService.js';

export const DEFAULT_COMPANIES = [
  'Saturnalia AI Solutions',
  'Turing Data Systems',
  'Nova Intelligence Lab',
  'Apex Predictive Analytics',
  'Chronos Deep Learning',
];

export class RankingService {
  /**
   * Calculates ranked teams from model-training evaluations and applies round-robin company assignment.
   */
  static async previewCompanyAssignments(
    companies: string[] = DEFAULT_COMPANIES
  ): Promise<{
    preview: ICompanyAssignmentItem[];
    eligibleCount: number;
    pendingEvaluationsCount: number;
  }> {
    const eligibleTeams = await Team.find({ disqualified: false });
    const teamMap = new Map(eligibleTeams.map((t) => [t._id.toString(), t.teamName]));

    const evaluations = await Evaluation.find({
      stage: 'model-training',
      status: 'completed',
      targetTeamId: { $in: Array.from(teamMap.keys()) },
    });

    const pendingEvaluationsCount = await Evaluation.countDocuments({
      stage: 'model-training',
      status: 'in_progress',
    });

    const submissions = await Submission.find({
      stage: 'model-training',
      teamId: { $in: Array.from(teamMap.keys()) },
    });

    const subMap = new Map<string, Date>();
    submissions.forEach((s) => {
      if (s.submittedAt) subMap.set(s.teamId.toString(), s.submittedAt);
    });

    const rankedList = evaluations.map((ev) => {
      const tId = ev.targetTeamId.toString();
      return {
        teamId: ev.targetTeamId,
        teamName: teamMap.get(tId) || 'Unknown Team',
        score: ev.score,
        submittedAt: subMap.get(tId),
      };
    });

    // Sort by score desc, then earliest submission time
    rankedList.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const timeA = a.submittedAt ? new Date(a.submittedAt).getTime() : Infinity;
      const timeB = b.submittedAt ? new Date(b.submittedAt).getTime() : Infinity;
      return timeA - timeB;
    });

    // Apply round-robin assignment
    const preview: ICompanyAssignmentItem[] = rankedList.map((item, idx) => {
      const companyIndex = idx % companies.length;
      return {
        rank: idx + 1,
        teamId: item.teamId,
        teamName: item.teamName,
        companyName: companies[companyIndex],
        selectionOrder: idx + 1,
      };
    });

    return {
      preview,
      eligibleCount: eligibleTeams.length,
      pendingEvaluationsCount,
    };
  }

  /**
   * Publishes company assignments as an immutable snapshot.
   */
  static async publishCompanyAssignments(
    adminEmail: string,
    companies: string[] = DEFAULT_COMPANIES
  ) {
    const { preview } = await this.previewCompanyAssignments(companies);

    if (preview.length === 0) {
      throw new Error('Cannot publish company assignments: No completed model-training evaluations found.');
    }

    // Set any prior published snapshot to published: false
    await CompanyAssignment.updateMany({ published: true }, { $set: { published: false } });

    const assignmentRecord = new CompanyAssignment({
      published: true,
      publishedAt: new Date(),
      publishedBy: adminEmail.toLowerCase().trim(),
      selectionOrderDescription: `Round-robin order over ${companies.length} companies: ${companies.join(', ')}`,
      assignments: preview,
    });

    await assignmentRecord.save();

    await logAudit(
      adminEmail,
      'COMPANY_ASSIGNMENTS_PUBLISHED',
      'CompanyAssignment',
      assignmentRecord._id.toString(),
      {
        totalAssigned: preview.length,
        companies,
      }
    );

    return assignmentRecord;
  }

  /**
   * Retrieves the latest published company assignments.
   */
  static async getPublishedCompanyAssignments() {
    return CompanyAssignment.findOne({ published: true }).sort({ publishedAt: -1 });
  }

  /**
   * Retrieves assigned company for a specific team.
   */
  static async getTeamCompanyAssignment(teamId: string) {
    const published = await this.getPublishedCompanyAssignments();
    if (!published) return null;
    return published.assignments.find((a) => a.teamId.toString() === teamId) || null;
  }
}
