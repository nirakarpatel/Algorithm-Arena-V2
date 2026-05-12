const QuestionSet = require('./QuestionSet.model');
const User = require('../users/User.model');
const { sendSuccess } = require('../../../utils/response');
const { logAudit } = require('../../../utils/audit');
const { sendEmail } = require('../../../utils/emailService');

const getQuestionSets = async (req, res, next) => {
  try {
    const sets = await QuestionSet.find().sort({ weekNumber: -1, createdAt: -1 });
    return sendSuccess(res, { data: sets });
  } catch (err) {
    return next(err);
  }
};

const getQuestionSetById = async (req, res, next) => {
  try {
    const set = await QuestionSet.findById(req.params.id);
    if (!set) {
      res.status(404);
      throw new Error('Question Set not found');
    }
    return sendSuccess(res, { data: set });
  } catch (err) {
    return next(err);
  }
};

const createQuestionSet = async (req, res, next) => {
  try {
    const set = await QuestionSet.create({ ...req.body, createdBy: req.user.id });

    await logAudit({
      action: 'questionset.create',
      actorId: req.user.id,
      targetType: 'questionset',
      targetId: set._id,
      metadata: { title: set.title, weekNumber: set.weekNumber }
    });

    // Email notification
    const users = await User.find({ role: 'user' }).select('email');
    if (users.length > 0) {
      const emailList = users.map(u => u.email).join(',');
      const htmlContent = `
        <h1>New Question Set Available!</h1>
        <p>A new question set <strong>${set.title}</strong> (Week ${set.weekNumber}) has been published.</p>
        <p>Target Level: ${set.targetLevel}</p>
        <p>Deadline: ${new Date(set.deadline).toLocaleDateString()}</p>
        <a href="https://algorithm-arena.com/missions">Go to Arena</a>
      `;
      sendEmail(emailList, `New Challenge Set: ${set.title}`, htmlContent);
    }

    return sendSuccess(res, {
      statusCode: 201,
      data: set,
      message: 'Question Set created successfully'
    });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  getQuestionSets,
  getQuestionSetById,
  createQuestionSet
};
