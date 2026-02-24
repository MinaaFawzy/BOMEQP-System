import { useEffect, useState, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('training_center');
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
    setHeaderTitle(t('instructor_authorizations.header.title'));
    setHeaderSubtitle(t('instructor_authorizations.header.subtitle'));
    setHeaderActions(
      <button
        onClick={() => loadData(page, perPage, searchTerm, statusFilter, paymentStatusFilter, true)}
        disabled={loading}
        className="header-refresh-btn"
        title={t('instructor_authorizations.header.refresh')}
      >
        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        {t('instructor_authorizations.header.refresh')}
      </button>
    );
    return () => {
      setHeaderActions(null);
      setHeaderTitle(null);
      setHeaderSubtitle(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setHeaderActions, setHeaderTitle, setHeaderSubtitle, loading, t]);

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
      alert(t('instructor_authorizations.payment.not_ready'));
      return;
    }
    if (authorization.payment_status === 'paid') {
      alert(t('instructor_authorizations.payment.already_paid'));
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
      alert(t('instructor_authorizations.payment.success'));
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
      header: t('instructor_authorizations.table.request_id') || 'Request ID',
      accessor: 'id',
      sortable: true,
      render: (value) => <span className="text-gray-900 font-medium">#{value}</span>,
    },
    {
      header: t('instructor_authorizations.table.instructor'),
      accessor: 'instructor',
      sortable: true,
      render: (value, row) => (
        <div className="instructor-container gap-2">
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
      header: t('instructor_authorizations.table.accreditation'),
      accessor: 'acc',
      sortable: true,
      render: (value, row) => (
        <div className="acc-container gap-2">
          <Building2 className="acc-icon" />
          {row.acc?.name || 'N/A'}
        </div>
      ),
    },
    {
      header: t('instructor_authorizations.table.authorization_price'),
      accessor: 'authorization_price',
      sortable: true,
      render: (value, row) => (
        <div className="price-container gap-2">
          <DollarSign className="price-icon" />
          {parseFloat(row.authorization_price || 0).toFixed(2)}
        </div>
      ),
    },
    {
      header: t('instructor_authorizations.table.status'),
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
              {row.status ? t(`instructor_authorizations.status.${row.status}`) : t('instructor_authorizations.status.na')}
            </span>
          </div>
        );
      },
    },
    {
      header: t('instructor_authorizations.table.payment_status'),
      accessor: 'payment_status',
      sortable: true,
      render: (value, row) => {
        const isPaymentPending = !row.payment_status || row.payment_status === 'pending';

        // Hide pending payment status if request is returned or rejected
        if (isPaymentPending && ['returned', 'rejected'].includes(row.status)) {
          return <span className="text-gray-400 font-medium">-</span>;
        }

        const paymentStatusClass = row.payment_status === 'paid' ? 'paid' :
          row.payment_status === 'failed' ? 'failed' : 'pending';

        const effectiveStatus = row.payment_status || 'pending';

        return (
          <div className="payment-status-container">
            <span className={`payment-status-badge ${paymentStatusClass}`}>
              {effectiveStatus === 'pending' && <Clock size={12} className="payment-status-icon" />}
              {effectiveStatus === 'paid' && <CheckCircle size={12} className="payment-status-icon" />}
              {effectiveStatus === 'failed' && <AlertCircle size={12} className="payment-status-icon" />}
              {t(`instructor_authorizations.status.${effectiveStatus}`)}
            </span>
          </div>
        );
      },
    },
    {
      header: t('instructor_authorizations.table.actions'),
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
              title={t('instructor_authorizations.actions.view_details')}
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
                title={t('instructor_authorizations.actions.pay_authorization')}
              >
                <CreditCard size={16} />
              </button>
            )}
          </div>
        );
      },
    },
  ], [handlePay, handleViewDetails, t]);

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
        auth.id || '',
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
      <DataTable
        columns={columns}
        data={dataWithSearchText}
        onRowClick={handleViewDetails}
        isLoading={loading}
        emptyMessage={t('instructor_authorizations.table.empty')}
        searchable={true}
        searchValue={searchTerm}
        onSearch={(value) => {
          setSearchTerm(value);
          setPage(1);
        }}
        searchPlaceholder={t('instructor_authorizations.table.search_placeholder')}
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
              <option value="all">{t('instructor_authorizations.filters.all_status')}</option>
              <option value="pending">{t('instructor_authorizations.filters.pending')}</option>
              <option value="approved">{t('instructor_authorizations.filters.approved')}</option>
              <option value="rejected">{t('instructor_authorizations.filters.rejected')}</option>
              <option value="returned">{t('instructor_authorizations.filters.returned')}</option>
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
              <option value="all">{t('instructor_authorizations.filters.all_payment_status')}</option>
              <option value="pending">{t('instructor_authorizations.filters.unpaid')}</option>
              <option value="paid">{t('instructor_authorizations.filters.paid')}</option>
              <option value="failed">{t('instructor_authorizations.filters.failed')}</option>
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


      {/* Payment Modal */}
      <Modal
        isOpen={paymentModalOpen}
        onClose={() => {
          setPaymentModalOpen(false);
          setSelectedAuthorization(null);
          setErrors({});
        }}
        title={t('instructor_authorizations.payment.title')}
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
              <p className="payment-info-text">{t('instructor_authorizations.payment.instructor')}: <span className="payment-info-value">{selectedAuthorization.instructor?.first_name} {selectedAuthorization.instructor?.last_name}</span></p>
              <p className="payment-info-text">{t('instructor_authorizations.payment.accreditation')}: <span className="payment-info-value">{selectedAuthorization.acc?.name}</span></p>
              <p className="payment-info-text">{t('instructor_authorizations.payment.authorization_price')}: <span className="payment-info-value">${parseFloat(selectedAuthorization.authorization_price || 0).toFixed(2)}</span></p>
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
            <p className="payment-method-title">{t('instructor_authorizations.payment.method_title')}</p>
            <p className="payment-method-text">
              {t('instructor_authorizations.payment.method_description')}
            </p>
            <p className="payment-method-price">
              <strong>{t('instructor_authorizations.payment.authorization_price')}:</strong> ${parseFloat(selectedAuthorization?.authorization_price || 0).toFixed(2)}
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
              {t('instructor_authorizations.payment.cancel')}
            </button>
            <button
              type="submit"
              disabled={creatingPaymentIntent || processing || !selectedAuthorization}
              className="payment-modal-btn payment-modal-btn-submit"
            >
              {creatingPaymentIntent ? t('instructor_authorizations.payment.processing') : processing ? t('instructor_authorizations.payment.processing') : t('instructor_authorizations.payment.pay_now')}
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
        title={t('instructor_authorizations.details.title')}
        size="lg"
      >
        {selectedAuthorization && (
          <div className="detail-modal-container space-y-6">

            {/* Instructor Information Section */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Users className="mr-2" size={20} />
                {t('instructor_authorizations.details.instructor_info') || 'Instructor Information'}
              </h3>
              <DetailForm
                data={selectedAuthorization.instructor || {}}
                fields={[
                  {
                    key: 'first_name',
                    label: t('instructor_authorizations.details.first_name') || 'First Name',
                    icon: Users
                  },
                  {
                    key: 'last_name',
                    label: t('instructor_authorizations.details.last_name') || 'Last Name',
                    icon: Users
                  },
                  {
                    key: 'email',
                    label: t('instructor_authorizations.details.email') || 'Email',
                    type: 'email',
                    icon: Mail
                  },
                  {
                    key: 'phone',
                    label: t('instructor_authorizations.details.phone') || 'Phone',
                    icon: Phone
                  },
                  {
                    key: 'country',
                    label: t('instructor_authorizations.details.country') || 'Country',
                    icon: Building2,
                    showEmpty: false
                  },
                  {
                    key: 'city',
                    label: t('instructor_authorizations.details.city') || 'City',
                    icon: Building2,
                    showEmpty: false
                  },
                  {
                    key: 'status',
                    label: t('instructor_authorizations.details.instructor_status') || 'Status',
                    render: (value) => <span className={`px-2 py-1 text-xs font-bold rounded-full ${value === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{value || 'N/A'}</span>,
                    icon: CheckCircle,
                    showEmpty: false
                  },
                  {
                    key: 'is_assessor',
                    label: t('instructor_authorizations.details.is_assessor') || 'Is Assessor',
                    render: (val) => val ? 'Yes' : 'No',
                    icon: CheckCircle,
                    showEmpty: false
                  },
                  
                ]}
              />
            </div>

            {/* Accreditation Body Information */}
            {selectedAuthorization.acc && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Building2 className="mr-2" size={20} />
                  {t('instructor_authorizations.details.accreditation_body') || 'Accreditation Body'}
                </h3>
                <DetailForm
                  data={selectedAuthorization.acc}
                  fields={[
                    {
                      key: 'name',
                      label: t('instructor_authorizations.details.acc_name') || 'Name',
                      icon: Building2
                    },
                  ]}
                />
              </div>
            )}

            {/* Category and Sub-Category */}
            {(selectedAuthorization.category || selectedAuthorization.sub_category) && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <BookOpen className="mr-2" size={20} />
                  {t('instructor_authorizations.details.category_info') || 'Category Information'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedAuthorization.category && (
                    <div className="p-4 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg border border-indigo-200">
                      <p className="text-sm text-indigo-600 font-medium mb-1">Category</p>
                      <p className="text-lg font-semibold text-gray-900">{selectedAuthorization.category.name}</p>
                      {selectedAuthorization.category.name_ar && (
                        <p className="text-sm text-gray-600 mt-1">{selectedAuthorization.category.name_ar}</p>
                      )}
                    </div>
                  )}
                  {selectedAuthorization.sub_category && (
                    <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
                      <p className="text-sm text-purple-600 font-medium mb-1">Sub-Category</p>
                      <p className="text-lg font-semibold text-gray-900">{selectedAuthorization.sub_category.name}</p>
                      {selectedAuthorization.sub_category.name_ar && (
                        <p className="text-sm text-gray-600 mt-1">{selectedAuthorization.sub_category.name_ar}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Requested Courses */}
            {selectedAuthorization.requested_courses && Array.isArray(selectedAuthorization.requested_courses) && selectedAuthorization.requested_courses.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <BookOpen className="mr-2" size={20} />
                  {t('instructor_authorizations.details.requested_courses') || 'Requested Courses'} ({selectedAuthorization.requested_courses.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {selectedAuthorization.requested_courses.map((course, index) => (
                    <div key={course.id || index} className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-bold rounded">{course.code}</span>
                          </div>
                          <p className="font-semibold text-gray-900 text-base">{course.name}</p>
                          {course.name_ar && (
                            <p className="text-sm text-gray-600 mt-1">{course.name_ar}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Authorization Details */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <DollarSign className="mr-2" size={20} />
                {t('instructor_authorizations.details.authorization_details') || 'Authorization Details'}
              </h3>
              <DetailForm
                data={selectedAuthorization}
                fields={[
                  {
                    key: 'authorization_price',
                    label: t('instructor_authorizations.payment.authorization_price'),
                    icon: DollarSign,
                    render: (value) => `$${parseFloat(value || 0).toFixed(2)}`
                  },
                  {
                    key: 'status',
                    label: t('instructor_authorizations.table.status'),
                    type: 'status'
                  },
                  {
                    key: 'group_admin_status',
                    label: t('instructor_authorizations.details.group_admin_status') || 'Group Admin Status',
                    render: (value) => <span className={`px-2 py-1 text-xs font-bold rounded-full ${value === 'commission_set' ? 'bg-green-100 text-green-800' : value === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>{value || 'pending'}</span>,
                    icon: Clock,
                    showEmpty: false
                  },
                  ...(!['returned', 'rejected'].includes(selectedAuthorization.status) ? [
                    {
                      key: 'payment_status',
                      label: t('instructor_authorizations.table.payment_status'),
                      type: 'status'
                    },
                    {
                      key: 'payment_date',
                      label: t('instructor_authorizations.details.payment_date') || 'Payment Date',
                      type: 'datetime',
                      icon: Clock,
                      showEmpty: false
                    },
                    {
                      key: 'payment_transaction_id',
                      label: t('instructor_authorizations.details.transaction_id') || 'Transaction ID',
                      icon: CreditCard,
                      showEmpty: false
                    },
                  ] : []),
                  {
                    key: 'request_date',
                    label: t('instructor_authorizations.details.request_date') || 'Request Date',
                    type: 'datetime',
                    icon: Clock,
                    showEmpty: false
                  },
                  {
                    key: 'created_at',
                    label: t('instructor_authorizations.details.created_at') || 'Created At',
                    type: 'datetime',
                    icon: Clock,
                    showEmpty: false
                  },
                  {
                    key: 'updated_at',
                    label: t('instructor_authorizations.details.updated_at') || 'Updated At',
                    type: 'datetime',
                    icon: Clock,
                    showEmpty: false
                  },
                ]}
              />
            </div>

            {/* Rejection Reason */}
            {selectedAuthorization.status === 'rejected' && selectedAuthorization.rejection_reason && (
              <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-center mb-2">
                  <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                  <h3 className="text-lg font-semibold text-red-900">{t('instructor_authorizations.details.reason_label') || 'Rejection Reason'}</h3>
                </div>
                <p className="text-base text-gray-900">{selectedAuthorization.rejection_reason}</p>
              </div>
            )}

            {/* Return Comment */}
            {selectedAuthorization.status === 'returned' && selectedAuthorization.return_comment && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center mb-2">
                  <RefreshCw className="h-5 w-5 text-blue-600 mr-2" />
                  <h3 className="text-lg font-semibold text-blue-900">{t('instructor_authorizations.details.comment_label') || 'Return Comment'}</h3>
                </div>
                <p className="text-base text-gray-900">{selectedAuthorization.return_comment}</p>
              </div>
            )}

            {selectedAuthorization.group_admin_status && !['returned', 'rejected'].includes(selectedAuthorization.status) && (
              <div className="detail-modal-group-admin">
                <p className="detail-modal-group-admin-title">{t('instructor_authorizations.details.group_admin_status')}</p>
                <p className="detail-modal-group-admin-text">
                  {selectedAuthorization.group_admin_status === 'pending' && t('instructor_authorizations.details.waiting_admin')}
                  {selectedAuthorization.group_admin_status === 'commission_set' && t('instructor_authorizations.details.ready_for_payment')}
                  {selectedAuthorization.group_admin_status === 'completed' && t('instructor_authorizations.details.completed')}
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
                  {t('instructor_authorizations.details.pay_authorization')}
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

