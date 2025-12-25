import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { trainingCenterAPI } from '../../../services/api';
import { Users, Award, DollarSign, BookOpen, ArrowRight, Building2, CheckCircle, Calendar } from 'lucide-react';
import './DashboardScreen.css';

const TrainingCenterDashboardScreen = () => {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [counts, setCounts] = useState({
    accs: 0,
    classes: 0,
    instructors: 0,
    certificates: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      // Load dashboard data and counts in parallel
      const [dashboardResult, accsResult, authorizationsResult, classesResult, instructorsResult, certificatesResult] = await Promise.allSettled([
        trainingCenterAPI.getDashboard(),
        trainingCenterAPI.listACCs(),
        trainingCenterAPI.getAuthorizationStatus(),
        trainingCenterAPI.listClasses({ page: 1, per_page: 1 }),
        trainingCenterAPI.listInstructors({ page: 1, per_page: 1 }),
        trainingCenterAPI.listCertificates({ page: 1, per_page: 1 })
      ]);

      // Extract dashboard data
      if (dashboardResult.status === 'fulfilled') {
        setDashboardData(dashboardResult.value);
      }

      // Extract ACCs count - count all authorizations (all statuses)
      let accsCount = 0;
      if (authorizationsResult.status === 'fulfilled') {
        const authData = authorizationsResult.value;
        const authorizations = authData?.authorizations || [];
        // Count all authorizations (approved, pending, etc.)
        accsCount = authorizations.length;
        console.log('Authorizations data:', authData, 'Total authorizations:', accsCount);
      } else if (accsResult.status === 'fulfilled') {
        const accsData = accsResult.value;
        // Fallback to available ACCs count
        accsCount = accsData?.total || accsData?.count || (accsData?.accs?.length || 0);
        console.log('ACCs data:', accsData, 'Available ACCs count:', accsCount);
      }

      let classesCount = 0;
      if (classesResult.status === 'fulfilled') {
        const classesData = classesResult.value;
        classesCount = classesData?.total || classesData?.count || (classesData?.classes?.length || 0);
      }

      let instructorsCount = 0;
      if (instructorsResult.status === 'fulfilled') {
        const instructorsData = instructorsResult.value;
        instructorsCount = instructorsData?.total || instructorsData?.count || (instructorsData?.instructors?.length || 0);
      }

      let certificatesCount = 0;
      if (certificatesResult.status === 'fulfilled') {
        const certificatesData = certificatesResult.value;
        certificatesCount = certificatesData?.total || certificatesData?.count || (certificatesData?.certificates?.length || 0);
      }

      setCounts({
        accs: accsCount,
        classes: classesCount,
        instructors: instructorsCount,
        certificates: certificatesCount
      });
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;
  }

  return (
    <div className="space-y-4">
      {dashboardData && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Accreditation Card */}
            <div 
              onClick={() => navigate('/training-center/accs')}
              className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl shadow-lg p-4 border border-indigo-200 hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                  <Building2 className="text-white w-6 h-6" />
                </div>
                <ArrowRight className="text-indigo-600 w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
              <div>
                <p className="text-xs font-medium text-indigo-700 mb-1">Authorized Accreditation</p>
                <p className="text-2xl font-bold text-indigo-900 mb-1">
                  {counts.accs}
                </p>
                <p className="text-xs text-indigo-600">Click to view details</p>
              </div>
            </div>

            {/* Classes Card */}
            <div 
              onClick={() => navigate('/training-center/classes')}
              className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-lg p-4 border border-blue-200 hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                  <BookOpen className="text-white w-6 h-6" />
                </div>
                <ArrowRight className="text-blue-600 w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
              <div>
                <p className="text-xs font-medium text-blue-700 mb-1">Classes</p>
                <p className="text-2xl font-bold text-blue-900 mb-1">
                  {counts.classes}
                </p>
                <p className="text-xs text-blue-600">Click to view details</p>
              </div>
            </div>

            {/* Instructors Card */}
            <div 
              onClick={() => navigate('/training-center/instructors')}
              className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-lg p-4 border border-green-200 hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                  <Users className="text-white w-6 h-6" />
                </div>
                <ArrowRight className="text-green-600 w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
              <div>
                <p className="text-xs font-medium text-green-700 mb-1">Instructors</p>
                <p className="text-2xl font-bold text-green-900 mb-1">
                  {counts.instructors}
                </p>
                <p className="text-xs text-green-600">Click to view details</p>
              </div>
            </div>

            {/* Certificates Card */}
            <div 
              onClick={() => navigate('/training-center/certificates')}
              className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow-lg p-4 border border-purple-200 hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                  <Award className="text-white w-6 h-6" />
                </div>
                <ArrowRight className="text-purple-600 w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
              <div>
                <p className="text-xs font-medium text-purple-700 mb-1">Certificates</p>
                <p className="text-2xl font-bold text-purple-900 mb-1">
                  {counts.certificates}
                </p>
                <p className="text-xs text-purple-600">Click to view details</p>
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
                    ${(dashboardData.monthly_revenue || dashboardData.revenue || 0).toLocaleString()}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-600 mb-1">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${(dashboardData.revenue || 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Training Center State Section */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Building2 className="text-[var(--primary-color)] w-5 h-5" />
              Training Center State
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="text-green-600 w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Status</p>
                    <p className="text-lg font-bold text-gray-900">Active</p>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Calendar className="text-blue-600 w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Registration Date</p>
                    <p className="text-lg font-bold text-gray-900">
                      {dashboardData.registration_date || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Award className="text-purple-600 w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Accreditation Status</p>
                    <p className="text-lg font-bold text-gray-900">
                      {dashboardData.accreditation_status || 'Verified'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </>
      )}
    </div>
  );
};

export default TrainingCenterDashboardScreen;
