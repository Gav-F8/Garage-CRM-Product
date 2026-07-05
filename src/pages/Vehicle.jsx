// StoragePage
// ├── Header (title + "Create Storage Item" button)
// ├── Search bar (visible when list has items)
// ├── Storage list  ← reads from Firestore
// └── CreateVehicleModal   ← writes to Firestore, updates list on success
// ══════════════════════════════════════════════════════════════════════════════
// — storage/{auto-id}
// ══════════════════════════════════════════════════════════════════════════════
// {
//   vehicleLabel:    string          // e.g. "John's 2010 Honda Accord"
//   type:        string          // "car", "truck", "motorcycle", etc.
//   customerId:  string | null   // ref to customers/{id}
//   plate:       string          // required
//   make:        string          // from NHTSA
//   model:       string          // from NHTSA
//   color:       string | null
//   vin:         string | null   // 17-char VIN
//   mileage:     INT64 | null   // odometer in km
//   notes:       string | null
//   year:        INT64
//   createdAt:   Timestamp
//   createdByEmployeeId: string
//   createdByEmployeeName: string
//   updatedAt:   Timestamp
// }
//
// NHTSA vPIC API  — free, no key required
// Docs: https://vpic.nhtsa.dot.gov/api/
// 
// Endpoints used:
//   GET /vehicles/GetAllMakes?format=json
//   GET /vehicles/GetModelsForMake/{make}?format=json
//   GET /vehicles/DecodeVin/{vin}?format=json
//
// ══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchTotalHoursVehicle,
  fetchVehicles,
} from "/src/lib/firestore-helpers.js";
import { useAuth } from "/src/context/AuthContext.jsx";
import { useCustomersForCurrentUser } from "/src/hooks/useCustomersForCurrentUser.js";
import { notionClasses } from "/src/lib/notion-theme";
import { NavigationBar } from "/src/components/NavigationBar.jsx";
import { CreateVehicleModal } from "/src/components/CreateVehicleModal"
import { CreateButton } from "/src/components/ui/CreateButton";
import { Hash, User, ChevronRight } from "lucide-react";

// ══════════════════════════════════════════════════════════════════════════════
// Main Page
// ══════════════════════════════════════════════════════════════════════════════
export default function VehiclePage() {
  const navigate = useNavigate();
  const { businessId, user, loading: authLoading } = useAuth();
  const { customers: customersList } = useCustomersForCurrentUser(businessId);
  const customers = customersList.reduce((acc, c) => {
    acc[c.id] = c.name;
    return acc;
  }, {});

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [totalHoursMap, setTotalHoursMap] = useState({});
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

    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const vehicleData = await fetchVehicles(businessId);
        if (cancelled) return;
        setItems(vehicleData);

        const hoursMap = {};
        await Promise.all(
          vehicleData.map(async (item) => {
            const hours = await fetchTotalHoursVehicle(
              businessId,
              item.id,
              item.customerId,
            );
            hoursMap[item.id] = hours;
          }),
        );
        if (cancelled) return;
        setTotalHoursMap(hoursMap);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user, businessId, navigate]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter((i) =>
      `${i.make || ""} ${i.model || ""} ${i.plate || ""} ${i.type || ""}`
        .toLowerCase()
        .includes(q),
    );
  }, [items, search]);

  // Pagination logic
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = filtered.slice(startIndex, endIndex);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  return (
    <div className={notionClasses.pageContainer}>
      <NavigationBar />
      <div className={notionClasses.dashboardContainer}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className={notionClasses.header.title}>Vehicles</h1>
            <p className={notionClasses.header.subtitle}>
              Track all your vehicles and their maintenance history in one
              place.
            </p>
          </div>

          {items.length > 0 && loading === false && (
            <CreateButton
              onClick={() => setShowModal(true)}
              buttonText="+ New Vehicle"
              className="w-full sm:w-auto"
            />
          )}
        </div>

        {/* Search */}
        {items.length > 0 && (
          <div className="mb-6">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search vehicles..."
              className={notionClasses.input}
            />
          </div>
        )}

        {/* Table */}
        {loading ? (
          <p className="text-sm text-[#787774]">Loading vehicles...</p>
        ) : items.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-[#E0E0E0] rounded-xl bg-white shadow-sm">
            <p className="text-sm text-[#787774] mb-4">No vehicles yet.</p>
            <div className="flex justify-center">
              <CreateButton 
                onClick={() => setShowModal(true)}
                buttonText="+ New Vehicle"
              />
            </div>
          </div>
        ) : (
          <>
            {/* Items Per Page and Total Count */}
            <div className="flex items-center justify-between px-6 py-4 bg-gray-50 rounded-t-xl border border-[#E0E0E0]">
              <div className="text-sm text-[#787774]">
                Total:{" "}
                <span className="font-semibold text-[#37352F]">
                  {filtered.length}
                </span>{" "}
                vehicles
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
                    <th className={notionClasses.table.header}>Vehicle</th>
                    <th className={notionClasses.table.header}>Plate</th>
                    <th className={notionClasses.table.header}>Customer</th>
                    <th className={notionClasses.table.header}>Total Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((item) => (
                    <tr
                      key={item.id}
                      className="border-t border-[#E0E0E0] hover:bg-blue-50 hover:border-l-4 hover:border-l-blue-400 transition-all duration-150 cursor-pointer"
                      onClick={() => {
                        navigate(`/vehicles/${item.id}`);
                      }}
                    >
                      <td className={notionClasses.table.cell}>
                        {item.year} {item.make} {item.model}
                      </td>
                      <td className={notionClasses.table.cell}>{item.plate}</td>
                      <td className={notionClasses.table.cell}>
                        {customers[item.customerId] || "-"}
                      </td>
                      <td className={notionClasses.table.cell}>
                        {totalHoursMap[item.id] || "0h 0m"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Card list (mobile) */}
            <div className="sm:hidden divide-y divide-[#E0E0E0] border border-[#E0E0E0] border-t-0 bg-white shadow-sm">
              {paginatedData.map((item) => (
                <div
                  key={item.id}
                  onClick={() => navigate(`/vehicles/${item.id}`)}
                  className="flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-colors hover:bg-blue-50 active:bg-blue-100"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-sm font-semibold text-[#37352F] truncate">
                        {[item.year, item.make, item.model]
                          .filter(Boolean)
                          .join(" ") || "-"}
                      </span>
                      <span className="shrink-0 rounded-md bg-[#F7F6F3] px-2 py-0.5 text-xs font-medium text-[#787774]">
                        {totalHoursMap[item.id] || "0h 0m"}
                      </span>
                    </div>
                    <div className="mt-1.5 space-y-1">
                      {item.plate && (
                        <p className="flex items-center gap-2 text-xs text-[#787774]">
                          <Hash className="h-3.5 w-3.5 shrink-0 text-[#9B9A97]" />
                          <span className="truncate">{item.plate}</span>
                        </p>
                      )}
                      <p className="flex items-center gap-2 text-xs text-[#787774]">
                        <User className="h-3.5 w-3.5 shrink-0 text-[#9B9A97]" />
                        <span className="truncate">
                          {customers[item.customerId] || "-"}
                        </span>
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-[#9B9A97]" />
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-4 bg-gray-50 rounded-b-xl border border-t-0 border-[#E0E0E0]">
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

        {showModal && (
          <CreateVehicleModal
            businessId={businessId}
            customers={customers}
            onClose={() => setShowModal(false)}
            onCreated={(newItem) => {
              setItems((p) => [newItem, ...p]);
              setTotalHoursMap((p) => ({ ...p, [newItem.id]: "0h 0m" }));
            }}
          />
        )}
      </div>
    </div>
  );
}
