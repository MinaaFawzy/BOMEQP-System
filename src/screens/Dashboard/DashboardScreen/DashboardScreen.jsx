import { useAuth } from '../../../context/AuthContext';
import GroupAdminDashboard from '../../GroupAdmin/GroupAdminDashboard/GroupAdminDashboard';
import ACCDashboardScreen from '../../ACCAdmin/DashboardScreen/DashboardScreen';
import TrainingCenterDashboardScreen from '../../TrainingCenter/DashboardScreen/DashboardScreen';
import InstructorDashboardScreen from '../../Instructor/DashboardScreen/DashboardScreen';
import './DashboardScreen.css';

const DashboardScreen = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-[var(--primary-color)]"></div>
      </div>
    );
  }

  // Render the appropriate dashboard based on role
  switch (user?.role) {
    case 'group_admin':
      return <GroupAdminDashboard />;
    case 'acc_admin':
      return <ACCDashboardScreen />;
    case 'training_center_admin':
      return <TrainingCenterDashboardScreen />;
    case 'instructor':
      return <InstructorDashboardScreen />;
    default:
      return (
        <div className="flex justify-center items-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome!</h1>
            <p className="text-gray-600">Please wait while we load your dashboard...</p>
          </div>
        </div>
      );
  }
};

export default DashboardScreen;
