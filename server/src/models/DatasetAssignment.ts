import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IDatasetAssignment extends Document {
  stage: 'cleaning' | 'model-training';
  title: string;
  description: string;
  fileUrl: string; // Cloudflare R2 / Drive / external dataset link
  assignedTeamId?: Types.ObjectId | null;
  assignedParticipantId?: Types.ObjectId | null;
  isAvailableToAll?: boolean; // e.g. for model training 5 datasets
  createdAt: Date;
  updatedAt: Date;
}

const DatasetAssignmentSchema = new Schema<IDatasetAssignment>(
  {
    stage: { type: String, enum: ['cleaning', 'model-training'], required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    fileUrl: { type: String, required: true, trim: true },
    assignedTeamId: { type: Schema.Types.ObjectId, ref: 'Team', default: null, index: true },
    assignedParticipantId: { type: Schema.Types.ObjectId, ref: 'Participant', default: null },
    isAvailableToAll: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const DatasetAssignment = mongoose.model<IDatasetAssignment>('DatasetAssignment', DatasetAssignmentSchema);
