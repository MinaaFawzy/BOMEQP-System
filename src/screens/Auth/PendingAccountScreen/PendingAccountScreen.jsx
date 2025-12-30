import { Clock, LogOut, Building2, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useEffect, useState } from 'react';
import './PendingAccountScreen.css';

const PendingAccountScreen = () => {
  const { logout, user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [rejectionReason, setRejectionReason] = useState(null);

  useEffect(() => {
    // Check if user status changed to active
    if (user?.status === 'active') {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    // Listen for notifications (if implemented)
    // This would typically be handled by a notification context
    // For now, we'll refresh user data periodically
    const interval = setInterval(() => {
      refreshUser();
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [refreshUser]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isTrainingCenter = user?.role === 'training_center_admin';
  const isACC = user?.role === 'acc_admin';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        {rejectionReason ? (
          <>
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Clock className="text-red-600" size={40} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Application Rejected</h1>
            <p className="text-gray-600 mb-4">
              Your {isTrainingCenter ? 'Training Center' : 'ACC'} application has been rejected.
            </p>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-left">
              <p className="text-sm font-semibold text-red-800 mb-2">Rejection Reason:</p>
              <p className="text-sm text-red-700">{rejectionReason}</p>
            </div>
          </>
        ) : (
          <>
            <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
              {isTrainingCenter ? (
                <Building2 className="text-amber-600" size={40} />
              ) : (
                <Shield className="text-amber-600" size={40} />
              )}
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              {isTrainingCenter ? 'Training Center Application Pending' : 'Account Pending Approval'}
            </h1>
            <p className="text-gray-600 mb-4">
              {isTrainingCenter
                ? 'Your Training Center application has been submitted and is pending approval from a Group Admin.'
                : 'Your account is currently pending approval. Please wait for an administrator to review and approve your account.'}
            </p>
            <p className="text-sm text-gray-500 mb-6">
              {isTrainingCenter
                ? 'A Group Admin will review your application shortly. You will receive a notification once your application is approved or rejected.'
                : 'You will be notified once your account has been approved.'}
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm font-semibold text-blue-800 mb-1">Status: Pending Review</p>
              <p className="text-xs text-blue-700">
                {isTrainingCenter
                  ? 'Waiting for Group Admin approval'
                  : 'Waiting for administrator approval'}
              </p>
            </div>
          </>
        )}
        <button
          onClick={handleLogout}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-800 text-white rounded-lg hover:bg-primary-700 transition-colors duration-200 font-medium"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </div>
  );
};

export default PendingAccountScreen;
