import mongoose, { Schema, Document } from 'mongoose';

export type StageIdentifier =
  | 'registration'
  | 'cleaning'
  | 'cleaning-leaderboard'
  | 'model-training'
  | 'ranking'
  | 'final-submission';

export const VALID_STAGES: StageIdentifier[] = [
  'registration',
  'cleaning',
  'cleaning-leaderboard',
  'model-training',
  'ranking',
  'final-submission',
];

export interface ITransition {
  fromStage: StageIdentifier;
  toStage: StageIdentifier;
  reason: string;
  updatedBy: string;
  timestamp: Date;
}

export interface IEventStage extends Document {
  stageId: StageIdentifier;
  active: boolean;
  reason?: string;
  updatedBy?: string;
  transitionHistory: ITransition[];
  createdAt: Date;
  updatedAt: Date;
}

const EventStageSchema = new Schema<IEventStage>(
  {
    stageId: { type: String, enum: VALID_STAGES, required: true, unique: true, index: true },
    active: { type: Boolean, default: false, index: true },
    reason: { type: String, default: '' },
    updatedBy: { type: String, default: '' },
    transitionHistory: [
      {
        fromStage: { type: String, enum: VALID_STAGES, required: true },
        toStage: { type: String, enum: VALID_STAGES, required: true },
        reason: { type: String, required: true },
        updatedBy: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

export const EventStage = mongoose.model<IEventStage>('EventStage', EventStageSchema);
