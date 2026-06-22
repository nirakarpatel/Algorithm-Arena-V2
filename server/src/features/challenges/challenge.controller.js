const Challenge = require('./Challenge.model');
const QuestionSet = require('./QuestionSet.model');
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
      setId,
      sortBy = 'createdAt',
      sortDir = 'desc',
    } = req.query;

    const filter = {};
    const andConditions = [];

    if (setId) filter.questionSetId = setId;
    if (difficulty) filter.difficulty = difficulty;
    if (category) {
      andConditions.push({
        $or: [
          { category: { $regex: category, $options: 'i' } },
          { tags: { $in: [new RegExp(category, 'i')] } }
        ]
      });
    }
    if (search) {
      andConditions.push({
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { tags: { $in: [new RegExp(search, 'i')] } },
          { category: { $regex: search, $options: 'i' } }
        ]
      });
    }

    if (andConditions.length > 0) {
      filter.$and = andConditions;
    }

    const sortOrder = sortDir === 'asc' ? 1 : -1;
    const sort = sortBy === 'difficulty' ? { createdAt: -1 } : { [sortBy]: sortOrder };

    const skip = (page - 1) * limit;

    let [total, challenges] = await Promise.all([
      Challenge.countDocuments(filter),
      Challenge.find(filter).populate('questionSetId').sort(sort),
    ]);

    // Handle custom difficulty sorting: Hard -> Medium -> Easy
    if (sortBy === 'difficulty') {
      const diffOrder = { 'Hard': 1, 'Medium': 2, 'Easy': 3 };
      challenges.sort((a, b) => {
        const orderA = diffOrder[a.difficulty] || 99;
        const orderB = diffOrder[b.difficulty] || 99;
        if (orderA !== orderB) {
          return (orderA - orderB) * sortOrder;
        }
        // Fallback to createdAt if difficulties are same
        return (new Date(b.createdAt) - new Date(a.createdAt));
      });
    }

    // Apply pagination post-sorting (necessary if sorted in memory)
    total = challenges.length;
    challenges = challenges.slice(skip, skip + Number(limit));

    // Auto-create Challenge documents for question sets that don't have them yet
    if (setId && total === 0 && !search && !difficulty && !category) {
      const questionSet = await QuestionSet.findById(setId);
      if (questionSet && questionSet.questions && questionSet.questions.length > 0) {
        const challengesToInsert = questionSet.questions.map(q => ({
          title: q.title,
          description: q.description || '',
          difficulty: q.difficulty || 'Easy',
          points: q.points || 100,
          category: q.category || 'Logic',
          tags: q.tags || [],
          codeSnippets: q.codeSnippets || [],
          functionName: q.functionName || '',
          testCases: q.testCases || [],
          questionSetId: questionSet._id,
        }));
        challenges = await Challenge.insertMany(challengesToInsert);
        total = challenges.length;
      }
    }

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

    // Strip HTML tags from all imported string fields to prevent stored XSS
    const stripHtml = (str) => (str ? String(str).replace(/<[^>]*>/g, '').trim() : '');

    // Default formatting
    const formatted = challengesData.map(c => ({
      title: stripHtml(c.title) || 'Untitled',
      description: stripHtml(c.description) || 'No description provided.',
      difficulty: ['Easy', 'Medium', 'Hard'].includes(c.difficulty) ? c.difficulty : 'Medium',
      category: stripHtml(c.category) || 'General',
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

