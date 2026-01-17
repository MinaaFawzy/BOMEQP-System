import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { accAPI } from '../../../services/api';
import { useHeader } from '../../../context/HeaderContext';
import { Building2, CheckCircle, XCircle, Eye, Clock, ArrowLeft, Mail, Phone, MapPin, Globe, FileText, Hash, Calendar, Search } from 'lucide-react';
import Modal from '../../../components/Modal/Modal';
import FormInput from '../../../components/FormInput/FormInput';
import TabCard from '../../../components/TabCard/TabCard';
import TabCardsGrid from '../../../components/TabCardsGrid/TabCardsGrid';
import DataTable from '../../../components/DataTable/DataTable';
import DetailForm from '../../../components/DetailForm/DetailForm';
import Pagination from '../../../components/Pagination/Pagination';
import './TrainingCentersScreen.css';

const TrainingCentersScreen = () => {
  const { setHeaderTitle, setHeaderSubtitle } = useHeader();
  const [searchParams, setSearchParams] = useSearchParams();

  // Data State
  const [tableData, setTableData] = useState([]);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
    per_page: 15,
    from: 0,
    to: 0
  });
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    pending: 0,
    returned: 0
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
    if (filterParam && ['pending', 'active', 'returned', 'all'].includes(filterParam)) {
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
    setHeaderTitle('Training Centers');
    setHeaderSubtitle('Manage training center authorizations and requests');
    return () => {
      setHeaderTitle(null);
      setHeaderSubtitle(null);
    };
  }, [setHeaderTitle, setHeaderSubtitle]);

  // Fetch stats for tabs
  const fetchStats = async () => {
    try {
      const [activeRes, pendingRes, returnedRes] = await Promise.all([
        accAPI.listAuthorizedTrainingCenters({ per_page: 1 }),
        accAPI.getTrainingCenterRequests({ status: 'pending', per_page: 1 }),
        accAPI.getTrainingCenterRequests({ status: 'returned', per_page: 1 })
      ]);

      setStats({
        active: activeRes?.total || 0,
        pending: pendingRes?.total || 0,
        returned: returnedRes?.total || 0,
        total: (activeRes?.total || 0) + (pendingRes?.total || 0) + (returnedRes?.total || 0)
      });
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
    if (window.confirm('Approve this training center request?')) {
      try {
        await accAPI.approveTrainingCenterRequest(id);
        await loadData();
        await fetchStats();
        alert('Training center request approved successfully!');
      } catch (error) {
        alert('Failed to approve: ' + (error.message || 'Unknown error'));
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
      header: 'Training Center',
      accessor: '_normalizedName',
      sortable: true,
      render: (value, row) => {
        const logoUrl = row.logo_url || row.training_center?.logo_url;
        return (
          <div className="flex items-center">
            <div className="w-10 h-10 mr-3 relative">
              {logoUrl ? (
                <>
                  <img
                    src={logoUrl}
                    alt={value || 'Training Center Logo'}
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
      header: 'Email',
      accessor: '_normalizedEmail',
      sortable: true,
      render: (value) => (
        <div className="flex items-center text-sm text-gray-600">
          <Mail className="h-4 w-4 mr-2 text-gray-400" />
          {value || 'N/A'}
        </div>
      )
    },
    {
      header: 'Date',
      accessor: '_normalizedDate',
      sortable: true,
      render: (value) => (
        <span className="text-sm text-gray-600">
          {value ? new Date(value).toLocaleDateString() : 'N/A'}
        </span>
      )
    },
    {
      header: 'Status',
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
          <span className={`px-3 py-1.5 inline-flex items-center text-xs leading-5 font-bold rounded-full shadow-sm ${config.badgeClass}`}>
            <Icon size={12} className="mr-1" />
            {value ? value.charAt(0).toUpperCase() + value.slice(1) : 'N/A'}
          </span>
        );
      }
    },
    {
      header: 'Actions',
      accessor: 'actions',
      sortable: false,
      render: (value, row) => (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => handleViewDetails(row)}
            className="p-2 rounded-lg bg-primary-50 text-primary-600 hover:bg-primary-100 hover:scale-110 transition-all duration-200 shadow-sm hover:shadow-md"
            title="View Details"
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
              title="Approve"
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
      alert('Please provide a rejection reason');
      return;
    }
    try {
      await accAPI.rejectTrainingCenterRequest(selectedRequest.id, { rejection_reason: rejectionReason });
      await loadData();
      await fetchStats();
      setRejectModalOpen(false);
      setSelectedRequest(null);
      setRejectionReason('');
      alert('Training center request rejected');
    } catch (error) {
      alert('Failed to reject: ' + (error.message || 'Unknown error'));
    }
  };

  const handleReturn = (request) => {
    setSelectedRequest(request);
    setReturnComment('');
    setReturnModalOpen(true);
  };

  const confirmReturn = async () => {
    if (!returnComment.trim()) {
      alert('Please provide a return comment');
      return;
    }
    try {
      await accAPI.returnTrainingCenterRequest(selectedRequest.id, { return_comment: returnComment });
      await loadData();
      await fetchStats();
      setReturnModalOpen(false);
      setSelectedRequest(null);
      setReturnComment('');
      alert('Request returned for revision');
    } catch (error) {
      alert('Failed to return request: ' + (error.message || 'Unknown error'));
    }
  };

  return (
    <div>
      {/* Tab Cards */}
      <div className="mb-6">
        <TabCardsGrid columns={{ mobile: 1, tablet: 2, desktop: 4 }}>
          <TabCard
            name="Total"
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
            name="Pending"
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
            name="Active"
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
            name="Returned"
            value={stats.returned}
            icon={ArrowLeft}
            colorType="blue"
            isActive={statusFilter === 'returned'}
            onClick={() => {
              setStatusFilter('returned');
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
            placeholder="Search training centers..."
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
          emptyMessage="No training centers found"
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
        title={selectedRequest?._isRequest ? "Training Center Request Details" : "Training Center Details"}
        size="lg"
      >
        {selectedRequest && (
          <div className="space-y-6">
            {/* Request Information - Only for requests */}
            {selectedRequest._isRequest && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <FileText className="mr-2" size={20} />
                  Request Information
                </h3>
                <DetailForm
                  data={selectedRequest}
                  fields={[
                    { key: 'id', label: 'Request ID', icon: Hash, render: (value) => value ? `#${value}` : 'N/A', showEmpty: false },
                    { key: 'training_center_id', label: 'Training Center ID', icon: Building2, render: (value) => value ? `#${value}` : 'N/A', showEmpty: false },
                    { key: 'request_date', label: 'Request Date', type: 'datetime', icon: Calendar, showEmpty: false },
                    { key: 'status', label: 'Status', type: 'status', icon: Clock },
                    { key: 'created_at', label: 'Created At', type: 'datetime', icon: Calendar, showEmpty: false },
                    { key: 'updated_at', label: 'Updated At', type: 'datetime', icon: Calendar, showEmpty: false },
                    { key: 'reviewed_at', label: 'Reviewed At', type: 'datetime', icon: Calendar, showEmpty: false },
                  ]}
                />
              </div>
            )}

            {/* Training Center Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Building2 className="mr-2" size={20} />
                Training Center Information
              </h3>
              <DetailForm
                data={{
                  name: selectedRequest.training_center?.name || selectedRequest.name || selectedRequest._normalizedName,
                  email: selectedRequest.training_center?.email || selectedRequest.email || selectedRequest._normalizedEmail,
                  legal_name: selectedRequest.training_center?.legal_name || selectedRequest.legal_name,
                  registration_number: selectedRequest.training_center?.registration_number || selectedRequest.registration_number,
                  phone: selectedRequest.training_center?.phone || selectedRequest.phone,
                  website: selectedRequest.training_center?.website || selectedRequest.website,
                  address: selectedRequest.training_center?.address || selectedRequest.address,
                  city: selectedRequest.training_center?.city || selectedRequest.city,
                  country: selectedRequest.training_center?.country || selectedRequest.country,
                  postal_code: selectedRequest.training_center?.postal_code || selectedRequest.postal_code,
                  description: selectedRequest.training_center?.description || selectedRequest.description,
                  authorized_at: selectedRequest.authorized_at,
                }}
                fields={[
                  { key: 'name', label: 'Name', icon: Building2 },
                  { key: 'email', label: 'Email', type: 'email', icon: Mail },
                  { key: 'legal_name', label: 'Legal Name', showEmpty: false },
                  { key: 'registration_number', label: 'Registration Number', showEmpty: false },
                  { key: 'phone', label: 'Phone', icon: Phone, showEmpty: false },
                  { key: 'website', label: 'Website', type: 'url', icon: Globe, showEmpty: false },
                  { key: 'address', label: 'Address', icon: MapPin, fullWidth: true, showEmpty: false },
                  { key: 'city', label: 'City', icon: MapPin, showEmpty: false },
                  { key: 'country', label: 'Country', icon: MapPin, showEmpty: false },
                  { key: 'postal_code', label: 'Postal Code', showEmpty: false },
                  { key: 'authorized_at', label: 'Authorized At', type: 'datetime', icon: Calendar, showEmpty: false },
                ]}
              />
              {(selectedRequest.training_center?.description || selectedRequest.description) && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Description</p>
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
                  Documents
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
                            href={doc.url.startsWith('http') ? doc.url : `${import.meta.env.VITE_API_BASE_URL || 'https://aeroenix.com/v1/api'}${doc.url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                          >
                            View Document
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
                  <h3 className="text-lg font-semibold text-red-900">Rejection Reason</h3>
                </div>
                <p className="text-base text-gray-900">{selectedRequest.rejection_reason}</p>
              </div>
            )}

            {/* Return Comment */}
            {selectedRequest._isRequest && selectedRequest.return_comment && (
              <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                <div className="flex items-center mb-2">
                  <ArrowLeft className="h-5 w-5 text-blue-600 mr-2" />
                  <h3 className="text-lg font-semibold text-blue-900">Return Comment</h3>
                </div>
                <p className="text-base text-gray-900">{selectedRequest.return_comment}</p>
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
                  Return
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
        title="Reject Training Center Request"
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
        title="Return Training Center Request"
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
