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
  },
  { timestamps: true }
);

export const CompetitionConfig = mongoose.model<ICompetitionConfig>(
  'CompetitionConfig',
  CompetitionConfigSchema
);
