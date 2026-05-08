const express = require("express");
const router = express.Router();

const {
  getChallenges,
  getChallengeById,
  createChallenge,
  updateChallenge,
  deleteChallenge,
  getLeetCodeDetails,
} = require("../controllers/challengeController");

const { protect, admin } = require("../middleware/auth");
const { validate } = require("../middleware/validate");
const {
  challengeIdParamsSchema,
  challengeCreateSchema,
  challengeUpdateSchema,
  challengeQuerySchema,
  leetcodeQuerySchema,
} = require("../validators/challengeSchemas");
router.get("/fetch-leetcode-details", getLeetCodeDetails);
router
  .route("/")
  .get(validate(challengeQuerySchema), getChallenges)
  .post(protect, admin, validate(challengeCreateSchema), createChallenge);

router
  .route("/:id")
  .get(validate(challengeIdParamsSchema), getChallengeById)
  .put(
    protect,
    admin,
    validate(challengeIdParamsSchema),
    validate(challengeUpdateSchema),
    updateChallenge,
  )
  .delete(protect, admin, validate(challengeIdParamsSchema), deleteChallenge);

module.exports = router;
