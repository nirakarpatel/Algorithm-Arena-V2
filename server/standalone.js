const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const { logger } = require('./utils/logger');

async function runStandalone() {
  try {
    logger.info('Starting MongoDB In-Memory Server...');
    const mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    // Override MONGO_URI for the process
    process.env.MONGO_URI = mongoUri;
    
    logger.info('MongoDB In-Memory Server ready', { uri: mongoUri });
    
    // Dynamically require server after env is set
    const { startServer, connectDB } = require('./server');
    const { seedDatabase } = require('./seed');

    await connectDB();
    await seedDatabase();
    await startServer();
    
    // Handle graceful shutdown
    const shutdown = async () => {
      logger.info('Shutting down standalone server...');
      await mongoose.disconnect();
      await mongoServer.stop();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    
  } catch (err) {
    logger.error('Failed to start standalone server', { error: err });
    process.exit(1);
  }
}

runStandalone();
