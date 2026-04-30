require('dotenv').config();

const dns = require('dns');
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');

const { env } = require('./config/env');
const { logger } = require('./utils/logger');
const { requestContext } = require('./middleware/requestContext');

const authRoutes = require('./routes/authRoutes');
const challengeRoutes = require('./routes/challengeRoutes');
const submissionRoutes = require('./routes/submissionRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const profileRoutes = require('./routes/profileRoutes');
const clanRoutes = require('./routes/clanRoutes');
const userRoutes = require('./routes/userRoutes');

try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (err) {
  logger.warn('DNS setup warning', { error: err });
}

const createApp = () => {
  const app = express();

  app.use(requestContext);
  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) return callback(null, true);
        if (env.CORS_ORIGINS.includes(origin)) return callback(null, true);
        return callback(new Error('CORS origin not allowed'));
      },
      credentials: true,
    })
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  morgan.token('request-id', (req) => req.requestId);
  app.use(morgan(':method :url :status :response-time ms reqId=:request-id'));

  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests, please try again later.' },
  });
  app.use('/api', apiLimiter);

  app.use('/api/auth', authRoutes);
  app.use('/api/challenges', challengeRoutes);
  app.use('/api/submissions', submissionRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/profile', profileRoutes);
  app.use('/api/clans', clanRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/docs', express.static(path.join(__dirname, 'docs')));

  app.get('/', (req, res) => {
    res.status(200).json({
      success: true,
      data: {
        status: 'active',
        uptime: process.uptime(),
        env: env.NODE_ENV,
        requestId: req.requestId,
      },
      message: 'Algorithm Arena API is running',
    });
  });

  app.use((err, req, res, next) => {
    logger.error('Unhandled error', {
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
      error: err,
    });

    let statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;

    if (statusCode === 500) {
      if (err.name === 'ValidationError' || err.name === 'CastError') {
        statusCode = 400;
      }
      if (err.code === 11000) {
        statusCode = 400;
      }
      if (err.message === 'CORS origin not allowed') {
        statusCode = 403;
      }
    }

    return res.status(statusCode).json({
      success: false,
      message: err.message || 'Internal Server Error',
      requestId: req.requestId,
      errors: err.errors,
      error: env.NODE_ENV === 'development' ? err.stack : undefined,
    });
  });

  return app;
};

module.exports = { createApp };
