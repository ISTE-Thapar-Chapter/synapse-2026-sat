import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IQuizScore extends Document {
  teamId: Types.ObjectId;
  teamName: string;
  quizMarks: number;
  multiplier: number;
  auctionBalance: number;
  spentTokens: number;
  remainingBalance: number;
  assignedCompanies: {
    queue1Company?: {
      id: string;
      name: string;
      description: string;
      assignedAt: Date;
    } | null;
    auctionCompany?: {
      id: string;
      name: string;
      description: string;
      price: number;
      wonAt: Date;
    } | null;
  };
  createdAt: Date;
  updatedAt: Date;
}

const QuizScoreSchema = new Schema<IQuizScore>(
  {
    teamId: { type: Schema.Types.ObjectId, ref: 'Team', required: true, unique: true, index: true },
    teamName: { type: String, required: true },
    quizMarks: { type: Number, default: 0 },
    multiplier: { type: Number, default: 100 },
    auctionBalance: { type: Number, default: 0 },
    spentTokens: { type: Number, default: 0 },
    remainingBalance: { type: Number, default: 0 },
    assignedCompanies: {
      queue1Company: {
        id: { type: String },
        name: { type: String },
        description: { type: String },
        assignedAt: { type: Date },
      },
      auctionCompany: {
        id: { type: String },
        name: { type: String },
        description: { type: String },
        price: { type: Number },
        wonAt: { type: Date },
      },
    },
  },
  { timestamps: true }
);

// Pre-save hook: auto-compute auction balance and remaining balance
QuizScoreSchema.pre('save', function (next) {
  this.auctionBalance = Math.round(this.quizMarks * this.multiplier);
  this.remainingBalance = Math.max(0, this.auctionBalance - (this.spentTokens || 0));
  next();
});

export const QuizScore = mongoose.model<IQuizScore>('QuizScore', QuizScoreSchema);
