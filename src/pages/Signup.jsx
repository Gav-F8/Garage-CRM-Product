import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, collection, updateDoc } from "firebase/firestore";
import { auth, db } from '../firebase';
import { NavigationBar } from '../components/NavigationBar';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, ArrowRight, Lock, Mail, User } from "lucide-react"
import { notionClasses } from '@/lib/notion-theme';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('employee'); // Default role
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Create user document in Firestore with role
      const timestamp = new Date().toISOString();
      const userData = {
        uid: user.uid,
        email: user.email,
        role: role,
        createdAt: timestamp,
        profileId: "" // Will be updated when profile is created
      };

      await setDoc(doc(db, "users", user.uid), userData);

      // 3. Create role-specific profile document
      if (role === 'business') {
        const businessData = {
          uid: user.uid,
          name: "", // To be filled later
          email: user.email,
          phone: "",
          createdAt: timestamp
        };
        const businessRef = doc(collection(db, "businesses"));
        await setDoc(businessRef, businessData);
        
        // Update user with profileId
        await updateDoc(doc(db, "users", user.uid), {
          profileId: businessRef.id
        });
      } else {
        const employeeData = {
          uid: user.uid,
          businessId: "", // To be assigned later
          name: "", // To be filled later
          email: user.email,
          createdAt: timestamp
        };
        const employeeRef = doc(collection(db, "employees"));
        await setDoc(employeeRef, employeeData);

        // Update user with profileId
        await updateDoc(doc(db, "users", user.uid), {
          profileId: employeeRef.id
        });
      }
      
      // Sign out the user so they have to log in manually
      await auth.signOut();
      
      // Navigate to login page
      navigate('/Login');
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setError('Email is already in use.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters.');
      } else {
        setError('Failed to create account. Please try again.');
      }
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#37352F] whitespace-nowrap">
              Create an account
            </h1>
            <p className="text-[#787774] text-base">
              Enter your details to get started
            </p>
          </div>

          {/* Form Section */}
          <div className={notionClasses.card}>
            <form onSubmit={handleSignup} className="space-y-5">
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
                <Label htmlFor="password" className={notionClasses.label}>
                  Password
                </Label>
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

              <div className="space-y-2">
                <Label htmlFor="role" className={notionClasses.label}>
                  I am a...
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-[#9B9A97]" />
                  <select
                    id="role"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className={`${notionClasses.input} w-full appearance-none bg-white`}
                  >
                    <option value="employee">Employee</option>
                    <option value="business">Business Owner</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[#37352F]">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
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
                    Sign up <ArrowRight className="ml-2 h-4 w-4" />
                  </span>
                )}
              </Button>
            </form>
          </div>

          {/* Footer */}
          <p className="text-center text-sm text-[#787774]">
            Already have an account?{' '}
            <Link to="/Login" className={notionClasses.link}>
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
