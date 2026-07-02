import { useEffect, useRef, useContext } from 'react';
import { SocketContext } from '../context/socketContext';

export const useSocket = (event, callback) => {
  const socket = useContext(SocketContext);
  const callbackRef = useRef(callback);
  
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!socket || !event) return;

    const handler = (...args) => {
      callbackRef.current?.(...args);
    };

    socket.on(event, handler);

    return () => {
      socket.off(event, handler);
    };
  }, [socket, event]);
};

