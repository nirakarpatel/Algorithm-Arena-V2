const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;
let app;
let User;
let Submission;
let RefreshToken;

const clearDatabase = async () => {
  const collections = mongoose.connection.collections;
  await Promise.all(Object.values(collections).map((collection) => collection.deleteMany({})));
};

test.before(async () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test_secret_for_algorithm_arena_12345';
  process.env.CORS_ORIGINS = 'http://localhost:5173';

  mongoServer = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongoServer.getUri();

  ({ app } = require('../server'));
  User = require('../models/User');
  Submission = require('../models/Submission');
  RefreshToken = require('../models/RefreshToken');

  await mongoose.connect(process.env.MONGO_URI);
});

test.after(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

test.beforeEach(async () => {
  await clearDatabase();
});

test('/ping returns a lightweight health response', async () => {
  const pingRes = await request(app).get('/ping');

  assert.equal(pingRes.status, 200);
  assert.deepEqual(pingRes.body, { ok: true });
});

test('root status endpoint remains available', async () => {
  const rootRes = await request(app).get('/');

  assert.equal(rootRes.status, 200);
  assert.equal(rootRes.body.success, true);
  assert.equal(rootRes.body.message, 'Algorithm Arena API is running');
});

test('register, login, and /auth/me lifecycle works', async () => {
  const registerRes = await request(app).post('/api/auth/register').send({
    username: 'pilot_one',
    email: 'pilot.one@example.com',
    password: 'strong-password',
  });

  assert.equal(registerRes.status, 201);
  assert.equal(registerRes.body.success, true);
  assert.ok(registerRes.body.data.token);

  const loginRes = await request(app).post('/api/auth/login').send({
    email: 'pilot.one@example.com',
    password: 'strong-password',
  });

  assert.equal(loginRes.status, 200);
  assert.equal(loginRes.body.success, true);
  assert.ok(loginRes.body.data.token);

  const meRes = await request(app)
    .get('/api/auth/me')
    .set('Authorization', `Bearer ${loginRes.body.data.token}`);

  assert.equal(meRes.status, 200);
  assert.equal(meRes.body.success, true);
  assert.equal(meRes.body.data.email, 'pilot.one@example.com');
});

test('refresh rotation and logout revocation flow works', async () => {
  const agent = request.agent(app);

  const registerRes = await agent.post('/api/auth/register').send({
    username: 'rotate_user',
    email: 'rotate@example.com',
    password: 'strong-password',
  });

  assert.equal(registerRes.status, 201);
  assert.ok(registerRes.body.data.token);

  const tokenCountBeforeRefresh = await RefreshToken.countDocuments();
  assert.equal(tokenCountBeforeRefresh, 1);

  const refreshRes = await agent.post('/api/auth/refresh').send({});
  assert.equal(refreshRes.status, 200);
  assert.equal(refreshRes.body.success, true);
  assert.ok(refreshRes.body.data.token);

  const meRes = await agent
    .get('/api/auth/me')
    .set('Authorization', `Bearer ${refreshRes.body.data.token}`);
  assert.equal(meRes.status, 200);
  assert.equal(meRes.body.data.email, 'rotate@example.com');

  const refreshTokens = await RefreshToken.find().sort({ createdAt: 1 });
  assert.equal(refreshTokens.length, 2);
  assert.ok(refreshTokens[0].revokedAt);
  assert.equal(refreshTokens[0].replacedByTokenHash, refreshTokens[1].tokenHash);

  const logoutRes = await agent.post('/api/auth/logout').send({});
  assert.equal(logoutRes.status, 200);
  assert.equal(logoutRes.body.success, true);

  const postLogoutRefresh = await agent.post('/api/auth/refresh').send({});
  assert.equal(postLogoutRefresh.status, 401);
});

test('challenge + submission flow enforces owner permissions', async () => {
  const adminRegister = await request(app).post('/api/auth/register').send({
    username: 'admin_user',
    email: 'admin@example.com',
    password: 'strong-password',
  });
  assert.equal(adminRegister.status, 201);

  await User.findByIdAndUpdate(adminRegister.body.data._id, { role: 'admin' });

  const adminLogin = await request(app).post('/api/auth/login').send({
    email: 'admin@example.com',
    password: 'strong-password',
  });
  const adminToken = adminLogin.body.data.token;

  const userRegister = await request(app).post('/api/auth/register').send({
    username: 'student_user',
    email: 'student@example.com',
    password: 'strong-password',
  });
  const studentToken = userRegister.body.data.token;

  const otherRegister = await request(app).post('/api/auth/register').send({
    username: 'intruder_user',
    email: 'intruder@example.com',
    password: 'strong-password',
  });
  const intruderToken = otherRegister.body.data.token;

  const challengeRes = await request(app)
    .post('/api/challenges')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      title: 'Two Sum Challenge',
      description: 'Return indices of two numbers that add up to target.',
      difficulty: 'Easy',
      points: 100,
      category: 'Arrays',
    });

  assert.equal(challengeRes.status, 201);
  const challengeId = challengeRes.body.data._id;

  const submissionRes = await request(app)
    .post('/api/submissions')
    .set('Authorization', `Bearer ${studentToken}`)
    .send({
      challengeId,
      code: 'function solve(){ return [0,1]; }',
      language: 'javascript',
    });

  assert.equal(submissionRes.status, 201);
  const submissionId = submissionRes.body.data._id;

  const ownSubmission = await request(app)
    .get(`/api/submissions/${submissionId}`)
    .set('Authorization', `Bearer ${studentToken}`);

  assert.equal(ownSubmission.status, 200);
  assert.equal(ownSubmission.body.success, true);

  const blockedSubmission = await request(app)
    .get(`/api/submissions/${submissionId}`)
    .set('Authorization', `Bearer ${intruderToken}`);

  assert.equal(blockedSubmission.status, 403);
  assert.equal(blockedSubmission.body.success, false);

  const mySubmissions = await request(app)
    .get('/api/submissions/my-submissions')
    .set('Authorization', `Bearer ${studentToken}`);

  assert.equal(mySubmissions.status, 200);
  assert.equal(mySubmissions.body.success, true);
  assert.equal(mySubmissions.body.data.length, 1);

  const leaderboard = await request(app)
    .get('/api/submissions/leaderboard?window=all&page=1&limit=10')
    .set('Authorization', `Bearer ${studentToken}`);

  assert.equal(leaderboard.status, 200);
  assert.equal(leaderboard.body.success, true);
  assert.ok(Array.isArray(leaderboard.body.data));

  const storedSubmission = await Submission.findById(submissionId);
  assert.equal(storedSubmission.status, 'Pending');
});
