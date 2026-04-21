import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { collection, doc, getDocs, getDoc, orderBy, query, where } from "firebase/firestore";
import { db } from "/src/firebase.js";

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}


// VEHICLE DATA
export const NHTSA = "https://vpic.nhtsa.dot.gov/api/vehicles";

export const VEHICLE_TYPES = [
  "Car",
  "Truck",
  "Motorcycle",
  "Van",
  "Bus",
  "RV",
  "Trailer",
  "Other",
];
export const COLORS = [
  "Black",
  "White",
  "Silver",
  "Grey",
  "Blue",
  "Red",
  "Green",
  "Yellow",
  "Orange",
  "Brown",
  "Gold",
  "Beige",
  "Purple",
  "Other",
];

const currentYear = new Date().getFullYear();

export const YEARS = Array.from({ length: currentYear - 1885 }, (_, i) =>
  String(currentYear - i),
);

// STATUS DATA
export const STATUS_OPTIONS = [
  { key: "pending", value: 0, label: "Pending", style: "bg-yellow-100 text-yellow-700 border border-yellow-200", aliases: ["pending"] },
  { key: "booking", value: 1, label: "Forward Booking", style: "bg-blue-100 text-blue-700 border border-blue-200", aliases: ["forward_booking","FB","Booked"] },
  { key: "inspection", value: 2, label: "Inspection", style: "bg-purple-100 text-purple-700 border border-purple-200", aliases: ["inspection","Inspect"] },
  { key: "waiting_for_parts", value: 3, label: "Waiting for Parts", style: "bg-pink-100 text-pink-700 border border-pink-200", aliases: ["wfp","waiting_for_parts","WFP","Waiting for parts"] },
  { key: "work_ready", value: 4, label: "Work Ready", style: "bg-orange-100 text-orange-700 border border-orange-200", aliases: ["work_ready","Work_Ready"] },
  { key: "wip", value: 5, label: "WIP", style: "bg-blue-100 text-blue-700 border border-blue-200", aliases: ["wip","work in progress","WIP","work_in_progress"] },
  { key: "complete", value: 6, label: "Complete", style: "bg-red-100 text-red-700 border border-red-200", aliases: ["complete","completed","done","finished","closed"] }
];

export function normalizeStatus(statusValue) {
  if (typeof statusValue === "number") return statusValue;
  return String(statusValue || "").trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

export function getStatusMeta(statusValue) {
  const normalized = normalizeStatus(statusValue);

  const found = STATUS_OPTIONS.find((opt) => {
    if (typeof normalized === "number") {
      return opt.value === normalized;
    }

    const normalizedKey = normalizeStatus(opt.key);
    if (normalized === normalizedKey) return true;

    const normalizedAliases = (opt.aliases || []).map((alias) =>
      normalizeStatus(alias),
    );

    return normalizedAliases.includes(normalized);
  });
  return found || { key: "unknown", label: "Unknown", style: "bg-gray-100 text-gray-700 border border-gray-200" };
}

export function statusStyle(status) {
  const meta = getStatusMeta(status);
  return { label: meta.label, style: meta.style, key: meta.key };
}

export function isWIPStatus(status) {
  return getStatusMeta(status).value === 5;
}

export function isCompleteStatus(status) {
  return getStatusMeta(status).value === 6;
}

// Firestore Helpers
export async function fetchBusinessId(userUid) {
  const snap = await getDocs(
    query(collection(db, "businesses"), where("uid", "==", userUid)),
  );
  if (snap.empty) return null;
  return snap.docs[0].id;
}

export async function fetchCustomers(businessId) {
  const snap = await getDocs(
    query(
      collection(db, "businesses", businessId, "Customers"),
      orderBy("name"),
    ),
  );
  return snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
}

export async function fetchVehicles(businessId) {
  const snap = await getDocs(
    query(
      collection(db, "businesses", businessId, "storage"),
      orderBy("createdAt", "desc"),
    ),
  );
  return snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
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
      name: employee.Name || employee.name || employee.email || employee.id,
    }));
}

export async function fetchEmployeeName(businessId, employeeId) {
  if (!employeeId) return null;

  const employeeRef = doc(
    db,
    "businesses",
    businessId,
    "Employees",
    employeeId,
  );
  const snap = await getDoc(employeeRef);

  if (!snap.exists()) return null;
  const employeeData = snap.data();
  return employeeData.Name || employeeData.name || null;
}