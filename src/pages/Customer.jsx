// CustomerPage
// ├── Header (title + "Create Customer" button)
// ├── Search bar (visible when list has items)
// ├── Customer list  ← reads from Firestore
// └── CreateModal    ← writes to Firestore, updates list on success
// ══════════════════════════════════════════════════════════════════════════════
// FIRESTORE DATA STRUCTURE — customers/{auto-id}
// ══════════════════════════════════════════════════════════════════════════════
// {
//   name:      string          // required
//   phone:     string | null
//   email:     string | null
//   address:   string | null
//   notes:     string | null   // optional internal notes
//   createdAt: Timestamp       // serverTimestamp()
//   updatedAt: Timestamp       // serverTimestamp()
// }

import { useState, useEffect } from "react";
import { initializeApp,getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, addDoc, getDocs, collection, serverTimestamp, orderBy, query } from "firebase/firestore";

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

// ─── Firestore Helper──────────────────────────────────────────────────────
async function fetchCustomers() {
  const querySnapshot = await getDocs(query(collection(db, "customers"), orderBy("createdAt", "desc")));
  const customers = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  return customers;
}

async function createCustomer(data) {  // data = { name, phone, email, address, notes }
  const customersCol = collection(db, "customers");
  const docRef = await addDoc(customersCol, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return { id: docRef.id };
}

// ─── Field validation ──────────────────────────────────────────────────────
function validate(form) {
  const errors = {};
  if (!form.name) errors.name = "Name is required";
  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
    errors.email = "Invalid email address";
  if (form.phone && !/^[\d\s\+\-\(\)]{7,20}$/.test(form.phone))
    errors.phone = "Invalid phone number";
  return errors;
}

// ─── Icons ────────────────────────────────────────────────────────────────────
const icons = {
  user:    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>,
  phone:   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.07 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3 2.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 9.91a16 16 0 0 0 5.99 5.99l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16.92z"/></svg>,
  mail:    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 7 10-7"/></svg>,
  pin:     <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  note:    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  plus:    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  close:   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  check:   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>,
  spinner: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{animation:"cSpin 0.8s linear infinite"}}><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>,
};

// ─── Shared Create Button ─────────────────────────────────────────────────────
function CreateButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      style={{ display:"flex", alignItems:"center", gap:"0.5rem", background:"linear-gradient(135deg,#C8A96E,#A07840)", border:"none", borderRadius:"10px", color:"#1A150E", padding:"0.65rem 1.25rem", fontFamily:"'Playfair Display',serif", fontWeight:700, fontSize:"0.9rem", cursor:"pointer", flexShrink:0, boxShadow:"0 4px 20px rgba(200,169,110,0.25)", transition:"opacity 0.2s" }}
      onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
      onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
      {icons.plus} Create Customer
    </button>
  );
}

// ─── Input component ───────────────────────────────────────────────────────
function Input({ icon, label, name, type = "text", placeholder, value, onChange, error, required, multiline }) {
  const [focused, setFocused] = useState(false);

  const base = {
    width: "100%",
    background: "transparent",
    border: "none",
    outline: "none",
    color: "#F1EDE4",
    fontSize: "0.95rem",
    fontFamily: "'Literata', Georgia, serif",
    padding: 0,
    resize: "none",
  };

  return (
    <div style={{ marginBottom: "1.25rem" }}>
      <label style={{ display: "block", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: error ? "#E07050" : focused ? "#C8A96E" : "#7A6E5E", marginBottom: "0.5rem", transition: "color 0.2s" }}>
        {label}{required && <span style={{ color: "#E07050", marginLeft: 3 }}>*</span>}
      </label>
      <div onClick={e => e.stopPropagation()} style={{ display: "flex", alignItems: multiline ? "flex-start" : "center", gap: "0.75rem", background: focused ? "rgba(200,169,110,0.06)" : "rgba(255,255,255,0.03)", border: `1.5px solid ${error ? "#E07050" : focused ? "#C8A96E" : "rgba(255,255,255,0.08)"}`, borderRadius: "10px", padding: multiline ? "0.85rem" : "0 0.85rem", transition: "all 0.2s", minHeight: multiline ? "auto" : "52px" }}>
        <span style={{ color: error ? "#E07050" : focused ? "#C8A96E" : "#5A5040", flexShrink: 0, paddingTop: multiline ? "2px" : 0, transition: "color 0.2s" }}>{icon}</span>
        {multiline ? (
          <textarea rows={3} name={name} placeholder={placeholder} value={value} onChange={onChange} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} style={{ ...base, paddingTop: "2px", lineHeight: 1.6 }} />
        ) : (
          <input type={type} name={name} placeholder={placeholder} value={value} onChange={onChange} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} style={base} />
        )}
      </div>
      {error && <p style={{ margin: "0.35rem 0 0 0.25rem", fontSize: "0.78rem", color: "#E07050" }}>{error}</p>}
    </div>
  );
}

// ─── Create Modal ──────────────────────────────────────────────────────────
function CreateModal({ onClose, onCreated}) {
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", notes: "" });
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
    const { id } = await createCustomer({  // ← add await
      name:    form.name.trim(),
      phone:   form.phone.trim() || null,
      email:   form.email.trim() || null,
      address: form.address.trim() || null,
      notes:   form.notes.trim() || null,
    });
    setDone(true);
    onCreated({ id, name: form.name.trim(), phone: form.phone.trim() || null, email: form.email.trim() || null, address: form.address.trim() || null });
    setTimeout(onClose, 1200);
  } catch(err) {
    console.error("Error saving customer:", err);
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
              {icons.user}
            </div>
            <span style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.1rem", fontWeight:700, color:"#F1EDE4" }}>New Customer</span>
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
              <Input icon={icons.user}  label="Full Name"      name="name"    placeholder="e.g. John Murphy"            value={form.name}    onChange={handleChange} error={errors.name}  required />
              <Input icon={icons.phone} label="Phone Number"   name="phone"   placeholder="+353 87 123 4567"            value={form.phone}   onChange={handleChange} error={errors.phone} />
              <Input icon={icons.mail}  label="Email Address"  name="email"   type="email" placeholder="john@email.com" value={form.email}   onChange={handleChange} error={errors.email} />
              <Input icon={icons.pin}   label="Address"        name="address" placeholder="12 Main St, Maynooth"        value={form.address} onChange={handleChange} />
              <Input icon={icons.note}  label="Internal Notes" name="notes"   placeholder="Any notes about this customer..." value={form.notes} onChange={handleChange} multiline />
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

// ─── Customer Card ────────────────────────────────────────────────────────
function CustomerCard({ customer }) {
  const initials = customer.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
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
        <div style={{ fontWeight:600, color:"#F1EDE4", fontSize:"0.95rem", marginBottom:"0.25rem", fontFamily:"'Playfair Display',serif" }}>{customer.name}</div>
        <div style={{ display:"flex", gap:"1rem", flexWrap:"wrap" }}>
          {customer.phone && (
            <span style={{ display:"flex", alignItems:"center", gap:"0.3rem", color:"#7A6E5E", fontSize:"0.78rem" }}>
              <span style={{ color:"#5A5040" }}>{icons.phone}</span> {customer.phone}
            </span>
          )}
          {customer.email && (
            <span style={{ display:"flex", alignItems:"center", gap:"0.3rem", color:"#7A6E5E", fontSize:"0.78rem", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              <span style={{ color:"#5A5040" }}>{icons.mail}</span> {customer.email}
            </span>
          )}
          {customer.address && (
            <span style={{ display:"flex", alignItems:"center", gap:"0.3rem", color:"#7A6E5E", fontSize:"0.78rem" }}>
              <span style={{ color:"#5A5040" }}>{icons.pin}</span> {customer.address}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
// ─── Success screen ────────────────────────────────────────────────────────
// function SuccessScreen({ name, onCreateAnother }) {
//   return (
//     <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", textAlign: "center", animation: "fadeIn 0.5s ease" }}>
//       <div style={{ width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg, #C8A96E, #A07840)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1.5rem", boxShadow: "0 0 40px rgba(200,169,110,0.3)" }}>
//         <span style={{ color: "#1A150E" }}>{icons.check}</span>
//       </div>
//       <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "1.75rem", fontWeight: 700, color: "#F1EDE4", margin: "0 0 0.5rem" }}>Customer Added</h2>
//       <p style={{ color: "#7A6E5E", fontSize: "0.95rem", margin: "0 0 2rem" }}><strong style={{ color: "#C8A96E" }}>{name}</strong> has been saved to Firestore.</p>
//       <button onClick={onCreateAnother} style={{ background: "transparent", border: "1.5px solid rgba(200,169,110,0.4)", color: "#C8A96E", borderRadius: "10px", padding: "0.7rem 1.5rem", fontFamily: "'Literata', serif", fontSize: "0.9rem", cursor: "pointer", letterSpacing: "0.03em", transition: "all 0.2s" }}
//         onMouseEnter={e => { e.target.style.background = "rgba(200,169,110,0.08)"; e.target.style.borderColor = "#C8A96E"; }}
//         onMouseLeave={e => { e.target.style.background = "transparent"; e.target.style.borderColor = "rgba(200,169,110,0.4)"; }}>
//         + Add Another Customer
//       </button>
//     </div>
//   );
// }

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
export default function CreateCustomerPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {  // Fetch customers on mount
    fetchCustomers().
      then(data => setCustomers(data)).
      catch(err => console.error("Error fetching customers:", err)).
      finally(() => setLoading(false));
  } , []);

  const handleCreated = (newCustomer) => {
    setCustomers(prev => [newCustomer, ...prev]);
  };

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email && c.email.toLowerCase().includes(search.toLowerCase())) ||
    (c.phone && c.phone.includes(search))
  );

  const hasCustomers = !loading && customers.length > 0;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Literata:ital,wght@0,400;0,500;1,400&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #110E09; }
        ::placeholder { color: #3A342A; }
        @keyframes cSpin    { to { transform: rotate(360deg); } }
        @keyframes cFadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes cSlideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div style={{ minHeight:"100vh", background:"#110E09", fontFamily:"'Literata',Georgia,serif" }}>
        {/* Top accent line */}
        <div style={{ height:3, background:"linear-gradient(90deg,transparent,#C8A96E 30%,#A07840 70%,transparent)" }} />

        <div style={{ maxWidth:760, margin:"0 auto", padding:"2.5rem 1.5rem" }}>

          {/* ── Page header ───────────────────────────────────────────────── */}
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:"2rem", gap:"1rem" }}>
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:"0.5rem", marginBottom:"0.5rem" }}>
                <span style={{ color:"#C8A96E" }}>{icons.user}</span>
                <span style={{ fontSize:"0.7rem", fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:"#5A5040" }}>Directory</span>
              </div>
              <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:"2rem", fontWeight:700, color:"#F1EDE4", lineHeight:1.2 }}>Customers</h1>
              <p style={{ color:"#5A5040", fontSize:"0.85rem", marginTop:"0.35rem" }}>
                {loading ? "Loading…" : `${customers.length} customer${customers.length !== 1 ? "s" : ""} total`}
              </p>
            </div>

            {/* Button only appears top-right when list has items */}
            {hasCustomers && <CreateButton onClick={() => setShowModal(true)} />}
          </div>

          {/* ── Search bar (only when list has items) ─────────────────────── */}
          {hasCustomers && (
            <div style={{ display:"flex", alignItems:"center", gap:"0.6rem", background:"rgba(255,255,255,0.03)", border:"1.5px solid rgba(255,255,255,0.07)", borderRadius:"10px", padding:"0 0.85rem", marginBottom:"1.5rem", height:46 }}>
              <span style={{ color:"#5A5040", flexShrink:0 }}>{icons.user}</span>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, email or phone…"
                style={{ flex:1, background:"transparent", border:"none", outline:"none", color:"#F1EDE4", fontSize:"0.88rem", fontFamily:"'Literata',serif" }}
              />
            </div>
          )}

           {/* ── Content ───────────────────────────────────────────────────── */}
          {loading ? (
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:"4rem", color:"#5A5040", gap:"0.6rem" }}>
              {icons.spinner} Loading customers…
            </div>

          ) : customers.length === 0 ? (
            // Empty state — button centred
            <div style={{ textAlign:"center", padding:"5rem 2rem", border:"1px dashed rgba(255,255,255,0.07)", borderRadius:"14px", animation:"cFadeIn 0.4s ease" }}>
              <div style={{ width:56, height:56, borderRadius:"50%", background:"rgba(200,169,110,0.08)", border:"1px solid rgba(200,169,110,0.15)", display:"flex", alignItems:"center", justifyContent:"center", color:"#C8A96E", margin:"0 auto 1.25rem" }}>
                {icons.user}
              </div>
              <p style={{ color:"#5A5040", fontSize:"0.9rem", marginBottom:"1.75rem" }}>
                No customers yet. Create your first one!
              </p>
              <div style={{ display:"flex", justifyContent:"center" }}>
                <CreateButton onClick={() => setShowModal(true)} />
              </div>
            </div>

          ) : filteredCustomers.length === 0 ? (
            <p style={{ color:"#5A5040", fontSize:"0.9rem", textAlign:"center", padding:"3rem" }}>
              No customers match your search.
            </p>

          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:"0.65rem", animation:"cFadeIn 0.3s ease" }}>
              {filteredCustomers.map(c => <CustomerCard key={c.id} customer={c} />)}
            </div>
          )}
        </div>
      </div>

          {/* ── Modal ───────────────────────────────────────────── */}
        {showModal && (
          <CreateModal
            onClose={() => setShowModal(false)}
            onCreated={handleCreated}
          />
        )}
    </>
  );
}