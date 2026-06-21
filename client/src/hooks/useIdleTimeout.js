import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

export const useIdleTimeout = (onIdle, timeoutMs = 20 * 60 * 1000) => {
  const timeoutRef = useRef(null);
  const location = useLocation(); // To possibly reset on route change

  const handleIdle = useCallback(() => {
    if (onIdle) {
      onIdle();
    }
  }, [onIdle]);

  const resetTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(handleIdle, timeoutMs);
  }, [handleIdle, timeoutMs]);

  useEffect(() => {
    const events = [
      'mousemove',
      'mousedown',
      'keydown',
      'scroll',
      'touchstart',
      'wheel',
    ];

    const handleActivity = () => {
      resetTimer();
    };

    // Initialize timer
    resetTimer();

    // Add listeners
    events.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [resetTimer]);

  // Reset timer whenever the user navigates
  useEffect(() => {
    resetTimer();
  }, [location.pathname, resetTimer]);
};
