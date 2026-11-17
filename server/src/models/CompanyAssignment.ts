import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ICompanyAssignmentItem {
  rank: number;
  teamId: Types.ObjectId;
  teamName: string;
  companyName: string;
  selectionOrder: number;
  exceptionNote?: string;
}

export interface ICompanyAssignment extends Document {
  published: boolean;
  publishedAt: Date;
  publishedBy: string;
  rankingSnapshotId?: Types.ObjectId | null;
  selectionOrderDescription: string;
  assignments: ICompanyAssignmentItem[];
  createdAt: Date;
  updatedAt: Date;
}

const CompanyAssignmentSchema = new Schema<ICompanyAssignment>(
  {
    published: { type: Boolean, default: false, index: true },
    publishedAt: { type: Date, default: Date.now },
    publishedBy: { type: String, required: true },
    rankingSnapshotId: { type: Schema.Types.ObjectId, ref: 'LeaderboardSnapshot', default: null },
    selectionOrderDescription: { type: String, default: 'Round-robin assignment by model-training rank' },
    assignments: [
      {
        rank: { type: Number, required: true },
        teamId: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
        teamName: { type: String, required: true },
        companyName: { type: String, required: true },
        selectionOrder: { type: Number, required: true },
        exceptionNote: { type: String, default: null },
      },
    ],
  },
  { timestamps: true }
);

export const CompanyAssignment = mongoose.model<ICompanyAssignment>(
  'CompanyAssignment',
  CompanyAssignmentSchema
);
