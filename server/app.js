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

const authRoutes = require('./src/features/auth/auth.routes');
const challengeRoutes = require('./src/features/challenges/challenge.routes');
const questionSetRoutes = require('./src/features/challenges/questionSet.routes');
const submissionRoutes = require('./src/features/submissions/submission.routes');
const dashboardRoutes = require('./src/features/dashboard/dashboard.routes');
const profileRoutes = require('./src/features/profile/profile.routes');
const clanRoutes = require('./src/features/clans/clan.routes');
const userRoutes = require('./src/features/users/user.routes');
const resourceRoutes = require('./src/features/resources/resource.routes');
const badgeRoutes = require('./src/features/badges/badge.routes');


try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (err) {
  logger.warn('DNS setup warning', { error: err });
}

const createApp = () => {
  const app = express();
  const isNonProductionEnv = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';

  // Keep Render keepalive traffic as cheap as possible by bypassing the
  // standard middleware chain and returning immediately.
   app.get('/', (_req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Algorithm Arena API is running'
  });
});
  app.get('/ping', (_req, res) => {
    return res.status(200).json({ ok: true });
  });

  app.use(requestContext);
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", ...env.CORS_ORIGINS],
          fontSrc: ["'self'", 'https:'],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          upgradeInsecureRequests: [],
        },
      },
    })
  );
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
  app.use(express.json({ limit: '10mb' }));
  app.use(cookieParser());

  morgan.token('request-id', (req) => req.requestId);
  app.use(morgan(':method :url :status :response-time ms reqId=:request-id'));

  const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: isNonProductionEnv ? 1000 : 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests, please try again later.' },
  });
  app.use('/api', apiLimiter);

  // Stricter limiter for auth endpoints to prevent brute-force attacks
  const authLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: isNonProductionEnv ? 200 : 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many authentication attempts, please try again later.' },
  });
  app.use('/api/auth/google', authLimiter);
  app.use('/api/auth/claim-username', authLimiter);

  app.use('/api/auth', authRoutes);
  app.use('/api/challenges', challengeRoutes);
  app.use('/api/sets', questionSetRoutes);
  app.use('/api/submissions', submissionRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/profile', profileRoutes);
  app.use('/api/clans', clanRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/resources', resourceRoutes);
  app.use('/api/badges', badgeRoutes);

  app.use('/api/docs', express.static(path.join(__dirname, 'docs')));

  app.get('/api', (req, res) => {
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

  // Serve static assets in production (SPA deep-link fix)
  if (process.env.NODE_ENV === 'production') {
    const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
    app.use(express.static(clientDistPath));

    app.use((req, res, next) => {
      if (req.method !== 'GET') return next();
      // Let /api/* fall through to 404 handler
      if (req.path.startsWith('/api')) return next();
      res.sendFile(path.join(clientDistPath, 'index.html'));
    });
  }

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
