import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import { NavigationBar } from "../components/NavigationBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowRight, Lock, Mail } from "lucide-react";
import { notionClasses } from "@/lib/notion-theme";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (password.length < 6) {
      setError("Password should be at least 6 characters.");
      setLoading(false);
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const user = userCredential.user;

      // 1. Check if owner: businesses where uid == user.uid
      const bizQuery = query(
        collection(db, "businesses"),
        where("uid", "==", user.uid),
      );
      const bizSnapshot = await getDocs(bizQuery);
      if (!bizSnapshot.empty) {
        const businessId = bizSnapshot.docs[0].id;

        // Role now comes from the Firebase Auth custom claim (set by the
        // onBusinessCreated / onEmployeeWritten Cloud Functions), read via
        // AuthContext. `ccgBusinessId` is kept only as a fast fallback cache —
        // AuthContext prefers the businessId claim when present.
        localStorage.setItem("ccgBusinessId", businessId);

        // Force a token refresh so the freshly-loaded claims are available to
        // AuthContext immediately, without requiring a second login.
        await user.getIdToken(true);

        navigate("/home");
        return;
      }

      // 2. Check if mechanic: look for Employees/{uid} doc in any business
      const allBizSnapshot = await getDocs(collection(db, "businesses"));
      for (const bizDoc of allBizSnapshot.docs) {
        const empRef = doc(db, "businesses", bizDoc.id, "Employees", user.uid);
        const empDoc = await getDoc(empRef);
        if (empDoc.exists()) {
          const empData = empDoc.data();
          const empStatus = empData.status;

          if (empStatus === "pendingApproval") {
            await auth.signOut();
            setError(
              "Your account is pending approval. Please wait for the owner to activate your account.",
            );
            return;
          }

          if (empStatus === "rejected") {
            await auth.signOut();
            setError(
              "Your account request has been declined. Please contact the business owner.",
            );
            return;
          }

          if (empStatus === "suspended") {
            await auth.signOut();
            setError(
              "Your account has been suspended. Please contact the business owner.",
            );
            return;
          }

          // Role is sourced from the custom claim (set when the owner approved
          // this employee). Keep businessId as a fallback cache only.
          localStorage.setItem("ccgBusinessId", bizDoc.id);

          // Refresh so the approval claim (role/businessId) is on the token now.
          await user.getIdToken(true);

          navigate("/home");
          return;
        }
      }

      // No employee doc found
      setError('Account not found. Please Sign Up again.');
    } catch (err) {
      console.error(err);
      if (
        err.code === "auth/user-not-found" ||
        err.code === "auth/wrong-password" ||
        err.code === "auth/invalid-credential"
      ) {
        setError("Invalid email or password");
      } else if (err.code === "auth/too-many-requests") {
        setError("Too many failed login attempts. Please try again later.");
      } else {
        setError('Login failed: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={notionClasses.pageContainer}>
      <NavigationBar />

      <div className={notionClasses.container}>
        <div className={`${notionClasses.cardContainer} pt-8`}>
          {/* Header Section */}
          <div className="text-center space-y-4">
            <div className={notionClasses.iconContainer}>
              <svg
                className="w-8 h-8 text-[#37352F]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-[#37352F]">
              Welcome back
            </h1>
            <p className="mt-3 max-w-md mx-auto text-base text-[#787774] sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
              Enter your credentials to access the workspace
            </p>
          </div>

          {/* Form Section */}
          <div className={notionClasses.card}>
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className={notionClasses.label}>
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-[#9B9A97]" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className={`${notionClasses.input} !pl-10`}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className={notionClasses.label}>
                    Password
                  </Label>
                  <a href="#" className={notionClasses.subLink}>
                    Forgot password?
                  </a>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-[#9B9A97]" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className={`${notionClasses.input} !pl-10`}
                  />
                </div>
              </div>

              {error && (
                <div className={notionClasses.errorBox}>
                  <svg
                    className="w-4 h-4 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  {error}
                </div>
              )}

              <Button 
                type="submit" 
                className={notionClasses.button}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <span className="flex items-center">
                    Log in <ArrowRight className="ml-2 h-4 w-4" />
                  </span>
                )}
              </Button>
            </form>
          </div>

          {/* Footer */}
          <p className="text-center text-sm text-[#787774]">
            Don't have an account?{' '}
            <Link to="/Signup" className={notionClasses.link}>
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
