import mongoose, { Schema, Document, Types } from 'mongoose';

export type ParticipantRole = 'member' | 'leader';

export interface IParticipant extends Document {
  firstName: string;
  lastName?: string | null;
  email: string;
  college: string;
  teamId?: Types.ObjectId | null;
  role: ParticipantRole;
  restricted: boolean;
  phone?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const ParticipantSchema = new Schema<IParticipant>(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, default: null, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    college: { type: String, required: true, trim: true },
    teamId: { type: Schema.Types.ObjectId, ref: 'Team', default: null, index: true },
    role: { type: String, enum: ['member', 'leader'], default: 'member' },
    restricted: { type: Boolean, default: false, index: true },
    phone: { type: String, default: null, trim: true },
  },
  { timestamps: true }
);

export const Participant = mongoose.model<IParticipant>('Participant', ParticipantSchema);
