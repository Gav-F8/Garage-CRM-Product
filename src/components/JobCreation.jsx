import { useMemo, useState } from "react";
import { STATUS_OPTIONS } from "../lib/status";

const INITIAL_FORM = {
  title: "",
  customerId: "",
  carId: "",
  status: "",
  assignedMechanicId: "",
};

export default function JobCreation({
  customers = [],
  vehicles = [],
  mechanics = [],
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
      setForm((prev) => ({ ...prev, customerId: value, carId: "" }));
      setErrors((prev) => ({ ...prev, customerId: "", carId: "" }));
    }
  };

  const validate = () => {
    const nextErrors = {};

    if (!form.title.trim()) nextErrors.title = "Please enter a job title";
    if (!form.customerId) nextErrors.customerId = "Please select a customer";
    if (!form.carId) nextErrors.carId = "Please select a vehicle";
    if (!form.status) nextErrors.status = "Please select a status";
    if (!form.assignedMechanicId) {
      nextErrors.assignedMechanicId = "Please assign a mechanic";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!validate()) return;

    onSubmit?.({
      title: form.title.trim(),
      customerId: form.customerId,
      carId: form.carId,
      status: form.status,
      assignedMechanicId: form.assignedMechanicId,
    });
  };

  const selectedCustomerHasVehicles = filteredVehicles.length > 0;

  return (
    <div className="rounded-2xl border border-[#E0E0E0] bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-[#37352F]">Create New Job</h2>
        <p className="mt-1 text-sm text-[#787774]">
          Fill in the required fields to create a new job.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="title"
            className="text-sm font-medium text-[#37352F]"
          >
            Title
          </label>
          <input
            id="title"
            value={form.title}
            onChange={(e) => setField("title", e.target.value)}
            placeholder="e.g. Brake inspection and service"
            className="h-11 rounded-lg border border-[#E0E0E0] bg-[#F7F6F3] px-3 text-sm text-[#37352F] outline-none transition-all focus:border-[#37352F] focus:bg-white"
          />
          {errors.title && <p className="text-xs text-[#C53030]">{errors.title}</p>}
        </div>

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
              htmlFor="carId"
              className="text-sm font-medium text-[#37352F]"
            >
              Vehicle
            </label>
            <select
              id="carId"
              value={form.carId}
              onChange={(e) => setField("carId", e.target.value)}
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
            {errors.carId && (
              <p className="text-xs text-[#C53030]">{errors.carId}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="status"
              className="text-sm font-medium text-[#37352F]"
            >
              Status
            </label>
            <select
              id="status"
              value={form.status}
              onChange={(e) => setField("status", e.target.value)}
              className="h-11 rounded-lg border border-[#E0E0E0] bg-[#F7F6F3] px-3 text-sm text-[#37352F] outline-none transition-all focus:border-[#37352F] focus:bg-white"
            >
              <option value="">Select status</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status.key} value={status.key}>
                  {status.label}
                </option>
              ))}
            </select>
            {errors.status && (
              <p className="text-xs text-[#C53030]">{errors.status}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="assignedMechanicId"
              className="text-sm font-medium text-[#37352F]"
            >
              Assigned Mechanic
            </label>
            <select
              id="assignedMechanicId"
              value={form.assignedMechanicId}
              onChange={(e) => setField("assignedMechanicId", e.target.value)}
              className="h-11 rounded-lg border border-[#E0E0E0] bg-[#F7F6F3] px-3 text-sm text-[#37352F] outline-none transition-all focus:border-[#37352F] focus:bg-white"
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
