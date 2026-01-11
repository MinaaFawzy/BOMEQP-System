import { useEffect, useState, useMemo } from 'react';
import { trainingCenterAPI } from '../../../services/api';
import { useHeader } from '../../../context/HeaderContext';
import axios from 'axios';
import { GraduationCap, Plus, Edit, Trash2, Eye, CheckCircle, Users, Calendar, MapPin, Clock, XCircle, Mail, Phone, Hash, Search, X } from 'lucide-react';
import Modal from '../../../components/Modal/Modal';
import ConfirmDialog from '../../../components/ConfirmDialog/ConfirmDialog';
import TabCard from '../../../components/TabCard/TabCard';
import DataTable from '../../../components/DataTable/DataTable';
import './ClassesScreen.css';
import FormInput from '../../../components/FormInput/FormInput';

const ClassesScreen = () => {
  const { setHeaderActions, setHeaderTitle, setHeaderSubtitle } = useHeader();
  const [classes, setClasses] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [availableCourses, setAvailableCourses] = useState([]);
  const [hasAuthorizations, setHasAuthorizations] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedCourseData, setSelectedCourseData] = useState(null);
  const [filteredInstructors, setFilteredInstructors] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [enrollmentModalOpen, setEnrollmentModalOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedClassForEnrollment, setSelectedClassForEnrollment] = useState(null);
  
  // Cascade selection states
  const [availableACCs, setAvailableACCs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingSubCategories, setLoadingSubCategories] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(false);
  
  // Trainees selection
  const [availableTrainees, setAvailableTrainees] = useState([]);
  const [loadingTrainees, setLoadingTrainees] = useState(false);
  const [traineeSearchTerm, setTraineeSearchTerm] = useState('');
  const [selectedTraineeIds, setSelectedTraineeIds] = useState([]);
  
  const [formData, setFormData] = useState({
    acc_id: '',
    category_id: '',
    sub_category_id: '',
    course_id: '',
    class_id: '',
    instructor_id: '',
    start_date: '',
    end_date: '',
    exam_date: '',
    exam_score: '',
    location: 'physical',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadData();
  }, []); // Load all data once, pagination and statusFilter are handled client-side

  useEffect(() => {
    if (isModalOpen) {
      loadAvailableACCs();
      loadAvailableTrainees();
      // Initialize filtered instructors with all instructors when modal opens
      setFilteredInstructors(instructors);
      setSelectedCourseData(null);
    }
  }, [isModalOpen, instructors]);

  // When ACC is selected, load categories
  useEffect(() => {
    if (formData.acc_id && isModalOpen) {
      loadCategories(formData.acc_id);
    } else if (!formData.acc_id) {
      setCategories([]);
      setSubCategories([]);
      setAvailableCourses([]);
      setFormData(prev => ({
        ...prev,
        category_id: '',
        sub_category_id: '',
        course_id: ''
      }));
    }
  }, [formData.acc_id, isModalOpen]);

  // When category is selected, load sub-categories
  useEffect(() => {
    if (formData.category_id && isModalOpen) {
      loadSubCategories(formData.category_id);
    } else if (!formData.category_id) {
      setSubCategories([]);
      setAvailableCourses([]);
      setFormData(prev => ({
        ...prev,
        sub_category_id: '',
        course_id: ''
      }));
    }
  }, [formData.category_id, isModalOpen]);

  // When sub-category is selected, load courses
  useEffect(() => {
    if (formData.sub_category_id && formData.acc_id && isModalOpen) {
      loadCoursesForSubCategory(formData.acc_id, formData.sub_category_id);
    } else if (!formData.sub_category_id) {
      setAvailableCourses([]);
      setFormData(prev => ({
        ...prev,
        course_id: ''
      }));
    }
  }, [formData.sub_category_id, formData.acc_id, isModalOpen]);

  // When course is selected, load course details and filter instructors
  useEffect(() => {
    if (formData.course_id && isModalOpen && availableCourses.length > 0) {
      loadCourseDetails(formData.course_id);
    } else if (!formData.course_id) {
      setSelectedCourseData(null);
      setFilteredInstructors(instructors);
    }
  }, [formData.course_id, isModalOpen, availableCourses, instructors]);

  useEffect(() => {
    setHeaderTitle('Classes');
    setHeaderSubtitle('Manage your training classes');
    setHeaderActions(
      <button
        onClick={() => handleOpenModal()}
        className="header-create-btn"
      >
        <Plus size={20} className="header-create-btn-icon" />
        Create Class
      </button>
    );
    return () => {
      setHeaderActions(null);
      setHeaderTitle(null);
      setHeaderSubtitle(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setHeaderActions, setHeaderTitle, setHeaderSubtitle]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load all data - search and statusFilter are handled client-side by DataTable
      const [classesData, instructorsData] = await Promise.all([
        trainingCenterAPI.listClasses({ per_page: 1000 }),
        trainingCenterAPI.listInstructors(),
      ]);
      
      let classesArray = [];
      if (classesData?.data) {
        classesArray = Array.isArray(classesData.data) ? classesData.data : [];
      } else if (classesData?.classes) {
        classesArray = Array.isArray(classesData.classes) ? classesData.classes : [];
      } else if (Array.isArray(classesData)) {
        classesArray = classesData;
      }
      
      setClasses(classesArray);
      setInstructors(instructorsData?.instructors || instructorsData?.data || []);
    } catch (error) {
      console.error('Failed to load data:', error);
      setClasses([]);
      setInstructors([]);
    } finally {
      setLoading(false);
    }
  };
  

  // Load course details and filter instructors based on assessor_required
  const loadCourseDetails = async (courseId) => {
    try {
      // Find course in availableCourses array
      const course = availableCourses.find(c => c.id === parseInt(courseId));
      
      if (course) {
        setSelectedCourseData(course);
        
        // Filter instructors based on assessor_required
        if (course.assessor_required) {
          // Show only assessors
          const assessors = instructors.filter(inst => inst.is_assessor === true);
          setFilteredInstructors(assessors);
          
          // Clear instructor selection if current instructor is not an assessor
          if (formData.instructor_id) {
            const selectedInstructor = instructors.find(inst => inst.id === parseInt(formData.instructor_id));
            if (selectedInstructor && !selectedInstructor.is_assessor) {
              setFormData(prev => ({ ...prev, instructor_id: '' }));
            }
          }
        } else {
          // Show all instructors
          setFilteredInstructors(instructors);
        }
      } else {
        // Course not found in availableCourses, try to fetch from API
        try {
          const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
          const baseURL = import.meta.env.VITE_API_BASE_URL || 'https://aeroenix.com/v1/api';
          
          // Try to get course from ACC API
          const response = await axios.get(`${baseURL}/acc/courses/${courseId}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json',
            },
          });
          
          const courseData = response.data.course || response.data;
          setSelectedCourseData(courseData);
          
          // Filter instructors based on assessor_required
          if (courseData.assessor_required) {
            const assessors = instructors.filter(inst => inst.is_assessor === true);
            setFilteredInstructors(assessors);
            
            if (formData.instructor_id) {
              const selectedInstructor = instructors.find(inst => inst.id === parseInt(formData.instructor_id));
              if (selectedInstructor && !selectedInstructor.is_assessor) {
                setFormData(prev => ({ ...prev, instructor_id: '' }));
              }
            }
          } else {
            setFilteredInstructors(instructors);
          }
        } catch (error) {
          console.error('Failed to load course details:', error);
          setSelectedCourseData(null);
          setFilteredInstructors(instructors);
        }
      }
    } catch (error) {
      console.error('Error loading course details:', error);
      setSelectedCourseData(null);
      setFilteredInstructors(instructors);
    }
  };

  // Load available ACCs from authorizations
  const loadAvailableACCs = async () => {
    try {
      const authData = await trainingCenterAPI.getAuthorizationStatus();
      console.log('Authorization data:', authData);
      
      const allAuthorizations = authData.authorizations || authData.data || [];
      console.log('All authorizations:', allAuthorizations);
      
      // Check for approved/active authorizations
      const approvedAuthorizations = allAuthorizations.filter(
        auth => {
          const status = auth.status?.toLowerCase();
          return status === 'approved' || 
                 status === 'active' || 
                 status === 'accepted' ||
                 (auth.status && auth.status !== 'pending' && auth.status !== 'rejected' && auth.status !== 'cancelled');
        }
      );
      
      console.log('Approved authorizations:', approvedAuthorizations);

      if (approvedAuthorizations.length === 0) {
        console.log('No approved authorizations found.');
        setHasAuthorizations(false);
        setAvailableACCs([]);
        return;
      }
      
      setHasAuthorizations(true);

      // Extract ACCs from authorizations
      const accs = approvedAuthorizations.map(auth => ({
        id: auth.acc_id || auth.acc?.id || auth.id,
        name: auth.acc?.name || auth.acc_name || auth.name || 'Unknown ACC',
        ...(auth.acc || {})
      })).filter(acc => acc.id);

      setAvailableACCs(accs);
      console.log(`Loaded ${accs.length} authorized ACC(s)`);
    } catch (error) {
      console.error('Failed to load ACCs:', error);
      setAvailableACCs([]);
      setHasAuthorizations(false);
    }
  };

  // Load categories for selected ACC
  const loadCategories = async (accId) => {
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
    try {
      setLoadingCourses(true);
      console.log(`Loading courses for ACC ${accId} and sub-category ${subCategoryId}`);
      
      const data = await trainingCenterAPI.getCoursesForACC(accId, { sub_category_id: subCategoryId });
      const coursesList = data.courses || data.data || data || [];
      
      setAvailableCourses(coursesList);
      console.log(`Loaded ${coursesList.length} courses for sub-category ${subCategoryId}`);
    } catch (error) {
      console.error('Failed to load courses:', error);
      setAvailableCourses([]);
    } finally {
      setLoadingCourses(false);
    }
  };

  // Load available trainees for the training center
  const loadAvailableTrainees = async () => {
    try {
      setLoadingTrainees(true);
      const data = await trainingCenterAPI.listTrainees({ per_page: 1000 });
      const traineesList = data.trainees || data.data || data || [];
      setAvailableTrainees(traineesList);
      console.log(`Loaded ${traineesList.length} trainees`);
    } catch (error) {
      console.error('Failed to load trainees:', error);
      setAvailableTrainees([]);
    } finally {
      setLoadingTrainees(false);
    }
  };

  const handleOpenModal = (classItem = null) => {
    if (classItem) {
      setSelectedClass(classItem);
      setFormData({
        acc_id: classItem.acc_id || classItem.course?.acc_id || '',
        category_id: classItem.category_id || classItem.course?.category_id || '',
        sub_category_id: classItem.sub_category_id || classItem.course?.sub_category_id || '',
        course_id: classItem.course_id || '',
        class_id: classItem.class_id || '',
        instructor_id: classItem.instructor_id || '',
        start_date: classItem.start_date ? classItem.start_date.split('T')[0] : '',
        end_date: classItem.end_date ? classItem.end_date.split('T')[0] : '',
        exam_date: classItem.exam_date ? classItem.exam_date.split('T')[0] : '',
        exam_score: classItem.exam_score || '',
        location: classItem.location || 'physical',
      });
      // Set selected trainees from existing class
      if (classItem.trainees && Array.isArray(classItem.trainees)) {
        setSelectedTraineeIds(classItem.trainees.map(t => t.id || t.trainee_id).filter(Boolean));
      } else {
        setSelectedTraineeIds([]);
      }
    } else {
      setSelectedClass(null);
      setFormData({
        acc_id: '',
        category_id: '',
        sub_category_id: '',
        course_id: '',
        class_id: '',
        instructor_id: '',
        start_date: '',
        end_date: '',
        exam_date: '',
        exam_score: '',
        location: 'physical',
      });
      setSelectedTraineeIds([]);
    }
    setCategories([]);
    setSubCategories([]);
    setAvailableCourses([]);
    setSelectedCourseData(null);
    setFilteredInstructors(instructors);
    setTraineeSearchTerm('');
    setErrors({});
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedClass(null);
    setFormData({
      acc_id: '',
      category_id: '',
      sub_category_id: '',
      course_id: '',
      class_id: '',
      instructor_id: '',
      start_date: '',
      end_date: '',
      exam_date: '',
      exam_score: '',
      location: 'physical',
    });
    setCategories([]);
    setSubCategories([]);
    setAvailableCourses([]);
    setSelectedTraineeIds([]);
    setTraineeSearchTerm('');
    setErrors({});
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Handle cascade selection - clear dependent fields
    if (name === 'acc_id') {
      setFormData({
        ...formData,
        acc_id: value,
        category_id: '',
        sub_category_id: '',
        course_id: '',
        instructor_id: '', // Clear instructor when course changes
      });
      setCategories([]);
      setSubCategories([]);
      setAvailableCourses([]);
    } else if (name === 'category_id') {
      setFormData({
        ...formData,
        category_id: value,
        sub_category_id: '',
        course_id: '',
        instructor_id: '', // Clear instructor when course changes
      });
      setSubCategories([]);
      setAvailableCourses([]);
    } else if (name === 'sub_category_id') {
      setFormData({
        ...formData,
        sub_category_id: value,
        course_id: '',
        instructor_id: '', // Clear instructor when course changes
      });
      setAvailableCourses([]);
    } else if (name === 'course_id') {
      setFormData({
        ...formData,
        course_id: value,
        instructor_id: '', // Clear instructor when course changes
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
    setErrors({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});

    try {
      // Validate required fields - only validate ACC, Category, Sub-Category, Course when creating (not editing)
      if (!selectedClass) {
        // When creating, validate all required fields
        if (!formData.acc_id) {
          setErrors({ acc_id: 'ACC is required' });
          setSaving(false);
          return;
        }
        if (!formData.category_id) {
          setErrors({ category_id: 'Category is required' });
          setSaving(false);
          return;
        }
        if (!formData.sub_category_id) {
          setErrors({ sub_category_id: 'Sub-Category is required' });
          setSaving(false);
          return;
        }
        if (!formData.course_id) {
          setErrors({ course_id: 'Course is required' });
          setSaving(false);
          return;
        }
      }

      // These fields are always required (both create and update)
      if (!formData.class_id) {
        setErrors({ class_id: 'Class ID is required' });
        setSaving(false);
        return;
      }
      if (!formData.instructor_id) {
        setErrors({ instructor_id: 'Instructor is required' });
        setSaving(false);
        return;
      }
      if (!formData.start_date) {
        setErrors({ start_date: 'Start date is required' });
        setSaving(false);
        return;
      }
      if (!formData.end_date) {
        setErrors({ end_date: 'End date is required' });
        setSaving(false);
        return;
      }

      // Prepare submit data exactly as specified
      // When updating, use course_id from selectedClass if not in formData
      const courseId = selectedClass 
        ? (formData.course_id || selectedClass.course_id) 
        : formData.course_id;

      const submitData = {
        course_id: parseInt(courseId),
        class_id: parseInt(formData.class_id),
        instructor_id: parseInt(formData.instructor_id),
        start_date: formData.start_date,
        end_date: formData.end_date,
        exam_date: formData.exam_date || null,
        exam_score: formData.exam_score ? parseFloat(formData.exam_score) : null,
        location: formData.location,
      };

      // Add trainee_ids if any trainees are selected
      if (selectedTraineeIds.length > 0) {
        submitData.trainee_ids = selectedTraineeIds;
      }

      console.log('Submitting class data:', submitData);

      if (selectedClass) {
        await trainingCenterAPI.updateClass(selectedClass.id, submitData);
      } else {
        await trainingCenterAPI.createClass(submitData);
      }
      await loadData();
      handleCloseModal();
    } catch (error) {
      console.error('Error creating/updating class:', error);
      console.error('Error response:', error.response?.data);
      
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      } else if (error.response?.data?.message) {
        setErrors({ general: error.response.data.message });
      } else if (error.response?.data?.error) {
        setErrors({ general: error.response.data.error });
      } else if (error.errors) {
        setErrors(error.errors);
      } else {
        setErrors({ general: error.message || 'Failed to save class. Please check all required fields.' });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (classItem) => {
    setSelectedClass(classItem);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await trainingCenterAPI.deleteClass(selectedClass.id);
      await loadData();
    } catch (error) {
      alert('Failed to delete class: ' + (error.message || 'Unknown error'));
    }
    setIsDeleteDialogOpen(false);
    setSelectedClass(null);
  };

  const handleViewDetails = async (classItem) => {
    try {
      const data = await trainingCenterAPI.getClassDetails(classItem.id);
      // Handle different response structures
      const classData = data.class || data.data || data;
      // Ensure trainees are included (could be in classData.trainees or data.trainees)
      if (classData && !classData.trainees && data.trainees) {
        classData.trainees = data.trainees;
      }
      // If still no trainees, try to get from original classItem
      if (classData && !classData.trainees && classItem.trainees) {
        classData.trainees = classItem.trainees;
      }
      setSelectedClass(classData);
      setDetailModalOpen(true);
    } catch (error) {
      console.error('Failed to load class details:', error);
      // Fallback to original classItem data
      setSelectedClass(classItem);
      setDetailModalOpen(true);
    }
  };

  const handleMarkComplete = async (classItem) => {
    if (window.confirm('Mark this class as complete?')) {
      try {
        await trainingCenterAPI.markClassComplete(classItem.id);
        await loadData();
      } catch (error) {
        alert('Failed to mark class as complete: ' + (error.message || 'Unknown error'));
      }
    }
  };

  // Define columns for DataTable
  const columns = useMemo(() => [
    {
      header: 'Course',
      accessor: 'course',
      sortable: true,
      render: (value, row) => {
        const courseName = typeof row.course === 'string' ? row.course : (row.course?.name || 'N/A');
        return (
          <div className="course-container">
            <div className="course-icon-container">
              <GraduationCap className="course-icon" />
            </div>
            <div>
              <div className="course-name">
                {courseName}
              </div>
              {row.class_id && (
                <div className="course-id">ID: {row.class_id}</div>
              )}
            </div>
          </div>
        );
      },
    },
    {
      header: 'Instructor',
      accessor: 'instructor',
      sortable: true,
      render: (value, row) => {
        const instructorName = typeof row.instructor === 'string'
          ? row.instructor
          : (row.instructor?.first_name && row.instructor?.last_name
            ? `${row.instructor.first_name} ${row.instructor.last_name}`
            : 'N/A');
        return (
          <div className="instructor-container">
            <Users className="instructor-icon" />
            {instructorName}
          </div>
        );
      },
    },
    {
      header: 'Start Date',
      accessor: 'start_date',
      sortable: true,
      render: (value, row) => (
        <div className="date-container">
          <Calendar className="date-icon" />
          {row.start_date ? new Date(row.start_date).toLocaleDateString() : 'N/A'}
        </div>
      ),
    },
    {
      header: 'End Date',
      accessor: 'end_date',
      sortable: true,
      render: (value, row) => (
        <div className="date-container">
          <Calendar className="date-icon" />
          {row.end_date ? new Date(row.end_date).toLocaleDateString() : 'N/A'}
        </div>
      ),
    },
    {
      header: 'Exam Date',
      accessor: 'exam_date',
      sortable: true,
      render: (value) => (
        <div className="date-container">
          <Calendar className="date-icon" style={{ color: '#9333ea' }} />
          {value ? new Date(value).toLocaleDateString() : 'Not set'}
        </div>
      ),
    },
    {
      header: 'Exam Score',
      accessor: 'exam_score',
      sortable: true,
      render: (value) => (
        <div className="text-sm">
          {value !== null && value !== undefined ? (
            <span className="font-semibold text-indigo-600">{parseFloat(value).toFixed(2)}%</span>
          ) : (
            <span className="text-gray-400">N/A</span>
          )}
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: 'status',
      sortable: true,
      render: (value, row) => {
        const statusConfig = {
          scheduled: { bg: 'from-blue-100 to-blue-200', text: 'text-blue-800', border: 'border-blue-300', icon: Clock },
          completed: { bg: 'from-green-100 to-green-200', text: 'text-green-800', border: 'border-green-300', icon: CheckCircle },
          cancelled: { bg: 'from-red-100 to-red-200', text: 'text-red-800', border: 'border-red-300', icon: XCircle },
        };
        const config = statusConfig[row.status] || { bg: 'from-gray-100 to-gray-200', text: 'text-gray-800', border: 'border-gray-300', icon: Clock };
        const StatusIcon = config.icon;
        const statusClass = row.status === 'scheduled' ? 'scheduled' :
                           row.status === 'completed' ? 'completed' :
                           row.status === 'cancelled' ? 'cancelled' : 'default';
        return (
          <div className="status-container">
            <span className={`status-badge ${statusClass}`}>
              <StatusIcon size={14} className="status-icon" />
              {row.status ? row.status.charAt(0).toUpperCase() + row.status.slice(1) : 'N/A'}
            </span>
          </div>
        );
      },
    },
    {
      header: 'Enrollment',
      accessor: 'enrollment',
      sortable: false,
      render: (value, row) => {
        const hasTrainees = row.trainees && Array.isArray(row.trainees) && row.trainees.length > 0;
        const handleEnrollmentClick = (e) => {
          e.stopPropagation();
          e.preventDefault();
          e.nativeEvent.stopImmediatePropagation();
          if (hasTrainees) {
            setSelectedClassForEnrollment(row);
            setEnrollmentModalOpen(true);
          }
        };
        return (
          <div 
            className={`enrollment-container ${hasTrainees ? 'enrollment-clickable' : ''}`}
            onClick={handleEnrollmentClick}
            onMouseDown={(e) => {
              e.stopPropagation();
              e.nativeEvent.stopImmediatePropagation();
            }}
            onMouseUp={(e) => {
              e.stopPropagation();
              e.nativeEvent.stopImmediatePropagation();
            }}
            role={hasTrainees ? "button" : undefined}
            tabIndex={hasTrainees ? 0 : undefined}
            onKeyDown={(e) => {
              if (hasTrainees && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                e.stopPropagation();
                handleEnrollmentClick(e);
              }
            }}
          >
            {row.enrolled_count || 0} / {row.course?.max_capacity || 'N/A'}
          </div>
        );
      },
    },
  ], []);

  // Filter options for DataTable
  const filterOptions = useMemo(() => [
    { value: 'all', label: 'All Status', filterFn: () => true },
    { value: 'scheduled', label: 'Scheduled', filterFn: (row) => row.status === 'scheduled' },
    { value: 'completed', label: 'Completed', filterFn: (row) => row.status === 'completed' },
    { value: 'cancelled', label: 'Cancelled', filterFn: (row) => row.status === 'cancelled' },
  ], []);

  // Add searchable text to each row for better search functionality
  const dataWithSearchText = useMemo(() => {
    return classes.map(classItem => {
      const courseName = typeof classItem.course === 'string' ? classItem.course : (classItem.course?.name || '');
      const instructorName = typeof classItem.instructor === 'string'
        ? classItem.instructor
        : (classItem.instructor?.first_name && classItem.instructor?.last_name
          ? `${classItem.instructor.first_name} ${classItem.instructor.last_name}`
          : '');
      
      const searchText = [
        courseName,
        instructorName,
        classItem.class_id || '',
        classItem.status || '',
        classItem.location || '',
      ].filter(Boolean).join(' ').toLowerCase();
      
      return {
        ...classItem,
        _searchText: searchText,
      };
    });
  }, [classes]);

  // Calculate stats from all classes (not filtered, not paginated)
  const totalCount = classes.length;
  const scheduledCount = classes.filter(c => c.status === 'scheduled').length;
  const completedCount = classes.filter(c => c.status === 'completed').length;
  const cancelledCount = classes.filter(c => c.status === 'cancelled').length;

  // Filter trainees based on search term
  const filteredTrainees = useMemo(() => {
    if (!traineeSearchTerm.trim()) {
      return availableTrainees;
    }
    
    const searchLower = traineeSearchTerm.toLowerCase().trim();
    return availableTrainees.filter(trainee => {
      const fullName = `${trainee.first_name || ''} ${trainee.last_name || ''}`.toLowerCase();
      const email = (trainee.email || '').toLowerCase();
      const idNumber = (trainee.id_number || '').toLowerCase();
      const id = String(trainee.id || '').toLowerCase();
      
      return fullName.includes(searchLower) ||
             email.includes(searchLower) ||
             idNumber.includes(searchLower) ||
             id.includes(searchLower);
    });
  }, [availableTrainees, traineeSearchTerm]);


  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="main-container">
      {/* Stats Cards using TabCard */}
      <div className="stats-cards-grid">
        <TabCard
          name="Total Classes"
          value={totalCount}
          icon={GraduationCap}
          colorType="indigo"
          isActive={statusFilter === 'all'}
          onClick={() => setStatusFilter('all')}
        />
        <TabCard
          name="Scheduled"
          value={scheduledCount}
          icon={Calendar}
          colorType="blue"
          isActive={statusFilter === 'scheduled'}
          onClick={() => setStatusFilter('scheduled')}
        />
        <TabCard
          name="Completed"
          value={completedCount}
          icon={CheckCircle}
          colorType="green"
          isActive={statusFilter === 'completed'}
          onClick={() => setStatusFilter('completed')}
        />
        </div>

      {/* DataTable */}
      <div className="datatable-container">
        <DataTable
          columns={columns}
          data={dataWithSearchText}
          onEdit={handleOpenModal}
          onDelete={handleDelete}
          onView={handleViewDetails}
          onRowClick={handleViewDetails}
          isLoading={loading}
          emptyMessage={
            classes.length === 0 && !loading ? (
              <div className="empty-state-container">
                <div className="empty-state-icon-container">
                  <GraduationCap className="empty-state-icon" size={32} />
            </div>
                <p className="empty-state-title">No classes found</p>
                <p className="empty-state-subtitle">Create your first class to get started!</p>
            </div>
            ) : 'No classes found matching your filters'
          }
          searchable={true}
          filterable={true}
          searchPlaceholder="Search by course or instructor..."
          filterOptions={filterOptions}
          sortable={true}
          defaultFilter={statusFilter}
        />
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={selectedClass ? 'Edit Class' : 'Create New Class'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="modal-form">
          {/* Only show ACC, Category, Sub-Category, and Course fields when creating (not editing) */}
          {!selectedClass && (
            <>
              {/* ACC Selection */}
              <FormInput
                label="ACC"
                name="acc_id"
                type="select"
                value={formData.acc_id}
                onChange={handleChange}
                required
                error={errors.acc_id}
                options={[
                  { value: '', label: 'Select an ACC...' },
                  ...availableACCs.map(acc => ({
                    value: acc.id,
                    label: acc.name || `ACC ${acc.id}`
                  }))
                ]}
              />
              {availableACCs.length === 0 && !loading && (
                <div className="form-warning">
                  <p className="form-warning-title">No ACCs available</p>
                  <p className="form-warning-text">
                    Please ensure you have authorization from at least one ACC. Authorized ACCs will appear here.
                  </p>
                </div>
              )}

              {/* Category Selection */}
              <FormInput
                label="Category"
                name="category_id"
                type="select"
                value={formData.category_id}
                onChange={handleChange}
                required
                disabled={!formData.acc_id || loadingCategories}
                error={errors.category_id}
                options={[
                  { value: '', label: !formData.acc_id ? 'Please select ACC first' : (loadingCategories ? 'Loading categories...' : 'Select a category...') },
                  ...categories
                    .filter(cat => cat.id != null && cat.id !== '')
                    .map(cat => ({
                      value: cat.id,
                      label: cat.name || cat.name_ar || `Category ${cat.id}`
                    }))
                ]}
              />

              {/* Sub-Category Selection */}
              <FormInput
                label="Sub-Category"
                name="sub_category_id"
                type="select"
                value={formData.sub_category_id}
                onChange={handleChange}
                required
                disabled={!formData.acc_id || !formData.category_id || loadingSubCategories}
                error={errors.sub_category_id}
                options={[
                  { value: '', label: !formData.acc_id ? 'Please select ACC first' : (!formData.category_id ? 'Please select Category first' : (loadingSubCategories ? 'Loading sub-categories...' : 'Select a sub-category...')) },
                  ...subCategories
                    .filter(subCat => subCat.id != null && subCat.id !== '')
                    .map(subCat => ({
                      value: subCat.id,
                      label: subCat.name || subCat.name_ar || `Sub-Category ${subCat.id}`
                    }))
                ]}
              />

              {/* Course Selection */}
              <div>
                <FormInput
                  label="Course"
                  name="course_id"
                  type="select"
                  value={formData.course_id}
                  onChange={handleChange}
                  required
                  disabled={!formData.acc_id || !formData.category_id || !formData.sub_category_id || loadingCourses}
                  error={errors.course_id}
                  options={[
                    { value: '', label: !formData.acc_id ? 'Please select ACC first' : (!formData.category_id ? 'Please select Category first' : (!formData.sub_category_id ? 'Please select Sub-Category first' : (loadingCourses ? 'Loading courses...' : 'Select a course...'))) },
                    ...availableCourses.map(course => {
                      const courseName = course.name || course.code || `Course ${course.id}`;
                      return { value: course.id, label: courseName };
                    })
                  ]}
                />
                {availableCourses.length === 0 && !loadingCourses && formData.sub_category_id && (
                  <div className="form-warning">
                    <p className="form-warning-title">No courses available</p>
                    <p className="form-warning-text">
                      No courses found for the selected sub-category. Please select a different sub-category.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}


          <FormInput
            label="Class ID"
            name="class_id"
            type="number"
            value={formData.class_id}
            onChange={handleChange}
            required
            disabled={!!selectedClass}
            placeholder="Enter class ID"
            error={errors.class_id}
          />

          <div>
            <FormInput
              label="Instructor"
              name="instructor_id"
              type="select"
              value={formData.instructor_id}
              onChange={handleChange}
              required
              error={errors.instructor_id}
              options={[
                { value: '', label: 'Select an instructor...' },
                ...(filteredInstructors.length > 0
                  ? filteredInstructors.map(inst => ({
                      value: inst.id,
                      label: `${inst.first_name} ${inst.last_name}${inst.is_assessor ? ' (Assessor)' : ''}`
                    }))
                  : [{ value: '', label: 'No instructors available', disabled: true }]
                )
              ]}
            />
            {selectedCourseData?.assessor_required && filteredInstructors.length === 0 && (
              <div className="form-warning">
                <p className="form-warning-title">
                  ⚠️ This course requires an assessor, but no assessors are available.
                </p>
                <p className="form-warning-text">
                  Please mark at least one instructor as an assessor before creating this class.
                </p>
              </div>
            )}
            {selectedCourseData?.assessor_required && filteredInstructors.length > 0 && (
              <p className="form-info">
                ℹ️ This course requires an assessor. Only assessors are shown.
              </p>
            )}
          </div>

          <div className="form-grid">
            <FormInput
              label="Start Date"
              name="start_date"
              type="date"
              value={formData.start_date}
              onChange={handleChange}
              required
              error={errors.start_date}
            />

            <FormInput
              label="End Date"
              name="end_date"
              type="date"
              value={formData.end_date}
              onChange={handleChange}
              required
              error={errors.end_date}
            />
          </div>

          <div className="form-grid">
            <FormInput
              label="Exam Date (Optional)"
              name="exam_date"
              type="date"
              value={formData.exam_date}
              onChange={handleChange}
              error={errors.exam_date}
              helpText="Date when the exam is scheduled (must be after or equal to start date)"
            />

            <FormInput
              label="Exam Score (Optional)"
              name="exam_score"
              type="number"
              value={formData.exam_score}
              onChange={handleChange}
              error={errors.exam_score}
              helpText="Exam score (0-100)"
              min="0"
              max="100"
              step="0.01"
            />
          </div>

          <FormInput
            label="Location"
            name="location"
            type="select"
            value={formData.location}
            onChange={handleChange}
            required
            error={errors.location}
            options={[
              { value: 'physical', label: 'Physical' },
              { value: 'online', label: 'Online' },
              { value: 'hybrid', label: 'Hybrid' }
            ]}
          />

          {/* Trainees Selection */}
          <div className="form-group">
            <label className="form-label">
              Trainees (Optional)
            </label>
            <div className="trainees-selection-container">
              {/* Search Input */}
              <div className="trainees-search-container">
                <Search size={18} className="trainees-search-icon" />
                <input
                  type="text"
                  placeholder="Search trainees by name, email, or ID..."
                  value={traineeSearchTerm}
                  onChange={(e) => setTraineeSearchTerm(e.target.value)}
                  className="trainees-search-input"
                />
                {traineeSearchTerm && (
                  <button
                    type="button"
                    onClick={() => setTraineeSearchTerm('')}
                    className="trainees-search-clear"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {/* Selected Trainees Count */}
              {selectedTraineeIds.length > 0 && (
                <div className="trainees-selected-count">
                  <Users size={16} />
                  <span>{selectedTraineeIds.length} trainee{selectedTraineeIds.length !== 1 ? 's' : ''} selected</span>
                </div>
              )}

              {/* Trainees List */}
              <div className="trainees-list-container">
                {loadingTrainees ? (
                  <div className="trainees-loading">
                    <div className="loading-spinner-small"></div>
                    <span>Loading trainees...</span>
                  </div>
                ) : filteredTrainees.length === 0 ? (
                  <div className="trainees-empty">
                    <Users size={24} className="trainees-empty-icon" />
                    <p className="trainees-empty-text">
                      {traineeSearchTerm ? 'No trainees found matching your search.' : 'No trainees available.'}
                    </p>
                  </div>
                ) : (
                  <div className="trainees-list">
                    {filteredTrainees.map((trainee) => {
                      const isSelected = selectedTraineeIds.includes(trainee.id);
                      return (
                        <div
                          key={trainee.id}
                          className={`trainee-item ${isSelected ? 'selected' : ''}`}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedTraineeIds(selectedTraineeIds.filter(id => id !== trainee.id));
                            } else {
                              setSelectedTraineeIds([...selectedTraineeIds, trainee.id]);
                            }
                          }}
                        >
                          <div className="trainee-checkbox">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                          <div className="trainee-info">
                            <div className="trainee-name">
                              {trainee.first_name} {trainee.last_name}
                            </div>
                            <div className="trainee-details">
                              {trainee.email && (
                                <span className="trainee-detail-item">
                                  <Mail size={12} />
                                  {trainee.email}
                                </span>
                              )}
                              {trainee.id_number && (
                                <span className="trainee-detail-item">
                                  <Hash size={12} />
                                  {trainee.id_number}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {errors.general && (
            <div className="form-error-general">
              <p className="form-error-general-text">{errors.general}</p>
            </div>
          )}
          
          {Object.keys(errors).filter(key => key !== 'general').length > 0 && (
            <div className="form-error-general">
              <p className="form-error-general-text">Please fix the following errors:</p>
              <ul className="form-error-list">
                {Object.entries(errors)
                  .filter(([key]) => key !== 'general')
                  .map(([key, value]) => (
                    <li key={key}>
                      {Array.isArray(value) ? value.join(', ') : value}
                    </li>
                  ))}
              </ul>
            </div>
          )}

          <div className="form-actions">
            <button
              type="button"
              onClick={handleCloseModal}
              className="form-btn form-btn-cancel"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="form-btn form-btn-submit"
            >
              {saving ? 'Saving...' : selectedClass ? 'Update Class' : 'Create Class'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedClass(null);
        }}
        title="Class Details"
        size="lg"
      >
        {selectedClass && (
          <div className="detail-modal-container">
            {/* Basic Information */}
            <div className="detail-modal-grid">
              <div className="detail-modal-item">
                <p className="detail-modal-label">Class ID</p>
                <p className="detail-modal-value">
                  {selectedClass.class_id || selectedClass.id || 'N/A'}
                </p>
              </div>
              <div className="detail-modal-item">
                <p className="detail-modal-label">Status</p>
                <span className={`detail-modal-badge ${
                  selectedClass.status === 'completed' ? 'completed' :
                  selectedClass.status === 'scheduled' ? 'scheduled' :
                  selectedClass.status === 'cancelled' ? 'cancelled' : 'default'
                }`}>
                  {selectedClass.status ? selectedClass.status.charAt(0).toUpperCase() + selectedClass.status.slice(1) : 'N/A'}
                </span>
              </div>
            </div>

            {/* Course Information */}
            <div className="detail-modal-section detail-modal-section-blue">
              <p className="detail-modal-section-title detail-modal-section-title-blue">Course Information</p>
              <div className="detail-modal-section-grid">
                <div className="detail-modal-section-item">
                  <p className="detail-modal-section-label detail-modal-section-label-blue">Course Name</p>
                  <p className="detail-modal-section-value detail-modal-section-value-blue">
                  {typeof selectedClass.course === 'string' ? selectedClass.course : (selectedClass.course?.name || 'N/A')}
                </p>
              </div>
                {selectedClass.course?.code && (
                  <div className="detail-modal-section-item">
                    <p className="detail-modal-section-label detail-modal-section-label-blue">Course Code</p>
                    <p className="detail-modal-section-value detail-modal-section-value-blue">{selectedClass.course.code}</p>
                  </div>
                )}
                {selectedClass.course?.max_capacity && (
                  <div className="detail-modal-section-item">
                    <p className="detail-modal-section-label detail-modal-section-label-blue">Max Capacity</p>
                    <p className="detail-modal-section-value detail-modal-section-value-blue">{selectedClass.course.max_capacity}</p>
                  </div>
                )}
                {selectedClass.course?.duration && (
                  <div className="detail-modal-section-item">
                    <p className="detail-modal-section-label detail-modal-section-label-blue">Duration</p>
                    <p className="detail-modal-section-value detail-modal-section-value-blue">{selectedClass.course.duration}</p>
                  </div>
                )}
                {selectedClass.course?.description && (
                  <div className="detail-modal-section-item detail-modal-section-full">
                    <p className="detail-modal-section-label detail-modal-section-label-blue">Description</p>
                    <p className="detail-modal-section-value detail-modal-section-value-blue">{selectedClass.course.description}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Instructor Information */}
            <div className="detail-modal-section detail-modal-section-purple">
              <p className="detail-modal-section-title detail-modal-section-title-purple">Instructor Information</p>
              <div className="detail-modal-section-grid">
                <div className="detail-modal-section-item">
                  <p className="detail-modal-section-label detail-modal-section-label-purple">Name</p>
                  <p className="detail-modal-section-value detail-modal-section-value-purple">
                  {typeof selectedClass.instructor === 'string' 
                    ? selectedClass.instructor 
                    : (selectedClass.instructor?.first_name && selectedClass.instructor?.last_name
                      ? `${selectedClass.instructor.first_name} ${selectedClass.instructor.last_name}`
                      : 'N/A')}
                </p>
              </div>
                {selectedClass.instructor?.email && (
                  <div className="detail-modal-section-item">
                    <p className="detail-modal-section-label detail-modal-section-label-purple">Email</p>
                    <p className="detail-modal-section-value detail-modal-section-value-purple">{selectedClass.instructor.email}</p>
                  </div>
                )}
                {selectedClass.instructor?.phone && (
                  <div className="detail-modal-section-item">
                    <p className="detail-modal-section-label detail-modal-section-label-purple">Phone</p>
                    <p className="detail-modal-section-value detail-modal-section-value-purple">{selectedClass.instructor.phone}</p>
                  </div>
                )}
                {selectedClass.instructor?.is_assessor && (
                  <div className="detail-modal-section-item">
                    <p className="detail-modal-section-label detail-modal-section-label-purple">Role</p>
                    <p className="detail-modal-section-value detail-modal-section-value-purple">Assessor</p>
                  </div>
                )}
              </div>
            </div>

            {/* Schedule Information */}
            <div className="detail-modal-grid">
              <div className="detail-modal-item">
                <p className="detail-modal-label">Start Date</p>
                <p className="detail-modal-value">
                  {selectedClass.start_date ? new Date(selectedClass.start_date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }) : 'N/A'}
                </p>
                {selectedClass.start_date && (
                  <p className="detail-modal-time">
                    {new Date(selectedClass.start_date).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                )}
              </div>
              <div className="detail-modal-item">
                <p className="detail-modal-label">End Date</p>
                <p className="detail-modal-value">
                  {selectedClass.end_date ? new Date(selectedClass.end_date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }) : 'N/A'}
                </p>
                {selectedClass.end_date && (
                  <p className="detail-modal-time">
                    {new Date(selectedClass.end_date).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                )}
              </div>
              {selectedClass.exam_date && (
                <div className="detail-modal-item" style={{ backgroundColor: '#faf5ff', borderColor: '#e9d5ff' }}>
                  <p className="detail-modal-label" style={{ color: '#9333ea' }}>Exam Date</p>
                  <p className="detail-modal-value" style={{ color: '#7e22ce' }}>
                    {new Date(selectedClass.exam_date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              )}
              {selectedClass.exam_score !== null && selectedClass.exam_score !== undefined && (
                <div className="detail-modal-item" style={{ backgroundColor: '#eef2ff', borderColor: '#c7d2fe' }}>
                  <p className="detail-modal-label" style={{ color: '#4f46e5' }}>Exam Score</p>
                  <p className="detail-modal-value" style={{ color: '#4338ca', fontWeight: 'bold' }}>
                    {parseFloat(selectedClass.exam_score).toFixed(2)}%
                  </p>
                </div>
              )}
              </div>

            {/* Additional Information */}
            <div className="detail-modal-grid">
              <div className="detail-modal-item">
                <p className="detail-modal-label">Location</p>
                <p className="detail-modal-value">
                  {selectedClass.location ? selectedClass.location.charAt(0).toUpperCase() + selectedClass.location.slice(1) : 'N/A'}
                </p>
              </div>
              <div className="detail-modal-item">
                <p className="detail-modal-label">Enrollment</p>
                <p className="detail-modal-value">
                  {selectedClass.enrolled_count || 0} / {selectedClass.course?.max_capacity || 'N/A'}
                </p>
                {selectedClass.course?.max_capacity && (
                  <div className="detail-modal-progress-container">
                    <div className="detail-modal-progress-bar">
                      <div 
                        className="detail-modal-progress-fill"
                        style={{ 
                          width: `${Math.min(((selectedClass.enrolled_count || 0) / selectedClass.course.max_capacity) * 100, 100)}%` 
                        }}
                      ></div>
              </div>
                    <p className="detail-modal-progress-text">
                      {Math.round(((selectedClass.enrolled_count || 0) / selectedClass.course.max_capacity) * 100)}% full
                </p>
              </div>
                )}
            </div>
            </div>

            {/* Trainees Section - Always show */}
            <div className="detail-modal-section detail-modal-section-blue">
              <p className="detail-modal-section-title detail-modal-section-title-blue">Enrolled Trainees</p>
              {selectedClass.trainees && Array.isArray(selectedClass.trainees) && selectedClass.trainees.length > 0 ? (
                <div className="detail-modal-trainees-list">
                  {selectedClass.trainees.map((trainee, index) => (
                    <div key={trainee.id || index} className="detail-modal-trainee-item">
                      <div className="detail-modal-trainee-content">
                        <div className="detail-modal-trainee-name">
                          <Users size={16} className="detail-modal-trainee-icon" />
                          <span>{trainee.first_name} {trainee.last_name}</span>
                        </div>
                        <div className="detail-modal-trainee-id">
                          <Hash size={14} className="detail-modal-trainee-id-icon" />
                          <span>{trainee.id_number || trainee.id || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="mx-auto text-gray-400 mb-4" size={48} />
                  <p className="text-gray-500 font-medium">No trainees enrolled</p>
                  <p className="text-sm text-gray-400 mt-1">No trainees have been enrolled in this class yet.</p>
                </div>
              )}
            </div>

            {/* Additional Fields */}
            {(selectedClass.created_at || selectedClass.updated_at || selectedClass.notes) && (
              <div className="detail-modal-section detail-modal-section-yellow">
                <p className="detail-modal-section-title detail-modal-section-title-yellow">Additional Information</p>
                <div className="detail-modal-additional-list">
                  {selectedClass.created_at && (
                    <div className="detail-modal-additional-item">
                      <p className="detail-modal-additional-label detail-modal-additional-label-yellow">Created At</p>
                      <p className="detail-modal-additional-value detail-modal-additional-value-yellow">
                        {new Date(selectedClass.created_at).toLocaleString('en-US')}
                      </p>
                    </div>
                  )}
                  {selectedClass.updated_at && (
                    <div className="detail-modal-additional-item">
                      <p className="detail-modal-additional-label detail-modal-additional-label-yellow">Last Updated</p>
                      <p className="detail-modal-additional-value detail-modal-additional-value-yellow">
                        {new Date(selectedClass.updated_at).toLocaleString('en-US')}
                      </p>
                    </div>
                  )}
                  {selectedClass.notes && (
                    <div className="detail-modal-additional-item">
                      <p className="detail-modal-additional-label detail-modal-additional-label-yellow">Notes</p>
                      <p className="detail-modal-additional-value detail-modal-additional-value-yellow">{selectedClass.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            {selectedClass.status !== 'completed' && (
              <div className="detail-modal-actions">
                <button
                  onClick={() => {
                    handleMarkComplete(selectedClass);
                    setDetailModalOpen(false);
                  }}
                  className="detail-modal-action-btn"
                >
                  <CheckCircle size={20} className="detail-modal-action-icon" />
                  Mark as Complete
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Enrollment Modal */}
      <Modal
        isOpen={enrollmentModalOpen}
        onClose={() => {
          setEnrollmentModalOpen(false);
          setSelectedClassForEnrollment(null);
        }}
        title="Enrolled Trainees"
        size="lg"
      >
        {selectedClassForEnrollment && (
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg mb-4">
              <p className="text-sm text-gray-500 mb-1">Class Information</p>
              <p className="text-base font-semibold text-gray-900">
                {selectedClassForEnrollment.course?.name || 'N/A'}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Enrollment: {selectedClassForEnrollment.enrolled_count || 0} / {selectedClassForEnrollment.course?.max_capacity || 'N/A'}
              </p>
            </div>

            {selectedClassForEnrollment.trainees && selectedClassForEnrollment.trainees.length > 0 ? (
              <div className="space-y-3">
                {selectedClassForEnrollment.trainees.map((trainee, index) => (
                  <div key={trainee.id || index} className="p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500 mb-1 flex items-center">
                          <Users size={14} className="mr-1" />
                          Name
                        </p>
                        <p className="text-base font-semibold text-gray-900">
                          {trainee.first_name} {trainee.last_name}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 mb-1 flex items-center">
                          <Mail size={14} className="mr-1" />
                          Email
                        </p>
                        <p className="text-base font-semibold text-gray-900">
                          {trainee.email || 'N/A'}
                        </p>
                      </div>
                      {trainee.phone && (
                        <div>
                          <p className="text-sm text-gray-500 mb-1 flex items-center">
                            <Phone size={14} className="mr-1" />
                            Phone
                          </p>
                          <p className="text-base font-semibold text-gray-900">
                            {trainee.phone}
                          </p>
                        </div>
                      )}
                      {trainee.id_number && (
                        <div>
                          <p className="text-sm text-gray-500 mb-1 flex items-center">
                            <Hash size={14} className="mr-1" />
                            ID Number
                          </p>
                          <p className="text-base font-semibold text-gray-900">
                            {trainee.id_number}
                          </p>
                        </div>
                      )}
                      {trainee.enrolled_at && (
                        <div>
                          <p className="text-sm text-gray-500 mb-1 flex items-center">
                            <Calendar size={14} className="mr-1" />
                            Enrolled At
                          </p>
                          <p className="text-base font-semibold text-gray-900">
                            {new Date(trainee.enrolled_at).toLocaleString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      )}
                      {trainee.completed_at && (
                        <div>
                          <p className="text-sm text-gray-500 mb-1 flex items-center">
                            <CheckCircle size={14} className="mr-1" />
                            Completed At
                          </p>
                          <p className="text-base font-semibold text-gray-900">
                            {new Date(trainee.completed_at).toLocaleString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-gray-500 mb-1 flex items-center">
                          <Clock size={14} className="mr-1" />
                          Status
                        </p>
                        <span className={`px-3 py-1.5 inline-flex items-center text-xs leading-5 font-bold rounded-full shadow-sm ${
                          trainee.status === 'completed' ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300' :
                          trainee.status === 'enrolled' ? 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-300' :
                          'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300'
                        }`}>
                          {trainee.status === 'completed' && <CheckCircle size={12} className="mr-1" />}
                          {trainee.status ? trainee.status.charAt(0).toUpperCase() + trainee.status.slice(1) : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="mx-auto text-gray-400 mb-4" size={48} />
                <p className="text-gray-500 font-medium">No trainees enrolled</p>
                <p className="text-sm text-gray-400 mt-1">No trainees have been enrolled in this class yet.</p>
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
          setSelectedClass(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Class"
        message={`Are you sure you want to delete this class? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
};

export default ClassesScreen;
