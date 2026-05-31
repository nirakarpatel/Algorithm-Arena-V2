require('dotenv').config();

const mongoose = require('mongoose');
const { createApp } = require('./app');
const { env } = require('./config/env');
const { logger } = require('./utils/logger');

const http = require('http');
const { initSocket } = require('./config/socket');
const { seedDatabase } = require('./seed');

const app = createApp();
const server = http.createServer(app);

const connectDB = async () => {
  let uri = env.MONGO_URI;
  if (process.env.NODE_ENV !== 'production') {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    const mongod = await MongoMemoryServer.create();
    uri = mongod.getUri();
    logger.info('Started MongoDB Memory Server at ' + uri);
  } else {
    const dns = require('dns');
    dns.setServers(['8.8.8.8', '8.8.4.4']);
  }
  const conn = await mongoose.connect(uri);
  logger.info('MongoDB connected', { host: conn.connection.host });
  return conn;
};

// Auto-repair clan collection indexes on startup (one-time fix for production)
const repairClanIndexes = async () => {
  if (process.env.NODE_ENV !== 'production') return; // Only in production

  try {
    logger.info('Checking clan collection indexes...');
    const db = mongoose.connection.db;
    const clanCollection = db.collection('clans');

    const currentIndexes = await clanCollection.getIndexes();

    // Check if old non-partial indexes exist
    let needsRepair = false;
    for (const [name, spec] of Object.entries(currentIndexes)) {
      if ((spec.key?.name === 1 || spec.key?.tag === 1) && !spec.partialFilterExpression) {
        needsRepair = true;
        logger.warn(`Found old non-partial index: ${name}. Repairing...`);
        break;
      }
    }

    if (!needsRepair) {
      logger.info('Clan indexes are correct (partial indexes present)');
      return;
    }

    // Drop all non-_id indexes
    logger.info('Dropping old indexes...');
    for (const indexName of Object.keys(currentIndexes)) {
      if (indexName === '_id_') continue;
      try {
        await clanCollection.dropIndex(indexName);
        logger.info(`Dropped index: ${indexName}`);
      } catch (err) {
        logger.warn(`Could not drop ${indexName}: ${err.message}`);
      }
    }

    // Create correct partial unique indexes
    logger.info('Creating new partial unique indexes...');
    await clanCollection.createIndex(
      { name: 1 },
      { unique: true, partialFilterExpression: { status: 'active' } }
    );
    logger.info('Created partial unique index on name');

    await clanCollection.createIndex(
      { tag: 1 },
      { unique: true, partialFilterExpression: { status: 'active' } }
    );
    logger.info('Created partial unique index on tag');

    logger.info('✅ Clan indexes repaired successfully!');
  } catch (err) {
    logger.error('Failed to repair clan indexes', { error: err.message });
    // Don't exit - app should still work
  }
};

const startServer = async () => {
  try {
    await connectDB();

    // Auto-repair clan indexes (one-time production fix)
    await repairClanIndexes();

    // Seed database if requested (same as standalone)
    if (process.env.SEED_ON_START === 'true') {
      logger.info('SEED_ON_START is true, seeding database...');
      await seedDatabase(true); // true passed to not exit process
    }

    // Initialize Socket.io
    initSocket(server);

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
