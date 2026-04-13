import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { notionClasses } from "/src/lib/notion-theme";
import { NavigationBar } from "/src/components/NavigationBar.jsx";
import { db } from "/src/firebase.js";
import { doc, getDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";

export default function EditCustomerPage() {
  const { customerId } = useParams();
  const navigate = useNavigate();

  const businessId = localStorage.getItem("ccgBusinessId");
  const userRole = localStorage.getItem("ccgUserRole");

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

  useEffect(() => {
    async function loadCustomer() {
      if (!businessId) {
        setError("No business context found. Please sign in again.");
        setLoading(false);
        return;
      }

      try {
        const customerRef = doc(db, "businesses", businessId, "Customers", customerId);
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
  }, [businessId, customerId]);

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const customerRef = doc(db, "businesses", businessId, "Customers", customerId);
      await updateDoc(customerRef, { ...formData, updatedAt: serverTimestamp() });
      navigate(`/customer/${customerId}`);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to save customer.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm("Are you sure you want to delete this customer? This cannot be undone.");
    if (!confirmed) return;

    try {
      const customerRef = doc(db, "businesses", businessId, "Customers", customerId);
      await deleteDoc(customerRef);
  navigate("/Customer");
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to delete customer.");
    }
  }

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
            onClick={() => navigate(`/customer/${customerId}`)}
            className="mt-4 h-10 px-4 rounded-lg bg-[#37352F] hover:bg-[#474540] text-white text-sm font-medium"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={notionClasses.pageContainer}>
      <NavigationBar />
      <div className={notionClasses.dashboardContainer}>
        <div className="mb-6">
          <h1 className={notionClasses.header.title}>Edit Customer</h1>
          <p className={notionClasses.header.subtitle}>Update the details for this customer</p>
        </div>

        <div className="rounded-xl border border-[#E0E0E0] bg-white shadow-sm p-6 max-w-3xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#37352F]">Name</label>
              <input name="name" value={formData.name} onChange={handleChange} className={notionClasses.input} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[#37352F]">Email</label>
              <input name="email" value={formData.email} onChange={handleChange} className={notionClasses.input} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[#37352F]">Phone</label>
              <input name="phone" value={formData.phone} onChange={handleChange} className={notionClasses.input} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[#37352F]">Address</label>
              <input name="address" value={formData.address} onChange={handleChange} className={notionClasses.input} />
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
                onClick={() => navigate(`/customer/${customerId}`)}
                className="flex-shrink-0 whitespace-nowrap h-10 px-6 rounded-lg border border-[#E0E0E0] bg-white text-[#37352F] text-sm font-medium hover:bg-[#F7F6F3] hover:border-[#37352F] hover:shadow-md transition-all duration-200"
              >
                Cancel
              </button>
            </div>

            {userRole === "owner" && (
              <div className="pt-6 mt-6 border-t border-[#E0E0E0]">
                <h2 className="text-sm font-semibold text-[#C53030] mb-3">Danger Zone</h2>
                <button type="button" onClick={handleDelete} className="h-11 px-4 rounded-lg bg-[#C53030] hover:bg-[#A12828] text-white text-sm font-medium shadow-sm transition-all">Delete Customer</button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
