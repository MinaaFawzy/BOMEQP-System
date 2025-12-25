import { useEffect, useState, useMemo } from 'react';
import { adminAPI } from '../../../services/api';
import { useHeader } from '../../../context/HeaderContext';
import { DollarSign, TrendingUp, Calendar, FileText, Receipt, Search, Filter, Eye } from 'lucide-react';
import Modal from '../../../components/Modal/Modal';
import './FinancialScreen.css';

const FinancialScreen = () => {
  const { setHeaderTitle, setHeaderSubtitle } = useHeader();
  const [dashboard, setDashboard] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadData();
  }, [activeTab]);

  useEffect(() => {
    setHeaderTitle('Financial Overview');
    setHeaderSubtitle('View all financial transactions and settlements');
    return () => {
      setHeaderTitle(null);
      setHeaderSubtitle(null);
    };
  }, [setHeaderTitle, setHeaderSubtitle]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'overview') {
        const [dashboardData, transactionsData] = await Promise.all([
          adminAPI.getFinancialDashboard(),
          adminAPI.getFinancialTransactions({ page: 1, per_page: 10 }),
        ]);
        setDashboard(dashboardData);
        setTransactions(transactionsData.transactions || []);
      } else {
        const settlementsData = await adminAPI.getSettlements();
        setSettlements(settlementsData.settlements || []);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (transaction) => {
    setSelectedTransaction(transaction);
    setDetailModalOpen(true);
  };

  const handleRequestPayment = async (settlementId) => {
    if (window.confirm('Request payment from ACC?')) {
      try {
        await adminAPI.requestPayment(settlementId);
        await loadData();
        alert('Payment request sent successfully!');
      } catch (error) {
        alert('Failed to request payment: ' + (error.message || 'Unknown error'));
      }
    }
  };

  // Filter and search logic for transactions
  const filteredTransactions = useMemo(() => {
    let filtered = [...transactions];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(item => {
        const type = item.transaction_type || '';
        const amount = String(item.amount || '');
        const currency = item.currency || '';
        const status = item.status || '';
        return (
          type.toLowerCase().includes(term) ||
          amount.includes(term) ||
          currency.toLowerCase().includes(term) ||
          status.toLowerCase().includes(term)
        );
      });
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    return filtered;
  }, [transactions, searchTerm, statusFilter]);

  // Filter and search logic for settlements
  const filteredSettlements = useMemo(() => {
    let filtered = [...settlements];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(item => {
        const month = item.settlement_month || '';
        const revenue = String(item.total_revenue || '');
        const commission = String(item.group_commission_amount || '');
        const status = item.status || '';
        return (
          month.toLowerCase().includes(term) ||
          revenue.includes(term) ||
          commission.includes(term) ||
          status.toLowerCase().includes(term)
        );
      });
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    return filtered;
  }, [settlements, searchTerm, statusFilter]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchTerm('');
    setStatusFilter('all');
  };

  return (
    <div className="space-y-4">

      {/* Stats Cards - Only show in Overview */}
      {dashboard && activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl shadow-lg p-6 border border-primary-200 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-primary-700 mb-2">Total Revenue</p>
                <p className="text-3xl font-bold text-primary-900">
                  ${parseFloat(dashboard.total_revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg">
                <TrendingUp className="text-white" size={32} />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-lg p-6 border border-green-200 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700 mb-2">Monthly Revenue</p>
                <p className="text-3xl font-bold text-green-900">
                  ${parseFloat(dashboard.monthly_revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                <DollarSign className="text-white" size={32} />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl shadow-lg p-6 border border-yellow-200 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-700 mb-2">Pending Settlements</p>
                <p className="text-3xl font-bold text-yellow-900">
                  ${parseFloat(dashboard.pending_settlements || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center shadow-lg">
                <Calendar className="text-white" size={32} />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-lg p-6 border border-blue-200 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700 mb-2">Active ACCs</p>
                <p className="text-3xl font-bold text-blue-900">{dashboard.active_accs || 0}</p>
              </div>
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <TrendingUp className="text-white" size={32} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-1.5">
        <div className="flex space-x-2">
          <button
            onClick={() => handleTabChange('overview')}
            className={`tab-button flex-1 px-6 py-3.5 font-semibold rounded-lg transition-all duration-300 flex items-center justify-center gap-2 ${
              activeTab === 'overview' 
                  ? 'text-white shadow-lg tab-active-gradient' 
                  : 'text-gray-500 bg-gray-100 hover:text-primary-700 hover:bg-primary-50 border border-gray-200'
            }`}
          >
            <Receipt size={20} className={activeTab === 'overview' ? 'text-white' : 'text-gray-500'} />
            Overview
          </button>
          <button
            onClick={() => handleTabChange('settlements')}
            className={`tab-button flex-1 px-6 py-3.5 font-semibold rounded-lg transition-all duration-300 flex items-center justify-center gap-2 ${
              activeTab === 'settlements' 
                  ? 'text-white shadow-lg tab-active-gradient' 
                  : 'text-gray-500 bg-gray-100 hover:text-primary-700 hover:bg-primary-50 border border-gray-200'
            }`}
          >
            <FileText size={20} className={activeTab === 'settlements' ? 'text-white' : 'text-gray-500'} />
            Settlements
          </button>
        </div>
      </div>

      {/* Overview Tab Content */}
      {activeTab === 'overview' && (
        <>
          {/* Search and Filter Section */}
          <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-100 mb-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                />
              </div>
              
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="pl-10 pr-8 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none bg-white cursor-pointer transition-all"
                >
                  <option value="all">All Status</option>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="table-header-gradient">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Currency</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {filteredTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center">
                          <div className="flex flex-col items-center">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                              <Receipt className="text-gray-400" size={32} />
                            </div>
                            <p className="text-gray-500 font-medium">No transactions found</p>
                            <p className="text-sm text-gray-400 mt-1">
                              {searchTerm || statusFilter !== 'all' 
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
                                <DollarSign className="h-5 w-5 text-primary-600" />
                              </div>
                              <div>
                                <div className="text-sm font-semibold text-gray-900 group-hover:text-primary-700 transition-colors capitalize">
                                  {transaction.transaction_type?.replace('_', ' ') || '-'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm font-semibold text-gray-900">
                              ${parseFloat(transaction.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm text-gray-600 uppercase">
                              {transaction.currency || 'USD'}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`px-3 py-1.5 inline-flex text-xs leading-5 font-bold rounded-full shadow-sm ${
                              transaction.status === 'completed' 
                                ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300' 
                                : 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 border border-yellow-300'
                            }`}>
                              {transaction.status?.charAt(0).toUpperCase() + transaction.status?.slice(1) || 'N/A'}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm text-gray-600">
                              {transaction.created_at ? new Date(transaction.created_at).toLocaleDateString() : 'N/A'}
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
          )}
        </>
      )}

      {/* Settlements Tab Content */}
      {activeTab === 'settlements' && (
        <>
          {/* Search and Filter Section */}
          <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-100 mb-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search settlements..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                />
              </div>
              
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="pl-10 pr-8 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none bg-white cursor-pointer transition-all"
                >
                  <option value="all">All Status</option>
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="table-header-gradient">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Settlement Month</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Total Revenue</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Commission</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Request Date</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {filteredSettlements.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center">
                          <div className="flex flex-col items-center">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                              <FileText className="text-gray-400" size={32} />
                            </div>
                            <p className="text-gray-500 font-medium">No settlements found</p>
                            <p className="text-sm text-gray-400 mt-1">
                              {searchTerm || statusFilter !== 'all' 
                                ? 'No settlements match your search criteria' 
                                : 'No settlements available'}
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredSettlements.map((settlement, index) => (
                        <tr
                          key={settlement.id || index}
                          className="hover:bg-gradient-to-r hover:from-primary-50/30 hover:to-white transition-all duration-200 group table-row-animated"
                          style={{ '--animation-delay': `${index * 0.03}s` }}
                        >
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg flex items-center justify-center mr-3 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                                <Calendar className="h-5 w-5 text-primary-600" />
                              </div>
                              <div>
                                <div className="text-sm font-semibold text-gray-900 group-hover:text-primary-700 transition-colors">
                                  {settlement.settlement_month || '-'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm font-semibold text-gray-900">
                              ${parseFloat(settlement.total_revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm font-semibold text-gray-900">
                              ${parseFloat(settlement.group_commission_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`px-3 py-1.5 inline-flex text-xs leading-5 font-bold rounded-full shadow-sm ${
                              settlement.status === 'paid' 
                                ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300' 
                                : settlement.status === 'pending'
                                ? 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 border border-yellow-300'
                                : 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300'
                            }`}>
                              {settlement.status?.charAt(0).toUpperCase() + settlement.status?.slice(1) || 'N/A'}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm text-gray-600">
                              {settlement.request_date ? new Date(settlement.request_date).toLocaleDateString() : 'N/A'}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
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
        size="md"
      >
        {selectedTransaction && (
          <div className="modal-content-wrapper">
            <div className="modal-content-section">
              <p className="modal-label">Transaction Type</p>
              <p className="modal-value modal-value-capitalize">{selectedTransaction.transaction_type?.replace('_', ' ')}</p>
            </div>
            <div className="modal-content-section">
              <p className="modal-label">Amount</p>
              <p className="modal-amount">
                ${parseFloat(selectedTransaction.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="modal-content-section">
              <p className="modal-label">Currency</p>
              <p className="modal-value modal-value-uppercase">{selectedTransaction.currency || 'USD'}</p>
            </div>
            <div className="modal-content-section">
              <p className="modal-label">Status</p>
              <span className={`status-badge ${
                selectedTransaction.status === 'completed' ? 'status-completed' : 'status-pending'
              }`}>
                {selectedTransaction.status}
              </span>
            </div>
            <div className="modal-content-section">
              <p className="modal-label">Date</p>
              <p className="modal-value">
                {selectedTransaction.created_at ? new Date(selectedTransaction.created_at).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default FinancialScreen;
