import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { notionClasses } from "/src/lib/notion-theme";
import { NavigationBar } from "/src/components/NavigationBar";
import { db } from "/src/firebase";
import {
  doc,
  getDoc,
  deleteDoc,
} from "firebase/firestore";
import { updateCustomerValue } from "/src/lib/firestore-helpers.js";
import { invalidateCustomersCache } from "/src/lib/cache.js";
import { useAuth } from "/src/context/AuthContext.jsx";

export default function EditCustomerPage() {
  // Route navigation.
  const { customerId } = useParams();
  const navigate = useNavigate();

  // Identity/role come from the global auth context (custom claims).
  const { businessId, role: userRole, loading: authLoading } = useAuth();

  // Editable form and request state.
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    notes: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Loads customer fields for the edit form.
  useEffect(() => {
    if (authLoading) return;
    async function loadCustomer() {
      if (!businessId) {
        setError("No business context found. Please sign in again.");
        setLoading(false);
        return;
      }

      try {
        const customerRef = doc(
          db,
          "businesses",
          businessId,
          "Customers",
          customerId,
        );
        const snap = await getDoc(customerRef);
        if (!snap.exists()) {
          setError("Customer not found.");
          setLoading(false);
          return;
        }

        const data = snap.data();
        setFormData({
          name: data.name || "",
          email: data.email || "",
          phone: data.phone || "",
          address: data.address || "",
          notes: data.notes || "",
        });
      } catch (err) {
        console.error(err);
        setError(err.message || "Failed to load customer.");
      } finally {
        setLoading(false);
      }
    }

    loadCustomer();
  }, [authLoading, businessId, customerId]);

  // Generic input handler for controlled fields.
  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  // Persists edits and returns to detail page.
  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const success = await updateCustomerValue(businessId, customerId, formData);
      if (success) {
        // Invalidate the cached customer list so the edit is reflected
        // immediately (the cache was previously only cleared on create).
        invalidateCustomersCache(businessId);
        navigate(`/customers/${customerId}`);
      } else {
        setError("Failed to save customer.");
      }
    } finally {
      setSaving(false);
    }
  }

  // Deletes the customer after explicit confirmation.
  async function handleDelete() {
    const confirmed = window.confirm(
      "Are you sure you want to delete this customer? This cannot be undone.",
    );
    if (!confirmed) return;

    try {
      const customerRef = doc(
        db,
        "businesses",
        businessId,
        "Customers",
        customerId,
      );
      await deleteDoc(customerRef);
      // Keep the cached customer list in sync after a delete.
      invalidateCustomersCache(businessId);
      navigate("/customers");
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to delete customer.");
    }
  }

  // Loading and error states.
  if (loading) {
    return (
      <div className={notionClasses.pageContainer}>
        <NavigationBar />
        <div className={notionClasses.dashboardContainer}>
          <p className="text-sm text-[#787774]">Loading customer...</p>
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
            onClick={() => navigate(`/customers/${customerId}`)}
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
          <h1 className={notionClasses.header.title}>Edit Customer</h1>
          <p className={notionClasses.header.subtitle}>
            Update the details for this customer
          </p>
        </div>

        <div className="rounded-xl border border-[#E0E0E0] bg-white shadow-sm p-6 max-w-3xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#37352F]">Name</label>
              <input
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={notionClasses.input}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[#37352F]">
                Email
              </label>
              <input
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={notionClasses.input}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[#37352F]">
                Phone
              </label>
              <input
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className={notionClasses.input}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[#37352F]">
                Address
              </label>
              <input
                name="address"
                value={formData.address}
                onChange={handleChange}
                className={notionClasses.input}
              />
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
                onClick={() => navigate(`/customers/${customerId}`)}
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
                  Delete Customer
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
