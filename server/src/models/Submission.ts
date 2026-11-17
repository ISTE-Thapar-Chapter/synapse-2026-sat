import mongoose, { Schema, Document, Types } from 'mongoose';

export type SubmissionStatus = 'draft' | 'submitted';

export interface ISubmissionReopen {
  reopenedBy: string;
  reason: string;
  reopenedAt: Date;
}

export interface IRequirementAnswer {
  title: string;
  companyName?: string;
  response: string;
  link?: string;
  notes?: string;
}

export interface ISubmissionPayload {
  // Cleaning round fields
  cleanedDatasetUrl?: string;
  cleaningNotes?: string;
  cleaningSummary?: string;
  answers?: Record<string, any>;

  // Requirements fields
  requirements?: IRequirementAnswer[];
  generalNotes?: string;

  // Model training fields
  companyName?: string;
  approachDescription?: string;
  accuracyResults?: string | number;
  githubUrl?: string;

  // Final submission fields
  title?: string;
  productDescription?: string;
  sourceUrl?: string;
}

export interface ISubmission extends Document {
  stage: 'cleaning' | 'requirements' | 'model-training' | 'final-submission';
  teamId: Types.ObjectId;
  status: SubmissionStatus;
  payload: ISubmissionPayload;
  submittedBy?: Types.ObjectId | null;
  submittedAt?: Date | null;
  isLocked: boolean;
  reopenHistory: ISubmissionReopen[];
  createdAt: Date;
  updatedAt: Date;
}

const SubmissionSchema = new Schema<ISubmission>(
  {
    stage: {
      type: String,
      enum: ['cleaning', 'requirements', 'model-training', 'final-submission'],
      required: true,
      index: true,
    },
    teamId: { type: Schema.Types.ObjectId, ref: 'Team', required: true, index: true },
    status: { type: String, enum: ['draft', 'submitted'], default: 'draft', index: true },
    payload: { type: Schema.Types.Mixed, default: {} },
    submittedBy: { type: Schema.Types.ObjectId, ref: 'Participant', default: null },
    submittedAt: { type: Date, default: null },
    isLocked: { type: Boolean, default: false },
    reopenHistory: [
      {
        reopenedBy: { type: String, required: true },
        reason: { type: String, required: true },
        reopenedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

// Unique compound index: one submission record per stage per team
SubmissionSchema.index({ stage: 1, teamId: 1 }, { unique: true });

export const Submission = mongoose.model<ISubmission>('Submission', SubmissionSchema);
