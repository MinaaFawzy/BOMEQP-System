import { Clock, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import './PendingAccountScreen.css';

const PendingAccountScreen = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Clock className="text-amber-600" size={40} />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Account Pending Approval</h1>
        <p className="text-gray-600 mb-6">
          Your account is currently pending approval. Please wait for an administrator to review and approve your account.
        </p>
        <p className="text-sm text-gray-500 mb-6">
          You will be notified once your account has been approved.
        </p>
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
