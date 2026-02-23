import { useEffect, useState, useMemo, useRef } from 'react';
import { trainingCenterAPI } from '../../../services/api';
import { useHeader } from '../../../context/HeaderContext';
import useDebounce from '../../../hooks/useDebounce';
import { validateEmail, validatePhone, validateRequired, validateMinLength } from '../../../utils/validation';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://app.bomeqp.com/api/api';
import { Users, Plus, Edit, Trash2, Eye, Mail, Phone, Search, Filter, CheckCircle, Clock, XCircle, ChevronUp, ChevronDown, X, Globe, Send, Building2, BookOpen, FileText, User, Calendar } from 'lucide-react';
import Modal from '../../../components/Modal/Modal';
import ConfirmDialog from '../../../components/ConfirmDialog/ConfirmDialog';
import LoadingSpinner from '../../../components/LoadingSpinner/LoadingSpinner';
import TabCard from '../../../components/TabCard/TabCard';
import TabCardsGrid from '../../../components/TabCardsGrid/TabCardsGrid';
import DataTable from '../../../components/DataTable/DataTable';
import './InstructorsScreen.css';
import FormInput from '../../../components/FormInput/FormInput';
import LanguageSelector from '../../../components/LanguageSelector/LanguageSelector';
import DetailForm from '../../../components/DetailForm/DetailForm';
import Pagination from '../../../components/Pagination/Pagination';
import { useTranslation } from '../../../hooks/useTranslation';
import FilterMenu from '../../../components/FilterMenu/FilterMenu';

const TrainingCenterInstructorsScreen = () => {
  const { t } = useTranslation('training_center');
  const { setHeaderActions, setHeaderTitle, setHeaderSubtitle } = useHeader();
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [requestAuthModalOpen, setRequestAuthModalOpen] = useState(false);
  const [selectedInstructor, setSelectedInstructor] = useState(null);
  const [accs, setAccs] = useState([]);
  // Request related states
  const [categories, setCategories] = useState([]);
  const [courses, setCourses] = useState([]);
  const [subCategoriesMap, setSubCategoriesMap] = useState({});
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [expandedSubCategories, setExpandedSubCategories] = useState(new Set());
  const [courseSearchTerm, setCourseSearchTerm] = useState('');
  const [loadingTree, setLoadingTree] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false); // Kept for compatibility if checked elsewhere
  const [loadingSubCategories, setLoadingSubCategories] = useState(false); // Kept for compatibility

  const [requestForm, setRequestForm] = useState({
    acc_id: '',
    course_ids: [],
  });
  const [requestErrors, setRequestErrors] = useState({});
  const [requesting, setRequesting] = useState(false);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    id_number: '',
    cv: null,
    passport: null,
    specializations: [],
    is_assessor: false,
  });
  const [cvFile, setCvFile] = useState(null);
  const [cvFileName, setCvFileName] = useState('');
  const [existingCvUrl, setExistingCvUrl] = useState('');
  const [passportFile, setPassportFile] = useState(null);
  const [passportFileName, setPassportFileName] = useState('');
  const [existingPassportUrl, setExistingPassportUrl] = useState('');
  const [resizingPassport, setResizingPassport] = useState(false);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeFilters, setActiveFilters] = useState({
    country: '',
    city: '',
    is_assessor: ''
  });

  // Pagination State
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const hasDataRef = useRef(false);

  // Statistics from API
  const [statistics, setStatistics] = useState({
    total: 0,
    pending: 0,
    active: 0,
    suspended: 0,
    inactive: 0
  });

  useEffect(() => {
    const showLoading = !hasDataRef.current;

    if (searchTerm !== debouncedSearchTerm) {
      return;
    }

    loadInstructors(page, perPage, debouncedSearchTerm, statusFilter, showLoading);
  }, [page, perPage, debouncedSearchTerm, statusFilter, searchTerm, activeFilters]);

  useEffect(() => {
    setHeaderTitle(t('instructors_screen.title'));
    setHeaderSubtitle(t('instructors_screen.subtitle'));
    setHeaderActions(
      <button
        onClick={() => handleOpenModal()}
        className="instructors-header-button"
      >
        <Plus size={20} className="instructors-header-button-icon" />
        {t('instructors_screen.add_instructor')}
      </button>
    );
    return () => {
      setHeaderActions(null);
      setHeaderTitle(null);
      setHeaderSubtitle(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setHeaderActions, setHeaderTitle, setHeaderSubtitle, t]);

  useEffect(() => {
    if (requestAuthModalOpen && selectedInstructor) {
      loadRequestFormData();
    }
  }, [requestAuthModalOpen, selectedInstructor]);

  // No longer needed in the new structure as we calculate indeterminate states during render
  // or via helper functions specific to the tree structure.

  const loadInstructors = async (pageArg = 1, limitArg = 10, search = '', status = 'all', showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    } else {
      setIsSearchLoading(true);
    }
    try {
      // Load data with pagination and search
      const data = await trainingCenterAPI.listInstructors({
        page: pageArg,
        per_page: limitArg,
        ...(search && { search }),
        ...(status !== 'all' && { status }),
        ...(activeFilters.country && { country: activeFilters.country }),
        ...(activeFilters.city && { city: activeFilters.city }),
        ...(activeFilters.is_assessor !== '' && activeFilters.is_assessor !== undefined && { is_assessor: activeFilters.is_assessor })
      });

      let instructorsArray = [];
      if (data?.data) {
        instructorsArray = Array.isArray(data.data) ? data.data : (data.data?.instructors || []);
      } else if (data?.instructors) {
        instructorsArray = data.instructors;
      } else if (Array.isArray(data)) {
        instructorsArray = data;
      } else {
        console.warn('Unexpected response format:', data);
        instructorsArray = [];
      }

      setInstructors(instructorsArray);

      // Update pagination info
      if (data) {
        const total = data.total || instructorsArray.length;
        setTotalItems(total);
        setTotalPages(data.last_page || Math.ceil(total / limitArg) || 1);

        // Update statistics from API response
        if (data.statistics) {
          setStatistics({
            total: data.statistics.total || 0,
            pending: data.statistics.pending || 0,
            active: data.statistics.active || 0,
            suspended: data.statistics.suspended || 0,
            inactive: data.statistics.inactive || 0
          });
        }
      }
      hasDataRef.current = true;
    } catch (error) {
      console.error('Failed to load instructors:', error);
      console.error('Error details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      setInstructors([]);
    } finally {
      setLoading(false);
      setIsSearchLoading(false);
    }
  };


  const handleOpenModal = (instructor = null) => {
    if (instructor) {
      setSelectedInstructor(instructor);
      setFormData({
        first_name: instructor.first_name || '',
        last_name: instructor.last_name || '',
        email: instructor.email || '',
        phone: instructor.phone || '',
        date_of_birth: instructor.date_of_birth ? instructor.date_of_birth.split('T')[0] : '',
        id_number: instructor.id_number || '',
        cv: null,
        passport: null,
        specializations: Array.isArray(instructor.specializations)
          ? instructor.specializations
          : (instructor.specializations ? instructor.specializations.split(',').map(s => s.trim()).filter(s => s) : []),
        is_assessor: instructor.is_assessor || false,
      });
      setCvFile(null);
      setCvFileName('');
      setExistingCvUrl(instructor.cv_url || '');
      setPassportFile(null);
      setPassportFileName('');
      setExistingPassportUrl(instructor.passport_image_url || '');
    } else {
      setSelectedInstructor(null);
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        date_of_birth: '',
        id_number: '',
        cv: null,
        passport: null,
        specializations: [],
        is_assessor: false,
      });
      setCvFile(null);
      setCvFileName('');
      setExistingCvUrl('');
      setPassportFile(null);
      setPassportFileName('');
      setExistingPassportUrl('');
    }
    setErrors({});
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedInstructor(null);
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      date_of_birth: '',
      id_number: '',
      cv: null,
      passport: null,
      specializations: [],
      is_assessor: false,
    });
    setCvFile(null);
    setCvFileName('');
    setExistingCvUrl('');
    setPassportFile(null);
    setPassportFileName('');
    setExistingPassportUrl('');
    setErrors({});
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setErrors({});
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (file.type !== 'application/pdf') {
        setErrors({ cv: t('instructors_screen.only_pdf_files_allowed') });
        e.target.value = ''; // Clear the input
        return;
      }

      // Validate file size (10MB = 10 * 1024 * 1024 bytes)
      if (file.size > 10 * 1024 * 1024) {
        setErrors({ cv: t('instructors_screen.file_size_must_be_less_than_10mb') });
        e.target.value = ''; // Clear the input
        return;
      }

      setCvFile(file);
      setCvFileName(file.name);
      setFormData({
        ...formData,
        cv: file,
      });
      // Clear any previous CV errors
      if (errors.cv) {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.cv;
          return newErrors;
        });
      }
    }
  };

  const handleSpecializationsChange = (specializations) => {
    setFormData({
      ...formData,
      specializations: specializations,
    });
    setErrors({});
  };

  // Resize image function for passport
  const resizePassportImage = (file, maxWidth = 1920, maxHeight = 1920, quality = 0.8) => {
    return new Promise((resolve) => {
      // If it's a PDF, return as-is
      if (file.type === 'application/pdf') {
        resolve(file);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          // Calculate new dimensions
          if (width > maxWidth || height > maxHeight) {
            if (width > height) {
              height = (height * maxWidth) / width;
              width = maxWidth;
            } else {
              width = (width * maxHeight) / height;
              height = maxHeight;
            }
          }

          // Create canvas and resize
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to blob
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const resizedFile = new File([blob], file.name, {
                  type: file.type,
                  lastModified: Date.now(),
                });
                resolve(resizedFile);
              } else {
                resolve(file);
              }
            },
            file.type,
            quality
          );
        };
        img.onerror = () => resolve(file);
        img.src = e.target.result;
      };
      reader.onerror = () => resolve(file);
      reader.readAsDataURL(file);
    });
  };

  const handlePassportFileChange = async (e) => {
    try {
      const file = e.target.files[0];
      if (!file) return;

      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        setErrors({ passport: t('instructors_screen.file_must_be_jpeg_jpg_png_or_pdf') });
        return;
      }
      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        setErrors({ passport: t('instructors_screen.file_size_must_be_less_than_10mb') });
        return;
      }

      setResizingPassport(true);

      let processedFile = file;
      if (file.type.startsWith('image/')) {
        try {
          processedFile = await resizePassportImage(file);
        } catch (resizeError) {
          console.error("Resize failed", resizeError);
          // Fallback to original file
          processedFile = file;
        }
      }

      if (!processedFile) {
        throw new Error("File processing resulted in null");
      }

      setPassportFile(processedFile);
      setPassportFileName(processedFile.name || "passport.pdf");

      setFormData(prev => ({
        ...prev,
        passport: processedFile,
      }));

      // Clear error
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.passport;
        return newErrors;
      });

    } catch (error) {
      console.error('Error in handlePassportFileChange:', error);
      setErrors({ passport: "Failed to process image. Please try another file." });
    } finally {
      setResizingPassport(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});

    // Validation - All fields are now required per API update
    const validationErrors = {};

    // Required text fields
    const firstNameError = validateRequired(formData.first_name, t('instructors_screen.first_name'));
    if (firstNameError) validationErrors.first_name = firstNameError;

    const lastNameError = validateRequired(formData.last_name, t('instructors_screen.last_name'));
    if (lastNameError) validationErrors.last_name = lastNameError;

    const emailError = validateEmail(formData.email);
    if (emailError) validationErrors.email = emailError;

    const phoneError = validateRequired(formData.phone, t('instructors_screen.phone'));
    if (phoneError) {
      validationErrors.phone = phoneError;
    } else {
      const phoneFormatError = validatePhone(formData.phone, 10);
      if (phoneFormatError) validationErrors.phone = phoneFormatError;
    }

    // Date of birth validation
    const dobError = validateRequired(formData.date_of_birth, t('instructors_screen.date_of_birth'));
    if (dobError) {
      validationErrors.date_of_birth = dobError;
    } else {
      // Validate that date is before today
      const dob = new Date(formData.date_of_birth);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (dob >= today) {
        validationErrors.date_of_birth = t('instructors_screen.date_of_birth_must_be_before_today');
      }
    }

    // Languages validation (minimum 1 language required)
    if (!formData.specializations || formData.specializations.length === 0) {
      validationErrors.specializations = t('instructors_screen.at_least_one_language_required');
    }

    // File validations - required for create, optional for update if file already exists
    if (!selectedInstructor) {
      // Create mode - files are required
      if (!cvFile) {
        validationErrors.cv = t('instructors_screen.cv_required');
      }
      if (!passportFile) {
        validationErrors.passport = t('instructors_screen.passport_required');
      }
    } else {
      // Edit mode - files are only required if no existing file URL
      if (!cvFile && !existingCvUrl) {
        validationErrors.cv = t('instructors_screen.cv_required');
      }
      if (!passportFile && !existingPassportUrl) {
        validationErrors.passport = t('instructors_screen.passport_required');
      }
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setSaving(false);
      return;
    }

    try {
      // Check if we need FormData (if there's a file to upload)
      const hasCvFile = cvFile instanceof File;
      const hasPassportFile = passportFile instanceof File;
      const hasFile = hasCvFile || hasPassportFile;

      let submitData;

      if (hasFile) {
        // Use FormData when there's a file to upload
        submitData = new FormData();
        submitData.append('first_name', formData.first_name.trim());
        submitData.append('last_name', formData.last_name.trim());
        submitData.append('email', formData.email.trim());
        submitData.append('phone', formData.phone.trim());
        submitData.append('date_of_birth', formData.date_of_birth);

        if (formData.id_number?.trim()) {
          submitData.append('id_number', formData.id_number.trim());
        }

        // Append CV file if provided
        if (hasCvFile) {
          submitData.append('cv', cvFile);
        }

        // Append Passport file if provided
        if (hasPassportFile) {
          submitData.append('passport', passportFile);
        }

        // Append languages (use 'languages' for API, backend accepts both)
        if (formData.specializations && formData.specializations.length > 0) {
          formData.specializations.forEach(spec => {
            submitData.append('languages[]', spec);
          });
        }

        // Append is_assessor
        submitData.append('is_assessor', formData.is_assessor === true || formData.is_assessor === 'true' || formData.is_assessor === 1 || formData.is_assessor === '1' ? '1' : '0');

        console.log('📦 Using FormData (file upload required)');
      } else {
        // Use JSON object (no file upload needed)
        submitData = {
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          date_of_birth: formData.date_of_birth,
          id_number: formData.id_number?.trim() || null,
          languages: formData.specializations || [], // Use 'languages' field name
          is_assessor: formData.is_assessor,
        };

        console.log('📄 Using JSON (no file upload):', JSON.stringify(submitData, null, 2));
      }

      console.log('Submitting instructor data:', hasFile ? 'FormData' : 'JSON');
      console.log('is_assessor value:', formData.is_assessor, 'Type:', typeof formData.is_assessor);

      if (selectedInstructor) {
        console.log('🔄 Updating instructor with ID:', selectedInstructor.id);
        console.log('📦 Submit data type:', hasFile ? 'FormData' : 'JSON');
        if (hasFile) {
          if (cvFile) console.log('📄 CV File:', cvFile.name, cvFile.size, 'bytes');
          if (passportFile) console.log('📄 Passport File:', passportFile.name, passportFile.size, 'bytes');
        }
        const result = await trainingCenterAPI.updateInstructor(selectedInstructor.id, submitData);
        console.log('✅ Update result:', result);

        // Check if CV was updated
        if (hasFile && result?.instructor?.cv_url) {
          console.log('✅ CV updated successfully:', result.instructor.cv_url);
        }
      } else {
        console.log('➕ Creating new instructor');
        await trainingCenterAPI.createInstructor(submitData);
      }
      await loadInstructors(page, perPage, debouncedSearchTerm, statusFilter);
      handleCloseModal();
    } catch (error) {
      console.error('Error submitting instructor:', error);
      console.error('Error response:', error.response?.data);

      // Handle different error response formats
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      } else if (error.response?.data?.message) {
        setErrors({ general: error.response.data.message });
      } else if (error.response?.data?.error) {
        setErrors({ general: error.response.data.error });
      } else if (error.errors) {
        setErrors(error.errors);
      } else {
        setErrors({ general: error.message || t('training_center.instructors_screen.failed_to_save_instructor') });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (instructor) => {
    setSelectedInstructor(instructor);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await trainingCenterAPI.deleteInstructor(selectedInstructor.id);
      await loadInstructors(page, perPage, debouncedSearchTerm, statusFilter);
    } catch (error) {
      alert(t('training_center.instructors_screen.failed_to_delete_instructor') + ': ' + (error.message || 'Unknown error'));
    }
    setIsDeleteDialogOpen(false);
    setSelectedInstructor(null);
  };

  const handleViewDetails = async (instructor) => {
    try {
      const data = await trainingCenterAPI.getInstructorDetails(instructor.id);
      setSelectedInstructor(data.instructor);
      setDetailModalOpen(true);
    } catch (error) {
      console.error('Failed to load instructor details:', error);
      setSelectedInstructor(instructor);
      setDetailModalOpen(true);
    }
  };

  const handleRequestAuthorization = (instructor) => {
    setSelectedInstructor(instructor);
    setRequestForm({
      acc_id: '',
      course_ids: [],
    });
    setCategories([]);
    setSubCategoriesMap({});
    setCourses([]);
    setExpandedCategories(new Set());
    setExpandedSubCategories(new Set());
    setCourseSearchTerm('');
    setRequestErrors({});
    setRequestAuthModalOpen(true);
  };

  const loadRequestFormData = async () => {
    try {
      const authData = await trainingCenterAPI.getAuthorizationStatus({ per_page: 100 });

      let authArray = [];
      if (authData?.data) {
        authArray = Array.isArray(authData.data) ? authData.data : [];
      } else if (authData?.authorizations) {
        authArray = Array.isArray(authData.authorizations) ? authData.authorizations : [];
      } else if (Array.isArray(authData)) {
        authArray = authData;
      }

      // Filter for approved authorizations and extract ACCs directly from the authorization object
      // This avoids issues where the ACC might not be in the first page of listACCs
      const approvedAccs = authArray
        .filter(auth => auth.status === 'approved' && auth.acc)
        .map(auth => auth.acc)
        // Deduplicate using Map to ensure unique ACCs by ID
        .filter((acc, index, self) => index === self.findIndex(a => a.id === acc.id));

      setAccs(approvedAccs);
      setCourses([]);
      setSubCategoriesMap({});
    } catch (error) {
      console.error('Failed to load request form data:', error);
      setAccs([]);
    }
  };

  const handleAccChange = async (accId) => {
    // Clear state
    setRequestForm({ ...requestForm, acc_id: accId, course_ids: [] });
    setCategories([]);
    setSubCategoriesMap({});
    setCourses([]);
    setExpandedCategories(new Set());
    setExpandedSubCategories(new Set());
    setCourseSearchTerm('');

    if (!accId) return;

    try {
      setLoadingTree(true);

      // 1. Fetch Categories
      const categoriesData = await trainingCenterAPI.getCategoriesForACC(accId);
      const categoriesList = categoriesData.categories || categoriesData.data || categoriesData || [];
      setCategories(categoriesList);

      // 2. Fetch All Courses
      const coursesData = await trainingCenterAPI.getCoursesForACC(accId);
      const coursesList = coursesData.courses || coursesData.data || coursesData || [];
      setCourses(coursesList);

      // 3. Fetch Sub-Categories for each Category (Parallel)
      const subCatsMap = {};
      const subCatPromises = categoriesList.map(async (cat) => {
        try {
          const subData = await trainingCenterAPI.getSubCategoriesForCategory(cat.id);
          subCatsMap[cat.id] = subData.sub_categories || subData.data || subData || [];
        } catch (err) {
          console.error(`Failed to load sub-categories for category ${cat.id}`, err);
          subCatsMap[cat.id] = [];
        }
      });
      await Promise.all(subCatPromises);
      setSubCategoriesMap(subCatsMap);

    } catch (error) {
      console.error('Failed to load Accreditation Body data:', error);
    } finally {
      setLoadingTree(false);
    }
  };

  const toggleCategoryExpansion = (categoryId) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) newSet.delete(categoryId);
      else newSet.add(categoryId);
      return newSet;
    });
  };

  const toggleSubCategoryExpansion = (subCategoryId) => {
    setExpandedSubCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(subCategoryId)) newSet.delete(subCategoryId);
      else newSet.add(subCategoryId);
      return newSet;
    });
  };

  // Helper to get all courses recursively for a category
  const getCoursesForCategory = (categoryId) => {
    const subCats = subCategoriesMap[categoryId] || [];
    const subCatIds = subCats.map(sc => sc.id);
    return courses.filter(c => {
      const cSubId = c.sub_category_id || c.sub_category?.id;
      return subCatIds.includes(cSubId);
    });
  };

  // Helper to get courses for a sub-category
  const getCoursesForSubCategory = (subCategoryId) => {
    return courses.filter(c => {
      const cSubId = c.sub_category_id || c.sub_category?.id;
      // Handle both string and number comparison safely
      return cSubId == subCategoryId;
    });
  };

  const handleCategoryToggle = (categoryId) => {
    const categoryCourses = getCoursesForCategory(categoryId);
    // Filter out already authorized courses
    const authorizedCourseIds = getAuthorizedCourseIds();
    const selectableCourses = categoryCourses.filter(c => !authorizedCourseIds.has(c.id));
    const selectableIds = selectableCourses.map(c => c.id);

    if (selectableIds.length === 0) return;

    setRequestForm(prev => {
      const currentIds = prev.course_ids || [];
      const allSelected = selectableIds.every(id => currentIds.includes(id));

      let newIds;
      if (allSelected) {
        // Deselect all
        newIds = currentIds.filter(id => !selectableIds.includes(id));
      } else {
        // Select all
        newIds = [...new Set([...currentIds, ...selectableIds])];
      }
      return { ...prev, course_ids: newIds };
    });
  };

  const handleSubCategoryToggle = (subCategoryId) => {
    const subCatCourses = getCoursesForSubCategory(subCategoryId);
    const authorizedCourseIds = getAuthorizedCourseIds();
    const selectableCourses = subCatCourses.filter(c => !authorizedCourseIds.has(c.id));
    const selectableIds = selectableCourses.map(c => c.id);

    if (selectableIds.length === 0) return;

    setRequestForm(prev => {
      const currentIds = prev.course_ids || [];
      const allSelected = selectableIds.every(id => currentIds.includes(id));

      let newIds;
      if (allSelected) {
        newIds = currentIds.filter(id => !selectableIds.includes(id));
      } else {
        newIds = [...new Set([...currentIds, ...selectableIds])];
      }
      return { ...prev, course_ids: newIds };
    });
  };

  const handleCourseToggle = (courseId) => {
    setRequestForm(prev => {
      const currentIds = prev.course_ids || [];
      const newIds = currentIds.includes(courseId)
        ? currentIds.filter(id => id !== courseId)
        : [...currentIds, courseId];
      return { ...prev, course_ids: newIds };
    });
  };

  const getAuthorizedCourseIds = () => {
    return new Set(
      selectedInstructor?.courses
        ?.filter(instCourse =>
          instCourse.pivot?.acc_id === parseInt(requestForm.acc_id) &&
          instCourse.pivot?.status === 'active'
        )
        .map(instCourse => instCourse.id) || []
    );
  };

  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    if (!selectedInstructor) return;

    setRequesting(true);
    setRequestErrors({});

    try {
      // Validate
      if (!requestForm.acc_id) {
        setRequestErrors({ general: t('training_center.instructors_screen.please_select_acc') });
        setRequesting(false);
        return;
      }

      if (!requestForm.course_ids || requestForm.course_ids.length === 0) {
        setRequestErrors({ general: t('training_center.instructors_screen.please_select_at_least_one_course') });
        setRequesting(false);
        return;
      }

      // Build submit data - Always send granular course IDs for accuracy
      const submitData = {
        acc_id: parseInt(requestForm.acc_id),
        course_ids: requestForm.course_ids.map(id => parseInt(id))
      };

      const response = await trainingCenterAPI.requestInstructorAuthorization(selectedInstructor.id, submitData);

      setRequestAuthModalOpen(false);
      setRequestForm({
        acc_id: '',
        category_id: '',
        sub_category_id: '',
        course_ids: [],
      });
      setExpandedCategories(new Set());
      setExpandedSubCategories(new Set());
      setCategories([]);
      setCourses([]);
      setSubCategoriesMap({});
      setCourseSearchTerm('');
      setSelectedInstructor(null);

      alert(`${t('instructors_screen.authorization_request_submitted')} ${coursesCount} ${t('certificates').toLowerCase()} included.`);
    } catch (error) {
      console.error('Failed to submit request:', error);
      if (error.response?.data) {
        const errorData = error.response.data;
        if (errorData.errors) {
          setRequestErrors(errorData.errors);
        } else if (errorData.message) {
          setRequestErrors({ general: errorData.message });
        } else {
          setRequestErrors(errorData);
        }
      } else if (error.message) {
        setRequestErrors({ general: error.message });
      } else {
        setRequestErrors({ general: t('training_center.instructors_screen.failed_to_submit_request') });
      }
    } finally {
      setRequesting(false);
    }
  };


  // Filter instructors by status (search is handled by DataTable)
  const filteredInstructors = useMemo(() => {
    // DataTable handles search internally, we only need to filter by status if needed
    // But since DataTable has filterOptions, we can just pass all instructors
    return instructors;
  }, [instructors]);

  // Define columns for DataTable
  const instructorsColumns = useMemo(() => [
    {
      header: t('instructors_screen.instructor'),
      accessor: 'name',
      sortable: true,
      render: (value, row) => (
        <div className="instructors-column-instructor gap-3">
          <div className="instructors-column-icon-wrapper" style={{ position: 'relative' }}>
            {row.photo_url ? (
              <>
                <img
                  src={row.photo_url}
                  alt={`${row.first_name} ${row.last_name}` || 'Instructor Photo'}
                  className="instructors-column-icon"
                  width="40"
                  height="40"
                  loading="lazy"
                  decoding="async"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb'
                  }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    const fallback = e.target.parentElement?.querySelector('.photo-fallback');
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
                <div
                  className="photo-fallback instructors-column-icon-wrapper"
                  style={{ display: 'none', position: 'absolute', top: 0, left: 0 }}
                >
                  <Users className="instructors-column-icon" />
                </div>
              </>
            ) : (
              <Users className="instructors-column-icon" />
            )}
          </div>
          <div>
            <div className="instructors-column-name">
              {row.first_name} {row.last_name}
            </div>
            {row.id_number && (
              <div className="instructors-column-id">{t('instructors_screen.id_number')}: {row.id_number}</div>
            )}
          </div>
        </div>
      )
    },
    {
      header: t('instructors_screen.email'),
      accessor: 'email',
      sortable: true,
      render: (value) => (
        <div className="instructors-column-email gap-3">
          <Mail className="instructors-column-email-icon" />
          {value}
        </div>
      )
    },
    {
      header: t('instructors_screen.phone'),
      accessor: 'phone',
      sortable: true,
      render: (value) => (
        value ? (
          <div className="instructors-column-phone gap-3">
            <Phone className="instructors-column-phone-icon" />
            {value}
          </div>
        ) : (
          <span className="instructors-column-na">{t('instructors_screen.na')}</span>
        )
      )
    },
    {
      header: t('instructors_screen.status'),
      accessor: 'status',
      sortable: true,
      render: (value) => {
        const statusConfig = {
          active: { bg: 'from-green-100 to-green-200', text: 'text-green-800', border: 'border-green-300', icon: CheckCircle },
          pending: { bg: 'from-yellow-100 to-yellow-200', text: 'text-yellow-800', border: 'border-yellow-300', icon: Clock },
          suspended: { bg: 'from-red-100 to-red-200', text: 'text-red-800', border: 'border-red-300', icon: XCircle },
          inactive: { bg: 'from-gray-100 to-gray-200', text: 'text-gray-800', border: 'border-gray-300', icon: Clock },
        };
        const config = statusConfig[value] || statusConfig.inactive;
        const StatusIcon = config.icon;
        const statusClass = value === 'active' ? 'instructors-column-status-badge-active' :
          value === 'pending' ? 'instructors-column-status-badge-pending' :
            value === 'suspended' ? 'instructors-column-status-badge-suspended' :
              'instructors-column-status-badge-inactive';
        return (
          <span className={`instructors-column-status-badge ${statusClass}`}>
            <StatusIcon size={14} className="instructors-column-status-icon" />
            {value ? t(`instructors_screen.${value.toLowerCase()}`, value.charAt(0).toUpperCase() + value.slice(1)) : t('instructors_screen.na')}
          </span>
        );
      }
    },
    {
      header: t('instructors_screen.type'),
      accessor: 'is_assessor',
      sortable: true,
      render: (value) => (
        value ? (
          <span className="instructors-column-type-badge-blue">
            {t('instructors_screen.assessor')}
          </span>
        ) : (
          <span className="instructors-column-type-badge-gray">
            {t('instructors_screen.instructor')}
          </span>
        )
      )
    },
    {
      header: t('instructors_screen.accreditations'),
      accessor: 'accs',
      sortable: false,
      render: (value) => (
        <div className="instructors-column-accreditations">
          {Array.isArray(value) && value.length > 0 ? (
            <div className="instructors-accs-list">
              <span className="instructors-acc-badge">
                {value[0].name || `ACC ${value[0].id}`}
              </span>
              {value.length > 1 && (
                <span className="instructors-acc-more">+{value.length - 1}</span>
              )}
            </div>
          ) : (
            <span className="instructors-column-na">{t('instructors_screen.na')}</span>
          )}
        </div>
      )
    },
    {
      header: t('instructors_screen.actions'),
      accessor: 'actions',
      sortable: false,
      render: (value, row) => (
        <div className="instructors-column-actions" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleOpenModal(row);
            }}
            className="instructors-action-button instructors-action-button-edit"
            title={t('instructors_screen.edit_instructor')}
          >
            <Edit size={16} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRequestAuthorization(row);
            }}
            className="instructors-action-button instructors-action-button-send"
            title={t('instructors_screen.request_authorization')}
          >
            <Send size={16} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(row);
            }}
            className="instructors-action-button instructors-action-button-delete"
            title={t('instructors_screen.delete')}
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ], []);

  // Use statistics from API response
  const totalCount = statistics.total;
  const activeCount = statistics.active;
  const pendingCount = statistics.pending;
  const suspendedCount = statistics.suspended;
  const inactiveCount = statistics.inactive;

  const handleFilterApply = (filters) => {
    setActiveFilters(filters);
    setPage(1);
  };

  const handleFilterClear = (emptyFilters) => {
    setActiveFilters(emptyFilters);
    setPage(1);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="instructors-container">

      {/* Stats Cards */}
      <TabCardsGrid columns={{ mobile: 1, tablet: 2, desktop: 4 }}>
        <TabCard
          name={t('instructors_screen.total_instructors')}
          value={totalCount}
          icon={Users}
          colorType="indigo"
          isActive={statusFilter === 'all'}
          onClick={() => {
            setStatusFilter('all');
            setPage(1);
          }}
        />
        <TabCard
          name={t('instructors_screen.active')}
          value={activeCount}
          icon={CheckCircle}
          colorType="green"
          isActive={statusFilter === 'active'}
          onClick={() => {
            setStatusFilter('active');
            setPage(1);
          }}
        />
        <TabCard
          name={t('instructors_screen.pending')}
          value={pendingCount}
          icon={Clock}
          colorType="yellow"
          isActive={statusFilter === 'pending'}
          onClick={() => {
            setStatusFilter('pending');
            setPage(1);
          }}
        />
        <TabCard
          name={t('instructors_screen.suspended')}
          value={suspendedCount}
          icon={XCircle}
          colorType="red"
          isActive={statusFilter === 'suspended'}
          onClick={() => {
            setStatusFilter('suspended');
            setPage(1);
          }}
        />
      </TabCardsGrid>

      {/* Table */}
      <div className="instructors-table-container">
        <DataTable
          columns={instructorsColumns}
          data={filteredInstructors}
          isLoading={loading}
          searchable={true}
          sortable={true}
          filterable={false}
          searchPlaceholder={t('instructors_screen.search_instructors_placeholder')}
          emptyMessage={t('instructors_screen.no_instructors_found')}
          defaultFilter={statusFilter}
          searchValue={searchTerm}
          onSearch={(value) => {
            setSearchTerm(value);
            setPage(1);
          }}
          customFilters={
            <FilterMenu
              filters={activeFilters}
              onApply={handleFilterApply}
              onClear={handleFilterClear}
            />
          }
          onRowClick={(instructor) => handleViewDetails(instructor)}
        />
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={totalItems}
          perPage={perPage}
          onPageChange={(p) => {
            setPage(p);
          }}
          onPerPageChange={(newPerPage) => {
            setPerPage(newPerPage);
            setPage(1);
          }}
        />
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={selectedInstructor ? t('instructors_screen.edit_instructor') : t('instructors_screen.add_instructor')}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="instructors-form">
          <div className="instructors-form-grid">
            <FormInput
              label={t('instructors_screen.first_name')}
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              required
              error={errors.first_name}
            />

            <FormInput
              label={t('instructors_screen.last_name')}
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              required
              error={errors.last_name}
            />
          </div>

          <div className="instructors-form-grid">
            <FormInput
              label={t('instructors_screen.email')}
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              error={errors.email}
              placeholder={t('instructors_screen.example_email')}
            />

            <FormInput
              label={t('instructors_screen.date_of_birth')}
              type="date"
              name="date_of_birth"
              value={formData.date_of_birth}
              onChange={handleChange}
              required
              error={errors.date_of_birth}
            />
          </div>

          <div className="instructors-form-grid">
            <FormInput
              label={t('instructors_screen.phone')}
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              error={errors.phone}
              placeholder={t('instructors_screen.enter_phone_number')}
            />

            <FormInput
              label={t('instructors_screen.id_number')}
              name="id_number"
              value={formData.id_number}
              onChange={handleChange}
              error={errors.id_number}
              placeholder={t('instructors_screen.enter_id_number')}
            />
          </div>

          <LanguageSelector
            label={t('instructors_screen.languages')}
            placeholder={t('instructors_screen.select_a_language')}
            value={formData.specializations}
            onChange={handleSpecializationsChange}
            error={errors.specializations}
          />

          <div className="instructors-checkbox-container">
            <input
              type="checkbox"
              id="is_assessor"
              name="is_assessor"
              checked={formData.is_assessor || false}
              onChange={(e) => setFormData({
                ...formData,
                is_assessor: e.target.checked
              })}
              className="instructors-checkbox"
            />
            <label htmlFor="is_assessor" className="instructors-checkbox-label">
              {t('instructors_screen.is_assessor')}
            </label>
          </div>
          <p className="instructors-helper-text">{t('instructors_screen.mark_as_assessor')}</p>

          <div>
            <label className="instructors-cv-label">
              {t('instructors_screen.cv_resume_pdf')}
            </label>

            {/* Current CV Display */}
            {existingCvUrl && !cvFile && (
              <div className="instructors-cv-display-box">
                <div className="instructors-cv-display-flex">
                  <div className="instructors-cv-display-inner">
                    <div className="instructors-cv-icon-wrapper">
                      <FileText className="text-white" size={20} />
                    </div>
                    <div>
                      <p className="instructors-cv-text-title">{t('instructors_screen.cv')}</p>
                      <p className="instructors-cv-text-hint">{t('instructors_screen.click_to_view_current_cv')}</p>
                    </div>
                  </div>
                  <a
                    href={existingCvUrl.startsWith('http') ? existingCvUrl : `${API_BASE_URL}${existingCvUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="instructors-cv-link"
                  >
                    <FileText size={14} className="instructors-cv-link-icon" />
                    {t('instructors_screen.view')}
                  </a>
                </div>
              </div>
            )}

            {/* Upload Area */}
            <div className="instructors-upload-area">
              <label className="instructors-upload-label">
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileChange}
                  className="instructors-upload-input"
                  id="cv-upload-input"
                />
                <div className="instructors-upload-div">
                  <div className="instructors-upload-inner">
                    <div className="instructors-upload-icon-wrapper">
                      <FileText className="text-primary-600" size={24} />
                    </div>
                    {cvFileName ? (
                      <>
                        <p className="instructors-upload-text-title">
                          {cvFileName}
                        </p>
                        <p className="instructors-upload-text-hint">{t('instructors_screen.click_to_change_file')}</p>
                      </>
                    ) : (
                      <>
                        <p className="instructors-upload-text-title">
                          {existingCvUrl ? t('instructors_screen.update_cv') : t('instructors_screen.upload_cv')}
                        </p>
                        <p className="instructors-upload-text-hint">
                          {t('instructors_screen.click_to_select_pdf')}
                        </p>
                      </>
                    )}
                    <p className="instructors-upload-text-small">
                      {t('instructors_screen.pdf_only_max_10mb')}
                    </p>
                  </div>
                </div>
              </label>

              {cvFileName && (
                <div className="instructors-file-selected-box">
                  <CheckCircle className="text-green-600" size={18} />
                  <p className="instructors-file-selected-text">
                    <span className="instructors-file-selected-bold">{t('instructors_screen.selected')}:</span> {cvFileName}
                  </p>
                </div>
              )}

              {errors.cv && (
                <div className="instructors-error-box">
                  <p className="instructors-error-text">{errors.cv}</p>
                </div>
              )}
            </div>
          </div>

          {/* Passport Upload */}
          <div>
            <label className="instructors-cv-label">
              {t('instructors_screen.passport_copy')} <span className="text-red-500">*</span>
            </label>

            {/* Current Passport Display */}
            {existingPassportUrl && !passportFile && (
              <div className="instructors-cv-display-box">
                <div className="instructors-cv-display-flex">
                  <div className="instructors-cv-display-inner">
                    <div className="instructors-cv-icon-wrapper">
                      <FileText className="text-white" size={20} />
                    </div>
                    <div>
                      <p className="instructors-cv-text-title">{t('instructors_screen.passport')}</p>
                      <p className="instructors-cv-text-hint">{t('instructors_screen.click_to_view_current_passport')}</p>
                    </div>
                  </div>
                  <a
                    href={existingPassportUrl.startsWith('http') ? existingPassportUrl : `${API_BASE_URL}${existingPassportUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="instructors-cv-link"
                  >
                    <FileText size={14} className="instructors-cv-link-icon" />
                    {t('instructors_screen.view')}
                  </a>
                </div>
              </div>
            )}

            {/* Upload Area */}
            {resizingPassport ? (
              <div className="instructors-upload-area">
                <div className="instructors-upload-div">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                  <p className="instructors-upload-text-title">{t('instructors_screen.resizing_image')}</p>
                </div>
              </div>
            ) : (
              <div className="instructors-upload-area">
                <label className="instructors-upload-label">
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,application/pdf"
                    onChange={handlePassportFileChange}
                    className="instructors-upload-input"
                    id="passport-upload-input"
                  />
                  <div className="instructors-upload-div">
                    <div className="instructors-upload-inner">
                      <div className="instructors-upload-icon-wrapper">
                        <FileText className="text-primary-600" size={24} />
                      </div>
                      {passportFileName ? (
                        <>
                          <p className="instructors-upload-text-title">
                            {passportFileName}
                          </p>
                          <p className="instructors-upload-text-hint">{t('instructors_screen.click_to_change_file')}</p>
                        </>
                      ) : (
                        <>
                          <p className="instructors-upload-text-title">
                            {existingPassportUrl ? t('instructors_screen.update_passport') : t('instructors_screen.upload_passport')}
                          </p>
                          <p className="instructors-upload-text-hint">
                            {t('instructors_screen.click_to_select_document')}
                          </p>
                        </>
                      )}
                      <p className="instructors-upload-text-small">
                        {t('instructors_screen.jpeg_png_pdf_only_max_10mb')}
                      </p>
                    </div>
                  </div>
                </label>

                {passportFileName && (
                  <div className="instructors-file-selected-box">
                    <CheckCircle className="text-green-600" size={18} />
                    <p className="instructors-file-selected-text">
                      <span className="instructors-file-selected-bold">{t('instructors_screen.selected')}:</span> {passportFileName}
                    </p>
                  </div>
                )}

                {errors.passport && (
                  <div className="instructors-error-box">
                    <p className="instructors-error-text">{Array.isArray(errors.passport) ? errors.passport[0] : errors.passport}</p>
                  </div>
                )}
              </div>
            )}
          </div>



          {errors.general && (
            <div className="instructors-error-box">
              <p className="instructors-error-text-bold">{errors.general}</p>
            </div>
          )}

          {/* Display field-specific errors */}
          {Object.keys(errors).filter(key => key !== 'general' && key !== 'specializations').map((key) => (
            errors[key] && (
              <p key={key} className="instructors-error-text">
                {key}: {errors[key]}
              </p>
            )
          ))}

          <div className="instructors-form-actions">
            <button
              type="button"
              onClick={handleCloseModal}
              className="instructors-button-cancel"
            >
              {t('instructors_screen.cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="instructors-button-submit"
            >
              {saving ? t('instructors_screen.saving') : selectedInstructor ? t('instructors_screen.update_instructor') : t('instructors_screen.add_instructor')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Instructor Detail Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedInstructor(null);
        }}
        title={t('instructors_screen.instructor_details')}
        size="lg"
      >
        {selectedInstructor && (
          <div className="instructors-detail-container">
            <DetailForm
              data={selectedInstructor}
              fields={[
                { key: 'first_name', label: t('instructors_screen.first_name'), icon: User },
                { key: 'last_name', label: t('instructors_screen.last_name'), icon: User },
                { key: 'email', label: t('instructors_screen.email'), type: 'email', icon: Mail },
                { key: 'date_of_birth', label: t('instructors_screen.date_of_birth'), type: 'date', icon: Calendar, showEmpty: false },
                { key: 'phone', label: t('instructors_screen.phone'), icon: Phone },
                { key: 'id_number', label: t('instructors_screen.id_number'), showEmpty: false },
                {
                  key: 'is_assessor',
                  label: t('instructors_screen.is_assessor'),
                  transform: (value) => value ? t('instructors_screen.assessor') : t('instructors_screen.instructor'),
                  render: (value) => (
                    <span className={`detail-form-badge ${value === (t('instructors_screen.assessor') || 'Assessor') ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                      {value}
                    </span>
                  )
                },
                { key: 'status', label: t('instructors_screen.status'), type: 'status' },
              ]}
            />
            {selectedInstructor.accs && Array.isArray(selectedInstructor.accs) && selectedInstructor.accs.length > 0 && (
              <div>
                <h3 className="instructors-specializations-title">{t('instructors_screen.accreditations')}</h3>
                <div className="instructors-accs-detail-list">
                  {selectedInstructor.accs.map((acc, index) => (
                    <div key={index} className="instructors-acc-detail-item">
                      <div className="instructors-acc-detail-header">
                        <Building2 size={16} className="instructors-acc-detail-icon" />
                        <span className="instructors-acc-detail-name">{acc.name || `ACC ${acc.id}`}</span>
                      </div>
                      <div className="instructors-acc-detail-info">
                        <div className="instructors-acc-detail-row">
                          <span className="instructors-acc-detail-label">{t('instructors_screen.email')}:</span>
                          <span className="instructors-acc-detail-value">{acc.email || t('instructors_screen.na')}</span>
                        </div>
                        <div className="instructors-acc-detail-row">
                          <span className="instructors-acc-detail-label">{t('instructors_screen.id')}:</span>
                          <span className="instructors-acc-detail-value">#{acc.id}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {selectedInstructor.specializations && selectedInstructor.specializations.length > 0 && (
              <div>
                <h3 className="instructors-specializations-title">{t('instructors_screen.specializations_languages')}</h3>
                <div className="instructors-specializations-list">
                  {Array.isArray(selectedInstructor.specializations) ? (
                    selectedInstructor.specializations.map((spec, index) => (
                      <span key={index} className="instructors-specialization-badge">
                        {spec}
                      </span>
                    ))
                  ) : (
                    <span className="instructors-specialization-badge">
                      {selectedInstructor.specializations}
                    </span>
                  )}
                </div>
              </div>
            )}
            {selectedInstructor.languages && selectedInstructor.languages.length > 0 && (
              <div>
                <h3 className="instructors-specializations-title">{t('instructors_screen.languages')}</h3>
                <div className="instructors-specializations-list">
                  {Array.isArray(selectedInstructor.languages) ? (
                    selectedInstructor.languages.map((lang, index) => (
                      <span key={index} className="instructors-specialization-badge">
                        {lang}
                      </span>
                    ))
                  ) : (
                    <span className="instructors-specialization-badge">
                      {selectedInstructor.languages}
                    </span>
                  )}
                </div>
              </div>
            )}
            {selectedInstructor.certificates_json && Array.isArray(selectedInstructor.certificates_json) && selectedInstructor.certificates_json.length > 0 && (
              <div>
                <h3 className="instructors-specializations-title">{t('certificates')}</h3>
                <div className="instructors-certificates-list">
                  {selectedInstructor.certificates_json.map((cert, index) => {
                    const certName = typeof cert === 'object' ? (cert.name || cert.title || cert.certificate_name || t('instructors_screen.instructor')) : cert;
                    const certDate = typeof cert === 'object' && cert.date ? cert.date : null;
                    const certUrl = typeof cert === 'object' && cert.url ? cert.url : (typeof cert === 'object' && cert.file_url ? cert.file_url : null);

                    return (
                      <div key={index} className="instructors-certificate-box">
                        <div className="instructors-certificate-box-flex">
                          <div className="instructors-certificate-box-inner">
                            <div className="instructors-certificate-icon-wrapper">
                              <FileText className="text-white" size={20} />
                            </div>
                            <div>
                              <p className="instructors-certificate-text-title">{certName}</p>
                              {certDate && (
                                <p className="instructors-certificate-text-date">
                                  {new Date(certDate).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                  })}
                                </p>
                              )}
                              {!certDate && (
                                <p className="instructors-certificate-text-hint">{t('instructors_screen.click_to_select_document')}</p>
                              )}
                            </div>
                          </div>
                          {certUrl && (
                            <a
                              href={certUrl.startsWith('http') ? certUrl : `${API_BASE_URL}${certUrl}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="instructors-certificate-link"
                            >
                              <FileText size={14} className="instructors-certificate-link-icon" />
                              {t('instructors_screen.view')}
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {selectedInstructor.training_center && (
              <div className="instructors-detail-item">
                <p className="instructors-detail-label">
                  <Building2 size={16} className="instructors-detail-label-icon" />
                  {t('title')}
                </p>
                <p className="instructors-detail-value">
                  {typeof selectedInstructor.training_center === 'object'
                    ? selectedInstructor.training_center.name || selectedInstructor.training_center.email || t('instructors_screen.na')
                    : selectedInstructor.training_center}
                </p>
              </div>
            )}
            {selectedInstructor.created_at && (
              <div className="instructors-detail-item">
                <p className="instructors-detail-label">{t('created_at')}</p>
                <p className="instructors-detail-value">
                  {new Date(selectedInstructor.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            )}
            {selectedInstructor.updated_at && (
              <div className="instructors-detail-item">
                <p className="instructors-detail-label">{t('updated_at')}</p>
                <p className="instructors-detail-value">
                  {new Date(selectedInstructor.updated_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            )}
            {selectedInstructor.cv_url && (
              <div className="instructors-cv-box">
                <div className="instructors-cv-box-flex">
                  <div className="instructors-cv-box-inner">
                    <div className="instructors-cv-box-icon-wrapper">
                      <FileText className="text-white" size={28} />
                    </div>
                    <div>
                      <p className="instructors-cv-box-text-title">{t('instructors_screen.cv')}</p>
                      <p className="instructors-cv-box-text-hint">{t('instructors_screen.click_to_view_current_cv')}</p>
                    </div>
                  </div>
                  <a
                    href={selectedInstructor.cv_url.startsWith('http')
                      ? selectedInstructor.cv_url
                      : `${API_BASE_URL}${selectedInstructor.cv_url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="instructors-cv-box-link"
                  >
                    <FileText size={18} className="instructors-cv-box-link-icon" />
                    {t('instructors_screen.view')}
                  </a>
                </div>
              </div>
            )}
            {(selectedInstructor.passport_image_url || selectedInstructor.passport_url) && (
              <div className="instructors-cv-box" style={{ marginTop: '1rem' }}>
                <div className="instructors-cv-box-flex">
                  <div className="instructors-cv-box-inner">
                    <div className="instructors-cv-box-icon-wrapper">
                      <FileText className="text-white" size={28} />
                    </div>
                    <div>
                      <p className="instructors-cv-box-text-title">{t('instructors_screen.passport')}</p>
                      <p className="instructors-cv-box-text-hint">{t('instructors_screen.click_to_view_current_passport')}</p>
                    </div>
                  </div>
                  <a
                    href={(selectedInstructor.passport_image_url || selectedInstructor.passport_url).startsWith('http')
                      ? (selectedInstructor.passport_image_url || selectedInstructor.passport_url)
                      : `${API_BASE_URL}${selectedInstructor.passport_image_url || selectedInstructor.passport_url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="instructors-cv-box-link"
                  >
                    <FileText size={18} className="instructors-cv-box-link-icon" />
                    {t('instructors_screen.view')}
                  </a>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setSelectedInstructor(null);
        }}
        onConfirm={confirmDelete}
        title={t('instructors_screen.delete_instructor')}
        message={t('instructors_screen.delete_confirmation_message', { name: `${selectedInstructor?.first_name} ${selectedInstructor?.last_name}` })}
        confirmText={t('instructors_screen.delete')}
        variant="danger"
      />

      {/* Request Authorization Modal */}
      <Modal
        isOpen={requestAuthModalOpen}
        onClose={() => {
          setRequestAuthModalOpen(false);
          setRequestForm({
            acc_id: '',
            course_ids: [],
          });
          setExpandedCategories(new Set());
          setExpandedSubCategories(new Set());
          setRequestErrors({});
          setCategories([]);
          setCourses([]);
          setSubCategoriesMap({});
          setCourseSearchTerm('');
        }}
        title={t('instructors_screen.request_authorization_for', { name: selectedInstructor ? `${selectedInstructor.first_name} ${selectedInstructor.last_name}` : t('instructors_screen.instructor') })}
        size="lg"
      >
        <form onSubmit={handleRequestSubmit} className="instructors-request-form">
          {requestErrors.general && (
            <div className="instructors-error-box">
              <p className="instructors-error-text">{requestErrors.general}</p>
            </div>
          )}

          <FormInput
            label={t('instructors_screen.accreditation_body')}
            name="acc_id"
            type="select"
            value={requestForm.acc_id}
            onChange={(e) => handleAccChange(e.target.value)}
            required
            options={accs.length > 0
              ? accs.map(acc => ({
                value: acc.id,
                label: acc.name || `Accreditation Body ${acc.id}`,
              }))
              : [{ value: '', label: t('instructors_screen.no_approved_acc_available') }]
            }
            error={requestErrors.acc_id}
            disabled={accs.length === 0}
          />
          {accs.length === 0 && (
            <p className="instructors-request-warning">
              {t('instructors_screen.no_approved_acc_found')}
            </p>
          )}

          {/* Courses Tree */}
          <div>
            <label className="instructors-request-label">
              {t('instructors_screen.select_courses_for_authorization')} <span className="instructors-request-label-required">*</span>
            </label>

            {!requestForm.acc_id ? (
              <p className="instructors-request-warning">{t('instructors_screen.please_select_acc')}</p>
            ) : (
              <>
                {/* Search bar */}
                {courses.length > 0 && (
                  <div style={{ marginTop: '0.5rem', marginBottom: '1rem' }}>
                    <FormInput
                      label=""
                      name="course_search"
                      type="text"
                      value={courseSearchTerm}
                      onChange={(e) => setCourseSearchTerm(e.target.value)}
                      placeholder={t('instructors_screen.search_courses')}
                    />
                  </div>
                )}

                {loadingTree ? (
                  <p className="instructors-request-warning">{t('instructors_screen.load_categories_courses')}</p>
                ) : categories.length === 0 ? (
                  <p className="instructors-request-warning">{t('instructors_screen.no_categories_found')}</p>
                ) : (
                  <div className="instructors-categories-container">
                    {categories.map(category => {
                      // Filter items for this category
                      const categorySubCats = subCategoriesMap[category.id] || [];
                      const categoryAllCourses = getCoursesForCategory(category.id);

                      const authorizedCourseIds = getAuthorizedCourseIds();

                      // Calculate selection state for Category
                      const selectableCategoryCourses = categoryAllCourses.filter(c => !authorizedCourseIds.has(c.id));
                      const selectableCategoryIds = selectableCategoryCourses.map(c => c.id);

                      // Skip if no courses at all in this category unless we want to show empty structure
                      if (categoryAllCourses.length === 0) return null;

                      const isCatAllSelected = selectableCategoryIds.length > 0 && selectableCategoryIds.every(id => requestForm.course_ids.includes(id));
                      const isCatSomeSelected = selectableCategoryIds.some(id => requestForm.course_ids.includes(id));
                      const isCatExpanded = expandedCategories.has(category.id);
                      const isCatAllAuthorized = categoryAllCourses.length > 0 && categoryAllCourses.every(c => authorizedCourseIds.has(c.id));

                      return (
                        <div key={category.id} className="instructors-category-group">
                          {/* Category Header */}
                          <div
                            className="instructors-category-header"
                            onClick={(e) => {
                              if (e.target.type === 'checkbox' || e.target.closest('.instructors-course-checkbox')) return;
                              toggleCategoryExpansion(category.id);
                            }}
                          >
                            <div className="instructors-category-header-left">
                              <input
                                type="checkbox"
                                checked={isCatAllSelected}
                                disabled={isCatAllAuthorized}
                                ref={input => input && (input.indeterminate = isCatSomeSelected && !isCatAllSelected)}
                                onChange={() => handleCategoryToggle(category.id)}
                                className="instructors-course-checkbox"
                                onClick={e => e.stopPropagation()}
                              />
                              <span className={`instructors-category-name ${isCatAllAuthorized ? 'instructors-category-name-disabled' : ''}`}>
                                {category.name || `Category ${category.id}`}
                              </span>
                              <span className="instructors-category-count">
                                ({categoryAllCourses.length} courses)
                              </span>
                            </div>
                            <button className="instructors-category-expand-btn">
                              {isCatExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                            </button>
                          </div>

                          {/* Sub-Categories */}
                          {isCatExpanded && (
                            <div className="instructors-category-courses" style={{ paddingLeft: '20px' }}>
                              {categorySubCats.map(subCat => {
                                const subCatCourses = getCoursesForSubCategory(subCat.id);

                                // Filter by search term if provided
                                const filteredSubCatCourses = subCatCourses.filter(course => {
                                  if (!courseSearchTerm) return true;
                                  const term = courseSearchTerm.toLowerCase();
                                  return (course.name || '').toLowerCase().includes(term) || (course.code || '').toLowerCase().includes(term);
                                });

                                if (filteredSubCatCourses.length === 0) return null;

                                const selectableSubCatCourses = filteredSubCatCourses.filter(c => !authorizedCourseIds.has(c.id));
                                const selectableSubCatIds = selectableSubCatCourses.map(c => c.id);

                                const isSubAllSelected = selectableSubCatIds.length > 0 && selectableSubCatIds.every(id => requestForm.course_ids.includes(id));
                                const isSubSomeSelected = selectableSubCatIds.some(id => requestForm.course_ids.includes(id));
                                const isSubExpanded = expandedSubCategories.has(subCat.id);
                                const isSubAllAuth = filteredSubCatCourses.length > 0 && filteredSubCatCourses.every(c => authorizedCourseIds.has(c.id));

                                return (
                                  <div key={subCat.id} className="instructors-subcategory-group" style={{ marginBottom: '8px' }}>
                                    {/* Sub-Category Header */}
                                    <div
                                      className="instructors-category-header"
                                      style={{ backgroundColor: '#f9fafb', borderRadius: '6px', padding: '6px 10px' }}
                                      onClick={(e) => {
                                        if (e.target.type === 'checkbox' || e.target.closest('.instructors-course-checkbox')) return;
                                        toggleSubCategoryExpansion(subCat.id);
                                      }}
                                    >
                                      <div className="instructors-category-header-left">
                                        <input
                                          type="checkbox"
                                          checked={isSubAllSelected}
                                          disabled={isSubAllAuth}
                                          ref={input => input && (input.indeterminate = isSubSomeSelected && !isSubAllSelected)}
                                          onChange={() => handleSubCategoryToggle(subCat.id)}
                                          className="instructors-course-checkbox"
                                          onClick={e => e.stopPropagation()}
                                        />
                                        <span className={`instructors-category-name ${isSubAllAuth ? 'instructors-category-name-disabled' : ''}`} style={{ fontSize: '0.9rem' }}>
                                          {subCat.name || `Sub-Cat ${subCat.id}`}
                                        </span>
                                        <span className="instructors-category-count" style={{ fontSize: '0.8rem' }}>
                                          ({filteredSubCatCourses.length})
                                        </span>
                                      </div>
                                      <button className="instructors-category-expand-btn">
                                        {isSubExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                      </button>
                                    </div>

                                    {/* Courses */}
                                    {isSubExpanded && (
                                      <div style={{ marginLeft: '25px', marginTop: '5px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                        {filteredSubCatCourses.map(course => {
                                          const isAuthorized = authorizedCourseIds.has(course.id);
                                          const isSelected = requestForm.course_ids.includes(course.id);

                                          return (
                                            <div
                                              key={course.id}
                                              className={`instructors-course-item instructors-course-item-nested ${isAuthorized ? 'instructors-course-item-disabled' : ''}`}
                                              style={{ padding: '6px 10px' }}
                                            >
                                              <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => handleCourseToggle(course.id)}
                                                disabled={isAuthorized}
                                                className="instructors-course-checkbox"
                                                onClick={e => e.stopPropagation()}
                                              />
                                              <div className="instructors-course-info">
                                                <span className={`instructors-course-name ${isAuthorized ? 'instructors-course-name-disabled' : ''}`}>
                                                  {course.name || course.code}
                                                </span>
                                                {course.code && course.name !== course.code && (
                                                  <span className="instructors-course-subcategory">({course.code})</span>
                                                )}
                                                {isAuthorized && (
                                                  <span className="instructors-course-authorized-badge">{t('instructors_screen.selected')}</span>
                                                )}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
            {requestErrors.course_ids && <p className="instructors-error-text">{requestErrors.course_ids}</p>}
          </div>

          <div className="instructors-request-actions">
            <button
              type="button"
              onClick={() => {
                setRequestAuthModalOpen(false);
                setRequestForm({
                  acc_id: '',
                  category_id: '',
                  sub_category_id: '',
                  course_ids: [],
                });
                setExpandedCategories(new Set());
                setExpandedSubCategories(new Set());
                setRequestErrors({});
                setCategories([]);
                setCourses([]);
                setSubCategoriesMap({});
                setCourseSearchTerm('');
              }}
              className="instructors-button-cancel"
            >
              {t('instructors_screen.cancel')}
            </button>
            <button
              type="submit"
              disabled={requesting}
              className="instructors-button-submit"
            >
              {requesting ? t('instructors_screen.submitting') : t('instructors_screen.submit_request')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default TrainingCenterInstructorsScreen;

