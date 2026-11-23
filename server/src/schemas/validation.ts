import { z } from 'zod';
import { VALID_STAGES } from '../models/EventStage.js';

export const StageTransitionSchema = z.object({
  toStage: z.enum(VALID_STAGES as [string, ...string[]]),
  reason: z.string().min(3, 'A reason is required to transition stages'),
  forceException: z.boolean().optional(),
});

export const safeWebUrl = (msg = 'A valid web link (http:// or https://) is required') =>
  z
    .string()
    .url(msg)
    .refine((url) => /^https?:\/\//i.test(url.trim()), {
      message: msg,
    });

export const CleaningSubmissionSchema = z.object({
  cleanedDatasetUrl: safeWebUrl('A valid dataset URL is required').optional(),
  datasetUrl: safeWebUrl('A valid dataset URL is required').optional(),
  psbUrl: safeWebUrl('A valid architecture or .psb file link is required'),
  cleaningNotes: z.string().optional().default(''),
  cleaningSummary: z.string().optional().default(''),
  answers: z.record(z.any()).optional().default({}),
}).refine((data) => data.cleanedDatasetUrl || data.datasetUrl, {
  message: 'Please provide a valid dataset web link.',
  path: ['datasetUrl'],
});

export const FeatureCompanyItemSchema = z.object({
  featureIndex: z.number().int().min(0).max(4),
  title: z.string().optional().default(''),
  companyName: z.string().min(2, 'Please enter a valid company name (at least 2 characters)'),
});

export const FeaturesSubmissionSchema = z.object({
  features: z.array(FeatureCompanyItemSchema).optional().default([]),
  notes: z.string().optional(),
});

export const MentorFeatureGradeItemSchema = z.object({
  featureIndex: z.number().int().min(0).max(4).optional().default(0),
  companyName: z.string().optional().default(''),
  marks: z.number().min(0, 'Marks cannot be negative').max(50, 'Marks cannot exceed 50').optional().default(0),
  accuracyScore: z.number().min(0, 'Accuracy rating must be between 0 and 100').max(100, 'Accuracy rating must be between 0 and 100').optional(),
  accuracyPercent: z.number().min(0, 'Accuracy rating must be between 0 and 100').max(100, 'Accuracy rating must be between 0 and 100').optional(),
  confidenceScore: z.number().min(0, 'Confidence rating must be between 0 and 100').max(100, 'Confidence rating must be between 0 and 100').optional(),
  confidencePercent: z.number().min(0, 'Confidence rating must be between 0 and 100').max(100, 'Confidence rating must be between 0 and 100').optional(),
  feedback: z.string().optional().default(''),
}).transform((data) => ({
  featureIndex: data.featureIndex,
  companyName: data.companyName || '',
  marks: data.marks,
  accuracyScore: data.accuracyScore ?? data.accuracyPercent ?? 0,
  confidenceScore: data.confidenceScore ?? data.confidencePercent ?? 0,
  feedback: data.feedback || '',
}));

export const MentorEvaluationSubmitSchema = z.object({
  teamId: z.string().min(1, 'Team selection is required'),
  marks: z.number().min(0, 'Marks cannot be negative').max(50, 'Marks cannot exceed 50').optional(),
  accuracyScore: z.number().min(0, 'Accuracy score must be between 0 and 100').max(100, 'Accuracy score must be between 0 and 100').optional(),
  confidenceScore: z.number().min(0, 'Confidence score must be between 0 and 100').max(100, 'Confidence score must be between 0 and 100').optional(),
  round1Score: z.number().min(0, 'Round 1 score must be between 0 and 100').max(100, 'Round 1 score must be between 0 and 100').optional(),
  finalScore: z.number().min(0, 'Final score must be between 0 and 100').max(100, 'Final score must be between 0 and 100').optional(),
  feedback: z.string().optional().default(''),
  featureGrades: z.array(MentorFeatureGradeItemSchema).optional(),
  releaseValidationDataset: z.boolean().optional(),
});

export const FinalProjectSubmissionSchema = z.object({
  productName: z.string().min(2, 'Please enter a valid product name'),
  productDescription: z.string().min(10, 'Please enter a product description (at least 10 characters)'),
  prototypeUrl: safeWebUrl('Please enter a valid web link (http:// or https://) for your prototype / pitch demo'),
  githubUrl: safeWebUrl('Please enter a valid web link (http:// or https://) for GitHub').optional().or(z.literal('')),
});

export const QuizScoreEntrySchema = z.object({
  teamId: z.string().min(1, 'Team is required'),
  quizMarks: z.number().min(0, 'Quiz marks cannot be negative'),
});

export const BatchQuizScoreSchema = z.object({
  scores: z.array(QuizScoreEntrySchema),
  multiplier: z.number().positive().optional(),
});

export const AuctionBidSubmitSchema = z.object({
  bidAmount: z.number().positive('Bid amount must be greater than zero'),
});

export const AuctionAssignSchema = z.object({
  teamId: z.string().min(1, 'Please select a team to assign the company to'),
});

export const FeatureDefinitionItemSchema = z.object({
  featureIndex: z.number().int().min(0).max(4),
  title: z.string().min(1, 'Feature title is required'),
  expectedCompany: z.string().optional().default(''),
});

export const RequirementAnswerSchema = z.object({
  title: z.string().min(1, 'Feature title is required'),
  companyName: z.string().min(2, 'Company name is required for this feature').optional().default('Enterprise Solution'),
  response: z.string().min(5, 'Methodology must be at least 5 characters'),
  link: safeWebUrl('Must be a valid web link (http:// or https://)').optional().or(z.literal('')),
  notes: z.string().optional().default(''),
});

export const RequirementsSubmissionSchema = z.object({
  companyName: z.string().min(2, 'Company name is required').optional().default('Enterprise Solution'),
  methodologySummary: z.string().optional().default(''),
  requirements: z.array(RequirementAnswerSchema).min(1, 'At least one requirement submission is required'),
  generalNotes: z.string().optional().default(''),
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
  role: z.enum(['public', 'evaluator', 'mentor', 'admin', 'desk']),
});

export const AccountRoleUpdateSchema = z.object({
  role: z.enum(['public', 'evaluator', 'mentor', 'admin', 'desk']),
});

export const TeamMemberInputSchema = z.object({
  name: z.string().min(2, 'Member name is required'),
  email: z.string().email('Valid member email is required'),
});

export const TeamUpdateMemberItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Member name is required').trim(),
  email: z.string().email('Valid member email is required').toLowerCase().trim(),
  role: z.enum(['leader', 'member']).optional(),
  college: z.string().optional(),
});

export const TeamUpdateSchema = z.object({
  teamName: z.string().min(2, 'Team name must be at least 2 characters').trim(),
  college: z.string().optional().default('Independent'),
  leaderEmail: z.string().email('Valid leader email is required').toLowerCase().trim().optional(),
  members: z.array(TeamUpdateMemberItemSchema).min(1, 'A team must have at least one member'),
  mentorName: z.string().optional().nullable(),
  mentorEmail: z.string().email().optional().nullable().or(z.literal('')),
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

export const CompanyConfigItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, 'Company name is required'),
  description: z.string().min(5, 'Description must be at least 5 characters'),
});

export const CompaniesUpdateSchema = z.object({
  companies: z.array(CompanyConfigItemSchema).min(1, 'At least one company must be configured'),
});

export const CompanySelectSchema = z.object({
  companyId: z.string().min(1, 'Company ID is required'),
});

export const AuctionCompanyItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, 'Company name is required'),
  description: z.string().min(5, 'Description must be at least 5 characters'),
  sector: z.string().optional().default(''),
  tier: z.string().optional().default(''),
  basePrice: z.number().min(0, 'Base price cannot be negative').optional().default(0),
});

export const BatchAuctionCompaniesSchema = z.object({
  companies: z.array(AuctionCompanyItemSchema),
});

export const AuctionReassignSchema = z.object({
  teamId: z.string().min(1, 'Team ID is required'),
  companyId: z.string().optional().nullable(),
  companyName: z.string().optional(),
  companyDescription: z.string().optional(),
  price: z.number().min(0).optional(),
});

export const FinalSubmissionToggleSchema = z.object({
  open: z.boolean(),
});

export const WinnerPodiumItemSchema = z.object({
  rank: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  teamId: z.string().min(1, 'Team ID is required'),
  teamName: z.string().min(1, 'Team name is required'),
  college: z.string().optional().default(''),
  score: z.number().optional().default(0),
  prizeTitle: z.string().optional().default(''),
});

export const WinnersAnnouncementToggleSchema = z.object({
  announced: z.boolean().optional(),
  winners: z.array(WinnerPodiumItemSchema).optional(),
});
