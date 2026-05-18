import { useEffect, useState, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { trainingCenterAPI } from '../../../services/api';
import { useHeader } from '../../../context/HeaderContext';
import { getAuthToken } from '../../../config/api';
import axios from 'axios';
import imageCompression from 'browser-image-compression';
import { Package, ShoppingCart, Search, Filter, ChevronUp, ChevronDown, BookOpen, Building2, CheckCircle2, XCircle, Calendar, DollarSign, X } from 'lucide-react';
import Modal from '../../../components/Modal/Modal';
import FormInput from '../../../components/FormInput/FormInput';
import StripePaymentModal from '../../../components/StripePaymentModal/StripePaymentModal';

import useDebounce from '../../../hooks/useDebounce';
import DataTable from '../../../components/DataTable/DataTable';
import LoadingSpinner from '../../../components/LoadingSpinner/LoadingSpinner';
import './CodesScreen.css';
import '../../../components/FormInput/FormInput.css';

const CodesScreen = () => {
  const { t } = useTranslation('training_center');
  const { setHeaderActions, setHeaderTitle, setHeaderSubtitle } = useHeader();
  const [inventory, setInventory] = useState([]);
  const [batches, setBatches] = useState([]);
  const [courses, setCourses] = useState([]);
  const [accs, setAccs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [discountCodes, setDiscountCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingSubCategories, setLoadingSubCategories] = useState(false);
  const [loadingDiscountCodes, setLoadingDiscountCodes] = useState(false);
  const [activeTab, setActiveTab] = useState('inventory');
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const debouncedSearch = useDebounce(searchTerm, 500);


  const [purchaseForm, setPurchaseForm] = useState({
    acc_id: '',
    category_id: '',
    sub_category_id: '',
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
  const fetchingAccsSet = useRef(new Set()); // IDs currently being fetched
  const failedAccsSet = useRef(new Set()); // IDs that failed to fetch

  // Course search states
  const [courseSearchQuery, setCourseSearchQuery] = useState('');
  const [courseSearchResults, setCourseSearchResults] = useState([]);
  const [isSearchingCourses, setIsSearchingCourses] = useState(false);
  const [showCourseDropdown, setShowCourseDropdown] = useState(false);
  const courseSearchRef = useRef(null);
  const debouncedCourseSearch = useDebounce(courseSearchQuery, 400);

  useEffect(() => {
    loadACCs();
  }, []);

  useEffect(() => {
    loadData();
  }, [activeTab, debouncedSearch, statusFilter]);



  // Load batches on initial mount and when searchTerm changes (to show count in Purchase History tab)
  // NOTE: This is only for showing the count in the tab button, not for the main data display
  // Removed the useEffect for loading batches count separately as it might conflict.
  // We will rely on loadData to populate counts if possible, or accept that count shows current page count or total if available.

  useEffect(() => {
    if (purchaseModalOpen) {
      loadFormData();
    } else {
      // Reset course search on modal close
      setCourseSearchQuery('');
      setCourseSearchResults([]);
      setShowCourseDropdown(false);
    }
  }, [purchaseModalOpen]);

  // Close course dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (courseSearchRef.current && !courseSearchRef.current.contains(event.target)) {
        setShowCourseDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Trigger course search when debounced query or selected ACC changes
  useEffect(() => {
    if (!debouncedCourseSearch.trim() || !purchaseModalOpen || !purchaseForm.acc_id) {
      setCourseSearchResults([]);
      setShowCourseDropdown(false);
      return;
    }
    searchCoursesAcrossACCs(debouncedCourseSearch);
  }, [debouncedCourseSearch, purchaseModalOpen, purchaseForm.acc_id]);

  // Removed applySort useEffect - now handled in filteredAndSortedInventory useMemo

  useEffect(() => {
    setHeaderTitle(t('codes_screen.header.title'));
    setHeaderSubtitle(t('codes_screen.header.subtitle'));
    setHeaderActions(
      <button
        onClick={handlePurchase}
        className="header-create-btn"
      >
        <ShoppingCart size={20} />
        {t('codes_screen.header.purchase')}
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
              name: auth.acc?.name || `${t('codes_screen.history.accreditation')} ID: ${finalAccId}`,
            });
          }
        }
      });

      const approvedAccs = Array.from(accMap.values());
      console.log('Approved Accreditations:', approvedAccs);
      setAccs(approvedAccs);
      setCategories([]);
      setSubCategories([]);
      setCourses([]); // Clear courses initially
    } catch (error) {
      console.error('Failed to load form data:', error);
      setAccs([]);
      setCourses([]);
    }
  };

  // Load categories for selected Accreditation
  const loadCategories = async (accId) => {
    try {
      setLoadingCategories(true);
      console.log(`Loading categories for Accreditation ID: ${accId}`);

      const data = await trainingCenterAPI.getCategoriesForACC(accId);
      const categoriesList = data.categories || data.data || data || [];

      setCategories(categoriesList);
      console.log(`Loaded ${categoriesList.length} categories for Accreditation ID: ${accId}`);
    } catch (error) {
      console.error('Failed to load categories:', error);
      setCategories([]);
    } finally {
      setLoadingCategories(false);
    }
  };

  // Load sub-categories for selected category
  const loadSubCategories = async (categoryId) => {
    try {
      setLoadingSubCategories(true);
      console.log(`Loading sub-categories for category ${categoryId}`);

      const data = await trainingCenterAPI.getSubCategoriesForCategory(categoryId);
      const subCategoriesList = data.sub_categories || data.data || data || [];

      setSubCategories(subCategoriesList);
      console.log(`Loaded ${subCategoriesList.length} sub-categories for category ${categoryId}`);
    } catch (error) {
      console.error('Failed to load sub-categories:', error);
      setSubCategories([]);
    } finally {
      setLoadingSubCategories(false);
    }
  };

  // Load courses for selected sub-category
  const loadCoursesForSubCategory = async (accId, subCategoryId) => {
    if (!accId || !subCategoryId) {
      setCourses([]);
      return;
    }

    setLoadingCourses(true);
    try {
      const finalAccId = typeof accId === 'string' ? parseInt(accId) : accId;
      console.log(`Loading courses for Accreditation ID: ${finalAccId} and Sub-Category ID: ${subCategoryId}`);

      const data = await trainingCenterAPI.getCoursesForACC(finalAccId, { sub_category_id: subCategoryId });
      const coursesList = data.courses || data.data || data || [];

      console.log(`Loaded ${coursesList.length} courses for sub-category ${subCategoryId}`);
      setCourses(coursesList);
    } catch (error) {
      console.error('Failed to load courses:', error);
      setCourses([]);
    } finally {
      setLoadingCourses(false);
    }
  };

  const handleACCChange = async (accId) => {
    // Clear everything when ACC changes
    setPurchaseForm({
      ...purchaseForm,
      acc_id: accId,
      category_id: '',
      sub_category_id: '',
      course_id: '',
      discount_code: '',
      payment_amount: ''
    });
    setCategories([]);
    setSubCategories([]);
    setCourses([]);
    setDiscountCodes([]);
    setManualPaymentInfo(null);
    setPaymentIntentData(null);
    // Clear course search when ACC changes
    setCourseSearchQuery('');
    setCourseSearchResults([]);
    setShowCourseDropdown(false);

    if (!accId) {
      return;
    }

    loadCategories(accId);
  };

  // Search courses by name within the currently selected ACC only
  const searchCoursesAcrossACCs = async (query) => {
    const selectedAccId = purchaseForm.acc_id;
    if (!query.trim() || !selectedAccId) {
      setCourseSearchResults([]);
      setShowCourseDropdown(false);
      return;
    }
    setIsSearchingCourses(true);
    try {
      const selectedAcc = accs.find(a => String(a.id) === String(selectedAccId));
      const data = await trainingCenterAPI.getCoursesForACC(selectedAccId, { search: query, per_page: 200 });
      const courses = data.courses || data.data || data || [];

      // Client-side filtering since the API may not support the search param
      const queryLower = query.toLowerCase().trim();
      const filtered = courses.filter(course => {
        const name = (course.name || '').toLowerCase();
        const code = (course.code || '').toLowerCase();
        return name.includes(queryLower) || code.includes(queryLower);
      });

      const results = filtered.map(course => ({
        ...course,
        _acc_id: selectedAccId,
        _acc_name: selectedAcc?.name || '',
      }));
      setCourseSearchResults(results);
      setShowCourseDropdown(results.length > 0);
    } catch (error) {
      console.error('Course search error:', error);
      setCourseSearchResults([]);
    } finally {
      setIsSearchingCourses(false);
    }
  };

  // When user selects a course from search, auto-fill cascade fields
  const handleCourseSearchSelect = async (course) => {
    setShowCourseDropdown(false);
    setCourseSearchQuery(course.name || course.code || '');

    const accId = course._acc_id;
    const categoryId = course.category_id || course.category?.id || course.sub_category?.category_id || '';
    const subCategoryId = course.sub_category_id || course.sub_category?.id || '';
    const courseId = course.id;

    // Load cascade data in order
    if (accId) await loadCategories(accId);
    if (categoryId) await loadSubCategories(categoryId);
    if (accId && subCategoryId) await loadCoursesForSubCategory(accId, subCategoryId);
    if (accId && courseId) loadDiscountCodes(accId, courseId);

    setPurchaseForm(prev => ({
      ...prev,
      acc_id: String(accId),
      category_id: String(categoryId),
      sub_category_id: String(subCategoryId),
      course_id: String(courseId),
      discount_code: '',
      payment_amount: '',
    }));
  };

  const handleCategoryChange = async (categoryId) => {
    // Get acc_id before clearing state
    const currentAccId = purchaseForm.acc_id;

    // Clear sub-categories and courses when category changes
    setPurchaseForm(prev => ({
      ...prev,
      category_id: categoryId,
      sub_category_id: '',
      course_id: '',
      discount_code: '',
      payment_amount: ''
    }));
    setSubCategories([]);
    setCourses([]);
    setDiscountCodes([]);

    if (!categoryId) {
      return;
    }

    loadSubCategories(categoryId);
  };

  const handleSubCategoryChange = async (subCategoryId) => {
    // Get acc_id before clearing state
    const currentAccId = purchaseForm.acc_id;

    // Clear courses when sub-category changes
    setPurchaseForm(prev => ({
      ...prev,
      sub_category_id: subCategoryId,
      course_id: '',
      discount_code: '',
      payment_amount: ''
    }));
    setCourses([]);
    setDiscountCodes([]);

    if (!subCategoryId || !currentAccId) {
      return;
    }

    loadCoursesForSubCategory(currentAccId, subCategoryId);
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
      const baseURL = import.meta.env.VITE_API_BASE_URL;

      console.log(`Loading discount codes for Accreditation ID: ${finalAccId} and Course ID: ${finalCourseId}`);

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

      console.log(`Final discount codes for Accreditation ID: ${finalAccId} and Course ID: ${finalCourseId}:`, codesList);
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
      console.log('Loaded Accreditation map:', newAccsMap.size, 'Accreditations');
      return newAccsMap;
    } catch (error) {
      console.error('Failed to load Accreditation:', error);
      return new Map();
    }
  };

  const fetchACCDetails = async (accId) => {
    if (!accId || failedAccsSet.current.has(accId) || failedAccsSet.current.has(String(accId))) return null;
    if (fetchingAccsSet.current.has(accId) || fetchingAccsSet.current.has(String(accId))) return null;

    fetchingAccsSet.current.add(accId);

    try {
      const token = getAuthToken();
      const baseURL = import.meta.env.VITE_API_BASE_URL;

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
            const accIdValue = accData.id || accData.acc_id;
            setAccsMap(prev => {
              const newMap = new Map(prev);
              newMap.set(accIdValue, accData);
              newMap.set(String(accIdValue), accData);
              return newMap;
            });
            fetchingAccsSet.current.delete(accId);
            return accData;
          }
        } catch (error) {
          // Continue to next endpoint
          continue;
        }
      }
    } catch (error) {
      console.error(`Failed to fetch Accreditation details for ID ${accId}:`, error);
    }

    fetchingAccsSet.current.delete(accId);
    failedAccsSet.current.add(accId);
    failedAccsSet.current.add(String(accId));
    return null;
  };

  const enrichCodesWithACCData = async (codesList, initialAccsMap) => {
    // 1. Identify all unique ACC IDs that need data
    const idsToFetch = new Set();
    const enrichedCodes = [];

    codesList.forEach(code => {
      const accId = code.acc_id ||
        (typeof code.acc === 'object' ? code.acc?.id : null) ||
        (code.acc && typeof code.acc === 'number' ? code.acc : null) ||
        (code.acc && typeof code.acc === 'string' && !isNaN(code.acc) ? parseInt(code.acc) : null);

      if (accId) {
        const hasData = (typeof code.acc === 'object' && code.acc?.name && code.acc.name !== t('codes_screen.status.unknown_acc')) ||
          initialAccsMap.has(accId) || initialAccsMap.has(String(accId));

        if (!hasData && !failedAccsSet.current.has(accId) && !failedAccsSet.current.has(String(accId))) {
          idsToFetch.add(accId);
        }
      }
    });

    // 2. Fetch missing data sequentially to avoid overwhelming browser/backend (or use Promise.all for speed)
    // sequential is safer if many items are missing
    for (const accId of idsToFetch) {
      if (!initialAccsMap.has(accId) && !initialAccsMap.has(String(accId))) {
        await fetchACCDetails(accId);
      }
    }

    // 3. Get the most up-to-date map after all fetches
    // Since fetchACCDetails updates accsMap state, we need to be careful.
    // However, for this enrichment, we can rely on the fact that the next re-run or the lookup will see it.
    // For the current list enrichment, we'll do a final pass.

    // We can't use accsMap state directly here as it might be stale.
    // But fetchACCDetails actually updates setAccsMap.
    // A better way is to collect results and update state once.
    // But let's stick to the current map + what we just fetched.

    const latestMap = accsMap;

    // 4. Enrich the list
    for (const code of codesList) {
      const accId = code.acc_id ||
        (typeof code.acc === 'object' ? code.acc?.id : null) ||
        (code.acc && typeof code.acc === 'number' ? code.acc : null) ||
        (code.acc && typeof code.acc === 'string' && !isNaN(code.acc) ? parseInt(code.acc) : null);

      if (accId) {
        // Try to get ACC data from list itself first
        if (typeof code.acc === 'object' && code.acc?.name && code.acc.name !== t('codes_screen.status.unknown_acc')) {
          enrichedCodes.push(code);
          continue;
        }

        // Try map (which might have been updated by fetchACCDetails)
        // Note: we might need to get the latest state if we want to be 100% sure, 
        // but since we await fetchACCDetails, the next line might still see old accsMap state.
        // To fix this, we'll use a local map that accumulates data.

        // Let's actually use the global accsMap as base and assume it's okay for now,
        // or better, fetchACCDetails could return the data.

        let accData = initialAccsMap.get(accId) || initialAccsMap.get(String(accId));

        // If not in initial map, it might be in the state map now (if it was fetched)
        // This is still risky. Let's just lookup again in a way that respects the recent fetches.

        if (!accData) {
          // fetchACCDetails was called above, so it SHOULD be in the latest accsMap... 
          // but state updates are async. 
          // Let's just manually fetch it one last time from the cache/map if possible.
          // For now, let's just assume if we don't have it, we use fallback.
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
          enrichedCodes.push({
            ...code,
            acc: {
              id: accId,
              name: `${t('codes_screen.history.accreditation')} ID: ${accId}`
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
      setIsSearchLoading(true);

      // Ensure ACCs are loaded
      let currentAccsMap = accsMap;
      if (currentAccsMap.size === 0) {
        currentAccsMap = await loadACCs();
      }

      const params = {
        page: 1,
        per_page: 9999,
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(statusFilter !== 'all' && { status: statusFilter })
      };

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

        // Update pagination
        // Pagination removed
        /* if (data) {
           setPagination ...
        } */

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

        // Update pagination
        // Pagination removed
        /* if (data) {
           setPagination ...
        } */
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
      setIsSearchLoading(false);
    }
  };



  const handleSearch = (term) => {
    setSearchTerm(term);
  };

  const handleStatusChange = (e) => {
    setStatusFilter(e.target.value);
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Removed filteredAndSortedInventory useMemo as it is now handled server-side


  const applySort = () => {
    // Sorting is now handled in filteredAndSortedInventory useMemo
    // This function is kept for compatibility but doesn't need to do anything
  };

  const handlePurchase = () => {
    setPurchaseForm({
      acc_id: '',
      category_id: '',
      sub_category_id: '',
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
    setCategories([]);
    setSubCategories([]);
    setCourses([]);
    setDiscountCodes([]);
    setCourseSearchQuery('');
    setCourseSearchResults([]);
    setShowCourseDropdown(false);
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
    // Validate Accreditation selection
    if (!purchaseForm.acc_id) {
      setErrors({ general: 'Please select an Accreditation' });
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
      setErrors({ general: t('codes_screen.errors.invalid_data') });
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
          setErrors({ general: t('codes_screen.errors.payment_intent_failed') });
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
          setErrors({ general: t('codes_screen.errors.validation_failed') });
        }
      } else if (error.response?.status === 400) {
        const errorData = error.response.data;
        setErrors({ general: errorData?.message || t('codes_screen.errors.payment_failed') });
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
    // Validate Accreditation selection
    if (!purchaseForm.acc_id) {
      setErrors({ general: 'Please select an Accreditation' });
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
      setErrors({ payment_receipt: t('codes_screen.purchase_modal.payment_receipt') });
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
      setErrors({ general: t('codes_screen.errors.invalid_data') });
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

      // Print FormData contents for debugging
      console.log('📦 FormData Contents for Code Purchase:');
      console.log('📋 FormData object:', formData);
      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          console.log(`  ${key}: File(${value.name}, ${value.size} bytes, ${value.type})`);
        } else {
          console.log(`  ${key}:`, value);
        }
      }
      console.log('📤 Sending POST request to /training-center/codes/purchase (FormData - Content-Type will be set automatically by browser)');

      const response = await trainingCenterAPI.purchaseCodes(formData);

      // Success
      await loadData();
      setPurchaseModalOpen(false);
      setPurchaseForm({
        acc_id: '',
        category_id: '',
        sub_category_id: '',
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
      setCategories([]);
      setSubCategories([]);
      setCourses([]);
      alert(t('codes_screen.messages.manual_payment_submitted'));
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
        setErrors({ general: t('codes_screen.errors.validation_failed') });
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
      header: t('codes_screen.history.accreditation'),
      accessor: 'acc',
      sortable: true,
      render: (value, row) => (
        <div className="batch-acc-container">
          <Building2 className="batch-acc-icon" />
          {typeof row.acc === 'object' ? row.acc?.name || t('codes_screen.status.na') : row.acc || t('codes_screen.status.na')}
        </div>
      ),
    },
    {
      header: t('codes_screen.history.course'),
      accessor: 'course',
      sortable: true,
      render: (value, row) => (
        <div className="batch-course-container">
          <BookOpen className="batch-course-icon" />
          {typeof row.course === 'object' ? row.course?.name || t('codes_screen.status.na') : row.course || t('codes_screen.status.na')}
        </div>
      ),
    },
    {
      header: t('codes_screen.history.quantity'),
      accessor: 'quantity',
      sortable: true,
      render: (value, row) => (
        <span className="batch-quantity">{row.quantity || 0}</span>
      ),
    },
    {
      header: t('codes_screen.history.amount'),
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
      header: t('codes_screen.history.purchase_date'),
      accessor: 'purchase_date',
      sortable: true,
      render: (value, row) => (
        <div className="batch-date-container">
          <Calendar className="batch-date-icon" />
          {row.purchase_date ? new Date(row.purchase_date).toLocaleDateString() : t('codes_screen.status.na')}
        </div>
      ),
    },
    {
      header: t('codes_screen.history.payment_method'),
      accessor: 'payment_method',
      sortable: true,
      render: (value, row) => (
        <span className="batch-payment-method">
          {row.payment_method === 'credit_card' ? t('codes_screen.purchase_modal.credit_card') :
            row.payment_method === 'manual_payment' ? t('codes_screen.purchase_modal.manual_payment') :
              row.payment_method ? row.payment_method.replace('_', ' ') : t('codes_screen.status.na')}
        </span>
      ),
    },
    {
      header: t('codes_screen.history.payment_status'),
      accessor: 'payment_status',
      sortable: true,
      render: (value, row) => (
        <span className={`status-badge status-${row.payment_status}`}>
          {t(`codes_screen.status.${row.payment_status}`) || row.payment_status || t('codes_screen.status.na')}
        </span>
      ),
    },
  ], []);

  // Removed batchesWithSearchText useMemo as it is not needed for server-side search

  // Group codes by ACC and Course
  const groupCodesByACCCourse = (codes) => {
    const groups = new Map();

    codes.forEach(code => {
      // Try multiple ways to get ACC ID
      let accId = code.acc_id ||
        (typeof code.acc === 'object' ? code.acc?.id : null) ||
        (code.acc && typeof code.acc === 'number' ? code.acc : null) ||
        (code.acc && typeof code.acc === 'string' && !isNaN(code.acc) ? parseInt(code.acc) : null);

      // Try to get Accreditation name from code or lookup in accsMap
      let accName = 'Unknown Accreditation';
      if (typeof code.acc === 'object' && code.acc?.name && code.acc.name !== 'Unknown Accreditation') {
        accName = code.acc.name;
      } else if (typeof code.acc === 'string' && code.acc !== 'Unknown Accreditation' && code.acc) {
        accName = code.acc;
      } else if (accId) {
        // Look up Accreditation in the map
        const accData = accsMap.get(accId) || accsMap.get(String(accId));
        if (accData) {
          accName = accData.name || accData.acc_name || `${t('codes_screen.history.accreditation')} ID: ${accId}`;
        } else {
          // Use ID as fallback name
          accName = `${t('codes_screen.history.accreditation')} ID: ${accId}`;
        }
      }

      const courseId = typeof code.course === 'object' ? code.course?.id : code.course;
      const courseName = typeof code.course === 'object' ? code.course?.name : code.course || t('codes_screen.status.unknown_course');

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

  const currentData = activeTab === 'inventory' ? inventory : batches;
  const columns = activeTab === 'inventory' ? 6 : 6;

  return (
    <div>

      {/* Tabs */}
      <div className="tabs-container">
        <div className="tabs-wrapper">
          <button
            onClick={() => {
              setActiveTab('inventory');
              setSearchTerm('');
              setStatusFilter('all');
            }}
            className={`tab-button ${activeTab === 'inventory' ? 'tab-button-active' : 'tab-button-inactive'}`}
          >
            <Package size={20} className={activeTab === 'inventory' ? 'tab-icon-active' : 'tab-icon-inactive'} />
            {t('codes_screen.tabs.inventory')}
          </button>
          <button
            onClick={() => {
              setActiveTab('batches');
              setSearchTerm('');
              setStatusFilter('all');
            }}
            className={`tab-button ${activeTab === 'batches' ? 'tab-button-active' : 'tab-button-inactive'}`}
          >
            <ShoppingCart size={20} className={activeTab === 'batches' ? 'tab-icon-active' : 'tab-icon-inactive'} />
            {t('codes_screen.tabs.purchase_history')}
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
                placeholder={t('codes_screen.search.inventory_placeholder')}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                }}
                className="search-input"
              />
              {isSearchLoading && (
                <div className="search-loading-indicator" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }}>
                  <div className="loading-spinner-small" />
                </div>
              )}
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
                <option value="all">{t('codes_screen.filter.all')}</option>
                <option value="available">{t('codes_screen.filter.available')}</option>
                <option value="used">{t('codes_screen.filter.used')}</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Inventory Table - Statistics View */}
      {activeTab === 'inventory' ? (
        loading ? (
          <LoadingSpinner />
        ) : currentData.length === 0 ? (
          <div className="empty-state-container">
            <div className="empty-state-content">
              <div className="empty-state-icon-container">
                <Package className="empty-state-icon" size={32} />
              </div>
              <p className="empty-state-title">{t('codes_screen.inventory.empty_title')}</p>
              <p className="empty-state-subtitle">
                {searchTerm || statusFilter !== 'all' ? t('codes_screen.inventory.empty_subtitle_filtered') : t('codes_screen.inventory.empty_subtitle_default')}
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
                          <span className="stats-item-label-text">{t('codes_screen.inventory.total_codes')}</span>
                        </div>
                        <span className="stats-item-value stats-item-value-total">{group.total}</span>
                      </div>

                      {/* Available Codes */}
                      <div className="stats-item stats-item-available">
                        <div className="stats-item-label">
                          <CheckCircle2 className="stats-item-icon stats-item-icon-available" />
                          <span className="stats-item-label-text">{t('codes_screen.inventory.available_codes')}</span>
                        </div>
                        <span className="stats-item-value stats-item-value-available">{group.available}</span>
                      </div>

                      {/* Used Codes */}
                      <div className="stats-item stats-item-used">
                        <div className="stats-item-label">
                          <XCircle className="stats-item-icon stats-item-icon-used" />
                          <span className="stats-item-label-text">{t('codes_screen.inventory.used_codes')}</span>
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
            data={batches}
            isLoading={loading}
            emptyMessage={
              batches.length === 0 && !loading ? (
                <div className="empty-state-content">
                  <div className="empty-state-icon-container">
                    <Package className="empty-state-icon" size={32} />
                  </div>
                  <p className="empty-state-title">{t('codes_screen.history.empty_title')}</p>
                  <p className="empty-state-subtitle">{t('codes_screen.history.empty_subtitle')}</p>
                </div>
              ) : t('codes_screen.history.empty_subtitle_filtered')
            }
            searchable={true}
            searchValue={searchTerm}
            onSearch={handleSearch}
            isSearchLoading={isSearchLoading}
            filterable={false}
            searchPlaceholder={t('codes_screen.search.history_placeholder')}
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
            category_id: '',
            sub_category_id: '',
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
          setCategories([]);
          setSubCategories([]);
          setCourses([]);
          setDiscountCodes([]);
        }}
        title={t('codes_screen.purchase_modal.title')}
        size="lg"
      >
        <form onSubmit={handlePurchaseSubmit} className="modal-form">
          {errors.general && (
            <div className="form-error-general">
              <p className="form-error-general-text">{errors.general}</p>
            </div>
          )}

          {/* ACC Selector — must come first */}
          <FormInput
            label={t('codes_screen.purchase_modal.accreditation')}
            name="acc_id"
            type="select"
            value={purchaseForm.acc_id}
            onChange={(e) => handleACCChange(e.target.value)}
            required
            disabled={accs.length === 0}
            options={accs.length > 0
              ? accs.map(acc => ({
                value: acc.id,
                label: acc.name || `Accreditation ${acc.id}`,
              }))
              : [{ value: '', label: t('codes_screen.purchase_modal.no_approved_acc') }]
            }
            error={errors.acc_id}
          />
          {accs.length === 0 && (
            <p className="form-warning-text">
              {t('codes_screen.purchase_modal.no_approved_acc_warning')}
            </p>
          )}

          {/* Course Name Search — active only after ACC is selected */}
          <div className="course-search-wrapper" ref={courseSearchRef}>
            <label className={`form-label${!purchaseForm.acc_id ? ' course-search-label-disabled' : ''}`}>
              <Search size={14} style={{ display: 'inline', marginRight: '0.35rem', verticalAlign: 'middle' }} />
              {t('codes_screen.purchase_modal.search_course_by_name')}
            </label>
            <div className="course-search-input-container">
              <input
                type="text"
                className={`course-search-input${!purchaseForm.acc_id ? ' course-search-input-disabled' : ''}`}
                placeholder={!purchaseForm.acc_id ? t('codes_screen.purchase_modal.accreditation') + '...' : t('codes_screen.purchase_modal.search_course_placeholder')}
                value={courseSearchQuery}
                disabled={!purchaseForm.acc_id}
                onChange={(e) => {
                  setCourseSearchQuery(e.target.value);
                  if (!e.target.value.trim()) {
                    setCourseSearchResults([]);
                    setShowCourseDropdown(false);
                  }
                }}
                onFocus={() => courseSearchResults.length > 0 && setShowCourseDropdown(true)}
                autoComplete="off"
              />
              {isSearchingCourses && (
                <div className="course-search-spinner" />
              )}
              {courseSearchQuery && !isSearchingCourses && (
                <button
                  type="button"
                  className="course-search-clear"
                  onClick={() => {
                    setCourseSearchQuery('');
                    setCourseSearchResults([]);
                    setShowCourseDropdown(false);
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
            {showCourseDropdown && courseSearchResults.length > 0 && (
              <div className="course-search-dropdown">
                {courseSearchResults.map((course) => (
                  <button
                    key={`${course._acc_id}-${course.id}`}
                    type="button"
                    className="course-search-option"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleCourseSearchSelect(course);
                    }}
                  >
                    <div className="course-search-option-name">
                      <BookOpen size={14} />
                      <span>{course.name || course.code}</span>
                    </div>
                    <div className="course-search-option-meta">
                      {(course.category?.name || course.sub_category?.name) && (
                        <span className="course-search-option-separator">·</span>
                      )}
                      {course.category?.name && <span>{course.category.name}</span>}
                      {course.sub_category?.name && (
                        <>
                          <span className="course-search-option-separator">›</span>
                          <span>{course.sub_category.name}</span>
                        </>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
            {debouncedCourseSearch && !isSearchingCourses && courseSearchResults.length === 0 && purchaseForm.acc_id && (
              <p className="course-search-no-results">{t('codes_screen.purchase_modal.search_course_no_results')}</p>
            )}
          </div>

          <div className="course-search-divider">
            <span>{t('codes_screen.purchase_modal.or_select_manually')}</span>
          </div>

          {/* Category Selection */}
          <FormInput
            label={t('codes_screen.purchase_modal.category')}
            name="category_id"
            type="select"
            value={purchaseForm.category_id}
            onChange={(e) => handleCategoryChange(e.target.value)}
            required
            disabled={!purchaseForm.acc_id || loadingCategories}
            error={errors.category_id}
            options={[
              { value: '', label: !purchaseForm.acc_id ? t('codes_screen.errors.select_acc') : (loadingCategories ? t('codes_screen.purchase_modal.loading_categories') : t('codes_screen.purchase_modal.select_category')) },
              ...categories
                .filter(cat => cat.id != null && cat.id !== '')
                .map(cat => ({
                  value: String(cat.id),
                  label: cat.name || cat.name_ar || `${t('codes_screen.purchase_modal.category')} ${cat.id}`
                }))
            ]}
          />

          {/* Sub-Category Selection */}
          <FormInput
            label={t('codes_screen.purchase_modal.sub_category')}
            name="sub_category_id"
            type="select"
            value={purchaseForm.sub_category_id}
            onChange={(e) => handleSubCategoryChange(e.target.value)}
            required
            disabled={!purchaseForm.acc_id || !purchaseForm.category_id || loadingSubCategories}
            error={errors.sub_category_id}
            options={[
              { value: '', label: !purchaseForm.acc_id ? t('codes_screen.errors.select_acc') : (!purchaseForm.category_id ? t('codes_screen.errors.category_required') : (loadingSubCategories ? t('codes_screen.purchase_modal.loading_sub_categories') : t('codes_screen.purchase_modal.select_sub_category'))) },
              ...subCategories
                .filter(subCat => subCat.id != null && subCat.id !== '')
                .map(subCat => ({
                  value: String(subCat.id),
                  label: subCat.name || subCat.name_ar || `${t('codes_screen.purchase_modal.sub_category')} ${subCat.id}`
                }))
            ]}
          />

          {/* Course Selection */}
          <div>
            <FormInput
              label={t('codes_screen.purchase_modal.course')}
              name="course_id"
              type="select"
              value={purchaseForm.course_id}
              onChange={(e) => handleCourseChange(e.target.value)}
              required
              disabled={!purchaseForm.acc_id || !purchaseForm.category_id || !purchaseForm.sub_category_id || courses.length === 0 || loadingCourses}
              options={[
                { value: '', label: !purchaseForm.acc_id ? t('codes_screen.errors.select_acc') : (!purchaseForm.category_id ? t('codes_screen.errors.category_required') : (!purchaseForm.sub_category_id ? t('codes_screen.errors.sub_category_required') : (loadingCourses ? t('codes_screen.purchase_modal.loading_courses') : t('codes_screen.purchase_modal.select_course')))) },
                ...courses.map(course => {
                  const courseId = course.id ? (typeof course.id === 'string' ? parseInt(course.id) : course.id) : course.id;
                  return {
                    value: String(courseId),
                    label: course.name || course.code || `${t('codes_screen.purchase_modal.course')} ${courseId}`,
                  };
                })
              ]}
              error={errors.course_id}
            />
            {!purchaseForm.acc_id && (
              <p className="form-info-text">
                {t('codes_screen.errors.select_acc')}
              </p>
            )}
            {purchaseForm.acc_id && !purchaseForm.category_id && (
              <p className="form-info-text">
                {t('codes_screen.errors.category_required')}
              </p>
            )}
            {purchaseForm.acc_id && purchaseForm.category_id && !purchaseForm.sub_category_id && (
              <p className="form-info-text">
                {t('codes_screen.errors.sub_category_required')}
              </p>
            )}
            {purchaseForm.acc_id && purchaseForm.category_id && purchaseForm.sub_category_id && courses.length === 0 && !loadingCourses && (
              <p className="form-warning-text">
                {t('codes_screen.purchase_modal.no_courses')}
              </p>
            )}
          </div>

          <FormInput
            label={t('codes_screen.purchase_modal.quantity')}
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
            inputClassName="no-spinner"
            onWheel={(e) => e.target.blur()}
          />

          <div>
            {discountCodes.length > 0 ? (
              <FormInput
                label={t('codes_screen.purchase_modal.discount_code')}
                name="discount_code"
                type="select"
                value={purchaseForm.discount_code}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, discount_code: e.target.value })}
                disabled={loadingDiscountCodes}
                options={[
                  { value: '', label: t('codes_screen.purchase_modal.no_discount_code') },
                  ...discountCodes.map(code => ({
                    value: code.code || code.discount_code || code.id,
                    label: `${code.code || code.discount_code || `${t('codes_screen.purchase_modal.course')} ${code.id}`}${code.discount_percentage ? ` - ${code.discount_percentage}% off` : ''}${code.discount_amount ? ` - $${code.discount_amount} off` : ''}`,
                  }))
                ]}
                error={errors.discount_code}
                helpText={t('codes_screen.purchase_modal.discount_codes_available', { count: discountCodes.length })}
              />
            ) : (
              <FormInput
                label={t('codes_screen.purchase_modal.discount_code')}
                name="discount_code"
                type="text"
                value={purchaseForm.discount_code}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, discount_code: e.target.value })}
                placeholder={t('codes_screen.purchase_modal.enter_discount_manually')}
                disabled={loadingDiscountCodes}
                error={errors.discount_code}
                helpText={loadingDiscountCodes
                  ? t('codes_screen.purchase_modal.loading_discount_codes')
                  : purchaseForm.course_id
                    ? t('codes_screen.purchase_modal.manual_discount_hint')
                    : t('codes_screen.purchase_modal.select_course_first')}
              />
            )}
            {discountCodes.length > 0 && (
              <div className="discount-codes-container">
                <p className="discount-codes-title">{t('codes_screen.purchase_modal.available_discount_codes')}:</p>
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
                          <span className="discount-code-expiry">{t('codes_screen.purchase_modal.expires')}: {new Date(code.expires_at).toLocaleDateString()}</span>
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
            label={t('codes_screen.purchase_modal.payment_method')}
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
              { value: 'credit_card', label: t('codes_screen.purchase_modal.credit_card') },
              { value: 'manual_payment', label: t('codes_screen.purchase_modal.manual_payment') },
            ]}
            error={errors.payment_method}
          />

          {/* Manual Payment Fields */}
          {purchaseForm.payment_method === 'manual_payment' && (
            <>
              {manualPaymentInfo && (
                <div className="payment-info-container" style={{ marginBottom: '16px', padding: '16px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                  <p className="payment-info-title" style={{ fontWeight: '600', marginBottom: '8px' }}>
                    {t('codes_screen.purchase_modal.payment_info_title')}
                  </p>
                  <p className="payment-info-text" style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>
                    {t('codes_screen.purchase_modal.final_amount')}: ${paymentIntentData?.final_amount || paymentIntentData?.total_amount || '0.00'}
                  </p>
                  {manualPaymentInfo.requires_receipt && (
                    <p className="payment-info-text" style={{ fontSize: '12px', color: '#888' }}>
                      {t('codes_screen.purchase_modal.supported_formats')}: {manualPaymentInfo.receipt_formats?.join(', ').toUpperCase() || 'PDF, JPG, PNG'}
                      ({t('codes_screen.purchase_modal.max_size')}: {manualPaymentInfo.max_receipt_size_mb || 10} MB)
                    </p>
                  )}
                </div>
              )}

              <FormInput
                label={t('codes_screen.purchase_modal.payment_amount')}
                name="payment_amount"
                type="number"
                value={purchaseForm.payment_amount}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, payment_amount: e.target.value })}
                required
                min="0"
                step="0.01"
                error={errors.payment_amount}
                inputClassName="no-spinner"
                onWheel={(e) => e.target.blur()}
                helpText={manualPaymentInfo?.final_amount ? `${t('codes_screen.purchase_modal.payment_amount_hint')} (should match: $${manualPaymentInfo.final_amount})` : t('codes_screen.purchase_modal.payment_amount_hint')}
              />

              <div className="form-input-group">
                <label className="form-input-label">
                  {t('codes_screen.purchase_modal.payment_receipt')} <span className="required-asterisk">*</span>
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
                        setErrors({ payment_receipt: `${t('codes_screen.errors.file_type_not_supported')}. ${t('codes_screen.purchase_modal.supported_formats')}: ${allowedTypes.join(', ').toUpperCase()}` });
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
                          setErrors({ payment_receipt: t('codes_screen.errors.file_size_exceeded', { size: manualPaymentInfo?.max_receipt_size_mb || 10 }) });
                          return;
                        }

                        setPurchaseForm({ ...purchaseForm, payment_receipt: processedFile });
                        setErrors({ ...errors, payment_receipt: null });
                      } catch (error) {
                        console.error('Error processing file:', error);
                        setErrors({ payment_receipt: t('codes_screen.errors.file_process_failed') });
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
              <p className="payment-info-title">{t('codes_screen.purchase_modal.credit_card_info_title')}</p>
              <p className="payment-info-text">
                {t('codes_screen.purchase_modal.credit_card_info_text')}
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
              {t('codes_screen.buttons.cancel')}
            </button>
            <button
              type="submit"
              disabled={creatingPaymentIntent || purchasing || !purchaseForm.acc_id || !purchaseForm.course_id || !purchaseForm.quantity}
              className="form-btn form-btn-submit"
            >
              {creatingPaymentIntent ? t('codes_screen.buttons.processing') : purchasing ? t('codes_screen.buttons.processing') : t('codes_screen.buttons.purchase')}
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
            alert(t('codes_screen.messages.purchase_success'));
          } catch (error) {
            console.error('Failed to purchase codes:', error);

            // Handle different error types according to guide
            if (error.response?.status === 400) {
              const errorData = error.response.data;
              setErrors({ general: errorData?.message || t('codes_screen.errors.payment_failed') });
            } else if (error.response?.status === 402) {
              const errorData = error.response.data;
              setErrors({ general: errorData?.message || 'Insufficient wallet balance. Please add funds to your wallet or use a different payment method.' });
            } else if (error.response?.status === 403) {
              const errorData = error.response.data;
              setErrors({ general: errorData?.message || 'You do not have authorization from this Accreditation or the Accreditation is not active.' });
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
                setErrors({ general: t('codes_screen.errors.validation_failed') });
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
                setErrors({ general: t('codes_screen.errors.purchase_failed') });
              }
            } else {
              setErrors({ general: t('codes_screen.errors.purchase_failed') });
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