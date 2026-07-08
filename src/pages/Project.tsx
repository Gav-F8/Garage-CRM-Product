// AllProjectsPage.tsx — list and create repair jobs
// ══════════════════════════════════════════════════════════════════════════════
// FIRESTORE DATA STRUCTURE — projects/{auto-id}
// ══════════════════════════════════════════════════════════════════════════════
// {
//   assignedMechanicId:      string          // required
//   assignedMechanicName:    string | null
//   vehicleId:                   string | null
//   vehicleLabel:                string | null
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

import { useEffect, useState } from "react";
import { auth } from "../firebase";
import { serverTimestamp } from "firebase/firestore";
import {
  fetchCustomers,
  fetchMechanics,
  fetchVehicles,
  fetchEmployeeDetail,
  createProject,
  extractName,
} from "../lib/firestore-helpers";
import { useAuth } from "../context/AuthContext";
import { useProjectsForCurrentUser } from "../hooks/useProjectsForCurrentUser";
import { notionClasses } from "../lib/notion-theme";
import { NavigationBar } from "../components/NavigationBar";
import { CreateProjectFlow } from "../components/CreateProjectModal";
import ProjectsList from "../components/ProjectsList";
import type { WithId, Customer, Vehicle } from "@/types/firestore";

// ══════════════════════════════════════════════════════════════════════════════
// Main Page
// ══════════════════════════════════════════════════════════════════════════════

export default function ProjectPage() {
  const { businessId, user, loading: authLoading } = useAuth();
  const [customers, setCustomers] = useState<WithId<Customer>[]>([]);
  const [vehicles, setVehicles] = useState<WithId<Vehicle>[]>([]);
  const [mechanics, setMechanics] = useState<{ id: string; name: string }[]>([]);
  const [creationDataLoading, setCreationDataLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");
  const [submitError, setSubmitError] = useState("");

  const { projects, loading, error, hasMore, loadingMore, loadMore } =
    useProjectsForCurrentUser({
      businessId,
      enabled: Boolean(businessId),
    });


  // ══════════════════════════════════════════════════════════════════════════════
  // Fetch necessary data for job creation form (customers, vehicles, mechanics)
  // ══════════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (authLoading) return;
    if (!user || !businessId) {
      setCreationDataLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const [customerList, vehicleList, mechanicList] = await Promise.all([
          fetchCustomers(businessId),
          fetchVehicles(businessId),
          fetchMechanics(businessId),
        ]);
        if (cancelled) return;
        setCustomers(customerList);
        setVehicles(vehicleList);
        setMechanics(mechanicList);
      } finally {
        if (!cancelled) setCreationDataLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user, businessId]);

  const handleJobSubmit = async (payload: Record<string, any>) => {
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

      const createdByEmployeeName = extractName(
        await fetchEmployeeDetail(
          businessId,
          currentUser.uid
        ), "Name");

      const selectedCustomer = customers.find(
        (customer) => customer.id === payload.customerId,
      );
      const selectedVehicle = vehicles.find(
        (vehicle) => vehicle.id === payload.vehicleId,
      );
      const selectedMechanics = mechanics.filter((mechanic) =>
        payload.assignedMechanicIds.includes(mechanic.id),
      );

      const assignedMechanicNames = selectedMechanics
        .map((mechanic) => mechanic.name)
        .filter(Boolean);

      const vehicleLabel = [
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
        vehicleId: payload.vehicleId,
        vehicleLabel: vehicleLabel || null,
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

      const jobId = await createProject(businessId, jobData);

      return jobId;
    } catch (creationError: any) {
      console.error("Error creating project:", creationError);
      setSubmitError(
        creationError.message || "Failed to create project. Please try again.",
      );
      return null;
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={notionClasses.pageContainer}>
      <NavigationBar />
      <div className={notionClasses.dashboardContainer}>
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className={notionClasses.header.title}>Jobs</h1>
            <p className={notionClasses.header.subtitle}>
              View and Manage Project Jobs.
            </p>
          </div>

          {/* Create Job Button */}
          {!creationDataLoading && (
            <CreateProjectFlow
              submitting={submitting}
              onCreate={handleJobSubmit}
              buttonClassName="w-full sm:w-auto"
            />
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
              <CreateProjectFlow submitting={submitting} onCreate={handleJobSubmit} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
