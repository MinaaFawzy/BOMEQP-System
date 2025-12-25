import { useEffect, useState } from 'react';
import { trainingCenterAPI } from '../../../services/api';
import { useHeader } from '../../../context/HeaderContext';
import { getAuthToken } from '../../../config/api';
import axios from 'axios';
import { Package, ShoppingCart, Search, Filter, ChevronUp, ChevronDown, BookOpen, Building2, CheckCircle2, XCircle } from 'lucide-react';
import Modal from '../../../components/Modal/Modal';
import FormInput from '../../../components/FormInput/FormInput';
import StripePaymentModal from '../../../components/StripePaymentModal/StripePaymentModal';
import './CodesScreen.css';
import '../../../components/FormInput/FormInput.css';

const CodesScreen = () => {
  const { setHeaderActions, setHeaderTitle, setHeaderSubtitle } = useHeader();
  const [inventory, setInventory] = useState([]);
  const [sortedInventory, setSortedInventory] = useState([]);
  const [batches, setBatches] = useState([]);
  const [sortedBatches, setSortedBatches] = useState([]);
  const [courses, setCourses] = useState([]);
  const [accs, setAccs] = useState([]);
  const [discountCodes, setDiscountCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingDiscountCodes, setLoadingDiscountCodes] = useState(false);
  const [activeTab, setActiveTab] = useState('inventory');
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [purchaseForm, setPurchaseForm] = useState({
    acc_id: '',
    course_id: '',
    quantity: '',
    discount_code: '',
    payment_method: 'credit_card', // Changed from 'wallet' to 'credit_card' - wallet option removed
    payment_intent_id: '',
  });
  const [errors, setErrors] = useState({});
  const [purchasing, setPurchasing] = useState(false);
  const [creatingPaymentIntent, setCreatingPaymentIntent] = useState(false);
  const [paymentIntentData, setPaymentIntentData] = useState(null);
  const [showStripeModal, setShowStripeModal] = useState(false);
  const [accsMap, setAccsMap] = useState(new Map()); // Map of ACC ID to ACC object

  useEffect(() => {
    loadACCs();
  }, []);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, searchTerm, statusFilter]);

  // Load batches on initial mount and when searchTerm changes (to show count in Purchase History tab)
  useEffect(() => {
    // Don't load batches if activeTab is 'batches' - loadData will handle it
    if (activeTab === 'batches') {
      return;
    }

    const loadBatches = async () => {
      try {
        // Ensure ACCs are loaded
        let currentAccsMap = accsMap;
        if (currentAccsMap.size === 0) {
          currentAccsMap = await loadACCs();
        }
        
        const params = {};
        if (searchTerm) {
          params.search = searchTerm;
        }
        
        const data = await trainingCenterAPI.getCodeBatches(params);
        
        let batchesList = [];
        if (data.data) {
          batchesList = data.data || [];
        } else if (data.batches) {
          batchesList = data.batches || [];
        } else {
          batchesList = Array.isArray(data) ? data : [];
        }
        
        // Enrich batches with ACC data
        const enrichedBatches = await enrichCodesWithACCData(batchesList, currentAccsMap);
        setBatches(enrichedBatches);
      } catch (error) {
        console.error('Failed to load batches:', error);
        setBatches([]);
      }
    };

    loadBatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]); // Run on mount and when searchTerm changes (but not when activeTab is 'batches')

  useEffect(() => {
    if (purchaseModalOpen) {
      loadFormData();
    }
  }, [purchaseModalOpen]);

  useEffect(() => {
    applySort();
  }, [inventory, batches, sortConfig, activeTab]);

  useEffect(() => {
    setHeaderTitle('Certificate Codes');
    setHeaderSubtitle('Manage your certificate code inventory and purchases');
    setHeaderActions(
      <button
        onClick={handlePurchase}
        className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 flex items-center gap-2 transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-xl"
      >
        <ShoppingCart size={20} />
        Purchase Codes
      </button>
    );
    return () => {
      setHeaderActions(null);
      setHeaderTitle(null);
      setHeaderSubtitle(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setHeaderActions, setHeaderTitle, setHeaderSubtitle]);

  const loadFormData = async () => {
    try {
      // Load approved ACCs
      const authData = await trainingCenterAPI.getAuthorizationStatus();
      const approvedAuthorizations = (authData.authorizations || []).filter(
        auth => auth.status === 'approved'
      );
      
      // Get unique approved ACCs with their details
      const accMap = new Map();
      approvedAuthorizations.forEach(auth => {
        const accId = auth.acc_id || auth.acc?.id;
        if (accId) {
          const finalAccId = typeof accId === 'string' ? parseInt(accId) : accId;
          if (!accMap.has(finalAccId)) {
            accMap.set(finalAccId, {
              id: finalAccId,
              name: auth.acc?.name || `ACC ${finalAccId}`,
            });
          }
        }
      });
      
      const approvedAccs = Array.from(accMap.values());
      console.log('Approved ACCs:', approvedAccs);
      setAccs(approvedAccs);
      setCourses([]); // Clear courses initially
    } catch (error) {
      console.error('Failed to load form data:', error);
      setAccs([]);
      setCourses([]);
    }
  };

  const loadCoursesForACC = async (accId) => {
    if (!accId) {
      setCourses([]);
      return;
    }

    setLoadingCourses(true);
    try {
      const finalAccId = typeof accId === 'string' ? parseInt(accId) : accId;
      
      // Try to get courses directly from ACC endpoint
      const token = getAuthToken();
      const baseURL = import.meta.env.VITE_API_BASE_URL || 'https://aeroenix.com/v1/api';
      
      const endpoints = [
        `${baseURL}/training-center/accs/${finalAccId}/courses`,
        `${baseURL}/acc/${finalAccId}/courses`,
        `${baseURL}/training-center/courses?acc_id=${finalAccId}`,
      ];
      
      let coursesList = [];
      
      // Try each endpoint until one works
      for (const endpoint of endpoints) {
        try {
          const response = await axios.get(endpoint, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json',
            },
          });
          
          const data = response.data;
          coursesList = data.courses || data.data || data || [];
          
          if (coursesList.length > 0) {
            // Ensure all courses have acc_id set
            coursesList = coursesList.map(course => ({
              ...course,
              acc_id: finalAccId,
            }));
            break; // Success, exit loop
          }
        } catch (error) {
          // Continue to next endpoint
          continue;
        }
      }
      
      // If direct endpoint didn't work, fallback to classes
      if (coursesList.length === 0) {
        try {
          const classesData = await trainingCenterAPI.listClasses({ acc_id: finalAccId });
          const classesList = classesData?.classes || classesData?.data || [];
          
          const courseMap = new Map();
          classesList.forEach(cls => {
            if (cls.course) {
              const courseObj = typeof cls.course === 'object' ? cls.course : { id: cls.course, name: cls.course };
              const courseId = courseObj.id ? (typeof courseObj.id === 'string' ? parseInt(courseObj.id) : courseObj.id) : null;
              const courseKey = courseId || courseObj.name;
              
              if (courseKey && !courseMap.has(courseKey)) {
                courseMap.set(courseKey, {
                  ...courseObj,
                  id: courseId || courseObj.id,
                  acc_id: finalAccId,
                });
                coursesList.push(courseMap.get(courseKey));
              }
            }
          });
        } catch (err) {
          console.error('Failed to load courses from classes:', err);
        }
      }
      
      console.log(`Loaded courses for ACC ${finalAccId}:`, coursesList);
      setCourses(coursesList);
    } catch (error) {
      console.error('Failed to load courses:', error);
      setCourses([]);
    } finally {
      setLoadingCourses(false);
    }
  };

  const handleACCChange = (accId) => {
    // Clear course selection and discount codes when ACC changes
    setPurchaseForm({ ...purchaseForm, acc_id: accId, course_id: '', discount_code: '' });
    setCourses([]);
    setDiscountCodes([]);
    loadCoursesForACC(accId);
  };

  const loadDiscountCodes = async (accId, courseId) => {
    if (!accId || !courseId) {
      setDiscountCodes([]);
      return;
    }

    setLoadingDiscountCodes(true);
    try {
      const finalAccId = typeof accId === 'string' ? parseInt(accId) : accId;
      const finalCourseId = typeof courseId === 'string' ? parseInt(courseId) : courseId;
      const token = getAuthToken();
      const baseURL = import.meta.env.VITE_API_BASE_URL || 'https://aeroenix.com/v1/api';
      
      console.log(`Loading discount codes for ACC ${finalAccId} and Course ${finalCourseId}`);
      
      // Try different endpoints to get discount codes
      const endpoints = [
        `${baseURL}/training-center/accs/${finalAccId}/courses/${finalCourseId}/discount-codes`,
        `${baseURL}/training-center/discount-codes?acc_id=${finalAccId}&course_id=${finalCourseId}`,
        `${baseURL}/acc/${finalAccId}/discount-codes?course_id=${finalCourseId}`,
        `${baseURL}/training-center/discount-codes?acc_id=${finalAccId}`,
        `${baseURL}/acc/${finalAccId}/discount-codes`,
      ];
      
      let codesList = [];
      let lastError = null;
      
      // Try each endpoint until one works
      for (const endpoint of endpoints) {
        try {
          console.log(`Trying endpoint: ${endpoint}`);
          const response = await axios.get(endpoint, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json',
            },
          });
          
          console.log(`Response from ${endpoint}:`, response.data);
          const data = response.data;
          
          // Try different possible response structures
          codesList = data.discount_codes || data.discountCodes || data.codes || data.data || data || [];
          
          // Ensure it's an array
          if (!Array.isArray(codesList)) {
            codesList = [];
          }
          
          console.log(`Raw codes list (${codesList.length} items):`, codesList);
          
          // Filter active discount codes only (less strict filtering)
          if (codesList.length > 0) {
            codesList = codesList.filter(code => {
              // Check if code is active (if status field exists)
              const hasStatus = code.status !== undefined;
              const isActive = !hasStatus || code.status === 'active' || code.is_active === true || code.status !== 'inactive';
              
              // Check expiration (if expires_at exists)
              const hasExpiration = code.expires_at !== undefined && code.expires_at !== null;
              const notExpired = !hasExpiration || new Date(code.expires_at) > new Date();
              
              // Check uses left (if max_uses exists)
              const hasMaxUses = code.max_uses !== undefined && code.max_uses !== null;
              const hasUsesLeft = !hasMaxUses || (code.used_count || 0) < code.max_uses;
              
              const isValid = isActive && notExpired && hasUsesLeft;
              console.log(`Code ${code.code || code.discount_code || code.id}: active=${isActive}, notExpired=${notExpired}, hasUsesLeft=${hasUsesLeft}, isValid=${isValid}`);
              
              return isValid;
            });
            
            console.log(`Filtered codes list (${codesList.length} items):`, codesList);
          }
          
          if (codesList.length > 0) {
            console.log(`Successfully loaded ${codesList.length} discount codes from ${endpoint}`);
            break; // Success, exit loop
          } else if (codesList.length === 0 && Array.isArray(data.discount_codes || data.discountCodes || data.codes || data.data || data)) {
            // If we got an empty array, that's valid - no codes available
            console.log(`No discount codes available from ${endpoint}`);
            break;
          }
        } catch (error) {
          console.log(`Endpoint ${endpoint} failed:`, error.response?.status, error.response?.data || error.message);
          lastError = error;
          // Continue to next endpoint
          continue;
        }
      }
      
      console.log(`Final discount codes for ACC ${finalAccId} and Course ${finalCourseId}:`, codesList);
      setDiscountCodes(codesList);
      
      if (codesList.length === 0 && lastError) {
        console.warn('No discount codes found. All endpoints failed or returned empty results.');
      }
    } catch (error) {
      console.error('Failed to load discount codes:', error);
      console.error('Error details:', error.response?.status, error.response?.data);
      setDiscountCodes([]);
    } finally {
      setLoadingDiscountCodes(false);
    }
  };

  const handleCourseChange = (courseId) => {
    setPurchaseForm({ ...purchaseForm, course_id: courseId, discount_code: '' });
    if (purchaseForm.acc_id && courseId) {
      loadDiscountCodes(purchaseForm.acc_id, courseId);
    } else {
      setDiscountCodes([]);
    }
  };

  const loadACCs = async () => {
    try {
      const accsData = await trainingCenterAPI.listACCs();
      const accsList = Array.isArray(accsData) ? accsData : (accsData.accs || accsData.data || []);
      
      // Create a map of ACC ID to ACC object
      const newAccsMap = new Map();
      accsList.forEach(acc => {
        const accId = acc.id || acc.acc_id;
        if (accId) {
          newAccsMap.set(accId, acc);
          // Also map string IDs
          newAccsMap.set(String(accId), acc);
        }
      });
      
      setAccsMap(newAccsMap);
      console.log('Loaded ACCs map:', newAccsMap.size, 'ACCs');
      return newAccsMap;
    } catch (error) {
      console.error('Failed to load ACCs:', error);
      return new Map();
    }
  };

  const fetchACCDetails = async (accId) => {
    if (!accId) return null;
    
    try {
      const token = getAuthToken();
      const baseURL = import.meta.env.VITE_API_BASE_URL || 'https://aeroenix.com/v1/api';
      
      // Try different endpoints to get ACC details
      const endpoints = [
        `${baseURL}/training-center/accs/${accId}`,
        `${baseURL}/admin/accs/${accId}`,
      ];
      
      for (const endpoint of endpoints) {
        try {
          const response = await axios.get(endpoint, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json',
            },
          });
          
          const accData = response.data?.acc || response.data?.data || response.data;
          if (accData && (accData.id || accData.acc_id)) {
            // Update the map
            const newAccsMap = new Map(accsMap);
            const accIdValue = accData.id || accData.acc_id;
            newAccsMap.set(accIdValue, accData);
            newAccsMap.set(String(accIdValue), accData);
            setAccsMap(newAccsMap);
            return accData;
          }
        } catch (error) {
          // Continue to next endpoint
          continue;
        }
      }
    } catch (error) {
      console.error(`Failed to fetch ACC details for ID ${accId}:`, error);
    }
    
    return null;
  };

  const enrichCodesWithACCData = async (codesList, accsMapToUse) => {
    const enrichedCodes = [];
    
    for (const code of codesList) {
      // Try to get ACC ID from various possible fields
      const accId = code.acc_id || 
                   (typeof code.acc === 'object' ? code.acc?.id : null) ||
                   (code.acc && typeof code.acc === 'number' ? code.acc : null) ||
                   (code.acc && typeof code.acc === 'string' && !isNaN(code.acc) ? parseInt(code.acc) : null);
      
      // If ACC data already exists and is complete, return as is
      if (typeof code.acc === 'object' && code.acc?.name && code.acc.name !== 'Unknown ACC') {
        enrichedCodes.push(code);
        continue;
      }
      
      // Try to get ACC data from map
      if (accId) {
        let accData = accsMapToUse.get(accId) || accsMapToUse.get(String(accId));
        
        // If not in map, try to fetch it
        if (!accData) {
          accData = await fetchACCDetails(accId);
          if (accData) {
            accsMapToUse = new Map(accsMapToUse);
            accsMapToUse.set(accId, accData);
            accsMapToUse.set(String(accId), accData);
          }
        }
        
        if (accData) {
          enrichedCodes.push({
            ...code,
            acc: {
              id: accData.id || accData.acc_id || accId,
              name: accData.name || accData.acc_name || `ACC ${accId}`,
              ...accData
            }
          });
        } else {
          // ACC ID exists but couldn't fetch details, use ID as name
          enrichedCodes.push({
            ...code,
            acc: {
              id: accId,
              name: `ACC ${accId}`
            }
          });
        }
      } else {
        enrichedCodes.push(code);
      }
    }
    
    return enrichedCodes;
  };

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Ensure ACCs are loaded
      let currentAccsMap = accsMap;
      if (currentAccsMap.size === 0) {
        currentAccsMap = await loadACCs();
      }
      
      const params = {};
      
      if (searchTerm) {
        params.search = searchTerm;
      }
      
      if (activeTab === 'inventory' && statusFilter !== 'all') {
        params.status = statusFilter;
      }
      
      if (activeTab === 'inventory') {
        const data = await trainingCenterAPI.getCodeInventory(params);
        
        let codesList = [];
        if (data.data) {
          codesList = data.data || [];
        } else if (data.codes) {
          codesList = data.codes || [];
        } else {
          codesList = Array.isArray(data) ? data : [];
        }
        
        // Enrich codes with ACC data
        const enrichedCodes = await enrichCodesWithACCData(codesList, currentAccsMap);
        setInventory(enrichedCodes);
      } else {
        const data = await trainingCenterAPI.getCodeBatches(params);
        
        let batchesList = [];
        if (data.data) {
          batchesList = data.data || [];
        } else if (data.batches) {
          batchesList = data.batches || [];
        } else {
          batchesList = Array.isArray(data) ? data : [];
        }
        
        // Enrich batches with ACC data
        const enrichedBatches = await enrichCodesWithACCData(batchesList, currentAccsMap);
        setBatches(enrichedBatches);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      if (activeTab === 'inventory') {
        setInventory([]);
      } else {
        setBatches([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const applySort = () => {
    const dataToSort = activeTab === 'inventory' ? inventory : batches;
    let sorted = [...dataToSort];

    // Apply sorting
    if (sortConfig.key) {
      sorted.sort((a, b) => {
        let aValue, bValue;
        
        if (typeof a[sortConfig.key] === 'object' && a[sortConfig.key] !== null) {
          aValue = a[sortConfig.key]?.name || '';
        } else {
          aValue = a[sortConfig.key] || '';
        }
        
        if (typeof b[sortConfig.key] === 'object' && b[sortConfig.key] !== null) {
          bValue = b[sortConfig.key]?.name || '';
        } else {
          bValue = b[sortConfig.key] || '';
        }
        
        if (typeof aValue === 'string') aValue = aValue.toLowerCase();
        if (typeof bValue === 'string') bValue = bValue.toLowerCase();
        
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    if (activeTab === 'inventory') {
      setSortedInventory(sorted);
    } else {
      setSortedBatches(sorted);
    }
  };

  const handlePurchase = () => {
    setPurchaseForm({
      acc_id: '',
      course_id: '',
      quantity: '',
      discount_code: '',
      payment_method: 'credit_card', // Changed from 'wallet' to 'credit_card' - wallet option removed
      payment_intent_id: '',
    });
    setErrors({});
    setPaymentIntentData(null);
    setCourses([]);
    setDiscountCodes([]);
    setPurchaseModalOpen(true);
  };

  // WALLET OPTION REMOVED - This function is now replaced by handlePurchaseClick which auto-creates payment intent
  // Keeping this commented for future reference if wallet option is needed again
  /*
  const handleCreatePaymentIntent = async () => {
    // Validate required fields
    if (!purchaseForm.acc_id || !purchaseForm.course_id || !purchaseForm.quantity) {
      setErrors({ general: 'Please select ACC, Course, and enter quantity first' });
      return;
    }

    // Ensure all IDs are integers as required by backend validation
    const accId = parseInt(purchaseForm.acc_id, 10);
    const courseId = parseInt(purchaseForm.course_id, 10);
    const quantity = parseInt(purchaseForm.quantity, 10);

    if (isNaN(accId) || isNaN(courseId) || isNaN(quantity) || quantity <= 0) {
      setErrors({ general: 'Invalid data. Please check your selections and try again.' });
      return;
    }

    setCreatingPaymentIntent(true);
    setErrors({});
    setPaymentIntentData(null);

    try {
      // Ensure all values are integers as required by backend validation
      const requestData = {
        acc_id: parseInt(accId, 10),
        course_id: parseInt(courseId, 10),
        quantity: parseInt(quantity, 10),
      };

      // Validate quantity is at least 1
      if (requestData.quantity < 1) {
        setErrors({ general: 'Quantity must be at least 1.' });
        setCreatingPaymentIntent(false);
        return;
      }

      // Add discount_code if provided
      if (purchaseForm.discount_code && purchaseForm.discount_code.trim()) {
        requestData.discount_code = purchaseForm.discount_code.trim();
      }

      // Step 1: Create Payment Intent
      const response = await trainingCenterAPI.createPaymentIntent(requestData);
      
      if (response.success && response.client_secret && response.payment_intent_id) {
        setPaymentIntentData(response);
        setPurchaseForm(prev => ({
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

  // Auto-create payment intent when user clicks Purchase button
  const handlePurchaseClick = async () => {
    // Validate ACC selection
    if (!purchaseForm.acc_id) {
      setErrors({ general: 'Please select an ACC' });
      return;
    }

    // Validate course selection
    if (!purchaseForm.course_id) {
      setErrors({ general: 'Please select a course' });
      return;
    }

    // Validate quantity
    if (!purchaseForm.quantity || parseInt(purchaseForm.quantity) <= 0) {
      setErrors({ general: 'Please enter a valid quantity' });
      return;
    }

    // Ensure all IDs are integers as required by backend validation
    const accId = parseInt(purchaseForm.acc_id, 10);
    const courseId = parseInt(purchaseForm.course_id, 10);
    const quantity = parseInt(purchaseForm.quantity, 10);

    if (isNaN(accId) || isNaN(courseId) || isNaN(quantity) || quantity < 1) {
      setErrors({ general: 'Invalid data. Please check your selections and try again.' });
      return;
    }

    setCreatingPaymentIntent(true);
    setErrors({});
    setPaymentIntentData(null);

    try {
      // Ensure all values are integers as required by backend validation
      const requestData = {
        acc_id: parseInt(accId, 10),
        course_id: parseInt(courseId, 10),
        quantity: parseInt(quantity, 10),
      };

      // Validate quantity is at least 1
      if (requestData.quantity < 1) {
        setErrors({ general: 'Quantity must be at least 1.' });
        setCreatingPaymentIntent(false);
        return;
      }

      // Add discount_code if provided
      if (purchaseForm.discount_code && purchaseForm.discount_code.trim()) {
        requestData.discount_code = purchaseForm.discount_code.trim();
      }

      // Create Payment Intent automatically
      const response = await trainingCenterAPI.createPaymentIntent(requestData);
      
      if (response.success && response.client_secret && response.payment_intent_id) {
        setPaymentIntentData(response);
        setPurchaseForm(prev => ({
          ...prev,
          payment_intent_id: response.payment_intent_id,
        }));
        // Open Stripe payment modal directly
        setShowStripeModal(true);
      } else {
        setErrors({ general: 'Failed to create payment intent. Invalid response from server.' });
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

  const handlePurchaseSubmit = async (e) => {
    e.preventDefault();
    
    // Auto-create payment intent and open Stripe modal
    await handlePurchaseClick();
  };


  const renderSortIcon = (key) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />;
    }
    return null;
  };

  // Group codes by ACC and Course
  const groupCodesByACCCourse = (codes) => {
    const groups = new Map();
    
    codes.forEach(code => {
      // Try multiple ways to get ACC ID
      let accId = code.acc_id || 
                  (typeof code.acc === 'object' ? code.acc?.id : null) ||
                  (code.acc && typeof code.acc === 'number' ? code.acc : null) ||
                  (code.acc && typeof code.acc === 'string' && !isNaN(code.acc) ? parseInt(code.acc) : null);
      
      // Try to get ACC name from code or lookup in accsMap
      let accName = 'Unknown ACC';
      if (typeof code.acc === 'object' && code.acc?.name && code.acc.name !== 'Unknown ACC') {
        accName = code.acc.name;
      } else if (typeof code.acc === 'string' && code.acc !== 'Unknown ACC' && code.acc) {
        accName = code.acc;
      } else if (accId) {
        // Look up ACC in the map
        const accData = accsMap.get(accId) || accsMap.get(String(accId));
        if (accData) {
          accName = accData.name || accData.acc_name || `ACC ${accId}`;
        } else {
          // Use ID as fallback name
          accName = `ACC ${accId}`;
        }
      }
      
      const courseId = typeof code.course === 'object' ? code.course?.id : code.course;
      const courseName = typeof code.course === 'object' ? code.course?.name : code.course || 'Unknown Course';
      
      const groupKey = `${accId || 'unknown'}_${courseId || 'unknown'}`;
      
      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          accId,
          accName,
          courseId,
          courseName,
          codes: [],
          total: 0,
          available: 0,
          used: 0,
        });
      }
      
      const group = groups.get(groupKey);
      group.codes.push(code);
      group.total++;
      if (code.status === 'available') group.available++;
      if (code.status === 'used') group.used++;
    });
    
    return Array.from(groups.values());
  };

  const getGroupKey = (accId, courseId) => {
    return `${accId || 'unknown'}_${courseId || 'unknown'}`;
  };

  const currentData = activeTab === 'inventory' ? sortedInventory : sortedBatches;
  const columns = activeTab === 'inventory' ? 6 : 6;

  return (
    <div>

      {/* Tabs */}
      <div className="mb-6 bg-white rounded-xl shadow-lg border border-gray-100 p-1.5">
        <div className="flex space-x-2">
          <button
            onClick={() => {
              setActiveTab('inventory');
            }}
            className={`tab-button flex-1 px-6 py-3.5 font-semibold rounded-lg transition-all duration-300 flex items-center justify-center gap-2 ${
              activeTab === 'inventory' 
                ? 'text-white shadow-lg tab-active-gradient' 
                : 'text-gray-500 bg-gray-100 hover:text-primary-700 hover:bg-primary-50 border border-gray-200'
            }`}
          >
            <Package size={20} className={activeTab === 'inventory' ? 'text-white' : 'text-gray-500'} />
            Inventory ({inventory.length})
          </button>
          <button
            onClick={() => {
              setActiveTab('batches');
            }}
            className={`tab-button flex-1 px-6 py-3.5 font-semibold rounded-lg transition-all duration-300 flex items-center justify-center gap-2 ${
              activeTab === 'batches' 
                ? 'text-white shadow-lg tab-active-gradient' 
                : 'text-gray-500 bg-gray-100 hover:text-primary-700 hover:bg-primary-50 border border-gray-200'
            }`}
          >
            <ShoppingCart size={20} className={activeTab === 'batches' ? 'text-white' : 'text-gray-500'} />
            Purchase History ({batches.length})
          </button>
        </div>
      </div>

      {/* Search and Filter Section */}
      <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-100 mb-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder={activeTab === 'inventory' ? 'Search by code, ACC, course, or status...' : 'Search by ACC, course, or payment method...'}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
              }}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
            />
          </div>
          {activeTab === 'inventory' && (
            <>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                  }}
                  className="pl-10 pr-8 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none bg-white cursor-pointer transition-all"
                >
                  <option value="all">All Status</option>
                  <option value="available">Available</option>
                  <option value="used">Used</option>
                </select>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Inventory Table - Statistics View */}
      {activeTab === 'inventory' ? (
        loading ? (
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-12">
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-primary-600"></div>
            </div>
          </div>
        ) : currentData.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-12">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Package className="text-gray-400" size={32} />
              </div>
              <p className="text-gray-500 font-medium">No codes in inventory</p>
              <p className="text-sm text-gray-400 mt-1">
                {searchTerm || statusFilter !== 'all' ? 'Try adjusting your filters' : 'Purchase codes to get started!'}
              </p>
            </div>
          </div>
        ) : (
          /* Statistics Cards View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groupCodesByACCCourse(sortedInventory.length > 0 ? sortedInventory : currentData).map((group, groupIndex) => {
              const groupKey = getGroupKey(group.accId, group.courseId);
              
              return (
                <div
                  key={groupKey}
                  className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden transition-all duration-200 hover:shadow-xl hover:scale-105"
                  style={{ '--animation-delay': `${groupIndex * 0.05}s` }}
                >
                  <div className="p-6">
                    {/* Header */}
                    <div className="flex items-start gap-4 mb-4">
                      <div className="p-3 bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg flex-shrink-0">
                        <Building2 className="h-6 w-6 text-primary-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-gray-900 mb-1 truncate">{group.accName}</h3>
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <p className="text-sm font-semibold text-gray-700 truncate">{group.courseName}</p>
                        </div>
                      </div>
                    </div>

                    {/* Statistics */}
                    <div className="space-y-3">
                      {/* Total Codes */}
                      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-primary-50 to-white rounded-lg border border-primary-100">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-primary-500"></div>
                          <span className="text-sm font-medium text-gray-700">Total Codes</span>
                        </div>
                        <span className="text-lg font-bold text-gray-900">{group.total}</span>
                      </div>

                      {/* Available Codes */}
                      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-white rounded-lg border border-green-100">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                          <span className="text-sm font-medium text-gray-700">Available</span>
                        </div>
                        <span className="text-lg font-bold text-green-700">{group.available}</span>
                      </div>

                      {/* Used Codes */}
                      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-white rounded-lg border border-blue-100">
                        <div className="flex items-center gap-2">
                          <XCircle className="h-5 w-5 text-blue-500" />
                          <span className="text-sm font-medium text-gray-700">Used</span>
                        </div>
                        <span className="text-lg font-bold text-blue-700">{group.used}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* Purchase History Table */
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="table-header-gradient">
                <tr>
                  <th 
                    className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-primary-700 transition-colors select-none"
                    onClick={() => handleSort('acc')}
                  >
                    <div className="flex items-center gap-2">
                      ACC
                      {renderSortIcon('acc')}
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-primary-700 transition-colors select-none"
                    onClick={() => handleSort('course')}
                  >
                    <div className="flex items-center gap-2">
                      Course
                      {renderSortIcon('course')}
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-primary-700 transition-colors select-none"
                    onClick={() => handleSort('quantity')}
                  >
                    <div className="flex items-center gap-2">
                      Quantity
                      {renderSortIcon('quantity')}
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-primary-700 transition-colors select-none"
                    onClick={() => handleSort('total_amount')}
                  >
                    <div className="flex items-center gap-2">
                      Amount
                      {renderSortIcon('total_amount')}
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-primary-700 transition-colors select-none"
                    onClick={() => handleSort('purchase_date')}
                  >
                    <div className="flex items-center gap-2">
                      Purchase Date
                      {renderSortIcon('purchase_date')}
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-primary-700 transition-colors select-none"
                    onClick={() => handleSort('payment_method')}
                  >
                    <div className="flex items-center gap-2">
                      Payment Method
                      {renderSortIcon('payment_method')}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-primary-600"></div>
                      </div>
                    </td>
                  </tr>
                ) : currentData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                          <Package className="text-gray-400" size={32} />
                        </div>
                        <p className="text-gray-500 font-medium">No purchase history found</p>
                        <p className="text-sm text-gray-400 mt-1">Your purchase history will appear here</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  currentData.map((item, index) => (
                    <tr
                      key={item.id || index}
                      className="hover:bg-gradient-to-r hover:from-primary-50/30 hover:to-white transition-all duration-200 group table-row-animated"
                      style={{ '--animation-delay': `${index * 0.03}s` }}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <Building2 className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-900">
                            {typeof item.acc === 'object' ? item.acc?.name || 'N/A' : item.acc || 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <BookOpen className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-900">
                            {typeof item.course === 'object' ? item.course?.name || 'N/A' : item.course || 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm font-semibold text-gray-900">{item.quantity || 0}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm font-bold text-primary-600">
                          ${parseFloat(item.total_amount || 0).toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {item.purchase_date ? new Date(item.purchase_date).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-medium capitalize">
                          {item.payment_method ? item.payment_method.replace('_', ' ') : 'N/A'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Purchase Modal */}
      <Modal
        isOpen={purchaseModalOpen}
        onClose={() => {
          setPurchaseModalOpen(false);
          setPurchaseForm({
            acc_id: '',
            course_id: '',
            quantity: '',
            discount_code: '',
            payment_method: 'wallet',
            payment_intent_id: '',
          });
          setErrors({});
          setCourses([]);
          setDiscountCodes([]);
        }}
        title="Purchase Certificate Codes"
        size="lg"
      >
        <form onSubmit={handlePurchaseSubmit} className="space-y-4">
          {errors.general && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{errors.general}</p>
            </div>
          )}

          <FormInput
            label="ACC"
            name="acc_id"
            type="select"
            value={purchaseForm.acc_id}
            onChange={(e) => handleACCChange(e.target.value)}
            required
            disabled={accs.length === 0}
            options={accs.length > 0 
              ? accs.map(acc => ({
                  value: acc.id,
                  label: acc.name || `ACC ${acc.id}`,
                }))
              : [{ value: '', label: 'No approved ACCs available. Please get approval from an ACC first.' }]
            }
            error={errors.acc_id}
          />
          {accs.length === 0 && (
            <p className="text-sm text-yellow-600 mt-1">
              No approved ACCs found. Please request and get approval from an ACC first.
            </p>
          )}

          <div>
            <FormInput
              label="Course"
              name="course_id"
              type="select"
              value={purchaseForm.course_id}
              onChange={(e) => handleCourseChange(e.target.value)}
              required
              disabled={!purchaseForm.acc_id || courses.length === 0 || loadingCourses}
              options={loadingCourses 
                ? [{ value: '', label: 'Loading courses...' }]
                : courses.length > 0 
                ? courses.map(course => {
                    const courseId = course.id ? (typeof course.id === 'string' ? parseInt(course.id) : course.id) : course.id;
                    return {
                      value: courseId,
                      label: course.name || course.code || `Course ${courseId}`,
                    };
                  })
                : purchaseForm.acc_id
                ? [{ value: '', label: 'No courses available for this ACC.' }]
                : [{ value: '', label: 'Please select an ACC first.' }]
              }
              error={errors.course_id}
            />
            {!purchaseForm.acc_id && (
              <p className="text-sm text-gray-500 mt-1">
                Please select an ACC first to see available courses.
              </p>
            )}
            {purchaseForm.acc_id && courses.length === 0 && !loadingCourses && (
              <p className="text-sm text-yellow-600 mt-1">
                No courses available for the selected ACC.
              </p>
            )}
          </div>

          <FormInput
            label="Quantity"
            name="quantity"
            type="number"
            value={purchaseForm.quantity}
            onChange={(e) => setPurchaseForm({ ...purchaseForm, quantity: e.target.value })}
            required
            min="1"
            error={errors.quantity}
          />

          <div>
            {discountCodes.length > 0 ? (
              <FormInput
                label="Discount Code (Optional)"
                name="discount_code"
                type="select"
                value={purchaseForm.discount_code}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, discount_code: e.target.value })}
                disabled={loadingDiscountCodes}
                options={[
                  { value: '', label: 'No discount code' },
                  ...discountCodes.map(code => ({
                    value: code.code || code.discount_code || code.id,
                    label: `${code.code || code.discount_code || `Code ${code.id}`}${code.discount_percentage ? ` - ${code.discount_percentage}% off` : ''}${code.discount_amount ? ` - $${code.discount_amount} off` : ''}`,
                  }))
                ]}
                error={errors.discount_code}
                helpText={`${discountCodes.length} discount code${discountCodes.length > 1 ? 's' : ''} available for this course`}
              />
            ) : (
              <FormInput
                label="Discount Code (Optional)"
                name="discount_code"
                type="text"
                value={purchaseForm.discount_code}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, discount_code: e.target.value })}
                placeholder="Enter discount code manually"
                disabled={loadingDiscountCodes}
                error={errors.discount_code}
                helpText={loadingDiscountCodes 
                  ? 'Loading discount codes...' 
                  : purchaseForm.course_id 
                  ? 'No discount codes available. You can enter a code manually if you have one.' 
                  : 'Select a course first to see available discount codes'}
              />
            )}
            {discountCodes.length > 0 && (
              <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs font-semibold text-blue-900 mb-2">Available Discount Codes:</p>
                <div className="space-y-1">
                  {discountCodes.map((code, index) => (
                    <div key={code.id || index} className="flex items-center justify-between text-xs">
                      <span className="font-mono font-semibold text-blue-800">{code.code || code.discount_code}</span>
                      <div className="flex items-center gap-2">
                        {code.discount_percentage && (
                          <span className="text-blue-700">{code.discount_percentage}% off</span>
                        )}
                        {code.discount_amount && (
                          <span className="text-blue-700">${code.discount_amount} off</span>
                        )}
                        {code.expires_at && (
                          <span className="text-blue-600 text-xs">Expires: {new Date(code.expires_at).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Payment Method - Only Credit Card Available */}
          {/* WALLET OPTION COMMENTED OUT - Keep for future use if needed */}
          {/* 
          <FormInput
            label="Payment Method"
            name="payment_method"
            type="select"
            value={purchaseForm.payment_method}
            onChange={(e) => {
            setPurchaseForm({ ...purchaseForm, payment_method: e.target.value, payment_intent_id: '' });
            setPaymentIntentData(null);
            setErrors({});
          }}
            options={[
              { value: 'wallet', label: 'Wallet' },
              { value: 'credit_card', label: 'Credit Card' },
            ]}
            error={errors.payment_method}
          />
          */}

          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-900 font-semibold mb-2">Payment Method: Credit Card</p>
            <p className="text-xs text-blue-700">
              Payment will be processed securely through Stripe. The total amount will be calculated including any discounts. Click "Purchase Codes" below to enter your card details.
            </p>
          </div>

          <div className="flex space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => {
                setPurchaseModalOpen(false);
                setErrors({});
              }}
              className="flex-1 px-4 py-2.5 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 hover:scale-105 transition-all duration-200 shadow-sm hover:shadow-md font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creatingPaymentIntent || purchasing || !purchaseForm.acc_id || !purchaseForm.course_id || !purchaseForm.quantity}
              className="flex-1 px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 hover:scale-105 transition-all duration-200 shadow-sm hover:shadow-md font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-sm"
            >
              {creatingPaymentIntent ? 'Processing...' : purchasing ? 'Processing...' : 'Purchase Codes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Stripe Payment Modal */}
      <StripePaymentModal
        isOpen={showStripeModal}
        onClose={() => {
          setShowStripeModal(false);
        }}
        clientSecret={paymentIntentData?.client_secret}
        paymentIntentId={paymentIntentData?.payment_intent_id}
        amount={paymentIntentData?.final_amount || 0}
        currency={paymentIntentData?.currency || 'USD'}
        paymentSummary={paymentIntentData}
        onPaymentSuccess={async (paymentIntent, paymentIntentId) => {
          try {
            // Step 3: Complete Purchase on backend
            // Verify payment intent status before completing
            if (paymentIntent && paymentIntent.status !== 'succeeded') {
              setErrors({ general: `Payment not completed. Status: ${paymentIntent.status}` });
              return;
            }

            // Ensure all IDs are integers as required by backend validation
            const accId = parseInt(purchaseForm.acc_id, 10);
            const courseId = parseInt(purchaseForm.course_id, 10);
            const quantity = parseInt(purchaseForm.quantity, 10);

            if (isNaN(accId) || isNaN(courseId) || isNaN(quantity) || quantity < 1) {
              setErrors({ general: 'Invalid data. Please check your selections and try again.' });
              throw new Error('Invalid data');
            }

            const submitData = {
              acc_id: accId,
              course_id: courseId,
              quantity: quantity,
              payment_method: 'credit_card',
              payment_intent_id: paymentIntentId || paymentIntent.id,
            };

            // Add discount_code if provided (same as step 1)
            if (purchaseForm.discount_code && purchaseForm.discount_code.trim()) {
              submitData.discount_code = purchaseForm.discount_code.trim();
            }

            await trainingCenterAPI.purchaseCodes(submitData);
            await loadData();
            setPurchaseModalOpen(false);
            setShowStripeModal(false);
            setPaymentIntentData(null);
            alert('Codes purchased successfully!');
          } catch (error) {
            console.error('Failed to purchase codes:', error);
            
            // Handle different error types according to guide
            if (error.response?.status === 400) {
              const errorData = error.response.data;
              setErrors({ general: errorData?.message || 'Payment verification failed. Please contact support.' });
            } else if (error.response?.status === 402) {
              const errorData = error.response.data;
              setErrors({ general: errorData?.message || 'Insufficient wallet balance. Please add funds to your wallet or use a different payment method.' });
            } else if (error.response?.status === 403) {
              const errorData = error.response.data;
              setErrors({ general: errorData?.message || 'You do not have authorization from this ACC or the ACC is not active.' });
            } else if (error.response?.status === 422) {
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
                setErrors({ general: 'Payment succeeded but failed to complete purchase. Please contact support.' });
              }
            } else {
              setErrors({ general: 'Payment succeeded but failed to complete purchase. Please contact support.' });
            }
            throw error;
          }
        }}
        onPaymentError={(error) => {
          setErrors({ general: error });
        }}
      />
    </div>
  );
};

export default CodesScreen;