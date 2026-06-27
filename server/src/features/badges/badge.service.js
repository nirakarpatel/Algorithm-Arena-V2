const mongoose = require('mongoose');
const Badge = require('./Badge.model');
const Submission = require('../submissions/Submission.model');
const User = require('../users/User.model');

/**
 * Computes all badges with isUnlocked status for a user.
 * Chief-awarded badges (awardedBadgeIds) are auto-unlocked.
 */
const getAllBadgesForUser = async (userId) => {
  const [badges, acceptedSubmissions, allSubmissions, userObj] = await Promise.all([
    Badge.find().sort({ rarity: 1, name: 1 }),
    Submission.find({ userId, status: 'Accepted' }).populate('challengeId'),
    Submission.find({ userId }).sort({ submittedAt: 1 }),
    User.findById(userId).select('createdAt awardedBadgeIds')
  ]);

  if (!userObj) return [];

  // Awarded badge IDs set (chief-granted)
  const awardedIds = new Set((userObj.awardedBadgeIds || []).map(id => id.toString()));

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
      if (sub.status === 'Rejected') challengeAttempts[chId].rejectedCountBeforeAccept++;
      if (sub.status === 'Accepted') challengeAttempts[chId].hasAccepted = true;
    }
    if (!firstSubmissions[chId]) firstSubmissions[chId] = sub.status;
  });

  const flawlessCount = Object.values(firstSubmissions).filter(s => s === 'Accepted').length;
  const maxRejectedBeforeAccept = Math.max(0, ...Object.values(challengeAttempts).filter(c => c.hasAccepted).map(c => c.rejectedCountBeforeAccept));
  const hasFirstReject = allSubmissions.some(s => s.status === 'Rejected');

  // Difficulty Breakdown
  const diffCount = { Easy: 0, Medium: 0, Hard: 0 };
  const languageCount = {};
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

  // Streak & Heatmap
  const heatmapAggregation = await Submission.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId), status: 'Accepted' } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$submittedAt' } }, count: { $sum: 1 } } },
  ]);
  const heatmapMap = {};
  heatmapAggregation.forEach(item => { heatmapMap[item._id] = item.count; });

  let maxStreak = 0, tempStreak = 0;
  const joinDate = userObj.createdAt || new Date();
  const startUTC = Date.UTC(joinDate.getUTCFullYear(), joinDate.getUTCMonth(), joinDate.getUTCDate());
  const todayStr = new Date().toISOString().split('T')[0];

  const heatmapData = [];
  let totalWeekendSolves = 0, maxSolvesInOneDay = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(startUTC + i * 86400000);
    const dateStr = d.toISOString().split('T')[0];
    const count = dateStr > todayStr ? 0 : (heatmapMap[dateStr] || 0);
    heatmapData.push({ date: dateStr, count, isWeekend: d.getUTCDay() === 0 || d.getUTCDay() === 6 });
  }
  heatmapData.forEach(day => {
    if (day.count > 0) {
      tempStreak++;
      if (tempStreak > maxStreak) maxStreak = tempStreak;
      if (day.isWeekend) totalWeekendSolves += day.count;
    } else { tempStreak = 0; }
    if (day.count > maxSolvesInOneDay) maxSolvesInOneDay = day.count;
  });

  const sortedAccepted = [...acceptedSubmissions].sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt));

  const nightOwlSubmission = sortedAccepted.find(s => { const h = new Date(s.submittedAt).getHours(); return h >= 0 && h < 4; });
  const earlyBirdSubmission = sortedAccepted.find(s => { const h = new Date(s.submittedAt).getHours(); return h >= 5 && h < 8; });
  const dawnCoderSubmission = sortedAccepted.find(s => { const h = new Date(s.submittedAt).getHours(); return h >= 4 && h < 5; });

  let speedsterUnlocked = false;
  for (let i = 1; i < sortedAccepted.length; i++) {
    const diffMins = (new Date(sortedAccepted[i].submittedAt) - new Date(sortedAccepted[i - 1].submittedAt)) / 60000;
    if (diffMins <= 10) { speedsterUnlocked = true; break; }
  }

  const hasReviewee = allSubmissions.some(s => s.feedback && s.feedback.trim() !== '');
  const perfectionistUnlocked = totalUniqueAccepted >= 10 && allSubmissions.every(s => s.status === 'Accepted');

  // ============================================================
  // UNLOCK MAP — 35+ badges
  // ============================================================
  const unlockedMap = {
    // Milestones
    'First Blood':        totalUniqueAccepted >= 1,
    'Code Rookie':        totalUniqueAccepted >= 5,
    'Code Novice':        totalUniqueAccepted >= 10,
    'Challenger':         totalUniqueAccepted >= 25,
    'Code Adept':         totalUniqueAccepted >= 50,
    'Algorithm Master':   totalUniqueAccepted >= 100,
    'Code Sensei':        totalUniqueAccepted >= 150,
    'Ascended':           totalUniqueAccepted >= 250,
    'The Legend':         totalUniqueAccepted >= 500,

    // Difficulty Mastery
    'Easy Peasy':         diffCount.Easy >= 10,
    'Warmup Complete':    diffCount.Easy >= 25,
    'Stepping Up':        diffCount.Medium >= 10,
    'Midweight Champ':    diffCount.Medium >= 25,
    'Grandmaster':        diffCount.Hard >= 1,
    'Abyss Walker':       diffCount.Hard >= 10,
    'Elite Solver':       diffCount.Hard >= 25,

    // Streaks & Consistency
    'Solo Sprint':        maxStreak >= 1,
    'Habit Builder':      maxStreak >= 3,
    'Streak Warrior':     maxStreak >= 5,
    'Consistent Coder':   maxStreak >= 7,
    'Unstoppable':        maxStreak >= 14,
    'Lunar Cycle':        maxStreak >= 30,
    'Night Owl':          !!nightOwlSubmission,
    'Early Bird':         !!earlyBirdSubmission,
    'Dawn Coder':         !!dawnCoderSubmission,
    'Weekend Warrior':    totalWeekendSolves >= 5,

    // Precision & Accuracy
    'Trial & Error':      hasFirstReject,
    'Flawless':           flawlessCount >= 1,
    'Resilient':          maxRejectedBeforeAccept >= 5,
    'Sharpshooter':       flawlessCount >= 10,
    'Never Surrender':    maxRejectedBeforeAccept >= 10,
    'Comeback King':      maxRejectedBeforeAccept >= 3,
    'Eagle Eye':          flawlessCount >= 50,

    // Language Diversity
    'Polyglot':           polyglotCount >= 3,
    'JS Ninja':           (languageCount['javascript'] || languageCount['js'] || 0) >= 10,
    'Pythonista':         (languageCount['python'] || languageCount['py'] || 0) >= 10,
    'Java Juggernaut':    (languageCount['java'] || 0) >= 10,
    'C/C++ Hacker':       (languageCount['cpp'] || languageCount['c'] || languageCount['c++'] || 0) >= 10,
    'Polyglot Pro':       polyglotCount >= 5,

    // Special
    'Reviewee':           hasReviewee,
    'Perfectionist':      perfectionistUnlocked,
    'Speedster':          speedsterUnlocked,
    'Marathon':           maxSolvesInOneDay >= 5,
    'Swift Fingers':      maxSolvesInOneDay >= 10,
  };

  // ============================================================
  // BADGE METADATA — category, progress, threshold, earnDifficulty
  // ============================================================
  const badgeMetadata = {
    // Milestones
    'First Blood':        { category: 'Milestones', progress: Math.min(totalUniqueAccepted, 1),   threshold: 1,   earnDifficulty: 'Easy' },
    'Code Rookie':        { category: 'Milestones', progress: Math.min(totalUniqueAccepted, 5),   threshold: 5,   earnDifficulty: 'Easy' },
    'Code Novice':        { category: 'Milestones', progress: Math.min(totalUniqueAccepted, 10),  threshold: 10,  earnDifficulty: 'Easy' },
    'Challenger':         { category: 'Milestones', progress: Math.min(totalUniqueAccepted, 25),  threshold: 25,  earnDifficulty: 'Medium' },
    'Code Adept':         { category: 'Milestones', progress: Math.min(totalUniqueAccepted, 50),  threshold: 50,  earnDifficulty: 'Medium' },
    'Algorithm Master':   { category: 'Milestones', progress: Math.min(totalUniqueAccepted, 100), threshold: 100, earnDifficulty: 'Hard' },
    'Code Sensei':        { category: 'Milestones', progress: Math.min(totalUniqueAccepted, 150), threshold: 150, earnDifficulty: 'Hard' },
    'Ascended':           { category: 'Milestones', progress: Math.min(totalUniqueAccepted, 250), threshold: 250, earnDifficulty: 'Elite' },
    'The Legend':         { category: 'Milestones', progress: Math.min(totalUniqueAccepted, 500), threshold: 500, earnDifficulty: 'Elite' },

    // Difficulty Mastery
    'Easy Peasy':         { category: 'Difficulty', progress: Math.min(diffCount.Easy, 10),    threshold: 10,  earnDifficulty: 'Easy' },
    'Warmup Complete':    { category: 'Difficulty', progress: Math.min(diffCount.Easy, 25),    threshold: 25,  earnDifficulty: 'Medium' },
    'Stepping Up':        { category: 'Difficulty', progress: Math.min(diffCount.Medium, 10),  threshold: 10,  earnDifficulty: 'Medium' },
    'Midweight Champ':    { category: 'Difficulty', progress: Math.min(diffCount.Medium, 25),  threshold: 25,  earnDifficulty: 'Hard' },
    'Grandmaster':        { category: 'Difficulty', progress: Math.min(diffCount.Hard, 1),     threshold: 1,   earnDifficulty: 'Hard' },
    'Abyss Walker':       { category: 'Difficulty', progress: Math.min(diffCount.Hard, 10),    threshold: 10,  earnDifficulty: 'Elite' },
    'Elite Solver':       { category: 'Difficulty', progress: Math.min(diffCount.Hard, 25),    threshold: 25,  earnDifficulty: 'Elite' },

    // Streaks
    'Solo Sprint':        { category: 'Streaks', progress: Math.min(maxStreak, 1),             threshold: 1,   earnDifficulty: 'Easy' },
    'Habit Builder':      { category: 'Streaks', progress: Math.min(maxStreak, 3),             threshold: 3,   earnDifficulty: 'Easy' },
    'Streak Warrior':     { category: 'Streaks', progress: Math.min(maxStreak, 5),             threshold: 5,   earnDifficulty: 'Medium' },
    'Consistent Coder':   { category: 'Streaks', progress: Math.min(maxStreak, 7),             threshold: 7,   earnDifficulty: 'Medium' },
    'Unstoppable':        { category: 'Streaks', progress: Math.min(maxStreak, 14),            threshold: 14,  earnDifficulty: 'Hard' },
    'Lunar Cycle':        { category: 'Streaks', progress: Math.min(maxStreak, 30),            threshold: 30,  earnDifficulty: 'Elite' },
    'Night Owl':          { category: 'Streaks', progress: nightOwlSubmission ? 1 : 0,         threshold: 1,   earnDifficulty: 'Easy' },
    'Early Bird':         { category: 'Streaks', progress: earlyBirdSubmission ? 1 : 0,        threshold: 1,   earnDifficulty: 'Easy' },
    'Dawn Coder':         { category: 'Streaks', progress: dawnCoderSubmission ? 1 : 0,        threshold: 1,   earnDifficulty: 'Medium' },
    'Weekend Warrior':    { category: 'Streaks', progress: Math.min(totalWeekendSolves, 5),    threshold: 5,   earnDifficulty: 'Medium' },

    // Precision
    'Trial & Error':      { category: 'Precision', progress: hasFirstReject ? 1 : 0,                  threshold: 1,   earnDifficulty: 'Easy' },
    'Flawless':           { category: 'Precision', progress: Math.min(flawlessCount, 1),               threshold: 1,   earnDifficulty: 'Easy' },
    'Resilient':          { category: 'Precision', progress: Math.min(maxRejectedBeforeAccept, 5),     threshold: 5,   earnDifficulty: 'Medium' },
    'Sharpshooter':       { category: 'Precision', progress: Math.min(flawlessCount, 10),              threshold: 10,  earnDifficulty: 'Hard' },
    'Never Surrender':    { category: 'Precision', progress: Math.min(maxRejectedBeforeAccept, 10),    threshold: 10,  earnDifficulty: 'Hard' },
    'Comeback King':      { category: 'Precision', progress: Math.min(maxRejectedBeforeAccept, 3),     threshold: 3,   earnDifficulty: 'Medium' },
    'Eagle Eye':          { category: 'Precision', progress: Math.min(flawlessCount, 50),              threshold: 50,  earnDifficulty: 'Elite' },

    // Languages
    'Polyglot':           { category: 'Languages', progress: Math.min(polyglotCount, 3),                                                              threshold: 3,   earnDifficulty: 'Medium' },
    'JS Ninja':           { category: 'Languages', progress: Math.min((languageCount['javascript'] || languageCount['js'] || 0), 10),                 threshold: 10,  earnDifficulty: 'Medium' },
    'Pythonista':         { category: 'Languages', progress: Math.min((languageCount['python'] || languageCount['py'] || 0), 10),                     threshold: 10,  earnDifficulty: 'Medium' },
    'Java Juggernaut':    { category: 'Languages', progress: Math.min((languageCount['java'] || 0), 10),                                              threshold: 10,  earnDifficulty: 'Medium' },
    'C/C++ Hacker':       { category: 'Languages', progress: Math.min((languageCount['cpp'] || languageCount['c'] || languageCount['c++'] || 0), 10), threshold: 10,  earnDifficulty: 'Medium' },
    'Polyglot Pro':       { category: 'Languages', progress: Math.min(polyglotCount, 5),                                                              threshold: 5,   earnDifficulty: 'Hard' },

    // Special
    'Reviewee':           { category: 'Special', progress: hasReviewee ? 1 : 0,            threshold: 1,   earnDifficulty: 'Easy' },
    'Perfectionist':      { category: 'Special', progress: perfectionistUnlocked ? 1 : 0,  threshold: 1,   earnDifficulty: 'Elite' },
    'Speedster':          { category: 'Special', progress: speedsterUnlocked ? 1 : 0,      threshold: 1,   earnDifficulty: 'Hard' },
    'Marathon':           { category: 'Special', progress: Math.min(maxSolvesInOneDay, 5), threshold: 5,   earnDifficulty: 'Hard' },
    'Swift Fingers':      { category: 'Special', progress: Math.min(maxSolvesInOneDay, 10),threshold: 10,  earnDifficulty: 'Hard' },
  };

  return badges.map(badge => {
    const badgeJson = badge.toJSON();
    // Chief badges unlock via awardedBadgeIds
    if (badge.isChiefBadge) {
      badgeJson.isUnlocked = awardedIds.has(badge._id.toString());
      badgeJson.category = "Chief's Choice";
      badgeJson.progress = badgeJson.isUnlocked ? 1 : 0;
      badgeJson.threshold = 1;
      badgeJson.earnDifficulty = badge.earnDifficulty || 'Easy';
      return badgeJson;
    }

    const isUnlocked = !!unlockedMap[badge.name];
    const meta = badgeMetadata[badge.name] || { category: 'Special', progress: 0, threshold: 1, earnDifficulty: 'Medium' };
    badgeJson.isUnlocked = isUnlocked;
    badgeJson.category = meta.category;
    badgeJson.progress = meta.progress;
    badgeJson.threshold = meta.threshold;
    badgeJson.earnDifficulty = badge.earnDifficulty || meta.earnDifficulty;
    return badgeJson;
  });
};

module.exports = { getAllBadgesForUser };
