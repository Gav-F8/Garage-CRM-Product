import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createUserWithEmailAndPassword, deleteUser } from 'firebase/auth';
import { setDoc, collection, doc, getDocs } from "firebase/firestore"; // collection still needed for businesses ref
import { auth, db } from '../firebase';
import { NavigationBar } from '../components/NavigationBar';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, ArrowRight, Lock, Mail, User, Building2 } from "lucide-react"
import { notionClasses } from '@/lib/notion-theme';

export default function SignupPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('employee');
  const [businessName, setBusinessName] = useState('');
  const [selectedBusinessId, setSelectedBusinessId] = useState('');
  const [businesses, setBusinesses] = useState([]);
  const [loadingBusinesses, setLoadingBusinesses] = useState(false);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (role !== 'employee') return;
    setLoadingBusinesses(true);
    getDocs(collection(db, "businesses"))
      .then((snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setBusinesses(list);
      })
      .catch((err) => console.error("Failed to load businesses:", err))
      .finally(() => setLoadingBusinesses(false));
  }, [role]);

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!firstName.trim() || !lastName.trim()) {
      setError('Please enter your first and last name.');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password should be at least 6 characters.');
      setLoading(false);
      return;
    }

    if (role === 'business' && !businessName.trim()) {
      setError('Please enter your business name.');
      setLoading(false);
      return;
    }

    if (role === 'employee' && !selectedBusinessId) {
      setError('Please select a business.');
      setLoading(false);
      return;
    }

    const fullName = `${firstName.trim()} ${lastName.trim()}`;
    let userCredential = null;

    try {
      userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const timestamp = new Date().toISOString();

      if (role === 'business') {
        const generatedJoinCode = Math.random().toString(36).substring(2, 8).toUpperCase();

        // Creating this business document triggers the onBusinessCreated Cloud
        // Function, which sets this user's { role: "owner", businessId } custom
        // claim. The claim is read on the client via AuthContext after login.
        const businessRef = doc(collection(db, "businesses"));
        await setDoc(businessRef, {
          uid: user.uid,
          name: businessName.trim(),
          email: user.email,
          phone: "",
          joinCode: generatedJoinCode,
          createdAt: timestamp,
          updatedAt: timestamp,
        });

        // Create owner entry in Employees subcollection, using uid as document ID
        const ownerEmployeeRef = doc(db, "businesses", businessRef.id, "Employees", user.uid);
        await setDoc(ownerEmployeeRef, {
          uid: user.uid,
          businessId: businessRef.id,
          Name: fullName,
          email: user.email,
          phone: "",
          role: "owner",
          status: "active",
          createdAt: timestamp,
          updateAt: timestamp,
        });

      } else {
        // Use uid as document ID so rules can verify identity
        const employeeRef = doc(db, "businesses", selectedBusinessId, "Employees", user.uid);
        await setDoc(employeeRef, {
          uid: user.uid,
          businessId: selectedBusinessId,
          Name: fullName,
          email: user.email,
          phone: "",
          role: "mechanic",
          status: "pendingApproval",
          createdAt: timestamp,
          updateAt: timestamp,
        });

      }

      await auth.signOut();
      navigate('/Login');
    } catch (err) {
      console.error(err);

      if (userCredential && userCredential.user) {
        try {
          await deleteUser(userCredential.user);
        } catch (rollbackErr) {
          console.error("Failed to rollback user creation:", rollbackErr);
        }
      }

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
        <div className={`${notionClasses.cardContainer} pt-8`}>

          <div className="text-center space-y-4">
            <div className={notionClasses.iconContainer}>
              <svg className="w-8 h-8 text-[#37352F]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#37352F] whitespace-nowrap">Create an account</h1>
            <p className="text-[#787774] text-base">Enter your details to get started</p>
          </div>

          <div className={notionClasses.card}>
            <form onSubmit={handleSignup} className="space-y-5">

              {/* First + Last name side by side */}
              <div className="flex gap-3">
                <div className="space-y-2 flex-1">
                  <Label htmlFor="firstName" className={notionClasses.label}>First Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-[#9B9A97]" />
                    <Input
                      id="firstName"
                      type="text"
                      placeholder="John"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      className={`${notionClasses.input} !pl-10`}
                    />
                  </div>
                </div>
                <div className="space-y-2 flex-1">
                  <Label htmlFor="lastName" className={notionClasses.label}>Last Name</Label>
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Smith"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className={notionClasses.input}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className={notionClasses.label}>Email</Label>
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
                <Label htmlFor="password" className={notionClasses.label}>Password</Label>
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

              <div className="space-y-2">
                <Label htmlFor="role" className={notionClasses.label}>I am a...</Label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-[#9B9A97]" />
                  <select
                    id="role"
                    value={role}
                    onChange={(e) => { setRole(e.target.value); setSelectedBusinessId(''); setBusinessName(''); }}
                    className={`${notionClasses.input} !pl-10 w-full appearance-none bg-white`}
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

              {role === 'business' && (
                <div className="space-y-2">
                  <Label htmlFor="businessName" className={notionClasses.label}>Business Name</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-[#9B9A97]" />
                    <Input
                      id="businessName"
                      type="text"
                      placeholder="e.g. Classic Cars Garage"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      className={`${notionClasses.input} !pl-10`}
                    />
                  </div>
                </div>
              )}

              {role === 'employee' && (
                <div className="space-y-2">
                  <Label htmlFor="business" className={notionClasses.label}>Select Business</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-[#9B9A97]" />
                    {loadingBusinesses ? (
                      <div className={`${notionClasses.input} flex items-center text-[#9B9A97]`}>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading businesses...
                      </div>
                    ) : (
                      <select
                        id="business"
                        value={selectedBusinessId}
                        onChange={(e) => setSelectedBusinessId(e.target.value)}
                        className={`${notionClasses.input} !pl-10 w-full appearance-none bg-white`}
                      >
                        <option value="" disabled>Select your business...</option>
                        {businesses.map((b) => (
                          <option key={b.id} value={b.id}>{b.name || b.email}</option>
                        ))}
                      </select>
                    )}
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[#37352F]">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className={notionClasses.errorBox}>
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </div>
              )}

              <Button type="submit" className={notionClasses.button} disabled={loading}>
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

          <p className="text-center text-sm text-[#787774]">
            Already have an account?{' '}
            <Link to="/Login" className={notionClasses.link}>Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
