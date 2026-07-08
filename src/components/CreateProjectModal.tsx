import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { STATUS_OPTIONS } from "../lib/utils";
import { fetchCustomers, fetchVehicles, fetchMechanics } from "../lib/firestore-helpers";
import { useAuth } from "../context/AuthContext";
import { CreateButton } from "../components/ui/CreateButton";
import type { WithId, Customer, Vehicle } from "@/types/firestore";

// ══════════════════════════════════════════════════════════════════════════════
// New Job Creation Form initial state and validation logic
// ══════════════════════════════════════════════════════════════════════════════

interface ProjectForm {
  title: string;
  customerId: string;
  vehicleId: string;
  status: string;
  description: string;
  assignedMechanicIds: string[];
}

const INITIAL_JOB_FORM: ProjectForm = {
  title: "",
  customerId: "",
  vehicleId: "",
  status: "",
  description: "",
  assignedMechanicIds: [],
};

type ProjectFormErrors = Partial<Record<keyof ProjectForm, string>>;

function validateProjectForm(form: ProjectForm): ProjectFormErrors {
  const errors: ProjectFormErrors = {};
  if (!form.title.trim()) errors.title = "Please enter a job title";
  if (!form.customerId) errors.customerId = "Please select a customer";
  if (!form.vehicleId) errors.vehicleId = "Please select a vehicle";
  if (!form.status) errors.status = "Please select a status";
  if (!form.assignedMechanicIds.length) {
    errors.assignedMechanicIds = "Please select atleast one mechanic";
  }
  return errors;
}

interface CreateProjectModalProps {
  submitting: boolean;
  onClose: () => void;
  onCreate: (values: Record<string, unknown>) => Promise<string | null | undefined>;
}

// ══════════════════════════════════════════════════════════════════════════════
// New Job Creation Form
// ══════════════════════════════════════════════════════════════════════════════

export function CreateProjectModal({
  submitting,
  onClose,
  onCreate,
}: CreateProjectModalProps) {
  const navigate = useNavigate();
  const { businessId, loading: authLoading } = useAuth();

  // Form state
  const [form, setForm] = useState<ProjectForm>(INITIAL_JOB_FORM);
  const [errors, setErrors] = useState<ProjectFormErrors>({});
  const [selectedMechanicId, setSelectedMechanicId] = useState("");

  // Data fetching state
  const [customers, setCustomers] = useState<WithId<Customer>[]>([]);
  const [vehicles, setVehicles] = useState<WithId<Vehicle>[]>([]);
  const [mechanics, setMechanics] = useState<{ id: string; name: string }[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [dataError, setDataError] = useState("");

  // Fetch modal data on mount (once auth/claims resolve)
  useEffect(() => {
    if (authLoading) return;
    if (!businessId) {
      setDataError("No business context found");
      setLoadingData(false);
      return;
    }

    let cancelled = false;
    async function loadModalData() {
      try {
        const [customerList, vehicleList, mechanicList] = await Promise.all([
          fetchCustomers(businessId as string),
          fetchVehicles(businessId as string),
          fetchMechanics(businessId as string),
        ]);
        if (cancelled) return;
        setCustomers(customerList);
        setVehicles(vehicleList);
        setMechanics(mechanicList);
      } catch (err) {
        console.error("Error loading modal data:", err);
        if (!cancelled) setDataError("Failed to load form data");
      } finally {
        if (!cancelled) setLoadingData(false);
      }
    }

    loadModalData();
    return () => {
      cancelled = true;
    };
  }, [authLoading, businessId]);

  // Add mechanic to the assignedMechanicIds array in form state
  const addMechanic = (mechanicId: string) => {
    if (!mechanicId) return;
    setForm((prev) => {
      if (prev.assignedMechanicIds.includes(mechanicId)) return prev;
      return {
        ...prev,
        assignedMechanicIds: [...prev.assignedMechanicIds, mechanicId],
      };
    });
    setSelectedMechanicId("");
    setErrors((prev) => ({ ...prev, assignedMechanicIds: "" }));
  };

  // Remove mechanic from the assignedMechanicIds array in form state
  const removeMechanic = (mechanicId: string) => {
    setForm((prev) => ({
      ...prev,
      assignedMechanicIds: prev.assignedMechanicIds.filter(
        (id) => id !== mechanicId,
      ),
    }));
  };

  // Filter vehicles based on selected customer
  const filteredVehicles = useMemo(() => {
    if (!form.customerId) return [];
    return vehicles.filter((vehicle) => vehicle.customerId === form.customerId);
  }, [vehicles, form.customerId]);

  // Handle form field changes and clear related errors
  const setField = (name: keyof ProjectForm, value: string) => {
    setForm((prev) => {
      if (name === "customerId") {
        return { ...prev, customerId: value, vehicleId: "" };
      }
      return { ...prev, [name]: value };
    });
    setErrors((prev) => ({ ...prev, [name]: "" }));
    if (name === "customerId") {
      setErrors((prev) => ({ ...prev, customerId: "", vehicleId: "" }));
    }
  };

  const handleSubmit = async () => {
    const formErrors = validateProjectForm(form);
    if (Object.keys(formErrors).length) {
      setErrors(formErrors);
      return;
    }

    const selectedVehicle = vehicles.find((vehicle) => vehicle.id === form.vehicleId);
    const vehicleLabel = [selectedVehicle?.year, selectedVehicle?.make, selectedVehicle?.model]
      .filter(Boolean)
      .join(" ");

    const jobId = await onCreate({
      title: form.title.trim(),
      customerId: form.customerId,
      vehicleId: form.vehicleId,
      vehicleLabel: vehicleLabel || null,
      status: form.status,
      description: form.description,
      assignedMechanicIds: form.assignedMechanicIds,
    });

    if (jobId) {
      setForm(INITIAL_JOB_FORM);
      onClose();
      navigate(`/projects/${jobId}`);
    }
  };

  if (loadingData) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
        <div className="max-h-[90vh] w-full max-w-lg rounded-xl border border-[#E0E0E0] bg-white p-6 shadow-lg">
          <p className="text-sm text-[#787774]">Loading form...</p>
        </div>
      </div>
    );
  }

  if (dataError) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
        <div className="max-h-[90vh] w-full max-w-lg rounded-xl border border-[#E0E0E0] bg-white p-6 shadow-lg">
          <p className="text-sm text-[#C53030]">{dataError}</p>
          <button
            onClick={onClose}
            className="mt-4 h-10 rounded-lg bg-[#37352F] px-4 text-sm font-medium text-white"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-xl border border-[#E0E0E0] bg-white p-6 shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-[#37352F]">Create New Job</h2>

        {/* TITLE FORM */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-[#37352F]">Title *</label>
          <input
            value={form.title}
            onChange={(event) => setField("title", event.target.value)}
            placeholder="e.g. Brake pad replacement"
            className="w-full rounded-lg border border-[#E0E0E0] bg-[#F7F6F3] px-3 py-2 text-sm text-[#37352F] outline-none transition-all focus:border-[#37352F] focus:bg-white"
          />
          {errors.title && (
            <p className="text-xs text-[#C53030]">{errors.title}</p>
          )}
        </div>

        {/* CUSTOMER SELECT DROP DOWN MENU */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-[#37352F]">
            Customer *
          </label>
          <select
            value={form.customerId}
            onChange={(event) => setField("customerId", event.target.value)}
            className="w-full rounded-lg border border-[#E0E0E0] bg-[#F7F6F3] px-3 py-2 text-sm text-[#37352F] outline-none transition-all focus:border-[#37352F] focus:bg-white"
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

        {/* VEHICLE SELECT DROP DOWN MENU */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-[#37352F]">
            Vehicle *
          </label>
          <select
            value={form.vehicleId}
            onChange={(event) => setField("vehicleId", event.target.value)}
            disabled={!form.customerId || filteredVehicles.length === 0}
            className="w-full rounded-lg border border-[#E0E0E0] bg-[#F7F6F3] px-3 py-2 text-sm text-[#37352F] outline-none transition-all focus:border-[#37352F] focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {!form.customerId && (
              <option value="">Select customer first</option>
            )}
            {form.customerId && filteredVehicles.length === 0 && (
              <option value="">No vehicles for this customer</option>
            )}
            {form.customerId && filteredVehicles.length > 0 && (
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

        {/*STATUS SELECT DROP DOWN MENU */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-[#37352F]">
              Status *
            </label>
            <select
              value={form.status}
              onChange={(event) => setField("status", event.target.value)}
              className="w-full rounded-lg border border-[#E0E0E0] bg-[#F7F6F3] px-3 py-2 text-sm text-[#37352F] outline-none transition-all focus:border-[#37352F] focus:bg-white"
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

          {/* MECHANIC SELECT DROP DOWN MENU */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-[#37352F]">
              Assigned Mechanic *
            </label>
            <select
              value={selectedMechanicId}
              onChange={(event) => addMechanic(event.target.value)}
              className="w-full rounded-lg border border-[#E0E0E0] bg-[#F7F6F3] px-3 py-2 text-sm text-[#37352F] outline-none transition-all focus:border-[#37352F] focus:bg-white"
            >
              <option value="">Select mechanic</option>
              {mechanics
                .filter(
                  (mechanic) => !form.assignedMechanicIds.includes(mechanic.id),
                )
                .map((mechanic) => (
                  <option key={mechanic.id} value={mechanic.id}>
                    {mechanic.name || mechanic.id}
                  </option>
                ))}
            </select>
            {errors.assignedMechanicIds && (
              <p className="text-xs text-[#C53030]">
                {errors.assignedMechanicIds}
              </p>
            )}
          </div>
        </div>

        {/* ASSIGNED MECHANIC TAGS - Full width below status/mechanic grid */}
        {form.assignedMechanicIds.length > 0 && (
          <div className="flex flex-wrap gap-2">
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
                    className="text-white hover:text-[#37352F] leading-none"
                    aria-label="Remove mechanic"
                  >
                    ×
                  </button>
                </span>
              );
            })}
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-[#37352F]">Description</label>
          <textarea
            value={form.description}
            onChange={(event) => setField("description", event.target.value)}
            placeholder="Enter project description"
            className="w-full rounded-lg border border-[#E0E0E0] bg-[#F7F6F3] px-3 py-2 text-sm text-[#37352F] outline-none transition-all focus:border-[#37352F] focus:bg-white"
            rows={4}
          />
        </div>

        {/* BUTTONS */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="h-10 rounded-lg bg-[#37352F] px-4 text-sm font-medium text-white shadow-sm transition-all hover:bg-[#474540]"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="h-10 rounded-lg bg-[#37352F] px-4 text-sm font-medium text-white shadow-sm transition-all hover:bg-[#474540] disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

interface CreateProjectFlowProps {
  submitting: boolean;
  onCreate: (values: Record<string, unknown>) => Promise<string | null | undefined>;
  renderButton?: boolean;
  buttonClassName?: string;
  showModal?: boolean;
  setShowModal?: (value: boolean) => void;
}

// Combined button + modal component
export function CreateProjectFlow({ submitting, onCreate, renderButton = true, buttonClassName = "", showModal: externalShowModal, setShowModal: externalSetShowModal }: CreateProjectFlowProps) {
  const [internalShowModal, setInternalShowModal] = useState(false);

  // Use external state if provided, otherwise use internal state
  const showModal = externalShowModal !== undefined ? externalShowModal : internalShowModal;
  const setShowModal = externalSetShowModal || setInternalShowModal;

  return (
    <>
      {renderButton && <CreateButton onClick={() => setShowModal(true)} buttonText="+ New Job" className={buttonClassName}/>}
      {showModal && (
        <CreateProjectModal
          submitting={submitting}
          onClose={() => setShowModal(false)}
          onCreate={onCreate}
        />
      )}
    </>
  );
}
