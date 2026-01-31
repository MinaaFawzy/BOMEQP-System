import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from '../../../hooks/useTranslation';
import { accAPI } from '../../../services/api';
import { useHeader } from '../../../context/HeaderContext';
import { DollarSign, Clock, Building2, BookOpen, CheckCircle, XCircle, Eye, FileText, Calendar } from 'lucide-react';
import Modal from '../../../components/Modal/Modal';
import Button from '../../../components/Button/Button';
import FormInput from '../../../components/FormInput/FormInput';
import DataTable from '../../../components/DataTable/DataTable';
import DetailForm from '../../../components/DetailForm/DetailForm';
import Pagination from '../../../components/Pagination/Pagination';
import useDebounce from '../../../hooks/useDebounce';
import './PendingPaymentsScreen.css';

const PendingPaymentsScreen = () => {
  const { t } = useTranslation('accreditation');
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

  // Pagination & Search
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 500);
  const [pagination, setPagination] = useState({
    current_page: 1,
    per_page: 10,
    total: 0,
    last_page: 1
  });

  useEffect(() => {
    setHeaderTitle(t('pending_payments_screen.header.title'));
    setHeaderSubtitle(t('pending_payments_screen.header.subtitle'));
    return () => {
      setHeaderTitle(null);
      setHeaderSubtitle(null);
    };
  }, [setHeaderTitle, setHeaderSubtitle, t]);

  useEffect(() => {
    loadPendingPayments(pagination.current_page, debouncedSearch);
  }, [pagination.current_page, debouncedSearch]);

  const handlePageChange = (page) => {
    setPagination(prev => ({ ...prev, current_page: page }));
  };

  const handleSearch = (term) => {
    setSearchTerm(term);
    setPagination(prev => ({ ...prev, current_page: 1 }));
  };

  const loadPendingPayments = async (page = 1, search = '') => {
    setLoading(true);
    try {
      const params = {
        page,
        per_page: pagination.per_page,
        ...(search && { search })
      };

      const response = await accAPI.getPendingPayments(params);
      const batchesList = response?.batches || response?.data || [];

      setBatches(batchesList);

      // handle pagination
      if (response) {
        setPagination(prev => ({
          ...prev,
          current_page: response.current_page || response.meta?.current_page || page,
          total: response.total || response.meta?.total || batchesList.length,
          last_page: response.last_page || response.meta?.last_page || 1,
          per_page: response.per_page || response.meta?.per_page || prev.per_page
        }));
      }

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
      setErrors({ payment_amount: t('pending_payments_screen.validation.payment_amount_required') });
      return;
    }

    const paymentAmount = parseFloat(approveForm.payment_amount);
    const finalAmount = parseFloat(selectedBatch.final_amount || selectedBatch.total_amount || 0);

    // Check if payment amount matches (allow small difference for rounding)
    if (Math.abs(paymentAmount - finalAmount) > 0.01) {
      setErrors({ payment_amount: t('pending_payments_screen.validation.payment_amount_mismatch', { amount: `$${finalAmount.toFixed(2)}` }) });
      return;
    }

    setApproving(true);
    setErrors({});

    try {
      await accAPI.approvePayment(selectedBatch.id, { payment_amount: paymentAmount });
      await loadPendingPayments();
      setApproveModalOpen(false);
      setDetailModalOpen(false);
      setSelectedBatch(null);
      alert(t('pending_payments_screen.messages.approve_success'));
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
        setErrors({ general: t('pending_payments_screen.messages.approve_failed') });
      }
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!selectedBatch) return;

    if (!rejectForm.rejection_reason || rejectForm.rejection_reason.trim().length === 0) {
      setErrors({ rejection_reason: t('pending_payments_screen.validation.rejection_reason_required') });
      return;
    }

    if (rejectForm.rejection_reason.trim().length > 1000) {
      setErrors({ rejection_reason: t('pending_payments_screen.validation.rejection_reason_max') });
      return;
    }

    setRejecting(true);
    setErrors({});

    try {
      await accAPI.rejectPayment(selectedBatch.id, { rejection_reason: rejectForm.rejection_reason.trim() });
      await loadPendingPayments();
      setRejectModalOpen(false);
      setDetailModalOpen(false);
      setSelectedBatch(null);
      alert(t('pending_payments_screen.messages.reject_success'));
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
        setErrors({ general: t('pending_payments_screen.messages.reject_failed') });
      }
    } finally {
      setRejecting(false);
    }
  };

  const formatCurrency = (amount) => {
    return `$${parseFloat(amount || 0).toFixed(2)}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return t('pending_payments_screen.common.na');
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
      header: t('pending_payments_screen.table.training_center'),
      accessor: 'training_center',
      sortable: true,
      render: (value, row) => (
        <div className="batch-tc-container">
          <Building2 className="batch-tc-icon" size={16} />
          <span>{row.training_center?.name || t('pending_payments_screen.common.na')}</span>
        </div>
      ),
    },
    {
      header: t('pending_payments_screen.table.course'),
      accessor: 'course',
      sortable: true,
      render: (value, row) => (
        <div className="batch-course-container">
          <BookOpen className="batch-course-icon" size={16} />
          <span>{row.course?.name || t('pending_payments_screen.common.na')}</span>
        </div>
      ),
    },
    {
      header: t('pending_payments_screen.table.quantity'),
      accessor: 'quantity',
      sortable: true,
      render: (value) => <span>{value || 0}</span>,
    },
    {
      header: t('pending_payments_screen.table.total_amount'),
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
      header: t('pending_payments_screen.table.payment_amount'),
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
      header: t('pending_payments_screen.table.submitted_date'),
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
      header: t('pending_payments_screen.table.actions'),
      accessor: 'actions',
      sortable: false,
      render: (value, row) => (
        <div className="batch-actions">
          <button
            onClick={() => handleViewDetails(row)}
            className="action-btn action-btn-view"
            title={t('pending_payments_screen.actions.view_details')}
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
              <p className="empty-state-title">{t('pending_payments_screen.table.empty_title')}</p>
              <p className="empty-state-subtitle">{t('pending_payments_screen.table.empty_subtitle')}</p>
            </div>
          ) : t('pending_payments_screen.table.empty')
        }
        searchable={true}
        searchValue={searchTerm}
        onSearch={handleSearch}
        filterable={false}
        searchPlaceholder={t('pending_payments_screen.search.placeholder')}
        sortable={true}
      />
      <div className="p-4 border-t border-gray-100">
        <Pagination
          currentPage={pagination.current_page}
          totalPages={pagination.last_page}
          totalItems={pagination.total}
          perPage={pagination.per_page}
          onPageChange={handlePageChange}
        />
      </div>

      {/* Detail Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedBatch(null);
        }}
        title={t('pending_payments_screen.details.modal_title')}
        size="lg"
      >
        {selectedBatch && (
          <div className="space-y-6">
            <DetailForm
              data={selectedBatch}
              fields={[
                {
                  key: 'training_center',
                  label: t('pending_payments_screen.details.training_center'),
                  icon: Building2,
                  render: (value) => value?.name || t('pending_payments_screen.common.na')
                },
                {
                  key: 'course',
                  label: t('pending_payments_screen.details.course'),
                  icon: BookOpen,
                  render: (value) => value?.name || t('pending_payments_screen.common.na')
                },
                { key: 'quantity', label: t('pending_payments_screen.details.quantity'), render: (value) => `${value || 0} codes` },
                {
                  key: 'total_amount',
                  label: t('pending_payments_screen.details.total_amount'),
                  icon: DollarSign,
                  render: (value) => formatCurrency(value)
                },
                {
                  key: 'payment_amount',
                  label: t('pending_payments_screen.details.payment_amount'),
                  icon: DollarSign,
                  render: (value) => formatCurrency(value),
                  showEmpty: false
                },
                {
                  key: 'final_amount',
                  label: t('pending_payments_screen.details.final_amount'),
                  icon: DollarSign,
                  render: (value) => formatCurrency(value),
                  showEmpty: false
                },
                { key: 'created_at', label: t('pending_payments_screen.details.submitted_date'), type: 'datetime', icon: Calendar },
                { key: 'updated_at', label: t('pending_payments_screen.details.updated_at'), type: 'datetime', icon: Calendar, showEmpty: false },
              ]}
            />

            {selectedBatch.payment_receipt_url && (
              <div className="receipt-section">
                <h3 className="receipt-title">
                  <FileText size={20} className="receipt-icon" />
                  {t('pending_payments_screen.details.receipt')}
                </h3>
                <div className="receipt-container">
                  <a
                    href={selectedBatch.payment_receipt_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="receipt-link"
                  >
                    {t('pending_payments_screen.details.view_receipt')}
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
                {t('pending_payments_screen.actions.approve_payment')}
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
                {t('pending_payments_screen.actions.reject_payment')}
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
        title={t('pending_payments_screen.approve.modal_title')}
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
                <strong>{t('pending_payments_screen.approve.training_center')}:</strong> {selectedBatch.training_center?.name || t('pending_payments_screen.common.na')}
              </p>
              <p className="approve-info-text">
                <strong>{t('pending_payments_screen.approve.course')}:</strong> {selectedBatch.course?.name || t('pending_payments_screen.common.na')}
              </p>
              <p className="approve-info-text">
                <strong>{t('pending_payments_screen.approve.quantity')}:</strong> {selectedBatch.quantity || 0} codes
              </p>
              <p className="approve-info-text">
                <strong>{t('pending_payments_screen.approve.calculated_total')}:</strong> {formatCurrency(selectedBatch.final_amount || selectedBatch.total_amount)}
              </p>
            </div>

            <FormInput
              label={t('pending_payments_screen.approve.payment_amount')}
              name="payment_amount"
              type="number"
              value={approveForm.payment_amount}
              onChange={(e) => setApproveForm({ ...approveForm, payment_amount: e.target.value })}
              required
              min="0"
              step="0.01"
              error={errors.payment_amount}
              helpText={t('pending_payments_screen.approve.payment_amount_help', { amount: formatCurrency(selectedBatch.final_amount || selectedBatch.total_amount) })}
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
                {t('pending_payments_screen.common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleApprove}
                disabled={approving}
                className="form-btn form-btn-submit"
              >
                {approving ? t('pending_payments_screen.approve.submitting') : t('pending_payments_screen.approve.submit')}
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
        title={t('pending_payments_screen.reject.modal_title')}
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
                <strong>{t('pending_payments_screen.reject.training_center')}:</strong> {selectedBatch.training_center?.name || t('pending_payments_screen.common.na')}
              </p>
              <p className="reject-info-text">
                <strong>{t('pending_payments_screen.reject.course')}:</strong> {selectedBatch.course?.name || t('pending_payments_screen.common.na')}
              </p>
              <p className="reject-info-text">
                <strong>{t('pending_payments_screen.reject.quantity')}:</strong> {selectedBatch.quantity || 0} codes
              </p>
              <p className="reject-info-text">
                <strong>{t('pending_payments_screen.reject.amount')}:</strong> {formatCurrency(selectedBatch.payment_amount || selectedBatch.total_amount)}
              </p>
            </div>

            <FormInput
              label={t('pending_payments_screen.reject.rejection_reason')}
              name="rejection_reason"
              type="textarea"
              textarea={true}
              rows={4}
              value={rejectForm.rejection_reason}
              onChange={(e) => setRejectForm({ ...rejectForm, rejection_reason: e.target.value })}
              required
              error={errors.rejection_reason}
              helpText={t('pending_payments_screen.reject.rejection_help')}
              placeholder={t('pending_payments_screen.reject.rejection_placeholder')}
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
                {t('pending_payments_screen.common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={rejecting}
                className="form-btn form-btn-danger"
              >
                {rejecting ? t('pending_payments_screen.reject.submitting') : t('pending_payments_screen.reject.submit')}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PendingPaymentsScreen;

