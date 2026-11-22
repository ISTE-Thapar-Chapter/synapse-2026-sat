export type AccountRole = 'public' | 'evaluator' | 'mentor' | 'admin' | 'desk';

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
  validationDatasetReleased?: boolean;
  validationDatasetReleasedAt?: string | null;
  validationDatasetReleasedBy?: string | null;
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

export interface LiveAuctionBid {
  teamId: string;
  teamName: string;
  amount: number;
  timestamp: string;
}

export interface LiveAuctionItem {
  id: string;
  name: string;
  description: string;
  basePrice?: number;
}

export interface LiveAuctionState {
  activeItem: LiveAuctionItem | null;
  status: 'idle' | 'bidding' | 'sold' | 'paused';
  currentBid: number;
  highestBidderTeamId?: string | null;
  highestBidderTeamName?: string | null;
  bidHistory: LiveAuctionBid[];
}

export interface FeatureDefinition {
  featureIndex: number;
  title: string;
  expectedCompany: string;
}

export interface AuctionCompanyItem {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  isAssigned?: boolean;
  assignedToTeamId?: string | null;
  assignedToTeamName?: string | null;
  assignedAt?: string | null;
}

export interface WinnerPodiumItem {
  rank: 1 | 2 | 3;
  teamId: string;
  teamName: string;
  college?: string;
  score?: number;
  prizeTitle?: string;
}

export interface WinnersAnnouncement {
  announced: boolean;
  announcedAt?: string | null;
  winners: WinnerPodiumItem[];
}

export interface CompetitionConfig {
  _id: string;
  isEventStarted?: boolean;
  eventStartedAt?: string | null;
  cleaningDatasetTitle: string;
  cleaningDatasetUrl: string;
  cleaningDatasetDescription: string;
  validationDatasetTitle?: string;
  validationDatasetUrl?: string;
  validationDatasetDescription?: string;
  requirementTitles: string[];
  featureDefinitions?: FeatureDefinition[];
  leaderboardVisible?: boolean;
  quizMultiplier?: number;
  liveAuction?: LiveAuctionState;
  auctionCompanies?: AuctionCompanyItem[];
  finalSubmissionOpen?: boolean;
  winnersAnnouncement?: WinnersAnnouncement;
}

export interface QuizQuestionItem {
  id: number;
  title?: string;
  question: string;
  options: string[];
  correct?: number | null;
  acceptedFlags?: string[];
  image?: string;
  type?: 'flag' | 'text' | 'multiple_choice' | string;
  points?: number;
  difficulty?: 'easy' | 'medium' | 'hard' | string;
  hint?: string;
  resourceLink?: string;
  category?: string;
}

export interface FeatureSetSubmissionItem {
  featureIndex: number;
  title?: string;
  companyName: string;
}

export interface MentorFeatureGrade {
  featureIndex: number;
  companyName: string;
  marks: number;
  accuracyScore: number;
  confidenceScore: number;
  feedback?: string;
}

export interface MentorEvaluation {
  mentorName: string;
  mentorEmail: string;
  featureGrades: MentorFeatureGrade[];
  totalFeatureMarks: number;
  overallAccuracyScore: number;
  overallConfidenceScore: number;
  gradedAt: string;
}

export interface FinalProjectSubmission {
  productName: string;
  productDescription: string;
  prototypeUrl: string;
  githubUrl?: string;
  submittedAt?: string;
}

export interface TeamAuctionBalance {
  hasTeam: boolean;
  teamId?: string;
  teamName?: string;
  quizMarks: number;
  multiplier: number;
  auctionBalance: number;
  spentTokens: number;
  remainingBalance: number;
  tokensReleased?: boolean;
  assignedCompanies?: {
    queue1Company?: { id: string; name: string; description: string; assignedAt: string } | null;
    auctionCompany?: { id: string; name: string; description: string; price: number; wonAt: string } | null;
  };
}

export type RoundRobinQueueStatus = 'disabled' | 'idle' | 'active' | 'paused' | 'completed';

export interface CompanyPoolItem {
  id: string;
  name: string;
  description: string;
  isAssigned: boolean;
  assignedToTeamId?: string | null;
  assignedToTeamName?: string | null;
  assignedAt?: string | null;
}

export interface QueueTeamItem {
  teamId: string;
  teamName: string;
  rank: number;
  score: number;
  hasSelected: boolean;
  selectedCompanyId?: string | null;
  selectedCompanyName?: string | null;
  selectedCompanyDescription?: string | null;
  selectedAt?: string | null;
  isSkipped?: boolean;
}

export interface AdminQueueState {
  _id: string;
  queueNumber: 1 | 2;
  title: string;
  status: RoundRobinQueueStatus;
  burstTimeSeconds: number;
  currentTurnIndex: number;
  currentTurnTeam: QueueTeamItem | null;
  currentTurnExpiresAt?: string | null;
  remainingSeconds: number;
  totalTeams: number;
  selectedTeamsCount: number;
  skippedTeamsCount: number;
  totalCompanies: number;
  assignedCompaniesCount: number;
  companies: CompanyPoolItem[];
  teams: QueueTeamItem[];
}

export interface ParticipantQueueStatus {
  queueNumber: 1 | 2;
  title: string;
  status: RoundRobinQueueStatus;
  burstTimeSeconds: number;
  currentTurnIndex: number;
  currentTurnTeamName?: string | null;
  isMyTurn: boolean;
  remainingSeconds: number;
  myTeamOrder: number | null;
  myAssignment: {
    companyId: string;
    companyName: string;
    companyDescription: string;
    selectedAt: string;
  } | null;
  availableCompanies: CompanyPoolItem[];
  totalCompanies: number;
}

export interface ParticipantRoundRobinState {
  teamId: string;
  queue1: ParticipantQueueStatus;
  queue2: ParticipantQueueStatus;
}
