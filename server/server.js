require('dotenv').config();

const mongoose = require('mongoose');
const { createApp } = require('./app');
const { env } = require('./config/env');
const { logger } = require('./utils/logger');

const http = require('http');
const { initSocket } = require('./config/socket');
const { initializeDefaultUsers } = require('./initDb');

const app = createApp();
const server = http.createServer(app);

const connectDB = async () => {
  let uri = env.MONGO_URI;

  if (process.env.NODE_ENV === 'production') {
    const dns = require('dns');
    dns.setServers(['8.8.8.8', '8.8.4.4']);
  }
  
  const conn = await mongoose.connect(uri);
  logger.info('MongoDB connected', { host: conn.connection.host });
  return conn;
};

// NOTE: Production startup DB index repairs removed for scalability.
// Keep the implementation only for one-time migration execution.
// One-time index repair (run via script): server/scripts/repair-indexes.js
// Leaving the implementation here for re-use, but it is NOT called on startup.
const repairClanIndexes = async () => {
  try {
    logger.info('🔍 Checking clan collection indexes...');
    const db = mongoose.connection.db;
    const clanCollection = db.collection('clans');


    const indexCursor = clanCollection.listIndexes();

    const indexArray = await indexCursor.toArray();
    logger.info(`Found ${indexArray.length} indexes`, { indexes: indexArray.map(i => i.name) });

    // Check if old/broken indexes exist
    let hasOldIndexes = false;
    const indexesToDrop = [];

    for (const spec of indexArray) {
      const name = spec.name;
      if (name === '_id_') continue;

      const isNameOrTagIndex = spec.key?.name === 1 || spec.key?.tag === 1;
      const hasPartialFilter = !!spec.partialFilterExpression;

      logger.info(`Index "${name}":`, {
        key: spec.key,
        unique: spec.unique,
        isPartial: hasPartialFilter
      });

      // Drop if:
      // 1. It's a name/tag index but NOT partial (old index)
      // 2. It's any name/tag index that's not the correct one we want
      if (isNameOrTagIndex && !hasPartialFilter) {
        logger.warn(`⚠️  OLD NON-PARTIAL INDEX FOUND: ${name}`);
        hasOldIndexes = true;
        indexesToDrop.push(name);
      }
    }

    if (!hasOldIndexes) {
      logger.info('✅ Clan indexes are correct');
      return;
    }

    logger.info(`🔨 AGGRESSIVE: Dropping ${indexesToDrop.length} old indexes...`);

    // FORCE drop all bad indexes
    for (const indexName of indexesToDrop) {
      try {
        await clanCollection.dropIndex(indexName);
        logger.info(`✅ Dropped: ${indexName}`);
      } catch (err) {
        logger.warn(`⚠️  Could not drop ${indexName}: ${err.message}`);
      }
    }

    // Wait for drop to propagate
    await new Promise(resolve => setTimeout(resolve, 500));

    // Create ONLY the correct partial indexes
    logger.info('✨ Creating partial unique indexes...');

    try {
      const nameResult = await clanCollection.createIndex(
        { name: 1 },
        {
          unique: true,
          partialFilterExpression: { status: 'active' },
          background: true,
          name: 'name_unique_active_only'
        }
      );
      logger.info('✅ Created name index (partial)', { result: nameResult });
    } catch (err) {
      logger.error('Failed to create name index', { error: err.message });
    }

    try {
      const tagResult = await clanCollection.createIndex(
        { tag: 1 },
        {
          unique: true,
          partialFilterExpression: { status: 'active' },
          background: true,
          name: 'tag_unique_active_only'
        }
      );
      logger.info('✅ Created tag index (partial)', { result: tagResult });
    } catch (err) {
      logger.error('Failed to create tag index', { error: err.message });
    }

    logger.info('✨ Clan indexes repaired! Can now create unlimited active clans.');
  } catch (err) {
    logger.error('Failed to repair clan indexes', {
      error: err.message || JSON.stringify(err),
      stack: err.stack
    });
  }
};

// Auto-repair user collection indexes on startup.
// Replaces legacy non-partial unique indexes on username/regNo (which index
// explicit nulls and cause E11000 dup key errors) with partial ones.
const repairUserIndexes = async () => {
  try {

    const db = mongoose.connection.db;
    const userCollection = db.collection('users');
    const indexArray = await userCollection.listIndexes().toArray();

    // Clear any null usernames/regNos so the new partial unique index can build.
    await userCollection.updateMany({ username: null }, { $unset: { username: '' } });
    await userCollection.updateMany({ regNo: null }, { $unset: { regNo: '' } });

    const targets = ['username', 'regNo'];
    for (const spec of indexArray) {
      if (spec.name === '_id_') continue;
      const field = Object.keys(spec.key || {})[0];
      const isTarget = targets.includes(field);
      const hasPartialFilter = !!spec.partialFilterExpression;
      if (isTarget && !hasPartialFilter) {
        try {
          await userCollection.dropIndex(spec.name);
          logger.info(`✅ Dropped legacy user index: ${spec.name}`);
        } catch (err) {
          logger.warn(`⚠️  Could not drop ${spec.name}: ${err.message}`);
        }
      }
    }

    for (const field of targets) {
      try {
        await userCollection.createIndex(
          { [field]: 1 },
          {
            unique: true,
            partialFilterExpression: { [field]: { $type: 'string' } },
            background: true,
            name: `${field}_unique_partial`,
          }
        );
        logger.info(`✅ Created partial unique index for ${field}`);
      } catch (err) {
        logger.warn(`⚠️  Could not create ${field} index: ${err.message}`);
      }
    }
  } catch (err) {
    logger.error('Failed to repair user indexes', { error: err.message, stack: err.stack });
  }
};

const { startDiscordLeaderboardService } = require('./src/services/discordLeaderboard.service');

const startServer = async () => {
  try {
    await connectDB();

    // Seed default users if database is empty
    await initializeDefaultUsers();

    // Production index repair is disabled to avoid startup DB locks/index rebuild spikes.
    // Run one-time migrations/scripts instead (see TODO).
    logger.info('Skipping production index repair routines (clans/users)');



    // Initialize Socket.io
    initSocket(server);

    // Start Discord leaderboard service
    startDiscordLeaderboardService();

    server.listen(env.PORT, () => {
      logger.info('Server started with Real-time support', { port: env.PORT, env: env.NODE_ENV });
    });
    return server;
  } catch (err) {
    logger.error('Server startup failed', { error: err });
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = {
  app,
  connectDB,
  startServer,
};

// Trigger restart for Mongoose 9 AuditLog fixes
