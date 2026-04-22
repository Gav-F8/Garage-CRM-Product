// ProjectsList.jsx
// ├── Fetching Jobs using utils.js (vehicleId, title, status)
// ├── Toggle Filter buttons Active (boolean), Complete (status), WIP (status)
// ├── Dropdown Menu => Select Status  ← reads from (status) projects, compares against STATUS_OPTIONS to get unique status keys for filtering (Excludes WIP, Complete statuses)
// ├── Dropdown Menu => Select Mechanic  ← reads from (assignedMechanicName) projects to get unique names for filtering
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
//   status: string | null
//   title: string
//   totalMinutes: integer
//   updatedAt: Timestamp       // serverTimestamp()
// }

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { STATUS_OPTIONS, getStatusMeta, statusStyle, isWIPStatus, isCompleteStatus } from "../lib/utils.js";


// Utility functions
function isActiveProject(project) {
  return project.isActive === true;
}

// Uses toMillis to normalize timestamp to ms then compare the last updated timestamps of projects
function updatedMillisForProject(project) {
  const toMillis = (value) => {
    if (value == null) return 0;
    if (typeof value.toMillis === "function") return value.toMillis();
    if (value instanceof Date) return value.getTime();
    if (typeof value === "number") return Math.abs(value) < 1e12 ? value * 1000 : value; // Treat numbers < 1 trillion as seconds, convert to milliseconds
    if (typeof value === "string") {
      const parsed = Date.parse(value);
      return Number.isNaN(parsed) ? 0 : parsed; // If string can be parsed as date, return timestamp
    }
    if (typeof value === "object") {
      const seconds = Number(value.seconds);
      const nanoseconds = Number(value.nanoseconds ?? 0);
      return seconds * 1000 + Math.floor(nanoseconds / 1e6);
    }
    return 0;
  }
  return toMillis(project.updatedAt) || toMillis(project.createdAt);
}

// Reusable Dropdown component for status and mechanic filters
function Dropdown({ value, onChange, options, className }) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={className}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
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

        <span className="flex-1 px-5 text-sm font-medium text-[#2F6FED]">
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
  hasMore = false,
  loadingMore = false,
  onLoadMore,
  }) {
  
  const [filters, setFilters] = useState({
    active: false,
    complete: false,
    WIP: false,
  });

  const [statusFilter, setStatusFilter] = useState("all");
  const [mechanicFilter, setMechanicFilter] = useState("all");
  const [search, setSearch] = useState("");

  // Toggles the boolean state of the specified filter key (active, complete, WIP) when the corresponding button is clicked
  const toggleFilter = (key) => {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Generate unique mechanic names from projects for the mechanic filter dropdown
  const uniqueMechanics = useMemo(() => {
    const mechanics = new Set();
    projects.forEach((project) => {
      const names = Array.isArray(project.assignedMechanicName)
        ? project.assignedMechanicName
        : [project.assignedMechanicName].filter(Boolean);
      names.forEach((name) => mechanics.add(name));
    });
    return ["all", ...mechanics];
  }, [projects]);

  // Applies all filters and search term to determine if a project should be rendered
  const applyFilters = (project) => {
    if(filters.active && !isActiveProject(project)) return false;
    if(filters.complete && !isCompleteStatus(project.status)) return false;
    if(filters.WIP && !isWIPStatus(project.status)) return false;
    if(statusFilter !== "all" && getStatusMeta(project.status).key !== statusFilter) return false;
    if (mechanicFilter !== "all") {
      const names = Array.isArray(project.assignedMechanicName)
        ? project.assignedMechanicName
        : [project.assignedMechanicName].filter(Boolean);
      if (!names.includes(mechanicFilter)) return false;
    }
    if(search.trim()) {
      const term = search.toLowerCase();
      if(
        !(
          project.title?.toLowerCase().includes(term) ||
          project.customerName?.toLowerCase().includes(term) ||
          project.carLabel?.toLowerCase().includes(term)
        )
      ) {
        return false;
      }
    }
    return true;
  };

  // Generate filtered and sorted projects based on active filters, status filter, mechanic filter, and search term
  const filteredProjects = useMemo(() => {
    return projects.filter(applyFilters).sort((projectA, projectB) => {
      const activityA = isActiveProject(projectA) ? 1 : 0;
      const activityB = isActiveProject(projectB) ? 1 : 0;
      if(activityA !== activityB) return activityB - activityA; // Active projects first
      return updatedMillisForProject(projectB) - updatedMillisForProject(projectA); // Then by most recently updated
    });
  }, [projects, filters, statusFilter, mechanicFilter, search]);

  return (
    <div className="w-full">
      <p className="flex items-center justify-between px-4 py-1 mb-2 mt-2 text-sm text-[#787774]">
        {loading
          ? "Loading..."
          : `Showing ${filteredProjects.length} of ${projects.length} projects`}
      </p>

      {!loading && projects.length > 0 && showFilters && (
        <div className="mb-4 px-2 flex flex-wrap gap-3">
          {["active", "complete", "WIP"].map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => toggleFilter(key)}
              aria-pressed={filters[key]}
              className={`!h-10 !px-4 !py-0 !rounded-lg !text-sm !font-medium !border !transition-all !duration-150 !outline-none focus-visible:!outline-none focus-visible:!ring-2 focus-visible:!ring-[#2F6FED] focus-visible:!ring-offset-0 ${
                filters[key]
                  ? "!bg-[#37352F] !text-white !border-[#37352F] hover:!bg-[#37352F]"
                  : "!bg-white !text-[#37352F] !border-[#E0E0E0] hover:!bg-[#F7F6F3]"
              }`}
            >
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </button>
          ))}

          <Dropdown
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: "all", label: "Select" },
              ...STATUS_OPTIONS.filter((status) => status.key !== "wip" && status.key !== "complete").map((status) => ({
                value: status.key,
                label: status.label,
              })),
            ]}
            className="h-10 rounded-lg border border-[#E0E0E0] bg-white px-3 text-sm text-[#37352F] outline-none focus:border-[#37352F]"
          />

          <Dropdown
            value={mechanicFilter}
            onChange={setMechanicFilter}
            options={uniqueMechanics.map((mechanic) => ({
              value: mechanic,
              label: mechanic === "all" ? "All Mechanics" : mechanic,
            }))}
            className="h-10 rounded-lg border border-[#E0E0E0] bg-white px-3 text-sm text-[#37352F] outline-none focus:border-[#37352F]"
          />
        </div>
      )}

      {!loading && projects.length > 0 && showSearch && (
        <div className="mb-6 px-3 w-full">
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
            <span className="w-32 shrink-0">Car Make</span>
            <span className="px-5 flex-1">Job Title</span>
            <span className="w-40 shrink-0">Status</span>
            <span className="w-36 shrink-0">Active</span>
          </div>

          {filteredProjects.map((project) => (
            <ProjectRow key={project.id} project={project} />
          ))}

          {hasMore && (
            <div className="flex items-center justify-center px-6 py-4 border-t border-[#E0E0E0] bg-[#F7F7F5]">
              <button
                onClick={onLoadMore}
                disabled={loadingMore}
                className="h-10 px-6 rounded-lg bg-[#37352F] text-white text-sm font-medium hover:bg-[#474540] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                {loadingMore ? "Loading more..." : "Load More"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}