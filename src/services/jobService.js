import { db } from "/src/firebase.js";
import {
  getDocs,
  getDoc,
  doc,
  collection,
  collectionGroup,
  orderBy,
  query,
  where,
  limit,
} from "firebase/firestore";

export async function fetchBusinessContextByUid(userUid) {
  const ownerSnap = await getDocs(
    query(collection(db, "businesses"), where("uid", "==", userUid), limit(1))
  );

  if (!ownerSnap.empty) {
    return { businessId: ownerSnap.docs[0].id, role: "owner" };
  }

  // Fallback 1: employee membership lookup across Employees subcollections.
  try {
    const employeeSnap = await getDocs(
      query(
        collectionGroup(db, "Employees"),
        where("uid", "==", userUid),
        limit(1)
      )
    );

    if (!employeeSnap.empty) {
      const employeeDoc = employeeSnap.docs[0];
      const data = employeeDoc.data();
      const pathParts = employeeDoc.ref.path.split("/");
      return {
        businessId: data.businessId || pathParts[1] || null,
        role: data.role || null,
      };
    }
  } catch (err) {
    // If collectionGroup rules deny this query shape, continue to explicit lookup.
    if (err?.code !== "permission-denied") throw err;
  }

  // Fallback 2: scan businesses and check the self employee document directly.
  const businessesSnap = await getDocs(collection(db, "businesses"));

  for (const businessDoc of businessesSnap.docs) {
    try {
      const employeeRef = doc(db, "businesses", businessDoc.id, "Employees", userUid);
      const employeeDoc = await getDoc(employeeRef);

      if (employeeDoc.exists()) {
        const data = employeeDoc.data();
        return {
          businessId: data.businessId || businessDoc.id,
          role: data.role || null,
        };
      }
    } catch (err) {
      if (err?.code !== "permission-denied") throw err;
    }
  }

  return { businessId: null, role: null };
}

export async function fetchBusinessIdByUid(userUid) {
  const ctx = await fetchBusinessContextByUid(userUid);
  return ctx.businessId;
}

function toMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (typeof value.seconds === "number") return value.seconds * 1000;
  return 0;
}

export async function fetchProjectsForContext({ businessId, role, userUid }) {
  if (!businessId) return [];
  if (role === "pendingApproval") return [];

  let projectsQuery;

  if (role === "mechanic") {
    projectsQuery = query(
      collection(db, "businesses", businessId, "Projects"),
      where("assignedMechanicId", "array-contains", userUid)
    );
  } else {
    projectsQuery = query(collection(db, "businesses", businessId, "Projects"));
  }

  const snap = await getDocs(projectsQuery);

  const projects = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  projects.sort((a, b) => toMillis(b.updatedAt) - toMillis(a.updatedAt));

  return projects;
}

export async function fetchProjectsByBusinessId(businessId) {
  if (!businessId) return [];

  const snap = await getDocs(
    query(
      collection(db, "businesses", businessId, "Projects"),
      orderBy("updatedAt", "desc")
    )
  );

  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

export function mapProjectToJob(project) {
  return {
    id: project.id,
    title: project.title || "Untitled Job",
    carReg: project.carLabel || "-",
    status: project.status || "pending",
    inHouse: project.outHouse === true ? false : true,
  };
}

