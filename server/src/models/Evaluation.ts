import mongoose, { Schema, Document, Types } from 'mongoose';

export type EvaluationStatus = 'in_progress' | 'completed' | 'excepted';

export interface IScoreCorrection {
  modifiedBy: string;
  oldScore: number;
  newScore: number;
  reason: string;
  timestamp: Date;
}

export interface IEvaluation extends Document {
  stage: 'cleaning' | 'model-training' | 'requirements';
  targetTeamId: Types.ObjectId;
  submissionId: Types.ObjectId;
  evaluatorEmail: string;
  score: number;
  feedback: string;
  status: EvaluationStatus;
  leaseExpiresAt?: Date | null;
  completedAt?: Date | null;
  correctionHistory: IScoreCorrection[];
  createdAt: Date;
  updatedAt: Date;
}

const EvaluationSchema = new Schema<IEvaluation>(
  {
    stage: { type: String, enum: ['cleaning', 'model-training', 'requirements'], required: true, index: true },
    targetTeamId: { type: Schema.Types.ObjectId, ref: 'Team', required: true, index: true },
    submissionId: { type: Schema.Types.ObjectId, ref: 'Submission', required: true, index: true },
    evaluatorEmail: { type: String, required: true, lowercase: true, trim: true, index: true },
    score: { type: Number, default: 0 },
    feedback: { type: String, default: '', trim: true },
    status: {
      type: String,
      enum: ['in_progress', 'completed', 'excepted'],
      default: 'in_progress',
      index: true,
    },
    leaseExpiresAt: { type: Date, default: null, index: true },
    completedAt: { type: Date, default: null },
    correctionHistory: [
      {
        modifiedBy: { type: String, required: true },
        oldScore: { type: Number, required: true },
        newScore: { type: Number, required: true },
        reason: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

// One evaluation per stage per team
EvaluationSchema.index({ stage: 1, targetTeamId: 1 }, { unique: true });

export const Evaluation = mongoose.model<IEvaluation>('Evaluation', EvaluationSchema);
