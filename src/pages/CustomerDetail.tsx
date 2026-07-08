import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  fetchCustomerDetail,
  fetchTotalTimeLogsCustomer,
  fetchRelatedProjectsByCustomer
} from "../lib/firestore-helpers";
import { NavigationBar } from "../components/NavigationBar";
import { notionClasses } from "../lib/notion-theme";
import { statusStyle } from "../lib/utils";
import { useAuth } from "../context/AuthContext";
import { ChevronRight } from "lucide-react";
import type { WithId, Customer, Project } from "@/types/firestore";

export default function CustomerDetailPage() {
  // Route and page-level state.
  const { customerId } = useParams();
  const navigate = useNavigate();
  const { role, businessId, user, loading: authLoading } = useAuth();
  const [customer, setCustomer] = useState<WithId<Customer> | null>(null);
  const [relatedProjects, setRelatedProjects] = useState<WithId<Project>[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeLogs, setTimeLogs] = useState({
    totalMinutes: 0,
    hours: 0,
    minutes: 0,
  });

  // Loads customer data and related project statistics once auth/claims resolve.
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    if (!businessId || !customerId) {
      navigate("/Login");
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const customerData = await fetchCustomerDetail(businessId, customerId);
        if (cancelled) return;
        setCustomer(customerData);

        if (customerData) {
          const projects = await fetchRelatedProjectsByCustomer(businessId, customerId);
          if (cancelled) return;
          setRelatedProjects(projects);

          const logs = await fetchTotalTimeLogsCustomer(businessId, customerId);
          if (cancelled) return;
          setTimeLogs(logs);
        }
      } catch (error) {
        console.error("Error loading customer detail:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user, businessId, customerId, navigate]);

  // Loading and empty states.
  if (loading) {
    return (
      <div className={notionClasses.pageContainer}>
        <NavigationBar />
        <div className={notionClasses.dashboardContainer}>
          <p className="text-sm text-[#787774]">Loading customer details...</p>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className={notionClasses.pageContainer}>
        <NavigationBar />
        <div className={notionClasses.dashboardContainer}>
          <p className="text-sm text-[#C53030]">Customer not found</p>
          <button
            onClick={() => navigate("/customers")}
            className="mt-4 h-10 px-4 rounded-lg bg-[#37352F] hover:bg-[#474540] text-white text-sm font-medium"
          >
            Back to Customers
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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className={notionClasses.header.title}>{customer.name}</h1>
            <p className={notionClasses.header.subtitle}>Customer Details</p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => navigate("/customers")}
              className="h-10 px-4 rounded-lg border border-[#E0E0E0] text-[#37352F] bg-white text-sm font-medium hover:bg-[#F7F6F3] hover:border-[#37352F] hover:shadow-md transition-all duration-200 active:bg-[#E0E0E0]"
            >
              ← Back to Customers
            </button>

            {role === "owner" && (
              <button
                onClick={() => navigate(`/customers/${customerId}/edit`)}
                className="h-10 px-4 inline-flex items-center rounded-lg text-white text-sm font-medium hover:bg-[#F7F7F5] hover:text-[#37352F] transition-colors"
              >
                Edit
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 animate-fadeIn">
          <div className="rounded-xl border border-[#E0E0E0] bg-white shadow-sm p-6 hover:shadow-md transition-shadow duration-200">
            <h2 className="text-lg font-semibold text-[#37352F] mb-4">
              Customer Information
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-[#787774] uppercase">
                  Name
                </label>
                <p className="text-sm text-[#37352F]">{customer.name}</p>
              </div>

              <div>
                <label className="text-xs font-medium text-[#787774] uppercase">
                  Email
                </label>
                <p className="text-sm text-[#37352F]">
                  {customer.email ? (
                    <a
                      href={`mailto:${customer.email}`}
                      className="hover:text-blue-600 transition-colors"
                    >
                      {customer.email}
                    </a>
                  ) : (
                    "-"
                  )}
                </p>
              </div>

              <div>
                <label className="text-xs font-medium text-[#787774] uppercase">
                  Phone
                </label>
                <p className="text-sm text-[#37352F]">
                  {customer.phone ? (
                    <a
                      href={`tel:${customer.phone}`}
                      className="hover:text-blue-600 transition-colors"
                    >
                      {customer.phone}
                    </a>
                  ) : (
                    "-"
                  )}
                </p>
              </div>

              <div>
                <label className="text-xs font-medium text-[#787774] uppercase">
                  Address
                </label>
                <p className="text-sm text-[#37352F]">
                  {customer.address || "-"}
                </p>
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
                  Total Project Hours
                </label>
                <p className="text-sm text-[#37352F] font-medium">
                  {timeLogs.hours}h {timeLogs.minutes}m
                </p>
              </div>

              <div>
                <label className="text-xs font-medium text-[#787774] uppercase">
                  Active Projects
                </label>
                <p className="text-sm text-[#37352F] font-medium">
                  {relatedProjects.filter((p) => p.status === "active").length}{" "}
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

              <div>
                <label className="text-xs font-medium text-[#787774] uppercase">
                  Notes
                </label>
                <p className="text-sm text-[#37352F]">
                  {customer.notes || "-"}
                </p>
              </div>

              <div>
                <label className="text-xs font-medium text-[#787774] uppercase">
                  Created By
                </label>
                <p className="text-sm text-[#37352F]">
                  {(customer as { createdByEmployeeAcc?: string }).createdByEmployeeAcc || "-"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[#E0E0E0] bg-white shadow-sm p-6 hover:shadow-md transition-shadow duration-200">
          <h2 className="text-lg font-semibold text-[#37352F] mb-4">
            Related Projects
          </h2>

          {relatedProjects.length === 0 ? (
            <p className="text-sm text-[#787774]">
              No projects related to this customer.
            </p>
          ) : (
            <div className="hidden sm:block overflow-x-auto rounded-lg border border-[#E0E0E0]">
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
                          className="h-10 px-4 inline-flex items-center rounded-lg bg-[#37352F] text-white text-sm font-medium hover:bg-[#F7F7F5] hover:text-[#37352F] transition-colors"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
          )}

          {relatedProjects.length > 0 && (
            <div className="sm:hidden mt-0 divide-y divide-[#E0E0E0] rounded-lg border border-[#E0E0E0] overflow-hidden">
              {relatedProjects.map((project) => {
                const { label, style } = statusStyle(project.status);
                return (
                  <div
                    key={project.id}
                    onClick={() => navigate(`/projects/${project.id}`)}
                    className="flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-colors hover:bg-blue-50 active:bg-blue-100"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium text-[#37352F] truncate">
                          {project.title || "-"}
                        </span>
                        <span
                          className={`shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${style}`}
                        >
                          {label || "-"}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[#787774]">
                        {project.createdAt
                          ? new Date(project.createdAt.toDate()).toLocaleDateString()
                          : "-"}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-[#9B9A97]" />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
