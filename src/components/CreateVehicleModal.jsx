import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "/src/firebase.js";
import {
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import {
  fetchEmployeeDetail,
  extractName,
  createVehicle,
} from "/src/lib/firestore-helpers.js";
import { CreateButton } from "/src/components/ui/CreateButton";
import { NHTSA, VEHICLE_TYPES, COLORS, YEARS } from "/src/lib/utils.js";
import { readMakesCache, writeMakesCache } from "/src/lib/cache.js";

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

// async function fetchVehicles(businessId) {
//   const snap = await getDocs(
//     query(
//       collection(db, "businesses", businessId, "Vehicle"),
//       orderBy("createdAt", "desc"),
//     ),
//   );
//   return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
// }

// ══════════════════════════════════════════════════════════════════════════════
// New Vehicle Creation Form and validation logic
// ══════════════════════════════════════════════════════════════════════════════

// async function createVehicle(businessId, data) {
//   const currentUserId = auth.currentUser?.uid || null;
//   let employeeName = null;

//   if (currentUserId) {
//     employeeName = extractName(await fetchEmployeeDetail(businessId, "Employees", currentUserId), "name");
//   }

//   // Create vehicleLabel by combining year, make, and model
//   const vehicleLabel = [data.year, data.make, data.model].filter(Boolean).join(" ");

//   const ref = await addDoc(
//     collection(db, "businesses", businessId, "Vehicle"),
//     {
//       ...data,
//       vehicleLabel: vehicleLabel || null,
//       createdByEmployeeId: currentUserId,
//       createdByEmployeeName: employeeName,
//       createdAt: serverTimestamp(),
//       updatedAt: serverTimestamp(),
//     },
//   );
//   return ref.id;
// }

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

// ══════════════════════════════════════════════════════════════════════════════
// New Vehicle Create Modal
// ══════════════════════════════════════════════════════════════════════════════

export function CreateVehicleModal({ businessId, customers, onClose, onCreated }) {
  const [form, setForm] = useState(BLANK);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [makes, setMakes] = useState([]);
  const [models, setModels] = useState([]);
  const [vinMsg, setVinMsg] = useState(null);

  // Load makes once, served from a 24h localStorage cache when available.
  // GetAllMakes is ~11k entries and effectively static, so we avoid refetching
  // it on every mount. VIN decode (DecodeVin) and per-make model lookups
  // (GetModelsForMake) are intentionally left uncached: their params vary per
  // call (a unique VIN / the selected make), so caching would rarely hit.
  useEffect(() => {
    if (makes.length) return;

    const cached = readMakesCache();
    if (cached) {
      setMakes(cached);
      return;
    }

    fetch(`${NHTSA}/GetAllMakes?format=json`)
      .then((r) => r.json())
      .then((d) => {
        const sortedMakes = d.Results.map((m) => m.Make_Name).sort();
        setMakes(sortedMakes);
        writeMakesCache(sortedMakes);
      })
      .catch(() => {});
  }, [makes.length]);

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
      let employeeName = null;

      if (currentUserId) {
        employeeName = extractName(await fetchEmployeeDetail(businessId, currentUserId));
      }

      const cleanData = {
        ...form,
        plate: form.plate.trim().toUpperCase(),
        year: Number(form.year),
        mileage: form.mileage ? Number(form.mileage) : null,
        vin: form.vin.trim() || null,
        customerId: form.customerId || null,
      };

      const id = await createVehicle(businessId, cleanData);

      // Create vehicleLabel for display
      const vehicleLabel = [cleanData.year, cleanData.make, cleanData.model]
        .filter(Boolean)
        .join(" ");

      onCreated({
        id,
        ...cleanData,
        vehicleLabel: vehicleLabel || null,
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