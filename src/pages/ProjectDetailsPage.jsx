import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { auth, db } from "../firebase";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { notionClasses } from "../lib/notion-theme";
import { NavigationBar } from "../components/NavigationBar";

export default function ProjectDetailsPage() {
  const { projectId } = useParams();

  const [project, setProject] = useState(null);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentEmployee, setCurrentEmployee] = useState(null);
  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  const businessId = localStorage.getItem("ccgBusinessId");

  async function loadNotes() {
    const notesRef = collection(
      db,
      "businesses",
      businessId,
      "Projects",
      projectId,
      "Notes"
    );

    const notesQuery = query(notesRef, orderBy("createdAt", "desc"));
    const notesSnap = await getDocs(notesQuery);

    const notesList = notesSnap.docs.map((noteDoc) => ({
      id: noteDoc.id,
      ...noteDoc.data(),
    }));

    setNotes(notesList);
  }

  useEffect(() => {
    async function loadProjectData() {
      setLoading(true);
      setError("");

      try {
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

        const employeeRef = doc(db, "businesses", businessId, "Employees", currentUid);
        const employeeSnap = await getDoc(employeeRef);

        if (employeeSnap.exists()) {
          setCurrentEmployee(employeeSnap.data());
        }

        const projectRef = doc(db, "businesses", businessId, "Projects", projectId);
        const projectSnap = await getDoc(projectRef);

        if (!projectSnap.exists()) {
          setError("Project not found.");
          setLoading(false);
          return;
        }

        setProject({ id: projectSnap.id, ...projectSnap.data() });

        await loadNotes();
      } catch (err) {
        console.error(err);
        setError(err.message || "Failed to load project.");
      } finally {
        setLoading(false);
      }
    }

    loadProjectData();
  }, [businessId, projectId]);

  async function handleAddNote() {
    const trimmedNote = newNote.trim();
    if (!trimmedNote) return;

    const currentUid = auth.currentUser?.uid;
    if (!currentUid) {
      setError("No authenticated user found.");
      return;
    }

    setAddingNote(true);
    setError("");

    try {
      const notesRef = collection(
        db,
        "businesses",
        businessId,
        "Projects",
        projectId,
        "Notes"
      );

      await addDoc(notesRef, {
        text: trimmedNote,
        createdByUid: currentUid,
        createdByEmployeeName: currentEmployee?.Name || "Unknown",
        createdAt: serverTimestamp(),
      });

      setNewNote("");
      await loadNotes();
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to add note.");
    } finally {
      setAddingNote(false);
    }
  }

  function formatTimestamp(timestamp) {
    if (!timestamp) return "-";
    if (timestamp.toDate) return timestamp.toDate().toLocaleString();
    return String(timestamp);
  }

  const isOwner = currentEmployee?.role === "owner";

  return (
    <div className={notionClasses.pageContainer}>
      <NavigationBar />

      <div className={notionClasses.dashboardContainer}>
        {loading ? (
          <p className="text-sm text-[#787774]">Loading project...</p>
        ) : error ? (
          <p className="text-sm text-[#C53030]">{error}</p>
        ) : !project ? (
          <p className="text-sm text-[#787774]">No project data found.</p>
        ) : (
          <>
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h1 className={notionClasses.header.title}>
                  {project.title || "Untitled Project"}
                </h1>
                <p className={notionClasses.header.subtitle}>
                  {project.customerName || "-"} • {project.carLabel || "-"}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 items-center rounded-lg border border-[#E0E0E0] bg-white px-4 text-sm font-medium text-[#37352F]">
                  {project.status || "N/A"}
                </span>

                {isOwner && (
                  <Link
                    to={`/projects/${projectId}/edit`}
                    className="h-10 px-4 inline-flex items-center rounded-lg bg-[#37352F] !text-white text-sm font-medium hover:bg-[#474540] transition-all"
                  >
                    Edit Project
                  </Link>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Project details */}
              <div className="rounded-xl border border-[#E0E0E0] bg-white shadow-sm p-6">
                <h2 className="text-lg font-semibold text-[#37352F] mb-5">
                  Project Details
                </h2>

                <div className="divide-y divide-[#F0F0F0]">
                  <div className="flex justify-between gap-4 py-4">
                    <span className="font-medium text-[#37352F]">Customer</span>
                    <span className="text-[#787774]">{project.customerName || "-"}</span>
                  </div>

                  <div className="flex justify-between gap-4 py-4">
                    <span className="font-medium text-[#37352F]">Car</span>
                    <span className="text-[#787774]">{project.carLabel || "-"}</span>
                  </div>

                  <div className="flex justify-between gap-4 py-4">
                    <span className="font-medium text-[#37352F]">Priority</span>
                    <span className="text-[#787774]">{project.priority || "-"}</span>
                  </div>

                  <div className="flex justify-between gap-4 py-4">
                    <span className="font-medium text-[#37352F]">Created By</span>
                    <span className="text-[#787774]">
                      {project.createdByEmployeeName || "Unknown"}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4 py-4">
                    <span className="font-medium text-[#37352F]">Last Updated</span>
                    <span className="text-[#787774]">
                      {formatTimestamp(project.updatedAt)}
                    </span>
                  </div>
                </div>

                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-[#37352F] mb-3">
                    Assigned Mechanics
                  </h3>

                  <div className="flex flex-wrap gap-2">
                    {project.assignedMechanicName?.length ? (
                      project.assignedMechanicName.map((name, index) => (
                        <span
                          key={index}
                          className="px-3 py-1.5 rounded-full bg-[#F7F6F3] text-sm text-[#37352F] border border-[#E0E0E0]"
                        >
                          {name}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-[#787774]">No mechanics assigned</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="rounded-xl border border-[#E0E0E0] bg-white shadow-sm p-6">
                <h2 className="text-lg font-semibold text-[#37352F] mb-5">
                  Notes
                </h2>

                <div className="space-y-4">
                  {notes.length ? (
                    notes.map((note) => (
                      <div
                        key={note.id}
                        className="rounded-lg border border-[#E0E0E0] bg-[#FAFAF9] p-4"
                      >
                        <p className="text-sm text-[#37352F] mb-3">
                          {note.text || "No note text"}
                        </p>
                        <div className="flex flex-col gap-1 text-xs text-[#787774]">
                          <span>
                            <strong className="text-[#37352F]">Created By:</strong>{" "}
                            {note.createdByEmployeeName || "Unknown"}
                          </span>
                          <span>
                            <strong className="text-[#37352F]">Created At:</strong>{" "}
                            {formatTimestamp(note.createdAt)}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-[#787774]">
                      No notes available for this project.
                    </p>
                  )}
                </div>

                <div className="mt-6 pt-5 border-t border-[#F0F0F0]">
                  <h3 className="text-sm font-semibold text-[#37352F] mb-3">
                    Add Note
                  </h3>

                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    rows={4}
                    placeholder="Write a project note..."
                    className="w-full px-3 py-2 text-sm text-[#37352F] bg-[#F7F6F3] border border-[#E0E0E0] rounded-lg outline-none focus:border-[#37352F] focus:bg-white transition-all resize-none"
                  />

                  <button
                    onClick={handleAddNote}
                    disabled={addingNote}
                    className="mt-3 h-10 px-4 rounded-lg bg-[#37352F] hover:bg-[#474540] text-white text-sm font-medium shadow-sm transition-all disabled:opacity-50"
                  >
                    {addingNote ? "Adding..." : "Add Note"}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}