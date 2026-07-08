import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { db } from "../firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { fetchCustomers, fetchVehicles, fetchProjects } from "../lib/firestore-helpers";
import { STATUS_OPTIONS } from "../lib/utils";
import { useProjectsForCurrentUser } from "../hooks/useProjectsForCurrentUser";
import { useAuth } from "../context/AuthContext";
import { NavigationBar } from "../components/NavigationBar";
import { CreateProjectFlow } from "../components/CreateProjectModal";
import ProjectsList from "../components/ProjectsList";

export default function HomePage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { businessId, user, loading: authLoading } = useAuth();

  const {
    projects,
    loading: loadingProjects,
    error: projectsError,
    hasMore,
    loadingMore,
    loadMore,
  } = useProjectsForCurrentUser({ businessId, enabled: Boolean(businessId) });

  const [stats, setStats] = useState({
    totalCustomers: 0,
    projectsInProgress: 0,
    totalVehicles: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    const fetchStats = async () => {
      try {
        if (!user || !businessId) {
          setStatsLoading(false);
          return;
        }

        // Fetch customers count
        const customersSnap = await fetchCustomers(businessId);

        // Fetch vehicles count
        const vehiclesSnap = await fetchVehicles(businessId);

        // Fetch projects count
        const projectsSnap = await fetchProjects(businessId);
        const completeAliases = STATUS_OPTIONS.find(s => s.key === "complete")?.aliases ?? [];

        // get number of projects that are not complete.
        const projectsInProgress = projectsSnap.filter(
          (project) => !completeAliases.includes(project.status ?? "")
        ).length;

        setStats({
          totalCustomers: customersSnap.length,
          projectsInProgress,
          totalVehicles: vehiclesSnap.length,
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setStatsLoading(false);
      }
    };

    fetchStats();
  }, [authLoading, user, businessId]);

  return (
    <div className="min-h-screen bg-[#F7F7F5]">
      <NavigationBar />

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-[#37352F]">Dashboard</h1>
          <p className="mt-2 text-[#787774]">Welcome back! Here's what's happening with your garage.</p>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-1 space-y-6">
            {/* Quick Start - Create Job Button */}
            <div>
              <h2 className="text-lg font-semibold text-[#37352F] mb-4">Quick Start</h2>
              <button
                onClick={() => setShowCreateModal(true)}
                className="block w-full bg-[#37352F] text-white px-6 py-4 rounded-lg font-medium hover:bg-[#474540] transition-colors shadow-sm text-center"
              >
                <div className="flex items-center justify-center gap-3">
                  <svg className="w-5 h-5 stroke-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create New Job
                </div>
              </button>
              <CreateProjectFlow
                submitting={false}
                renderButton={false}
                showModal={showCreateModal}
                setShowModal={setShowCreateModal}
                onCreate={async (payload) => {
                  try {
                    if (!businessId) return null;
                    const docRef = await addDoc(collection(db, "businesses", businessId, "Projects"), {
                      ...payload,
                      createdAt: serverTimestamp(),
                      updatedAt: serverTimestamp(),
                    });
                    return docRef.id;
                  } catch (error) {
                    console.error(error);
                    return null;
                  }
                }}
              />
            </div>

            {/* Key Metrics */}
            <div>
              <h2 className="text-lg font-semibold text-[#37352F] mb-4">Overview</h2>
              <div className="space-y-4">
                <Link
                  to="/jobs"
                  className="block bg-white rounded-xl border border-[#E0E0E0] shadow-sm p-6 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-[#787774] uppercase">Projects in Progress</p>
                      <p className="mt-2 text-2xl font-bold text-[#37352F]">
                        {statsLoading ? "..." : stats.projectsInProgress}
                      </p>
                    </div>
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-green-100 group-hover:bg-green-200">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                </Link>

                <Link
                  to="/customers"
                  className="block bg-white rounded-xl border border-[#E0E0E0] shadow-sm p-6 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-[#787774] uppercase">Total Customers</p>
                      <p className="mt-2 text-2xl font-bold text-[#37352F]">
                        {statsLoading ? "..." : stats.totalCustomers}
                      </p>
                    </div>
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-2a6 6 0 0112 0v2zm0 0h6v-2a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                  </div>
                </Link>

                <Link
                  to="/vehicles"
                  className="block bg-white rounded-xl border border-[#E0E0E0] shadow-sm p-6 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-[#787774] uppercase">Total Vehicles</p>
                      <p className="mt-2 text-2xl font-bold text-[#37352F]">
                        {statsLoading ? "..." : stats.totalVehicles}
                      </p>
                    </div>
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-orange-100">
                      <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          </div>

          {/* Right Column - Recent Projects */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg px-3 font-semibold text-[#37352F]">Relevent Jobs</h2>
              <Link to="/jobs" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                View All →
              </Link>
            </div>
            <ProjectsList
              projects={projects}
              loading={loadingProjects}
              error={projectsError}
              hasMore={hasMore}
              loadingMore={loadingMore}
              onLoadMore={loadMore}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
