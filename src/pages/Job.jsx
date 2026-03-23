import { useEffect, useState } from "react";
import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import { auth, db } from "/src/firebase.js";
import { NavigationBar } from "../components/NavigationBar";
import JobCreation from "../components/JobCreation";
import { notionClasses } from "../lib/notion-theme";

async function fetchBusinessId(userUid) {
  const snap = await getDocs(
    query(collection(db, "businesses"), where("uid", "==", userUid)),
  );
  if (snap.empty) return null;
  return snap.docs[0].id;
}

async function fetchCustomers(businessId) {
  const snap = await getDocs(
    query(
      collection(db, "businesses", businessId, "Customers"),
      orderBy("name"),
    ),
  );

  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

async function fetchVehicles(businessId) {
  const snap = await getDocs(
    query(
      collection(db, "businesses", businessId, "storage"),
      orderBy("createdAt", "desc"),
    ),
  );

  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

export default function JobPage() {
  const [businessId, setBusinessId] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const bizId = await fetchBusinessId(user.uid);
        setBusinessId(bizId);

        if (!bizId) {
          setLoading(false);
          return;
        }

        const [customerList, vehicleList] = await Promise.all([
          fetchCustomers(bizId),
          fetchVehicles(bizId),
        ]);

        setCustomers(customerList);
        setVehicles(vehicleList);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleJobSubmit = async (payload) => {
    setSubmitting(true);

    // This form currently handles UI + state management.
    // Hook Firestore addDoc logic here when the Jobs collection schema is finalized.
    console.log("Job form payload:", {
      businessId,
      ...payload,
    });

    setSubmitMessage(
      "Job form submitted. Ready to connect to Firestore persistence.",
    );
    setSubmitting(false);
  };

  return (
    <div className={notionClasses.pageContainer}>
      <NavigationBar />

      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-[#37352F]">Job Creation</h1>
          <p className="mt-1 text-sm text-[#787774]">
            Create a new repair job by selecting an existing customer and one of
            their vehicles.
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-[#787774]">
            Loading customers and vehicles...
          </p>
        ) : (
          <>
            <JobCreation
              customers={customers}
              vehicles={vehicles}
              submitting={submitting}
              onSubmit={handleJobSubmit}
            />

            {submitMessage && (
              <p className="mt-4 text-sm text-green-700">{submitMessage}</p>
            )}
          </>
        )}
      </main>
    </div>
  );
}
