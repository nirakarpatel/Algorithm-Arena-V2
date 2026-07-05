const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { logger } = require('../utils/logger');
const { env } = require('./env');
const User = require('../src/features/users/User.model');

let io;

const extractBearerToken = (socket) => {
  const handshakeToken = socket.handshake?.auth?.token;
  if (typeof handshakeToken === 'string' && handshakeToken.trim()) {
    return handshakeToken.trim();
  }

  const headerAuth = socket.handshake?.headers?.authorization;
  if (typeof headerAuth === 'string' && headerAuth.startsWith('Bearer ')) {
    return headerAuth.split(' ')[1];
  }

  return null;
};

const resolveSocketUserId = async (socket) => {
  const token = extractBearerToken(socket);
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);

    // No in-memory caching: always resolve via MongoDB.
    const user = await User.findById(decoded.id).select('_id status').lean();
    if (!user || user.status === 'Banned') return null;

    return user._id.toString();
  } catch {
    return null;
  }
};

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const cleanOrigin = origin.replace(/\/$/, '');
        if (env.CORS_ORIGINS.includes(cleanOrigin)) {
          return callback(null, true);
        }
        return callback(new Error(`CORS origin not allowed: ${origin}`), false);
      },
      methods: ['GET', 'POST'],
      credentials: true,
    },
    // Reduce worst-case payload abuse. (Socket.IO has other internal limits; this helps too.)
    maxHttpBufferSize: 1e6, // 1 MB
  });

  io.on('connection', (socket) => {
    logger.info('New client connected', { socketId: socket.id });

    // Resolve user id once per socket.
    socket.data.userId = null;

    resolveSocketUserId(socket)
      .then((userId) => {
        socket.data.userId = userId;

        if (!userId) {
          socket.emit('auth', { ok: false });
        }
      })
      .catch(() => {
        socket.data.userId = null;
        socket.emit('auth', { ok: false });
      });

    // Username check event (high-performance index lookup)
    socket.on('check_username', async (username, callback) => {
      try {
        if (typeof callback !== 'function') return;

        if (!username || username.length < 3) {
          return callback({ success: false, available: false, message: 'Username must be at least 3 characters' });
        }

        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
          return callback({ success: false, available: false, message: 'Username can only contain letters, numbers, and underscores' });
        }

        const mongoose = require('mongoose');
        const query = {
          username: username.toLowerCase()
        };

        let currentUserId = socket.data.userId;
        if (!currentUserId) {
          currentUserId = await resolveSocketUserId(socket);
        }

        if (currentUserId) {
          query._id = { $ne: new mongoose.Types.ObjectId(currentUserId) };
        }

        const existing = await User.findOne(query).select('_id').lean();

        return callback({
          success: true,
          available: !existing,
          message: existing ? 'Username is taken' : 'Username is available',
        });
      } catch (err) {
        logger.error('Error checking username via socket', { error: err.message });
        if (typeof callback === 'function') {
          callback({ success: false, available: false, message: 'Internal server error' });
        }
      }
    });

    // Basic connection-rate protection: drop sockets that reconnect too quickly.
    const now = Date.now();
    const last = socket.handshake?.auth?.lastConnectTs;
    if (typeof last === 'number' && now - last < 2000) {
      socket.disconnect(true);
      return;
    }

    socket.on('disconnect', () => {
      logger.info('Client disconnected', { socketId: socket.id });
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};

const emitEvent = (event, data) => {
  if (io) {
    io.emit(event, data);
    logger.info('Socket event emitted', { event, data });
  }
};

const emitToRoom = (room, event, data) => {
  if (io) {
    io.to(room).emit(event, data);
    logger.info(`Socket event emitted to room ${room}`, { event, data });
  }
};

module.exports = { initSocket, getIO, emitEvent, emitToRoom };

