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

export function NavigationBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [userRole, setUserRole] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setUserRole(localStorage.getItem("ccgUserRole") || "");
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
        setUserRole("");
      }
    });
    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    localStorage.removeItem("ccgBusinessId");
    localStorage.removeItem("ccgUserRole");
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
          {/* Left: brand + main links */}
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="font-bold text-lg tracking-tight text-[#37352F]">
                Garage CRM
              </span>
            </div>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-1">
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
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                <span className="text-sm text-[#787774]">
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
    </nav>
  );
}

export default NavigationBar;