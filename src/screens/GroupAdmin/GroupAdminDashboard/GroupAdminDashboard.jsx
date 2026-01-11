import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../../../services/api';
import { useHeader } from '../../../context/HeaderContext';
import { Building2, DollarSign, School, Users, GraduationCap } from 'lucide-react';
import DashboardCard from '../../../components/DashboardCard/DashboardCard';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
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
      
      // API returns: accreditation_bodies, training_centers, instructors, trainees, revenue { monthly, total }, charts { revenue_over_time, entity_distribution }
      setDashboard({
        accreditation_bodies: data.accreditation_bodies || 0,
        training_centers: data.training_centers || 0,
        instructors: data.instructors || 0,
        trainees: data.trainees || 0,
        revenue: data.revenue || { monthly: 0, total: 0 },
        charts: data.charts || { revenue_over_time: [], entity_distribution: [] },
      });
    } catch (error) {
      console.error('Failed to load dashboard:', error);
      // Set empty dashboard to prevent rendering errors
      setDashboard({
        accreditation_bodies: 0,
        training_centers: 0,
        instructors: 0,
        trainees: 0,
        revenue: { monthly: 0, total: 0 },
        charts: { revenue_over_time: [], entity_distribution: [] },
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

            {/* Trainees Card */}
            <DashboardCard
              icon={GraduationCap}
              colorType="acc"
              label="Trainees"
              value={dashboard.trainees || 0}
              hint="Total trainees in system"
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

          {/* Charts Section */}
          {dashboard.charts && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Revenue Over Time Chart */}
              {dashboard.charts.revenue_over_time && dashboard.charts.revenue_over_time.length > 0 && (
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Revenue Over Time</h2>
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={dashboard.charts.revenue_over_time} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
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
                        tickFormatter={(value) => `$${value.toLocaleString()}`}
                      />
                      <Tooltip 
                        formatter={(value) => [`$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Revenue']}
                        contentStyle={{ 
                          backgroundColor: '#fff', 
                          border: '2px solid #3B82F6',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                          padding: '10px'
                        }}
                        labelStyle={{ fontWeight: '600', color: '#111827', marginBottom: '5px' }}
                      />
                      <Legend wrapperStyle={{ paddingTop: '20px' }} />
                      <Line 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="#3B82F6" 
                        strokeWidth={3}
                        dot={{ fill: '#3B82F6', r: 5, strokeWidth: 2, stroke: '#fff' }}
                        activeDot={{ r: 7, fill: '#3B82F6', stroke: '#fff', strokeWidth: 2 }}
                        name="Revenue"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Entity Distribution Chart */}
              {dashboard.charts.entity_distribution && dashboard.charts.entity_distribution.length > 0 && (
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Entity Distribution</h2>
                  <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                      <Pie
                        data={dashboard.charts.entity_distribution}
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
                        {dashboard.charts.entity_distribution.map((entry, index) => {
                          const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
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
                                border: '2px solid #3B82F6',
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
        </>
      )}

    </div>
  );
};

export default GroupAdminDashboard;
