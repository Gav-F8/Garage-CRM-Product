import { useState, useEffect, useCallback } from "react";

/**
 * Custom hook to manage timer persistence using localStorage
 * Handles background timer calculations when the timer is running
 * Is used in ProjectDetailsPage to persist timer state across page reloads and backgrounding
 * Counts based on projectId to allow multiple timers for different projects without conflict
 */
export function useTimerPersistence(projectId) {
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [mounted, setMounted] = useState(false);

  const TIMER_KEY = `timer_${projectId}`;
  const TIMER_START_KEY = `timer_start_${projectId}`;
  const TIMER_RUNNING_KEY = `time_running_${projectId}`;

  // Load timer state from localStorage on mount
  useEffect(() => {
    const savedTimer = localStorage.getItem(TIMER_KEY);
    const savedStartTime = localStorage.getItem(TIMER_START_KEY) === "true";
    const savedIsRunning = localStorage.getItem(TIMER_RUNNING_KEY);

    if (savedTimer != null) {
      let seconds = parseInt(savedTimer, 10) || 0;
      
      // If timer was running, calculate elapsed background time
      if (savedIsRunning === "true" && savedStartTime) {
        const startTime = parseInt(savedStartTime, 10);
        const elapsedMs = Math.max(0, Date.now() - startTime);
        const elapsedSeconds = Math.floor(elapsedMs / 1000);
        seconds += elapsedSeconds;
      }

      setTimerSeconds(seconds);
      setIsTimerRunning(savedIsRunning === "true");
    }

    setMounted(true);
  }, [projectId]);

  // Persist timer seconds to localStorage whenever they change (while mounted)
  useEffect(() => {
    if (mounted) {
        localStorage.setItem(TIMER_KEY, String(timerSeconds));
    }
  }, [timerSeconds, TIMER_KEY, mounted]);

  // Persist running state and start time to localStorage - set start time only from false to true
  useEffect(() => {
    if (mounted) {
        localStorage.setItem(TIMER_RUNNING_KEY, String(isTimerRunning));
        
        if (isTimerRunning) {
            // Timer just started - check if we already have a startTime
            const existingStartTime = localStorage.getItem(TIMER_START_KEY);
            if (!existingStartTime) {
                // Timer starts - check if we alread have a startTime
                localStorage.setItem(TIMER_START_KEY, String(Date.now()));
            }
        } else {
            // Timer stops - clear start time and calculate final seconds
            localStorage.removeItem(TIMER_START_KEY);
        }
    }
  }, [isTimerRunning, TIMER_KEY, TIMER_START_KEY, TIMER_RUNNING_KEY, mounted]);

  // Function to reset timer (clears localStorage)
  const resetTimer = useCallback(() => {
    setTimerSeconds(0);
    setIsTimerRunning(false);
    localStorage.removeItem(TIMER_KEY);
    localStorage.removeItem(TIMER_START_KEY);
    localStorage.removeItem(TIMER_RUNNING_KEY);
  }, [TIMER_KEY, TIMER_START_KEY, TIMER_RUNNING_KEY]);

  // Function to clear timer from localStorage (called after submitting timelog)
  const clearTimer = useCallback(() => {
    localStorage.removeItem(TIMER_KEY);
    localStorage.removeItem(TIMER_START_KEY);
    localStorage.removeItem(TIMER_RUNNING_KEY);
  }, [TIMER_KEY, TIMER_START_KEY, TIMER_RUNNING_KEY]);

  return {
    timerSeconds,
    setTimerSeconds,
    isTimerRunning,
    setIsTimerRunning,
    resetTimer,
    clearTimer,
  };
}