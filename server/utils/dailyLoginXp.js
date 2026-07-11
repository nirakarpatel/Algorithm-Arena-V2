const XpLog = require('../src/features/users/XpLog.model');

/**
 * Award 50 XP for the first login of the current UTC day (if the user has
 * completed onboarding). Safe to call from any auth path — it is idempotent
 * because it checks XpLog before creating a new entry.
 *
 * @param {Object} user  Mongoose User document (or lean object with _id, points, usernameSet)
 * @returns {{ dailyXpAwarded: boolean, points: number }}
 */
const awardDailyLoginXp = async (user) => {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const existingDailyLog = await XpLog.exists({
    userId: user._id,
    reason: 'Daily Login',
    createdAt: { $gte: today },
  });

  if (existingDailyLog || !user.usernameSet) {
    return { dailyXpAwarded: false, points: user.points || 0 };
  }

  const points = (user.points || 0) + 50;
  await XpLog.create({
    userId: user._id,
    amount: 50,
    reason: 'Daily Login',
  });

  return { dailyXpAwarded: true, points };
};

module.exports = { awardDailyLoginXp };
