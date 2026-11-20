import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load server/.env first, then fallback to root .env
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const envSchema = z
  .object({
    PORT: z.string().default('5000').transform(Number),
    MONGODB_URI: z.string().default('mongodb://127.0.0.1:27017/synapse_2026'),
    JWT_SECRET: z.string().default('synapse2026_super_secure_secret_fallback'),
    ADMIN_INITIAL_EMAIL: z.string().email().default('singlayush1938@gmail.com'),
    ADMIN_INITIAL_NAME: z.string().default('ISTE Administrator'),
    GOOGLE_CLIENT_ID: z.string().default('mock-google-client-id'),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    CLIENT_URL: z.string().optional(), // Comma-separated allowed frontend origins for CORS (e.g. Vercel domain)
  })
  .refine(
    (data) => {
      if (data.NODE_ENV === 'production') {
        return (
          data.JWT_SECRET &&
          data.JWT_SECRET !== 'synapse2026_super_secure_secret_fallback' &&
          data.JWT_SECRET.length >= 24
        );
      }
      return true;
    },
    {
      message: 'In production mode, a strong JWT_SECRET (>= 24 chars) must be explicitly configured in the environment.',
      path: ['JWT_SECRET'],
    }
  );

export const env = envSchema.parse(process.env);
