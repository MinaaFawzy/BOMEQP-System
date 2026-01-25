import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { trainingCenterAPI } from '../../../services/api';
import { useHeader } from '../../../context/HeaderContext';
import { DollarSign, Receipt, Eye, Building2, User, ArrowDownCircle, ArrowUpCircle, Calendar, Search, Filter } from 'lucide-react';
import Modal from '../../../components/Modal/Modal';
import DataTable from '../../../components/DataTable/DataTable';
import TabCard from '../../../components/TabCard/TabCard';
import Pagination from '../../../components/Pagination/Pagination';
import './PaymentTransactionsScreen.css';

const PaymentTransactionsScreen = () => {
  const { t } = useTranslation('training_center');
  const { setHeaderTitle, setHeaderSubtitle } = useHeader();
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  // Pagination State
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1); // Reset to first page on search
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setHeaderTitle(t('payment_transactions_screen.header.title'));
    setHeaderSubtitle(t('payment_transactions_screen.header.subtitle'));
    return () => {
      setHeaderTitle(null);
      setHeaderSubtitle(null);
    };
  }, [setHeaderTitle, setHeaderSubtitle]);

  // Load transactions when dependencies change
  useEffect(() => {
    loadTransactions(page, perPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, perPage, debouncedSearch, typeFilter, statusFilter]);

  const loadTransactions = async (pageArg = 1, limitArg = 10) => {
    setLoading(true);
    try {
      // Build query parameters
      const params = {
        page: pageArg,
        per_page: limitArg
      };

      // Add search if there's a value
      if (debouncedSearch) {
        params.search = debouncedSearch;
      }

      // Add type filter if not 'all'
      if (typeFilter !== 'all') {
        params.type = typeFilter;
      }

      // Add status filter if not 'all'
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      const response = await trainingCenterAPI.getPaymentTransactions(params);
      const data = response?.data || response || [];
      const summaryData = response?.summary || null;

      const transactionsArray = Array.isArray(data) ? data : (data?.data || []);
      setTransactions(transactionsArray);
      setSummary(summaryData);

      // Update pagination info
      if (response && (response.total || response.data?.total)) {
        const total = response.total || response.data?.total || transactionsArray.length;
        setTotalItems(total);
        const lastPage = response.last_page || response.data?.last_page || Math.ceil(total / limitArg) || 1;
        setTotalPages(lastPage);
      }
    } catch (error) {
      console.error('Failed to load transactions:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Unknown error';
      console.error('Error details:', error);
      setTransactions([]);
      setSummary(null);
      // Don't show alert, just log - let user see empty state
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (transaction) => {
    setSelectedTransaction(transaction);
    setDetailModalOpen(true);
  };

  // Remove client-side filtering - now using server-side

  // Define columns for DataTable
  const columns = useMemo(() => [
    {
      header: t('payment_transactions_screen.table.type'),
      accessor: 'transaction_type',
      sortable: true,
      render: (value, row) => {
        const received = isReceived(row);
        return (
          <div className="type-column">
            <div className={`type-icon-container ${received ? 'received' : 'sent'}`}>
              {received ? (
                <ArrowDownCircle className="type-icon received" size={20} />
              ) : (
                <ArrowUpCircle className="type-icon sent" size={20} />
              )}
            </div>
            <div>
              <div className="type-label">
                {getTransactionTypeLabel(row.transaction_type)}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      header: t('payment_transactions_screen.table.payer'),
      accessor: 'payer',
      sortable: true,
      render: (value, row) => (
        row.payer ? (
          <div className="payer-payee-column">
            <div className="payer-payee-avatar payer">
              {row.payer.type === 'acc' || row.payer.type === 'training_center' ? (
                <Building2 className="payer-payee-icon payer" size={16} />
              ) : (
                <User className="payer-payee-icon payer" size={16} />
              )}
            </div>
            <div>
              <div className="payer-payee-name">{row.payer.name || t('payment_transactions_screen.status.na')}</div>
              <div className="payer-payee-type">{row.payer.type || ''}</div>
            </div>
          </div>
        ) : (
          <span className="payer-payee-na">{t('payment_transactions_screen.status.na')}</span>
        )
      ),
    },
    {
      header: t('payment_transactions_screen.table.payee'),
      accessor: 'payee',
      sortable: true,
      render: (value, row) => (
        row.payee ? (
          <div className="payer-payee-column">
            <div className="payer-payee-avatar payee">
              {row.payee.type === 'acc' || row.payee.type === 'training_center' ? (
                <Building2 className="payer-payee-icon payee" size={16} />
              ) : (
                <User className="payer-payee-icon payee" size={16} />
              )}
            </div>
            <div>
              <div className="payer-payee-name">{row.payee.name || t('payment_transactions_screen.status.na')}</div>
              <div className="payer-payee-type">{row.payee.type || ''}</div>
            </div>
          </div>
        ) : (
          <span className="payer-payee-na">{t('payment_transactions_screen.status.na')}</span>
        )
      ),
    },
    {
      header: t('payment_transactions_screen.table.amount'),
      accessor: 'amount',
      sortable: true,
      render: (value, row) => (
        <div className={`amount-column ${isReceived(row) ? 'received' : 'sent'}`}>
          {isReceived(row) ? '+' : '-'} {formatCurrency(row.amount, row.currency)}
        </div>
      ),
    },
    {
      header: t('payment_transactions_screen.table.status'),
      accessor: 'status',
      sortable: true,
      render: (value, row) => {
        const status = row.status || '';
        const statusClass = status === 'completed' ? 'completed' :
          status === 'pending' ? 'pending' :
            status === 'failed' ? 'failed' :
              status === 'refunded' ? 'refunded' : 'refunded';
        return (
          <span className={`status-badge ${statusClass}`}>
            {t(`payment_transactions_screen.status.${row.status}`) || t('payment_transactions_screen.status.na')}
          </span>
        );
      },
    },
    {
      header: t('payment_transactions_screen.table.date'),
      accessor: 'created_at',
      sortable: true,
      render: (value, row) => (
        <div className="date-column">
          <Calendar className="date-icon" size={16} />
          {formatDate(row.created_at)}
        </div>
      ),
    },
  ], []);

  const formatCurrency = (amount, currency = 'USD') => {
    return `${parseFloat(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return t('payment_transactions_screen.status.na');
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return t('payment_transactions_screen.status.na');
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTransactionTypeLabel = (type) => {
    if (!type) return t('payment_transactions_screen.status.na');
    return t(`payment_transactions_screen.transaction_type.${type}`) || type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const isReceived = (transaction) => {
    return transaction.payee && transaction.payee.type === 'training_center';
  };

  // Fields that are already displayed elsewhere in the modal - exclude from reference details
  const excludedFields = [
    'transaction_type',
    'status',
    'amount',
    'currency',
    'payment_method',
    'description',
    'created_at',
    'completed_at',
    'payment_gateway_transaction_id',
    'payer',
    'payee',
    'reference', // Don't show reference within reference
  ];

  // Check if an object contains payer/payee data that's already shown
  const hasPayerPayeeData = (obj) => {
    if (!obj || typeof obj !== 'object') return false;
    const payerPayeeFields = ['name', 'email', 'type', 'id'];
    return payerPayeeFields.some(field => obj.hasOwnProperty(field));
  };

  // Render reference details in a user-friendly format, excluding duplicated data
  const renderReferenceDetails = (details, parentKey = '') => {
    if (!details || typeof details !== 'object') {
      return <span className="info-section-value">{t('payment_transactions_screen.status.na')}</span>;
    }

    // Handle array of objects
    if (Array.isArray(details)) {
      return (
        <div className="reference-details-list">
          {details.map((item, index) => (
            <div key={index} className="reference-details-item">
              {renderReferenceDetails(item, `${parentKey}[${index}]`)}
            </div>
          ))}
        </div>
      );
    }

    // Handle object
    const filteredEntries = Object.entries(details).filter(([key]) => {
      // Exclude fields that are already shown in the modal
      if (excludedFields.includes(key)) {
        return false;
      }

      // Exclude payer/payee objects if they only contain name, email, type, id
      const value = details[key];
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        if (hasPayerPayeeData(value) && Object.keys(value).every(k => ['name', 'email', 'type', 'id'].includes(k))) {
          return false;
        }
      }

      return true;
    });

    // If all fields were filtered out, show nothing
    if (filteredEntries.length === 0) {
      return <span className="info-section-value">{t('payment_transactions_screen.modal.no_additional_details')}</span>;
    }

    return (
      <div className="reference-details-grid">
        {filteredEntries.map(([key, value]) => {
          // Format the key (convert snake_case to Title Case)
          const formattedKey = key
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');

          // Handle different value types
          let displayValue = value;
          if (value === null || value === undefined) {
            displayValue = t('payment_transactions_screen.status.na');
          } else if (typeof value === 'boolean') {
            displayValue = value ? t('payment_transactions_screen.common.yes') : t('payment_transactions_screen.common.no');
          } else if (typeof value === 'object') {
            // Recursively render nested objects, but filter out payer/payee data
            if (Array.isArray(value)) {
              return (
                <div key={key} className="reference-details-nested">
                  <span className="reference-details-nested-key">{formattedKey}:</span>
                  <div className="reference-details-nested-value">
                    {renderReferenceDetails(value, key)}
                  </div>
                </div>
              );
            } else if (hasPayerPayeeData(value) && Object.keys(value).every(k => ['name', 'email', 'type', 'id'].includes(k))) {
              // Skip payer/payee objects that are already shown
              return null;
            } else {
              return (
                <div key={key} className="reference-details-nested">
                  <span className="reference-details-nested-key">{formattedKey}:</span>
                  <div className="reference-details-nested-value">
                    {renderReferenceDetails(value, key)}
                  </div>
                </div>
              );
            }
          } else if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
            // Format date strings
            displayValue = formatDateTime(value);
          }

          return (
            <div key={key} className="reference-details-row">
              <span className="reference-details-label">{formattedKey}:</span>
              <span className="reference-details-value">{String(displayValue)}</span>
            </div>
          );
        }).filter(Boolean)}
      </div>
    );
  };

  return (
    <div className="payment-transactions-container">
      {/* Summary Cards using TabCard */}
      {summary && (
        <div className="summary-cards-grid">
          <TabCard
            name={t('payment_transactions_screen.summary.total_transactions')}
            value={summary.total_transactions || 0}
            icon={Receipt}
            colorType="indigo"
          />
          <TabCard
            name={t('payment_transactions_screen.summary.total_spent')}
            value={formatCurrency(summary.total_spent || 0)}
            icon={ArrowUpCircle}
            colorType="red"
          />
          {/* <TabCard
            name={t('payment_transactions_screen.summary.total_received')}
            value={formatCurrency(summary.total_received || 0)}
            icon={ArrowDownCircle}
            colorType="green"
          /> */}
        </div>
      )}


      {/* Transactions DataTable */}
      <div className="datatable-container">
        <DataTable
          columns={columns}
          data={transactions}
          onView={handleViewDetails}
          onRowClick={handleViewDetails}
          isLoading={loading}
          searchable={true}
          searchValue={searchTerm}
          onSearch={(value) => setSearchTerm(value)}
          emptyMessage={
            transactions.length === 0 && !loading ? (
              <div className="empty-state">
                <div className="empty-state-icon">
                  <Receipt className="text-gray-400" size={32} />
                </div>
                <p className="empty-state-text">{t('payment_transactions_screen.table.empty')}</p>
                <p className="empty-state-subtext">{t('payment_transactions_screen.table.empty_subtitle')}</p>
              </div>
            ) : t('payment_transactions_screen.table.empty_filtered')
          }
          filterable={false}
          sortable={true}
          customFilters={
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              {/* Type Filter */}
              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setPage(1);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none bg-white cursor-pointer transition-all text-sm"
                style={{ minWidth: '150px' }}
              >
                <option value="all">{t('payment_transactions_screen.filters.type.all')}</option>
                <option value="subscription">{t('payment_transactions_screen.filters.type.subscription') || 'Subscription'}</option>
                <option value="code_purchase">{t('payment_transactions_screen.filters.type.code_purchase')}</option>
                <option value="course_purchase">{t('payment_transactions_screen.filters.type.course_purchase')}</option>
                <option value="instructor_authorization">{t('payment_transactions_screen.filters.type.instructor_authorization')}</option>
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none bg-white cursor-pointer transition-all text-sm"
                style={{ minWidth: '150px' }}
              >
                <option value="all">{t('payment_transactions_screen.filters.status.all')}</option>
                <option value="pending">{t('payment_transactions_screen.filters.status.pending')}</option>
                <option value="completed">{t('payment_transactions_screen.filters.status.completed')}</option>
                <option value="failed">{t('payment_transactions_screen.filters.status.failed')}</option>
                <option value="refunded">{t('payment_transactions_screen.filters.status.refunded')}</option>
              </select>
            </div>
          }
        />
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={totalItems}
          perPage={perPage}
          onPageChange={setPage}
          onPerPageChange={(newPerPage) => {
            setPerPage(newPerPage);
            setPage(1);
          }}
        />
      </div>

      {/* Transaction Detail Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedTransaction(null);
        }}
        title={t('payment_transactions_screen.modal.title')}
        size="lg"
      >
        {selectedTransaction && (
          <div className="modal-content">
            {/* Basic Info */}
            <div className="modal-grid">
              <div className="modal-info-box">
                <p className="modal-label">{t('payment_transactions_screen.modal.transaction_type')}</p>
                <p className="modal-value">{getTransactionTypeLabel(selectedTransaction.transaction_type)}</p>
              </div>
              <div className="modal-info-box">
                <p className="modal-label">{t('payment_transactions_screen.table.status')}</p>
                <span className={`status-badge ${selectedTransaction.status === 'completed' ? 'completed' : selectedTransaction.status === 'pending' ? 'pending' : selectedTransaction.status === 'failed' ? 'failed' : 'refunded'}`}>
                  {t(`payment_transactions_screen.status.${selectedTransaction.status}`) || t('payment_transactions_screen.status.na')}
                </span>
              </div>
              <div className="modal-info-box">
                <p className="modal-label">{t('payment_transactions_screen.table.amount')}</p>
                <p className={`modal-amount ${isReceived(selectedTransaction) ? 'received' : 'sent'}`}>
                  {isReceived(selectedTransaction) ? '+' : '-'} {formatCurrency(selectedTransaction.amount, selectedTransaction.currency)}
                </p>
              </div>
              <div className="modal-info-box">
                <p className="modal-label">{t('payment_transactions_screen.modal.payment_method')}</p>
                <p className="modal-value capitalize">{selectedTransaction.payment_method?.replace('_', ' ') || t('payment_transactions_screen.status.na')}</p>
              </div>
            </div>

            {/* Payer Info */}
            {selectedTransaction.payer && (
              <div className="payer-info-section">
                <p className="info-section-title payer">{t('payment_transactions_screen.modal.payer_info')}</p>
                <div className="info-section-content">
                  <div className="info-section-row">
                    <Building2 className="info-section-icon payer" size={16} />
                    <span className="info-section-label">{t('payment_transactions_screen.modal.name')}:</span>
                    <span className="info-section-value">{selectedTransaction.payer.name}</span>
                  </div>
                  {selectedTransaction.payer.email && (
                    <div className="info-section-row">
                      <span className="info-section-label">{t('payment_transactions_screen.modal.email')}:</span>
                      <span className="info-section-value">{selectedTransaction.payer.email}</span>
                    </div>
                  )}
                  <div className="info-section-row">
                    <span className="info-section-label">{t('payment_transactions_screen.modal.type')}:</span>
                    <span className="info-section-value">{selectedTransaction.payer.type}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Payee Info */}
            {selectedTransaction.payee && (
              <div className="payee-info-section">
                <p className="info-section-title payee">{t('payment_transactions_screen.modal.payee_info')}</p>
                <div className="info-section-content">
                  <div className="info-section-row">
                    <Building2 className="info-section-icon payee" size={16} />
                    <span className="info-section-label">{t('payment_transactions_screen.modal.name')}:</span>
                    <span className="info-section-value">{selectedTransaction.payee.name}</span>
                  </div>
                  {selectedTransaction.payee.email && (
                    <div className="info-section-row">
                      <span className="info-section-label">{t('payment_transactions_screen.modal.email')}:</span>
                      <span className="info-section-value">{selectedTransaction.payee.email}</span>
                    </div>
                  )}
                  <div className="info-section-row">
                    <span className="info-section-label">{t('payment_transactions_screen.modal.type')}:</span>
                    <span className="info-section-value">{selectedTransaction.payee.type}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Description */}
            {selectedTransaction.description && (
              <div className="description-section">
                <p className="modal-label">{t('payment_transactions_screen.modal.description')}</p>
                <p className="description-text">{selectedTransaction.description}</p>
              </div>
            )}

            {/* Reference */}
            {selectedTransaction.reference && (
              <div className="reference-section">
                <p className="reference-title">{t('payment_transactions_screen.modal.reference_info')}</p>
                <div className="reference-content">
                  <div className="reference-type-row">
                    <span className="info-section-label">{t('payment_transactions_screen.modal.reference_type')}:</span>
                    <span className="info-section-value" style={{ marginLeft: '0.5rem' }}>
                      {t(`payment_transactions_screen.transaction_type.${selectedTransaction.reference.type}`) || selectedTransaction.reference.type
                        ?.split('_')
                        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(' ') || t('payment_transactions_screen.status.na')}
                    </span>
                  </div>
                  {selectedTransaction.reference.details && (
                    <div className="reference-details-box">
                      <p className="reference-details-title">{t('payment_transactions_screen.modal.reference_details')}:</p>
                      {renderReferenceDetails(selectedTransaction.reference.details)}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Transfer Information - Automatic Transfer System */}
            {selectedTransaction.transfer && (
              <div className="transfer-info-section">
                <p className="info-section-title transfer">{t('payment_transactions_screen.modal.transfer_info')}</p>
                <div className="info-section-content">
                  <div className="transfer-breakdown">
                    <div className="transfer-row">
                      <span className="transfer-label">{t('payment_transactions_screen.modal.gross_amount')}:</span>
                      <span className="transfer-value gross">{formatCurrency(selectedTransaction.transfer.gross_amount, selectedTransaction.currency)}</span>
                    </div>
                    <div className="transfer-row">
                      <span className="transfer-label">{t('payment_transactions_screen.modal.commission')}:</span>
                      <span className="transfer-value commission">-{formatCurrency(selectedTransaction.transfer.commission_amount, selectedTransaction.currency)}</span>
                    </div>
                    <div className="transfer-row net-row">
                      <span className="transfer-label">{t('payment_transactions_screen.modal.net_amount')}:</span>
                      <span className="transfer-value net">{formatCurrency(selectedTransaction.transfer.net_amount, selectedTransaction.currency)}</span>
                    </div>
                  </div>
                  <div className="transfer-status-row">
                    <span className="info-section-label">{t('payment_transactions_screen.modal.transfer_status')}:</span>
                    <span className={`status-badge ${selectedTransaction.transfer.status === 'completed' ? 'completed' : selectedTransaction.transfer.status === 'pending' ? 'pending' : 'failed'}`}>
                      {t(`payment_transactions_screen.status.${selectedTransaction.transfer.status}`) || t('payment_transactions_screen.status.na')}
                    </span>
                  </div>
                  {selectedTransaction.transfer.stripe_transfer_id && (
                    <div className="info-section-row">
                      <span className="info-section-label">{t('payment_transactions_screen.modal.stripe_transfer_id')}:</span>
                      <span className="info-section-value mono">{selectedTransaction.transfer.stripe_transfer_id}</span>
                    </div>
                  )}
                  {selectedTransaction.transfer.completed_at && (
                    <div className="info-section-row">
                      <span className="info-section-label">{t('payment_transactions_screen.modal.transferred_at')}:</span>
                      <span className="info-section-value">{formatDateTime(selectedTransaction.transfer.completed_at)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Dates */}
            <div className="modal-grid">
              <div className="modal-info-box">
                <p className="modal-label">{t('payment_transactions_screen.modal.created_at')}</p>
                <p className="modal-value">{formatDateTime(selectedTransaction.created_at)}</p>
              </div>
              {selectedTransaction.completed_at && (
                <div className="modal-info-box">
                  <p className="modal-label">{t('payment_transactions_screen.modal.completed_at')}</p>
                  <p className="modal-value">{formatDateTime(selectedTransaction.completed_at)}</p>
                </div>
              )}
            </div>

            {/* Payment Gateway Transaction ID */}
            {selectedTransaction.payment_gateway_transaction_id && (
              <div className="payment-gateway-section">
                <p className="modal-label">{t('payment_transactions_screen.modal.payment_gateway_id')}</p>
                <p className="modal-value modal-mono">{selectedTransaction.payment_gateway_transaction_id}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PaymentTransactionsScreen;

