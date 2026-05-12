const { Server } = require('socket.io');
const { logger } = require('../utils/logger');
const { env } = require('./env');

let io;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: env.CORS_ORIGINS,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    logger.info('New client connected', { socketId: socket.id });

    socket.on('join_clan', (clanId) => {
      socket.join(`clan_${clanId}`);
      logger.info('Client joined clan room', { socketId: socket.id, clanId });
    });

    socket.on('leave_clan', (clanId) => {
      socket.leave(`clan_${clanId}`);
      logger.info('Client left clan room', { socketId: socket.id, clanId });
    });

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
