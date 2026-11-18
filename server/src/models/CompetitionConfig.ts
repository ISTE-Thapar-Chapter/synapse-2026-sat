import mongoose, { Schema, Document } from 'mongoose';

export interface ILiveAuctionBid {
  teamId: mongoose.Types.ObjectId;
  teamName: string;
  amount: number;
  timestamp: Date;
}

export interface ILiveAuctionItem {
  id: string;
  name: string;
  description: string;
  basePrice?: number;
}

export interface ILiveAuctionState {
  activeItem: ILiveAuctionItem | null;
  status: 'idle' | 'bidding' | 'sold' | 'paused';
  currentBid: number;
  highestBidderTeamId: mongoose.Types.ObjectId | null;
  highestBidderTeamName: string | null;
  bidHistory: ILiveAuctionBid[];
}

export interface IFeatureDefinition {
  featureIndex: number;
  title: string;
  expectedCompany: string;
}

export interface IAuctionCompanyItem {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  isAssigned?: boolean;
  assignedToTeamId?: mongoose.Types.ObjectId | null;
  assignedToTeamName?: string | null;
  assignedAt?: Date | null;
}

export interface IWinnerPodiumItem {
  rank: 1 | 2 | 3;
  teamId: mongoose.Types.ObjectId | string;
  teamName: string;
  college?: string;
  score?: number;
  prizeTitle?: string;
}

export interface IWinnersAnnouncement {
  announced: boolean;
  announcedAt: Date | null;
  winners: IWinnerPodiumItem[];
}

export interface ICompetitionConfig extends Document {
  isEventStarted: boolean;
  eventStartedAt: Date | null;
  cleaningDatasetTitle: string;
  cleaningDatasetUrl: string;
  cleaningDatasetDescription: string;
  requirementTitles: string[];
  featureDefinitions: IFeatureDefinition[];
  leaderboardVisible: boolean;
  quizMultiplier: number;
  liveAuction: ILiveAuctionState;
  auctionCompanies: IAuctionCompanyItem[];
  finalSubmissionOpen: boolean;
  winnersAnnouncement?: IWinnersAnnouncement;
  createdAt: Date;
  updatedAt: Date;
}

const CompetitionConfigSchema = new Schema<ICompetitionConfig>(
  {
    isEventStarted: {
      type: Boolean,
      default: false,
    },
    eventStartedAt: {
      type: Date,
      default: null,
    },
    cleaningDatasetTitle: {
      type: String,
      default: 'Satellite Multi-Spectral Sensor Dataset',
      trim: true,
    },
    cleaningDatasetUrl: {
      type: String,
      default: 'https://datasets.iste.org/synapse/cleaning/satellite-v1.parquet',
      trim: true,
    },
    cleaningDatasetDescription: {
      type: String,
      default: 'Clean and impute missing sensor channels, handle outliers, and normalize coordinates.',
      trim: true,
    },
    requirementTitles: {
      type: [String],
      default: [
        'Track 1: Climate Forecasting Architecture',
        'Track 2: Autonomous Trajectory Prediction',
        'Track 3: Financial Risk Classification',
        'Track 4: Biomedical Sequence Modeling',
        'Track 5: Energy Grid Load Balancer',
      ],
    },
    featureDefinitions: [
      {
        featureIndex: { type: Number, required: true },
        title: { type: String, required: true },
        expectedCompany: { type: String, default: '' },
      },
    ],
    leaderboardVisible: {
      type: Boolean,
      default: false,
    },
    quizMultiplier: {
      type: Number,
      default: 100,
    },
    liveAuction: {
      activeItem: {
        id: { type: String, default: null },
        name: { type: String, default: '' },
        description: { type: String, default: '' },
        basePrice: { type: Number, default: 0 },
      },
      status: {
        type: String,
        enum: ['idle', 'bidding', 'sold', 'paused'],
        default: 'idle',
      },
      currentBid: { type: Number, default: 0 },
      highestBidderTeamId: { type: Schema.Types.ObjectId, ref: 'Team', default: null },
      highestBidderTeamName: { type: String, default: null },
      bidHistory: [
        {
          teamId: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
          teamName: { type: String, required: true },
          amount: { type: Number, required: true },
          timestamp: { type: Date, default: Date.now },
        },
      ],
    },
    auctionCompanies: [
      {
        id: { type: String, required: true },
        name: { type: String, required: true, trim: true },
        description: { type: String, required: true, trim: true },
        basePrice: { type: Number, default: 0 },
        isAssigned: { type: Boolean, default: false },
        assignedToTeamId: { type: Schema.Types.ObjectId, ref: 'Team', default: null },
        assignedToTeamName: { type: String, default: null },
        assignedAt: { type: Date, default: null },
      },
    ],
    finalSubmissionOpen: {
      type: Boolean,
      default: false,
    },
    winnersAnnouncement: {
      announced: { type: Boolean, default: false },
      announcedAt: { type: Date, default: null },
      winners: [
        {
          rank: { type: Number, required: true },
          teamId: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
          teamName: { type: String, required: true },
          college: { type: String, default: '' },
          score: { type: Number, default: 0 },
          prizeTitle: { type: String, default: '' },
        },
      ],
    },
  },
  { timestamps: true }
);

export const CompetitionConfig = mongoose.model<ICompetitionConfig>(
  'CompetitionConfig',
  CompetitionConfigSchema
);
