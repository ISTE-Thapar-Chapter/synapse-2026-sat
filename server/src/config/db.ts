import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectDB(customUri?: string): Promise<typeof mongoose> {
  try {
    const isTest = process.env.NODE_ENV === 'test' || !!process.env.VITEST;
    const uri =
      customUri ||
      (isTest
        ? process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/synapse_2026_test'
        : env.MONGODB_URI);

    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`[Database] Connected to MongoDB: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error('[Database] MongoDB connection error:', error);
    throw error;
  }
}
