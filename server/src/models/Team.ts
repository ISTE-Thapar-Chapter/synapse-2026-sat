import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ITeam extends Document {
  teamName: string;
  members: Types.ObjectId[];
  leaderId: Types.ObjectId | null;
  disqualified: boolean;
  mentorName?: string | null;
  mentorEmail?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const TeamSchema = new Schema<ITeam>(
  {
    teamName: { type: String, required: true, unique: true, trim: true, index: true },
    members: [{ type: Schema.Types.ObjectId, ref: 'Participant' }],
    leaderId: { type: Schema.Types.ObjectId, ref: 'Participant', default: null },
    disqualified: { type: Boolean, default: false, index: true },
    mentorName: { type: String, default: null, trim: true },
    mentorEmail: { type: String, default: null, lowercase: true, trim: true },
  },
  { timestamps: true }
);

export const Team = mongoose.model<ITeam>('Team', TeamSchema);
