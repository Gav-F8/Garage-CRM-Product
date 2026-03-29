import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../../firebase";
import { NavigationBar } from "../../components/NavigationBar";
import { notionClasses } from "@/lib/notion-theme";
import {
  Loader2,
  UserCheck,
  UserX,
  Trash2,
  Users,
  Clock,
  X,
  Mail,
  Phone,
  CalendarDays,
  ShieldCheck,
} from "lucide-react";

// ── Confirm Modal ─────────────────────────────────────────────────────────────
function ConfirmModal({ action, emp, onConfirm, onCancel }) {
  if (!action || !emp) return null;

  const config = {
    approve: {
      icon: <UserCheck className="h-6 w-6 text-green-600" />,
      iconBg: "bg-green-50 border-green-200",
      title: "Approve Employee",
      message: (
        <>
          Are you sure you want to approve{" "}
          <span className="font-semibold text-[#37352F]">
            {emp.Name || emp.email}
          </span>
          ? They will gain full employee access.
        </>
      ),
      confirmLabel: "Yes, Approve",
      confirmClass:
        "bg-green-600 hover:bg-green-700 text-white border-transparent",
    },
    decline: {
      icon: <UserX className="h-6 w-6 text-red-600" />,
      iconBg: "bg-red-50 border-red-200",
      title: "Decline Request",
      message: (
        <>
          Are you sure you want to decline{" "}
          <span className="font-semibold text-[#37352F]">
            {emp.Name || emp.email}
          </span>
          ? Their request will be marked as rejected.
        </>
      ),
      confirmLabel: "Yes, Decline",
      confirmClass: "bg-red-600 hover:bg-red-700 text-white border-transparent",
    },
  }[action];

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="relative bg-white rounded-2xl shadow-xl border border-[#E0E0E0] w-full max-w-sm mx-4 p-6 animate-in fade-in slide-in-from-bottom-4 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-transparent border-0 shadow-none text-[#9B9A97] hover:bg-[#F7F7F5] hover:text-[#37352F] hover:shadow-none transition-colors focus:outline-none"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Icon */}
        <div
          className={`mx-auto mb-4 w-12 h-12 rounded-full border flex items-center justify-center ${config.iconBg}`}
        >
          {config.icon}
        </div>

        {/* Title */}
        <h3 className="text-base font-semibold text-[#37352F] text-center mb-2">
          {config.title}
        </h3>

        {/* Message */}
        <p className="text-sm text-[#787774] text-center leading-relaxed mb-6">
          {config.message}
        </p>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-transparent border border-[#E0E0E0] text-[#787774] shadow-none hover:bg-[#F7F7F5] hover:text-[#37352F] hover:shadow-none transition-colors focus:outline-none"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium border transition-colors focus:outline-none ${config.confirmClass}`}
          >
            {config.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Detail Modal ──────────────────────────────────────────────────────────────
function EmployeeDetailModal({ emp, onClose }) {
  if (!emp) return null;

  const joinDate = emp.createdAt
    ? new Date(emp.createdAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—";

  const roleBadge =
    {
      employee: "bg-green-100 text-green-700 border-green-200",
      pendingApproval: "bg-yellow-100 text-yellow-700 border-yellow-200",
      rejected: "bg-red-100 text-red-700 border-red-200",
      owner: "bg-blue-100 text-blue-700 border-blue-200",
    }[emp.role] ?? "bg-gray-100 text-gray-700 border-gray-200";

  const roleLabel =
    {
      employee: "Employee",
      pendingApproval: "Pending Approval",
      rejected: "Rejected",
      owner: "Owner",
    }[emp.role] ?? emp.role;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl shadow-xl border border-[#E0E0E0] w-full max-w-sm mx-4 p-6 animate-in fade-in slide-in-from-bottom-4 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-transparent border-0 shadow-none text-[#9B9A97] hover:bg-[#F7F7F5] hover:text-[#37352F] hover:shadow-none transition-colors focus:outline-none"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Avatar + name */}
        <div className="flex flex-col items-center text-center gap-3 pb-5 border-b border-[#E0E0E0]">
          <div className="w-16 h-16 rounded-full bg-[#F7F7F5] border border-[#E0E0E0] flex items-center justify-center text-[#37352F] font-bold text-2xl">
            {emp.Name ? emp.Name.charAt(0).toUpperCase() : "?"}
          </div>
          <div>
            <h3 className="text-base font-semibold text-[#37352F]">
              {emp.Name || "—"}
            </h3>
            <span
              className={`mt-1 inline-block px-2.5 py-0.5 rounded-full text-xs font-medium border ${roleBadge}`}
            >
              {roleLabel}
            </span>
          </div>
        </div>

        {/* Detail rows */}
        <ul className="mt-5 space-y-3">
          <DetailRow
            icon={<Mail className="h-4 w-4" />}
            label="Email"
            value={emp.email || "—"}
          />
          <DetailRow
            icon={<Phone className="h-4 w-4" />}
            label="Phone"
            value={emp.phone || "—"}
          />
          <DetailRow
            icon={<CalendarDays className="h-4 w-4" />}
            label="Joined"
            value={joinDate}
          />
          <DetailRow
            icon={<ShieldCheck className="h-4 w-4" />}
            label="Status"
            value={
              emp.status
                ? emp.status.charAt(0).toUpperCase() + emp.status.slice(1)
                : "—"
            }
          />
        </ul>
      </div>
    </div>
  );
}

function DetailRow({ icon, label, value }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 text-[#9B9A97] shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-[#9B9A97]">{label}</p>
        <p className="text-sm text-[#37352F] truncate">{value}</p>
      </div>
    </li>
  );
}

// ── Employee Card ─────────────────────────────────────────────────────────────
function EmployeeCard({
  emp,
  actionLoading,
  variant,
  onApprove,
  onDecline,
  onRemove,
  onSelect,
}) {
  const isLoading = actionLoading === emp.id;
  const joinDate = emp.createdAt
    ? new Date(emp.createdAt).toLocaleDateString()
    : "—";

  return (
    <div
      className={`${notionClasses.card} flex items-center justify-between gap-4`}
    >
      {/* Clickable avatar + info */}
      <button
        onClick={() => onSelect(emp)}
        className="flex items-center gap-4 min-w-0 text-left group bg-transparent border-0 p-0 shadow-none hover:bg-transparent hover:shadow-none focus:outline-none"
      >
        <div className="w-10 h-10 shrink-0 rounded-full bg-[#F7F7F5] border border-[#E0E0E0] flex items-center justify-center text-[#37352F] font-semibold text-sm group-hover:bg-[#EFEFED] transition-colors">
          {emp.Name ? emp.Name.charAt(0).toUpperCase() : "?"}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-[#37352F] truncate group-hover:underline underline-offset-2">
            {emp.Name || "—"}
          </p>
          <p className="text-xs text-[#787774] truncate">{emp.email}</p>
          <p className="text-xs text-[#9B9A97]">Joined {joinDate}</p>
        </div>
      </button>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {variant === "pending" && (
          <>
            <button
              onClick={onApprove}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 hover:shadow-none shadow-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none"
            >
              {isLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <UserCheck className="h-3 w-3" />
              )}
              Approve
            </button>
            <button
              onClick={onDecline}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 hover:shadow-none shadow-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none"
            >
              {isLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <UserX className="h-3 w-3" />
              )}
              Decline
            </button>
          </>
        )}

        {variant === "active" && (
          <button
            onClick={onRemove}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 hover:shadow-none shadow-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none"
          >
            {isLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Trash2 className="h-3 w-3" />
            )}
            Remove
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function EmployeeManagement() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null); // { type: "approve" | "decline", emp }

  const businessId = localStorage.getItem("ccgBusinessId");

  const fetchEmployees = async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const snapshot = await getDocs(
        collection(db, "businesses", businessId, "Employees"),
      );
      const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setEmployees(list);
    } catch (err) {
      setError("Failed to load employees.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  // Called when user clicks "Yes, Approve" or "Yes, Decline" in ConfirmModal
  const handleConfirm = async () => {
    if (!confirmAction) return;
    const { type, emp } = confirmAction;
    setConfirmAction(null);
    if (type === "approve") await handleApprove(emp.id);
    if (type === "decline") await handleDecline(emp.id);
  };

  const handleApprove = async (uid) => {
    setActionLoading(uid);
    try {
      await updateDoc(doc(db, "businesses", businessId, "Employees", uid), {
        role: "employee",
      });
      setEmployees((prev) =>
        prev.map((e) => (e.id === uid ? { ...e, role: "employee" } : e)),
      );
      setSelectedEmployee((prev) =>
        prev?.id === uid ? { ...prev, role: "employee" } : prev,
      );
    } catch (err) {
      setError("Failed to approve employee.");
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async (uid) => {
    setActionLoading(uid);
    try {
      await updateDoc(doc(db, "businesses", businessId, "Employees", uid), {
        role: "rejected",
      });
      setEmployees((prev) =>
        prev.map((e) => (e.id === uid ? { ...e, role: "rejected" } : e)),
      );
      setSelectedEmployee((prev) =>
        prev?.id === uid ? { ...prev, role: "rejected" } : prev,
      );
    } catch (err) {
      setError("Failed to decline employee.");
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemove = async (uid) => {
    setActionLoading(uid);
    try {
      await deleteDoc(doc(db, "businesses", businessId, "Employees", uid));
      setEmployees((prev) => prev.filter((e) => e.id !== uid));
      setSelectedEmployee((prev) => (prev?.id === uid ? null : prev));
    } catch (err) {
      setError("Failed to remove employee.");
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const pending = employees.filter((e) => e.role === "pendingApproval");
  const active = employees.filter((e) => e.role === "employee");

  return (
    <div className={notionClasses.pageContainer}>
      <NavigationBar />

      {/* Confirm modal — z-[60], sits above detail modal */}
      <ConfirmModal
        action={confirmAction?.type}
        emp={confirmAction?.emp}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmAction(null)}
      />

      {/* Detail modal */}
      <EmployeeDetailModal
        emp={selectedEmployee}
        onClose={() => setSelectedEmployee(null)}
      />

      <div className={notionClasses.dashboardContainer}>
        {/* Header */}
        <div className="mb-8">
          <h1 className={notionClasses.header.title}>Team Management</h1>
          <p className={notionClasses.header.subtitle}>
            Approve, manage, and remove your garage employees.
          </p>
        </div>

        {error && (
          <div className={`${notionClasses.errorBox} mb-6`}>
            <svg
              className="w-4 h-4 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-[#9B9A97]" />
          </div>
        ) : (
          <div className="space-y-10">
            {/* Pending Approvals */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Clock className="h-5 w-5 text-yellow-600" />
                <h2 className="text-lg font-semibold text-[#37352F]">
                  Pending Approval
                </h2>
                {pending.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 border border-yellow-200">
                    {pending.length}
                  </span>
                )}
              </div>

              {pending.length === 0 ? (
                <div className={`${notionClasses.card} text-sm text-[#787774]`}>
                  No pending approvals at the moment.
                </div>
              ) : (
                <div className="space-y-3">
                  {pending.map((emp) => (
                    <EmployeeCard
                      key={emp.id}
                      emp={emp}
                      actionLoading={actionLoading}
                      variant="pending"
                      onApprove={() =>
                        setConfirmAction({ type: "approve", emp })
                      }
                      onDecline={() =>
                        setConfirmAction({ type: "decline", emp })
                      }
                      onSelect={setSelectedEmployee}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Active Employees */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Users className="h-5 w-5 text-green-600" />
                <h2 className="text-lg font-semibold text-[#37352F]">
                  Active Employees
                </h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                  {active.length}
                </span>
              </div>

              {active.length === 0 ? (
                <div className={`${notionClasses.card} text-sm text-[#787774]`}>
                  No active employees yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {active.map((emp) => (
                    <EmployeeCard
                      key={emp.id}
                      emp={emp}
                      actionLoading={actionLoading}
                      variant="active"
                      onRemove={() => handleRemove(emp.id)}
                      onSelect={setSelectedEmployee}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
