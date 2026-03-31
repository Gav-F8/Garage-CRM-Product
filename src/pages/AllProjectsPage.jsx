import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { notionClasses } from "/src/lib/notion-theme";
import { NavigationBar } from "../components/NavigationBar";
import ProjectsList from "../components/ProjectsList";
import { useProjectsForCurrentUser } from "../hooks/useProjectsForCurrentUser";

export default function AllProjectsPage() {
  const {
    projects,
    loading,
    error,
    currentRole,
  } = useProjectsForCurrentUser();

  const isOwner = useMemo(() => currentRole === "owner", [currentRole]);
  
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Pagination logic
  const totalPages = Math.ceil(projects.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProjects = projects.slice(startIndex, endIndex);

  // Reset to page 1 when projects change
  const handleProjectsChange = () => {
    setCurrentPage(1);
  };

  // Handle items per page change
  const handleItemsPerPageChange = (newValue) => {
    setItemsPerPage(newValue);
    setCurrentPage(1);
  };

  return (
    <div className={notionClasses.pageContainer}>
      <NavigationBar />
      <div className={notionClasses.dashboardContainer}>
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className={notionClasses.header.title}>Jobs</h1>
            <p className={notionClasses.header.subtitle}>
              View and Manage Project Jobs.
            </p>
          </div>

          {!loading && projects.length > 0 && isOwner && (
            <Link
              to="/jobs/new"
              className="h-12 px-4 rounded-lg bg-[#37352F] hover:bg-[#474540] !text-white text-sm font-medium shadow-sm transition-all inline-flex items-center justify-center"
            >
              + New Job
            </Link>
          )}
        </div>

        {/* Info Bar with Pagination Controls */}
        {!loading && projects.length > 0 && (
          <div className="flex items-center justify-between mb-6 px-6 py-4 bg-gray-50 rounded-t-xl border border-[#E0E0E0]">
            <div className="text-sm text-[#787774]">
              Total: <span className="font-semibold text-[#37352F]">{projects.length}</span> Jobs
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm text-[#787774]">Show:</label>
              <select
                value={itemsPerPage}
                onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                className="px-3 py-1 text-sm text-[#37352F] bg-white border border-[#E0E0E0] rounded-lg outline-none focus:border-[#37352F] transition-all"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        )}

        {/* Projects List */}
        <div className={!loading && projects.length > 0 ? "border border-t-0 border-[#E0E0E0] rounded-b-xl shadow-sm overflow-hidden" : ""}>
          <ProjectsList
            projects={paginatedProjects}
            loading={loading}
            error={error}
            emptyMessage="No Jobs yet."
            showFilters={!loading && projects.length > 0}
            showSearch={!loading && projects.length > 0}
            searchInputClassName={notionClasses.input}
          />
        </div>

        {/* Pagination Controls */}
        {!loading && projects.length > 0 && totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 bg-gray-50 rounded-b-xl border border-t-0 border-[#E0E0E0]">
            <div className="text-sm text-[#787774]">
              Page <span className="font-semibold text-[#37352F]">{currentPage}</span> of <span className="font-semibold text-[#37352F]">{totalPages}</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 text-sm font-medium text-[#37352F] bg-white border border-[#E0E0E0] rounded-lg hover:bg-[#F7F6F3] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 text-sm font-medium text-[#37352F] bg-white border border-[#E0E0E0] rounded-lg hover:bg-[#F7F6F3] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Empty State with CTA */}
        {!loading && projects.length === 0 && (
          <div className="text-center py-16 border border-dashed border-[#E0E0E0] rounded-xl bg-white shadow-sm">
            <p className="text-sm text-[#787774] mb-4">No Jobs found.</p>
            {isOwner && (
              <Link
                to="/jobs/new"
                className="inline-flex h-12 px-4 rounded-lg bg-[#37352F] hover:bg-[#474540] text-white text-sm font-medium shadow-sm transition-all"
              >
                + New Job
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}