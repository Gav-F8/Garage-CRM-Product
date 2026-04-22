import { db } from "/src/firebase.js";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";

// ══════════════════════════════════════════════════════════════════════════════
// UTILITY METHODS
// ══════════════════════════════════════════════════════════════════════════════

// Extract name from various field names
function extractName(data) {
    return data?.Name || data?.name || data?.email || null;
}

// Handles Errors
async function withErrorHandling(fn, defaultReturn) {
    try {
        return await fn();
    } catch (error) {
        console.error("Firestore error:", error);
        return defaultReturn;
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// SPECIFIC HELPERS - have custom ordering or filter logic
// ══════════════════════════════════════════════════════════════════════════════

export async function fetchBusinessId(userUid) {
  const snap = await getDocs(
    query(collection(db, "businesses"), where("uid", "==", userUid)),
  );
  if (snap.empty) return null;
  return snap.docs[0].id;
}

export async function fetchCustomers(businessId) {
    return withErrorHandling(
        async () => {
            const snap = await getDocs(
                query(
                    collection(db, "businesses", businessId, "Customers"),
                    orderBy("name"),
                ),
            );
            return snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
        },
        []
    );
}

export async function fetchMechanics(businessId) {
  const snap = await getDocs(
    collection(db, "businesses", businessId, "Employees"),
  );

  return snap.docs
  .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
    .filter((employee) => {
      const role = String(employee.role || "").toLowerCase();
      const status = String(employee.status || "active").toLowerCase();
      return (role === "mechanic" || role === "owner") && status !== "rejected";
    })
    .map((employee) => ({
      id: employee.id,
      name: extractName(employee),
    }));
}

export async function fetchStorage(businessId) {
  const snap = await getDocs(
    query(
      collection(db, "businesses", businessId, "storage"),
      orderBy("createdAt", "desc"),
    ),
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function fetchVehiclesByCustomer(businessId, customerId) {
  try {
    const snap = await getDocs(
      query(
        collection(db, "businesses", businessId, "storage"),
        where("customerId", "==", customerId),
        orderBy("createdAt", "desc")
      )
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error("Error fetching customer vehicles:", error);
    return [];
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// GENERIC HELPERS
// ══════════════════════════════════════════════════════════════════════════════

// Generic function to fetch a single document by ID from a subcollection
async function fetchDocumentDetail(bussinessId, collectionId, docId) {
    try {
        const docRef = doc(db, "businesses", bussinessId, collectionId, docId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
            return { id: snap.id, ...snap.data() };
        }
        return null;
    } catch (error) {
        console.error(`Error fetching ${collectionId} detail:`, error);
        return null;
    }
}

export async function fetchCustomerDetail(businessId, customerId) {
    return fetchDocumentDetail(businessId, "Customers", customerId);
}

export async function fetchVehicleDetail(businessId, vehicleId) {
    return fetchDocumentDetail(businessId, "storage", vehicleId);
}

export async function fetchProjectDetail(businessId, projectId) {
  return fetchDocumentDetail(businessId, "Projects", projectId);
}

export async function fetchCustomerName(businessId, customerId) {
  return extractName(await fetchDocumentDetail(businessId, "Customers", customerId));
}

export async function fetchEmployeeName(businessId, employeeId) {
  return extractName(await fetchDocumentDetail(businessId, "Employees", employeeId));
}

// Generic function to fetch multiple documents by ID from a subcollection
async function fetchMultipleDocuments(businessId, collectionPath, docIds) {
  try {
    const promises = docIds.map((docId) =>
      getDoc(doc(db, "businesses", businessId, collectionPath, docId))
    );
    
    const snaps = await Promise.all(promises);
    return snaps
      .filter((snap) => snap.exists())
      .map((snap) => ({ id: snap.id, ...snap.data() }));
  } catch (error) {
    console.error("Error fetching multiple documents:", error);
    return [];
  }
}

export async function fetchCustomersByIds(businessId, customerIds) {
    return fetchMultipleDocuments(businessId, "Customers", customerIds)
}

export async function fetchVehicles(businessId, vehicleIds) {
    return fetchMultipleDocuments(businessId, "storage", vehicleIds)
}

export async function fetchProjectsByIds(businessId, projectIds) {
    return fetchMultipleDocuments(businessId, "Projects", projectIds);
}

export async function fetchEmployeesByIds(businessId, mechanicIds) {
  return fetchMultipleDocuments(businessId, "Employees", mechanicIds);
}

async function fetchProjectsByFilter(businessId, filterField, filterValue) {
  try {
    const projectsRef = collection(db, "businesses", businessId, "Projects");
    const q = query(projectsRef, where(filterField, "==", filterValue));
    const snap = await getDocs(q);
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error fetching projects by ${filterField}:", error);
        return [];
    }
}

export async function fetchRelatedProjectsByCustomer(businessId, customerId) {
    return fetchProjectsByFilter(businessId, "customerId", customerId);
}

export async function fetchRelatedProjectsByVehicle(businessId, vehicleId) {
    return fetchProjectsByFilter(businessId, "carId", vehicleId);
}

// Generic function to check if a customer or vehicle has an active job
async function checkHasJobActive(businessId, filterField, filterValue) {
    try {
    const projectsRef = collection(db, "businesses", businessId, "Projects");
    const q = query(
      projectsRef,
      where(filterField, "==", filterValue),
      where("isActive", "==", true)
    );
    const snap = await getDocs(q);

    return snap.size > 0;
  } catch (error) {
    console.error("Error checking for jobs:", error);
    return false;
  }
}

export async function checkHasActiveJobVehicle(businessId, storageId) {
    return checkHasJobActive(businessId, "carId", storageId);
}

export async function checkHasActiveJobCustomer(businessId, customerId) {
    return checkHasJobActive(businessId, "customerId", customerId);
}


// Generic function to sum TimeLogs across projects
async function fetchProjectTimeLogs(businessId, filterField, filterValue) {
  try {
    const projectsRef = collection(db, "businesses", businessId, "Projects");
    const q = query(projectsRef, where(filterField, "==", filterValue));
    const snap = await getDocs(q);

    const timeLogsPromises = snap.docs.map((projectDoc) => 
        getDocs(
            collection(
                db,
                "businesses",
                businessId,
                "Projects",
                projectDoc.id,
                "TimeLogs",
            )
        )
      );
      const allTimeLogsSnaps = await Promise.all(timeLogsPromises);

      let totalMinutes = 0;
      allTimeLogsSnaps.forEach((timeLogsSnap) => {
        timeLogsSnap.docs.forEach((timeLogDoc) => {
            const minutes = timeLogDoc.data().minutes;
            if (minutes) totalMinutes += minutes;
        });
      });

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return { totalMinutes, hours, minutes };
  } catch (error) {
    console.error("Error fetching time logs:", error);
    return { totalMinutes: 0, hours: 0, minutes: 0 };
  }
}

export async function fetchTotalTimeLogsCustomer(businessId, customerId) {
  return fetchProjectTimeLogs(businessId, "customerId", customerId);
}

export async function fetchTotalTimeLogsVehicle(businessId, storageId) {
  return fetchProjectTimeLogs(businessId, "carId", storageId);
}

// String format versions (for backward compatibility)
export async function fetchTotalHoursCustomer(businessId, customerId) {
  const { hours, minutes } = await fetchProjectTimeLogs(businessId, "customerId", customerId);
  return `${hours}h ${minutes}m`;
}

export async function fetchTotalHoursVehicle(businessId, storageId) {
  const { hours, minutes } = await fetchProjectTimeLogs(businessId, "carId", storageId);
  return `${hours}h ${minutes}m`;
}