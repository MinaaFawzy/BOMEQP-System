import { useEffect, useState, useMemo } from 'react';
import { trainingCenterAPI } from '../../../services/api';
import { useHeader } from '../../../context/HeaderContext';
import { getAuthToken } from '../../../config/api';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://aeroenix.com/v1/api';
import { Users, Plus, Edit, Trash2, Eye, Mail, Phone, Search, Filter, CheckCircle, Clock, XCircle, ChevronUp, ChevronDown, X, Globe, Send, Building2, BookOpen, FileText } from 'lucide-react';
import Modal from '../../../components/Modal/Modal';
import ConfirmDialog from '../../../components/ConfirmDialog/ConfirmDialog';
import LoadingSpinner from '../../../components/LoadingSpinner/LoadingSpinner';
import TabCard from '../../../components/TabCard/TabCard';
import TabCardsGrid from '../../../components/TabCardsGrid/TabCardsGrid';
import DataTable from '../../../components/DataTable/DataTable';
import './InstructorsScreen.css';
import FormInput from '../../../components/FormInput/FormInput';
import LanguageSelector from '../../../components/LanguageSelector/LanguageSelector';

const TrainingCenterInstructorsScreen = () => {
  const { setHeaderActions, setHeaderTitle, setHeaderSubtitle } = useHeader();
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [requestAuthModalOpen, setRequestAuthModalOpen] = useState(false);
  const [selectedInstructor, setSelectedInstructor] = useState(null);
  const [accs, setAccs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [courses, setCourses] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [courseSearchTerm, setCourseSearchTerm] = useState('');
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingSubCategories, setLoadingSubCategories] = useState(false);
  const [requestForm, setRequestForm] = useState({
    acc_id: '',
    category_id: '',
    sub_category_id: '',
    course_ids: [],
  });
  const [requestErrors, setRequestErrors] = useState({});
  const [requesting, setRequesting] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    id_number: '',
    cv: null,
    specializations: [],
    is_assessor: false,
  });
  const [cvFile, setCvFile] = useState(null);
  const [cvFileName, setCvFileName] = useState('');
  const [existingCvUrl, setExistingCvUrl] = useState('');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadInstructors();
  }, []); // Load all data once, search and statusFilter are handled client-side

  useEffect(() => {
    setHeaderTitle('Instructors');
    setHeaderSubtitle('Manage your instructors');
    setHeaderActions(
      <button
        onClick={() => handleOpenModal()}
        className="instructors-header-button"
      >
        <Plus size={20} className="instructors-header-button-icon" />
        Add Instructor
      </button>
    );
    return () => {
      setHeaderActions(null);
      setHeaderTitle(null);
      setHeaderSubtitle(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setHeaderActions, setHeaderTitle, setHeaderSubtitle]);

  useEffect(() => {
    if (requestAuthModalOpen && selectedInstructor) {
      loadRequestFormData();
    }
  }, [requestAuthModalOpen, selectedInstructor]);

  // Update indeterminate state for category checkboxes
  useEffect(() => {
    if (requestForm.acc_id && subCategories.length > 0) {
      subCategories.forEach(category => {
        const categoryCourses = courses.filter(course => 
          course.sub_category_id === category.id || 
          course.sub_category?.id === category.id ||
          (typeof course.sub_category === 'object' && course.sub_category?.id === category.id)
        );
        const categoryCourseIds = categoryCourses.map(c => c.id);
        const selectedCount = categoryCourseIds.filter(id => requestForm.course_ids?.includes(id)).length;
        
        const checkbox = document.querySelector(`input[data-category-id="${category.id}"]`);
        if (checkbox) {
          checkbox.indeterminate = selectedCount > 0 && selectedCount < categoryCourseIds.length;
        }
      });
    }
  }, [requestForm.course_ids, courses, subCategories, requestForm.acc_id]);

  const loadInstructors = async () => {
    setLoading(true);
    try {
      // Load all data - search and statusFilter are handled client-side
      const data = await trainingCenterAPI.listInstructors({ per_page: 1000 });
      
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
        id_number: instructor.id_number || '',
        cv: null,
        specializations: Array.isArray(instructor.specializations) 
          ? instructor.specializations 
          : (instructor.specializations ? instructor.specializations.split(',').map(s => s.trim()).filter(s => s) : []),
        is_assessor: instructor.is_assessor || false,
      });
      setCvFile(null);
      setCvFileName('');
      setExistingCvUrl(instructor.cv_url || '');
    } else {
      setSelectedInstructor(null);
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        id_number: '',
        cv: null,
        specializations: [],
        is_assessor: false,
      });
      setCvFile(null);
      setCvFileName('');
      setExistingCvUrl('');
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
      id_number: '',
      cv: null,
      specializations: [],
      is_assessor: false,
    });
    setCvFile(null);
    setCvFileName('');
    setExistingCvUrl('');
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
        setErrors({ cv: 'Only PDF files are allowed' });
        e.target.value = ''; // Clear the input
        return;
      }
      
      // Validate file size (10MB = 10 * 1024 * 1024 bytes)
      if (file.size > 10 * 1024 * 1024) {
        setErrors({ cv: 'File size must be less than 10MB' });
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});

    try {
      // Check if we need FormData (if there's a file to upload)
      // cvFile is a File object when a new file is selected
      const hasFile = cvFile instanceof File;
      
      let submitData;
      
      if (hasFile) {
        // Use FormData ONLY when there's a file to upload
        // Note: FormData is required for file uploads, JSON cannot handle files
        submitData = new FormData();
        submitData.append('first_name', formData.first_name.trim());
        submitData.append('last_name', formData.last_name.trim());
        submitData.append('email', formData.email.trim());
        
        if (formData.phone?.trim()) {
          submitData.append('phone', formData.phone.trim());
        }
        if (formData.id_number?.trim()) {
          submitData.append('id_number', formData.id_number.trim());
        }
        
        // Append CV file (must be a File object)
        submitData.append('cv', cvFile);
        
        // Append specializations as array
        if (formData.specializations && formData.specializations.length > 0) {
          formData.specializations.forEach(spec => {
            submitData.append('specializations[]', spec);
          });
        }
        
        // Append is_assessor - convert boolean to '1' or '0' for FormData
        // Backend expects boolean, but FormData sends strings, so we send '1'/'0' which backend can convert to boolean
        submitData.append('is_assessor', formData.is_assessor === true || formData.is_assessor === 'true' || formData.is_assessor === 1 || formData.is_assessor === '1' ? '1' : '0');
        
        console.log('📦 Using FormData (file upload required)');
      } else {
        // Use JSON object (no file upload needed) - cleaner and faster
        submitData = {
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim(),
          email: formData.email.trim(),
          phone: formData.phone?.trim() || null,
          id_number: formData.id_number?.trim() || null,
          specializations: formData.specializations || [],
          is_assessor: formData.is_assessor, // Boolean value (not string)
        };
        
        console.log('📄 Using JSON (no file upload):', JSON.stringify(submitData, null, 2));
      }

      console.log('Submitting instructor data:', hasFile ? 'FormData' : 'JSON');
      console.log('is_assessor value:', formData.is_assessor, 'Type:', typeof formData.is_assessor);

      if (selectedInstructor) {
        console.log('🔄 Updating instructor with ID:', selectedInstructor.id);
        console.log('📦 Submit data type:', hasFile ? 'FormData' : 'JSON');
        if (hasFile) {
          console.log('📄 CV File:', cvFile.name, cvFile.size, 'bytes');
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
      await loadInstructors();
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
        setErrors({ general: error.message || 'Failed to save instructor' });
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
      await loadInstructors();
    } catch (error) {
      alert('Failed to delete instructor: ' + (error.message || 'Unknown error'));
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
      category_id: '',
      sub_category_id: '',
      course_ids: [],
    });
    setCategories([]);
    setCourses([]);
    setSubCategories([]);
    setExpandedCategories(new Set());
    setCourseSearchTerm('');
    setRequestErrors({});
    setRequestAuthModalOpen(true);
  };

  const loadRequestFormData = async () => {
    try {
      const [accsData, authData] = await Promise.all([
        trainingCenterAPI.listACCs(),
        trainingCenterAPI.getAuthorizationStatus(),
      ]);

      // Get approved ACCs from authorizations
      const approvedAuthorizations = (authData?.authorizations || []).filter(
        auth => auth.status === 'approved'
      );
      const approvedAccIds = new Set(approvedAuthorizations.map(auth => auth.acc_id || auth.acc?.id));
      
      // Filter ACCs to only show approved ones
      const allAccs = accsData?.accs || [];
      const approvedAccs = allAccs.filter(acc => approvedAccIds.has(acc.id));
      setAccs(approvedAccs);
      setCourses([]);
      setSubCategories([]);
    } catch (error) {
      console.error('Failed to load request form data:', error);
      setAccs([]);
    }
  };

  const handleAccChange = async (accId) => {
    // Clear everything when ACC changes
    setRequestForm({ ...requestForm, acc_id: accId, category_id: '', sub_category_id: '', course_ids: [] });
    setCategories([]);
    setCourses([]);
    setSubCategories([]);
    setExpandedCategories(new Set());
    setCourseSearchTerm('');
    
    if (!accId) {
      return;
    }

    try {
      setLoadingCategories(true);
      console.log(`Loading categories for ACC ${accId}`);
      
      const data = await trainingCenterAPI.getCategoriesForACC(accId);
      const categoriesList = data.categories || data.data || data || [];
      
      setCategories(categoriesList);
      console.log(`Loaded ${categoriesList.length} categories for ACC ${accId}`);
    } catch (error) {
      console.error('Failed to load categories:', error);
      setCategories([]);
    } finally {
      setLoadingCategories(false);
    }
  };

  const handleCategoryChange = async (categoryId) => {
    // Get acc_id before clearing state
    const currentAccId = requestForm.acc_id;
    
    // Clear sub-categories and courses when category changes
    setRequestForm(prev => ({ ...prev, category_id: categoryId, sub_category_id: '', course_ids: [] }));
    setCourses([]);
    setSubCategories([]);
    setExpandedCategories(new Set());
    
    if (!categoryId) {
      return;
    }

    try {
      setLoadingSubCategories(true);
      console.log(`Loading sub-categories for category ${categoryId}`);
      
      const data = await trainingCenterAPI.getSubCategoriesForCategory(categoryId);
      const subCategoriesList = data.sub_categories || data.data || data || [];
      
      setSubCategories(subCategoriesList);
      console.log(`Loaded ${subCategoriesList.length} sub-categories for category ${categoryId}`);
      
      // Load courses for the selected ACC (courses will be filtered by sub-category)
      if (currentAccId) {
        try {
          const coursesData = await trainingCenterAPI.getCoursesForACC(currentAccId);
          const coursesList = coursesData?.courses || coursesData?.data || coursesData || [];
          setCourses(coursesList);
          console.log(`Loaded ${coursesList.length} courses for ACC ${currentAccId}`);
        } catch (error) {
          console.error('Failed to load courses:', error);
          setCourses([]);
        }
      }
    } catch (error) {
      console.error('Failed to load sub-categories:', error);
      setSubCategories([]);
    } finally {
      setLoadingSubCategories(false);
    }
  };

  const toggleCategoryExpansion = (categoryId) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const handleCategoryToggle = (categoryId) => {
    // Get all courses for this category
    const categoryCourses = courses.filter(course => 
      course.sub_category_id === categoryId || 
      course.sub_category?.id === categoryId ||
      (typeof course.sub_category === 'object' && course.sub_category?.id === categoryId)
    );
    const categoryCourseIds = categoryCourses.map(c => c.id);
    
    setRequestForm(prev => {
      const currentCourseIds = prev.course_ids || [];
      const allSelected = categoryCourseIds.length > 0 && categoryCourseIds.every(id => currentCourseIds.includes(id));
      
      if (allSelected) {
        // Deselect all courses in this category
        const newCourseIds = currentCourseIds.filter(id => !categoryCourseIds.includes(id));
        // Clear sub_category_id if it was this category
        const newSubCategoryId = prev.sub_category_id === categoryId.toString() || prev.sub_category_id === categoryId ? '' : prev.sub_category_id;
        return { 
          ...prev, 
          course_ids: newCourseIds,
          sub_category_id: newSubCategoryId
        };
      } else {
        // Select all courses in this category
        const newCourseIds = [...new Set([...currentCourseIds, ...categoryCourseIds])];
        // Set sub_category_id only if all courses in this category are selected
        return { 
          ...prev, 
          course_ids: newCourseIds,
          sub_category_id: categoryId.toString()
        };
      }
    });
  };

  const handleCourseToggle = (courseId, categoryId) => {
    setRequestForm(prev => {
      const courseIds = prev.course_ids || [];
      if (courseIds.includes(courseId)) {
        const newCourseIds = courseIds.filter(id => id !== courseId);
        // If categoryId is provided, check if any courses from this category are still selected
        let newSubCategoryId = prev.sub_category_id;
        if (categoryId) {
          const categoryCourses = courses.filter(c => 
            (c.sub_category_id === categoryId || 
             c.sub_category?.id === categoryId ||
             (typeof c.sub_category === 'object' && c.sub_category?.id === categoryId)) && 
            c.id !== courseId
          );
          const hasOtherCategoryCourses = categoryCourses.some(c => newCourseIds.includes(c.id));
          // Clear sub_category_id if no courses from this category are selected
          // or if sub_category_id matches this category
          if (!hasOtherCategoryCourses && (
            prev.sub_category_id === categoryId.toString() || 
            prev.sub_category_id === categoryId
          )) {
            newSubCategoryId = '';
          }
        }
        return { 
          ...prev, 
          course_ids: newCourseIds,
          sub_category_id: newSubCategoryId
        };
      } else {
        return { ...prev, course_ids: [...courseIds, courseId] };
      }
    });
  };

  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    if (!selectedInstructor) return;
    
    setRequesting(true);
    setRequestErrors({});

    try {
      // Validate
      if (!requestForm.acc_id) {
        setRequestErrors({ general: 'Please select an ACC' });
        setRequesting(false);
        return;
      }

      if (!requestForm.course_ids || requestForm.course_ids.length === 0) {
        setRequestErrors({ general: 'Please select at least one course or category' });
        setRequesting(false);
        return;
      }

      // Build submit data
      const submitData = {
        acc_id: parseInt(requestForm.acc_id),
      };

      // If a sub_category is selected and all its courses are selected, use sub_category_id
      // Otherwise, use course_ids
      if (requestForm.sub_category_id) {
        const categoryCourses = courses.filter(c => 
          c.sub_category_id === parseInt(requestForm.sub_category_id) || 
          c.sub_category?.id === parseInt(requestForm.sub_category_id)
        );
        const categoryCourseIds = categoryCourses.map(c => c.id);
        const allCategoryCoursesSelected = categoryCourseIds.every(id => 
          requestForm.course_ids.includes(id)
        ) && categoryCourseIds.length === requestForm.course_ids.length;
        
        if (allCategoryCoursesSelected && categoryCourseIds.length > 0) {
          submitData.sub_category_id = parseInt(requestForm.sub_category_id);
        } else {
          submitData.course_ids = requestForm.course_ids.map(id => parseInt(id));
        }
      } else {
        submitData.course_ids = requestForm.course_ids.map(id => parseInt(id));
      }

      const response = await trainingCenterAPI.requestInstructorAuthorization(selectedInstructor.id, submitData);
      
      setRequestAuthModalOpen(false);
      setRequestForm({
        acc_id: '',
        category_id: '',
        sub_category_id: '',
        course_ids: [],
      });
      setExpandedCategories(new Set());
      setCategories([]);
      setCourses([]);
      setSubCategories([]);
      setCourseSearchTerm('');
      setSelectedInstructor(null);
      
      const coursesCount = response?.courses_count || requestForm.course_ids.length;
      alert(`Authorization request submitted successfully! ${coursesCount} course(s) included.`);
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
        setRequestErrors({ general: 'Failed to submit request. Please try again.' });
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
      header: 'Instructor',
      accessor: 'name',
      sortable: true,
      render: (value, row) => (
        <div className="instructors-column-instructor">
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
              <div className="instructors-column-id">ID: {row.id_number}</div>
                    )}
                  </div>
                  </div>
      )
    },
    {
      header: 'Email',
      accessor: 'email',
      sortable: true,
      render: (value) => (
        <div className="instructors-column-email">
          <Mail className="instructors-column-email-icon" />
          {value}
                  </div>
      )
    },
    {
      header: 'Phone',
      accessor: 'phone',
      sortable: true,
      render: (value) => (
        value ? (
          <div className="instructors-column-phone">
            <Phone className="instructors-column-phone-icon" />
            {value}
                  </div>
        ) : (
          <span className="instructors-column-na">N/A</span>
        )
      )
    },
    {
      header: 'Status',
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
            {value ? value.charAt(0).toUpperCase() + value.slice(1) : 'N/A'}
                        </span>
        );
      }
    },
    {
      header: 'Type',
      accessor: 'is_assessor',
      sortable: true,
      render: (value) => (
        value ? (
          <span className="instructors-column-type-badge-blue">
                            Assessor
                          </span>
                        ) : (
          <span className="instructors-column-type-badge-gray">
                            Instructor
                          </span>
        )
      )
    },
    {
      header: 'Actions',
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
                            title="Edit"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
              handleRequestAuthorization(row);
                            }}
            className="instructors-action-button instructors-action-button-send"
                            title="Request Authorization"
                          >
                            <Send size={16} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
              handleDelete(row);
                            }}
            className="instructors-action-button instructors-action-button-delete"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
      )
    }
  ], []);

  // Calculate stats from all instructors
  const totalCount = instructors.length;
  const activeCount = instructors.filter(i => i.status === 'active').length;
  const pendingCount = instructors.filter(i => i.status === 'pending').length;
  const suspendedCount = instructors.filter(i => i.status === 'suspended').length;

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="instructors-container">

      {/* Stats Cards */}
      <TabCardsGrid columns={{ mobile: 1, tablet: 2, desktop: 4 }}>
        <TabCard
          name="Total Instructors"
          value={totalCount}
          icon={Users}
          colorType="indigo"
          isActive={statusFilter === 'all'}
          onClick={() => setStatusFilter('all')}
        />
        <TabCard
          name="Active"
          value={activeCount}
          icon={CheckCircle}
          colorType="green"
          isActive={statusFilter === 'active'}
          onClick={() => setStatusFilter('active')}
        />
        <TabCard
          name="Pending"
          value={pendingCount}
          icon={Clock}
          colorType="yellow"
          isActive={statusFilter === 'pending'}
          onClick={() => setStatusFilter('pending')}
        />
        <TabCard
          name="Suspended"
          value={suspendedCount}
          icon={XCircle}
          colorType="red"
          isActive={statusFilter === 'suspended'}
          onClick={() => setStatusFilter('suspended')}
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
          filterable={true}
          searchPlaceholder="Search by name or email..."
          emptyMessage="No instructors found"
          filterOptions={[
            { value: 'all', label: 'All Status', filterFn: null },
            { value: 'active', label: 'Active', filterFn: (row) => row.status === 'active' },
            { value: 'pending', label: 'Pending', filterFn: (row) => row.status === 'pending' },
            { value: 'suspended', label: 'Suspended', filterFn: (row) => row.status === 'suspended' },
            { value: 'inactive', label: 'Inactive', filterFn: (row) => row.status === 'inactive' },
          ]}
          defaultFilter={statusFilter}
          onRowClick={(instructor) => handleViewDetails(instructor)}
        />
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={selectedInstructor ? 'Edit Instructor' : 'Add New Instructor'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="instructors-form">
          <div className="instructors-form-grid">
            <FormInput
              label="First Name"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              required
              error={errors.first_name}
            />

            <FormInput
              label="Last Name"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              required
              error={errors.last_name}
            />
          </div>

          <div className="instructors-form-grid">
            <FormInput
              label="Email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              error={errors.email}
            />

            <FormInput
              label="Phone"
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              error={errors.phone}
            />
          </div>

          <FormInput
            label="ID Number"
            name="id_number"
            value={formData.id_number}
            onChange={handleChange}
            error={errors.id_number}
          />

          <div>
            <label className="instructors-cv-label">
              CV / Resume (PDF)
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
                      <p className="instructors-cv-text-title">Current CV</p>
                      <p className="instructors-cv-text-hint">Click to view your current CV</p>
                    </div>
                  </div>
                  <a
                    href={existingCvUrl.startsWith('http') ? existingCvUrl : `${API_BASE_URL}${existingCvUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="instructors-cv-link"
                  >
                    <FileText size={14} className="instructors-cv-link-icon" />
                    View CV
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
                        <p className="instructors-upload-text-hint">Click to change file</p>
                      </>
                    ) : (
                      <>
                        <p className="instructors-upload-text-title">
                          {existingCvUrl ? 'Update CV' : 'Upload CV'}
                        </p>
                        <p className="instructors-upload-text-hint">
                          Click to select PDF document
                        </p>
                      </>
                    )}
                    <p className="instructors-upload-text-small">
                      PDF only, maximum 10MB
                    </p>
                  </div>
                </div>
              </label>
              
              {cvFileName && (
                <div className="instructors-file-selected-box">
                  <CheckCircle className="text-green-600" size={18} />
                  <p className="instructors-file-selected-text">
                    <span className="instructors-file-selected-bold">Selected:</span> {cvFileName}
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

          <LanguageSelector
            label="Languages"
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
              Is Assessor
            </label>
          </div>
          <p className="instructors-helper-text">Mark this instructor as an assessor</p>

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
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="instructors-button-submit"
            >
              {saving ? 'Saving...' : selectedInstructor ? 'Update Instructor' : 'Add Instructor'}
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
        title="Instructor Details"
        size="lg"
      >
        {selectedInstructor && (
          <div className="instructors-detail-container">
            <div className="instructors-detail-grid">
              <div className="instructors-detail-item">
                <p className="instructors-detail-label">First Name</p>
                <p className="instructors-detail-value">{selectedInstructor.first_name || 'N/A'}</p>
              </div>
              <div className="instructors-detail-item">
                <p className="instructors-detail-label">Last Name</p>
                <p className="instructors-detail-value">{selectedInstructor.last_name || 'N/A'}</p>
              </div>
              <div className="instructors-detail-item">
                <p className="instructors-detail-label">
                  <Mail size={16} className="instructors-detail-label-icon" />
                  Email
                </p>
                <p className="instructors-detail-value">{selectedInstructor.email || 'N/A'}</p>
              </div>
              <div className="instructors-detail-item">
                <p className="instructors-detail-label">
                  <Phone size={16} className="instructors-detail-label-icon" />
                  Phone
                </p>
                <p className="instructors-detail-value">{selectedInstructor.phone || 'N/A'}</p>
              </div>
              {selectedInstructor.id_number && (
                <div className="instructors-detail-item">
                  <p className="instructors-detail-label">ID Number</p>
                  <p className="instructors-detail-value">{selectedInstructor.id_number}</p>
                </div>
              )}
              <div className="instructors-detail-item">
                <p className="instructors-detail-label">Type</p>
                {selectedInstructor.is_assessor ? (
                  <span className="instructors-detail-badge-blue">
                    Assessor
                  </span>
                ) : (
                  <span className="instructors-detail-badge-gray">
                    Instructor
                  </span>
                )}
              </div>
              <div className="instructors-detail-item">
                <p className="instructors-detail-label">Status</p>
                <span className={`instructors-detail-status ${
                  selectedInstructor.status === 'active' ? 'instructors-detail-status-active' :
                  selectedInstructor.status === 'pending' ? 'instructors-detail-status-pending' :
                  selectedInstructor.status === 'suspended' ? 'instructors-detail-status-suspended' :
                  'instructors-detail-status-inactive'
                }`}>
                  {selectedInstructor.status}
                </span>
              </div>
            </div>
            {selectedInstructor.specializations && selectedInstructor.specializations.length > 0 && (
              <div>
                <h3 className="instructors-specializations-title">Specializations / Languages</h3>
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
                <h3 className="instructors-specializations-title">Languages</h3>
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
                <h3 className="instructors-specializations-title">Certificates</h3>
                <div className="instructors-certificates-list">
                  {selectedInstructor.certificates_json.map((cert, index) => {
                    const certName = typeof cert === 'object' ? (cert.name || cert.title || cert.certificate_name || 'Certificate') : cert;
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
                                <p className="instructors-certificate-text-hint">Certificate document</p>
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
                              View PDF
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
                  Training Center
                </p>
                <p className="instructors-detail-value">
                  {typeof selectedInstructor.training_center === 'object' 
                    ? selectedInstructor.training_center.name || selectedInstructor.training_center.email || 'N/A'
                    : selectedInstructor.training_center}
                </p>
              </div>
            )}
            {selectedInstructor.created_at && (
              <div className="instructors-detail-item">
                <p className="instructors-detail-label">Created At</p>
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
                <p className="instructors-detail-label">Last Updated</p>
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
                      <p className="instructors-cv-box-text-title">Curriculum Vitae</p>
                      <p className="instructors-cv-box-text-hint">Click the button to view the instructor's CV</p>
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
                    View CV
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
        title="Delete Instructor"
        message={`Are you sure you want to delete "${selectedInstructor?.first_name} ${selectedInstructor?.last_name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />

      {/* Request Authorization Modal */}
      <Modal
        isOpen={requestAuthModalOpen}
        onClose={() => {
          setRequestAuthModalOpen(false);
          setRequestForm({
            acc_id: '',
            category_id: '',
            sub_category_id: '',
            course_ids: [],
          });
          setExpandedCategories(new Set());
          setRequestErrors({});
          setCategories([]);
          setCourses([]);
          setSubCategories([]);
          setCourseSearchTerm('');
        }}
        title={`Request Authorization for ${selectedInstructor ? `${selectedInstructor.first_name} ${selectedInstructor.last_name}` : 'Instructor'}`}
        size="lg"
      >
        <form onSubmit={handleRequestSubmit} className="instructors-request-form">
          {requestErrors.general && (
            <div className="instructors-error-box">
              <p className="instructors-error-text">{requestErrors.general}</p>
            </div>
          )}

          <FormInput
            label="ACC"
            name="acc_id"
            type="select"
            value={requestForm.acc_id}
            onChange={(e) => handleAccChange(e.target.value)}
            required
            options={accs.length > 0 
              ? accs.map(acc => ({
                  value: acc.id,
                  label: acc.name || `ACC ${acc.id}`,
                }))
              : [{ value: '', label: 'No approved ACCs available' }]
            }
            error={requestErrors.acc_id}
            disabled={accs.length === 0}
          />
          {accs.length === 0 && (
            <p className="instructors-request-warning">
              No approved ACCs found. Please request and get approval from an ACC first.
            </p>
          )}

          {/* Category Selection */}
          <FormInput
            label="Category"
            name="category_id"
            type="select"
            value={requestForm.category_id}
            onChange={(e) => handleCategoryChange(e.target.value)}
            required
            disabled={!requestForm.acc_id || loadingCategories}
            error={requestErrors.category_id}
            options={[
              { value: '', label: !requestForm.acc_id ? 'Please select ACC first' : (loadingCategories ? 'Loading categories...' : 'Select a category...') },
              ...categories
                .filter(cat => cat.id != null && cat.id !== '')
                .map(cat => ({
                  value: cat.id,
                  label: cat.name || cat.name_ar || `Category ${cat.id}`
                }))
            ]}
          />

          {/* Sub-Categories and Courses */}
          <div>
            <label className="instructors-request-label">
              Select Sub-Categories & Courses <span className="instructors-request-label-required">*</span>
            </label>
            
            {!requestForm.acc_id ? (
              <p className="instructors-request-warning">Please select ACC first</p>
            ) : !requestForm.category_id ? (
              <p className="instructors-request-warning">Please select Category first</p>
            ) : (
              <>
                {/* Search bar for courses */}
                {courses.length > 0 && (
                  <div style={{ marginTop: '0.5rem', marginBottom: '1rem' }}>
                    <FormInput
                      label=""
                      name="course_search"
                      type="text"
                      value={courseSearchTerm}
                      onChange={(e) => setCourseSearchTerm(e.target.value)}
                      placeholder="Search courses..."
                    />
                  </div>
                )}
                {subCategories.length === 0 && courses.length === 0 && !loadingSubCategories ? (
                  <p className="instructors-request-warning">No sub-categories or courses available for the selected category</p>
                ) : loadingSubCategories ? (
                  <p className="instructors-request-warning">Loading sub-categories...</p>
                ) : (
                  <>
                    <div className="instructors-categories-container">
                      {subCategories.map(category => {
                        const categoryCourses = courses.filter(course => {
                          const matchesCategory = course.sub_category_id === category.id || 
                            course.sub_category?.id === category.id ||
                            (typeof course.sub_category === 'object' && course.sub_category?.id === category.id);
                          
                          // Filter by search term if provided
                          if (courseSearchTerm && matchesCategory) {
                            const courseName = (course.name || course.code || '').toLowerCase();
                            const courseCode = (course.code || '').toLowerCase();
                            const searchLower = courseSearchTerm.toLowerCase();
                            return courseName.includes(searchLower) || courseCode.includes(searchLower);
                          }
                          
                          return matchesCategory;
                        });
                        // Filter out already authorized courses
                        const authorizedCourseIds = new Set(
                          selectedInstructor?.courses
                            ?.filter(instCourse => 
                              instCourse.pivot?.acc_id === parseInt(requestForm.acc_id) &&
                              instCourse.pivot?.status === 'active'
                            )
                            .map(instCourse => instCourse.id) || []
                        );
                        
                        const selectableCategoryCourses = categoryCourses.filter(c => !authorizedCourseIds.has(c.id));
                        const categoryCourseIds = selectableCategoryCourses.map(c => c.id);
                        const allSelected = categoryCourseIds.length > 0 && 
                          categoryCourseIds.every(id => requestForm.course_ids?.includes(id));
                        const someSelected = categoryCourseIds.some(id => requestForm.course_ids?.includes(id));
                        const isExpanded = expandedCategories.has(category.id);
                        const allAuthorized = categoryCourses.length > 0 && categoryCourses.every(c => authorizedCourseIds.has(c.id));
                        
                        return (
                          <div key={category.id} className="instructors-category-group">
                            <div 
                              className="instructors-category-header"
                              onClick={(e) => {
                                // Don't toggle if clicking on checkbox or expand button
                                if (e.target.type === 'checkbox' || e.target.closest('.instructors-category-expand-btn') || e.target.closest('.instructors-course-checkbox')) {
                                  return;
                                }
                                if (categoryCourses.length > 0) {
                                  toggleCategoryExpansion(category.id);
                                }
                              }}
                            >
                              <div className="instructors-category-header-left">
                                <input
                                  type="checkbox"
                                  data-category-id={category.id}
                                  checked={allSelected}
                                  disabled={allAuthorized}
                                  ref={(input) => {
                                    if (input) input.indeterminate = someSelected && !allSelected;
                                  }}
                                  onChange={() => handleCategoryToggle(category.id)}
                                  className="instructors-course-checkbox"
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <span className={`instructors-category-name ${allAuthorized ? 'instructors-category-name-disabled' : ''}`}>
                                  {category.name || `Category ${category.id}`}
                                </span>
                                <span className={`instructors-category-count ${allAuthorized ? 'instructors-category-count-disabled' : ''}`}>
                                  ({categoryCourses.length} {categoryCourses.length === 1 ? 'course' : 'courses'})
                                  {allAuthorized && ' (All Authorized)'}
                                </span>
                              </div>
                              {categoryCourses.length > 0 && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    toggleCategoryExpansion(category.id);
                                  }}
                                  className="instructors-category-expand-btn"
                                >
                                  {isExpanded ? (
                                    <ChevronUp size={18} />
                                  ) : (
                                    <ChevronDown size={18} />
                                  )}
                                </button>
                              )}
                            </div>
                            {isExpanded && categoryCourses.length > 0 && (
                              <div className="instructors-category-courses">
                                {categoryCourses.map(course => {
                                  // Check if this course is already authorized for the selected ACC
                                  const isAuthorized = selectedInstructor?.courses?.some(instCourse => 
                                    instCourse.id === course.id && 
                                    instCourse.pivot?.acc_id === parseInt(requestForm.acc_id) &&
                                    instCourse.pivot?.status === 'active'
                                  ) || false;
                                  
                                  return (
                                    <div
                                      key={course.id}
                                      className={`instructors-course-item instructors-course-item-nested ${isAuthorized ? 'instructors-course-item-disabled' : ''}`}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={requestForm.course_ids?.includes(course.id) || false}
                                        onChange={() => handleCourseToggle(course.id, category.id)}
                                        className="instructors-course-checkbox"
                                        onClick={(e) => e.stopPropagation()}
                                        disabled={isAuthorized}
                                      />
                                      <div className="instructors-course-info">
                                        <span className={`instructors-course-name ${isAuthorized ? 'instructors-course-name-disabled' : ''}`}>
                                          {course.name || course.code || `Course ${course.id}`}
                                        </span>
                                        {course.code && course.name !== course.code && (
                                          <span className={`instructors-course-subcategory ${isAuthorized ? 'instructors-course-subcategory-disabled' : ''}`}>
                                            ({course.code})
                                          </span>
                                        )}
                                        {isAuthorized && (
                                          <span className="instructors-course-authorized-badge">
                                            Already Authorized
                                          </span>
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
                    {requestForm.course_ids.length > 0 && (
                      <p className="instructors-course-selected">
                        Selected: <span className="instructors-course-selected-bold">{requestForm.course_ids.length}</span> course(s)
                      </p>
                    )}
                  </>
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
                setRequestErrors({});
                setCategories([]);
                setCourses([]);
                setSubCategories([]);
                setCourseSearchTerm('');
              }}
              className="instructors-button-cancel"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={requesting}
              className="instructors-button-submit"
            >
              {requesting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default TrainingCenterInstructorsScreen;

