// ProjectsList.jsx
// ├── Fetching Jobs using status.js (vehicleId, title, status)
// ├── Toggle Filter buttons (Active - (boolean), Complete (status), WIP (status)
// ├── Dropdown Menu => Select Status  ← reads from STATUS_OPTIONS
// ├── Search Projects Bar (searches title, customerName, carLabel)
// └── Automatically sorts projects by Active (boolean) and then by most recently updated (updatedAt or createdAt) using toMillis function to normalize timestamps for comparison
// ══════════════════════════════════════════════════════════════════════════════
// FIRESTORE DATA STRUCTURE — projects/{auto-id}
// ══════════════════════════════════════════════════════════════════════════════
// {
//   assignedMechanicId:      string          // required
//   assignedMechanicName:     string | null
//   carId:     string | null
//   carLabel:   string | null
//   createdAt: Timestamp       // serverTimestamp()
//   createdByEmployeeId: string          // required
//   createdByEmployeeName: string          // required
//   customerId: string | null
//   customerName: string | null
//   lastNoteAt: Timestamp | null
//   lastNoteText: string | null
//   isActive: boolean | null
//   priority: string | null
//   status: string | null
//   title: string
//   totalMinutes: integer
//   updatedAt: Timestamp       // serverTimestamp()
// }

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { STATUS_OPTIONS, getStatusMeta, statusStyle, isWIPStatus, isCompleteStatus } from "../lib/status";



// Used to normalize the status string to determine what stage a project is at. Can be updated to include more or less values.
function normalizeStatus(statusValue) {
  if (typeof statusValue === "number") {
    return statusValue;
  }

  return String(statusValue || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

// Checks to see if project is active (Boolean) true or false.
function isActiveProject(project) {
  return project.isActive === true ? true : false;
}

//Converts Timestamps to normalized value in milliseconds for easier comparison and sorting
function toMillis(value) {
  if (value == null) return 0;

  if (typeof value.toMillis === "function") {
    return value.toMillis();
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) return 0;
    return Math.abs(value) < 1e12 ? value * 1000 : value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return 0;

    const numericValue = Number(trimmed);
    if (Number.isFinite(numericValue)) {
      return Math.abs(numericValue) < 1e12
        ? numericValue * 1000
        : numericValue;
    }

    const parsed = Date.parse(trimmed);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  if (typeof value === "object") {
    const seconds = Number(value.seconds);
    if (Number.isFinite(seconds)) {
      const nanoseconds = Number(value.nanoseconds ?? 0);
      return seconds * 1000 + Math.floor((Number.isFinite(nanoseconds) ? nanoseconds : 0) / 1e6);
    }
  }

  return 0;
}

// Uses toMillis to compare the last updated timestamp of projects
function updatedMillisForProject(project) {
  return toMillis(project.updatedAt) || toMillis(project.createdAt);
}

function ProjectRow({ project }) {
  const { label, style } = statusStyle(project.status);
  const isProjectActive = isActiveProject(project);

  return (
    <Link
      to={`/projects/${project.id}`}
      aria-label={`Open project ${project.title || "Untitled Project"}`}
      className="block border-b border-[#E0E0E0] last:border-b-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2F6FED] focus-visible:ring-inset"
    >
      <div className="flex items-center w-full px-6 py-3.5 transition-all duration-150 hover:bg-[#F7F7F5] hover:scale-[1.01] active:scale-[0.995]">
        <span className="font-mono font-semibold text-sm w-32 shrink-0 text-[#37352F]">
          {project.carLabel || "-"}
        </span>

        <span className="flex-1 text-sm font-medium text-[#2F6FED]">
          {project.title || "Untitled Project"}
        </span>

        <div className="w-40 shrink-0">
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${style}`}
          >
            {label}
          </span>
        </div>

        <div className="flex items-center gap-2 w-36 shrink-0">
          <div
            className={`w-3.5 h-3.5 rounded-sm border border-[#E0E0E0] ${isProjectActive ? "bg-[#37352F]" : "bg-white"}`}
            title={isProjectActive ? "Active" : "Inactive"}
          />
          <span className="text-sm text-[#787774]">
            {isProjectActive ? "Active" : "Inactive"}
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function ProjectsList({
  projects,
  loading,
  error,
  emptyMessage = "No projects found.",
  showFilters = true,
  showSearch = true,
  searchInputClassName,
}) {
  const [filters, setFilters] = useState({
    active: false,
    complete: false,
    WIP: false,
  });

  const [statusFilter, setStatusFilter] = useState("all");

  const [search, setSearch] = useState("");

  const toggleFilter = (key) => {
    setFilters((previous) => ({
      ...previous,
      [key]: !previous[key],
    }));
  };

  const filteredProjects = useMemo(() => {
    let result = [...projects];
    const hasActiveFilters = filters.active || filters.complete || filters.WIP;

    if (hasActiveFilters) {
      result = result.filter((project) => {
        const matchesActive = filters.active && project.isActive === true;
        const matchesComplete = filters.complete && isCompleteStatus(project.status);
        const matchesWIP = filters.WIP && isWIPStatus(project.status);

        return matchesActive || matchesComplete || matchesWIP;
      });
    }

    if (statusFilter != "all") {
      result = result.filter((project) => getStatusMeta(project.status).key === statusFilter);
    }

    if (search.trim()) {
      const term = search.toLowerCase();
      result = result.filter(
        (project) =>
          (project.title && project.title.toLowerCase().includes(term)) ||
          (project.customerName && project.customerName.toLowerCase().includes(term)) ||
          (project.carLabel && project.carLabel.toLowerCase().includes(term)),
      );
    }

    result.sort((projectA, projectB) => {
      const activityA = isActiveProject(projectA) ? 1 : 0;
      const activityB = isActiveProject(projectB) ? 1 : 0;

      if (activityA !== activityB) {
        return activityB - activityA;
      }

      return updatedMillisForProject(projectB) - updatedMillisForProject(projectA);
    });

    return result;
  }, [projects, filters, search, statusFilter]);

  return (
    <div className="w-full">
      <p className="mb-4 text-sm text-[#787774]">
        {loading
          ? "Loading..."
          : `Showing ${filteredProjects.length} of ${projects.length} projects`}
      </p>

      {!loading && projects.length > 0 && showFilters && (
        <div className="mb-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => toggleFilter("active")}
            aria-pressed={filters.active}
            className={`!h-10 !px-4 !py-0 !rounded-lg !text-sm !font-medium !border !transition-all !duration-150 !outline-none focus-visible:!outline-none focus-visible:!ring-2 focus-visible:!ring-[#2F6FED] focus-visible:!ring-offset-0 ${filters.active
              ? "!bg-[#37352F] !text-white !border-[#37352F] hover:!bg-[#37352F]"
              : "!bg-white !text-[#37352F] !border-[#E0E0E0] hover:!bg-[#F7F6F3]"
              }`}
          >
            Active
          </button>

          <button
            type="button"
            onClick={() => toggleFilter("complete")}
            aria-pressed={filters.complete}
            className={`!h-10 !px-4 !py-0 !rounded-lg !text-sm !font-medium !border !transition-all !duration-150 !outline-none focus-visible:!outline-none focus-visible:!ring-2 focus-visible:!ring-[#2F6FED] focus-visible:!ring-offset-0 ${filters.complete
              ? "!bg-[#37352F] !text-white !border-[#37352F] hover:!bg-[#37352F]"
              : "!bg-white !text-[#37352F] !border-[#E0E0E0] hover:!bg-[#F7F6F3]"
              }`}
          >
            Complete
          </button>

          <button
            type="button"
            onClick={() => toggleFilter("WIP")}
            aria-pressed={filters.WIP}
            className={`!h-10 !px-4 !py-0 !rounded-lg !text-sm !font-medium !border !transition-all !duration-150 !outline-none focus-visible:!outline-none focus-visible:!ring-2 focus-visible:!ring-[#2F6FED] focus-visible:!ring-offset-0 ${filters.WIP
              ? "!bg-[#37352F] !text-white !border-[#37352F] hover:!bg-[#37352F]"
              : "!bg-white !text-[#37352F] !border-[#E0E0E0] hover:!bg-[#F7F6F3]"
              }`}
          >
            WIP
          </button>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="h-10 rounded-lg border border-[#E0E0E0] bg-white px-3 text-sm text-[#37352F] outline-none focus:border-[#37352F]"
          >
            <option value="all">Select</option>
            {STATUS_OPTIONS.filter(status => status.key !== "wip" && status.key !== "complete").map((status) => (
              <option key={status.key} value={status.key}>
                {status.label}
              </option> // Options exclude WIP and Complete since they are already covered by toggle buttons
            ))}
          </select>

        </div>
      )}

      {!loading && projects.length > 0 && showSearch && (
        <div className="mb-6 w-full">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search projects..."
            className={
              searchInputClassName ||
              "h-11 w-full rounded-lg border border-[#E0E0E0] bg-white px-3 text-sm text-[#37352F] shadow-sm outline-none focus:border-[#37352F]"
            }
          />
        </div>
      )}

      {loading ? (
        <p className="text-sm text-[#787774]">Loading projects...</p>
      ) : error ? (
        <p className="text-sm text-[#C53030]">{error}</p>
      ) : projects.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-[#E0E0E0] rounded-xl bg-white shadow-sm">
          <p className="text-sm text-[#787774] mb-4">{emptyMessage}</p>
        </div>
      ) : (
        <div className="flex flex-col w-full bg-white border border-[#E0E0E0] rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center w-full px-6 py-3 bg-[#F7F7F5] border-b border-[#E0E0E0] text-xs font-semibold text-[#787774] uppercase tracking-wider">
            <span className="w-32 shrink-0">Car Reg</span>
            <span className="flex-1">Job Title</span>
            <span className="w-40 shrink-0">Status</span>
            <span className="w-36 shrink-0">Active</span>
          </div>

          {filteredProjects.map((project) => (
            <ProjectRow key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
