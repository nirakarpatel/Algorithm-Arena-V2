const express = require('express');
const router = express.Router();
const { getQuestionSets, getQuestionSetById, createQuestionSet } = require('./questionSet.controller');
const { protect, admin } = require('../../../middleware/auth');

router.route('/')
  .get(protect, getQuestionSets)
  .post(protect, admin, createQuestionSet);

router.route('/:id')
  .get(protect, getQuestionSetById);

module.exports = router;
