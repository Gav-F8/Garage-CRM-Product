import { useEffect, useState } from "react";
import {
  getDocs,
  query,
  collection,
  orderBy,
} from "firebase/firestore";
import { db } from "/src/firebase.js";

// Context for fetching customer data for the current business. Returns list of customers with loading/error state.
export function useCustomersForCurrentUser(businessId) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!businessId) {
      setLoading(false);
      return;
    }

    const loadCustomers = async () => {
      try {
        const cacheKey = `customers_${businessId}`;
        const cached = localStorage.getItem(cacheKey);

        if (cached) {
          setCustomers(JSON.parse(cached));
          setLoading(false);
          return;
        }

        const customersSnap = await getDocs(
          query(
            collection(db, "businesses", businessId, "Customers"),
            orderBy("name")
          )
        );
        
        const customersData = customersSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        localStorage.setItem(cacheKey, JSON.stringify(customersData));
        setCustomers(customersData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadCustomers();
  }, [businessId]);

  return { customers, loading, error };
}