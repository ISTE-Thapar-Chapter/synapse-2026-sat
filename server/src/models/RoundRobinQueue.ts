import mongoose, { Schema, Document, Types } from 'mongoose';

export type RoundRobinQueueStatus = 'disabled' | 'idle' | 'active' | 'paused' | 'completed';

export interface ICompanyPoolItem {
  id: string;
  name: string;
  description: string;
  sector?: string;
  tier?: string;
  basePrice?: number;
  isAssigned: boolean;
  assignedToTeamId?: Types.ObjectId | null;
  assignedToTeamName?: string | null;
  assignedAt?: Date | null;
}

export interface IQueueTeamItem {
  teamId: Types.ObjectId;
  teamName: string;
  rank: number;
  score: number;
  hasSelected: boolean;
  selectedCompanyId?: string | null;
  selectedCompanyName?: string | null;
  selectedCompanyDescription?: string | null;
  selectedAt?: Date | null;
  isSkipped?: boolean;
}

export interface IRoundRobinQueue extends Document {
  queueNumber: 1 | 2;
  title: string;
  status: RoundRobinQueueStatus;
  burstTimeSeconds: number; // 120 (2 minutes)
  currentTurnIndex: number;
  currentTurnStartedAt: Date | null;
  currentTurnExpiresAt: Date | null;
  pausedRemainingSeconds: number | null;
  teams: IQueueTeamItem[];
  companies: ICompanyPoolItem[];
  createdAt: Date;
  updatedAt: Date;
}

const CompanyPoolItemSchema = new Schema<ICompanyPoolItem>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    sector: { type: String, default: '' },
    tier: { type: String, default: '' },
    basePrice: { type: Number, default: 0 },
    isAssigned: { type: Boolean, default: false },
    assignedToTeamId: { type: Schema.Types.ObjectId, ref: 'Team', default: null },
    assignedToTeamName: { type: String, default: null },
    assignedAt: { type: Date, default: null },
  },
  { _id: false }
);

const QueueTeamItemSchema = new Schema<IQueueTeamItem>(
  {
    teamId: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
    teamName: { type: String, required: true },
    rank: { type: Number, required: true },
    score: { type: Number, default: 0 },
    hasSelected: { type: Boolean, default: false },
    selectedCompanyId: { type: String, default: null },
    selectedCompanyName: { type: String, default: null },
    selectedCompanyDescription: { type: String, default: null },
    selectedAt: { type: Date, default: null },
    isSkipped: { type: Boolean, default: false },
  },
  { _id: false }
);

const RoundRobinQueueSchema = new Schema<IRoundRobinQueue>(
  {
    queueNumber: { type: Number, required: true, unique: true, enum: [1, 2] },
    title: { type: String, required: true },
    status: {
      type: String,
      enum: ['disabled', 'idle', 'active', 'paused', 'completed'],
      default: 'disabled',
      index: true,
    },
    burstTimeSeconds: { type: Number, default: 120 },
    currentTurnIndex: { type: Number, default: 0 },
    currentTurnStartedAt: { type: Date, default: null },
    currentTurnExpiresAt: { type: Date, default: null },
    pausedRemainingSeconds: { type: Number, default: null },
    teams: { type: [QueueTeamItemSchema], default: [] },
    companies: { type: [CompanyPoolItemSchema], default: [] },
  },
  { timestamps: true }
);

export const RoundRobinQueue = mongoose.model<IRoundRobinQueue>(
  'RoundRobinQueue',
  RoundRobinQueueSchema
);
