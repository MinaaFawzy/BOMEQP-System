import { useEffect, useState, useMemo } from 'react';
import { trainingCenterAPI } from '../../../services/api';
import { useHeader } from '../../../context/HeaderContext';
import { Users, DollarSign, Building2, CreditCard, CheckCircle, Clock, AlertCircle, Eye, RefreshCw, BookOpen } from 'lucide-react';
import Modal from '../../../components/Modal/Modal';
import FormInput from '../../../components/FormInput/FormInput';
import StripePaymentModal from '../../../components/StripePaymentModal/StripePaymentModal';
import DataTable from '../../../components/DataTable/DataTable';
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

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setHeaderTitle('Instructor Authorizations');
    setHeaderSubtitle('View and pay for instructor authorization requests');
    setHeaderActions(
      <button
        onClick={loadData}
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

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load all data - search and statusFilter are handled client-side by DataTable
      const params = {
        per_page: 1000,
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
      header: 'ACC',
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
      header: 'Courses',
      accessor: 'courses',
      sortable: false,
      render: (value, row) => (
        <div className="courses-container">
          {row.courses && Array.isArray(row.courses) && row.courses.length > 0 ? (
            row.courses.map((course, idx) => (
              <div key={idx} className="course-item">
                <BookOpen className="course-icon" />
                <span className="course-text">
                  {typeof course === 'object' ? course?.name || course?.course_name || 'N/A' : course || 'N/A'}
                </span>
              </div>
            ))
          ) : row.course ? (
            <div className="course-item">
              <BookOpen className="course-icon" />
              <span className="course-text">
                {typeof row.course === 'object' ? row.course?.name || row.course?.course_name || 'N/A' : row.course || 'N/A'}
              </span>
            </div>
          ) : (
            <span className="course-na">N/A</span>
          )}
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
          emptyMessage={
            authorizations.length === 0 && !loading ? (
              <div className="empty-state-container">
                <div className="empty-state-icon-container">
                  <Users className="text-gray-400" size={32} />
                </div>
                <p className="empty-state-title">No authorization requests found</p>
                <p className="empty-state-subtitle">To see authorizations here, you need to request authorization for an instructor first</p>
                <div className="empty-state-help">
                  <p className="empty-state-help-title">💡 How to get started:</p>
                  <ol className="empty-state-help-list">
                    <li>Go to <strong>Instructors</strong> page and create/add an instructor</li>
                    <li>Click <strong>Request Authorization</strong> button for that instructor</li>
                    <li>Select an ACC and courses for authorization</li>
                    <li>Wait for ACC Admin to approve and set authorization price</li>
                    <li>Wait for Group Admin approval</li>
                    <li>Then come back here to complete payment!</li>
                  </ol>
                  <div className="empty-state-help-note">
                    <p className="empty-state-help-note-text">
                      <strong>Note:</strong> Authorizations will only appear here after you've submitted a request and it's been approved by ACC Admin.
                    </p>
                  </div>
                </div>
              </div>
            ) : 'No authorizations found matching your filters'
          }
          searchable={true}
          filterable={true}
          searchPlaceholder="Search by instructor name, ACC, course, or training center..."
          filterOptions={filterOptions}
          sortable={true}
          defaultFilter={statusFilter}
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
              <p className="payment-info-text">ACC: <span className="payment-info-value">{selectedAuthorization.acc?.name}</span></p>
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
            <div className="detail-modal-grid">
              <div className="detail-modal-item">
                <p className="detail-modal-label">Instructor</p>
                <p className="detail-modal-value">
                  {selectedAuthorization.instructor?.first_name} {selectedAuthorization.instructor?.last_name}
                </p>
              </div>
              <div className="detail-modal-item">
                <p className="detail-modal-label">ACC</p>
                <p className="detail-modal-value">{selectedAuthorization.acc?.name || 'N/A'}</p>
              </div>
              <div className="detail-modal-item">
                <p className="detail-modal-label">Courses</p>
                <div className="detail-modal-courses-list">
                  {selectedAuthorization.courses && Array.isArray(selectedAuthorization.courses) && selectedAuthorization.courses.length > 0 ? (
                    selectedAuthorization.courses.map((course, idx) => (
                      <p key={idx} className="detail-modal-value">
                        {typeof course === 'object' ? course?.name || course?.course_name || 'N/A' : course || 'N/A'}
                      </p>
                    ))
                  ) : selectedAuthorization.course ? (
                    <p className="detail-modal-value">
                      {typeof selectedAuthorization.course === 'object' ? selectedAuthorization.course?.name || selectedAuthorization.course?.course_name || 'N/A' : selectedAuthorization.course || 'N/A'}
                    </p>
                  ) : (
                    <p className="detail-modal-value">N/A</p>
                  )}
                </div>
              </div>
              <div className="detail-modal-item">
                <p className="detail-modal-label">Authorization Price</p>
                <p className="detail-modal-value">
                  ${parseFloat(selectedAuthorization.authorization_price || 0).toFixed(2)}
                </p>
              </div>
              <div className="detail-modal-item">
                <p className="detail-modal-label">Status</p>
                <span className={`detail-modal-badge ${
                  selectedAuthorization.status === 'approved' ? 'approved' :
                  selectedAuthorization.status === 'rejected' ? 'rejected' :
                  selectedAuthorization.status === 'returned' ? 'returned' : 'pending'
                }`}>
                  {selectedAuthorization.status}
                </span>
              </div>
              <div className="detail-modal-item">
                <p className="detail-modal-label">Payment Status</p>
                <span className={`detail-modal-badge ${
                  selectedAuthorization.payment_status === 'paid' ? 'paid' :
                  selectedAuthorization.payment_status === 'failed' ? 'failed' : 'pending'
                }`}>
                  {selectedAuthorization.payment_status || 'pending'}
                </span>
              </div>
            </div>
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

