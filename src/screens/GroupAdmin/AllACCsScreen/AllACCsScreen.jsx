import { useEffect, useState } from 'react';
import { adminAPI } from '../../../services/api';
import { useHeader } from '../../../context/HeaderContext';
import { Building2, Eye, Settings, DollarSign, Calendar, Plus, Trash2, FileText, ChevronUp, ChevronDown, Mail, Search, Filter, CheckCircle, Clock, Edit, Tag, X } from 'lucide-react';
import Modal from '../../../components/Modal/Modal';
import FormInput from '../../../components/FormInput/FormInput';
import Button from '../../../components/Button/Button';
import Pagination from '../../../components/Pagination/Pagination';
import './AllACCsScreen.css';

const AllACCsScreen = () => {
  const { setHeaderTitle, setHeaderSubtitle } = useHeader();
  const [accs, setAccs] = useState([]);
  const [allAccs, setAllAccs] = useState([]); // Store all loaded ACCs for client-side filtering
  const [sortedAccs, setSortedAccs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [commissionModalOpen, setCommissionModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [selectedACC, setSelectedACC] = useState(null);
  const [commissionPercentage, setCommissionPercentage] = useState('');
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [accFormData, setAccFormData] = useState({
    name: '',
    legal_name: '',
    registration_number: '',
    country: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    logo_url: '',
    status: 'active',
    registration_fee_paid: false,
    registration_fee_amount: '',
    commission_percentage: '',
  });
  const [accErrors, setAccErrors] = useState({});
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

  // Load all data initially for client-side filtering
  useEffect(() => {
    if (searchTerm === '' && statusFilter === 'all') {
      // Load all data when no server-side filters are active
      loadACCs(true);
    } else {
      // Use server-side filtering when search or statusFilter is active
      loadACCs(false);
    }
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.currentPage, pagination.perPage, searchTerm, statusFilter]);

  const loadCategories = async () => {
    try {
      const data = await adminAPI.listCategories();
      setCategories(data.categories || []);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadACCs = async (loadAll = false) => {
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
      
      const data = await adminAPI.listACCs(params);
      
      let accsArray = [];
      if (data.data) {
        accsArray = data.data || [];
        if (!loadAll) {
          setPagination(prev => ({
            ...prev,
            totalPages: data.last_page || data.total_pages || 1,
            totalItems: data.total || 0,
          }));
        }
      } else if (data.accs) {
        accsArray = data.accs || [];
        if (!loadAll) {
          setPagination(prev => ({
            ...prev,
            totalPages: 1,
            totalItems: data.accs?.length || 0,
          }));
        }
      } else {
        accsArray = Array.isArray(data) ? data : [];
        if (!loadAll) {
          setPagination(prev => ({
            ...prev,
            totalPages: 1,
            totalItems: accsArray.length,
          }));
        }
      }
      
      setAccs(accsArray);
      setAllAccs(accsArray); // Store all loaded ACCs for client-side filtering
      setSortedAccs(accsArray);
    } catch (error) {
      console.error('Failed to load ACCs:', error);
      setAccs([]);
      setAllAccs([]);
      setSortedAccs([]);
    } finally {
      setLoading(false);
    }
  };

  // Sort ACCs
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
    
    if (useClientSideFiltering && allAccs.length > 0) {
      let filtered = [...allAccs];

      // Apply client-side status filter if stat card button is clicked
      if (clientStatusFilter !== 'all') {
        filtered = filtered.filter(acc => acc.status === clientStatusFilter);
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
      
      setSortedAccs(paginatedFiltered);
      
      // Update pagination based on filtered results
      setPagination(prev => ({
        ...prev,
        totalItems: totalFiltered,
        totalPages: totalPages || 1,
        currentPage: currentPage,
      }));
    } else {
      // Use server-side paginated data (accs) when server-side filters are active
      let sorted = [...accs];

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
      
      setSortedAccs(sorted);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortConfig, accs, allAccs, clientStatusFilter, pagination.perPage, pagination.currentPage, searchTerm, statusFilter]);
  
  const handlePageChange = (page) => {
    setPagination(prev => ({ ...prev, currentPage: page }));
  };
  
  const handlePerPageChange = (perPage) => {
    setPagination(prev => ({ ...prev, perPage, currentPage: 1 }));
  };

  const handleViewDetails = async (acc) => {
    try {
      const data = await adminAPI.getACCDetails(acc.id);
      // Ensure categories is always an array
      const accData = {
        ...data.acc,
        categories: data.acc.categories || []
      };
      setSelectedACC(accData);
      setDetailModalOpen(true);
    } catch (error) {
      console.error('Failed to load ACC details:', error);
      // Ensure categories is always an array even on error
      const accData = {
        ...acc,
        categories: acc.categories || []
      };
      setSelectedACC(accData);
      setDetailModalOpen(true);
    }
  };

  const handleSetCommission = (acc) => {
    setSelectedACC(acc);
    setCommissionPercentage(acc.commission_percentage || '');
    setCommissionModalOpen(true);
  };

  const handleSaveCommission = async () => {
    if (!commissionPercentage || isNaN(commissionPercentage)) {
      alert('Please enter a valid commission percentage');
      return;
    }
    
    const percentage = parseFloat(commissionPercentage);
    if (percentage < 0 || percentage > 100) {
      alert('Commission percentage must be between 0 and 100');
      return;
    }
    
    setSaving(true);
    try {
      await adminAPI.setCommissionPercentage(selectedACC.id, {
        commission_percentage: percentage,
      });
      await loadACCs();
      setPagination(prev => ({ ...prev, currentPage: 1 }));
      setCommissionModalOpen(false);
      setSelectedACC(null);
      setCommissionPercentage('');
      alert('Commission percentage set successfully!');
    } catch (error) {
      alert('Failed to set commission: ' + (error.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const handleEditACC = async (acc) => {
    try {
      const data = await adminAPI.getACCDetails(acc.id);
      const accData = data.acc;
      setSelectedACC(accData);
      setAccFormData({
        name: accData.name || '',
        legal_name: accData.legal_name || '',
        registration_number: accData.registration_number || '',
        country: accData.country || '',
        address: accData.address || '',
        phone: accData.phone || '',
        email: accData.email || '',
        website: accData.website || '',
        logo_url: accData.logo_url || '',
        status: accData.status || 'active',
        registration_fee_paid: accData.registration_fee_paid || false,
        registration_fee_amount: accData.registration_fee_amount || '',
        commission_percentage: accData.commission_percentage || '',
      });
      setAccErrors({});
      setEditModalOpen(true);
    } catch (error) {
      console.error('Failed to load ACC details:', error);
      alert('Failed to load ACC details');
    }
  };

  const handleAccFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setAccFormData({
      ...accFormData,
      [name]: type === 'checkbox' ? checked : value,
    });
    setAccErrors({});
  };

  const handleSaveACC = async (e) => {
    e.preventDefault();
    setSaving(true);
    setAccErrors({});

    try {
      await adminAPI.updateACC(selectedACC.id, accFormData);
      await loadACCs();
      setEditModalOpen(false);
      setSelectedACC(null);
      alert('ACC updated successfully!');
    } catch (error) {
      if (error.response?.data?.errors) {
        setAccErrors(error.response.data.errors);
      } else {
        setAccErrors({ general: error.response?.data?.message || error.message || 'Failed to update ACC' });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleOpenCategoryModal = async (acc) => {
    try {
      // Use the dedicated endpoint to get ACC categories with full details
      const data = await adminAPI.getACCCategories(acc.id);
      // Ensure categories is always an array
      const accData = {
        ...data.acc,
        categories: data.categories || []
      };
      setSelectedACC(accData);
      setCategoryModalOpen(true);
    } catch (error) {
      console.error('Failed to load ACC categories:', error);
      // Fallback to getACCDetails if the new endpoint fails
      try {
        const fallbackData = await adminAPI.getACCDetails(acc.id);
        const accData = {
          ...fallbackData.acc,
          categories: fallbackData.acc.categories || []
        };
        setSelectedACC(accData);
        setCategoryModalOpen(true);
      } catch (fallbackError) {
        console.error('Failed to load ACC details:', fallbackError);
        // Ensure categories is always an array even on error
        const accData = {
          ...acc,
          categories: acc.categories || []
        };
        setSelectedACC(accData);
        setCategoryModalOpen(true);
      }
    }
  };

  const handleAssignCategory = async () => {
    if (!selectedCategoryId) {
      alert('Please select a category');
      return;
    }

    setSaving(true);
    try {
      await adminAPI.assignCategoryToACC(selectedACC.id, {
        category_id: parseInt(selectedCategoryId),
      });
      // Reload ACC categories using the dedicated endpoint
      const data = await adminAPI.getACCCategories(selectedACC.id);
      const accData = {
        ...data.acc,
        categories: data.categories || []
      };
      setSelectedACC(accData);
      setSelectedCategoryId('');
      // Also reload categories list to ensure it's up to date
      await loadCategories();
      alert('Category assigned successfully!');
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
      alert('Failed to assign category: ' + errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveCategory = async (categoryId) => {
    if (!confirm('Are you sure you want to remove this category?')) {
      return;
    }

    setSaving(true);
    try {
      await adminAPI.removeCategoryFromACC(selectedACC.id, {
        category_id: categoryId,
      });
      // Reload ACC categories using the dedicated endpoint
      const data = await adminAPI.getACCCategories(selectedACC.id);
      const accData = {
        ...data.acc,
        categories: data.categories || []
      };
      setSelectedACC(accData);
      // Also reload categories list to ensure it's up to date
      await loadCategories();
      alert('Category removed successfully!');
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
      alert('Failed to remove category: ' + errorMessage);
    } finally {
      setSaving(false);
    }
  };

  // Calculate stats from all loaded data
  const totalCount = allAccs.length;
  const activeCount = allAccs.filter(acc => acc.status === 'active').length;
  const pendingCount = allAccs.filter(acc => acc.status === 'pending').length;

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;
  }

  return (
    <div className="space-y-4">

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total ACCs */}
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
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results count
      <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-100">
        <p className="text-sm text-gray-600">
          Showing <span className="font-semibold text-primary-600">{sortedAccs.length}</span> of <span className="font-semibold text-primary-600">{accs.length}</span> ACCs
        </p>
      </div> */}

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
                    ACC Name
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
                  onClick={() => handleSort('commission_percentage')}
                >
                  <div className="flex items-center gap-2">
                    Commission %
                    {sortConfig.key === 'commission_percentage' && (
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
              {sortedAccs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <Building2 className="text-gray-400" size={32} />
                      </div>
                      <p className="text-gray-500 font-medium">No ACCs found</p>
                      <p className="text-sm text-gray-400 mt-1">No ACCs available</p>
                    </div>
                  </td>
                </tr>
              ) : (
                sortedAccs.map((acc, index) => (
                  <tr
                    key={acc.id}
                    className="hover:bg-gradient-to-r hover:from-primary-50/30 hover:to-white transition-all duration-200 cursor-pointer group table-row-animated"
                    onClick={() => handleViewDetails(acc)}
                    style={{ '--animation-delay': `${index * 0.03}s` }}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg flex items-center justify-center mr-3 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                          <Building2 className="h-5 w-5 text-primary-600" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900 group-hover:text-primary-700 transition-colors">{acc.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-600">
                        <Mail className="h-4 w-4 mr-2 text-gray-400" />
                        {acc.email}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-3 py-1.5 inline-flex text-xs leading-5 font-bold rounded-full shadow-sm ${
                        acc.status === 'active' ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300' :
                        acc.status === 'pending' ? 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 border border-yellow-300' :
                        'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300'
                      }`}>
                        {acc.status.charAt(0).toUpperCase() + acc.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {acc.commission_percentage ? `${acc.commission_percentage}%` : <span className="text-gray-400">Not Set</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {acc.created_at ? new Date(acc.created_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewDetails(acc)}
                          className="p-2 rounded-lg bg-primary-50 text-primary-600 hover:bg-primary-100 hover:scale-110 transition-all duration-200 shadow-sm hover:shadow-md"
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditACC(acc);
                          }}
                          className="p-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 hover:scale-110 transition-all duration-200 shadow-sm hover:shadow-md"
                          title="Edit ACC"
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

      {/* ACC Detail Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedACC(null);
        }}
        title="ACC Details"
        size="lg"
      >
        {selectedACC && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Name</p>
                <p className="text-base font-semibold text-gray-900">{selectedACC.name}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Email</p>
                <p className="text-base font-semibold text-gray-900">{selectedACC.email}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Status</p>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                  selectedACC.status === 'active' ? 'bg-green-100 text-green-800' :
                  selectedACC.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {selectedACC.status}
                </span>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Commission Percentage</p>
                <p className="text-base font-semibold text-gray-900">
                  {selectedACC.commission_percentage ? `${selectedACC.commission_percentage}%` : 'Not Set'}
                </p>
              </div>
              {selectedACC.created_at && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Created At</p>
                  <p className="text-base font-semibold text-gray-900">
                    {new Date(selectedACC.created_at).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
            {selectedACC.subscriptions && selectedACC.subscriptions.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Subscriptions</h3>
                <div className="space-y-2">
                  {selectedACC.subscriptions.map((sub, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg">
                      <p className="font-medium text-gray-900">
                        {sub.subscription_start_date} - {sub.subscription_end_date}
                      </p>
                      <p className="text-sm text-gray-500">Status: {sub.payment_status}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {selectedACC.categories && Array.isArray(selectedACC.categories) && selectedACC.categories.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Assigned Categories</h3>
                <div className="space-y-2">
                  {selectedACC.categories.map((category) => {
                    const categoryId = typeof category === 'object' ? category.id : category;
                    const categoryName = typeof category === 'object' ? category.name : `Category ${categoryId}`;
                    return (
                      <div key={categoryId} className="p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                        <span className="font-medium text-gray-900">{categoryName}</span>
                      </div>
                    );
                  })}
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
                  handleEditACC(selectedACC);
                }}
              >
                Edit ACC
              </Button>
              <Button
                variant="primary"
                fullWidth
                icon={<Tag size={20} />}
                onClick={() => {
                  setDetailModalOpen(false);
                  handleOpenCategoryModal(selectedACC);
                }}
              >
                Manage Categories
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Set Commission Modal */}
      <Modal
        isOpen={commissionModalOpen}
        onClose={() => {
          setCommissionModalOpen(false);
          setSelectedACC(null);
          setCommissionPercentage('');
        }}
        title={`Set Commission for ${selectedACC?.name}`}
        size="lg"
      >
        <div className="space-y-6">
          <FormInput
            label="Commission Percentage (0-100)"
            name="commission_percentage"
            type="number"
            value={commissionPercentage}
            onChange={(e) => setCommissionPercentage(e.target.value)}
            required
            min="0"
            max="100"
            step="0.1"
            placeholder="e.g., 15.5"
          />

          <div className="flex space-x-3 pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              fullWidth
              onClick={() => {
                setCommissionModalOpen(false);
                setSelectedACC(null);
                setCommissionPercentage('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              fullWidth
              onClick={handleSaveCommission}
              disabled={saving}
              loading={saving}
            >
              Save Commission
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit ACC Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedACC(null);
          setAccFormData({
            name: '',
            legal_name: '',
            registration_number: '',
            country: '',
            address: '',
            phone: '',
            email: '',
            website: '',
            logo_url: '',
            status: 'active',
            registration_fee_paid: false,
            registration_fee_amount: '',
            commission_percentage: '',
          });
          setAccErrors({});
        }}
        title={`Edit ACC: ${selectedACC?.name}`}
        size="lg"
      >
        <form onSubmit={handleSaveACC} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="Name"
              name="name"
              value={accFormData.name}
              onChange={handleAccFormChange}
              error={accErrors.name}
            />
            <FormInput
              label="Legal Name"
              name="legal_name"
              value={accFormData.legal_name}
              onChange={handleAccFormChange}
              error={accErrors.legal_name}
            />
            <FormInput
              label="Registration Number"
              name="registration_number"
              value={accFormData.registration_number}
              onChange={handleAccFormChange}
              error={accErrors.registration_number}
            />
            <FormInput
              label="Country"
              name="country"
              value={accFormData.country}
              onChange={handleAccFormChange}
              error={accErrors.country}
            />
            <FormInput
              label="Address"
              name="address"
              value={accFormData.address}
              onChange={handleAccFormChange}
              textarea
              rows={2}
              error={accErrors.address}
            />
            <FormInput
              label="Phone"
              name="phone"
              value={accFormData.phone}
              onChange={handleAccFormChange}
              error={accErrors.phone}
            />
            <FormInput
              label="Email"
              name="email"
              type="email"
              value={accFormData.email}
              onChange={handleAccFormChange}
              error={accErrors.email}
            />
            <FormInput
              label="Website"
              name="website"
              type="url"
              value={accFormData.website}
              onChange={handleAccFormChange}
              error={accErrors.website}
            />
            <FormInput
              label="Logo URL"
              name="logo_url"
              type="url"
              value={accFormData.logo_url}
              onChange={handleAccFormChange}
              error={accErrors.logo_url}
            />
            <FormInput
              label="Status"
              name="status"
              type="select"
              value={accFormData.status}
              onChange={handleAccFormChange}
              options={[
                { value: 'pending', label: 'Pending' },
                { value: 'active', label: 'Active' },
                { value: 'suspended', label: 'Suspended' },
                { value: 'expired', label: 'Expired' },
                { value: 'rejected', label: 'Rejected' },
              ]}
              error={accErrors.status}
            />
            <FormInput
              label="Registration Fee Amount"
              name="registration_fee_amount"
              type="number"
              value={accFormData.registration_fee_amount}
              onChange={handleAccFormChange}
              min="0"
              step="0.01"
              error={accErrors.registration_fee_amount}
            />
            <FormInput
              label="Commission Percentage"
              name="commission_percentage"
              type="number"
              value={accFormData.commission_percentage}
              onChange={handleAccFormChange}
              min="0"
              max="100"
              step="0.1"
              error={accErrors.commission_percentage}
            />
            <div className="flex items-center">
              <input
                type="checkbox"
                name="registration_fee_paid"
                checked={accFormData.registration_fee_paid}
                onChange={handleAccFormChange}
                className="mr-2"
              />
              <label className="text-sm text-gray-700">Registration Fee Paid</label>
            </div>
          </div>

          {accErrors.general && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600 font-medium">{accErrors.general}</p>
            </div>
          )}

          <div className="flex space-x-3 pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              fullWidth
              onClick={() => {
                setEditModalOpen(false);
                setSelectedACC(null);
                setAccErrors({});
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

      {/* Category Assignment Modal */}
      <Modal
        isOpen={categoryModalOpen}
        onClose={() => {
          setCategoryModalOpen(false);
          setSelectedACC(null);
          setSelectedCategoryId('');
        }}
        title={`Manage Categories for ${selectedACC?.name}`}
        size="lg"
      >
        <div className="space-y-6">
          {/* Assign Category Section */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Assign Category</h3>
            <div className="flex gap-3">
              <select
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none bg-white cursor-pointer category-select"
              >
                <option value="">Select a category...</option>
                {categories
                  .filter(cat => {
                    // Filter out categories that are already assigned
                    if (!selectedACC?.categories || selectedACC.categories.length === 0) {
                      return true;
                    }
                    // Check if category is already assigned (handle both object and ID comparison)
                    return !selectedACC.categories.some(accCat => {
                      const accCatId = typeof accCat === 'object' ? accCat.id : accCat;
                      const catId = typeof cat === 'object' ? cat.id : cat;
                      return accCatId === catId;
                    });
                  })
                  .map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
              </select>
              <Button
                onClick={handleAssignCategory}
                disabled={!selectedCategoryId || saving}
                loading={saving}
                icon={<Plus size={20} />}
              >
                Assign
              </Button>
            </div>
          </div>

          {/* Assigned Categories List */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Assigned Categories {selectedACC?.categories && Array.isArray(selectedACC.categories) && selectedACC.categories.length > 0 && (
                <span className="text-sm font-normal text-gray-500">({selectedACC.categories.length})</span>
              )}
            </h3>
            {selectedACC?.categories && Array.isArray(selectedACC.categories) && selectedACC.categories.length > 0 ? (
              <div className="space-y-3">
                {selectedACC.categories.map((category) => {
                  const categoryId = category.id;
                  const subCategories = category.sub_categories || [];
                  const pivot = category.pivot;
                  const createdBy = category.created_by;
                  
                  return (
                    <div
                      key={categoryId}
                      className="p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900">{category.name}</span>
                            {category.name_ar && (
                              <span className="text-sm text-gray-500">({category.name_ar})</span>
                            )}
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              category.status === 'active' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {category.status}
                            </span>
                          </div>
                          {category.description && (
                            <p className="text-sm text-gray-600 mt-1">{category.description}</p>
                          )}
                          {subCategories.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs text-gray-500 mb-1">Sub Categories ({subCategories.length}):</p>
                              <div className="flex flex-wrap gap-1">
                                {subCategories.map((subCat) => (
                                  <span key={subCat.id} className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded">
                                    {subCat.name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {pivot && (
                            <p className="text-xs text-gray-400 mt-2">
                              Assigned on: {new Date(pivot.created_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => handleRemoveCategory(categoryId)}
                          disabled={saving}
                          className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ml-4"
                          title="Remove Category"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 text-center bg-gray-50 rounded-lg">
                <Tag className="mx-auto text-gray-400 mb-2" size={32} />
                <p className="text-gray-500">No categories assigned</p>
                <p className="text-sm text-gray-400 mt-1">Assign categories to this ACC to get started</p>
              </div>
            )}
          </div>

          <div className="flex space-x-3 pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              fullWidth
              onClick={() => {
                setCategoryModalOpen(false);
                setSelectedACC(null);
                setSelectedCategoryId('');
              }}
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AllACCsScreen;
