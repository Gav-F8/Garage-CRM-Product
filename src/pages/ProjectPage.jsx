// AllProjectsPage.jsx — list and create repair jobs
// ══════════════════════════════════════════════════════════════════════════════
// FIRESTORE DATA STRUCTURE — projects/{auto-id}
// ══════════════════════════════════════════════════════════════════════════════
// {
//   assignedMechanicId:      string          // required
//   assignedMechanicName:    string | null
//   carId:                   string | null
//   carLabel:                string | null
//   createdAt:               Timestamp       // serverTimestamp()
//   createdByEmployeeId:     string          // required
//   createdByEmployeeName:   string          // required
//   customerId:              string | null
//   customerName:            string | null
//   lastNoteAt:              Timestamp | null
//   lastNoteText:            string | null
//   isActive:                boolean | null
//   priority:                string | null
//   status:                  string | null
//   title:                   string
//   totalMinutes:            integer
//   updatedAt:               Timestamp       // serverTimestamp()
// }
// ══════════════════════════════════════════════════════════════════════════════

import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { auth, db } from "/src/firebase.js";
import { NavigationBar } from "../components/NavigationBar";
import ProjectsList from "../components/ProjectsList";
import { useProjectsForCurrentUser } from "../hooks/useProjectsForCurrentUser";
import { notionClasses } from "../lib/notion-theme";
import { STATUS_OPTIONS } from "../lib/status";

async function fetchBusinessId(userUid) {
  const snap = await getDocs(
    query(collection(db, "businesses"), where("uid", "==", userUid)),
  );
  if (snap.empty) return null;
  return snap.docs[0].id;
}

async function fetchCustomers(businessId) {
  const snap = await getDocs(
    query(
      collection(db, "businesses", businessId, "Customers"),
      orderBy("name"),
    ),
  );
  return snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
}

async function fetchVehicles(businessId) {
  const snap = await getDocs(
    query(
      collection(db, "businesses", businessId, "storage"),
      orderBy("createdAt", "desc"),
    ),
  );
  return snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
}

async function fetchMechanics(businessId) {
  const snap = await getDocs(collection(db, "businesses", businessId, "Employees"));

  return snap.docs
    .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
    .filter((employee) => {
      const role = String(employee.role || "").toLowerCase();
      const status = String(employee.status || "active").toLowerCase();
      return (role === "mechanic" || role === "owner") && status !== "rejected";
    })
    .map((employee) => ({
      id: employee.id,
      name: employee.Name || employee.name || employee.email || employee.id,
    }));
}

async function fetchEmployeeName(businessId, employeeId) {
  if (!employeeId) return null;

  const employeeRef = doc(db, "businesses", businessId, "Employees", employeeId);
  const snap = await getDoc(employeeRef);

  if (!snap.exists()) return null;
  const employeeData = snap.data();
  return employeeData.Name || employeeData.name || null;
}

// ══════════════════════════════════════════════════════════════════════════════
// New Job Creation Form initial state and validation logic
// ══════════════════════════════════════════════════════════════════════════════

const INITIAL_JOB_FORM = {
  title: "",
  customerId: "",
  carId: "",
  status: "",
  assignedMechanicId: "",
};

function validateJobForm(form) {
  const errors = {};
  if (!form.title.trim()) errors.title = "Please enter a job title";
  if (!form.customerId) errors.customerId = "Please select a customer";
  if (!form.carId) errors.carId = "Please select a vehicle";
  if (!form.status) errors.status = "Please select a status";
  if (!form.assignedMechanicId) {
    errors.assignedMechanicId = "Please select a mechanic";
  }
  return errors;
}

function CreateButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="h-10 px-4 rounded-lg bg-[#37352F] hover:bg-[#474540] text-white text-sm font-medium shadow-sm transition-all"
    >
      + New Job
    </button>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// New Job Creation Form
// ══════════════════════════════════════════════════════════════════════════════

function CreateModal({ customers, vehicles, mechanics, submitting, onClose, onCreate }) {
  const [form, setForm] = useState(INITIAL_JOB_FORM);
  const [errors, setErrors] = useState({});

  const filteredVehicles = useMemo(() => {
    if (!form.customerId) return [];
    return vehicles.filter((vehicle) => vehicle.customerId === form.customerId);
  }, [vehicles, form.customerId]);

  const setField = (name, value) => {
    setForm((prev) => {
      if (name === "customerId") {
        return { ...prev, customerId: value, carId: "" };
      }
      return { ...prev, [name]: value };
    });
    setErrors((prev) => ({ ...prev, [name]: "" }));
    if (name === "customerId") {
      setErrors((prev) => ({ ...prev, customerId: "", carId: "" }));
    }
  };

  const handleSubmit = async () => {
    const formErrors = validateJobForm(form);
    if (Object.keys(formErrors).length) {
      setErrors(formErrors);
      return;
    }

    const ok = await onCreate({
      title: form.title.trim(),
      customerId: form.customerId,
      carId: form.carId,
      status: form.status,
      assignedMechanicId: form.assignedMechanicId,
    });

    if (ok) {
      setForm(INITIAL_JOB_FORM);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-xl border border-[#E0E0E0] bg-white p-6 shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-[#37352F]">Create New Job</h2>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-[#37352F]">Title *</label>
          <input
            value={form.title}
            onChange={(event) => setField("title", event.target.value)}
            placeholder="e.g. Brake pad replacement"
            className="w-full rounded-lg border border-[#E0E0E0] bg-[#F7F6F3] px-3 py-2 text-sm text-[#37352F] outline-none transition-all focus:border-[#37352F] focus:bg-white"
          />
          {errors.title && <p className="text-xs text-[#C53030]">{errors.title}</p>}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-[#37352F]">Customer *</label>
          <select
            value={form.customerId}
            onChange={(event) => setField("customerId", event.target.value)}
            className="w-full rounded-lg border border-[#E0E0E0] bg-[#F7F6F3] px-3 py-2 text-sm text-[#37352F] outline-none transition-all focus:border-[#37352F] focus:bg-white"
          >
            <option value="">Select customer</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name || customer.email || customer.id}
              </option>
            ))}
          </select>
          {errors.customerId && <p className="text-xs text-[#C53030]">{errors.customerId}</p>}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-[#37352F]">Vehicle *</label>
          <select
            value={form.carId}
            onChange={(event) => setField("carId", event.target.value)}
            disabled={!form.customerId || filteredVehicles.length === 0}
            className="w-full rounded-lg border border-[#E0E0E0] bg-[#F7F6F3] px-3 py-2 text-sm text-[#37352F] outline-none transition-all focus:border-[#37352F] focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {!form.customerId && <option value="">Select customer first</option>}
            {form.customerId && filteredVehicles.length === 0 && (
              <option value="">No vehicles for this customer</option>
            )}
            {form.customerId && filteredVehicles.length > 0 && (
              <option value="">Select vehicle</option>
            )}
            {filteredVehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {[vehicle.year, vehicle.make, vehicle.model, vehicle.plate]
                  .filter(Boolean)
                  .join(" ")}
              </option>
            ))}
          </select>
          {errors.carId && <p className="text-xs text-[#C53030]">{errors.carId}</p>}
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-[#37352F]">Status *</label>
            <select
              value={form.status}
              onChange={(event) => setField("status", event.target.value)}
              className="w-full rounded-lg border border-[#E0E0E0] bg-[#F7F6F3] px-3 py-2 text-sm text-[#37352F] outline-none transition-all focus:border-[#37352F] focus:bg-white"
            >
              <option value="">Select status</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status.key} value={status.key}>
                  {status.label}
                </option>
              ))}
            </select>
            {errors.status && <p className="text-xs text-[#C53030]">{errors.status}</p>}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-[#37352F]">Assigned Mechanic *</label>
            <select
              value={form.assignedMechanicId}
              onChange={(event) => setField("assignedMechanicId", event.target.value)}
              className="w-full rounded-lg border border-[#E0E0E0] bg-[#F7F6F3] px-3 py-2 text-sm text-[#37352F] outline-none transition-all focus:border-[#37352F] focus:bg-white"
            >
              <option value="">Select mechanic</option>
              {mechanics.map((mechanic) => (
                <option key={mechanic.id} value={mechanic.id}>
                  {mechanic.name || mechanic.id}
                </option>
              ))}
            </select>
            {errors.assignedMechanicId && (
              <p className="text-xs text-[#C53030]">{errors.assignedMechanicId}</p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="h-10 rounded-lg bg-[#37352F] px-4 text-sm font-medium text-white shadow-sm transition-all hover:bg-[#474540]"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="h-10 rounded-lg bg-[#37352F] px-4 text-sm font-medium text-white shadow-sm transition-all hover:bg-[#474540] disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProjectPage() {
  const [businessId, setBusinessId] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [mechanics, setMechanics] = useState([]);
  const [creationDataLoading, setCreationDataLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [showModal, setShowModal] = useState(false);

  const {
    projects,
    loading,
    error,
    refreshProjects,
  } = useProjectsForCurrentUser({
    businessId,
    enabled: Boolean(businessId),
  });

  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        setCreationDataLoading(false);
        return;
      }

      try {
        const bizId =
          (await fetchBusinessId(user.uid)) || localStorage.getItem("ccgBusinessId");
        setBusinessId(bizId);

        if (!bizId) {
          setCreationDataLoading(false);
          return;
        }

        const [customerList, vehicleList, mechanicList] = await Promise.all([
          fetchCustomers(bizId),
          fetchVehicles(bizId),
          fetchMechanics(bizId),
        ]);

        setCustomers(customerList);
        setVehicles(vehicleList);
        setMechanics(mechanicList);
      } finally {
        setCreationDataLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleJobSubmit = async (payload) => {
    setSubmitting(true);
    setSubmitError("");
    setSubmitMessage("");

    try {
      if (!businessId) {
        throw new Error("Business ID not found. Please refresh and try again.");
      }

      const currentUser = auth.currentUser;
      if (!currentUser?.uid) {
        throw new Error("No authenticated user found.");
      }

      const createdByEmployeeName = await fetchEmployeeName(
        businessId,
        currentUser.uid,
      );

      const selectedCustomer = customers.find((customer) => customer.id === payload.customerId);
      const selectedVehicle = vehicles.find((vehicle) => vehicle.id === payload.carId);
      const selectedMechanic = mechanics.find(
        (mechanic) => mechanic.id === payload.assignedMechanicId,
      );

      const carLabel = [
        selectedVehicle?.year,
        selectedVehicle?.make,
        selectedVehicle?.model,
      ]
        .filter(Boolean)
        .join(" ");

      const jobData = {
        title: payload.title,
        customerId: payload.customerId,
        customerName: selectedCustomer?.name || null,
        carId: payload.carId,
        carLabel: carLabel || null,
        status: payload.status,
        assignedMechanicId: payload.assignedMechanicId,
        assignedMechanicName: [selectedMechanic?.name] || null,

        createdByEmployeeId: currentUser.uid,
        createdByEmployeeName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),

        isActive: false,
        priority: null,
        totalMinutes: 0,
        lastNoteAt: null,
        lastNoteText: null,
      };

      const jobRef = await addDoc(
        collection(db, "businesses", businessId, "Projects"),
        jobData,
      );

      setSubmitMessage(`Project created successfully! ID: ${jobRef.id}.`);
      refreshProjects();
      setCurrentPage(1);
      return true;
    } catch (creationError) {
      console.error("Error creating project:", creationError);
      setSubmitError(
        creationError.message || "Failed to create project. Please try again.",
      );
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  // Pagination logic
  const totalPages = Math.max(1, Math.ceil(projects.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProjects = projects.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [projects.length]);

  // Handle items per page change
  const handleItemsPerPageChange = (newValue) => {
    setItemsPerPage(newValue);
    setCurrentPage(1);
  };

  return (
    <div className={notionClasses.pageContainer}>
      <NavigationBar />
      <div className={notionClasses.dashboardContainer}>
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className={notionClasses.header.title}>Jobs</h1>
            <p className={notionClasses.header.subtitle}>
              View and Manage Project Jobs.
            </p>
          </div>

          {!creationDataLoading && (
            <CreateButton onClick={() => setShowModal(true)} />
          )}
        </div>

        {submitMessage && (
          <p className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
            {submitMessage}
          </p>
        )}

        {submitError && (
          <p className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {submitError}
          </p>
        )}

        {/* Info Bar with Pagination Controls */}
        {!loading && projects.length > 0 && (
          <div className="flex items-center justify-between mb-6 px-6 py-4 bg-gray-50 rounded-t-xl border border-[#E0E0E0]">
            <div className="text-sm text-[#787774]">
              Total: <span className="font-semibold text-[#37352F]">{projects.length}</span> Jobs
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm text-[#787774]">Show:</label>
              <select
                value={itemsPerPage}
                onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                className="px-3 py-1 text-sm text-[#37352F] bg-white border border-[#E0E0E0] rounded-lg outline-none focus:border-[#37352F] transition-all"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        )}

        {/* Projects List */}
        <div className={!loading && projects.length > 0 ? "border border-t-0 border-[#E0E0E0] rounded-b-xl shadow-sm overflow-hidden" : ""}>
          <ProjectsList
            projects={paginatedProjects}
            loading={loading}
            error={error}
            emptyMessage="No Jobs yet."
            showFilters={!loading && projects.length > 0}
            showSearch={!loading && projects.length > 0}
            searchInputClassName={notionClasses.input}
          />
        </div>

        {/* Pagination Controls */}
        {!loading && projects.length > 0 && totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 bg-gray-50 rounded-b-xl border border-t-0 border-[#E0E0E0]">
            <div className="text-sm text-[#787774]">
              Page <span className="font-semibold text-[#37352F]">{currentPage}</span> of <span className="font-semibold text-[#37352F]">{totalPages}</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 text-sm font-medium text-[#37352F] bg-white border border-[#E0E0E0] rounded-lg hover:bg-[#F7F6F3] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 text-sm font-medium text-[#37352F] bg-white border border-[#E0E0E0] rounded-lg hover:bg-[#F7F6F3] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Empty State with CTA */}
        {!loading && projects.length === 0 && (
          <div className="text-center py-16 border border-dashed border-[#E0E0E0] rounded-xl bg-white shadow-sm">
            <p className="text-sm text-[#787774] mb-4">No Jobs found.</p>
            {!creationDataLoading && <CreateButton onClick={() => setShowModal(true)} />}
          </div>
        )}

        {showModal && (
          <CreateModal
            customers={customers}
            vehicles={vehicles}
            mechanics={mechanics}
            submitting={submitting}
            onClose={() => setShowModal(false)}
            onCreate={handleJobSubmit}
          />
        )}
      </div>
    </div>
  );
}