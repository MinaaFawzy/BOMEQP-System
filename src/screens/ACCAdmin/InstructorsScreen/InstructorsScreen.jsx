import { useEffect, useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { accAPI } from '../../../services/api';
import { useHeader } from '../../../context/HeaderContext';
import { Users, CheckCircle, XCircle, Eye, Clock, ArrowLeft, Mail, Building2, FileText, Globe, Phone, Calendar, Award, BookOpen, Hash, MapPin, CreditCard, UserCircle } from 'lucide-react';
import Modal from '../../../components/Modal/Modal';
import FormInput from '../../../components/FormInput/FormInput';
import ConfirmDialog from '../../../components/ConfirmDialog/ConfirmDialog';
import TabCard from '../../../components/TabCard/TabCard';
import TabCardsGrid from '../../../components/TabCardsGrid/TabCardsGrid';
import DataTable from '../../../components/DataTable/DataTable';
import './InstructorsScreen.css';

const InstructorsScreen = () => {
  const { setHeaderTitle, setHeaderSubtitle } = useHeader();
  const [searchParams, setSearchParams] = useSearchParams();
  const [allData, setAllData] = useState([]); // Unified data array
  const [loading, setLoading] = useState(true);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [authorizationPrice, setAuthorizationPrice] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [returnComment, setReturnComment] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [trainingCenters, setTrainingCenters] = useState({}); // Map of TC ID to TC name

  // Read filter from URL params on mount
  useEffect(() => {
    const filterParam = searchParams.get('filter');
    if (filterParam && ['pending', 'active', 'returned', 'all'].includes(filterParam)) {
      setStatusFilter(filterParam);
    }
  }, [searchParams]);

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  useEffect(() => {
    setHeaderTitle('Instructors');
    setHeaderSubtitle('Manage instructor authorizations and requests');
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
      
      // Load instructor requests and training centers in parallel with pagination
      const [allRequestsData, trainingCentersData] = await Promise.all([
        accAPI.getInstructorRequests(params),
        accAPI.listAuthorizedTrainingCenters(params),
      ]);
      
      const allRequests = allRequestsData?.requests || allRequestsData?.data || [];
      
      // Create a map of training center ID to name
      const tcMap = {};
      const tcs = trainingCentersData?.training_centers || trainingCentersData?.data || [];
      tcs.forEach(tc => {
        if (tc.id) {
          tcMap[tc.id] = tc.name || tc.legal_name || `TC ${tc.id}`;
        }
      });
      setTrainingCenters(tcMap);

      // Helper function to get unique identifier for an instructor
      const getInstructorKey = (item) => {
        return item.instructor?.id || item.instructor_id || item.id;
      };

      // Normalize all requests and categorize by status
      const normalizedRequests = allRequests.map(item => {
        const instructor = item.instructor || item;
        const tcId = item.training_center_id || item.training_center?.id;
        const tcName = tcId ? (tcMap[tcId] || item.training_center?.name || `TC ${tcId}`) : 'N/A';
        return {
          ...item,
          _normalizedName: `${instructor.first_name || ''} ${instructor.last_name || ''}`.trim(),
          _normalizedEmail: instructor.email || '',
          _normalizedDate: item.request_date || item.created_at || item.updated_at,
          _normalizedTrainingCenter: tcName,
          _trainingCenterId: tcId,
          _isRequest: true,
        };
      });

      // Separate requests by status
      const pendingRequests = normalizedRequests.filter(item => item.status === 'pending');
      const returnedRequests = normalizedRequests.filter(item => item.status === 'returned');
      const approvedRequests = normalizedRequests.filter(item => item.status === 'approved' || item.status === 'active');

      // Remove duplicates within each group
      const dedupeGroup = (items) => {
        const seen = new Set();
        return items.filter(item => {
          const key = getInstructorKey(item);
          if (key && seen.has(key)) {
            return false;
          }
          if (key) seen.add(key);
          return true;
        });
      };

      const uniquePending = dedupeGroup(pendingRequests);
      const uniqueReturned = dedupeGroup(returnedRequests);
      const uniqueApproved = dedupeGroup(approvedRequests);

      // Convert approved requests to authorized instructors format
      const authorizedInstructors = uniqueApproved.map(item => {
        const instructor = item.instructor || item;
        return {
          ...item,
          id: instructor.id || item.id,
          first_name: instructor.first_name || item.first_name,
          last_name: instructor.last_name || item.last_name,
          email: instructor.email || item.email,
          phone: instructor.phone || item.phone,
          _normalizedName: `${instructor.first_name || ''} ${instructor.last_name || ''}`.trim(),
          _normalizedEmail: instructor.email || '',
          _normalizedDate: item.request_date || item.created_at || item.updated_at,
          _normalizedTrainingCenter: item._normalizedTrainingCenter || 'N/A',
          _trainingCenterId: item._trainingCenterId,
          _isRequest: false,
          status: 'active', // Approved requests become active authorized instructors
        };
      });

      // Collect all instructor IDs from pending and returned requests
      const requestIds = new Set();
      [...uniquePending, ...uniqueReturned].forEach(req => {
        const key = getInstructorKey(req);
        if (key) requestIds.add(key);
      });

      // Filter out authorized instructors that have pending/returned requests
      const filteredAuthorized = authorizedInstructors.filter(auth => {
        const key = getInstructorKey(auth);
        return !requestIds.has(key);
      });

      // Combine all unique items
      const combined = [...uniquePending, ...uniqueReturned, ...filteredAuthorized];
      
      // Final deduplication pass
      const finalSeen = new Set();
      const uniqueData = combined.filter(item => {
        const key = getInstructorKey(item);
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
  

  const handleApprove = (request) => {
    setSelectedRequest(request);
    setAuthorizationPrice('');
    setApproveModalOpen(true);
  };

  const handleViewDetails = (item) => {
    setSelectedRequest(item);
    setDetailModalOpen(true);
  };

  const handleRowClick = (item) => {
    // Allow clicking on both requests and authorized instructors to view details
    handleViewDetails(item);
  };

  // Define columns for DataTable
  const columns = useMemo(() => [
    {
      header: 'Instructor',
      accessor: '_normalizedName',
      sortable: true,
      render: (value, row) => (
        <div className="flex items-center">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg flex items-center justify-center mr-3">
            <Users className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900">{value || 'N/A'}</div>
          </div>
        </div>
      )
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
                handleApprove(row);
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
          // Active includes approved, active status, or authorized instructors (non-requests)
          return item.status === 'active' || 
                 item.status === 'approved' || 
                 (!item._isRequest && (item.status === 'active' || !item.status));
        }
        return true;
      });
    }

    // Add search text for DataTable - include all searchable fields
    filtered = filtered.map(item => ({
      ...item,
      _searchText: `${item._normalizedName || ''} ${item._normalizedEmail || ''} ${item.instructor?.first_name || ''} ${item.instructor?.last_name || ''} ${item.instructor?.email || ''} ${item.training_center?.name || ''} ${item.name || ''} ${item.email || ''} ${item.status || ''}`.toLowerCase()
    }));

    return filtered;
  }, [allData, statusFilter]);

  const confirmApprove = async () => {
    if (!authorizationPrice || parseFloat(authorizationPrice) <= 0) {
      alert('Please enter a valid authorization price');
      return;
    }
    try {
      await accAPI.approveInstructorRequest(selectedRequest.id, {
        authorization_price: parseFloat(authorizationPrice),
      });
      await loadData();
      setApproveModalOpen(false);
      setSelectedRequest(null);
      setAuthorizationPrice('');
      alert('Instructor approved successfully. Waiting for Group Admin to set commission percentage.');
    } catch (error) {
      alert('Failed to approve: ' + (error.message || 'Unknown error'));
    }
  };

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
      await accAPI.rejectInstructorRequest(selectedRequest.id, { rejection_reason: rejectionReason });
      await loadData();
      setRejectModalOpen(false);
      setSelectedRequest(null);
      setRejectionReason('');
      alert('Instructor request rejected');
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
      await accAPI.returnInstructorRequest(selectedRequest.id, { return_comment: returnComment });
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
  const activeCount = allData.filter(item => 
    item.status === 'active' || 
    item.status === 'approved' || 
    (!item._isRequest && (item.status === 'active' || !item.status))
  ).length;
  const totalCount = allData.length;

  return (
    <div>

      {/* Tab Cards */}
      <div className="mb-6">
        <TabCardsGrid columns={{ mobile: 1, tablet: 2, desktop: 4 }}>
          <TabCard
            name="Total"
            value={totalCount}
            icon={Users}
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
            value={activeCount}
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
          emptyMessage="No instructors found"
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
        title={selectedRequest?._isRequest ? "Instructor Request Details" : "Instructor Details"}
        size="lg"
      >
        {selectedRequest && (
          <div className="space-y-6">
            {/* Request Information */}
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
                  {selectedRequest.instructor_id && (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500 mb-1 flex items-center">
                        <UserCircle size={14} className="mr-1" />
                        Instructor ID
                      </p>
                      <p className="text-base font-semibold text-gray-900">
                        #{selectedRequest.instructor_id}
                      </p>
                    </div>
                  )}
                  {selectedRequest.acc_id && (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500 mb-1 flex items-center">
                        <Building2 size={14} className="mr-1" />
                        ACC ID
                      </p>
                      <p className="text-base font-semibold text-gray-900">
                        #{selectedRequest.acc_id}
                      </p>
                    </div>
                  )}
                  {selectedRequest.sub_category_id && (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500 mb-1 flex items-center">
                        <BookOpen size={14} className="mr-1" />
                        Sub-Category ID
                      </p>
                      <p className="text-base font-semibold text-gray-900">
                        #{selectedRequest.sub_category_id}
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
                </div>
              </div>
            )}

            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Users className="mr-2" size={20} />
                Instructor Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1 flex items-center">
                    <Users size={14} className="mr-1" />
                    First Name
                  </p>
                  <p className="text-base font-semibold text-gray-900">
                    {selectedRequest.instructor?.first_name || selectedRequest.first_name || 'N/A'}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1 flex items-center">
                    <Users size={14} className="mr-1" />
                    Last Name
                  </p>
                  <p className="text-base font-semibold text-gray-900">
                    {selectedRequest.instructor?.last_name || selectedRequest.last_name || 'N/A'}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1 flex items-center">
                    <Mail size={14} className="mr-1" />
                    Email
                  </p>
                  <p className="text-base font-semibold text-gray-900">
                    {selectedRequest.instructor?.email || selectedRequest.email || selectedRequest._normalizedEmail || 'N/A'}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1 flex items-center">
                    <Phone size={14} className="mr-1" />
                    Phone
                  </p>
                  <p className="text-base font-semibold text-gray-900">
                    {selectedRequest.instructor?.phone || selectedRequest.phone || 'N/A'}
                  </p>
                </div>
                {(selectedRequest.instructor?.id_number || selectedRequest.id_number) && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1">ID Number</p>
                    <p className="text-base font-semibold text-gray-900">
                      {selectedRequest.instructor?.id_number || selectedRequest.id_number}
                    </p>
                  </div>
                )}
                {selectedRequest.instructor?.country && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1 flex items-center">
                      <MapPin size={14} className="mr-1" />
                      Country
                    </p>
                    <p className="text-base font-semibold text-gray-900">
                      {selectedRequest.instructor.country}
                    </p>
                  </div>
                )}
                {selectedRequest.instructor?.city && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1 flex items-center">
                      <MapPin size={14} className="mr-1" />
                      City
                    </p>
                    <p className="text-base font-semibold text-gray-900">
                      {selectedRequest.instructor.city}
                    </p>
                  </div>
                )}
                {selectedRequest._normalizedDate && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1 flex items-center">
                      <Calendar size={14} className="mr-1" />
                      Request Date
                    </p>
                    <p className="text-base font-semibold text-gray-900">
                      {new Date(selectedRequest._normalizedDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
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

            {/* Training Center Information */}
            {(selectedRequest.training_center || selectedRequest._normalizedTrainingCenter) && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Building2 className="mr-2" size={20} />
                  Training Center Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedRequest.training_center?.id && (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500 mb-1 flex items-center">
                        <Hash size={14} className="mr-1" />
                        Training Center ID
                      </p>
                      <p className="text-base font-semibold text-gray-900">
                        #{selectedRequest.training_center.id}
                      </p>
                    </div>
                  )}
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1 flex items-center">
                      <Building2 size={14} className="mr-1" />
                      Name
                    </p>
                    <p className="text-base font-semibold text-gray-900">
                      {selectedRequest.training_center?.name || selectedRequest.training_center?.legal_name || selectedRequest._normalizedTrainingCenter || 'N/A'}
                    </p>
                  </div>
                  {selectedRequest.training_center?.email && (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500 mb-1 flex items-center">
                        <Mail size={14} className="mr-1" />
                        Email
                      </p>
                      <p className="text-base font-semibold text-gray-900">
                        {selectedRequest.training_center.email}
                      </p>
                    </div>
                  )}
                  {selectedRequest.training_center?.phone && (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500 mb-1 flex items-center">
                        <Phone size={14} className="mr-1" />
                        Phone
                      </p>
                      <p className="text-base font-semibold text-gray-900">
                        {selectedRequest.training_center.phone}
                      </p>
                    </div>
                  )}
                  {selectedRequest.training_center?.address && (
                    <div className="p-4 bg-gray-50 rounded-lg md:col-span-2">
                      <p className="text-sm text-gray-500 mb-1 flex items-center">
                        <MapPin size={14} className="mr-1" />
                        Address
                      </p>
                      <p className="text-base font-semibold text-gray-900">
                        {selectedRequest.training_center.address}
                      </p>
                    </div>
                  )}
                  {selectedRequest.training_center?.city && (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500 mb-1 flex items-center">
                        <MapPin size={14} className="mr-1" />
                        City
                      </p>
                      <p className="text-base font-semibold text-gray-900">
                        {selectedRequest.training_center.city}
                      </p>
                    </div>
                  )}
                  {selectedRequest.training_center?.country && (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500 mb-1 flex items-center">
                        <MapPin size={14} className="mr-1" />
                        Country
                      </p>
                      <p className="text-base font-semibold text-gray-900">
                        {selectedRequest.training_center.country}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Sub-Category Information */}
            {(selectedRequest.sub_category || selectedRequest.sub_category_id) && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <BookOpen className="mr-2" size={20} />
                  Sub-Category Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedRequest.sub_category?.name && (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500 mb-1 flex items-center">
                        <BookOpen size={14} className="mr-1" />
                        Name
                      </p>
                      <p className="text-base font-semibold text-gray-900">
                        {selectedRequest.sub_category.name}
                      </p>
                    </div>
                  )}
                  {selectedRequest.sub_category?.description && (
                    <div className="p-4 bg-gray-50 rounded-lg md:col-span-2">
                      <p className="text-sm text-gray-500 mb-1">Description</p>
                      <p className="text-base text-gray-900">
                        {selectedRequest.sub_category.description}
                      </p>
                    </div>
                  )}
                  {selectedRequest.sub_category?.courses && Array.isArray(selectedRequest.sub_category.courses) && selectedRequest.sub_category.courses.length > 0 && (
                    <div className="p-4 bg-gray-50 rounded-lg md:col-span-2">
                      <p className="text-sm text-gray-500 mb-2 font-medium">Courses</p>
                      <div className="space-y-2">
                        {selectedRequest.sub_category.courses.map((course, index) => (
                          <div key={course.id || index} className="p-3 bg-white rounded-lg border border-gray-200">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="text-sm font-semibold text-gray-900">
                                  {course.name || course.code || `Course ${course.id || index + 1}`}
                                </p>
                                {course.code && (
                                  <p className="text-xs text-gray-500 mt-1">Code: {course.code}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Specializations/Languages */}
            {(selectedRequest.instructor?.specializations || selectedRequest.specializations) && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <Globe className="mr-2" size={20} />
                  Languages / Specializations
                </h3>
                <div className="flex flex-wrap gap-2">
                  {(() => {
                    const specializations = selectedRequest.instructor?.specializations || selectedRequest.specializations;
                    const specArray = Array.isArray(specializations) 
                      ? specializations 
                      : (typeof specializations === 'string' ? specializations.split(',').map(s => s.trim()).filter(s => s) : []);
                    return specArray.length > 0 ? (
                      specArray.map((spec, index) => (
                        <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800 border border-primary-200">
                          <Globe size={12} className="mr-1" />
                          {spec}
                        </span>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">No specializations listed</p>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* CV / Resume */}
            {(selectedRequest.instructor?.cv_url || selectedRequest.cv_url) && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <FileText className="mr-2" size={20} />
                  CV / Resume
                </h3>
                <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                        <FileText className="text-white" size={24} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Curriculum Vitae</p>
                        <p className="text-xs text-gray-600">Click to view the instructor's CV</p>
                      </div>
                    </div>
                    <a
                      href={(selectedRequest.instructor?.cv_url || selectedRequest.cv_url).startsWith('http') 
                        ? (selectedRequest.instructor?.cv_url || selectedRequest.cv_url)
                        : `${import.meta.env.VITE_API_BASE_URL || 'https://aeroenix.com/v1/api'}${selectedRequest.instructor?.cv_url || selectedRequest.cv_url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
                    >
                      <FileText size={18} className="mr-2" />
                      View CV
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Sub-Category or Courses Requested */}
            {selectedRequest._isRequest && (selectedRequest.sub_category_id || selectedRequest.sub_category || selectedRequest.courses || selectedRequest.requested_courses) && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <BookOpen className="mr-2" size={20} />
                  Course Authorization Request
                </h3>
                <div className="p-4 bg-gray-50 rounded-lg">
                  {selectedRequest.sub_category_id || selectedRequest.sub_category ? (
                    <div>
                      <p className="text-sm text-gray-500 mb-2">Sub-Category Selected:</p>
                      <p className="text-base font-semibold text-gray-900">
                        {(() => {
                          // Try multiple ways to get the sub-category name
                          if (selectedRequest.sub_category?.name) {
                            return selectedRequest.sub_category.name;
                          }
                          if (selectedRequest.sub_category_name) {
                            return selectedRequest.sub_category_name;
                          }
                          if (typeof selectedRequest.sub_category === 'string') {
                            return selectedRequest.sub_category;
                          }
                          if (selectedRequest.sub_category?.name_ar) {
                            return selectedRequest.sub_category.name_ar;
                          }
                          // If we only have ID, show a message
                          if (selectedRequest.sub_category_id) {
                            return `Sub-Category (ID: ${selectedRequest.sub_category_id})`;
                          }
                          return 'N/A';
                        })()}
                      </p>
                      {selectedRequest.sub_category?.description && (
                        <p className="text-sm text-gray-600 mt-1">{selectedRequest.sub_category.description}</p>
                      )}
                      
                      {/* Display courses from sub_category if available */}
                      {selectedRequest.sub_category?.courses && Array.isArray(selectedRequest.sub_category.courses) && selectedRequest.sub_category.courses.length > 0 && (
                        <div className="mt-4">
                          <p className="text-sm text-gray-500 mb-2 font-medium">Courses in this Sub-Category:</p>
                          <div className="space-y-2">
                            {selectedRequest.sub_category.courses.map((course, index) => (
                              <div key={course.id || index} className="p-3 bg-white rounded-lg border border-gray-200">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <p className="text-sm font-semibold text-gray-900">
                                      {course.name || course.code || `Course ${course.id || index + 1}`}
                                    </p>
                                    {course.code && (
                                      <p className="text-xs text-gray-500 mt-1">Code: {course.code}</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {(!selectedRequest.sub_category?.courses || selectedRequest.sub_category.courses.length === 0) && (
                        <p className="text-xs text-gray-500 mt-1">
                          All active courses in this sub-category will be authorized
                        </p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-gray-500 mb-2">Specific Courses Selected:</p>
                      {(() => {
                        const courses = selectedRequest.courses || selectedRequest.requested_courses || [];
                        const courseArray = Array.isArray(courses) ? courses : [];
                        return courseArray.length > 0 ? (
                          <div className="space-y-2">
                            {courseArray.map((course, index) => (
                              <div key={course.id || index} className="p-3 bg-white rounded-lg border border-gray-200">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <p className="text-sm font-semibold text-gray-900">
                                      {course.name || course.name_ar || course.code || `Course ${course.id || index + 1}`}
                                    </p>
                                    {course.code && (
                                      <p className="text-xs text-gray-500 mt-1">Code: {course.code}</p>
                                    )}
                                    {course.name_ar && course.name && course.name !== course.name_ar && (
                                      <p className="text-xs text-gray-600 mt-1">{course.name_ar}</p>
                                    )}
                                    {course.sub_category && (
                                      <p className="text-xs text-gray-500 mt-1">
                                        Sub-Category: {typeof course.sub_category === 'object' 
                                          ? (course.sub_category.name || course.sub_category.name_ar || course.sub_category)
                                          : course.sub_category}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">No courses specified</p>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>
            )}

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
                            <p className="text-sm text-gray-500">{doc.description}</p>
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
            {/* Certificates */}
            {selectedRequest.instructor?.certificates_json && Array.isArray(selectedRequest.instructor.certificates_json) && selectedRequest.instructor.certificates_json.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <Award className="mr-2" size={20} />
                  Certificates
                </h3>
                <div className="space-y-2">
                  {selectedRequest.instructor.certificates_json.map((cert, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="font-medium text-gray-900">{cert.name || cert.certificate_name || `Certificate ${index + 1}`}</p>
                      {cert.issued_by && (
                        <p className="text-sm text-gray-500">Issued by: {cert.issued_by}</p>
                      )}
                      {cert.year && (
                        <p className="text-sm text-gray-500">Year: {cert.year}</p>
                      )}
                      {cert.url && (
                        <a
                          href={cert.url.startsWith('http') ? cert.url : `${import.meta.env.VITE_API_BASE_URL || 'https://aeroenix.com/v1/api'}${cert.url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary-600 hover:text-primary-700 text-sm font-medium mt-2 inline-block"
                        >
                          View Certificate
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Authorization Price (if approved) */}
            {selectedRequest.authorization_price && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Authorization Details</h3>
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm text-gray-500 mb-1">Authorization Price</p>
                  <p className="text-2xl font-bold text-green-900">
                    ${parseFloat(selectedRequest.authorization_price).toFixed(2)}
                  </p>
                </div>
              </div>
            )}

            {/* Rejection Reason (if rejected) */}
            {selectedRequest.rejection_reason && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <XCircle className="mr-2 text-red-600" size={20} />
                  Rejection Reason
                </h3>
                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-base text-gray-900">{selectedRequest.rejection_reason}</p>
                </div>
              </div>
            )}
            {/* Only show return comment for requests */}
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
                  setDetailModalOpen(false);
                  handleApprove(selectedRequest);
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
                    setDetailModalOpen(false);
                    handleApprove(selectedRequest);
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
        title="Reject Instructor Request"
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
        title="Return Instructor Request"
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

      {/* Approve Modal */}
      <Modal
        isOpen={approveModalOpen}
        onClose={() => {
          setApproveModalOpen(false);
          setSelectedRequest(null);
          setAuthorizationPrice('');
        }}
        title="Approve Instructor Request"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-gray-600">Please set the authorization price for this instructor:</p>
          <FormInput
            label="Authorization Price"
            name="authorization_price"
            type="number"
            value={authorizationPrice}
            onChange={(e) => setAuthorizationPrice(e.target.value)}
            required
            min="0"
            step="0.01"
            placeholder="500.00"
          />
          <p className="text-sm text-gray-500">
            After approval, Group Admin will need to set the commission percentage before Training Center can pay.
          </p>
          <div className="flex space-x-3 pt-4">
            <button
              onClick={() => {
                setApproveModalOpen(false);
                setSelectedRequest(null);
                setAuthorizationPrice('');
              }}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={confirmApprove}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Approve
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default InstructorsScreen;
