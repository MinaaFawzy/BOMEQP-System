import { useEffect, useState, useMemo } from 'react';
import { trainingCenterAPI } from '../../../services/api';
import { useHeader } from '../../../context/HeaderContext';
import { Users, DollarSign, Building2, CreditCard, CheckCircle, Clock, AlertCircle, Eye, Search, Filter, RefreshCw, BookOpen, ChevronUp, ChevronDown } from 'lucide-react';
import Modal from '../../../components/Modal/Modal';
import FormInput from '../../../components/FormInput/FormInput';
import StripePaymentModal from '../../../components/StripePaymentModal/StripePaymentModal';
import Pagination from '../../../components/Pagination/Pagination';
import './InstructorAuthorizationsScreen.css';

const InstructorAuthorizationsScreen = () => {
  const { setHeaderActions, setHeaderTitle, setHeaderSubtitle } = useHeader();
  const [authorizations, setAuthorizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedAuthorization, setSelectedAuthorization] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    payment_method: 'credit_card', // Changed from 'wallet' to 'credit_card' - wallet option removed
    payment_intent_id: '',
  });
  const [errors, setErrors] = useState({});
  const [processing, setProcessing] = useState(false);
  const [paymentIntentData, setPaymentIntentData] = useState(null);
  const [creatingPaymentIntent, setCreatingPaymentIntent] = useState(false);
  const [showStripeModal, setShowStripeModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  const [pagination, setPagination] = useState({
    currentPage: 1,
    perPage: 10,
    totalPages: 1,
    totalItems: 0,
  });
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // Reset to page 1 when search or filters change
  useEffect(() => {
    if (pagination.currentPage !== 1) {
      setPagination(prev => ({ ...prev, currentPage: 1 }));
    }
  }, [searchTerm, statusFilter, paymentStatusFilter]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.currentPage, pagination.perPage, searchTerm, statusFilter, paymentStatusFilter]);

  useEffect(() => {
    setHeaderTitle('Instructor Authorizations');
    setHeaderSubtitle('View and pay for instructor authorization requests');
    setHeaderActions(
      <button
        onClick={loadData}
        disabled={loading}
        className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 flex items-center gap-2 transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
        title="Refresh data"
      >
        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        Refresh
      </button>
    );
    return () => {
      setHeaderActions(null);
      setHeaderTitle(null);
      setHeaderSubtitle(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setHeaderActions, setHeaderTitle, setHeaderSubtitle, loading]);

  // Debug: Log authorizations when they change
  useEffect(() => {
    if (authorizations.length > 0) {
      console.log('Authorizations loaded:', authorizations);
    } else if (!loading) {
      console.log('No authorizations found. Make sure you have requested authorization for instructors.');
    }
  }, [authorizations, loading]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Prepare pagination and filter parameters
      const params = {
        page: pagination.currentPage,
        per_page: pagination.perPage,
      };
      
      // Add search and filter parameters if backend supports them
      if (searchTerm) {
        params.search = searchTerm;
      }
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      if (paymentStatusFilter !== 'all') {
        params.payment_status = paymentStatusFilter;
      }
      
      // Try the main endpoint first
      try {
        const data = await trainingCenterAPI.getInstructorAuthorizations(params);
        console.log('Instructor Authorizations API Response:', data);
        
        // Handle different response structures
        let authorizationsList = [];
        let totalItems = 0;
        let totalPages = 1;
        
        if (data?.authorizations) {
          authorizationsList = data.authorizations;
          totalItems = data.total || data.total_items || authorizationsList.length;
          totalPages = data.total_pages || data.last_page || Math.ceil(totalItems / pagination.perPage) || 1;
        } else if (data?.data?.authorizations) {
          authorizationsList = data.data.authorizations;
          totalItems = data.data.total || data.data.total_items || authorizationsList.length;
          totalPages = data.data.total_pages || data.data.last_page || Math.ceil(totalItems / pagination.perPage) || 1;
        } else if (Array.isArray(data?.data)) {
          authorizationsList = data.data;
          totalItems = data.total || data.total_items || authorizationsList.length;
          totalPages = data.total_pages || data.last_page || Math.ceil(totalItems / pagination.perPage) || 1;
        } else if (Array.isArray(data)) {
          authorizationsList = data;
          totalItems = authorizationsList.length;
          totalPages = Math.ceil(totalItems / pagination.perPage) || 1;
        }
        
        console.log('Processed authorizations:', authorizationsList);
        setAuthorizations(authorizationsList);
        
        // Update pagination
        setPagination(prev => ({
          ...prev,
          totalItems,
          totalPages,
          currentPage: prev.currentPage > totalPages ? 1 : prev.currentPage,
        }));
        
        return;
      } catch (mainError) {
        // If 404, try alternative endpoint (getAuthorizationStatus might have instructor authorizations)
        if (mainError.response?.status === 404) {
          console.warn('Main endpoint not found, trying alternative endpoint...');
          try {
            const altData = await trainingCenterAPI.getAuthorizationStatus(params);
            console.log('Alternative API Response:', altData);
            
            // Check if authorizations contain instructor authorizations
            const allAuths = altData?.authorizations || altData?.data || [];
            const instructorAuths = allAuths.filter(auth => 
              auth.instructor_id || auth.instructor || auth.type === 'instructor'
            );
            
            if (instructorAuths.length > 0) {
              setAuthorizations(instructorAuths);
              
              // Update pagination for alternative endpoint
              const totalItems = instructorAuths.length;
              const totalPages = Math.ceil(totalItems / pagination.perPage) || 1;
              setPagination(prev => ({
                ...prev,
                totalItems,
                totalPages,
                currentPage: prev.currentPage > totalPages ? 1 : prev.currentPage,
              }));
              
              return;
            }
          } catch (altError) {
            console.warn('Alternative endpoint also failed:', altError);
          }
        }
        throw mainError;
      }
    } catch (error) {
      console.error('Failed to load authorizations:', error);
      console.error('Error details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      setAuthorizations([]);
      setPagination(prev => ({
        ...prev,
        totalItems: 0,
        totalPages: 1,
      }));
    } finally {
      setLoading(false);
    }
  };

  const handlePay = (authorization) => {
    // Check if authorization is ready for payment
    if (authorization.status !== 'approved' || authorization.group_admin_status !== 'commission_set') {
      alert('This authorization is not ready for payment. Please wait for Group Admin approval.');
      return;
    }
    if (authorization.payment_status === 'paid') {
      alert('This authorization has already been paid.');
      return;
    }
    
    setSelectedAuthorization(authorization);
    setPaymentForm({
      payment_method: 'credit_card', // Changed from 'wallet' to 'credit_card' - wallet option removed
      payment_intent_id: '',
    });
    setErrors({});
    setPaymentIntentData(null);
    setPaymentModalOpen(true);
  };

  // WALLET OPTION REMOVED - This function is now replaced by handlePayClick which auto-creates payment intent
  // Keeping this commented for future reference if wallet option is needed again
  /*
  const handleCreatePaymentIntent = async () => {
    if (!selectedAuthorization) {
      setErrors({ general: 'No authorization selected' });
      return;
    }

    // Validate authorization price
    const authorizationPrice = parseFloat(selectedAuthorization.authorization_price || 0);
    if (isNaN(authorizationPrice) || authorizationPrice <= 0) {
      setErrors({ general: 'Invalid authorization price. Please contact support.' });
      return;
    }

    setCreatingPaymentIntent(true);
    setErrors({});
    setPaymentIntentData(null);

    try {
      // Step 1: Create Payment Intent
      const response = await trainingCenterAPI.createInstructorAuthorizationPaymentIntent(selectedAuthorization.id, {
        authorization_price: authorizationPrice,
      });
      
      if (response.success && response.client_secret && response.payment_intent_id) {
        setPaymentIntentData(response);
        setPaymentForm(prev => ({
          ...prev,
          payment_intent_id: response.payment_intent_id,
        }));
        // Step 2: Open Stripe payment modal (will handle confirmCardPayment)
        setShowStripeModal(true);
      } else {
        setErrors({ general: 'Failed to create payment intent. Invalid response from server.' });
      }
    } catch (error) {
      console.error('Failed to create payment intent:', error);
      
      // Handle different error types according to guide
      if (error.response?.status === 422) {
        // Validation errors
        const errorData = error.response.data;
        if (errorData.errors) {
          const validationErrors = {};
          Object.keys(errorData.errors).forEach(field => {
            validationErrors[field] = Array.isArray(errorData.errors[field]) 
              ? errorData.errors[field][0] 
              : errorData.errors[field];
          });
          setErrors(validationErrors);
        } else if (errorData.message) {
          setErrors({ general: errorData.message });
        } else {
          setErrors({ general: 'Validation failed. Please check your input.' });
        }
      } else if (error.response?.status === 400) {
        // Bad request (e.g., Stripe not configured)
        const errorData = error.response.data;
        setErrors({ general: errorData?.message || 'Payment service unavailable. Please contact support.' });
      } else if (error.response?.status === 500) {
        // Server error
        const errorData = error.response.data;
        setErrors({ general: errorData?.message || 'Failed to create payment intent. Please try again later.' });
      } else if (error.response?.data) {
        const errorData = error.response.data;
        if (errorData.errors) {
          const validationErrors = {};
          Object.keys(errorData.errors).forEach(field => {
            validationErrors[field] = Array.isArray(errorData.errors[field]) 
              ? errorData.errors[field][0] 
              : errorData.errors[field];
          });
          setErrors(validationErrors);
        } else if (errorData.message) {
          setErrors({ general: errorData.message });
        } else {
          setErrors({ general: 'Failed to create payment intent. Please try again.' });
        }
      } else if (error.message) {
        setErrors({ general: error.message });
      } else {
        setErrors({ general: 'Failed to create payment intent. Please try again.' });
      }
    } finally {
      setCreatingPaymentIntent(false);
    }
  };
  */

  const handleStripePaymentSuccess = async (paymentIntent, paymentIntentId) => {
    if (!selectedAuthorization) {
      setErrors({ general: 'No authorization selected' });
      return;
    }

    try {
      // Step 3: Complete Payment on backend
      const submitData = {
        payment_method: 'credit_card',
        payment_intent_id: paymentIntentId || paymentIntent.id,
      };

      // Verify payment intent status before completing
      if (paymentIntent && paymentIntent.status !== 'succeeded') {
        setErrors({ general: `Payment not completed. Status: ${paymentIntent.status}` });
        return;
      }

      await trainingCenterAPI.payInstructorAuthorization(selectedAuthorization.id, submitData);
      await loadData();
      setPaymentModalOpen(false);
      setShowStripeModal(false);
      setSelectedAuthorization(null);
      setPaymentIntentData(null);
      alert('Payment successful. Instructor is now officially authorized.');
    } catch (error) {
      console.error('Failed to complete authorization payment:', error);
      
      // Handle different error types
      if (error.response?.status === 400) {
        const errorData = error.response.data;
        setErrors({ general: errorData?.message || 'Payment verification failed. Please contact support.' });
      } else if (error.response?.status === 422) {
        const errorData = error.response.data;
        if (errorData.errors) {
          const validationErrors = {};
          Object.keys(errorData.errors).forEach(field => {
            validationErrors[field] = Array.isArray(errorData.errors[field]) 
              ? errorData.errors[field][0] 
              : errorData.errors[field];
          });
          setErrors(validationErrors);
        } else {
          setErrors({ general: errorData?.message || 'Validation failed. Please check your input.' });
        }
      } else if (error.response?.data) {
        const errorData = error.response.data;
        if (errorData.message) {
          setErrors({ general: errorData.message });
        } else {
          setErrors({ general: 'Payment succeeded but failed to complete authorization. Please contact support.' });
        }
      } else {
        setErrors({ general: 'Payment succeeded but failed to complete authorization. Please contact support.' });
      }
      throw error;
    }
  };

  // Auto-create payment intent when user clicks Pay button
  const handlePayClick = async () => {
    if (!selectedAuthorization) {
      setErrors({ general: 'No authorization selected' });
      return;
    }

    // Validate authorization price
    const authorizationPrice = parseFloat(selectedAuthorization.authorization_price || 0);
    if (isNaN(authorizationPrice) || authorizationPrice <= 0) {
      setErrors({ general: 'Invalid authorization price. Please contact support.' });
      return;
    }

    setCreatingPaymentIntent(true);
    setErrors({});
    setPaymentIntentData(null);

    try {
      // Create Payment Intent automatically
      const response = await trainingCenterAPI.createInstructorAuthorizationPaymentIntent(selectedAuthorization.id, {
        authorization_price: authorizationPrice,
      });
      
      if (response.success && response.client_secret && response.payment_intent_id) {
        setPaymentIntentData(response);
        setPaymentForm(prev => ({
          ...prev,
          payment_intent_id: response.payment_intent_id,
        }));
        // Open Stripe payment modal directly
        setShowStripeModal(true);
      } else {
        setErrors({ general: 'Failed to create payment intent. Invalid response from server.' });
      }
    } catch (error) {
      console.error('Failed to create payment intent:', error);
      
      if (error.response?.status === 422) {
        const errorData = error.response.data;
        if (errorData.errors) {
          const validationErrors = {};
          Object.keys(errorData.errors).forEach(field => {
            validationErrors[field] = Array.isArray(errorData.errors[field]) 
              ? errorData.errors[field][0] 
              : errorData.errors[field];
          });
          setErrors(validationErrors);
        } else if (errorData.message) {
          setErrors({ general: errorData.message });
        } else {
          setErrors({ general: 'Validation failed. Please check your input.' });
        }
      } else if (error.response?.status === 400) {
        const errorData = error.response.data;
        setErrors({ general: errorData?.message || 'Payment service unavailable. Please contact support.' });
      } else if (error.response?.status === 500) {
        const errorData = error.response.data;
        setErrors({ general: errorData?.message || 'Failed to create payment intent. Please try again later.' });
      } else if (error.response?.data) {
        const errorData = error.response.data;
        if (errorData.errors) {
          const validationErrors = {};
          Object.keys(errorData.errors).forEach(field => {
            validationErrors[field] = Array.isArray(errorData.errors[field]) 
              ? errorData.errors[field][0] 
              : errorData.errors[field];
          });
          setErrors(validationErrors);
        } else if (errorData.message) {
          setErrors({ general: errorData.message });
        } else {
          setErrors({ general: 'Failed to create payment intent. Please try again.' });
        }
      } else if (error.message) {
        setErrors({ general: error.message });
      } else {
        setErrors({ general: 'Failed to create payment intent. Please try again.' });
      }
    } finally {
      setCreatingPaymentIntent(false);
    }
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAuthorization) return;

    // Auto-create payment intent and open Stripe modal
    await handlePayClick();
  };

  const handleViewDetails = (authorization) => {
    setSelectedAuthorization(authorization);
    setDetailModalOpen(true);
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

  const filteredAuthorizations = useMemo(() => {
    let filtered = [...authorizations];
    
    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(auth => {
        // Get course names for search
        const courseNames = auth.courses && Array.isArray(auth.courses)
          ? auth.courses.map(c => typeof c === 'object' ? (c?.name || c?.course_name || '') : (c || '')).join(' ')
          : auth.course
          ? (typeof auth.course === 'object' ? (auth.course?.name || auth.course?.course_name || '') : (auth.course || ''))
          : '';
        const matchesSearch = (
          (auth.instructor?.first_name || '').toLowerCase().includes(term) ||
          (auth.instructor?.last_name || '').toLowerCase().includes(term) ||
          (auth.acc?.name || '').toLowerCase().includes(term) ||
          (auth.training_center?.name || '').toLowerCase().includes(term) ||
          courseNames.toLowerCase().includes(term)
        );
        return matchesSearch;
      });
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(auth => auth.status === statusFilter);
    }

    // Payment status filter
    if (paymentStatusFilter !== 'all') {
      filtered = filtered.filter(auth => auth.payment_status === paymentStatusFilter);
    }

    // Apply sorting
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aValue, bValue;
        
        if (sortConfig.key === 'instructor') {
          aValue = `${a.instructor?.first_name || ''} ${a.instructor?.last_name || ''}`.trim().toLowerCase();
          bValue = `${b.instructor?.first_name || ''} ${b.instructor?.last_name || ''}`.trim().toLowerCase();
        } else if (sortConfig.key === 'acc') {
          aValue = (a.acc?.name || '').toLowerCase();
          bValue = (b.acc?.name || '').toLowerCase();
        } else if (sortConfig.key === 'authorization_price') {
          aValue = parseFloat(a.authorization_price || 0);
          bValue = parseFloat(b.authorization_price || 0);
        } else if (sortConfig.key === 'status') {
          aValue = (a.status || '').toLowerCase();
          bValue = (b.status || '').toLowerCase();
        } else if (sortConfig.key === 'payment_status') {
          aValue = (a.payment_status || '').toLowerCase();
          bValue = (b.payment_status || '').toLowerCase();
        } else {
          aValue = a[sortConfig.key] || '';
          bValue = b[sortConfig.key] || '';
        }
        
        if (sortConfig.key === 'authorization_price') {
          // Already numbers
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
    
    return filtered;
  }, [authorizations, searchTerm, statusFilter, paymentStatusFilter, sortConfig]);

  return (
    <div>
      {/* Search and Filter Section */}
      <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-100 mb-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by instructor name, ACC, course, or training center..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-10 pr-8 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none bg-white cursor-pointer transition-all"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="returned">Returned</option>
            </select>
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <select
              value={paymentStatusFilter}
              onChange={(e) => setPaymentStatusFilter(e.target.value)}
              className="pl-10 pr-8 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none bg-white cursor-pointer transition-all"
            >
              <option value="all">All Payment Status</option>
              <option value="pending">Pending Payment</option>
              <option value="paid">Paid</option>
              <option value="failed">Failed</option>
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
                  onClick={() => handleSort('instructor')}
                >
                  <div className="flex items-center gap-2">
                    Instructor
                    {sortConfig.key === 'instructor' && (
                      sortConfig.direction === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                    )}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-primary-700 transition-colors select-none"
                  onClick={() => handleSort('acc')}
                >
                  <div className="flex items-center gap-2">
                    ACC
                    {sortConfig.key === 'acc' && (
                      sortConfig.direction === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                    )}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Courses</th>
                <th 
                  className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-primary-700 transition-colors select-none"
                  onClick={() => handleSort('authorization_price')}
                >
                  <div className="flex items-center gap-2">
                    Authorization Price
                    {sortConfig.key === 'authorization_price' && (
                      sortConfig.direction === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                    )}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-primary-700 transition-colors select-none"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center justify-center gap-2">
                    Status
                    {sortConfig.key === 'status' && (
                      sortConfig.direction === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                    )}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-primary-700 transition-colors select-none"
                  onClick={() => handleSort('payment_status')}
                >
                  <div className="flex items-center justify-center gap-2">
                    Payment Status
                    {sortConfig.key === 'payment_status' && (
                      sortConfig.direction === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                    )}
                  </div>
                </th>
                <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-primary-600"></div>
                    </div>
                  </td>
                </tr>
              ) : filteredAuthorizations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <Users className="text-gray-400" size={32} />
                      </div>
                      <p className="text-gray-500 font-medium">
                        {searchTerm || statusFilter !== 'all' || paymentStatusFilter !== 'all' ? 'No authorizations found matching your filters' : 'No authorization requests found'}
                      </p>
                      <p className="text-sm text-gray-400 mt-1">
                        {searchTerm || statusFilter !== 'all' || paymentStatusFilter !== 'all' ? 'Try adjusting your filters' : 'To see authorizations here, you need to request authorization for an instructor first'}
                      </p>
                      {authorizations.length === 0 && !loading && (
                        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200 max-w-lg mx-auto text-left">
                          <p className="text-sm text-blue-800 font-medium mb-2">💡 How to get started:</p>
                          <ol className="text-xs text-blue-700 space-y-1.5 list-decimal list-inside">
                            <li>Go to <strong>Instructors</strong> page and create/add an instructor</li>
                            <li>Click <strong>Request Authorization</strong> button for that instructor</li>
                            <li>Select an ACC and courses for authorization</li>
                            <li>Wait for ACC Admin to approve and set authorization price</li>
                            <li>Wait for Group Admin approval</li>
                            <li>Then come back here to complete payment!</li>
                          </ol>
                          <div className="mt-3 pt-3 border-t border-blue-200">
                            <p className="text-xs text-blue-600">
                              <strong>Note:</strong> Authorizations will only appear here after you've submitted a request and it's been approved by ACC Admin.
                            </p>
                          </div>
                        </div>
                      )}
                      {authorizations.length > 0 && filteredAuthorizations.length === 0 && (
                        <p className="text-sm text-yellow-600 mt-2">
                          You have {authorizations.length} authorization{authorizations.length > 1 ? 's' : ''} but none match your current filters.
                        </p>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAuthorizations.map((auth, index) => {
                  const canPay = auth.status === 'approved' && auth.group_admin_status === 'commission_set' && auth.payment_status === 'pending';
                  
                  return (
                    <tr
                      key={auth.id}
                      className="hover:bg-gradient-to-r hover:from-primary-50/30 hover:to-white transition-all duration-200 cursor-pointer table-row-animated"
                      onClick={() => handleViewDetails(auth)}
                      style={{ '--animation-delay': `${index * 0.03}s` }}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg flex items-center justify-center mr-3">
                            <Users className="h-5 w-5 text-primary-600" />
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-900">
                              {auth.instructor?.first_name} {auth.instructor?.last_name}
                            </div>
                            {auth.instructor?.email && (
                              <div className="text-xs text-gray-500">{auth.instructor.email}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-600">
                          <Building2 className="h-4 w-4 mr-2 text-gray-400" />
                          {auth.acc?.name || 'N/A'}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          {auth.courses && Array.isArray(auth.courses) && auth.courses.length > 0 ? (
                            auth.courses.map((course, idx) => (
                              <div key={idx} className="flex items-center text-sm text-gray-900">
                                <BookOpen className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
                                <span className="truncate">
                                  {typeof course === 'object' ? course?.name || course?.course_name || 'N/A' : course || 'N/A'}
                                </span>
                              </div>
                            ))
                          ) : auth.course ? (
                            <div className="flex items-center text-sm text-gray-900">
                              <BookOpen className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
                              <span className="truncate">
                                {typeof auth.course === 'object' ? auth.course?.name || auth.course?.course_name || 'N/A' : auth.course || 'N/A'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500">N/A</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center text-sm font-semibold text-gray-900">
                          <DollarSign className="h-4 w-4 mr-1 text-green-600" />
                          {parseFloat(auth.authorization_price || 0).toFixed(2)}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <span className={`px-3 py-1.5 inline-flex text-xs leading-5 font-bold rounded-full shadow-sm ${
                          auth.status === 'approved' ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300' :
                          auth.status === 'rejected' ? 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 border border-red-300' :
                          auth.status === 'returned' ? 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-300' :
                          'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 border border-yellow-300'
                        }`}>
                          {auth.status === 'pending' && <Clock size={12} className="mr-1" />}
                          {auth.status === 'approved' && <CheckCircle size={12} className="mr-1" />}
                          {auth.status ? auth.status.charAt(0).toUpperCase() + auth.status.slice(1) : 'N/A'}
                        </span>
                        {auth.group_admin_status && (
                          <div className="text-xs text-gray-500 mt-1">
                            {auth.group_admin_status === 'pending' && 'Waiting for approval'}
                            {auth.group_admin_status === 'commission_set' && 'Ready for payment'}
                            {auth.group_admin_status === 'completed' && 'Completed'}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <span className={`px-3 py-1.5 inline-flex text-xs leading-5 font-bold rounded-full shadow-sm ${
                          auth.payment_status === 'paid' ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300' :
                          auth.payment_status === 'failed' ? 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 border border-red-300' :
                          'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 border border-yellow-300'
                        }`}>
                          {auth.payment_status === 'pending' && <Clock size={12} className="mr-1" />}
                          {auth.payment_status === 'paid' && <CheckCircle size={12} className="mr-1" />}
                          {auth.payment_status === 'failed' && <AlertCircle size={12} className="mr-1" />}
                          {auth.payment_status ? auth.payment_status.charAt(0).toUpperCase() + auth.payment_status.slice(1) : 'Pending'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleViewDetails(auth)}
                            className="p-2 rounded-lg bg-primary-50 text-primary-600 hover:bg-primary-100 hover:scale-110 transition-all duration-200 shadow-sm hover:shadow-md"
                            title="View Details"
                          >
                            <Eye size={16} />
                          </button>
                          {canPay && (
                            <button
                              onClick={() => handlePay(auth)}
                              className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 hover:scale-105 shadow-sm hover:shadow-md font-medium flex items-center gap-1"
                              title="Pay Authorization"
                            >
                              <CreditCard size={14} />
                              Pay
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
        {!loading && pagination.totalItems > 0 && (
          <div className="px-4 py-4 border-t border-gray-200">
            <Pagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              totalItems={pagination.totalItems}
              perPage={pagination.perPage}
              onPageChange={handlePageChange}
              onPerPageChange={handlePerPageChange}
            />
          </div>
        )}
      </div>

      {/* Payment Modal */}
      <Modal
        isOpen={paymentModalOpen}
        onClose={() => {
          setPaymentModalOpen(false);
          setSelectedAuthorization(null);
          setErrors({});
        }}
        title="Pay Instructor Authorization"
        size="md"
      >
        <form onSubmit={handlePaymentSubmit} className="space-y-4">
          {errors.general && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{errors.general}</p>
            </div>
          )}

          {selectedAuthorization && (
            <div className="p-4 bg-gray-50 rounded-lg space-y-2">
              <p className="text-sm text-gray-600">Instructor: <span className="font-semibold text-gray-900">{selectedAuthorization.instructor?.first_name} {selectedAuthorization.instructor?.last_name}</span></p>
              <p className="text-sm text-gray-600">ACC: <span className="font-semibold text-gray-900">{selectedAuthorization.acc?.name}</span></p>
              <p className="text-sm text-gray-600">Authorization Price: <span className="font-semibold text-gray-900">${parseFloat(selectedAuthorization.authorization_price || 0).toFixed(2)}</span></p>
            </div>
          )}

          {/* Payment Method - Only Credit Card Available */}
          {/* WALLET OPTION COMMENTED OUT - Keep for future use if needed */}
          {/* 
          <FormInput
            label="Payment Method"
            name="payment_method"
            type="select"
            value={paymentForm.payment_method}
            onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
            options={[
              { value: 'wallet', label: 'Wallet' },
              { value: 'credit_card', label: 'Credit Card' },
            ]}
            error={errors.payment_method}
          />
          */}

          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-900 font-semibold mb-2">Payment Method: Credit Card</p>
            <p className="text-xs text-blue-700 mb-2">
              Payment will be processed securely through Stripe. Click "Pay Now" below to enter your card details.
            </p>
            <p className="text-xs text-blue-600">
              <strong>Authorization Price:</strong> ${parseFloat(selectedAuthorization?.authorization_price || 0).toFixed(2)}
            </p>
          </div>

          <div className="flex space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => {
                setPaymentModalOpen(false);
                setSelectedAuthorization(null);
                setErrors({});
              }}
              className="flex-1 px-4 py-2.5 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 hover:scale-105 transition-all duration-200 shadow-sm hover:shadow-md font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creatingPaymentIntent || processing || !selectedAuthorization}
              className="flex-1 px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 hover:scale-105 transition-all duration-200 shadow-sm hover:shadow-md font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-sm"
            >
              {creatingPaymentIntent ? 'Processing...' : processing ? 'Processing...' : 'Pay Now'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedAuthorization(null);
        }}
        title="Authorization Details"
        size="lg"
      >
        {selectedAuthorization && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Instructor</p>
                <p className="text-base font-semibold text-gray-900">
                  {selectedAuthorization.instructor?.first_name} {selectedAuthorization.instructor?.last_name}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">ACC</p>
                <p className="text-base font-semibold text-gray-900">{selectedAuthorization.acc?.name || 'N/A'}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Courses</p>
                <div className="flex flex-col gap-1">
                  {selectedAuthorization.courses && Array.isArray(selectedAuthorization.courses) && selectedAuthorization.courses.length > 0 ? (
                    selectedAuthorization.courses.map((course, idx) => (
                      <p key={idx} className="text-base font-semibold text-gray-900">
                        {typeof course === 'object' ? course?.name || course?.course_name || 'N/A' : course || 'N/A'}
                      </p>
                    ))
                  ) : selectedAuthorization.course ? (
                    <p className="text-base font-semibold text-gray-900">
                      {typeof selectedAuthorization.course === 'object' ? selectedAuthorization.course?.name || selectedAuthorization.course?.course_name || 'N/A' : selectedAuthorization.course || 'N/A'}
                    </p>
                  ) : (
                    <p className="text-base font-semibold text-gray-900">N/A</p>
                  )}
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Authorization Price</p>
                <p className="text-base font-semibold text-gray-900">
                  ${parseFloat(selectedAuthorization.authorization_price || 0).toFixed(2)}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Status</p>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                  selectedAuthorization.status === 'approved' ? 'bg-green-100 text-green-800' :
                  selectedAuthorization.status === 'rejected' ? 'bg-red-100 text-red-800' :
                  selectedAuthorization.status === 'returned' ? 'bg-blue-100 text-blue-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {selectedAuthorization.status}
                </span>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Payment Status</p>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                  selectedAuthorization.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                  selectedAuthorization.payment_status === 'failed' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {selectedAuthorization.payment_status || 'pending'}
                </span>
              </div>
            </div>
            {selectedAuthorization.group_admin_status && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm font-semibold text-blue-900 mb-1">Group Admin Status</p>
                <p className="text-sm text-gray-700">
GI                {selectedAuthorization.group_admin_status === 'pending' && 'Waiting for Group Admin approval'}
                  {selectedAuthorization.group_admin_status === 'commission_set' && 'Ready for payment'}
                  {selectedAuthorization.group_admin_status === 'completed' && 'Authorization completed'}
                </p>
              </div>
            )}
            {selectedAuthorization.status === 'approved' && selectedAuthorization.group_admin_status === 'commission_set' && selectedAuthorization.payment_status === 'pending' && (
              <div className="flex space-x-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setDetailModalOpen(false);
                    handlePay(selectedAuthorization);
                  }}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center"
                >
                  <CreditCard size={20} className="mr-2" />
                  Pay Authorization
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Stripe Payment Modal */}
      <StripePaymentModal
        isOpen={showStripeModal}
        onClose={() => {
          setShowStripeModal(false);
        }}
        clientSecret={paymentIntentData?.client_secret}
        paymentIntentId={paymentIntentData?.payment_intent_id}
        amount={selectedAuthorization?.authorization_price || 0}
        currency={paymentIntentData?.currency || 'USD'}
        onPaymentSuccess={handleStripePaymentSuccess}
        onPaymentError={(error) => {
          setErrors({ general: error });
        }}
      />
    </div>
  );
};

export default InstructorAuthorizationsScreen;

