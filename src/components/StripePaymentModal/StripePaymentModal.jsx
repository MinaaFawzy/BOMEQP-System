import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { getStripeConfig } from '../../config/stripe';
import { useAuth } from '../../context/AuthContext';
import Modal from '../Modal/Modal';
import './StripePaymentModal.css';

// Initialize Stripe - Get key from backend
let stripePromise = null;
let stripeConfigLoading = false;

const getStripePromise = async () => {
  // Return cached promise if already initialized
  if (stripePromise) {
    return stripePromise;
  }

  // Prevent multiple simultaneous requests
  if (stripeConfigLoading) {
    // Wait for ongoing request
    while (stripeConfigLoading) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return stripePromise;
  }

  try {
    stripeConfigLoading = true;
    const publishableKey = await getStripeConfig();
    
    if (!publishableKey) {
      console.warn('Stripe is not configured. Credit card payments will not be available.');
      return null;
    }

    stripePromise = loadStripe(publishableKey);
    return stripePromise;
  } catch (error) {
    console.error('Failed to initialize Stripe:', error);
    return null;
  } finally {
    stripeConfigLoading = false;
  }
};

const PaymentForm = ({ clientSecret, amount, currency, onPaymentSuccess, onPaymentError, onCancel, loading: externalLoading }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cardComplete, setCardComplete] = useState(false);

  const handleCardChange = (event) => {
    setCardComplete(event.complete);
    setError(event.error ? event.error.message : null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements) {
      setError('Stripe is not loaded. Please refresh the page.');
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setError('Card element not found.');
      return;
    }

    if (!cardComplete) {
      setError('Please complete the card details.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: {
            card: cardElement,
            billing_details: {
              // You can add billing details here if needed
            }
          }
        }
      );

      if (stripeError) {
        setError(stripeError.message);
        if (onPaymentError) {
          onPaymentError(stripeError.message);
        }
        setLoading(false);
        return;
      }

      // Only proceed if payment was successful
      if (!paymentIntent) {
        setError('Payment intent not returned from Stripe. Please try again.');
        setLoading(false);
        return;
      }

      // Double-check payment intent status - must be 'succeeded'
      if (paymentIntent.status !== 'succeeded') {
        const errorMsg = `Payment not completed. Status: ${paymentIntent.status}. Please complete the payment and try again.`;
        setError(errorMsg);
        if (onPaymentError) {
          onPaymentError(errorMsg);
        }
        setLoading(false);
        return;
      }

      // Clear card element after successful payment
      if (cardElement) {
        cardElement.clear();
      }
      
      // Pass paymentIntent to onPaymentSuccess
      if (onPaymentSuccess) {
        onPaymentSuccess(paymentIntent);
      }
    } catch (err) {
      const errorMessage = err.message || 'Payment failed. Please try again.';
      setError(errorMessage);
      if (onPaymentError) {
        onPaymentError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const isLoading = loading || externalLoading;

  return (
    <form onSubmit={handleSubmit} className="stripe-payment-form">
      <div className="payment-amount-display">
        <span className="amount-label">Amount:</span>
        <span className="amount-value">{currency || 'USD'} {parseFloat(amount || 0).toFixed(2)}</span>
      </div>

      <div className="card-element-container">
        <CardElement
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#424770',
                '::placeholder': {
                  color: '#aab7c4',
                },
              },
              invalid: {
                color: '#9e2146',
              },
            },
          }}
          onChange={handleCardChange}
        />
      </div>

      {error && (
        <div className="payment-error">
          <p className="error-message">{error}</p>
        </div>
      )}

      <div className="payment-actions">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="btn-cancel"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || !cardComplete || isLoading}
          className="btn-pay"
        >
          {isLoading ? 'Processing...' : 'Pay Now'}
        </button>
      </div>
    </form>
  );
};

const StripePaymentModal = ({ 
  isOpen, 
  onClose, 
  clientSecret, 
  paymentIntentId,
  amount, 
  currency = 'USD',
  paymentSummary = null,
  onPaymentSuccess, 
  onPaymentError 
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [stripePromise, setStripePromise] = useState(null);
  const [stripeConfigError, setStripeConfigError] = useState(null);
  
  // Check if user is training center - hide commission details from them
  const isTrainingCenter = user?.role === 'training_center';

  // Load Stripe config when modal opens
  useEffect(() => {
    if (isOpen && !stripePromise) {
      getStripePromise()
        .then(promise => {
          setStripePromise(promise);
          if (!promise) {
            setStripeConfigError('Stripe is not configured on the backend');
          }
        })
        .catch(error => {
          console.error('Failed to load Stripe config:', error);
          setStripeConfigError('Failed to load Stripe configuration');
        });
    }
  }, [isOpen, stripePromise]);

  useEffect(() => {
    if (!isOpen) {
      setLoading(false);
    }
  }, [isOpen]);

  const handlePaymentSuccess = async (paymentIntent) => {
    setLoading(true);
    try {
      if (onPaymentSuccess) {
        await onPaymentSuccess(paymentIntent, paymentIntentId);
      }
    } catch (error) {
      if (onPaymentError) {
        onPaymentError(error.message || 'Payment succeeded but failed to complete transaction.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentError = (error) => {
    if (onPaymentError) {
      onPaymentError(error);
    }
  };

  if (stripeConfigError || (!stripePromise && !stripeConfigLoading)) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Payment" size="md">
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800 font-semibold mb-2">Stripe Configuration Required</p>
          <p className="text-xs text-yellow-700">
            {stripeConfigError || 'Stripe is not configured on the backend. Please contact support to enable credit card payments.'}
          </p>
          <p className="text-xs text-yellow-600 mt-2">
            You can still proceed by entering the Payment Intent ID manually after completing payment on Stripe.
          </p>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </Modal>
    );
  }

  if (stripeConfigLoading) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Payment" size="md">
        <div className="p-4 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-primary-600"></div>
          <span className="ml-3 text-gray-600">Loading payment form...</span>
        </div>
      </Modal>
    );
  }

  if (!clientSecret) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Payment" size="md">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">Payment intent not created. Please create payment intent first.</p>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Complete Payment" size="md">
      {paymentSummary && (
        <div className="payment-summary mb-4 p-4 bg-green-50 rounded-lg border border-green-200">
          <h3 className="text-sm font-semibold text-green-900 mb-2">Payment Summary</h3>
          <div className="space-y-1 text-xs text-green-800">
            {paymentSummary.total_amount && (
              <p><strong>Total Amount:</strong> {paymentSummary.currency || currency} {parseFloat(paymentSummary.total_amount || 0).toFixed(2)}</p>
            )}
            {paymentSummary.discount_amount && parseFloat(paymentSummary.discount_amount) > 0 && (
              <p><strong>Discount:</strong> -{paymentSummary.currency || currency} {parseFloat(paymentSummary.discount_amount).toFixed(2)}</p>
            )}
            <p><strong>Final Amount:</strong> {paymentSummary.currency || currency} {parseFloat(paymentSummary.final_amount || amount || 0).toFixed(2)}</p>
            {paymentSummary.quantity && (
              <p><strong>Quantity:</strong> {paymentSummary.quantity}</p>
            )}
            {paymentSummary.unit_price && (
              <p><strong>Unit Price:</strong> {paymentSummary.currency || currency} {parseFloat(paymentSummary.unit_price).toFixed(2)}</p>
            )}
            
            {/* Payment Breakdown - Hidden from Training Center */}
            {/* Only show breakdown if user is NOT training center AND there's commission/provider info */}
            {!isTrainingCenter && 
             (paymentSummary.commission_amount || paymentSummary.provider_amount) && (
              <div className="mt-3 pt-3 border-t border-green-300">
                <p className="text-xs font-semibold text-green-900 mb-1">Payment Breakdown:</p>
                {paymentSummary.provider_amount && (
                  <p className="text-xs text-green-800">
                    <strong>Provider Receives:</strong> {paymentSummary.currency || currency} {parseFloat(paymentSummary.provider_amount).toFixed(2)}
                  </p>
                )}
                {paymentSummary.commission_amount && (
                  <p className="text-xs text-green-800">
                    <strong>Platform Commission:</strong> {paymentSummary.currency || currency} {parseFloat(paymentSummary.commission_amount).toFixed(2)}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <Elements stripe={stripePromise}>
        <PaymentForm
          clientSecret={clientSecret}
          amount={amount}
          currency={currency}
          onPaymentSuccess={handlePaymentSuccess}
          onPaymentError={handlePaymentError}
          onCancel={onClose}
          loading={loading}
        />
      </Elements>
    </Modal>
  );
};

export default StripePaymentModal;

