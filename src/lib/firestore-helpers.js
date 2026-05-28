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

// Handles Errors
async function withErrorHandling(fn, defaultReturn, errorMessage = "Firestore error: ") {
    try {
        return await fn();
    } catch (error) {
        console.error(errorMessage, error);
        return defaultReturn;
    }
}

// Extract name from various field names
export function extractName(data, inputField) {
  return data?.[inputField] || null;
}

// Extract timestamp from various field names
export function extractTimeStamp(data, inputField) {
  return data?.[inputField] || null;
}

// Extract isActive from various field names
export function extractIsActive(data, inputField) {
  return data?.[inputField] || null;
}

// Convert timestamp to Milliseconds
export function convertTimestampToMillis(timestamp) {
  const convertedTimeStamp = 
  timestamp ? 
  (timestamp.toMillis ? timestamp.toMillis() : timestamp.getTime()) 
  : null;
  
  return convertedTimeStamp;
}

// Formatting helpers used across the details and logs UI.
export function formatTimestamp(timestamp) {
  if (!timestamp) return "-";
  if (timestamp.toDate) return timestamp.toDate().toLocaleString();
  return String(timestamp);
}

export function formatWorkDate(timestamp) {
  if (!timestamp) return "-";
  if (timestamp.toDate) return timestamp.toDate().toLocaleDateString();
  return String(timestamp);
}

// export function getTotalMinutes() {
  //   return timeLogs.reduce((sum, log) => sum + (Number(log.minutes) || 0), 0);
  // }
  
export function formatTotalMinutes(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

export function formatTimer(seconds) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  return [hrs, mins, secs]
  .map((value) => String(value).padStart(2, "0"))
  .join(":");
}

// ══════════════════════════════════════════════════════════════════════════════
// SPECIFIC HELPERS - have custom ordering or filter logic
// ══════════════════════════════════════════════════════════════════════════════

export async function fetchBusinessId(userUid) {
  return withErrorHandling(
    async () => {
      const snap = await getDocs(
        query(
          collection(db, "businesses"),
          where("uid", "==", userUid)
        ),
      );
      if (snap.empty) return null;
      return snap.docs[0].id;
    },
    [],
    "Failed fetching business"
  );
}
  export async function fetchVehiclesByCustomer(businessId, customerId) {
  return withErrorHandling(
    async () => {
      const snap = await getDocs(
        query(
          collection(db, "businesses", businessId, "Vehicle"),
          where("customerId", "==", customerId),
          orderBy("createdAt", "desc")
        )
      );
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    },
    [],
    "Failed fetching customer vehicles:"
  );
}

export async function fetchProjectTimerState(businessId, projectId) {
  return withErrorHandling(
    async () => {
      const started = convertTimestampToMillis(fetchProjectTimerStartedAt(businessId, projectId));
      const paused = convertTimestampToMillis(fetchProjectTimerPausedAt(businessId, projectId));
      const active = fetchProjectIsActive(projectId, businessId);
      return { timerStartedAt: started, timerPausedAt: paused, isActive: active};
    },
    null,
    "Error loading timer state:"
  );
}

export async function updateProjectTimerState(businnessId, projectId, updates) {
  return withErrorHandling (
    async () => {
      const projectRef = doc(db, "businesses", businnessId, "Projects", projectId);
      await updateDoc(projectRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });
    },
    undefined,
    "Error updating timer state:"
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// CREATE
// ══════════════════════════════════════════════════════════════════════════════

// Generic function to create a new document
async function createDocument(businessId, insertionPath, values) {
  return withErrorHandling (
    async () => {
      const path = Array.isArray(insertionPath) ? insertionPath : [insertionPath];
      const docRef = collection(db, "businesses", businessId, ...path);
      await addDoc(docRef, {
        ...values
      });
      return true;
    },
    undefined,
    "Error creating document"
  );
}

export async function createCustomer(businessId, values) {
  return await createDocument(businessId, "Customers", values)
}

export async function createVehicle(businessId, values) {
  return await createDocument(businessId, "Vehicles", values);
}

export async function createProject(businessId, values) {
  return await createDocument(businessId, "Projects", values);
}

export async function createProjectTimelog(businessId, projectId, values) {
  return await createDocument(businessId, ["Projects", projectId, "TimeLogs"], values);
}

export async function createProjectNotes(businessId, projectId, values) {
  return await createDocument(businessId, ["Projects", projectId, "Notes"], values);
}

// ══════════════════════════════════════════════════════════════════════════════
// RETRIEVE
// ══════════════════════════════════════════════════════════════════════════════

// Generic function to fetch a single document by ID from a subcollection
async function fetchDocumentDetail(bussinessId, collectionId, docId) {
  return withErrorHandling(
    async () => {
      const docRef = doc(db, "businesses", bussinessId, collectionId, docId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() };
      }
      return null;
    },
    {},
    `Error fetching document from ${collectionId}:`,
  );
}

export async function fetchEmployeeDetail(businessId, employeeId) {
  return await fetchDocumentDetail(businessId, "Employees", employeeId);
}

export async function fetchCustomerDetail(businessId, customerId) {
    return await fetchDocumentDetail(businessId, "Customers", customerId);
}

export async function fetchVehicleDetail(businessId, vehicleId) {
    return await fetchDocumentDetail(businessId, "Vehicles", vehicleId);
}

export async function fetchProjectDetail(businessId, projectId) {
  return await fetchDocumentDetail(businessId, "Projects", projectId);
}

export async function fetchProjectTimerStartedAt(businessId, projectId) {
  return extractTimeStamp(await fetchDocumentDetail(businessId, "Projects", projectId), "timerStartedAt");
}

export async function fetchProjectTimerPausedAt(businessId, projectId) {
  return extractTimeStamp(await fetchDocumentDetail(businessId, "Projects", projectId), "timerPausedAt");
}

export async function fetchProjectIsActive(businessId, projectId) {
  return extractIsActive(await fetchDocumentDetail(businessId, "Projects", projectId), "isActive");
}

export async function fetchMechanics(businessId) {
  return withErrorHandling (
    async () => {
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
        name: employee.Name || "Unknown",
      }));
    },
    [],
    "Failed fetching employees:"
  );
}

// Generic function to fetch multiple documents by ID from a subcollection
async function fetchMultipleDocuments(businessId, collectionPath) {
  return withErrorHandling(
    async () => {
      const projectsRef = await getDocs(collection(db, "businesses", businessId, collectionPath));
      return projectsRef.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  },
  [],
  `Error fetching multiple documents from ${collectionPath}:`
);
}

export async function fetchCustomers(businessId) {
  return await fetchMultipleDocuments(businessId, "Customers");
}

export async function fetchVehicles(businessId) {
  return await fetchMultipleDocuments(businessId, "Vehicles");
}

export async function fetchProjects(businessId) {
  return await fetchMultipleDocuments(businessId, "Projects");
}

export async function fetchEmployees(businessId) {
  return await fetchMultipleDocuments(businessId, "Employees");
}

// Generic function to fetch multiple documents by a filter.
async function fetchProjectsByFilter(businessId, filterField, filterValue) {
  return withErrorHandling(
    async () => {
      const projectsRef = collection(db, "businesses", businessId, "Projects");
      const q = query(projectsRef, where(filterField, "==", filterValue));
      const snap = await getDocs(q);
      return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    },
    [],
    "Error fetching projects by filter:"
  );
}

export async function fetchRelatedProjectsByCustomer(businessId, customerId) {
    return fetchProjectsByFilter(businessId, "customerId", customerId);
}

export async function fetchRelatedProjectsByVehicle(businessId, vehicleId) {
    return fetchProjectsByFilter(businessId, "vehicleId", vehicleId);
}

// Generic function to check if a customer or vehicle has an active job
async function checkHasJobActive(businessId, filterField, filterValue) {
  return withErrorHandling(
    async () => {
      const projectsRef = collection(db, "businesses", businessId, "Projects");
      const q = query(
        projectsRef,
        where(filterField, "==", filterValue),
        where("isActive", "==", true)
      );
      const snap = await getDocs(q);
    
      return snap.size > 0;
    },
    [],
    "Error fetching for projects:"
  );
}

export async function checkHasActiveJobVehicle(businessId, vehicleId) {
    return checkHasJobActive(businessId, "vehicleId", vehicleId);
}

export async function checkHasActiveJobCustomer(businessId, customerId) {
    return checkHasJobActive(businessId, "customerId", customerId);
}

// Generic function to sum TimeLogs across projects
async function fetchProjectTimeLogs(businessId, filterField, filterValue) {
  return withErrorHandling(
    async () => {
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
    },
    {},
    "Error fetching multiple time logs:",

  );
}

export async function fetchTotalTimeLogsCustomer(businessId, customerId) {
  return fetchProjectTimeLogs(businessId, "customerId", customerId);
}

export async function fetchTotalTimeLogsVehicle(businessId, vehicleId) {
  return fetchProjectTimeLogs(businessId, "vehicleId", vehicleId);
}

// String format versions (for backward compatibility)
export async function fetchTotalHoursCustomer(businessId, customerId) {
  const { hours, minutes } = await fetchProjectTimeLogs(businessId, "customerId", customerId);
  return `${hours}h ${minutes}m`;
}

export async function fetchTotalHoursVehicle(businessId, vehicleId) {
  const { hours, minutes } = await fetchProjectTimeLogs(businessId, "vehicleId", vehicleId);
  return `${hours}h ${minutes}m`;
}

// ══════════════════════════════════════════════════════════════════════════════
// UPDATE
// ══════════════════════════════════════════════════════════════════════════════

// Generic function to update value in specific document value, update === {name: "John Doe", isActive: true}
async function updateValue(businessId, collectionPath, docId, update) {
  return withErrorHandling(
    async () => {
      const path = Array.isArray(collectionPath) ? collectionPath : [collectionPath];
      const docRef = doc(db, "businesses", businessId, ...path, docId);
      await updateDoc(docRef, {
        ...update,
        updatedAt: serverTimestamp()
      });
      return true;
    },
    false,
    `Error updating ${JSON.stringify(update)}:` // Error updating {"name":"John Doe","isActive":true}:
  );
}

export async function updateEmployeeDetail(businessId, employeeId, update) {
  return await updateValue(businessId, "Employees", employeeId, update);
}

export async function updateCustomerValue(businessId, customerId, update) {
  return await updateValue(businessId,"Customers", customerId, update);
}

export async function updateVehicleValue(businessId, vehicleId, update) {
  return await updateValue(businessId,"Vehicle", vehicleId, update);
}

export async function updateProjectValue(businessId, projectId, update) {
  return await updateValue(businessId,"Projects", projectId, update);
}

export async function updateProjectTimelogValue(businessId, projectId, timeLogId, update) {
  return await updateValue(businessId, ["Projects", projectId, "TimeLogs"], timeLogId, update);
}

export async function updateProjectNoteValue(businessId, projectId, noteId, update) {
  return await updateValue(businessId, ["Projects", projectId, "Notes"], noteId, update);
}

// ══════════════════════════════════════════════════════════════════════════════
// DELETE
// ══════════════════════════════════════════════════════════════════════════════