import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/index.js';
import { connectDB } from '../src/config/db.js';
import { Account } from '../src/models/Account.js';
import { Participant } from '../src/models/Participant.js';
import { Team } from '../src/models/Team.js';
import { EventStage } from '../src/models/EventStage.js';
import { Submission } from '../src/models/Submission.js';
import { Evaluation } from '../src/models/Evaluation.js';
import { CompetitionConfig } from '../src/models/CompetitionConfig.js';
import { RoundRobinQueue } from '../src/models/RoundRobinQueue.js';
import { CompanyAssignment } from '../src/models/CompanyAssignment.js';
import { QuizScore } from '../src/models/QuizScore.js';
import { signUserToken } from '../src/middleware/auth.js';
import { StageService } from '../src/services/stageService.js';
import { LeaderboardService } from '../src/services/leaderboardService.js';

let adminToken: string;
let mentorToken: string;
let evaluatorToken: string;
let leaderTokenA: string;
let leaderTokenB: string;

let teamA: any;
let teamB: any;
let leaderA: any;
let leaderB: any;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  // Strictly connect to isolated test database (synapse_2026_test)
  await connectDB('mongodb://127.0.0.1:27017/synapse_2026_test');
  await StageService.initializeStages();

  // Activate submission stages
  await EventStage.updateMany({}, { $set: { active: true } });

  // Clean test-specific records
  const testEmails = [
    'admin.workflow@synapse.test',
    'mentor.workflow@synapse.test',
    'evaluator.workflow@synapse.test',
    'leaderA.workflow@synapse.test',
    'leaderB.workflow@synapse.test',
    'newmentor.test@synapse.test',
  ];
  // Clean database before starting event workflow suite
  await Account.deleteMany({ email: { $in: testEmails } });
  await Participant.deleteMany({});
  await Team.deleteMany({});
  await Evaluation.deleteMany({});
  await Submission.deleteMany({});
  await CompanyAssignment.deleteMany({});
  await QuizScore.deleteMany({});
  await RoundRobinQueue.deleteMany({});
  await CompetitionConfig.findOneAndUpdate(
    {},
    {
      $set: {
        finalSubmissionOpen: false,
        auctionCompanies: [],
        winnersAnnouncement: {
          announced: false,
          announcedAt: null,
          winners: [],
        },
      },
    },
    { upsert: true }
  );

  // 1. Create Staff Accounts
  await Account.create({
    name: 'Admin Workflow',
    email: 'admin.workflow@synapse.test',
    role: 'admin',
    createdAt: new Date(),
  });
  await Account.create({
    name: 'Mentor Workflow',
    email: 'mentor.workflow@synapse.test',
    role: 'mentor',
    createdAt: new Date(),
  });
  await Account.create({
    name: 'Evaluator Workflow',
    email: 'evaluator.workflow@synapse.test',
    role: 'evaluator',
    createdAt: new Date(),
  });

  adminToken = signUserToken('admin.workflow@synapse.test', 'Admin Workflow');
  mentorToken = signUserToken('mentor.workflow@synapse.test', 'Mentor Workflow');
  evaluatorToken = signUserToken('evaluator.workflow@synapse.test', 'Evaluator Workflow');

  // 2. Create Teams & Participants
  leaderA = await Participant.create({
    firstName: 'Leader',
    lastName: 'Alpha',
    email: 'leaderA.workflow@synapse.test',
    college: 'Engineering Institute',
    role: 'leader',
    restricted: false,
  });
  teamA = await Team.create({
    teamName: 'Workflow Team Alpha',
    leaderId: leaderA._id,
    members: [leaderA._id],
    disqualified: false,
  });
  leaderA.teamId = teamA._id;
  await leaderA.save();

  leaderB = await Participant.create({
    firstName: 'Leader',
    lastName: 'Beta',
    email: 'leaderB.workflow@synapse.test',
    college: 'Technology Campus',
    role: 'leader',
    restricted: false,
  });
  teamB = await Team.create({
    teamName: 'Workflow Team Beta',
    leaderId: leaderB._id,
    members: [leaderB._id],
    disqualified: false,
  });
  leaderB.teamId = teamB._id;
  await leaderB.save();

  leaderTokenA = signUserToken('leaderA.workflow@synapse.test', 'Leader Alpha');
  leaderTokenB = signUserToken('leaderB.workflow@synapse.test', 'Leader Beta');

  // Initialize CompetitionConfig with default settings
  await CompetitionConfig.findOneAndUpdate(
    {},
    {
      $set: {
        isEventStarted: true,
        leaderboardVisible: false,
        quizMultiplier: 100,
        auctionItems: [
          {
            id: 'auc-company-1',
            name: 'CloudScale Dynamics',
            description: 'Premier infrastructure and distributed systems partner.',
            startingBid: 200,
            exclusive: true,
          },
        ],
      },
    },
    { upsert: true, new: true }
  );
});

afterAll(async () => {
  // Cleanup test entities from synapse_2026_test
  await Account.deleteMany({ email: { $regex: /workflow@synapse\.test$/ } });
  await Participant.deleteMany({ email: { $regex: /workflow@synapse\.test$/ } });
  await Team.deleteMany({ teamName: { $in: ['Workflow Team Alpha', 'Workflow Team Beta'] } });
  await Submission.deleteMany({ teamId: { $in: [teamA?._id, teamB?._id] } });
  await Evaluation.deleteMany({ targetTeamId: { $in: [teamA?._id, teamB?._id] } });
  await CompanyAssignment.deleteMany({ teamId: { $in: [teamA?._id, teamB?._id] } });
  await QuizScore.deleteMany({ teamId: { $in: [teamA?._id, teamB?._id] } });
});

describe('Full Synapse 2026 Event Workflow', () => {
  it('1. Account Creation: Admin can provision accounts with role mentor and evaluator directly', async () => {
    const res = await request(app)
      .post('/api/admin/accounts')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'New Mentor Guest',
        email: 'newmentor.test@synapse.test',
        role: 'mentor',
      });

    expect(res.status).toBe(201);
    expect(res.body.role || res.body.account?.role).toBe('mentor');
    expect(res.body.email || res.body.account?.email).toBe('newmentor.test@synapse.test');
  });

  it('2. Stage 1 Submission: Requires both Cleaned Dataset link and Architecture (.psb) link', async () => {
    // Missing psbUrl should fail
    const invalidRes = await request(app)
      .post('/api/submissions/submit')
      .set('Authorization', `Bearer ${leaderTokenA}`)
      .send({
        stage: 'cleaning',
        payload: {
          cleanedDatasetUrl: 'https://storage.googleapis.com/test-bucket/cleaned-data.csv',
          cleaningSummary: 'Processed 50,000 records, handled null values and outliers.',
        },
      });
    expect(invalidRes.status).toBe(400);

    // Valid submission with both dataset and psbUrl succeeds
    const validRes = await request(app)
      .post('/api/submissions/submit')
      .set('Authorization', `Bearer ${leaderTokenA}`)
      .send({
        stage: 'cleaning',
        payload: {
          datasetUrl: 'https://storage.googleapis.com/test-bucket/cleaned-data.csv',
          psbUrl: 'https://storage.googleapis.com/test-bucket/architecture_diagram.psb',
          cleaningSummary: 'Processed 50,000 records, handled null values and outliers.',
        },
      });
    expect(validRes.status).toBe(200);
    expect(validRes.body.submission.stage).toBe('cleaning');
    expect(validRes.body.submission.payload.psbUrl).toBe('https://storage.googleapis.com/test-bucket/architecture_diagram.psb');

    // Also submit for Team B
    await request(app)
      .post('/api/submissions/submit')
      .set('Authorization', `Bearer ${leaderTokenB}`)
      .send({
        stage: 'cleaning',
        payload: {
          datasetUrl: 'https://storage.googleapis.com/test-bucket/cleaned-data-beta.csv',
          psbUrl: 'https://storage.googleapis.com/test-bucket/architecture-beta.psb',
          cleaningSummary: 'Standardized schema and normalized text tokens.',
        },
      });
  });

  it('3. Stage 2 Submission: Takes 5 feature sets with company names input only and auto-calculates marks against answer key', async () => {
    // 1. Admin configures answer key for the 5 feature sets
    await request(app)
      .patch('/api/admin/config')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        featureDefinitions: [
          { featureIndex: 0, title: 'Feature Set #1', expectedCompany: 'Stripe Payments' },
          { featureIndex: 1, title: 'Feature Set #2', expectedCompany: 'Twilio Communications' },
          { featureIndex: 2, title: 'Feature Set #3', expectedCompany: 'Snowflake Data' },
          { featureIndex: 3, title: 'Feature Set #4', expectedCompany: 'Datadog Monitoring' },
          { featureIndex: 4, title: 'Feature Set #5', expectedCompany: 'Figma Collaboration' },
        ],
      });

    const featureCompanies = [
      'Stripe Payments',
      'Twilio Communications',
      'Snowflake Data',
      'Datadog Monitoring',
      'Figma Collaboration',
    ];

    const res = await request(app)
      .post('/api/submissions/submit')
      .set('Authorization', `Bearer ${leaderTokenA}`)
      .send({
        stage: 'requirements',
        payload: {
          features: featureCompanies.map((name, i) => ({
            featureIndex: i,
            title: `Feature Set #${i + 1}`,
            companyName: name,
          })),
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.submission.stage).toBe('requirements');
    expect(res.body.submission.payload.features.length).toBe(5);
    expect(res.body.submission.payload.features[0].companyName).toBe('Stripe Payments');
    // Default accuracy and confidence score are 0 upon submission, awaiting mentor grading
    expect(res.body.submission.payload.mentorEvaluation.totalMarks).toBe(0);
    expect(res.body.submission.payload.mentorEvaluation.overallAccuracyScore).toBe(0);

    // Submit for Team B as well
    await request(app)
      .post('/api/submissions/submit')
      .set('Authorization', `Bearer ${leaderTokenB}`)
      .send({
        stage: 'requirements',
        payload: {
          features: [
            { featureIndex: 0, title: 'Feature Set #1', companyName: 'Adyen' },
            { featureIndex: 1, title: 'Feature Set #2', companyName: 'MessageBird' },
            { featureIndex: 2, title: 'Feature Set #3', companyName: 'BigQuery' },
            { featureIndex: 3, title: 'Feature Set #4', companyName: 'New Relic' },
            { featureIndex: 4, title: 'Feature Set #5', companyName: 'Canva' },
          ],
        },
      });
  });

  it('4. Mentor Feature Grading: Mentor grades each of the 5 feature sets independently', async () => {
    // 1. Fetch teams pending mentor grading
    const listRes = await request(app)
      .get('/api/mentor/teams')
      .set('Authorization', `Bearer ${mentorToken}`);
    expect(listRes.status).toBe(200);
    const teamRecord = listRes.body.teams.find(
      (t: any) => t._id === teamA._id.toString() || t.teamId === teamA._id.toString()
    );
    expect(teamRecord).toBeDefined();

    // 2. Submit per-feature grades (marks 0-10, accuracy 0-100%, confidence 0-100%, feedback)
    const grades = [
      { featureIndex: 0, title: 'Feature Set #1', companyName: 'Stripe Payments', marks: 9, accuracyPercent: 95, confidencePercent: 90, feedback: 'Accurate model fit' },
      { featureIndex: 1, title: 'Feature Set #2', companyName: 'Twilio Communications', marks: 8, accuracyPercent: 88, confidencePercent: 85, feedback: 'Good API synergy' },
      { featureIndex: 2, title: 'Feature Set #3', companyName: 'Snowflake Data', marks: 10, accuracyPercent: 98, confidencePercent: 95, feedback: 'Flawless alignment' },
      { featureIndex: 3, title: 'Feature Set #4', companyName: 'Datadog Monitoring', marks: 9, accuracyPercent: 92, confidencePercent: 90, feedback: 'Strong telemetry analysis' },
      { featureIndex: 4, title: 'Feature Set #5', companyName: 'Figma Collaboration', marks: 9, accuracyPercent: 94, confidencePercent: 92, feedback: 'Creative interface mapping' },
    ];

    const gradeRes = await request(app)
      .post('/api/mentor/grade-features')
      .set('Authorization', `Bearer ${mentorToken}`)
      .send({
        teamId: teamA._id.toString(),
        featureGrades: grades,
        overallFeedback: 'Exceptional domain breakdown across all 5 feature sets.',
      });

    expect(gradeRes.status).toBe(200);
    expect(gradeRes.body.evaluation.totalMarks).toBe(45);
    expect(gradeRes.body.evaluation.featureGrades.length).toBe(5);

    // Also grade Team B
    await request(app)
      .post('/api/mentor/grade-features')
      .set('Authorization', `Bearer ${mentorToken}`)
      .send({
        teamId: teamB._id.toString(),
        featureGrades: [
          { featureIndex: 0, title: 'Feature Set #1', companyName: 'Adyen', marks: 8, accuracyPercent: 85, confidencePercent: 80, feedback: 'Solid' },
          { featureIndex: 1, title: 'Feature Set #2', companyName: 'MessageBird', marks: 7, accuracyPercent: 80, confidencePercent: 75, feedback: 'Good' },
          { featureIndex: 2, title: 'Feature Set #3', companyName: 'BigQuery', marks: 8, accuracyPercent: 85, confidencePercent: 85, feedback: 'Well structured' },
          { featureIndex: 3, title: 'Feature Set #4', companyName: 'New Relic', marks: 7, accuracyPercent: 78, confidencePercent: 80, feedback: 'Acceptable' },
          { featureIndex: 4, title: 'Feature Set #5', companyName: 'Canva', marks: 8, accuracyPercent: 82, confidencePercent: 80, feedback: 'Creative' },
        ],
        overallFeedback: 'Consistent and reliable feature identification.',
      });

    // 3. Evaluator retrieves queue, reviews mentor assessment summary, and submits official score
    const queueRes = await request(app)
      .get('/api/evaluations/queue')
      .set('Authorization', `Bearer ${evaluatorToken}`);
    expect(queueRes.status).toBe(200);
    const targetA = queueRes.body.targets.find(
      (t: any) => t.teamName === 'Workflow Team Alpha'
    );
    expect(targetA).toBeDefined();
    expect(targetA.payload.mentorEvaluation.totalMarks).toBe(45);

    // Lease target and submit official evaluation score for Team A
    const leaseResA = await request(app)
      .post('/api/evaluations/lease/acquire')
      .set('Authorization', `Bearer ${evaluatorToken}`)
      .send({ targetTeamId: teamA._id.toString(), stage: 'requirements' });
    expect(leaseResA.status).toBe(200);

    const submitEvalResA = await request(app)
      .post('/api/evaluations/submit')
      .set('Authorization', `Bearer ${evaluatorToken}`)
      .send({
        evaluationId: leaseResA.body.evaluation._id,
        score: 45,
        feedback: 'Awarded official Round 1 score based on mentor marks (45/50) and high accuracy.',
      });
    expect(submitEvalResA.status).toBe(200);

    // Lease target and submit official evaluation score for Team B
    const leaseResB = await request(app)
      .post('/api/evaluations/lease/acquire')
      .set('Authorization', `Bearer ${evaluatorToken}`)
      .send({ targetTeamId: teamB._id.toString(), stage: 'requirements' });
    expect(leaseResB.status).toBe(200);

    const submitEvalResB = await request(app)
      .post('/api/evaluations/submit')
      .set('Authorization', `Bearer ${evaluatorToken}`)
      .send({
        evaluationId: leaseResB.body.evaluation._id,
        score: 38,
        feedback: 'Awarded official Round 1 score based on mentor marks (38/50).',
      });
    expect(submitEvalResB.status).toBe(200);
  });

  it('5. Leaderboard Visibility: Hidden by default (score 0), revealed upon admin toggle', async () => {
    // 1. Leaderboard is currently hidden
    await CompetitionConfig.findOneAndUpdate({}, { $set: { leaderboardVisible: false } });

    const hiddenRes = await request(app).get('/api/leaderboard/live');
    expect(hiddenRes.status).toBe(200);
    expect(hiddenRes.body.leaderboardVisible).toBe(false);
    // Non-staff see scores masked to 0
    const entryA = hiddenRes.body.entries.find((e: any) => e.teamName === 'Workflow Team Alpha');
    expect(entryA.score).toBe(0);

    // 2. Staff preview allows staff to see full scores even when hidden
    const staffRes = await request(app)
      .get('/api/leaderboard/live')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(staffRes.status).toBe(200);
    const staffEntryA = staffRes.body.entries.find((e: any) => e.teamName === 'Workflow Team Alpha');
    expect(staffEntryA.score).toBe(45);

    // 3. Admin enables leaderboard visibility
    const toggleRes = await request(app)
      .post('/api/admin/config/leaderboard-visibility')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ visible: true });
    expect(toggleRes.status).toBe(200);
    expect(toggleRes.body.leaderboardVisible).toBe(true);

    // 4. Public request now sees full scores and correct ranks
    const publicRes = await request(app).get('/api/leaderboard/live');
    expect(publicRes.status).toBe(200);
    expect(publicRes.body.leaderboardVisible).toBe(true);
    const pubEntryA = publicRes.body.entries.find((e: any) => e.teamName === 'Workflow Team Alpha');
    const pubEntryB = publicRes.body.entries.find((e: any) => e.teamName === 'Workflow Team Beta');
    expect(pubEntryA.score).toBe(45);
    expect(pubEntryB.score).toBe(38);
    expect(pubEntryA.rank).toBe(1);
    expect(pubEntryB.rank).toBe(2);
  });

  it('6. Round Robin Company Selection: Burst time 2m, disabled by default, turn order by leaderboard rank', async () => {
    // 1. Verify default disabled
    const initRes = await request(app)
      .get('/api/round-robin/summary')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(initRes.status).toBe(200);
    expect(initRes.body.queue1.status).toBe('disabled');
    expect(initRes.body.queue2.status).toBe('disabled');

    // 2. Admin configures companies for Queue 1
    const configRes = await request(app)
      .put('/api/round-robin/queue/1/companies')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        companies: [
          { name: 'Nexus Cybernetics', description: 'AI driven network security' },
          { name: 'Hyperion BioTech', description: 'Precision genomics analysis' },
          { name: 'Aether Robotics', description: 'Autonomous factory navigation' },
        ],
      });
    expect(configRes.status).toBe(200);
    expect(configRes.body.companies).toHaveLength(3);

    // 3. Admin initializes Queue 1 from live leaderboard
    const initializeRes = await request(app)
      .post('/api/round-robin/queue/1/initialize')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(initializeRes.status).toBe(200);
    expect(initializeRes.body.queue.teams[0].teamName).toBe('Workflow Team Alpha');

    // 4. Admin starts Queue 1 - burst time 120s (2 minutes)
    const launchRes = await request(app)
      .post('/api/round-robin/queue/1/start')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(launchRes.status).toBe(200);
    expect(launchRes.body.queue.status).toBe('active');
    expect(launchRes.body.queue.burstTimeSeconds).toBe(120);

    const firstCompId = launchRes.body.queue.companies[0].id;

    // 5. Team Alpha selects first company
    const selectRes = await request(app)
      .post('/api/round-robin/queue/1/select')
      .set('Authorization', `Bearer ${leaderTokenA}`)
      .send({ companyId: firstCompId });
    expect(selectRes.status).toBe(200);
    expect(selectRes.body.assignedCompany.name).toBe('Nexus Cybernetics');

    // 6. Turn automatically advanced to Team Beta
    const afterSelectRes = await request(app)
      .get('/api/round-robin/summary')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(afterSelectRes.body.queue1.currentTurnTeamId).toBe(teamB._id.toString());
  });

  it('7. Quiz Marks Entry & Auction Token Balance Computation', async () => {
    // 1. Evaluator enters external quiz marks for teams (Multiplier = 100)
    const batchRes = await request(app)
      .post('/api/auction/staff/quiz-scores')
      .set('Authorization', `Bearer ${evaluatorToken}`)
      .send({
        multiplier: 100,
        scores: [
          { teamId: teamA._id.toString(), quizMarks: 8.5 },
          { teamId: teamB._id.toString(), quizMarks: 6.0 },
        ],
      });
    expect(batchRes.status).toBe(200);
    expect(batchRes.body.updatedCount).toBe(2);

    // 1b. Mentor role is forbidden from quiz scoring
    const mentorForbiddenQuizRes = await request(app)
      .post('/api/auction/staff/quiz-scores')
      .set('Authorization', `Bearer ${mentorToken}`)
      .send({
        multiplier: 100,
        scores: [{ teamId: teamA._id.toString(), quizMarks: 9.0 }],
      });
    expect(mentorForbiddenQuizRes.status).toBe(403);

    // 1c. Evaluator can save a single team's score directly
    const singleQuizRes = await request(app)
      .post(`/api/auction/staff/quiz-score/${teamB._id.toString()}`)
      .set('Authorization', `Bearer ${evaluatorToken}`)
      .send({
        quizMarks: 6.5,
        multiplier: 100,
      });
    expect(singleQuizRes.status).toBe(200);
    expect(singleQuizRes.body.score.quizMarks).toBe(6.5);
    expect(singleQuizRes.body.score.auctionBalance).toBe(650);

    // 1d. Evaluator / Staff releases tokens to teams for the upcoming auction
    const releaseRes = await request(app)
      .post('/api/quiz/admin/release-tokens')
      .set('Authorization', `Bearer ${evaluatorToken}`);
    expect(releaseRes.status).toBe(200);

    // 2. Team Alpha checks their balance: 8.5 * 100000 = 850000 Tokens (quizMarks hidden from participants)
    const balanceResA = await request(app)
      .get('/api/auction/my-balance')
      .set('Authorization', `Bearer ${leaderTokenA}`);
    expect(balanceResA.status).toBe(200);
    expect(balanceResA.body.quizMarks).toBeUndefined();
    expect(balanceResA.body.initialTokens).toBe(850000);
    expect(balanceResA.body.remainingBalance).toBe(850000);

    // 3. Team Beta checks their balance: 6.5 * 100000 = 650000 Tokens
    const balanceResB = await request(app)
      .get('/api/auction/my-balance')
      .set('Authorization', `Bearer ${leaderTokenB}`);
    expect(balanceResB.status).toBe(200);
    expect(balanceResB.body.remainingBalance).toBe(650000);
  });

  it('8. Live Auction Floor: Bucket 2 companies management, bidding, assignment, and admin reassignments', async () => {
    // 1. Admin configures Bucket 2 companies
    const putCompRes = await request(app)
      .put('/api/auction/companies')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        companies: [
          { id: 'auc-b2-1', name: 'CloudScale Dynamics', description: 'Premier infrastructure and distributed systems partner.', basePrice: 200 },
          { id: 'auc-b2-2', name: 'Quantum Core', description: 'Fault-tolerant quantum computing systems.', basePrice: 250 },
        ],
      });
    expect(putCompRes.status).toBe(200);
    expect(putCompRes.body.companies.length).toBe(2);

    // 1b. Evaluator is forbidden from starting auction items (admin only)
    const evaluatorStartForbidden = await request(app)
      .post('/api/auction/staff/start-item')
      .set('Authorization', `Bearer ${evaluatorToken}`)
      .send({
        id: 'auc-b2-1',
        name: 'CloudScale Dynamics',
        basePrice: 200,
      });
    expect(evaluatorStartForbidden.status).toBe(403);

    // 2. Admin starts auction item 'auc-b2-1' (CloudScale Dynamics)
    const startRes = await request(app)
      .post('/api/auction/staff/start-item')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        id: 'auc-b2-1',
        name: 'CloudScale Dynamics',
        description: 'Premier infrastructure and distributed systems partner.',
        basePrice: 200,
      });
    expect(startRes.status).toBe(200);
    expect(startRes.body.liveAuction.status).toBe('bidding');

    // 3. Public observer views live auction floor
    const publicViewRes = await request(app).get('/api/auction/live');
    expect(publicViewRes.status).toBe(200);
    expect(publicViewRes.body.liveAuction.activeItem.name).toBe('CloudScale Dynamics');
    expect(publicViewRes.body.liveAuction.currentBid).toBe(200);

    // 4. Team Beta places a bid of 300
    const bidResB = await request(app)
      .post('/api/auction/bid')
      .set('Authorization', `Bearer ${leaderTokenB}`)
      .send({ bidAmount: 300 });
    expect(bidResB.status).toBe(200);
    expect(bidResB.body.liveAuction.currentBid).toBe(300);
    expect(bidResB.body.liveAuction.highestBidderTeamName).toBe('Workflow Team Beta');

    // 5. Team Alpha outbids with 400
    const bidResA = await request(app)
      .post('/api/auction/bid')
      .set('Authorization', `Bearer ${leaderTokenA}`)
      .send({ bidAmount: 400 });
    expect(bidResA.status).toBe(200);
    expect(bidResA.body.liveAuction.currentBid).toBe(400);
    expect(bidResA.body.liveAuction.highestBidderTeamName).toBe('Workflow Team Alpha');

    // 5b. Evaluator is forbidden from assigning companies (admin only)
    const evaluatorAssignForbidden = await request(app)
      .post('/api/auction/staff/assign')
      .set('Authorization', `Bearer ${evaluatorToken}`)
      .send({ teamId: teamA._id.toString() });
    expect(evaluatorAssignForbidden.status).toBe(403);

    // 6. Admin assigns auction company directly to Team Alpha
    const assignRes = await request(app)
      .post('/api/auction/staff/assign')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ teamId: teamA._id.toString() });
    expect(assignRes.status).toBe(200);
    expect(assignRes.body.assignedTeamName).toBe('Workflow Team Alpha');
    expect(assignRes.body.liveAuction.status).toBe('sold');

    // 7. Admin oversight: Check assignments roster
    const assignmentsRes = await request(app)
      .get('/api/auction/staff/assignments')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(assignmentsRes.status).toBe(200);
    const alphaAssignment = assignmentsRes.body.assignments.find((a: any) => a.teamName === 'Workflow Team Alpha');
    expect(alphaAssignment).toBeDefined();
    expect(alphaAssignment.auctionCompany.name).toBe('CloudScale Dynamics');

    // 7b. Evaluator is forbidden from reassigning companies (admin only)
    const evaluatorReassignForbidden = await request(app)
      .post('/api/auction/staff/reassign')
      .set('Authorization', `Bearer ${evaluatorToken}`)
      .send({
        teamId: teamA._id.toString(),
        companyId: 'auc-b2-2',
      });
    expect(evaluatorReassignForbidden.status).toBe(403);

    // 8. Admin reassigns / changes company if required
    const reassignRes = await request(app)
      .post('/api/auction/staff/reassign')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        teamId: teamA._id.toString(),
        companyId: 'auc-b2-2',
        companyName: 'Quantum Core',
        companyDescription: 'Fault-tolerant quantum computing systems.',
        price: 250,
      });
    expect(reassignRes.status).toBe(200);
    expect(reassignRes.body.assignedCompany.name).toBe('Quantum Core');

    // 9. Team Alpha can still view live auction floor even after securing both companies
    const viewAfterSecured = await request(app)
      .get('/api/auction/live')
      .set('Authorization', `Bearer ${leaderTokenA}`);
    expect(viewAfterSecured.status).toBe(200);
    expect(viewAfterSecured.body.liveAuction).toBeDefined();
  });

  it('9. Final Project Pitch: Admin enables final submission gate after auction concludes', async () => {
    // 1. Team Alpha has 2 companies: Nexus Cybernetics (Queue 1) and Quantum Core (Auction)
    const currentRes = await request(app)
      .get('/api/submissions/current')
      .set('Authorization', `Bearer ${leaderTokenA}`);
    expect(currentRes.status).toBe(200);
    expect(currentRes.body.assignedCompanies.length).toBe(2);
    expect(currentRes.body.hasSelectedTwoCompanies).toBe(true);
    expect(currentRes.body.finalSubmissionOpen).toBe(false);

    // 2. Submission should fail while admin has not opened final submissions
    const blockedSubmitRes = await request(app)
      .post('/api/submissions/submit')
      .set('Authorization', `Bearer ${leaderTokenA}`)
      .send({
        stage: 'final-submission',
        payload: {
          productName: 'CyberScale Core Engine',
          productDescription: 'Unified autonomous security monitoring integrating Nexus AI and Quantum infrastructure.',
          prototypeUrl: 'https://cyberscale-demo.vercel.app',
          githubUrl: 'https://github.com/iste-workflow/cyberscale-core',
        },
      });
    expect(blockedSubmitRes.status).toBe(403);
    expect(blockedSubmitRes.body.error).toBe('Submissions Closed');

    // 3. Admin enables final stage submission gate and empties bidding floor
    const openGateRes = await request(app)
      .post('/api/admin/config/final-submission-toggle')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ open: true });
    expect(openGateRes.status).toBe(200);
    expect(openGateRes.body.finalSubmissionOpen).toBe(true);
    expect(openGateRes.body.liveAuction.status).toBe('idle');
    expect(openGateRes.body.liveAuction.activeItem).toBeNull();

    // 4. Team Alpha submits their Final Project Pitch
    const finalSubmitRes = await request(app)
      .post('/api/submissions/submit')
      .set('Authorization', `Bearer ${leaderTokenA}`)
      .send({
        stage: 'final-submission',
        payload: {
          productName: 'CyberScale Core Engine',
          productDescription: 'Unified autonomous security monitoring integrating Nexus AI and Quantum infrastructure.',
          prototypeUrl: 'https://cyberscale-demo.vercel.app',
          githubUrl: 'https://github.com/iste-workflow/cyberscale-core',
        },
      });
    expect(finalSubmitRes.status).toBe(200);
    expect(finalSubmitRes.body.submission.stage).toBe('final-submission');
    expect(finalSubmitRes.body.submission.payload.productName).toBe('CyberScale Core Engine');

    // 5. Mentors & Evaluators can access and review final submissions
    const finalSubsRes = await request(app)
      .get('/api/mentor/final-submissions')
      .set('Authorization', `Bearer ${mentorToken}`);
    expect(finalSubsRes.status).toBe(200);
    const alphaFinal = finalSubsRes.body.finalSubmissions.find((s: any) => s.teamId === teamA._id.toString());
    expect(alphaFinal).toBeDefined();
    expect(alphaFinal.productName).toBe('CyberScale Core Engine');
    expect(alphaFinal.assignedCompanies.length).toBe(2);
  });

  it('10. Grand Finale: Admin announces winners and public podium curtain activates', async () => {
    // 1. Initial state: winners are not announced
    const initialWinners = await request(app).get('/api/leaderboard/winners');
    expect(initialWinners.status).toBe(200);
    expect(initialWinners.body.announced).toBe(false);

    // 2. Admin announces winners with explicit Top 3 podium (Rank 1, 2, 3)
    const announceRes = await request(app)
      .post('/api/admin/config/winners-toggle')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        announced: true,
        winners: [
          {
            rank: 1,
            teamId: teamA._id.toString(),
            teamName: teamA.teamName,
            college: 'Engineering Institute',
            score: 95.5,
            prizeTitle: 'Synapse 2026 Champion',
          },
          {
            rank: 2,
            teamId: teamB._id.toString(),
            teamName: teamB.teamName,
            college: 'Technology Campus',
            score: 89.0,
            prizeTitle: 'First Runner Up',
          },
        ],
      });
    expect(announceRes.status).toBe(200);
    expect(announceRes.body.winnersAnnouncement.announced).toBe(true);
    expect(announceRes.body.winnersAnnouncement.winners.length).toBe(2);

    // 3. Public visitor retrieves announced winners for the 2 1 3 podium
    const publicPodiumRes = await request(app).get('/api/leaderboard/winners');
    expect(publicPodiumRes.status).toBe(200);
    expect(publicPodiumRes.body.announced).toBe(true);
    expect(publicPodiumRes.body.winners.find((w: any) => w.rank === 1).teamName).toBe('Workflow Team Alpha');
    expect(publicPodiumRes.body.winners.find((w: any) => w.rank === 2).teamName).toBe('Workflow Team Beta');

    // 4. Non-admin is forbidden from toggling winners
    const mentorForbiddenToggle = await request(app)
      .post('/api/admin/config/winners-toggle')
      .set('Authorization', `Bearer ${mentorToken}`)
      .send({ announced: false });
    expect(mentorForbiddenToggle.status).toBe(403);
  });
});
