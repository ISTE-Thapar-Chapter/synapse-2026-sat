import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IQuizSubmissionAnswer {
  questionId: number;
  selectedOption?: number | null;
  textAnswer?: string;
  flag?: string;
}

export interface IQuizSubmission extends Document {
  teamId: Types.ObjectId;
  teamName: string;
  submittedBy?: Types.ObjectId | null;
  submittedByName?: string | null;
  answers: IQuizSubmissionAnswer[];
  score: number;
  totalQuestions: number;
  submittedAt: Date;
  submissionCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const QuizSubmissionSchema = new Schema<IQuizSubmission>(
  {
    teamId: {
      type: Schema.Types.ObjectId,
      ref: 'Team',
      required: true,
      unique: true,
      index: true,
    },
    teamName: {
      type: String,
      required: true,
      trim: true,
    },
    submittedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
      default: null,
    },
    submittedByName: {
      type: String,
      default: null,
    },
    answers: [
      {
        questionId: { type: Number, required: true },
        selectedOption: { type: Number, default: null },
        textAnswer: { type: String, default: '' },
        flag: { type: String, default: '' },
      },
    ],
    score: {
      type: Number,
      default: 0,
    },
    totalQuestions: {
      type: Number,
      default: 0,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    submissionCount: {
      type: Number,
      default: 1,
    },
  },
  { timestamps: true }
);

export const QuizSubmission = mongoose.model<IQuizSubmission>(
  'QuizSubmission',
  QuizSubmissionSchema
);
