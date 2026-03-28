// StoragePage
// ├── Header (title + "Create Storage Item" button)
// ├── Search bar (visible when list has items)
// ├── Storage list  ← reads from Firestore
// └── CreateModal   ← writes to Firestore, updates list on success
// ─────────────────────────────────────────────────────────────────────────────
// NHTSA vPIC API  — free, no key required
// Docs: https://vpic.nhtsa.dot.gov/api/
//
// Endpoints used:
//   GET /vehicles/GetAllMakes?format=json
//   GET /vehicles/GetModelsForMake/{make}?format=json
//   GET /vehicles/DecodeVin/{vin}?format=json
// ─────────────────────────────────────────────────────────────────────────────
// FIRESTORE DATA STRUCTURE — storage/{auto-id}
// ─────────────────────────────────────────────────────────────────────────────
// {
//   type:        string          // "car", "truck", "motorcycle", etc.
//   customerId:  string | null   // ref to customers/{id}
//   plate:       string          // required
//   make:        string          // from NHTSA
//   model:       string          // from NHTSA
//   year:        number
//   color:       string | null
//   vin:         string | null   // 17-char VIN
//   mileage:     number | null   // odometer in km
//   notes:       string | null
//   createdAt:   Timestamp
//   updatedAt:   Timestamp
// }
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "/src/firebase.js";
import {
  addDoc,
  getDocs,
  getDoc,
  doc,
  collection,
  serverTimestamp,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { NavigationBar } from "/src/components/NavigationBar.jsx";
import { notionClasses } from "/src/lib/notion-theme";

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────
const NHTSA = "https://vpic.nhtsa.dot.gov/api/vehicles";

const VEHICLE_TYPES = ["Car", "Truck", "Motorcycle", "Van", "Bus", "RV", "Trailer", "Other"];
const COLORS = ["Black","White","Silver","Grey","Blue","Red","Green","Yellow","Orange","Brown","Gold","Beige","Purple","Other"];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: currentYear - 1980 }, (_, i) => String(currentYear - i));

const BLANK = {
  type: "",
  customerId: "",
  plate: "",
  make: "",
  model: "",
  year: "",
  color: "",
  vin: "",
  mileage: "",
  notes: "",
};

// ─────────────────────────────────────────────────────────────
// Firestore Helpers
// ─────────────────────────────────────────────────────────────

async function fetchBusinessId(userUid) {
  const snap = await getDocs(
    query(collection(db, "businesses"), where("uid", "==", userUid))
  );
  if (snap.empty) return null;
  return snap.docs[0].id;
}

async function fetchEmployeeName(businessId, employeeId) {
  try {
    console.log("Fetching employee name for:", businessId, employeeId);
    
    // Try to get the employee document directly using the ID
    const employeeRef = doc(db, "businesses", businessId, "Employees", employeeId);
    const snap = await getDoc(employeeRef);
    
    console.log("Employee document exists:", snap.exists());
    const data = snap.data();
    console.log("Employee document data:", data);
    
    if (snap.exists() && data) {
      // Try both "Name" (capitalized) and "name" (lowercase)
      const name = data.Name || data.name;
      if (name) {
        console.log("Found employee name:", name);
        return name;
      }
    }
    
    console.warn(`Employee ${employeeId} not found or has no name`);
    return null;
  } catch (error) {
    console.error("Error fetching employee name:", error);
    return null;
  }
}

async function fetchStorage(businessId) {
  const snap = await getDocs(
    query(
      collection(db, "businesses", businessId, "storage"),
      orderBy("createdAt", "desc")
    )
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function fetchCustomers(businessId) {
  const snap = await getDocs(
    query(
      collection(db, "businesses", businessId, "Customers"),
      orderBy("name")
    )
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function checkHasJob(businessId, storageId, customerId) {
  try {
    // Query Projects collection to see if any project references this storage or customer
    const projectsRef = collection(db, "businesses", businessId, "Projects");
    const q = query(projectsRef);
    const snap = await getDocs(q);
    
    // Check if any project matches the storageId or customerId AND has "active" status
    for (const doc of snap.docs) {
      const projectData = doc.data();
      // Debug logging
      if (projectData.vehicleId === storageId || projectData.customerId === customerId) {
        console.log(`Found project for storage ${storageId}:`, {
          projectId: doc.id,
          vehicleId: projectData.vehicleId,
          customerId: projectData.customerId,
          status: projectData.status
        });
      }
      if ((projectData.vehicleId === storageId || projectData.customerId === customerId) && 
          projectData.status === "active") {
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error("Error checking for jobs:", error);
    return false;
  }
}

async function fetchTotalHours(businessId, storageId, customerId) {
  try {
    const projectsRef = collection(db, "businesses", businessId, "Projects");
    const q = query(projectsRef);
    const snap = await getDocs(q);

    let totalMinutes = 0;
    for (const projectDoc of snap.docs) {
      const projectData = projectDoc.data();
      if (projectData.vehicleId === storageId || projectData.customerId === customerId) {
        // Fetch TimeLogs for this project
        const timeLogsRef = collection(db, "businesses", businessId, "Projects", projectDoc.id, "TimeLogs");
        const timeLogsSnap = await getDocs(timeLogsRef);
        
        for (const timeLogDoc of timeLogsSnap.docs) {
          const timeLogData = timeLogDoc.data();
          if (timeLogData.minutes) {
            totalMinutes += timeLogData.minutes;
          }
        }
      }
    }
    
    // Convert minutes to hours and minutes
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
  } catch (error) {
    console.error("Error fetching total hours:", error);
    return "0h 0m";
  }
}

async function createStorage(businessId, data) {
  const currentUserId = auth.currentUser?.uid || null;
  let employeeName = null;
  
  if (currentUserId) {
    employeeName = await fetchEmployeeName(businessId, currentUserId);
  }
  
  // Create carLabel by combining year, make, and model
  const carLabel = [data.year, data.make, data.model]
    .filter(Boolean)
    .join(" ");
  
  const ref = await addDoc(
    collection(db, "businesses", businessId, "storage"),
    {
      ...data,
      carLabel: carLabel || null,
      createdByEmployeeId: currentUserId,
      createdByEmployeeName: employeeName,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }
  );
  return ref.id;
}

// ─────────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────────
function validate(form) {
  const e = {};
  if (!form.customerId) e.customerId = "Customer is required";
  if (!form.type) e.type = "Vehicle type required";
  if (!form.plate.trim()) e.plate = "Plate required";
  if (!form.make) e.make = "Make required";
  if (!form.model) e.model = "Model required";
  if (!form.year) e.year = "Year required";
  if (form.vin && form.vin.replace(/\s/g, "").length !== 17)
    e.vin = "VIN must be 17 characters";
  if (form.mileage && isNaN(Number(form.mileage)))
    e.mileage = "Mileage must be a number";
  return e;
}

// ─────────────────────────────────────────────────────────────
// Create Button (shown when list is empty)
// ─────────────────────────────────────────────────────────────
function CreateButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="h-12 px-4 rounded-lg bg-[#37352F] hover:bg-[#474540] text-white text-sm font-medium shadow-sm transition-all"
    >
      + New Vehicle
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// Create Modal
// ─────────────────────────────────────────────────────────────
function CreateModal({ businessId, customers, onClose, onCreated }) {
  const [form, setForm] = useState(BLANK);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [makes, setMakes] = useState([]);
  const [models, setModels] = useState([]);
  const [vinMsg, setVinMsg] = useState(null);

  // Load makes once
  useEffect(() => {
    if (makes.length) return;
    fetch(`${NHTSA}/GetAllMakes?format=json`)
      .then(r => r.json())
      .then(d => setMakes(d.Results.map(m => m.Make_Name).sort()))
      .catch(() => {});
  }, []);

  // Load models when make changes
  useEffect(() => {
    if (!form.make) return setModels([]);
    fetch(`${NHTSA}/GetModelsForMake/${encodeURIComponent(form.make)}?format=json`)
      .then(r => r.json())
      .then(d => setModels(d.Results.map(m => m.Model_Name).sort()))
      .catch(() => {});
  }, [form.make]);

  const setField = (name, value) => {
    setForm(p => ({ ...p, [name]: value }));
    setErrors(p => ({ ...p, [name]: null }));
  };

  const decodeVin = async () => {
    const vin = form.vin.trim();
    if (vin.length !== 17) {
      setVinMsg({ type: "err", text: "VIN must be 17 characters" });
      return;
    }

    try {
      const res = await fetch(`${NHTSA}/DecodeVin/${vin}?format=json`);
      const data = await res.json();
      const get = v => data.Results.find(r => r.Variable === v)?.Value || "";

      const make = get("Make");
      const model = get("Model");
      const year = get("Model Year");

      if (make && model && year) {
        setForm(p => ({
          ...p,
          make: make.toUpperCase(),
          model,
          year,
        }));
        setVinMsg({ type: "ok", text: `${year} ${make} ${model}` });
      } else {
        setVinMsg({ type: "err", text: "Could not decode VIN" });
      }
    } catch {
      setVinMsg({ type: "err", text: "VIN decode failed" });
    }
  };

  const handleSubmit = async () => {
  const e = validate(form);
  if (Object.keys(e).length) return setErrors(e);

  setSaving(true);
  try {
    const currentUserId = auth.currentUser?.uid || null;
    let employeeName = null;
    
    if (currentUserId) {
      employeeName = await fetchEmployeeName(businessId, currentUserId);
    }

    const cleanData = {
      ...form,
      plate: form.plate.trim().toUpperCase(),
      year: Number(form.year),
      mileage: form.mileage ? Number(form.mileage) : null,
      vin: form.vin.trim() || null,
      customerId: form.customerId || null,
    };

    const id = await createStorage(businessId, cleanData);
    
    // Create carLabel for display
    const carLabel = [cleanData.year, cleanData.make, cleanData.model]
      .filter(Boolean)
      .join(" ");

    onCreated({ 
      id, 
      ...cleanData,
      carLabel: carLabel || null,
      createdByEmployeeId: currentUserId,
      createdByEmployeeAcc: employeeName,
    });
    onClose();
  } catch (err) {
    console.error(err);
    setSaving(false);
  }
};

  return (
  <div onClick={onClose} className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
    <div onClick={e => e.stopPropagation()} className="bg-white w-full max-w-lg rounded-xl border border-[#E0E0E0] shadow-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">

      <h2 className="text-lg font-semibold text-[#37352F]">Add Vehicle</h2>

      {/* Customer */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-[#37352F]">Customer *</label>
        <select
          value={form.customerId}
          onChange={e => setField("customerId", e.target.value)}
          className="w-full px-3 py-2 text-sm text-[#37352F] bg-[#F7F6F3] border border-[#E0E0E0] rounded-lg outline-none focus:border-[#37352F] focus:bg-white transition-all"
        >
          <option value="">Select a customer</option>
          {Object.entries(customers).map(([id, name]) => (
            <option key={id} value={id}>{name}</option>
          ))}
        </select>
        {errors.customerId && <p className="text-xs text-[#C53030]">{errors.customerId}</p>}
      </div>

      {/* VIN */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-[#37352F]">VIN (optional)</label>
        <div className="flex gap-2">
          <input
            placeholder="17-character VIN"
            value={form.vin}
            onChange={e => setField("vin", e.target.value)}
            className="flex-1 px-3 py-2 text-sm text-[#37352F] bg-[#F7F6F3] border border-[#E0E0E0] rounded-lg outline-none focus:border-[#37352F] focus:bg-white transition-all"
          />
          <button
            onClick={decodeVin}
            className="px-4 py-2 rounded-lg border border-[#E0E0E0] text-[#37352F] text-sm font-medium hover:bg-[#F7F6F3] transition-all whitespace-nowrap"
          >
            Decode VIN
          </button>
        </div>
        {vinMsg && (
          <p className={`text-xs ${vinMsg.type === "ok" ? "text-green-600" : "text-[#C53030]"}`}>
            {vinMsg.text}
          </p>
        )}
        {errors.vin && <p className="text-xs text-[#C53030]">{errors.vin}</p>}
      </div>

      {/* Type + Plate */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-[#37352F]">Type *</label>
          <select
            value={form.type}
            onChange={e => setField("type", e.target.value)}
            className="w-full px-3 py-2 text-sm text-[#37352F] bg-[#F7F6F3] border border-[#E0E0E0] rounded-lg outline-none focus:border-[#37352F] focus:bg-white transition-all"
          >
            <option value="">Select type</option>
            {VEHICLE_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
          {errors.type && <p className="text-xs text-[#C53030]">{errors.type}</p>}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-[#37352F]">Plate *</label>
          <input
            placeholder="e.g. 192-D-3621"
            value={form.plate}
            onChange={e => setField("plate", e.target.value)}
            className="w-full px-3 py-2 text-sm text-[#37352F] bg-[#F7F6F3] border border-[#E0E0E0] rounded-lg outline-none focus:border-[#37352F] focus:bg-white transition-all"
          />
          {errors.plate && <p className="text-xs text-[#C53030]">{errors.plate}</p>}
        </div>
      </div>

      {/* Make */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-[#37352F]">Make *</label>
        <select
          value={form.make}
          onChange={e => setField("make", e.target.value)}
          className="w-full px-3 py-2 text-sm text-[#37352F] bg-[#F7F6F3] border border-[#E0E0E0] rounded-lg outline-none focus:border-[#37352F] focus:bg-white transition-all"
        >
          <option value="">Select make</option>
          {makes.map(m => <option key={m}>{m}</option>)}
        </select>
        {errors.make && <p className="text-xs text-[#C53030]">{errors.make}</p>}
      </div>

      {/* Model + Year */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-[#37352F]">Model *</label>
          <select
            value={form.model}
            onChange={e => setField("model", e.target.value)}
            className="w-full px-3 py-2 text-sm text-[#37352F] bg-[#F7F6F3] border border-[#E0E0E0] rounded-lg outline-none focus:border-[#37352F] focus:bg-white transition-all"
          >
            <option value="">Select model</option>
            {models.map(m => <option key={m}>{m}</option>)}
          </select>
          {errors.model && <p className="text-xs text-[#C53030]">{errors.model}</p>}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-[#37352F]">Year *</label>
          <select
            value={form.year}
            onChange={e => setField("year", e.target.value)}
            className="w-full px-3 py-2 text-sm text-[#37352F] bg-[#F7F6F3] border border-[#E0E0E0] rounded-lg outline-none focus:border-[#37352F] focus:bg-white transition-all"
          >
            <option value="">Select year</option>
            {YEARS.map(y => <option key={y}>{y}</option>)}
          </select>
          {errors.year && <p className="text-xs text-[#C53030]">{errors.year}</p>}
        </div>
      </div>

      {/* Color + Mileage */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-[#37352F]">Color (optional)</label>
          <select
            value={form.color}
            onChange={e => setField("color", e.target.value)}
            className="w-full px-3 py-2 text-sm text-[#37352F] bg-[#F7F6F3] border border-[#E0E0E0] rounded-lg outline-none focus:border-[#37352F] focus:bg-white transition-all"
          >
            <option value="">Select color</option>
            {COLORS.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-[#37352F]">Mileage (km, optional)</label>
          <input
            placeholder="e.g. 50000"
            type="number"
            value={form.mileage}
            onChange={e => setField("mileage", e.target.value)}
            className="w-full px-3 py-2 text-sm text-[#37352F] bg-[#F7F6F3] border border-[#E0E0E0] rounded-lg outline-none focus:border-[#37352F] focus:bg-white transition-all"
          />
          {errors.mileage && <p className="text-xs text-[#C53030]">{errors.mileage}</p>}
        </div>
      </div>

      {/* Buttons */}
      <div className="flex justify-end gap-3 pt-2">
        <button
          onClick={onClose}
          className="h-12 px-4 rounded-lg border border-[#E0E0E0] text-[#37352F] text-sm font-medium hover:bg-[#F7F6F3] transition-all"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="h-12 px-4 rounded-lg bg-[#37352F] hover:bg-[#474540] text-white text-sm font-medium shadow-sm transition-all disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  </div>
);
}

// ─────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────
export default function StoragePage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [customers, setCustomers] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [businessId, setBusinessId] = useState(null);
  const [hasJobMap, setHasJobMap] = useState({});
  const [totalHoursMap, setTotalHoursMap] = useState({});

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const bizId = await fetchBusinessId(user.uid);
        setBusinessId(bizId);
        Promise.all([fetchStorage(bizId), fetchCustomers(bizId)])
          .then(async ([storageData, customerData]) => {
            setItems(storageData);
            const map = {};
            customerData.forEach(c => (map[c.id] = c.name));
            console.log("customers map:", map);
            setCustomers(map);
            
            // Check for jobs for each storage item
            const jobMap = {};
            const hoursMap = {};
            for (const item of storageData) {
              const hasJob = await checkHasJob(bizId, item.id, item.customerId);
              jobMap[item.id] = hasJob;
              const hours = await fetchTotalHours(bizId, item.id, item.customerId);
              hoursMap[item.id] = hours;
            }
            setHasJobMap(jobMap);
            setTotalHoursMap(hoursMap);
          })
          .finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter(i =>
      `${i.make || ""} ${i.model || ""} ${i.plate || ""} ${i.type || ""}`
        .toLowerCase()
        .includes(q)
    );
  }, [items, search]);

  return (
    <div className={notionClasses.pageContainer}>
      <NavigationBar />
      <div className={notionClasses.dashboardContainer}>


        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className={notionClasses.header.title}>
              Storage
            </h1>
            <p className={notionClasses.header.subtitle}>
              {loading ? "Loading..." : `You have ${items.length} vehicles`}
            </p>
          </div>

          {items.length > 0 && loading === false && (
            <CreateButton onClick={() => setShowModal(true)} />
          )}
        </div>

        {/* Search */}
        {items.length > 0 && (
          <div className="mb-6">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search storages..."
              className={notionClasses.input}
            />
          </div>
        )}

        {/* Table */}
        {loading ? (
          <p className="text-sm text-[#787774]">
            Loading storage...
          </p>
        ) : items.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-[#E0E0E0] rounded-xl bg-white shadow-sm">
            <p className="text-sm text-[#787774] mb-4">No vehicles yet.</p>
            <div className="flex justify-center">
              <CreateButton onClick={() => setShowModal(true)} />
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-[#E0E0E0] bg-white shadow-sm">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className={notionClasses.table.header}>Vehicle</th>
                  <th className={notionClasses.table.header}>Plate</th>
                  <th className={notionClasses.table.header}>Customer</th>
                  <th className={notionClasses.table.header}>Total Hours</th>
                  <th className={notionClasses.table.header}>Active Job</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => (
                  <tr 
                    key={item.id} 
                    className="border-t border-[#E0E0E0] hover:bg-blue-50 hover:border-l-4 hover:border-l-blue-400 transition-all duration-150 cursor-pointer"
                    onClick={() => {
                      navigate(`/storage/${item.id}`);
                    }}
                  >
                    <td className={notionClasses.table.cell}>{item.year} {item.make} {item.model}</td>
                    <td className={notionClasses.table.cell}>{item.plate}</td>
                    <td className={notionClasses.table.cell}>{customers[item.customerId] || "-"}</td>
                    <td className={notionClasses.table.cell}>{totalHoursMap[item.id] || "0h 0m"}</td>
                    <td className={notionClasses.table.cell}>
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                        hasJobMap[item.id] 
                          ? 'bg-red-100 text-red-700' 
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {hasJobMap[item.id] ? 'Yes' : 'No'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showModal && (
          <CreateModal
            businessId={businessId}
            customers={customers}
            onClose={() => setShowModal(false)}
            onCreated={async (newItem) => {
              setItems(p => [newItem, ...p]);
              const hasJob = await checkHasJob(businessId, newItem.id, newItem.customerId);
              setHasJobMap(p => ({ ...p, [newItem.id]: hasJob }));
              setTotalHoursMap(p => ({ ...p, [newItem.id]: "0h 0m" }));
            }}
          />
        )}
      </div>
    </div>
  );
}