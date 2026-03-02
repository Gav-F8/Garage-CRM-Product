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
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  addDoc,
  getDocs,
  collection,
  serverTimestamp,
  orderBy,
  query,
} from "firebase/firestore";

import { notionTheme, notionClasses } from "/src/lib/notion-theme"; 

// ─────────────────────────────────────────────
// Firebase
// ─────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyA9dLSpj5P_8dCPUfPzi5ydeIx-_aFBs-0",
  authDomain: "classic-garage-mgmt.firebaseapp.com",
  projectId: "classic-garage-mgmt",
  storageBucket: "classic-garage-mgmt.firebasestorage.app",
  messagingSenderId: "215021063501",
  appId: "1:215021063501:web:c4abed06c04b7955d8fb04",
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = getAuth(app);
const db = getFirestore(app);

// ─────────────────────────────────────────────
// Firestore Helpers
// ─────────────────────────────────────────────
async function fetchCustomers() {
  const querySnapshot = await getDocs(
    query(collection(db, "customers"), orderBy("createdAt", "desc"))
  );

  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

async function createCustomer(data) {
  const docRef = await addDoc(collection(db, "customers"), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return { id: docRef.id };
}

// ─────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────
function validate(form) {
  const errors = {};
  if (!form.name.trim()) errors.name = "Name is required";

  if (
    form.email &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)
  ) {
    errors.email = "Invalid email address";
  }

  if (
    form.phone &&
    !/^[\d\s\+\-\(\)]{7,20}$/.test(form.phone)
  ) {
    errors.phone = "Invalid phone number";
  }

  return errors;
}

// ─────────────────────────────────────────────
// Input Component (Notion Style)
// ─────────────────────────────────────────────
function Input({
  label,
  name,
  type = "text",
  value,
  onChange,
  error,
  multiline,
}) {
  return (
    <div className="space-y-1">
      <label className={notionClasses.label}>{label}</label>

      {multiline ? (
        <textarea
          name={name}
          value={value}
          onChange={onChange}
          rows={3}
          className={`${notionClasses.input} h-auto py-2`}
        />
      ) : (
        <input
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          className={notionClasses.input}
        />
      )}

      {error && (
        <p className="text-sm text-[#C53030]">
          {error}
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Modal
// ─────────────────────────────────────────────
function CreateModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
  });

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const handleSubmit = async () => {
    const err = validate(form);
    if (Object.keys(err).length) {
      setErrors(err);
      return;
    }

    setSaving(true);

    try {
      const { id } = await createCustomer({
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        address: form.address.trim() || null,
        notes: form.notes.trim() || null,
      });

      onCreated({
        id,
        ...form,
      });

      onClose();
    } catch (err) {
      setErrors({ name: "Failed to save. Try again." });
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
      <div className="bg-white w-full max-w-md rounded-xl border border-[#E0E0E0] shadow-lg p-6 space-y-4">

        <h2 className="text-lg font-semibold text-[#37352F]">
          New Customer
        </h2>

        <Input
          label="Full Name"
          name="name"
          value={form.name}
          onChange={handleChange}
          error={errors.name}
        />

        <Input
          label="Email"
          name="email"
          value={form.email}
          onChange={handleChange}
          error={errors.email}
        />

        <Input
          label="Phone"
          name="phone"
          value={form.phone}
          onChange={handleChange}
          error={errors.phone}
        />

        <Input
          label="Address"
          name="address"
          value={form.address}
          onChange={handleChange}
        />

        <Input
          label="Notes"
          name="notes"
          value={form.notes}
          onChange={handleChange}
          multiline
        />

        <div className="flex justify-end gap-3 pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-[#787774] hover:text-[#37352F]"
          >
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            disabled={saving}
            className={notionClasses.button}
          >
            {saving ? "Saving..." : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────
export default function CreateCustomerPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchCustomers()
      .then(setCustomers)
      .finally(() => setLoading(false));
  }, []);

  const handleCreated = (newCustomer) => {
    setCustomers((prev) => [newCustomer, ...prev]);
  };

  const filtered = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email && c.email.toLowerCase().includes(search.toLowerCase())) ||
    (c.phone && c.phone.includes(search))
  );

  return (
    <div className={notionClasses.pageContainer}>
      <div className={notionClasses.dashboardContainer}>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className={notionClasses.header.title}>
              Customers
            </h1>
            <p className={notionClasses.header.subtitle}>
              {loading ? "Loading..." : `${customers.length} total`}
            </p>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="h-10 px-4 rounded-lg bg-[#37352F] hover:bg-[#474540] text-white text-sm font-medium shadow-sm transition-all"
          >
            + New
          </button>
        </div>

        {/* Search */}
        {customers.length > 0 && (
          <div className="mb-6">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customers..."
              className={notionClasses.input}
            />
          </div>
        )}

        {/* Table */}
        {loading ? (
          <p className="text-sm text-[#787774]">
            Loading customers...
          </p>
        ) : customers.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-[#E0E0E0] rounded-xl bg-white shadow-sm">
            <p className="text-sm text-[#787774] mb-4">
              No customers yet.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="h-10 px-4 rounded-lg bg-[#37352F] hover:bg-[#474540] text-white text-sm font-medium shadow-sm transition-all"
            >
              + Create Customer
            </button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-[#E0E0E0] bg-white shadow-sm">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className={notionClasses.table.header}>Name</th>
                  <th className={notionClasses.table.header}>Email</th>
                  <th className={notionClasses.table.header}>Phone</th>
                  <th className={notionClasses.table.header}>Address</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className={notionClasses.table.row}>
                    <td className={notionClasses.table.cell}>{c.name}</td>
                    <td className={notionClasses.table.cell}>{c.email || "-"}</td>
                    <td className={notionClasses.table.cell}>{c.phone || "-"}</td>
                    <td className={notionClasses.table.cell}>{c.address || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showModal && (
          <CreateModal
            onClose={() => setShowModal(false)}
            onCreated={handleCreated}
          />
        )}
      </div>
    </div>
  );
}