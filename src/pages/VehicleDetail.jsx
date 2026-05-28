import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { auth } from "/src/firebase.js";
import {
  extractName,
  fetchCustomerDetail,
  fetchTotalTimeLogsVehicle,
  fetchVehicleDetail,
  fetchRelatedProjectsByVehicle
} from "/src/lib/firestore-helpers.js";
import { NavigationBar } from "/src/components/NavigationBar";
import { notionClasses } from "/src/lib/notion-theme";
import { statusStyle } from "/src/lib/utils.js";

export default function VehicleDetailPage() {
  // Route and page-level state.
  const { vehicleId } = useParams();
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState(null);
  const [customerName, setCustomerName] = useState(null);
  const [relatedProjects, setRelatedProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeLogs, setTimeLogs] = useState({
    totalMinutes: 0,
    hours: 0,
    minutes: 0,
  });

  // Allow access to vehicle details for mechanics and other roles.

  // Loads vehicle, linked customer, related projects, and total hours.
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const bizId = localStorage.getItem("ccgBusinessId");
        if (!bizId) {
          setLoading(false);
          return;
        }

        // Fetch vehicle detail
        const vehicleData = await fetchVehicleDetail(bizId, vehicleId);
        setVehicle(vehicleData);

        if (vehicleData) {
          // Fetch customer name
          if (vehicleData.customerId) {
            const name = extractName(await fetchCustomerDetail(bizId, vehicleData.customerId));
            setCustomerName(name);
          }

          // Fetch related projects
          const projects = await fetchRelatedProjectsByVehicle(bizId, vehicleId);
          setRelatedProjects(projects);

          // Fetch total time logs
          const logs = await fetchTotalTimeLogsVehicle(bizId, vehicleId);
          setTimeLogs(logs);
        }
      } catch (error) {
        console.error("Error loading vehicle detail:", error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [vehicleId]);

  // Loading and empty states.
  if (loading) {
    return (
      <div className={notionClasses.pageContainer}>
        <NavigationBar />
        <div className={notionClasses.dashboardContainer}>
          <p className="text-sm text-[#787774]">Loading vehicle details...</p>
        </div>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className={notionClasses.pageContainer}>
        <NavigationBar />
        <div className={notionClasses.dashboardContainer}>
          <p className="text-sm text-[#C53030]">Vehicle not found</p>
          <button
            onClick={() => navigate("/vehicles")}
            className="mt-4 h-10 px-4 rounded-lg bg-[#37352F] hover:bg-[#474540] text-white text-sm font-medium"
          >
            Back to Vehicles
          </button>
        </div>
      </div>
    );
  }

  // Main details layout.
  return (
    <div className={notionClasses.pageContainer}>
      <NavigationBar />
      <div className={notionClasses.dashboardContainer}>
        <div className="flex items-center justify-between mb-6 gap-4">
          <div>
            <h1 className={notionClasses.header.title}>
              {vehicle.vehicleLabel ||
                `${vehicle.year} ${vehicle.make} ${vehicle.model}`}
            </h1>
            <p className={notionClasses.header.subtitle}>{vehicle.plate}</p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => navigate("/vehicles")}
              className="h-10 px-4 rounded-lg border border-[#E0E0E0] text-[#37352F] bg-white text-sm font-medium hover:bg-[#F7F6F3] hover:border-[#37352F] hover:shadow-md transition-all duration-200 active:bg-[#E0E0E0]"
            >
              ← Back to Vehicles
            </button>

            <button
              onClick={() => navigate(`/vehicles/${vehicleId}/edit`)}
              className="h-10 px-4 inline-flex items-center rounded-lg text-white text-sm font-medium hover:bg-[#F7F7F5] hover:text-[#37352F] transition-colors"
            >
              Edit
            </button>
          </div>
        </div>

        {/* Vehicle Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 animate-fadeIn">
          <div className="rounded-xl border border-[#E0E0E0] bg-white shadow-sm p-6 hover:shadow-md transition-shadow duration-200">
            <h2 className="text-lg font-semibold text-[#37352F] mb-4">
              Vehicle Information
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-[#787774] uppercase">
                  Make
                </label>
                <p className="text-sm text-[#37352F]">{vehicle.make}</p>
              </div>

              <div>
                <label className="text-xs font-medium text-[#787774] uppercase">
                  Model
                </label>
                <p className="text-sm text-[#37352F]">{vehicle.model}</p>
              </div>

              <div>
                <label className="text-xs font-medium text-[#787774] uppercase">
                  Year
                </label>
                <p className="text-sm text-[#37352F]">{vehicle.year}</p>
              </div>

              <div>
                <label className="text-xs font-medium text-[#787774] uppercase">
                  Type
                </label>
                <p className="text-sm text-[#37352F]">{vehicle.type}</p>
              </div>

              <div>
                <label className="text-xs font-medium text-[#787774] uppercase">
                  Plate
                </label>
                <p className="text-sm text-[#37352F]">{vehicle.plate}</p>
              </div>

              <div>
                <label className="text-xs font-medium text-[#787774] uppercase">
                  Color
                </label>
                <p className="text-sm text-[#37352F]">{vehicle.color || "-"}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[#E0E0E0] bg-white shadow-sm p-6 hover:shadow-md transition-shadow duration-200">
            <h2 className="text-lg font-semibold text-[#37352F] mb-4">
              Additional Information
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-[#787774] uppercase">
                  Mileage (km)
                </label>
                <p className="text-sm text-[#37352F]">
                  {vehicle.mileage || "-"}
                </p>
              </div>

              <div>
                <label className="text-xs font-medium text-[#787774] uppercase">
                  VIN
                </label>
                <p className="text-sm text-[#37352F] break-all">
                  {vehicle.vin || "-"}
                </p>
              </div>

              <div>
                <label className="text-xs font-medium text-[#787774] uppercase">
                  Customer
                </label>
                <p className="text-sm text-[#37352F]">{customerName || "-"}</p>
              </div>

              <div>
                <label className="text-xs font-medium text-[#787774] uppercase">
                  Created By
                </label>
                <p className="text-sm text-[#37352F]">
                  {vehicle.createdByEmployeeAcc || "-"}
                </p>
              </div>

              <div>
                <label className="text-xs font-medium text-[#787774] uppercase">
                  Notes
                </label>
                <p className="text-sm text-[#37352F]">{vehicle.notes || "-"}</p>
              </div>

              <div>
                <label className="text-xs font-medium text-[#787774] uppercase">
                  Total Project Hours
                </label>
                <p className="text-sm text-[#37352F] font-medium">
                  {timeLogs.hours}h {timeLogs.minutes}m
                </p>
              </div>

              <div>
                <label className="text-xs font-medium text-[#787774] uppercase">
                  Active Jobs
                </label>
                <p className="text-sm text-[#37352F] font-medium">
                  {relatedProjects.filter((p) => p.isActive === true).length}{" "}
                  active
                </p>
              </div>

              <div>
                <label className="text-xs font-medium text-[#787774] uppercase">
                  Total Projects
                </label>
                <p className="text-sm text-[#37352F] font-medium">
                  {relatedProjects.length} projects
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Related Projects */}
        <div className="rounded-xl border border-[#E0E0E0] bg-white shadow-sm p-6 hover:shadow-md transition-shadow duration-200">
          <h2 className="text-lg font-semibold text-[#37352F] mb-4">
            Related Projects
          </h2>

          {relatedProjects.length === 0 ? (
            <p className="text-sm text-[#787774]">
              No projects related to this vehicle.
            </p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-[#E0E0E0]">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-[#F7F6F3]">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#787774] uppercase">
                      Project Title
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#787774] uppercase">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#787774] uppercase">
                      Created Date
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-[#787774] uppercase">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {relatedProjects.map((project) => {
                    const { label, style } = statusStyle(project.status);
                    return (
                    <tr
                      key={project.id}
                      className="border-t border-[#E0E0E0] hover:bg-blue-50 hover:border-l-4 hover:border-l-blue-400 transition-all duration-150 cursor-pointer"
                    >
                      <td className="px-4 py-3 text-sm text-[#37352F] font-medium">
                        {project.title || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${style}`}
                        >
                          {label || "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-[#37352F]">
                        {project.createdAt
                          ? new Date(
                              project.createdAt.toDate(),
                            ).toLocaleDateString()
                          : "-"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => navigate(`/projects/${project.id}`)}
                          className="h-10 px-4 inline-flex items-center rounded-lg text-white text-sm font-medium hover:bg-[#F7F7F5] hover:text-[#37352F] transition-colors"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
