// AllProjectsPage.jsx — list and create repair jobs
// ══════════════════════════════════════════════════════════════════════════════
// FIRESTORE DATA STRUCTURE — projects/{auto-id}
// ══════════════════════════════════════════════════════════════════════════════
// {
//   assignedMechanicId:      string          // required
//   assignedMechanicName:    string | null
//   carId:                   string | null
//   carLabel:                string | null
//   createdAt:               Timestamp       // serverTimestamp()
//   createdByEmployeeId:     string          // required
//   createdByEmployeeName:   string          // required
//   customerId:              string | null
//   customerName:            string | null
//   lastNoteAt:              Timestamp | null
//   lastNoteText:            string | null
//   isActive:                boolean | null
//   status:                  string | null
//   title:                   string
//   totalMinutes:            integer
//   updatedAt:               Timestamp       // serverTimestamp()
// }
// ══════════════════════════════════════════════════════════════════════════════

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { auth, db } from "/src/firebase.js";
import {
  addDoc,
  collection,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { 
  fetchBusinessId,
  fetchCustomers,
  fetchEmployeeName,
  fetchMechanics,
  fetchStorage,
} from "../lib/firestore-helpers";
import { useProjectsForCurrentUser } from "../hooks/useProjectsForCurrentUser";
import { STATUS_OPTIONS } from "../lib/utils.js";
import { notionClasses } from "../lib/notion-theme";
import { NavigationBar } from "../components/NavigationBar";
import { CreateJobFlow } from "../components/CreateJobModal.jsx";
import ProjectsList from "../components/ProjectsList";

// ══════════════════════════════════════════════════════════════════════════════
// Main Page
// ══════════════════════════════════════════════════════════════════════════════

export default function ProjectPage() {
  const location = useState();
  const [businessId, setBusinessId] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [mechanics, setMechanics] = useState([]);
  const [creationDataLoading, setCreationDataLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");
  const [submitError, setSubmitError] = useState("");

  const { projects, loading, error, hasMore, loadingMore, loadMore } =
    useProjectsForCurrentUser({
      businessId,
      enabled: Boolean(businessId),
    });

  const navigate = useNavigate();

  // ══════════════════════════════════════════════════════════════════════════════
  // Fetch necessary data for job creation form (customers, vehicles, mechanics)
  // ══════════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        setCreationDataLoading(false);
        return;
      }

      try {
        const bizId =
          (await fetchBusinessId(user.uid)) ||
          localStorage.getItem("ccgBusinessId");
        setBusinessId(bizId);

        if (!bizId) {
          setCreationDataLoading(false);
          return;
        }

        const [customerList, vehicleList, mechanicList] = await Promise.all([
          fetchCustomers(bizId),
          fetchStorage(bizId),
          fetchMechanics(bizId),
        ]);

        setCustomers(customerList);
        setVehicles(vehicleList);
        setMechanics(mechanicList);
      } finally {
        setCreationDataLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleJobSubmit = async (payload) => {
    setSubmitting(true);
    setSubmitError("");
    setSubmitMessage("");

    try {
      if (!businessId) {
        throw new Error("Business ID not found. Please refresh and try again.");
      }

      const currentUser = auth.currentUser;
      if (!currentUser?.uid) {
        throw new Error("No authenticated user found.");
      }

      const createdByEmployeeName = await fetchEmployeeName(
        businessId,
        currentUser.uid,
      );

      const selectedCustomer = customers.find(
        (customer) => customer.id === payload.customerId,
      );
      const selectedVehicle = vehicles.find(
        (vehicle) => vehicle.id === payload.carId,
      );
      const selectedMechanics = mechanics.filter((mechanic) =>
        payload.assignedMechanicIds.includes(mechanic.id),
      );

      const assignedMechanicNames = selectedMechanics
        .map((mechanic) => mechanic.name)
        .filter(Boolean);

      const carLabel = [
        selectedVehicle?.year,
        selectedVehicle?.make,
        selectedVehicle?.model,
      ]
        .filter(Boolean)
        .join(" ");

      const jobData = {
        title: payload.title,
        customerId: payload.customerId,
        customerName: selectedCustomer?.name || null,
        description: payload.description || null,
        carId: payload.carId,
        carLabel: carLabel || null,
        status: payload.status,

        // keep legacy field for compatibility where needed
        assignedMechanicId: payload.assignedMechanicIds[0] || null,

        // new multi-mechanic fields
        assignedMechanicIds: payload.assignedMechanicIds,
        assignedMechanicName: assignedMechanicNames,

        createdByEmployeeId: currentUser.uid,
        createdByEmployeeName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isActive: false,
        totalMinutes: 0,
        lastNoteAt: null,
        lastNoteText: null,
      };

      const jobRef = await addDoc(
        collection(db, "businesses", businessId, "Projects"),
        jobData,
      );
      
      //Redirects to newly created job page (Interupts setSubmitMessage)
      navigate(`/projects/${jobRef.id}`);

      // Shows success message if not already redirected
      setSubmitMessage(`Project created successfully! ID: ${jobRef.id}.`);
      return true;
    } catch (creationError) {
      console.error("Error creating project:", creationError);
      setSubmitError(
        creationError.message || "Failed to create project. Please try again.",
      );
      return false;
    } finally {
      setSubmitting(false);
    }
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

          {/* Create Job Button */}
          {!creationDataLoading && (
            <CreateJobFlow submitting={submitting} onCreate={handleJobSubmit} />
          )}
        </div>

        {submitMessage && (
          <p className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
            {submitMessage}
          </p>
        )}

        {submitError && (
          <p className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {submitError}
          </p>
        )}

        {/* Projects List */}
        <ProjectsList
          projects={projects}
          loading={loading}
          error={error}
          emptyMessage="No Jobs yet."
          showFilters={!loading && projects.length > 0}
          showSearch={!loading && projects.length > 0}
          searchInputClassName={notionClasses.input}
          hasMore={hasMore}
          loadingMore={loadingMore}
          onLoadMore={loadMore}
        />

        {/* Empty State with CTA */}
        {!loading && projects.length === 0 && (
          <div className="text-center py-16 border border-dashed border-[#E0E0E0] rounded-xl bg-white shadow-sm">
            <p className="text-sm text-[#787774] mb-4">No Jobs found.</p>
            {!creationDataLoading && (
              <CreateJobFlow submitting={submitting} onCreate={handleJobSubmit} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
