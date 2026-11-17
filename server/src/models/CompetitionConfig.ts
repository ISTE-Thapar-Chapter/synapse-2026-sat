import mongoose, { Schema, Document } from 'mongoose';

export interface ICompetitionConfig extends Document {
  cleaningDatasetTitle: string;
  cleaningDatasetUrl: string;
  cleaningDatasetDescription: string;
  requirementTitles: string[];
  createdAt: Date;
  updatedAt: Date;
}

const CompetitionConfigSchema = new Schema<ICompetitionConfig>(
  {
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
  },
  { timestamps: true }
);

export const CompetitionConfig = mongoose.model<ICompetitionConfig>(
  'CompetitionConfig',
  CompetitionConfigSchema
);
