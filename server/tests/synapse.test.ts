import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app, { startServer } from '../src/index.js';
import { connectDB } from '../src/config/db.js';
import { Account } from '../src/models/Account.js';
import { Participant } from '../src/models/Participant.js';
import { Team } from '../src/models/Team.js';
import { EventStage } from '../src/models/EventStage.js';
import { Submission } from '../src/models/Submission.js';
import { Evaluation } from '../src/models/Evaluation.js';
import { LeaderboardSnapshot } from '../src/models/LeaderboardSnapshot.js';
import { CompanyAssignment } from '../src/models/CompanyAssignment.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { signUserToken } from '../src/middleware/auth.js';
import { LeaseService } from '../src/services/leaseService.js';
import { ImportService } from '../src/services/importService.js';
import { LeaderboardService } from '../src/services/leaderboardService.js';
import { RankingService } from '../src/services/rankingService.js';
import { StageService } from '../src/services/stageService.js';

function mockGoogleToken(email: string, name: string) {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64');
  const payload = Buffer.from(JSON.stringify({ email: email.toLowerCase(), name })).toString('base64');
  return `${header}.${payload}.mockSignature`;
}

let adminToken: string;
let evaluatorToken: string;
let leaderToken: string;
let memberToken: string;
let unknownToken: string;

let testTeam: any;
let testLeader: any;
let testMember: any;

beforeAll(async () => {
  await connectDB();
  await StageService.initializeStages();

  // Reset active stage to 'registration'
  await EventStage.updateMany({}, { $set: { active: false } });
  await EventStage.findOneAndUpdate({ stageId: 'registration' }, { $set: { active: true } });

  // Clean prior test artifacts
  await Participant.deleteMany({ email: { $in: ['rohit@cricket.in', 'rishi@gmail.com'] } });
  await Team.deleteMany({ teamName: { $in: ['Hitmen', 'Alpha Squad'] } });
  await Account.deleteMany({ email: { $in: ['rohit@cricket.in', 'rishi@gmail.com'] } });

  // Create accounts
  await Account.findOneAndUpdate(
    { email: 'admin-test@iste.org' },
    { name: 'Admin Tester', email: 'admin-test@iste.org', role: 'admin' },
    { upsert: true }
  );
  await Account.findOneAndUpdate(
    { email: 'evaluator-test@iste.org' },
    { name: 'Evaluator Tester', email: 'evaluator-test@iste.org', role: 'evaluator' },
    { upsert: true }
  );

  testLeader = await Participant.findOneAndUpdate(
    { email: 'leader-test@univ.edu' },
    { firstName: 'Leader', email: 'leader-test@univ.edu', college: 'Test Univ', role: 'leader' },
    { upsert: true, new: true }
  );

  testMember = await Participant.findOneAndUpdate(
    { email: 'member-test@univ.edu' },
    { firstName: 'Member', email: 'member-test@univ.edu', college: 'Test Univ', role: 'member' },
    { upsert: true, new: true }
  );

  testTeam = await Team.findOneAndUpdate(
    { teamName: 'Test Vector Team' },
    {
      teamName: 'Test Vector Team',
      members: [testLeader._id, testMember._id],
      leaderId: testLeader._id,
      disqualified: false,
    },
    { upsert: true, new: true }
  );

  await Participant.findByIdAndUpdate(testLeader._id, { teamId: testTeam._id, role: 'leader' });
  await Participant.findByIdAndUpdate(testMember._id, { teamId: testTeam._id, role: 'member' });

  adminToken = signUserToken('admin-test@iste.org', 'Admin Tester');
  evaluatorToken = signUserToken('evaluator-test@iste.org', 'Evaluator Tester');
  leaderToken = signUserToken('leader-test@univ.edu', 'Leader');
  memberToken = signUserToken('member-test@univ.edu', 'Member');
  unknownToken = signUserToken('unknown@random.org', 'Unknown Random');
});

afterAll(async () => {
  await mongoose.disconnect();
});

describe('1. Security, Role & Authorization Invariants', () => {
  it('unknown account defaults to public with no elevated privileges', async () => {
    const res = await request(app)
      .get('/api/admin/accounts')
      .set('Authorization', `Bearer ${unknownToken}`);
    expect(res.status).toBe(403);
  });

  it('evaluator cannot access admin routes', async () => {
    const res = await request(app)
      .get('/api/admin/accounts')
      .set('Authorization', `Bearer ${evaluatorToken}`);
    expect(res.status).toBe(403);
  });

  it('admin can access admin accounts', async () => {
    const res = await request(app)
      .get('/api/admin/accounts')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('2. Stage Control, Routing & Completion Gates', () => {
  it('resolves active stage and stage gates', async () => {
    const res = await request(app).get('/api/system/stage');
    expect(res.status).toBe(200);
    expect(res.body.activeStage).toBeDefined();
    expect(res.body.gates).toBeDefined();
  });

  it('prevents transitioning without a required reason', async () => {
    const res = await request(app)
      .post('/api/system/stage/transition')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ toStage: 'cleaning' });
    expect(res.status).toBe(400);
  });

  it('supports admin transition with valid reason and creates audit log', async () => {
    const res = await request(app)
      .post('/api/system/stage/transition')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        toStage: 'cleaning',
        reason: 'Advancing from registration to cleaning round for event kickoff',
        forceException: true,
      });
    expect(res.status).toBe(200);
    expect(res.body.currentStage).toBe('cleaning');

    // Verify audit log
    const audit = await AuditLog.findOne({ action: 'STAGE_TRANSITION' }).sort({ timestamp: -1 });
    expect(audit).toBeDefined();
    expect(audit?.actorEmail).toBe('admin-test@iste.org');
  });
});

describe('3. Registration Import Normalization & Idempotency', () => {
  it('previews creates, updates, and identifies invalid rows without dropping data', async () => {
    const sampleData = [
      { 'First Name': 'Rishi', 'Last Name': 'Kapoor', Email: ' RISHI@GMAIL.COM ', College: 'DTU', Team: 'Alpha Squad', Role: 'Leader' },
      { 'First Name': 'Bad', 'Last Name': 'Email', Email: 'not-an-email', College: 'DTU', Team: 'Alpha Squad', Role: 'Member' },
    ];

    const preview = await ImportService.preview(sampleData);
    expect(preview.totalRows).toBe(2);
    expect(preview.participantsToCreate.length).toBe(1);
    expect(preview.participantsToCreate[0].email).toBe('rishi@gmail.com');
    expect(preview.errors.length).toBe(1);
    expect(preview.errors[0].reason).toContain('Missing or invalid email');
  });

  it('is idempotent on repeated imports', async () => {
    const sampleData = [
      { 'First Name': 'Rohit', 'Last Name': 'Sharma', Email: 'rohit@cricket.in', College: 'Mumbai Univ', Team: 'Hitmen', Role: 'Leader' },
    ];

    const firstRun = await ImportService.confirmImport(sampleData, 'admin-test@iste.org');
    expect(firstRun.createdParticipants).toBe(1);
    expect(firstRun.createdTeams).toBe(1);
    expect(firstRun.provisionedGoogleAccounts).toBe(1);

    // Verify Google Auth account was provisioned for imported participant
    const googleAccount = await Account.findOne({ email: 'rohit@cricket.in' });
    expect(googleAccount).toBeDefined();
    expect(googleAccount?.role).toBe('public');

    // Test signing in via Google Auth with imported email
    const authRes = await request(app)
      .post('/api/auth/google')
      .send({ credential: mockGoogleToken('rohit@cricket.in', 'Rohit Sharma') });
    expect(authRes.status).toBe(200);
    expect(authRes.body.token).toBeDefined();
    expect(authRes.body.team?.teamName).toBe('Hitmen');
    expect(authRes.body.isLeader).toBe(true);

    const secondRun = await ImportService.confirmImport(sampleData, 'admin-test@iste.org');
    expect(secondRun.createdParticipants).toBe(0);
    expect(secondRun.updatedParticipants).toBe(1);
    expect(secondRun.provisionedGoogleAccounts).toBe(0);
  });
});

describe('4. Leader-only Drafts & Transactional Submissions', () => {
  it('allows leader to save draft and persists it on server', async () => {
    await Submission.deleteMany({ teamId: testTeam._id });
    await Evaluation.deleteMany({ targetTeamId: testTeam._id });

    const res = await request(app)
      .put('/api/submissions/draft')
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({
        payload: {
          cleanedDatasetUrl: 'https://datasets.iste.org/cleaned-test.csv',
          cleaningNotes: 'Handled missing values with median imputation.',
          cleaningSummary: '100% clean verified.',
        },
      });
    expect(res.status).toBe(200);
    expect(res.body.submission.status).toBe('draft');
  });

  it('rejects draft edit by team member (non-leader)', async () => {
    const res = await request(app)
      .put('/api/submissions/draft')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        payload: { cleaningNotes: 'Unauthorized change' },
      });
    expect(res.status).toBe(403);
    expect(res.body.message).toContain('Only the team leader is permitted');
  });

  it('locks submission on leader submit and makes it immutable', async () => {
    const res = await request(app)
      .post('/api/submissions/submit')
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({
        cleanedDatasetUrl: 'https://datasets.iste.org/cleaned-test.csv',
        cleaningNotes: 'Handled missing values with median imputation.',
        cleaningSummary: '100% clean verified.',
      });
    expect(res.status).toBe(200);
    expect(res.body.submission.status).toBe('submitted');
    expect(res.body.submission.isLocked).toBe(true);

    // Try editing after lock
    const editRes = await request(app)
      .put('/api/submissions/draft')
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({ payload: { cleaningNotes: 'Try modifying locked submission' } });
    expect(editRes.status).toBe(403);
    expect(editRes.body.error).toBe('Submission Locked');
  });

  it('admin can explicitly reopen submission with recorded reason', async () => {
    const sub = await Submission.findOne({ teamId: testTeam._id, stage: 'cleaning' });
    expect(sub).toBeDefined();

    const res = await request(app)
      .post(`/api/submissions/${sub!._id}/reopen`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Team reported file link permission issue, granted 30 min reopen' });
    expect(res.status).toBe(200);
    expect(res.body.submission.isLocked).toBe(false);

    // Re-lock for evaluation tests
    await Submission.findByIdAndUpdate(sub!._id, { isLocked: true, status: 'submitted' });
  });
});

describe('5. Atomic Evaluator Lease Workflow & Exclusivity', () => {
  it('atomically acquires lease and prevents concurrent evaluator lock', async () => {
    const lease1 = await LeaseService.acquireLease('cleaning', 'evaluator-1@iste.org', testTeam._id.toString());
    expect(lease1.success).toBe(true);
    expect(lease1.evaluation?.evaluatorEmail).toBe('evaluator-1@iste.org');

    // Second evaluator attempts to lease same target
    const lease2 = await LeaseService.acquireLease('cleaning', 'evaluator-2@iste.org', testTeam._id.toString());
    expect(lease2.success).toBe(false);
    expect(lease2.message).toContain('currently locked by other evaluators');
  });

  it('completes evaluation, stores score and feedback, releases lease atomically', async () => {
    const activeEval = await Evaluation.findOne({ targetTeamId: testTeam._id, stage: 'cleaning' });
    expect(activeEval).toBeDefined();

    const compRes = await LeaseService.completeEvaluation(
      activeEval!._id.toString(),
      'evaluator-1@iste.org',
      92,
      'Excellent data transformation pipeline and clean documentation.'
    );
    expect(compRes.success).toBe(true);
    expect(compRes.evaluation?.status).toBe('completed');
    expect(compRes.evaluation?.leaseExpiresAt).toBeNull();
  });
});

describe('6. Leaderboard Calculation, Tie-breakers & Immutable Publication', () => {
  it('calculates leaderboard with configurable tie-breakers and publishes snapshot', async () => {
    const calc = await LeaderboardService.calculateCleaningLeaderboard('score_desc_then_time_asc');
    expect(calc.entries.length).toBeGreaterThan(0);

    const snapshot = await LeaderboardService.publishCleaningLeaderboard('admin-test@iste.org', 'score_desc_then_time_asc');
    expect(snapshot.published).toBe(true);
    expect(snapshot.entries.length).toBeGreaterThan(0);

    const pubRes = await request(app).get('/api/leaderboard/published');
    expect(pubRes.status).toBe(200);
    expect(pubRes.body.published).toBe(true);
    expect(pubRes.body.leaderboard.entries[0].score).toBe(92);
  });
});

describe('7. Model Training & Round-Robin Company Assignment', () => {
  it('evaluates model-training and calculates round-robin company assignments', async () => {
    // Seed model training submission & evaluation
    await Submission.findOneAndUpdate(
      { stage: 'model-training', teamId: testTeam._id },
      {
        stage: 'model-training',
        teamId: testTeam._id,
        status: 'submitted',
        isLocked: true,
        payload: {
          companyName: 'Saturnalia AI Solutions',
          approachDescription: 'Deep transformer model for time series forecasting.',
          accuracyResults: '98.4%',
          githubUrl: 'https://github.com/iste/synapse-model-2026',
        },
        submittedAt: new Date(),
      },
      { upsert: true }
    );

    await Evaluation.findOneAndUpdate(
      { stage: 'model-training', targetTeamId: testTeam._id },
      {
        stage: 'model-training',
        targetTeamId: testTeam._id,
        submissionId: new mongoose.Types.ObjectId(),
        evaluatorEmail: 'evaluator-test@iste.org',
        score: 95,
        feedback: 'Top tier accuracy and codebase.',
        status: 'completed',
        completedAt: new Date(),
      },
      { upsert: true }
    );

    const preview = await RankingService.previewCompanyAssignments();
    expect(preview.preview.length).toBeGreaterThan(0);
    expect(preview.preview[0].companyName).toBeDefined();

    const published = await RankingService.publishCompanyAssignments('admin-test@iste.org');
    expect(published.published).toBe(true);
    expect(published.assignments.length).toBeGreaterThan(0);
  });
});
