import { connectDB } from '../config/db.js';
import { Account } from '../models/Account.js';
import { Participant } from '../models/Participant.js';
import { Team } from '../models/Team.js';
import { Submission } from '../models/Submission.js';
import { Evaluation } from '../models/Evaluation.js';
import { LeaderboardSnapshot } from '../models/LeaderboardSnapshot.js';
import { CompanyAssignment } from '../models/CompanyAssignment.js';
import { env } from '../config/env.js';
import mongoose from 'mongoose';

export async function clearPresetData() {
  await connectDB();
  console.log('[Cleanup] Removing all preset emails and dummy accounts/teams...');

  const initialAdminEmail = env.ADMIN_INITIAL_EMAIL.toLowerCase().trim();

  // Delete all accounts EXCEPT the initial bootstrap administrator
  const deletedAccounts = await Account.deleteMany({ email: { $ne: initialAdminEmail } });
  console.log(`[Cleanup] Deleted ${deletedAccounts.deletedCount} non-admin accounts.`);

  // Delete all participants
  const deletedParticipants = await Participant.deleteMany({});
  console.log(`[Cleanup] Deleted ${deletedParticipants.deletedCount} participants.`);

  // Delete all teams
  const deletedTeams = await Team.deleteMany({});
  console.log(`[Cleanup] Deleted ${deletedTeams.deletedCount} teams.`);

  // Delete all submissions & evaluations
  await Submission.deleteMany({});
  await Evaluation.deleteMany({});
  await LeaderboardSnapshot.deleteMany({});
  await CompanyAssignment.deleteMany({});

  // Ensure bootstrap admin exists
  let admin = await Account.findOne({ email: initialAdminEmail });
  if (!admin) {
    admin = new Account({
      name: env.ADMIN_INITIAL_NAME,
      email: initialAdminEmail,
      role: 'admin',
    });
    await admin.save();
  } else {
    admin.role = 'admin';
    await admin.save();
  }

  console.log(`[Cleanup] System clean. Only bootstrap administrator account active: ${initialAdminEmail}`);
}

clearPresetData()
  .then(() => mongoose.disconnect())
  .catch((err) => {
    console.error('[Cleanup] Error:', err);
    process.exit(1);
  });
