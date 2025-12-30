import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://aeroenix.com/v1/api';

// Get auth token from sessionStorage (for pending users) or localStorage
const getAuthToken = () => {
  return sessionStorage.getItem('auth_token') || 
         sessionStorage.getItem('token') || 
         localStorage.getItem('auth_token') || 
         localStorage.getItem('token');
};

// Request deduplication: track pending requests to prevent duplicate calls
const pendingRequests = new Map();

// Generate a unique key for a request
const getRequestKey = (method, url, params) => {
  const methodUpper = method?.toUpperCase() || 'GET';
  const paramsStr = params ? JSON.stringify(params) : '';
  return `${methodUpper}:${url}:${paramsStr}`;
};

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Store original methods for deduplication
const originalGet = api.get.bind(api);
const originalPost = api.post.bind(api);
const originalPut = api.put.bind(api);
const originalDelete = api.delete.bind(api);

// Wrap GET requests with deduplication
api.get = function(url, config = {}) {
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

// Request interceptor to add auth token and log requests
api.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Log API request details
    console.log('📤 API Request:', {
      method: config.method?.toUpperCase(),
      url: `${config.baseURL}${config.url}`,
      headers: config.headers,
      data: config.data,
      params: config.params,
    });
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    // Log API response details
    console.log('📥 API Response:', {
      status: response.status,
      statusText: response.statusText,
      url: response.config?.url,
      data: response.data,
    });
    return response.data;
  },
  (error) => {
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
  approveACCApplication: (id) => api.put(`/admin/accs/applications/${id}/approve`),
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
  
  // Training Centers
  listTrainingCenters: (params) => api.get('/admin/training-centers', { params }),
  getTrainingCenterDetails: (id) => api.get(`/admin/training-centers/${id}`),
  updateTrainingCenter: (id, data) => api.put(`/admin/training-centers/${id}`, data),
  
  // Training Center Applications
  getTrainingCenterApplications: (params) => api.get('/admin/training-centers/applications', { params }),
  approveTrainingCenterApplication: (id) => api.put(`/admin/training-centers/applications/${id}/approve`),
  rejectTrainingCenterApplication: (id, data) => api.put(`/admin/training-centers/applications/${id}/reject`, data),
  
  // Instructors
  listInstructors: (params) => api.get('/admin/instructors', { params }),
  getInstructorDetails: (id) => api.get(`/admin/instructors/${id}`),
  updateInstructor: (id, data) => api.put(`/admin/instructors/${id}`, data),
  
  // Instructor Authorizations
  getPendingCommissionRequests: (params) => api.get('/admin/instructor-authorizations/pending-commission', { params }),
  setInstructorAuthorizationCommission: (id, data) => api.put(`/admin/instructor-authorizations/${id}/set-commission`, data),
  
  // Categories & Courses
  createCategory: (data) => api.post('/admin/categories', data),
  listCategories: (params) => api.get('/admin/categories', { params }),
  updateCategory: (id, data) => api.put(`/admin/categories/${id}`, data),
  deleteCategory: (id) => api.delete(`/admin/categories/${id}`),
  createSubCategory: (data) => api.post('/admin/sub-categories', data),
  listSubCategories: (params) => api.get('/admin/sub-categories', { params }),
  updateSubCategory: (id, data) => api.put(`/admin/sub-categories/${id}`, data),
  deleteSubCategory: (id) => api.delete(`/admin/sub-categories/${id}`),
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
};

// ACC Admin APIs
export const accAPI = {
  getDashboard: () => api.get('/acc/dashboard'),
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
  previewTemplate: (id, data) => api.post(`/acc/certificate-templates/${id}/preview`, data),
  
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
  
  // Sub Categories
  listSubCategories: (params) => api.get('/acc/sub-categories', { params }),
  getSubCategory: (id) => api.get(`/acc/sub-categories/${id}`),
  createSubCategory: (data) => api.post('/acc/sub-categories', data),
  updateSubCategory: (id, data) => api.put(`/acc/sub-categories/${id}`, data),
  deleteSubCategory: (id) => api.delete(`/acc/sub-categories/${id}`),
};

// Training Center APIs
export const trainingCenterAPI = {
  getDashboard: () => api.get('/training-center/dashboard'),
  
  // ACCs
  listACCs: (params) => api.get('/training-center/accs', { params }),
  requestAuthorization: (id, formData) => {
    const token = getAuthToken();
    const headers = {
      'Accept': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return axios.post(`${API_BASE_URL}/training-center/accs/${id}/request-authorization`, formData, {
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
  updateInstructor: (id, data) => {
    // If data is FormData, use axios directly with proper headers
    if (data instanceof FormData) {
      const token = getAuthToken();
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        // Don't set Content-Type - let browser set it with boundary for multipart/form-data
      };
      
      // Log FormData contents before sending
      console.log('📦 FormData contents before sending:');
      const formDataEntries = [];
      for (let pair of data.entries()) {
        if (pair[1] instanceof File) {
          formDataEntries.push(`${pair[0]}: [File] ${pair[1].name} (${pair[1].size} bytes, type: ${pair[1].type})`);
        } else {
          formDataEntries.push(`${pair[0]}: ${pair[1]} (type: ${typeof pair[1]})`);
        }
      }
      console.log(formDataEntries);
      
      // Log request manually since it bypasses interceptor
      console.log('📤 API Request:', {
        method: 'POST (with _method=PUT)',
        url: `${API_BASE_URL}/training-center/instructors/${id}?_method=PUT`,
        headers: { ...headers, 'Content-Type': 'multipart/form-data (auto-set by browser)' },
        data: 'FormData (see contents above)',
      });
      
      // Use POST with _method=PUT for FormData (Laravel style)
      return axios.post(`${API_BASE_URL}/training-center/instructors/${id}?_method=PUT`, data, {
        headers,
      })
      .then(response => {
        console.log('📥 API Response:', {
          status: response.status,
          statusText: response.statusText,
          url: `/training-center/instructors/${id}`,
          data: response.data,
        });
        return response.data;
      })
      .catch(error => {
        console.error('❌ API Error:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          url: `/training-center/instructors/${id}`,
          data: error.response?.data,
          message: error.message,
        });
        throw error;
      });
    }
    return api.put(`/training-center/instructors/${id}`, data);
  },
  deleteInstructor: (id) => api.delete(`/training-center/instructors/${id}`),
  requestInstructorAuthorization: (instructorId, data) => api.post(`/training-center/instructors/${instructorId}/request-authorization`, data),
  
  // ACC Sub-Categories and Courses
  getSubCategoriesForACC: (accId) => api.get(`/training-center/accs/${accId}/sub-categories`),
  getCoursesForACC: (accId, params) => api.get(`/training-center/accs/${accId}/courses`, { params }),
  
  // Instructor Authorizations
  getInstructorAuthorizations: (params) => api.get('/training-center/instructors/authorizations', { params }),
  createInstructorAuthorizationPaymentIntent: (id, data) => api.post(`/training-center/instructors/authorizations/${id}/payment-intent`, data),
  payInstructorAuthorization: (id, data) => api.post(`/training-center/instructors/authorizations/${id}/pay`, data),
  
  // Codes
  createPaymentIntent: (data) => api.post('/training-center/codes/payment-intent', data),
  purchaseCodes: (data) => api.post('/training-center/codes/purchase', data),
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
  
  // Certificates
  generateCertificate: (data) => api.post('/training-center/certificates/generate', data),
  listCertificates: (params) => api.get('/training-center/certificates', { params }),
  getCertificateDetails: (id) => api.get(`/training-center/certificates/${id}`),
  
  // Marketplace
  browseMaterials: (params) => api.get('/training-center/marketplace/materials', { params }),
  getMaterialDetails: (id) => api.get(`/training-center/marketplace/materials/${id}`),
  purchaseFromMarketplace: (data) => api.post('/training-center/marketplace/purchase', data),
  getLibrary: (params) => api.get('/training-center/library', { params }),
  
  // Trainees
  createTrainee: (formData) => {
    const token = getAuthToken();
    const headers = {
      'Accept': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return axios.post(`${API_BASE_URL}/training-center/trainees`, formData, {
      headers,
    }).then(response => response.data);
  },
  listTrainees: (params) => api.get('/training-center/trainees', { params }),
  getTraineeDetails: (id) => api.get(`/training-center/trainees/${id}`),
  updateTrainee: (id, formData) => {
    const token = getAuthToken();
    const headers = {
      'Accept': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return axios.put(`${API_BASE_URL}/training-center/trainees/${id}`, formData, {
      headers,
    }).then(response => response.data);
  },
  deleteTrainee: (id) => api.delete(`/training-center/trainees/${id}`),
};

// Instructor APIs
export const instructorAPI = {
  getDashboard: () => api.get('/instructor/dashboard'),
  getProfile: () => api.get('/instructor/profile'),
  updateProfile: (data) => {
    if (data instanceof FormData) {
      const token = getAuthToken();
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      };
      
      // Log FormData contents before sending
      console.log('📦 FormData contents before sending:');
      const formDataEntries = [];
      for (let pair of data.entries()) {
        if (pair[1] instanceof File) {
          formDataEntries.push(`${pair[0]}: [File] ${pair[1].name} (${pair[1].size} bytes, type: ${pair[1].type})`);
        } else {
          formDataEntries.push(`${pair[0]}: ${pair[1]} (type: ${typeof pair[1]})`);
        }
      }
      console.log(formDataEntries);
      
      // Log request manually since it bypasses interceptor
      console.log('📤 API Request:', {
        method: 'POST (with _method=PUT)',
        url: `${API_BASE_URL}/instructor/profile?_method=PUT`,
        headers: { ...headers, 'Content-Type': 'multipart/form-data (auto-set by browser)' },
        data: 'FormData (see contents above)',
      });
      
      // Use POST with _method=PUT for FormData (Laravel style)
      return axios.post(`${API_BASE_URL}/instructor/profile?_method=PUT`, data, {
        headers,
      })
      .then(response => {
        console.log('📥 API Response:', {
          status: response.status,
          statusText: response.statusText,
          url: '/instructor/profile',
          data: response.data,
        });
        return response.data;
      })
      .catch(error => {
        console.error('❌ API Error:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          url: '/instructor/profile',
          data: error.response?.data,
          message: error.message,
        });
        throw error;
      });
    }
    // Use the axios instance with interceptors for JSON data
    return api.put('/instructor/profile', data);
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
