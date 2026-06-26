const Submission = require('../submissions/Submission.model');
const User = require('../users/User.model');
const Challenge = require('./Challenge.model');
const mongoose = require('mongoose');

/**
 * Cleanup submissions and precisely recalculate user points and solved count
 * whenever challenges are deleted (either individually or as part of a question set).
 * 
 * @param {Array<String|ObjectId>} challengeIds Array of challenge IDs being deleted
 */
const cleanupSubmissionsAndUserStats = async (challengeIds) => {
  if (!challengeIds || challengeIds.length === 0) return;

  // 1. Find all distinct users who have ANY submission for these challenges
  const submissions = await Submission.find({ challengeId: { $in: challengeIds } }).select('userId');
  const uniqueUserIds = [...new Set(submissions.map(s => s.userId.toString()))];

  // 2. Delete ALL submissions (Accepted, Wrong Answer, etc.) for these challenges
  // This removes them from recent history, heat maps, pie charts, etc.
  await Submission.deleteMany({ challengeId: { $in: challengeIds } });

  // 3. For each affected user, completely recalculate their XP and Solved Count
  // based on their REMAINING accepted submissions. This is safer than simple decrement
  // because challenge points could have been edited before deletion.
  for (const uId of uniqueUserIds) {
    const user = await User.findById(uId);
    if (!user) continue;

    // Get all remaining Accepted submissions for this user
    const remainingSubmissions = await Submission.find({ userId: uId, status: 'Accepted' }).select('challengeId');
    const remainingChallengeIds = [...new Set(remainingSubmissions.map(s => s.challengeId.toString()))];

    let totalPoints = 0;
    
    // Sum the points of the challenges for those remaining accepted submissions
    if (remainingChallengeIds.length > 0) {
      const remainingChallenges = await Challenge.find({ _id: { $in: remainingChallengeIds } }).select('points');
      totalPoints = remainingChallenges.reduce((acc, curr) => acc + (curr.points || 0), 0);
    }

    // Sum the daily login XP
    const XpLog = mongoose.models.XpLog || mongoose.model('XpLog');
    const xpLogs = await XpLog.find({ userId: uId, reason: 'Daily Login' });
    const additionalPoints = xpLogs.reduce((acc, curr) => acc + (curr.amount || 0), 0);
    totalPoints += additionalPoints;

    const solvedCount = remainingChallengeIds.length;

    // Update user stats
    user.points = totalPoints;
    user.solvedProblems = solvedCount;
    
    // Update coding level based on solved count
    if (user.solvedProblems >= 30) {
      user.codingLevel = 'Advanced';
    } else if (user.solvedProblems >= 10) {
      user.codingLevel = 'Intermediate';
    } else {
      user.codingLevel = 'Beginner';
    }
    
    await user.save();
  }
};

module.exports = {
  cleanupSubmissionsAndUserStats
};
