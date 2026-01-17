import { useEffect, useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { accAPI } from '../../../services/api';
import { useHeader } from '../../../context/HeaderContext';
import { Users, CheckCircle, XCircle, Eye, Clock, ArrowLeft, Mail, Building2, FileText, Globe, Phone, Calendar, Award, BookOpen, Hash, MapPin, CreditCard, UserCircle, User, Search } from 'lucide-react';
import Modal from '../../../components/Modal/Modal';
import FormInput from '../../../components/FormInput/FormInput';
import ConfirmDialog from '../../../components/ConfirmDialog/ConfirmDialog';
import TabCard from '../../../components/TabCard/TabCard';
import TabCardsGrid from '../../../components/TabCardsGrid/TabCardsGrid';
import DataTable from '../../../components/DataTable/DataTable';
import DetailForm from '../../../components/DetailForm/DetailForm';
import Pagination from '../../../components/Pagination/Pagination';
import './InstructorsScreen.css';

const InstructorsScreen = () => {
  const { setHeaderTitle, setHeaderSubtitle } = useHeader();
  const [searchParams, setSearchParams] = useSearchParams();

  // Data State
  const [tableData, setTableData] = useState([]);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
    per_page: 5,
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
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [authorizationPrice, setAuthorizationPrice] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [returnComment, setReturnComment] = useState('');

  // Filter & Search State
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [trainingCenters, setTrainingCenters] = useState({}); // Map of TC ID to TC name

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPagination(prev => ({ ...prev, current_page: 1 }));
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
    setHeaderTitle('Instructors');
    setHeaderSubtitle('Manage instructor authorizations and requests');
    return () => {
      setHeaderTitle(null);
      setHeaderSubtitle(null);
    };
  }, [setHeaderTitle, setHeaderSubtitle]);

  // Fetch stats for tabs
  const fetchStats = async () => {
    try {
      const [activeRes, pendingRes, returnedRes] = await Promise.all([
        accAPI.listAuthorizedTrainingCenters({ per_page: 1 }), // Using TC endpoint for active counts approximation or another logic if available
        accAPI.getInstructorRequests({ status: 'pending', per_page: 1 }),
        accAPI.getInstructorRequests({ status: 'returned', per_page: 1 })
      ]);

      // Note: For 'active' instructors, we might need a specific endpoint count or sum up approved requests
      // Assuming 'listAuthorizedTrainingCenters' was a mistake in previous code for instructors stats? 
      // Re-checking previous code: it used listAuthorizedTrainingCenters which returns TCs, not instructors.
      // Correcting logic: Active instructors are those in authorized list or approved requests.
      // accAPI.listAuthorizedInstructors? If not exists, maybe default to 0 or use a different call.
      // Based on available endpoints in context, we'll try to get counts from requests where status=approved for 'active',
      // or if there is a specific 'listAuthorizedInstructors' endpoint (not listed in prompt, but implied).
      // If no specific endpoint, we rely on requests status.

      const approvedRes = await accAPI.getInstructorRequests({ status: 'approved', per_page: 1 });

      setStats({
        active: approvedRes?.total || 0,
        pending: pendingRes?.total || 0,
        returned: returnedRes?.total || 0,
        total: (approvedRes?.total || 0) + (pendingRes?.total || 0) + (returnedRes?.total || 0)
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
      };

      // Only add search if there's a value
      if (debouncedSearch) {
        params.search = debouncedSearch;
      }

      let response;
      let dataList = [];
      let isRequest = true; // All instructor data comes from requests endpoint mainly based on prompts

      // Logic:
      // If statusFilter is 'active', fetch status='approved' (assuming approved = active authorized)
      // If 'all', fetch all requests
      // If 'pending', fetch status='pending'
      // If 'returned', fetch status='returned'

      if (statusFilter === 'active') {
        params.status = 'approved';
        response = await accAPI.getInstructorRequests(params);
        dataList = response?.data || [];
      } else if (statusFilter === 'all') {
        // No status param = all
        response = await accAPI.getInstructorRequests(params);
        dataList = response?.data || [];
      } else {
        params.status = statusFilter;
        response = await accAPI.getInstructorRequests(params);
        dataList = response?.data || [];
      }

      // Normalize data
      const normalizedData = dataList.map(item => {
        const instructor = item.instructor || item;
        return {
          ...item,
          _normalizedName: `${instructor.first_name || ''} ${instructor.last_name || ''}`.trim(),
          _normalizedEmail: instructor.email || '',
          _normalizedDate: item.request_date || item.created_at || item.updated_at,
          // Handle Training Center Name safely
          _normalizedTrainingCenter: item.training_center?.name || item.training_center?.legal_name || 'N/A',
          _trainingCenterId: item.training_center_id,
          _isRequest: true,
          status: item.status || 'pending'
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
      render: (value, row) => {
        const photoUrl = row.photo_url || row.instructor?.photo_url;
        return (
          <div className="flex items-center">
            <div className="w-10 h-10 mr-3 relative">
              {photoUrl ? (
                <>
                  <img
                    src={photoUrl}
                    alt={value || 'Instructor Photo'}
                    className="w-10 h-10 rounded-lg object-cover border border-gray-200"
                    width="40"
                    height="40"
                    loading="lazy"
                    decoding="async"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      const fallback = e.target.parentElement?.querySelector('.photo-fallback');
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                  <div
                    className="photo-fallback w-10 h-10 bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg items-center justify-center hidden"
                    style={{ display: 'none', position: 'absolute', top: 0, left: 0 }}
                  >
                    <Users className="h-5 w-5 text-primary-600" />
                  </div>
                </>
              ) : (
                <div className="w-10 h-10 bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary-600" />
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

  // filteredData was removed as we are using server-side filtering/searching (tableData).

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
      await fetchStats(); // Update stats after approval
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
      await fetchStats(); // Update stats after rejection
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
      await fetchStats(); // Update stats after return
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
            icon={Users}
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
            placeholder="Search instructors..."
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
          emptyMessage="No instructors found"
          onRowClick={(item) => handleRowClick(item)}
        />

        {/* Pagination-Select */}
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
        title={selectedRequest?._isRequest ? "Instructor Request Details" : "Instructor Details"}
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
                    { key: 'payment_status', label: 'Payment Status', render: (value) => <span className={`px-2 py-1 text-xs font-bold rounded-full ${value === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{value ? value.toUpperCase() : 'PENDING'}</span>, icon: CreditCard },
                    { key: 'created_at', label: 'Created At', type: 'datetime', icon: Calendar, showEmpty: false },
                    { key: 'updated_at', label: 'Updated At', type: 'datetime', icon: Calendar, showEmpty: false },
                  ]}
                />
              </div>
            )}

            {/* Instructor Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <User className="mr-2" size={20} />
                Instructor Information
              </h3>
              <div className="mb-6 flex justify-center">
                {selectedRequest.photo_url || (selectedRequest.instructor && selectedRequest.instructor.photo_url) ? (
                  <img
                    src={selectedRequest.photo_url || selectedRequest.instructor.photo_url}
                    alt="Instructor"
                    className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-gray-100 flex items-center justify-center border-4 border-white shadow-lg">
                    <User size={64} className="text-gray-400" />
                  </div>
                )}
              </div>

              <DetailForm
                data={{
                  ...selectedRequest,
                  first_name: selectedRequest.first_name || (selectedRequest.instructor?.first_name),
                  last_name: selectedRequest.last_name || (selectedRequest.instructor?.last_name),
                  email: selectedRequest.email || (selectedRequest.instructor?.email),
                  phone: selectedRequest.phone || (selectedRequest.instructor?.phone),
                  nationality: selectedRequest.nationality || (selectedRequest.instructor?.nationality),
                  specialization: selectedRequest.specialization || (selectedRequest.instructor?.specialization),
                }}
                fields={[
                  { key: 'first_name', label: 'First Name', icon: UserCircle },
                  { key: 'last_name', label: 'Last Name', icon: UserCircle },
                  { key: 'email', label: 'Email', type: 'email', icon: Mail },
                  { key: 'phone', label: 'Phone', icon: Phone },
                  { key: 'nationality', label: 'Nationality', icon: Globe },
                  { key: 'specialization', label: 'Specialization', icon: Award },
                  { key: '_normalizedTrainingCenter', label: 'Training Center', icon: Building2 },
                ]}
              />
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

            {/* Authorization Details (if present) */}
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

            {/* Return Comment (if returned) */}
            {selectedRequest.return_comment && (
              <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                <div className="flex items-center mb-2">
                  <ArrowLeft className="h-5 w-5 text-blue-600 mr-2" />
                  <h3 className="text-lg font-semibold text-blue-900">Return Comment</h3>
                </div>
                <p className="text-base text-gray-900">{selectedRequest.return_comment}</p>
              </div>
            )}
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
                    setRejectionReason('');
                    setSelectedRequest(selectedRequest);
                    setRejectModalOpen(true);
                  }}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center"
                >
                  <XCircle size={20} className="mr-2" />
                  Reject
                </button>
                <button
                  onClick={() => {
                    setDetailModalOpen(false);
                    setReturnComment('');
                    setSelectedRequest(selectedRequest);
                    setReturnModalOpen(true);
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center"
                >
                  <ArrowLeft size={20} className="mr-2" />
                  Return
                </button>
              </div>
            )}

            {/* Action Buttons for Returned Request */}
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
        )
        }
      </Modal >

      {/* Approve Modal */}
      < Modal
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
      </Modal >

      {/* Reject Modal */}
      < Modal
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
      </Modal >

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

    </div>
  );
};

export default InstructorsScreen;
