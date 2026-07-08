import { db } from "../firebase";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type Timestamp,
} from "firebase/firestore";
import type { WithId, Employee, Customer, Vehicle, Project } from "@/types/firestore";

type TimestampLike = Timestamp | Date | number | null | undefined;

// ══════════════════════════════════════════════════════════════════════════════
// UTILITY METHODS
// ══════════════════════════════════════════════════════════════════════════════

// Handles Errors
async function withErrorHandling<T>(
  fn: () => Promise<T>,
  defaultReturn: T,
  errorMessage = "Firestore error: ",
): Promise<T> {
    try {
        return await fn();
    } catch (error) {
        console.error(errorMessage, error);
        return defaultReturn;
    }
}

// Extract name from various field names
export function extractName(data: any, inputField: string): unknown {
  return data?.[inputField] || null;
}

// Extract timestamp from various field names
export function extractTimeStamp(data: any, inputField: string): unknown {
  return data?.[inputField] || null;
}

// Extract isActive from various field names
export function extractIsActive(data: any, inputField: string): unknown {
  return data?.[inputField] || null;
}

// Convert timestamp to Milliseconds
export function convertTimestampToMillis(timestamp: TimestampLike): number | null {
  if (!timestamp) return null;
  return typeof timestamp === "number"
    ? timestamp
    : ("toMillis" in timestamp ? timestamp.toMillis() : timestamp.getTime());
}

// Formatting helpers used across the details and logs UI.
export function formatTimestamp(timestamp: Timestamp | null | undefined): string {
  if (!timestamp) return "-";
  if (timestamp.toDate) return timestamp.toDate().toLocaleString();
  return String(timestamp);
}

export function formatWorkDate(timestamp: Timestamp | null | undefined): string {
  if (!timestamp) return "-";
  if (timestamp.toDate) return timestamp.toDate().toLocaleDateString();
  return String(timestamp);
}

// export function getTotalMinutes() {
  //   return timeLogs.reduce((sum, log) => sum + (Number(log.minutes) || 0), 0);
  // }

export function formatTotalMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

export function formatTimer(seconds: number): string {
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

export async function fetchBusinessId(userUid: string): Promise<string | null> {
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
    null,
    "Failed fetching business"
  );
}
  export async function fetchVehiclesByCustomer(businessId: string, customerId: string): Promise<WithId<Vehicle>[]> {
  return withErrorHandling(
    async () => {
      const snap = await getDocs(
        query(
          collection(db, "businesses", businessId, "Vehicles"),
          where("customerId", "==", customerId),
          orderBy("createdAt", "desc")
        )
      );
      return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as WithId<Vehicle>[];
    },
    [],
    "Failed fetching customer vehicles:"
  );
}

export async function fetchProjectTimerState(businessId: string, projectId: string) {
  return withErrorHandling(
    async () => {
      const started = convertTimestampToMillis(await fetchProjectTimerStartedAt(businessId, projectId) as TimestampLike);
      const paused = convertTimestampToMillis(await fetchProjectTimerPausedAt(businessId, projectId) as TimestampLike);
      const active = await fetchProjectIsActive(businessId, projectId);
      return { timerStartedAt: started, timerPausedAt: paused, isActive: active};
    },
    null,
    "Error loading timer state:"
  );
}

export async function updateProjectTimerState(businnessId: string, projectId: string, updates: Partial<Project>): Promise<void | undefined> {
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

// Generic function to create a new document. Returns the new document's id on
// success (truthy, so callers can still branch on it), or null on failure.
async function createDocument(businessId: string, insertionPath: string | string[], values: Record<string, unknown>): Promise<string | null> {
  return withErrorHandling(
    async () => {
      const path = Array.isArray(insertionPath) ? insertionPath : [insertionPath];
      const docRef = collection(db, "businesses", businessId, ...path);
      const created = await addDoc(docRef, {
        ...values
      });
      return created.id;
    },
    null,
    "Error creating document"
  );
}

// Note: write payloads use Record<string, unknown> rather than Partial<Customer>
// etc. because callers pass Firestore sentinels (serverTimestamp()'s FieldValue)
// for timestamp fields, which don't structurally match the read-side Timestamp type.
export async function createCustomer(businessId: string, values: Record<string, unknown>) {
  return await createDocument(businessId, "Customers", values)
}

export async function createVehicle(businessId: string, values: Record<string, unknown>) {
  return await createDocument(businessId, "Vehicles", values);
}

export async function createProject(businessId: string, values: Record<string, unknown>) {
  return await createDocument(businessId, "Projects", values);
}

export async function createProjectTimelog(businessId: string, projectId: string, values: Record<string, unknown>) {
  return await createDocument(businessId, ["Projects", projectId, "TimeLogs"], values);
}

export async function createProjectNotes(businessId: string, projectId: string, values: Record<string, unknown>) {
  return await createDocument(businessId, ["Projects", projectId, "Notes"], values);
}

// ══════════════════════════════════════════════════════════════════════════════
// RETRIEVE
// ══════════════════════════════════════════════════════════════════════════════

// Generic function to fetch a single document by ID from a subcollection
async function fetchDocumentDetail<T = Record<string, unknown>>(bussinessId: string, collectionId: string, docId: string): Promise<WithId<T> | null> {
  return withErrorHandling(
    async () => {
      const docRef = doc(db, "businesses", bussinessId, collectionId, docId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() } as WithId<T>;
      }
      return null;
    },
    null,
    `Error fetching document from ${collectionId}:`,
  );
}

export async function fetchEmployeeDetail(businessId: string, employeeId: string) {
  return await fetchDocumentDetail<Employee>(businessId, "Employees", employeeId);
}

export async function fetchCustomerDetail(businessId: string, customerId: string) {
    return await fetchDocumentDetail<Customer>(businessId, "Customers", customerId);
}

export async function fetchVehicleDetail(businessId: string, vehicleId: string) {
    return await fetchDocumentDetail<Vehicle>(businessId, "Vehicles", vehicleId);
}

export async function fetchProjectDetail(businessId: string, projectId: string) {
  return await fetchDocumentDetail<Project>(businessId, "Projects", projectId);
}

export async function fetchProjectTimerStartedAt(businessId: string, projectId: string) {
  return extractTimeStamp(await fetchDocumentDetail<Project>(businessId, "Projects", projectId), "timerStartedAt");
}

export async function fetchProjectTimerPausedAt(businessId: string, projectId: string) {
  return extractTimeStamp(await fetchDocumentDetail<Project>(businessId, "Projects", projectId), "timerPausedAt");
}

export async function fetchProjectIsActive(businessId: string, projectId: string) {
  return extractIsActive(await fetchDocumentDetail<Project>(businessId, "Projects", projectId), "isActive");
}

export async function fetchMechanics(businessId: string): Promise<{ id: string; name: string }[]> {
  return withErrorHandling (
    async () => {
      const snap = await getDocs(
        collection(db, "businesses", businessId, "Employees"),
      );

      return snap.docs
      .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as WithId<Employee> & { Name?: string })
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
async function fetchMultipleDocuments<T = Record<string, unknown>>(businessId: string, collectionPath: string): Promise<WithId<T>[]> {
  return withErrorHandling(
    async () => {
      const projectsRef = await getDocs(collection(db, "businesses", businessId, collectionPath));
      return projectsRef.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as WithId<T>[];
  },
  [],
  `Error fetching multiple documents from ${collectionPath}:`
);
}

export async function fetchCustomers(businessId: string) {
  return await fetchMultipleDocuments<Customer>(businessId, "Customers");
}

export async function fetchVehicles(businessId: string) {
  return await fetchMultipleDocuments<Vehicle>(businessId, "Vehicles");
}

export async function fetchProjects(businessId: string) {
  return await fetchMultipleDocuments<Project>(businessId, "Projects");
}

export async function fetchEmployees(businessId: string) {
  return await fetchMultipleDocuments<Employee>(businessId, "Employees");
}

// Generic function to fetch multiple documents by a filter.
async function fetchProjectsByFilter(businessId: string, filterField: string, filterValue: unknown): Promise<WithId<Project>[]> {
  return withErrorHandling(
    async () => {
      const projectsRef = collection(db, "businesses", businessId, "Projects");
      const q = query(projectsRef, where(filterField, "==", filterValue));
      const snap = await getDocs(q);
      return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as WithId<Project>[];
    },
    [],
    "Error fetching projects by filter:"
  );
}

export async function fetchRelatedProjectsByCustomer(businessId: string, customerId: string) {
    return fetchProjectsByFilter(businessId, "customerId", customerId);
}

export async function fetchRelatedProjectsByVehicle(businessId: string, vehicleId: string) {
    return fetchProjectsByFilter(businessId, "vehicleId", vehicleId);
}

// Generic function to check if a customer or vehicle has an active job
async function checkHasJobActive(businessId: string, filterField: string, filterValue: unknown): Promise<boolean> {
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
    false,
    "Error fetching for projects:"
  );
}

export async function checkHasActiveJobVehicle(businessId: string, vehicleId: string) {
    return checkHasJobActive(businessId, "vehicleId", vehicleId);
}

export async function checkHasActiveJobCustomer(businessId: string, customerId: string) {
    return checkHasJobActive(businessId, "customerId", customerId);
}

// Generic function to sum TimeLogs across projects
async function fetchProjectTimeLogs(businessId: string, filterField: string, filterValue: unknown): Promise<{ totalMinutes: number; hours: number; minutes: number }> {
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
    { totalMinutes: 0, hours: 0, minutes: 0 },
    "Error fetching multiple time logs:",

  );
}

export async function fetchTotalTimeLogsCustomer(businessId: string, customerId: string) {
  return fetchProjectTimeLogs(businessId, "customerId", customerId);
}

export async function fetchTotalTimeLogsVehicle(businessId: string, vehicleId: string) {
  return fetchProjectTimeLogs(businessId, "vehicleId", vehicleId);
}

// String format versions (for backward compatibility)
export async function fetchTotalHoursCustomer(businessId: string, customerId: string): Promise<string> {
  const { hours, minutes } = await fetchProjectTimeLogs(businessId, "customerId", customerId);
  return `${hours}h ${minutes}m`;
}

export async function fetchTotalHoursVehicle(businessId: string, vehicleId: string): Promise<string> {
  const { hours, minutes } = await fetchProjectTimeLogs(businessId, "vehicleId", vehicleId);
  return `${hours}h ${minutes}m`;
}

// ══════════════════════════════════════════════════════════════════════════════
// UPDATE
// ══════════════════════════════════════════════════════════════════════════════

// Generic function to update value in specific document value, update === {name: "John Doe", isActive: true}
async function updateValue(businessId: string, collectionPath: string | string[], docId: string, update: Record<string, unknown>): Promise<boolean> {
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

export async function updateEmployeeDetail(businessId: string, employeeId: string, update: Partial<Employee>) {
  return await updateValue(businessId, "Employees", employeeId, update);
}

export async function updateCustomerValue(businessId: string, customerId: string, update: Partial<Customer>) {
  return await updateValue(businessId,"Customers", customerId, update);
}

export async function updateVehicleValue(businessId: string, vehicleId: string, update: Partial<Vehicle>) {
  return await updateValue(businessId,"Vehicles", vehicleId, update);
}

export async function updateProjectValue(businessId: string, projectId: string, update: Partial<Project>) {
  return await updateValue(businessId,"Projects", projectId, update);
}

export async function updateProjectTimelogValue(businessId: string, projectId: string, timeLogId: string, update: Record<string, unknown>) {
  return await updateValue(businessId, ["Projects", projectId, "TimeLogs"], timeLogId, update);
}

export async function updateProjectNoteValue(businessId: string, projectId: string, noteId: string, update: Record<string, unknown>) {
  return await updateValue(businessId, ["Projects", projectId, "Notes"], noteId, update);
}

// ══════════════════════════════════════════════════════════════════════════════
// DELETE
// ══════════════════════════════════════════════════════════════════════════════
