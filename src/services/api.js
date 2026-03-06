import axios from 'axios';
import { getApiTimeout } from '../config/firebase';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://app.bomeqp.com/api/api';
// const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://aeroenix.com/v1/api';

// Get auth token from sessionStorage (for pending users) or localStorage
const getAuthToken = () => {
  return sessionStorage.getItem('auth_token') ||
    sessionStorage.getItem('token') ||
    localStorage.getItem('auth_token') ||
    localStorage.getItem('token');
};

// Loading state management
let loadingCallbacks = {
  showLoading: null,
  hideLoading: null,
};

// Setup loading interceptors - called from App.jsx after LoadingContext is available
export const setupLoadingInterceptors = (showLoading, hideLoading) => {
  loadingCallbacks.showLoading = showLoading;
  loadingCallbacks.hideLoading = hideLoading;
};

// Request deduplication: track pending requests to prevent duplicate calls
const pendingRequests = new Map();

// Generate a unique key for a request
const getRequestKey = (method, url, params) => {
  const methodUpper = method?.toUpperCase() || 'GET';
  const paramsStr = params ? JSON.stringify(params) : '';
  return `${methodUpper}:${url}:${paramsStr}`;
};

// Create axios instance with Remote Config timeout
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: getApiTimeout(), // Use Firebase Remote Config timeout
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Function to update axios timeout dynamically
export const updateApiTimeout = () => {
  const newTimeout = getApiTimeout();
  api.defaults.timeout = newTimeout;
  console.log(`⚙️ API timeout updated to: ${newTimeout}ms`);
};

// Helper to check if API is disabled
const isApiDisabled = () => {
  const timeout = getApiTimeout();
  return timeout === 0;
};

// Helper to check if data is FormData
const isFormData = (data) => {
  return data instanceof FormData;
};

// Store original methods for deduplication
const originalGet = api.get.bind(api);
const originalPost = api.post.bind(api);
const originalPut = api.put.bind(api);
const originalDelete = api.delete.bind(api);

// Wrap GET requests with deduplication and API blocking
api.get = function (url, config = {}) {
  // Check if APIs are disabled
  if (isApiDisabled()) {
    console.error('🚫 API requests are disabled (timeout = 0)');
    return Promise.reject(new Error('API requests are currently disabled'));
  }

  const requestKey = getRequestKey('GET', url, config.params);

  // If there's a pending request with the same key, return its promise
  if (pendingRequests.has(requestKey)) {
    console.log('🔄 Deduplicating request:', requestKey);
    return pendingRequests.get(requestKey);
  }

  // Create the request promise
  const requestPromise = originalGet(url, config)
    .then((response) => {
      pendingRequests.delete(requestKey);
      return response;
    })
    .catch((error) => {
      pendingRequests.delete(requestKey);
      throw error;
    });

  pendingRequests.set(requestKey, requestPromise);
  return requestPromise;
};

// Wrap POST requests with API blocking
api.post = function (url, data, config) {
  if (isApiDisabled()) {
    console.error('🚫 API requests are disabled (timeout = 0)');
    return Promise.reject(new Error('API requests are currently disabled'));
  }
  return originalPost(url, data, config);
};

// Wrap PUT requests with API blocking
api.put = function (url, data, config) {
  if (isApiDisabled()) {
    console.error('🚫 API requests are disabled (timeout = 0)');
    return Promise.reject(new Error('API requests are currently disabled'));
  }
  return originalPut(url, data, config);
};

// Wrap DELETE requests with API blocking
api.delete = function (url, config) {
  if (isApiDisabled()) {
    console.error('🚫 API requests are disabled (timeout = 0)');
    return Promise.reject(new Error('API requests are currently disabled'));
  }
  return originalDelete(url, config);
};

// Request interceptor to add auth token and log requests
api.interceptors.request.use(
  (config) => {
    // Show loading indicator
    if (loadingCallbacks.showLoading) {
      loadingCallbacks.showLoading();
    }

    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // If FormData, remove Content-Type to let browser set it with boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    // Log API request details
    const requestLog = {
      method: config.method?.toUpperCase(),
      url: `${config.baseURL}${config.url}`,
      headers: {
        ...config.headers,
        Authorization: config.headers.Authorization ? 'Bearer [TOKEN]' : undefined
      },
      params: config.params,
    };

    // Handle data logging
    if (config.data instanceof FormData) {
      requestLog.data = 'FormData';
      // Log FormData entries
      const formDataEntries = {};
      for (const [key, value] of config.data.entries()) {
        if (value instanceof File) {
          formDataEntries[key] = `File: ${value.name} (${value.size} bytes, ${value.type})`;
        } else {
          formDataEntries[key] = value;
        }
      }
      requestLog.formDataEntries = formDataEntries;
    } else {
      requestLog.data = config.data;
    }

    console.log('📤 API Request:', requestLog);

    return config;
  },
  (error) => {
    // Hide loading on request error
    if (loadingCallbacks.hideLoading) {
      loadingCallbacks.hideLoading();
    }
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    // Hide loading indicator on success
    if (loadingCallbacks.hideLoading) {
      loadingCallbacks.hideLoading();
    }

    // Log API response details
    const responseLog = {
      status: response.status,
      statusText: response.statusText,
      url: response.config?.url,
      fullUrl: `${response.config?.baseURL}${response.config?.url}`,
      data: response.data,
    };

    // Add structure analysis for better debugging
    if (response.data) {
      responseLog.dataStructure = {
        type: typeof response.data,
        isArray: Array.isArray(response.data),
        keys: typeof response.data === 'object' && !Array.isArray(response.data) ? Object.keys(response.data) : null,
        hasData: !!response.data?.data,
        hasTemplates: !!response.data?.templates,
        dataLength: Array.isArray(response.data?.data) ? response.data.data.length : null,
        templatesLength: Array.isArray(response.data?.templates) ? response.data.templates.length : null,
      };
    }

    console.log('📥 API Response:', responseLog);

    // Special logging for certificate-templates endpoint
    if (response.config?.url?.includes('certificate-templates') && !response.config?.url?.includes('/preview')) {
      console.log('🎯 Certificate Templates Endpoint - Detailed Response:', {
        endpoint: response.config.url,
        method: response.config.method,
        params: response.config.params,
        responseData: JSON.stringify(response.data, null, 2),
        responseType: typeof response.data,
        isArray: Array.isArray(response.data),
        structure: response.data ? {
          directKeys: Object.keys(response.data),
          hasData: !!response.data.data,
          hasTemplates: !!response.data.templates,
          dataType: typeof response.data.data,
          templatesType: typeof response.data.templates,
        } : null
      });
    }

    return response.data;
  },
  (error) => {
    // Hide loading indicator on error
    if (loadingCallbacks.hideLoading) {
      loadingCallbacks.hideLoading();
    }

    // Log API error details
    console.error('❌ API Error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url,
      data: error.response?.data,
      message: error.message,
    });

    if (error.response?.status === 401) {
      // Handle unauthorized - clear token
      // Don't redirect here to avoid page reloads, let the app handle it
      localStorage.removeItem('auth_token');
      localStorage.removeItem('token');
      sessionStorage.removeItem('auth_token');
      sessionStorage.removeItem('token');
    }
    return Promise.reject(error);
  }
);

// Group Admin APIs
export const adminAPI = {
  // ACC Management
  getACCApplications: (params) => api.get('/admin/accs/applications', { params }),
  getACCApplication: (id) => api.get(`/admin/accs/applications/${id}`),
  approveACCApplication: (id, data) => api.put(`/admin/accs/applications/${id}/approve`, data),
  rejectACCApplication: (id, data) => api.put(`/admin/accs/applications/${id}/reject`, data),
  createACCSpace: (id) => api.post(`/admin/accs/${id}/create-space`),
  generateACCCredentials: (id) => api.post(`/admin/accs/${id}/generate-credentials`),
  listACCs: (params) => api.get('/admin/accs', { params }),
  getACCDetails: (id) => api.get(`/admin/accs/${id}`),
  updateACC: (id, data) => api.put(`/admin/accs/${id}`, data),
  setCommissionPercentage: (id, data) => api.put(`/admin/accs/${id}/commission-percentage`, data),
  getACCTransactions: (id, params) => api.get(`/admin/accs/${id}/transactions`, { params }),
  assignCategoryToACC: (id, data) => api.post(`/admin/accs/${id}/assign-category`, data),
  removeCategoryFromACC: (id, data) => api.delete(`/admin/accs/${id}/remove-category`, { data }),
  getACCCategories: (id) => api.get(`/admin/accs/${id}/categories`),
  // Stripe Account Management
  addStripeAccountToACC: (id, data) => api.put(`/admin/accs/${id}/stripe-account`, data),
  removeStripeAccountFromACC: (id) => api.delete(`/admin/accs/${id}/stripe-account`),

  // Training Centers
  listTrainingCenters: (params) => api.get('/admin/training-centers', { params }),
  getTrainingCenterDetails: (id) => api.get(`/admin/training-centers/${id}`),
  updateTrainingCenter: (id, data) => api.put(`/admin/training-centers/${id}`, data),
  getTrainingCentersMap: (params) => api.get('/admin/training-centers/map', { params }),

  // Training Center Applications
  getTrainingCenterApplications: (params) => api.get('/admin/training-centers/applications', { params }),
  approveTrainingCenterApplication: (id) => api.put(`/admin/training-centers/applications/${id}/approve`),
  rejectTrainingCenterApplication: (id, data) => api.put(`/admin/training-centers/applications/${id}/reject`, data),

  // Instructors
  listInstructors: (params) => api.get('/admin/instructors', { params }),
  getInstructorDetails: (id) => api.get(`/admin/instructors/${id}`),
  updateInstructor: (id, data) => {
    // If FormData, add _method: 'PUT' for Laravel method spoofing and use POST
    if (data instanceof FormData) {
      data.append('_method', 'PUT');
      return api.post(`/admin/instructors/${id}`, data);
    }
    return api.put(`/admin/instructors/${id}`, data);
  },

  // Instructor Authorizations
  getPendingCommissionRequests: (params) => api.get('/admin/instructor-authorizations/pending-commission', { params }),
  setInstructorAuthorizationCommission: (id, data) => api.put(`/admin/instructor-authorizations/${id}/set-commission`, data),

  // Instructor Course Management
  getInstructorAvailableCourses: (instructorId, params) => api.get(`/admin/instructors/${instructorId}/available-courses`, { params }),
  updateInstructorCourses: (instructorId, data) => api.put(`/admin/instructors/${instructorId}/courses`, data),

  // Categories & Courses
  createCategory: (data) => api.post('/admin/categories', data),
  listCategories: (params) => api.get('/admin/categories', { params }),
  updateCategory: (id, data) => api.put(`/admin/categories/${id}`, data),
  deleteCategory: (id) => api.delete(`/admin/categories/${id}`),
  downloadCategoriesTemplate: (format = 'xlsx') => {
    const token = getAuthToken();
    return axios.get(`${API_BASE_URL}/admin/categories/template/download`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
      params: { format },
      responseType: 'blob',
    });
  },
  importCategories: (formData) => {
    const token = getAuthToken();
    return axios.post(`${API_BASE_URL}/admin/categories/import`, formData, {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
    }).then(response => response.data);
  },
  createSubCategory: (data) => api.post('/admin/sub-categories', data),
  listSubCategories: (params) => api.get('/admin/sub-categories', { params }),
  updateSubCategory: (id, data) => api.put(`/admin/sub-categories/${id}`, data),
  deleteSubCategory: (id) => api.delete(`/admin/sub-categories/${id}`),
  downloadSubCategoriesTemplate: (format = 'xlsx') => {
    const token = getAuthToken();
    return axios.get(`${API_BASE_URL}/admin/sub-categories/template/download`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
      params: { format },
      responseType: 'blob',
    });
  },
  importSubCategories: (formData) => {
    const token = getAuthToken();
    return axios.post(`${API_BASE_URL}/admin/sub-categories/import`, formData, {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
    }).then(response => response.data);
  },
  listCourses: (params) => api.get('/admin/courses', { params }),
  getCourseDetails: (id) => api.get(`/admin/courses/${id}`),
  createClass: (data) => api.post('/admin/classes', data),
  listClasses: (params) => api.get('/admin/classes', { params }),
  updateClass: (id, data) => api.put(`/admin/classes/${id}`, data),
  deleteClass: (id) => api.delete(`/admin/classes/${id}`),

  // Dashboard
  getDashboard: () => api.get('/admin/dashboard'),

  // Financial & Reporting
  getFinancialDashboard: () => api.get('/admin/financial/dashboard'),
  getFinancialTransactions: (params) => api.get('/admin/financial/transactions', { params }),
  getPaymentTransactions: (params) => api.get('/admin/financial/transactions', { params }),
  getSettlements: (params) => api.get('/admin/financial/settlements', { params }),
  requestPayment: (id) => api.post(`/admin/financial/settlements/${id}/request-payment`),
  getRevenueReport: (params) => api.get('/admin/reports/revenue', { params }),
  getACCsReport: (params) => api.get('/admin/reports/accs', { params }),
  getTrainingCentersReport: (params) => api.get('/admin/reports/training-centers', { params }),
  getCertificatesReport: (params) => api.get('/admin/reports/certificates', { params }),

  // Stripe Settings
  listStripeSettings: (params) => api.get('/admin/stripe-settings', { params }),
  getActiveStripeSetting: () => api.get('/admin/stripe-settings/active'),
  createStripeSetting: (data) => api.post('/admin/stripe-settings', data),
  updateStripeSetting: (id, data) => api.put(`/admin/stripe-settings/${id}`, data),
  deleteStripeSetting: (id) => api.delete(`/admin/stripe-settings/${id}`),

  // Code Batches - Manual Payment
  getPendingPayments: (params) => api.get('/admin/code-batches/pending-payments', { params }),
  approvePayment: (id, data) => api.put(`/admin/code-batches/${id}/approve-payment`, data),
  rejectPayment: (id, data) => api.put(`/admin/code-batches/${id}/reject-payment`, data),

  // Stripe Connect Admin Portal
  getAllStripeConnectAccounts: (params) => api.get('/admin/stripe-connect/accounts', { params }),
  getStripeConnectAccountDetails: (accountType, accountId) => api.get(`/admin/stripe-connect/accounts/${accountType}/${accountId}`),
  initiateStripeConnect: (data) => api.post('/admin/stripe-connect/initiate', data),
  getStripeConnectStatus: (accountType, accountId) => api.get(`/admin/stripe-connect/status/${accountType}/${accountId}`),
  retryStripeConnect: (accountType, accountId) => api.post(`/admin/stripe-connect/retry/${accountType}/${accountId}`),
  disconnectStripeConnect: (accountType, accountId) => api.delete(`/admin/stripe-connect/disconnect/${accountType}/${accountId}`),
  resendStripeOnboardingLink: (data) => api.post('/admin/stripe-connect/resend-link', data),
  getStripeConnectLogs: (params) => api.get('/admin/stripe-connect/logs', { params }),
  getStripeConnectStats: () => api.get('/admin/stripe-connect/stats'),
  getAdminActivityLogs: (params) => api.get('/admin/activity-logs', { params }),

  // Automatic Transfer System
  getAllTransfers: (params) => api.get('/admin/transfers', { params }),
  getTransferDetails: (id) => api.get(`/admin/transfers/${id}`),
  getTransferSummaryReport: (params) => api.get('/admin/transfers/reports/summary', { params }),
  retryFailedTransfer: (id) => api.post(`/admin/transfers/${id}/retry`),

  // Certificate Templates (Group Admin - Instructor Achievement)
  listCertificateTemplates: (params) => api.get('/admin/certificate-templates', { params }),
  getCertificateTemplate: (id) => api.get(`/admin/certificate-templates/${id}`),
  createCertificateTemplate: (data) => api.post('/admin/certificate-templates', data),
  updateCertificateTemplate: (id, data) => api.put(`/admin/certificate-templates/${id}`, data),
  deleteCertificateTemplate: (id) => api.delete(`/admin/certificate-templates/${id}`),
  uploadCertificateTemplateBackground: (id, formData) => {
    const token = getAuthToken();
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    };
    return axios.post(`${API_BASE_URL}/admin/certificate-templates/${id}/upload-background`, formData, {
      headers,
    }).then(response => response.data);
  },
  updateCertificateTemplateConfig: (id, data) => api.put(`/admin/certificate-templates/${id}/config`, data),
};

// ACC Admin APIs
export const accAPI = {
  getDashboard: () => api.get('/acc/dashboard'),
  getProfile: () => api.get('/acc/profile'),
  // Use POST method (recommended for FormData/file uploads) - Laravel method spoofing handles PUT semantics
  updateProfile: (data) => {
    // If FormData, add _method: 'PUT' for Laravel method spoofing and use POST
    if (data instanceof FormData) {
      data.append('_method', 'PUT');
    }
    return api.post('/acc/profile', data);
  },
  verifyStripeAccount: (stripeAccountId) => api.post('/acc/profile/verify-stripe-account', { stripe_account_id: stripeAccountId }),
  getSubscription: () => api.get('/acc/subscription'),
  createSubscriptionPaymentIntent: (data) => api.post('/acc/subscription/payment-intent', data),
  createRenewalPaymentIntent: (data) => api.post('/acc/subscription/renew-payment-intent', data),
  paySubscription: (data) => api.post('/acc/subscription/payment', data),
  renewSubscription: (data) => api.put('/acc/subscription/renew', data),

  // Training Centers
  getTrainingCenterRequests: (params) => api.get('/acc/training-centers/requests', { params }),
  approveTrainingCenterRequest: (id) => api.put(`/acc/training-centers/requests/${id}/approve`),
  rejectTrainingCenterRequest: (id, data) => api.put(`/acc/training-centers/requests/${id}/reject`, data),
  returnTrainingCenterRequest: (id, data) => api.put(`/acc/training-centers/requests/${id}/return`, data),
  listAuthorizedTrainingCenters: (params) => api.get('/acc/training-centers', { params }),

  // Instructors
  getInstructorRequests: (params) => api.get('/acc/instructors/requests', { params }),
  approveInstructorRequest: (id, data) => api.put(`/acc/instructors/requests/${id}/approve`, data),
  rejectInstructorRequest: (id, data) => api.put(`/acc/instructors/requests/${id}/reject`, data),
  returnInstructorRequest: (id, data) => api.put(`/acc/instructors/requests/${id}/return`, data),
  listAuthorizedInstructors: (params) => api.get('/acc/instructors', { params }),

  // Instructor Management
  updateInstructor: (id, data) => api.put(`/acc/instructors/${id}`, data),

  // Instructor Course Management
  getInstructorAvailableCourses: (instructorId) => api.get(`/acc/instructors/${instructorId}/available-courses`),
  updateInstructorCourses: (instructorId, data) => api.put(`/acc/instructors/${instructorId}/courses`, data),

  // Courses
  createCourse: (data) => api.post('/acc/courses', data),
  listCourses: (params) => api.get('/acc/courses', { params }),
  getCourseDetails: (id) => api.get(`/acc/courses/${id}`),
  updateCourse: (id, data) => api.put(`/acc/courses/${id}`, data),
  deleteCourse: (id) => api.delete(`/acc/courses/${id}`),
  setCoursePricing: (id, data) => api.post(`/acc/courses/${id}/pricing`, data),
  updateCoursePricing: (id, data) => api.put(`/acc/courses/${id}/pricing`, data),

  // Certificate Templates
  createCertificateTemplate: (data) => api.post('/acc/certificate-templates', data),
  listCertificateTemplates: (params) => api.get('/acc/certificate-templates', { params }),
  getTemplateDetails: (id) => api.get(`/acc/certificate-templates/${id}`),
  updateTemplate: (id, data) => api.put(`/acc/certificate-templates/${id}`, data),
  deleteTemplate: (id) => api.delete(`/acc/certificate-templates/${id}`),
  uploadBackgroundImage: (id, formData) => {
    const token = getAuthToken();
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    };
    return axios.post(`${API_BASE_URL}/acc/certificate-templates/${id}/upload-background`, formData, {
      headers,
    }).then(response => response.data);
  },
  updateTemplateConfig: (id, data) => api.put(`/acc/certificate-templates/${id}/config`, data),

  // Card Templates (Trainee Card)
  getCardTemplates: () => api.get('/acc/card-template'),
  updateCardSettings: (id, data) => api.put(`/acc/certificate-templates/${id}/card`, data),
  uploadCardBackground: (id, formData) => {
    const token = getAuthToken();
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    };
    return axios.post(`${API_BASE_URL}/acc/certificate-templates/${id}/upload-card-background`, formData, {
      headers,
    }).then(response => response.data);
  },
  updateCardConfig: (id, data) => api.put(`/acc/certificate-templates/${id}/card-config`, data),

  // Discount Codes
  createDiscountCode: (data) => api.post('/acc/discount-codes', data),
  listDiscountCodes: (params) => api.get('/acc/discount-codes', { params }),
  getDiscountCodeDetails: (id) => api.get(`/acc/discount-codes/${id}`),
  updateDiscountCode: (id, data) => api.put(`/acc/discount-codes/${id}`, data),
  deleteDiscountCode: (id) => api.delete(`/acc/discount-codes/${id}`),
  validateDiscountCode: (data) => api.post('/acc/discount-codes/validate', data),

  // Materials
  createMaterial: (data) => api.post('/acc/materials', data),
  listMaterials: (params) => api.get('/acc/materials', { params }),
  getMaterialDetails: (id) => api.get(`/acc/materials/${id}`),
  updateMaterial: (id, data) => api.put(`/acc/materials/${id}`, data),
  deleteMaterial: (id) => api.delete(`/acc/materials/${id}`),

  // Certificates & Classes
  listCertificates: (params) => api.get('/acc/certificates', { params }),
  createCertificate: (data) => api.post('/acc/certificates', data),
  listClasses: (params) => api.get('/acc/classes', { params }),
  getClassDetails: (id) => api.get(`/acc/classes/${id}`),

  // Financial
  getFinancialTransactions: (params) => api.get('/acc/financial/transactions', { params }),
  getPaymentTransactions: (params) => api.get('/acc/financial/transactions', { params }),
  getSettlements: (params) => api.get('/acc/financial/settlements', { params }),

  // Categories
  listCategories: (params) => api.get('/acc/categories', { params }),
  getCategory: (id) => api.get(`/acc/categories/${id}`),
  createCategory: (data) => api.post('/acc/categories', data),
  updateCategory: (id, data) => api.put(`/acc/categories/${id}`, data),
  deleteCategory: (id) => api.delete(`/acc/categories/${id}`),
  downloadCategoriesTemplate: (format = 'xlsx') => {
    const token = getAuthToken();
    return axios.get(`${API_BASE_URL}/admin/categories/template/download`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
      params: { format },
      responseType: 'blob',
    });
  },
  importCategories: (formData) => {
    const token = getAuthToken();
    return axios.post(`${API_BASE_URL}/admin/categories/import`, formData, {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
    }).then(response => response.data);
  },

  // Sub Categories
  listSubCategories: (params) => api.get('/acc/sub-categories', { params }),
  getSubCategory: (id) => api.get(`/acc/sub-categories/${id}`),
  createSubCategory: (data) => api.post('/acc/sub-categories', data),
  updateSubCategory: (id, data) => api.put(`/acc/sub-categories/${id}`, data),
  deleteSubCategory: (id) => api.delete(`/acc/sub-categories/${id}`),
  downloadSubCategoriesTemplate: (format = 'xlsx') => {
    const token = getAuthToken();
    return axios.get(`${API_BASE_URL}/admin/sub-categories/template/download`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
      params: { format },
      responseType: 'blob',
    });
  },
  importSubCategories: (formData) => {
    const token = getAuthToken();
    return axios.post(`${API_BASE_URL}/admin/sub-categories/import`, formData, {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
    }).then(response => response.data);
  },

  // Code Batches - Manual Payment
  getPendingPayments: (params) => api.get('/acc/code-batches/pending-payments', { params }),
  approvePayment: (id, data) => api.put(`/acc/code-batches/${id}/approve-payment`, data),
  rejectPayment: (id, data) => api.put(`/acc/code-batches/${id}/reject-payment`, data),
};

// Training Center APIs
export const trainingCenterAPI = {
  getDashboard: () => api.get('/training-center/dashboard'),
  getProfile: () => api.get('/training-center/profile'),
  // Use POST method (recommended for FormData/file uploads) - Laravel method spoofing handles PUT semantics
  updateProfile: (data) => {
    // If FormData, add _method: 'PUT' for Laravel method spoofing and use POST
    if (data instanceof FormData) {
      data.append('_method', 'PUT');
    }
    return api.post('/training-center/profile', data);
  },

  // ACCs
  listACCs: (params) => api.get('/training-center/accs', { params }),
  requestAuthorization: (formData) => {
    const token = getAuthToken();
    const headers = {
      'Accept': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return axios.post(`${API_BASE_URL}/training-center/authorizations`, formData, {
      headers,
    }).then(response => response.data);
  },
  getAuthorizationStatus: (params) => api.get('/training-center/authorizations', { params }),

  // Instructors
  createInstructor: (data) => {
    // If data is FormData, use axios directly with proper headers
    if (data instanceof FormData) {
      const token = getAuthToken();
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        // Don't set Content-Type - let browser set it with boundary for multipart/form-data
      };
      return axios.post(`${API_BASE_URL}/training-center/instructors`, data, {
        headers,
      }).then(response => response.data);
    }
    return api.post('/training-center/instructors', data);
  },
  listInstructors: (params) => api.get('/training-center/instructors', params ? { params } : {}),
  getInstructorDetails: (id) => api.get(`/training-center/instructors/${id}`),
  // Use POST method (recommended for FormData/file uploads) - Laravel method spoofing handles PUT semantics
  updateInstructor: (id, data) => {
    // If FormData, add _method: 'PUT' for Laravel method spoofing and use POST
    if (data instanceof FormData) {
      data.append('_method', 'PUT');
    }
    return api.post(`/training-center/instructors/${id}`, data);
  },
  deleteInstructor: (id) => api.delete(`/training-center/instructors/${id}`),
  requestInstructorAuthorization: (instructorId, data) => api.post(`/training-center/instructors/${instructorId}/request-authorization`, data),

  // ACC Categories, Sub-Categories and Courses
  getCategoriesForACC: (accId) => api.get(`/training-center/accs/${accId}/categories`),
  getSubCategoriesForCategory: (categoryId) => api.get(`/training-center/accs/${categoryId}/sub-categories`),
  getCoursesForACC: (accId, params) => api.get(`/training-center/accs/${accId}/courses`, { params }),

  // Instructor Authorizations
  getInstructorAuthorizations: (params) => api.get('/training-center/instructors/authorizations', { params }),
  createInstructorAuthorizationPaymentIntent: (id, data) => api.post(`/training-center/instructors/authorizations/${id}/payment-intent`, data),
  payInstructorAuthorization: (id, data) => api.post(`/training-center/instructors/authorizations/${id}/pay`, data),

  // Codes
  // Note: Using payment-intent endpoint as create-payment-intent returns 404
  createPaymentIntent: (data) => api.post('/training-center/codes/payment-intent', data),
  purchaseCodes: (data) => {
    // Use api.post for both JSON and FormData
    // The interceptor will handle FormData by removing Content-Type header
    return api.post('/training-center/codes/purchase', data);
  },
  getCodeInventory: (params) => api.get('/training-center/codes/inventory', { params }),
  getCodeBatches: (params) => api.get('/training-center/codes/batches', { params }),

  // Wallet
  addFunds: (data) => api.post('/training-center/wallet/add-funds', data),
  getWalletBalance: () => api.get('/training-center/wallet/balance'),
  getWalletTransactions: (params) => api.get('/training-center/wallet/transactions', { params }),
  getPaymentTransactions: (params) => api.get('/training-center/financial/transactions', { params }),

  // Classes
  createClass: (data) => api.post('/training-center/classes', data),
  listClasses: (params) => api.get('/training-center/classes', { params }),
  getClassDetails: (id) => api.get(`/training-center/classes/${id}`),
  updateClass: (id, data) => api.put(`/training-center/classes/${id}`, data),
  deleteClass: (id) => api.delete(`/training-center/classes/${id}`),
  markClassComplete: (id) => api.put(`/training-center/classes/${id}/complete`),
  saveClassGrades: (id, data) => api.post(`/training-center/classes/${id}/grades`, data),
  exportClassGradesTemplate: (id) => {
    const token = getAuthToken();
    return axios.get(`${API_BASE_URL}/training-center/classes/${id}/grades/export`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      responseType: 'blob',
    });
  },
  importClassGrades: (id, formData) => {
    const token = getAuthToken();
    return axios.post(`${API_BASE_URL}/training-center/classes/${id}/grades/import`, formData, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }).then(response => response.data);
  },
  generateClassCertificates: (id, data) => api.post(`/training-center/classes/${id}/certificates/generate`, data),

  // Certificates
  getAuthorizedACCs: (params) => api.get('/training-center/certificates/accs', { params }),
  getCoursesForCertificate: (params) => api.get('/training-center/courses', { params }),
  issueCertificate: (data) => api.post('/training-center/certificates', data),
  listCertificates: (params) => api.get('/training-center/certificates', { params }),
  getCertificateDetails: (id) => api.get(`/training-center/certificates/${id}`),
  checkCertificateValidity: (id) => api.get(`/training-center/certificates/${id}/validity`),
  downloadCertificatePDF: (id) => {
    const token = getAuthToken();
    return axios.get(`${API_BASE_URL}/training-center/certificates/${id}/download`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/pdf',
      },
      params: {
        format: 'pdf'
      },
      responseType: 'blob',
    });
  },

  // Marketplace
  browseMaterials: (params) => api.get('/training-center/marketplace/materials', { params }),
  getMaterialDetails: (id) => api.get(`/training-center/marketplace/materials/${id}`),
  purchaseFromMarketplace: (data) => api.post('/training-center/marketplace/purchase', data),
  getLibrary: (params) => api.get('/training-center/library', { params }),

  // Trainees
  createTrainee: (formData) => api.post('/training-center/trainees', formData),
  listTrainees: (params) => api.get('/training-center/trainees', { params }),
  getTraineeDetails: (id) => api.get(`/training-center/trainees/${id}`),
  // Use POST method (recommended for FormData/file uploads) - Laravel method spoofing handles PUT semantics
  updateTrainee: (id, formData) => {
    // If FormData, add _method: 'PUT' for Laravel method spoofing
    if (formData instanceof FormData) {
      formData.append('_method', 'PUT');
    }
    return api.post(`/training-center/trainees/${id}`, formData);
  },
  deleteTrainee: (id) => api.delete(`/training-center/trainees/${id}`),
};

// Instructor APIs
export const instructorAPI = {
  getDashboard: () => api.get('/instructor/dashboard'),
  getProfile: () => api.get('/instructor/profile'),
  // Use POST method (recommended for FormData/file uploads) - Laravel method spoofing handles PUT semantics
  updateProfile: (data) => {
    // If FormData, add _method: 'PUT' for Laravel method spoofing and use POST
    if (data instanceof FormData) {
      data.append('_method', 'PUT');
    }
    return api.post('/instructor/profile', data);
  },
  listClasses: (params) => api.get('/instructor/classes', { params }),
  getClassDetails: (id) => api.get(`/instructor/classes/${id}`),
  markClassComplete: (id, data) => api.put(`/instructor/classes/${id}/mark-complete`, data),
  getTrainingCenters: () => api.get('/instructor/training-centers'),
  getACCs: () => api.get('/instructor/accs'),
  getAvailableMaterials: (params) => api.get('/instructor/materials', { params }),
  getEarnings: (params) => api.get('/instructor/earnings', { params }),
};

// Public APIs (No authentication required)
export const publicAPI = {
  getCountries: () => api.get('/countries'),
  getCities: (countryCode) => api.get('/cities', { params: countryCode ? { country: countryCode } : {} }),
  getLanguages: () => api.get('/languages'),
  getNationalities: () => api.get('/nationalities'),
  verifyCertificate: (code) => api.get(`/certificates/verify/${code}`),
};

// Stripe APIs (All authenticated users)
export const stripeAPI = {
  getConfig: () => api.get('/stripe/config'),
  createPaymentIntent: (data) => api.post('/stripe/payment-intent', data),
  confirmPayment: (data) => api.post('/stripe/confirm', data),
};

// Auth APIs
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  logout: () => api.post('/auth/logout'),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.put('/auth/change-password', data),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
};

// Notifications APIs (All authenticated users)
export const notificationsAPI = {
  // Get all notifications with optional filters
  getNotifications: (params) => api.get('/notifications', { params }),

  // Get unread count
  getUnreadCount: () => api.get('/notifications/unread-count'),

  // Get single notification
  getNotification: (id) => api.get(`/notifications/${id}`),

  // Mark notification as read
  markAsRead: (id) => api.put(`/notifications/${id}/read`),

  // Mark notification as unread
  markAsUnread: (id) => api.put(`/notifications/${id}/unread`),

  // Mark all notifications as read
  markAllAsRead: () => api.post('/notifications/mark-all-read'),

  // Delete notification
  deleteNotification: (id) => api.delete(`/notifications/${id}`),

  // Delete all read notifications
  deleteAllRead: () => api.delete('/notifications/read'),
};

// File Upload Helper
export const uploadFile = async (file, endpoint = '/upload/document') => {
  const formData = new FormData();
  formData.append('file', file);

  const token = getAuthToken();
  const headers = {
    'Accept': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await axios.post(`${API_BASE_URL}${endpoint}`, formData, {
    headers,
  });

  return response.data;
};

export default api;
