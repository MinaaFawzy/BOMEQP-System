import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { accAPI } from '../../../services/api';
import { useHeader } from '../../../context/HeaderContext';
import { Building2, CheckCircle, XCircle, Eye, Clock, ArrowLeft, Mail, Phone, MapPin, Globe, FileText, Hash, Calendar } from 'lucide-react';
import Modal from '../../../components/Modal/Modal';
import FormInput from '../../../components/FormInput/FormInput';
import TabCard from '../../../components/TabCard/TabCard';
import TabCardsGrid from '../../../components/TabCardsGrid/TabCardsGrid';
import DataTable from '../../../components/DataTable/DataTable';
import './TrainingCentersScreen.css';

const TrainingCentersScreen = () => {
  const { setHeaderTitle, setHeaderSubtitle } = useHeader();
  const [searchParams, setSearchParams] = useSearchParams();
  const [allData, setAllData] = useState([]); // Unified data array
  const [loading, setLoading] = useState(true);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [returnComment, setReturnComment] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const hasLoadedRef = useRef(false); // Prevent double loading

  // Read filter from URL params on mount
  useEffect(() => {
    const filterParam = searchParams.get('filter');
    if (filterParam && ['pending', 'active', 'returned', 'all'].includes(filterParam)) {
      setStatusFilter(filterParam);
    }
  }, [searchParams]);

  useEffect(() => {
    // Prevent double loading in React Strict Mode
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  useEffect(() => {
    setHeaderTitle('Training Centers');
    setHeaderSubtitle('Manage training center authorizations and requests');
    return () => {
      setHeaderTitle(null);
      setHeaderSubtitle(null);
    };
  }, [setHeaderTitle, setHeaderSubtitle]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = {
        per_page: 1000, // Load all data
      };
      
      // Load all data at once with pagination
      const [pendingData, returnedData, authorizedData] = await Promise.all([
        accAPI.getTrainingCenterRequests({ ...params, status: 'pending' }),
        accAPI.getTrainingCenterRequests({ ...params, status: 'returned' }),
        accAPI.listAuthorizedTrainingCenters(params),
      ]);

      // Normalize and combine all data
      // IMPORTANT: Filter out approved requests - they are already in authorized list
      // The API might return approved requests even when requesting pending/returned
      const pendingRequests = (pendingData.requests || [])
        .filter(item => {
          // Only include items with status 'pending' (exclude approved, rejected, etc.)
          return item.status === 'pending';
        })
        .map(item => ({
          ...item,
          _normalizedName: item.training_center?.name || item.name || '',
          _normalizedEmail: item.training_center?.email || item.email || '',
          _normalizedDate: item.request_date,
          _isRequest: true,
        }));

      const returnedRequests = (returnedData.requests || [])
        .filter(item => {
          // Only include items with status 'returned' (exclude approved, rejected, etc.)
          return item.status === 'returned';
        })
        .map(item => ({
          ...item,
          _normalizedName: item.training_center?.name || item.name || '',
          _normalizedEmail: item.training_center?.email || item.email || '',
          _normalizedDate: item.request_date,
          _isRequest: true,
        }));

      const authorizedCenters = (authorizedData.training_centers || []).map(item => ({
        ...item,
        _normalizedName: item.name || '',
        _normalizedEmail: item.email || '',
        // Use created_at or updated_at for authorized centers (authorized_at may not exist)
        _normalizedDate: item.authorized_at || item.created_at || item.updated_at,
        _isRequest: false,
        status: item.status || 'active', // Ensure status exists
      }));

      // Helper function to get unique identifier for a training center
      const getTrainingCenterKey = (item) => {
        // For requests, use training_center.id or training_center_id
        if (item._isRequest) {
          return item.training_center?.id || item.training_center_id || item.id;
        }
        // For authorized centers, use id
        return item.id || item.training_center_id;
      };

      // First, remove duplicates within each group (pending, returned, authorized)
      const dedupeGroup = (items) => {
        const seen = new Set();
        return items.filter(item => {
          const key = getTrainingCenterKey(item);
          if (key && seen.has(key)) {
            return false;
          }
          if (key) seen.add(key);
          return true;
        });
      };

      const uniquePending = dedupeGroup(pendingRequests);
      const uniqueReturned = dedupeGroup(returnedRequests);
      const uniqueAuthorized = dedupeGroup(authorizedCenters);

      // Collect all training center IDs from requests (pending + returned)
      const requestIds = new Set();
      [...uniquePending, ...uniqueReturned].forEach(req => {
        const key = getTrainingCenterKey(req);
        if (key) requestIds.add(key);
      });

      // Filter out authorized centers that already exist in requests
      // (A training center with a pending/returned request should not appear in authorized list)
      const filteredAuthorized = uniqueAuthorized.filter(auth => {
        const key = getTrainingCenterKey(auth);
        return !requestIds.has(key);
      });

      // Combine all unique items
      const combined = [...uniquePending, ...uniqueReturned, ...filteredAuthorized];
      
      // Final deduplication pass (shouldn't be needed, but just in case)
      const finalSeen = new Set();
      const uniqueData = combined.filter(item => {
        const key = getTrainingCenterKey(item);
        if (!key) return true; // Include items without key (shouldn't happen)
        if (finalSeen.has(key)) {
          return false; // Duplicate found
        }
        finalSeen.add(key);
        return true;
      });
      
      setAllData(uniqueData);
    } catch (error) {
      console.error('Failed to load data:', error);
      setAllData([]);
    } finally {
      setLoading(false);
    }
  };
  
  const handleApprove = async (id) => {
    if (window.confirm('Approve this training center request?')) {
      try {
        await accAPI.approveTrainingCenterRequest(id);
        await loadData();
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
    // Allow clicking on both requests and authorized centers to view details
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
  ], [handleViewDetails, handleApprove]);

  // Filter data based on status filter
  const filteredData = useMemo(() => {
    let filtered = [...allData];

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => {
        if (statusFilter === 'pending') {
          return item.status === 'pending';
        } else if (statusFilter === 'returned') {
          return item.status === 'returned';
        } else if (statusFilter === 'active') {
          // Active includes approved, active status, or authorized centers (non-requests)
          return item.status === 'active' || item.status === 'approved' || !item._isRequest;
        }
        return true;
      });
    }

    // Add search text for DataTable - include all searchable fields
    filtered = filtered.map(item => ({
      ...item,
      _searchText: `${item._normalizedName || ''} ${item._normalizedEmail || ''} ${item.training_center?.name || ''} ${item.training_center?.email || ''} ${item.name || ''} ${item.email || ''} ${item.legal_name || ''} ${item.registration_number || ''} ${item.country || ''} ${item.city || ''} ${item.status || ''}`.toLowerCase()
    }));

    return filtered;
  }, [allData, statusFilter]);

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
      setReturnModalOpen(false);
      setSelectedRequest(null);
      setReturnComment('');
      alert('Request returned for revision');
    } catch (error) {
      alert('Failed to return request: ' + (error.message || 'Unknown error'));
    }
  };

  // Calculate stats from all data
  const pendingCount = allData.filter(item => item.status === 'pending').length;
  const returnedCount = allData.filter(item => item.status === 'returned').length;
  const authorizedCount = allData.filter(item => item.status === 'active' || item.status === 'approved' || !item._isRequest).length;
  const totalCount = allData.length;

  return (
    <div>

      {/* Tab Cards */}
      <div className="mb-6">
        <TabCardsGrid columns={{ mobile: 1, tablet: 2, desktop: 4 }}>
          <TabCard
            name="Total"
            value={totalCount}
            icon={Building2}
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
            name="Active"
            value={authorizedCount}
            icon={CheckCircle}
            colorType="green"
            isActive={statusFilter === 'active'}
            onClick={() => setStatusFilter('active')}
          />
          <TabCard
            name="Returned"
            value={returnedCount}
            icon={ArrowLeft}
            colorType="blue"
            isActive={statusFilter === 'returned'}
            onClick={() => setStatusFilter('returned')}
          />
        </TabCardsGrid>
      </div>

      {/* DataTable */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        <DataTable
          columns={columns}
          data={filteredData}
          isLoading={loading}
          searchable={true}
          sortable={true}
          filterable={false}
          searchPlaceholder="Search by name or email..."
          emptyMessage="No training centers found"
          onRowClick={(item) => handleRowClick(item)}
        />
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedRequest.id && (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500 mb-1 flex items-center">
                        <Hash size={14} className="mr-1" />
                        Request ID
                      </p>
                      <p className="text-base font-semibold text-gray-900">
                        #{selectedRequest.id}
                      </p>
                    </div>
                  )}
                  {selectedRequest.training_center_id && (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500 mb-1 flex items-center">
                        <Building2 size={14} className="mr-1" />
                        Training Center ID
                      </p>
                      <p className="text-base font-semibold text-gray-900">
                        #{selectedRequest.training_center_id}
                      </p>
                    </div>
                  )}
                  {selectedRequest.request_date && (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500 mb-1 flex items-center">
                        <Calendar size={14} className="mr-1" />
                        Request Date
                      </p>
                      <p className="text-base font-semibold text-gray-900">
                        {new Date(selectedRequest.request_date).toLocaleString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  )}
                  {selectedRequest.created_at && (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500 mb-1 flex items-center">
                        <Calendar size={14} className="mr-1" />
                        Created At
                      </p>
                      <p className="text-base font-semibold text-gray-900">
                        {new Date(selectedRequest.created_at).toLocaleString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  )}
                  {selectedRequest.updated_at && (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500 mb-1 flex items-center">
                        <Calendar size={14} className="mr-1" />
                        Updated At
                      </p>
                      <p className="text-base font-semibold text-gray-900">
                        {new Date(selectedRequest.updated_at).toLocaleString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  )}
                  {selectedRequest.reviewed_at && (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500 mb-1 flex items-center">
                        <Calendar size={14} className="mr-1" />
                        Reviewed At
                      </p>
                      <p className="text-base font-semibold text-gray-900">
                        {new Date(selectedRequest.reviewed_at).toLocaleString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  )}
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1 flex items-center">
                      <Clock size={14} className="mr-1" />
                      Status
                    </p>
                    <span className={`px-3 py-1.5 inline-flex items-center text-xs leading-5 font-bold rounded-full shadow-sm ${
                      selectedRequest.status === 'approved' || selectedRequest.status === 'active' ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300' :
                      selectedRequest.status === 'rejected' ? 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 border border-red-300' :
                      selectedRequest.status === 'returned' ? 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-300' :
                      'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 border border-yellow-300'
                    }`}>
                      {selectedRequest.status === 'pending' && <Clock size={12} className="mr-1" />}
                      {selectedRequest.status === 'returned' && <ArrowLeft size={12} className="mr-1" />}
                      {selectedRequest.status === 'approved' && <CheckCircle size={12} className="mr-1" />}
                      {selectedRequest.status ? selectedRequest.status.charAt(0).toUpperCase() + selectedRequest.status.slice(1) : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Training Center Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Building2 className="mr-2" size={20} />
                Training Center Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1 flex items-center">
                    <Building2 size={14} className="mr-1" />
                    Name
                  </p>
                  <p className="text-base font-semibold text-gray-900">
                    {selectedRequest.training_center?.name || selectedRequest.name || selectedRequest._normalizedName || 'N/A'}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1 flex items-center">
                    <Mail size={14} className="mr-1" />
                    Email
                  </p>
                  <p className="text-base font-semibold text-gray-900">
                    {selectedRequest.training_center?.email || selectedRequest.email || selectedRequest._normalizedEmail || 'N/A'}
                  </p>
                </div>
                {(selectedRequest.training_center?.legal_name || selectedRequest.legal_name) && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1">Legal Name</p>
                    <p className="text-base font-semibold text-gray-900">
                      {selectedRequest.training_center?.legal_name || selectedRequest.legal_name}
                    </p>
                  </div>
                )}
                {(selectedRequest.training_center?.registration_number || selectedRequest.registration_number) && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1">Registration Number</p>
                    <p className="text-base font-semibold text-gray-900">
                      {selectedRequest.training_center?.registration_number || selectedRequest.registration_number}
                    </p>
                  </div>
                )}
                {(selectedRequest.training_center?.phone || selectedRequest.phone) && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1 flex items-center">
                      <Phone size={14} className="mr-1" />
                      Phone
                    </p>
                    <p className="text-base font-semibold text-gray-900">
                      {selectedRequest.training_center?.phone || selectedRequest.phone}
                    </p>
                  </div>
                )}
                {(selectedRequest.training_center?.website || selectedRequest.website) && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1 flex items-center">
                      <Globe size={14} className="mr-1" />
                      Website
                    </p>
                    <a 
                      href={(selectedRequest.training_center?.website || selectedRequest.website).startsWith('http') 
                        ? (selectedRequest.training_center?.website || selectedRequest.website)
                        : `https://${selectedRequest.training_center?.website || selectedRequest.website}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:text-primary-700 text-base font-semibold"
                    >
                      {selectedRequest.training_center?.website || selectedRequest.website}
                    </a>
                  </div>
                )}
                {(selectedRequest.training_center?.address || selectedRequest.address) && (
                  <div className="p-4 bg-gray-50 rounded-lg md:col-span-2">
                    <p className="text-sm text-gray-500 mb-1 flex items-center">
                      <MapPin size={14} className="mr-1" />
                      Address
                    </p>
                    <p className="text-base font-semibold text-gray-900">
                      {selectedRequest.training_center?.address || selectedRequest.address}
                    </p>
                  </div>
                )}
                {(selectedRequest.training_center?.city || selectedRequest.city) && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1 flex items-center">
                      <MapPin size={14} className="mr-1" />
                      City
                    </p>
                    <p className="text-base font-semibold text-gray-900">
                      {selectedRequest.training_center?.city || selectedRequest.city}
                    </p>
                  </div>
                )}
                {(selectedRequest.training_center?.country || selectedRequest.country) && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1 flex items-center">
                      <MapPin size={14} className="mr-1" />
                      Country
                    </p>
                    <p className="text-base font-semibold text-gray-900">
                      {selectedRequest.training_center?.country || selectedRequest.country}
                    </p>
                  </div>
                )}
                {(selectedRequest.training_center?.postal_code || selectedRequest.postal_code) && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1">Postal Code</p>
                    <p className="text-base font-semibold text-gray-900">
                      {selectedRequest.training_center?.postal_code || selectedRequest.postal_code}
                    </p>
                  </div>
                )}
                {(selectedRequest.training_center?.description || selectedRequest.description) && (
                  <div className="p-4 bg-gray-50 rounded-lg md:col-span-2">
                    <p className="text-sm text-gray-500 mb-1">Description</p>
                    <p className="text-base text-gray-900">
                      {selectedRequest.training_center?.description || selectedRequest.description}
                    </p>
                  </div>
                )}
                {selectedRequest.authorized_at && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1 flex items-center">
                      <Calendar size={14} className="mr-1" />
                      Authorized At
                    </p>
                    <p className="text-base font-semibold text-gray-900">
                      {new Date(selectedRequest.authorized_at).toLocaleString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                )}
              </div>
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
