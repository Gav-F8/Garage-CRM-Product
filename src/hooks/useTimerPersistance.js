import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { doc, updateDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Custom hook to manage timer state with Firestore backend sync
 * Handles all timer logic: start, pause, resume, reset, and submission
 * Calculates elapsed time from server timestamps with local 1-second ticker
 * Caches timestamps in localStorage to minimize Firestore reads
 */
export function useTimerPersistence(projectId, businessId) {
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerStartedAt, setTimerStartedAt] = useState(null);
  const [timerPausedAt, setTimerPausedAt] = useState(null);
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const intervalRef = useRef(null);
  const isMountedRef = useRef(true);
  
  // ═══════════════════════════════════════════════════════════════════
  // Proper mounted tracking - only set false on actual unmount
  // ═══════════════════════════════════════════════════════════════════
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []); // Only runs on mount/unmount
  
  const CACHE_START_KEY = useMemo(() => `timerStartedAt_${projectId}`, [projectId]);
  const CACHE_PAUSE_KEY = useMemo(() => `timerPausedAt_${projectId}`, [projectId]);
  const CACHE_ACTIVE_KEY = useMemo(() => `timerIsActive_${projectId}`, [projectId]);
  
  
  // ═══════════════════════════════════════════════════════════════════
  // Initial load: Fetch from Firestore and cache
  // ═══════════════════════════════════════════════════════════════════
  useEffect(() => {
    async function loadTimerState() {
      try {
        if (!projectId || !businessId) {
          setIsLoading(false);
          return;
        }

        const projectRef = doc(db, "businesses", businessId, "Projects", projectId);
        const projectSnap = await getDoc(projectRef);

        if (!projectSnap.exists()) {
          setError("Project not found");
          setIsLoading(false);
          return;
        }

        const projectData = projectSnap.data();
        const fetchedStartedAt = projectData.timerStartedAt || null;
        const fetchedPausedAt = projectData.timerPausedAt || null;
        const fetchedIsActive = projectData.isActive === true;
        
        // Convert Firestore Timestamps to milliseconds for consistent state storage
        const startedAtMs = fetchedStartedAt
          ? (fetchedStartedAt.toMillis ? fetchedStartedAt.toMillis() : fetchedStartedAt.getTime())
          : null;
        const pausedAtMs = fetchedPausedAt
          ? (fetchedPausedAt.toMillis ? fetchedPausedAt.toMillis() : fetchedPausedAt.getTime())
          : null;
        
        // Cache the millisecond values
        if (startedAtMs) {
          localStorage.setItem(CACHE_START_KEY, startedAtMs);
        }
        if (pausedAtMs) {
          localStorage.setItem(CACHE_PAUSE_KEY, pausedAtMs);
        }
        localStorage.setItem(CACHE_ACTIVE_KEY, fetchedIsActive);
        
        // Set state with millisecond values
        if (isMountedRef.current) {
          setTimerStartedAt(startedAtMs);
          setTimerPausedAt(pausedAtMs);
          setIsActive(fetchedIsActive);
          setIsLoading(false);
        }
      } catch (err) {
        console.error("Error loading timer state:", err);
        if (isMountedRef.current) {
          setError(err.message);
          setIsLoading(false);
        }
      }
    }
    
    loadTimerState();
  }, [projectId, businessId]);
  
  // ═══════════════════════════════════════════════════════════════════
  // Calculate timerSeconds from timestamps (Option B approach)
  // ═══════════════════════════════════════════════════════════════════
  const calculateElapsedSeconds = useCallback(() => {
    if (timerStartedAt === null) {
      console.log("📐 calculateElapsedSeconds: timerStartedAt is null, returning 0");
      return 0;
    }
    
    const now = Date.now();
    // Convert Firestore Timestamp or JS Date to milliseconds
    const startMs = typeof timerStartedAt === 'number' 
      ? timerStartedAt 
      : (timerStartedAt.toMillis ? timerStartedAt.toMillis() : timerStartedAt.getTime());
    
    console.log("📐 calculateElapsedSeconds: now=" + now + ", startMs=" + startMs + ", isActive=" + isActive);
    
    if (isActive) {
      // Timer running: elapsed = now - timerStartedAt
      const elapsed = Math.floor((now - startMs) / 1000);
      console.log("  ▶️  Timer active, elapsed = (now - startMs) / 1000 =", elapsed);
      return elapsed;
    } else if (timerPausedAt) {
      // Timer paused: elapsed = timerPausedAt - timerStartedAt
      const pauseMs = typeof timerPausedAt === 'number'
        ? timerPausedAt
        : (timerPausedAt.toMillis ? timerPausedAt.toMillis() : timerPausedAt.getTime());
      const elapsed = Math.floor((pauseMs - startMs) / 1000);
      console.log("  ⏸️  Timer paused, elapsed = (pauseMs - startMs) / 1000 =", elapsed);
      return elapsed;
    }
    
    console.log("  ❓ Timer not active and not paused, returning 0");
    return 0;
  }, [timerStartedAt, timerPausedAt, isActive]);
  
  // ═══════════════════════════════════════════════════════════════════
  // 1-second recalculation loop (when timer is running)
  // ═══════════════════════════════════════════════════════════════════
  useEffect(() => {
    console.log("📊 Interval effect ran. isActive:", isActive, "timerStartedAt:", timerStartedAt);
    
    if (!isActive || timerStartedAt === null) {
      console.log("⏸️  Timer not active or no start time, cleaning up interval");
      if (intervalRef.current) clearInterval(intervalRef.current);
      setTimerSeconds(calculateElapsedSeconds());
      return;
    }
    
    console.log("▶️  Setting up 1-second interval");
    
    // Recalculate every second
    intervalRef.current = setInterval(() => {
      if (isMountedRef.current) {
        const elapsed = calculateElapsedSeconds();
        console.log("⏰ Interval tick - elapsed seconds:", elapsed);
        setTimerSeconds(elapsed);
      }
    }, 1000);
    
    // Initial calculation
    const initialElapsed = calculateElapsedSeconds();
    console.log("🎯 Initial calculation - elapsed seconds:", initialElapsed);
    setTimerSeconds(initialElapsed);
    
    return () => {
      console.log("🧹 Cleaning up interval");
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive, timerStartedAt, timerPausedAt, calculateElapsedSeconds]);
  
  // ═══════════════════════════════════════════════════════════════════
  // Update Firestore helper
  // ═══════════════════════════════════════════════════════════════════
  const updateProjectTimer = useCallback(
    async (updates) => {
      try {
        if (!projectId || !businessId) return;
        
        const projectRef = doc(db, "businesses", businessId, "Projects", projectId);
        await updateDoc(projectRef, {
          ...updates,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        console.error("Error updating timer:", err);
        setError(err.message);
      }
    },
    [projectId, businessId]
  );
  
  // ═══════════════════════════════════════════════════════════════════
  // Timer control functions
  // ═══════════════════════════════════════════════════════════════════
  
  const startTimer = useCallback(async () => {
    console.log("🚀 startTimer called, isMounted:", isMountedRef.current);
    const now = new Date();
    const nowMs = now.getTime();
    
    console.log("⏱️ Setting timer state - nowMs:", nowMs, "now:", now);
    
    if (isMountedRef.current) {
      setTimerStartedAt(nowMs);
      setTimerPausedAt(null);
      setIsActive(true);
      console.log("✅ State updated locally");
    } else {
      console.log("❌ Component not mounted, skipping state update");
    }

    localStorage.setItem(CACHE_START_KEY, nowMs);
    localStorage.removeItem(CACHE_PAUSE_KEY);
    localStorage.setItem(CACHE_ACTIVE_KEY, "true");

    try {
      await updateProjectTimer({
        timerStartedAt: now,
        timerPausedAt: null,
        isActive: true,
      });
      console.log("✅ Firestore updated successfully");
    } catch (err) {
      console.error("❌ Firestore update failed:", err);
    }
  }, [updateProjectTimer, CACHE_START_KEY, CACHE_PAUSE_KEY, CACHE_ACTIVE_KEY]);

  const pauseTimer = useCallback(async () => {
    const now = new Date();
    const nowMs = now.getTime();

    if (isMountedRef.current) {
      setTimerPausedAt(nowMs);
      setIsActive(false);
    }

    localStorage.setItem(CACHE_PAUSE_KEY, nowMs);
    localStorage.setItem(CACHE_ACTIVE_KEY, "false");

    await updateProjectTimer({
      timerPausedAt: now,
      isActive: false,
    });
  }, [updateProjectTimer, CACHE_PAUSE_KEY, CACHE_ACTIVE_KEY]);

  const resumeTimer = useCallback(async () => {
    console.log("⏯️  resumeTimer called");
    
    if (isMountedRef.current) {
      // Time that was accumulated before pause
      const elapsedBeforePauseMs = (timerPausedAt || 0) - (timerStartedAt || 0);
      console.log("⏯️  elapsedBeforePauseMs:", elapsedBeforePauseMs);
  
      // Adjust start time so elapsed time is preserved
      // Formula: elapsed = now - adjustedStartTimeMs = elapsedBeforePauseMs
      // Therefore: adjustedStartTimeMs = now - elapsedBeforePauseMs
      const now = Date.now();
      const adjustedStartTimeMs = now - elapsedBeforePauseMs;
      console.log("⏯️  Adjusted startTime to preserve elapsed time. now:", now, "adjustedStartTimeMs:", adjustedStartTimeMs);
  
      setTimerStartedAt(adjustedStartTimeMs);
      setTimerPausedAt(null);
      setIsActive(true);
    }
  
    localStorage.removeItem(CACHE_PAUSE_KEY);
    localStorage.setItem(CACHE_ACTIVE_KEY, "true");
  
    // Update Firestore with adjusted start time
    const now = Date.now();
    const elapsedBeforePauseMs = (timerPausedAt || 0) - (timerStartedAt || 0);
    const adjustedStartTimeMs = now - elapsedBeforePauseMs;
    const adjustedStartDate = new Date(adjustedStartTimeMs);
  
    localStorage.setItem(CACHE_START_KEY, adjustedStartTimeMs);
    
    try {
      await updateProjectTimer({
        timerStartedAt: adjustedStartDate,
        timerPausedAt: null,
        isActive: true,
      });
      console.log("✅ Firestore updated with adjusted start time");
    } catch (err) {
      console.error("❌ Resume failed:", err);
    }
  }, [updateProjectTimer, CACHE_START_KEY, CACHE_PAUSE_KEY, CACHE_ACTIVE_KEY, timerPausedAt, timerStartedAt]);
  
  const resetTimer = useCallback(async () => {
    if (isMountedRef.current) {
      setTimerStartedAt(null);
      setTimerPausedAt(null);
      setIsActive(false);
      setTimerSeconds(0);
    }

    localStorage.removeItem(CACHE_START_KEY);
    localStorage.removeItem(CACHE_PAUSE_KEY);
    localStorage.removeItem(CACHE_ACTIVE_KEY);

    await updateProjectTimer({
      timerStartedAt: null,
      timerPausedAt: null,
      isActive: false,
    });
  }, [updateProjectTimer, CACHE_START_KEY, CACHE_PAUSE_KEY, CACHE_ACTIVE_KEY]);

  const submitTimer = useCallback(async () => {
    // Same as reset after successful submission
    await resetTimer();
  }, [resetTimer]);

  // ═══════════════════════════════════════════════════════════════════
  // Commented option for full cache refresh (for testing)
  // ═══════════════════════════════════════════════════════════════════
  // const refreshTimerFromBackend = useCallback(async () => {
  //   try {
  //     if (!projectId || !businessId) return;
  //     const projectRef = doc(db, "businesses", businessId, "Projects", projectId);
  //     const projectSnap = await getDoc(projectRef);
  //     if (projectSnap.exists()) {
  //       const data = projectSnap.data();
  //       setTimerStartedAt(data.timerStartedAt || null);
  //       setTimerPausedAt(data.timerPausedAt || null);
  //       setIsActive(data.isActive === true);
  //     }
  //   } catch (err) {
  //     console.error("Error refreshing timer:", err);
  //   }
  // }, [projectId, businessId]);

  return {
    timerSeconds,
    isActive,
    isLoading,
    error,
    startTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
    submitTimer,
    // refreshTimerFromBackend, // Uncomment for testing
  };
}