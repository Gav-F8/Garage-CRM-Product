import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { onAuthStateChanged, getIdTokenResult, type User } from "firebase/auth";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { auth, db } from "../firebase";

/**
 * Global auth context — the single source of truth for who the current user is,
 * what their role is, and which business they belong to.
 *
 * `role` and `businessId` come from the Firebase Auth **custom claims** set
 * server-side by the Cloud Functions in `functions/index.js`. The client never
 * trusts a localStorage role anymore — that value could be edited by anyone.
 *
 * Backwards-compatible fallbacks (used only when a claim is missing, e.g. for
 * users created before the triggers were deployed and before the backfill
 * script has run):
 *   - businessId: the `ccgBusinessId` localStorage cache, then an owner lookup.
 *   - role: a single scoped read of the user's own Employees doc.
 * These fallbacks vanish for any user the triggers/backfill have touched.
 */
export interface AuthState {
  user: User | null;
  role: "owner" | "mechanic" | null;
  businessId: string | null;
  /** true until the first auth + claims resolution */
  loading: boolean;
}

const DEFAULT_STATE: AuthState = {
  user: null,
  role: null,
  businessId: null,
  loading: true,
};

const AuthContext = createContext<AuthState>(DEFAULT_STATE);

/** Owner lookup fallback: businesses where uid == current user. */
async function deriveBusinessId(uid: string): Promise<string | null> {
  // Prefer the cached id written at login to avoid an extra query.
  const cached = localStorage.getItem("ccgBusinessId");
  if (cached) return cached;

  try {
    const snap = await getDocs(query(collection(db, "businesses"), where("uid", "==", uid)));
    if (!snap.empty) return snap.docs[0].id;
  } catch (err) {
    console.error("AuthContext: deriveBusinessId failed", err);
  }
  return null;
}

/** Role fallback: read the user's own Employees doc (scoped, single read). */
async function deriveRole(businessId: string, uid: string): Promise<"owner" | "mechanic" | null> {
  try {
    const empSnap = await getDoc(doc(db, "businesses", businessId, "Employees", uid));
    if (empSnap.exists()) {
      return empSnap.data().role === "owner" ? "owner" : "mechanic";
    }
  } catch (err) {
    console.error("AuthContext: deriveRole failed", err);
  }
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(DEFAULT_STATE);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setState({ user: null, role: null, businessId: null, loading: false });
        return;
      }

      try {
        const token = await getIdTokenResult(user);
        let role = (token.claims.role as "owner" | "mechanic" | undefined) || null;
        let businessId = (token.claims.businessId as string | undefined) || null;

        if (!businessId) {
          businessId = await deriveBusinessId(user.uid);
        }
        if (businessId && !role) {
          role = await deriveRole(businessId, user.uid);
        }

        // Keep the cache warm so subsequent sessions / the fallback path are fast.
        if (businessId) localStorage.setItem("ccgBusinessId", businessId);

        setState({ user, role, businessId, loading: false });
      } catch (err) {
        console.error("AuthContext: failed to resolve auth state", err);
        setState({
          user,
          role: null,
          businessId: localStorage.getItem("ccgBusinessId") || null,
          loading: false,
        });
      }
    });

    return () => unsubscribe();
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

/** Access the current auth state. */
export function useAuth(): AuthState {
  return useContext(AuthContext);
}

export default AuthContext;
