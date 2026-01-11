import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { trainingCenterAPI } from '../../../services/api';
import { Users, Award, BookOpen, Building2, CheckCircle, Calendar, GraduationCap } from 'lucide-react';
import DashboardCard from '../../../components/DashboardCard/DashboardCard';
import LoadingSpinner from '../../../components/LoadingSpinner/LoadingSpinner';
import StateSection from '../../../components/StateSection/StateSection';
import StateItem from '../../../components/StateItem/StateItem';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './DashboardScreen.css';

const TrainingCenterDashboardScreen = () => {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [counts, setCounts] = useState({
    accs: 0,
    classes: 0,
    instructors: 0,
    trainees: 0,
    certificates: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      // Use the dedicated dashboard endpoint
      const data = await trainingCenterAPI.getDashboard();
      
      // API returns: authorized_accreditations, classes, instructors, trainees, certificates, training_center_state { status, registration_date, accreditation_status }, charts { classes_over_time, classes_status_distribution }
      setDashboardData(data);
      
      setCounts({
        accs: data.authorized_accreditations || 0,
        classes: data.classes || 0,
        instructors: data.instructors || 0,
        trainees: data.trainees || 0,
        certificates: data.certificates || 0
      });
    } catch (error) {
      console.error('Failed to load dashboard:', error);
      setDashboardData(null);
      setCounts({
        accs: 0,
        classes: 0,
        instructors: 0,
        trainees: 0,
        certificates: 0
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="dashboard-container">
      {dashboardData && (
        <>
          {/* Stats Cards */}
          <div className="dashboard-stats-grid">
            {/* Certificates Card */}
           {/* <DashboardCard
              icon={Award}
              colorType="certificates"
              label="Certificates"
              value={counts.certificates}
              hint="Click to view details"
              onClick={() => navigate('/training-center/certificates')}
            />*/}
            
            {/* Accreditation Card */}
            <DashboardCard
              icon={Building2}
              colorType="acc"
              label="Authorized Accreditation"
              value={counts.accs}
              hint="Click to view details"
              onClick={() => navigate('/training-center/accs')}
            />

            {/* Classes Card */}
            <DashboardCard
              icon={BookOpen}
              colorType="classes"
              label="Classes"
              value={counts.classes}
              hint="Click to view details"
              onClick={() => navigate('/training-center/classes')}
            />

            {/* Instructors Card */}
            <DashboardCard
              icon={Users}
              colorType="instructors"
              label="Instructors"
              value={counts.instructors}
              hint="Click to view details"
              onClick={() => navigate('/training-center/instructors')}
            />

            {/* Trainees Card */}
            <DashboardCard
              icon={GraduationCap}
              colorType="classes"
              label="Trainees"
              value={counts.trainees}
              hint="Click to view details"
              onClick={() => navigate('/training-center/trainees')}
            />

          </div>


          {/* Charts Section */}
          {dashboardData.charts && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Classes Over Time Chart */}
              {dashboardData.charts.classes_over_time && dashboardData.charts.classes_over_time.length > 0 && (
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Classes Over Time</h2>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={dashboardData.charts.classes_over_time} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                      <XAxis 
                        dataKey="month_name" 
                        stroke="#374151"
                        style={{ fontSize: '13px', fontWeight: '500' }}
                        tick={{ fill: '#374151' }}
                      />
                      <YAxis 
                        stroke="#374151"
                        style={{ fontSize: '13px', fontWeight: '500' }}
                        tick={{ fill: '#374151' }}
                      />
                      <Tooltip 
                        formatter={(value) => [value, 'Classes']}
                        contentStyle={{ 
                          backgroundColor: '#fff', 
                          border: '2px solid #10B981',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                          padding: '10px'
                        }}
                        labelStyle={{ fontWeight: '600', color: '#111827', marginBottom: '5px' }}
                      />
                      <Legend wrapperStyle={{ paddingTop: '20px' }} />
                      <Bar 
                        dataKey="count" 
                        fill="#10B981"
                        name="Classes"
                        radius={[8, 8, 0, 0]}
                        stroke="#059669"
                        strokeWidth={1}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Classes Status Distribution Chart */}
              {dashboardData.charts.classes_status_distribution && dashboardData.charts.classes_status_distribution.length > 0 && (
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Classes Status Distribution</h2>
                  <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                      <Pie
                        data={dashboardData.charts.classes_status_distribution}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={110}
                        fill="#8884d8"
                        dataKey="value"
                        stroke="#fff"
                        strokeWidth={2}
                      >
                        {dashboardData.charts.classes_status_distribution.map((entry, index) => {
                          const colors = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'];
                          return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                        })}
                      </Pie>
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div style={{
                                backgroundColor: '#fff',
                                border: '2px solid #10B981',
                                borderRadius: '8px',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                padding: '10px'
                              }}>
                                <p style={{ fontWeight: '600', color: '#111827', marginBottom: '5px' }}>
                                  {data.label || data.name}
                                </p>
                                <p style={{ color: '#374151' }}>
                                  Count: <span style={{ fontWeight: '600' }}>{data.value}</span>
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend 
                        wrapperStyle={{ paddingTop: '20px' }}
                        iconType="circle"
                        formatter={(value, entry) => {
                          return entry.payload?.label || entry.payload?.name || value;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* Training Center State Section */}
          <StateSection title="Training Center State" titleIcon={Building2}>
            <StateItem
              icon={CheckCircle}
              iconColorType="green"
              label="Status"
              value={dashboardData.training_center_state?.status || 'N/A'}
              capitalize={true}
            />
            <StateItem
              icon={Calendar}
              iconColorType="blue"
              label="Registration Date"
              value={dashboardData.training_center_state?.registration_date || 'N/A'}
            />
            <StateItem
              icon={Award}
              iconColorType="purple"
              label="Accreditation Status"
              value={dashboardData.training_center_state?.accreditation_status || 'Not Verified'}
            />
          </StateSection>

        </>
      )}
    </div>
  );
};

export default TrainingCenterDashboardScreen;
