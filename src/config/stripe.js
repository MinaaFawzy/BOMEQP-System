/**
 * Stripe Configuration
 * 
 * IMPORTANT: Always get publishable key from backend to ensure correct key (test/live)
 * 
 * This module handles Stripe initialization by fetching the publishable key from the backend.
 * The backend endpoint `/api/stripe/config` returns the correct key based on configuration.
 */

import { stripeAPI } from '../services/api';
import { loadStripe } from '@stripe/stripe-js';

let stripePromise = null;
let publishableKey = null;
let configLoaded = false;
let configLoading = false;

/**
 * Get Stripe publishable key from backend
 * @returns {Promise<string|null>} Publishable key or null if not configured
 */
export const getStripeConfig = async () => {
  // Return cached key if already loaded
  if (configLoaded && publishableKey) {
    return publishableKey;
  }

  // Prevent multiple simultaneous requests
  if (configLoading) {
    // Wait for ongoing request
    while (configLoading) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return publishableKey;
  }

  try {
    configLoading = true;
    const response = await stripeAPI.getConfig();
    
    if (response.success && response.publishable_key) {
      publishableKey = response.publishable_key;
      configLoaded = true;
      return publishableKey;
    } else if (response.is_configured === false) {
      console.warn('Stripe is not configured on the backend');
      configLoaded = true;
      return null;
    } else {
      console.warn('Stripe config response missing publishable_key');
      configLoaded = true;
      return null;
    }
  } catch (error) {
    console.error('Failed to get Stripe config from backend:', error);
    // Fallback to env variable if backend fails
    const fallbackKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    if (fallbackKey) {
      console.warn('Using fallback Stripe key from environment variable');
      publishableKey = fallbackKey;
      configLoaded = true;
      return publishableKey;
    }
    configLoaded = true;
    return null;
  } finally {
    configLoading = false;
  }
};

/**
 * Initialize Stripe instance
 * Gets publishable key from backend and initializes Stripe.js
 * @returns {Promise<Stripe|null>} Stripe instance or null if not configured
 */
export const initializeStripe = async () => {
  // Return cached promise if already initialized
  if (stripePromise) {
    return stripePromise;
  }

  try {
    const key = await getStripeConfig();
    
    if (!key) {
      console.warn('Stripe is not configured. Credit card payments will not be available.');
      return null;
    }

    stripePromise = loadStripe(key);
    return stripePromise;
  } catch (error) {
    console.error('Failed to initialize Stripe:', error);
    return null;
  }
};

/**
 * Get Stripe instance (cached)
 * @returns {Promise<Stripe|null>} Stripe instance or null
 */
export const getStripe = async () => {
  if (!stripePromise) {
    await initializeStripe();
  }
  return stripePromise;
};

/**
 * Reset Stripe configuration (useful for testing or reconfiguration)
 */
export const resetStripeConfig = () => {
  stripePromise = null;
  publishableKey = null;
  configLoaded = false;
  configLoading = false;
};

/**
 * Process payment with Stripe
 * @param {string} clientSecret - Payment intent client secret from backend
 * @param {object} cardElement - Stripe card element
 * @param {object} billingDetails - Optional billing details
 * @returns {Promise<object>} Payment result
 */
export const processStripePayment = async (clientSecret, cardElement, billingDetails = {}) => {
  const stripe = await getStripe();
  if (!stripe) {
    throw new Error('Stripe is not available. Please ensure Stripe is configured on the backend.');
  }

  if (!clientSecret) {
    throw new Error('Client secret is required');
  }

  if (!cardElement) {
    throw new Error('Card element is required');
  }

  return await stripe.confirmCardPayment(clientSecret, {
    payment_method: {
      card: cardElement,
      billing_details: billingDetails,
    }
  });
};

