import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/index.js';
import { connectDB } from '../src/config/db.js';
import { Account } from '../src/models/Account.js';
import { Participant } from '../src/models/Participant.js';
import { Team } from '../src/models/Team.js';
import { CompetitionConfig } from '../src/models/CompetitionConfig.js';
import { QuizSubmission } from '../src/models/QuizSubmission.js';
import { QuizScore } from '../src/models/QuizScore.js';
import { signUserToken } from '../src/middleware/auth.js';

let adminToken: string;
let evaluatorToken: string;
let team1LeaderToken: string;
let team1MemberToken: string;
let team2LeaderToken: string;
let team1: any;
let team2: any;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  await connectDB('mongodb://127.0.0.1:27017/synapse_2026_test');

  const testEmails = [
    'admin.quiz@synapse.test',
    'evaluator.quiz@synapse.test',
    'leader1.quiz@synapse.test',
    'member1.quiz@synapse.test',
    'leader2.quiz@synapse.test',
  ];
  await Account.deleteMany({ email: { $in: testEmails } });
  await Participant.deleteMany({ email: { $in: testEmails } });
  await Team.deleteMany({ teamName: { $in: ['Quiz Titans', 'Quiz Wizards'] } });
  await QuizSubmission.deleteMany({});
  await QuizScore.deleteMany({});
  await CompetitionConfig.deleteMany({});

  // Seed Admin
  const adminAcc = await Account.create({
    email: 'admin.quiz@synapse.test',
    name: 'Admin Quiz Host',
    role: 'admin',
  });
  adminToken = signUserToken(adminAcc.email, adminAcc.name);

  // Seed Evaluator
  const evalAcc = await Account.create({
    email: 'evaluator.quiz@synapse.test',
    name: 'Evaluator Quiz Judge',
    role: 'evaluator',
  });
  evaluatorToken = signUserToken(evalAcc.email, evalAcc.name);

  // Seed Team 1
  const leader1Acc = await Account.create({
    email: 'leader1.quiz@synapse.test',
    name: 'Team 1 Leader',
    role: 'public',
  });
  team1LeaderToken = signUserToken(leader1Acc.email, leader1Acc.name);

  const part1 = await Participant.create({
    firstName: 'Leader',
    lastName: 'One',
    email: leader1Acc.email,
    college: 'Thapar Institute',
    role: 'leader',
  });

  team1 = await Team.create({
    teamName: 'Quiz Titans',
    leaderId: part1._id,
    members: [part1._id],
  });
  part1.teamId = team1._id;
  await part1.save();

  // Seed Team 1 Member (non-leader)
  const member1Acc = await Account.create({
    email: 'member1.quiz@synapse.test',
    name: 'Team 1 Member',
    role: 'public',
  });
  team1MemberToken = signUserToken(member1Acc.email, member1Acc.name);

  const partMember1 = await Participant.create({
    firstName: 'Member',
    lastName: 'One',
    email: member1Acc.email,
    college: 'Thapar Institute',
    role: 'member',
  });
  partMember1.teamId = team1._id;
  await partMember1.save();
  team1.members.push(partMember1._id);
  await team1.save();

  // Seed Team 2
  const leader2Acc = await Account.create({
    email: 'leader2.quiz@synapse.test',
    name: 'Team 2 Leader',
    role: 'public',
  });
  team2LeaderToken = signUserToken(leader2Acc.email, leader2Acc.name);

  const part2 = await Participant.create({
    firstName: 'Leader',
    lastName: 'Two',
    email: leader2Acc.email,
    college: 'Thapar Institute',
    role: 'leader',
  });

  team2 = await Team.create({
    teamName: 'Quiz Wizards',
    leaderId: part2._id,
    members: [part2._id],
  });
  part2.teamId = team2._id;
  await part2.save();
});

afterAll(async () => {
  const testEmails = [
    'admin.quiz@synapse.test',
    'evaluator.quiz@synapse.test',
    'leader1.quiz@synapse.test',
    'member1.quiz@synapse.test',
    'leader2.quiz@synapse.test',
  ];
  await Account.deleteMany({ email: { $in: testEmails } });
  await Participant.deleteMany({ email: { $in: testEmails } });
  await Team.deleteMany({ teamName: { $in: ['Quiz Titans', 'Quiz Wizards'] } });
  await QuizSubmission.deleteMany({});
  await QuizScore.deleteMany({});
  await CompetitionConfig.deleteMany({});
});

describe('Automated Knowledge Assessment (Quiz) System', () => {
  it('should initialize quiz with 20 questions and not_started status', async () => {
    const res = await request(app).get('/api/quiz/status');
    expect(res.status).toBe(200);
    expect(res.body.quizStatus).toBe('not_started');
    expect(res.body.totalQuestions).toBe(20);
    expect(res.body.hasSubmitted).toBe(false);
  });

  it('should block participants from fetching questions when assessment is not_started', async () => {
    const res = await request(app)
      .get('/api/quiz/questions')
      .set('Authorization', `Bearer ${team1LeaderToken}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Assessment Inactive');
  });

  it('should allow admin to start the assessment', async () => {
    const res = await request(app)
      .post('/api/quiz/admin/status')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'active' });
    expect(res.status).toBe(200);
    expect(res.body.quizStatus).toBe('active');

    const statusCheck = await request(app).get('/api/quiz/status');
    expect(statusCheck.body.quizStatus).toBe('active');
  });

  it('should serve questions to participants without leaking correct answer keys', async () => {
    const res = await request(app)
      .get('/api/quiz/questions')
      .set('Authorization', `Bearer ${team1LeaderToken}`);
    expect(res.status).toBe(200);
    expect(res.body.questions).toHaveLength(20);

    // Verify answers are strictly stripped
    for (const q of res.body.questions) {
      expect(q).not.toHaveProperty('correct');
      expect(q).toHaveProperty('id');
      expect(q).toHaveProperty('question');
      expect(q).toHaveProperty('options');
      expect(Array.isArray(q.options)).toBe(true);
    }
  });

  it('should allow admin/evaluators to view full questions WITH answer keys', async () => {
    const res = await request(app)
      .get('/api/quiz/admin/questions')
      .set('Authorization', `Bearer ${evaluatorToken}`);
    expect(res.status).toBe(200);
    expect(res.body.questions).toHaveLength(20);
    expect(res.body.questions[0]).toHaveProperty('acceptedFlags');
  });

  it('should allow team members (non-leaders) to view questions through their devices', async () => {
    const res = await request(app)
      .get('/api/quiz/questions')
      .set('Authorization', `Bearer ${team1MemberToken}`);
    expect(res.status).toBe(200);
    expect(res.body.questions).toHaveLength(20);
    // Answers must be stripped
    expect(res.body.questions[0]).not.toHaveProperty('acceptedFlags');
  });

  it('should prevent team members (non-leaders) from submitting answers', async () => {
    const res = await request(app)
      .post('/api/quiz/submit')
      .set('Authorization', `Bearer ${team1MemberToken}`)
      .send({
        answers: [{ questionId: 1, flag: 'AIML{transformer}' }],
      });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Leader Authorization Required');
  });

  it('should allow team 1 to submit batch responses and automatically calculate score on backend strictly', async () => {
    // 4 correct answers across Easy challenges (1 pt each = 4 pts total)
    // Q1: 'AIML{transformer}'
    // Q2: 'isteCTF{layer}'
    // Q3: 'AIML{False_2_4}'
    // Q4: 'CTF{r0b0ts_txt_r3v3als_a11}'
    const answers = [
      { questionId: 1, flag: 'AIML{transformer}' }, // 1 pt
      { questionId: 2, flag: 'isteCTF{layer}' }, // 1 pt
      { questionId: 3, flag: 'AIML{False_2_4}' }, // 1 pt
      { questionId: 4, flag: 'CTF{r0b0ts_txt_r3v3als_a11}' }, // 1 pt
    ];

    const res = await request(app)
      .post('/api/quiz/submit')
      .set('Authorization', `Bearer ${team1LeaderToken}`)
      .send({ answers });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.submittedAt).toBeDefined();

    // Verify STRICT requirement: NO score or correctness returned to user!
    expect(res.body).not.toHaveProperty('score');
    expect(res.body).not.toHaveProperty('quizMarks');
    expect(res.body).not.toHaveProperty('correct');
    expect(res.body).not.toHaveProperty('wrong');

    // Verify backend calculated the score and updated QuizScore and QuizSubmission
    const sub = await QuizSubmission.findOne({ teamId: team1._id });
    expect(sub).toBeDefined();
    expect(sub?.score).toBe(4);

    const qs = await QuizScore.findOne({ teamId: team1._id });
    expect(qs).toBeDefined();
    expect(qs?.quizMarks).toBe(4);
    // Tokens are withheld until staff clicks release button
    expect(qs?.tokensReleased).toBe(false);
    expect(qs?.auctionBalance).toBe(0);
    expect(qs?.remainingBalance).toBe(0);
    expect(qs?.submittedAt).toBeDefined();

    // Verify participant's auction balance shows 0 / pending release
    const balRes = await request(app)
      .get('/api/auction/my-balance')
      .set('Authorization', `Bearer ${team1LeaderToken}`);
    expect(balRes.status).toBe(200);
    expect(balRes.body.tokensReleased).toBe(false);
    expect(balRes.body.remainingBalance).toBe(0);
  });

  it('should hide questions from team 1 once submitted', async () => {
    const res = await request(app)
      .get('/api/quiz/questions')
      .set('Authorization', `Bearer ${team1LeaderToken}`);
    expect(res.status).toBe(200);
    expect(res.body.hasSubmitted).toBe(true);
    expect(res.body.questions).toEqual([]);
  });

  it('should lock submissions and prevent editing once submitted', async () => {
    const updatedAnswers = [
      { questionId: 1, selectedOption: 3 },
      { questionId: 2, selectedOption: 1 },
    ];

    const res = await request(app)
      .post('/api/quiz/submit')
      .set('Authorization', `Bearer ${team1LeaderToken}`)
      .send({ answers: updatedAnswers });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Submission Locked');
  });

  it('should support earlier-submission tie-breaking in staff score listing', async () => {
    // Team 1 already submitted earlier. Let's make Team 2 submit with the same answers.
    const team1Sub = await QuizSubmission.findOne({ teamId: team1._id });
    const team1Score = team1Sub!.score;

    // Team 2 submits now (later timestamp)
    const res = await request(app)
      .post('/api/quiz/submit')
      .set('Authorization', `Bearer ${team2LeaderToken}`)
      .send({ answers: team1Sub!.answers });
    expect(res.status).toBe(200);

    const team2Sub = await QuizSubmission.findOne({ teamId: team2._id });
    expect(team2Sub?.score).toBe(team1Score);

    // Fetch staff scores list
    const staffRes = await request(app)
      .get('/api/auction/staff/quiz-scores')
      .set('Authorization', `Bearer ${evaluatorToken}`);

    expect(staffRes.status).toBe(200);
    const scores = staffRes.body.scores;
    expect(scores.length).toBeGreaterThanOrEqual(2);

    // Team 1 must rank before Team 2 due to earlier submission timestamp!
    const idx1 = scores.findIndex((s: any) => s.teamName === 'Quiz Titans');
    const idx2 = scores.findIndex((s: any) => s.teamName === 'Quiz Wizards');

    expect(idx1).toBeLessThan(idx2);
  });

  it('should allow evaluators to manually adjust/override a team quiz score for tie-breaking', async () => {
    const res = await request(app)
      .post(`/api/auction/staff/quiz-score/${team2._id}`)
      .set('Authorization', `Bearer ${evaluatorToken}`)
      .send({ quizMarks: 20, multiplier: 100000 });

    expect(res.status).toBe(200);

    const qs = await QuizScore.findOne({ teamId: team2._id });
    expect(qs?.quizMarks).toBe(20);
    // Still withheld until release
    expect(qs?.tokensReleased).toBe(false);
  });

  it('should allow staff to release tokens to all teams', async () => {
    const releaseRes = await request(app)
      .post('/api/quiz/admin/release-tokens')
      .set('Authorization', `Bearer ${evaluatorToken}`);

    expect(releaseRes.status).toBe(200);
    expect(releaseRes.body.success).toBe(true);
    expect(releaseRes.body.quizTokensReleased).toBe(true);

    // Verify Team 2 (20 marks * 100000) now has 2000000 tokens
    const qs2 = await QuizScore.findOne({ teamId: team2._id });
    expect(qs2?.tokensReleased).toBe(true);
    expect(qs2?.auctionBalance).toBe(2000000);
    expect(qs2?.remainingBalance).toBe(2000000);

    // Verify Team 2 can see their balance in my-balance
    const bal2 = await request(app)
      .get('/api/auction/my-balance')
      .set('Authorization', `Bearer ${team2LeaderToken}`);
    expect(bal2.status).toBe(200);
    expect(bal2.body.tokensReleased).toBe(true);
    expect(bal2.body.remainingBalance).toBe(2000000);
  });

  it('should allow admin to edit questions via PUT /api/quiz/admin/questions', async () => {
    const getRes = await request(app)
      .get('/api/quiz/admin/questions')
      .set('Authorization', `Bearer ${adminToken}`);

    const questions = getRes.body.questions;
    questions[0].question = 'Updated test question for Synapse 2026?';
    if (!questions[0].options || questions[0].options.length === 0) {
      questions[0].options = ['Custom Modified Option'];
    } else {
      questions[0].options[0] = 'Custom Modified Option';
    }

    const putRes = await request(app)
      .put('/api/quiz/admin/questions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ questions });

    expect(putRes.status).toBe(200);
    expect(putRes.body.questions[0].question).toBe('Updated test question for Synapse 2026?');
  });

  it('should close the assessment and prevent any further submissions', async () => {
    // Admin closes assessment
    const closeRes = await request(app)
      .post('/api/quiz/admin/status')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'closed' });
    expect(closeRes.status).toBe(200);
    expect(closeRes.body.quizStatus).toBe('closed');

    // Participant attempts to submit when closed
    const submitRes = await request(app)
      .post('/api/quiz/submit')
      .set('Authorization', `Bearer ${team1LeaderToken}`)
      .send({ answers: [{ questionId: 1, selectedOption: 0 }] });

    expect(submitRes.status).toBe(400);
    expect(submitRes.body.error).toBe('Assessment Closed');
  });

  it('should have exactly 20 questions split into 8 easy (1pt), 7 medium (2pt), 5 hard (3pt)', async () => {
    const res = await request(app)
      .get('/api/quiz/admin/questions')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const questions = res.body.questions;
    expect(questions).toHaveLength(20);

    const easy = questions.filter((q: any) => q.difficulty === 'easy' && q.points === 1);
    const medium = questions.filter((q: any) => q.difficulty === 'medium' && q.points === 2);
    const hard = questions.filter((q: any) => q.difficulty === 'hard' && q.points === 3);

    expect(easy).toHaveLength(8);
    expect(medium).toHaveLength(7);
    expect(hard).toHaveLength(5);
  });

  it('should support randomizing token counts for auction companies', async () => {
    const compRes = await request(app).get('/api/auction/companies');
    expect(compRes.status).toBe(200);
    const companies = compRes.body.companies;
    expect(companies.length).toBeGreaterThanOrEqual(40);

    // Randomize token counts via admin endpoint
    const randRes = await request(app)
      .post('/api/auction/companies/randomize')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(randRes.status).toBe(200);
    expect(randRes.body.companies.length).toBeGreaterThanOrEqual(40);

    // Check that prices are non-zero and varied
    const prices = randRes.body.companies.map((c: any) => c.basePrice);
    const uniquePrices = new Set(prices);
    expect(uniquePrices.size).toBeGreaterThan(1);
    for (const p of prices) {
      expect(p).toBeGreaterThanOrEqual(100000);
    }
  });
});
