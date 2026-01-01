import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { accAPI } from '../../../services/api';
import { Users, Building2, Clock, DollarSign } from 'lucide-react';
import DashboardCard from '../../../components/DashboardCard/DashboardCard';
import './DashboardScreen.css';

const ACCDashboardScreen = () => {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const data = await accAPI.getDashboard();
      setDashboardData(data);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-[var(--primary-color)]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {dashboardData && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Pending Requests Card */}
            <DashboardCard
              icon={DollarSign}
              colorType="acc"
              label="Total Revenue"
              value={`$${(dashboardData.revenue?.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              hint="Click to view details"
              onClick={() => navigate('/acc/payment-transactions')}
            />
            
            <DashboardCard
              icon={Clock}
              colorType="classes"
              label="Pending Requests"
              value={dashboardData.pending_requests || 0}
              hint="Click to view details"
              onClick={() => navigate('/acc/training-centers?filter=pending')}
            />

            {/* Active Training Centers Card */}
            <DashboardCard
              icon={Building2}
              colorType="instructors"
              label="Active Training Centers"
              value={dashboardData.active_training_centers || 0}
              hint="Click to view details"
              onClick={() => navigate('/acc/training-centers?filter=active')}
            />

            {/* Active Instructors Card */}
            <DashboardCard
              icon={Users}
              colorType="certificates"
              label="Active Instructors"
              value={dashboardData.active_instructors || 0}
              hint="Click to view details"
              onClick={() => navigate('/acc/instructors?filter=active')}
            />

            {/* Total Revenue Card */}
            
          </div>

          {/* Revenue Section */}
          {dashboardData.revenue && (
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Revenue Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-600 mb-1">Monthly Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${(dashboardData.revenue?.monthly || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ACCDashboardScreen;
