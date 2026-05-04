const express = require('express');
const router = express.Router();

const {
  submitCode,
  getSubmissions,
  getMySubmissions,
  getLeaderboard,
  getSubmissionById,
  updateSubmissionStatus,
} = require('../controllers/SubmissionController');

const { protect, admin, chiefOrAdmin } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
  submissionIdParamsSchema,
  submissionCreateSchema,
  submissionUpdateSchema,
  submissionQuerySchema,
  leaderboardQuerySchema,
  mySubmissionQuerySchema,
} = require('../validators/submissionSchemas');

router
  .route('/')
  .get(protect, chiefOrAdmin, validate(submissionQuerySchema), getSubmissions)
  .post(protect, validate(submissionCreateSchema), submitCode);

router.get('/my-submissions', protect, validate(mySubmissionQuerySchema), getMySubmissions);
router.get('/leaderboard', protect, validate(leaderboardQuerySchema), getLeaderboard);

router
  .route('/:id')
  .get(protect, validate(submissionIdParamsSchema), getSubmissionById)
  .put(protect, chiefOrAdmin, validate(submissionIdParamsSchema), validate(submissionUpdateSchema), updateSubmissionStatus);

module.exports = router;

