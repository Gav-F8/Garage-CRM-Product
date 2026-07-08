import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { fetchCustomers, fetchTotalHoursCustomer } from "../lib/firestore-helpers";
import { useAuth } from "../context/AuthContext";
import { notionClasses } from "../lib/notion-theme";
import { NavigationBar } from "../components/NavigationBar";
import { CreateCustomerModal } from "@/components/CreateCustomerModal";
import { CreateButton } from "@/components/ui/CreateButton";
import { Mail, Phone, MapPin, ChevronRight } from "lucide-react";
import type { WithId, Customer } from "@/types/firestore";

// ══════════════════════════════════════════════════════════════════════════════
// Main Page
// ══════════════════════════════════════════════════════════════════════════════
export default function CreateCustomerPage() {
  const navigate = useNavigate();
  const { role, businessId, user, loading: authLoading } = useAuth();
  const [customers, setCustomers] = useState<WithId<Customer>[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [totalHoursMap, setTotalHoursMap] = useState<Record<string, string>>({});
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Allow access for mechanics and other roles; role-based routing is handled elsewhere if needed.
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    if (!businessId) {
      navigate("/Login");
      return;
    }

    setLoading(true);
    fetchCustomers(businessId)
      .then(async (customerData) => {
        setCustomers(customerData);

        const hoursMap: Record<string, string> = {};

        await Promise.all(
          customerData.map(async (customer) => {
            const hours = await fetchTotalHoursCustomer(businessId, customer.id);
            hoursMap[customer.id] = hours;
          }),
        );

        setTotalHoursMap(hoursMap);
      })
      .finally(() => setLoading(false));
  }, [authLoading, user, businessId, navigate]);

  // Clear search input after modal closes to prevent autofill
  useEffect(() => {
    if (!showModal && searchInputRef.current) {
      searchInputRef.current.value = "";
    }
  }, [showModal]);

  const handleCreated = (newCustomer: WithId<Customer>) => {
    setCustomers((prev) => [newCustomer, ...prev]);
    setSearch(""); // Reset search when new customer is added
    setShowModal(false); // Close modal
    setTotalHoursMap((p) => ({ ...p, [newCustomer.id]: "0h 0m" }));
  };

  const filtered = customers.filter(
    (c) =>
      (c.name && c.name.toLowerCase().includes(search.toLowerCase())) ||
      (c.email && c.email.toLowerCase().includes(search.toLowerCase())) ||
      (c.phone && c.phone.includes(search)),
  );

  // Pagination logic
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = filtered.slice(startIndex, endIndex);

  return (
    <div className={notionClasses.pageContainer}>
      <NavigationBar />
      <div className={notionClasses.dashboardContainer}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className={notionClasses.header.title}>Customers</h1>
            <p className={notionClasses.header.subtitle}>
              Manage all your customers and their project history in one place.
            </p>
          </div>

          {customers.length > 0 &&
            loading === false &&
            role === "owner" && (
              <CreateButton
                onClick={() => setShowModal(true)}
                buttonText="+ New Customer"
                className="w-full sm:w-auto"
              />
            )}
        </div>

        {/* Search */}
        {customers.length > 0 && (
          <div className="mb-6">
            <input
              ref={searchInputRef}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              placeholder="Search customers..."
              autoComplete="off"
              spellCheck="false"
              name="search-customers"
              type="text"
              className={notionClasses.input}
            />
          </div>
        )}

        {/* Table */}
        {loading ? (
          <p className="text-sm text-[#787774]">Loading customers...</p>
        ) : customers.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-[#E0E0E0] rounded-xl bg-white shadow-sm">
            <p className="text-sm text-[#787774] mb-4">No customers yet.</p>
            {role === "owner" && (
              <div className="flex justify-center">
                <CreateButton
                  onClick={() => setShowModal(true)}
                  buttonText="+ Create Customer"
                />
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Items Per Page and Total Count */}
            <div className="flex items-center justify-between px-4 py-4 bg-gray-50 rounded-t-xl border border-[#E0E0E0]">
              <div className="text-sm text-[#787774]">
                Total:{" "}
                <span className="font-semibold text-[#37352F]">
                  {filtered.length}
                </span>{" "}
                customers
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm text-[#787774]">Show:</label>
                <select
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  className="px-3 py-1 text-sm text-[#37352F] bg-white border border-[#E0E0E0] rounded-lg outline-none focus:border-[#37352F] transition-all"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            {/* Table (tablet / desktop) */}
            <div className="hidden sm:block overflow-x-auto border border-[#E0E0E0] border-t-0 bg-white shadow-sm">
              <table className="min-w-full">
                <thead>
                  <tr>
                    <th className={notionClasses.table.header}>Name</th>
                    <th className={notionClasses.table.header}>Email</th>
                    <th className={notionClasses.table.header}>Phone</th>
                    <th className={notionClasses.table.header}>Address</th>
                    <th className={notionClasses.table.header}>Total Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((c) => (
                    <tr
                      key={c.id}
                      className="border-t border-[#E0E0E0] hover:bg-blue-50 hover:border-l-4 hover:border-l-blue-400 transition-all duration-150 cursor-pointer"
                      onClick={() => navigate(`/customers/${c.id}`)}
                    >
                      <td className={notionClasses.table.cell}>{c.name}</td>
                      <td className={notionClasses.table.cell}>
                        {c.email || "-"}
                      </td>
                      <td className={notionClasses.table.cell}>
                        {c.phone || "-"}
                      </td>
                      <td className={notionClasses.table.cell}>
                        {c.address || "-"}
                      </td>
                      <td className={notionClasses.table.cell}>
                        {totalHoursMap[c.id] || "0h 0m"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Card list (mobile) */}
            <div className="sm:hidden divide-y divide-[#E0E0E0] border border-[#E0E0E0] border-t-0 bg-white shadow-sm">
              {paginatedData.map((c) => (
                <div
                  key={c.id}
                  onClick={() => navigate(`/customers/${c.id}`)}
                  className="flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-colors hover:bg-blue-50 active:bg-blue-100"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-sm font-semibold text-[#37352F] truncate">
                        {c.name || "-"}
                      </span>
                      <span className="shrink-0 rounded-md bg-[#F7F6F3] px-2 py-0.5 text-xs font-medium text-[#787774]">
                        {totalHoursMap[c.id] || "0h 0m"}
                      </span>
                    </div>
                    <div className="mt-1.5 space-y-1">
                      {c.email && (
                        <p className="flex items-center gap-2 text-xs text-[#787774] truncate">
                          <Mail className="h-3.5 w-3.5 shrink-0 text-[#9B9A97]" />
                          <span className="truncate">{c.email}</span>
                        </p>
                      )}
                      {c.phone && (
                        <p className="flex items-center gap-2 text-xs text-[#787774] truncate">
                          <Phone className="h-3.5 w-3.5 shrink-0 text-[#9B9A97]" />
                          <span className="truncate">{c.phone}</span>
                        </p>
                      )}
                      {c.address && (
                        <p className="flex items-center gap-2 text-xs text-[#787774] truncate">
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-[#9B9A97]" />
                          <span className="truncate">{c.address}</span>
                        </p>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-[#9B9A97]" />
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 bg-gray-50 rounded-b-xl border border-t-0 border-[#E0E0E0]">
                <div className="text-sm text-[#787774]">
                  Page{" "}
                  <span className="font-semibold text-[#37352F]">
                    {currentPage}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-[#37352F]">
                    {totalPages}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(prev - 1, 1))
                    }
                    disabled={currentPage === 1}
                    className="px-4 py-2 text-sm font-medium text-[#37352F] bg-white border border-[#E0E0E0] rounded-lg hover:bg-[#F7F6F3] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                    }
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 text-sm font-medium text-[#37352F] bg-white border border-[#E0E0E0] rounded-lg hover:bg-[#F7F6F3] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {showModal && businessId && (
          <CreateCustomerModal
            businessId={businessId}
            onClose={() => setShowModal(false)}
            onCreated={handleCreated}
          />
        )}
      </div>
    </div>
  );
}
