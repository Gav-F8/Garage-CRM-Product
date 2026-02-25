import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from '../firebase';
import { NavigationBar } from '../components/NavigationBar';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, ArrowRight, Lock, Mail } from "lucide-react"
import { notionClasses } from '@/lib/notion-theme';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Fetch user role from Firestore
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        const role = userData.role;

        if (role === 'business') {
          navigate('/business/home');
        } else if (role === 'employee') {
          navigate('/employee/home');
        } else {
          // Default fallback if role is undefined or unknown
          console.warn("User has no role or unknown role:", role);
          navigate('/Home');
        }
      } else {
        console.error("No such user document!");
        setError('User profile not found. Please contact support.');
      }
    } catch (err) {
      console.error(err);
      setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={notionClasses.pageContainer}>
      <NavigationBar />
      
      <div className={notionClasses.container}>
        <div className={notionClasses.cardContainer}>
          
          {/* Header Section */}
          <div className="text-center space-y-4">
            <div className={notionClasses.iconContainer}>
              <svg 
                className="w-8 h-8 text-[#37352F]" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-[#37352F]">
              Welcome back
            </h1>
            <p className="text-[#787774] text-base">
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
                    className={notionClasses.input}
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
                    className={notionClasses.input}
                  />
                </div>
              </div>

              {error && (
                <div className={notionClasses.errorBox}>
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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
