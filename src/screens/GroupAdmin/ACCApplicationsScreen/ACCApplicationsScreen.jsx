import { useEffect, useState, useMemo, useRef } from 'react';
import { adminAPI } from '../../../services/api';
import { useHeader } from '../../../context/HeaderContext';
import { Building2, CheckCircle, XCircle, Clock, Eye, Mail, ClipboardList, Phone, MapPin, Globe, Hash, Calendar } from 'lucide-react';
import Modal from '../../../components/Modal/Modal';
import Button from '../../../components/Button/Button';
import TabCard from '../../../components/TabCard/TabCard';
import TabCardsGrid from '../../../components/TabCardsGrid/TabCardsGrid';
import DataTable from '../../../components/DataTable/DataTable';
import DetailForm from '../../../components/DetailForm/DetailForm';
import Pagination from '../../../components/Pagination/Pagination';
import './ACCApplicationsScreen.css';
import FormInput from '../../../components/FormInput/FormInput';

const ACCApplicationsScreen = () => {
  const { setHeaderTitle, setHeaderSubtitle } = useHeader();
  const [allApplications, setAllApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [commissionPercentage, setCommissionPercentage] = useState('10');
  const [subscriptionPrice, setSubscriptionPrice] = useState('1000.00');
  const [statusFilter, setStatusFilter] = useState('all');

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
    total: 0,
    approved: 0,
    pending: 0,
    rejected: 0
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
    setHeaderTitle('ACC Applications');
    setHeaderSubtitle('Review and manage ACC registration applications');
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

    loadApplications(showLoading);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, pagination.current_page, pagination.per_page, debouncedSearch, searchQuery]);

  const loadApplications = async (showLoading = true) => {
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

      // Add status filter if not 'all'
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      const data = await adminAPI.getACCApplications(params);

      // Handle Laravel pagination response
      const applicationsArray = data.data || data.applications || [];
      setAllApplications(applicationsArray);

      // Update pagination state
      if (data) {
        const totalItems = data.total || (data.statistics?.total) || applicationsArray.length;
        const currentPerPage = pagination.per_page;
        const calculatedLastPage = data.last_page || Math.ceil(totalItems / currentPerPage) || 1;
        const calculatedFrom = data.from || (applicationsArray.length > 0 ? ((pagination.current_page - 1) * currentPerPage) + 1 : 0);
        const calculatedTo = data.to || (applicationsArray.length > 0 ? calculatedFrom + applicationsArray.length - 1 : 0);

        setPagination(prev => ({
          ...prev,
          current_page: data.current_page || prev.current_page || 1,
          last_page: calculatedLastPage,
          total: totalItems,
          from: calculatedFrom,
          to: calculatedTo
        }));
      }

      // Update stats from API response if available
      if (data.statistics) {
        setStats({
          total: data.statistics.total || 0,
          pending: data.statistics.pending || 0,
          rejected: data.statistics.rejected || 0
        });
      }

      hasDataRef.current = true;
    } catch (error) {
      console.error('Failed to load applications:', error);
      setAllApplications([]);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  // Pagination handlers
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

  const handleApprove = (app) => {
    setSelectedApp(app);
    setCommissionPercentage('10'); // Default 10%
    setSubscriptionPrice('1000.00'); // Default 1000.00
    setApproveDialogOpen(true);
  };

  const confirmApprove = async () => {
    const commission = parseFloat(commissionPercentage);
    const subscription = parseFloat(subscriptionPrice);

    if (isNaN(commission) || commission < 0 || commission > 100) {
      alert('Please enter a valid commission percentage between 0 and 100');
      return;
    }

    if (isNaN(subscription) || subscription < 0) {
      alert('Please enter a valid subscription price (>= 0)');
      return;
    }

    try {
      await adminAPI.approveACCApplication(selectedApp.id, {
        commission_percentage: commission,
        subscription_price: subscription
      });
      await loadApplications();
      setApproveDialogOpen(false);
      setSelectedApp(null);
      setCommissionPercentage('10');
      setSubscriptionPrice('1000.00');
    } catch (error) {
      alert('Failed to approve application: ' + (error?.response?.data?.message || error.message || 'Unknown error'));
    }
  };

  const handleViewDetails = async (app) => {
    try {
      const data = await adminAPI.getACCApplication(app.id);
      setSelectedApp(data.application);
      setDetailModalOpen(true);
    } catch (error) {
      console.error('Failed to load application details:', error);
      setSelectedApp(app);
      setDetailModalOpen(true);
    }
  };

  const handleReject = (app) => {
    setSelectedApp(app);
    setRejectionReason('');
    setRejectDialogOpen(true);
  };

  const confirmReject = async () => {
    if (!rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }
    try {
      await adminAPI.rejectACCApplication(selectedApp.id, { rejection_reason: rejectionReason });
      await loadApplications();
      setRejectDialogOpen(false);
      setSelectedApp(null);
      setRejectionReason('');
    } catch (error) {
      alert('Failed to reject application: ' + (error.message || 'Unknown error'));
    }
  };

  // filteredApplications removed - using server-side filtering

  // Use stats from API response or calculate from current data
  const totalCount = stats.total || pagination.total;
  const pendingCount = stats.pending;
  const rejectedCount = stats.rejected;

  // DataTable columns
  const columns = useMemo(() => [
    {
      header: 'Organization',
      accessor: 'name',
      sortable: true,
      render: (value, row) => (
        <div className="flex items-center">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg flex items-center justify-center mr-3">
            <Building2 className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <div className="font-medium text-gray-900">{value || 'N/A'}</div>
            <div className="text-xs text-gray-500">{row.legal_name || ''}</div>
          </div>
        </div>
      )
    },
    {
      header: 'Email',
      accessor: 'email',
      sortable: true,
      render: (value) => (
        <div className="flex items-center text-sm text-gray-600">
          <Mail className="h-4 w-4 mr-2 text-gray-400" />
          {value || 'N/A'}
        </div>
      )
    },
    {
      header: 'Status',
      accessor: 'status',
      sortable: true,
      render: (value) => {
        const statusConfig = {
          approved: {
            badgeClass: 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300',
            icon: CheckCircle
          },
          rejected: {
            badgeClass: 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 border border-red-300',
            icon: XCircle
          },
          pending: {
            badgeClass: 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 border border-yellow-300',
            icon: Clock
          }
        };
        const config = statusConfig[value] || statusConfig.pending;
        const Icon = config.icon;
        return (
          <span className={`px-3 py-1.5 inline-flex items-center text-xs leading-5 font-bold rounded-full shadow-sm ${config.badgeClass}`}>
            <Icon size={12} className="mr-1" />
            {value ? value.charAt(0).toUpperCase() + value.slice(1) : 'N/A'}
          </span>
        );
      }
    },
    {
      header: 'Date',
      accessor: 'created_at',
      sortable: true,
      render: (value) => (
        <span className="text-sm text-gray-600">
          {value ? new Date(value).toLocaleDateString() : 'N/A'}
        </span>
      )
    }
  ], []);

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <TabCardsGrid columns={{ mobile: 1, tablet: 2, desktop: 3 }}>
        <TabCard
          name="Total"
          value={totalCount}
          icon={ClipboardList}
          colorType="indigo"
          isActive={statusFilter === 'all'}
          onClick={() => setStatusFilter('all')}
        />
        <TabCard
          name="Pending"
          value={pendingCount}
          icon={Clock}
          colorType="yellow"
          isActive={statusFilter === 'pending'}
          onClick={() => setStatusFilter('pending')}
        />
        <TabCard
          name="Rejected"
          value={rejectedCount}
          icon={XCircle}
          colorType="red"
          isActive={statusFilter === 'rejected'}
          onClick={() => setStatusFilter('rejected')}
        />
      </TabCardsGrid>

      {/* DataTable */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        <DataTable
          columns={columns}
          data={allApplications}
          onView={handleViewDetails}
          onRowClick={handleViewDetails}
          isLoading={loading}
          emptyMessage="No applications found"
          searchable={true}
          searchValue={searchQuery}
          searchPlaceholder="Search by organization name, email, or legal name..."
          onSearch={(value) => {
            setSearchQuery(value);
          }}
          filterable={false}
        />

        {/* Pagination */}
        {allApplications.length > 0 && (
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

      {/* Detail View Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedApp(null);
        }}
        title="ACC Application Details"
        size="lg"
      >
        <div className="space-y-6">
          {selectedApp && (
            <>
              <DetailForm
                data={{
                  ...selectedApp,
                  // Company Info
                  name: selectedApp.name || selectedApp.legal_name,

                  // Address Merging
                  physical_address_full: [
                    selectedApp.physical_address?.street || selectedApp.physical_street || selectedApp.address,
                    selectedApp.physical_address?.city || selectedApp.physical_city,
                    selectedApp.physical_address?.country || selectedApp.physical_country || selectedApp.country,
                    selectedApp.physical_address?.postal_code || selectedApp.physical_postal_code
                  ].filter(Boolean).join(', '),

                  mailing_address_full: (selectedApp.mailing_same_as_physical || selectedApp.mailing_address?.same_as_physical)
                    ? 'Same as Physical Address'
                    : [
                      selectedApp.mailing_address?.street || selectedApp.mailing_street,
                      selectedApp.mailing_address?.city || selectedApp.mailing_city,
                      selectedApp.mailing_address?.country || selectedApp.mailing_country,
                      selectedApp.mailing_address?.postal_code || selectedApp.mailing_postal_code
                    ].filter(Boolean).join(', '),

                  // Primary Contact
                  primary_contact_full_name: [
                    selectedApp.primary_contact?.title || selectedApp.primary_contact_title,
                    selectedApp.primary_contact?.first_name || selectedApp.primary_contact_first_name,
                    selectedApp.primary_contact?.last_name || selectedApp.primary_contact_last_name
                  ].filter(Boolean).join(' '),
                  primary_contact_email: selectedApp.primary_contact?.email || selectedApp.primary_contact_email,
                  primary_contact_mobile: selectedApp.primary_contact?.mobile || selectedApp.primary_contact_mobile,
                  primary_contact_country: selectedApp.primary_contact?.country || selectedApp.primary_contact_country,
                  primary_contact_passport_url: selectedApp.primary_contact?.passport_url || selectedApp.primary_contact_passport_url,

                  // Secondary Contact
                  secondary_contact_full_name: [
                    selectedApp.secondary_contact?.title || selectedApp.secondary_contact_title,
                    selectedApp.secondary_contact?.first_name || selectedApp.secondary_contact_first_name,
                    selectedApp.secondary_contact?.last_name || selectedApp.secondary_contact_last_name
                  ].filter(Boolean).join(' '),
                  secondary_contact_email: selectedApp.secondary_contact?.email || selectedApp.secondary_contact_email,
                  secondary_contact_mobile: selectedApp.secondary_contact?.mobile || selectedApp.secondary_contact_mobile,
                  secondary_contact_country: selectedApp.secondary_contact?.country || selectedApp.secondary_contact_country,
                  secondary_contact_passport_url: selectedApp.secondary_contact?.passport_url || selectedApp.secondary_contact_passport_url,

                  // Agreements
                  agreements_summary: [
                    selectedApp.agreed_to_receive_communications ? 'Receives Comms' : null,
                    selectedApp.agreed_to_terms_and_conditions ? 'Terms Accepted' : null
                  ].filter(Boolean).join(', ')
                }}
                fields={[
                  { key: 'name', label: 'Company Name', icon: Building2 },
                  { key: 'legal_name', label: 'Legal Name', showEmpty: false },
                  { key: 'registration_number', label: 'Registration Number', icon: Hash, showEmpty: false },
                  { key: 'email', label: 'Email', type: 'email', icon: Mail },
                  { key: 'phone', label: 'Phone', icon: Phone, showEmpty: false },
                  { key: 'website', label: 'Website', type: 'url', icon: Globe, showEmpty: false },
                  { key: 'physical_address_full', label: 'Physical Address', icon: MapPin, fullWidth: true, showEmpty: false },
                  { key: 'mailing_address_full', label: 'Mailing Address', icon: MapPin, fullWidth: true, showEmpty: false },

                  // Primary Contact
                  { key: 'primary_contact_full_name', label: 'Primary Contact Name', showEmpty: false },
                  { key: 'primary_contact_email', label: 'Primary Contact Email', type: 'email', showEmpty: false },
                  { key: 'primary_contact_mobile', label: 'Primary Contact Mobile', showEmpty: false },
                  { key: 'primary_contact_country', label: 'Primary Contact Country', showEmpty: false },
                  {
                    key: 'primary_contact_passport_url',
                    label: 'Primary Contact Passport',
                    render: (value) => value ? (
                      <a
                        href={value}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Eye size={16} className="mr-2" /> View Passport
                      </a>
                    ) : null,
                    showEmpty: false
                  },

                  // Secondary Contact
                  { key: 'secondary_contact_full_name', label: 'Secondary Contact Name', showEmpty: false },
                  { key: 'secondary_contact_email', label: 'Secondary Contact Email', type: 'email', showEmpty: false },
                  { key: 'secondary_contact_mobile', label: 'Secondary Contact Mobile', showEmpty: false },
                  { key: 'secondary_contact_country', label: 'Secondary Contact Country', showEmpty: false },
                  {
                    key: 'secondary_contact_passport_url',
                    label: 'Secondary Contact Passport',
                    render: (value) => value ? (
                      <a
                        href={value}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Eye size={16} className="mr-2" /> View Passport
                      </a>
                    ) : null,
                    showEmpty: false
                  },

                  { key: 'company_gov_registry_number', label: 'Gov Registry Number', showEmpty: false },
                  {
                    key: 'company_registration_certificate_url',
                    label: 'Registration Certificate',
                    render: (value) => value ? (
                      <a
                        href={value}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Eye size={16} className="mr-2" /> View Certificate
                      </a>
                    ) : null,
                    showEmpty: false
                  },
                  { key: 'how_did_you_hear_about_us', label: 'How did you hear about us?', showEmpty: false },
                  { key: 'agreements_summary', label: 'Agreements', showEmpty: false },

                  { key: 'status', label: 'Status', type: 'status' },
                  { key: 'request_date', label: 'Request Date', type: 'datetime', icon: Calendar, showEmpty: false },
                  { key: 'created_at', label: 'Created At', type: 'datetime', icon: Calendar, showEmpty: false },
                ]}
              />
            </>
          )}
          {selectedApp && selectedApp.status === 'pending' && (
            <div className="flex space-x-3 pt-4 border-t border-gray-200">
              <Button
                variant="success"
                fullWidth
                icon={<CheckCircle size={20} />}
                onClick={() => {
                  setDetailModalOpen(false);
                  handleApprove(selectedApp);
                }}
              >
                Approve Application
              </Button>
              <Button
                variant="danger"
                fullWidth
                icon={<XCircle size={20} />}
                onClick={() => {
                  setDetailModalOpen(false);
                  handleReject(selectedApp);
                }}
              >
                Reject Application
              </Button>
            </div>
          )}
        </div>
      </Modal>

      {/* Reject Dialog */}
      <Modal
        isOpen={rejectDialogOpen}
        onClose={() => {
          setRejectDialogOpen(false);
          setSelectedApp(null);
          setRejectionReason('');
        }}
        title="Reject ACC Application"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Please provide a reason for rejecting this application:
          </p>
          <FormInput
            label="Rejection Reason"
            name="rejection_reason"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            textarea
            rows={4}
            required
            placeholder="Enter the reason for rejection..."
          />
          <div className="flex space-x-3 pt-4">
            <Button
              variant="outline"
              fullWidth
              onClick={() => {
                setRejectDialogOpen(false);
                setSelectedApp(null);
                setRejectionReason('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              fullWidth
              onClick={confirmReject}
            >
              Reject Application
            </Button>
          </div>
        </div>
      </Modal>

      {/* Approve Dialog */}
      <Modal
        isOpen={approveDialogOpen}
        onClose={() => {
          setApproveDialogOpen(false);
          setSelectedApp(null);
          setCommissionPercentage('10');
          setSubscriptionPrice('1000.00');
        }}
        title="Approve ACC Application"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Please configure the financial settings for this ACC:
          </p>

          <FormInput
            label="Commission Percentage (%)"
            name="commission_percentage"
            type="number"
            value={commissionPercentage}
            onChange={(e) => setCommissionPercentage(e.target.value)}
            min="0"
            max="100"
            step="0.1"
            required
            placeholder="Enter commission percentage (0-100)"
          />

          <FormInput
            label="Subscription Price (USD)"
            name="subscription_price"
            type="number"
            value={subscriptionPrice}
            onChange={(e) => setSubscriptionPrice(e.target.value)}
            min="0"
            step="0.01"
            required
            placeholder="Enter annual subscription price"
          />

          <p className="text-sm text-gray-500">
            The commission percentage will be applied to transactions, and the subscription price will be charged annually.
          </p>

          <div className="flex space-x-3 pt-4">
            <Button
              variant="outline"
              fullWidth
              onClick={() => {
                setApproveDialogOpen(false);
                setSelectedApp(null);
                setCommissionPercentage('10');
                setSubscriptionPrice('1000.00');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="success"
              fullWidth
              onClick={confirmApprove}
            >
              Approve Application
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ACCApplicationsScreen;
