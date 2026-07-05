import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import { useAuth } from "../context/AuthContext";

export function NavigationBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { role: userRole } = useAuth();
  const [user, setUser] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        try {
          // Check owner first
          const bizQuery = query(
            collection(db, "businesses"),
            where("uid", "==", currentUser.uid),
          );
          const bizSnapshot = await getDocs(bizQuery);
          if (!bizSnapshot.empty) {
            const bizData = bizSnapshot.docs[0].data();
            setDisplayName(bizData.name || currentUser.email.split("@")[0]);
            return;
          }
          // Check mechanic
          const allBizSnapshot = await getDocs(collection(db, "businesses"));
          for (const bizDoc of allBizSnapshot.docs) {
            const empRef = doc(
              db,
              "businesses",
              bizDoc.id,
              "Employees",
              currentUser.uid,
            );
            const empDoc = await getDoc(empRef);
            if (empDoc.exists() && empDoc.data().Name) {
              setDisplayName(empDoc.data().Name);
              return;
            }
          }
        } catch (err) {
          console.error("Failed to fetch display name:", err);
        }
        // Fallback: email prefix
        setDisplayName(currentUser.email.split("@")[0]);
      } else {
        setUser(null);
        setDisplayName("");
      }
    });
    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    // Role/businessId now live on the auth token (custom claims) + AuthContext;
    // we only clear the businessId fallback cache here.
    localStorage.removeItem("ccgBusinessId");
    await signOut(auth);
    navigate("/Login");
  };

  const navLinks = [
    { name: "Home", path: "/" },
    // owner-only variants kept for future if needed
    // ...(isOwner ? [{ name: "Customers", path: "/customers" }] : []),
    // ...(isOwner ? [{ name: "Vehicles", path: "/vehicles" }] : []),
    { name: "Customers", path: "/customers" },
    { name: "Vehicles", path: "/vehicles" },
    { name: "Jobs", path: "/projects" },
  ];

  const linkClass = (path) => {
    const isActive = location.pathname === path;
    return `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
      isActive
        ? "bg-[#F7F7F5] text-[#37352F] font-semibold"
        : "text-[#787774] hover:bg-[#F7F7F5] hover:text-[#37352F]"
    }`;
  };

  return (
    <nav className="w-full bg-white border-b border-[#E0E0E0] shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Left: burger (mobile) + brand + main links */}
          <div className="flex items-center">
            {/* Mobile burger button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open menu"
              aria-expanded={mobileMenuOpen}
              className="md:hidden mr-3 inline-flex items-center justify-center rounded-md p-2 bg-transparent text-[#37352F] hover:bg-[#F7F7F5] transition-colors"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
            <div className="flex-shrink-0">
              <span className="font-bold text-lg tracking-tight text-[#37352F]">
                Garage CRM
              </span>
            </div>
            <div className="hidden md:block">
              <div className="ml-4 lg:ml-8 flex items-baseline space-x-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.name}
                    to={link.path}
                    className={linkClass(link.path)}
                  >
                    {link.name}
                  </Link>
                ))}
                {userRole === "owner" && (
                  <Link
                    to="/employees"
                    className={linkClass("/employees")}
                  >
                    Team
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Right: user info or Login */}
          <div className="hidden md:flex items-center gap-3 shrink-0 pl-4">
            {user ? (
              <>
                <span className="hidden lg:block max-w-[220px] truncate text-sm text-[#787774]">
                  Welcome,{" "}
                  <span className="font-medium text-[#37352F]">
                    {displayName}
                  </span>
                </span>
                <button
                  onClick={handleSignOut}
                  className="px-3 py-1.5 rounded-md text-sm font-medium text-white hover:bg-[#F7F7F5] hover:text-[#37352F] transition-colors"
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link to="/Login" className={linkClass("/login")}>
                Login
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Mobile drawer + backdrop */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          {/* Dark opacity backdrop — clicking it closes the drawer */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Left-side sliding panel */}
          <div className="absolute inset-y-0 left-0 w-64 max-w-[80%] bg-white shadow-xl flex flex-col">
            {/* Panel header with close button */}
            <div className="flex items-center justify-between h-14 px-4 border-b border-[#E0E0E0]">
              <span className="font-bold text-lg tracking-tight text-[#37352F]">
                Garage CRM
              </span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close menu"
                className="inline-flex items-center justify-center rounded-md p-2 bg-transparent text-[#37352F] hover:bg-[#F7F7F5] transition-colors"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Nav links */}
            <div className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  className={linkClass(link.path)}
                >
                  {link.name}
                </Link>
              ))}
              {userRole === "owner" && (
                <Link to="/employees" className={linkClass("/employees")}>
                  Team
                </Link>
              )}
            </div>

            {/* User info / auth actions */}
            <div className="border-t border-[#E0E0E0] px-4 py-4">
              {user ? (
                <div className="flex flex-col gap-3">
                  <span className="text-sm text-[#787774]">
                    Welcome,{" "}
                    <span className="font-medium text-[#37352F]">
                      {displayName}
                    </span>
                  </span>
                  <button
                    onClick={handleSignOut}
                    className="w-full px-3 py-1.5 rounded-md text-sm font-medium text-white transition-colors"
                  >
                    Sign out
                  </button>
                </div>
              ) : (
                <Link to="/Login" className={linkClass("/login")}>
                  Login
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

export default NavigationBar;