import { useEffect, useState } from 'react';
import { instructorAPI } from '../../../services/api';
import { DollarSign, Eye, CheckCircle, Clock } from 'lucide-react';
import Modal from '../../../components/Modal/Modal';
import DataTable from '../../../components/DataTable/DataTable';
import './EarningsScreen.css';

const EarningsScreen = () => {
  const [earnings, setEarnings] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedEarning, setSelectedEarning] = useState(null);

  useEffect(() => {
    loadEarnings();
  }, []);

  const loadEarnings = async () => {
    try {
      const data = await instructorAPI.getEarnings();
      setEarnings(data.earnings || []);
      setSummary(data.summary);
    } catch (error) {
      console.error('Failed to load earnings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (earning) => {
    setSelectedEarning(earning);
    setDetailModalOpen(true);
  };

  const columns = [
    {
      header: 'Certificate',
      accessor: 'certificate',
      render: (value, row) => (
        <div className="flex items-center">
          <DollarSign className="h-5 w-5 text-gray-400 mr-3" />
          <span className="font-medium text-gray-900">{value}</span>
        </div>
      ),
    },
    {
      header: 'Amount',
      accessor: 'amount',
      render: (value) => `$${parseFloat(value || 0).toFixed(2)}`,
    },
    {
      header: 'Commission %',
      accessor: 'commission_percentage',
      render: (value) => `${value || 0}%`,
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (value) => {
        const statusConfig = {
          paid: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
          pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock },
        };
        const config = statusConfig[value] || statusConfig.pending;
        const Icon = config.icon;
        return (
          <span className={`px-2 inline-flex items-center text-xs leading-5 font-semibold rounded-full ${config.bg} ${config.text}`}>
            <Icon size={12} className="mr-1" />
            {value}
          </span>
        );
      },
    },
    {
      header: 'Paid Date',
      accessor: 'paid_at',
      render: (value) => value ? new Date(value).toLocaleDateString() : '-',
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Earnings</h1>
        <p className="text-gray-600 mt-2">View your earnings and payment history</p>
      </div>

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-green-600 to-green-800 rounded-xl shadow-lg p-6 text-white">
            <DollarSign className="h-10 w-10 mb-3" />
            <p className="text-green-100 mb-2">Total Earnings</p>
            <p className="text-3xl font-bold">${parseFloat(summary.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          <div className="bg-gradient-to-br from-yellow-600 to-yellow-800 rounded-xl shadow-lg p-6 text-white">
            <Clock className="h-10 w-10 mb-3" />
            <p className="text-yellow-100 mb-2">Pending</p>
            <p className="text-3xl font-bold">${parseFloat(summary.pending || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl shadow-lg p-6 text-white">
            <CheckCircle className="h-10 w-10 mb-3" />
            <p className="text-blue-100 mb-2">Paid</p>
            <p className="text-3xl font-bold">${parseFloat(summary.paid || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        data={earnings}
        onView={handleViewDetails}
        onRowClick={handleViewDetails}
        isLoading={loading}
        emptyMessage="No earnings found."
      />

      {/* Earning Detail Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedEarning(null);
        }}
        title="Earning Details"
        size="md"
      >
        {selectedEarning && (
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">Certificate</p>
              <p className="text-base font-semibold text-gray-900">{selectedEarning.certificate}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">Amount</p>
              <p className="text-2xl font-bold text-gray-900">${parseFloat(selectedEarning.amount || 0).toFixed(2)}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">Commission Percentage</p>
              <p className="text-base font-semibold text-gray-900">{selectedEarning.commission_percentage || 0}%</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">Status</p>
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                selectedEarning.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
              }`}>
                {selectedEarning.status}
              </span>
            </div>
            {selectedEarning.paid_at && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Paid Date</p>
                <p className="text-base font-semibold text-gray-900">
                  {new Date(selectedEarning.paid_at).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default EarningsScreen;
