const User = require('./src/features/users/User.model');
const Clan = require('./src/features/clans/Clan.model');
const Badge = require('./src/features/badges/Badge.model');
const { logger } = require('./utils/logger');

async function initializeDefaultBadges() {
  try {
    const existingBadges = await Badge.find({});
    const existingNames = existingBadges.map(b => b.name);
    const defaultBadges = [
      { name: 'First Blood', icon: '🩸', color: 'red', rarity: 'COMMON', description: 'First successful submission' },
      { name: 'Night Owl', icon: '🦉', color: 'purple', rarity: 'RARE', description: 'Solved between 12am–4am' },
      { name: 'Flawless', icon: '✨', color: 'blue', rarity: 'EPIC', description: 'First-attempt perfect solve' },
      { name: 'Streak Warrior', icon: '🔥', color: 'purple', rarity: 'EPIC', description: 'Maintained a 5-day streak' },
      { name: 'Grandmaster', icon: '🔮', color: 'gold', rarity: 'LEGENDARY', description: 'Solved at least 1 Hard challenge' },
      { name: 'Algorithm Master', icon: '👑', color: 'gold', rarity: 'LEGENDARY', description: '10 or more problems solved' }
    ];
    const toSeed = defaultBadges.filter(b => !existingNames.includes(b.name));
    if (toSeed.length > 0) {
      logger.info(`🌱 Seeding default badges: ${toSeed.map(b => b.name).join(', ')}`);
      await Badge.create(toSeed);
      logger.info('✅ Default badges successfully seeded!');
    }
  } catch (err) {
    logger.error('❌ Failed to initialize default badges:', err);
  }
}

async function initializeDefaultUsers() {
  try {
    // Seed badges first
    await initializeDefaultBadges();

    const userCount = await User.countDocuments({});
    if (userCount > 0) {
      logger.info(`ℹ️ Database already has ${userCount} users. Skipping default user initialization.`);
      return;
    }

    logger.info('🌱 Database is empty. Seeding default user accounts and clan...');

    const devmaster = await User.create({
      username: 'devmaster',
      email: 'devmaster@iter.ac.in',
      password: 'admin123',
      role: 'admin',
      isNewUser: false
    });

    const clanChief = await User.create({
      username: 'chief1',
      email: 'chief1@iter.ac.in',
      password: 'admin123',
      role: 'clan-chief',
    });

    const standardUser = await User.create({
      username: 'operative1',
      email: 'operative1@iter.ac.in',
      password: 'admin123',
      role: 'user',
    });

    const clan = await Clan.create({
      name: 'Alpha Coders',
      tag: 'AC',
      description: 'The elite squad of algorithm masters.',
      createdBy: devmaster._id,
      chief: clanChief._id,
      members: [clanChief._id, standardUser._id]
    });

    await User.findByIdAndUpdate(clanChief._id, { clan: clan._id });
    await User.findByIdAndUpdate(standardUser._id, { clan: clan._id });

    logger.info('✅ Default user accounts and clan successfully seeded!');
  } catch (err) {
    logger.error('❌ Failed to initialize default users:', err);
  }
}

module.exports = { initializeDefaultUsers };
