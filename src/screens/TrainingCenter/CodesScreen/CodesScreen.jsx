import { useEffect, useState, useMemo } from 'react';
import { trainingCenterAPI } from '../../../services/api';
import { useHeader } from '../../../context/HeaderContext';
import { getAuthToken } from '../../../config/api';
import axios from 'axios';
import imageCompression from 'browser-image-compression';
import { Package, ShoppingCart, Search, Filter, ChevronUp, ChevronDown, BookOpen, Building2, CheckCircle2, XCircle, Calendar, DollarSign } from 'lucide-react';
import Modal from '../../../components/Modal/Modal';
import FormInput from '../../../components/FormInput/FormInput';
import StripePaymentModal from '../../../components/StripePaymentModal/StripePaymentModal';
import DataTable from '../../../components/DataTable/DataTable';
import './CodesScreen.css';
import '../../../components/FormInput/FormInput.css';

const CodesScreen = () => {
  const { setHeaderActions, setHeaderTitle, setHeaderSubtitle } = useHeader();
  const [inventory, setInventory] = useState([]);
  const [batches, setBatches] = useState([]);
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
    payment_method: 'credit_card',
    payment_intent_id: '',
    payment_amount: '',
    payment_receipt: null,
  });
  const [errors, setErrors] = useState({});
  const [purchasing, setPurchasing] = useState(false);
  const [creatingPaymentIntent, setCreatingPaymentIntent] = useState(false);
  const [paymentIntentData, setPaymentIntentData] = useState(null);
  const [showStripeModal, setShowStripeModal] = useState(false);
  const [accsMap, setAccsMap] = useState(new Map()); // Map of ACC ID to ACC object
  const [manualPaymentInfo, setManualPaymentInfo] = useState(null);

  useEffect(() => {
    loadACCs();
  }, []);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]); // Load all data once, search and filtering are handled client-side

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

  // Removed applySort useEffect - now handled in filteredAndSortedInventory useMemo

  useEffect(() => {
    setHeaderTitle('Certificate Codes');
    setHeaderSubtitle('Manage your certificate code inventory and purchases');
    setHeaderActions(
      <button
        onClick={handlePurchase}
        className="header-create-btn"
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

  const handleACCChange = async (accId) => {
    // Clear course selection and discount codes when ACC changes
    setPurchaseForm({ ...purchaseForm, acc_id: accId, course_id: '', discount_code: '', payment_amount: '' });
    setCourses([]);
    setDiscountCodes([]);
    setManualPaymentInfo(null);
    setPaymentIntentData(null);
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

  const handleCourseChange = async (courseId) => {
    setPurchaseForm({ ...purchaseForm, course_id: courseId, discount_code: '', payment_amount: '' });
    if (purchaseForm.acc_id && courseId) {
      loadDiscountCodes(purchaseForm.acc_id, courseId);
      
      // If manual payment is selected, load payment intent info
      if (purchaseForm.payment_method === 'manual_payment' && purchaseForm.quantity) {
        try {
          const requestData = {
            acc_id: parseInt(purchaseForm.acc_id, 10),
            course_id: parseInt(courseId, 10),
            quantity: parseInt(purchaseForm.quantity, 10),
          };
          const response = await trainingCenterAPI.createPaymentIntent(requestData);
          if (response.manual_payment_info) {
            setManualPaymentInfo(response.manual_payment_info);
            setPurchaseForm(prev => ({
              ...prev,
              payment_amount: response.final_amount || response.total_amount || '',
            }));
          }
        } catch (error) {
          console.error('Failed to load manual payment info:', error);
        }
      }
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
      
      if (activeTab === 'inventory') {
        // Note: search and statusFilter are now handled client-side
        const data = await trainingCenterAPI.getCodeInventory({});
        
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
        // Note: search and filtering for batches are now handled client-side by DataTable
        const data = await trainingCenterAPI.getCodeBatches({});
        
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

  // Filter and sort inventory data
  const filteredAndSortedInventory = useMemo(() => {
    let filtered = [...inventory];

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(code => {
        const codeValue = code.code || '';
        const accName = typeof code.acc === 'object' ? code.acc?.name || '' : code.acc || '';
        const courseName = typeof code.course === 'object' ? code.course?.name || '' : code.course || '';
        const status = code.status || '';
        
        const searchText = [
          codeValue,
          accName,
          courseName,
          status,
        ].filter(Boolean).join(' ').toLowerCase();
        
        return searchText.includes(searchLower);
      });
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(code => code.status === statusFilter);
    }

    // Apply sorting
    if (sortConfig.key) {
      filtered.sort((a, b) => {
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

    return filtered;
  }, [inventory, searchTerm, statusFilter, sortConfig]);

  const applySort = () => {
    // Sorting is now handled in filteredAndSortedInventory useMemo
    // This function is kept for compatibility but doesn't need to do anything
  };

  const handlePurchase = () => {
    setPurchaseForm({
      acc_id: '',
      course_id: '',
      quantity: '',
      discount_code: '',
      payment_method: 'credit_card',
      payment_intent_id: '',
      payment_amount: '',
      payment_receipt: null,
    });
    setErrors({});
    setPaymentIntentData(null);
    setManualPaymentInfo(null);
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

  // Auto-create payment intent when user clicks Purchase button (for credit card only)
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
    setManualPaymentInfo(null);

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
      
      // Store manual payment info if available
      if (response.manual_payment_info) {
        setManualPaymentInfo(response.manual_payment_info);
      }
      
      if (purchaseForm.payment_method === 'credit_card') {
        if (response.success && response.client_secret && response.payment_intent_id) {
          // Store full payment intent data including new destination charge fields
          setPaymentIntentData({
            ...response,
            // New fields from destination charges
            commission_amount: response.commission_amount,
            provider_amount: response.provider_amount,
            payment_type: response.payment_type || 'standard',
          });
          setPurchaseForm(prev => ({
            ...prev,
            payment_intent_id: response.payment_intent_id,
          }));
          // Open Stripe payment modal directly
          setShowStripeModal(true);
        } else {
          setErrors({ general: 'Failed to create payment intent. Invalid response from server.' });
        }
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
    
    if (purchaseForm.payment_method === 'manual_payment') {
      // Handle manual payment submission
      await handleManualPaymentSubmit();
    } else {
      // Auto-create payment intent and open Stripe modal for credit card
      await handlePurchaseClick();
    }
  };

  const handleManualPaymentSubmit = async () => {
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

    // Validate payment receipt
    if (!purchaseForm.payment_receipt) {
      setErrors({ payment_receipt: 'Please upload payment receipt' });
      return;
    }

    // Validate payment amount
    if (!purchaseForm.payment_amount || parseFloat(purchaseForm.payment_amount) <= 0) {
      setErrors({ payment_amount: 'Please enter a valid payment amount' });
      return;
    }

    // Ensure all IDs are integers
    const accId = parseInt(purchaseForm.acc_id, 10);
    const courseId = parseInt(purchaseForm.course_id, 10);
    const quantity = parseInt(purchaseForm.quantity, 10);
    const paymentAmount = parseFloat(purchaseForm.payment_amount);

    if (isNaN(accId) || isNaN(courseId) || isNaN(quantity) || quantity < 1 || isNaN(paymentAmount) || paymentAmount <= 0) {
      setErrors({ general: 'Invalid data. Please check your input.' });
      return;
    }

    setPurchasing(true);
    setErrors({});

    try {
      // First, get payment intent to validate amount
      const requestData = {
        acc_id: accId,
        course_id: courseId,
        quantity: quantity,
      };

      if (purchaseForm.discount_code && purchaseForm.discount_code.trim()) {
        requestData.discount_code = purchaseForm.discount_code.trim();
      }

      const paymentIntentResponse = await trainingCenterAPI.createPaymentIntent(requestData);
      const finalAmount = parseFloat(paymentIntentResponse.final_amount || paymentIntentResponse.total_amount || 0);

      // Check if payment amount matches (allow small difference for rounding)
      if (Math.abs(paymentAmount - finalAmount) > 0.01) {
        setErrors({ payment_amount: `Payment amount must match the calculated total amount: $${finalAmount.toFixed(2)}` });
        setPurchasing(false);
        return;
      }

      // Create FormData for manual payment
      const formData = new FormData();
      formData.append('acc_id', accId);
      formData.append('course_id', courseId);
      formData.append('quantity', quantity);
      formData.append('payment_method', 'manual_payment');
      formData.append('payment_amount', paymentAmount);
      formData.append('payment_receipt', purchaseForm.payment_receipt);

      if (purchaseForm.discount_code && purchaseForm.discount_code.trim()) {
        formData.append('discount_code', purchaseForm.discount_code.trim());
      }

      const response = await trainingCenterAPI.purchaseCodes(formData);

      // Success
      await loadData();
      setPurchaseModalOpen(false);
      setPurchaseForm({
        acc_id: '',
        course_id: '',
        quantity: '',
        discount_code: '',
        payment_method: 'credit_card',
        payment_intent_id: '',
        payment_amount: '',
        payment_receipt: null,
      });
      setPaymentIntentData(null);
      setManualPaymentInfo(null);
      alert('Payment request submitted successfully. Waiting for approval.');
    } catch (error) {
      console.error('Failed to submit manual payment:', error);
      
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
        setErrors({ general: errorData?.message || 'Invalid payment amount or receipt.' });
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
          setErrors({ general: 'Failed to submit payment request. Please try again.' });
        }
      } else {
        setErrors({ general: 'Failed to submit payment request. Please try again.' });
      }
    } finally {
      setPurchasing(false);
    }
  };


  const renderSortIcon = (key) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />;
    }
    return null;
  };

  // Define columns for Purchase History DataTable
  const batchesColumns = useMemo(() => [
    {
      header: 'ACC',
      accessor: 'acc',
      sortable: true,
      render: (value, row) => (
        <div className="batch-acc-container">
          <Building2 className="batch-acc-icon" />
          {typeof row.acc === 'object' ? row.acc?.name || 'N/A' : row.acc || 'N/A'}
        </div>
      ),
    },
    {
      header: 'Course',
      accessor: 'course',
      sortable: true,
      render: (value, row) => (
        <div className="batch-course-container">
          <BookOpen className="batch-course-icon" />
          {typeof row.course === 'object' ? row.course?.name || 'N/A' : row.course || 'N/A'}
        </div>
      ),
    },
    {
      header: 'Quantity',
      accessor: 'quantity',
      sortable: true,
      render: (value, row) => (
        <span className="batch-quantity">{row.quantity || 0}</span>
      ),
    },
    {
      header: 'Amount',
      accessor: 'total_amount',
      sortable: true,
      render: (value, row) => (
        <div className="batch-amount-container">
          <DollarSign className="batch-amount-icon" />
          {parseFloat(row.total_amount || 0).toFixed(2)}
        </div>
      ),
    },
    {
      header: 'Purchase Date',
      accessor: 'purchase_date',
      sortable: true,
      render: (value, row) => (
        <div className="batch-date-container">
          <Calendar className="batch-date-icon" />
          {row.purchase_date ? new Date(row.purchase_date).toLocaleDateString() : 'N/A'}
        </div>
      ),
    },
    {
      header: 'Payment Method',
      accessor: 'payment_method',
      sortable: true,
      render: (value, row) => (
        <span className="batch-payment-method">
          {row.payment_method ? row.payment_method.replace('_', ' ') : 'N/A'}
        </span>
      ),
    },
  ], []);

  // Add searchable text to each batch for better search functionality
  const batchesWithSearchText = useMemo(() => {
    return batches.map(batch => {
      const accName = typeof batch.acc === 'object' ? batch.acc?.name || '' : batch.acc || '';
      const courseName = typeof batch.course === 'object' ? batch.course?.name || '' : batch.course || '';
      const searchText = [
        accName,
        courseName,
        batch.quantity || '',
        batch.total_amount || '',
        batch.purchase_date ? new Date(batch.purchase_date).toLocaleDateString() : '',
        batch.payment_method || '',
      ].filter(Boolean).join(' ').toLowerCase();
      
      return {
        ...batch,
        _searchText: searchText,
      };
    });
  }, [batches]);

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

  const currentData = activeTab === 'inventory' ? filteredAndSortedInventory : batchesWithSearchText;
  const columns = activeTab === 'inventory' ? 6 : 6;

  return (
    <div>

      {/* Tabs */}
      <div className="tabs-container">
        <div className="tabs-wrapper">
          <button
            onClick={() => {
              setActiveTab('inventory');
            }}
            className={`tab-button ${activeTab === 'inventory' ? 'tab-button-active' : 'tab-button-inactive'}`}
          >
            <Package size={20} className={activeTab === 'inventory' ? 'tab-icon-active' : 'tab-icon-inactive'} />
            Inventory ({inventory.length})
          </button>
          <button
            onClick={() => {
              setActiveTab('batches');
            }}
            className={`tab-button ${activeTab === 'batches' ? 'tab-button-active' : 'tab-button-inactive'}`}
          >
            <ShoppingCart size={20} className={activeTab === 'batches' ? 'tab-icon-active' : 'tab-icon-inactive'} />
            Purchase History ({batches.length})
          </button>
        </div>
      </div>

      {/* Search and Filter Section - Only for Inventory */}
      {activeTab === 'inventory' && (
        <div className="search-filter-container">
          <div className="search-filter-wrapper">
            <div className="search-input-container">
              <Search className="search-icon" size={20} />
              <input
                type="text"
                placeholder="Search by code, ACC, course, or status..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                }}
                className="search-input"
              />
            </div>
            <div className="filter-container">
              <Filter className="filter-icon" size={20} />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                }}
                className="filter-select"
              >
                <option value="all">All Status</option>
                <option value="available">Available</option>
                <option value="used">Used</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Inventory Table - Statistics View */}
      {activeTab === 'inventory' ? (
        loading ? (
          <div className="loading-container">
            <div className="loading-spinner">
              <div className="loading-spinner-icon"></div>
            </div>
          </div>
        ) : currentData.length === 0 ? (
          <div className="empty-state-container">
            <div className="empty-state-content">
              <div className="empty-state-icon-container">
                <Package className="empty-state-icon" size={32} />
              </div>
              <p className="empty-state-title">No codes in inventory</p>
              <p className="empty-state-subtitle">
                {searchTerm || statusFilter !== 'all' ? 'Try adjusting your filters' : 'Purchase codes to get started!'}
              </p>
            </div>
          </div>
        ) : (
          /* Statistics Cards View */
          <div className="stats-cards-grid">
            {groupCodesByACCCourse(currentData).map((group, groupIndex) => {
              const groupKey = getGroupKey(group.accId, group.courseId);
              
              return (
                <div
                  key={groupKey}
                  className="stats-card"
                  style={{ '--animation-delay': `${groupIndex * 0.05}s` }}
                >
                  <div className="stats-card-content">
                    {/* Header */}
                    <div className="stats-card-header">
                      <div className="stats-card-icon-container">
                        <Building2 className="stats-card-icon" />
                      </div>
                      <div className="stats-card-title-section">
                        <h3 className="stats-card-title">{group.accName}</h3>
                        <div className="stats-card-subtitle">
                          <BookOpen className="stats-card-subtitle-icon" />
                          <p className="stats-card-subtitle-text">{group.courseName}</p>
                        </div>
                      </div>
                    </div>

                    {/* Statistics */}
                    <div className="stats-card-stats">
                      {/* Total Codes */}
                      <div className="stats-item stats-item-total">
                        <div className="stats-item-label">
                          <div className="stats-item-dot"></div>
                          <span className="stats-item-label-text">Total Codes</span>
                        </div>
                        <span className="stats-item-value stats-item-value-total">{group.total}</span>
                      </div>

                      {/* Available Codes */}
                      <div className="stats-item stats-item-available">
                        <div className="stats-item-label">
                          <CheckCircle2 className="stats-item-icon stats-item-icon-available" />
                          <span className="stats-item-label-text">Available</span>
                        </div>
                        <span className="stats-item-value stats-item-value-available">{group.available}</span>
                      </div>

                      {/* Used Codes */}
                      <div className="stats-item stats-item-used">
                        <div className="stats-item-label">
                          <XCircle className="stats-item-icon stats-item-icon-used" />
                          <span className="stats-item-label-text">Used</span>
                        </div>
                        <span className="stats-item-value stats-item-value-used">{group.used}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* Purchase History DataTable */
        <div className="datatable-container">
          <DataTable
            columns={batchesColumns}
            data={batchesWithSearchText}
            isLoading={loading}
            emptyMessage={
              batches.length === 0 && !loading ? (
                <div className="empty-state-content">
                  <div className="empty-state-icon-container">
                    <Package className="empty-state-icon" size={32} />
                  </div>
                  <p className="empty-state-title">No purchase history found</p>
                  <p className="empty-state-subtitle">Your purchase history will appear here</p>
                </div>
              ) : 'No purchase history found matching your filters'
            }
            searchable={true}
            filterable={false}
            searchPlaceholder="Search by ACC, course, quantity, amount, date, or payment method..."
            sortable={true}
          />
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
            payment_method: 'credit_card',
            payment_intent_id: '',
            payment_amount: '',
            payment_receipt: null,
          });
          setErrors({});
          setPaymentIntentData(null);
          setManualPaymentInfo(null);
          setCourses([]);
          setDiscountCodes([]);
        }}
        title="Purchase Certificate Codes"
        size="lg"
      >
        <form onSubmit={handlePurchaseSubmit} className="modal-form">
          {errors.general && (
            <div className="form-error-general">
              <p className="form-error-general-text">{errors.general}</p>
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
            <p className="form-warning-text">
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
              <p className="form-info-text">
                Please select an ACC first to see available courses.
              </p>
            )}
            {purchaseForm.acc_id && courses.length === 0 && !loadingCourses && (
              <p className="form-warning-text">
                No courses available for the selected ACC.
              </p>
            )}
          </div>

          <FormInput
            label="Quantity"
            name="quantity"
            type="number"
            value={purchaseForm.quantity}
            onChange={async (e) => {
              const newQuantity = e.target.value;
              setPurchaseForm({ ...purchaseForm, quantity: newQuantity, payment_amount: '' });
              
              // If manual payment is selected, load payment intent info
              if (purchaseForm.payment_method === 'manual_payment' && purchaseForm.acc_id && purchaseForm.course_id && newQuantity) {
                try {
                  const requestData = {
                    acc_id: parseInt(purchaseForm.acc_id, 10),
                    course_id: parseInt(purchaseForm.course_id, 10),
                    quantity: parseInt(newQuantity, 10),
                  };
                  if (purchaseForm.discount_code && purchaseForm.discount_code.trim()) {
                    requestData.discount_code = purchaseForm.discount_code.trim();
                  }
                  const response = await trainingCenterAPI.createPaymentIntent(requestData);
                  if (response.manual_payment_info) {
                    setManualPaymentInfo(response.manual_payment_info);
                    setPaymentIntentData(response);
                    setPurchaseForm(prev => ({
                      ...prev,
                      payment_amount: response.final_amount || response.total_amount || '',
                    }));
                  }
                } catch (error) {
                  console.error('Failed to load manual payment info:', error);
                }
              }
            }}
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
              <div className="discount-codes-container">
                <p className="discount-codes-title">Available Discount Codes:</p>
                <div className="discount-codes-list">
                  {discountCodes.map((code, index) => (
                    <div key={code.id || index} className="discount-code-item">
                      <span className="discount-code-value">{code.code || code.discount_code}</span>
                      <div className="discount-code-details">
                        {code.discount_percentage && (
                          <span className="discount-code-percentage">{code.discount_percentage}% off</span>
                        )}
                        {code.discount_amount && (
                          <span className="discount-code-amount">${code.discount_amount} off</span>
                        )}
                        {code.expires_at && (
                          <span className="discount-code-expiry">Expires: {new Date(code.expires_at).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Payment Method */}
          <FormInput
            label="Payment Method"
            name="payment_method"
            type="select"
            value={purchaseForm.payment_method}
            onChange={async (e) => {
              const newPaymentMethod = e.target.value;
              setPurchaseForm({ 
                ...purchaseForm, 
                payment_method: newPaymentMethod, 
                payment_intent_id: '',
                payment_amount: '',
                payment_receipt: null,
              });
              setPaymentIntentData(null);
              setManualPaymentInfo(null);
              setErrors({});
              
              // If manual payment is selected, create payment intent to get info
              if (newPaymentMethod === 'manual_payment' && purchaseForm.acc_id && purchaseForm.course_id && purchaseForm.quantity) {
                try {
                  const requestData = {
                    acc_id: parseInt(purchaseForm.acc_id, 10),
                    course_id: parseInt(purchaseForm.course_id, 10),
                    quantity: parseInt(purchaseForm.quantity, 10),
                  };
                  if (purchaseForm.discount_code && purchaseForm.discount_code.trim()) {
                    requestData.discount_code = purchaseForm.discount_code.trim();
                  }
                  const response = await trainingCenterAPI.createPaymentIntent(requestData);
                  if (response.manual_payment_info) {
                    setManualPaymentInfo(response.manual_payment_info);
                    // Set payment amount to final amount
                    setPurchaseForm(prev => ({
                      ...prev,
                      payment_amount: response.final_amount || response.total_amount || '',
                    }));
                  }
                } catch (error) {
                  console.error('Failed to load manual payment info:', error);
                }
              }
            }}
            options={[
              { value: 'credit_card', label: 'Credit Card' },
              { value: 'manual_payment', label: 'Manual Payment (Upload Invoice)' },
            ]}
            error={errors.payment_method}
          />

          {/* Manual Payment Fields */}
          {purchaseForm.payment_method === 'manual_payment' && (
            <>
              {manualPaymentInfo && (
                <div className="payment-info-container" style={{ marginBottom: '16px', padding: '16px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                  <p className="payment-info-title" style={{ fontWeight: '600', marginBottom: '8px' }}>
                    Manual Payment Information
                  </p>
                  <p className="payment-info-text" style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>
                    Final Amount: ${paymentIntentData?.final_amount || paymentIntentData?.total_amount || '0.00'}
                  </p>
                  {manualPaymentInfo.requires_receipt && (
                    <p className="payment-info-text" style={{ fontSize: '12px', color: '#888' }}>
                      Supported formats: {manualPaymentInfo.receipt_formats?.join(', ').toUpperCase() || 'PDF, JPG, PNG'} 
                      (Max: {manualPaymentInfo.max_receipt_size_mb || 10} MB)
                    </p>
                  )}
                </div>
              )}

              <FormInput
                label="Payment Amount"
                name="payment_amount"
                type="number"
                value={purchaseForm.payment_amount}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, payment_amount: e.target.value })}
                required
                min="0"
                step="0.01"
                error={errors.payment_amount}
                helpText={manualPaymentInfo?.final_amount ? `Enter the amount you paid (should match: $${manualPaymentInfo.final_amount})` : 'Enter the payment amount'}
              />

              <div className="form-input-group">
                <label className="form-input-label">
                  Payment Receipt <span className="required-asterisk">*</span>
                </label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={async (e) => {
                    const file = e.target.files[0];
                    if (file) {
                      // Validate file type first
                      const allowedTypes = manualPaymentInfo?.receipt_formats || ['pdf', 'jpg', 'jpeg', 'png'];
                      const fileExtension = file.name.split('.').pop().toLowerCase();
                      if (!allowedTypes.includes(fileExtension)) {
                        setErrors({ payment_receipt: `File type not supported. Allowed: ${allowedTypes.join(', ').toUpperCase()}` });
                        return;
                      }

                      try {
                        let processedFile = file;
                        
                        // Compress images only (not PDF)
                        if (['jpg', 'jpeg', 'png'].includes(fileExtension)) {
                          const options = {
                            maxSizeMB: (manualPaymentInfo?.max_receipt_size_mb || 10), // Max size in MB
                            maxWidthOrHeight: 4096, // Large value to preserve resolution (keep original dimensions)
                            useWebWorker: true,
                            fileType: file.type,
                            initialQuality: 0.95, // Very high quality (95% - minimal quality loss)
                          };

                          // Compress the image (compresses file size while maintaining high quality)
                          processedFile = await imageCompression(file, options);
                          
                          // Update file name to preserve original name
                          const fileName = file.name.substring(0, file.name.lastIndexOf('.')) + '.' + fileExtension;
                          processedFile = new File([processedFile], fileName, { type: file.type });
                        }

                        // Validate final file size
                        const maxSize = (manualPaymentInfo?.max_receipt_size_mb || 10) * 1024 * 1024;
                        if (processedFile.size > maxSize) {
                          setErrors({ payment_receipt: `File size must be less than ${manualPaymentInfo?.max_receipt_size_mb || 10} MB` });
                          return;
                        }

                        setPurchaseForm({ ...purchaseForm, payment_receipt: processedFile });
                        setErrors({ ...errors, payment_receipt: null });
                      } catch (error) {
                        console.error('Error processing file:', error);
                        setErrors({ payment_receipt: 'Failed to process file. Please try again.' });
                      }
                    }
                  }}
                  className="form-input form-input-file"
                />
                {errors.payment_receipt && (
                  <span className="form-input-error">{errors.payment_receipt}</span>
                )}
                {purchaseForm.payment_receipt && (
                  <p className="form-input-help" style={{ marginTop: '4px', fontSize: '12px', color: '#666' }}>
                    Selected: {purchaseForm.payment_receipt.name} ({(purchaseForm.payment_receipt.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>
            </>
          )}

          {/* Credit Card Payment Info */}
          {purchaseForm.payment_method === 'credit_card' && (
            <div className="payment-info-container">
              <p className="payment-info-title">Payment Method: Credit Card</p>
              <p className="payment-info-text">
                Payment will be processed securely through Stripe. The total amount will be calculated including any discounts. Click "Purchase Codes" below to enter your card details.
              </p>
            </div>
          )}

          <div className="form-actions">
            <button
              type="button"
              onClick={() => {
                setPurchaseModalOpen(false);
                setErrors({});
              }}
              className="form-btn form-btn-cancel"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creatingPaymentIntent || purchasing || !purchaseForm.acc_id || !purchaseForm.course_id || !purchaseForm.quantity}
              className="form-btn form-btn-submit"
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
            // Verify payment intent exists and is succeeded
            if (!paymentIntent) {
              setErrors({ general: 'Payment intent not found. Please try again.' });
              setShowStripeModal(false);
              return;
            }

            if (paymentIntent.status !== 'succeeded') {
              setErrors({ general: `Payment not completed. Status: ${paymentIntent.status}. Please complete the payment and try again.` });
              setShowStripeModal(false);
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

            // Use paymentIntent.id as the primary source, fallback to paymentIntentId prop
            const finalPaymentIntentId = paymentIntent.id || paymentIntentId;
            
            if (!finalPaymentIntentId) {
              setErrors({ general: 'Payment intent ID not found. Please try again.' });
              setShowStripeModal(false);
              return;
            }

            const submitData = {
              acc_id: accId,
              course_id: courseId,
              quantity: quantity,
              payment_method: 'credit_card',
              payment_intent_id: finalPaymentIntentId,
            };

            // Add discount_code if provided (same as step 1)
            if (purchaseForm.discount_code && purchaseForm.discount_code.trim()) {
              submitData.discount_code = purchaseForm.discount_code.trim();
            }

            // Log request data for debugging
            console.log('📤 Purchase request data:', submitData);
            console.log('📤 Payment Intent:', {
              id: paymentIntent.id,
              status: paymentIntent.status,
              paymentIntentId: paymentIntentId
            });

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
            } else if (error.response?.status === 500) {
              // Server error
              const errorData = error.response.data;
              console.error('Server error details:', errorData);
              setErrors({ 
                general: errorData?.message || 'Server error occurred. Please contact support or try again later.' 
              });
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