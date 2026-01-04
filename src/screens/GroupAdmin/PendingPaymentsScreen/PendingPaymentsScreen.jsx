import { useEffect, useState, useMemo } from 'react';
import { adminAPI } from '../../../services/api';
import { useHeader } from '../../../context/HeaderContext';
import { DollarSign, Clock, Building2, BookOpen, CheckCircle, XCircle, Eye, FileText } from 'lucide-react';
import Modal from '../../../components/Modal/Modal';
import Button from '../../../components/Button/Button';
import FormInput from '../../../components/FormInput/FormInput';
import DataTable from '../../../components/DataTable/DataTable';
import PresentDataForm from '../../../components/PresentDataForm/PresentDataForm';
import './PendingPaymentsScreen.css';

const PendingPaymentsScreen = () => {
  const { setHeaderTitle, setHeaderSubtitle } = useHeader();
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [approveForm, setApproveForm] = useState({ payment_amount: '' });
  const [rejectForm, setRejectForm] = useState({ rejection_reason: '' });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setHeaderTitle('Pending Manual Payments');
    setHeaderSubtitle('Review and approve manual payment requests from all ACCs');
    return () => {
      setHeaderTitle(null);
      setHeaderSubtitle(null);
    };
  }, [setHeaderTitle, setHeaderSubtitle]);

  useEffect(() => {
    loadPendingPayments();
  }, []);

  const loadPendingPayments = async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getPendingPayments();
      const batchesList = response?.batches || response?.data || [];
      
      const enrichedBatches = batchesList.map(batch => ({
        ...batch,
        _searchText: [
          batch.training_center?.name,
          batch.training_center?.email,
          batch.acc?.name,
          batch.acc?.email,
          batch.course?.name,
          batch.quantity,
          batch.total_amount,
          batch.payment_amount,
          batch.payment_status,
        ].filter(Boolean).join(' ').toLowerCase()
      }));
      
      setBatches(enrichedBatches);
    } catch (error) {
      console.error('Failed to load pending payments:', error);
      setBatches([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (batch) => {
    setSelectedBatch(batch);
    setDetailModalOpen(true);
  };

  const handleApproveClick = (batch) => {
    setSelectedBatch(batch);
    setApproveForm({ payment_amount: batch.final_amount || batch.total_amount || '' });
    setErrors({});
    setApproveModalOpen(true);
  };

  const handleRejectClick = (batch) => {
    setSelectedBatch(batch);
    setRejectForm({ rejection_reason: '' });
    setErrors({});
    setRejectModalOpen(true);
  };

  const handleApprove = async () => {
    if (!selectedBatch) return;

    if (!approveForm.payment_amount || parseFloat(approveForm.payment_amount) <= 0) {
      setErrors({ payment_amount: 'Please enter a valid payment amount' });
      return;
    }

    const paymentAmount = parseFloat(approveForm.payment_amount);
    const finalAmount = parseFloat(selectedBatch.final_amount || selectedBatch.total_amount || 0);

    // Check if payment amount matches (allow small difference for rounding)
    if (Math.abs(paymentAmount - finalAmount) > 0.01) {
      setErrors({ payment_amount: `Payment amount must match the calculated total amount: $${finalAmount.toFixed(2)}` });
      return;
    }

    setApproving(true);
    setErrors({});

    try {
      await adminAPI.approvePayment(selectedBatch.id, { payment_amount: paymentAmount });
      await loadPendingPayments();
      setApproveModalOpen(false);
      setDetailModalOpen(false);
      setSelectedBatch(null);
      alert('Payment approved successfully. Codes have been generated.');
    } catch (error) {
      console.error('Failed to approve payment:', error);
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
        }
      } else if (error.response?.data?.message) {
        setErrors({ general: error.response.data.message });
      } else {
        setErrors({ general: 'Failed to approve payment. Please try again.' });
      }
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!selectedBatch) return;

    if (!rejectForm.rejection_reason || rejectForm.rejection_reason.trim().length === 0) {
      setErrors({ rejection_reason: 'Please enter a rejection reason' });
      return;
    }

    if (rejectForm.rejection_reason.trim().length > 1000) {
      setErrors({ rejection_reason: 'Rejection reason must be less than 1000 characters' });
      return;
    }

    setRejecting(true);
    setErrors({});

    try {
      await adminAPI.rejectPayment(selectedBatch.id, { rejection_reason: rejectForm.rejection_reason.trim() });
      await loadPendingPayments();
      setRejectModalOpen(false);
      setDetailModalOpen(false);
      setSelectedBatch(null);
      alert('Payment rejected successfully.');
    } catch (error) {
      console.error('Failed to reject payment:', error);
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
        }
      } else if (error.response?.data?.message) {
        setErrors({ general: error.response.data.message });
      } else {
        setErrors({ general: 'Failed to reject payment. Please try again.' });
      }
    } finally {
      setRejecting(false);
    }
  };

  const formatCurrency = (amount) => {
    return `$${parseFloat(amount || 0).toFixed(2)}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Define columns for DataTable
  const columns = useMemo(() => [
    {
      header: 'ACC',
      accessor: 'acc',
      sortable: true,
      render: (value, row) => (
        <div className="batch-acc-container">
          <Building2 className="batch-acc-icon" size={16} />
          <span>{row.acc?.name || 'N/A'}</span>
        </div>
      ),
    },
    {
      header: 'Training Center',
      accessor: 'training_center',
      sortable: true,
      render: (value, row) => (
        <div className="batch-tc-container">
          <Building2 className="batch-tc-icon" size={16} />
          <span>{row.training_center?.name || 'N/A'}</span>
        </div>
      ),
    },
    {
      header: 'Course',
      accessor: 'course',
      sortable: true,
      render: (value, row) => (
        <div className="batch-course-container">
          <BookOpen className="batch-course-icon" size={16} />
          <span>{row.course?.name || 'N/A'}</span>
        </div>
      ),
    },
    {
      header: 'Quantity',
      accessor: 'quantity',
      sortable: true,
      render: (value) => <span>{value || 0}</span>,
    },
    {
      header: 'Total Amount',
      accessor: 'total_amount',
      sortable: true,
      render: (value) => (
        <div className="batch-amount-container">
          <DollarSign className="batch-amount-icon" size={16} />
          <span>{formatCurrency(value)}</span>
        </div>
      ),
    },
    {
      header: 'Payment Amount',
      accessor: 'payment_amount',
      sortable: true,
      render: (value) => (
        <div className="batch-amount-container">
          <DollarSign className="batch-amount-icon" size={16} />
          <span>{formatCurrency(value)}</span>
        </div>
      ),
    },
    {
      header: 'Submitted Date',
      accessor: 'created_at',
      sortable: true,
      render: (value) => (
        <div className="batch-date-container">
          <Clock className="batch-date-icon" size={16} />
          <span>{formatDate(value)}</span>
        </div>
      ),
    },
    {
      header: 'Actions',
      accessor: 'actions',
      sortable: false,
      render: (value, row) => (
        <div className="batch-actions">
          <button
            onClick={() => handleViewDetails(row)}
            className="action-btn action-btn-view"
            title="View Details"
          >
            <Eye size={16} />
          </button>
        </div>
      ),
    },
  ], []);

  return (
    <div className="pending-payments-screen">
      <DataTable
        columns={columns}
        data={batches}
        isLoading={loading}
        emptyMessage={
          batches.length === 0 && !loading ? (
            <div className="empty-state-content">
              <div className="empty-state-icon-container">
                <Clock className="empty-state-icon" size={32} />
              </div>
              <p className="empty-state-title">No pending payments</p>
              <p className="empty-state-subtitle">All payment requests have been reviewed</p>
            </div>
          ) : 'No pending payments found'
        }
        searchable={true}
        filterable={false}
        searchPlaceholder="Search by ACC, training center, course, amount, or date..."
        sortable={true}
      />

      {/* Detail Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedBatch(null);
        }}
        title="Payment Request Details"
        size="lg"
      >
        {selectedBatch && (
          <div className="space-y-6">
            <PresentDataForm
              data={selectedBatch}
              isLoading={false}
              emptyMessage="No payment data available"
            />
            
            {selectedBatch.payment_receipt_url && (
              <div className="receipt-section">
                <h3 className="receipt-title">
                  <FileText size={20} className="receipt-icon" />
                  Payment Receipt
                </h3>
                <div className="receipt-container">
                  <a
                    href={selectedBatch.payment_receipt_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="receipt-link"
                  >
                    View Receipt
                  </a>
                </div>
              </div>
            )}

            <div className="flex space-x-3 pt-4 border-t border-gray-200">
              <Button
                variant="success"
                fullWidth
                icon={<CheckCircle size={20} />}
                onClick={() => {
                  setDetailModalOpen(false);
                  handleApproveClick(selectedBatch);
                }}
              >
                Approve Payment
              </Button>
              <Button
                variant="danger"
                fullWidth
                icon={<XCircle size={20} />}
                onClick={() => {
                  setDetailModalOpen(false);
                  handleRejectClick(selectedBatch);
                }}
              >
                Reject Payment
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Approve Modal */}
      <Modal
        isOpen={approveModalOpen}
        onClose={() => {
          setApproveModalOpen(false);
          setApproveForm({ payment_amount: '' });
          setErrors({});
        }}
        title="Approve Payment"
        size="md"
      >
        {selectedBatch && (
          <div className="space-y-4">
            {errors.general && (
              <div className="form-error-general">
                <p className="form-error-general-text">{errors.general}</p>
              </div>
            )}

            <div className="approve-info">
              <p className="approve-info-text">
                <strong>ACC:</strong> {selectedBatch.acc?.name || 'N/A'}
              </p>
              <p className="approve-info-text">
                <strong>Training Center:</strong> {selectedBatch.training_center?.name || 'N/A'}
              </p>
              <p className="approve-info-text">
                <strong>Course:</strong> {selectedBatch.course?.name || 'N/A'}
              </p>
              <p className="approve-info-text">
                <strong>Quantity:</strong> {selectedBatch.quantity || 0} codes
              </p>
              <p className="approve-info-text">
                <strong>Calculated Total:</strong> {formatCurrency(selectedBatch.final_amount || selectedBatch.total_amount)}
              </p>
            </div>

            <FormInput
              label="Payment Amount"
              name="payment_amount"
              type="number"
              value={approveForm.payment_amount}
              onChange={(e) => setApproveForm({ ...approveForm, payment_amount: e.target.value })}
              required
              min="0"
              step="0.01"
              error={errors.payment_amount}
              helpText={`Enter the payment amount (should match: ${formatCurrency(selectedBatch.final_amount || selectedBatch.total_amount)})`}
            />

            <div className="form-actions">
              <button
                type="button"
                onClick={() => {
                  setApproveModalOpen(false);
                  setApproveForm({ payment_amount: '' });
                  setErrors({});
                }}
                className="form-btn form-btn-cancel"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApprove}
                disabled={approving}
                className="form-btn form-btn-submit"
              >
                {approving ? 'Approving...' : 'Approve Payment'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Reject Modal */}
      <Modal
        isOpen={rejectModalOpen}
        onClose={() => {
          setRejectModalOpen(false);
          setRejectForm({ rejection_reason: '' });
          setErrors({});
        }}
        title="Reject Payment"
        size="md"
      >
        {selectedBatch && (
          <div className="space-y-4">
            {errors.general && (
              <div className="form-error-general">
                <p className="form-error-general-text">{errors.general}</p>
              </div>
            )}

            <div className="reject-info">
              <p className="reject-info-text">
                <strong>ACC:</strong> {selectedBatch.acc?.name || 'N/A'}
              </p>
              <p className="reject-info-text">
                <strong>Training Center:</strong> {selectedBatch.training_center?.name || 'N/A'}
              </p>
              <p className="reject-info-text">
                <strong>Course:</strong> {selectedBatch.course?.name || 'N/A'}
              </p>
              <p className="reject-info-text">
                <strong>Quantity:</strong> {selectedBatch.quantity || 0} codes
              </p>
              <p className="reject-info-text">
                <strong>Amount:</strong> {formatCurrency(selectedBatch.payment_amount || selectedBatch.total_amount)}
              </p>
            </div>

            <FormInput
              label="Rejection Reason"
              name="rejection_reason"
              type="textarea"
              textarea={true}
              rows={4}
              value={rejectForm.rejection_reason}
              onChange={(e) => setRejectForm({ ...rejectForm, rejection_reason: e.target.value })}
              required
              error={errors.rejection_reason}
              helpText="Please provide a clear reason for rejecting this payment request (max 1000 characters)"
              placeholder="Enter rejection reason..."
            />

            <div className="form-actions">
              <button
                type="button"
                onClick={() => {
                  setRejectModalOpen(false);
                  setRejectForm({ rejection_reason: '' });
                  setErrors({});
                }}
                className="form-btn form-btn-cancel"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={rejecting}
                className="form-btn form-btn-danger"
              >
                {rejecting ? 'Rejecting...' : 'Reject Payment'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PendingPaymentsScreen;

