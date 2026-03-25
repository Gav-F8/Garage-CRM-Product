import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

function statusStyle(status) {
  const normalized =
    typeof status === "number"
      ? status
      : String(status || "").trim().toLowerCase();

  switch (normalized) {
    case 0:
    case "pending":
      return {
        label: "Pending",
        style: "bg-yellow-100 text-yellow-700 border border-yellow-200",
      };
    case 1:
    case "in progress":
    case "in_progress":
    case "in-progress":
    case "active":
      return {
        label: "In Progress",
        style: "bg-green-100 text-green-700 border border-green-200",
      };
    case 2:
    case "complete":
    case "completed":
    case "done":
      return {
        label: "Complete",
        style: "bg-red-100 text-red-700 border border-red-200",
      };
    default:
      return {
        label: "Unknown",
        style: "bg-gray-100 text-gray-700 border border-gray-200",
      };
  }
}

function matchesFilter(statusValue, filter) {
  const status = String(statusValue || "").trim().toLowerCase();

  if (filter === "active") {
    return (
      status === "active" ||
      status === "in progress" ||
      status === "in_progress" ||
      status === "in-progress"
    );
  }

  if (filter === "complete") {
    return status === "complete" || status === "completed" || status === "done";
  }

  return status === filter;
}

function ProjectRow({ project }) {
  const { label, style } = statusStyle(project.status);
  const inHouse = project.outHouse === true ? false : true;

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
            className={`w-3.5 h-3.5 rounded-sm border border-[#E0E0E0] ${inHouse ? "bg-[#37352F]" : "bg-white"}`}
            title={inHouse ? "In-House" : "Out-House"}
          />
          <span className="text-sm text-[#787774]">
            {inHouse ? "In-House" : "Out-House"}
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
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filteredProjects = useMemo(() => {
    let result = [...projects];

    if (filter !== "all") {
      result = result.filter((project) => matchesFilter(project.status, filter));
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

    return result;
  }, [projects, filter, search]);

  return (
    <div>
      <p className="mb-4 text-sm text-[#787774]">
        {loading
          ? "Loading..."
          : `Showing ${filteredProjects.length} of ${projects.length} projects`}
      </p>

      {!loading && projects.length > 0 && showFilters && (
        <div className="mb-4 flex flex-wrap gap-3">
          <button
            onClick={() => setFilter("all")}
            className={`h-10 px-4 rounded-lg text-sm font-medium border transition-all ${
              filter === "all"
                ? "bg-[#37352F] text-white border-[#37352F]"
                : "bg-white text-[#37352F] border-[#E0E0E0] hover:bg-[#F7F6F3]"
            }`}
          >
            All
          </button>

          <button
            onClick={() => setFilter("active")}
            className={`h-10 px-4 rounded-lg text-sm font-medium border transition-all ${
              filter === "active"
                ? "bg-[#37352F] text-white border-[#37352F]"
                : "bg-white text-[#37352F] border-[#E0E0E0] hover:bg-[#F7F6F3]"
            }`}
          >
            Active
          </button>

          <button
            onClick={() => setFilter("complete")}
            className={`h-10 px-4 rounded-lg text-sm font-medium border transition-all ${
              filter === "complete"
                ? "bg-[#37352F] text-white border-[#37352F]"
                : "bg-white text-[#37352F] border-[#E0E0E0] hover:bg-[#F7F6F3]"
            }`}
          >
            Complete
          </button>
        </div>
      )}

      {!loading && projects.length > 0 && showSearch && (
        <div className="mb-6">
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
            <span className="w-36 shrink-0">Location</span>
          </div>

          {filteredProjects.map((project) => (
            <ProjectRow key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
