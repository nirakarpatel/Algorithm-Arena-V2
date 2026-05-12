const Challenge = require('./Challenge.model');
const { sendSuccess } = require('../../../utils/response');
const { logAudit } = require('../../../utils/audit');
const csv = require('csv-parser');
const { Readable } = require('stream');
const mammoth = require('mammoth');
const { fetchLeetCodeDetails } = require('../../../services/leetcode.service');

const getChallenges = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      difficulty,
      category,
      sortBy = 'createdAt',
      sortDir = 'desc',
    } = req.query;

    const filter = {};
    if (difficulty) filter.difficulty = difficulty;
    if (category) filter.category = category;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const sortOrder = sortDir === 'asc' ? 1 : -1;
    const sort = { [sortBy]: sortOrder };

    const skip = (page - 1) * limit;

    const [total, challenges] = await Promise.all([
      Challenge.countDocuments(filter),
      Challenge.find(filter).sort(sort).skip(skip).limit(limit),
    ]);

    return sendSuccess(res, {
      data: challenges,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (err) {
    return next(err);
  }
};

const getChallengeById = async (req, res, next) => {
  try {
    const challenge = await Challenge.findById(req.params.id);

    if (!challenge) {
      res.status(404);
      throw new Error('Challenge not found');
    }

    return sendSuccess(res, { data: challenge });
  } catch (err) {
    return next(err);
  }
};

const createChallenge = async (req, res, next) => {
  try {
    const challenge = await Challenge.create(req.body);

    await logAudit({
      action: 'challenge.create',
      actorId: req.user.id,
      targetType: 'challenge',
      targetId: challenge._id,
      metadata: {
        title: challenge.title,
        difficulty: challenge.difficulty,
        points: challenge.points,
      },
    });

    const { emitEvent } = require('../../../config/socket');
    emitEvent('new_challenge', {
      challengeId: challenge._id,
      title: challenge.title,
      difficulty: challenge.difficulty,
    });

    return sendSuccess(res, {
      statusCode: 201,
      data: challenge,
      message: 'Challenge created successfully',
    });
  } catch (err) {
    return next(err);
  }
};

const updateChallenge = async (req, res, next) => {
  try {
    const challenge = await Challenge.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!challenge) {
      res.status(404);
      throw new Error('Challenge not found');
    }

    await logAudit({
      action: 'challenge.update',
      actorId: req.user.id,
      targetType: 'challenge',
      targetId: challenge._id,
      metadata: { updatedFields: Object.keys(req.body) },
    });

    return sendSuccess(res, {
      data: challenge,
      message: 'Challenge updated successfully',
    });
  } catch (err) {
    return next(err);
  }
};

const deleteChallenge = async (req, res, next) => {
  try {
    const challenge = await Challenge.findById(req.params.id);

    if (!challenge) {
      res.status(404);
      throw new Error('Challenge not found');
    }

    await challenge.deleteOne();

    await logAudit({
      action: 'challenge.delete',
      actorId: req.user.id,
      targetType: 'challenge',
      targetId: challenge._id,
      metadata: {
        title: challenge.title,
      },
    });

    return sendSuccess(res, {
      data: null,
      message: 'Challenge removed successfully',
    });
  } catch (err) {
    return next(err);
  }
};

const importChallenges = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const { originalname, buffer } = req.file;
    const ext = originalname.split('.').pop().toLowerCase();
    let challengesData = [];

    if (ext === 'json') {
      try {
        challengesData = JSON.parse(buffer.toString('utf-8'));
      } catch (err) {
        return res.status(400).json({ success: false, message: 'Invalid JSON format' });
      }
    } else if (ext === 'csv') {
      challengesData = await new Promise((resolve, reject) => {
        const results = [];
        const stream = Readable.from(buffer.toString('utf-8'));
        stream.pipe(csv())
          .on('data', (data) => results.push(data))
          .on('end', () => resolve(results))
          .on('error', (err) => reject(err));
      });
    } else if (ext === 'docx') {
      const result = await mammoth.extractRawText({ buffer });
      const text = result.value;
      // Simple parsing: assuming each question is separated by a blank line or '---'
      // Example docx format parsing: very rudimentary
      const blocks = text.split(/\n\s*\n|---/);
      blocks.forEach(block => {
         const lines = block.trim().split('\n');
         if(lines.length >= 3) {
            challengesData.push({
               title: lines[0].replace(/Title:/i, '').trim() || 'Imported Challenge',
               difficulty: lines[1].replace(/Difficulty:/i, '').trim() || 'Medium',
               points: Number(lines[2].replace(/Points:/i, '').trim()) || 100,
               description: lines.slice(3).join('\n').trim()
            });
         }
      });
    } else {
      return res.status(400).json({ success: false, message: 'Unsupported file format' });
    }

    // Process and validate array
    if (!Array.isArray(challengesData) || challengesData.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid questions found in file' });
    }

    // Default formatting
    const formatted = challengesData.map(c => ({
      title: c.title || 'Untitled',
      description: c.description || 'No description provided.',
      difficulty: ['Easy', 'Medium', 'Hard'].includes(c.difficulty) ? c.difficulty : 'Medium',
      category: c.category || 'General',
      points: Number(c.points) || 100,
      testCases: c.testCases && Array.isArray(c.testCases) ? c.testCases : [],
    }));

    const created = await Challenge.insertMany(formatted);

    await logAudit({
      action: 'challenge.import',
      actorId: req.user.id,
      targetType: 'challenge',
      targetId: null,
      metadata: { count: created.length, format: ext },
    });

    return sendSuccess(res, {
      statusCode: 201,
      data: created,
      message: `Successfully imported ${created.length} challenges`,
    });
  } catch (err) {
    return next(err);
  }
};

const getLeetCodeDetails = async (req, res, next) => {
  try {
    const { slug } = req.query;
    if (!slug) {
      res.status(400);
      throw new Error('LeetCode slug is required');
    }

    const details = await fetchLeetCodeDetails(slug);
    return sendSuccess(res, { data: details });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  getChallenges,
  getChallengeById,
  createChallenge,
  updateChallenge,
  deleteChallenge,
  importChallenges,
  getLeetCodeDetails,
};

