import { useEffect, useMemo, useState, useRef } from "react";
import {
  onSnapshot,  // ← New import
  getDocs,
  query,
  collection,
  where,
  orderBy,
  limit,
  startAfter,
  doc
} from "firebase/firestore";
import { auth, db } from "/src/firebase.js";
import {
  withErrorHandling,
  fetchTimestamp,
  formatTimestamp,
  formatWorkDate,
  formatTotalMinutes,
  formatTimer,
  convertTimestampToMillis,
} from "../lib/firestore-helpers";
const [timerSeconds, setTimerSeconds] = useState([]);
const [timerStartedAt, setTimerStartedAt] = useState([]);
const [timerPausedAt, setTimerPausedAt] = useState([]);
const [isActive, setIsActive] = useState([false]);
const [isLoading, setIsLoading] = useState([true]);

const intervalRef = useRef(null);
const isMountedRef = useRef(true);


export const Stopwatch(projectId, businessId) {
  
  // ═══════════════════════════════════════════════════════════════════
  // Proper mounted tracking - only set false on actual unmount
  // ═══════════════════════════════════════════════════════════════════
  useEffect(() => {
    isMountedRef.current = true
    return () => {isMountedRef.current = false;
    };
  }, []); // Only runs on mount / unmount

  const CACHE_START_KEY = useMemo(() => `timerStartedAt_${projectId}`, [projectId]);
  const CACHE_STOP_KEY = useMemo(() => `timerPausedAt_${projectId}`, [projectId]);
  const CACHE_ACTIVE_KEY = useMemo(() => `isActive_${projectId}`, [projectId]);

  useEffect(() => {
    async function loadTimerState() {
      // ═══════════════════════════════════════════════════════════════════
      // Proper mounted tracking - only set false on actual unmount
      // ═══════════════════════════════════════════════════════════════════
      
    // Load project.timerStartedAt timestamp
      const started = setTimerStartedAt(fetchTimestamp(projectId, "timerStartedAt"));
      // Load project.timerPausedAt timestamp
      const paused = setTimerPausedAt(fetchTimestamp(projectId, "timerPausedAt"));
      // Load project.isActive boolean
      const active = isActiveProject(projectId);
  
      // Convert timerStartedAt into milliseconds
      convertTimestampToMillis(started);
      // Convert timerPausedAt into milliseconds
      convertTimestampToMillis(paused);
  
      if (started) localStorage.setItem(started, CACHE_START_KEY);
      if (paused) localStorage.setItem(paused, CACHE_STOP_KEY);
      localStorage.setItem(active, CACHE_ACTIVE_KEY);
  
      if (isMountedRef.current) {
        setTimerStartedAt(started);
        setTimerPausedAt(paused);
        setIsActive(active);
        setIsLoading(false);
      }
    }
    
  loadTimerState();

  }, [projectId, businessId]);
}