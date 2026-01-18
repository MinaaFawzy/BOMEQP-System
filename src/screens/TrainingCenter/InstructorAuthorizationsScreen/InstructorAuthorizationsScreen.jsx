import { useEffect, useState, useMemo, useRef } from 'react';
import { trainingCenterAPI } from '../../../services/api';
import { useHeader } from '../../../context/HeaderContext';
import useDebounce from '../../../hooks/useDebounce';
import { Users, DollarSign, Building2, CreditCard, CheckCircle, Clock, AlertCircle, Eye, RefreshCw, BookOpen, Mail, Phone } from 'lucide-react';
import Modal from '../../../components/Modal/Modal';
import FormInput from '../../../components/FormInput/FormInput';
import StripePaymentModal from '../../../components/StripePaymentModal/StripePaymentModal';
import DataTable from '../../../components/DataTable/DataTable';
import DetailForm from '../../../components/DetailForm/DetailForm';
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
  const [statusFilter, setStatusFilter] = useState('all');

  // Pagination State
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  const hasDataRef = useRef(false);

  useEffect(() => {
    // Only show full loading spinner if we don't have data yet
    const showLoading = !hasDataRef.current;

    if (searchTerm !== debouncedSearchTerm) {
      return;
    }

    loadData(page, perPage, debouncedSearchTerm, statusFilter, paymentStatusFilter, showLoading);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, perPage, debouncedSearchTerm, statusFilter, paymentStatusFilter, searchTerm]);

  useEffect(() => {
    setHeaderTitle('Instructor Authorizations');
    setHeaderSubtitle('View and pay for instructor authorization requests');
    setHeaderActions(
      <button
        onClick={() => loadData(page, perPage, searchTerm, statusFilter, paymentStatusFilter, true)}
        disabled={loading}
        className="header-refresh-btn"
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

  const loadData = async (pageArg = 1, limitArg = 10, search = '', status = 'all', paymentStatus = 'all', showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      } else {
        setIsSearchLoading(true);
      }

      // Load data with pagination
      const params = {
        page: pageArg,
        per_page: limitArg,
        ...(search && { search }),
        ...(status !== 'all' && { status }),
        ...(paymentStatus !== 'all' && { payment_status: paymentStatus }),
      };

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
        } else if (data?.data?.authorizations) {
          authorizationsList = data.data.authorizations;
        } else if (Array.isArray(data?.data)) {
          authorizationsList = data.data;
        } else if (Array.isArray(data)) {
          authorizationsList = data;
        }

        console.log('Processed authorizations:', authorizationsList);
        setAuthorizations(authorizationsList);

        // Update pagination info
        if (data) {
          const total = data.total || authorizationsList.length;
          setTotalItems(total);
          setTotalPages(data.last_page || Math.ceil(total / limitArg) || 1);
        }

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

              // Only update total if we have pagination info (usually fallback endpoint doesn't support pagination same way or we have to use length)
              // But if altData has pagination fields, use them.
              if (altData) {
                const total = altData.total || instructorAuths.length;
                setTotalItems(total);
                setTotalPages(altData.last_page || Math.ceil(total / limitArg) || 1);
              }
              // Mark as having data so subsequent loads can be silent (no spinner)
              hasDataRef.current = true;
              return;
            }
          } catch (altError) {
            console.warn('Alternative endpoint also failed:', altError);
          }
        }
        throw mainError;
      }
    } catch (error) {
      console.error('Failed to load instructor authorizations:', error);
      console.error('Error details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      setAuthorizations([]);
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
      await loadData(page, perPage);
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
        // Store full payment intent data including new destination charge fields
        setPaymentIntentData({
          ...response,
          // New fields from destination charges
          commission_amount: response.commission_amount,
          provider_amount: response.provider_amount,
          payment_type: response.payment_type || 'standard',
        });
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


  // Define columns for DataTable
  const columns = useMemo(() => [
    {
      header: 'Instructor',
      accessor: 'instructor',
      sortable: true,
      render: (value, row) => (
        <div className="instructor-container">
          <div className="instructor-icon-container">
            <Users className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <div className="instructor-name">
              {row.instructor?.first_name} {row.instructor?.last_name}
            </div>
            {row.instructor?.email && (
              <div className="instructor-email">{row.instructor.email}</div>
            )}
          </div>
        </div>
      ),
    },
    {
      header: 'Accreditation',
      accessor: 'acc',
      sortable: true,
      render: (value, row) => (
        <div className="acc-container">
          <Building2 className="acc-icon" />
          {row.acc?.name || 'N/A'}
        </div>
      ),
    },
    {
      header: 'Authorization Price',
      accessor: 'authorization_price',
      sortable: true,
      render: (value, row) => (
        <div className="price-container">
          <DollarSign className="price-icon" />
          {parseFloat(row.authorization_price || 0).toFixed(2)}
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: 'status',
      sortable: true,
      render: (value, row) => {
        const statusClass = row.status === 'approved' ? 'approved' :
          row.status === 'rejected' ? 'rejected' :
            row.status === 'returned' ? 'returned' : 'pending';
        return (
          <div className="status-container">
            <span className={`status-badge ${statusClass}`}>
              {row.status === 'pending' && <Clock size={12} className="status-icon" />}
              {row.status === 'approved' && <CheckCircle size={12} className="status-icon" />}
              {row.status ? row.status.charAt(0).toUpperCase() + row.status.slice(1) : 'N/A'}
            </span>
          </div>
        );
      },
    },
    {
      header: 'Payment Status',
      accessor: 'payment_status',
      sortable: true,
      render: (value, row) => {
        const paymentStatusClass = row.payment_status === 'paid' ? 'paid' :
          row.payment_status === 'failed' ? 'failed' : 'pending';
        return (
          <div className="payment-status-container">
            <span className={`payment-status-badge ${paymentStatusClass}`}>
              {row.payment_status === 'pending' && <Clock size={12} className="payment-status-icon" />}
              {row.payment_status === 'paid' && <CheckCircle size={12} className="payment-status-icon" />}
              {row.payment_status === 'failed' && <AlertCircle size={12} className="payment-status-icon" />}
              {row.payment_status ? row.payment_status.charAt(0).toUpperCase() + row.payment_status.slice(1) : 'Pending'}
            </span>
          </div>
        );
      },
    },
    {
      header: 'Actions',
      accessor: 'actions',
      sortable: false,
      render: (value, row) => {
        const canPay = row.status === 'approved' && row.group_admin_status === 'commission_set' && row.payment_status === 'pending';
        return (
          <div className="actions-container">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleViewDetails(row);
              }}
              className="action-btn-view"
              title="View Details"
            >
              <Eye size={16} />
            </button>
            {canPay && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePay(row);
                }}
                className="action-btn-pay"
                title="Pay Authorization"
              >
                <CreditCard size={16} />
              </button>
            )}
          </div>
        );
      },
    },
  ], [handlePay, handleViewDetails]);

  // Filter options for DataTable (status filter)
  const filterOptions = useMemo(() => [
    { value: 'all', label: 'All Status', filterFn: () => true },
    { value: 'pending', label: 'Pending', filterFn: (row) => row.status === 'pending' },
    { value: 'approved', label: 'Approved', filterFn: (row) => row.status === 'approved' },
    { value: 'rejected', label: 'Rejected', filterFn: (row) => row.status === 'rejected' },
    { value: 'returned', label: 'Returned', filterFn: (row) => row.status === 'returned' },
  ], []);

  // Add searchable text to each row for better search functionality
  const dataWithSearchText = useMemo(() => {
    return authorizations.map(auth => {
      // Build searchable text from all relevant fields
      const instructorName = `${auth.instructor?.first_name || ''} ${auth.instructor?.last_name || ''}`.trim();
      const instructorEmail = auth.instructor?.email || '';
      const accName = auth.acc?.name || '';
      const trainingCenterName = auth.training_center?.name || '';

      // Get course names
      const courseNames = auth.courses && Array.isArray(auth.courses)
        ? auth.courses.map(c => typeof c === 'object' ? (c?.name || c?.course_name || '') : (c || '')).join(' ')
        : auth.course
          ? (typeof auth.course === 'object' ? (auth.course?.name || auth.course?.course_name || '') : (auth.course || ''))
          : '';

      // Combine all searchable text
      const searchText = [
        instructorName,
        instructorEmail,
        accName,
        trainingCenterName,
        courseNames,
        auth.authorization_price || '',
        auth.status || '',
        auth.payment_status || '',
      ].filter(Boolean).join(' ').toLowerCase();

      return {
        ...auth,
        _searchText: searchText,
      };
    });
  }, [authorizations]);


  return (
    <div>
      {/* DataTable */}
      <div className="datatable-container">
        <DataTable
          columns={columns}
          data={dataWithSearchText}
          onRowClick={handleViewDetails}
          isLoading={loading}
          emptyMessage="No authorizations found matching your filters"
          searchable={true}
          searchValue={searchTerm}
          onSearch={(value) => {
            setSearchTerm(value);
            setPage(1);
          }}
          searchPlaceholder="Search by name, ID, or Accreditation..."
          // Remove default filterOptions and use customFilters for server-side filtering
          filterable={false}
          customFilters={
            <div className="flex gap-2">
              <select
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white filter-select-fix"
                value={statusFilter}
                onChange={(e) => {
                  hasDataRef.current = false;
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="returned">Returned</option>
              </select>
              <select
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white filter-select-fix"
                value={paymentStatusFilter}
                onChange={(e) => {
                  hasDataRef.current = false;
                  setPaymentStatusFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">All Payment Status</option>
                <option value="pending">Unpaid</option>
                <option value="paid">Paid</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          }
          sortable={true}
        />
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={totalItems}
          perPage={perPage}
          onPageChange={(p) => {
            hasDataRef.current = false;
            setPage(p);
          }}
          onPerPageChange={(newPerPage) => {
            hasDataRef.current = false;
            setPerPage(newPerPage);
            setPage(1);
          }}
        />
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
        <form onSubmit={handlePaymentSubmit} className="payment-modal-form">
          {errors.general && (
            <div className="payment-error">
              <p className="payment-error-text">{errors.general}</p>
            </div>
          )}

          {selectedAuthorization && (
            <div className="payment-info-container">
              <p className="payment-info-text">Instructor: <span className="payment-info-value">{selectedAuthorization.instructor?.first_name} {selectedAuthorization.instructor?.last_name}</span></p>
              <p className="payment-info-text">Accreditation: <span className="payment-info-value">{selectedAuthorization.acc?.name}</span></p>
              <p className="payment-info-text">Authorization Price: <span className="payment-info-value">${parseFloat(selectedAuthorization.authorization_price || 0).toFixed(2)}</span></p>
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

          <div className="payment-method-info">
            <p className="payment-method-title">Payment Method: Credit Card</p>
            <p className="payment-method-text">
              Payment will be processed securely through Stripe. Click "Pay Now" below to enter your card details.
            </p>
            <p className="payment-method-price">
              <strong>Authorization Price:</strong> ${parseFloat(selectedAuthorization?.authorization_price || 0).toFixed(2)}
            </p>
          </div>

          <div className="payment-modal-actions">
            <button
              type="button"
              onClick={() => {
                setPaymentModalOpen(false);
                setSelectedAuthorization(null);
                setErrors({});
              }}
              className="payment-modal-btn payment-modal-btn-cancel"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creatingPaymentIntent || processing || !selectedAuthorization}
              className="payment-modal-btn payment-modal-btn-submit"
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
          <div className="detail-modal-container">
            <DetailForm
              data={selectedAuthorization}
              fields={[
                {
                  key: 'instructor',
                  label: 'Instructor',
                  icon: Users,
                  render: (value) => {
                    if (!value) return 'N/A';
                    return `${value.first_name || ''} ${value.last_name || ''}`.trim() || 'N/A';
                  }
                },
                {
                  key: 'acc',
                  label: 'Accreditation',
                  icon: Building2,
                  render: (value) => value?.name || 'N/A'
                },
                {
                  key: 'courses',
                  label: 'Courses',
                  icon: BookOpen,
                  render: (value, data) => {
                    if (data.courses && Array.isArray(data.courses) && data.courses.length > 0) {
                      return data.courses.map((course, idx) =>
                        typeof course === 'object' ? course?.name || course?.course_name || 'N/A' : course || 'N/A'
                      ).join(', ');
                    } else if (data.course) {
                      return typeof data.course === 'object'
                        ? data.course?.name || data.course?.course_name || 'N/A'
                        : data.course || 'N/A';
                    }
                    return 'N/A';
                  }
                },
                {
                  key: 'authorization_price',
                  label: 'Authorization Price',
                  icon: DollarSign,
                  render: (value) => `$${parseFloat(value || 0).toFixed(2)}`
                },
                { key: 'status', label: 'Status', type: 'status' },
                { key: 'payment_status', label: 'Payment Status', type: 'status' },
              ]}
            />
            {selectedAuthorization.group_admin_status && (
              <div className="detail-modal-group-admin">
                <p className="detail-modal-group-admin-title">Group Admin Status</p>
                <p className="detail-modal-group-admin-text">
                  {selectedAuthorization.group_admin_status === 'pending' && 'Waiting for Group Admin approval'}
                  {selectedAuthorization.group_admin_status === 'commission_set' && 'Ready for payment'}
                  {selectedAuthorization.group_admin_status === 'completed' && 'Authorization completed'}
                </p>
              </div>
            )}
            {selectedAuthorization.status === 'approved' && selectedAuthorization.group_admin_status === 'commission_set' && selectedAuthorization.payment_status === 'pending' && (
              <div className="detail-modal-pay-section">
                <button
                  onClick={() => {
                    setDetailModalOpen(false);
                    handlePay(selectedAuthorization);
                  }}
                  className="detail-modal-pay-btn"
                >
                  <CreditCard size={20} className="detail-modal-pay-icon" />
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
        amount={paymentIntentData?.amount || selectedAuthorization?.authorization_price || 0}
        currency={paymentIntentData?.currency || 'USD'}
        paymentSummary={paymentIntentData}
        onPaymentSuccess={handleStripePaymentSuccess}
        onPaymentError={(error) => {
          setErrors({ general: error });
        }}
      />
    </div>
  );
};

export default InstructorAuthorizationsScreen;

