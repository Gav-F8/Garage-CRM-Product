import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { auth, db } from "/src/firebase.js";

export function useProjectsForCurrentUser(options = {}) {
  const {
    businessId: providedBusinessId,
    enabled = true,
  } = options;

  const businessId = useMemo(
    () => providedBusinessId || localStorage.getItem("ccgBusinessId"),
    [providedBusinessId],
  );

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentRole, setCurrentRole] = useState(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const refreshProjects = () => {
    setRefreshTick((prev) => prev + 1);
  };

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      setError("");
      return;
    }

    let isCancelled = false;

    async function loadProjects() {
      setLoading(true);
      setError("");

      if (!businessId) {
        if (!isCancelled) {
          setProjects([]);
          setCurrentRole(null);
          setError("No business context found. Please sign in again.");
          setLoading(false);
        }
        return;
      }

      const currentUid = auth.currentUser?.uid;
      if (!currentUid) {
        if (!isCancelled) {
          setProjects([]);
          setCurrentRole(null);
          setError("No authenticated user found.");
          setLoading(false);
        }
        return;
      }

      try {
        const employeeRef = doc(
          db,
          "businesses",
          businessId,
          "Employees",
          currentUid,
        );
        const employeeSnap = await getDoc(employeeRef);

        if (!employeeSnap.exists()) {
          if (!isCancelled) {
            setProjects([]);
            setCurrentRole(null);
            setError("Employee record not found.");
          }
          return;
        }

        const role = employeeSnap.data().role;
        let projectQuery;

        setCurrentRole(role);

        if (role === "owner") {
          projectQuery = query(
            collection(db, "businesses", businessId, "Projects"),
            orderBy("updatedAt", "desc"),
          );
        } else if (role === "mechanic") {
          projectQuery = query(
            collection(db, "businesses", businessId, "Projects"),
            where("assignedMechanicId", "array-contains", currentUid),
            orderBy("updatedAt", "desc"),
          );
        } else {
          if (!isCancelled) {
            setProjects([]);
          }
          return;
        }

        const snap = await getDocs(projectQuery);
        const projectList = snap.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));

        if (!isCancelled) {
          setProjects(projectList);
        }
      } catch (err) {
        if (!isCancelled) {
          console.error("Failed to load projects:", err);
          setProjects([]);
          setCurrentRole(null);
          setError(err.message || "Failed to load projects.");
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    loadProjects();

    return () => {
      isCancelled = true;
    };
  }, [businessId, enabled, refreshTick]);

  return {
    projects,
    loading,
    error,
    currentRole,
    refreshProjects,
  };
}
