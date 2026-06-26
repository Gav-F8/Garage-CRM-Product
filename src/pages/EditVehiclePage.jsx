import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { notionClasses } from "/src/lib/notion-theme";
import { NavigationBar } from "/src/components/NavigationBar";
import { VEHICLE_TYPES, NHTSA, } from "/src/lib/utils.js";
import { useCustomersForCurrentUser } from "/src/hooks/useCustomersForCurrentUser.js";
import { useAuth } from "/src/context/AuthContext.jsx";
import { db } from "/src/firebase";
import {
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";

export default function EditVehiclePage() {
  // Route navigation.
  const { vehicleId: vehicleId } = useParams();
  const navigate = useNavigate();

  // Identity/role come from the global auth context (custom claims).
  const { businessId, role: userRole, loading: authLoading } = useAuth();

  // Editable form and request state.
  const [formData, setFormData] = useState({
    vehicleLabel: "",
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
    customerName: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const { customers } = useCustomersForCurrentUser(businessId);

  // Loads vehicle fields for the edit form.
  useEffect(() => {
    if (authLoading) return;
    async function loadVehicle() {
      if (!businessId) {
        setError("No business context found. Please sign in again.");
        setLoading(false);
        return;
      }

      try {
        const ref = doc(db, "businesses", businessId, "Vehicles", vehicleId);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          setError("Vehicle not found.");
          setLoading(false);
          return;
        }
        const d = snap.data();
        setFormData({
          vehicleLabel: d.vehicleLabel || "",
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
          customerName: d.customerName || "",
        });

      } catch (err) {
        console.error(err);
        setError(err.message || "Failed to load vehicle.");
      } finally {
        setLoading(false);
      }
    }

    loadVehicle();
  }, [authLoading, businessId, vehicleId]);

  // Generic input handler for controlled fields.
  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  // Persists edits and returns to vehicle detail.
  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const ref = doc(db, "businesses", businessId, "Vehicles", vehicleId);
      await updateDoc(ref, { ...formData, updatedAt: serverTimestamp() });
      navigate(`/vehicles/${vehicleId}`);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to save vehicle.");
    } finally {
      setSaving(false);
    }
  }

  // Deletes the vehicle after explicit confirmation.
  async function handleDelete() {
    const confirmed = window.confirm(
      "Are you sure you want to delete this vehicle? This cannot be undone.",
    );
    if (!confirmed) return;

    try {
      const ref = doc(db, "businesses", businessId, "Vehicles", vehicleId);
      await deleteDoc(ref);
      navigate("/Vehicles");
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to delete vehicle.");
    }
  }

  // Loading and error states.
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
          <button
            onClick={() => navigate(`/vehicles/${vehicleId}`)}
            className="mt-4 h-10 px-4 rounded-lg bg-[#37352F] hover:bg-[#474540] text-white text-sm font-medium"
          >
            Back
          </button>
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
          <h1 className={notionClasses.header.title}>Edit Vehicle</h1>
          <p className={notionClasses.header.subtitle}>
            Update the details for this vehicle
          </p>
        </div>

        <div className="rounded-xl border border-[#E0E0E0] bg-white shadow-sm p-6 max-w-3xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#37352F]">
                Vehicle Label
              </label>
              <input
                name="vehicleLabel"
                value={formData.vehicleLabel}
                onChange={handleChange}
                className={notionClasses.input}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#37352F]">
                  Make
                </label>
                <input
                  name="make"
                  value={formData.make}
                  onChange={handleChange}
                  className={notionClasses.input}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#37352F]">
                  Model
                </label>
                <input
                  name="model"
                  value={formData.model}
                  onChange={handleChange}
                  className={notionClasses.input}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#37352F]">
                  Year
                </label>
                <input
                  name="year"
                  value={formData.year}
                  onChange={handleChange}
                  className={notionClasses.input}
                />
              </div>
            </div>

            {/* TYPE DROP DOWN MENU */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#37352F]">
                  Type
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  className={notionClasses.input}
                >
                  <option value="">Select type</option>
                  {VEHICLE_TYPES.map((t) => (
                    <option key={t} value={t}> 
                      {t}
                    </option>
                  ))}
              </select>
                
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#37352F]">
                  Plate
                </label>
                <input
                  name="plate"
                  value={formData.plate}
                  onChange={handleChange}
                  className={notionClasses.input}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#37352F]">
                  Color
                </label>
                <input
                  name="color"
                  value={formData.color}
                  onChange={handleChange}
                  className={notionClasses.input}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#37352F]">
                  Mileage (km, optional)
                </label>
                <input
                  name="mileage"
                  placeholder="e.g. 50000"
                  value={formData.mileage}
                  onChange={handleChange}
                  className={notionClasses.input}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#37352F]">
                  VIN
                </label>
                <input
                  name="vin"
                  value={formData.vin}
                  onChange={handleChange}
                  className={notionClasses.input}
                />
              </div>
            </div>

            {/* CUSTOMER DROP DOWN MENU */}
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
                    customerName: selectedCustomer?.name || "",
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
                Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                className={notionClasses.input}
                rows={4}
              />
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="h-10 px-4 rounded-lg bg-[#37352F] hover:bg-[#474540] text-white text-sm font-medium"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>

              <button
                type="button"
                onClick={() => navigate(`/vehicles/${vehicleId}`)}
                className="h-10 px-4 rounded-lg bg-[#37352F] hover:bg-[#474540] text-white text-sm font-medium"
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
                  Delete Vehicle
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
