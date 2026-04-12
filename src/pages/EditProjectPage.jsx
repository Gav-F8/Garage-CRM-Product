import { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { useNavigate, useParams } from "react-router-dom";
import { notionClasses } from "../lib/notion-theme";
import { NavigationBar } from "../components/NavigationBar";

export default function EditProjectPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const businessId = localStorage.getItem("ccgBusinessId");
  const userRole = localStorage.getItem("ccgUserRole");

  const [formData, setFormData] = useState({
    title: "",
    status: "",
    priority: "",
    customerName: "",
    carLabel: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProject() {
      if (!businessId) {
        setError("No business context found. Please sign in again.");
        setLoading(false);
        return;
      }

      try {
        const projectRef = doc(db, "businesses", businessId, "Projects", projectId);
        const projectSnap = await getDoc(projectRef);

        if (!projectSnap.exists()) {
          setError("Project not found.");
          setLoading(false);
          return;
        }

        const data = projectSnap.data();

        setFormData({
          title: data.title || "",
          status: data.status || "",
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

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const projectRef = doc(db, "businesses", businessId, "Projects", projectId);

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

  async function handleDelete() {
    const confirmed = window.confirm(
      "Are you sure you want to delete this project? This cannot be undone."
    );

    if (!confirmed) return;

    try {
      const projectRef = doc(db, "businesses", businessId, "Projects", projectId);
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
              <label className="text-sm font-medium text-[#37352F]">Title</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className={notionClasses.input}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[#37352F]">Status</label>
              <input
                type="text"
                name="status"
                value={formData.status}
                onChange={handleChange}
                className={notionClasses.input}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[#37352F]">Priority</label>
              <input
                type="text"
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className={notionClasses.input}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[#37352F]">Customer Name</label>
              <input
                type="text"
                name="customerName"
                value={formData.customerName}
                onChange={handleChange}
                className={notionClasses.input}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[#37352F]">Car Label</label>
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
                className="h-11 px-4 rounded-lg border border-[#E0E0E0] text-[#37352F] text-sm font-medium hover:bg-[#F7F6F3] transition-all"
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