import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from '../../../hooks/useTranslation';
import { accAPI } from '../../../services/api';
import { useHeader } from '../../../context/HeaderContext';
import { Building2, CheckCircle, XCircle, Eye, Clock, ArrowLeft, Mail, Phone, MapPin, Globe, FileText, Hash, Calendar, Search, ExternalLink, User, History } from 'lucide-react';
import Modal from '../../../components/Modal/Modal';
import FormInput from '../../../components/FormInput/FormInput';
import TabCard from '../../../components/TabCard/TabCard';
import TabCardsGrid from '../../../components/TabCardsGrid/TabCardsGrid';
import DataTable from '../../../components/DataTable/DataTable';
import DetailForm from '../../../components/DetailForm/DetailForm';
import Pagination from '../../../components/Pagination/Pagination';
import './TrainingCentersScreen.css';

const TrainingCentersScreen = () => {
  const { t } = useTranslation('accreditation');
  const { setHeaderTitle, setHeaderSubtitle } = useHeader();
  const [searchParams, setSearchParams] = useSearchParams();

  // Data State
  const [tableData, setTableData] = useState([]);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
    per_page: 10,
    from: 0,
    to: 0
  });
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    pending: 0,
    returned: 0,
    rejected: 0
  });

  // UI State
  const [loading, setLoading] = useState(true);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [returnComment, setReturnComment] = useState('');

  // Filter & Search State
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPagination(prev => ({ ...prev, current_page: 1 })); // Reset to page 1 on search
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Read filter from URL params on mount
  useEffect(() => {
    const filterParam = searchParams.get('filter');
    if (filterParam && ['pending', 'active', 'returned', 'rejected', 'all'].includes(filterParam)) {
      setStatusFilter(filterParam);
    }
  }, [searchParams]);

  // Load data when dependencies change
  useEffect(() => {
    loadData();
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, pagination.current_page, pagination.per_page, debouncedSearch]);

  useEffect(() => {
    setHeaderTitle(t('training_centers_screen.header.title'));
    setHeaderSubtitle(t('training_centers_screen.header.subtitle'));
    return () => {
      setHeaderTitle(null);
      setHeaderSubtitle(null);
    };
  }, [setHeaderTitle, setHeaderSubtitle, t]);

  // Fetch stats for tabs
  const fetchStats = async () => {
    try {
      const response = await accAPI.getTrainingCenterRequests({ per_page: 1 });

      if (response?.statistics) {
        setStats({
          total: response.statistics.total || 0,
          active: response.statistics.approved || 0,
          pending: response.statistics.pending || 0,
          returned: response.statistics.returned || 0,
          rejected: response.statistics.rejected || 0
        });
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.current_page,
        per_page: pagination.per_page,
        search: debouncedSearch,
      };

      let response;
      let dataList = [];
      let isRequest = false;

      // Determine endpoint based on filter
      if (statusFilter === 'active') {
        // Active/Authorized view
        response = await accAPI.listAuthorizedTrainingCenters(params);
        dataList = response?.data || [];
        isRequest = false;
      } else {
        // Requests view (Pending, Returned, All)
        if (statusFilter !== 'all') {
          params.status = statusFilter;
        }
        // If 'all', do not add status param - fetch all requests

        response = await accAPI.getTrainingCenterRequests(params);
        dataList = response?.data || response?.requests || [];
        isRequest = true;
      }

      // Normalize data
      const normalizedData = dataList.map(item => {
        // Handle nested objects if any (API consistency check)
        const baseItem = item.training_center || item;

        return {
          ...item,
          _normalizedName: baseItem.name || item.name || '',
          _normalizedEmail: baseItem.email || item.email || '',
          _normalizedDate: isRequest ? item.request_date : (item.authorized_at || item.created_at),
          _isRequest: isRequest,
          // Ensure status is present
          status: item.status || (isRequest ? (statusFilter === 'all' ? 'pending' : statusFilter) : 'active'),
        };
      });

      setTableData(normalizedData);

      // Update pagination
      if (response) {
        setPagination(prev => ({
          ...prev,
          current_page: response.current_page || 1,
          last_page: response.last_page || 1,
          total: response.total || 0,
          from: response.from || 0,
          to: response.to || 0
        }));
      }

    } catch (error) {
      console.error('Failed to load data:', error);
      setTableData([]);
    } finally {
      setLoading(false);
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

  const handleApprove = async (id) => {
    if (window.confirm(t('training_centers_screen.messages.approve_confirm'))) {
      try {
        await accAPI.approveTrainingCenterRequest(id);
        await loadData();
        await fetchStats();
        alert(t('training_centers_screen.messages.approve_success'));
      } catch (error) {
        // Extract error message from API response
        const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
        alert(t('training_centers_screen.messages.approve_failed') + ': ' + errorMessage);
      }
    }
  };

  const handleViewDetails = (item) => {
    setSelectedRequest(item);
    setDetailModalOpen(true);
  };

  const handleRowClick = (item) => {
    handleViewDetails(item);
  };

  // Define columns for DataTable
  const columns = useMemo(() => [
    {
      header: t('training_centers_screen.table.training_center'),
      accessor: '_normalizedName',
      sortable: true,
      render: (value, row) => {
        const logoUrl = row.logo_url || row.training_center?.logo_url;
        return (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 mr-3 relative">
              {logoUrl ? (
                <>
                  <img
                    src={logoUrl}
                    alt={value || 'Training Provider Logo'}
                    className="w-10 h-10 rounded-lg object-cover border border-gray-200"
                    width="40"
                    height="40"
                    loading="lazy"
                    decoding="async"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      const fallback = e.target.parentElement?.querySelector('.logo-fallback');
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                  <div
                    className="logo-fallback w-10 h-10 bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg items-center justify-center hidden"
                    style={{ display: 'none', position: 'absolute', top: 0, left: 0 }}
                  >
                    <Building2 className="h-5 w-5 text-primary-600" />
                  </div>
                </>
              ) : (
                <div className="w-10 h-10 bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-primary-600" />
                </div>
              )}
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900">{value || 'N/A'}</div>
            </div>
          </div>
        );
      }
    },
    {
      header: t('training_centers_screen.table.email'),
      accessor: '_normalizedEmail',
      sortable: true,
      render: (value) => (
        <div className="flex items-center text-sm text-gray-600 gap-3">
          <Mail className="h-4 w-4 mr-2 text-gray-400" />
          {value || 'N/A'}
        </div>
      )
    },
    {
      header: t('training_centers_screen.table.date'),
      accessor: '_normalizedDate',
      sortable: true,
      render: (value) => (
        <span className="text-sm text-gray-600">
          {value ? new Date(value).toLocaleDateString() : 'N/A'}
        </span>
      )
    },
    {
      header: t('training_centers_screen.table.status'),
      accessor: 'status',
      sortable: true,
      render: (value, row) => {
        const statusConfig = {
          approved: {
            badgeClass: 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300',
            icon: CheckCircle
          },
          active: {
            badgeClass: 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300',
            icon: CheckCircle
          },
          rejected: {
            badgeClass: 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 border border-red-300',
            icon: XCircle
          },
          returned: {
            badgeClass: 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-300',
            icon: ArrowLeft
          },
          pending: {
            badgeClass: 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 border border-yellow-300',
            icon: Clock
          }
        };
        const config = statusConfig[value] || statusConfig.pending;
        const Icon = config.icon;
        return (
          <div className="flex flex-col gap-1">
            <span className={`px-3 py-1.5 inline-flex items-center text-xs leading-5 font-bold rounded-full shadow-sm w-fit ${config.badgeClass}`}>
              <Icon size={12} className="mr-1" />
              {value ? t(`training_centers_screen.status.${value}`) : t('training_centers_screen.common.na')}
            </span>
            {row._isRequest && row.total_requests_count > 1 && (
              <span className="text-xs text-gray-500 px-1">
                {row.total_requests_count} requests
              </span>
            )}
          </div>
        );
      }
    },
    {
      header: t('training_centers_screen.table.actions'),
      accessor: 'actions',
      sortable: false,
      render: (value, row) => (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => handleViewDetails(row)}
            className="p-2 rounded-lg bg-primary-50 text-primary-600 hover:bg-primary-100 hover:scale-110 transition-all duration-200 shadow-sm hover:shadow-md"
            title={t('training_centers_screen.actions.view_details')}
          >
            <Eye size={16} />
          </button>
          {(row.status === 'pending' || row.status === 'returned') && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleApprove(row.id);
              }}
              className="p-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 hover:scale-110 transition-all duration-200 shadow-sm hover:shadow-md"
              title={t('training_centers_screen.actions.approve')}
            >
              <CheckCircle size={16} />
            </button>
          )}
        </div>
      )
    }
  ], []);

  const handleReject = (request) => {
    setSelectedRequest(request);
    setRejectionReason('');
    setRejectModalOpen(true);
  };

  const confirmReject = async () => {
    if (!rejectionReason.trim()) {
      alert(t('training_centers_screen.rejection.missing_reason'));
      return;
    }
    try {
      await accAPI.rejectTrainingCenterRequest(selectedRequest.id, { rejection_reason: rejectionReason });
      await loadData();
      await fetchStats();
      setRejectModalOpen(false);
      setSelectedRequest(null);
      setRejectionReason('');
      alert(t('training_centers_screen.rejection.success'));
    } catch (error) {
      // Extract error message from API response
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
      alert('Failed to reject: ' + errorMessage);
    }
  };

  const handleReturn = (request) => {
    setSelectedRequest(request);
    setReturnComment('');
    setReturnModalOpen(true);
  };

  const confirmReturn = async () => {
    if (!returnComment.trim()) {
      alert(t('training_centers_screen.return.missing_comment'));
      return;
    }
    try {
      await accAPI.returnTrainingCenterRequest(selectedRequest.id, { return_comment: returnComment });
      await loadData();
      await fetchStats();
      setReturnModalOpen(false);
      setSelectedRequest(null);
      setReturnComment('');
      alert(t('training_centers_screen.return.success'));
    } catch (error) {
      // Extract error message from API response
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
      alert('Failed to return request: ' + errorMessage);
    }
  };

  return (
    <div>
      {/* Tab Cards */}
      <div className="mb-6">
        <TabCardsGrid columns={{ mobile: 1, tablet: 2, desktop: 5 }}>
          <TabCard
            name={t('training_centers_screen.tabs.total')}
            value={stats.total}
            icon={Building2}
            colorType="indigo"
            isActive={statusFilter === 'all'}
            onClick={() => {
              setStatusFilter('all');
              setPagination(prev => ({ ...prev, current_page: 1 }));
            }}
          />
          <TabCard
            name={t('training_centers_screen.tabs.pending')}
            value={stats.pending}
            icon={Clock}
            colorType="yellow"
            isActive={statusFilter === 'pending'}
            onClick={() => {
              setStatusFilter('pending');
              setPagination(prev => ({ ...prev, current_page: 1 }));
            }}
          />
          <TabCard
            name={t('training_centers_screen.tabs.active')}
            value={stats.active}
            icon={CheckCircle}
            colorType="green"
            isActive={statusFilter === 'active'}
            onClick={() => {
              setStatusFilter('active');
              setPagination(prev => ({ ...prev, current_page: 1 }));
            }}
          />
          <TabCard
            name={t('training_centers_screen.tabs.returned')}
            value={stats.returned}
            icon={ArrowLeft}
            colorType="blue"
            isActive={statusFilter === 'returned'}
            onClick={() => {
              setStatusFilter('returned');
              setPagination(prev => ({ ...prev, current_page: 1 }));
            }}
          />
          <TabCard
            name={t('training_centers_screen.tabs.rejected')}
            value={stats.rejected}
            icon={XCircle}
            colorType="red"
            isActive={statusFilter === 'rejected'}
            onClick={() => {
              setStatusFilter('rejected');
              setPagination(prev => ({ ...prev, current_page: 1 }));
            }}
          />
        </TabCardsGrid>
      </div>

      {/* Server-side Search Input */}
      <div className="mb-4">
        <div className="relative">
          <input
            type="text"
            placeholder={t('training_centers_screen.search.placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
          />
          <div className="absolute left-3 top-2.5 text-gray-400">
            <Search size={20} />
          </div>
        </div>
      </div>

      {/* DataTable */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        <DataTable
          columns={columns}
          data={tableData}
          isLoading={loading}
          searchable={false} // Disable client-side search
          sortable={true}
          filterable={false}
          emptyMessage={t('training_centers_screen.table.empty')}
          onRowClick={(item) => handleRowClick(item)}
        />

        {/* Pagination */}
        {pagination.total > 0 && (
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

      {/* Detail Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedRequest(null);
        }}
        title={selectedRequest?._isRequest ? t('training_centers_screen.details.request_title') : t('training_centers_screen.details.details_title')}
        size="lg"
      >
        {selectedRequest && (
          <div className="space-y-6">
            {/* Request Information - Only for requests */}
            {selectedRequest._isRequest && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <FileText className="mr-2" size={20} />
                  {t('training_centers_screen.details.request_info')}
                </h3>
                <DetailForm
                  data={selectedRequest}
                  fields={[
                    { key: 'id', label: t('training_centers_screen.details.request_id'), icon: Hash, render: (value) => value ? `#${value}` : t('training_centers_screen.common.na'), showEmpty: false },
                    { key: 'training_center_id', label: t('training_centers_screen.details.training_center_id'), icon: Building2, render: (value) => value ? `#${value}` : t('training_centers_screen.common.na'), showEmpty: false },
                    { key: 'request_date', label: t('training_centers_screen.details.request_date'), type: 'datetime', icon: Calendar, showEmpty: false },
                    { key: 'status', label: t('training_centers_screen.table.status'), type: 'status', icon: Clock },
                    { key: 'created_at', label: t('training_centers_screen.details.created_at'), type: 'datetime', icon: Calendar, showEmpty: false },
                    { key: 'updated_at', label: t('training_centers_screen.details.updated_at'), type: 'datetime', icon: Calendar, showEmpty: false },
                    { key: 'reviewed_at', label: t('training_centers_screen.details.reviewed_at'), type: 'datetime', icon: Calendar, showEmpty: false },
                  ]}
                />
              </div>
            )}

            {/* Training Provider Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Building2 className="mr-2" size={20} />
                {t('training_centers_screen.details.training_center_info')}
              </h3>
              <DetailForm
                data={{
                  // Company Information
                  name: selectedRequest.training_center?.name || selectedRequest.name || selectedRequest._normalizedName,
                  website: selectedRequest.training_center?.website || selectedRequest.website,
                  email: selectedRequest.training_center?.email || selectedRequest.email || selectedRequest._normalizedEmail,
                  phone: selectedRequest.training_center?.phone || selectedRequest.phone,
                  fax: selectedRequest.training_center?.fax || selectedRequest.fax,
                  training_provider_type: selectedRequest.training_center?.training_provider_type || selectedRequest.training_provider_type,

                  // Physical Address - Merged
                  full_address: [
                    selectedRequest.training_center?.address || selectedRequest.address,
                    selectedRequest.training_center?.city || selectedRequest.city,
                    selectedRequest.training_center?.country || selectedRequest.country,
                    selectedRequest.training_center?.physical_postal_code || selectedRequest.physical_postal_code
                  ].filter(Boolean).join(', '),

                  // Mailing Address - Merged
                  mailing_same_as_physical: selectedRequest.training_center?.mailing_same_as_physical || selectedRequest.mailing_same_as_physical,
                  mailing_full_address: [
                    selectedRequest.training_center?.mailing_address || selectedRequest.mailing_address,
                    selectedRequest.training_center?.mailing_city || selectedRequest.mailing_city,
                    selectedRequest.training_center?.mailing_country || selectedRequest.mailing_country,
                    selectedRequest.training_center?.mailing_postal_code || selectedRequest.mailing_postal_code
                  ].filter(Boolean).join(', '),

                  // Primary Contact - Merged
                  primary_contact_name: [
                    selectedRequest.training_center?.primary_contact_title || selectedRequest.primary_contact_title,
                    selectedRequest.training_center?.primary_contact_first_name || selectedRequest.primary_contact_first_name,
                    selectedRequest.training_center?.primary_contact_last_name || selectedRequest.primary_contact_last_name
                  ].filter(Boolean).join(' '),

                  primary_contact_email: selectedRequest.training_center?.primary_contact_email || selectedRequest.primary_contact_email,
                  primary_contact_country: selectedRequest.training_center?.primary_contact_country || selectedRequest.primary_contact_country,
                  primary_contact_mobile: selectedRequest.training_center?.primary_contact_mobile || selectedRequest.primary_contact_mobile,

                  // Secondary Contact - Merged
                  has_secondary_contact: selectedRequest.training_center?.has_secondary_contact || selectedRequest.has_secondary_contact,
                  secondary_contact_name: [
                    selectedRequest.training_center?.secondary_contact_title || selectedRequest.secondary_contact_title,
                    selectedRequest.training_center?.secondary_contact_first_name || selectedRequest.secondary_contact_first_name,
                    selectedRequest.training_center?.secondary_contact_last_name || selectedRequest.secondary_contact_last_name
                  ].filter(Boolean).join(' '),

                  secondary_contact_email: selectedRequest.training_center?.secondary_contact_email || selectedRequest.secondary_contact_email,
                  secondary_contact_country: selectedRequest.training_center?.secondary_contact_country || selectedRequest.secondary_contact_country,
                  secondary_contact_mobile: selectedRequest.training_center?.secondary_contact_mobile || selectedRequest.secondary_contact_mobile,

                  // Additional Information
                  company_gov_registry_number: selectedRequest.training_center?.company_gov_registry_number || selectedRequest.company_gov_registry_number,
                  company_registration_certificate_url: selectedRequest.training_center?.company_registration_certificate_url || selectedRequest.company_registration_certificate_url,
                  facility_floorplan_url: selectedRequest.training_center?.facility_floorplan_url || selectedRequest.facility_floorplan_url,
                  interested_fields: selectedRequest.training_center?.interested_fields || selectedRequest.interested_fields,
                  how_did_you_hear_about_us: selectedRequest.training_center?.how_did_you_hear_about_us || selectedRequest.how_did_you_hear_about_us,

                  agreements_summary: [
                    (selectedRequest.training_center?.agreed_to_receive_communications || selectedRequest.agreed_to_receive_communications) ? 'Communcations Accepted' : null,
                    (selectedRequest.training_center?.agreed_to_terms_and_conditions || selectedRequest.agreed_to_terms_and_conditions) ? 'Terms Accepted' : null
                  ].filter(Boolean).join(', '),

                  // Legacy fields
                  legal_name: selectedRequest.training_center?.legal_name || selectedRequest.legal_name,
                  registration_number: selectedRequest.training_center?.registration_number || selectedRequest.registration_number,
                  authorized_at: selectedRequest.authorized_at,
                }}
                fields={[
                  // Company Information
                  { key: 'name', label: t('training_centers_screen.company.company_name'), icon: Building2 },
                  { key: 'website', label: t('training_centers_screen.company.website'), type: 'url', icon: Globe, showEmpty: false },
                  { key: 'email', label: t('training_centers_screen.company.email'), type: 'email', icon: Mail },
                  { key: 'phone', label: t('training_centers_screen.company.phone'), icon: Phone, showEmpty: false },
                  { key: 'fax', label: t('training_centers_screen.company.fax'), icon: Phone, showEmpty: false },
                  { key: 'training_provider_type', label: t('training_centers_screen.company.training_provider_type'), showEmpty: false },

                  // Physical Address
                  { key: 'full_address', label: t('training_centers_screen.company.physical_address'), icon: MapPin, fullWidth: true, showEmpty: false },

                  // Mailing Address
                  {
                    key: 'mailing_same_as_physical',
                    label: t('training_centers_screen.company.mailing_same_as_physical'),
                    transform: (value) => value ? t('training_centers_screen.common.yes') : t('training_centers_screen.common.no'),
                    showEmpty: false
                  },
                  { key: 'mailing_full_address', label: t('training_centers_screen.company.mailing_address'), icon: Mail, fullWidth: true, showEmpty: false },

                  // Primary Contact
                  { key: 'primary_contact_name', label: t('training_centers_screen.company.primary_contact'), icon: User, showEmpty: false },
                  { key: 'primary_contact_email', label: t('training_centers_screen.company.primary_contact_email'), type: 'email', showEmpty: false },
                  { key: 'primary_contact_country', label: t('training_centers_screen.company.primary_contact_country'), showEmpty: false },
                  { key: 'primary_contact_mobile', label: t('training_centers_screen.company.primary_contact_mobile'), showEmpty: false },

                  // Secondary Contact
                  {
                    key: 'has_secondary_contact',
                    label: t('training_centers_screen.company.secondary_contact'),
                    transform: (value) => value ? t('training_centers_screen.common.yes') : t('training_centers_screen.common.no'),
                    showEmpty: false
                  },
                  { key: 'secondary_contact_name', label: t('training_centers_screen.company.secondary_contact'), icon: User, showEmpty: false },
                  { key: 'secondary_contact_email', label: t('training_centers_screen.company.secondary_contact_email'), type: 'email', showEmpty: false },
                  { key: 'secondary_contact_country', label: t('training_centers_screen.company.secondary_contact_country'), showEmpty: false },
                  { key: 'secondary_contact_mobile', label: t('training_centers_screen.company.secondary_contact_mobile'), showEmpty: false },

                  // Additional Information
                  { key: 'company_gov_registry_number', label: t('training_centers_screen.company.gov_registry_number'), showEmpty: false },
                  {
                    key: 'company_registration_certificate_url',
                    label: t('training_centers_screen.company.registration_certificate'),
                    showEmpty: false,
                    render: (value) => (
                      <a
                        href={value}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-3 py-1.5 bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100 transition-colors text-sm font-medium"
                      >
                        <FileText size={16} className="mr-2" />
                        {t('training_centers_screen.documents.view_certificate')}
                        <ExternalLink size={14} className="ml-1 opacity-70" />
                      </a>
                    )
                  },
                  {
                    key: 'facility_floorplan_url',
                    label: t('training_centers_screen.company.facility_floorplan'),
                    showEmpty: false,
                    render: (value) => (
                      <a
                        href={value}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-3 py-1.5 bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100 transition-colors text-sm font-medium"
                      >
                        <MapPin size={16} className="mr-2" />
                        {t('training_centers_screen.documents.view_floorplan')}
                        <ExternalLink size={14} className="ml-1 opacity-70" />
                      </a>
                    )
                  },
                  {
                    key: 'interested_fields',
                    label: t('training_centers_screen.company.interested_fields'),
                    transform: (value) => Array.isArray(value) ? value.join(', ') : value,
                    showEmpty: false
                  },
                  { key: 'how_did_you_hear_about_us', label: t('training_centers_screen.company.how_did_you_hear'), showEmpty: false },
                  { key: 'agreements_summary', label: 'Agreements', showEmpty: false },

                  // Legacy fields
                  { key: 'legal_name', label: t('training_centers_screen.company.company_name'), showEmpty: false },
                  { key: 'registration_number', label: t('training_centers_screen.company.gov_registry_number'), showEmpty: false },
                  { key: 'authorized_at', label: t('training_centers_screen.details.reviewed_at'), type: 'datetime', icon: Calendar, showEmpty: false },
                ]}
              />
              {(selectedRequest.training_center?.description || selectedRequest.description) && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">{t('training_centers_screen.company.description')}</p>
                  <p className="text-base text-gray-900">
                    {selectedRequest.training_center?.description || selectedRequest.description}
                  </p>
                </div>
              )}
            </div>

            {/* Documents */}
            {selectedRequest._isRequest && selectedRequest.documents_json && Array.isArray(selectedRequest.documents_json) && selectedRequest.documents_json.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <FileText className="mr-2" size={20} />
                  {t('training_centers_screen.details.documents')}
                </h3>
                <div className="space-y-2">
                  {selectedRequest.documents_json.map((doc, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{doc.type || doc.document_type || `Document ${index + 1}`}</p>
                          {doc.description && (
                            <p className="text-sm text-gray-500 mt-1">{doc.description}</p>
                          )}
                        </div>
                        {doc.url && (
                          <a
                            href={doc.url.startsWith('http') ? doc.url : `${import.meta.env.VITE_API_BASE_URL}${doc.url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                          >
                            {t('training_centers_screen.documents.view_document')}
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rejection Reason */}
            {selectedRequest._isRequest && selectedRequest.rejection_reason && (
              <div className="p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-lg border border-red-200">
                <div className="flex items-center mb-2">
                  <XCircle className="h-5 w-5 text-red-600 mr-2" />
                  <h3 className="text-lg font-semibold text-red-900">{t('training_centers_screen.rejection.reason_label')}</h3>
                </div>
                <p className="text-base text-gray-900">{selectedRequest.rejection_reason}</p>
              </div>
            )}

            {/* Return Comment */}
            {selectedRequest._isRequest && selectedRequest.return_comment && (
              <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                <div className="flex items-center mb-2">
                  <ArrowLeft className="h-5 w-5 text-blue-600 mr-2" />
                  <h3 className="text-lg font-semibold text-blue-900">{t('training_centers_screen.return.comment_label')}</h3>
                </div>
                <p className="text-base text-gray-900">{selectedRequest.return_comment}</p>
              </div>
            )}

            {/* Request History */}
            {selectedRequest._isRequest && (
              <div className="pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <History className="mr-2" size={20} />
                    {t('training_centers_screen.details.request_history') || 'Request History'}
                  </h3>
                  <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm font-medium border border-gray-200">
                    {t('training_centers_screen.details.total_requests', { count: selectedRequest.total_requests_count || 1 }) || `Total Requests: ${selectedRequest.total_requests_count || 1}`}
                  </span>
                </div>

                {selectedRequest.previous_requests && selectedRequest.previous_requests.length > 0 ? (
                  <div className="relative border-l-2 border-gray-200 ml-3 space-y-8">
                    {selectedRequest.previous_requests.map((req, index) => {
                      const statusStyles = {
                        approved: 'bg-green-100 text-green-600 border-green-200',
                        rejected: 'bg-red-100 text-red-600 border-red-200',
                        returned: 'bg-blue-100 text-blue-600 border-blue-200',
                        pending: 'bg-yellow-100 text-yellow-600 border-yellow-200'
                      };
                      const statusStyle = statusStyles[req.status] || 'bg-gray-100 text-gray-600 border-gray-200';

                      return (
                        <div key={req.id} className="relative ml-6">
                          <span className={`absolute -left-[33px] flex items-center justify-center w-6 h-6 rounded-full ring-4 ring-white ${req.status === 'approved' ? 'bg-green-100 text-green-600' :
                            req.status === 'rejected' ? 'bg-red-100 text-red-600' :
                              req.status === 'returned' ? 'bg-blue-100 text-blue-600' :
                                'bg-yellow-100 text-yellow-600'
                            }`}>
                            {req.status === 'approved' && <CheckCircle size={14} />}
                            {req.status === 'rejected' && <XCircle size={14} />}
                            {req.status === 'returned' && <ArrowLeft size={14} />}
                            {req.status === 'pending' && <Clock size={14} />}
                          </span>

                          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between mb-2">
                              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusStyle}`}>
                                {t(`training_centers_screen.status.${req.status}`)}
                              </span>
                              <span className="text-xs text-gray-500 flex items-center">
                                <Calendar size={12} className="mr-1" />
                                {new Date(req.request_date).toLocaleString()}
                              </span>
                            </div>

                            {req.reviewed_by && (
                              <div className="text-xs text-gray-500 mb-2 pb-2 border-b border-gray-100">
                                {t('training_centers_screen.details.reviewed_at')}: {new Date(req.reviewed_at).toLocaleDateString()}
                              </div>
                            )}

                            {req.rejection_reason && (
                              <div className="mt-2 text-sm bg-red-50 text-red-700 p-3 rounded-lg border border-red-100">
                                <strong className="block text-xs uppercase tracking-wide opacity-75 mb-1">{t('training_centers_screen.rejection.reason_label')}</strong>
                                {req.rejection_reason}
                              </div>
                            )}

                            {req.return_comment && (
                              <div className="mt-2 text-sm bg-blue-50 text-blue-700 p-3 rounded-lg border border-blue-100">
                                <strong className="block text-xs uppercase tracking-wide opacity-75 mb-1">{t('training_centers_screen.return.comment_label')}</strong>
                                {req.return_comment}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-gray-500 italic ml-4 text-sm bg-gray-50 p-4 rounded-lg text-center">
                    {t('training_centers_screen.details.no_history') || 'No previous requests found.'}
                  </p>
                )}
              </div>
            )}
            {/* Only show action buttons for requests */}
            {selectedRequest._isRequest && selectedRequest.status === 'pending' && (
              <div className="flex space-x-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    handleApprove(selectedRequest.id);
                    setDetailModalOpen(false);
                  }}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center"
                >
                  <CheckCircle size={20} className="mr-2" />
                  Approve
                </button>
                <button
                  onClick={() => {
                    setDetailModalOpen(false);
                    handleReject(selectedRequest);
                  }}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center"
                >
                  <XCircle size={20} className="mr-2" />
                  Reject
                </button>
                <button
                  onClick={() => {
                    setDetailModalOpen(false);
                    handleReturn(selectedRequest);
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center"
                >
                  <ArrowLeft size={20} className="mr-2" />
                  {t('training_centers_screen.actions.return')}
                </button>
              </div>
            )}
            {/* Only show action buttons for requests */}
            {selectedRequest._isRequest && selectedRequest.status === 'returned' && (
              <div className="flex space-x-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    handleApprove(selectedRequest.id);
                    setDetailModalOpen(false);
                  }}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center"
                >
                  <CheckCircle size={20} className="mr-2" />
                  Approve
                </button>
                <button
                  onClick={() => {
                    setDetailModalOpen(false);
                    handleReject(selectedRequest);
                  }}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center"
                >
                  <XCircle size={20} className="mr-2" />
                  Reject
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Reject Modal */}
      <Modal
        isOpen={rejectModalOpen}
        onClose={() => {
          setRejectModalOpen(false);
          setSelectedRequest(null);
          setRejectionReason('');
        }}
        title="Reject Training Provider Request"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-gray-600">Please provide a reason for rejecting this request:</p>
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
            <button
              onClick={() => {
                setRejectModalOpen(false);
                setSelectedRequest(null);
                setRejectionReason('');
              }}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={confirmReject}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Reject Request
            </button>
          </div>
        </div>
      </Modal>

      {/* Return Modal */}
      <Modal
        isOpen={returnModalOpen}
        onClose={() => {
          setReturnModalOpen(false);
          setSelectedRequest(null);
          setReturnComment('');
        }}
        title="Return Training Provider Request"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-gray-600">Please provide comments for returning this request:</p>
          <FormInput
            label="Return Comment"
            name="return_comment"
            value={returnComment}
            onChange={(e) => setReturnComment(e.target.value)}
            textarea
            rows={4}
            required
            placeholder="Enter comments for returning the request..."
          />
          <div className="flex space-x-3 pt-4">
            <button
              onClick={() => {
                setReturnModalOpen(false);
                setSelectedRequest(null);
                setReturnComment('');
              }}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={confirmReturn}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Return Request
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default TrainingCentersScreen;
