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

import { useState, useEffect, useRef } from "react";
import { initializeApp,getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, addDoc, getDocs, collection, serverTimestamp, orderBy, query, updateDoc, doc } from "firebase/firestore";

// ─── Firebase ─────────────────────────────────────────────────────────────────
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

// ─── NHTSA ────────────────────────────────────────────────────────────────────
const NHTSA = "https://vpic.nhtsa.dot.gov/api/vehicles";

// ─── Static options ───────────────────────────────────────────────────────────
const VEHICLE_TYPES = ["Car", "Truck", "Motorcycle", "Van", "Bus", "RV", "Trailer", "Other"];
const COLORS = ["Black","White","Silver","Grey","Blue","Red","Green","Yellow","Orange","Brown","Gold","Beige","Purple","Other"];
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: currentYear - 1980 }, (_, i) => String(currentYear - i));

// ─── Firestore Helper──────────────────────────────────────────────────────
async function fetchStorageItems() {
  const storageCol = collection(db, "storage");
  const q = query(storageCol, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function saveStorageItem(data) {   //data = { type, customerId, plate, make, model, year, color, vin, mileage, notes }
  const storageCol = collection(db, "storage");
  const docRef = await addDoc(storageCol, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return { id: docRef.id, ...data };
}

async function fetchCustomers() {
  const snap = await getDocs(query(collection(db, "customers"), orderBy("name")));
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// async function updateStorageItem(id, data) {
//   const docRef = doc(db, "storage", id);
//   await updateDoc(docRef, {
//     ...data,
//     updatedAt: serverTimestamp(),
//   });
//   return { id, ...data };
// }

// ── Validation ───────────────────────────────────────────────────────────────
function validate(form) {
  const e = {};
  if (! form.type)             e.type  = "Select a vehicle type";
  if (!form.plate.trim())      e.plate = "Plate is required";
  if (!form.make)              e.make  = "Select a make";
  if (!form.model)             e.model = "Select a model";
  if (!form.year)              e.year  = "Select a year";
  if (form.vin && form.vin.replace(/\s/g,"").length !== 17)
    e.vin = "VIN must be exactly 17 characters";
  return e;
}

// ── Icons ────────────────────────────────────────────────────────────────────
const Icon = ({ n, s = 17 }) => ({
  car:     <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 17H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1l3-4h10l3 4h1a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2"/><circle cx="7.5" cy="17" r="2.5"/><circle cx="16.5" cy="17" r="2.5"/></svg>,
  user:    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>,
  plate:   <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="10" rx="2"/><line x1="7" y1="12" x2="17" y2="12"/></svg>,
  vin:     <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 2H3a1 1 0 0 0-1 1v7"/><path d="M14 2h7a1 1 0 0 1 1 1v7"/><path d="M2 14v7a1 1 0 0 0 1 1h7"/><path d="M14 22h7a1 1 0 0 0 1-1v-7"/><circle cx="12" cy="12" r="3"/></svg>,
  speed:   <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a10 10 0 1 0 10 10"/><polyline points="12 6 12 12 16 14"/></svg>,
  palette: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 0 20c-2.76 0-4-1.5-4-3 0-2.5 2-3.5 2-6 0-2.5-1.5-4-4-4"/></svg>,
  note:    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/></svg>,
  plus:    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  close:   <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  check:   <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>,
  chevron: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>,
  magic:   <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>,
  spinner: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{animation:"sSpin 0.8s linear infinite"}}><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>,
}[n]);

// ─── Searchable dropdown ──────────────────────────────────────────────────────
function Combobox({ label, icon, placeholder, items, value, onChange, disabled, loading, error, required }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef(null);
  const filtered = items.filter(i => i.toLowerCase().includes(q.toLowerCase())).slice(0, 100);

  useEffect(() => {
    const fn = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  return (
    <div ref={ref} style={{ marginBottom:"1rem", position:"relative" }}>
      <label style={{ display:"block", fontSize:"0.68rem", fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color: error ? "#E07050" : "#6B5E4A", marginBottom:"0.4rem" }}>
        {label}{required && <span style={{ color:"#E07050", marginLeft:3 }}>*</span>}
      </label>
      <button type="button" disabled={disabled}
        onClick={() => { if (!disabled) { setOpen(o => !o); setQ(""); } }}
        style={{ width:"100%", display:"flex", alignItems:"center", gap:"0.65rem", background: disabled ? "rgba(255,255,255,0.01)" : open ? "rgba(200,169,110,0.06)" : "rgba(255,255,255,0.03)", border:`1.5px solid ${error ? "#E07050" : open ? "#C8A96E" : "rgba(255,255,255,0.08)"}`, borderRadius:"9px", padding:"0 0.75rem", height:48, cursor: disabled ? "not-allowed" : "pointer", color: value ? "#F1EDE4" : "#4A3F2E", fontSize:"0.9rem", fontFamily:"'Barlow',sans-serif", transition:"all 0.2s", opacity: disabled ? 0.45 : 1 }}>
        <span style={{ color: open ? "#C8A96E" : "#5A4E38", flexShrink:0 }}>
          {loading ? <Icon n="spinner" /> : <Icon n={icon} />}
        </span>
        <span style={{ flex:1, textAlign:"left", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
          {loading ? "Loading…" : (value || placeholder)}
        </span>
        <span style={{ color:"#4A3F2E", transform: open ? "rotate(180deg)" : "none", transition:"transform 0.2s", flexShrink:0 }}><Icon n="chevron" /></span>
      </button>
      {error && <p style={{ margin:"0.3rem 0 0 0.2rem", fontSize:"0.75rem", color:"#E07050" }}>{error}</p>}

      {open && (
        <div style={{ position:"absolute", top:"calc(100% + 6px)", left:0, right:0, background:"#1C1610", border:"1.5px solid rgba(200,169,110,0.25)", borderRadius:"12px", zIndex:200, boxShadow:"0 12px 40px rgba(0,0,0,0.7)", overflow:"hidden" }}>
          <div style={{ padding:"0.5rem" }}>
            <input autoFocus value={q} onChange={e => setQ(e.target.value)}
              placeholder={`Search ${label.toLowerCase()}…`}
              style={{ width:"100%", background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:"7px", color:"#F1EDE4", padding:"0.45rem 0.7rem", fontSize:"0.85rem", outline:"none", fontFamily:"'Barlow',sans-serif", boxSizing:"border-box" }} />
          </div>
          <div style={{ maxHeight:200, overflowY:"auto" }}>
            {filtered.length === 0
              ? <p style={{ padding:"0.65rem 1rem", color:"#4A3F2E", fontSize:"0.85rem" }}>No results</p>
              : filtered.map(item => (
                <button key={item} type="button" onClick={() => { onChange(item); setOpen(false); setQ(""); }}
                  style={{ display:"block", width:"100%", textAlign:"left", background: item === value ? "rgba(200,169,110,0.12)" : "transparent", border:"none", padding:"0.5rem 1rem", color: item === value ? "#C8A96E" : "#C8B89A", fontSize:"0.88rem", cursor:"pointer", fontFamily:"'Barlow',sans-serif", transition:"background 0.15s" }}
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
    <button onClick={onClick}
      style={{ display:"flex", alignItems:"center", gap:"0.5rem", background:"linear-gradient(135deg,#C8A96E,#A07840)", border:"none", borderRadius:"10px", color:"#1A150E", padding:"0.65rem 1.25rem", fontFamily:"'Playfair Display',serif", fontWeight:700, fontSize:"0.9rem", cursor:"pointer", flexShrink:0, boxShadow:"0 4px 20px rgba(200,169,110,0.25)", transition:"opacity 0.2s" }}
      onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
      onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
      <Icon n="plus" /> Add Vehicle
    </button>
  );
}

// ── Input Component ───────────────────────────────────────────────────────────────
function Input({ label, icon, name, type = "text", placeholder, value, onChange, error, hint, multiline, maxLength, required }) {
  const [focused, setFocused] = useState(false);
  const base = { width:"100%", background:"transparent", border:"none", outline:"none", color:"#F1EDE4", fontSize:"0.9rem", fontFamily:"'Barlow',sans-serif", padding:0, resize:"none" };
  
  return (
    <div style={{ marginBottom:"1rem" }}>
      <label style={{ display:"block", fontSize:"0.68rem", fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color: error ? "#E07050" : focused ? "#C8A96E" : "#6B5E4A", marginBottom:"0.4rem", transition:"color 0.2s" }}>
        {label}{required && <span style={{ color:"#E07050", marginLeft:3 }}>*</span>}
      </label>
      <div onClick={e => e.stopPropagation()} style={{ display:"flex", alignItems: multiline ? "flex-start" : "center", gap:"0.65rem", background: focused ? "rgba(200,169,110,0.05)" : "rgba(255,255,255,0.03)", border:`1.5px solid ${error ? "#E07050" : focused ? "#C8A96E" : "rgba(255,255,255,0.08)"}`, borderRadius:"9px", padding: multiline ? "0.75rem" : "0 0.75rem", transition:"all 0.2s", minHeight: multiline ? "auto" : 48 }}>
        <span style={{ color: focused ? "#C8A96E" : "#5A4E38", flexShrink:0, paddingTop: multiline ? 2 : 0, transition:"color 0.2s" }}><Icon n={icon} /></span>
        {multiline
          ? <textarea rows={3} name={name} placeholder={placeholder} value={value} onChange={onChange} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} style={{ ...base, lineHeight:1.6 }} />
          : <input type={type} name={name} placeholder={placeholder} value={value} onChange={onChange} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} maxLength={maxLength} style={base} />
        }
        {maxLength && <span style={{ fontSize:"0.7rem", color: value.length >= maxLength ? "#E07050" : "#4A3F2E", flexShrink:0 }}>{value.length}/{maxLength}</span>}
      </div>
      {error && <p style={{ margin:"0.3rem 0 0 0.2rem", fontSize:"0.75rem", color:"#E07050" }}>{error}</p>}
      {hint && !error && <p style={{ margin:"0.3rem 0 0 0.2rem", fontSize:"0.75rem", color:"#4A3F2E" }}>{hint}</p>}
    </div>
  );
}

// ─── Customer Picker ──────────────────────────────────────────────────────────
function CustomerPicker({ value, onChange, onCreateNew }) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [open, setOpen]           = useState(false);
  const [q, setQ]                 = useState("");
  const ref = useRef(null);

  useEffect(() => {
    fetchCustomers().then(setCustomers).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const fn = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(q.toLowerCase()) ||
    (c.phone && c.phone.includes(q))
  );

  const selected = customers.find(c => c.id === value);

  return (
    <div ref={ref} style={{ marginBottom:"1rem", position:"relative" }}>
      <label style={{ display:"block", fontSize:"0.68rem", fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:"#6B5E4A", marginBottom:"0.4rem" }}>
        Customer
      </label>
      <button type="button" onClick={() => { setOpen(o => !o); setQ(""); }}
        style={{ width:"100%", display:"flex", alignItems:"center", gap:"0.65rem", background: open ? "rgba(200,169,110,0.06)" : "rgba(255,255,255,0.03)", border:`1.5px solid ${open ? "#C8A96E" : "rgba(255,255,255,0.08)"}`, borderRadius:"9px", padding:"0 0.75rem", height:48, cursor:"pointer", fontFamily:"'Barlow',sans-serif", fontSize:"0.9rem", color: selected ? "#F1EDE4" : "#4A3F2E", transition:"all 0.2s" }}>
        <span style={{ color: open ? "#C8A96E" : "#5A4E38", flexShrink:0 }}>
          {loading ? <Icon n="spinner" /> : <Icon n="user" />}
        </span>
        <span style={{ flex:1, textAlign:"left" }}>
          {loading ? "Loading customers…" : (selected ? selected.name : "Select customer (optional)")}
        </span>
        {selected && (
          <span onClick={e => { e.stopPropagation(); onChange(""); }}
            style={{ color:"#7A6E5E", flexShrink:0, padding:"2px", cursor:"pointer" }}>
            <Icon n="close" s={14} />
          </span>
        )}
        <span style={{ color:"#4A3F2E", transform: open ? "rotate(180deg)" : "none", transition:"transform 0.2s", flexShrink:0 }}>
          <Icon n="chevron" />
        </span>
      </button>

      {open && (
        <div style={{ position:"absolute", top:"calc(100% + 6px)", left:0, right:0, background:"#1C1610", border:"1.5px solid rgba(200,169,110,0.25)", borderRadius:"12px", zIndex:200, boxShadow:"0 12px 40px rgba(0,0,0,0.7)", overflow:"hidden" }}>
          <div style={{ padding:"0.5rem" }}>
            <input autoFocus value={q} onChange={e => setQ(e.target.value)}
              placeholder="Search by name or phone…"
              style={{ width:"100%", background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:"7px", color:"#F1EDE4", padding:"0.45rem 0.7rem", fontSize:"0.85rem", outline:"none", fontFamily:"'Barlow',sans-serif", boxSizing:"border-box" }} />
          </div>
          <div style={{ maxHeight:200, overflowY:"auto" }}>
            {filtered.map(c => (
              <button key={c.id} type="button"
                onClick={() => { onChange(c.id); setOpen(false); setQ(""); }}
                style={{ display:"block", width:"100%", textAlign:"left", background: c.id === value ? "rgba(200,169,110,0.12)" : "transparent", border:"none", padding:"0.5rem 1rem", cursor:"pointer", fontFamily:"'Barlow',sans-serif", transition:"background 0.15s" }}
                onMouseEnter={e => { if (c.id !== value) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                onMouseLeave={e => { if (c.id !== value) e.currentTarget.style.background = "transparent"; }}>
                <div style={{ color: c.id === value ? "#C8A96E" : "#F1EDE4", fontSize:"0.88rem", fontWeight:600 }}>{c.name}</div>
                {c.phone && <div style={{ color:"#5A5040", fontSize:"0.75rem" }}>{c.phone}</div>}
              </button>
            ))}
            {filtered.length === 0 && (
              <p style={{ padding:"0.5rem 1rem", color:"#4A3F2E", fontSize:"0.85rem" }}>No customers found</p>
            )}
          </div>
          {/* Create new customer button */}
          <div style={{ borderTop:"1px solid rgba(255,255,255,0.06)", padding:"0.5rem" }}>
            <button type="button"
              onClick={() => { setOpen(false); onCreateNew(); }}
              style={{ width:"100%", display:"flex", alignItems:"center", gap:"0.5rem", background:"rgba(200,169,110,0.08)", border:"1px solid rgba(200,169,110,0.2)", borderRadius:"8px", color:"#C8A96E", padding:"0.5rem 0.75rem", cursor:"pointer", fontFamily:"'Barlow',sans-serif", fontSize:"0.85rem", fontWeight:600, transition:"all 0.2s" }}>
              <Icon n="plus" s={15} /> New Customer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Create Customer Modal ─────────────────────────────────────────────────
function CreateCustomerModal({ onClose, onCreated }) {
  const [name, setName]   = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  const handleSave = async () => {
    if (!name.trim()) { setError("Name is required"); return; }
    setSaving(true);
    try {
      const docRef = await addDoc(collection(db, "customers"), {
        name: name.trim(), phone: phone.trim() || null,
        email: null, address: null, notes: null,
        createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      });
      onCreated({ id: docRef.id, name: name.trim(), phone: phone.trim() || null });
    } catch (err) {
      console.error(err);
      setSaving(false);
      setError("Failed to save.");
    }
  };

  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(8,6,3,0.6)", backdropFilter:"blur(4px)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:"1rem" }}>
      <div onClick={e => e.stopPropagation()} style={{ background:"#1F1A13", border:"1px solid rgba(200,169,110,0.2)", borderRadius:"14px", width:"100%", maxWidth:380, padding:"1.5rem", boxShadow:"0 20px 50px rgba(0,0,0,0.7)" }}>
        <h3 style={{ fontFamily:"'Playfair Display',serif", color:"#F1EDE4", fontSize:"1.1rem", marginBottom:"1.25rem" }}>Quick Add Customer</h3>
        <div onClick={e => e.stopPropagation()} style={{ display:"flex", alignItems:"center", gap:"0.6rem", background:"rgba(255,255,255,0.03)", border:`1.5px solid ${error ? "#E07050" : "rgba(255,255,255,0.08)"}`, borderRadius:"9px", padding:"0 0.75rem", height:46, marginBottom:"0.75rem" }}>
          <Icon n="user" />
          <input value={name} onChange={e => { setName(e.target.value); setError(""); }} placeholder="Full name *"
            style={{ flex:1, background:"transparent", border:"none", outline:"none", color:"#F1EDE4", fontSize:"0.9rem", fontFamily:"'Barlow',sans-serif" }} />
        </div>
        <div onClick={e => e.stopPropagation()} style={{ display:"flex", alignItems:"center", gap:"0.6rem", background:"rgba(255,255,255,0.03)", border:"1.5px solid rgba(255,255,255,0.08)", borderRadius:"9px", padding:"0 0.75rem", height:46, marginBottom:"1.25rem" }}>
          <Icon n="user" />
          <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone (optional)"
            style={{ flex:1, background:"transparent", border:"none", outline:"none", color:"#F1EDE4", fontSize:"0.9rem", fontFamily:"'Barlow',sans-serif" }} />
        </div>
        {error && <p style={{ color:"#E07050", fontSize:"0.78rem", marginBottom:"0.75rem" }}>{error}</p>}
        <div style={{ display:"flex", gap:"0.6rem" }}>
          <button onClick={onClose} style={{ flex:1, background:"transparent", border:"1px solid rgba(255,255,255,0.08)", color:"#7A6E5E", borderRadius:"9px", padding:"0.6rem", cursor:"pointer", fontFamily:"'Barlow',sans-serif" }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ flex:2, background:"linear-gradient(135deg,#C8A96E,#A07840)", border:"none", color:"#1A150E", borderRadius:"9px", padding:"0.6rem", cursor: saving ? "not-allowed" : "pointer", fontFamily:"'Playfair Display',serif", fontWeight:700, fontSize:"0.9rem" }}>
            {saving ? "Saving…" : "Create & Select"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Create Storage Modal ──────────────────────────────────────────────────────────
const BLANK = { type:"", customerId:"", plate:"", make:"", model:"", year:"", color:"", vin:"", mileage:"", notes:"" };

function CreateModal({ onClose, onCreated}) {
  const [form, setForm] = useState({ ...BLANK });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [showCreateCustomer, setShowCreateCustomer] = useState(false);
  // NHTSA cascades
  const [makes, setMakes]           = useState([]);
  const [models, setModels]         = useState([]);
  const [loadMakes, setLoadMakes]   = useState(false);
  const [loadModels, setLoadModels] = useState(false);
  const [vinLoading, setVinLoading] = useState(false);
  const [vinMsg, setVinMsg]         = useState(null);
  
  // Load all makes once
  useEffect(() => {
    setLoadMakes(true);
    fetch(`${NHTSA}/GetAllMakes?format=json`)
      .then(r => r.json())
      .then(d => setMakes(d.Results.map(m => m.Make_Name).sort()))
      .catch(() => {})
      .finally(() => setLoadMakes(false));
  }, []);

  // Load models when make changes
  useEffect(() => {
    if (!form.make) { setModels([]); return; }
    setLoadModels(true);
    setModels([]);
    setForm(p => ({ ...p, model: "" }));
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

  // VIN decode
  const decodeVin = async () => {
    const vin = form.vin.trim().replace(/\s/g, "");
    if (vin.length !== 17) { setVinMsg({ type:"err", text:"Enter a full 17-character VIN first" }); return; }
    setVinLoading(true);
    setVinMsg(null);
    try {
      const res  = await fetch(`${NHTSA}/DecodeVin/${vin}?format=json`);
      const data = await res.json();
      const get  = v => data.Results.find(r => r.Variable === v)?.Value || "";
      const make = get("Make"), model = get("Model"), year = get("Model Year");
      if (make && model && year) {
        setForm(p => ({ ...p, make, model, year }));
        setVinMsg({ type:"ok", text:`Decoded: ${year} ${make} ${model}` });
      } else {
        setVinMsg({ type:"err", text:"Could not decode — fill manually" });
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
    setSaving(true);
    try {
      const { id } = await saveStorageItem({
        type:       form.type,
        customerId: form.customerId.trim() || null,
        plate:      form.plate.trim().toUpperCase(),
        make:       form.make,
        model:      form.model,
        year:       Number(form.year),
        color:      form.color || null,
        vin:        form.vin.trim() || null,
        mileage:    form.mileage ? Number(form.mileage) : null,
        notes:      form.notes.trim() || null,
      });
      const newItem = { id, type: form.type, customerId: form.customerId.trim() || null, plate: form.plate.trim().toUpperCase(), make: form.make, model: form.model, year: Number(form.year), color: form.color || null };
      onCreated(newItem);
      setDone(true);
      setTimeout(onClose, 1200);
    } catch (err) {
      console.error(err);
      setSaving(false);
      setErrors({ plate: "Failed to save. Please try again." });
    }
  };


  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(8,6,3,0.85)", backdropFilter:"blur(6px)", zIndex:100, display:"flex", alignItems:"center", justifyContent:"center", padding:"1rem", animation:"sFadeIn 0.2s ease" }}>
      <div onClick={e => e.stopPropagation()} style={{ background:"#1A1510", border:"1px solid rgba(200,169,110,0.18)", borderRadius:"16px", width:"100%", maxWidth:520, maxHeight:"90vh", overflowY:"auto", boxShadow:"0 24px 60px rgba(0,0,0,0.7)", animation:"sSlideUp 0.25s ease" }}>

        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"1.25rem 1.5rem", borderBottom:"1px solid rgba(255,255,255,0.06)", position:"sticky", top:0, background:"#1A1510", zIndex:10 }}>
          <div style={{ display:"flex", alignItems:"center", gap:"0.6rem" }}>
            <div style={{ width:32, height:32, borderRadius:"8px", background:"rgba(200,169,110,0.12)", border:"1px solid rgba(200,169,110,0.25)", display:"flex", alignItems:"center", justifyContent:"center", color:"#C8A96E" }}>
              <Icon n="car" />
            </div>
            <span style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.1rem", fontWeight:700, color:"#F1EDE4" }}>Add Vehicle</span>
          </div>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:"7px", color:"#7A6E5E", cursor:"pointer", padding:"5px", display:"flex", alignItems:"center" }}>
            <Icon n="close" />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding:"1.5rem" }}>
          {done ? (
            <div style={{ textAlign:"center", padding:"2rem 0", animation:"sFadeIn 0.3s ease" }}>
              <div style={{ width:56, height:56, borderRadius:"50%", background:"linear-gradient(135deg,#C8A96E,#A07840)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 1rem", color:"#1A150E" }}>
                <Icon n="check" s={22} />
              </div>
              <p style={{ color:"#C8A96E", fontWeight:600, fontSize:"1rem" }}>Vehicle saved!</p>
            </div>
          ) : (
            <>
              {/* ── VIN auto-fill ── */}
              <div style={{ background:"rgba(200,169,110,0.04)", border:"1px solid rgba(200,169,110,0.13)", borderRadius:"10px", padding:"1rem 1.1rem", marginBottom:"1.25rem" }}>
                <p style={{ fontSize:"0.67rem", fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:"#6B5E4A", marginBottom:"0.6rem", display:"flex", alignItems:"center", gap:"0.35rem" }}>
                  <Icon n="magic" s={13} /> VIN Auto-fill (optional)
                </p>
                <div style={{ display:"flex", gap:"0.5rem" }}>
                  <div onClick={e => e.stopPropagation()} style={{ flex:1, display:"flex", alignItems:"center", gap:"0.5rem", background:"rgba(255,255,255,0.03)", border:"1.5px solid rgba(255,255,255,0.08)", borderRadius:"8px", padding:"0 0.75rem", height:44 }}>
                    <span style={{ color:"#5A4E38", flexShrink:0 }}><Icon n="vin" /></span>
                    <input name="vin" maxLength={17} value={form.vin}
                      onChange={e => { set("vin", e.target.value); setVinMsg(null); }}
                      placeholder="17-character VIN"
                      style={{ flex:1, background:"transparent", border:"none", outline:"none", color:"#F1EDE4", fontSize:"0.87rem", fontFamily:"'Barlow',sans-serif", letterSpacing:"0.05em" }} />
                    <span style={{ fontSize:"0.7rem", color: form.vin.length === 17 ? "#C8A96E" : "#3A3020", flexShrink:0 }}>{form.vin.length}/17</span>
                  </div>
                  <button onClick={decodeVin} disabled={vinLoading}
                    style={{ display:"flex", alignItems:"center", gap:"0.35rem", background: form.vin.length === 17 ? "rgba(200,169,110,0.15)" : "rgba(255,255,255,0.03)", border:`1px solid ${form.vin.length === 17 ? "rgba(200,169,110,0.4)" : "rgba(255,255,255,0.06)"}`, borderRadius:"8px", color: form.vin.length === 17 ? "#C8A96E" : "#4A3F2E", padding:"0 0.9rem", height:44, cursor: vinLoading ? "wait" : "pointer", fontFamily:"'Barlow',sans-serif", fontWeight:600, fontSize:"0.83rem", whiteSpace:"nowrap", transition:"all 0.2s" }}>
                    {vinLoading ? <Icon n="spinner" s={14} /> : <Icon n="magic" s={14} />} Decode
                  </button>
                </div>
                {vinMsg && (
                  <p style={{ marginTop:"0.45rem", fontSize:"0.76rem", color: vinMsg.type === "ok" ? "#86D490" : "#E07050", display:"flex", alignItems:"center", gap:"0.3rem" }}>
                    {vinMsg.type === "ok" ? <Icon n="check" s={13} /> : "⚠"} {vinMsg.text}
                  </p>
                )}
              </div>

              {/* ── Fields ── */}
              <Combobox label="Vehicle Type" icon="car"     placeholder="Select type…"        items={VEHICLE_TYPES} value={form.type}  onChange={v => set("type", v)}  error={errors.type}  required />
              <CustomerPicker value={form.customerId} onChange={v => set("customerId", v)} onCreateNew={() => { setShowCreateCustomer(true); }} />
              <Input    label="Plate"        icon="plate"   name="plate"   placeholder="e.g. 211-KE-1234" value={form.plate}   onChange={handleChange} error={errors.plate} maxLength={12} required />

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.75rem" }}>
                <div style={{ gridColumn:"1/-1" }}>
                  <Combobox label="Make" icon="car" placeholder="Select make…" items={makes} value={form.make} onChange={v => set("make", v)} loading={loadMakes} error={errors.make} required />
                </div>
                <Combobox label="Model" icon="car"   placeholder={form.make ? "Select model…" : "Select make first"} items={models} value={form.model} onChange={v => set("model", v)} disabled={!form.make} loading={loadModels} error={errors.model} required />
                <Combobox label="Year"  icon="speed" placeholder="Year…" items={YEARS} value={form.year} onChange={v => set("year", v)} error={errors.year} required />
              </div>

              <Combobox label="Colour"      icon="palette" placeholder="Select colour…" items={COLORS} value={form.color}   onChange={v => set("color", v)} />
              <Input    label="Mileage (km)" icon="speed"  name="mileage" type="number" placeholder="e.g. 45000"     value={form.mileage} onChange={handleChange} hint="Current odometer reading" />
              <Input    label="Notes"        icon="note"   name="notes"   placeholder="Any notes about this vehicle…" value={form.notes}   onChange={handleChange} multiline />

              <div style={{ display:"flex", gap:"0.75rem", marginTop:"1.5rem" }}>
                <button onClick={onClose} style={{ flex:1, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", color:"#7A6E5E", borderRadius:"10px", padding:"0.65rem", cursor:"pointer", fontFamily:"'Barlow',sans-serif", fontSize:"0.9rem" }}>
                  Cancel
                </button>
                <button onClick={handleSubmit} disabled={saving}
                  style={{ flex:2, background: saving ? "rgba(200,169,110,0.4)" : "linear-gradient(135deg,#C8A96E,#A07840)", border:"none", color:"#1A150E", borderRadius:"10px", padding:"0.65rem", cursor: saving ? "not-allowed" : "pointer", fontFamily:"'Playfair Display',serif", fontWeight:700, fontSize:"0.95rem", display:"flex", alignItems:"center", justifyContent:"center", gap:"0.5rem" }}>
                  {saving ? <><Icon n="spinner" s={16} /> Saving…</> : "Save Vehicle"}
                </button>
              </div>
            </>
          )}
        </div>
        {showCreateCustomer && (
        <CreateCustomerModal
            onClose={() => setShowCreateCustomer(false)}
            onCreated={(newCustomer) => {
            set("customerId", newCustomer.id);
            setShowCreateCustomer(false);
            }}
        />
        )}
      </div>
    </div>
  );
}

// ─── Storage Card ────────────────────────────────────────────────────────
function StorageCard({ item, customers }) {
  const label = `${item.year || ""} ${item.make || ""} ${item.model || ""}`.trim() || "Unknown Vehicle";
  const initials = (item.make || "?").slice(0, 2).toUpperCase();
  return (
    <div style={{ background:"#161209", border:"1px solid rgba(255,255,255,0.06)", borderRadius:"12px", padding:"1rem 1.25rem", display:"flex", alignItems:"center", gap:"1rem", transition:"border-color 0.2s" }}
      onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(200,169,110,0.3)"}
      onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"}>
      <div style={{ width:44, height:44, borderRadius:"10px", background:"rgba(200,169,110,0.1)", border:"1px solid rgba(200,169,110,0.22)", display:"flex", alignItems:"center", justifyContent:"center", color:"#C8A96E", fontFamily:"'Playfair Display',serif", fontWeight:700, fontSize:"0.95rem", flexShrink:0 }}>
        {initials}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:"0.6rem", marginBottom:"0.3rem" }}>
          <span style={{ fontWeight:600, color:"#F1EDE4", fontSize:"0.95rem", fontFamily:"'Playfair Display',serif" }}>{label}</span>
          {item.type && <span style={{ fontSize:"0.7rem", background:"rgba(200,169,110,0.1)", color:"#C8A96E", border:"1px solid rgba(200,169,110,0.2)", borderRadius:"5px", padding:"1px 7px", fontWeight:600, letterSpacing:"0.04em" }}>{item.type}</span>}
        </div>
        <div style={{ display:"flex", gap:"1rem", flexWrap:"wrap" }}>
          {item.plate && (
            <span style={{ display:"flex", alignItems:"center", gap:"0.3rem", color:"#7A6E5E", fontSize:"0.78rem" }}>
              <span style={{ color:"#5A5040" }}><Icon n="plate" s={14} /></span> {item.plate}
            </span>
          )}
          {item.color && (
            <span style={{ display:"flex", alignItems:"center", gap:"0.3rem", color:"#7A6E5E", fontSize:"0.78rem" }}>
              <span style={{ color:"#5A5040" }}><Icon n="palette" s={14} /></span> {item.color}
            </span>
          )}
          {item.customerId && customers[item.customerId] && (
            <span style={{ display:"flex", alignItems:"center", gap:"0.3rem", color:"#7A6E5E", fontSize:"0.78rem" }}>
              <span style={{ color:"#5A5040" }}><Icon n="user" s={14} /></span> {customers[item.customerId]}
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

export default function StoragePage() {
  const [items, setItems]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch]       = useState("");
  const [customers, setCustomers] = useState({});  // { id: name }

  useEffect(() => {
  Promise.all([
    fetchStorageItems(),
    fetchCustomers()
  ]).then(([storageData, customerData]) => {
    setItems(storageData);
    // Build a lookup map: { id → name }
    const map = {};
    customerData.forEach(c => { map[c.id] = c.name; });
    setCustomers(map);
  }).catch(console.error)
    .finally(() => setLoading(false));
}, []);

  const handleCreated = newItem => setItems(prev => [newItem, ...prev]);

  const filtered = items.filter(i =>
    `${i.make} ${i.model} ${i.plate} ${i.type}`.toLowerCase().includes(search.toLowerCase())
  );

  const hasItems = !loading && items.length > 0;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Barlow:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #110E09; }
        ::placeholder { color: #3A342A; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #1C1610; }
        ::-webkit-scrollbar-thumb { background: #3A3020; border-radius: 2px; }
        @keyframes sSpin    { to { transform: rotate(360deg); } }
        @keyframes sFadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes sSlideUp { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div style={{ minHeight:"100vh", background:"#110E09", fontFamily:"'Barlow',sans-serif" }}>
        <div style={{ height:3, background:"linear-gradient(90deg,transparent,#C8A96E 30%,#A07840 70%,transparent)" }} />

        <div style={{ maxWidth:760, margin:"0 auto", padding:"2.5rem 1.5rem" }}>

          {/* Header */}
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:"2rem", gap:"1rem" }}>
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:"0.5rem", marginBottom:"0.5rem" }}>
                <span style={{ color:"#C8A96E" }}><Icon n="car" /></span>
                <span style={{ fontSize:"0.7rem", fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:"#5A5040" }}>Vehicles</span>
              </div>
              <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:"2rem", fontWeight:700, color:"#F1EDE4", lineHeight:1.2 }}>Storage</h1>
              <p style={{ color:"#5A5040", fontSize:"0.85rem", marginTop:"0.35rem" }}>
                {loading ? "Loading…" : `${items.length} vehicle${items.length !== 1 ? "s" : ""} in storage`}
              </p>
            </div>
            {hasItems && <CreateButton onClick={() => setShowModal(true)} />}
          </div>

          {/* Search */}
          {hasItems && (
            <div style={{ display:"flex", alignItems:"center", gap:"0.6rem", background:"rgba(255,255,255,0.03)", border:"1.5px solid rgba(255,255,255,0.07)", borderRadius:"10px", padding:"0 0.85rem", marginBottom:"1.5rem", height:46 }}>
              <span style={{ color:"#5A5040", flexShrink:0 }}><Icon n="car" /></span>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by make, model, plate or type…"
                style={{ flex:1, background:"transparent", border:"none", outline:"none", color:"#F1EDE4", fontSize:"0.88rem", fontFamily:"'Barlow',sans-serif" }} />
            </div>
          )}

          {/* Content */}
          {loading ? (
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:"4rem", color:"#5A5040", gap:"0.6rem" }}>
              <Icon n="spinner" /> Loading vehicles…
            </div>
          ) : items.length === 0 ? (
            <div style={{ textAlign:"center", padding:"5rem 2rem", border:"1px dashed rgba(255,255,255,0.07)", borderRadius:"14px", animation:"sFadeIn 0.4s ease" }}>
              <div style={{ width:56, height:56, borderRadius:"50%", background:"rgba(200,169,110,0.08)", border:"1px solid rgba(200,169,110,0.15)", display:"flex", alignItems:"center", justifyContent:"center", color:"#C8A96E", margin:"0 auto 1.25rem" }}>
                <Icon n="car" s={22} />
              </div>
              <p style={{ color:"#5A5040", fontSize:"0.9rem", marginBottom:"1.75rem" }}>
                No vehicles in storage yet. Add your first one!
              </p>
              <div style={{ display:"flex", justifyContent:"center" }}>
                <CreateButton onClick={() => setShowModal(true)} />
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <p style={{ color:"#5A5040", fontSize:"0.9rem", textAlign:"center", padding:"3rem" }}>
              No vehicles match your search.
            </p>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:"0.65rem", animation:"sFadeIn 0.3s ease" }}>
              {filtered.map(item => <StorageCard key={item.id} item={item} customers={customers} />)}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <CreateModal onClose={() => setShowModal(false)} onCreated={handleCreated} />
      )}
    </>
  );
}