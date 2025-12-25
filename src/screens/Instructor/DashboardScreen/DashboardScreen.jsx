import { useEffect, useState } from 'react';
import { instructorAPI } from '../../../services/api';
import { useHeader } from '../../../context/HeaderContext';
import { Users, BookOpen, DollarSign, FileText } from 'lucide-react';
import './DashboardScreen.css';

const InstructorDashboardScreen = () => {
  const { setHeaderTitle, setHeaderSubtitle } = useHeader();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    setHeaderTitle('Instructor Dashboard');
    setHeaderSubtitle('Welcome to your dashboard');
    return () => {
      setHeaderTitle(null);
      setHeaderSubtitle(null);
    };
  }, [setHeaderTitle, setHeaderSubtitle]);

  const loadDashboard = async () => {
    try {
      const data = await instructorAPI.getDashboard();
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-white to-blue-50 rounded-xl shadow-lg p-6 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Active Classes</p>
                <p className="text-3xl font-bold text-gray-900">
                  {dashboardData.active_classes || 0}
                </p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <BookOpen className="text-blue-600 w-7 h-7" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-white to-green-50 rounded-xl shadow-lg p-6 border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Earnings</p>
                <p className="text-3xl font-bold text-gray-900">
                  ${dashboardData.total_earnings || '0.00'}
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <DollarSign className="text-green-600 w-7 h-7" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-white to-purple-50 rounded-xl shadow-lg p-6 border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Materials</p>
                <p className="text-3xl font-bold text-gray-900">
                  {dashboardData.materials_count || 0}
                </p>
              </div>
              <div className="bg-purple-100 p-3 rounded-lg">
                <FileText className="text-purple-600 w-7 h-7" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-white to-amber-50 rounded-xl shadow-lg p-6 border border-amber-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Students</p>
                <p className="text-3xl font-bold text-gray-900">
                  {dashboardData.students_count || 0}
                </p>
              </div>
              <div className="bg-amber-100 p-3 rounded-lg">
                <Users className="text-amber-600 w-7 h-7" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InstructorDashboardScreen;
