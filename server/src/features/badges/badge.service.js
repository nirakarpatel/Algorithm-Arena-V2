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

  // Group submissions by challenge
  const challengeAttempts = {};
  const firstSubmissions = {};
  allSubmissions.forEach(sub => {
    const chId = sub.challengeId?.toString();
    if (!chId) return;
    
    if (!challengeAttempts[chId]) {
      challengeAttempts[chId] = { count: 0, rejectedCountBeforeAccept: 0, hasAccepted: false };
    }
    
    if (!challengeAttempts[chId].hasAccepted) {
      challengeAttempts[chId].count++;
      if (sub.status === 'Rejected') {
        challengeAttempts[chId].rejectedCountBeforeAccept++;
      }
      if (sub.status === 'Accepted') {
        challengeAttempts[chId].hasAccepted = true;
      }
    }

    if (!firstSubmissions[chId]) {
      firstSubmissions[chId] = sub.status;
    }
  });

  const flawlessCount = Object.values(firstSubmissions).filter(status => status === 'Accepted').length;
  const maxRejectedBeforeAccept = Math.max(0, ...Object.values(challengeAttempts).filter(c => c.hasAccepted).map(c => c.rejectedCountBeforeAccept));
  const hasFirstReject = allSubmissions.some(s => s.status === 'Rejected');
  
  // Difficulty Breakdown
  const diffCount = { Easy: 0, Medium: 0, Hard: 0 };
  const languageCount = {};
  
  // To count unique accepted challenges
  const uniqueAcceptedChIds = new Set();

  acceptedSubmissions.forEach(sub => {
    const chId = sub.challengeId?._id?.toString();
    if (!chId || uniqueAcceptedChIds.has(chId)) return;
    uniqueAcceptedChIds.add(chId);
    
    const diff = sub.challengeId?.difficulty;
    if (diff) diffCount[diff] = (diffCount[diff] || 0) + 1;
    
    const lang = sub.language?.toLowerCase() || 'javascript';
    languageCount[lang] = (languageCount[lang] || 0) + 1;
  });

  const totalUniqueAccepted = uniqueAcceptedChIds.size;
  const polyglotCount = Object.keys(languageCount).length;

  // Streak & Heatmap calculation
  const heatmapAggregation = await Submission.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId), status: 'Accepted' } },
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
      count: dateStr > todayStr ? 0 : (heatmapMap[dateStr] || 0),
      isWeekend: d.getUTCDay() === 0 || d.getUTCDay() === 6
    });
  }
  
  let totalWeekendSolves = 0;
  let maxSolvesInOneDay = 0;

  heatmapData.forEach(day => {
    if (day.count > 0) {
      tempStreak++;
      if (tempStreak > maxStreak) maxStreak = tempStreak;
      if (day.isWeekend) totalWeekendSolves += day.count;
    } else {
      tempStreak = 0;
    }
    if (day.count > maxSolvesInOneDay) maxSolvesInOneDay = day.count;
  });

  const sortedAccepted = [...acceptedSubmissions].sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt));

  // Time-based
  const nightOwlSubmission = sortedAccepted.find(s => {
    const hrs = new Date(s.submittedAt).getHours();
    return hrs >= 0 && hrs < 4;
  });
  const earlyBirdSubmission = sortedAccepted.find(s => {
    const hrs = new Date(s.submittedAt).getHours();
    return hrs >= 5 && hrs < 8;
  });

  // Speedster check
  let speedsterUnlocked = false;
  for (let i = 1; i < sortedAccepted.length; i++) {
    const diffMins = (new Date(sortedAccepted[i].submittedAt) - new Date(sortedAccepted[i-1].submittedAt)) / (1000 * 60);
    if (diffMins <= 10) {
      speedsterUnlocked = true;
      break;
    }
  }

  // Receive Feedback
  const hasReviewee = allSubmissions.some(s => s.feedback && s.feedback.trim() !== '');

  // Perfectionist (100% acceptance rate with at least 10 accepted)
  const perfectionistUnlocked = totalUniqueAccepted >= 10 && allSubmissions.every(s => s.status === 'Accepted');

  const unlockedMap = {
    // Milestones
    'First Blood': totalUniqueAccepted >= 1,
    'Code Novice': totalUniqueAccepted >= 10,
    'Code Adept': totalUniqueAccepted >= 50,
    'Algorithm Master': totalUniqueAccepted >= 100,
    'Code Sensei': totalUniqueAccepted >= 150,
    'Ascended': totalUniqueAccepted >= 250,

    // Difficulty Mastery
    'Easy Peasy': diffCount.Easy >= 10,
    'Warmup Complete': diffCount.Easy >= 25,
    'Stepping Up': diffCount.Medium >= 10,
    'Midweight Champ': diffCount.Medium >= 25,
    'Grandmaster': diffCount.Hard >= 1,
    'Abyss Walker': diffCount.Hard >= 10,

    // Streak & Consistency
    'Habit Builder': maxStreak >= 3,
    'Streak Warrior': maxStreak >= 5,
    'Unstoppable': maxStreak >= 14,
    'Lunar Cycle': maxStreak >= 30,
    'Weekend Warrior': totalWeekendSolves >= 5,
    'Night Owl': !!nightOwlSubmission,
    'Early Bird': !!earlyBirdSubmission,

    // Precision & Accuracy
    'Flawless': flawlessCount >= 1,
    'Sharpshooter': flawlessCount >= 10,
    'Eagle Eye': flawlessCount >= 50,
    'Resilient': maxRejectedBeforeAccept >= 5,
    'Never Surrender': maxRejectedBeforeAccept >= 10,
    'Trial & Error': hasFirstReject,

    // Language Diversity
    'Polyglot': polyglotCount >= 3,
    'JS Ninja': (languageCount['javascript'] || languageCount['js']) >= 10,
    'Pythonista': (languageCount['python'] || languageCount['py']) >= 10,
    'Java Juggernaut': languageCount['java'] >= 10,
    'C/C++ Hacker': (languageCount['cpp'] || languageCount['c'] || languageCount['c++']) >= 10,

    // Miscellaneous
    'Reviewee': hasReviewee,
    'Perfectionist': perfectionistUnlocked,
    'Speedster': speedsterUnlocked,
    'Marathon': maxSolvesInOneDay >= 5
  };

  return badges.map(badge => {
    const badgeJson = badge.toJSON();
    const isUnlocked = !!unlockedMap[badge.name];
    badgeJson.isUnlocked = isUnlocked;
    // We can just use current date for newly unlocked stuff since we don't store unlock dates persistently yet
    badgeJson.unlockedAt = isUnlocked ? new Date() : null; 
    return badgeJson;
  });
};

module.exports = {
  getAllBadgesForUser
};
