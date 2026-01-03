import { useEffect, useState, useMemo } from 'react';
import { adminAPI } from '../../../services/api';
import { useHeader } from '../../../context/HeaderContext';
import { Users, DollarSign, Percent, Building2, Clock, CheckCircle, Eye, Mail, Phone, FileText, Globe, Calendar, Award, BookOpen } from 'lucide-react';
import Modal from '../../../components/Modal/Modal';
import FormInput from '../../../components/FormInput/FormInput';
import Button from '../../../components/Button/Button';
import DataTable from '../../../components/DataTable/DataTable';
import PresentDataForm from '../../../components/PresentDataForm/PresentDataForm';
import './InstructorAuthorizationsScreen.css';

const InstructorAuthorizationsScreen = () => {
  const { setHeaderTitle, setHeaderSubtitle } = useHeader();
  const [authorizations, setAuthorizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commissionModalOpen, setCommissionModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedAuthorization, setSelectedAuthorization] = useState(null);
  const [commissionPercentage, setCommissionPercentage] = useState('');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setHeaderTitle('Instructor Authorization Commissions');
    setHeaderSubtitle('Set commission percentages for instructor authorizations');
    return () => {
      setHeaderTitle(null);
      setHeaderSubtitle(null);
    };
  }, [setHeaderTitle, setHeaderSubtitle]);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await adminAPI.getPendingCommissionRequests();
      setAuthorizations(data.authorizations || []);
    } catch (error) {
      console.error('Failed to load authorizations:', error);
      setAuthorizations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSetCommission = (authorization) => {
    setSelectedAuthorization(authorization);
    setCommissionPercentage('');
    setErrors({});
    setCommissionModalOpen(true);
  };

  const handleViewDetails = (authorization) => {
    setSelectedAuthorization(authorization);
    setDetailModalOpen(true);
  };

  const handleSubmitCommission = async (e) => {
    e.preventDefault();
    if (!commissionPercentage || parseFloat(commissionPercentage) < 0 || parseFloat(commissionPercentage) > 100) {
      setErrors({ commission_percentage: 'Please enter a valid commission percentage (0-100)' });
      return;
    }

    setSaving(true);
    setErrors({});

    try {
      await adminAPI.setInstructorAuthorizationCommission(selectedAuthorization.id, {
        commission_percentage: parseFloat(commissionPercentage),
      });
      await loadData();
      setCommissionModalOpen(false);
      setSelectedAuthorization(null);
      setCommissionPercentage('');
      alert('Commission percentage set successfully. Training Center can now complete payment.');
    } catch (error) {
      console.error('Failed to set commission:', error);
      if (error.response?.data) {
        const errorData = error.response.data;
        if (errorData.errors) {
          setErrors(errorData.errors);
        } else if (errorData.message) {
          setErrors({ general: errorData.message });
        } else {
          setErrors(errorData);
        }
      } else if (error.message) {
        setErrors({ general: error.message });
      } else {
        setErrors({ general: 'Failed to set commission percentage. Please try again.' });
      }
    } finally {
      setSaving(false);
    }
  };

  // Prepare data for DataTable with search text
  const tableData = useMemo(() => {
    return authorizations.map(auth => ({
      ...auth,
      _searchText: `${auth.instructor?.first_name || ''} ${auth.instructor?.last_name || ''} ${auth.instructor?.email || ''} ${auth.acc?.name || ''} ${auth.training_center?.name || ''}`.toLowerCase()
    }));
  }, [authorizations]);

  // DataTable columns
  const columns = useMemo(() => [
    {
      header: 'Instructor',
      accessor: 'instructor',
      sortable: true,
      render: (value, row) => (
        <div className="flex items-center">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg flex items-center justify-center mr-3">
            <Users className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900">
              {row.instructor?.first_name} {row.instructor?.last_name}
            </div>
            {row.instructor?.email && (
              <div className="text-xs text-gray-500">{row.instructor.email}</div>
            )}
          </div>
        </div>
      )
    },
    {
      header: 'ACC',
      accessor: 'acc',
      sortable: true,
      render: (value) => (
        <div className="flex items-center text-sm text-gray-600">
          <Building2 className="h-4 w-4 mr-2 text-gray-400" />
          {value?.name || 'N/A'}
        </div>
      )
    },
    {
      header: 'Training Center',
      accessor: 'training_center',
      sortable: true,
      render: (value) => (
        <div className="text-sm text-gray-600">
          {value?.name || 'N/A'}
        </div>
      )
    },
    {
      header: 'Authorization Price',
      accessor: 'authorization_price',
      sortable: true,
      render: (value) => (
        <div className="flex items-center text-sm font-semibold text-gray-900">
          <DollarSign className="h-4 w-4 mr-1 text-green-600" />
          {parseFloat(value || 0).toFixed(2)}
        </div>
      )
    },
    {
      header: 'Status',
      accessor: 'status',
      sortable: false,
      render: () => (
        <span className="px-3 py-1.5 inline-flex items-center text-xs leading-5 font-bold rounded-full shadow-sm bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 border border-yellow-300">
          <Clock size={12} className="mr-1" />
          Pending Commission
        </span>
      )
    },
    {
      header: 'Actions',
      accessor: 'actions',
      sortable: false,
      render: (value, row) => (
        <div onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => handleSetCommission(row)}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all duration-200 hover:scale-105 shadow-sm hover:shadow-md font-medium flex items-center gap-2"
          >
            <Percent size={16} />
            Set Commission
          </button>
        </div>
      )
    }
  ], []);

  return (
    <div>
      {/* DataTable */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100">
        <DataTable
          columns={columns}
          data={tableData}
          onView={handleViewDetails}
          onRowClick={handleViewDetails}
          isLoading={loading}
          emptyMessage="No pending commission requests"
          searchable={true}
          filterable={false}
          searchPlaceholder="Search by instructor name, email, ACC, or training center..."
        />
      </div>

      {/* Set Commission Modal */}
      <Modal
        isOpen={commissionModalOpen}
        onClose={() => {
          setCommissionModalOpen(false);
          setSelectedAuthorization(null);
          setCommissionPercentage('');
          setErrors({});
        }}
        title="Set Commission Percentage"
        size="md"
      >
        <form onSubmit={handleSubmitCommission} className="space-y-4">
          {errors.general && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{errors.general}</p>
            </div>
          )}

          {selectedAuthorization && (
            <div className="p-4 bg-gray-50 rounded-lg space-y-2">
              <p className="text-sm text-gray-600">Instructor: <span className="font-semibold text-gray-900">{selectedAuthorization.instructor?.first_name} {selectedAuthorization.instructor?.last_name}</span></p>
              <p className="text-sm text-gray-600">ACC: <span className="font-semibold text-gray-900">{selectedAuthorization.acc?.name}</span></p>
              <p className="text-sm text-gray-600">Authorization Price: <span className="font-semibold text-gray-900">${parseFloat(selectedAuthorization.authorization_price || 0).toFixed(2)}</span></p>
            </div>
          )}

          <FormInput
            label="Commission Percentage (%)"
            name="commission_percentage"
            type="number"
            value={commissionPercentage}
            onChange={(e) => setCommissionPercentage(e.target.value)}
            required
            min="0"
            max="100"
            step="0.1"
            placeholder="15.5"
            error={errors.commission_percentage}
            helpText="Enter the percentage that Group will receive from the authorization payment"
          />

          {selectedAuthorization && commissionPercentage && !isNaN(parseFloat(commissionPercentage)) && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm font-semibold text-blue-900 mb-2">Commission Breakdown:</p>
              <div className="space-y-1 text-sm">
                <p className="text-gray-700">
                  Group receives: <span className="font-semibold">${(parseFloat(selectedAuthorization.authorization_price || 0) * parseFloat(commissionPercentage) / 100).toFixed(2)}</span>
                </p>
                <p className="text-gray-700">
                  ACC receives: <span className="font-semibold">${(parseFloat(selectedAuthorization.authorization_price || 0) * (100 - parseFloat(commissionPercentage)) / 100).toFixed(2)}</span>
                </p>
              </div>
            </div>
          )}

          <div className="flex space-x-3 pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              fullWidth
              onClick={() => {
                setCommissionModalOpen(false);
                setSelectedAuthorization(null);
                setCommissionPercentage('');
                setErrors({});
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              fullWidth
              type="submit"
              disabled={saving}
              loading={saving}
            >
              Set Commission
            </Button>
          </div>
        </form>
      </Modal>

      {/* Instructor Details Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedAuthorization(null);
        }}
        title="Instructor Authorization Details"
        size="lg"
      >
        <PresentDataForm
          data={selectedAuthorization}
          isLoading={false}
          emptyMessage="No authorization data available"
        />
      </Modal>
    </div>
  );
};

export default InstructorAuthorizationsScreen;
