const express = require('express');
const router = express.Router();
const multer = require('multer');

const {
  getChallenges,
  getChallengeById,
  createChallenge,
  updateChallenge,
  deleteChallenge,
  importChallenges,
  getLeetCodeDetails,
} = require('./challenge.controller');

const { protect, admin } = require('../../../middleware/auth');
const { validate } = require('../../../middleware/validate');
const {
  challengeIdParamsSchema,
  challengeCreateSchema,
  challengeUpdateSchema,
  challengeQuerySchema,
} = require('../../../validators/challengeSchemas');

const upload = multer({ storage: multer.memoryStorage() });

// ─── Routes ───────────────────────────────────────────────────────────────────

router.get('/fetch-leetcode-details', protect, admin, getLeetCodeDetails);

router.post('/import', protect, admin, upload.single('file'), importChallenges);

router
  .route('/')
  .get(validate(challengeQuerySchema), getChallenges)
  .post(protect, admin, validate(challengeCreateSchema), createChallenge);

router
  .route('/:id')
  .get(validate(challengeIdParamsSchema), getChallengeById)
  .put(protect, admin, validate(challengeIdParamsSchema), validate(challengeUpdateSchema), updateChallenge)
  .delete(protect, admin, validate(challengeIdParamsSchema), deleteChallenge);

module.exports = router;
