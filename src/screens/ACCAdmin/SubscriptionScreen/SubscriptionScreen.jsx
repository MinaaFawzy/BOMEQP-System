import { useEffect, useState } from 'react';
import { useTranslation } from '../../../hooks/useTranslation';
import { accAPI } from '../../../services/api';
import { useHeader } from '../../../context/HeaderContext';
import { CreditCard, Calendar, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import Modal from '../../../components/Modal/Modal';
import FormInput from '../../../components/FormInput/FormInput';
import StripePaymentModal from '../../../components/StripePaymentModal/StripePaymentModal';
import './SubscriptionScreen.css';

const SubscriptionScreen = () => {
  const { t } = useTranslation('accreditation');
  const { setHeaderTitle, setHeaderSubtitle, setHeaderActions } = useHeader();
  const [subscription, setSubscription] = useState(null);
  const [subscriptionPrice, setSubscriptionPrice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [renewModalOpen, setRenewModalOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [errors, setErrors] = useState({});
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_method: 'credit_card',
    payment_intent_id: '',
  });
  const [renewForm, setRenewForm] = useState({
    amount: '',
    payment_method: 'credit_card',
    payment_intent_id: '',
    auto_renew: false,
  });
  const [paymentIntentData, setPaymentIntentData] = useState(null);
  const [renewPaymentIntentData, setRenewPaymentIntentData] = useState(null);
  const [creatingPaymentIntent, setCreatingPaymentIntent] = useState(false);
  const [showStripeModal, setShowStripeModal] = useState(false);
  const [showRenewStripeModal, setShowRenewStripeModal] = useState(false);

  useEffect(() => {
    loadSubscription();
  }, []);

  useEffect(() => {
    setHeaderTitle(t('subscription_screen.header.title'));
    setHeaderSubtitle(t('subscription_screen.header.subtitle'));
    return () => {
      setHeaderTitle(null);
      setHeaderSubtitle(null);
    };
  }, [setHeaderTitle, setHeaderSubtitle]);

  const loadSubscription = async () => {
    try {
      setLoading(true);
      const data = await accAPI.getSubscription();
      setSubscription(data.subscription || null);
      setSubscriptionPrice(data.subscription_price || null);
    } catch (error) {
      console.error('Failed to load subscription:', error);
      // If subscription doesn't exist, set to null
      setSubscription(null);
      setSubscriptionPrice(null);
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = () => {
    setPaymentForm({
      amount: subscriptionPrice ? subscriptionPrice.toString() : '',
      payment_method: 'credit_card',
      payment_intent_id: '',
    });
    setErrors({});
    setPaymentIntentData(null);
    setPaymentModalOpen(true);
  };

  // WALLET OPTION REMOVED - This function is now replaced by handlePaymentClick which auto-creates payment intent
  // Keeping this commented for future reference if wallet option is needed again
  /*
  const handleCreatePaymentIntent = async () => {
    // Validate amount before creating payment intent
    const amount = parseFloat(paymentForm.amount);
    if (!paymentForm.amount || isNaN(amount) || amount <= 0) {
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
      // Step 1: Create Payment Intent
      const response = await accAPI.createSubscriptionPaymentIntent({
        amount: amount,
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
    try {
      // Step 3: Complete Payment on backend
      const submitData = {
        amount: parseFloat(paymentForm.amount),
        payment_method: 'credit_card',
        payment_intent_id: paymentIntentId || paymentIntent.id,
      };

      // Verify payment intent status before completing
      if (paymentIntent && paymentIntent.status !== 'succeeded') {
        setErrors({ general: `Payment not completed. Status: ${paymentIntent.status}` });
        return;
      }

      await accAPI.paySubscription(submitData);
      await loadSubscription();
      setPaymentModalOpen(false);
      setShowStripeModal(false);
      setPaymentIntentData(null);
      setPaymentIntentData(null);
      alert(t('subscription_screen.messages.payment_success'));
      window.location.reload();
    } catch (error) {
      console.error('Failed to complete subscription payment:', error);

      // Handle different error types
      if (error.response?.status === 400) {
        const errorData = error.response.data;
        setErrors({ general: errorData?.message || t('subscription_screen.errors.payment_verification_failed') });
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
          setErrors({ general: t('subscription_screen.errors.payment_process_failed') });
        }
      } else {
        setErrors({ general: t('subscription_screen.errors.payment_process_failed') });
      }
      throw error;
    }
  };

  // Auto-create payment intent when user clicks Pay button
  const handlePaymentClick = async () => {
    // Validate amount before creating payment intent
    const amount = parseFloat(paymentForm.amount);
    if (!paymentForm.amount || isNaN(amount) || amount <= 0) {
      setErrors({ amount: t('subscription_screen.errors.invalid_amount') });
      return;
    }

    if (amount < 1) {
      setErrors({ amount: t('subscription_screen.errors.min_amount') });
      return;
    }

    setCreatingPaymentIntent(true);
    setErrors({});
    setPaymentIntentData(null);

    try {
      // Create Payment Intent automatically
      const response = await accAPI.createSubscriptionPaymentIntent({
        amount: amount,
      });

      if (response.success && response.client_secret && response.payment_intent_id) {
        setPaymentIntentData(response);
        setPaymentForm(prev => ({
          ...prev,
          payment_intent_id: response.payment_intent_id,
        }));
        // Open Stripe payment modal directly
        setShowStripeModal(true);
      } else {
        setErrors({ general: t('subscription_screen.errors.create_payment_intent_failed') });
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
        setErrors({ general: errorData?.message || t('subscription_screen.errors.create_payment_intent_failed') });
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
          setErrors({ general: t('subscription_screen.errors.create_payment_intent_failed') });
        }
      } else if (error.message) {
        setErrors({ general: error.message });
      } else {
        setErrors({ general: t('subscription_screen.errors.create_payment_intent_failed') });
      }
    } finally {
      setCreatingPaymentIntent(false);
    }
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();

    // Auto-create payment intent and open Stripe modal
    await handlePaymentClick();
  };

  const handleRenew = () => {
    // Pre-fill form with current subscription amount if available
    setRenewForm({
      amount: subscriptionPrice ? subscriptionPrice.toString() : (subscription?.amount ? subscription.amount.toString() : ''),
      payment_method: 'credit_card',
      payment_intent_id: '',
      auto_renew: subscription?.auto_renew || false,
    });
    setErrors({});
    setRenewPaymentIntentData(null);
    setRenewModalOpen(true);
  };

  // WALLET OPTION REMOVED - This function is now replaced by handleRenewClick which auto-creates payment intent
  // Keeping this commented for future reference if wallet option is needed again
  /*
  const handleCreateRenewPaymentIntent = async () => {
    // Validate amount before creating payment intent
    const amount = parseFloat(renewForm.amount);
    if (!renewForm.amount || isNaN(amount) || amount <= 0) {
      setErrors({ amount: 'Please enter a valid amount greater than 0' });
      return;
    }

    if (amount < 1) {
      setErrors({ amount: 'Amount must be at least $1.00' });
      return;
    }

    setCreatingPaymentIntent(true);
    setErrors({});
    setRenewPaymentIntentData(null);

    try {
      // Step 1: Create Renewal Payment Intent
      const response = await accAPI.createRenewalPaymentIntent({
        amount: amount,
      });
      
      if (response.success && response.client_secret && response.payment_intent_id) {
        setRenewPaymentIntentData(response);
        setRenewForm(prev => ({
          ...prev,
          payment_intent_id: response.payment_intent_id,
        }));
        // Step 2: Open Stripe payment modal (will handle confirmCardPayment)
        setShowRenewStripeModal(true);
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

  const handleRenewStripePaymentSuccess = async (paymentIntent, paymentIntentId) => {
    try {
      // Step 3: Complete Renewal on backend
      const submitData = {
        amount: parseFloat(renewForm.amount),
        payment_method: 'credit_card',
        payment_intent_id: paymentIntentId || paymentIntent.id,
        auto_renew: renewForm.auto_renew || false,
      };

      // Verify payment intent status before completing
      if (paymentIntent && paymentIntent.status !== 'succeeded') {
        setErrors({ general: `Payment not completed. Status: ${paymentIntent.status}` });
        return;
      }

      await accAPI.renewSubscription(submitData);
      await loadSubscription();
      setRenewModalOpen(false);
      setShowRenewStripeModal(false);
      setRenewPaymentIntentData(null);
      alert(t('subscription_screen.messages.renew_success'));
    } catch (error) {
      console.error('Failed to complete subscription renewal:', error);

      // Handle different error types
      if (error.response?.status === 400) {
        const errorData = error.response.data;
        setErrors({ general: errorData?.message || t('subscription_screen.errors.payment_verification_failed') });
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
          setErrors({ general: t('subscription_screen.errors.renew_failed') });
        }
      } else {
        setErrors({ general: t('subscription_screen.errors.renew_failed') });
      }
      throw error;
    }
  };

  // Auto-create payment intent when user clicks Renew button
  const handleRenewClick = async () => {
    // Validate amount before creating payment intent
    const amount = parseFloat(renewForm.amount);
    if (!renewForm.amount || isNaN(amount) || amount <= 0) {
      setErrors({ amount: t('subscription_screen.errors.invalid_amount') });
      return;
    }

    if (amount < 1) {
      setErrors({ amount: t('subscription_screen.errors.min_amount') });
      return;
    }

    setCreatingPaymentIntent(true);
    setErrors({});
    setRenewPaymentIntentData(null);

    try {
      // Create Renewal Payment Intent automatically
      const response = await accAPI.createRenewalPaymentIntent({
        amount: amount,
      });

      if (response.success && response.client_secret && response.payment_intent_id) {
        setRenewPaymentIntentData(response);
        setRenewForm(prev => ({
          ...prev,
          payment_intent_id: response.payment_intent_id,
        }));
        // Open Stripe payment modal directly
        setShowRenewStripeModal(true);
      } else {
        setErrors({ general: t('subscription_screen.errors.create_payment_intent_failed') });
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
        setErrors({ general: errorData?.message || t('subscription_screen.errors.create_payment_intent_failed') });
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
          setErrors({ general: t('subscription_screen.errors.create_payment_intent_failed') });
        }
      } else if (error.message) {
        setErrors({ general: error.message });
      } else {
        setErrors({ general: t('subscription_screen.errors.create_payment_intent_failed') });
      }
    } finally {
      setCreatingPaymentIntent(false);
    }
  };

  const handleRenewSubmit = async (e) => {
    e.preventDefault();

    // Auto-create payment intent and open Stripe modal
    await handleRenewClick();
  };

  useEffect(() => {
    if (subscription) {
      setHeaderActions(
        <button
          onClick={handleRenew}
          className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 flex items-center gap-2 transition-colors shadow-lg hover:shadow-xl"
        >
          <RefreshCw size={20} />
          {t('subscription_screen.current_subscription.actions.manage_renewal')}
        </button>
      );
    } else {
      setHeaderActions(null);
    }

    return () => {
      setHeaderActions(null);
    };
  }, [subscription, subscriptionPrice, handleRenew, setHeaderActions, t]);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;
  }

  return (
    <div>

      {!subscription ? (
        // No subscription - New ACC needs to subscribe
        <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-200">
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-yellow-100 mb-6">
              <AlertCircle className="h-10 w-10 text-yellow-600" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">{t('subscription_screen.no_subscription.title')}</h2>
            <p className="text-gray-600 mb-6">
              {t('subscription_screen.no_subscription.description')}
            </p>
            <button
              onClick={handlePayment}
              className="px-8 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-xl font-semibold"
            >
              <CreditCard className="inline-block mr-2" size={20} />
              {t('subscription_screen.no_subscription.subscribe_now')}
            </button>
          </div>
        </div>
      ) : (
        // Has subscription - Show subscription details
        <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">{t('subscription_screen.current_subscription.title')}</h2>
              <p className="text-gray-600 mt-1">{t('subscription_screen.current_subscription.subtitle')}</p>
            </div>
            <span className={`px-4 py-2 rounded-full font-medium ${subscription.payment_status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
              }`}>
              {subscription.payment_status === 'paid' ? t('subscription_screen.current_subscription.status.paid') : t('subscription_screen.current_subscription.status.pending')}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center mb-2">
                <Calendar className="text-primary-600 mr-2" size={20} />
                <span className="font-medium text-gray-700">{t('subscription_screen.current_subscription.fields.start_date')}</span>
              </div>
              <p className="text-lg font-semibold text-gray-900">
                {subscription.subscription_start_date
                  ? new Date(subscription.subscription_start_date).toLocaleDateString()
                  : t('subscription_screen.common.na')}
              </p>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center mb-2">
                <Calendar className="text-primary-600 mr-2" size={20} />
                <span className="font-medium text-gray-700">{t('subscription_screen.current_subscription.fields.end_date')}</span>
              </div>
              <p className="text-lg font-semibold text-gray-900">
                {subscription.subscription_end_date
                  ? new Date(subscription.subscription_end_date).toLocaleDateString()
                  : t('subscription_screen.common.na')}
              </p>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center mb-2">
                <CreditCard className="text-primary-600 mr-2" size={20} />
                <span className="font-medium text-gray-700">{t('subscription_screen.current_subscription.fields.amount')}</span>
              </div>
              <p className="text-lg font-semibold text-gray-900">
                ${subscription.amount?.toLocaleString() || '0.00'}
              </p>
            </div>

            {subscription.auto_renew !== undefined && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center mb-2">
                  <CheckCircle className="text-primary-600 mr-2" size={20} />
                  <span className="font-medium text-gray-700">{t('subscription_screen.current_subscription.fields.auto_renew')}</span>
                </div>
                <p className="text-lg font-semibold text-gray-900">
                  {subscription.auto_renew ? t('subscription_screen.current_subscription.fields.enabled') : t('subscription_screen.current_subscription.fields.disabled')}
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 flex gap-4">
            {subscription.payment_status !== 'paid' && (
              <button
                onClick={handlePayment}
                className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-xl font-semibold"
              >
                <CreditCard className="inline-block mr-2" size={18} />
                {t('subscription_screen.current_subscription.actions.pay_subscription')}
              </button>
            )}

          </div>
        </div>
      )}

      {/* Payment Modal */}
      <Modal
        isOpen={paymentModalOpen}
        onClose={() => {
          setPaymentModalOpen(false);
          setErrors({});
        }}
        title={t('subscription_screen.payment_modal.title')}
        size="md"
      >
        <form onSubmit={handlePaymentSubmit} className="space-y-4">
          {errors.general && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{errors.general}</p>
            </div>
          )}

          <FormInput
            label={t('subscription_screen.payment_modal.amount')}
            name="amount"
            type="number"
            value={paymentForm.amount}
            onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
            required
            min="1"
            step="0.01"
            placeholder={t('subscription_screen.payment_modal.amount_placeholder')}
            error={errors.amount}
            disabled={true}
          />

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
              { value: 'credit_card', label: 'Credit Card' },
              { value: 'wallet', label: 'Wallet' },
            ]}
            error={errors.payment_method}
          />
          */}

          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-900 font-semibold mb-2">{t('subscription_screen.payment_modal.payment_method_title')}</p>
            <p className="text-xs text-blue-700">
              {t('subscription_screen.payment_modal.payment_method_description')}
            </p>
          </div>

          <div className="flex space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => {
                setPaymentModalOpen(false);
                setErrors({});
              }}
              className="flex-1 px-4 py-2.5 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 hover:scale-105 transition-all duration-200 shadow-sm hover:shadow-md font-medium"
            >
              {t('subscription_screen.payment_modal.cancel')}
            </button>
            <button
              type="submit"
              disabled={creatingPaymentIntent || processing || !paymentForm.amount || parseFloat(paymentForm.amount) <= 0}
              className="flex-1 px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 hover:scale-105 transition-all duration-200 shadow-sm hover:shadow-md font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-sm"
            >
              {creatingPaymentIntent ? t('subscription_screen.payment_modal.processing') : processing ? t('subscription_screen.payment_modal.processing') : t('subscription_screen.payment_modal.pay_now')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Renewal Modal */}
      <Modal
        isOpen={renewModalOpen}
        onClose={() => {
          setRenewModalOpen(false);
          setErrors({});
        }}
        title={t('subscription_screen.renewal_modal.title')}
        size="md"
      >
        <form onSubmit={handleRenewSubmit} className="space-y-4">
          {errors.general && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{errors.general}</p>
            </div>
          )}

          <FormInput
            label={t('subscription_screen.renewal_modal.amount')}
            name="amount"
            type="number"
            value={renewForm.amount}
            onChange={(e) => setRenewForm({ ...renewForm, amount: e.target.value })}
            required
            min="1"
            step="0.01"
            placeholder={t('subscription_screen.renewal_modal.amount_placeholder')}
            error={errors.amount}
            disabled={true}
          />

          {/* Payment Method - Only Credit Card Available */}
          {/* WALLET OPTION COMMENTED OUT - Keep for future use if needed */}
          {/* 
          <FormInput
            label="Payment Method"
            name="payment_method"
            type="select"
            value={renewForm.payment_method}
            onChange={(e) => setRenewForm({ ...renewForm, payment_method: e.target.value })}
            options={[
              { value: 'credit_card', label: 'Credit Card' },
              { value: 'wallet', label: 'Wallet' },
            ]}
            error={errors.payment_method}
          />
          */}

          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-900 font-semibold mb-2">{t('subscription_screen.renewal_modal.payment_method_title')}</p>
            <p className="text-xs text-blue-700">
              {t('subscription_screen.renewal_modal.payment_method_description')}
            </p>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={renewForm.auto_renew}
                onChange={(e) => setRenewForm({ ...renewForm, auto_renew: e.target.checked })}
                className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <span className="ml-3 text-gray-700 font-medium">
                {t('subscription_screen.renewal_modal.auto_renew')}
              </span>
            </label>
            <p className="mt-2 text-sm text-gray-500">
              {t('subscription_screen.renewal_modal.auto_renew_hint')}
            </p>
          </div>

          <div className="flex space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => {
                setRenewModalOpen(false);
                setErrors({});
              }}
              className="flex-1 px-4 py-2.5 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 hover:scale-105 transition-all duration-200 shadow-sm hover:shadow-md font-medium"
            >
              {t('subscription_screen.renewal_modal.cancel')}
            </button>
            <button
              type="submit"
              disabled={creatingPaymentIntent || processing || !renewForm.amount || parseFloat(renewForm.amount) <= 0}
              className="flex-1 px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 hover:scale-105 transition-all duration-200 shadow-sm hover:shadow-md font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-sm"
            >
              {creatingPaymentIntent ? t('subscription_screen.renewal_modal.processing') : processing ? t('subscription_screen.renewal_modal.processing') : t('subscription_screen.renewal_modal.renew')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Stripe Payment Modal for Subscription */}
      <StripePaymentModal
        isOpen={showStripeModal}
        onClose={() => {
          setShowStripeModal(false);
        }}
        clientSecret={paymentIntentData?.client_secret}
        paymentIntentId={paymentIntentData?.payment_intent_id}
        amount={paymentForm.amount}
        currency={paymentIntentData?.currency || 'USD'}
        onPaymentSuccess={handleStripePaymentSuccess}
        onPaymentError={(error) => {
          setErrors({ general: error });
        }}
      />

      {/* Stripe Payment Modal for Renewal */}
      <StripePaymentModal
        isOpen={showRenewStripeModal}
        onClose={() => {
          setShowRenewStripeModal(false);
        }}
        clientSecret={renewPaymentIntentData?.client_secret}
        paymentIntentId={renewPaymentIntentData?.payment_intent_id}
        amount={renewForm.amount}
        currency={renewPaymentIntentData?.currency || 'USD'}
        onPaymentSuccess={handleRenewStripePaymentSuccess}
        onPaymentError={(error) => {
          setErrors({ general: error });
        }}
      />
    </div>
  );
};

export default SubscriptionScreen;
