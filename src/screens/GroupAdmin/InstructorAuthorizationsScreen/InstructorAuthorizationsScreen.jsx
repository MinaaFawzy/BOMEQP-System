import { useEffect, useState, useMemo, useRef } from 'react';
import { adminAPI } from '../../../services/api';
import { useHeader } from '../../../context/HeaderContext';
import { Users, DollarSign, Percent, Building2, Clock, CheckCircle, Eye, Mail, Phone, FileText, Globe, Calendar, Award, BookOpen, ClipboardList } from 'lucide-react';
import Modal from '../../../components/Modal/Modal';
import FormInput from '../../../components/FormInput/FormInput';
import Button from '../../../components/Button/Button';
import DataTable from '../../../components/DataTable/DataTable';
import DetailForm from '../../../components/DetailForm/DetailForm';
import Pagination from '../../../components/Pagination/Pagination';
import TabCard from '../../../components/TabCard/TabCard';
import TabCardsGrid from '../../../components/TabCardsGrid/TabCardsGrid';
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

  // Pagination State
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
    per_page: 10,
    from: 0,
    to: 0
  });

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Stats State
  const [stats, setStats] = useState({
    total: 0
  });

  // Track if data has been loaded before
  const hasDataRef = useRef(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPagination(prev => ({ ...prev, current_page: 1 }));
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setHeaderTitle('Instructor Authorization Commissions');
    setHeaderSubtitle('Set commission percentages for instructor authorizations');
    return () => {
      setHeaderTitle(null);
      setHeaderSubtitle(null);
    };
  }, [setHeaderTitle, setHeaderSubtitle]);

  // Load data when dependencies change
  useEffect(() => {
    const showLoading = !hasDataRef.current;

    // Don't load if search is still being debounced
    if (searchQuery !== debouncedSearch) {
      return;
    }

    loadData(showLoading);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.current_page, pagination.per_page, debouncedSearch]);

  const loadData = async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    }
    try {
      // Build query parameters
      const params = {
        page: pagination.current_page,
        per_page: pagination.per_page,
      };

      // Add search if there's a value
      if (debouncedSearch) {
        params.search = debouncedSearch;
      }

      const data = await adminAPI.getPendingCommissionRequests(params);

      const authList = data.authorizations || data.data || (Array.isArray(data) ? data : []);
      setAuthorizations(authList);

      // Update pagination state
      if (data) {
        const totalItems = data.total || (data.statistics?.total) || authList.length;
        const currentPerPage = pagination.per_page;
        const calculatedLastPage = data.last_page || Math.ceil(totalItems / currentPerPage) || 1;
        const calculatedFrom = data.from || (authList.length > 0 ? ((pagination.current_page - 1) * currentPerPage) + 1 : 0);
        const calculatedTo = data.to || (authList.length > 0 ? calculatedFrom + authList.length - 1 : 0);

        setPagination(prev => ({
          ...prev,
          current_page: data.current_page || prev.current_page || 1,
          last_page: calculatedLastPage,
          total: totalItems,
          from: calculatedFrom,
          to: calculatedTo
        }));

        // Update stats
        // If API returns specific stats for pending, use them.
        // Otherwise, totalItems represents pending count since this endpoint is filtered.
        setStats({
          total: totalItems
        });
      }

      hasDataRef.current = true;
    } catch (error) {
      console.error('Failed to load authorizations:', error);
      setAuthorizations([]);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, current_page: newPage }));
  };

  const handlePerPageChange = (newPerPage) => {
    setPagination(prev => ({
      ...prev,
      per_page: parseInt(newPerPage),
      current_page: 1
    }));
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
      await loadData(); // Reload data to reflect changes (removed item)
      setCommissionModalOpen(false);
      setSelectedAuthorization(null);
      setCommissionPercentage('');
      alert('Commission percentage set successfully. Training Provider can now complete payment.');
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
      header: 'Training Provider',
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
      {/* Stats Cards */}
      {/* <TabCardsGrid columns={{ mobile: 1, tablet: 1, desktop: 1 }}>
        <TabCard
          name="Pending Commission Requests"
          value={stats.total}
          icon={Clock}
          colorType="yellow"
        />
      </TabCardsGrid> */}

      {/* DataTable */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 mt-4">
        <DataTable
          columns={columns}
          data={authorizations}
          onView={handleViewDetails}
          onRowClick={handleViewDetails}
          isLoading={loading}
          emptyMessage="No pending commission requests"
          searchable={true}
          searchValue={searchQuery}
          onSearch={(value) => setSearchQuery(value)}
          filterable={false}
          searchPlaceholder="Search by instructor, ACC, or training provider..."
        />

        {authorizations.length > 0 && (
          <div className="border-t border-gray-100">
            <Pagination
              currentPage={pagination.current_page}
              totalPages={pagination.last_page}
              onPageChange={handlePageChange}
              totalItems={pagination.total}
              perPage={pagination.per_page}
              onPerPageChange={handlePerPageChange}
            />
          </div>
        )}
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
        {selectedAuthorization && (
          <div className="detail-modal-container">
            <DetailForm
              data={selectedAuthorization}
              fields={[
                {
                  key: 'instructor',
                  label: 'Instructor',
                  icon: Users,
                  render: (value) => {
                    if (!value) return 'N/A';
                    return `${value.first_name || ''} ${value.last_name || ''}`.trim() || 'N/A';
                  }
                },
                {
                  key: 'instructor',
                  label: 'Instructor DOB',
                  icon: Calendar,
                  showEmpty: false,
                  render: (value) => {
                    if (!value || !value.date_of_birth) return null;
                    return new Date(value.date_of_birth).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    });
                  }
                },
                {
                  key: 'acc',
                  label: 'ACC',
                  icon: Building2,
                  render: (value) => value?.name || 'N/A'
                },
                {
                  key: 'courses',
                  label: 'Courses',
                  icon: BookOpen,
                  render: (value, data) => {
                    if (data.courses && Array.isArray(data.courses) && data.courses.length > 0) {
                      return data.courses.map((course, idx) =>
                        typeof course === 'object' ? course?.name || course?.course_name || 'N/A' : course || 'N/A'
                      ).join(', ');
                    } else if (data.course) {
                      return typeof data.course === 'object'
                        ? data.course?.name || data.course?.course_name || 'N/A'
                        : data.course || 'N/A';
                    }
                    return 'N/A';
                  }
                },
                {
                  key: 'authorization_price',
                  label: 'Authorization Price',
                  icon: DollarSign,
                  render: (value) => `$${parseFloat(value || 0).toFixed(2)}`
                },
                { key: 'status', label: 'Status', type: 'status' },
                { key: 'created_at', label: 'Created At', type: 'datetime', icon: Calendar, showEmpty: false },
                { key: 'updated_at', label: 'Updated At', type: 'datetime', icon: Calendar, showEmpty: false },
              ]}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default InstructorAuthorizationsScreen;
