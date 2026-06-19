const mongoose = require('mongoose');
const Badge = require('./Badge.model');
const Submission = require('../submissions/Submission.model');
const User = require('../users/User.model');

/**
 * Computes all badges with isUnlocked status for a user.
 * @param {string|mongoose.Types.ObjectId} userId
 * @returns {Promise<Array>} Badge documents with isUnlocked flag
 */
const getAllBadgesForUser = async (userId) => {
  const [badges, acceptedSubmissions, allSubmissions, userObj] = await Promise.all([
    Badge.find().sort('rarity'),
    Submission.find({ userId, status: 'Accepted' }).populate('challengeId'),
    Submission.find({ userId }).sort({ submittedAt: 1 }),
    User.findById(userId).select('createdAt')
  ]);

  if (!userObj) return [];

  // 1. Flawless badge check
  const firstSubmissions = {};
  allSubmissions.forEach(sub => {
    if (!firstSubmissions[sub.challengeId]) {
      firstSubmissions[sub.challengeId] = sub.status;
    }
  });
  const hasFlawless = Object.values(firstSubmissions).some(status => status === 'Accepted');

  // 2. Streak calculation
  const heatmapAggregation = await Submission.aggregate([
    { $match: { userId, status: 'Accepted' } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$submittedAt' } },
        count: { $sum: 1 },
      },
    },
  ]);
  const heatmapMap = {};
  heatmapAggregation.forEach((item) => { heatmapMap[item._id] = item.count; });

  let maxStreak = 0;
  let tempStreak = 0;
  const joinDate = userObj.createdAt || new Date();
  const startUTC = Date.UTC(joinDate.getUTCFullYear(), joinDate.getUTCMonth(), joinDate.getUTCDate());
  const todayUTC = new Date();
  const todayStr = todayUTC.toISOString().split('T')[0];

  const heatmapData = [];
  for (let i = 0; i < 365; i++) {
    const d = new Date(startUTC + (i * 24 * 60 * 60 * 1000));
    const dateStr = d.toISOString().split('T')[0];
    heatmapData.push({
      date: dateStr,
      count: dateStr > todayStr ? 0 : (heatmapMap[dateStr] || 0)
    });
  }
  heatmapData.forEach(day => {
    if (day.count > 0) {
      tempStreak++;
      if (tempStreak > maxStreak) maxStreak = tempStreak;
    } else {
      tempStreak = 0;
    }
  });

  const sortedAccepted = [...acceptedSubmissions].sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt));

  const flawlessSubmission = allSubmissions.find(s => firstSubmissions[s.challengeId] === 'Accepted' && s.status === 'Accepted');
  const nightOwlSubmission = sortedAccepted.find(s => {
    const hrs = new Date(s.submittedAt).getHours();
    return hrs >= 0 && hrs < 4;
  });
  const grandmasterSubmission = sortedAccepted.find(s => s.challengeId?.difficulty === 'Hard');

  const unlockedDates = {
    'First Blood': sortedAccepted[0]?.submittedAt || null,
    'Night Owl': nightOwlSubmission?.submittedAt || null,
    'Flawless': flawlessSubmission?.submittedAt || null,
    'Streak Warrior': maxStreak >= 5 ? (sortedAccepted[sortedAccepted.length - 1]?.submittedAt || new Date()) : null,
    'Grandmaster': grandmasterSubmission?.submittedAt || null,
    'Algorithm Master': sortedAccepted[9]?.submittedAt || null
  };

  const unlockedMap = {
    'First Blood': acceptedSubmissions.length > 0,
    'Night Owl': !!nightOwlSubmission,
    'Flawless': hasFlawless,
    'Streak Warrior': maxStreak >= 5,
    'Grandmaster': !!grandmasterSubmission,
    'Algorithm Master': acceptedSubmissions.length >= 10
  };

  return badges.map(badge => {
    const badgeJson = badge.toJSON();
    const isUnlocked = !!unlockedMap[badge.name];
    badgeJson.isUnlocked = isUnlocked;
    badgeJson.unlockedAt = isUnlocked ? (unlockedDates[badge.name] || new Date()) : null;
    return badgeJson;
  });
};

module.exports = {
  getAllBadgesForUser
};
