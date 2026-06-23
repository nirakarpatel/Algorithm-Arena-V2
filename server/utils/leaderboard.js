const Submission = require('../src/features/submissions/Submission.model');

/**
 * Computes the rank of a single user using a DB-level pipeline.
 * Uses $setWindowFields + $match so only one document is returned — no JS-level
 * array iteration over the full leaderboard.
 *
 * @param {mongoose.Types.ObjectId} userId
 * @returns {Promise<number|null>} 1-based rank, or null if no accepted submissions.
 */
const getUserRank = async (userId) => {
  // Optimized: compute rankings once, then return only the target user.
  // Assumes MongoDB 5.0+ for $setWindowFields.
  const result = await Submission.aggregate([
    // Only accepted submissions participate in the leaderboard
    { $match: { status: 'Accepted', userId } },
    {
      $lookup: {
        from: 'challenges',
        localField: 'challengeId',
        foreignField: '_id',
        as: 'challenge',
      },
    },
    { $unwind: '$challenge' },
    // Group only the current user to compute their points/solvedCount
    {
      $group: {
        _id: '$userId',
        challengePoints: { $sum: '$challenge.points' },
        solvedCount: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user',
      },
    },
    { $unwind: '$user' },
    {
      $addFields: {
        totalPoints: { $ifNull: ['$user.points', 0] },
      },
    },
    // Now compute the rank by comparing against everyone else with a single pass.
    // We do this by running the full aggregation in a $facet.
    {
      $facet: {
        self: [{ $limit: 1 }],
        all: [
          { $match: { status: 'Accepted' } },
          {
            $lookup: {
              from: 'challenges',
              localField: 'challengeId',
              foreignField: '_id',
              as: 'challenge',
            },
          },
          { $unwind: '$challenge' },
          {
            $group: {
              _id: '$userId',
              challengePoints: { $sum: '$challenge.points' },
              solvedCount: { $sum: 1 },
            },
          },
          {
            $lookup: {
              from: 'users',
              localField: '_id',
              foreignField: '_id',
              as: 'user',
            },
          },
          { $unwind: '$user' },
          {
            $addFields: {
              totalPoints: { $ifNull: ['$user.points', 0] },
            },
          },
          { $sort: { totalPoints: -1, solvedCount: -1 } },
          {
            $setWindowFields: {
              sortBy: { totalPoints: -1 },
              output: { rank: { $denseRank: {} } },
            },
          },
          { $project: { _id: 1, rank: 1, totalPoints: 1, solvedCount: 1 } },
        ],
      },
    },
    // Extract the self user stats
    {
      $project: {
        self: { $arrayElemAt: ['$self', 0] },
        all: 1,
      },
    },
    // Match the precomputed rank row for the exact userId
    { $unwind: '$all' },
    {
      $match: {
        $expr: { $eq: ['$all._id', '$self._id'] },
      },
    },
    { $project: { rank: '$all.rank' } },
  ]);

  return result.length ? result[0].rank : null;
};

module.exports = { getUserRank };
