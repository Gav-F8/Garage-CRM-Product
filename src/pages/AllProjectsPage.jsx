import { useMemo } from "react";
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

  return (
    <div className={notionClasses.pageContainer}>
         <NavigationBar />
      <div className={notionClasses.dashboardContainer}>
       <div className="flex items-center justify-between mb-6">
            <div>
                <h1 className={notionClasses.header.title}>Projects</h1>
                <p className={notionClasses.header.subtitle}>
            View and manage project jobs.
                </p>
            </div>

            {isOwner && (
               <Link
                to="/jobs/new"
                className="h-12 px-4 rounded-lg bg-[#37352F] hover:bg-[#474540] !text-white text-sm font-medium shadow-sm transition-all inline-flex items-center justify-center"
                >
                + New Project
                </Link>
            )}
            </div>

        <ProjectsList
          projects={projects}
          loading={loading}
          error={error}
          searchInputClassName={notionClasses.input}
        />
      </div>
    </div>
  );
}