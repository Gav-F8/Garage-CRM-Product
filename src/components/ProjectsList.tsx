// ProjectsList.tsx
// ├── Fetching Jobs using utils.js (vehicleId, title, status)
// ├── Toggle Filter buttons Active (boolean), Complete (status), WIP (status)
// ├── Dropdown Menu => Select Status  ← reads from (status) projects, compares against STATUS_OPTIONS to get unique status keys for filtering (Excludes WIP, Complete statuses)
// ├── Dropdown Menu => Select Mechanic  ← reads from (assignedMechanicName) projects to get unique names for filtering
// ├── Search Projects Bar (searches title, customerName, vehicleLabel)
// └── Automatically sorts projects by Active (boolean) and then by most recently updated (updatedAt or createdAt) using toMillis function to normalize timestamps for comparison
// ══════════════════════════════════════════════════════════════════════════════
// FIRESTORE DATA STRUCTURE — projects/{auto-id}
// ══════════════════════════════════════════════════════════════════════════════
// {
//   assignedMechanicId:      string          // required
//   assignedMechanicName:     string | null
//   vehicleId:     string | null
//   vehicleLabel:   string | null
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
import { Car, ChevronRight } from "lucide-react";
import { STATUS_OPTIONS, getStatusMeta, statusStyle, isWIPStatus, isCompleteStatus } from "../lib/utils";
import type { WithId, Project } from "@/types/firestore";
import type { Timestamp } from "firebase/firestore";

// Uses toMillis to normalize timestamp to ms then compare the last updated timestamps of projects
function updatedMillisForProject(project: WithId<Project>): number {
  const toMillis = (value: Timestamp | Date | number | string | null | undefined): number => {
    if (value == null) return 0;
    if (typeof value === "object" && "toMillis" in value && typeof value.toMillis === "function") return value.toMillis();
    if (value instanceof Date) return value.getTime();
    if (typeof value === "number") return Math.abs(value) < 1e12 ? value * 1000 : value; // Treat numbers < 1 trillion as seconds, convert to milliseconds
    if (typeof value === "string") {
      const parsed = Date.parse(value);
      return Number.isNaN(parsed) ? 0 : parsed; // If string can be parsed as date, return timestamp
    }
    if (typeof value === "object") {
      const seconds = Number((value as { seconds?: number }).seconds);
      const nanoseconds = Number((value as { nanoseconds?: number }).nanoseconds ?? 0);
      return seconds * 1000 + Math.floor(nanoseconds / 1e6);
    }
    return 0;
  }
  return toMillis(project.updatedAt) || toMillis(project.createdAt);
}

interface DropdownOption {
  value: string;
  label: string;
}

// Reusable Dropdown component for status and mechanic filters
function Dropdown({ value, onChange, options, className }: {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  className?: string;
}) {
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

function ProjectRow({ project }: { project: WithId<Project> }) {
  const { label, style } = statusStyle(project.status);
  const isProjectActive = project.isActive ?? false;

  return (
    <Link
      to={`/projects/${project.id}`}
      aria-label={`Open project ${project.title || "Untitled Project"}`}
      className="block border-b border-[#E0E0E0] last:border-b-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2F6FED] focus-visible:ring-inset"
    >
      {/* Tablet / desktop row */}
      <div className="hidden sm:flex items-center w-full px-6 py-3.5 transition-all duration-150 hover:bg-[#F7F7F5] hover:scale-[1.01] active:scale-[0.995]">
        <span className="font-mono font-semibold text-sm w-32 shrink-0 truncate text-[#37352F]">
          {project.vehicleLabel || "-"}
        </span>

        <span className="flex-1 min-w-0 px-5 text-sm font-medium text-[#2F6FED] truncate">
          {project.title || "Untitled Project"}
        </span>

        <div className="w-40 shrink-0">
          <span
            className={`inline-flex items-center max-w-full px-2.5 py-0.5 rounded-md text-xs font-medium truncate ${style}`}
          >
            {label}
          </span>
        </div>

        <div className="flex items-center gap-2 w-36 shrink-0">
          <div
            className={`w-3.5 h-3.5 shrink-0 rounded-sm border border-[#E0E0E0] ${isProjectActive ? "bg-[#37352F]" : "bg-white"}`}
            title={isProjectActive ? "Active" : "Inactive"}
          />
          <span className="text-sm text-[#787774]">
            {isProjectActive ? "Active" : "Inactive"}
          </span>
        </div>
      </div>

      {/* Mobile card */}
      <div className="sm:hidden flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-[#F7F7F5] active:bg-blue-50">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-[#2F6FED] truncate">
              {project.title || "Untitled Project"}
            </span>
            <span
              className={`shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${style}`}
            >
              {label}
            </span>
          </div>
          <div className="mt-1.5 flex items-center gap-3 text-xs text-[#787774]">
            <span className="flex items-center gap-1.5 min-w-0">
              <Car className="h-3.5 w-3.5 shrink-0 text-[#9B9A97]" />
              <span className="truncate font-mono">
                {project.vehicleLabel || "-"}
              </span>
            </span>
            <span className="flex items-center gap-1.5 shrink-0">
              <span
                className={`w-2.5 h-2.5 rounded-sm border border-[#E0E0E0] ${isProjectActive ? "bg-[#37352F]" : "bg-white"}`}
              />
              {isProjectActive ? "Active" : "Inactive"}
            </span>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-[#9B9A97]" />
      </div>
    </Link>
  );
}

interface ProjectsListProps {
  projects: WithId<Project>[];
  loading: boolean;
  error?: string | null;
  emptyMessage?: string;
  showFilters?: boolean;
  showSearch?: boolean;
  searchInputClassName?: string;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
}

type FilterKey = "active" | "complete" | "WIP";

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
  }: ProjectsListProps) {

  const [filters, setFilters] = useState<Record<FilterKey, boolean>>({
    active: false,
    complete: false,
    WIP: false,
  });

  const [statusFilter, setStatusFilter] = useState("all");
  const [mechanicFilter, setMechanicFilter] = useState("all");
  const [search, setSearch] = useState("");

  // Toggles the boolean state of the specified filter key (active, complete, WIP) when the corresponding button is clicked
  const toggleFilter = (key: FilterKey) => {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Generate unique mechanic names from projects for the mechanic filter dropdown
  const uniqueMechanics = useMemo(() => {
    const mechanics = new Set<string>();
    projects.forEach((project) => {
      const names = Array.isArray(project.assignedMechanicName)
        ? project.assignedMechanicName
        : [project.assignedMechanicName].filter((name): name is string => Boolean(name));
      names.forEach((name) => mechanics.add(name));
    });
    return ["all", ...mechanics];
  }, [projects]);

  // Applies all filters and search term to determine if a project should be rendered
  const applyFilters = (project: WithId<Project>): boolean => {
    if(filters.active && !project.isActive) return false;
    if(filters.complete && !isCompleteStatus(project.status)) return false;
    if(filters.WIP && !isWIPStatus(project.status)) return false;
    if(statusFilter !== "all" && getStatusMeta(project.status).key !== statusFilter) return false;
    if (mechanicFilter !== "all") {
      const names = Array.isArray(project.assignedMechanicName)
        ? project.assignedMechanicName
        : [project.assignedMechanicName].filter((name): name is string => Boolean(name));
      if (!names.includes(mechanicFilter)) return false;
    }
    if(search.trim()) {
      const term = search.toLowerCase();
      if(
        !(
          project.title?.toLowerCase().includes(term) ||
          project.customerName?.toLowerCase().includes(term) ||
          project.vehicleLabel?.toLowerCase().includes(term)
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
      const activityA = projectA.isActive ? 1 : 0;
      const activityB = projectB.isActive ? 1 : 0;
      if(activityA !== activityB) return activityB - activityA; // Active projects first
      return updatedMillisForProject(projectB) - updatedMillisForProject(projectA); // Then by most recently updated
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          {(["active", "complete", "WIP"] as const).map((key) => (
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
          <div className="hidden sm:flex items-center w-full px-6 py-3 bg-[#F7F7F5] border-b border-[#E0E0E0] text-xs font-semibold text-[#787774] uppercase tracking-wider">
            <span className="w-32 shrink-0 truncate">Car Make</span>
            <span className="px-5 flex-1 min-w-0 truncate">Job Title</span>
            <span className="w-40 shrink-0 truncate">Status</span>
            <span className="w-36 shrink-0 truncate">Active</span>
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
