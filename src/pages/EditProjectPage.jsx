import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { notionClasses } from "/src/lib/notion-theme";
import { useCustomersForCurrentUser } from "/src/hooks/useCustomersForCurrentUser.js";
import { NavigationBar } from "/src/components/NavigationBar";
import { db } from "/src/firebase";
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
import { STATUS_OPTIONS } from "/src/lib/status.js";

export default function EditProjectPage() {
  // Route navigation.
  const { projectId } = useParams();
  const navigate = useNavigate();

  // Context from persisted business/session state.
  const businessId = localStorage.getItem("ccgBusinessId");
  const userRole = localStorage.getItem("ccgUserRole");
  const { customers, loading: customersLoading } = useCustomersForCurrentUser(businessId);

  // Editable form and request state.
  const [formData, setFormData] = useState({
    title: "",
    status: "",
    priority: "",
    customerId: "",
    customerName: "",
    carLabel: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Loads project fields for the edit form.
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

        // Normalizes older status values to ensure they are valid options
        const allowedStatusKeys = new Set(
          STATUS_OPTIONS.map((status) => status.label),
        );
        const loadedStatus = data.status || "";
        const safeStatus = allowedStatusKeys.has(loadedStatus)
          ? loadedStatus
          : "";

        setFormData({
          title: data.title || "",
          status: safeStatus,
          priority: data.priority || "",
          customerName: data.customerName || "",
          carLabel: data.carLabel || "",
        });

      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadProject();
  }, [businessId, projectId]);

  // Generic input handler for controlled fields.
  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  // Persists edits and returns to project detail.
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
        ...formData,
        updatedAt: serverTimestamp(),
      });

      navigate(`/projects/${projectId}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  // Deletes the project after explicit confirmation.
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

  // Loading and error states.
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

  // Main edit form.
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
                value={formData.title}
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
                value={formData.status}
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
              <input
                type="text"
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className={notionClasses.input}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[#37352F]">
                Customer
              </label>
              <select
                value={formData.customerId}
                onChange={(e) => {
                  const customerId = e.target.value;
                  const selectedCustomer = customers.find(c => c.id === customerId);
                  setFormData((prev) => ({
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
                value={formData.carLabel}
                onChange={handleChange}
                className={notionClasses.input}
              />
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
                className="h-11 px-4 rounded-lg bg-[#37352F] hover:bg-[#474540] text-white text-sm font-medium shadow-sm transition-all disabled:opacity-50"
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
