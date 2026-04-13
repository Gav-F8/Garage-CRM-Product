import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { auth, db } from "/src/firebase.js";
import {
  getDoc,
  doc,
  getDocs,
  collection,
  query,
} from "firebase/firestore";
import { NavigationBar } from "/src/components/NavigationBar.jsx";
import { notionClasses } from "/src/lib/notion-theme";

async function fetchStorageDetail(businessId, storageId) {
  try {
    const storageRef = doc(db, "businesses", businessId, "storage", storageId);
    const snap = await getDoc(storageRef);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() };
    }
    return null;
  } catch (error) {
    console.error("Error fetching storage detail:", error);
    return null;
  }
}

async function fetchCustomerName(businessId, customerId) {
  try {
    const customerRef = doc(db, "businesses", businessId, "Customers", customerId);
    const snap = await getDoc(customerRef);
    if (snap.exists()) {
      return snap.data().name || null;
    }
    return null;
  } catch (error) {
    console.error("Error fetching customer name:", error);
    return null;
  }
}

async function fetchRelatedProjects(businessId, storageId) {
  try {
    const projectsRef = collection(db, "businesses", businessId, "Projects");
    const q = query(projectsRef);
    const snap = await getDocs(q);

    const relatedProjects = [];
    for (const doc of snap.docs) {
      const projectData = doc.data();
      // Check if project is related to this storage using carId field
      if (projectData.carId === storageId) {
        relatedProjects.push({ id: doc.id, ...projectData });
      }
    }
    return relatedProjects;
  } catch (error) {
    console.error("Error fetching related projects:", error);
    return [];
  }
}

async function fetchTotalTimeLogs(businessId, storageId) {
  try {
    const projectsRef = collection(db, "businesses", businessId, "Projects");
    const q = query(projectsRef);
    const snap = await getDocs(q);

    let totalMinutes = 0;
    for (const projectDoc of snap.docs) {
      const projectData = projectDoc.data();
      // Check if project is related to this storage using carId field
      if (projectData.carId === storageId) {
        // Fetch TimeLogs for this project
        const timeLogsRef = collection(db, "businesses", businessId, "Projects", projectDoc.id, "TimeLogs");
        const timeLogsSnap = await getDocs(timeLogsRef);
        
        for (const timeLogDoc of timeLogsSnap.docs) {
          const timeLogData = timeLogDoc.data();
          if (timeLogData.minutes) {
            totalMinutes += timeLogData.minutes;
          }
        }
      }
    }
    
    // Convert minutes to hours and minutes
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return { totalMinutes, hours, minutes };
  } catch (error) {
    console.error("Error fetching time logs:", error);
    return { totalMinutes: 0, hours: 0, minutes: 0 };
  }
}

export default function StorageDetailPage() {
  const { storageId } = useParams();
  const navigate = useNavigate();
  const [storage, setStorage] = useState(null);
  const [customerName, setCustomerName] = useState(null);
  const [relatedProjects, setRelatedProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeLogs, setTimeLogs] = useState({ totalMinutes: 0, hours: 0, minutes: 0 });

  // Allow access to storage details for mechanics and other roles.

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

        // Fetch storage detail
        const storageData = await fetchStorageDetail(bizId, storageId);
        setStorage(storageData);

        if (storageData) {
          // Fetch customer name
          if (storageData.customerId) {
            const name = await fetchCustomerName(bizId, storageData.customerId);
            setCustomerName(name);
          }

          // Fetch related projects
          const projects = await fetchRelatedProjects(bizId, storageId);
          setRelatedProjects(projects);
          
          // Fetch total time logs
          const logs = await fetchTotalTimeLogs(bizId, storageId);
          setTimeLogs(logs);
        }
      } catch (error) {
        console.error("Error loading storage detail:", error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [storageId]);

  if (loading) {
    return (
      <div className={notionClasses.pageContainer}>
        <NavigationBar />
        <div className={notionClasses.dashboardContainer}>
          <p className="text-sm text-[#787774]">Loading storage details...</p>
        </div>
      </div>
    );
  }

  if (!storage) {
    return (
      <div className={notionClasses.pageContainer}>
        <NavigationBar />
        <div className={notionClasses.dashboardContainer}>
          <p className="text-sm text-[#C53030]">Storage not found</p>
          <button
            onClick={() => navigate("/Storage")}
            className="mt-4 h-10 px-4 rounded-lg bg-[#37352F] hover:bg-[#474540] text-white text-sm font-medium"
          >
            Back to Storage
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={notionClasses.pageContainer}>
      <NavigationBar />
      <div className={notionClasses.dashboardContainer}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className={notionClasses.header.title}>
              {storage.carLabel || `${storage.year} ${storage.make} ${storage.model}`}
            </h1>
            <p className={notionClasses.header.subtitle}>
              {storage.plate}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/storage/${storageId}/edit`)}
              className="flex-shrink-0 whitespace-nowrap h-10 px-6 rounded-lg border border-[#E0E0E0] bg-white text-[#37352F] text-sm font-medium hover:bg-[#F7F6F3] hover:border-[#37352F] hover:shadow-md transition-all duration-200 active:bg-[#E0E0E0]"
            >
              Edit
            </button>

            <button
              onClick={() => navigate("/Storage")}
              className="flex-shrink-0 whitespace-nowrap h-10 px-6 rounded-lg border border-[#E0E0E0] bg-white text-[#37352F] text-sm font-medium hover:bg-[#F7F6F3] hover:border-[#37352F] hover:shadow-md transition-all duration-200 active:bg-[#E0E0E0]"
            >
              ← Back to Storage
            </button>
          </div>
        </div>

        {/* Storage Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 animate-fadeIn">
          <div className="rounded-xl border border-[#E0E0E0] bg-white shadow-sm p-6 hover:shadow-md transition-shadow duration-200">
            <h2 className="text-lg font-semibold text-[#37352F] mb-4">Vehicle Information</h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-[#787774] uppercase">Make</label>
                <p className="text-sm text-[#37352F]">{storage.make}</p>
              </div>
              
              <div>
                <label className="text-xs font-medium text-[#787774] uppercase">Model</label>
                <p className="text-sm text-[#37352F]">{storage.model}</p>
              </div>

              <div>
                <label className="text-xs font-medium text-[#787774] uppercase">Year</label>
                <p className="text-sm text-[#37352F]">{storage.year}</p>
              </div>

              <div>
                <label className="text-xs font-medium text-[#787774] uppercase">Type</label>
                <p className="text-sm text-[#37352F]">{storage.type}</p>
              </div>

              <div>
                <label className="text-xs font-medium text-[#787774] uppercase">Plate</label>
                <p className="text-sm text-[#37352F]">{storage.plate}</p>
              </div>

              <div>
                <label className="text-xs font-medium text-[#787774] uppercase">Color</label>
                <p className="text-sm text-[#37352F]">{storage.color || "-"}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[#E0E0E0] bg-white shadow-sm p-6 hover:shadow-md transition-shadow duration-200">
            <h2 className="text-lg font-semibold text-[#37352F] mb-4">Additional Information</h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-[#787774] uppercase">Mileage (km)</label>
                <p className="text-sm text-[#37352F]">{storage.mileage || "-"}</p>
              </div>

              <div>
                <label className="text-xs font-medium text-[#787774] uppercase">VIN</label>
                <p className="text-sm text-[#37352F] break-all">{storage.vin || "-"}</p>
              </div>

              <div>
                <label className="text-xs font-medium text-[#787774] uppercase">Customer</label>
                <p className="text-sm text-[#37352F]">{customerName || "-"}</p>
              </div>

              <div>
                <label className="text-xs font-medium text-[#787774] uppercase">Created By</label>
                <p className="text-sm text-[#37352F]">{storage.createdByEmployeeAcc || "-"}</p>
              </div>

              <div>
                <label className="text-xs font-medium text-[#787774] uppercase">Notes</label>
                <p className="text-sm text-[#37352F]">{storage.notes || "-"}</p>
              </div>

              <div>
                <label className="text-xs font-medium text-[#787774] uppercase">Total Project Hours</label>
                <p className="text-sm text-[#37352F] font-medium">{timeLogs.hours}h {timeLogs.minutes}m</p>
              </div>

              <div>
                <label className="text-xs font-medium text-[#787774] uppercase">Active Jobs</label>
                <p className="text-sm text-[#37352F] font-medium">
                  {relatedProjects.filter(p => p.status === "active").length} active
                </p>
              </div>

              <div>
                <label className="text-xs font-medium text-[#787774] uppercase">Total Projects</label>
                <p className="text-sm text-[#37352F] font-medium">{relatedProjects.length} projects</p>
              </div>
            </div>
          </div>
        </div>

        {/* Related Projects */}
        <div className="rounded-xl border border-[#E0E0E0] bg-white shadow-sm p-6 hover:shadow-md transition-shadow duration-200">
          <h2 className="text-lg font-semibold text-[#37352F] mb-4">Related Projects</h2>

          {relatedProjects.length === 0 ? (
            <p className="text-sm text-[#787774]">No projects related to this vehicle.</p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-[#E0E0E0]">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-[#F7F6F3]">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#787774] uppercase">Project Title</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#787774] uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#787774] uppercase">Created Date</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-[#787774] uppercase">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {relatedProjects.map((project) => (
                    <tr key={project.id} className="border-t border-[#E0E0E0] hover:bg-blue-50 hover:border-l-4 hover:border-l-blue-400 transition-all duration-150 cursor-pointer">
                      <td className="px-4 py-3 text-sm text-[#37352F] font-medium">{project.title || "-"}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                          project.status === "pending"
                            ? "bg-yellow-100 text-yellow-700"
                            : project.status === "active"
                            ? "bg-blue-100 text-blue-700"
                            : project.status === "completed"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-700"
                        }`}>
                          {project.status || "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-[#37352F]">
                        {project.createdAt
                          ? new Date(project.createdAt.toDate()).toLocaleDateString()
                          : "-"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => navigate(`/projects/${project.id}`)}
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium hover:underline transition-all duration-150 active:text-blue-800"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
