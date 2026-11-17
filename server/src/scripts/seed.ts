import { connectDB } from '../config/db.js';
import { Account } from '../models/Account.js';
import { StageService } from '../services/stageService.js';
import { env } from '../config/env.js';
import mongoose from 'mongoose';

export async function seedDatabase() {
  await connectDB();
  console.log('[Seed] Initializing Synapse 2026 stages and admin account...');

  // Initialize event stages if empty
  await StageService.initializeStages();

  // Ensure initial bootstrap administrator from environment
  const initialAdminEmail = env.ADMIN_INITIAL_EMAIL.toLowerCase().trim();
  let admin = await Account.findOne({ email: initialAdminEmail });
  if (!admin) {
    admin = new Account({
      name: env.ADMIN_INITIAL_NAME,
      email: initialAdminEmail,
      role: 'admin',
    });
    await admin.save();
    console.log(`[Seed] Bootstrap administrator provisioned: ${initialAdminEmail}`);
  } else {
    admin.role = 'admin';
    await admin.save();
    console.log(`[Seed] Administrator account verified: ${initialAdminEmail}`);
  }

  console.log('[Seed] Database initialization complete. No preset dummy accounts or teams inserted.');
}

if (process.argv[1]?.includes('seed.ts')) {
  seedDatabase()
    .then(() => mongoose.disconnect())
    .catch((err) => {
      console.error('[Seed] Error:', err);
      process.exit(1);
    });
}
