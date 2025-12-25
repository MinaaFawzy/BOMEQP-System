import { useEffect, useState } from 'react';
import { adminAPI } from '../../../services/api';
import { FileText, TrendingUp, Building2, Award, Download, Eye } from 'lucide-react';
import Modal from '../../../components/Modal/Modal';
import DataTable from '../../../components/DataTable/DataTable';
import './ReportsScreen.css';

const ReportsScreen = () => {
  const [revenueReport, setRevenueReport] = useState(null);
  const [accsReport, setAccsReport] = useState(null);
  const [certificatesReport, setCertificatesReport] = useState(null);
  const [trainingCentersReport, setTrainingCentersReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);

  const handleViewReport = async (reportType) => {
    setLoading(true);
    try {
      let data;
      switch (reportType) {
        case 'revenue':
          data = await adminAPI.getRevenueReport({ group_by: 'month' });
          setRevenueReport(data);
          setSelectedReport({ type: 'revenue', data });
          break;
        case 'accs':
          data = await adminAPI.getACCsReport();
          setAccsReport(data);
          setSelectedReport({ type: 'accs', data });
          break;
        case 'certificates':
          data = await adminAPI.getCertificatesReport();
          setCertificatesReport(data);
          setSelectedReport({ type: 'certificates', data });
          break;
        case 'training-centers':
          data = await adminAPI.getTrainingCentersReport();
          setTrainingCentersReport(data);
          setSelectedReport({ type: 'training-centers', data });
          break;
        default:
          break;
      }
      setDetailModalOpen(true);
    } catch (error) {
      console.error('Failed to load report:', error);
      alert('Failed to load report: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const renderReportContent = () => {
    if (!selectedReport) return null;

    switch (selectedReport.type) {
      case 'revenue':
        return (
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">
                ${parseFloat(selectedReport.data.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            {selectedReport.data.revenue && selectedReport.data.revenue.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Revenue by Period</h3>
                <div className="space-y-2">
                  {selectedReport.data.revenue.map((item, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg flex justify-between">
                      <span className="font-medium text-gray-900">{item.period || 'N/A'}</span>
                      <span className="text-gray-900">${parseFloat(item.amount || 0).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      case 'accs':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Total Active</p>
                <p className="text-2xl font-bold text-green-600">{selectedReport.data.total_active || 0}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Total Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{selectedReport.data.total_pending || 0}</p>
              </div>
            </div>
            {selectedReport.data.accs && selectedReport.data.accs.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">ACC Details</h3>
                <DataTable
                  columns={[
                    { header: 'Name', accessor: 'name' },
                    { header: 'Status', accessor: 'status', render: (value) => (
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        value === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>{value}</span>
                    )},
                  ]}
                  data={selectedReport.data.accs}
                  isLoading={false}
                  emptyMessage="No ACCs found."
                />
              </div>
            )}
          </div>
        );
      case 'certificates':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Total Generated</p>
                <p className="text-2xl font-bold text-gray-900">{selectedReport.data.total_generated || 0}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Valid</p>
                <p className="text-2xl font-bold text-green-600">{selectedReport.data.valid || 0}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Revoked</p>
                <p className="text-2xl font-bold text-red-600">{selectedReport.data.revoked || 0}</p>
              </div>
            </div>
          </div>
        );
      case 'training-centers':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Total</p>
                <p className="text-2xl font-bold text-gray-900">{selectedReport.data.total || 0}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Active</p>
                <p className="text-2xl font-bold text-green-600">{selectedReport.data.active || 0}</p>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
        <p className="text-gray-600 mt-2">View system reports and analytics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div
          onClick={() => handleViewReport('revenue')}
          className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
        >
          <FileText className="h-12 w-12 text-primary-600 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Revenue Report</h3>
          <p className="text-gray-600 text-sm">View revenue analytics and trends</p>
        </div>
        <div
          onClick={() => handleViewReport('accs')}
          className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
        >
          <Building2 className="h-12 w-12 text-blue-600 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">ACCs Report</h3>
          <p className="text-gray-600 text-sm">ACC statistics and performance</p>
        </div>
        <div
          onClick={() => handleViewReport('certificates')}
          className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
        >
          <Award className="h-12 w-12 text-green-600 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Certificates Report</h3>
          <p className="text-gray-600 text-sm">Certificate generation statistics</p>
        </div>
        <div
          onClick={() => handleViewReport('training-centers')}
          className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
        >
          <TrendingUp className="h-12 w-12 text-purple-600 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Training Centers Report</h3>
          <p className="text-gray-600 text-sm">Training center statistics</p>
        </div>
      </div>

      {/* Report Detail Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedReport(null);
        }}
        title={
          selectedReport?.type === 'revenue' ? 'Revenue Report' :
          selectedReport?.type === 'accs' ? 'ACCs Report' :
          selectedReport?.type === 'certificates' ? 'Certificates Report' :
          'Training Centers Report'
        }
        size="lg"
      >
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          renderReportContent()
        )}
      </Modal>
    </div>
  );
};

export default ReportsScreen;
