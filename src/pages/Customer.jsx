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

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { auth,db } from "/src/firebase.js";
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

import { notionClasses } from "/src/lib/notion-theme"; 
import { NavigationBar } from "/src/components/NavigationBar.jsx";

// ─────────────────────────────────────────────
// Firestore Helpers
// ─────────────────────────────────────────────
async function fetchCustomers(businessId) {
  const querySnapshot = await getDocs(
    query(
      collection(db, "businesses", businessId, "Customers"),
      orderBy("createdAt", "desc")
    )
  );
  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

async function createCustomer(businessId, data) {
  const currentUserId = auth.currentUser?.uid || null;
  let employeeName = null;
  
  if (currentUserId) {
    employeeName = await fetchEmployeeName(businessId, currentUserId);
  }
  
  const docRef = await addDoc(
    collection(db, "businesses", businessId, "Customers"), {
    ...data,
    createdByEmployeeId: currentUserId,
    createdByEmployeeName: employeeName,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return { id: docRef.id };
}

async function fetchBusinessId(userUid) {
  const snap = await getDocs(
    query(collection(db, "businesses"), where("uid", "==", userUid))
  );
  if (snap.empty) return null;
  return snap.docs[0].id; 
}

async function fetchEmployeeName(businessId, employeeId) {
  try {
    // Try to get the employee document directly using the ID
    const employeeRef = doc(db, "businesses", businessId, "Employees", employeeId);
    const snap = await getDoc(employeeRef);
    
    if (snap.exists()) {
      const data = snap.data();
      // Try both "Name" (capitalized) and "name" (lowercase)
      const name = data.Name || data.name;
      if (name) {
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

async function checkHasJob(businessId, customerId) {
  try {
    // Query Projects collection to see if any project references this customer
    const projectsRef = collection(db, "businesses", businessId, "Projects");
    const q = query(projectsRef);
    const snap = await getDocs(q);
    
    // Check if any project matches the customerId AND has "active" status
    for (const doc of snap.docs) {
      const projectData = doc.data();
      if (projectData.customerId === customerId && projectData.status === "active") {
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error("Error checking for jobs:", error);
    return false;
  }
}

async function fetchTotalHours(businessId, customerId) {
  try {
    const projectsRef = collection(db, "businesses", businessId, "Projects");
    const q = query(projectsRef);
    const snap = await getDocs(q);

    let totalMinutes = 0;
    for (const projectDoc of snap.docs) {
      const projectData = projectDoc.data();
      if (projectData.customerId === customerId) {
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
function Input({ label, name, type = "text", value, onChange, error, multiline }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-[#37352F]">
        {label}
      </label>

      {multiline ? (
        <textarea
          name={name}
          value={value}
          onChange={onChange}
          rows={3}
          className="w-full px-3 py-2 text-sm text-[#37352F] bg-[#F7F6F3] border border-[#E0E0E0] rounded-lg outline-none focus:border-[#37352F] focus:bg-white transition-all resize-none"
        />
      ) : (
        <input
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          className="w-full px-3 py-2 text-sm text-[#37352F] bg-[#F7F6F3] border border-[#E0E0E0] rounded-lg outline-none focus:border-[#37352F] focus:bg-white transition-all"
        />
      )}

      {error && <p className="text-xs text-[#C53030]">{error}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────
// Create Button (used in header and empty state)
// ─────────────────────────────────────────────  
function CreateButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="h-12 px-4 rounded-lg bg-[#37352F] hover:bg-[#474540] text-white text-sm font-medium shadow-sm transition-all"
    >
      + New Customer
    </button>
  );
}

// ─────────────────────────────────────────────
// Create Modal
// ─────────────────────────────────────────────
function CreateModal({ onClose, onCreated, businessId }) {
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
      const currentUserId = auth.currentUser?.uid || null;
      let employeeName = null;
      
      if (currentUserId) {
        employeeName = await fetchEmployeeName(businessId, currentUserId);
      }

      const { id } = await createCustomer(businessId, {
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        address: form.address.trim() || null,
        notes: form.notes.trim() || null,
      });

      onCreated({
        id,
        name:    form.name.trim(),
        phone:   form.phone.trim() || null,
        email:   form.email.trim() || null,
        address: form.address.trim() || null,
        notes:   form.notes.trim() || null,
        createdByEmployeeId: currentUserId,
        createdByEmployeeAcc: employeeName,
      });

      onClose();
    } catch (error) {
      console.error("Error creating customer:", error);
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

        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="h-11 px-4 rounded-lg border border-[#E0E0E0] text-[#37352F] text-sm font-medium hover:bg-[#F7F6F3] transition-all"
          >
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            disabled={saving}
            className="h-11 px-4 rounded-lg bg-[#37352F] hover:bg-[#474540] text-white text-sm font-medium shadow-sm transition-all disabled:opacity-50"
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
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [businessId, setBusinessId] = useState(null);
  const searchInputRef = useRef(null);
  const [hasJobMap, setHasJobMap] = useState({});
  const [totalHoursMap, setTotalHoursMap] = useState({});

  useEffect(() => {
  const unsubscribe = auth.onAuthStateChanged(async (user) => {
    if (user) {
      const bizId = await fetchBusinessId(user.uid);
      setBusinessId(bizId);
      fetchCustomers(bizId)
        .then(async (customerData) => {
          setCustomers(customerData);
          
          // Check for jobs and total hours for each customer
          const jobMap = {};
          const hoursMap = {};
          for (const customer of customerData) {
            const hasJob = await checkHasJob(bizId, customer.id);
            jobMap[customer.id] = hasJob;
            const hours = await fetchTotalHours(bizId, customer.id);
            hoursMap[customer.id] = hours;
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

  // Clear search input after modal closes to prevent autofill
  useEffect(() => {
    if (!showModal && searchInputRef.current) {
      searchInputRef.current.value = "";
    }
  }, [showModal]);


  const handleCreated = async (newCustomer) => {
    setCustomers((prev) => [newCustomer, ...prev]);
    setSearch(""); // Reset search when new customer is added
    setShowModal(false); // Close modal
    
    // Check if new customer has a job
    const hasJob = await checkHasJob(businessId, newCustomer.id);
    setHasJobMap(p => ({ ...p, [newCustomer.id]: hasJob }));
    
    // Set initial hours for new customer (will be 0h 0m initially)
    setTotalHoursMap(p => ({ ...p, [newCustomer.id]: "0h 0m" }));
  };

  const filtered = customers.filter((c) =>
  (c.name && c.name.toLowerCase().includes(search.toLowerCase())) ||
  (c.email && c.email.toLowerCase().includes(search.toLowerCase())) ||
  (c.phone && c.phone.includes(search))
);

  return (
    <div className={notionClasses.pageContainer}>
      <NavigationBar />
      <div className={notionClasses.dashboardContainer}>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className={notionClasses.header.title}>
              Customers
            </h1>
            <p className={notionClasses.header.subtitle}>
              {loading ? "Loading..." : `You have ${customers.length} customers`}
            </p>
          </div>

          {customers.length > 0 && loading === false && (
            <CreateButton onClick={() => setShowModal(true)} />
          )}

        </div>

        {/* Search */}
        {customers.length > 0 && (
          <div className="mb-6">
            <input
              ref={searchInputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customers..."
              autoComplete="off"
              spellCheck="false"
              name="search-customers"
              type="text"
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
            <p className="text-sm text-[#787774] mb-4">No customers yet.</p>
            <div className="flex justify-center">
              <CreateButton onClick={() => setShowModal(true)} />
            </div>
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
                  <th className={notionClasses.table.header}>Total Hours</th>
                  <th className={notionClasses.table.header}>Active Job</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr 
                    key={c.id} 
                    className="border-t border-[#E0E0E0] hover:bg-blue-50 hover:border-l-4 hover:border-l-blue-400 transition-all duration-150 cursor-pointer"
                    onClick={() => navigate(`/customer/${c.id}`)}
                  >
                    <td className={notionClasses.table.cell}>{c.name}</td>
                    <td className={notionClasses.table.cell}>{c.email || "-"}</td>
                    <td className={notionClasses.table.cell}>{c.phone || "-"}</td>
                    <td className={notionClasses.table.cell}>{c.address || "-"}</td>
                    <td className={notionClasses.table.cell}>{totalHoursMap[c.id] || "0h 0m"}</td>
                    <td className={notionClasses.table.cell}>
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                        hasJobMap[c.id] 
                          ? 'bg-red-100 text-red-700' 
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {hasJobMap[c.id] ? 'Yes' : 'No'}
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
            onClose={() => setShowModal(false)}
            onCreated={handleCreated}
          />
        )}
      </div>
    </div>
  );
}