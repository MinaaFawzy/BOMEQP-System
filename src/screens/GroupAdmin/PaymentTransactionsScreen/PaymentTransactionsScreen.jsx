import { useEffect, useState, useMemo } from 'react';
import { adminAPI } from '../../../services/api';
import { useHeader } from '../../../context/HeaderContext';
import { DollarSign, TrendingUp, Calendar, Receipt, Building2, User, CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react';
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
  
  // Filters
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
  }, [typeFilter, statusFilter]);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const params = { per_page: 1000 };
      
      if (typeFilter !== 'all') params.type = typeFilter;
      if (statusFilter !== 'all') params.status = statusFilter;

      const response = await adminAPI.getPaymentTransactions(params);
      const data = response?.data || response || [];
      const summaryData = response?.summary || null;
      
      setTransactions(Array.isArray(data) ? data : (data?.data || []));
      setSummary(summaryData);
    } catch (error) {
      console.error('Failed to load transactions:', error);
      setTransactions([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (transaction) => {
    setSelectedTransaction(transaction);
    setDetailModalOpen(true);
  };

  // Prepare data for DataTable with search text
  const tableData = useMemo(() => {
    return transactions.map(transaction => ({
      ...transaction,
      _searchText: `${transaction.transaction_type || ''} ${transaction.payer?.name || ''} ${transaction.payee?.name || ''} ${transaction.amount || ''} ${transaction.currency || ''} ${transaction.status || ''} ${transaction.description || ''}`.toLowerCase()
    }));
  }, [transactions]);

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

  // DataTable columns
  const columns = useMemo(() => [
    {
      header: 'Type',
      accessor: 'transaction_type',
      sortable: true,
      render: (value) => (
        <div className="flex items-center">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg flex items-center justify-center mr-3">
            <Receipt className="h-5 w-5 text-primary-600" />
          </div>
          <div className="font-medium text-gray-900">{getTransactionTypeLabel(value)}</div>
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
      header: 'Amount',
      accessor: 'amount',
      sortable: true,
      render: (value, row) => (
        <div className="text-sm font-semibold text-gray-900">
          {formatCurrency(value, row.currency)}
        </div>
      )
    },
    {
      header: 'Status',
      accessor: 'status',
      sortable: true,
      render: (value) => {
        const statusConfig = {
          completed: { 
            badgeClass: 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300',
            icon: CheckCircle 
          },
          pending: { 
            badgeClass: 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 border border-yellow-300',
            icon: Clock 
          },
          failed: { 
            badgeClass: 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 border border-red-300',
            icon: XCircle 
          },
          refunded: { 
            badgeClass: 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300',
            icon: AlertCircle 
          }
        };
        const config = statusConfig[value] || statusConfig.pending;
        const Icon = config.icon;
        return (
          <span className={`px-3 py-1.5 inline-flex items-center text-xs leading-5 font-bold rounded-full shadow-sm ${config.badgeClass}`}>
            <Icon size={12} className="mr-1" />
            {value ? value.charAt(0).toUpperCase() + value.slice(1) : 'N/A'}
          </span>
        );
      }
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
    }
  ], []);

  // Filter data client-side
  const filteredTableData = useMemo(() => {
    let filtered = [...tableData];
    
    if (typeFilter !== 'all') {
      filtered = filtered.filter(t => t.transaction_type === typeFilter);
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(t => t.status === statusFilter);
    }
    
    return filtered;
  }, [tableData, typeFilter, statusFilter]);

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      {summary && (
        <TabCardsGrid columns={{ mobile: 1, tablet: 2, desktop: 3 }}>
          <TabCard
            name="Total Transactions"
            value={summary.total_transactions || 0}
            icon={Receipt}
            colorType="indigo"
          />
          <TabCard
            name="Total Amount"
            value={formatCurrency(summary.total_amount || 0)}
            icon={DollarSign}
            colorType="green"
          />
          <TabCard
            name="Completed"
            value={formatCurrency(summary.completed_amount || 0)}
            icon={TrendingUp}
            colorType="blue"
          />
        </TabCardsGrid>
      )}

      {/* Transactions Table */}
      <DataTable
        columns={columns}
        data={filteredTableData}
        isLoading={loading}
        onView={handleViewDetails}
        searchable={true}
        filterable={false}
        emptyMessage="No transactions found"
        customFilters={
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none bg-white cursor-pointer transition-all text-sm"
              style={{ minWidth: '150px' }}
            >
              <option value="all">All Types</option>
              <option value="subscription">Subscription</option>
              <option value="code_purchase">Code Purchase</option>
              <option value="course_purchase">Course Purchase</option>
              <option value="commission">Commission</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none bg-white cursor-pointer transition-all text-sm"
              style={{ minWidth: '150px' }}
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>
        }
      />

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
                <p className="text-sm text-gray-500 mb-1">Amount</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(selectedTransaction.amount, selectedTransaction.currency)}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Payment Method</p>
                <p className="text-base font-semibold text-gray-900 capitalize">{selectedTransaction.payment_method?.replace('_', ' ') || 'N/A'}</p>
              </div>
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

