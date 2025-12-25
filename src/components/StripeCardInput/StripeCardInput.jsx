import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { CardElement, useStripe, useElements, Elements } from '@stripe/react-stripe-js';
import { getStripeConfig } from '../../config/stripe';
import './StripeCardInput.css';

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

const StripeCardElement = ({ onCardChange, error }) => {
  const [cardError, setCardError] = useState(null);

  const handleCardChange = (event) => {
    setCardError(event.error ? event.error.message : null);
    if (onCardChange) {
      onCardChange(event);
    }
  };

  return (
    <div className="space-y-2">
      <div className="p-4 border border-gray-300 rounded-lg bg-white">
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
      {(cardError || error) && (
        <p className="text-sm text-red-600">{cardError || error}</p>
      )}
    </div>
  );
};

const StripeCardInput = ({ clientSecret, onPaymentSuccess, onPaymentError, disabled = false }) => {
  const [processing, setProcessing] = useState(false);
  const [cardComplete, setCardComplete] = useState(false);
  const stripe = useStripe();
  const elements = useElements();

  const handleCardChange = (event) => {
    setCardComplete(event.complete);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!stripe || !elements) {
      if (onPaymentError) {
        onPaymentError('Stripe is not loaded. Please refresh the page.');
      }
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      if (onPaymentError) {
        onPaymentError('Card element not found.');
      }
      return;
    }

    if (!cardComplete) {
      if (onPaymentError) {
        onPaymentError('Please complete the card details.');
      }
      return;
    }

    setProcessing(true);

    try {
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
        },
      });

      if (error) {
        if (onPaymentError) {
          onPaymentError(error.message);
        }
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Clear card element after successful payment
        if (cardElement) {
          cardElement.clear();
        }
        
        if (onPaymentSuccess) {
          onPaymentSuccess(paymentIntent);
        }
      }
    } catch (err) {
      if (onPaymentError) {
        onPaymentError(err.message || 'Payment failed. Please try again.');
      }
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <StripeCardElement onCardChange={handleCardChange} />
      <button
        type="submit"
        disabled={!stripe || !cardComplete || processing || disabled}
        className="w-full px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all duration-200 hover:scale-105 shadow-sm hover:shadow-md font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
      >
        {processing ? 'Processing Payment...' : 'Pay Now'}
      </button>
    </form>
  );
};

// Wrapper component with Elements provider
const StripeCardInputWrapper = ({ clientSecret, onPaymentSuccess, onPaymentError, disabled }) => {
  const [stripePromise, setStripePromise] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getStripePromise()
      .then(promise => {
        setStripePromise(promise);
        if (!promise) {
          setError('Stripe is not configured on the backend');
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load Stripe config:', err);
        setError('Failed to load Stripe configuration');
        setLoading(false);
      });
  }, []);
  
  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-200 border-t-primary-600"></div>
        <span className="ml-3 text-sm text-gray-600">Loading payment form...</span>
      </div>
    );
  }

  if (error || !stripePromise) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-sm text-yellow-800 font-semibold mb-2">Stripe Configuration Required</p>
        <p className="text-xs text-yellow-700">
          {error || 'Stripe is not configured on the backend. Please contact support to enable credit card payments.'}
        </p>
        <p className="text-xs text-yellow-600 mt-2">
          You can still proceed by entering the Payment Intent ID manually below after completing payment on Stripe.
        </p>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise}>
      <StripeCardInput
        clientSecret={clientSecret}
        onPaymentSuccess={onPaymentSuccess}
        onPaymentError={onPaymentError}
        disabled={disabled}
      />
    </Elements>
  );
};

export default StripeCardInputWrapper;
