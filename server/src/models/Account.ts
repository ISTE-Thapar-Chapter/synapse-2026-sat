import mongoose, { Schema, Document } from 'mongoose';

export type AccountRole = 'public' | 'evaluator' | 'admin';

export interface IAccount extends Document {
  name: string;
  email: string;
  role: AccountRole;
  createdAt: Date;
  updatedAt: Date;
}

const AccountSchema = new Schema<IAccount>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    role: { type: String, enum: ['public', 'evaluator', 'admin'], default: 'public', index: true },
  },
  { timestamps: true }
);

export const Account = mongoose.model<IAccount>('Account', AccountSchema);
