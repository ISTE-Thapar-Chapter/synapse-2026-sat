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
import { CompetitionConfig } from '../src/models/CompetitionConfig.js';
import { RoundRobinQueue } from '../src/models/RoundRobinQueue.js';
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
  process.env.NODE_ENV = 'test';
  // Use dedicated test database (synapse_2026_test) so developer's live synapse_2026 collections are untouched
  await connectDB('mongodb://127.0.0.1:27017/synapse_2026_test');
  await StageService.initializeStages();

  // Reset active stage to 'registration'
  await EventStage.updateMany({}, { $set: { active: false } });
  await EventStage.findOneAndUpdate({ stageId: 'registration' }, { $set: { active: true } });

  // Clean prior test artifacts
  await Participant.deleteMany({ email: { $in: ['rohit@cricket.in', 'rishi@gmail.com', 'seqleader@iste.org', 'seqmember@iste.org'] } });
  await Team.deleteMany({ teamName: { $in: ['Hitmen', 'Alpha Squad', 'Sequential Innovators', 'Zeta Innovations', 'Alpha Innovations'] } });
  await Account.deleteMany({ email: { $in: ['rohit@cricket.in', 'rishi@gmail.com', 'seqleader@iste.org', 'seqmember@iste.org'] } });
  await Submission.deleteMany({});
  await Evaluation.deleteMany({});
  await LeaderboardSnapshot.deleteMany({});
  await RoundRobinQueue.deleteMany({});

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
  }, 15000);
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
        psbUrl: 'https://datasets.iste.org/architecture-test.psb',
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

  it('correctly resolves ties: earlier submission time first, then team name alphabetically', async () => {
    // Create two test teams
    const teamZ = await Team.create({
      teamName: 'Zeta Innovations',
      teamId: 'SYN-TEST-ZETA',
      members: [],
    });
    const teamA = await Team.create({
      teamName: 'Alpha Innovations',
      teamId: 'SYN-TEST-ALPHA',
      members: [],
    });

    const earlyDate = new Date('2026-03-01T10:00:00Z');
    const lateDate = new Date('2026-03-01T11:00:00Z');

    const subZ = await Submission.create({
      stage: 'requirements',
      teamId: teamZ._id,
      status: 'submitted',
      submittedAt: earlyDate,
      isLocked: true,
      payload: { requirements: [] },
    });
    const subA = await Submission.create({
      stage: 'requirements',
      teamId: teamA._id,
      status: 'submitted',
      submittedAt: lateDate,
      isLocked: true,
      payload: { requirements: [] },
    });

    // Case 1: Both score 80, but Zeta submitted earlier than Alpha
    await Evaluation.create({
      targetTeamId: teamZ._id,
      submissionId: subZ._id,
      evaluatorEmail: 'evaluator@iste.org',
      stage: 'requirements',
      score: 80,
      feedback: 'Great solution',
      status: 'completed',
    });
    await Evaluation.create({
      targetTeamId: teamA._id,
      submissionId: subA._id,
      evaluatorEmail: 'evaluator@iste.org',
      stage: 'requirements',
      score: 80,
      feedback: 'Great solution',
      status: 'completed',
    });

    const res1 = await LeaderboardService.calculateLiveLeaderboard();
    const zetaEntry1 = res1.entries.find((e) => e.teamName === 'Zeta Innovations')!;
    const alphaEntry1 = res1.entries.find((e) => e.teamName === 'Alpha Innovations')!;
    // Zeta submitted earlier, so Zeta ranks higher (lower rank number)
    expect(zetaEntry1.rank).toBeLessThan(alphaEntry1.rank);

    // Case 2: Tied score and tied submission time -> Alpha Innovations precedes Zeta Innovations alphabetically
    await Submission.updateOne({ teamId: teamZ._id, stage: 'requirements' }, { $set: { submittedAt: earlyDate } });
    await Submission.updateOne({ teamId: teamA._id, stage: 'requirements' }, { $set: { submittedAt: earlyDate } });

    const res2 = await LeaderboardService.calculateLiveLeaderboard();
    const zetaEntry2 = res2.entries.find((e) => e.teamName === 'Zeta Innovations')!;
    const alphaEntry2 = res2.entries.find((e) => e.teamName === 'Alpha Innovations')!;
    // Same submission time, Alpha comes before Zeta alphabetically
    expect(alphaEntry2.rank).toBeLessThan(zetaEntry2.rank);

    // Clean up test teams
    await Team.deleteMany({ _id: { $in: [teamZ._id, teamA._id] } });
    await Evaluation.deleteMany({ targetTeamId: { $in: [teamZ._id, teamA._id] } });
    await Submission.deleteMany({ teamId: { $in: [teamZ._id, teamA._id] } });
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

describe('8. Manual Team & User Account Provisioning and Team Deletion', () => {
  let createdTeamId: string;

  beforeAll(async () => {
    // Clean up test team if left over
    const oldTeam = await Team.findOne({ teamName: 'Quantum Enigma Squad' });
    if (oldTeam) {
      await Team.findByIdAndDelete(oldTeam._id);
      await Participant.deleteMany({ email: { $in: ['jane.smith.lead@quantum.edu', 'bob.marley@quantum.edu', 'alice.cooper@quantum.edu'] } });
      await Account.deleteMany({ email: { $in: ['jane.smith.lead@quantum.edu', 'bob.marley@quantum.edu', 'alice.cooper@quantum.edu'] } });
      await Submission.deleteMany({ teamId: oldTeam._id });
      await Evaluation.deleteMany({ targetTeamId: oldTeam._id });
    }
  });

  it('creates team, leader account, and participant accounts with specified names', async () => {
    const payload = {
      teamName: 'Quantum Enigma Squad',
      leaderName: 'Dr. Jane Smith',
      leaderEmail: 'jane.smith.lead@quantum.edu',
      members: [
        { name: 'Bob Marley', email: 'bob.marley@quantum.edu' },
        { name: 'Alice Cooper', email: 'alice.cooper@quantum.edu' },
      ],
      college: 'Quantum Institute of Technology',
    };

    const res = await request(app)
      .post('/api/admin/teams/manual')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.team).toBeDefined();
    expect(res.body.team.teamName).toBe('Quantum Enigma Squad');
    expect(res.body.team.members.length).toBe(3);
    expect(res.body.team.leaderId.email).toBe('jane.smith.lead@quantum.edu');
    createdTeamId = res.body.team._id;

    // Verify Account records created for Google Auth login with specified names
    const leaderAccount = await Account.findOne({ email: 'jane.smith.lead@quantum.edu' });
    expect(leaderAccount).toBeDefined();
    expect(leaderAccount?.name).toBe('Dr. Jane Smith');

    const bobAccount = await Account.findOne({ email: 'bob.marley@quantum.edu' });
    expect(bobAccount).toBeDefined();
    expect(bobAccount?.name).toBe('Bob Marley');

    const aliceAccount = await Account.findOne({ email: 'alice.cooper@quantum.edu' });
    expect(aliceAccount).toBeDefined();
    expect(aliceAccount?.name).toBe('Alice Cooper');

    // Verify duplicate team name rejection
    const dupRes = await request(app)
      .post('/api/admin/teams/manual')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payload);
    expect(dupRes.status).toBe(400);
    expect(dupRes.body.error).toContain('already exists');
  });

  it('rejects participant who already belongs to another team', async () => {
    const payload = {
      teamName: 'Second Team Attempt',
      leaderName: 'Mark Ronson',
      leaderEmail: 'mark.ronson@second.edu',
      members: [{ name: 'Bob Marley', email: 'bob.marley@quantum.edu' }],
    };

    const res = await request(app)
      .post('/api/admin/teams/manual')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payload);

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('already belong to a team');
  });

  it('deletes team, members, accounts, and any associated scores & submissions', async () => {
    // 1. Add mock submission and evaluation for created team
    await Submission.create({
      stage: 'cleaning',
      teamId: createdTeamId,
      status: 'submitted',
      isLocked: true,
      payload: {
        cleanedDatasetUrl: 'https://test.com/data.csv',
        cleaningSummary: 'Cleaned anomalies',
        cleaningNotes: 'Pandas dropna',
      },
      submittedAt: new Date(),
    });

    await Evaluation.create({
      stage: 'cleaning',
      targetTeamId: createdTeamId,
      submissionId: new mongoose.Types.ObjectId(),
      evaluatorEmail: 'evaluator-test@iste.org',
      score: 92,
      feedback: 'Good work',
      status: 'completed',
    });

    // 2. Perform deletion
    const delRes = await request(app)
      .delete(`/api/admin/teams/${createdTeamId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(delRes.status).toBe(200);
    expect(delRes.body.message).toContain('permanently deleted');

    // 3. Verify Team is deleted
    const teamCheck = await Team.findById(createdTeamId);
    expect(teamCheck).toBeNull();

    // 4. Verify Participants are deleted
    const partCheck = await Participant.find({
      email: { $in: ['jane.smith.lead@quantum.edu', 'bob.marley@quantum.edu', 'alice.cooper@quantum.edu'] },
    });
    expect(partCheck.length).toBe(0);

    // 5. Verify public Accounts are deleted
    const accCheck = await Account.find({
      email: { $in: ['jane.smith.lead@quantum.edu', 'bob.marley@quantum.edu', 'alice.cooper@quantum.edu'] },
    });
    expect(accCheck.length).toBe(0);

    // 6. Verify Submissions are deleted
    const subCheck = await Submission.find({ teamId: createdTeamId });
    expect(subCheck.length).toBe(0);

    // 7. Verify Evaluations are deleted
    const evalCheck = await Evaluation.find({ targetTeamId: createdTeamId });
    expect(evalCheck.length).toBe(0);
  });
});

describe('9. Sequential Stages: Event Start, Cleaning, 5 Requirements & Default 0 Leaderboard', () => {
  let seqTeam: any;
  let seqLeaderToken: string;

  beforeAll(async () => {
    // 1. Create a dedicated team for sequential testing
    await Team.deleteMany({ teamName: 'Sequential Pioneers' });
    await Participant.deleteMany({ email: 'seq.lead@pioneers.edu' });
    await Account.deleteMany({ email: 'seq.lead@pioneers.edu' });

    await Account.create({
      name: 'Seq Leader',
      email: 'seq.lead@pioneers.edu',
      role: 'public',
    });

    const leadPart = await Participant.create({
      firstName: 'Seq',
      lastName: 'Leader',
      email: 'seq.lead@pioneers.edu',
      college: 'Pioneers Tech',
      role: 'leader',
      restricted: false,
    });

    seqTeam = await Team.create({
      teamName: 'Sequential Pioneers',
      leaderId: leadPart._id,
      members: [leadPart._id],
      disqualified: false,
    });

    leadPart.teamId = seqTeam._id;
    await leadPart.save();

    seqLeaderToken = signUserToken('seq.lead@pioneers.edu', 'Seq Leader');
  });

  it('hides raw dataset and blocks submissions when event is not started', async () => {
    // Ensure event is not started
    await CompetitionConfig.findOneAndUpdate(
      {},
      { isEventStarted: false, eventStartedAt: null },
      { upsert: true }
    );
    await EventStage.updateMany({}, { $set: { active: false } });
    await EventStage.findOneAndUpdate({ stageId: 'registration' }, { $set: { active: true } });

    const curRes = await request(app)
      .get('/api/submissions/current')
      .set('Authorization', `Bearer ${seqLeaderToken}`);

    expect(curRes.status).toBe(200);
    expect(curRes.body.isEventStarted).toBe(false);
    expect(curRes.body.cleaningDataset).toBeNull();

    // Draft should be rejected
    const draftRes = await request(app)
      .put('/api/submissions/draft')
      .set('Authorization', `Bearer ${seqLeaderToken}`)
      .send({ stage: 'cleaning', payload: { cleanedDatasetUrl: 'https://test.com' } });

    expect(draftRes.status).toBe(400);
    expect(draftRes.body.error).toBe('Event Not Started');
  });

  it('admin starts event, revealing dataset to participants', async () => {
    const startRes = await request(app)
      .post('/api/admin/event/start')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(startRes.status).toBe(200);
    expect(startRes.body.message).toContain('Event successfully started');
    expect(startRes.body.config.isEventStarted).toBe(true);

    const curRes = await request(app)
      .get('/api/submissions/current')
      .set('Authorization', `Bearer ${seqLeaderToken}`);

    expect(curRes.status).toBe(200);
    expect(curRes.body.isEventStarted).toBe(true);
    expect(curRes.body.cleaningDataset).not.toBeNull();
    expect(curRes.body.cleaningDataset.title).toBeDefined();
    expect(curRes.body.hasSubmittedCleaning).toBe(false);
  });

  it('allows leader to draft and submit cleaning phase, unlocking the 5 requirements', async () => {
    // 1. Save cleaning draft
    const draftRes = await request(app)
      .put('/api/submissions/draft')
      .set('Authorization', `Bearer ${seqLeaderToken}`)
      .send({
        stage: 'cleaning',
        payload: {
          cleanedDatasetUrl: 'https://datasets.iste.org/seq-clean.csv',
          psbUrl: 'https://datasets.iste.org/seq-arch.psb',
          cleaningSummary: 'Handled missing values and outlier normalization.',
          cleaningNotes: 'Polars and Scikit-learn preprocessing.',
        },
      });

    expect(draftRes.status).toBe(200);
    expect(draftRes.body.submission.status).toBe('draft');

    // 2. Submit cleaning phase
    const submitRes = await request(app)
      .post('/api/submissions/submit')
      .set('Authorization', `Bearer ${seqLeaderToken}`)
      .send({
        stage: 'cleaning',
        cleanedDatasetUrl: 'https://datasets.iste.org/seq-clean.csv',
        psbUrl: 'https://datasets.iste.org/seq-arch.psb',
        cleaningSummary: 'Handled missing values and outlier normalization.',
        cleaningNotes: 'Polars and Scikit-learn preprocessing.',
      });

    expect(submitRes.status).toBe(200);
    expect(submitRes.body.submission.isLocked).toBe(true);
    expect(submitRes.body.submission.status).toBe('submitted');

    // 3. Verify current endpoint now reveals the 5 requirements
    const curRes = await request(app)
      .get('/api/submissions/current')
      .set('Authorization', `Bearer ${seqLeaderToken}`);

    expect(curRes.status).toBe(200);
    expect(curRes.body.hasSubmittedCleaning).toBe(true);
    expect(curRes.body.requirements.length).toBe(5);
    expect(curRes.body.hasSubmittedRequirements).toBe(false);
  });

  it('allows leader to draft and submit the 5 requirements, locking submission permanently', async () => {
    // 1. Save requirements draft
    const draftRes = await request(app)
      .put('/api/submissions/draft')
      .set('Authorization', `Bearer ${seqLeaderToken}`)
      .send({
        stage: 'requirements',
        payload: {
          requirements: [
            { title: 'Track 1: Climate Forecasting Architecture', response: 'LSTM recurrent neural net with attention.' },
            { title: 'Track 2: Autonomous Trajectory Prediction', response: 'Kalman filtering combined with transformer.' },
          ],
          generalNotes: 'End to end pipeline with Docker container.',
        },
      });

    expect(draftRes.status).toBe(200);
    expect(draftRes.body.submission.status).toBe('draft');

    // 2. Submit requirements
    const submitRes = await request(app)
      .post('/api/submissions/submit')
      .set('Authorization', `Bearer ${seqLeaderToken}`)
      .send({
        stage: 'requirements',
        requirements: [
          { title: 'Track 1: Climate Forecasting Architecture', response: 'LSTM recurrent neural net with attention.' },
          { title: 'Track 2: Autonomous Trajectory Prediction', response: 'Kalman filtering combined with transformer.' },
        ],
        generalNotes: 'End to end pipeline with Docker container.',
      });

    expect(submitRes.status).toBe(200);
    expect(submitRes.body.submission.isLocked).toBe(true);

    // 3. Verify submission is immutable
    const secondSubmitRes = await request(app)
      .post('/api/submissions/submit')
      .set('Authorization', `Bearer ${seqLeaderToken}`)
      .send({
        stage: 'requirements',
        requirements: [
          { title: 'Track 1', response: 'Attempt to overwrite locked record.' },
        ],
      });

    expect(secondSubmitRes.status).toBe(403);
    expect(secondSubmitRes.body.error).toBe('Already Submitted');
  });

  it('calculates live leaderboard with 0 default score for teams awaiting evaluation', async () => {
    const liveRes = await request(app).get('/api/leaderboard/live');

    expect(liveRes.status).toBe(200);
    expect(liveRes.body.leaderboard).toBeDefined();
    expect(Array.isArray(liveRes.body.leaderboard.entries)).toBe(true);

    const seqEntry = liveRes.body.leaderboard.entries.find(
      (e: any) => e.teamName === 'Sequential Pioneers'
    );
    expect(seqEntry).toBeDefined();
    // Default score 0 until evaluators grade
    expect(seqEntry.score).toBe(0);
    expect(seqEntry.status).toBe('Requirements Submitted');
    expect(seqEntry.rank).toBeGreaterThanOrEqual(1);
  });
});

describe('10. Admin Account Provisioning & Feature Set Methodology Evaluation', () => {
  let newEvaluatorEmail = 'new.eval@iste.org';
  let newEvaluatorToken: string;

  beforeAll(async () => {
    await Account.deleteMany({ email: { $in: [newEvaluatorEmail, 'co.admin@iste.org'] } });
  });

  it('allows admin to provision evaluator account directly from portal', async () => {
    const res = await request(app)
      .post('/api/admin/accounts')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Dr. Evaluator Smith',
        email: newEvaluatorEmail,
        role: 'evaluator',
      });

    expect([200, 201]).toContain(res.status);
    expect(res.body.email).toBe(newEvaluatorEmail);
    expect(res.body.role).toBe('evaluator');

    const acc = await Account.findOne({ email: newEvaluatorEmail });
    expect(acc).toBeDefined();
    expect(acc?.role).toBe('evaluator');

    newEvaluatorToken = signUserToken(newEvaluatorEmail, 'Dr. Evaluator Smith');
  });

  it('allows admin to provision another admin account directly from portal', async () => {
    const res = await request(app)
      .post('/api/admin/accounts')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Co-Admin User',
        email: 'co.admin@iste.org',
        role: 'admin',
      });

    expect([200, 201]).toContain(res.status);
    expect(res.body.role).toBe('admin');
  });

  it('evaluates team on the basis of company name and methodologies for feature sets', async () => {
    // 1. Fetch queue for evaluator
    const qRes = await request(app)
      .get('/api/evaluations/queue')
      .set('Authorization', `Bearer ${newEvaluatorToken}`);

    expect(qRes.status).toBe(200);
    expect(Array.isArray(qRes.body.targets)).toBe(true);

    const seqTarget = qRes.body.targets.find((t: any) => t.teamName === 'Sequential Pioneers');
    expect(seqTarget).toBeDefined();

    // 2. Evaluator acquires lease
    const acquireRes = await request(app)
      .post('/api/evaluations/lease/acquire')
      .set('Authorization', `Bearer ${newEvaluatorToken}`)
      .send({ targetTeamId: seqTarget.teamId });

    expect(acquireRes.status).toBe(200);
    expect(acquireRes.body.evaluation).toBeDefined();

    const evalId = acquireRes.body.evaluation._id;

    // 3. Evaluator completes grading with score 94 based on feature set methodologies
    const submitGradeRes = await request(app)
      .post('/api/evaluations/submit')
      .set('Authorization', `Bearer ${newEvaluatorToken}`)
      .send({
        evaluationId: evalId,
        score: 94,
        feedback: 'Outstanding architecture and deep methodology for both feature sets.',
      });

    expect(submitGradeRes.status).toBe(200);
    expect(submitGradeRes.body.evaluation.score).toBe(94);
    expect(submitGradeRes.body.evaluation.status).toBe('completed');

    // 4. Verify leaderboard reflects the evaluated score (updated from default 0)
    const liveLeaderboard = await request(app).get('/api/leaderboard/live');
    expect(liveLeaderboard.status).toBe(200);
    const updatedEntry = liveLeaderboard.body.leaderboard.entries.find(
      (e: any) => e.teamName === 'Sequential Pioneers'
    );
    expect(updatedEntry).toBeDefined();
    expect(updatedEntry.score).toBe(94);
  });
});

describe('10. Two-Queue Round Robin Company Selection with 2-Minute Burst Time', () => {
  it('verifies queues are disabled by default and allows admin to configure and enable', async () => {
    // 0. Verify queues are disabled by default
    const summaryRes = await request(app)
      .get('/api/round-robin/summary')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(summaryRes.status).toBe(200);
    expect(summaryRes.body.queue1.status).toBe('disabled');
    expect(summaryRes.body.queue2.status).toBe('disabled');

    // 1. Configure Queue 1 companies
    const q1Res = await request(app)
      .put('/api/round-robin/queue/1/companies')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        companies: [
          { name: 'Custom NeuroTech', description: 'Brain-computer interface telemetry processing.' },
          { name: 'Custom BioGen', description: 'Proteomic sequence folding with deep transformers.' },
        ],
      });
    expect(q1Res.status).toBe(200);
    expect(q1Res.body.companies).toHaveLength(2);
    expect(q1Res.body.companies[0].name).toBe('Custom NeuroTech');

    // 2. Configure Queue 2 companies (different companies)
    const q2Res = await request(app)
      .put('/api/round-robin/queue/2/companies')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        companies: [
          { name: 'Custom GridEnergy', description: 'Grid-scale battery storage dispatch models.' },
          { name: 'Custom AeroFlight', description: 'Autonomous flight routing and obstacle avoidance.' },
        ],
      });
    expect(q2Res.status).toBe(200);
    expect(q2Res.body.companies).toHaveLength(2);
    expect(q2Res.body.companies[0].name).toBe('Custom GridEnergy');
  });

  it('initializes queues based on leaderboard preference order and executes round robin turns', async () => {
    // 1. Admin initializes Queue 1 from live leaderboard
    const initRes = await request(app)
      .post('/api/round-robin/queue/1/initialize')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(initRes.status).toBe(200);
    expect(initRes.body.queue.teams.length).toBeGreaterThan(0);
    expect(initRes.body.queue.status).toBe('idle');

    // Verify first team is the top-ranked team from leaderboard (Test Vector Team with score 95)
    expect(initRes.body.queue.teams[0].teamName).toBe('Test Vector Team');
    expect(initRes.body.queue.teams[0].score).toBe(95);

    // 2. Admin starts Queue 1
    const startRes = await request(app)
      .post('/api/round-robin/queue/1/start')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(startRes.status).toBe(200);
    expect(startRes.body.queue.status).toBe('active');
    expect(startRes.body.queue.burstTimeSeconds).toBe(120);
    expect(startRes.body.queue.currentTurnStartedAt).toBeDefined();

    // 3. Admin pauses Queue 1 in between turns
    const pauseRes = await request(app)
      .post('/api/round-robin/queue/1/pause')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(pauseRes.status).toBe(200);
    expect(pauseRes.body.queue.status).toBe('paused');
    expect(pauseRes.body.queue.pausedRemainingSeconds).toBeGreaterThan(0);

    // 4. Admin resumes Queue 1
    const resumeRes = await request(app)
      .post('/api/round-robin/queue/1/resume')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(resumeRes.status).toBe(200);
    expect(resumeRes.body.queue.status).toBe('active');

    // 5. Non-turn team attempts to select out of order -> rejected
    const firstCompanyId = startRes.body.queue.companies[0].id;
    const seqLeaderToken = signUserToken('seq.lead@pioneers.edu', 'Seq Leader');
    const nonTurnRes = await request(app)
      .post('/api/round-robin/queue/1/select')
      .set('Authorization', `Bearer ${seqLeaderToken}`) // Turn 2 team, not Turn 1
      .send({ companyId: firstCompanyId });
    expect(nonTurnRes.status).toBe(400);
    expect(nonTurnRes.body.message).toContain("It is not your team's turn to select");

    // 6. Turn 1 team (Test Vector Team) selects company successfully
    const selectRes = await request(app)
      .post('/api/round-robin/queue/1/select')
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({ companyId: firstCompanyId });
    expect(selectRes.status).toBe(200);
    expect(selectRes.body.assignedCompany.isAssigned).toBe(true);
    expect(selectRes.body.assignedCompany.assignedToTeamName).toBe('Test Vector Team');

    // 7. Verify company is now assigned and cannot be selected again
    const secondCompanyId = startRes.body.queue.companies[1].id;
    const reselectRes = await request(app)
      .post('/api/round-robin/queue/1/select')
      .set('Authorization', `Bearer ${seqLeaderToken}`)
      .send({ companyId: firstCompanyId });
    expect(reselectRes.status).toBe(400);

    // Turn 2 team selects available second company
    const select2Res = await request(app)
      .post('/api/round-robin/queue/1/select')
      .set('Authorization', `Bearer ${seqLeaderToken}`)
      .send({ companyId: secondCompanyId });
    expect(select2Res.status).toBe(200);
    expect(select2Res.body.assignedCompany.assignedToTeamName).toBe('Sequential Pioneers');

    // 8. Queue 2 selection
    await request(app)
      .post('/api/round-robin/queue/2/initialize')
      .set('Authorization', `Bearer ${adminToken}`);
    const q2Start = await request(app)
      .post('/api/round-robin/queue/2/start')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(q2Start.status).toBe(200);

    const q2FirstCompanyId = q2Start.body.queue.companies[0].id;
    const q2SelectRes = await request(app)
      .post('/api/round-robin/queue/2/select')
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({ companyId: q2FirstCompanyId });
    expect(q2SelectRes.status).toBe(200);

    // 9. Verify team has 2 assigned companies (1 from Queue 1, 1 from Queue 2)
    const myStatusRes = await request(app)
      .get('/api/round-robin/my-status')
      .set('Authorization', `Bearer ${leaderToken}`);
    expect(myStatusRes.status).toBe(200);
    expect(myStatusRes.body.queue1.myAssignment.companyName).toBe('Custom NeuroTech');
    expect(myStatusRes.body.queue2.myAssignment.companyName).toBe('Custom GridEnergy');
  });
});
