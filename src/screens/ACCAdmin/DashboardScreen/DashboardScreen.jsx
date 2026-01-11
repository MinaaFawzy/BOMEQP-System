import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { accAPI } from '../../../services/api';
import { Users, Building2, Clock, DollarSign } from 'lucide-react';
import DashboardCard from '../../../components/DashboardCard/DashboardCard';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
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

          {/* Charts Section */}
          {dashboardData.charts && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Revenue Over Time Chart */}
              {dashboardData.charts.revenue_over_time && dashboardData.charts.revenue_over_time.length > 0 && (
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Revenue Over Time</h2>
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={dashboardData.charts.revenue_over_time} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
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
                          border: '2px solid #8B5CF6',
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
                        stroke="#8B5CF6" 
                        strokeWidth={3}
                        dot={{ fill: '#8B5CF6', r: 5, strokeWidth: 2, stroke: '#fff' }}
                        activeDot={{ r: 7, fill: '#8B5CF6', stroke: '#fff', strokeWidth: 2 }}
                        name="Revenue"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Certificates Over Time Chart */}
              {dashboardData.charts.certificates_over_time && dashboardData.charts.certificates_over_time.length > 0 && (
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Certificates Over Time</h2>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={dashboardData.charts.certificates_over_time} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
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
                        formatter={(value) => [value, 'Certificates']}
                        contentStyle={{ 
                          backgroundColor: '#fff', 
                          border: '2px solid #F59E0B',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                          padding: '10px'
                        }}
                        labelStyle={{ fontWeight: '600', color: '#111827', marginBottom: '5px' }}
                      />
                      <Legend wrapperStyle={{ paddingTop: '20px' }} />
                      <Bar 
                        dataKey="count" 
                        fill="#F59E0B"
                        name="Certificates"
                        radius={[8, 8, 0, 0]}
                        stroke="#D97706"
                        strokeWidth={1}
                      />
                    </BarChart>
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

export default ACCDashboardScreen;
