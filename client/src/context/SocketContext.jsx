import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './useAuth';
import { SocketContext } from './socketContext';

const SOCKET_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? window.location.origin : 'http://localhost:5000');

export const SocketProvider = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const [socket, setSocket] = useState(null);
  const userId = user?.id || user?._id;

  useEffect(() => {
    // Only connect if the user is authenticated
    if (!isAuthenticated) {
      return;
    }

    const token = localStorage.getItem('token');
    const socketInstance = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      auth: {
        token: token || undefined,
      },
    });

    socketInstance.on('connect', () => {
      console.log('Socket connected:', socketInstance.id);
    });

    socketInstance.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
    });

    // Defer state update to avoid synchronous setState inside useEffect warning
    const timeoutId = setTimeout(() => {
      setSocket(socketInstance);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      socketInstance.disconnect();
      // Defer state update to avoid synchronous setState inside useEffect warning
      setTimeout(() => {
        setSocket(null);
      }, 0);
    };
  }, [isAuthenticated, userId]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};
