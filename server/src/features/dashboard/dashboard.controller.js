const mongoose = require('mongoose');
const Challenge = require('../challenges/Challenge.model');
const Submission = require('../submissions/Submission.model');
const User = require('../users/User.model');
const Clan = require('../clans/Clan.model');
const { sendSuccess } = require('../../../utils/response');
const { getUserRank } = require('../../../utils/leaderboard');
const { getAllBadgesForUser } = require('../badges/badge.service');

const heatmapCache = new Map();

const getCachedHeatmap = async (userId) => {
  const CACHE_TTL = process.env.NODE_ENV === 'test' ? 0 : 5 * 60 * 1000;
  const now = Date.now();
  const cacheKey = userId.toString();

  const cached = heatmapCache.get(cacheKey);
  if (cached && (now - cached.timestamp < CACHE_TTL)) {
    return cached.data;
  }

  const data = await Submission.aggregate([
    { $match: { userId, status: 'Accepted' } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$submittedAt' } },
        count: { $sum: 1 }
      }
    }
  ]);

  if (CACHE_TTL > 0) {
    if (heatmapCache.size > 5000) heatmapCache.clear();
    heatmapCache.set(cacheKey, { data, timestamp: now });
  }

  return data;
};

const getDashboardSummary = async (req, res, next) => {
  try {
    const [totalChallenges, pending, solvedDistinct] = await Promise.all([
      Challenge.countDocuments(),
      Submission.countDocuments({ userId: req.user.id, status: 'Pending' }),
      Submission.distinct('challengeId', { userId: req.user.id, status: 'Accepted' }),
    ]);

    // Rank is the most expensive call; keep parallel DB work minimal.
    const recentActivity = await Submission.find({ userId: req.user.id })
      .populate('challengeId', 'title difficulty points')
      .sort({ submittedAt: -1 })
      .limit(5);

    const rank = await getUserRank(new mongoose.Types.ObjectId(req.user.id));

    return sendSuccess(res, {
      data: {
        totalChallenges,
        solved: solvedDistinct.length,
        pending,
        rank,
        recentActivity,
      },
    });
  } catch (err) {
    return next(err);
  }
};

const getProfileStats = async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);

    // Separate counts for non-unique metrics
    const totalSubmissions = await Submission.countDocuments({ userId });
    const rejectedCount = await Submission.countDocuments({ userId, status: 'Rejected' });

    // Calculate unique challenge stats
    const [stats] = await Submission.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: '$challengeId',
          statuses: { $push: '$status' },
        }
      },
      {
        $lookup: {
          from: 'challenges',
          localField: '_id',
          foreignField: '_id',
          as: 'challenge',
        },
      },
      { $unwind: '$challenge' },
      {
        $project: {
          difficulty: '$challenge.difficulty',
          isAccepted: { $in: ['Accepted', '$statuses'] },
          isPending: { $in: ['Pending', '$statuses'] },
        }
      },
      {
        $group: {
          _id: null,
          acceptedCount: {
            $sum: { $cond: ['$isAccepted', 1, 0] },
          },
          pendingCount: {
            $sum: { $cond: ['$isPending', 1, 0] },
          },
          easySolved: {
            $sum: { $cond: [{ $and: ['$isAccepted', { $eq: ['$difficulty', 'Easy'] }] }, 1, 0] },
          },
          mediumSolved: {
            $sum: { $cond: [{ $and: ['$isAccepted', { $eq: ['$difficulty', 'Medium'] }] }, 1, 0] },
          },
          hardSolved: {
            $sum: { $cond: [{ $and: ['$isAccepted', { $eq: ['$difficulty', 'Hard'] }] }, 1, 0] },
          },
        }
      }
    ]);

    // Total counts for each difficulty (used for percentages)
    const difficultyTotals = await Challenge.aggregate([
      {
        $group: {
          _id: '$difficulty',
          count: { $sum: 1 },
        },
      },
    ]);

    const totalsMap = { Easy: 0, Medium: 0, Hard: 0 };
    difficultyTotals.forEach((d) => {
      totalsMap[d._id] = d.count;
    });

    // Rank is the expensive aggregation; compute after lightweight stats/heatmap pieces.
    const rank = await getUserRank(userId);

    const overallScore = stats?.acceptedCount
      ? ((stats.acceptedCount / (Object.values(totalsMap).reduce((a, b) => a + b, 0) || 1)) * 100).toFixed(1)
      : 0;

    // Calculate Heatmap Data
    const heatmapAggregation = await getCachedHeatmap(userId);

    const heatmapMap = {};
    heatmapAggregation.forEach(item => {
      heatmapMap[item._id] = item.count;
    });

    const user = await User.findById(req.user.id).select('createdAt points solvedProblems');
    const joinDate = user?.createdAt || new Date();
    
    // Normalize to UTC midnight for consistency with $dateToString
    const startUTC = Date.UTC(joinDate.getUTCFullYear(), joinDate.getUTCMonth(), joinDate.getUTCDate());
    const todayUTC = new Date();
    const todayStr = todayUTC.toISOString().split('T')[0];

    const heatmapData = [];
    for (let i = 0; i < 365; i++) {
      const d = new Date(startUTC + (i * 24 * 60 * 60 * 1000));
      const dateStr = d.toISOString().split('T')[0];
      if (dateStr > todayStr) {
        break;
      }
      
      heatmapData.push({
        date: dateStr,
        count: heatmapMap[dateStr] || 0
      });
    }

    // Calculate streaks
    let currentStreak = 0;
    let maxStreak = 0;
    let tempStreak = 0;
    
    heatmapData.forEach(day => {
       if (day.count > 0) {
           tempStreak++;
           if (tempStreak > maxStreak) maxStreak = tempStreak;
       } else {
           tempStreak = 0;
       }
    });

    for (let i = heatmapData.length - 1; i >= 0; i--) {
        if (heatmapData[i].count > 0) {
            currentStreak++;
        } else {
            if (i === heatmapData.length - 1) {
                continue;
            } else {
                break;
            }
        }
    }

    const recentSubmissions = await Submission.find({ userId: req.user.id })
      .populate('challengeId', 'title difficulty points')
      .sort({ submittedAt: -1 })
      .limit(10);

    // Get XP breakdown
    const XpLog = mongoose.models.XpLog || mongoose.model('XpLog');
    const [xpStats] = await XpLog.aggregate([
      { $match: { userId, reason: 'Daily Login' } },
      {
        $group: {
          _id: null,
          loginXp: { $sum: '$amount' },
          loginCount: { $sum: 1 }
        }
      }
    ]);
    const loginXp = xpStats?.loginXp || 0;
    const loginCount = xpStats?.loginCount || 0;
    const challengeXp = (user.points || 0) - loginXp;

    // Compute unlocked badges dynamically
    const unlockedBadges = await getAllBadgesForUser(userId);

    return sendSuccess(res, {
      data: {
        stats: {
          totalSubmissions: totalSubmissions || 0,
          acceptedCount: user.solvedProblems || 0,
          rejectedCount: rejectedCount || 0,
          pendingCount: stats?.pendingCount || 0,
          totalPoints: user.points || 0,
          easySolved: stats?.easySolved || 0,
          mediumSolved: stats?.mediumSolved || 0,
          hardSolved: stats?.hardSolved || 0,
          loginXp,
          loginCount,
          challengeXp,
        },
        difficultyBreakdown: {
          easy: { solved: stats?.easySolved || 0, total: totalsMap.Easy },
          medium: { solved: stats?.mediumSolved || 0, total: totalsMap.Medium },
          hard: { solved: stats?.hardSolved || 0, total: totalsMap.Hard },
        },
        overallScore,
        recentSubmissions,
        heatmapData,
        rank,
        streak: currentStreak,
        maxStreak,
        badges: unlockedBadges,
      },
    });
  } catch (err) {
    return next(err);
  }
};

const getUserProfile = async (req, res, next) => {
  try {
    let user;
    if (req.params.userId) {
      user = await User.findById(req.params.userId).populate('clan', 'name tag').populate('featuredBadge');
    } else if (req.params.username) {
      user = await User.findOne({ username: { $regex: new RegExp(`^${req.params.username}$`, 'i') } }).populate('clan', 'name tag').populate('featuredBadge');
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'Entity not found' });
    }

    const userId = user._id;

    // Calculate basic stats for this user
    const [stats] = await Submission.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: '$challengeId',
          statuses: { $push: '$status' },
        }
      },
      {
        $lookup: {
          from: 'challenges',
          localField: '_id',
          foreignField: '_id',
          as: 'challenge',
        },
      },
      { $unwind: '$challenge' },
      {
        $project: {
          difficulty: '$challenge.difficulty',
          isAccepted: { $in: ['Accepted', '$statuses'] },
          isPending: { $in: ['Pending', '$statuses'] },
        }
      },
      {
        $group: {
          _id: null,
          pendingCount: {
            $sum: { $cond: ['$isPending', 1, 0] },
          },
          easySolved: {
            $sum: { $cond: [{ $and: ['$isAccepted', { $eq: ['$difficulty', 'Easy'] }] }, 1, 0] },
          },
          mediumSolved: {
            $sum: { $cond: [{ $and: ['$isAccepted', { $eq: ['$difficulty', 'Medium'] }] }, 1, 0] },
          },
          hardSolved: {
            $sum: { $cond: [{ $and: ['$isAccepted', { $eq: ['$difficulty', 'Hard'] }] }, 1, 0] },
          },
        }
      }
    ]);

    // Get total counts for difficulty breakdown
    const difficultyTotals = await Challenge.aggregate([
      { $group: { _id: '$difficulty', count: { $sum: 1 } } },
    ]);
    const totalsMap = { Easy: 0, Medium: 0, Hard: 0 };
    difficultyTotals.forEach((d) => { totalsMap[d._id] = d.count; });

    // Calculate streak from heatmap
    const heatmapAggregation = await getCachedHeatmap(userId);
    const heatmapMap = {};
    heatmapAggregation.forEach((item) => { heatmapMap[item._id] = item.count; });

    let currentStreak = 0;
    let maxStreak = 0;
    let tempStreak = 0;

    const joinDate = user.createdAt || new Date();
    const startUTC = Date.UTC(joinDate.getUTCFullYear(), joinDate.getUTCMonth(), joinDate.getUTCDate());
    const todayUTC = new Date();
    const todayStr = todayUTC.toISOString().split('T')[0];

    const heatmapData = [];
    for (let i = 0; i < 365; i++) {
      const d = new Date(startUTC + (i * 24 * 60 * 60 * 1000));
      const dateStr = d.toISOString().split('T')[0];
      if (dateStr > todayStr) {
        break;
      }
      
      heatmapData.push({
        date: dateStr,
        count: heatmapMap[dateStr] || 0
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

    for (let i = heatmapData.length - 1; i >= 0; i--) {
        if (heatmapData[i].count > 0) {
            currentStreak++;
        } else {
            if (i === heatmapData.length - 1) {
                continue;
            } else {
                break;
            }
        }
    }

    const recentSubmissions = await Submission.find({ userId })
      .populate('challengeId', 'title difficulty points')
      .sort({ submittedAt: -1 })
      .limit(10);

    // Get XP breakdown
    const XpLog = mongoose.models.XpLog || mongoose.model('XpLog');
    const [xpStats] = await XpLog.aggregate([
      { $match: { userId, reason: 'Daily Login' } },
      {
        $group: {
          _id: null,
          loginXp: { $sum: '$amount' },
          loginCount: { $sum: 1 }
        }
      }
    ]);
    const loginXp = xpStats?.loginXp || 0;
    const loginCount = xpStats?.loginCount || 0;
    const challengeXp = (user.points || 0) - loginXp;

    // Global rank using shared utility (DB-level, no full array in RAM)
    const rank = await getUserRank(userId);

    // Compute unlocked badges dynamically
    const unlockedBadges = await getAllBadgesForUser(userId);

    // Determine whether the requester is the owner or an admin
    const isOwner = req.user && req.user._id.toString() === user._id.toString();
    const isAdmin = req.user && ['admin', 'superAdmin', 'moderator'].includes(req.user.role);
    const canSeePrivate = isOwner || isAdmin;

    const publicData = {
      _id: user._id,
      username: user.username,
      role: user.role,
      customTitle: user.customTitle || null,
      clan: user.clan,
      profilePicture: user.profilePicture,
      bio: user.bio,
      location: user.location,
      github: user.github,
      twitter: user.twitter,
      linkedin: user.linkedin,
      website: user.website,
      points: user.points || 0,
      solvedProblems: user.solvedProblems || 0,
      acceptedCount: user.solvedProblems || 0,
      pendingCount: stats?.pendingCount || 0,
      totalPoints: user.points || 0,
      loginXp,
      loginCount,
      challengeXp,
      streak: currentStreak,
      rank,
      difficultyBreakdown: {
        easy: { solved: stats?.easySolved || 0, total: totalsMap.Easy },
        medium: { solved: stats?.mediumSolved || 0, total: totalsMap.Medium },
        hard: { solved: stats?.hardSolved || 0, total: totalsMap.Hard },
      },
      badges: unlockedBadges,
      createdAt: user.createdAt,
      heatmapData,
      maxStreak,
    };

    if (canSeePrivate) {
      publicData.regNo = user.regNo;
      publicData.branch = user.branch;
      publicData.year = user.year;
      publicData.section = user.section;
      publicData.recentSubmissions = recentSubmissions;
    }

    return sendSuccess(res, { data: publicData });
  } catch (err) {
    return next(err);
  }
};


const getAdminDashboardSummary = async (req, res, next) => {
  try {
    const totalMembers = await User.countDocuments();
    const activeClans = await Clan.countDocuments({ status: 'active' });
    
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const activeThisWeekResult = await Submission.aggregate([
      { $match: { submittedAt: { $gte: oneWeekAgo } } },
      { $group: { _id: "$userId" } },
      { $count: "activeUsers" }
    ]);
    const activeThisWeek = activeThisWeekResult[0]?.activeUsers || 0;
    
    const totalSubmissions = await Submission.countDocuments();
    
    const pendingAssignments = await User.countDocuments({ clan: null, role: 'user' });
    
    // Fetch all active clans and populate their members (we only need _id)
    const clans = await Clan.find({ status: 'active' }).populate('members', '_id');
    
    // Gather all member IDs across all active clans
    const memberIds = [];
    clans.forEach(c => {
      if (c.members) {
        c.members.forEach(m => {
          memberIds.push(m._id);
        });
      }
    });

    // Query weekly accepted submissions for those members to count unique challenge solves
    const weeklySolvedMap = {};
    if (memberIds.length > 0) {
      const weeklyStats = await Submission.aggregate([
        { 
          $match: { 
            userId: { $in: memberIds }, 
            status: 'Accepted', 
            submittedAt: { $gte: oneWeekAgo } 
          } 
        },
        {
          $group: {
            _id: { userId: '$userId', challengeId: '$challengeId' }
          }
        },
        {
          $group: {
            _id: '$_id.userId',
            weeklySolved: { $sum: 1 }
          }
        }
      ]);
      weeklyStats.forEach(stat => {
        weeklySolvedMap[stat._id.toString()] = stat.weeklySolved;
      });
    }

    const TARGET_PROBLEMS = 5;
    
    // Compute completion rate for each clan
    const clanCompletions = clans.map(c => {
      const members = c.members || [];
      const memberCount = members.length;
      if (memberCount === 0) {
        return {
          clan: c,
          completion: 0
        };
      }
      const totalSolved = members.reduce((sum, m) => {
        const solved = weeklySolvedMap[m._id.toString()] || 0;
        return sum + Math.min(solved, TARGET_PROBLEMS);
      }, 0);
      const totalPossible = memberCount * TARGET_PROBLEMS;
      const completion = Math.round((totalSolved / totalPossible) * 100);
      return {
        clan: c,
        completion
      };
    });

    // Calculate avgCompletion across all active clans
    const avgCompletion = clanCompletions.length > 0
      ? Math.round(clanCompletions.reduce((sum, c) => sum + c.completion, 0) / clanCompletions.length)
      : 0;

    // Sort by completion rate descending, sub-sort by name/tag, and limit to 4 for performance display
    const sortedClans = [...clanCompletions].sort((a, b) => {
      if (b.completion !== a.completion) {
        return b.completion - a.completion;
      }
      return a.clan.name.localeCompare(b.clan.name);
    });
    
    const topClans = sortedClans.slice(0, 4);

    const colors = [
      'from-purple-500 to-indigo-500',
      'from-blue-500 to-cyan-500',
      'from-green-500 to-emerald-500',
      'from-orange-500 to-red-500'
    ];

    const clanPerformance = topClans.map((c, i) => {
      return {
        name: c.clan.name,
        tag: c.clan.tag,
        completion: c.completion,
        color: colors[i % colors.length]
      };
    });

    return sendSuccess(res, {
      data: {
        totalMembers,
        activeClans,
        activeThisWeek,
        totalSubmissions,
        avgCompletion,
        pendingAssignments,
        clanPerformance
      }
    });
  } catch (err) {
    return next(err);
  }
};

const getPendingTasks = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const now = new Date();

    // 1. Get all published question sets that haven't expired
    const activeSets = await mongoose.model('QuestionSet').find({
      status: 'Published',
      deadline: { $gt: now }
    });

    const activeSetIds = activeSets.map(s => s._id);

    // 2. Get all challenges in these sets
    const challengesInSets = await Challenge.find({
      questionSetId: { $in: activeSetIds }
    });

    const challengeIds = challengesInSets.map(c => c._id);

    // 3. Get user's accepted submissions for these challenges
    const solvedSubmissions = await Submission.find({
      userId,
      challengeId: { $in: challengeIds },
      status: 'Accepted'
    }).distinct('challengeId');

    const solvedChallengeIds = solvedSubmissions.map(id => id.toString());

    // 4. Filter out solved challenges
    const pendingChallenges = challengesInSets.filter(c => 
      !solvedChallengeIds.includes(c._id.toString())
    );

    // 5. Map to the format the frontend expects
    // We'll also include rejected ones as high priority
    const rejectedSubmissions = await Submission.find({
      userId,
      challengeId: { $in: challengeIds },
      status: 'Rejected'
    }).distinct('challengeId');
    
    const rejectedIds = rejectedSubmissions.map(id => id.toString());

    const tasks = pendingChallenges.map(ch => {
      const parentSet = activeSets.find(s => s._id.toString() === ch.questionSetId?.toString());
      const isRejected = rejectedIds.includes(ch._id.toString());
      
      return {
        _id: ch._id,
        title: ch.title,
        difficulty: ch.difficulty,
        points: ch.points,
        category: ch.category,
        deadline: parentSet ? parentSet.deadline : null,
        isRejected,
        // Calculate priority: Hard or Rejected = High, Medium = Med, others = Low
        priority: (ch.difficulty === 'Hard' || isRejected) ? 'High' : (ch.difficulty === 'Medium' ? 'Med' : 'Low')
      };
    });

    // Sort by priority (High > Med > Low) and then by deadline
    const priorityMap = { 'High': 0, 'Med': 1, 'Low': 2 };
    tasks.sort((a, b) => {
      if (priorityMap[a.priority] !== priorityMap[b.priority]) {
        return priorityMap[a.priority] - priorityMap[b.priority];
      }
      return new Date(a.deadline) - new Date(b.deadline);
    });

    return sendSuccess(res, { data: tasks });
  } catch (err) {
    return next(err);
  }
};

const updateFeaturedBadge = async (req, res, next) => {
  try {
    const { badgeId } = req.body;
    if (!badgeId) {
      const user = await User.findByIdAndUpdate(req.user.id, { featuredBadge: null }, { new: true }).populate('featuredBadge');
      return sendSuccess(res, { data: user });
    }
    const unlockedBadges = await getAllBadgesForUser(req.user.id);
    const hasBadge = unlockedBadges.some(b => b._id.toString() === badgeId.toString());
    if (!hasBadge) {
      return res.status(403).json({ success: false, message: 'You have not unlocked this badge.' });
    }
    const user = await User.findByIdAndUpdate(req.user.id, { featuredBadge: badgeId }, { new: true }).populate('featuredBadge');
    return sendSuccess(res, { data: user, message: 'Featured badge updated successfully!' });
  } catch (err) {
    return next(err);
  }
};

const getPublicStats = async (req, res, next) => {
  try {
    const [totalChallenges, totalCoders, totalSubmissions] = await Promise.all([
      Challenge.countDocuments(),
      User.countDocuments({ role: 'user' }),
      Submission.countDocuments(),
    ]);

    return sendSuccess(res, {
      data: {
        totalChallenges,
        totalCoders,
        totalSubmissions,
      },
    });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  getDashboardSummary,
  getProfileStats,
  getUserProfile,
  updateFeaturedBadge,
  getAdminDashboardSummary,
  getPendingTasks,
  getPublicStats
};
