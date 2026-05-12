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

const startServer = async () => {
  try {
    await connectDB();
    
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
