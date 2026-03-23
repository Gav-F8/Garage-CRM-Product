import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { Link } from "react-router-dom";
import { auth, db } from "/src/firebase.js";
import { notionClasses } from "/src/lib/notion-theme";

export default function AllProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  const businessId = localStorage.getItem("ccgBusinessId");

  useEffect(() => {
    async function loadProjects() {
      if (!businessId) {
        setError("No business context found. Please sign in again.");
        setLoading(false);
        return;
      }

      const currentUid = auth.currentUser?.uid;
      if (!currentUid) {
        setError("No authenticated user found.");
        setLoading(false);
        return;
      }

      try {
        const employeeRef = doc(db, "businesses", businessId, "Employees", currentUid);
        const employeeSnap = await getDoc(employeeRef);

        if (!employeeSnap.exists()) {
          setError("Employee record not found.");
          setLoading(false);
          return;
        }

        const employeeData = employeeSnap.data();
        const role = employeeData.role;

        let projectQuery;

        if (role === "owner") {
          projectQuery = query(
            collection(db, "businesses", businessId, "Projects"),
            orderBy("updatedAt", "desc")
          );
        } else if (role === "mechanic") {
          projectQuery = query(
            collection(db, "businesses", businessId, "Projects"),
            where("assignedMechanicId", "array-contains", currentUid),
            orderBy("updatedAt", "desc")
          );
        } else {
          setProjects([]);
          setLoading(false);
          return;
        }

        const snap = await getDocs(projectQuery);

        const projectList = snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setProjects(projectList);
      } catch (err) {
        console.error("Failed to load projects:", err);
        setError(err.message);
        } finally {
        setLoading(false);
        }
    }

    loadProjects();
  }, [businessId]);

  const filteredProjects = useMemo(() => {
    let result = [...projects];

    if (filter !== "all") {
      result = result.filter(
        (p) => (p.status || "").toLowerCase() === filter
      );
    }

    if (search.trim()) {
      const term = search.toLowerCase();
      result = result.filter(
        (p) =>
          (p.title && p.title.toLowerCase().includes(term)) ||
          (p.customerName && p.customerName.toLowerCase().includes(term)) ||
          (p.carLabel && p.carLabel.toLowerCase().includes(term))
      );
    }

    return result;
  }, [projects, filter, search]);

  function formatTimestamp(timestamp) {
    if (!timestamp) return "-";
    if (timestamp.toDate) return timestamp.toDate().toLocaleDateString();
    return String(timestamp);
  }

  return (
    <div className={notionClasses.pageContainer}>
      <div className={notionClasses.dashboardContainer}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className={notionClasses.header.title}>Projects</h1>
            <p className={notionClasses.header.subtitle}>
              {loading
                ? "Loading..."
                : `Showing ${filteredProjects.length} of ${projects.length} projects`}
            </p>
          </div>
        </div>

        {!loading && projects.length > 0 && (
          <div className="flex flex-wrap gap-3 mb-4">
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

        {!loading && projects.length > 0 && (
          <div className="mb-6">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects..."
              className={notionClasses.input}
            />
          </div>
        )}

        {loading ? (
          <p className="text-sm text-[#787774]">Loading projects...</p>
        ) : error ? (
          <p className="text-sm text-[#C53030]">{error}</p>
        ) : projects.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-[#E0E0E0] rounded-xl bg-white shadow-sm">
            <p className="text-sm text-[#787774] mb-4">No projects found.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-[#E0E0E0] bg-white shadow-sm">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className={notionClasses.table.header}>Title</th>
                  <th className={notionClasses.table.header}>Customer</th>
                  <th className={notionClasses.table.header}>Car</th>
                  <th className={notionClasses.table.header}>Status</th>
                  <th className={notionClasses.table.header}>Priority</th>
                  <th className={notionClasses.table.header}>Updated</th>
                </tr>
              </thead>
              <tbody>
                {filteredProjects.map((project) => (
                  <tr key={project.id} className={notionClasses.table.row}>
                    <td className={notionClasses.table.cell}>
                      <Link
                        to={`/projects/${project.id}`}
                        className="text-[#2F6FED] hover:underline font-medium"
                      >
                        {project.title || "Untitled Project"}
                      </Link>
                    </td>
                    <td className={notionClasses.table.cell}>
                      {project.customerName || "-"}
                    </td>
                    <td className={notionClasses.table.cell}>
                      {project.carLabel || "-"}
                    </td>
                    <td className={notionClasses.table.cell}>
                      {project.status || "-"}
                    </td>
                    <td className={notionClasses.table.cell}>
                      {project.priority || "-"}
                    </td>
                    <td className={notionClasses.table.cell}>
                      {formatTimestamp(project.updatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}