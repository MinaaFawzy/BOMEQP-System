import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { accAPI } from '../../../services/api';
import { Users, Building2, Award, Clock, CheckCircle, ArrowRight } from 'lucide-react';
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
            <div 
              onClick={() => {
                navigate('/acc/training-centers?filter=pending');
              }}
              className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl shadow-lg p-4 border border-yellow-200 hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                  <Clock className="text-white w-6 h-6" />
                </div>
                <ArrowRight className="text-yellow-600 w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
              <div>
                <p className="text-xs font-medium text-yellow-700 mb-1">Pending Requests</p>
                <p className="text-2xl font-bold text-yellow-900 mb-1">
                  {(dashboardData.pending_requests?.training_centers || 0) + (dashboardData.pending_requests?.instructors || 0)}
                </p>
                <p className="text-xs text-yellow-600">Click to view details</p>
              </div>
            </div>

            {/* Active Training Centers Card */}
            <div 
              onClick={() => navigate('/acc/training-centers?filter=active')}
              className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-lg p-4 border border-green-200 hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                  <Building2 className="text-white w-6 h-6" />
                </div>
                <ArrowRight className="text-green-600 w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
              <div>
                <p className="text-xs font-medium text-green-700 mb-1">Active Training Centers</p>
                <p className="text-2xl font-bold text-green-900 mb-1">
                  {dashboardData.active_training_centers || 0}
                </p>
                <p className="text-xs text-green-600">Click to view details</p>
              </div>
            </div>

            {/* Active Instructors Card */}
            <div 
              onClick={() => navigate('/acc/instructors?filter=active')}
              className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow-lg p-4 border border-purple-200 hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                  <Users className="text-white w-6 h-6" />
                </div>
                <ArrowRight className="text-purple-600 w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
              <div>
                <p className="text-xs font-medium text-purple-700 mb-1">Active Instructors</p>
                <p className="text-2xl font-bold text-purple-900 mb-1">
                  {dashboardData.active_instructors || 0}
                </p>
                <p className="text-xs text-purple-600">Click to view details</p>
              </div>
            </div>

            {/* Certificates Generated Card */}
            <div 
              onClick={() => navigate('/acc/certificates')}
              className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl shadow-lg p-4 border border-amber-200 hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                  <Award className="text-white w-6 h-6" />
                </div>
                <ArrowRight className="text-amber-600 w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
              <div>
                <p className="text-xs font-medium text-amber-700 mb-1">Certificates Generated</p>
                <p className="text-2xl font-bold text-amber-900 mb-1">
                  {dashboardData.certificates_generated || 0}
                </p>
                <p className="text-xs text-amber-600">Click to view details</p>
              </div>
            </div>
          </div>

          {/* Revenue Section */}
          {dashboardData.revenue && (
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Revenue Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-600 mb-1">Monthly Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${dashboardData.revenue.monthly || '0.00'}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-600 mb-1">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${dashboardData.revenue.total || '0.00'}
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
