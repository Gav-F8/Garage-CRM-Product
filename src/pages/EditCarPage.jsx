import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { notionClasses } from "/src/lib/notion-theme";
import { NavigationBar } from "/src/components/NavigationBar.jsx";
import { db } from "/src/firebase.js";
import { doc, getDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";

export default function EditCarPage() {
  const { storageId } = useParams();
  const navigate = useNavigate();

  const businessId = localStorage.getItem("ccgBusinessId");
  const userRole = localStorage.getItem("ccgUserRole");

  const [formData, setFormData] = useState({
    carLabel: "",
    make: "",
    model: "",
    year: "",
    type: "",
    plate: "",
    color: "",
    mileage: "",
    vin: "",
    notes: "",
    customerId: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadStorage() {
      if (!businessId) {
        setError("No business context found. Please sign in again.");
        setLoading(false);
        return;
      }

      try {
        const ref = doc(db, "businesses", businessId, "storage", storageId);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          setError("Vehicle not found.");
          setLoading(false);
          return;
        }
        const d = snap.data();
        setFormData({
          carLabel: d.carLabel || "",
          make: d.make || "",
          model: d.model || "",
          year: d.year || "",
          type: d.type || "",
          plate: d.plate || "",
          color: d.color || "",
          mileage: d.mileage || "",
          vin: d.vin || "",
          notes: d.notes || "",
          customerId: d.customerId || "",
        });
      } catch (err) {
        console.error(err);
        setError(err.message || "Failed to load vehicle.");
      } finally {
        setLoading(false);
      }
    }

    loadStorage();
  }, [businessId, storageId]);

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const ref = doc(db, "businesses", businessId, "storage", storageId);
      await updateDoc(ref, { ...formData, updatedAt: serverTimestamp() });
      navigate(`/storage/${storageId}`);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to save vehicle.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm("Are you sure you want to delete this vehicle? This cannot be undone.");
    if (!confirmed) return;

    try {
      const ref = doc(db, "businesses", businessId, "storage", storageId);
      await deleteDoc(ref);
      navigate("/storage");
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to delete vehicle.");
    }
  }

  if (loading) {
    return (
      <div className={notionClasses.pageContainer}>
        <NavigationBar />
        <div className={notionClasses.dashboardContainer}>
          <p className="text-sm text-[#787774]">Loading vehicle...</p>
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
          <button onClick={() => navigate(`/storage/${storageId}`)} className="mt-4 h-10 px-4 rounded-lg bg-[#37352F] hover:bg-[#474540] text-white text-sm font-medium">Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className={notionClasses.pageContainer}>
      <NavigationBar />
      <div className={notionClasses.dashboardContainer}>
        <div className="mb-6">
          <h1 className={notionClasses.header.title}>Edit Vehicle</h1>
          <p className={notionClasses.header.subtitle}>Update the details for this vehicle</p>
        </div>

        <div className="rounded-xl border border-[#E0E0E0] bg-white shadow-sm p-6 max-w-3xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#37352F]">Car Label</label>
              <input name="carLabel" value={formData.carLabel} onChange={handleChange} className={notionClasses.input} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#37352F]">Make</label>
                <input name="make" value={formData.make} onChange={handleChange} className={notionClasses.input} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#37352F]">Model</label>
                <input name="model" value={formData.model} onChange={handleChange} className={notionClasses.input} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#37352F]">Year</label>
                <input name="year" value={formData.year} onChange={handleChange} className={notionClasses.input} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#37352F]">Type</label>
                <input name="type" value={formData.type} onChange={handleChange} className={notionClasses.input} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#37352F]">Plate</label>
                <input name="plate" value={formData.plate} onChange={handleChange} className={notionClasses.input} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#37352F]">Color</label>
                <input name="color" value={formData.color} onChange={handleChange} className={notionClasses.input} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#37352F]">Mileage (km)</label>
                <input name="mileage" value={formData.mileage} onChange={handleChange} className={notionClasses.input} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#37352F]">VIN</label>
                <input name="vin" value={formData.vin} onChange={handleChange} className={notionClasses.input} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[#37352F]">Customer ID</label>
              <input name="customerId" value={formData.customerId} onChange={handleChange} className={notionClasses.input} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[#37352F]">Notes</label>
              <textarea name="notes" value={formData.notes} onChange={handleChange} className={notionClasses.input} rows={4} />
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="flex-shrink-0 whitespace-nowrap h-10 px-6 rounded-lg border border-[#E0E0E0] bg-white text-[#37352F] text-sm font-medium hover:bg-[#F7F6F3] hover:border-[#37352F] hover:shadow-md transition-all duration-200 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>

              <button
                type="button"
                onClick={() => navigate(`/storage/${storageId}`)}
                className="flex-shrink-0 whitespace-nowrap h-10 px-6 rounded-lg border border-[#E0E0E0] bg-white text-[#37352F] text-sm font-medium hover:bg-[#F7F6F3] hover:border-[#37352F] hover:shadow-md transition-all duration-200"
              >
                Cancel
              </button>
            </div>

            {userRole === "owner" && (
              <div className="pt-6 mt-6 border-t border-[#E0E0E0]">
                <h2 className="text-sm font-semibold text-[#C53030] mb-3">Danger Zone</h2>
                <button type="button" onClick={handleDelete} className="h-11 px-4 rounded-lg bg-[#C53030] hover:bg-[#A12828] text-white text-sm font-medium shadow-sm transition-all">Delete Vehicle</button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
