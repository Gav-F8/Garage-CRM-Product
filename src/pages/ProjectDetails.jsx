import { useEffect, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import {
  formatTimestamp,
  formatWorkDate,
  formatTotalMinutes,
  formatTimer,
  updateProjectTimelogValue,
} from "../lib/firestore-helpers.js";
import { useTimerPersistence } from "/src/hooks/useTimerPersistance.js";
import { statusStyle } from "/src/lib/utils.js";
import { NavigationBar } from "/src/components/NavigationBar";
import { notionClasses } from "/src/lib/notion-theme";

// Genuinly dont know if or how any of this works, lowkey wil figure it out eventually tho
// schizo code
// dissocioiative code
// worst code ive ever not written

export default function ProjectDetailsPage() {
  // Route navigation and identifier.
  const navigate = useNavigate();
  const { projectId } = useParams();
  
  // Project-level data and UI state.
  const [project, setProject] = useState(null);
  const [carDetails, setCarDetails] = useState(null);
  const [notes, setNotes] = useState([]);
  const [timeLogs, setTimeLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentEmployee, setCurrentEmployee] = useState(null);
  const statusMeta = statusStyle(project?.status);
  
  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [timerNote, setTimerNote] = useState("");
  const [savingStopwatchLog, setSavingStopwatchLog] = useState(false);
  
  const [newMinutes, setNewMinutes] = useState("");
  const [newLogNote, setNewLogNote] = useState("");
  const [newWorkDate, setNewWorkDate] = useState("");
  const [savingTimeLog, setSavingTimeLog] = useState(false);
  
  const [editingLogId, setEditingLogId] = useState(null);
  const [editMinutes, setEditMinutes] = useState("");
  const [editLogNote, setEditLogNote] = useState("");
  const [editWorkDate, setEditWorkDate] = useState("");
  
  const notesUnsubscribeRef = useRef(null);
  const timeLogsUnsubscribeRef = useRef(null);
  const businessId = localStorage.getItem("ccgBusinessId");

  const { 
    timerSeconds,
    isActive,
    isLoading: timerLoading,
    error: timerError,
    startTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
    submitTimer,
  } = useTimerPersistence(projectId, businessId);
  console.log("📱 ProjectDetails received from hook:", { timerSeconds, isActive });

  // Sets up real-time listener for Notes, sorted by newest first
  function setupNotesListener() {
    if (!businessId || !projectId) return;

    const notesRef = collection(
      db,
      "businesses",
      businessId,
      "Projects",
      projectId,
      "Notes"
    );

    const notesQuery = query(notesRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      notesQuery,
      (snapshot) => {
        const notesList = snapshot.docs.map((noteDoc) => ({
          id: noteDoc.id,
          ...noteDoc.data(),
        }));
        setNotes(notesList);
      }
    );
    return unsubscribe;
  }

  // Sets up real-time lisener for TimeLogs, sorted by newest first
  function setupTimeLogsListener() {
    if (!businessId || !projectId) return;

    const logsRef = collection(
      db,
      "businesses",
      businessId,
      "Projects",
      projectId,
      "TimeLogs"
    );

    const logsQuery = query(logsRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      logsQuery,
      (snapshot) => {
        const logsList = snapshot.docs.map((logDoc) => ({
          id: logDoc.id,
          ...logDoc.data(),
        }));
        setTimeLogs(logsList);
      },
      (error) => {
        console.error("Error listening to time logs:", error);
        setError(error.message);
      }
    );

    return unsubscribe;
  }

  // Loads Notes subcollection sorted by newest first.
  async function loadNotes() {
    const notesRef = collection(
      db,
      "businesses",
      businessId,
      "Projects",
      projectId,
      "Notes",
    );

    const notesQuery = query(notesRef, orderBy("createdAt", "desc"));
    const notesSnap = await getDocs(notesQuery);

    const notesList = notesSnap.docs.map((noteDoc) => ({
      id: noteDoc.id,
      ...noteDoc.data(),
    }));

    setNotes(notesList);
  }

  // Loads TimeLogs subcollection sorted by newest first.
  async function loadTimeLogs() {
    const logsRef = collection(
      db,
      "businesses",
      businessId,
      "Projects",
      projectId,
      "TimeLogs",
    );
    
    const logsQuery = query(logsRef, orderBy("createdAt", "desc"));
    const logsSnap = await getDocs(logsQuery);
    
    const logsList = logsSnap.docs.map((logDoc) => ({
      id: logDoc.id,
      ...logDoc.data(),
    }));
    
    setTimeLogs(logsList);
  }

  // Finalzes set up for real-time listeners for notes and time logs
  useEffect(() => {
    if (!businessId || !projectId) return;
  
    const notesUnsubscribe = setupNotesListener();
    if (notesUnsubscribe) {
      notesUnsubscribeRef.current = notesUnsubscribe;
    }
  
    const timeLogsUnsubscribe = setupTimeLogsListener();
    if (timeLogsUnsubscribe) {
      timeLogsUnsubscribeRef.current = timeLogsUnsubscribe;
    }
  
    // Cleanup listeners on unmount or when depenencies change
    return () => {
      if (notesUnsubscribeRef.current) {
        notesUnsubscribeRef.current();
      }
      if (timeLogsUnsubscribeRef.current) {
        timeLogsUnsubscribeRef.current();
      }
    };
  }, [businessId, projectId]);
  
  // Initial project load with related data.
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

        const employeeRef = doc(
          db,
          "businesses",
          businessId,
          "Employees",
          currentUid,
        );
        
        const employeeSnap = await getDoc(employeeRef);

        if (!employeeSnap.exists()) {
          setError("Employee record not found.");
          setLoading(false);
          return;
        }

        setCurrentEmployee(employeeSnap.data());

        const projectRef = doc(
          db,
          "businesses",
          businessId,
          "Projects",
          projectId,
        );
        const projectSnap = await getDoc(projectRef);

        if (!projectSnap.exists()) {
          setError("Project not found.");
          setLoading(false);
          return;
        }

        const projectData = { id: projectSnap.id, ...projectSnap.data() };
        setProject(projectData);
        if (projectData.carId) {
          const carRef = doc(
            db,
            "businesses",
            businessId,
            "storage",
            projectData.carId,
          );

          const carSnap = await getDoc(carRef);

          if (carSnap.exists()) {
            setCarDetails({ id: carSnap.id, ...carSnap.data() });
          } else {
            setCarDetails(null);
          }
        } else {
          setCarDetails(null);
        }

        await loadNotes();
        await loadTimeLogs();
      } catch (err) {
        console.error(err);
        setError(err.message || "Failed to load project.");
      } finally {
        setLoading(false);
      }
    }

    loadProjectData();
  }, [businessId, projectId]);

  // If timer running set active state to true else false.
  // Mirrors timer state into local isActive state.

  // Adds a project note authored by the current employee.
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
      const success = await createProjectNotes(businessId, projectId, {
        text: trimmedNote,
        createdByUid: currentUid,
        createdByEmployeeName: currentEmployee?.Name || "Unknown",
        createdAt: serverTimestamp(),
      });

      if (success) {
        setNewNote("");
      }

      else {
        setError(err.message || "Failed to add note.");
      }
    } 
    finally {
      setAddingNote(false);
    }
  }

  // Creates a manual time log entry.
  async function handleAddTimeLog() {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid) {
      setError("No authenticated user found.");
      return;
    }

    if (!newMinutes || Number(newMinutes) <= 0) {
      setError("Please enter a valid number of minutes.");
      return;
    }

    if (!newWorkDate) {
      setError("Please select a work date.");
      return;
    }

    setSavingTimeLog(true);
    setError("");

    try {
      const success = await createProjectTimelog(businessId, projectId, {
        EmployeeName: currentEmployee?.Name || "Unknown",
        Uid: currentUid,
        minutes: Number(newMinutes),
        note: newLogNote.trim() || "",
        workDate: Timestamp.fromDate(new Date(`${newWorkDate}T00:00:00`)),
        createdAt: serverTimestamp(),
      })
      
      if (success) {
        setNewMinutes("");
        setNewLogNote("");
        setNewWorkDate("");
      }
      else {
        setError("Failed to add time log.");
      }
    }
    finally {
      setSavingTimeLog(false);
    }
  }

  // Converts stopwatch time to a time log entry.
  async function handleSubmitStopwatchLog() {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid) {
      setError("No authenticated user found.");
      return;
    }

    const totalMinutes = Math.max(1, Math.round(timerSeconds / 60));

    if (timerSeconds <= 0) {
      setError("Timer has no recorded time.");
      return;
    }

    setSavingStopwatchLog(true);
    setError("");

    try{
      const today = new Date();
      today.setHours(0, 0, 0, 0);
  
      const success = await createProjectTimelog(businessId, projectId, {
        EmployeeName: currentEmployee?.Name || "Unknown",
        Uid: currentUid,
        minutes: totalMinutes,
        note: timerNote.trim() || "",
        workDate: Timestamp.fromDate(today),
        createdAt: serverTimestamp(),
      });
  
      if (success) {
        setTimerNote("");
        submitTimer(); // Clear localStorage after successful submission
      }
  
      else {
        setError(err.message || "Failed to submit stopwatch time log.");
      }
    }
    finally {
      setSavingStopwatchLog(false);
    }
  }

  // Deletes one time log entry after confirmation.
  async function handleDeleteTimeLog(logId) {
    const confirmed = window.confirm("Delete this time log?");
    if (!confirmed) return;

    try {
      const logRef = doc(
        db,
        "businesses",
        businessId,
        "Projects",
        projectId,
        "TimeLogs",
        logId,
      );

      await deleteDoc(logRef);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to delete time log.");
    }
  }

  // Enters inline edit mode for a time log row.
  function startEditingLog(log) {
    setEditingLogId(log.id);
    setEditMinutes(String(log.minutes || ""));
    setEditLogNote(log.note || "");
    setEditWorkDate(
      log.workDate?.toDate
        ? log.workDate.toDate().toISOString().split("T")[0]
        : "",
    );
  }

  // Exits inline edit mode and clears temp form values.
  function cancelEditingLog() {
    setEditingLogId(null);
    setEditMinutes("");
    setEditLogNote("");
    setEditWorkDate("");
  }

  // Saves inline edits for a time log row.
  async function handleUpdateTimeLog(logId) {
    if (!editMinutes || Number(editMinutes) <= 0) {
      setError("Please enter a valid number of minutes.");
      return;
    }

    if (!editWorkDate) {
      setError("Please select a work date.");
      return;
    }

    const success = await updateProjectTimelogValue(businessId, projectId, logId, {
      minutes: Number(editMinutes),
      note: editLogNote.trim() || "",
      workDate: Timestamp.fromDate(new Date(`${editWorkDate}T00:00:00`)),
    });

    if (success) {
      cancelEditingLog();
    }

    else {
      console.error(err);
      setError(err.message || "Failed to update time log.");
    }
  }

  function getTotalMinutes() {
    return timeLogs.reduce((sum, log) => sum + (Number(log.minutes) || 0), 0);
  }

  const isOwner = currentEmployee?.role === "owner";

  function canManageLog(log) {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid) return false;
    return isOwner || log.Uid === currentUid;
  }

  // Main page render with loading/error/empty branches.
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

              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={() => navigate("/jobs")}
                  className="h-10 px-4 rounded-lg border border-[#E0E0E0] text-[#37352F] bg-white text-sm font-medium hover:bg-[#F7F6F3] hover:border-[#37352F] hover:shadow-md transition-all duration-200 active:bg-[#E0E0E0]"
                >
                  ← Back to Jobs
                </button>

                  <button
                    onClick={() => navigate(`/projects/${projectId}/edit`)}
                    className="h-10 px-4 inline-flex items-center rounded-lg text-white text-sm font-medium hover:bg-[#F7F7F5] hover:text-[#37352F] transition-colors"
                  >
                    Edit
                  </button>
              </div>
            </div>

            <div className="grid grid-cols-1 2xl:grid-cols-3 gap-6">
              <div className="rounded-xl border border-[#E0E0E0] bg-white shadow-sm p-6">
                <h2 className="text-lg font-semibold text-[#37352F] mb-5">
                  Job Details
                </h2>

                <div className="divide-y divide-[#F0F0F0]">
                  <div className="flex justify-between gap-4 py-4">
                    <span className="font-medium text-[#37352F]">Customer</span>
                    <span className="text-[#787774]">
                      {project.customerId ? (
                        <Link
                          to={`/Customer/${project.customerId}`}
                          className="text-[#2F6FED] hover:underline font-medium"
                        >
                          {project.customerName || "-"}
                        </Link>
                      ) : (
                        project.customerName || "-"
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4 py-4">
                    <span className="font-medium text-[#37352F]">Car</span>
                    <span className="text-[#787774]">
                      {project.carId ? (
                        <Link
                          to={`/storage/${project.carId}`}
                          className="text-[#2F6FED] hover:underline font-medium"
                        >
                          {project.carLabel || "-"}
                        </Link>
                      ) : (
                        project.carLabel || "-"
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4 py-4">
                    <span className="font-medium text-[#37352F]">
                      License Plate
                    </span>
                    <span className="text-[#787774]">
                      {carDetails?.plate || "-"}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4 py-4">
                    <span className="font-medium text-[#37352F]">VIN</span>
                    <span className="text-[#787774]">
                      {carDetails?.vin || "-"}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4 py-4">
                    <span className="font-medium text-[#37352F]">Status</span>
                    <span className="text-[#787774] block mt-1">
                      {project.status ? statusMeta.label : "-"}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4 py-4">
                    <span className="font-medium text-[#37352F]">
                      Created By
                    </span>
                    <span className="text-[#787774]">
                      {project.createdByEmployeeName || "Unknown"}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4 py-4">
                    <span className="font-medium text-[#37352F]">
                      Created At
                    </span>
                    <span className="text-[#787774]">
                      {formatTimestamp(project.createdAt)}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4 py-4">
                    <span className="font-medium text-[#37352F]">
                      Last Updated
                    </span>
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
                      <span className="text-sm text-[#787774]">
                        No mechanics assigned
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-[#E0E0E0] bg-white shadow-sm p-6">
                <h2 className="text-lg font-semibold text-[#37352F] mb-5">
                  Description
                </h2>

                <div className="space-y-4 max-h-[420px] overflow-y-auto pr-2">
                  {notes.length ? (
                    notes.map((note) => (
                      <div
                        key={project.description}
                        className="rounded-lg border border-[#E0E0E0] bg-[#FAFAF9] p-4"
                      >
                        <p className="text-sm text-[#37352F] mb-3 break-words whitespace-pre-wrap">
                          {project.description || "No description available"}
                        </p>
                        <div className="flex flex-col gap-1 text-xs text-[#787774]">
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-[#787774]">
                      No description available for this job.
                    </p>
                  )}
                </div>
                
              <div className="mt-6 pt-5 border-t border-[#F0F0F0]">
                <h3 className="text-sm font-semibold text-[#37352F] mb-3">
                  Notes
                </h3>

                <div className="space-y-4 max-h-[420px] overflow-y-auto pr-2">
                  {notes.length ? (
                    notes.map((note) => (
                      <div
                        key={note.id}
                        className="rounded-lg border border-[#E0E0E0] bg-[#FAFAF9] p-4"
                      >
                        <p className="text-sm text-[#37352F] mb-3 break-words whitespace-pre-wrap">
                          {note.text || "No note text"}
                        </p>
                        <div className="flex flex-col gap-1 text-xs text-[#787774]">
                          <span>
                            <strong className="text-[#37352F]">
                              Created By:
                            </strong>{" "}
                            {note.createdByEmployeeName || "Unknown"}
                          </span>
                          <span>
                            <strong className="text-[#37352F]">
                              Created At:
                            </strong>{" "}
                            {formatTimestamp(note.createdAt)}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-[#787774]">
                      No notes available for this job.
                    </p>
                  )}
                </div>
              </div>

                <div className="mt-6 pt-5 border-t border-[#F0F0F0]">
                  <h3 className="text-sm font-semibold text-[#37352F] mb-3">
                    Add Note
                  </h3>

                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    rows={4}
                    placeholder="Write a job note..."
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

              <div className="rounded-xl border border-[#E0E0E0] bg-white shadow-sm p-6">
                <h2 className="text-lg font-semibold text-[#37352F] mb-2">
                  Time Logs
                </h2>

                <p className="text-sm text-[#787774] mb-5">
                  Total Logged Time: {formatTotalMinutes(getTotalMinutes())}
                </p>

                <div className="space-y-4 max-h-[420px] overflow-y-auto pr-2">
                  {timeLogs.length ? (
                    timeLogs.map((log) => (
                      <div
                        key={log.id}
                        className="rounded-lg border border-[#E0E0E0] bg-[#FAFAF9] p-4"
                      >
                        {editingLogId === log.id ? (
                          <div className="space-y-3">
                            <input
                              type="number"
                              min="1"
                              value={editMinutes}
                              onChange={(e) => setEditMinutes(e.target.value)}
                              placeholder="Minutes worked"
                              className="w-full px-3 py-2 text-sm text-[#37352F] bg-white border border-[#E0E0E0] rounded-lg outline-none"
                            />

                            <input
                              type="date"
                              value={editWorkDate}
                              onChange={(e) => setEditWorkDate(e.target.value)}
                              className="w-full px-3 py-2 text-sm text-[#37352F] bg-white border border-[#E0E0E0] rounded-lg outline-none"
                            />

                            <textarea
                              rows={3}
                              value={editLogNote}
                              onChange={(e) => setEditLogNote(e.target.value)}
                              placeholder="Optional note"
                              className="w-full px-3 py-2 text-sm text-[#37352F] bg-white border border-[#E0E0E0] rounded-lg outline-none resize-none"
                            />

                            <div className="flex gap-2">
                              <button
                                onClick={() => handleUpdateTimeLog(log.id)}
                                className="h-9 px-3 rounded-lg bg-[#37352F] hover:bg-[#474540] text-white text-sm font-medium"
                              >
                                Save
                              </button>
                              <button
                                onClick={cancelEditingLog}
                                className="h-9 px-3 rounded-lg bg-[#37352F] hover:bg-[#474540] text-white text-sm font-medium"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="text-sm text-[#37352F] mb-2 break-words whitespace-pre-wrap">
                              <strong>{log.EmployeeName || "Unknown"}</strong>{" "}
                              logged{" "}
                              <strong>
                                {formatTotalMinutes(Number(log.minutes) || 0)}
                              </strong>
                            </p>

                            <div className="flex flex-col gap-1 text-xs text-[#787774] mb-3">
                              <span>
                                <strong className="text-[#37352F]">
                                  Work Date:
                                </strong>{" "}
                                {formatWorkDate(log.workDate)}
                              </span>
                              <span>
                                <strong className="text-[#37352F]">
                                  Created At:
                                </strong>{" "}
                                {formatTimestamp(log.createdAt)}
                              </span>
                              {log.note ? (
                                <span className="break-words whitespace-pre-wrap">
                                  <strong className="text-[#37352F]">
                                    Note:
                                  </strong>{" "}
                                  {log.note}
                                </span>
                              ) : null}
                            </div>
                            {canManageLog(log) && (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => startEditingLog(log)}
                                  className="h-9 px-3 rounded-lg bg-[#37352F] hover:bg-[#474540] text-white text-sm font-medium"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteTimeLog(log.id)}
                                  className="h-9 px-3 rounded-lg bg-[#C53030] hover:bg-[#A12828] text-white text-sm font-medium"
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-[#787774]">No time logs yet.</p>
                  )}
                </div>

                <div className="mt-6 pt-5 border-t border-[#F0F0F0]">
                  <h3 className="text-sm font-semibold text-[#37352F] mb-3">
                    Live Timer
                  </h3>

                  <div className="rounded-lg border border-[#E0E0E0] bg-[#F7F6F3] p-4">
                    <p className="text-3xl font-semibold text-[#37352F] mb-4 tracking-wide">
                      {formatTimer(timerSeconds)}
                    </p>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {!isActive && timerSeconds === 0 && (
                        <button
                          onClick={startTimer}
                          className="h-9 px-3 rounded-lg bg-[#37352F] hover:bg-[#474540] text-white text-sm font-medium transition-all"
                        >
                          Start
                        </button>
                      )}

                      {isActive && (
                        <button
                          onClick={pauseTimer}
                          className="h-9 px-3 rounded-lg bg-[#37352F] hover:bg-[#474540] text-white text-sm font-medium transition-all"
                        >
                          Pause
                        </button>
                      )}

                      {!isActive && timerSeconds > 0 && (
                        <button
                          onClick={resumeTimer}
                          className="h-9 px-3 rounded-lg bg-[#37352F] hover:bg-[#474540] text-white text-sm font-medium transition-all"
                        >
                          Resume
                        </button>
                      )}

                      <button
                        onClick={resetTimer}
                        className="h-9 px-3 rounded-lg bg-[#E0E0E0] hover:bg-[#D0D0D0] text-[#37352F] text-sm font-medium transition-all"
                      >
                        Reset
                      </button>
                    </div>

                    <textarea
                      value={timerNote}
                      onChange={(e) => setTimerNote(e.target.value)}
                      rows={3}
                      placeholder="Optional note about the work done..."
                      className="w-full px-3 py-2 text-sm text-[#37352F] bg-white border border-[#E0E0E0] rounded-lg outline-none focus:border-[#37352F] transition-all resize-none"
                    />

                    <button
                      onClick={handleSubmitStopwatchLog}
                      disabled={savingStopwatchLog || timerSeconds <= 0}
                      className="mt-3 h-10 px-4 rounded-lg bg-[#37352F] hover:bg-[#474540] text-white text-sm font-medium shadow-sm transition-all disabled:opacity-50"
                    >
                      {savingStopwatchLog
                        ? "Submitting..."
                        : "Submit Timer Log"}
                    </button>
                  </div>
                </div>

                <div className="mt-6 pt-5 border-t border-[#F0F0F0]">
                  <h3 className="text-sm font-semibold text-[#37352F] mb-3">
                    Manual Time Log
                  </h3>

                  <div className="space-y-3">
                    <input
                      type="number"
                      min="1"
                      value={newMinutes}
                      onChange={(e) => setNewMinutes(e.target.value)}
                      placeholder="Minutes worked"
                      className="w-full px-3 py-2 text-sm text-[#37352F] bg-[#F7F6F3] border border-[#E0E0E0] rounded-lg outline-none focus:border-[#37352F] focus:bg-white transition-all"
                    />

                    <input
                      type="date"
                      value={newWorkDate}
                      onChange={(e) => setNewWorkDate(e.target.value)}
                      className="w-full px-3 py-2 text-sm text-[#37352F] bg-[#F7F6F3] border border-[#E0E0E0] rounded-lg outline-none focus:border-[#37352F] focus:bg-white transition-all"
                    />

                    <textarea
                      value={newLogNote}
                      onChange={(e) => setNewLogNote(e.target.value)}
                      rows={3}
                      placeholder="Optional note about the work done..."
                      className="w-full px-3 py-2 text-sm text-[#37352F] bg-[#F7F6F3] border border-[#E0E0E0] rounded-lg outline-none focus:border-[#37352F] focus:bg-white transition-all resize-none"
                    />

                    <button
                      onClick={handleAddTimeLog}
                      disabled={savingTimeLog}
                      className="h-10 px-4 rounded-lg bg-[#37352F] hover:bg-[#474540] text-white text-sm font-medium shadow-sm transition-all disabled:opacity-50"
                    >
                      {savingTimeLog ? "Saving..." : "Add Manual Time Log"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
