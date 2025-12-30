import { useEffect, useState, useMemo } from 'react';
import { adminAPI } from '../../../services/api';
import { useHeader } from '../../../context/HeaderContext';
import { DollarSign, TrendingUp, Calendar, Receipt, Search, Filter, Eye, Building2, User } from 'lucide-react';
import Modal from '../../../components/Modal/Modal';
import Pagination from '../../../components/Pagination/Pagination';
import './PaymentTransactionsScreen.css';

const PaymentTransactionsScreen = () => {
  const { setHeaderTitle, setHeaderSubtitle } = useHeader();
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  
  // Filters and pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [payerTypeFilter, setPayerTypeFilter] = useState('all');
  const [payeeTypeFilter, setPayeeTypeFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(15);

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
  }, [currentPage, perPage, typeFilter, statusFilter, payerTypeFilter, payeeTypeFilter, dateFrom, dateTo]);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        per_page: perPage,
      };
      
      if (typeFilter !== 'all') params.type = typeFilter;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (payerTypeFilter !== 'all') params.payer_type = payerTypeFilter;
      if (payeeTypeFilter !== 'all') params.payee_type = payeeTypeFilter;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const response = await adminAPI.getPaymentTransactions(params);
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

  // Filter transactions by search term
  const filteredTransactions = useMemo(() => {
    if (!searchTerm) return transactions;
    
    const term = searchTerm.toLowerCase();
    return transactions.filter(transaction => {
      const type = transaction.transaction_type || '';
      const amount = String(transaction.amount || '');
      const currency = transaction.currency || '';
      const status = transaction.status || '';
      const description = transaction.description || '';
      const payerName = transaction.payer?.name || '';
      const payeeName = transaction.payee?.name || '';
      
      return (
        type.toLowerCase().includes(term) ||
        amount.includes(term) ||
        currency.toLowerCase().includes(term) ||
        status.toLowerCase().includes(term) ||
        description.toLowerCase().includes(term) ||
        payerName.toLowerCase().includes(term) ||
        payeeName.toLowerCase().includes(term)
      );
    });
  }, [transactions, searchTerm]);

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

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl shadow-lg p-6 border border-primary-200 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-primary-700 mb-2">Total Transactions</p>
                <p className="text-3xl font-bold text-primary-900">{summary.total_transactions || 0}</p>
              </div>
              <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg">
                <Receipt className="text-white" size={32} />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-lg p-6 border border-green-200 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700 mb-2">Total Amount</p>
                <p className="text-3xl font-bold text-green-900">
                  {formatCurrency(summary.total_amount || 0)}
                </p>
              </div>
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                <DollarSign className="text-white" size={32} />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-lg p-6 border border-blue-200 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700 mb-2">Completed</p>
                <p className="text-3xl font-bold text-blue-900">
                  {formatCurrency(summary.completed_amount || 0)}
                </p>
              </div>
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <TrendingUp className="text-white" size={32} />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl shadow-lg p-6 border border-yellow-200 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-700 mb-2">Pending</p>
                <p className="text-3xl font-bold text-yellow-900">
                  {formatCurrency(summary.pending_amount || 0)}
                </p>
              </div>
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center shadow-lg">
                <Calendar className="text-white" size={32} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters Section */}
      <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Type Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-8 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none bg-white cursor-pointer transition-all"
            >
              <option value="all">All Types</option>
              <option value="subscription">Subscription</option>
              <option value="code_purchase">Code Purchase</option>
              <option value="material_purchase">Material Purchase</option>
              <option value="course_purchase">Course Purchase</option>
              <option value="commission">Commission</option>
              <option value="settlement">Settlement</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-8 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none bg-white cursor-pointer transition-all"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>

          {/* Payer Type Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <select
              value={payerTypeFilter}
              onChange={(e) => {
                setPayerTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-8 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none bg-white cursor-pointer transition-all"
            >
              <option value="all">All Payers</option>
              <option value="acc">ACC</option>
              <option value="training_center">Training Center</option>
              <option value="group">Group</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Payee Type Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <select
              value={payeeTypeFilter}
              onChange={(e) => {
                setPayeeTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-8 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none bg-white cursor-pointer transition-all"
            >
              <option value="all">All Payees</option>
              <option value="group">Group</option>
              <option value="acc">ACC</option>
              <option value="instructor">Instructor</option>
            </select>
          </div>

          {/* Date From */}
          <div>
            <input
              type="date"
              placeholder="Date From"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Date To */}
          <div>
            <input
              type="date"
              placeholder="Date To"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
            />
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="table-header-gradient">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Payer</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Payee</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center">
                        <div className="flex flex-col items-center">
                          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <Receipt className="text-gray-400" size={32} />
                          </div>
                          <p className="text-gray-500 font-medium">No transactions found</p>
                          <p className="text-sm text-gray-400 mt-1">
                            {searchTerm || typeFilter !== 'all' || statusFilter !== 'all'
                              ? 'No transactions match your search criteria'
                              : 'No transactions available'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((transaction, index) => (
                      <tr
                        key={transaction.id || index}
                        className="hover:bg-gradient-to-r hover:from-primary-50/30 hover:to-white transition-all duration-200 group table-row-animated"
                        style={{ '--animation-delay': `${index * 0.03}s` }}
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg flex items-center justify-center mr-3 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                              <Receipt className="h-5 w-5 text-primary-600" />
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-gray-900 group-hover:text-primary-700 transition-colors">
                                {getTransactionTypeLabel(transaction.transaction_type)}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {transaction.payer ? (
                            <div className="flex items-center">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-2">
                                {transaction.payer.type === 'acc' || transaction.payer.type === 'training_center' ? (
                                  <Building2 className="h-4 w-4 text-blue-600" />
                                ) : (
                                  <User className="h-4 w-4 text-blue-600" />
                                )}
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">{transaction.payer.name || 'N/A'}</div>
                                <div className="text-xs text-gray-500 capitalize">{transaction.payer.type || ''}</div>
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">N/A</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {transaction.payee ? (
                            <div className="flex items-center">
                              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-2">
                                {transaction.payee.type === 'acc' || transaction.payee.type === 'training_center' ? (
                                  <Building2 className="h-4 w-4 text-green-600" />
                                ) : (
                                  <User className="h-4 w-4 text-green-600" />
                                )}
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">{transaction.payee.name || 'N/A'}</div>
                                <div className="text-xs text-gray-500 capitalize">{transaction.payee.type || ''}</div>
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">N/A</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm font-semibold text-gray-900">
                            {formatCurrency(transaction.amount, transaction.currency)}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-3 py-1.5 inline-flex text-xs leading-5 font-bold rounded-full shadow-sm ${getStatusBadgeClass(transaction.status)}`}>
                            {transaction.status?.charAt(0).toUpperCase() + transaction.status?.slice(1) || 'N/A'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm text-gray-600">
                            {formatDate(transaction.created_at)}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleViewDetails(transaction)}
                              className="p-2 rounded-lg bg-primary-50 text-primary-600 hover:bg-primary-100 hover:scale-110 transition-all duration-200 shadow-sm hover:shadow-md"
                              title="View Details"
                            >
                              <Eye size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {summary && summary.total > 0 && (
            <Pagination
              currentPage={currentPage || 1}
              totalPages={Math.ceil((summary.total || 0) / perPage)}
              totalItems={summary.total || 0}
              perPage={perPage}
              onPageChange={setCurrentPage}
              onPerPageChange={(newPerPage) => {
                setPerPage(newPerPage);
                setCurrentPage(1);
              }}
            />
          )}
        </>
      )}

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

