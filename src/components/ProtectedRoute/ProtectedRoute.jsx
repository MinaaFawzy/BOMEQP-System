import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { setAuthToken } from '../../config/api';
import './ProtectedRoute.css';

const ProtectedRoute = ({ children, allowedRoles = [], allowPending = false }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check if user is pending/inactive (unless route allows pending users)
  // ACC Admin and Training Center Admin can access pending account screen
  const needsPendingScreen = !allowPending && 
    (user?.role === 'acc_admin' || user?.role === 'training_center_admin') &&
    user?.status !== 'active';

  if (needsPendingScreen) {
    return <Navigate to="/pending-account" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default ProtectedRoute;
