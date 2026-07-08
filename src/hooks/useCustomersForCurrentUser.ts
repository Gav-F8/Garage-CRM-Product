import { useEffect, useState } from "react";
import { fetchCustomers } from "../lib/firestore-helpers";
import { readCustomersCache, writeCustomersCache } from "../lib/cache";
import type { WithId, Customer } from "@/types/firestore";

// Fetches the customer list for the current business, backed by a short-lived
// localStorage cache (see src/lib/cache.ts). The cache is invalidated by the
// create/update/delete flows, and additionally self-heals via a TTL.
export function useCustomersForCurrentUser(businessId: string | null | undefined) {
  const [customers, setCustomers] = useState<WithId<Customer>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!businessId) {
      setCustomers([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadCustomers = async () => {
      try {
        const cached = readCustomersCache(businessId);
        if (cached) {
          if (!cancelled) {
            setCustomers(cached);
            setLoading(false);
          }
          return;
        }

        const customersData = await fetchCustomers(businessId);
        if (cancelled) return;

        writeCustomersCache(businessId, customersData);
        setCustomers(customersData);
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    setLoading(true);
    loadCustomers();

    return () => {
      cancelled = true;
    };
  }, [businessId]);

  return { customers, loading, error };
}
