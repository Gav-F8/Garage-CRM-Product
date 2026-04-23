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
import { auth, db } from "/src/firebase.js";
import { useNavigate } from "react-router-dom";
import {
  fetchCustomers,
  fetchTotalHoursCustomer,
  fetchEmployeeName,
} from "/src/lib/firestore-helpers.js";
import {
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import { notionClasses } from "/src/lib/notion-theme";
import { NavigationBar } from "/src/components/NavigationBar.jsx";

async function createCustomer(businessId, data) {
  const currentUserId = auth.currentUser?.uid || null;
  let employeeName = null;

  if (currentUserId) {
    employeeName = await fetchEmployeeName(businessId, currentUserId);
  }

  const docRef = await addDoc(
    collection(db, "businesses", businessId, "Customers"),
    {
      ...data,
      createdByEmployeeId: currentUserId,
      createdByEmployeeName: employeeName,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
  );

  return { id: docRef.id };
}

// ══════════════════════════════════════════════════════════════════════════════
// New Customer Creation Form and validation logic
// ══════════════════════════════════════════════════════════════════════════════

function validate(form) {
  const errors = {};
  if (!form.name.trim()) errors.name = "Name is required";

  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = "Invalid email address";
  }

  if (form.phone && !/^[\d\s+\-()]{7,20}$/.test(form.phone)) {
    errors.phone = "Invalid phone number";
  }

  return errors;
}

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
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-[#37352F]">{label}</label>

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

function CreateButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="h-10 px-4 rounded-lg bg-[#37352F] hover:bg-[#474540] text-white text-sm font-medium shadow-sm transition-all"
    >
      + New Customer
    </button>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// New Customer Create Modal
// ══════════════════════════════════════════════════════════════════════════════
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
  const [notice, setNotice] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const handleSubmit = async () => {
    if (localStorage.getItem("ccgUserRole") !== "owner") {
      setNotice("Only owner can add customer.");
      return;
    }

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
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        address: form.address.trim() || null,
        notes: form.notes.trim() || null,
        createdByEmployeeId: currentUserId,
        createdByEmployeeName: employeeName,
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
        <h2 className="text-lg font-semibold text-[#37352F]">New Customer</h2>

        {notice && (
          <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            {notice}
          </div>
        )}

        {/* FULL NAME FORM */}
        <Input
          label="Full Name"
          name="name"
          value={form.name}
          onChange={handleChange}
          error={errors.name}
        />

        {/* EMAIL FORM */}
        <Input
          label="Email"
          name="email"
          value={form.email}
          onChange={handleChange}
          error={errors.email}
        />

        {/* PHONE FORM */}
        <Input
          label="Phone"
          name="phone"
          value={form.phone}
          onChange={handleChange}
          error={errors.phone}
        />

        {/* ADDRESS FORM */}
        <Input
          label="Address"
          name="address"
          value={form.address}
          onChange={handleChange}
        />

        {/* NOTES FORM */}
        <Input
          label="Notes"
          name="notes"
          value={form.notes}
          onChange={handleChange}
          multiline
        />

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
            {saving ? "Saving..." : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Main Page
// ══════════════════════════════════════════════════════════════════════════════
export default function CreateCustomerPage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [businessId, setBusinessId] = useState(null);
  const searchInputRef = useRef(null);
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
        setBusinessId(bizId);
        fetchCustomers(bizId)
          .then(async (customerData) => {
            setCustomers(customerData);

            const hoursMap = {};

            await Promise.all(
              customerData.map(async (customer) => {
                const hours = await fetchTotalHoursCustomer(bizId, customer.id);
                hoursMap[customer.id] = hours;
              }),
            );

            setTotalHoursMap(hoursMap);
          })
          .finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  // Clear search input after modal closes to prevent autofill
  useEffect(() => {
    if (!showModal && searchInputRef.current) {
      searchInputRef.current.value = "";
    }
  }, [showModal]);

  const handleCreated = (newCustomer) => {
    setCustomers((prev) => [newCustomer, ...prev]);
    setSearch(""); // Reset search when new customer is added
    setShowModal(false); // Close modal
    setTotalHoursMap((p) => ({ ...p, [newCustomer.id]: "0h 0m" }));
  };

  const filtered = customers.filter(
    (c) =>
      (c.name && c.name.toLowerCase().includes(search.toLowerCase())) ||
      (c.email && c.email.toLowerCase().includes(search.toLowerCase())) ||
      (c.phone && c.phone.includes(search)),
  );

  // Pagination logic
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = filtered.slice(startIndex, endIndex);

  return (
    <div className={notionClasses.pageContainer}>
      <NavigationBar />
      <div className={notionClasses.dashboardContainer}>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className={notionClasses.header.title}>Customers</h1>
            <p className={notionClasses.header.subtitle}>
              Manage all your customers and their project history in one place.
            </p>
          </div>

          {customers.length > 0 &&
            loading === false &&
            localStorage.getItem("ccgUserRole") === "owner" && (
              <CreateButton onClick={() => setShowModal(true)} />
            )}
        </div>

        {/* Search */}
        {customers.length > 0 && (
          <div className="mb-6">
            <input
              ref={searchInputRef}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
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
          <p className="text-sm text-[#787774]">Loading customers...</p>
        ) : customers.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-[#E0E0E0] rounded-xl bg-white shadow-sm">
            <p className="text-sm text-[#787774] mb-4">No customers yet.</p>
            {localStorage.getItem("ccgUserRole") === "owner" && (
              <div className="flex justify-center">
                <CreateButton onClick={() => setShowModal(true)} />
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Items Per Page and Total Count */}
            <div className="flex items-center justify-between px-4 py-4 bg-gray-50 rounded-t-xl border border-[#E0E0E0]">
              <div className="text-sm text-[#787774]">
                Total:{" "}
                <span className="font-semibold text-[#37352F]">
                  {filtered.length}
                </span>{" "}
                customers
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
                    <th className={notionClasses.table.header}>Name</th>
                    <th className={notionClasses.table.header}>Email</th>
                    <th className={notionClasses.table.header}>Phone</th>
                    <th className={notionClasses.table.header}>Address</th>
                    <th className={notionClasses.table.header}>Total Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((c) => (
                    <tr
                      key={c.id}
                      className="border-t border-[#E0E0E0] hover:bg-blue-50 hover:border-l-4 hover:border-l-blue-400 transition-all duration-150 cursor-pointer"
                      onClick={() => navigate(`/customer/${c.id}`)}
                    >
                      <td className={notionClasses.table.cell}>{c.name}</td>
                      <td className={notionClasses.table.cell}>
                        {c.email || "-"}
                      </td>
                      <td className={notionClasses.table.cell}>
                        {c.phone || "-"}
                      </td>
                      <td className={notionClasses.table.cell}>
                        {c.address || "-"}
                      </td>
                      <td className={notionClasses.table.cell}>
                        {totalHoursMap[c.id] || "0h 0m"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 bg-gray-50 rounded-b-xl border border-t-0 border-[#E0E0E0]">
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
            onClose={() => setShowModal(false)}
            onCreated={handleCreated}
          />
        )}
      </div>
    </div>
  );
}
