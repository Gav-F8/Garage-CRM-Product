import { useEffect, useMemo, useState, useRef } from "react";
import {
  onSnapshot,
  getDocs,
  query,
  collection,
  orderBy,
  limit,
  startAfter,
  doc
} from "firebase/firestore";
import {
  fetchCustomers,
} from "../lib/firestore-helpers";
import { auth, db } from "/src/firebase.js";

// Context for fetching customer data for the current business. Returns list of customers with loading/error state.
export function useCustomersForCurrentUser(businessId) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!businessId) {
      setLoading(false);
      return;
    }

    const loadCustomers = async () => {
      try {
        const cacheKey = `customers_${businessId}`;
        const cached = localStorage.getItem(cacheKey);

        if (cached) {
          setCustomers(JSON.parse(cached));
          setLoading(false);
          return;
        }

        const customersData = await fetchCustomers(businessId);

        localStorage.setItem(cacheKey, JSON.stringify(customersData));
        setCustomers(customersData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadCustomers();
  }, [businessId]);

  return { customers, loading, error };
}


// Context for fetching project data for the current user (owner or mechanic). 
// Returns list of projects with real-time updates, plus loading/error state.
// Also includes pagination support for loading more projects in batches of 10.
export function useProjectsForCurrentUser(options = {}) {
  const { businessId: providedBusinessId, enabled = true } = options;
  const BATCH_SIZE = 10;
  
  const businessId = useMemo(
    () => providedBusinessId || localStorage.getItem("ccgBusinessId"),
    [providedBusinessId],
  );

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [hasMore, setHasMore] = useState(true);
  
  // Track pagination state
  const lastDocRef = useRef(null); // Last document from current batch (for cursor)
  const unsubscribeListenerRef = useRef(null); // Real-time listener cleanup

  // Initial load: set up real-time listener for first 50
  useEffect(() => {
    if (!enabled || !businessId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    lastDocRef.current = null;

    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
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

        const empUnsub = onSnapshot(
          employeeRef,
          (empSnap) => {
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

            // Set up real-time listener for first 50 items
            const projectsUnsub = onSnapshot(
              query(
                collection(db, "businesses", businessId, "Projects"),
                orderBy("updatedAt", "desc"),
                limit(BATCH_SIZE)
              ),
              (snap) => {
                const newProjects = snap.docs.map(doc => ({
                  id: doc.id,
                  ...doc.data(),
                }));
                
                setProjects(newProjects);
                
                // Store last document for pagination cursor
                if (snap.docs.length > 0) {
                  lastDocRef.current = snap.docs[snap.docs.length - 1];
                }
                
                // Check if there are more items beyond this batch
                setHasMore(snap.docs.length === BATCH_SIZE);
                setLoading(false);
              },
              (err) => {
                console.error("Error listening to projects:", err);
                setError(err.message);
                setLoading(false);
              }
            );

            // Store cleanup function
            unsubscribeListenerRef.current = projectsUnsub;

            return () => projectsUnsub();
          }
        );

        return () => empUnsub();
      } catch (err) {
        console.error("Setup error:", err);
        setError(err.message);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, [businessId, enabled]);

  // Load next batch of 50 (appends to existing, doesn't replace)
  const loadMore = async () => {
    if (!lastDocRef.current || !hasMore || loadingMore) return;

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
      }));

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
      setError(err.message);
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