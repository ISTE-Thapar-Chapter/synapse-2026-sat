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

export interface IFeatureSetItem {
  featureIndex: number; // 0 to 4
  title?: string;
  companyName: string; // ONLY company name input
}

export interface IMentorFeatureGrade {
  featureIndex: number;
  companyName: string;
  marks: number; // 0 to 10
  accuracyScore: number; // 0 to 100
  confidenceScore: number; // 0 to 100
  feedback?: string;
}

export interface IMentorEvaluation {
  mentorId?: Types.ObjectId | null;
  mentorName: string;
  mentorEmail: string;
  gradedBy?: string;
  featureGrades: IMentorFeatureGrade[];
  totalFeatureMarks: number; // 0 to 50
  totalMarks?: number;
  overallAccuracyScore: number; // 0 to 100
  overallConfidenceScore: number; // 0 to 100
  gradedAt: Date;
}

export interface IFinalSubmission {
  productName: string;
  productDescription: string;
  prototypeUrl: string;
  githubUrl?: string;
  submittedAt: Date;
}

export interface ISubmissionPayload {
  // Stage 1: Dataset & Architecture / PSB links
  datasetUrl?: string;
  psbUrl?: string;
  cleanedDatasetUrl?: string;
  cleaningNotes?: string;
  cleaningSummary?: string;
  answers?: Record<string, any>;

  // Stage 2: 5 Feature sets (Company names only)
  features?: IFeatureSetItem[];
  requirements?: IRequirementAnswer[];
  methodologySummary?: string;
  generalNotes?: string;

  // Mentor evaluation per feature set
  mentorEvaluation?: IMentorEvaluation;

  // Model training fields (legacy / compatibility)
  companyName?: string;
  approachDescription?: string;
  accuracyResults?: string | number;
  githubUrl?: string;

  // Final project submission
  finalSubmission?: IFinalSubmission;
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
