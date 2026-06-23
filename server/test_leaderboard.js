const mongoose = require('mongoose');
require('dotenv').config({ path: '.env' });
const Submission = require('./src/features/submissions/Submission.model');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  try {
    const result = await Submission.aggregate([
      { $match: { status: 'Accepted' } },
      { $group: { _id: { userId: '$userId', challengeId: '$challengeId' } } },
      { $lookup: { from: 'challenges', localField: '_id.challengeId', foreignField: '_id', as: 'challenge' } },
      { $unwind: '$challenge' },
      { $group: { _id: '$_id.userId', solvedCount: { $sum: 1 }, challengePoints: { $sum: '$challenge.points' } } },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      { $addFields: { totalPoints: { $ifNull: ['$user.points', 0] } } },
      { $sort: { totalPoints: -1, solvedCount: -1 } },
      { $project: { _id: 1, username: '$user.username', solvedCount: 1, totalPoints: 1 } },
      { $setWindowFields: { sortBy: { totalPoints: -1 }, output: { rank: { $denseRank: {} } } } }
    ]);
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch(e) {
    console.error('Aggregation error:', e.message);
  }
  process.exit(0);
});
