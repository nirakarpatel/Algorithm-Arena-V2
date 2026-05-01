require('dotenv').config();

const mongoose = require('mongoose');
const { createApp } = require('./app');
const { env } = require('./config/env');
const { logger } = require('./utils/logger');

const http = require('http');
const { initSocket } = require('./config/socket');

const app = createApp();
const server = http.createServer(app);

const connectDB = async () => {
  const conn = await mongoose.connect(env.MONGO_URI);
  logger.info('MongoDB connected', { host: conn.connection.host });
  return conn;
};

const startServer = async () => {
  try {
    await connectDB();
    
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
