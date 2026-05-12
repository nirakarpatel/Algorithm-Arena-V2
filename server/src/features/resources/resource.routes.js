const express = require('express');
const router = express.Router();
const { getResources, createResource, deleteResource } = require('./resource.controller');
const { protect, admin } = require('../../../middleware/auth');

router.route('/')
  .get(protect, getResources)
  .post(protect, admin, createResource);

router.route('/:id')
  .delete(protect, admin, deleteResource);

module.exports = router;
