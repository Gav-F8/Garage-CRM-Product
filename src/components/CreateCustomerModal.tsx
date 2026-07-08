import { useState, type ChangeEvent } from "react";
import { auth } from "../firebase";
import {
  fetchEmployeeDetail,
  extractName,
  createCustomer,
} from "../lib/firestore-helpers";
import { serverTimestamp } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { invalidateCustomersCache } from "../lib/cache";
import "../components/ui/CreateButton";

// ══════════════════════════════════════════════════════════════════════════════
// New Customer Creation Form and validation logic
// ══════════════════════════════════════════════════════════════════════════════

interface CustomerForm {
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
}

function validate(form: CustomerForm): Partial<Record<keyof CustomerForm, string>> {
  const errors: Partial<Record<keyof CustomerForm, string>> = {};
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
}: {
  label: string;
  name: string;
  type?: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  error?: string;
  multiline?: boolean;
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

interface CreateCustomerModalProps {
  onClose: () => void;
  onCreated: (customer: any) => void;
  businessId: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// New Customer Create Modal
// ══════════════════════════════════════════════════════════════════════════════
export function CreateCustomerModal({ onClose, onCreated, businessId }: CreateCustomerModalProps) {
  const { role } = useAuth();
  const [form, setForm] = useState<CustomerForm>({
    name: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
  });

  const [errors, setErrors] = useState<Partial<Record<keyof CustomerForm, string>>>({});
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const handleSubmit = async () => {
    if (role !== "owner") {
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
        employeeName = extractName(await fetchEmployeeDetail(businessId, currentUserId), "Name");
      }

      const result = await createCustomer(businessId, {
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        address: form.address.trim() || null,
        notes: form.notes.trim() || null,
        createdByEmployeeId: currentUserId,
        createdByEmployeeName: employeeName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      const id = (result as unknown as { id?: string })?.id;

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

      // Clear the customer cache so the new customer appears in cached lists.
      invalidateCustomersCache(businessId);

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
