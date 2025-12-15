
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface UseIdleTimeoutProps {
  onIdle: () => void;
  idleTimeout: number;
  warningTimeout?: number;
}

const activityEvents = [
  'mousemove',
  'mousedown',
  'keydown',
  'touchstart',
  'scroll',
];

export const useIdleTimeout = ({
  onIdle,
  idleTimeout,
  warningTimeout = 2 * 60 * 1000, // Default 2 minutes warning
}: UseIdleTimeoutProps) => {
  const [isIdle, setIsIdle] = useState(false);
  const idleTimer = useRef<NodeJS.Timeout>();
  const warningTimer = useRef<NodeJS.Timeout>();

  const resetTimers = useCallback(() => {
    // Clear existing timers
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (warningTimer.current) clearTimeout(warningTimer.current);

    // User is active, so set isIdle to false
    setIsIdle(false);

    // Set a new timer for the warning
    warningTimer.current = setTimeout(() => {
      setIsIdle(true); // Show the warning modal
    }, idleTimeout - warningTimeout);

    // Set a new timer for the final logout
    idleTimer.current = setTimeout(() => {
      onIdle();
    }, idleTimeout);
  }, [idleTimeout, warningTimeout, onIdle]);

  // Set up event listeners and initial timers
  useEffect(() => {
    activityEvents.forEach((event) => {
      window.addEventListener(event, resetTimers);
    });

    resetTimers(); // Initialize timers on component mount

    // Cleanup function
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      if (warningTimer.current) clearTimeout(warningTimer.current);
      activityEvents.forEach((event) => {
        window.removeEventListener(event, resetTimers);
      });
    };
  }, [resetTimers]);

  // Public API of the hook
  return {
    isIdle,
    stay: resetTimers, // Allow the user to manually reset timers (e.g., from the modal)
  };
};
