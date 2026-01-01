import { useEffect, useState, useMemo } from 'react';
import { trainingCenterAPI } from '../../../services/api';
import { useHeader } from '../../../context/HeaderContext';
import { DollarSign, Receipt, Eye, Building2, User, ArrowDownCircle, ArrowUpCircle, Calendar, Search, Filter } from 'lucide-react';
import Modal from '../../../components/Modal/Modal';
import DataTable from '../../../components/DataTable/DataTable';
import TabCard from '../../../components/TabCard/TabCard';
import './PaymentTransactionsScreen.css';

const PaymentTransactionsScreen = () => {
  const { setHeaderTitle, setHeaderSubtitle } = useHeader();
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    setHeaderTitle('Payment Transactions');
    setHeaderSubtitle('View all payment transactions');
    return () => {
      setHeaderTitle(null);
      setHeaderSubtitle(null);
    };
  }, [setHeaderTitle, setHeaderSubtitle]);

  useEffect(() => {
    loadTransactions();
  }, []); // Load all data once, filtering is handled client-side by DataTable

  const loadTransactions = async () => {
    setLoading(true);
    try {
      // Note: typeFilter, statusFilter, and pagination are now handled client-side by DataTable
      const response = await trainingCenterAPI.getPaymentTransactions({});
      const data = response?.data || response || [];
      const summaryData = response?.summary || null;
      
      setTransactions(Array.isArray(data) ? data : (data?.data || []));
      setSummary(summaryData);
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

  // Add searchable text to each transaction for better search functionality
  const transactionsWithSearchText = useMemo(() => {
    return transactions.map(transaction => {
      const type = transaction.transaction_type || '';
      const amount = String(transaction.amount || '');
      const currency = transaction.currency || '';
      const status = transaction.status || '';
      const description = transaction.description || '';
      const payerName = transaction.payer?.name || '';
      const payeeName = transaction.payee?.name || '';
      
      const searchText = [
        type,
        amount,
        currency,
        status,
        description,
        payerName,
        payeeName,
      ].filter(Boolean).join(' ').toLowerCase();
      
      return {
        ...transaction,
        _searchText: searchText,
      };
    });
  }, [transactions]);

  // Filter transactions by search, type, and status
  const filteredTransactions = useMemo(() => {
    let filtered = [...transactionsWithSearchText];

    // Apply type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(transaction => transaction.transaction_type === typeFilter);
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(transaction => transaction.status === statusFilter);
    }

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(transaction => {
        // Prioritize _searchText if available
        if (transaction._searchText) {
          return transaction._searchText.includes(searchLower);
        }
        return true;
      });
    }

    return filtered;
  }, [transactionsWithSearchText, typeFilter, statusFilter, searchTerm]);

  // Define columns for DataTable
  const columns = useMemo(() => [
    {
      header: 'Type',
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
      header: 'Payer',
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
              <div className="payer-payee-name">{row.payer.name || 'N/A'}</div>
              <div className="payer-payee-type">{row.payer.type || ''}</div>
            </div>
          </div>
        ) : (
          <span className="payer-payee-na">N/A</span>
        )
      ),
    },
    {
      header: 'Payee',
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
              <div className="payer-payee-name">{row.payee.name || 'N/A'}</div>
              <div className="payer-payee-type">{row.payee.type || ''}</div>
            </div>
          </div>
        ) : (
          <span className="payer-payee-na">N/A</span>
        )
      ),
    },
    {
      header: 'Amount',
      accessor: 'amount',
      sortable: true,
      render: (value, row) => (
        <div className={`amount-column ${isReceived(row) ? 'received' : 'sent'}`}>
          {isReceived(row) ? '+' : '-'} {formatCurrency(row.amount, row.currency)}
        </div>
      ),
    },
    {
      header: 'Status',
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
            {row.status?.charAt(0).toUpperCase() + row.status?.slice(1) || 'N/A'}
          </span>
        );
      },
    },
    {
      header: 'Date',
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
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTransactionTypeLabel = (type) => {
    return type?.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') || 'N/A';
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
      return <span className="info-section-value">N/A</span>;
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
      return <span className="info-section-value">No additional details</span>;
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
            displayValue = 'N/A';
          } else if (typeof value === 'boolean') {
            displayValue = value ? 'Yes' : 'No';
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
            name="Total Transactions"
            value={summary.total_transactions || 0}
            icon={Receipt}
            colorType="indigo"
          />
          <TabCard
            name="Total Spent"
            value={formatCurrency(summary.total_spent || 0)}
            icon={ArrowUpCircle}
            colorType="red"
          />
          {/* <TabCard
            name="Total Received"
            value={formatCurrency(summary.total_received || 0)}
            icon={ArrowDownCircle}
            colorType="green"
          /> */}
        </div>
      )}


      {/* Search and Filters Section */}
      <div className="search-filters-section">
        <div className="search-filters-container">
          {/* Search */}
          <div className="search-input-container">
            <Search className="search-icon" size={20} />
            <input
              type="text"
              placeholder="Search by type, amount, status, payer, payee..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          {/* Type Filter */}
          <div className="filter-container">
            <Filter className="filter-icon" size={20} />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Types</option>
              <option value="code_purchase">Code Purchase</option>
              <option value="course_purchase">Course Purchase</option>
              <option value="instructor_authorization">Instructor Authorization</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="filter-container">
            <Filter className="filter-icon" size={20} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transactions DataTable */}
      <div className="datatable-container">
        <DataTable
          columns={columns}
          data={filteredTransactions}
          onView={handleViewDetails}
          onRowClick={handleViewDetails}
          isLoading={loading}
          emptyMessage={
            transactions.length === 0 && !loading ? (
              <div className="empty-state">
                <div className="empty-state-icon">
                  <Receipt className="text-gray-400" size={32} />
                </div>
                <p className="empty-state-text">No transactions found</p>
                <p className="empty-state-subtext">No transactions available</p>
              </div>
            ) : 'No transactions found matching your filters'
          }
          searchable={false}
          filterable={false}
          sortable={true}
        />
      </div>

      {/* Transaction Detail Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedTransaction(null);
        }}
        title="Transaction Details"
        size="lg"
      >
        {selectedTransaction && (
          <div className="modal-content">
            {/* Basic Info */}
            <div className="modal-grid">
              <div className="modal-info-box">
                <p className="modal-label">Transaction Type</p>
                <p className="modal-value">{getTransactionTypeLabel(selectedTransaction.transaction_type)}</p>
              </div>
              <div className="modal-info-box">
                <p className="modal-label">Status</p>
                <span className={`status-badge ${selectedTransaction.status === 'completed' ? 'completed' : selectedTransaction.status === 'pending' ? 'pending' : selectedTransaction.status === 'failed' ? 'failed' : 'refunded'}`}>
                  {selectedTransaction.status?.charAt(0).toUpperCase() + selectedTransaction.status?.slice(1) || 'N/A'}
                </span>
              </div>
              <div className="modal-info-box">
                <p className="modal-label">Amount</p>
                <p className={`modal-amount ${isReceived(selectedTransaction) ? 'received' : 'sent'}`}>
                  {isReceived(selectedTransaction) ? '+' : '-'} {formatCurrency(selectedTransaction.amount, selectedTransaction.currency)}
                </p>
              </div>
              <div className="modal-info-box">
                <p className="modal-label">Payment Method</p>
                <p className="modal-value capitalize">{selectedTransaction.payment_method?.replace('_', ' ') || 'N/A'}</p>
              </div>
            </div>

            {/* Payer Info */}
            {selectedTransaction.payer && (
              <div className="payer-info-section">
                <p className="info-section-title payer">Payer Information</p>
                <div className="info-section-content">
                  <div className="info-section-row">
                    <Building2 className="info-section-icon payer" size={16} />
                    <span className="info-section-label">Name:</span>
                    <span className="info-section-value">{selectedTransaction.payer.name}</span>
                  </div>
                  {selectedTransaction.payer.email && (
                    <div className="info-section-row">
                      <span className="info-section-label">Email:</span>
                      <span className="info-section-value">{selectedTransaction.payer.email}</span>
                    </div>
                  )}
                  <div className="info-section-row">
                    <span className="info-section-label">Type:</span>
                    <span className="info-section-value">{selectedTransaction.payer.type}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Payee Info */}
            {selectedTransaction.payee && (
              <div className="payee-info-section">
                <p className="info-section-title payee">Payee Information</p>
                <div className="info-section-content">
                  <div className="info-section-row">
                    <Building2 className="info-section-icon payee" size={16} />
                    <span className="info-section-label">Name:</span>
                    <span className="info-section-value">{selectedTransaction.payee.name}</span>
                  </div>
                  {selectedTransaction.payee.email && (
                    <div className="info-section-row">
                      <span className="info-section-label">Email:</span>
                      <span className="info-section-value">{selectedTransaction.payee.email}</span>
                    </div>
                  )}
                  <div className="info-section-row">
                    <span className="info-section-label">Type:</span>
                    <span className="info-section-value">{selectedTransaction.payee.type}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Description */}
            {selectedTransaction.description && (
              <div className="description-section">
                <p className="modal-label">Description</p>
                <p className="description-text">{selectedTransaction.description}</p>
              </div>
            )}

            {/* Reference */}
            {selectedTransaction.reference && (
              <div className="reference-section">
                <p className="reference-title">Reference Information</p>
                <div className="reference-content">
                  <div className="reference-type-row">
                    <span className="info-section-label">Type:</span>
                    <span className="info-section-value" style={{ marginLeft: '0.5rem' }}>
                      {selectedTransaction.reference.type
                        ?.split('_')
                        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(' ') || 'N/A'}
                    </span>
                  </div>
                  {selectedTransaction.reference.details && (
                    <div className="reference-details-box">
                      <p className="reference-details-title">Details:</p>
                      {renderReferenceDetails(selectedTransaction.reference.details)}
                    </div>
                  )}
                </div>
              </div>
            )}


            {/* Dates */}
            <div className="modal-grid">
              <div className="modal-info-box">
                <p className="modal-label">Created At</p>
                <p className="modal-value">{formatDateTime(selectedTransaction.created_at)}</p>
              </div>
              {selectedTransaction.completed_at && (
                <div className="modal-info-box">
                  <p className="modal-label">Completed At</p>
                  <p className="modal-value">{formatDateTime(selectedTransaction.completed_at)}</p>
                </div>
              )}
            </div>

            {/* Payment Gateway Transaction ID */}
            {selectedTransaction.payment_gateway_transaction_id && (
              <div className="payment-gateway-section">
                <p className="modal-label">Payment Gateway Transaction ID</p>
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

