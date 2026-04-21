import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { notionClasses } from "/src/lib/notion-theme";
import { NavigationBar } from "/src/components/NavigationBar";
import { useCustomersForCurrentUser } from "/src/hooks/useCustomersForCurrentUser.js";
import { db } from "/src/firebase";

import { 
  STATUS_OPTIONS,
  fetchMechanics, 
} from "/src/lib/utils.js";

import {
  doc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  collection,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";

const PRIORITY_OPTIONS = ["low", "medium", "high"];

// Fetch mechanics for a business
export default function EditProjectPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const businessId = localStorage.getItem("ccgBusinessId");
  const userRole = localStorage.getItem("ccgUserRole");
  const { customers, loading: customersLoading } = useCustomersForCurrentUser(businessId);

  const [mechanics, setMechanics] = useState([]);
  const [selectedMechanicId, setSelectedMechanicId] = useState("");
  const [form, setForm] = useState({
    title: "",
    status: "",
    priority: "",
    customerId: "",
    customerName: "",
    carId: "",
    carLabel: "",
    description: "",
    assignedMechanicIds: [],
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Fetch mechanics for mount
  useEffect(() => {
    async function loadMechanics() {
      if (!businessId) return;
      try {
        const mechanicsList = await fetchMechanics(businessId);
        setMechanics(mechanicsList);
      } catch (err) {
        console.error("Error loading mechanics:", err);
        setError("Failed to load mechanics");
      }
    }
    loadMechanics();
  }, [businessId]);

  useEffect(() => {
    async function loadProject() {
      if (!businessId) {
        setError("No business context found. Please sign in again.");
        setLoading(false);
        return;
      }

      try {
        const projectRef = doc(
          db,
          "businesses",
          businessId,
          "Projects",
          projectId,
        );
        const [projectSnap, customersSnap] = await Promise.all([
          getDoc(projectRef),
          getDocs(
            query(
              collection(db, "businesses", businessId, "Customers"),
              orderBy("name")
            )
          ),
        ]);

        if (!projectSnap.exists()) {
          setError("Project not found.");
          setLoading(false);
          return;
        }

        const data = projectSnap.data();

        const allowedStatusKeys = new Set(
          STATUS_OPTIONS.map((status) => status.key),
        );
        const loadedStatus = data.status || "";
        const safeStatus = allowedStatusKeys.has(loadedStatus)
          ? loadedStatus
          : "";

        const loadedPriority = (data.priority || "").toLowerCase();
        const safePriority = PRIORITY_OPTIONS.includes(loadedPriority)
          ? loadedPriority
          : "";

        setForm({
          title: data.title || "",
          status: safeStatus,
          priority: safePriority,
          customerName: data.customerName || "",
          carLabel: data.carLabel || "",
          description: data.description || "",
          assignedMechanicIds: data.assignedMechanicIds || [],
        });

      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadProject();
  }, [businessId, projectId]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  // Add mechanic to assigned list
  const addMechanic = (mechanicId) => {
    if (!mechanicId) return;
    setForm((prev) => {
      if (prev.assignedMechanicIds.includes(mechanicId)) return prev;
      return {
        ...prev,
        assignedMechanicIds: [...prev.assignedMechanicIds, mechanicId],
      };
    });
    setSelectedMechanicId("");
  };

  // Remove mechanic from assigned list
  const removeMechanic = (mechanicId) => {
    setForm((prev) => ({
      ...prev,
      assignedMechanicIds: prev.assignedMechanicIds.filter(
        (id) => id !== mechanicId,
      ),
    }));
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const projectRef = doc(
        db,
        "businesses",
        businessId,
        "Projects",
        projectId,
      );

      await updateDoc(projectRef, {
        ...form,
        updatedAt: serverTimestamp(),
      });

      navigate(`/projects/${projectId}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      "Are you sure you want to delete this project? This cannot be undone.",
    );

    if (!confirmed) return;

    try {
      const projectRef = doc(
        db,
        "businesses",
        businessId,
        "Projects",
        projectId,
      );
      await deleteDoc(projectRef);
      navigate("/jobs");
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) {
    return (
      <div className={notionClasses.pageContainer}>
        <NavigationBar />
        <div className={notionClasses.dashboardContainer}>
          <p className="text-sm text-[#787774]">Loading project...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={notionClasses.pageContainer}>
        <NavigationBar />
        <div className={notionClasses.dashboardContainer}>
          <p className="text-sm text-[#C53030]">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={notionClasses.pageContainer}>
      <NavigationBar />

      <div className={notionClasses.dashboardContainer}>
        <div className="mb-6">
          <h1 className={notionClasses.header.title}>Edit Project</h1>
          <p className={notionClasses.header.subtitle}>
            Update the details for this project
          </p>
        </div>

        <div className="rounded-xl border border-[#E0E0E0] bg-white shadow-sm p-6 max-w-3xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#37352F]">
                Title
              </label>
              <input
                type="text"
                name="title"
                value={form.title}
                onChange={handleChange}
                className={notionClasses.input}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[#37352F]">
                Status
              </label>
              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                className={notionClasses.input}
              >
                <option value="">Select status</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status.key} value={status.key}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[#37352F]">
                Priority
              </label>
              <select
                name="priority"
                value={form.priority}
                onChange={handleChange}
                className={notionClasses.input}
              >
                <option value="">Select priority</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[#37352F]">
                Customer
              </label>
              <select
                value={form.customerId}
                onChange={(e) => {
                  const customerId = e.target.value;
                  const selectedCustomer = customers.find(c => c.id === customerId);
                  setForm((prev) => ({
                    ...prev,
                    customerId: customerId,
                    customerName: selectedCustomer.name || "",
                  }));
                }}
              className={notionClasses.input}
              >
                <option value="">Select customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name || customer.email || customer.id}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[#37352F]">
                Car Label
              </label>
              <input
                type="text"
                name="carLabel"
                value={form.carLabel}
                onChange={handleChange}
                className={notionClasses.input}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[#37352F]">
                Description
              </label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={5}
                placeholder="Describe the work needed for this project..."
                className="w-full px-3 py-2 text-sm text-[#37352F] bg-[#F7F6F3] border border-[#E0E0E0] rounded-lg outline-none focus:border-[#37352F] focus:bg-white transition-all resize-none"
              />
            </div>

            {/* ASSIGNED MECHANICS SECTION */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#37352F]">
                Assigned Mechanics*
              </label>
              <select
                value={selectedMechanicId}
                onChange={(e) => addMechanic(e.target.value)}
                className={notionClasses.input}
              >
                <option value="">Select mechanic to add</option>
                {mechanics
                  .filter(
                    (mechanic) =>
                      !form.assignedMechanicIds.includes(mechanic.id),
                  )
                  .map((mechanic) => (
                    <option key={mechanic.id} value={mechanic.id}>
                      {mechanic.name}
                    </option>
                  ))}
              </select>
              
              {/* ASSIGNED MECHANIC TAGS */}
              <div className="mt-3 flex flex-wrap gap-2">
                {form.assignedMechanicIds.map((mechanicId) => {
                  const mechanic = mechanics.find((m) => m.id === mechanicId);
                  return (
                    <span
                      key={mechanicId}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F7F6F3] text-sm text-[#37352F] border border-[#E0E0E0]"
                    >
                      {mechanic?.name || mechanicId}
                      <button
                        type="button"
                        onClick={() => removeMechanic(mechanicId)}
                        className="ml-1 text-[#787774] hover:text-[#C53030] font-bold"
                        aria-label="Remove mechanic"
                      >
                        ×
                      </button>
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="h-11 px-4 rounded-lg bg-[#37352F] hover:bg-[#474540] text-white text-sm font-medium shadow-sm transition-all disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>

              <button
                type="button"
                onClick={() => navigate(`/projects/${projectId}`)}
                className="h-11 px-4 rounded-lg bg-[#37352F] hover:bg-[#474540] text-white text-sm font-medium shadow-sm transition-all"
              >
                Cancel
              </button>
            </div>

            {userRole === "owner" && (
              <div className="pt-6 mt-6 border-t border-[#E0E0E0]">
                <h2 className="text-sm font-semibold text-[#C53030] mb-3">
                  Danger Zone
                </h2>

                <button
                  type="button"
                  onClick={handleDelete}
                  className="h-11 px-4 rounded-lg bg-[#C53030] hover:bg-[#A12828] text-white text-sm font-medium shadow-sm transition-all"
                >
                  Delete Project
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}