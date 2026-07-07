import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  // Still resolving auth + custom claims — render nothing so we never flash
  // protected (or role-gated) UI before the user's role/businessId are known.
  if (loading) return null;

  // Not logged in → redirect to login.
  if (!user) return <Navigate to="/Login" replace />;

  return children;
}
