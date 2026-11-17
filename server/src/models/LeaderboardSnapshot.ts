import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ILeaderboardEntry {
  rank: number;
  teamId: Types.ObjectId;
  teamName: string;
  score: number;
  accuracy?: number | string;
  submissionTime?: Date;
  tieBreakReason?: string;
}

export interface ILeaderboardSnapshot extends Document {
  stage: 'cleaning' | 'model-training';
  published: boolean;
  publishedAt: Date;
  publishedBy: string;
  tieBreakPolicy: string;
  sourceEvaluationsCount: number;
  entries: ILeaderboardEntry[];
  createdAt: Date;
  updatedAt: Date;
}

const LeaderboardSnapshotSchema = new Schema<ILeaderboardSnapshot>(
  {
    stage: { type: String, enum: ['cleaning', 'model-training'], required: true, index: true },
    published: { type: Boolean, default: false, index: true },
    publishedAt: { type: Date, default: Date.now },
    publishedBy: { type: String, required: true },
    tieBreakPolicy: { type: String, required: true },
    sourceEvaluationsCount: { type: Number, required: true },
    entries: [
      {
        rank: { type: Number, required: true },
        teamId: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
        teamName: { type: String, required: true },
        score: { type: Number, required: true },
        accuracy: { type: Schema.Types.Mixed },
        submissionTime: { type: Date },
        tieBreakReason: { type: String, default: '' },
      },
    ],
  },
  { timestamps: true }
);

export const LeaderboardSnapshot = mongoose.model<ILeaderboardSnapshot>(
  'LeaderboardSnapshot',
  LeaderboardSnapshotSchema
);
