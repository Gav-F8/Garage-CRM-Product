// StoragePage
// ├── Header (title + "Create Storage Item" button)
// ├── Search bar (visible when list has items)
// ├── Storage list  ← reads from Firestore
// └── CreateModal   ← writes to Firestore, updates list on success
// ══════════════════════════════════════════════════════════════════════════════
// — storage/{auto-id}
// ══════════════════════════════════════════════════════════════════════════════
// {
//   carLabel:    string          // e.g. "John's 2010 Honda Accord"
//   type:        string          // "car", "truck", "motorcycle", etc.
//   customerId:  string | null   // ref to customers/{id}
//   plate:       string          // required
//   make:        string          // from NHTSA
//   model:       string          // from NHTSA
//   color:       string | null
//   vin:         string | null   // 17-char VIN
//   mileage:     INT64 | null   // odometer in km
//   notes:       string | null
//   year:        INT64
//   createdAt:   Timestamp
//   createdByEmployeeId: string
//   createdByEmployeeName: string
//   updatedAt:   Timestamp
// }
//
// NHTSA vPIC API  — free, no key required
// Docs: https://vpic.nhtsa.dot.gov/api/
// 
// Endpoints used:
//   GET /vehicles/GetAllMakes?format=json
//   GET /vehicles/GetModelsForMake/{make}?format=json
//   GET /vehicles/DecodeVin/{vin}?format=json
//
// ══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "/src/firebase.js";
import {
  addDoc,
  getDocs,
  collection,
  serverTimestamp,
  orderBy,
  query,
} from "firebase/firestore";
import {
  fetchEmployeeName,
  fetchTotalHoursVehicle,
} from "/src/lib/firestore-helpers.js";
import { useCustomersForCurrentUser } from "/src/hooks/useCustomersForCurrentUser.js";
import { NHTSA, VEHICLE_TYPES, COLORS, YEARS } from "/src/lib/utils.js";
import { notionClasses } from "/src/lib/notion-theme";
import { NavigationBar } from "/src/components/NavigationBar.jsx";

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

// ══════════════════════════════════════════════════════════════════════════════
// Firestore Helpers
// ══════════════════════════════════════════════════════════════════════════════

async function fetchStorage(businessId) {
  const snap = await getDocs(
    query(
      collection(db, "businesses", businessId, "storage"),
      orderBy("createdAt", "desc"),
    ),
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ══════════════════════════════════════════════════════════════════════════════
// New Vehicle Creation Form and validation logic
// ══════════════════════════════════════════════════════════════════════════════

async function createStorage(businessId, data, employeeName) {
  const currentUserId = auth.currentUser?.uid || null;
  const carLabel = [data.year, data.make, data.model].filter(Boolean).join(" ");

  const ref = await addDoc(
    collection(db, "businesses", businessId, "storage"),
    {
      ...data,
      carLabel: carLabel || null,
      createdByEmployeeId: currentUserId,
      createdByEmployeeName: employeeName,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
  );
  return ref.id;
}

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

function CreateButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="h-10 px-4 rounded-lg bg-[#37352F] hover:bg-[#474540] text-white text-sm font-medium shadow-sm transition-all"
    >
      + New Vehicle
    </button>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// New Vehicle Create Modal
// ══════════════════════════════════════════════════════════════════════════════

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
      .then((r) => r.json())
      .then((d) => setMakes(d.Results.map((m) => m.Make_Name).sort()))
      .catch(() => {});
  }, []);

  // Load models when make changes
  useEffect(() => {
    if (!form.make) return setModels([]);
    fetch(
      `${NHTSA}/GetModelsForMake/${encodeURIComponent(form.make)}?format=json`,
    )
      .then((r) => r.json())
      .then((d) => setModels(d.Results.map((m) => m.Model_Name).sort()))
      .catch(() => {});
  }, [form.make]);

  const setField = (name, value) => {
    setForm((p) => ({ ...p, [name]: value }));
    setErrors((p) => ({ ...p, [name]: null }));
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
      const get = (v) =>
        data.Results.find((r) => r.Variable === v)?.Value || "";

      const make = get("Make");
      const model = get("Model");
      const year = get("Model Year");

      if (make && model && year) {
        setForm((p) => ({
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
      const employeeName = currentUserId
        ? await fetchEmployeeName(businessId, currentUserId)
        : null;

      const cleanData = {
        ...form,
        plate: form.plate.trim().toUpperCase(),
        year: Number(form.year),
        color: form.color.trim() || null,
        mileage: form.mileage ? Number(form.mileage) : null,
        vin: form.vin.trim() || null,
        notes: form.notes.trim() || null,
        customerId: form.customerId || null,
      };

      const id = await createStorage(businessId, cleanData, employeeName);

      const carLabel = [cleanData.year, cleanData.make, cleanData.model]
        .filter(Boolean)
        .join(" ");

      onCreated({
        id,
        ...cleanData,
        carLabel: carLabel || null,
        createdByEmployeeId: currentUserId,
        createdByEmployeeName: employeeName,
      });
      onClose();
    } catch (err) {
      console.error(err);
      setSaving(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-lg rounded-xl border border-[#E0E0E0] shadow-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto"
      >
        <h2 className="text-lg font-semibold text-[#37352F]">Add Vehicle</h2>

        {/* CUSTOMER SELECT DROP DOWN MENU */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-[#37352F]">
            Customer *
          </label>
          <select
            value={form.customerId}
            onChange={(e) => setField("customerId", e.target.value)}
            className="w-full px-3 py-2 text-sm text-[#37352F] bg-[#F7F6F3] border border-[#E0E0E0] rounded-lg outline-none focus:border-[#37352F] focus:bg-white transition-all"
          >
            <option value="">Select a customer</option>
            {Object.entries(customers).map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
          {errors.customerId && (
            <p className="text-xs text-[#C53030]">{errors.customerId}</p>
          )}
        </div>

        {/* VIN FORM*/}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-[#37352F]">
            VIN (optional)
          </label>
          <div className="flex gap-2">
            <input
              placeholder="17-character VIN"
              value={form.vin}
              onChange={(e) => setField("vin", e.target.value)}
              className="flex-1 px-3 py-2 text-sm text-[#37352F] bg-[#F7F6F3] border border-[#E0E0E0] rounded-lg outline-none focus:border-[#37352F] focus:bg-white transition-all"
            />
            <button
              onClick={decodeVin}
              className="flex-shrink-0 whitespace-nowrap h-10 px-6 rounded-lg border border-[#E0E0E0] bg-white text-[#37352F] text-sm font-medium hover:bg-[#F7F6F3] hover:border-[#37352F] hover:shadow-md transition-all duration-200 active:bg-[#E0E0E0]"
            >
              Decode VIN
            </button>
          </div>
          {vinMsg && (
            <p
              className={`text-xs ${vinMsg.type === "ok" ? "text-green-600" : "text-[#C53030]"}`}
            >
              {vinMsg.text}
            </p>
          )}
          {errors.vin && <p className="text-xs text-[#C53030]">{errors.vin}</p>}
        </div>

        {/* TYPE SELECT DROP DOWN MENU */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-[#37352F]">Type *</label>
            <select
              value={form.type}
              onChange={(e) => setField("type", e.target.value)}
              className="w-full px-3 py-2 text-sm text-[#37352F] bg-[#F7F6F3] border border-[#E0E0E0] rounded-lg outline-none focus:border-[#37352F] focus:bg-white transition-all"
            >
              <option value="">Select type</option>
              {VEHICLE_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
            {errors.type && (
              <p className="text-xs text-[#C53030]">{errors.type}</p>
            )}
          </div>

          {/* PLATE FORM */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-[#37352F]">
              Plate *
            </label>
            <input
              placeholder="e.g. 192-D-3621"
              value={form.plate}
              onChange={(e) => setField("plate", e.target.value)}
              className="w-full px-3 py-2 text-sm text-[#37352F] bg-[#F7F6F3] border border-[#E0E0E0] rounded-lg outline-none focus:border-[#37352F] focus:bg-white transition-all"
            />
            {errors.plate && (
              <p className="text-xs text-[#C53030]">{errors.plate}</p>
            )}
          </div>
        </div>

        {/* MAKE DROP DOWN MENU */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-[#37352F]">Make *</label>
          <select
            value={form.make}
            onChange={(e) => setField("make", e.target.value)}
            className="w-full px-3 py-2 text-sm text-[#37352F] bg-[#F7F6F3] border border-[#E0E0E0] rounded-lg outline-none focus:border-[#37352F] focus:bg-white transition-all"
          >
            <option value="">Select make</option>
            {makes.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
          {errors.make && (
            <p className="text-xs text-[#C53030]">{errors.make}</p>
          )}
        </div>

        {/* MODEL SELECT DROP DOWN MENU */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-[#37352F]">
              Model *
            </label>
            <select
              value={form.model}
              onChange={(e) => setField("model", e.target.value)}
              className="w-full px-3 py-2 text-sm text-[#37352F] bg-[#F7F6F3] border border-[#E0E0E0] rounded-lg outline-none focus:border-[#37352F] focus:bg-white transition-all"
            >
              <option value="">Select model</option>
              {models.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
            {errors.model && (
              <p className="text-xs text-[#C53030]">{errors.model}</p>
            )}
          </div>

          {/* YEAR SELECT DROP DOWN MENU */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-[#37352F]">Year *</label>
            <select
              value={form.year}
              onChange={(e) => setField("year", e.target.value)}
              className="w-full px-3 py-2 text-sm text-[#37352F] bg-[#F7F6F3] border border-[#E0E0E0] rounded-lg outline-none focus:border-[#37352F] focus:bg-white transition-all"
            >
              <option value="">Select year</option>
              {YEARS.map((y) => (
                <option key={y}>{y}</option>
              ))}
            </select>
            {errors.year && (
              <p className="text-xs text-[#C53030]">{errors.year}</p>
            )}
          </div>
        </div>

        {/* COLOR SELECT DROP DOWN MENU */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-[#37352F]">
              Color (optional)
            </label>
            <select
              value={form.color}
              onChange={(e) => setField("color", e.target.value)}
              className="w-full px-3 py-2 text-sm text-[#37352F] bg-[#F7F6F3] border border-[#E0E0E0] rounded-lg outline-none focus:border-[#37352F] focus:bg-white transition-all"
            >
              <option value="">Select color</option>
              {COLORS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* MILEAGE FORM */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-[#37352F]">
              Mileage (km, optional)
            </label>
            <input
              placeholder="e.g. 50000"
              type="number"
              value={form.mileage}
              onChange={(e) => setField("mileage", e.target.value)}
              className="w-full px-3 py-2 text-sm text-[#37352F] bg-[#F7F6F3] border border-[#E0E0E0] rounded-lg outline-none focus:border-[#37352F] focus:bg-white transition-all"
            />
            {errors.mileage && (
              <p className="text-xs text-[#C53030]">{errors.mileage}</p>
            )}
          </div>
        </div>

        {/* BUTTONS */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="h-10 px-4 rounded-lg bg-[#37352F] hover:bg-[#474540] text-white text-sm font-medium shadow-sm transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="h-10 px-4 rounded-lg bg-[#37352F] hover:bg-[#474540] text-white text-sm font-medium shadow-sm transition-all disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Main Page
// ══════════════════════════════════════════════════════════════════════════════
export default function StoragePage() {
  const navigate = useNavigate();
  const businessId = localStorage.getItem("ccgBusinessId");
  const { customers: customersList } = useCustomersForCurrentUser(businessId);
  const customers = customersList.reduce((acc, c) => {
    acc[c.id] = c.name;
    return acc;
  }, {});

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [totalHoursMap, setTotalHoursMap] = useState({});
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Allow access for mechanics and other roles; role-based routing is handled elsewhere if needed.
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const bizId = localStorage.getItem("ccgBusinessId");
        if (!bizId) {
          navigate("/Login");
          return;
        }
        
        try {
          const storageData = await fetchStorage(bizId);
          setItems(storageData);

            const hoursMap = {};

            await Promise.all(
              storageData.map(async (item) => {
                const hours = await fetchTotalHoursVehicle(
                  bizId,
                  item.id,
                  item.customerId,
                );
                hoursMap[item.id] = hours;
              }),
            );

            setTotalHoursMap(hoursMap);
          } finally {
            setLoading(false);
          }
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter((i) =>
      `${i.make || ""} ${i.model || ""} ${i.plate || ""} ${i.type || ""}`
        .toLowerCase()
        .includes(q),
    );
  }, [items, search]);

  // Pagination logic
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = filtered.slice(startIndex, endIndex);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  return (
    <div className={notionClasses.pageContainer}>
      <NavigationBar />
      <div className={notionClasses.dashboardContainer}>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className={notionClasses.header.title}>Vehicles</h1>
            <p className={notionClasses.header.subtitle}>
              Track all your vehicles and their maintenance history in one
              place.
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
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search vehicles..."
              className={notionClasses.input}
            />
          </div>
        )}

        {/* Table */}
        {loading ? (
          <p className="text-sm text-[#787774]">Loading vehicles...</p>
        ) : items.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-[#E0E0E0] rounded-xl bg-white shadow-sm">
            <p className="text-sm text-[#787774] mb-4">No vehicles yet.</p>
            <div className="flex justify-center">
              <CreateButton onClick={() => setShowModal(true)} />
            </div>
          </div>
        ) : (
          <>
            {/* Items Per Page and Total Count */}
            <div className="flex items-center justify-between px-6 py-4 bg-gray-50 rounded-t-xl border border-[#E0E0E0]">
              <div className="text-sm text-[#787774]">
                Total:{" "}
                <span className="font-semibold text-[#37352F]">
                  {filtered.length}
                </span>{" "}
                vehicles
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm text-[#787774]">Show:</label>
                <select
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  className="px-3 py-1 text-sm text-[#37352F] bg-white border border-[#E0E0E0] rounded-lg outline-none focus:border-[#37352F] transition-all"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-hidden border border-[#E0E0E0] border-t-0 bg-white shadow-sm">
              <table className="min-w-full">
                <thead>
                  <tr>
                    <th className={notionClasses.table.header}>Vehicle</th>
                    <th className={notionClasses.table.header}>Plate</th>
                    <th className={notionClasses.table.header}>Customer</th>
                    <th className={notionClasses.table.header}>Total Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((item) => (
                    <tr
                      key={item.id}
                      className="border-t border-[#E0E0E0] hover:bg-blue-50 hover:border-l-4 hover:border-l-blue-400 transition-all duration-150 cursor-pointer"
                      onClick={() => {
                        navigate(`/storage/${item.id}`);
                      }}
                    >
                      <td className={notionClasses.table.cell}>
                        {item.year} {item.make} {item.model}
                      </td>
                      <td className={notionClasses.table.cell}>{item.plate}</td>
                      <td className={notionClasses.table.cell}>
                        {customers[item.customerId] || "-"}
                      </td>
                      <td className={notionClasses.table.cell}>
                        {totalHoursMap[item.id] || "0h 0m"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-4 bg-gray-50 rounded-b-xl border border-t-0 border-[#E0E0E0]">
                <div className="text-sm text-[#787774]">
                  Page{" "}
                  <span className="font-semibold text-[#37352F]">
                    {currentPage}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-[#37352F]">
                    {totalPages}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(prev - 1, 1))
                    }
                    disabled={currentPage === 1}
                    className="px-4 py-2 text-sm font-medium text-[#37352F] bg-white border border-[#E0E0E0] rounded-lg hover:bg-[#F7F6F3] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                    }
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 text-sm font-medium text-[#37352F] bg-white border border-[#E0E0E0] rounded-lg hover:bg-[#F7F6F3] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {showModal && (
          <CreateModal
            businessId={businessId}
            customers={customers}
            onClose={() => setShowModal(false)}
            onCreated={(newItem) => {
              setItems((p) => [newItem, ...p]);
              setTotalHoursMap((p) => ({ ...p, [newItem.id]: "0h 0m" }));
            }}
          />
        )}
      </div>
    </div>
  );
}
