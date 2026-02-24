// StoragePage
// ├── Header (title + "Create Storage Item" button)
// ├── Search bar (visible when list has items)
// ├── Storage list  ← reads from Firestore
// └── CreateModal   ← writes to Firestore, updates list on success

import { useState, useEffect, useRef } from "react";
import { initializeApp,getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, addDoc, getDocs, collection, serverTimestamp, orderBy, query, updateDoc, doc } from "firebase/firestore";

// ─────────────────────────────────────────────────────────────────────────────
// Firebase — classic-garage-mgmt
// ─────────────────────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey:            "AIzaSyA9dLSpj5P_8dCPUfPzi5ydeIx-_aFBs-0",
  authDomain:        "classic-garage-mgmt.firebaseapp.com",
  projectId:         "classic-garage-mgmt",
  storageBucket:     "classic-garage-mgmt.firebasestorage.app",
  messagingSenderId: "215021063501",
  appId:             "1:215021063501:web:c4abed06c04b7955d8fb04",
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = getAuth(app);
const db = getFirestore(app);

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

// ─── Firestore Helper──────────────────────────────────────────────────────
async function fetchStorageItems() {
  const storageCol = collection(db, "storage");
  const q = query(storageCol, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function createStorageItem(data) {   //data = { type, customerId, plate, make, model, year, color, vin, mileage, notes }
  const storageCol = collection(db, "storage");
  const docRef = await addDoc(storageCol, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return { id: docRef.id, ...data };
}

async function updateStorageItem(id, data) {
  const docRef = doc(db, "storage", id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
  return { id, ...data };
}

// ─── NHTSA vPIC API ─────────────────────────────────────────────────────────
const NHTSA = "https://vpic.nhtsa.dot.gov/api/vehicles";

// ── Vehicle types (from NHTSA) ───────────────────────────────────────────────
const VEHICLE_TYPES = ["Car", "Truck", "Motorcycle", "Bus", "Trailer", "RV", "Van", "Other"];

// ── Year list (1981 → current, newest first) ─────────────────────────────────
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: currentYear - 1980 }, (_, i) => currentYear - i);

// ── Colors ───────────────────────────────────────────────────────────────────
const COLORS = ["Black","White","Silver","Grey","Blue","Red","Green","Yellow","Orange","Brown","Gold","Beige","Purple","Other"];

// ── Validation ───────────────────────────────────────────────────────────────
function validate(form) {
  const e = {};
  if (!form.plate.trim())      e.plate = "Plate is required";
  if (!form.make)              e.make  = "Select a make";
  if (!form.model)             e.model = "Select a model";
  if (!form.year)              e.year  = "Select a year";
  if (form.vin && form.vin.replace(/\s/g,"").length !== 17)
    e.vin = "VIN must be exactly 17 characters";
  return e;
}

// ── Icons ────────────────────────────────────────────────────────────────────
const icons = ({ n, s = 17 }) => ({
  car:     <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 17H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1l3-4h10l3 4h1a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2"/><circle cx="7.5" cy="17" r="2.5"/><circle cx="16.5" cy="17" r="2.5"/></svg>,
  customerId: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  plate:   <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="10" rx="2"/><line x1="7" y1="12" x2="17" y2="12"/></svg>,
  vin:     <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 2H3a1 1 0 0 0-1 1v7"/><path d="M14 2h7a1 1 0 0 1 1 1v7"/><path d="M2 14v7a1 1 0 0 0 1 1h7"/><path d="M14 22h7a1 1 0 0 0 1-1v-7"/><circle cx="12" cy="12" r="3"/></svg>,
  speed:   <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a10 10 0 1 0 10 10"/><polyline points="12 6 12 12 16 14"/></svg>,
  note:    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/></svg>,
  chevron: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>,
  magic:   <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>,
  loader:  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{animation:"spin 0.8s linear infinite"}}><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>,
  palette: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 0 20c-2.76 0-4-1.5-4-3 0-2.5 2-3.5 2-6 0-2.5-1.5-4-4-4"/></svg>,
  plus:    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  close:   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  check:   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>,
  spinner: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{animation:"cSpin 0.8s linear infinite"}}><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>,
}[n]);

function Ico({ n, s = 17 }) {
  return icons({ n, s });
}

// ── Combobox (searchable dropdown) ───────────────────────────────────────────
function Combobox({ label, icon, placeholder, items, value, onChange, disabled, loading, error }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef(null);
  const filtered = items.filter(i => i.toLowerCase().includes(q.toLowerCase())).slice(0, 80);
  const display = value || "";

  useEffect(() => {
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const select = (item) => { onChange(item); setOpen(false); setQ(""); };

  return (
    <div ref={ref} style={{ marginBottom: "1.1rem", position: "relative" }}>
      <label style={{ display:"block", fontSize:"0.68rem", fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color: error ? "#E07050" : "#6B5E4A", marginBottom:"0.45rem" }}>
        {label}
      </label>
      <button type="button" disabled={disabled}
        onClick={() => { if (!disabled) { setOpen(o => !o); setQ(""); } }}
        style={{ width:"100%", display:"flex", alignItems:"center", gap:"0.7rem", background: disabled ? "rgba(255,255,255,0.01)" : open ? "rgba(212,175,95,0.07)" : "rgba(255,255,255,0.03)", border:`1.5px solid ${error ? "#E07050" : open ? "#D4AF5F" : "rgba(255,255,255,0.08)"}`, borderRadius:"10px", padding:"0 0.85rem", height:50, cursor: disabled ? "not-allowed" : "pointer", color: value ? "#EDE4D4" : "#4A3F2E", fontSize:"0.92rem", fontFamily:"'Barlow', sans-serif", transition:"all 0.2s", opacity: disabled ? 0.45 : 1 }}>
        <span style={{ color: open ? "#D4AF5F" : "#5A4E38", flexShrink:0 }}>{loading ? <Ico n="loader" /> : <Ico n={icon} />}</span>
        <span style={{ flex:1, textAlign:"left", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
          {loading ? "Loading…" : (display || placeholder)}
        </span>
        <span style={{ color:"#4A3F2E", transform: open ? "rotate(180deg)" : "none", transition:"transform 0.2s", flexShrink:0 }}><Ico n="chevron" /></span>
      </button>
      {error && <p style={{ margin:"0.3rem 0 0 0.2rem", fontSize:"0.76rem", color:"#E07050" }}>{error}</p>}

      {open && (
        <div style={{ position:"absolute", top:"calc(100% + 6px)", left:0, right:0, background:"#1C1610", border:"1.5px solid #D4AF5F44", borderRadius:"12px", zIndex:50, boxShadow:"0 12px 40px rgba(0,0,0,0.6)", overflow:"hidden" }}>
          <div style={{ padding:"0.6rem" }}>
            <input autoFocus value={q} onChange={e => setQ(e.target.value)}
              placeholder={`Search ${label.toLowerCase()}…`}
              style={{ width:"100%", background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:"7px", color:"#EDE4D4", padding:"0.5rem 0.75rem", fontSize:"0.85rem", outline:"none", fontFamily:"'Barlow',sans-serif", boxSizing:"border-box" }} />
          </div>
          <div style={{ maxHeight:220, overflowY:"auto" }}>
            {filtered.length === 0
              ? <p style={{ padding:"0.75rem 1rem", color:"#4A3F2E", fontSize:"0.85rem" }}>No results</p>
              : filtered.map(item => (
                  <button key={item} type="button" onClick={() => select(item)}
                    style={{ display:"block", width:"100%", textAlign:"left", background: item === value ? "rgba(212,175,95,0.12)" : "transparent", border:"none", padding:"0.55rem 1rem", color: item === value ? "#D4AF5F" : "#C8B89A", fontSize:"0.88rem", cursor:"pointer", fontFamily:"'Barlow',sans-serif", transition:"background 0.15s" }}
                    onMouseEnter={e => { if (item !== value) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                    onMouseLeave={e => { if (item !== value) e.currentTarget.style.background = "transparent"; }}>
                    {item}
                  </button>
                ))
            }
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Shared Create Button ─────────────────────────────────────────────────────
function CreateButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      style={{ display:"flex", alignItems:"center", gap:"0.5rem", background:"linear-gradient(135deg,#C8A96E,#A07840)", border:"none", borderRadius:"10px", color:"#1A150E", padding:"0.65rem 1.25rem", fontFamily:"'Playfair Display',serif", fontWeight:700, fontSize:"0.9rem", cursor:"pointer", flexShrink:0, boxShadow:"0 4px 20px rgba(200,169,110,0.25)", transition:"opacity 0.2s" }}
      onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
      onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
      {icons.plus} Create Storage Item
    </button>
  );
}

// ── Input Component ───────────────────────────────────────────────────────────────
function Input({ label, icon, name, type="text", customerId, placeholder, value, onChange, error, hint, multiline, maxLength }) {
  const [focused, setFocused] = useState(false);

  const base = { 
    width:"100%", 
    background:"transparent", 
    border:"none", 
    outline:"none", 
    color:"#EDE4D4", 
    fontSize:"0.92rem", 
    fontFamily:"'Barlow', sans-serif", 
    padding:0, 
    resize:"none" };

  return (
    <div style={{ marginBottom:"1.1rem" }}>
      <label style={{ display:"block", fontSize:"0.68rem", fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color: error ? "#E07050" : focused ? "#D4AF5F" : "#6B5E4A", marginBottom:"0.45rem", transition:"color 0.2s" }}>
        {label}
      </label>
      <div style={{ display:"flex", alignItems: multiline ? "flex-start" : "center", gap:"0.7rem", background: focused ? "rgba(212,175,95,0.05)" : "rgba(255,255,255,0.03)", border:`1.5px solid ${error ? "#E07050" : focused ? "#D4AF5F" : "rgba(255,255,255,0.08)"}`, borderRadius:"10px", padding: multiline ? "0.8rem" : "0 0.85rem", transition:"all 0.2s", minHeight: multiline ? "auto" : 50 }}>
        <span style={{ color: focused ? "#D4AF5F" : "#5A4E38", flexShrink:0, paddingTop: multiline ? 2 : 0, transition:"color 0.2s" }}>{icons[icon]}</span>
        {multiline
          ? <textarea rows={3} name={name} placeholder={placeholder} value={value} onChange={onChange} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} style={{ ...base, lineHeight:1.6 }} />
          : <input type={type} name={name} placeholder={placeholder} value={value} onChange={onChange} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} maxLength={maxLength} style={base} />
        }
        {maxLength && <span style={{ fontSize:"0.72rem", color: value.length >= maxLength ? "#E07050" : "#4A3F2E", flexShrink:0 }}>{value.length}/{maxLength}</span>}
      </div>
      {error && <p style={{ margin:"0.3rem 0 0 0.2rem", fontSize:"0.76rem", color:"#E07050" }}>{error}</p>}
      {hint && !error && <p style={{ margin:"0.3rem 0 0 0.2rem", fontSize:"0.76rem", color:"#4A3F2E" }}>{hint}</p>}
    </div>
  );
}

// ─── Create Modal ──────────────────────────────────────────────────────────
function CreateModal({ onClose, onCreated}) {
  const [form, setForm] = useState({ type: "", plate: "", make: "", model: "", year: "", color: "", vin: "", mileage: "", notes: "" });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const handleChange = (e) => {
  const { name, value } = e.target;
  setForm(p => ({ ...p, [name]: value }));
  if (errors[name]) setErrors(p => ({ ...p, [name]: null }));
  };
  const handleSubmit = async () => {
  const errst = validate(form);  // ← remove the curly braces
  if (Object.keys(errst).length) { setErrors(errst); return; }
  setSaving(true);
  try {
    const { id } = await createStorageItem({  // ← add await
        type: form.type, 
        customerId: form.customerId,
        plate: form.plate.trim(),
        make: form.make,
        model: form.model,
        year: Number(form.year),
        color: form.color || null,
        vin: form.vin.trim() || null,
        mileage: form.mileage ? Number(form.mileage) : null,
        notes: form.notes.trim() || null,
    });
    setDone(true);
    onCreated({ id, type: form.type, plate: form.plate.trim(), make: form.make, model: form.model, year: Number(form.year), color: form.color || null, vin: form.vin.trim() || null, mileage: form.mileage ? Number(form.mileage) : null, notes: form.notes.trim() || null });
    setTimeout(onClose, 1200);
  } catch(err) {
    console.error("Error saving storage item:", err);
    setSaving(false);
    setErrors({ name: "Failed to save. Please try again." });
  }
  };

  return (
    // Backdrop
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(10,8,5,0.8)", backdropFilter:"blur(6px)", zIndex:100, display:"flex", alignItems:"center", justifyContent:"center", padding:"1rem", animation:"cFadeIn 0.2s ease" }}>
      {/* Panel — stop click from closing */}
      <div onClick={e => e.stopPropagation()} style={{ background:"#1A1510", border:"1px solid rgba(200,169,110,0.18)", borderRadius:"16px", width:"100%", maxWidth:480, boxShadow:"0 24px 60px rgba(0,0,0,0.6)", animation:"cSlideUp 0.25s ease" }}>

        {/* Modal header */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"1.25rem 1.5rem", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"0.6rem" }}>
            <div style={{ width:32, height:32, borderRadius:"8px", background:"rgba(200,169,110,0.12)", border:"1px solid rgba(200,169,110,0.25)", display:"flex", alignItems:"center", justifyContent:"center", color:"#C8A96E" }}>
              {icons.plus}
            </div>
            <span style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.1rem", fontWeight:700, color:"#F1EDE4" }}>New Storage Item</span>
          </div>
            <button onClick={onClose} style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:"7px", color:"#7A6E5E", cursor:"pointer", padding:"5px", display:"flex", alignItems:"center", justifyContent:"center" }}>
            {icons.close}
            </button>
        </div>

        {/* Modal body */}
        <div style={{ padding:"1.5rem" }}>
          {done ? (
            <div style={{ textAlign:"center", padding:"1.5rem 0", animation:"cFadeIn 0.3s ease" }}>
              <div style={{ width:56, height:56, borderRadius:"50%", background:"linear-gradient(135deg,#C8A96E,#A07840)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 1rem", color:"#1A150E" }}>
                {icons.check}
              </div>
              <p style={{ color:"#C8A96E", fontWeight:600, fontSize:"1rem" }}>Customer saved!</p>
            </div>
          ) : (
            <>
              <Input icon="car" label="Car Type"      name="type"    placeholder="e.g. Sedan"  value={form.type}    onChange={handleChange} error={errors.type}  required />
              <Input icon="customerId" label="Customer ID" name="customerId" placeholder="e.g. 12345" value={form.customerId} onChange={handleChange} error={errors.customerId} required />
              <Input icon="plate" label="License Plate" name="plate"   placeholder="e.g. ABC-1234"        value={form.plate}   onChange={handleChange} error={errors.plate} required />
              <Input icon="make"  label="Make"          name="make"    placeholder="e.g. Toyota"          value={form.make}    onChange={handleChange} error={errors.make} />
              <Input icon="model" label="Model"         name="model"   placeholder="e.g. Corolla"         value={form.model}   onChange={handleChange} error={errors.model} />
              <Input icon="year"  label="Year"          name="year"    placeholder="e.g. 2020"            value={form.year}    onChange={handleChange} error={errors.year} />
              <Input icon="color" label="Color"         name="color"   placeholder="e.g. Red"             value={form.color}   onChange={handleChange} error={errors.color} />
              <Input icon="vin"   label="VIN"           name="vin"     placeholder="e.g. 1HGCM82633A123456" value={form.vin}   onChange={handleChange} error={errors.vin} />
              <Input icon="mileage" label="Mileage"     name="mileage" placeholder="e.g. 15000"          value={form.mileage} onChange={handleChange} error={errors.mileage} />
              <Input icon="note"  label="Internal Notes" name="notes"   placeholder="Any notes about this customer..." value={form.notes} onChange={handleChange} multiline />
              <div style={{ display:"flex", gap:"0.75rem", marginTop:"1.5rem" }}>
                <button onClick={onClose} style={{ flex:1, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", color:"#7A6E5E", borderRadius:"10px", padding:"0.65rem", cursor:"pointer", fontFamily:"'Literata',serif", fontSize:"0.9rem", transition:"all 0.2s" }}>
                  Cancel
                </button>
                <button onClick={handleSubmit} disabled={saving} style={{ flex:2, background: saving ? "rgba(200,169,110,0.4)" : "linear-gradient(135deg,#C8A96E,#A07840)", border:"none", color:"#1A150E", borderRadius:"10px", padding:"0.65rem", cursor: saving ? "not-allowed" : "pointer", fontFamily:"'Playfair Display',serif", fontWeight:700, fontSize:"0.95rem", display:"flex", alignItems:"center", justifyContent:"center", gap:"0.5rem", transition:"opacity 0.2s" }}>
                  {saving ? <>{icons.spinner} Saving…</> : "Save Customer"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Storage Card ────────────────────────────────────────────────────────
function StorageCard({ storage }) {
  const initials = storage.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div style={{ background:"#161209", border:"1px solid rgba(255,255,255,0.06)", borderRadius:"12px", padding:"1rem 1.25rem", display:"flex", alignItems:"center", gap:"1rem", transition:"border-color 0.2s", cursor:"default" }}
      onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(200,169,110,0.3)"}
      onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"}>
      {/* Avatar */}
      <div style={{ width:44, height:44, borderRadius:"50%", background:"linear-gradient(135deg,#C8A96E22,#A0784011)", border:"1px solid rgba(200,169,110,0.25)", display:"flex", alignItems:"center", justifyContent:"center", color:"#C8A96E", fontFamily:"'Playfair Display',serif", fontWeight:700, fontSize:"1rem", flexShrink:0 }}>
        {initials}
      </div>
      {/* Info */}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontWeight:600, color:"#F1EDE4", fontSize:"0.95rem", marginBottom:"0.25rem", fontFamily:"'Playfair Display',serif" }}>{storage.make}{storage.model}</div>
        <div style={{ display:"flex", gap:"1rem", flexWrap:"wrap" }}>
          {storage.type && (
            <span style={{ display:"flex", alignItems:"center", gap:"0.3rem", color:"#7A6E5E", fontSize:"0.78rem" }}>
              <span style={{ color:"#5A5040" }}>{icons.type}</span> {storage.type}
            </span>
          )}
          {storage.customerId && (
            <span style={{ display:"flex", alignItems:"center", gap:"0.3rem", color:"#7A6E5E", fontSize:"0.78rem", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              <span style={{ color:"#5A5040" }}>{icons.customerId}</span> {storage.customerId}
            </span>
          )}
          {storage.plate && (
            <span style={{ display:"flex", alignItems:"center", gap:"0.3rem", color:"#7A6E5E", fontSize:"0.78rem" }}>
              <span style={{ color:"#5A5040" }}>{icons.plate}</span> {storage.plate}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
const blank = { plate:"", make:"", model:"", year:"", color:"", vin:"", mileage:"", notes:"" };

export default function CreateCarPage() {
  const [form, setForm]     = useState(blank);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle"); // idle | saving | success

  // NHTSA data
  const [makes, setMakes]         = useState([]);
  const [models, setModels]       = useState([]);
  const [loadMakes, setLoadMakes] = useState(false);
  const [loadModels, setLoadModels] = useState(false);
  const [vinLoading, setVinLoading] = useState(false);
  const [vinMsg, setVinMsg]       = useState(null); // { type: 'ok'|'err', text }

  // Load all makes on mount
  useEffect(() => {
    setLoadMakes(true);
    fetch(`${NHTSA}/GetAllMakes?format=json`)
      .then(r => r.json())
      .then(d => setMakes(d.Results.map(m => m.Make_Name).sort()))
      .catch(() => {})
      .finally(() => setLoadMakes(false));
  }, []);

  // Load models whenever make changes
  useEffect(() => {
    if (!form.make) { setModels([]); return; }
    setLoadModels(true);
    setForm(p => ({ ...p, model: "" }));
    setModels([]);
    fetch(`${NHTSA}/GetModelsForMake/${encodeURIComponent(form.make)}?format=json`)
      .then(r => r.json())
      .then(d => setModels(d.Results.map(m => m.Model_Name).sort()))
      .catch(() => {})
      .finally(() => setLoadModels(false));
  }, [form.make]);

  const set = (name, val) => {
    setForm(p => ({ ...p, [name]: val }));
    setErrors(p => ({ ...p, [name]: null }));
  };

  const handleChange = e => set(e.target.name, e.target.value);

  // VIN auto-decode
  const decodeVin = async () => {
    const vin = form.vin.trim().replace(/\s/g, "");
    if (vin.length !== 17) { setVinMsg({ type:"err", text:"Enter a full 17-character VIN first" }); return; }
    setVinLoading(true);
    setVinMsg(null);
    try {
      const res = await fetch(`${NHTSA}/DecodeVin/${vin}?format=json`);
      const data = await res.json();
      const get = (var_) => data.Results.find(r => r.Variable === var_)?.Value || "";
      const make  = get("Make");
      const model = get("Model");
      const year  = get("Model Year");
      if (make && model && year) {
        setForm(p => ({ ...p, make, model, year }));
        setVinMsg({ type:"ok", text:`Decoded: ${year} ${make} ${model}` });
      } else {
        setVinMsg({ type:"err", text:"Could not decode VIN — fill manually" });
      }
    } catch {
      setVinMsg({ type:"err", text:"Decode failed — check connection" });
    } finally {
      setVinLoading(false);
    }
  };

  const handleSubmit = async () => {
    const errs = validate(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setStatus("saving");
    try {
      await createStorageItem({
        type:     form.type,
        plate:    form.plate.trim().toUpperCase(),
        make:     form.make,
        model:    form.model,
        year:     Number(form.year),
        color:    form.color || null,
        vin:      form.vin.trim() || null,
        mileage:  form.mileage ? Number(form.mileage) : null,
        notes:    form.notes.trim() || null,
        customerId: null, // attach when building the full flow
      });
      setStatus("success");
    } catch {
      setStatus("idle");
      setErrors({ plate:"Failed to save. Please try again." });
    }
  };

  const reset = () => { setForm(blank); setErrors({}); setVinMsg(null); setStatus("idle"); };

  const yearsList = YEARS.map(String);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Barlow:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:#110E08;}
        ::placeholder{color:#3A3020;}
        ::-webkit-scrollbar{width:4px;}
        ::-webkit-scrollbar-track{background:#1C1610;}
        ::-webkit-scrollbar-thumb{background:#3A3020;border-radius:2px;}
        @keyframes spin{to{transform:rotate(360deg);}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(14px);}to{opacity:1;transform:translateY(0);}}
        @keyframes slideIn{from{opacity:0;transform:translateX(-10px);}to{opacity:1;transform:translateX(0);}}
      `}</style>

      <div style={{ minHeight:"100vh", background:"#110E08", display:"flex", fontFamily:"'Barlow', sans-serif" }}>
        {/* accent bar */}
        <div style={{ width:4, flexShrink:0, background:"linear-gradient(180deg,transparent,#D4AF5F 25%,#A07830 75%,transparent)" }} />

        <div style={{ flex:1, maxWidth:580, margin:"0 auto", padding:"3rem 2rem 4rem" }}>

          {/* Header */}
          <div style={{ marginBottom:"2.25rem", animation:"slideIn 0.4s ease" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"0.6rem", marginBottom:"0.9rem" }}>
              <div style={{ width:36, height:36, borderRadius:"10px", background:"rgba(212,175,95,0.1)", border:"1px solid rgba(212,175,95,0.25)", display:"flex", alignItems:"center", justifyContent:"center", color:"#D4AF5F" }}>
                <icon name="car" />
              </div>
              <span style={{ fontSize:"0.72rem", fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:"#4A3F2E" }}>New Vehicle</span>
            </div>
            <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:"2.2rem", fontWeight:700, color:"#EDE4D4", lineHeight:1.2, marginBottom:"0.45rem" }}>Register Car</h1>
            <p style={{ color:"#4A3F2E", fontSize:"0.88rem" }}>
              Make & model pulled from{" "}
              <a href="https://vpic.nhtsa.dot.gov/api/" target="_blank" rel="noreferrer"
                style={{ color:"#D4AF5F", textDecoration:"none", borderBottom:"1px solid rgba(212,175,95,0.3)" }}>
                NHTSA vPIC API
              </a>.
              Saved to <code style={{ background:"rgba(212,175,95,0.1)", color:"#D4AF5F", padding:"1px 6px", borderRadius:4, fontSize:"0.8rem" }}>cars/</code> in Firestore.
            </p>
          </div>

          {status === "success" ? (
            <Success plate={form.plate.toUpperCase()} make={form.make} model={form.model} year={form.year} onAnother={reset} />
          ) : (
            <>
              <div style={{ height:1, background:"linear-gradient(90deg,rgba(212,175,95,0.3),transparent)", marginBottom:"2rem" }} />

              {/* ── VIN quick-fill ─────────────────────────── */}
              <div style={{ background:"rgba(212,175,95,0.04)", border:"1px solid rgba(212,175,95,0.15)", borderRadius:"12px", padding:"1.1rem 1.25rem", marginBottom:"1.5rem", animation:"fadeIn 0.35s ease" }}>
                <p style={{ fontSize:"0.68rem", fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:"#6B5E4A", marginBottom:"0.75rem", display:"flex", alignItems:"center", gap:"0.4rem" }}>
                  <icon name="magic" s={13} /> VIN Auto-fill (optional)
                </p>
                <div style={{ display:"flex", gap:"0.6rem" }}>
                  <div style={{ flex:1, display:"flex", alignItems:"center", gap:"0.6rem", background:"rgba(255,255,255,0.03)", border:`1.5px solid rgba(255,255,255,0.08)`, borderRadius:"9px", padding:"0 0.8rem", height:46 }}>
                    <span style={{ color:"#5A4E38", flexShrink:0 }}><icon name="vin" /></span>
                    <input name="vin" maxLength={17} value={form.vin} onChange={e => { handleChange(e); setVinMsg(null); }}
                      placeholder="17-character VIN"
                      style={{ flex:1, background:"transparent", border:"none", outline:"none", color:"#EDE4D4", fontSize:"0.88rem", fontFamily:"'Barlow',sans-serif", letterSpacing:"0.06em" }} />
                    <span style={{ fontSize:"0.72rem", color: form.vin.length === 17 ? "#D4AF5F" : "#3A3020", flexShrink:0 }}>{form.vin.length}/17</span>
                  </div>
                  <button onClick={decodeVin} disabled={vinLoading}
                    style={{ display:"flex", alignItems:"center", gap:"0.4rem", background: form.vin.length === 17 ? "rgba(212,175,95,0.15)" : "rgba(255,255,255,0.03)", border:`1px solid ${form.vin.length === 17 ? "rgba(212,175,95,0.4)" : "rgba(255,255,255,0.06)"}`, borderRadius:"9px", color: form.vin.length === 17 ? "#D4AF5F" : "#4A3F2E", padding:"0 1rem", height:46, cursor: vinLoading ? "wait" : "pointer", fontFamily:"'Barlow',sans-serif", fontWeight:600, fontSize:"0.85rem", whiteSpace:"nowrap", transition:"all 0.2s" }}>
                    {vinLoading ? <icon name="loader" s={15} /> : <icon name="magic" s={15} />} Decode
                  </button>
                </div>
                {vinMsg && (
                  <p style={{ marginTop:"0.5rem", fontSize:"0.78rem", color: vinMsg.type === "ok" ? "#86D490" : "#E07050", display:"flex", alignItems:"center", gap:"0.3rem" }}>
                    {vinMsg.type === "ok" ? <icon name="check" s={13} /> : "⚠"} {vinMsg.text}
                  </p>
                )}
              </div>

              {/* ── Form ───────────────────────────────────── */}
              <div style={{ animation:"fadeIn 0.4s ease 0.1s both" }}>

                {/* Plate */}
                <Input label="Registration Plate" icon="plate" name="plate" placeholder="e.g. 211-KE-1234" value={form.plate} onChange={handleChange} error={errors.plate} hint="Enter the vehicle's registration number" maxLength={12} />

                {/* Make → Model → Year cascade */}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.75rem" }}>
                  <div style={{ gridColumn:"1/-1" }}>
                    <Combobox label="Make" icon="car" placeholder="Select make…" items={makes} value={form.make} onChange={v => { set("make", v); set("model",""); }} loading={loadMakes} error={errors.make} />
                  </div>
                  <Combobox label="Model" icon="car" placeholder={form.make ? "Select model…" : "Select make first"} items={models} value={form.model} onChange={v => set("model", v)} disabled={!form.make} loading={loadModels} error={errors.model} />
                  <Combobox label="Year" icon="speed" placeholder="Year…" items={yearsList} value={form.year} onChange={v => set("year", v)} error={errors.year} />
                </div>

                {/* Color */}
                <Combobox label="Colour" icon="palette" placeholder="Select colour…" items={COLORS} value={form.color} onChange={v => set("color", v)} />

                {/* Mileage */}
                <Input label="Mileage (km)" icon="speed" name="mileage" type="number" placeholder="e.g. 45000" value={form.mileage} onChange={handleChange} hint="Current odometer reading" />

                {/* Notes */}
                <Input label="Notes" icon="note" name="notes" placeholder="Any notes about this vehicle…" value={form.notes} onChange={handleChange} multiline />
              </div>

              {/* Firestore preview */}
              <div style={{ background:"rgba(212,175,95,0.03)", border:"1px solid rgba(212,175,95,0.1)", borderRadius:"12px", padding:"1rem 1.2rem", marginBottom:"1.75rem", animation:"fadeIn 0.4s ease 0.2s both" }}>
                <p style={{ fontSize:"0.67rem", fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:"#4A3F2E", marginBottom:"0.6rem" }}>Firestore Preview</p>
                <pre style={{ fontSize:"0.77rem", color:"#6B5E4A", lineHeight:1.75, margin:0, fontFamily:"'Courier New',monospace", whiteSpace:"pre-wrap", wordBreak:"break-all" }}>
{JSON.stringify({
  plate:      form.plate.toUpperCase() || "(required)",
  make:       form.make  || "(required)",
  model:      form.model || "(required)",
  year:       form.year  ? Number(form.year) : "(required)",
  color:      form.color  || null,
  vin:        form.vin.trim() || null,
  mileage:    form.mileage ? Number(form.mileage) : null,
  notes:      form.notes.trim() || null,
  customerId: null,
  createdAt:  "serverTimestamp()",
  updatedAt:  "serverTimestamp()",
}, null, 2)}
                </pre>
              </div>

              {/* Submit */}
              <button onClick={handleSubmit} disabled={status==="saving"}
                style={{ width:"100%", padding:"0.9rem", background: status==="saving" ? "rgba(212,175,95,0.45)" : "linear-gradient(135deg,#D4AF5F,#A07830)", border:"none", borderRadius:"12px", color:"#1A1208", fontFamily:"'Playfair Display',serif", fontSize:"1rem", fontWeight:700, cursor: status==="saving" ? "not-allowed" : "pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:"0.6rem", boxShadow:"0 4px 24px rgba(212,175,95,0.2)", transition:"opacity 0.2s", animation:"fadeIn 0.4s ease 0.3s both" }}
                onMouseEnter={e => { if (status !== "saving") e.currentTarget.style.opacity = "0.85"; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}>
                {status === "saving" ? <><Ico n="loader" s={18} /> Saving…</> : "Register Vehicle"}
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}