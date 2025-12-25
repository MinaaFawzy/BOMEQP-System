import { useEffect, useState, useMemo } from 'react';
import { trainingCenterAPI } from '../../../services/api';
import { useHeader } from '../../../context/HeaderContext';
// stripeAPI removed - no payment functionality needed
// import { trainingCenterAPI, stripeAPI } from '../../../services/api';
import { FileText, DollarSign, CheckCircle, Clock, XCircle, Calendar } from 'lucide-react';
// Modal and payment components removed - no wallet balance or payment functionality
// import Modal from '../../../components/Modal/Modal';
// import FormInput from '../../../components/FormInput/FormInput';
// import StripePaymentModal from '../../../components/StripePaymentModal/StripePaymentModal';
import Pagination from '../../../components/Pagination/Pagination';
import './WalletScreen.css';

const WalletScreen = () => {
  const { setHeaderTitle, setHeaderSubtitle } = useHeader();
  // WALLET BALANCE REMOVED - Only transactions are shown now
  // const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  // ADD FUNDS MODAL REMOVED - No wallet balance or add funds functionality
  // const [addFundsModalOpen, setAddFundsModalOpen] = useState(false);
  // const [formData, setFormData] = useState({
  //   amount: '',
  //   payment_method: 'credit_card',
  //   payment_intent_id: '',
  // });
  // const [errors, setErrors] = useState({});
  // const [adding, setAdding] = useState(false);
  // const [paymentIntentData, setPaymentIntentData] = useState(null);
  // const [creatingPaymentIntent, setCreatingPaymentIntent] = useState(false);
  // const [showStripeModal, setShowStripeModal] = useState(false);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    perPage: 10,
    totalPages: 1,
    totalItems: 0,
  });

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setHeaderTitle('Payment Transactions');
    setHeaderSubtitle('View all your payment transactions history');
    return () => {
      setHeaderTitle(null);
      setHeaderSubtitle(null);
    };
  }, [setHeaderTitle, setHeaderSubtitle]);

  const loadData = async () => {
    try {
      setLoading(true);
      // WALLET BALANCE REMOVED - Only load transactions
      // const [walletData, transactionsData] = await Promise.all([
      //   trainingCenterAPI.getWalletBalance(),
      //   trainingCenterAPI.getWalletTransactions(),
      // ]);
      // setWallet(walletData.wallet);
      const transactionsData = await trainingCenterAPI.getWalletTransactions();
      const transactionsArray = transactionsData.transactions || [];
      setTransactions(transactionsArray);
    } catch (error) {
      console.error('Failed to load data:', error);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };
  
  const handlePageChange = (page) => {
    setPagination(prev => ({ ...prev, currentPage: page }));
  };
  
  const handlePerPageChange = (perPage) => {
    setPagination(prev => ({ ...prev, perPage, currentPage: 1 }));
  };

  // Apply client-side pagination
  useEffect(() => {
    const totalItems = transactions.length;
    const totalPages = Math.ceil(totalItems / pagination.perPage) || 1;
    const currentPage = pagination.currentPage > totalPages ? Math.max(1, totalPages) : pagination.currentPage;
    
    setPagination(prev => ({
      ...prev,
      totalItems,
      totalPages,
      currentPage: currentPage,
    }));
  }, [transactions.length, pagination.perPage]);
  
  // Paginate transactions client-side
  const paginatedTransactions = useMemo(() => {
    const start = (pagination.currentPage - 1) * pagination.perPage;
    const end = start + pagination.perPage;
    return transactions.slice(start, end);
  }, [transactions, pagination.currentPage, pagination.perPage]);

  // ADD FUNDS FUNCTIONALITY REMOVED - No wallet balance anymore
  // const handleAddFunds = () => {
  //   setFormData({
  //     amount: '',
  //     payment_method: 'credit_card',
  //     payment_intent_id: '',
  //   });
  //   setErrors({});
  //   setPaymentIntentData(null);
  //   setAddFundsModalOpen(true);
  // };

  // ALL PAYMENT FUNCTIONS REMOVED - No wallet balance or add funds functionality
  // All payment-related functions are commented out since we only show transactions now

  // WALLET OPTION REMOVED - This function is now replaced by handlePayClick which auto-creates payment intent
  // Keeping this commented for future reference if wallet option is needed again
  /*
  const handleCreatePaymentIntent = async () => {
    // Validate amount before creating payment intent
    const amount = parseFloat(formData.amount);
    if (!formData.amount || isNaN(amount) || amount <= 0) {
      setErrors({ amount: 'Please enter a valid amount greater than 0' });
      return;
    }

    if (amount < 1) {
      setErrors({ amount: 'Amount must be at least $1.00' });
      return;
    }

    setCreatingPaymentIntent(true);
    setErrors({});
    setPaymentIntentData(null);

    try {
      // Step 1: Create Payment Intent for wallet deposit
      // Try to use stripeAPI.createPaymentIntent for wallet deposits
      // This is a generic endpoint that might support wallet deposits
      const response = await stripeAPI.createPaymentIntent({
        amount: amount,
        type: 'wallet_deposit',
      });
      
      if (response.success && response.client_secret && response.payment_intent_id) {
        setPaymentIntentData(response);
        setFormData(prev => ({
          ...prev,
          payment_intent_id: response.payment_intent_id,
        }));
        // Step 2: Open Stripe payment modal (will handle confirmCardPayment)
        setShowStripeModal(true);
        return;
      } else {
        setErrors({ 
          general: 'Payment intent creation for wallet deposits is not available. Please complete payment on Stripe and enter the Payment Intent ID manually.' 
        });
      }
    } catch (error) {
      console.error('Failed to create payment intent:', error);
      
      // Handle different error types according to guide
      if (error.response?.status === 422) {
        // Validation errors - endpoint exists but validation failed
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
        // Bad request (e.g., endpoint doesn't support wallet deposits)
        const errorData = error.response.data;
        setErrors({ 
          general: errorData?.message || 'Payment intent creation for wallet deposits is not available. Please complete payment on Stripe and enter the Payment Intent ID manually.' 
        });
      } else if (error.response?.status === 404) {
        // Endpoint not found
        setErrors({ 
          general: 'Payment intent endpoint for wallet deposits is not available. Please complete payment on Stripe and enter the Payment Intent ID manually.' 
        });
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
          setErrors({ general: 'Failed to create payment intent. Please enter payment intent ID manually after completing payment on Stripe.' });
        }
      } else if (error.message) {
        setErrors({ general: error.message });
      } else {
        setErrors({ general: 'Payment intent creation for wallet deposits is not available. Please complete payment on Stripe and enter the Payment Intent ID manually.' });
      }
    } finally {
      setCreatingPaymentIntent(false);
    }
  };
  */

  // ALL PAYMENT HANDLERS REMOVED - No wallet balance or add funds functionality
  // These functions are no longer needed since we only display transactions


  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;
  }

  return (
    <div className="space-y-4">
      {/* Transactions Table */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          
          {/* Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="table-header-gradient">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Amount</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                      </div>
                    </td>
                  </tr>
                ) : paginatedTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                          <FileText className="text-gray-400" size={32} />
                        </div>
                        <p className="text-gray-500 font-medium">No transactions found</p>
                        <p className="text-sm text-gray-400 mt-1">Your transaction history will appear here</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedTransactions.map((transaction, index) => {
                    const statusConfig = {
                      completed: { bg: 'from-green-100 to-green-200', text: 'text-green-800', border: 'border-green-300', icon: CheckCircle },
                      pending: { bg: 'from-yellow-100 to-yellow-200', text: 'text-yellow-800', border: 'border-yellow-300', icon: Clock },
                      failed: { bg: 'from-red-100 to-red-200', text: 'text-red-800', border: 'border-red-300', icon: XCircle },
                      cancelled: { bg: 'from-red-100 to-red-200', text: 'text-red-800', border: 'border-red-300', icon: XCircle },
                    };
                    const config = statusConfig[transaction.status] || statusConfig.pending;
                    const StatusIcon = config.icon;
                    const isDeposit = transaction.type === 'deposit';
                    
                    return (
                      <tr
                        key={transaction.id || index}
                        className="hover:bg-gradient-to-r hover:from-primary-50/30 hover:to-white transition-all duration-200 group table-row-animated"
                        style={{ '--animation-delay': `${index * 0.03}s` }}
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className={`w-10 h-10 bg-gradient-to-br rounded-lg flex items-center justify-center mr-3 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 ${
                              isDeposit ? 'from-green-100 to-green-200' : 'from-red-100 to-red-200'
                            }`}>
                              <DollarSign className={`h-5 w-5 ${
                                isDeposit ? 'text-green-600' : 'text-red-600'
                              }`} />
                            </div>
                            <div>
                              <div className={`text-sm font-semibold group-hover:text-primary-700 transition-colors capitalize ${
                                isDeposit ? 'text-green-700' : 'text-red-700'
                              }`}>
                                {transaction.type}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`text-lg font-bold ${
                            isDeposit ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {isDeposit ? '+' : '-'}${parseFloat(transaction.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <span className={`px-3 py-1.5 inline-flex items-center text-xs leading-5 font-bold rounded-full shadow-sm bg-gradient-to-r ${config.bg} ${config.text} border ${config.border}`}>
                            <StatusIcon size={14} className="mr-1" />
                            {transaction.status ? transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1) : 'N/A'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center text-sm text-gray-600">
                            <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                            {transaction.created_at ? new Date(transaction.created_at).toLocaleDateString() : 'N/A'}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {!loading && pagination.totalItems > 0 && (
            <div className="px-4 py-4 border-t border-gray-200">
              <Pagination
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                totalItems={pagination.totalItems}
                perPage={pagination.perPage}
                onPageChange={handlePageChange}
                onPerPageChange={handlePerPageChange}
              />
            </div>
          )}
        </div>

      {/* ADD FUNDS MODAL REMOVED - No wallet balance or add funds functionality */}
      {/* All payment modals and add funds functionality has been removed */}
    </div>
  );
};

export default WalletScreen;
