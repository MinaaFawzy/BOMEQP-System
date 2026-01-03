import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../../../services/api';
import { useHeader } from '../../../context/HeaderContext';
import { Building2, DollarSign, School, Users } from 'lucide-react';
import DashboardCard from '../../../components/DashboardCard/DashboardCard';
import './GroupAdminDashboard.css';

const GroupAdminDashboard = () => {
  const { setHeaderTitle, setHeaderSubtitle } = useHeader();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    setHeaderTitle(null);
    setHeaderSubtitle(null);
    return () => {
      setHeaderTitle(null);
      setHeaderSubtitle(null);
    };
  }, [setHeaderTitle, setHeaderSubtitle]);

  const loadDashboard = async () => {
    try {
      // Use the dedicated dashboard endpoint
      const data = await adminAPI.getDashboard();
      
      // API returns: accreditation_bodies, training_centers, instructors, revenue { monthly, total }
      setDashboard({
        accreditation_bodies: data.accreditation_bodies || 0,
        training_centers: data.training_centers || 0,
        instructors: data.instructors || 0,
        revenue: data.revenue || { monthly: 0, total: 0 },
      });
    } catch (error) {
      console.error('Failed to load dashboard:', error);
      // Set empty dashboard to prevent rendering errors
      setDashboard({
        accreditation_bodies: 0,
        training_centers: 0,
        instructors: 0,
        revenue: { monthly: 0, total: 0 },
      });
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

      {dashboard && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Revenue Card - First */}
            <DashboardCard
              icon={DollarSign}
              colorType="acc"
              label="Commission Revenue"
              value={`$${(dashboard.revenue?.total || 0).toLocaleString()}`}
              hint="Total commission received"
              onClick={() => navigate('/admin/payment-transactions')}
            />

            {/* Accreditation Bodies Card */}
            <DashboardCard
              icon={Building2}
              colorType="instructors"
              label="Accreditation Bodies"
              value={dashboard.accreditation_bodies || 0}
              hint="Click to view details"
              onClick={() => navigate('/admin/all-accs')}
            />

            {/* Training Centers Card */}
            <DashboardCard
              icon={School}
              colorType="certificates"
              label="Training Centers"
              value={dashboard.training_centers || 0}
              hint="Click to view details"
              onClick={() => navigate('/admin/all-training-centers')}
            />

            {/* Instructors Card */}
            <DashboardCard
              icon={Users}
              colorType="classes"
              label="Instructors"
              value={dashboard.instructors || 0}
              hint="Click to view details"
              onClick={() => navigate('/admin/all-instructors')}
            />
          </div>

          {/* Revenue Section */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Revenue Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-600 mb-1">💰 Monthly Commission</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${(dashboard.revenue?.monthly || 0).toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 mt-1">Commission this month</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-600 mb-1">💰 Total Commission</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${(dashboard.revenue?.total || 0).toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 mt-1">Total commission received</p>
              </div>
            </div>
          </div>
        </>
      )}

    </div>
  );
};

export default GroupAdminDashboard;
