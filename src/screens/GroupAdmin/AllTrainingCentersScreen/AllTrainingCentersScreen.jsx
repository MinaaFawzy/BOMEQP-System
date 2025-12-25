import { useEffect, useState } from 'react';
import { adminAPI } from '../../../services/api';
import { useHeader } from '../../../context/HeaderContext';
import { Building2, Eye, Mail, MapPin, School, CheckCircle, Clock, Search, Filter, ChevronUp, ChevronDown, Edit } from 'lucide-react';
import Modal from '../../../components/Modal/Modal';
import FormInput from '../../../components/FormInput/FormInput';
import Button from '../../../components/Button/Button';
import Pagination from '../../../components/Pagination/Pagination';
import './AllTrainingCentersScreen.css';

const AllTrainingCentersScreen = () => {
  const { setHeaderTitle, setHeaderSubtitle } = useHeader();
  const [trainingCenters, setTrainingCenters] = useState([]);
  const [allTrainingCenters, setAllTrainingCenters] = useState([]); // Store all loaded data for client-side filtering
  const [sortedTrainingCenters, setSortedTrainingCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedTC, setSelectedTC] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [clientStatusFilter, setClientStatusFilter] = useState('all'); // Client-side filter for stat cards
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({
    currentPage: 1,
    perPage: 10,
    totalPages: 1,
    totalItems: 0,
  });
  const [saving, setSaving] = useState(false);
  const [tcFormData, setTcFormData] = useState({
    name: '',
    legal_name: '',
    registration_number: '',
    country: '',
    city: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    logo_url: '',
    referred_by_group: false,
    status: 'active',
  });
  const [tcErrors, setTcErrors] = useState({});

  // Load all data initially for client-side filtering
  useEffect(() => {
    if (searchTerm === '' && statusFilter === 'all') {
      // Load all data when no server-side filters are active
      loadTrainingCenters(true);
    } else {
      // Use server-side filtering when search or statusFilter is active
      loadTrainingCenters(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.currentPage, pagination.perPage, searchTerm, statusFilter]);

  const loadTrainingCenters = async (loadAll = false) => {
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
      
      const data = await adminAPI.listTrainingCenters(params);
      
      let centersList = [];
      if (data.data) {
        centersList = data.data || [];
        if (!loadAll) {
          setPagination(prev => ({
            ...prev,
            totalPages: data.last_page || data.total_pages || 1,
            totalItems: data.total || 0,
          }));
        }
      } else if (data.training_centers) {
        centersList = data.training_centers || [];
        if (!loadAll) {
          setPagination(prev => ({
            ...prev,
            totalPages: 1,
            totalItems: data.training_centers?.length || 0,
          }));
        }
      } else {
        centersList = Array.isArray(data) ? data : [];
        if (!loadAll) {
          setPagination(prev => ({
            ...prev,
            totalPages: 1,
            totalItems: centersList.length,
          }));
        }
      }
      
      setTrainingCenters(centersList);
      setAllTrainingCenters(centersList); // Store all loaded data for client-side filtering
      setSortedTrainingCenters(centersList);
    } catch (error) {
      console.error('Failed to load training centers:', error);
      setTrainingCenters([]);
      setAllTrainingCenters([]);
      setSortedTrainingCenters([]);
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

  // Sort training centers
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
    
    if (useClientSideFiltering && allTrainingCenters.length > 0) {
      let filtered = [...allTrainingCenters];

      // Apply client-side status filter if stat card button is clicked
      if (clientStatusFilter !== 'all') {
        filtered = filtered.filter(tc => tc.status === clientStatusFilter);
      }

      // Apply sorting
      if (sortConfig.key) {
        filtered.sort((a, b) => {
          let aValue = a[sortConfig.key];
          let bValue = b[sortConfig.key];
          
          // Handle different data types
          if (sortConfig.key === 'created_at') {
            aValue = new Date(aValue);
            bValue = new Date(bValue);
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
      
      // Apply client-side pagination
      const totalFiltered = filtered.length;
      const totalPages = Math.ceil(totalFiltered / pagination.perPage);
      const currentPage = pagination.currentPage > totalPages ? Math.max(1, totalPages) : pagination.currentPage;
      const startIndex = (currentPage - 1) * pagination.perPage;
      const endIndex = startIndex + pagination.perPage;
      const paginatedFiltered = filtered.slice(startIndex, endIndex);
      
      setSortedTrainingCenters(paginatedFiltered);
      
      // Update pagination based on filtered results
      setPagination(prev => ({
        ...prev,
        totalItems: totalFiltered,
        totalPages: totalPages || 1,
        currentPage: currentPage,
      }));
    } else {
      // Use server-side paginated data (trainingCenters) when server-side filters are active
      let sorted = [...trainingCenters];

      // Apply sorting
      if (sortConfig.key) {
        sorted.sort((a, b) => {
          let aValue = a[sortConfig.key];
          let bValue = b[sortConfig.key];
          
          // Handle different data types
          if (sortConfig.key === 'created_at') {
            aValue = new Date(aValue);
            bValue = new Date(bValue);
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
      
      setSortedTrainingCenters(sorted);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortConfig, trainingCenters, allTrainingCenters, clientStatusFilter, pagination.perPage, pagination.currentPage, searchTerm, statusFilter]);

  const handleViewDetails = async (tc) => {
    try {
      const data = await adminAPI.getTrainingCenterDetails(tc.id);
      setSelectedTC(data.training_center);
      setDetailModalOpen(true);
    } catch (error) {
      console.error('Failed to load training center details:', error);
      setSelectedTC(tc);
      setDetailModalOpen(true);
    }
  };

  const handleEditTrainingCenter = async (tc) => {
    try {
      const data = await adminAPI.getTrainingCenterDetails(tc.id);
      const tcData = data.training_center;
      setSelectedTC(tcData);
      setTcFormData({
        name: tcData.name || '',
        legal_name: tcData.legal_name || '',
        registration_number: tcData.registration_number || '',
        country: tcData.country || '',
        city: tcData.city || '',
        address: tcData.address || '',
        phone: tcData.phone || '',
        email: tcData.email || '',
        website: tcData.website || '',
        logo_url: tcData.logo_url || '',
        referred_by_group: tcData.referred_by_group || false,
        status: tcData.status || 'active',
      });
      setTcErrors({});
      setEditModalOpen(true);
    } catch (error) {
      console.error('Failed to load training center details:', error);
      alert('Failed to load training center details');
    }
  };

  const handleTcFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setTcFormData({
      ...tcFormData,
      [name]: type === 'checkbox' ? checked : value,
    });
    setTcErrors({});
  };

  const handleSaveTrainingCenter = async (e) => {
    e.preventDefault();
    setSaving(true);
    setTcErrors({});

    try {
      await adminAPI.updateTrainingCenter(selectedTC.id, tcFormData);
      await loadTrainingCenters();
      setEditModalOpen(false);
      setSelectedTC(null);
      alert('Training center updated successfully!');
    } catch (error) {
      if (error.response?.data?.errors) {
        setTcErrors(error.response.data.errors);
      } else {
        setTcErrors({ general: error.response?.data?.message || error.message || 'Failed to update training center' });
      }
    } finally {
      setSaving(false);
    }
  };

  // Calculate stats from all training centers (unfiltered)
  const totalCount = allTrainingCenters.length;
  const activeCount = allTrainingCenters.filter(tc => tc.status === 'active').length;
  const pendingCount = allTrainingCenters.filter(tc => tc.status === 'pending').length;

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;
  }

  return (
    <div className="space-y-4">

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Training Centers */}
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
              <Building2 className="text-white" size={32} />
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
      </div>

      {/* Search and Filter Section */}
      <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-100">
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
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center gap-2">
                    Status
                    {sortConfig.key === 'status' && (
                      sortConfig.direction === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                    )}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-primary-700 transition-colors select-none"
                  onClick={() => handleSort('country')}
                >
                  <div className="flex items-center gap-2">
                    Country
                    {sortConfig.key === 'country' && (
                      sortConfig.direction === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                    )}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-primary-700 transition-colors select-none"
                  onClick={() => handleSort('created_at')}
                >
                  <div className="flex items-center gap-2">
                    Created
                    {sortConfig.key === 'created_at' && (
                      sortConfig.direction === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                    )}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {sortedTrainingCenters.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <School className="text-gray-400" size={32} />
                      </div>
                      <p className="text-gray-500 font-medium">No training centers found</p>
                      <p className="text-sm text-gray-400 mt-1">No training centers match your search criteria</p>
                    </div>
                  </td>
                </tr>
              ) : (
                sortedTrainingCenters.map((tc, index) => (
                  <tr
                    key={tc.id || index}
                    className="hover:bg-gradient-to-r hover:from-primary-50/30 hover:to-white transition-all duration-200 cursor-pointer group table-row-animated"
                    onClick={() => handleViewDetails(tc)}
                    style={{ '--animation-delay': `${index * 0.03}s` }}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg flex items-center justify-center mr-3 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                          <School className="h-5 w-5 text-primary-600" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900 group-hover:text-primary-700 transition-colors">
                            {tc.name || 'N/A'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-600">
                        <Mail className="h-4 w-4 mr-2 text-gray-400" />
                        {tc.email || 'N/A'}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-3 py-1.5 inline-flex text-xs leading-5 font-bold rounded-full shadow-sm ${
                        tc.status === 'active' ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300' :
                        tc.status === 'pending' ? 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 border border-yellow-300' :
                        'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300'
                      }`}>
                        {tc.status ? tc.status.charAt(0).toUpperCase() + tc.status.slice(1) : 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                        {tc.country || 'N/A'}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {tc.created_at ? new Date(tc.created_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewDetails(tc)}
                          className="p-2 rounded-lg bg-primary-50 text-primary-600 hover:bg-primary-100 hover:scale-110 transition-all duration-200 shadow-sm hover:shadow-md"
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditTrainingCenter(tc);
                          }}
                          className="p-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 hover:scale-110 transition-all duration-200 shadow-sm hover:shadow-md"
                          title="Edit Training Center"
                        >
                          <Edit size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
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

      {/* Training Center Detail Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedTC(null);
        }}
        title="Training Center Details"
        size="lg"
      >
        {selectedTC && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Name</p>
                <p className="text-base font-semibold text-gray-900">
                  {selectedTC.name || 'N/A'}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Email</p>
                <p className="text-base font-semibold text-gray-900">
                  {selectedTC.email || 'N/A'}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Status</p>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                  selectedTC.status === 'active' ? 'bg-green-100 text-green-800' :
                  selectedTC.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {selectedTC.status || 'N/A'}
                </span>
              </div>
              {selectedTC.country && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Country</p>
                  <p className="text-base font-semibold text-gray-900">{selectedTC.country}</p>
                </div>
              )}
              {selectedTC.created_at && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Created At</p>
                  <p className="text-base font-semibold text-gray-900">
                    {new Date(selectedTC.created_at).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
            <div className="flex space-x-3 pt-4 border-t border-gray-200">
              <Button
                variant="outline"
                fullWidth
                icon={<Edit size={20} />}
                onClick={() => {
                  setDetailModalOpen(false);
                  handleEditTrainingCenter(selectedTC);
                }}
              >
                Edit Training Center
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Training Center Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedTC(null);
          setTcFormData({
            name: '',
            legal_name: '',
            registration_number: '',
            country: '',
            city: '',
            address: '',
            phone: '',
            email: '',
            website: '',
            logo_url: '',
            referred_by_group: false,
            status: 'active',
          });
          setTcErrors({});
        }}
        title={`Edit Training Center: ${selectedTC?.name}`}
        size="lg"
      >
        <form onSubmit={handleSaveTrainingCenter} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="Name"
              name="name"
              value={tcFormData.name}
              onChange={handleTcFormChange}
              error={tcErrors.name}
            />
            <FormInput
              label="Legal Name"
              name="legal_name"
              value={tcFormData.legal_name}
              onChange={handleTcFormChange}
              error={tcErrors.legal_name}
            />
            <FormInput
              label="Registration Number"
              name="registration_number"
              value={tcFormData.registration_number}
              onChange={handleTcFormChange}
              error={tcErrors.registration_number}
            />
            <FormInput
              label="Country"
              name="country"
              value={tcFormData.country}
              onChange={handleTcFormChange}
              error={tcErrors.country}
            />
            <FormInput
              label="City"
              name="city"
              value={tcFormData.city}
              onChange={handleTcFormChange}
              error={tcErrors.city}
            />
            <FormInput
              label="Address"
              name="address"
              value={tcFormData.address}
              onChange={handleTcFormChange}
              textarea
              rows={2}
              error={tcErrors.address}
            />
            <FormInput
              label="Phone"
              name="phone"
              value={tcFormData.phone}
              onChange={handleTcFormChange}
              error={tcErrors.phone}
            />
            <FormInput
              label="Email"
              name="email"
              type="email"
              value={tcFormData.email}
              onChange={handleTcFormChange}
              error={tcErrors.email}
            />
            <FormInput
              label="Website"
              name="website"
              type="url"
              value={tcFormData.website}
              onChange={handleTcFormChange}
              error={tcErrors.website}
            />
            <FormInput
              label="Logo URL"
              name="logo_url"
              type="url"
              value={tcFormData.logo_url}
              onChange={handleTcFormChange}
              error={tcErrors.logo_url}
            />
            <FormInput
              label="Status"
              name="status"
              type="select"
              value={tcFormData.status}
              onChange={handleTcFormChange}
              options={[
                { value: 'pending', label: 'Pending' },
                { value: 'active', label: 'Active' },
                { value: 'suspended', label: 'Suspended' },
                { value: 'inactive', label: 'Inactive' },
              ]}
              error={tcErrors.status}
            />
            <div className="flex items-center">
              <input
                type="checkbox"
                name="referred_by_group"
                checked={tcFormData.referred_by_group}
                onChange={handleTcFormChange}
                className="mr-2"
              />
              <label className="text-sm text-gray-700">Referred by Group</label>
            </div>
          </div>

          {tcErrors.general && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600 font-medium">{tcErrors.general}</p>
            </div>
          )}

          <div className="flex space-x-3 pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              fullWidth
              onClick={() => {
                setEditModalOpen(false);
                setSelectedTC(null);
                setTcErrors({});
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

export default AllTrainingCentersScreen;
