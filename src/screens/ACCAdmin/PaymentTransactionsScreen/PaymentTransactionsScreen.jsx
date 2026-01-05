import { useEffect, useState, useMemo, useRef } from 'react';
import { accAPI } from '../../../services/api';
import { useHeader } from '../../../context/HeaderContext';
import { Receipt, Eye, Building2, User, ArrowDownCircle, ArrowUpCircle, Filter } from 'lucide-react';
import Modal from '../../../components/Modal/Modal';
import TabCard from '../../../components/TabCard/TabCard';
import TabCardsGrid from '../../../components/TabCardsGrid/TabCardsGrid';
import DataTable from '../../../components/DataTable/DataTable';
import './PaymentTransactionsScreen.css';

const PaymentTransactionsScreen = () => {
  const { setHeaderTitle, setHeaderSubtitle } = useHeader();
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [typeFilter, setTypeFilter] = useState('all');
  const [showTypeFilters, setShowTypeFilters] = useState(false);
  const typeFilterRef = useRef(null);

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
  }, []);

  // Close type filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (typeFilterRef.current && !typeFilterRef.current.contains(event.target)) {
        setShowTypeFilters(false);
      }
    };

    if (showTypeFilters) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showTypeFilters]);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const params = {
        per_page: 1000, // Load all data
      };

      const response = await accAPI.getPaymentTransactions(params);
      const data = response?.data || response || [];
      const summaryData = response?.summary || null;
      
      let transactionsArray = Array.isArray(data) ? data : (data?.data || []);
      
      // Add _searchText for better search functionality
      transactionsArray = transactionsArray.map(transaction => ({
        ...transaction,
        _searchText: [
          transaction.transaction_type,
          transaction.amount,
          transaction.currency,
          transaction.status,
          transaction.description,
          transaction.payer?.name,
          transaction.payee?.name
        ].filter(Boolean).join(' ').toLowerCase()
      }));
      
      setTransactions(transactionsArray);
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

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300';
      case 'pending':
        return 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 border border-yellow-300';
      case 'failed':
        return 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 border border-red-300';
      case 'refunded':
        return 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300';
      default:
        return 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300';
    }
  };

  const getTransactionTypeLabel = (type) => {
    return type?.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') || 'N/A';
  };

  const isReceived = (transaction) => {
    return transaction.payee && transaction.payee.type === 'acc';
  };

  // Define columns for DataTable
  const columns = useMemo(() => [
    {
      header: 'Type',
      accessor: 'transaction_type',
      sortable: true,
      render: (value, row) => (
        <div className="flex items-center">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-3 ${
            isReceived(row)
              ? 'bg-gradient-to-br from-green-100 to-green-200'
              : 'bg-gradient-to-br from-red-100 to-red-200'
          }`}>
            {isReceived(row) ? (
              <ArrowDownCircle className="h-5 w-5 text-green-600" />
            ) : (
              <ArrowUpCircle className="h-5 w-5 text-red-600" />
            )}
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900">
              {getTransactionTypeLabel(value)}
            </div>
          </div>
        </div>
      )
    },
    {
      header: 'Payer',
      accessor: 'payer',
      sortable: true,
      render: (value) => {
        if (!value) return <span className="text-sm text-gray-400">N/A</span>;
        return (
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-2">
              {value.type === 'acc' || value.type === 'training_center' ? (
                <Building2 className="h-4 w-4 text-blue-600" />
              ) : (
                <User className="h-4 w-4 text-blue-600" />
              )}
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900">{value.name || 'N/A'}</div>
              <div className="text-xs text-gray-500 capitalize">{value.type || ''}</div>
            </div>
          </div>
        );
      }
    },
    {
      header: 'Payee',
      accessor: 'payee',
      sortable: true,
      render: (value) => {
        if (!value) return <span className="text-sm text-gray-400">N/A</span>;
        return (
          <div className="flex items-center">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-2">
              {value.type === 'acc' || value.type === 'training_center' ? (
                <Building2 className="h-4 w-4 text-green-600" />
              ) : (
                <User className="h-4 w-4 text-green-600" />
              )}
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900">{value.name || 'N/A'}</div>
              <div className="text-xs text-gray-500 capitalize">{value.type || ''}</div>
            </div>
          </div>
        );
      }
    },
    {
      header: 'Total Amount',
      accessor: 'amount',
      sortable: true,
      render: (value, row) => (
        <div className={`text-sm font-semibold ${isReceived(row) ? 'text-green-700' : 'text-red-700'}`}>
          {isReceived(row) ? '+' : '-'} {formatCurrency(value, row.currency)}
        </div>
      )
    },
    {
      header: 'Received',
      accessor: 'provider_amount',
      sortable: true,
      render: (value, row) => {
        const receivedAmount = value || row.received_amount;
        if (!receivedAmount) return <span className="text-sm text-gray-400">N/A</span>;
        return (
          <div className="text-sm font-semibold text-green-700">
            + {formatCurrency(receivedAmount, row.currency)}
          </div>
        );
      }
    },
    {
      header: 'Commission',
      accessor: 'commission_amount',
      sortable: true,
      render: (value, row) => {
        if (!value) return <span className="text-sm text-gray-400">N/A</span>;
        return (
          <div className="text-sm font-semibold text-amber-700">
            - {formatCurrency(value, row.currency)}
          </div>
        );
      }
    },
    {
      header: 'Status',
      accessor: 'status',
      sortable: true,
      render: (value) => (
        <span className={`px-3 py-1.5 inline-flex text-xs leading-5 font-bold rounded-full shadow-sm ${getStatusBadgeClass(value)}`}>
          {value ? value.charAt(0).toUpperCase() + value.slice(1) : 'N/A'}
        </span>
      )
    },
    {
      header: 'Date',
      accessor: 'created_at',
      sortable: true,
      render: (value) => (
        <div className="text-sm text-gray-600">
          {formatDate(value)}
        </div>
      )
    },
    {
      header: 'Actions',
      accessor: 'actions',
      sortable: false,
      render: (value, row) => (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => handleViewDetails(row)}
            className="p-2 rounded-lg bg-primary-50 text-primary-600 hover:bg-primary-100 hover:scale-110 transition-all duration-200 shadow-sm hover:shadow-md"
            title="View Details"
          >
            <Eye size={16} />
          </button>
        </div>
      )
    }
  ], []);

  // Filter transactions by type
  const filteredTransactionsByType = useMemo(() => {
    if (typeFilter === 'all') return transactions;
    return transactions.filter(transaction => transaction.transaction_type === typeFilter);
  }, [transactions, typeFilter]);

  // Type filter options
  const typeFilterOptions = useMemo(() => [
    { value: 'all', label: 'All Types' },
    { value: 'subscription', label: 'Subscription' },
    { value: 'code_purchase', label: 'Code Purchase' },
    { value: 'material_purchase', label: 'Material Purchase' },
    { value: 'course_purchase', label: 'Course Purchase' },
    { value: 'commission', label: 'Commission' },
    { value: 'settlement', label: 'Settlement' }
  ], []);

  // Filter options for status
  const filterOptions = useMemo(() => [
    { value: 'all', label: 'All Status', filterFn: () => true },
    { 
      value: 'completed', 
      label: 'Completed', 
      filterFn: (transaction) => transaction.status === 'completed' 
    },
    { 
      value: 'pending', 
      label: 'Pending', 
      filterFn: (transaction) => transaction.status === 'pending' 
    },
    { 
      value: 'failed', 
      label: 'Failed', 
      filterFn: (transaction) => transaction.status === 'failed' 
    },
    { 
      value: 'refunded', 
      label: 'Refunded', 
      filterFn: (transaction) => transaction.status === 'refunded' 
    }
  ], []);

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      {summary && (
        <TabCardsGrid columns={{ mobile: 1, tablet: 2, desktop: 3 }} className="mb-6">
          <TabCard
            name="Total Transactions"
            value={summary.total_transactions || 0}
            icon={Receipt}
            colorType="indigo"
          />
          <TabCard
            name="Total Received"
            value={formatCurrency(summary.total_received || 0)}
            icon={ArrowDownCircle}
            colorType="green"
          />
          <TabCard
            name="Total Paid"
            value={formatCurrency(summary.total_paid || 0)}
            icon={ArrowUpCircle}
            colorType="red"
          />
        </TabCardsGrid>
      )}

      {/* Transactions Table */}
      <div>
        <style>{`
          .payment-transactions-filters-wrapper .data-table-search-container .data-table-search-content {
            display: flex;
            align-items: center;
            gap: 1rem;
            flex-wrap: wrap;
          }
          .payment-transactions-filters-wrapper .data-table-search-input-wrapper {
            flex: 1;
            min-width: 200px;
          }
          .payment-transactions-filters-wrapper .data-table-filter-wrapper {
            flex-shrink: 0;
          }
          @media (max-width: 640px) {
            .payment-transactions-filters-wrapper .data-table-search-container .data-table-search-content {
              flex-direction: column;
            }
            .payment-transactions-filters-wrapper .data-table-filter-wrapper {
              width: 100%;
            }
          }
        `}</style>
        <div className="payment-transactions-filters-wrapper">
          <DataTable
            columns={columns}
            data={filteredTransactionsByType}
            isLoading={loading}
            searchable={true}
            searchPlaceholder="Search transactions..."
            filterable={true}
            filterOptions={filterOptions}
            defaultFilter="all"
            sortable={true}
            emptyMessage="No transactions found"
            customFilters={
              <div className="data-table-filter-wrapper" ref={typeFilterRef}>
                <button
                  onClick={() => setShowTypeFilters(!showTypeFilters)}
                  className={`data-table-filter-button ${
                    typeFilter !== 'all' ? 'data-table-filter-button-active' : ''
                  }`}
                >
                  <Filter size={18} />
                  <span className="data-table-filter-text">
                    {typeFilterOptions.find(opt => opt.value === typeFilter)?.label || 'All Types'}
                  </span>
                </button>
                {showTypeFilters && (
                  <div className="data-table-filter-dropdown">
                    {typeFilterOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setTypeFilter(option.value);
                          setShowTypeFilters(false);
                        }}
                        className={`data-table-filter-option ${
                          typeFilter === option.value ? 'data-table-filter-option-active' : ''
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            }
          />
        </div>
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
          <div className="space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Transaction Type</p>
                <p className="text-base font-semibold text-gray-900">{getTransactionTypeLabel(selectedTransaction.transaction_type)}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Status</p>
                <span className={`px-3 py-1.5 inline-flex text-xs leading-5 font-bold rounded-full ${getStatusBadgeClass(selectedTransaction.status)}`}>
                  {selectedTransaction.status?.charAt(0).toUpperCase() + selectedTransaction.status?.slice(1) || 'N/A'}
                </span>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Total Amount</p>
                <p className={`text-2xl font-bold ${isReceived(selectedTransaction) ? 'text-green-700' : 'text-red-700'}`}>
                  {isReceived(selectedTransaction) ? '+' : '-'} {formatCurrency(selectedTransaction.amount, selectedTransaction.currency)}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Payment Method</p>
                <p className="text-base font-semibold text-gray-900 capitalize">{selectedTransaction.payment_method?.replace('_', ' ') || 'N/A'}</p>
              </div>
              {selectedTransaction.provider_amount || selectedTransaction.received_amount ? (
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm text-gray-500 mb-1">Amount Received</p>
                  <p className="text-2xl font-bold text-green-700">
                    + {formatCurrency(selectedTransaction.provider_amount || selectedTransaction.received_amount, selectedTransaction.currency)}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">Amount you received after commission</p>
                </div>
              ) : null}
              {selectedTransaction.commission_amount ? (
                <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-sm text-gray-500 mb-1">Platform Commission</p>
                  <p className="text-2xl font-bold text-amber-700">
                    - {formatCurrency(selectedTransaction.commission_amount, selectedTransaction.currency)}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">Commission deducted from total amount</p>
                </div>
              ) : null}
              {selectedTransaction.payment_type && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-gray-500 mb-1">Payment Type</p>
                  <p className="text-base font-semibold text-gray-900 capitalize">
                    {selectedTransaction.payment_type === 'destination_charge' ? 'Destination Charge' : 'Standard Payment'}
                  </p>
                </div>
              )}
            </div>

            {/* Payer Info */}
            {selectedTransaction.payer && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm font-medium text-blue-700 mb-3">Payer Information</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-blue-600" />
                    <span className="text-sm text-gray-600">Name:</span>
                    <span className="text-sm font-semibold text-gray-900">{selectedTransaction.payer.name}</span>
                  </div>
                  {selectedTransaction.payer.email && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Email:</span>
                      <span className="text-sm font-semibold text-gray-900">{selectedTransaction.payer.email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Type:</span>
                    <span className="text-sm font-semibold text-gray-900 capitalize">{selectedTransaction.payer.type}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Payee Info */}
            {selectedTransaction.payee && (
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm font-medium text-green-700 mb-3">Payee Information</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-gray-600">Name:</span>
                    <span className="text-sm font-semibold text-gray-900">{selectedTransaction.payee.name}</span>
                  </div>
                  {selectedTransaction.payee.email && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Email:</span>
                      <span className="text-sm font-semibold text-gray-900">{selectedTransaction.payee.email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Type:</span>
                    <span className="text-sm font-semibold text-gray-900 capitalize">{selectedTransaction.payee.type}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Description */}
            {selectedTransaction.description && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Description</p>
                <p className="text-base text-gray-900">{selectedTransaction.description}</p>
              </div>
            )}

            {/* Reference */}
            {selectedTransaction.reference && (
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <p className="text-sm font-medium text-purple-700 mb-3">Reference Information</p>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm text-gray-600">Type:</span>
                    <span className="text-sm font-semibold text-gray-900 ml-2">{selectedTransaction.reference.type}</span>
                  </div>
                  {selectedTransaction.reference.details && (
                    <div className="mt-2 p-2 bg-white rounded border border-purple-100">
                      <pre className="text-xs text-gray-700 whitespace-pre-wrap">{JSON.stringify(selectedTransaction.reference.details, null, 2)}</pre>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Commission Ledgers */}
            {selectedTransaction.commission_ledgers && selectedTransaction.commission_ledgers.length > 0 && (
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-sm font-medium text-yellow-700 mb-3">Commission Ledgers</p>
                <div className="space-y-3">
                  {selectedTransaction.commission_ledgers.map((ledger, index) => (
                    <div key={ledger.id || index} className="p-3 bg-white rounded border border-yellow-100">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {ledger.acc && (
                          <div>
                            <span className="text-gray-600">ACC:</span>
                            <span className="font-semibold text-gray-900 ml-2">{ledger.acc.name}</span>
                          </div>
                        )}
                        {ledger.training_center && (
                          <div>
                            <span className="text-gray-600">Training Center:</span>
                            <span className="font-semibold text-gray-900 ml-2">{ledger.training_center.name}</span>
                          </div>
                        )}
                        {ledger.group_commission_amount && (
                          <div>
                            <span className="text-gray-600">Group Commission:</span>
                            <span className="font-semibold text-gray-900 ml-2">{formatCurrency(ledger.group_commission_amount)} ({ledger.group_commission_percentage}%)</span>
                          </div>
                        )}
                        {ledger.acc_commission_amount && (
                          <div>
                            <span className="text-gray-600">ACC Commission:</span>
                            <span className="font-semibold text-gray-900 ml-2">{formatCurrency(ledger.acc_commission_amount)} ({ledger.acc_commission_percentage}%)</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Created At</p>
                <p className="text-base font-semibold text-gray-900">{formatDateTime(selectedTransaction.created_at)}</p>
              </div>
              {selectedTransaction.completed_at && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Completed At</p>
                  <p className="text-base font-semibold text-gray-900">{formatDateTime(selectedTransaction.completed_at)}</p>
                </div>
              )}
            </div>

            {/* Payment Gateway Transaction ID */}
            {selectedTransaction.payment_gateway_transaction_id && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Payment Gateway Transaction ID</p>
                <p className="text-base font-semibold text-gray-900 font-mono">{selectedTransaction.payment_gateway_transaction_id}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PaymentTransactionsScreen;

