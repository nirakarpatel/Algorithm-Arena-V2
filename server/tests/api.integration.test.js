const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;
let app;
let User;
let Clan;
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
  User = require('../src/features/users/User.model.js');
  Clan = require('../src/features/clans/Clan.model.js');
  Submission = require('../src/features/submissions/Submission.model.js');
  RefreshToken = require('../src/features/auth/RefreshToken.model.js');

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

const registerUser = async ({ username, email, password = 'strong-password' }) => {
  const res = await request(app).post('/api/auth/register').send({
    username,
    email,
    password,
  });
  assert.equal(res.status, 201);
  return {
    id: res.body.data._id,
    token: res.body.data.token,
  };
};

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

test('clan chief submission review is clan-scoped, moderator has global override', async () => {
  const admin = await registerUser({
    username: 'admin_scope',
    email: 'admin.scope@example.com',
  });
  await User.findByIdAndUpdate(admin.id, { role: 'admin' });

  const adminLogin = await request(app).post('/api/auth/login').send({
    email: 'admin.scope@example.com',
    password: 'strong-password',
  });
  const adminToken = adminLogin.body.data.token;

  const challengeRes = await request(app)
    .post('/api/challenges')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      title: 'Scope Challenge',
      description: 'Validate clan-scoped submission review permissions.',
      difficulty: 'Easy',
      points: 50,
      category: 'Auth',
    });
  assert.equal(challengeRes.status, 201);
  const challengeId = challengeRes.body.data._id;

  const clanARes = await request(app)
    .post('/api/clans')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'Clan Alpha', tag: 'ALP', description: 'Alpha' });
  const clanBRes = await request(app)
    .post('/api/clans')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'Clan Beta', tag: 'BET', description: 'Beta' });
  assert.equal(clanARes.status, 201);
  assert.equal(clanBRes.status, 201);

  const chiefA = await registerUser({
    username: 'chief_alpha',
    email: 'chief.alpha@example.com',
  });
  const memberA = await registerUser({
    username: 'member_alpha',
    email: 'member.alpha@example.com',
  });
  const memberB = await registerUser({
    username: 'member_beta',
    email: 'member.beta@example.com',
  });
  const moderator = await registerUser({
    username: 'mod_global',
    email: 'mod.global@example.com',
  });
  await User.findByIdAndUpdate(moderator.id, { role: 'moderator' });

  const clanAId = clanARes.body.data._id;
  const clanBId = clanBRes.body.data._id;

  assert.equal(
    (await request(app)
      .post(`/api/clans/${clanAId}/members`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ userId: chiefA.id })).status,
    200
  );
  assert.equal(
    (await request(app)
      .post(`/api/clans/${clanAId}/members`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ userId: memberA.id })).status,
    200
  );
  assert.equal(
    (await request(app)
      .post(`/api/clans/${clanBId}/members`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ userId: memberB.id })).status,
    200
  );

  const assignChiefRes = await request(app)
    .put(`/api/clans/${clanAId}/chief`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ userId: chiefA.id });
  assert.equal(assignChiefRes.status, 200);

  const memberBSubmissionRes = await request(app)
    .post('/api/submissions')
    .set('Authorization', `Bearer ${memberB.token}`)
    .send({
      challengeId,
      code: 'function solve(){ return 42; }',
      language: 'javascript',
    });
  assert.equal(memberBSubmissionRes.status, 201);

  const memberASubmissionRes = await request(app)
    .post('/api/submissions')
    .set('Authorization', `Bearer ${memberA.token}`)
    .send({
      challengeId,
      code: 'function solve(){ return 7; }',
      language: 'javascript',
    });
  assert.equal(memberASubmissionRes.status, 201);

  const chiefBlockedList = await request(app)
    .get(`/api/submissions?userId=${memberB.id}`)
    .set('Authorization', `Bearer ${chiefA.token}`);
  assert.equal(chiefBlockedList.status, 403);

  const chiefBlockedReview = await request(app)
    .put(`/api/submissions/${memberBSubmissionRes.body.data._id}`)
    .set('Authorization', `Bearer ${chiefA.token}`)
    .send({ status: 'Accepted', feedback: 'Looks good' });
  assert.equal(chiefBlockedReview.status, 403);

  const chiefOwnClanReview = await request(app)
    .put(`/api/submissions/${memberASubmissionRes.body.data._id}`)
    .set('Authorization', `Bearer ${chiefA.token}`)
    .send({ status: 'Accepted', feedback: 'Approved for your clan' });
  assert.equal(chiefOwnClanReview.status, 200);

  const moderatorGlobalReview = await request(app)
    .put(`/api/submissions/${memberBSubmissionRes.body.data._id}`)
    .set('Authorization', `Bearer ${moderator.token}`)
    .send({ status: 'Accepted', feedback: 'Moderator global review' });
  assert.equal(moderatorGlobalReview.status, 200);
});

test('clan chief user moderation is clan-scoped and join requests are blocked for assigned users', async () => {
  const admin = await registerUser({
    username: 'admin_userscope',
    email: 'admin.userscope@example.com',
  });
  await User.findByIdAndUpdate(admin.id, { role: 'admin' });

  const adminLogin = await request(app).post('/api/auth/login').send({
    email: 'admin.userscope@example.com',
    password: 'strong-password',
  });
  const adminToken = adminLogin.body.data.token;

  const clanARes = await request(app)
    .post('/api/clans')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'Clan Gamma', tag: 'GAM', description: 'Gamma' });
  const clanBRes = await request(app)
    .post('/api/clans')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'Clan Delta', tag: 'DEL', description: 'Delta' });
  assert.equal(clanARes.status, 201);
  assert.equal(clanBRes.status, 201);

  const chiefA = await registerUser({
    username: 'chief_gamma',
    email: 'chief.gamma@example.com',
  });
  const memberA = await registerUser({
    username: 'member_gamma',
    email: 'member.gamma@example.com',
  });
  const memberB = await registerUser({
    username: 'member_delta',
    email: 'member.delta@example.com',
  });

  const clanAId = clanARes.body.data._id;
  const clanBId = clanBRes.body.data._id;

  assert.equal(
    (await request(app)
      .post(`/api/clans/${clanAId}/members`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ userId: chiefA.id })).status,
    200
  );
  assert.equal(
    (await request(app)
      .post(`/api/clans/${clanAId}/members`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ userId: memberA.id })).status,
    200
  );
  assert.equal(
    (await request(app)
      .post(`/api/clans/${clanBId}/members`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ userId: memberB.id })).status,
    200
  );

  const assignChiefRes = await request(app)
    .put(`/api/clans/${clanAId}/chief`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ userId: chiefA.id });
  assert.equal(assignChiefRes.status, 200);

  const chiefBlockedWarn = await request(app)
    .post(`/api/users/${memberB.id}/warn`)
    .set('Authorization', `Bearer ${chiefA.token}`)
    .send({ message: 'Cross-clan warning attempt' });
  assert.equal(chiefBlockedWarn.status, 403);

  const chiefAllowedWarn = await request(app)
    .post(`/api/users/${memberA.id}/warn`)
    .set('Authorization', `Bearer ${chiefA.token}`)
    .send({ message: 'In-clan warning' });
  assert.equal(chiefAllowedWarn.status, 200);

  const assignedUserJoinElsewhere = await request(app)
    .post(`/api/clans/${clanBId}/join`)
    .set('Authorization', `Bearer ${memberA.token}`)
    .send({});
  assert.equal(assignedUserJoinElsewhere.status, 400);
  assert.match(assignedUserJoinElsewhere.body.message, /already assigned to a clan/i);
});

test('role-only clan-chief without clan mapping cannot access clan-chief scoped actions', async () => {
  const ghostChief = await registerUser({
    username: 'ghost_chief',
    email: 'ghost.chief@example.com',
  });
  const targetUser = await registerUser({
    username: 'ghost_target',
    email: 'ghost.target@example.com',
  });

  await User.findByIdAndUpdate(ghostChief.id, { role: 'clan-chief' });
  const noClanMapping = await Clan.findOne({ chief: ghostChief.id });
  assert.equal(noClanMapping, null);

  const submissionsAttempt = await request(app)
    .get('/api/submissions')
    .set('Authorization', `Bearer ${ghostChief.token}`);
  assert.equal(submissionsAttempt.status, 403);

  const warnAttempt = await request(app)
    .post(`/api/users/${targetUser.id}/warn`)
    .set('Authorization', `Bearer ${ghostChief.token}`)
    .send({ message: 'No clan mapping should fail' });
  assert.equal(warnAttempt.status, 403);
});

test('clans archive first, restore cleanly, and only admin can permanently delete archived clans', async () => {
  const admin = await registerUser({
    username: 'clan_admin_lifecycle',
    email: 'clan.admin.lifecycle@example.com',
  });
  await User.findByIdAndUpdate(admin.id, { role: 'admin' });

  const adminLogin = await request(app).post('/api/auth/login').send({
    email: 'clan.admin.lifecycle@example.com',
    password: 'strong-password',
  });
  const adminToken = adminLogin.body.data.token;

  const clanRes = await request(app)
    .post('/api/clans')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'Lifecycle Clan', tag: 'LIFE', description: 'Lifecycle test clan' });
  assert.equal(clanRes.status, 201);
  const clanId = clanRes.body.data._id;

  const chief = await registerUser({
    username: 'clan_chief_lifecycle',
    email: 'clan.chief.lifecycle@example.com',
  });
  const member = await registerUser({
    username: 'clan_member_lifecycle',
    email: 'clan.member.lifecycle@example.com',
  });

  assert.equal(
    (await request(app)
      .post(`/api/clans/${clanId}/members`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ userId: chief.id })).status,
    200
  );
  assert.equal(
    (await request(app)
      .post(`/api/clans/${clanId}/members`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ userId: member.id })).status,
    200
  );
  assert.equal(
    (await request(app)
      .put(`/api/clans/${clanId}/chief`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ userId: chief.id })).status,
    200
  );

  const memberLogin = await request(app).post('/api/auth/login').send({
    email: 'clan.member.lifecycle@example.com',
    password: 'strong-password',
  });
  const memberToken = memberLogin.body.data.token;

  const chiefLogin = await request(app).post('/api/auth/login').send({
    email: 'clan.chief.lifecycle@example.com',
    password: 'strong-password',
  });
  const chiefToken = chiefLogin.body.data.token;

  const deleteWhileActive = await request(app)
    .delete(`/api/clans/${clanId}`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({});
  assert.equal(deleteWhileActive.status, 400);

  const archiveRes = await request(app)
    .patch(`/api/clans/${clanId}/archive`)
    .set('Authorization', `Bearer ${chiefToken}`)
    .send({});
  assert.equal(archiveRes.status, 200);
  assert.equal(archiveRes.body.data.status, 'archived');

  const activeClansAfterArchive = await request(app)
    .get('/api/clans')
    .set('Authorization', `Bearer ${adminToken}`);
  assert.equal(activeClansAfterArchive.status, 200);
  assert.equal((activeClansAfterArchive.body.data || []).some((clan) => clan._id === clanId), false);

  const allLeaderboardAfterArchive = await request(app)
    .get('/api/clans/leaderboard?status=all')
    .set('Authorization', `Bearer ${adminToken}`);
  assert.equal(allLeaderboardAfterArchive.status, 200);
  assert.equal((allLeaderboardAfterArchive.body.data || []).some((clan) => clan._id === clanId && clan.status === 'archived'), true);

  const restoreRes = await request(app)
    .patch(`/api/clans/${clanId}/restore`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({});
  assert.equal(restoreRes.status, 200);
  assert.equal(restoreRes.body.data.status, 'active');

  const archiveAgainRes = await request(app)
    .patch(`/api/clans/${clanId}/archive`)
    .set('Authorization', `Bearer ${chiefToken}`)
    .send({});
  assert.equal(archiveAgainRes.status, 200);

  const deleteRes = await request(app)
    .delete(`/api/clans/${clanId}`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({});
  assert.equal(deleteRes.status, 200);

  const deletedClan = await Clan.findById(clanId);
  assert.equal(deletedClan, null);


  const updatedChief = await User.findById(chief.id);
  const updatedMember = await User.findById(member.id);
  assert.equal(updatedChief.clan, null);
  assert.equal(updatedChief.role, 'user');
  assert.equal(updatedMember.clan, null);
});

test('submission with userFeedback validation and storage', async () => {
  // 1. Register admin
  const adminRegister = await request(app).post('/api/auth/register').send({
    username: 'feedback_admin',
    email: 'feedback_admin@example.com',
    password: 'strong-password',
  });
  assert.equal(adminRegister.status, 201);

  // Promote to admin
  await User.findOneAndUpdate(
    { email: 'feedback_admin@example.com' },
    { role: 'admin' }
  );

  const adminLogin = await request(app).post('/api/auth/login').send({
    email: 'feedback_admin@example.com',
    password: 'strong-password',
  });
  assert.equal(adminLogin.status, 200);
  const adminToken = adminLogin.body.data.token;

  // 2. Register student
  const studentRegister = await request(app).post('/api/auth/register').send({
    username: 'feedback_student',
    email: 'feedback.student@example.com',
    password: 'strong-password',
  });
  assert.equal(studentRegister.status, 201);
  const studentToken = studentRegister.body.data.token;

  // 3. Create challenge
  const challengeRes = await request(app)
    .post('/api/challenges')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      title: 'Feedback Challenge',
      description: 'Test feedback',
      difficulty: 'Medium',
      points: 120,
      category: 'Strings',
    });
  assert.equal(challengeRes.status, 201);
  const localChallengeId = challengeRes.body.data._id;

  // 4. Submit with feedback
  const submissionWithFeedbackRes = await request(app)
    .post('/api/submissions')
    .set('Authorization', `Bearer ${studentToken}`)
    .send({
      challengeId: localChallengeId,
      code: 'function solve(){ return "ok"; }',
      language: 'javascript',
      userFeedback: 'I had some issues with environment timeouts.',
    });

  assert.equal(submissionWithFeedbackRes.status, 201);
  assert.equal(submissionWithFeedbackRes.body.data.userFeedback, 'I had some issues with environment timeouts.');
});

