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

import { useState, useEffect, useRef, useMemo } from "react";
import { initializeApp, getApps } from "firebase/app";
import {
  getFirestore,
  addDoc,
  getDocs,
  collection,
  serverTimestamp,
  orderBy,
  query,
} from "firebase/firestore";
import { notionClasses } from "/src/lib/notion-theme";

// ─────────────────────────────────────────────────────────────
// Firebase
// ─────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyA9dLSpj5P_8dCPUfPzi5ydeIx-_aFBs-0",
  authDomain: "classic-garage-mgmt.firebaseapp.com",
  projectId: "classic-garage-mgmt",
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(app);

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
async function fetchStorage() {
  const snap = await getDocs(query(collection(db, "storage"), orderBy("createdAt", "desc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function fetchCustomers() {
  const snap = await getDocs(query(collection(db, "customers"), orderBy("name")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function createStorage(data) {
  const ref = await addDoc(collection(db, "storage"), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

// ─────────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────────
function validate(form) {
  const e = {};
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
// Create Modal
// ─────────────────────────────────────────────────────────────
function CreateModal({ customers, onClose, onCreated }) {
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
      const id = await createStorage({
        ...form,
        plate: form.plate.trim().toUpperCase(),
        year: Number(form.year),
        mileage: form.mileage ? Number(form.mileage) : null,
        vin: form.vin.trim() || null,
        customerId: form.customerId || null,
      });

      onCreated({ id, ...form });
      onClose();
    } catch {
      setSaving(false);
    }
  };

  return (
    <div onClick={onClose} className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
      <div onClick={e => e.stopPropagation()} className="bg-white w-full max-w-lg rounded-xl border border-[#E0E0E0] shadow-lg p-6 space-y-4">

        <h2 className="text-lg font-semibold text-[#37352F]">Add Vehicle</h2>

        <input
          placeholder="VIN (optional)"
          value={form.vin}
          onChange={e => setField("vin", e.target.value)}
          className={notionClasses.input}
        />

        <button onClick={decodeVin} className="text-sm text-[#37352F]">
          Decode VIN
        </button>

        {vinMsg && (
          <p className={`text-sm ${vinMsg.type === "ok" ? "text-green-600" : "text-red-600"}`}>
            {vinMsg.text}
          </p>
        )}

        <select value={form.type} onChange={e => setField("type", e.target.value)} className={notionClasses.input}>
          <option value="">Select type</option>
          {VEHICLE_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>

        <input
          placeholder="Plate"
          value={form.plate}
          onChange={e => setField("plate", e.target.value)}
          className={notionClasses.input}
        />

        <select value={form.make} onChange={e => setField("make", e.target.value)} className={notionClasses.input}>
          <option value="">Make</option>
          {makes.map(m => <option key={m}>{m}</option>)}
        </select>

        <select value={form.model} onChange={e => setField("model", e.target.value)} className={notionClasses.input}>
          <option value="">Model</option>
          {models.map(m => <option key={m}>{m}</option>)}
        </select>

        <select value={form.year} onChange={e => setField("year", e.target.value)} className={notionClasses.input}>
          <option value="">Year</option>
          {YEARS.map(y => <option key={y}>{y}</option>)}
        </select>

        <div className="flex justify-end gap-3 pt-4">
          <button onClick={onClose} className="text-sm text-[#787774]">
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-[#37352F] text-white text-sm font-medium"
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
  const [items, setItems] = useState([]);
  const [customers, setCustomers] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    Promise.all([fetchStorage(), fetchCustomers()])
      .then(([storageData, customerData]) => {
        setItems(storageData);
        const map = {};
        customerData.forEach(c => (map[c.id] = c.name));
        setCustomers(map);
      })
      .finally(() => setLoading(false));
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
      <div className={notionClasses.dashboardContainer}>

        <div className="flex justify-between mb-6">
          <div>
            <h1 className={notionClasses.header.title}>Storage</h1>
            <p className={notionClasses.header.subtitle}>
              {loading ? "Loading..." : `${items.length} vehicles`}
            </p>
          </div>
          <button onClick={() => setShowModal(true)} className="h-10 px-4 rounded-lg bg-[#37352F] text-white text-sm">
            + New Vehicle
          </button>
        </div>

        {items.length > 0 && (
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search..."
            className={notionClasses.input}
          />
        )}

        {!loading && filtered.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-[#E0E0E0] bg-white shadow-sm mt-6">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className={notionClasses.table.header}>Vehicle</th>
                  <th className={notionClasses.table.header}>Plate</th>
                  <th className={notionClasses.table.header}>Customer</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => (
                  <tr key={item.id} className={notionClasses.table.row}>
                    <td className={notionClasses.table.cell}>
                      {item.year} {item.make} {item.model}
                    </td>
                    <td className={notionClasses.table.cell}>{item.plate}</td>
                    <td className={notionClasses.table.cell}>
                      {customers[item.customerId] || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showModal && (
          <CreateModal
            customers={customers}
            onClose={() => setShowModal(false)}
            onCreated={newItem => setItems(p => [newItem, ...p])}
          />
        )}
      </div>
    </div>
  );
}