const axios = require('axios');
const { env } = require('../../config/env');
const { logger } = require('../../utils/logger');
const Submission = require('../features/submissions/Submission.model');

let intervalId = null;

const fetchLeaderboardData = async () => {
  const limit = 10;

  const [result] = await Submission.aggregate([
    { $match: { status: 'Accepted' } },
    {
      $group: {
        _id: { userId: '$userId', challengeId: '$challengeId' }
      }
    },
    {
      $lookup: {
        from: 'challenges',
        localField: '_id.challengeId',
        foreignField: '_id',
        as: 'challenge',
      },
    },
    { $unwind: '$challenge' },
    {
      $group: {
        _id: '$_id.userId',
        solvedCount: { $sum: 1 },
        totalPoints: { $sum: '$challenge.points' },
      },
    },
    { $sort: { totalPoints: -1, solvedCount: -1 } },
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
      $project: {
        _id: 1,
        username: '$user.username',
        solvedCount: 1,
        totalPoints: 1,
      },
    },
    { $limit: limit },
  ]);

  // Aggregate doesn't automatically return an array of the results if $facet is not used
  // Wait, in submission.controller.js it used $facet. Without $facet, aggregate returns an array of documents directly.
  return result || [];
};

const sendToDiscord = async (leaderboard) => {
  if (!env.DISCORD_WEBHOOK_URL) return;

  if (!leaderboard || leaderboard.length === 0) {
    return;
  }
const getRankEmoji = (index) => {
  if (index === 0) return '🥇';
  if (index === 1) return '🥈';
  if (index === 2) return '🥉';
  return `🔹 \`#${index + 1}\``;
};
  const embed = {
  title: '🏆 Algorithm Arena Leaderboard',
  description: 'The current top-performing developers in the arena.\n\u200b', // \u200b adds a clean blank spacing line
  color: 0x5865F2, // Vivid Discord Blurple (Or use 0xFEE75C for a sleek Gold theme)

  // Using fields strategically for layout
  fields: leaderboard.map((user, index) => {
    const rank = getRankEmoji(index);
    const username = user.username ? `**${user.username}**` : '*Unknown User*';

    return {
      name: `${rank} — ${username}`,
      // Code blocks (`) keep the numbers perfectly aligned and scannable
      value: `Score: \`${user.totalPoints.toLocaleString()} pts\`  |  Solved: \`${user.solvedCount}\``,
      inline: false,
    };
  }),

  timestamp: new Date().toISOString(),
  footer: {
    text: 'Refreshes Daily • Algorithm Arena',
    // Optional: Add an icon to the footer if you have a site logo
    // icon_url: 'https://your-site.com/logo.png'
  },
};

  try {
    await axios.post(env.DISCORD_WEBHOOK_URL, {
      embeds: [embed],
    });
    logger.info('Leaderboard successfully pushed to Discord webhook');
  } catch (error) {
    logger.error('Failed to push leaderboard to Discord', { error: error.message });
  }
};

const pushLeaderboardUpdate = async () => {
  try {
    // Actually aggregate returns an array directly if we don't use $facet and destructure [result]
    // Wait, let's fix the aggregate call to just return the array.
    const leaderboard = await Submission.aggregate([
      { $match: { status: 'Accepted' } },
      {
        $group: {
          _id: { userId: '$userId', challengeId: '$challengeId' }
        }
      },
      {
        $lookup: {
          from: 'challenges',
          localField: '_id.challengeId',
          foreignField: '_id',
          as: 'challenge',
        },
      },
      { $unwind: '$challenge' },
      {
        $group: {
          _id: '$_id.userId',
          solvedCount: { $sum: 1 },
          totalPoints: { $sum: '$challenge.points' },
        },
      },
      { $sort: { totalPoints: -1, solvedCount: -1 } },
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
        $project: {
          _id: 1,
          username: '$user.username',
          solvedCount: 1,
          totalPoints: 1,
        },
      },
      { $limit: 10 },
    ]);

    await sendToDiscord(leaderboard);
  } catch (error) {
    logger.error('Error fetching leaderboard for Discord update', { error: error.message });
  }
};

const startDiscordLeaderboardService = () => {
  if (env.NODE_ENV !== 'production') {
    logger.info('Skipping Discord leaderboard service: not in production environment.');
    return;
  }

  if (!env.DISCORD_WEBHOOK_URL) {
    logger.info('DISCORD_WEBHOOK_URL not set. Discord leaderboard service disabled.');
    return;
  }

  const intervalMs = env.DISCORD_WEBHOOK_INTERVAL_MS || 86400000;

  logger.info(`Starting Discord leaderboard service (Interval: ${intervalMs}ms)`);

  // Push immediately on start, then start interval
  pushLeaderboardUpdate();

  intervalId = setInterval(pushLeaderboardUpdate, intervalMs);
};

const stopDiscordLeaderboardService = () => {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    logger.info('Discord leaderboard service stopped.');
  }
};

module.exports = {
  startDiscordLeaderboardService,
  stopDiscordLeaderboardService,
  pushLeaderboardUpdate,
};
