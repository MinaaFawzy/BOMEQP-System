import { useEffect, useState } from 'react';
import { adminAPI } from '../../../services/api';
import { useHeader } from '../../../context/HeaderContext';
import { Users, Mail, Phone, Search, Filter, Building2, CheckCircle, Clock, XCircle, ChevronUp, ChevronDown, Eye, Edit } from 'lucide-react';
import Modal from '../../../components/Modal/Modal';
import FormInput from '../../../components/FormInput/FormInput';
import Button from '../../../components/Button/Button';
import Pagination from '../../../components/Pagination/Pagination';
import './AllInstructorsScreen.css';

const AllInstructorsScreen = () => {
  const { setHeaderTitle, setHeaderSubtitle } = useHeader();
  const [instructors, setInstructors] = useState([]);
  const [allInstructors, setAllInstructors] = useState([]); // Store all loaded data for client-side filtering
  const [sortedInstructors, setSortedInstructors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedInstructor, setSelectedInstructor] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [clientStatusFilter, setClientStatusFilter] = useState('all'); // Client-side filter for stat cards
  const [pagination, setPagination] = useState({
    currentPage: 1,
    perPage: 10,
    totalPages: 1,
    totalItems: 0,
  });
  const [saving, setSaving] = useState(false);
  const [instructorFormData, setInstructorFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    id_number: '',
    cv_url: '',
    certificates_json: [],
    specializations: [],
    status: 'active',
  });
  const [instructorErrors, setInstructorErrors] = useState({});

  // Load all data initially for client-side filtering
  useEffect(() => {
    if (searchTerm === '' && statusFilter === 'all') {
      // Load all data when no server-side filters are active
      loadInstructors(true);
    } else {
      // Use server-side filtering when search or statusFilter is active
      loadInstructors(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.currentPage, pagination.perPage, searchTerm, statusFilter]);

  useEffect(() => {
    setHeaderTitle('Instructors');
    setHeaderSubtitle('View and manage all instructors across all ACCs');
    return () => {
      setHeaderTitle(null);
      setHeaderSubtitle(null);
    };
  }, [setHeaderTitle, setHeaderSubtitle]);

  const loadInstructors = async (loadAll = false) => {
    setLoading(true);
    try {
      const params = {
        page: loadAll ? 1 : pagination.currentPage,
        per_page: loadAll ? 1000 : pagination.perPage, // Load large amount when filtering client-side
      };
      
      if (searchTerm) {
        params.search = searchTerm;
      }
      
      // Only use server-side statusFilter if clientStatusFilter is 'all' (not using stat card filter)
      if (statusFilter !== 'all' && clientStatusFilter === 'all') {
        params.status = statusFilter;
      }
      
      const data = await adminAPI.listInstructors(params);
      
      let instructorsList = [];
      if (data.data) {
        instructorsList = data.data || [];
        if (!loadAll) {
          setPagination(prev => ({
            ...prev,
            totalPages: data.last_page || data.total_pages || 1,
            totalItems: data.total || 0,
          }));
        }
      } else if (data.instructors) {
        instructorsList = data.instructors || [];
        if (!loadAll) {
          setPagination(prev => ({
            ...prev,
            totalPages: 1,
            totalItems: data.instructors?.length || 0,
          }));
        }
      } else {
        instructorsList = Array.isArray(data) ? data : [];
        if (!loadAll) {
          setPagination(prev => ({
            ...prev,
            totalPages: 1,
            totalItems: instructorsList.length,
          }));
        }
      }
      
      setInstructors(instructorsList);
      setAllInstructors(instructorsList); // Store all loaded data for client-side filtering
      setSortedInstructors(instructorsList);
    } catch (error) {
      console.error('Failed to load instructors:', error);
      setInstructors([]);
      setAllInstructors([]);
      setSortedInstructors([]);
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

  // Sort instructors
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Apply sorting and client-side filtering
  useEffect(() => {
    // Use client-side filtering when no server-side filters (search/statusFilter) are active
    // OR when clientStatusFilter is set (stat card buttons)
    const useClientSideFiltering = (searchTerm === '' && statusFilter === 'all') || clientStatusFilter !== 'all';
    
    if (useClientSideFiltering && allInstructors.length > 0) {
      let filtered = [...allInstructors];

      // Apply client-side status filter if stat card button is clicked
      if (clientStatusFilter !== 'all') {
        filtered = filtered.filter(i => i.status === clientStatusFilter);
      }

      // Apply sorting
      if (sortConfig.key) {
        filtered.sort((a, b) => {
          let aValue, bValue;
          
          if (sortConfig.key === 'name') {
            aValue = `${a.first_name || ''} ${a.last_name || ''}`.trim().toLowerCase();
            bValue = `${b.first_name || ''} ${b.last_name || ''}`.trim().toLowerCase();
          } else if (sortConfig.key === 'training_center') {
            const aTC = a.training_center;
            const bTC = b.training_center;
            aValue = typeof aTC === 'string' ? aTC : (aTC?.name || '').toLowerCase();
            bValue = typeof bTC === 'string' ? bTC : (bTC?.name || '').toLowerCase();
          } else {
            aValue = a[sortConfig.key] || '';
            bValue = b[sortConfig.key] || '';
          }
          
          if (typeof aValue === 'string') {
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
      
      // Apply client-side pagination
      const totalFiltered = filtered.length;
      const totalPages = Math.ceil(totalFiltered / pagination.perPage);
      const currentPage = pagination.currentPage > totalPages ? Math.max(1, totalPages) : pagination.currentPage;
      const startIndex = (currentPage - 1) * pagination.perPage;
      const endIndex = startIndex + pagination.perPage;
      const paginatedFiltered = filtered.slice(startIndex, endIndex);
      
      setSortedInstructors(paginatedFiltered);
      
      // Update pagination based on filtered results
      setPagination(prev => ({
        ...prev,
        totalItems: totalFiltered,
        totalPages: totalPages || 1,
        currentPage: currentPage,
      }));
    } else {
      // Use server-side paginated data (instructors) when server-side filters are active
      let sorted = [...instructors];

      // Apply sorting
      if (sortConfig.key) {
        sorted.sort((a, b) => {
          let aValue, bValue;
          
          if (sortConfig.key === 'name') {
            aValue = `${a.first_name || ''} ${a.last_name || ''}`.trim().toLowerCase();
            bValue = `${b.first_name || ''} ${b.last_name || ''}`.trim().toLowerCase();
          } else if (sortConfig.key === 'training_center') {
            const aTC = a.training_center;
            const bTC = b.training_center;
            aValue = typeof aTC === 'string' ? aTC : (aTC?.name || '').toLowerCase();
            bValue = typeof bTC === 'string' ? bTC : (bTC?.name || '').toLowerCase();
          } else {
            aValue = a[sortConfig.key] || '';
            bValue = b[sortConfig.key] || '';
          }
          
          if (typeof aValue === 'string') {
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
      
      setSortedInstructors(sorted);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortConfig, instructors, allInstructors, clientStatusFilter, pagination.perPage, pagination.currentPage, searchTerm, statusFilter]);

  const handleViewDetails = async (instructor) => {
    setDetailLoading(true);
    setDetailModalOpen(true);
    try {
      const data = await adminAPI.getInstructorDetails(instructor.id);
      setSelectedInstructor(data.instructor);
    } catch (error) {
      console.error('Failed to load instructor details:', error);
      setSelectedInstructor(instructor);
      if (error.response?.status === 404) {
        alert('Instructor not found');
      }
    } finally {
      setDetailLoading(false);
    }
  };

  const handleEditInstructor = async (instructor) => {
    try {
      const data = await adminAPI.getInstructorDetails(instructor.id);
      const instData = data.instructor;
      setSelectedInstructor(instData);
      setInstructorFormData({
        first_name: instData.first_name || '',
        last_name: instData.last_name || '',
        email: instData.email || '',
        phone: instData.phone || '',
        id_number: instData.id_number || '',
        cv_url: instData.cv_url || '',
        certificates_json: instData.certificates_json || [],
        specializations: instData.specializations || [],
        status: instData.status || 'active',
      });
      setInstructorErrors({});
      setEditModalOpen(true);
    } catch (error) {
      console.error('Failed to load instructor details:', error);
      alert('Failed to load instructor details');
    }
  };

  const handleInstructorFormChange = (e) => {
    const { name, value } = e.target;
    setInstructorFormData({
      ...instructorFormData,
      [name]: value,
    });
    setInstructorErrors({});
  };

  const handleSpecializationsChange = (e) => {
    const value = e.target.value;
    const specializations = value.split(',').map(s => s.trim()).filter(s => s);
    setInstructorFormData({
      ...instructorFormData,
      specializations,
    });
  };

  const handleSaveInstructor = async (e) => {
    e.preventDefault();
    setSaving(true);
    setInstructorErrors({});

    try {
      await adminAPI.updateInstructor(selectedInstructor.id, instructorFormData);
      await loadInstructors();
      setEditModalOpen(false);
      setSelectedInstructor(null);
      alert('Instructor updated successfully!');
    } catch (error) {
      if (error.response?.data?.errors) {
        setInstructorErrors(error.response.data.errors);
      } else {
        setInstructorErrors({ general: error.response?.data?.message || error.message || 'Failed to update instructor' });
      }
    } finally {
      setSaving(false);
    }
  };

  // Calculate stats from all instructors (unfiltered)
  const totalCount = allInstructors.length;
  const activeCount = allInstructors.filter(i => i.status === 'active').length;
  const pendingCount = allInstructors.filter(i => i.status === 'pending').length;
  const suspendedCount = allInstructors.filter(i => i.status === 'suspended').length;

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;
  }

  return (
    <div className="space-y-4">

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Instructors */}
        <div 
          onClick={() => {
            setClientStatusFilter('all');
            setPagination(prev => ({ ...prev, currentPage: 1 }));
          }}
          className={`bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl shadow-lg p-6 border border-primary-200 hover:shadow-xl transition-all duration-300 cursor-pointer ${
            clientStatusFilter === 'all' ? 'ring-2 ring-primary-500' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-primary-700 mb-2">Total</p>
              <p className="text-3xl font-bold text-primary-900">{totalCount}</p>
            </div>
            <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg">
              <Users className="text-white" size={32} />
            </div>
          </div>
        </div>

        {/* Active */}
        <div 
          onClick={() => {
            setClientStatusFilter('active');
            setPagination(prev => ({ ...prev, currentPage: 1 }));
          }}
          className={`bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-lg p-6 border border-green-200 hover:shadow-xl transition-all duration-300 cursor-pointer ${
            clientStatusFilter === 'active' ? 'ring-2 ring-green-500' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-700 mb-2">Active</p>
              <p className="text-3xl font-bold text-green-900">{activeCount}</p>
            </div>
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
              <CheckCircle className="text-white" size={32} />
            </div>
          </div>
        </div>

        {/* Pending */}
        <div 
          onClick={() => {
            setClientStatusFilter('pending');
            setPagination(prev => ({ ...prev, currentPage: 1 }));
          }}
          className={`bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl shadow-lg p-6 border border-yellow-200 hover:shadow-xl transition-all duration-300 cursor-pointer ${
            clientStatusFilter === 'pending' ? 'ring-2 ring-yellow-500' : ''
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

        {/* Suspended */}
        <div 
          onClick={() => {
            setClientStatusFilter('suspended');
            setPagination(prev => ({ ...prev, currentPage: 1 }));
          }}
          className={`bg-gradient-to-br from-red-50 to-red-100 rounded-xl shadow-lg p-6 border border-red-200 hover:shadow-xl transition-all duration-300 cursor-pointer ${
            clientStatusFilter === 'suspended' ? 'ring-2 ring-red-500' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-700 mb-2">Suspended</p>
              <p className="text-3xl font-bold text-red-900">{suspendedCount}</p>
            </div>
            <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
              <XCircle className="text-white" size={32} />
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
                setClientStatusFilter('all'); // Reset client filter when searching
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
                setClientStatusFilter('all'); // Reset client filter when using dropdown
                setPagination(prev => ({ ...prev, currentPage: 1 }));
              }}
              className="pl-10 pr-8 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none bg-white cursor-pointer transition-all"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="suspended">Suspended</option>
              <option value="inactive">Inactive</option>
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
                    Instructor
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
                  onClick={() => handleSort('phone')}
                >
                  <div className="flex items-center gap-2">
                    Phone
                    {sortConfig.key === 'phone' && (
                      sortConfig.direction === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                    )}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-primary-700 transition-colors select-none"
                  onClick={() => handleSort('training_center')}
                >
                  <div className="flex items-center gap-2">
                    Training Center
                    {sortConfig.key === 'training_center' && (
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
              {sortedInstructors.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <Users className="text-gray-400" size={32} />
                      </div>
                      <p className="text-gray-500 font-medium">No instructors found</p>
                      <p className="text-sm text-gray-400 mt-1">No instructors match your search criteria</p>
                    </div>
                  </td>
                </tr>
              ) : (
                sortedInstructors.map((instructor, index) => {
                  const statusConfig = {
                    active: { bg: 'from-green-100 to-green-200', text: 'text-green-800', border: 'border-green-300', icon: CheckCircle },
                    pending: { bg: 'from-yellow-100 to-yellow-200', text: 'text-yellow-800', border: 'border-yellow-300', icon: Clock },
                    suspended: { bg: 'from-red-100 to-red-200', text: 'text-red-800', border: 'border-red-300', icon: XCircle },
                    inactive: { bg: 'from-gray-100 to-gray-200', text: 'text-gray-800', border: 'border-gray-300', icon: Clock },
                  };
                  const config = statusConfig[instructor.status] || statusConfig.inactive;
                  const StatusIcon = config.icon;
                  const trainingCenterName = instructor.training_center 
                    ? (typeof instructor.training_center === 'string' ? instructor.training_center : instructor.training_center.name)
                    : 'N/A';
                  
                  return (
                    <tr
                      key={instructor.id || index}
                      className="hover:bg-gradient-to-r hover:from-primary-50/30 hover:to-white transition-all duration-200 cursor-pointer group table-row-animated"
                      onClick={() => handleViewDetails(instructor)}
                      style={{ '--animation-delay': `${index * 0.03}s` }}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg flex items-center justify-center mr-3 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                            <Users className="h-5 w-5 text-primary-600" />
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-900 group-hover:text-primary-700 transition-colors">
                              {instructor.first_name} {instructor.last_name}
                            </div>
                            {instructor.id_number && (
                              <div className="text-xs text-gray-500">ID: {instructor.id_number}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-600">
                          <Mail className="h-4 w-4 mr-2 text-gray-400" />
                          {instructor.email}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {instructor.phone ? (
                          <div className="flex items-center text-sm text-gray-600">
                            <Phone className="h-4 w-4 mr-2 text-gray-400" />
                            {instructor.phone}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-600">
                          <Building2 className="h-4 w-4 mr-2 text-gray-400" />
                          {trainingCenterName}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-3 py-1.5 inline-flex items-center text-xs leading-5 font-bold rounded-full shadow-sm bg-gradient-to-r ${config.bg} ${config.text} border ${config.border}`}>
                          <StatusIcon size={14} className="mr-1" />
                          {instructor.status.charAt(0).toUpperCase() + instructor.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleViewDetails(instructor)}
                            className="p-2 rounded-lg bg-primary-50 text-primary-600 hover:bg-primary-100 hover:scale-110 transition-all duration-200 shadow-sm hover:shadow-md"
                            title="View Details"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditInstructor(instructor);
                            }}
                            className="p-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 hover:scale-110 transition-all duration-200 shadow-sm hover:shadow-md"
                            title="Edit Instructor"
                          >
                            <Edit size={16} />
                          </button>
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
        {!loading && pagination.totalItems > 0 && (
          <Pagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            perPage={pagination.perPage}
            onPageChange={handlePageChange}
            onPerPageChange={handlePerPageChange}
          />
        )}
      </div>

      {/* Instructor Detail Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedInstructor(null);
        }}
        title="Instructor Details"
        size="lg"
      >
        {detailLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : selectedInstructor ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">First Name</p>
                <p className="text-base font-semibold text-gray-900">{selectedInstructor.first_name || 'N/A'}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Last Name</p>
                <p className="text-base font-semibold text-gray-900">{selectedInstructor.last_name || 'N/A'}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1 flex items-center">
                  <Mail size={16} className="mr-2" />
                  Email
                </p>
                <p className="text-base font-semibold text-gray-900">{selectedInstructor.email || 'N/A'}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1 flex items-center">
                  <Phone size={16} className="mr-2" />
                  Phone
                </p>
                <p className="text-base font-semibold text-gray-900">{selectedInstructor.phone || 'N/A'}</p>
              </div>
              {selectedInstructor.id_number && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">ID Number</p>
                  <p className="text-base font-semibold text-gray-900">{selectedInstructor.id_number}</p>
                </div>
              )}
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Status</p>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                  selectedInstructor.status === 'active' ? 'bg-green-100 text-green-800' :
                  selectedInstructor.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  selectedInstructor.status === 'suspended' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {selectedInstructor.status}
                </span>
              </div>
            </div>
            {selectedInstructor.specializations && selectedInstructor.specializations.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Specializations</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedInstructor.specializations.map((spec, index) => (
                    <span key={index} className="px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-sm">
                      {spec}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="flex space-x-3 pt-4 border-t border-gray-200">
              <Button
                variant="outline"
                fullWidth
                icon={<Edit size={20} />}
                onClick={() => {
                  setDetailModalOpen(false);
                  handleEditInstructor(selectedInstructor);
                }}
              >
                Edit Instructor
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Edit Instructor Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedInstructor(null);
          setInstructorFormData({
            first_name: '',
            last_name: '',
            email: '',
            phone: '',
            id_number: '',
            cv_url: '',
            certificates_json: [],
            specializations: [],
            status: 'active',
          });
          setInstructorErrors({});
        }}
        title={`Edit Instructor: ${selectedInstructor?.first_name} ${selectedInstructor?.last_name}`}
        size="lg"
      >
        <form onSubmit={handleSaveInstructor} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="First Name"
              name="first_name"
              value={instructorFormData.first_name}
              onChange={handleInstructorFormChange}
              error={instructorErrors.first_name}
            />
            <FormInput
              label="Last Name"
              name="last_name"
              value={instructorFormData.last_name}
              onChange={handleInstructorFormChange}
              error={instructorErrors.last_name}
            />
            <FormInput
              label="Email"
              name="email"
              type="email"
              value={instructorFormData.email}
              onChange={handleInstructorFormChange}
              error={instructorErrors.email}
            />
            <FormInput
              label="Phone"
              name="phone"
              value={instructorFormData.phone}
              onChange={handleInstructorFormChange}
              error={instructorErrors.phone}
            />
            <FormInput
              label="ID Number"
              name="id_number"
              value={instructorFormData.id_number}
              onChange={handleInstructorFormChange}
              error={instructorErrors.id_number}
            />
            <FormInput
              label="CV URL"
              name="cv_url"
              type="url"
              value={instructorFormData.cv_url}
              onChange={handleInstructorFormChange}
              error={instructorErrors.cv_url}
            />
            <FormInput
              label="Status"
              name="status"
              type="select"
              value={instructorFormData.status}
              onChange={handleInstructorFormChange}
              options={[
                { value: 'pending', label: 'Pending' },
                { value: 'active', label: 'Active' },
                { value: 'suspended', label: 'Suspended' },
                { value: 'inactive', label: 'Inactive' },
              ]}
              error={instructorErrors.status}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Specializations (comma-separated)
              </label>
              <input
                type="text"
                value={instructorFormData.specializations.join(', ')}
                onChange={handleSpecializationsChange}
                placeholder="e.g., Aviation Safety, Aircraft Maintenance"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              {instructorErrors.specializations && (
                <p className="mt-1 text-sm text-red-600">{instructorErrors.specializations}</p>
              )}
            </div>
          </div>

          {instructorErrors.general && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600 font-medium">{instructorErrors.general}</p>
            </div>
          )}

          <div className="flex space-x-3 pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              fullWidth
              onClick={() => {
                setEditModalOpen(false);
                setSelectedInstructor(null);
                setInstructorErrors({});
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
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AllInstructorsScreen;
