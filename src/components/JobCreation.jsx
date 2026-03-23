import { useMemo, useState } from "react";

const INITIAL_FORM = {
  customerId: "",
  vehicleId: "",
  currentMileage: "",
  initialJobDescription: "",
};

export default function JobCreation({
  customers = [],
  vehicles = [],
  onSubmit,
  submitting = false,
}) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});

  const filteredVehicles = useMemo(() => {
    if (!form.customerId) return [];
    return vehicles.filter((vehicle) => vehicle.customerId === form.customerId);
  }, [form.customerId, vehicles]);

  const setField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));

    if (name === "customerId") {
      setForm((prev) => ({ ...prev, customerId: value, vehicleId: "" }));
      setErrors((prev) => ({ ...prev, customerId: "", vehicleId: "" }));
    }
  };

  const validate = () => {
    const nextErrors = {};

    if (!form.customerId) nextErrors.customerId = "Please select a customer";
    if (!form.vehicleId) nextErrors.vehicleId = "Please select a vehicle";

    const mileage = Number(form.currentMileage);
    if (!form.currentMileage.trim()) {
      nextErrors.currentMileage = "Current mileage is required";
    } else if (Number.isNaN(mileage) || mileage < 0) {
      nextErrors.currentMileage = "Mileage must be a valid non-negative number";
    }

    if (!form.initialJobDescription.trim()) {
      nextErrors.initialJobDescription = "Initial job description is required";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!validate()) return;

    onSubmit?.({
      ...form,
      currentMileage: Number(form.currentMileage),
      initialJobDescription: form.initialJobDescription.trim(),
    });
  };

  const selectedCustomerHasVehicles = filteredVehicles.length > 0;

  return (
    <div className="rounded-2xl border border-[#E0E0E0] bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-[#37352F]">Create New Job</h2>
        <p className="mt-1 text-sm text-[#787774]">
          Select a customer and vehicle, then add the initial job details.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="customerId"
              className="text-sm font-medium text-[#37352F]"
            >
              Customer
            </label>
            <select
              id="customerId"
              value={form.customerId}
              onChange={(e) => setField("customerId", e.target.value)}
              className="h-11 rounded-lg border border-[#E0E0E0] bg-[#F7F6F3] px-3 text-sm text-[#37352F] outline-none transition-all focus:border-[#37352F] focus:bg-white"
            >
              <option value="">Select customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name || customer.email || customer.id}
                </option>
              ))}
            </select>
            {errors.customerId && (
              <p className="text-xs text-[#C53030]">{errors.customerId}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="vehicleId"
              className="text-sm font-medium text-[#37352F]"
            >
              Vehicle
            </label>
            <select
              id="vehicleId"
              value={form.vehicleId}
              onChange={(e) => setField("vehicleId", e.target.value)}
              disabled={!form.customerId || !selectedCustomerHasVehicles}
              className="h-11 rounded-lg border border-[#E0E0E0] bg-[#F7F6F3] px-3 text-sm text-[#37352F] outline-none transition-all disabled:cursor-not-allowed disabled:opacity-60 focus:border-[#37352F] focus:bg-white"
            >
              {!form.customerId && (
                <option value="">Select customer first</option>
              )}
              {form.customerId && !selectedCustomerHasVehicles && (
                <option value="">No vehicles found for this customer</option>
              )}
              {selectedCustomerHasVehicles && (
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
            {errors.vehicleId && (
              <p className="text-xs text-[#C53030]">{errors.vehicleId}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="currentMileage"
              className="text-sm font-medium text-[#37352F]"
            >
              Current Mileage
            </label>
            <input
              id="currentMileage"
              type="number"
              min="0"
              step="1"
              placeholder="e.g. 126450"
              value={form.currentMileage}
              onChange={(e) => setField("currentMileage", e.target.value)}
              className="h-11 rounded-lg border border-[#E0E0E0] bg-[#F7F6F3] px-3 text-sm text-[#37352F] outline-none transition-all focus:border-[#37352F] focus:bg-white"
            />
            {errors.currentMileage && (
              <p className="text-xs text-[#C53030]">{errors.currentMileage}</p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="initialJobDescription"
            className="text-sm font-medium text-[#37352F]"
          >
            Initial Job Description
          </label>
          <textarea
            id="initialJobDescription"
            rows={5}
            placeholder="Describe the customer's issue, requested work, or initial diagnosis..."
            value={form.initialJobDescription}
            onChange={(e) => setField("initialJobDescription", e.target.value)}
            className="w-full rounded-lg border border-[#E0E0E0] bg-[#F7F6F3] px-3 py-2 text-sm text-[#37352F] outline-none transition-all resize-none focus:border-[#37352F] focus:bg-white"
          />
          {errors.initialJobDescription && (
            <p className="text-xs text-[#C53030]">
              {errors.initialJobDescription}
            </p>
          )}
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex h-11 items-center rounded-lg bg-[#37352F] px-5 text-sm font-medium text-white shadow-sm transition-all hover:bg-[#474540] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Creating..." : "Create Job"}
          </button>
        </div>
      </form>
    </div>
  );
}
