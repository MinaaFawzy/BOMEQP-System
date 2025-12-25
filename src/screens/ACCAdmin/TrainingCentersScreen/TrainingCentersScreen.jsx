import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { accAPI } from '../../../services/api';
import { useHeader } from '../../../context/HeaderContext';
import { Building2, CheckCircle, XCircle, Eye, Clock, ArrowLeft, Search, Filter, Mail, ChevronUp, ChevronDown, AlertCircle } from 'lucide-react';
import Modal from '../../../components/Modal/Modal';
import FormInput from '../../../components/FormInput/FormInput';
import Pagination from '../../../components/Pagination/Pagination';
import './TrainingCentersScreen.css';

const TrainingCentersScreen = () => {
  const { setHeaderTitle, setHeaderSubtitle } = useHeader();
  const [searchParams, setSearchParams] = useSearchParams();
  const [allData, setAllData] = useState([]); // Unified data array
  const [sortedData, setSortedData] = useState([]);
  const [paginatedData, setPaginatedData] = useState([]);
  const [filteredTotal, setFilteredTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [returnComment, setReturnComment] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [pagination, setPagination] = useState({
    currentPage: 1,
    perPage: 10,
    totalPages: 1,
    totalItems: 0,
  });
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
  }, [pagination.currentPage, pagination.perPage, searchTerm, statusFilter]);

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
        page: pagination.currentPage,
        per_page: pagination.perPage,
      };
      
      if (searchTerm) {
        params.search = searchTerm;
      }
      
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
      setSortedData(uniqueData);
      
      // Update pagination based on combined data
      // Since we're combining multiple sources, calculate total from all
      const totalFromPending = pendingData.total || pendingData.requests?.length || 0;
      const totalFromReturned = returnedData.total || returnedData.requests?.length || 0;
      const totalFromAuthorized = authorizedData.total || authorizedData.training_centers?.length || 0;
      const estimatedTotal = totalFromPending + totalFromReturned + totalFromAuthorized;
      
      setPagination(prev => ({
        ...prev,
        totalPages: Math.max(
          pendingData.last_page || pendingData.total_pages || 1,
          returnedData.last_page || returnedData.total_pages || 1,
          authorizedData.last_page || authorizedData.total_pages || 1
        ),
        totalItems: estimatedTotal || uniqueData.length,
      }));
    } catch (error) {
      console.error('Failed to load data:', error);
      setAllData([]);
      setSortedData([]);
    } finally {
      setLoading(false);
    }
  };
  
  const handlePageChange = (page) => {
    setPagination(prev => ({ ...prev, currentPage: page }));
  };
  
  const handlePerPageChange = (perPage) => {
    setPagination(prev => ({ ...prev, perPage, currentPage: 1 }));
  };

  // Sort handler
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Apply filtering and sorting
  useEffect(() => {
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

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(item => {
        const name = (item._normalizedName || '').toLowerCase();
        const email = (item._normalizedEmail || '').toLowerCase();
        return name.includes(searchLower) || email.includes(searchLower);
      });
    }

    // Apply sorting
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aValue, bValue;
        
        if (sortConfig.key === 'name') {
          aValue = a._normalizedName || '';
          bValue = b._normalizedName || '';
        } else if (sortConfig.key === 'email') {
          aValue = a._normalizedEmail || '';
          bValue = b._normalizedEmail || '';
        } else if (sortConfig.key === 'date') {
          aValue = new Date(a._normalizedDate || 0);
          bValue = new Date(b._normalizedDate || 0);
        } else {
          aValue = a[sortConfig.key] || '';
          bValue = b[sortConfig.key] || '';
        }
        
        if (sortConfig.key === 'date') {
          // Already Date objects
        } else if (typeof aValue === 'string') {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }
        
        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    
    setSortedData(filtered);
    setFilteredTotal(filtered.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortConfig, allData, statusFilter, searchTerm]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPagination(prev => {
      if (prev.currentPage !== 1) {
        return { ...prev, currentPage: 1 };
      }
      return prev;
    });
  }, [statusFilter, searchTerm]);

  // Apply pagination to filtered data
  useEffect(() => {
    const startIndex = (pagination.currentPage - 1) * pagination.perPage;
    const endIndex = startIndex + pagination.perPage;
    const paginated = sortedData.slice(startIndex, endIndex);
    setPaginatedData(paginated);
  }, [sortedData, pagination.currentPage, pagination.perPage]);

  const handleApprove = async (id) => {
    if (window.confirm('Approve this training center request?')) {
      try {
        await accAPI.approveTrainingCenterRequest(id);
        await loadData();
        setPagination(prev => ({ ...prev, currentPage: 1 }));
        alert('Training center request approved successfully!');
      } catch (error) {
        alert('Failed to approve: ' + (error.message || 'Unknown error'));
      }
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
      await accAPI.rejectTrainingCenterRequest(selectedRequest.id, { rejection_reason: rejectionReason });
      await loadData();
      setRejectModalOpen(false);
      setSelectedRequest(null);
      setRejectionReason('');
      setPagination(prev => ({ ...prev, currentPage: 1 }));
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
      setPagination(prev => ({ ...prev, currentPage: 1 }));
      alert('Request returned for revision');
    } catch (error) {
      alert('Failed to return request: ' + (error.message || 'Unknown error'));
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

  // Calculate stats from all data
  const pendingCount = allData.filter(item => item.status === 'pending').length;
  const returnedCount = allData.filter(item => item.status === 'returned').length;
  const authorizedCount = allData.filter(item => item.status === 'active' || item.status === 'approved' || !item._isRequest).length;
  const totalCount = allData.length;

  return (
    <div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {/* Total Training Centers */}
        <div 
          onClick={() => {
            setStatusFilter('all');
            setPagination(prev => ({ ...prev, currentPage: 1 }));
          }}
          className={`bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl shadow-lg p-6 border border-primary-200 hover:shadow-xl transition-all duration-300 cursor-pointer ${
            statusFilter === 'all' ? 'ring-2 ring-primary-500' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-primary-700 mb-2">Total</p>
              <p className="text-3xl font-bold text-primary-900">{totalCount}</p>
            </div>
            <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg">
              <Building2 className="text-white" size={32} />
            </div>
          </div>
        </div>

        {/* Pending */}
        <div 
          onClick={() => {
            setStatusFilter('pending');
            setPagination(prev => ({ ...prev, currentPage: 1 }));
          }}
          className={`bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl shadow-lg p-6 border border-yellow-200 hover:shadow-xl transition-all duration-300 cursor-pointer ${
            statusFilter === 'pending' ? 'ring-2 ring-yellow-500' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-700 mb-2">Pending</p>
              <p className="text-3xl font-bold text-yellow-900">{pendingCount}</p>
            </div>
            <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center shadow-lg">
              <Clock className="text-white" size={32} />
            </div>
          </div>
        </div>

        {/* Authorized */}
        <div 
          onClick={() => {
            setStatusFilter('active');
            setPagination(prev => ({ ...prev, currentPage: 1 }));
          }}
          className={`bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-lg p-6 border border-green-200 hover:shadow-xl transition-all duration-300 cursor-pointer ${
            statusFilter === 'active' || statusFilter === 'approved' ? 'ring-2 ring-green-500' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-700 mb-2">Active</p>
              <p className="text-3xl font-bold text-green-900">{authorizedCount}</p>
            </div>
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
              <CheckCircle className="text-white" size={32} />
            </div>
          </div>
        </div>

        {/* Returned */}
        <div 
          onClick={() => {
            setStatusFilter('returned');
            setPagination(prev => ({ ...prev, currentPage: 1 }));
          }}
          className={`bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-lg p-6 border border-blue-200 hover:shadow-xl transition-all duration-300 cursor-pointer ${
            statusFilter === 'returned' ? 'ring-2 ring-blue-500' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-700 mb-2">Returned</p>
              <p className="text-3xl font-bold text-blue-900">{returnedCount}</p>
            </div>
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <ArrowLeft className="text-white" size={32} />
            </div>
          </div>
        </div>

      </div>

      {/* Search and Filter Section */}
      <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-100 mb-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search Input */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPagination(prev => ({ ...prev, currentPage: 1 }));
              }}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
            />
          </div>
          
          {/* Status Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPagination(prev => ({ ...prev, currentPage: 1 }));
              }}
              className="pl-10 pr-8 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none bg-white cursor-pointer transition-all"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="returned">Returned</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="table-header-gradient">
              <tr>
                <th 
                  className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-primary-700 transition-colors select-none"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-2">
                    Training Center
                    {sortConfig.key === 'name' && (
                      sortConfig.direction === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                    )}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-primary-700 transition-colors select-none"
                  onClick={() => handleSort('email')}
                >
                  <div className="flex items-center gap-2">
                    Email
                    {sortConfig.key === 'email' && (
                      sortConfig.direction === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                    )}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-primary-700 transition-colors select-none"
                  onClick={() => handleSort('date')}
                >
                  <div className="flex items-center gap-2">
                    Date
                    {sortConfig.key === 'date' && (
                      sortConfig.direction === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                    )}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-primary-700 transition-colors select-none"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center gap-2">
                    Status
                    {sortConfig.key === 'status' && (
                      sortConfig.direction === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                    )}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-primary-600"></div>
                    </div>
                  </td>
                </tr>
              ) : sortedData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <Building2 className="text-gray-400" size={32} />
                      </div>
                      <p className="text-gray-500 font-medium">No training centers found</p>
                      <p className="text-sm text-gray-400 mt-1">
                        {searchTerm || statusFilter !== 'all' ? 'Try adjusting your filters' : 'No training centers available'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedData.map((item, index) => {
                  const name = item._normalizedName || 'N/A';
                  const email = item._normalizedEmail || 'N/A';
                  const date = item._normalizedDate;
                  
                  return (
                    <tr
                      key={`${item.id || 'item'}-${item._isRequest ? 'req' : 'auth'}-${index}`}
                      className="hover:bg-gradient-to-r hover:from-primary-50/30 hover:to-white transition-all duration-200 cursor-pointer group table-row-animated"
                      onClick={() => handleRowClick(item)}
                      style={{ '--animation-delay': `${index * 0.03}s` }}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg flex items-center justify-center mr-3 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                            <Building2 className="h-5 w-5 text-primary-600" />
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-900 group-hover:text-primary-700 transition-colors">{name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-600">
                          <Mail className="h-4 w-4 mr-2 text-gray-400" />
                          {email}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {date ? new Date(date).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-3 py-1.5 inline-flex items-center text-xs leading-5 font-bold rounded-full shadow-sm ${
                          item.status === 'approved' || item.status === 'active' ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300' :
                          item.status === 'rejected' ? 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 border border-red-300' :
                          item.status === 'returned' ? 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-300' :
                          'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 border border-yellow-300'
                        }`}>
                          {item.status === 'pending' && <Clock size={12} className="mr-1" />}
                          {item.status === 'returned' && <ArrowLeft size={12} className="mr-1" />}
                          {item.status ? item.status.charAt(0).toUpperCase() + item.status.slice(1) : 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleViewDetails(item)}
                            className="p-2 rounded-lg bg-primary-50 text-primary-600 hover:bg-primary-100 hover:scale-110 transition-all duration-200 shadow-sm hover:shadow-md"
                            title="View Details"
                          >
                            <Eye size={16} />
                          </button>
                          {item.status === 'pending' || item.status === 'returned' ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleApprove(item.id);
                              }}
                              className="p-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 hover:scale-110 transition-all duration-200 shadow-sm hover:shadow-md"
                              title="Approve"
                            >
                              <CheckCircle size={16} />
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewDetails(item);
                              }}
                              className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 hover:scale-110 transition-all duration-200 shadow-sm hover:shadow-md"
                              title="View"
                            >
                              <Eye size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {!loading && filteredTotal > 0 && (
          <Pagination
            currentPage={pagination.currentPage}
            totalPages={Math.ceil(filteredTotal / pagination.perPage)}
            totalItems={filteredTotal}
            perPage={pagination.perPage}
            onPageChange={handlePageChange}
            onPerPageChange={handlePerPageChange}
          />
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
            {/* Display training center info - works for both requests and authorized centers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Name</p>
                <p className="text-base font-semibold text-gray-900">
                  {selectedRequest.training_center?.name || selectedRequest.name || selectedRequest._normalizedName || 'N/A'}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Email</p>
                <p className="text-base font-semibold text-gray-900">
                  {selectedRequest.training_center?.email || selectedRequest.email || selectedRequest._normalizedEmail || 'N/A'}
                </p>
              </div>
              {selectedRequest.legal_name && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Legal Name</p>
                  <p className="text-base font-semibold text-gray-900">{selectedRequest.legal_name}</p>
                </div>
              )}
              {selectedRequest.registration_number && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Registration Number</p>
                  <p className="text-base font-semibold text-gray-900">{selectedRequest.registration_number}</p>
                </div>
              )}
              {selectedRequest.country && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Country</p>
                  <p className="text-base font-semibold text-gray-900">{selectedRequest.country}</p>
                </div>
              )}
              {selectedRequest.city && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">City</p>
                  <p className="text-base font-semibold text-gray-900">{selectedRequest.city}</p>
                </div>
              )}
            </div>
            {/* Only show documents for requests, not authorized centers */}
            {selectedRequest._isRequest && selectedRequest.documents_json && selectedRequest.documents_json.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Documents</h3>
                <div className="space-y-2">
                  {selectedRequest.documents_json.map((doc, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg">
                      <p className="font-medium text-gray-900">{doc.type}</p>
                      {doc.url && (
                        <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-700 text-sm">
                          View Document
                        </a>
                      )}
                    </div>
                  ))}
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
