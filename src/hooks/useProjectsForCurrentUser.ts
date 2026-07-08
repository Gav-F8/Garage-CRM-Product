import { useEffect, useMemo, useState, useRef } from "react";
import {
  onSnapshot,
  getDocs,
  query,
  collection,
  orderBy,
  limit,
  startAfter,
  doc,
  type QueryDocumentSnapshot,
  type DocumentData,
  type Unsubscribe,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import type { WithId, Project } from "@/types/firestore";

interface UseProjectsOptions {
  businessId?: string | null;
  enabled?: boolean;
}

// Context for fetching project data for the current user (owner or mechanic).
// Returns list of projects with real-time updates, plus loading/error state.
// Also includes pagination support for loading more projects in batches of 10.
export function useProjectsForCurrentUser(options: UseProjectsOptions = {}) {
  const { businessId: providedBusinessId, enabled = true } = options;
  const BATCH_SIZE = 10;

  // businessId is supplied by callers from useAuth(); no localStorage fallback.
  const businessId = useMemo(() => providedBusinessId || null, [providedBusinessId]);

  const [projects, setProjects] = useState<WithId<Project>[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [hasMore, setHasMore] = useState(true);

  // Track pagination state
  const lastDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null); // Last document from current batch (for cursor)
  // Inner listener unsubscribes, tracked so the effect cleanup can tear down
  // ALL of them (auth → employee doc → projects query), not just the auth one.
  const empUnsubRef = useRef<Unsubscribe | null>(null);
  const projectsUnsubRef = useRef<Unsubscribe | null>(null);

  // Initial load: set up real-time listener for first batch
  useEffect(() => {
    if (!enabled || !businessId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    lastDocRef.current = null;

    // Helpers to tear down the nested listeners safely.
    const clearProjectsListener = () => {
      if (projectsUnsubRef.current) {
        projectsUnsubRef.current();
        projectsUnsubRef.current = null;
      }
    };
    const clearEmployeeListener = () => {
      if (empUnsubRef.current) {
        empUnsubRef.current();
        empUnsubRef.current = null;
      }
    };

    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      // Re-running for a new auth state — drop any prior nested listeners first.
      clearProjectsListener();
      clearEmployeeListener();

      if (!user) {
        setProjects([]);
        setLoading(false);
        return;
      }

      try {
        const employeeRef = doc(
          db,
          "businesses",
          businessId,
          "Employees",
          user.uid
        );

        empUnsubRef.current = onSnapshot(
          employeeRef,
          (empSnap) => {
            // A new employee snapshot supersedes any prior projects listener.
            clearProjectsListener();

            if (!empSnap.exists()) {
              setProjects([]);
              setLoading(false);
              return;
            }

            const role = empSnap.data().role;

            if (role !== "owner" && role !== "mechanic") {
              setProjects([]);
              setLoading(false);
              return;
            }

            projectsUnsubRef.current = onSnapshot(
              query(
                collection(db, "businesses", businessId, "Projects"),
                orderBy("updatedAt", "desc"),
                limit(BATCH_SIZE)
              ),
              (snap) => {
                const newProjects = snap.docs.map(docSnap => ({
                  id: docSnap.id,
                  ...docSnap.data(),
                })) as WithId<Project>[];

                setProjects(newProjects);

                if (snap.docs.length > 0) {
                  lastDocRef.current = snap.docs[snap.docs.length - 1];
                }

                setHasMore(snap.docs.length === BATCH_SIZE);
                setLoading(false);
              },
              (err) => {
                console.error("Error listening to projects:", err);
                setError(err.message);
                setLoading(false);
              }
            );
          },
          (err) => {
            console.error("Error listening to employee record:", err);
            setError(err.message);
            setLoading(false);
          }
        );
      } catch (err) {
        console.error("Setup error:", err);
        setError((err as Error).message);
        setLoading(false);
      }
    });

    // Effect cleanup: tear down every listener (auth + both nested ones).
    return () => {
      unsubscribeAuth();
      clearProjectsListener();
      clearEmployeeListener();
    };
  }, [businessId, enabled]);

  // Load next batch of 50 (appends to existing, doesn't replace)
  const loadMore = async () => {
    if (!lastDocRef.current || !hasMore || loadingMore || !businessId) return;

    setLoadingMore(true);
    try {
      const snap = await getDocs(
        query(
          collection(db, "businesses", businessId, "Projects"),
          orderBy("updatedAt", "desc"),
          startAfter(lastDocRef.current), // Start after last doc
          limit(BATCH_SIZE)
        )
      );

      const nextBatch = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as WithId<Project>[];

      // Append new batch to existing projects
      setProjects(prev => [...prev, ...nextBatch]);

      // Update cursor for next batch
      if (snap.docs.length > 0) {
        lastDocRef.current = snap.docs[snap.docs.length - 1];
      }

      // Update hasMore flag
      setHasMore(nextBatch.length === BATCH_SIZE);
    } catch (err) {
      console.error("Error loading more projects:", err);
      setError((err as Error).message);
    } finally {
      setLoadingMore(false);
    }
  };

  return {
    projects,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore, // ← New function for user to call
  };
}
