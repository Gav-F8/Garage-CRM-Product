import { NavigationBar } from "../components/NavigationBar";
import { Link } from "react-router-dom";
import ProjectsList from "../components/projects/ProjectsList";
import { useProjectsForCurrentUser } from "../hooks/useProjectsForCurrentUser";

export default function HomePage() {
  const {
    projects,
    loading: loadingProjects,
    error: projectsError,
  } = useProjectsForCurrentUser();

  return (
    <div className="min-h-screen bg-[#F7F7F5]">
      <NavigationBar />

      <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-[#37352F]">
            <span className="block">Welcome to</span>
            <span className="block">Garage CRM</span>
          </h1>
          <p className="mt-3 max-w-md mx-auto text-base text-[#787774] sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
            Manage your garage operations, track jobs, and communicate with customers all in one place.
          </p>
        </div>

        <div className="my-10">
          <div className="mb-4 text-left">
            <h2 className="text-xl font-semibold text-[#37352F]">Projects</h2>
          </div>
          <ProjectsList
            projects={projects}
            loading={loadingProjects}
            error={projectsError}
          />
        </div>

        <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            to="/customer"
            className="bg-white border border-[#E0E0E0] overflow-hidden shadow-sm rounded-xl hover:shadow-md transition-shadow"
          >
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-base leading-6 font-semibold text-[#37352F]">New Customer Entry</h3>
              <div className="mt-2 max-w-xl text-sm text-[#787774]">
                <p>Create a new customer entry with your business.</p>
              </div>
            </div>
          </Link>

          <Link
            to="/storage"
            className="bg-white border border-[#E0E0E0] overflow-hidden shadow-sm rounded-xl hover:shadow-md transition-shadow"
          >
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-base leading-6 font-semibold text-[#37352F]">New Storage Entry</h3>
              <div className="mt-2 max-w-xl text-sm text-[#787774]">
                <p>Register new automobiles in your inventory with detailed information.</p>
              </div>
            </div>
          </Link>

          <Link
            to="/jobs/new"
            className="bg-white border border-[#E0E0E0] overflow-hidden shadow-sm rounded-xl hover:shadow-md transition-shadow"
          >
          <div className="bg-white border border-[#E0E0E0] overflow-hidden shadow-sm rounded-xl hover:shadow-md transition-shadow">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-base leading-6 font-semibold text-[#37352F]">New Job Entry</h3>
              <div className="mt-2 max-w-xl text-sm text-[#787774]">
                <p>Create and manage new jobs with detailed information and status updates.</p>
              </div>
            </div>
          </div>
          </Link>
        </div>
      </main>
    </div>
  );
}