export type AccountRole = 'public' | 'evaluator' | 'admin';

export type StageIdentifier =
  | 'registration'
  | 'cleaning'
  | 'cleaning-leaderboard'
  | 'model-training'
  | 'ranking'
  | 'final-submission';

export interface User {
  email: string;
  name: string;
  role: AccountRole;
}

export interface Participant {
  _id: string;
  firstName: string;
  lastName?: string | null;
  email: string;
  college: string;
  teamId?: any;
  role: 'member' | 'leader';
  restricted: boolean;
  phone?: string | null;
}

export interface Team {
  _id: string;
  teamName: string;
  members: Participant[];
  leaderId: Participant | string;
  disqualified: boolean;
  mentorName?: string | null;
  mentorEmail?: string | null;
}

export interface Submission {
  _id: string;
  stage: 'cleaning' | 'requirements' | 'model-training' | 'final-submission';
  teamId: string;
  status: 'draft' | 'submitted';
  payload: Record<string, any>;
  submittedBy?: string | null;
  submittedAt?: string | null;
  isLocked: boolean;
  reopenHistory: Array<{
    reopenedBy: string;
    reason: string;
    reopenedAt: string;
  }>;
}

export interface Dataset {
  _id: string;
  stage: 'cleaning' | 'model-training';
  title: string;
  description: string;
  fileUrl: string;
  assignedTeamId?: string | null;
  isAvailableToAll?: boolean;
}

export interface EvaluationTarget {
  teamId: string;
  teamName: string;
  submissionId: string;
  submittedAt?: string;
  payload: Record<string, any>;
  evaluationId?: string | null;
  score?: number | null;
  feedback?: string | null;
  leaseStatus: 'available' | 'leased_to_me' | 'locked_by_other' | 'completed';
  leaseExpiresInSec: number;
  evaluatorEmail?: string | null;
}

export interface LeaderboardEntry {
  rank: number;
  teamId: string;
  teamName: string;
  college?: string;
  score: number;
  status?: string;
  hasSubmittedCleaning?: boolean;
  hasSubmittedRequirements?: boolean;
  accuracy?: any;
  submissionTime?: string;
  tieBreakReason?: string;
}

export interface CompanyAssignmentItem {
  rank: number;
  teamId: string;
  teamName: string;
  companyName: string;
  selectionOrder: number;
  exceptionNote?: string;
}

export interface AuditLogItem {
  _id: string;
  actorEmail: string;
  action: string;
  entityType: string;
  entityId?: string;
  details: Record<string, any>;
  reason?: string;
  timestamp: string;
}

export interface CompetitionConfig {
  _id: string;
  isEventStarted?: boolean;
  eventStartedAt?: string | null;
  cleaningDatasetTitle: string;
  cleaningDatasetUrl: string;
  cleaningDatasetDescription: string;
  requirementTitles: string[];
}
