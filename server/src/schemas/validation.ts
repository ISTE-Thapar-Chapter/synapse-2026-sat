import { z } from 'zod';
import { VALID_STAGES } from '../models/EventStage.js';

export const StageTransitionSchema = z.object({
  toStage: z.enum(VALID_STAGES as [string, ...string[]]),
  reason: z.string().min(3, 'A reason is required to transition stages'),
  forceException: z.boolean().optional(),
});

export const CleaningSubmissionSchema = z.object({
  cleanedDatasetUrl: z.string().url('A valid dataset URL is required'),
  cleaningNotes: z.string().min(5, 'Cleaning notes must be at least 5 characters'),
  cleaningSummary: z.string().min(5, 'Cleaning summary is required'),
  answers: z.record(z.any()).optional().default({}),
});

export const ModelTrainingSubmissionSchema = z.object({
  companyName: z.string().min(2, 'Company name is required'),
  approachDescription: z.string().min(10, 'Approach description must be at least 10 characters'),
  accuracyResults: z.union([z.string().min(1), z.number()]),
  githubUrl: z
    .string()
    .url('Must be a valid URL')
    .refine((url) => url.toLowerCase().includes('github.com'), {
      message: 'Source code link must be a valid GitHub repository URL',
    }),
});

export const FinalSubmissionSchema = z.object({
  title: z.string().min(3, 'Project title is required'),
  productDescription: z.string().min(10, 'Product description must be at least 10 characters'),
  sourceUrl: z.string().url('Source or live product link must be a valid URL'),
});

export const EvaluationSubmitSchema = z.object({
  score: z.number().min(0, 'Score cannot be negative').max(100, 'Score cannot exceed 100'),
  feedback: z.string().min(5, 'Feedback is required for evaluation audit'),
});

export const ScoreCorrectionSchema = z.object({
  newScore: z.number().min(0).max(100),
  reason: z.string().min(5, 'Reason is required to correct a published score'),
});

export const ReopenSubmissionSchema = z.object({
  reason: z.string().min(5, 'An administrative reason is required to reopen a submission'),
});

export const AccountCreateSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Valid email address is required'),
  role: z.enum(['public', 'evaluator', 'admin']),
});

export const AccountRoleUpdateSchema = z.object({
  role: z.enum(['public', 'evaluator', 'admin']),
});

export const TeamMemberInputSchema = z.object({
  name: z.string().min(2, 'Member name is required'),
  email: z.string().email('Valid member email is required'),
});

export const ManualTeamCreateSchema = z.object({
  teamName: z.string().min(2, 'Team name is required'),
  leaderName: z.string().min(2, 'Leader name is required'),
  leaderEmail: z.string().email('Leader email must be a valid email address'),
  members: z.array(TeamMemberInputSchema).optional().default([]),
  participantEmails: z.array(z.string().email()).optional().default([]),
  memberEmails: z.array(z.string().email()).optional(),
  college: z.string().optional().default('Independent'),
  mentorName: z.string().optional(),
  mentorEmail: z.string().email().optional().or(z.literal('')),
});

export const ToggleRestrictionSchema = z.object({
  restricted: z.boolean(),
  reason: z.string().min(3, 'Reason is required'),
});

export const ToggleDisqualificationSchema = z.object({
  disqualified: z.boolean(),
  reason: z.string().min(3, 'Reason is required'),
});

export const LeaderboardPublishSchema = z.object({
  tieBreakPolicy: z.enum(['score_desc', 'score_desc_then_time_asc']).default('score_desc_then_time_asc'),
});
