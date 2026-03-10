import { useEffect, useState, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { trainingCenterAPI } from '../../../services/api';
import { useHeader } from '../../../context/HeaderContext';
import useDebounce from '../../../hooks/useDebounce';
import axios from 'axios';
import { GraduationCap, Plus, Edit, Trash2, Eye, CheckCircle, Users, Calendar, MapPin, Clock, XCircle, Mail, Phone, Hash, Search, X, BookOpen, Building2, Download, Upload, Award, CheckSquare, UserCheck } from 'lucide-react';
import Modal from '../../../components/Modal/Modal';
import ConfirmDialog from '../../../components/ConfirmDialog/ConfirmDialog';
import TabCard from '../../../components/TabCard/TabCard';
import DataTable from '../../../components/DataTable/DataTable';
import DetailForm from '../../../components/DetailForm/DetailForm';
import Pagination from '../../../components/Pagination/Pagination';
import LoadingSpinner from '../../../components/LoadingSpinner/LoadingSpinner';
import TraineeSection from '../../../components/TraineeSection/TraineeSection';
import './ClassesScreen.css';
import FormInput from '../../../components/FormInput/FormInput';

const ClassesScreen = () => {
  const { t } = useTranslation('training_center');
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

  // Grades & Certificates State
  const [grades, setGrades] = useState({});
  const [isSavingGrades, setIsSavingGrades] = useState(false);
  const [isUploadingCSV, setIsUploadingCSV] = useState(false);
  const [isGeneratingCerts, setIsGeneratingCerts] = useState(false);
  const [expandedTraineeIds, setExpandedTraineeIds] = useState(new Set());

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
    name: '',
    instructor_id: '',
    start_date: '',
    end_date: '',
    exam_date: '',
    exam_score: '',
    success_grade: '',
    location: 'physical',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');

  // Pagination State
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const hasDataRef = useRef(false);

  // Statistics State
  const [stats, setStats] = useState({
    total: 0,
    scheduled: 0,
    in_progress: 0,
    completed: 0,
    cancelled: 0
  });

  useEffect(() => {
    // Only show full loading spinner if we don't have data yet
    const showLoading = !hasDataRef.current;

    if (searchTerm !== debouncedSearchTerm) {
      return;
    }

    loadData(page, perPage, debouncedSearchTerm, statusFilter, showLoading);
  }, [page, perPage, debouncedSearchTerm, statusFilter, searchTerm]);

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
    setHeaderTitle(t('classes_screen.header.title'));
    setHeaderSubtitle(t('classes_screen.header.subtitle'));
    setHeaderActions(
      <button
        onClick={() => handleOpenModal()}
        className="header-create-btn"
      >
        <Plus size={20} className="header-create-btn-icon" />
        {t('classes_screen.header.create')}
      </button>
    );
    return () => {
      setHeaderActions(null);
      setHeaderTitle(null);
      setHeaderSubtitle(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setHeaderActions, setHeaderTitle, setHeaderSubtitle, t]);

  // Load instructors separately to avoid reloading on search
  useEffect(() => {
    const loadInstructors = async () => {
      try {
        const instructorsData = await trainingCenterAPI.listInstructors();
        setInstructors(instructorsData?.instructors || instructorsData?.data || []);
      } catch (error) {
        console.error('Failed to load instructors:', error);
      }
    };
    loadInstructors();
  }, []);

  const loadData = async (pageArg = 1, limitArg = 10, search = '', status = 'all', showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    } else {
      setIsSearchLoading(true);
    }
    try {
      // Load data with pagination, search, and status filter
      const classesData = await trainingCenterAPI.listClasses({
        page: pageArg,
        per_page: limitArg,
        ...(search && { search }),
        ...(status !== 'all' && { status })
      });

      let classesArray = [];
      if (classesData?.data) {
        classesArray = Array.isArray(classesData.data) ? classesData.data : [];
      } else if (classesData?.classes) {
        classesArray = Array.isArray(classesData.classes) ? classesData.classes : [];
      } else if (Array.isArray(classesData)) {
        classesArray = classesData;
      }

      setClasses(classesArray);

      // Update pagination info
      if (classesData) {
        const total = classesData.total || classesArray.length;
        setTotalItems(total);
        setTotalPages(classesData.last_page || Math.ceil(total / limitArg) || 1);
      }

      // Update statistics from API response
      if (classesData.statistics) {
        setStats({
          total: classesData.statistics.total || 0,
          scheduled: classesData.statistics.scheduled || 0,
          in_progress: classesData.statistics.in_progress || 0,
          completed: classesData.statistics.completed || 0,
          cancelled: classesData.statistics.cancelled || 0
        });
      }

      hasDataRef.current = true;
    } catch (error) {
      console.error('Failed to load data:', error);
      setClasses([]);
    } finally {
      setLoading(false);
      setIsSearchLoading(false);
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
          const baseURL = import.meta.env.VITE_API_BASE_URL || 'https://app.bomeqp.com/api/api';

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

  // Load available trainees for the training provider
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

  // Grades and Certificates Handlers
  const handleSaveGrades = async () => {
    if (!selectedClassForEnrollment) return;
    setIsSavingGrades(true);
    try {
      // Build a set of trainee IDs who already have a certificate — skip them
      const traineesWithCertificate = new Set(
        (selectedClassForEnrollment.trainees || [])
          .filter(tr => tr.certificate !== null && tr.certificate !== undefined)
          .map(tr => String(tr.id || tr.trainee_id))
      );

      const gradesArray = Object.keys(grades)
        .filter(id => !traineesWithCertificate.has(id)) // exclude already-certified trainees
        .map(id => ({
          trainee_id: parseInt(id),
          score: grades[id] !== '' && grades[id] !== null ? parseFloat(grades[id]) : null
        }))
        .filter(g => g.score !== null);

      const response = await trainingCenterAPI.saveClassGrades(selectedClassForEnrollment.id, { grades: gradesArray });

      // Only update the grades of trainees from the response — don't replace the whole class object
      const returnedGrades = response?.grades || response?.data?.grades || [];
      if (returnedGrades.length > 0) {
        // Build a quick lookup map: trainee_id -> updated grade data
        const gradeMap = {};
        returnedGrades.forEach(g => {
          gradeMap[g.trainee_id] = g;
        });

        setSelectedClassForEnrollment(prev => ({
          ...prev,
          trainees: (prev.trainees || []).map(tr => {
            const id = tr.id || tr.trainee_id;
            const updated = gradeMap[id];
            if (!updated) return tr;
            return {
              ...tr,
              exam_score: updated.score ?? updated.exam_score ?? tr.exam_score,
              exam_status: updated.exam_status ?? tr.exam_status,
            };
          }),
        }));
      }

      loadData(page, perPage, debouncedSearchTerm, statusFilter, false);
      alert(t('classes_screen.grades.save_success'));
    } catch (error) {
      const data = error.response?.data;
      let errorMsg = t('classes_screen.grades.save_error');

      if (data) {
        if (data.message) {
          errorMsg = data.message;
        }
      }
      alert(errorMsg);
    } finally {
      setIsSavingGrades(false);
    }
  };

  const handleDownloadGradesTemplate = async () => {
    if (!selectedClassForEnrollment) return;
    try {
      const response = await trainingCenterAPI.exportClassGradesTemplate(selectedClassForEnrollment.id);
      // The response is a blob because we used responseType: 'blob'
      const blob = response.data || response;
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `class_${selectedClassForEnrollment.id}_grades.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (error) {
      alert(t('classes_screen.grades.download_error'));
    }
  };

  const handleUploadGradesCSV = async (event) => {
    const file = event.target.files[0];
    if (!file || !selectedClassForEnrollment) return;

    setIsUploadingCSV(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await trainingCenterAPI.importClassGrades(selectedClassForEnrollment.id, formData);
      alert(t('classes_screen.grades.upload_success'));

      // Reload class details to show updated grades
      const updatedData = await trainingCenterAPI.getClassDetails(selectedClassForEnrollment.id);
      const updatedClass = updatedData?.data?.class || updatedData?.class || updatedData?.data || updatedData;
      if (updatedClass) {
        setSelectedClassForEnrollment(updatedClass);
        const newGrades = {};
        if (updatedClass.trainees && Array.isArray(updatedClass.trainees)) {
          updatedClass.trainees.forEach(t => {
            newGrades[t.id || t.trainee_id] = t.exam_score !== null && t.exam_score !== undefined ? t.exam_score : '';
          });
        }
        setGrades(newGrades);
        loadData(page, perPage, debouncedSearchTerm, statusFilter, false);
      }
    } catch (error) {
      const data = error.response?.data;
      let errorMsg = t('classes_screen.grades.upload_error') + ': ';

      if (data) {
        if (data.message) {
          errorMsg = data.message;
        } else {
          errorMsg += error.message;
        }
      } else {
        errorMsg += error.message;
      }
      alert(errorMsg);
    } finally {
      setIsUploadingCSV(false);
      event.target.value = null; // reset file input
    }
  };

  const handleGenerateCertificates = async () => {
    if (!selectedClassForEnrollment) return;
    if (!window.confirm(t('classes_screen.grades.generate_confirm'))) return;

    setIsGeneratingCerts(true);
    try {
      const resp = await trainingCenterAPI.generateClassCertificates(selectedClassForEnrollment.id, {});
      const data = resp.data || resp;

      let successMsg = data.message || t('classes_screen.grades.generate_success');

      alert(successMsg);

      // Reload class details
      const updatedData = await trainingCenterAPI.getClassDetails(selectedClassForEnrollment.id);
      const updatedClass = updatedData?.data?.class || updatedData?.class || updatedData?.data || updatedData;
      if (updatedClass) {
        setSelectedClassForEnrollment(updatedClass);
        loadData(page, perPage, debouncedSearchTerm, statusFilter, false);
      }
    } catch (error) {
      const data = error.response?.data;
      let errorMsg = t('classes_screen.grades.generate_error') + ': ';

      if (data) {
        if (data.message) {
          errorMsg = data.message;
        } else {
          errorMsg += error.message;
        }
      } else {
        errorMsg += error.message;
      }
      alert(errorMsg);
    } finally {
      setIsGeneratingCerts(false);
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
        name: classItem.name || '',
        instructor_id: classItem.instructor_id || '',
        start_date: classItem.start_date ? classItem.start_date.split('T')[0] : '',
        end_date: classItem.end_date ? classItem.end_date.split('T')[0] : '',
        exam_date: classItem.exam_date ? classItem.exam_date.split('T')[0] : '',
        exam_score: classItem.exam_score || '',
        success_grade: classItem.success_grade || '',
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
        name: '',
        instructor_id: '',
        start_date: '',
        end_date: '',
        exam_date: '',
        exam_score: '',
        success_grade: '',
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
      name: '',
      instructor_id: '',
      start_date: '',
      end_date: '',
      exam_date: '',
      exam_score: '',
      success_grade: '',
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
          setErrors({ acc_id: t('classes_screen.errors.acc_required') });
          setSaving(false);
          return;
        }
        if (!formData.category_id) {
          setErrors({ category_id: t('classes_screen.errors.category_required') });
          setSaving(false);
          return;
        }
        if (!formData.sub_category_id) {
          setErrors({ sub_category_id: t('classes_screen.errors.sub_category_required') });
          setSaving(false);
          return;
        }
        if (!formData.course_id) {
          setErrors({ course_id: t('classes_screen.errors.course_required') });
          setSaving(false);
          return;
        }
      }

      // These fields are always required (both create and update)
      if (!formData.name) {
        setErrors({ name: t('classes_screen.errors.class_name_required') });
        setSaving(false);
        return;
      }
      if (!formData.instructor_id) {
        setErrors({ instructor_id: t('classes_screen.errors.instructor_required') });
        setSaving(false);
        return;
      }
      if (!formData.start_date) {
        setErrors({ start_date: t('classes_screen.errors.start_date_required') });
        setSaving(false);
        return;
      }
      if (!formData.end_date) {
        setErrors({ end_date: t('classes_screen.errors.end_date_required') });
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
        name: formData.name,
        instructor_id: parseInt(formData.instructor_id),
        start_date: formData.start_date,
        end_date: formData.end_date,
        exam_date: formData.exam_date || null,
        exam_score: formData.exam_score ? parseInt(formData.exam_score) : null,
        success_grade: formData.success_grade ? parseInt(formData.success_grade) : null,
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
      await loadData(page, perPage);
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
        setErrors({ general: error.message || t('classes_screen.errors.save_failed') });
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
      await loadData(page, perPage);
    } catch (error) {
      alert(t('instructor_authorizations.errors.failed_to_load') + ': ' + (error.message || t('instructor_authorizations.status.na')));
    }
    setIsDeleteDialogOpen(false);
    setSelectedClass(null);
  };

  const handleViewDetails = async (classItem) => {
    try {
      const data = await trainingCenterAPI.getClassDetails(classItem.id);
      // Handle different response structures
      let classData = data?.data?.class || data?.class || data?.data || data;

      // Ensure trainees are included
      let trainees = classData?.trainees || data?.data?.trainees || data?.trainees || classItem.trainees || [];

      const mergedClass = { ...classItem, ...classData, trainees };
      if (!mergedClass.course && classItem.course) mergedClass.course = classItem.course;
      if (!mergedClass.instructor && classItem.instructor) mergedClass.instructor = classItem.instructor;

      setSelectedClass(mergedClass);
      setDetailModalOpen(true);
    } catch (error) {
      console.error('Failed to load class details:', error);
      // Fallback to original classItem data
      setSelectedClass(classItem);
      setDetailModalOpen(true);
    }
  };

  const handleMarkComplete = async (classItem) => {
    if (window.confirm(t('classes_screen.details.mark_complete') + '?')) {
      try {
        await trainingCenterAPI.markClassComplete(classItem.id);
        await loadData(page, perPage);
      } catch (error) {
        alert(t('classes_screen.errors.save_failed') + ': ' + (error.message || t('classes_screen.common.na')));
      }
    }
  };

  const handleEnrollmentClick = (row) => {
    const hasTrainees = row.trainees && Array.isArray(row.trainees) && row.trainees.length > 0;
    if (hasTrainees) {
      setSelectedClassForEnrollment(row);
      const initialGrades = {};
      if (row.trainees && Array.isArray(row.trainees)) {
        row.trainees.forEach(t => {
          initialGrades[t.id || t.trainee_id] = t.exam_score !== null && t.exam_score !== undefined ? t.exam_score : '';
        });
      }
      setGrades(initialGrades);
      setEnrollmentModalOpen(true);
    }
  };

  const toggleTraineeExpand = (traineeId) => {
    setExpandedTraineeIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(traineeId)) {
        newSet.delete(traineeId);
      } else {
        newSet.add(traineeId);
      }
      return newSet;
    });
  };

  // Define columns for DataTable
  const columns = useMemo(() => [
    {
      header: t('classes_screen.table.class_name'),
      accessor: 'name',
      sortable: true,
      render: (value, row) => (
        <div className="font-semibold text-gray-900">
          {value || t('classes_screen.common.na')}
        </div>
      )
    },
    {
      header: t('classes_screen.table.course'),
      accessor: 'course',
      sortable: true,
      render: (value, row) => {
        const courseName = typeof row.course === 'string' ? row.course : (row.course?.name || t('classes_screen.common.na'));
        return (
          <div className="course-container">
            <div className="course-name">
              {courseName}
            </div>
          </div >
        );
      },
    },
    {
      header: t('classes_screen.table.instructor'),
      accessor: 'instructor',
      sortable: true,
      render: (value, row) => {
        const instructorName = typeof row.instructor === 'string'
          ? row.instructor
          : (row.instructor?.first_name && row.instructor?.last_name
            ? `${row.instructor.first_name} ${row.instructor.last_name}`
            : t('classes_screen.common.na'));
        return (
          <div className="instructor-container gap-2">
            <Users className="instructor-icon" />
            {instructorName}
          </div>
        );
      },
    },
    {
      header: t('classes_screen.table.start_date'),
      accessor: 'start_date',
      sortable: true,
      render: (value, row) => (
        <div className="date-container gap-2  ">
          <Calendar className="date-icon" />
          {row.start_date ? new Date(row.start_date).toLocaleDateString() : t('classes_screen.common.na')}
        </div>
      ),
    },
    {
      header: t('classes_screen.table.end_date'),
      accessor: 'end_date',
      sortable: true,
      render: (value, row) => (
        <div className="date-container gap-2  ">
          <Calendar className="date-icon" />
          {row.end_date ? new Date(row.end_date).toLocaleDateString() : t('classes_screen.common.na')}
        </div>
      ),
    },
    {
      header: t('classes_screen.table.exam_date'),
      accessor: 'exam_date',
      sortable: true,
      render: (value) => (
        <div className="date-container gap-2  ">
          <Calendar className="date-icon" style={{ color: '#9333ea' }} />
          {value ? new Date(value).toLocaleDateString() : t('classes_screen.common.not_set')}
        </div>
      ),
    },
    {
      header: t('classes_screen.table.grade'),
      accessor: 'exam_score',
      sortable: true,
      render: (value) => (
        <div className="text-sm">
          {value !== null && value !== undefined ? (
            <span className="font-semibold text-indigo-600">{parseInt(value)}</span>
          ) : (
            <span className="text-gray-400">{t('classes_screen.common.na')}</span>
          )}
        </div>
      ),
    },
    {
      header: t('classes_screen.table.success_grade'),
      accessor: 'success_grade',
      sortable: true,
      render: (value) => (
        <div className="text-sm">
          {value !== null && value !== undefined ? (
            <span className="font-semibold text-green-600">{parseInt(value)}</span>
          ) : (
            <span className="text-gray-400">{t('classes_screen.common.na')}</span>
          )}
        </div>
      ),
    },
    {
      header: t('classes_screen.table.status'),
      accessor: 'status',
      sortable: true,
      render: (value, row) => {
        const statusConfig = {
          scheduled: { bg: 'from-yellow-100 to-yellow-200', text: 'text-yellow-800', border: 'border-yellow-300', icon: Clock },
          completed: { bg: 'from-green-100 to-green-200', text: 'text-green-800', border: 'border-green-300', icon: CheckCircle },
          cancelled: { bg: 'from-red-100 to-red-200', text: 'text-red-800', border: 'border-red-300', icon: XCircle },
          in_progress: { bg: 'from-blue-100 to-blue-200', text: 'text-blue-800', border: 'border-blue-300', icon: Clock },
        };
        const config = statusConfig[row.status] || { bg: 'from-gray-100 to-gray-200', text: 'text-gray-800', border: 'border-gray-300', icon: Clock };
        const StatusIcon = config.icon;
        const statusClass = row.status === 'scheduled' ? 'scheduled' :
          row.status === 'completed' ? 'completed' :
            row.status === 'cancelled' ? 'cancelled' : row.status === 'in_progress' ? 'in_progress' : 'default';
        return (
          <div className="status-container">
            <span className={`status-badge ${statusClass}`}>
              <StatusIcon size={14} className="status-icon" />
              {row.status ? t(`classes_screen.status.${row.status}`) : t('classes_screen.common.na')}
            </span>
          </div>
        );
      },
    },
  ], [t, setSelectedClassForEnrollment, setGrades, setEnrollmentModalOpen]);

  // Filter options for DataTable
  const filterOptions = useMemo(() => [
    { value: 'all', label: t('classes_screen.status.all'), filterFn: () => true },
    { value: 'scheduled', label: t('classes_screen.status.scheduled'), filterFn: (row) => row.status === 'scheduled' },
    { value: 'completed', label: t('classes_screen.status.completed'), filterFn: (row) => row.status === 'completed' },
    { value: 'cancelled', label: t('classes_screen.status.cancelled'), filterFn: (row) => row.status === 'cancelled' },
  ], [t]);

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
        hideEdit: classItem.status === 'completed',
      };
    });
  }, [classes]);

  // Use stats from API response instead of calculating from current page
  const totalCount = stats.total;
  const scheduledCount = stats.scheduled;
  const inProgressCount = stats.in_progress;
  const completedCount = stats.completed;
  const cancelledCount = stats.cancelled;

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
      <div className="stats-cards-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        <TabCard
          name={t('classes_screen.stats.total')}
          value={totalCount}
          icon={GraduationCap}
          colorType="indigo"
          isActive={statusFilter === 'all'}
          onClick={() => {
            setStatusFilter('all');
            setPage(1);
          }}
        />
        <TabCard
          name={t('classes_screen.stats.scheduled')}
          value={scheduledCount}
          icon={Calendar}
          colorType="yellow"
          isActive={statusFilter === 'scheduled'}
          onClick={() => {
            setStatusFilter('scheduled');
            setPage(1);
          }}
        />
        <TabCard
          name={t('classes_screen.stats.in_progress')}
          value={stats.in_progress}
          icon={Clock}
          colorType="blue"
          isActive={statusFilter === 'in_progress'}
          onClick={() => {
            setStatusFilter('in_progress');
            setPage(1);
          }}
        />
        <TabCard
          name={t('classes_screen.stats.completed')}
          value={completedCount}
          icon={CheckCircle}
          colorType="green"
          isActive={statusFilter === 'completed'}
          onClick={() => {
            setStatusFilter('completed');
            setPage(1);
          }}
        />
      </div>

      {/* DataTable */}
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
              <p className="empty-state-title">{t('classes_screen.table.no_classes')}</p>
              <p className="empty-state-subtitle">{t('classes_screen.table.no_classes_subtitle')}</p>
            </div>
          ) : t('classes_screen.table.no_classes_filtered')
        }
        searchable={true}
        filterable={false} // We sort by status using TabCards
        searchPlaceholder={t('classes_screen.table.search_placeholder')}
        searchValue={searchTerm}
        onSearch={(value) => {
          setSearchTerm(value);
          setPage(1);
        }}
        sortable={true}
        defaultFilter={statusFilter}
        customActions={[
          {
            icon: <UserCheck size={18} />,
            title: t('classes_screen.table.enrollment'),
            onClick: handleEnrollmentClick,
            show: (row) => row.trainees && Array.isArray(row.trainees) && row.trainees.length > 0,
            className: 'data-table-action-enrollment'
          }
        ]}
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


      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={selectedClass ? t('classes_screen.header.edit') : t('classes_screen.header.create')}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="modal-form">
          {/* Only show ACC, Category, Sub-Category, and Course fields when creating (not editing) */}
          {!selectedClass && (
            <>
              {/* ACC Selection */}
              <FormInput
                label={t('classes_screen.form.accreditation')}
                name="acc_id"
                type="select"
                value={formData.acc_id}
                onChange={handleChange}
                required
                error={errors.acc_id}
                options={[
                  { value: '', label: t('classes_screen.form.select_accreditation') },
                  ...availableACCs.map(acc => ({
                    value: acc.id,
                    label: acc.name || `Accreditation ${acc.id}`
                  }))
                ]}
              />
              {availableACCs.length === 0 && !loading && (
                <div className="form-warning">
                  <p className="form-warning-title">{t('classes_screen.form.no_accreditations')}</p>
                  <p className="form-warning-text">
                    {t('classes_screen.form.no_accreditations_help')}
                  </p>
                </div>
              )}

              {/* Category Selection */}
              <FormInput
                label={t('classes_screen.form.category')}
                name="category_id"
                type="select"
                value={formData.category_id}
                onChange={handleChange}
                required
                disabled={!formData.acc_id || loadingCategories}
                error={errors.category_id}
                options={[
                  { value: '', label: !formData.acc_id ? t('classes_screen.form.select_accreditation') : (loadingCategories ? 'Loading categories...' : t('classes_screen.form.select_category')) },
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
                label={t('classes_screen.form.sub_category')}
                name="sub_category_id"
                type="select"
                value={formData.sub_category_id}
                onChange={handleChange}
                required
                disabled={!formData.acc_id || !formData.category_id || loadingSubCategories}
                error={errors.sub_category_id}
                options={[
                  { value: '', label: !formData.acc_id ? t('classes_screen.form.select_accreditation') : (!formData.category_id ? t('classes_screen.form.select_category_first') : (loadingSubCategories ? 'Loading sub-categories...' : t('classes_screen.form.select_sub_category'))) },
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
                  label={t('classes_screen.form.course')}
                  name="course_id"
                  type="select"
                  value={formData.course_id}
                  onChange={handleChange}
                  required
                  disabled={!formData.acc_id || !formData.category_id || !formData.sub_category_id || loadingCourses}
                  error={errors.course_id}
                  options={[
                    { value: '', label: !formData.acc_id ? t('classes_screen.form.select_accreditation') : (!formData.category_id ? t('classes_screen.form.select_category_first') : (!formData.sub_category_id ? t('classes_screen.form.select_sub_category') : (loadingCourses ? 'Loading courses...' : t('classes_screen.form.select_course')))) },
                    ...availableCourses.map(course => {
                      const courseName = course.name || course.code || `Course ${course.id}`;
                      return { value: course.id, label: courseName };
                    })
                  ]}
                />
                {availableCourses.length === 0 && !loadingCourses && formData.sub_category_id && (
                  <div className="form-warning">
                    <p className="form-warning-title">{t('classes_screen.form.no_courses')}</p>
                    <p className="form-warning-text">
                      {t('classes_screen.form.no_courses_help')}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}


          <FormInput
            label={t('classes_screen.form.class_name')}
            name="name"
            type="text"
            value={formData.name}
            onChange={handleChange}
            required
            placeholder={t('classes_screen.form.class_name_placeholder')}
            error={errors.name}
          />

          <div>
            <FormInput
              label={t('classes_screen.form.instructor')}
              name="instructor_id"
              type="select"
              value={formData.instructor_id}
              onChange={handleChange}
              required
              error={errors.instructor_id}
              options={[
                { value: '', label: t('classes_screen.form.select_instructor') },
                ...(filteredInstructors.length > 0
                  ? filteredInstructors.map(inst => ({
                    value: inst.id,
                    label: `${inst.first_name} ${inst.last_name}${inst.is_assessor ? ' (Assessor)' : ''}`
                  }))
                  : [{ value: '', label: t('classes_screen.form.no_instructors'), disabled: true }]
                )
              ]}
            />
            {selectedCourseData?.assessor_required && filteredInstructors.length === 0 && (
              <div className="form-warning">
                <p className="form-warning-title">
                  ⚠️ {t('classes_screen.form.assessor_required_title')}, {t('classes_screen.form.assessor_required_no')}
                </p>
                <p className="form-warning-text">
                  {t('instructors_screen.mark_as_assessor')}
                </p>
              </div>
            )}
            {selectedCourseData?.assessor_required && filteredInstructors.length > 0 && (
              <p className="form-info">
                ℹ️ {t('classes_screen.form.assessor_required_title')}. {t('classes_screen.form.assessor_required_info')}
              </p>
            )}
          </div>

          <div className="form-grid">
            <FormInput
              label={t('classes_screen.form.start_date')}
              name="start_date"
              type="date"
              value={formData.start_date}
              onChange={handleChange}
              required
              error={errors.start_date}
            />

            <FormInput
              label={t('classes_screen.form.end_date')}
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
              label={t('classes_screen.form.exam_date')}
              name="exam_date"
              type="date"
              value={formData.exam_date}
              onChange={handleChange}
              error={errors.exam_date}
              helpText={t('classes_screen.form.exam_date_help')}
            />

            <FormInput
              label={t('classes_screen.form.grade')}
              name="exam_score"
              type="number"
              value={formData.exam_score}
              onChange={handleChange}
              error={errors.exam_score}
              helpText={t('classes_screen.form.grade_help')}
              min="0"
              max="100"
              step="1"
              required
              inputClassName="no-spinner"
            />

            <FormInput
              label={t('classes_screen.form.success_grade', { defaultValue: 'Pass Mark' })}
              name="success_grade"
              type="number"
              value={formData.success_grade}
              onChange={handleChange}
              error={errors.success_grade}
              helpText={t('classes_screen.form.success_grade_help')}
              min="0"
              max="100"
              step="1"
              required
              inputClassName="no-spinner"
            />
          </div>

          <FormInput
            label={t('classes_screen.form.location')}
            name="location"
            type="select"
            value={formData.location}
            onChange={handleChange}
            required
            error={errors.location}
            options={[
              { value: 'physical', label: t('classes_screen.form.physical') },
              { value: 'online', label: t('classes_screen.form.online') }
            ]}
          />

          <div className="form-group">
            <label className="form-label">
              {t('classes_screen.trainees.title')}
            </label>
            <div className="trainees-selection-container">
              {/* Search Input */}
              <div className="trainees-search-container">
                <Search size={18} className="trainees-search-icon" />
                <input
                  type="text"
                  placeholder={t('classes_screen.trainees.search_placeholder')}
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
                  <span>{t('classes_screen.trainees.selected', { count: selectedTraineeIds.length })}</span>
                </div>
              )}

              {/* Trainees List */}
              <div className="trainees-list-container">
                {loadingTrainees ? (
                  <div className="trainees-loading">
                    <div className="loading-spinner-small"></div>
                    <span>{t('classes_screen.trainees.loading')}</span>
                  </div>
                ) : filteredTrainees.length === 0 ? (
                  <div className="trainees-empty">
                    <Users size={24} className="trainees-empty-icon" />
                    <p className="trainees-empty-text">
                      {traineeSearchTerm ? t('classes_screen.trainees.no_trainees_search') : t('classes_screen.trainees.no_trainees')}
                    </p>
                  </div>
                ) : (
                  <div className="trainees-list">
                    {filteredTrainees.map((trainee) => {
                      const isSelected = selectedTraineeIds.includes(trainee.id);
                      const enrolledData = selectedClass?.trainees?.find(t => (t.id || t.trainee_id) === trainee.id);
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
                              onChange={() => { }}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                          <div className="trainee-avatar" style={{ margin: '0 12px' }}>
                            {trainee.profile_picture_url ? (
                              <img
                                src={trainee.profile_picture_url}
                                alt={`${trainee.first_name} ${trainee.last_name}`}
                                style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'contain', backgroundColor: '#f8fafc' }}
                              />
                            ) : (
                              <div style={{
                                width: '40px', height: '40px', borderRadius: '50%',
                                background: 'linear-gradient(to bottom right, #6366f1, #7c3aed)',
                                color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontWeight: 'bold', fontSize: '14px'
                              }}>
                                {trainee.first_name?.[0]?.toUpperCase() || ""}{trainee.last_name?.[0]?.toUpperCase() || ""}
                              </div>
                            )}
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
                              {enrolledData && enrolledData.exam_score !== null && enrolledData.exam_score !== undefined && (
                                <span className="trainee-detail-item" style={{ marginLeft: 'auto' }}>
                                  <Award size={12} className="text-indigo-600" />
                                  <span className="font-semibold text-indigo-700">
                                    {t('classes_screen.form.grade')}: {parseInt(enrolledData.exam_score)}
                                  </span>
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
              {t('classes_screen.actions.cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="form-btn form-btn-submit"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            >
              {saving ? (
                <>
                  <div className="loading-spinner-small" />
                  {t('classes_screen.actions.saving')}
                </>
              ) : (
                selectedClass ? t('classes_screen.header.update') : t('classes_screen.actions.save')
              )}
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
        title={t('classes_screen.details.title')}
        size="lg"
      >
        {selectedClass && (
          <div className="detail-modal-container">
            {/* Basic Information */}
            <DetailForm
              data={selectedClass}
              fields={[
                {
                  key: 'name',
                  label: t('classes_screen.table.class_name'),
                  render: (value, data) => data.name || t('classes_screen.common.na')
                },
                { key: 'status', label: t('classes_screen.table.status'), type: 'status' },
              ]}
            />

            {/* Course Information */}
            <div className="detail-modal-section detail-modal-section-blue">
              <p className="detail-modal-section-title detail-modal-section-title-blue">{t('classes_screen.details.course_info')}</p>
              <div className="detail-modal-section-grid">
                <div className="detail-modal-section-item">
                  <p className="detail-modal-section-label detail-modal-section-label-blue">{t('classes_screen.table.course')}</p>
                  <p className="detail-modal-section-value detail-modal-section-value-blue">
                    {typeof selectedClass.course === 'string' ? selectedClass.course : (selectedClass.course?.name || t('classes_screen.common.na'))}
                  </p>
                </div>
                {selectedClass.course?.code && (
                  <div className="detail-modal-section-item">
                    <p className="detail-modal-section-label detail-modal-section-label-blue">{t('codes')}</p>
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
                    <p className="detail-modal-section-label detail-modal-section-label-blue">{t('trainees.table.columns.classes')}</p>
                    <p className="detail-modal-section-value detail-modal-section-value-blue">{selectedClass.course.duration}</p>
                  </div>
                )}
                {selectedClass.course?.description && (
                  <div className="detail-modal-section-item detail-modal-section-full">
                    <p className="detail-modal-section-label detail-modal-section-label-blue">{t('accreditations.description')}</p>
                    <p className="detail-modal-section-value detail-modal-section-value-blue">{selectedClass.course.description}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Instructor Information */}
            <div className="detail-modal-section detail-modal-section-purple">
              <p className="detail-modal-section-title detail-modal-section-title-purple">{t('classes_screen.details.instructor_info')}</p>
              <div className="detail-modal-section-grid">
                <div className="detail-modal-section-item">
                  <p className="detail-modal-section-label detail-modal-section-label-purple">{t('classes_screen.table.instructor')}</p>
                  <p className="detail-modal-section-value detail-modal-section-value-purple">
                    {typeof selectedClass.instructor === 'string'
                      ? selectedClass.instructor
                      : (selectedClass.instructor?.first_name && selectedClass.instructor?.last_name
                        ? `${selectedClass.instructor.first_name} ${selectedClass.instructor.last_name}`
                        : t('classes_screen.common.na'))}
                  </p>
                </div>
                {selectedClass.instructor?.email && (
                  <div className="detail-modal-section-item">
                    <p className="detail-modal-section-label detail-modal-section-label-purple">{t('email')}</p>
                    <p className="detail-modal-section-value detail-modal-section-value-purple">{selectedClass.instructor.email}</p>
                  </div>
                )}
                {selectedClass.instructor?.phone && (
                  <div className="detail-modal-section-item">
                    <p className="detail-modal-section-label detail-modal-section-label-purple">{t('phone')}</p>
                    <p className="detail-modal-section-value detail-modal-section-value-purple">{selectedClass.instructor.phone}</p>
                  </div>
                )}
                {selectedClass.instructor?.is_assessor && (
                  <div className="detail-modal-section-item">
                    <p className="detail-modal-section-label detail-modal-section-label-purple">{t('instructors_screen.type')}</p>
                    <p className="detail-modal-section-value detail-modal-section-value-purple">{t('instructors_screen.assessor')}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Schedule Information */}
            <div className="detail-modal-grid">
              <div className="detail-modal-item">
                <p className="detail-modal-label">{t('classes_screen.table.start_date')}</p>
                <p className="detail-modal-value">
                  {selectedClass.start_date ? new Date(selectedClass.start_date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }) : t('classes_screen.common.na')}
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
                <p className="detail-modal-label">{t('classes_screen.table.end_date')}</p>
                <p className="detail-modal-value">
                  {selectedClass.end_date ? new Date(selectedClass.end_date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }) : t('classes_screen.common.na')}
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
                  <p className="detail-modal-label" style={{ color: '#9333ea' }}>{t('classes_screen.table.exam_date')}</p>
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
                  <p className="detail-modal-label" style={{ color: '#4f46e5' }}>{t('classes_screen.table.grade')}</p>
                  <p className="detail-modal-value" style={{ color: '#4338ca', fontWeight: 'bold' }}>
                    {parseInt(selectedClass.exam_score)}
                  </p>
                </div>
              )}
              {selectedClass.success_grade !== null && selectedClass.success_grade !== undefined && (
                <div className="detail-modal-item" style={{ backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }}>
                  <p className="detail-modal-label" style={{ color: '#16a34a' }}>{t('classes_screen.table.success_grade')}</p>
                  <p className="detail-modal-value" style={{ color: '#15803d', fontWeight: 'bold' }}>
                    {parseInt(selectedClass.success_grade)}
                  </p>
                </div>
              )}
            </div>

            {/* Additional Information */}
            <div className="detail-modal-grid">
              <div className="detail-modal-item">
                <p className="detail-modal-label">{t('classes_screen.form.location')}</p>
                <p className="detail-modal-value">
                  {selectedClass.location ? selectedClass.location.charAt(0).toUpperCase() + selectedClass.location.slice(1) : t('classes_screen.common.na')}
                </p>
              </div>
              <div className="detail-modal-item">
                <p className="detail-modal-label">{t('classes_screen.table.enrollment')}</p>
                <p className="detail-modal-value">
                  {selectedClass.enrolled_count || 0} / {selectedClass.course?.max_capacity || t('classes_screen.common.na')}
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
              <p className="detail-modal-section-title detail-modal-section-title-blue">{t('classes_screen.details.enrolled_trainees')}</p>
              <TraineeSection
                trainees={selectedClass.trainees}
                mode="view"
                t={t}
                className="detail-modal-trainees-list"
              />
            </div>

            {/* Additional Fields */}
            {(selectedClass.created_at || selectedClass.updated_at || selectedClass.notes) && (
              <div className="detail-modal-section detail-modal-section-yellow">
                <p className="detail-modal-section-title detail-modal-section-title-yellow">{t('classes_screen.details.additional')}</p>
                <div className="detail-modal-additional-list">
                  {selectedClass.created_at && (
                    <div className="detail-modal-additional-item">
                      <p className="detail-modal-additional-label detail-modal-additional-label-yellow">{t('created_at')}</p>
                      <p className="detail-modal-additional-value detail-modal-additional-value-yellow">
                        {new Date(selectedClass.created_at).toLocaleString('en-US')}
                      </p>
                    </div>
                  )}
                  {selectedClass.updated_at && (
                    <div className="detail-modal-additional-item">
                      <p className="detail-modal-additional-label detail-modal-additional-label-yellow">{t('updated_at')}</p>
                      <p className="detail-modal-additional-value detail-modal-additional-value-yellow">
                        {new Date(selectedClass.updated_at).toLocaleString('en-US')}
                      </p>
                    </div>
                  )}
                  {selectedClass.notes && (
                    <div className="detail-modal-additional-item">
                      <p className="detail-modal-additional-label detail-modal-additional-label-yellow">{t('additional_information')}</p>
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
                  {t('classes_screen.details.mark_complete')}
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
        title={t('classes_screen.details.enrolled_trainees')}
        size="lg"
      >
        {selectedClassForEnrollment && (
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg mb-4">
              <p className="text-sm text-gray-500 mb-1">{t('classes_screen.details.course_info')}</p>
              <p className="text-base font-semibold text-gray-900">
                {selectedClassForEnrollment.course?.name || t('classes_screen.common.na')}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {t('classes_screen.table.enrollment')}: {selectedClassForEnrollment.enrolled_count || 0} / {selectedClassForEnrollment.course?.max_capacity || t('classes_screen.common.na')}
              </p>
            </div>

            {/* Grades and Certs Header Actions */}
            <div className="flex flex-wrap gap-2 justify-end mb-4 bg-white p-3 rounded-lg border border-gray-200">
              <button
                onClick={handleDownloadGradesTemplate}
                className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center shadow-sm"
              >
                <Download size={16} className="mr-1" />
                {t('classes_screen.grades.download_template')}
              </button>

              <label className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center shadow-sm cursor-pointer">
                {isUploadingCSV ? <div className="loading-spinner-small mr-2 border-gray-500"></div> : <Upload size={16} className="mr-1" />}
                {t('classes_screen.grades.upload_csv')}
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleUploadGradesCSV}
                  disabled={isUploadingCSV}
                />
              </label>

              {selectedClassForEnrollment.status === 'completed' && selectedClassForEnrollment.exam_score != null && selectedClassForEnrollment.success_grade != null && (
                <button
                  onClick={handleGenerateCertificates}
                  disabled={isGeneratingCerts}
                  className="px-3 py-1.5 text-sm text-white rounded flex items-center shadow-sm"
                  style={{ backgroundColor: '#1a2c49', hover: '#0f1a33' }}
                >
                  {isGeneratingCerts ? <div className="loading-spinner-small mr-2 border-white"></div> : <Award size={16} className="mr-1" />}
                  {t('classes_screen.grades.generate_certs')}
                </button>
              )}
            </div>

            <TraineeSection
              trainees={selectedClassForEnrollment.trainees}
              mode="edit"
              grades={grades}
              onGradeChange={(traineeId, value) => setGrades({ ...grades, [traineeId]: value })}
              expandedTraineeIds={expandedTraineeIds}
              onToggleExpand={toggleTraineeExpand}
              t={t}
            />

            {/* Save Grades Button */}
            {selectedClassForEnrollment.trainees && selectedClassForEnrollment.trainees.length > 0 && (
              <div className="mt-6 flex justify-end pb-2">
                <button
                  onClick={handleSaveGrades}
                  disabled={isSavingGrades}
                  className="px-5 py-2.5 text-white font-medium rounded-lg flex items-center shadow-md transition-colors"
                  style={{ backgroundColor: '#1a2c49' }}
                >
                  {isSavingGrades ? <div className="loading-spinner-small mr-2 border-white"></div> : <CheckSquare size={18} className="mr-2" />}
                  {t('classes_screen.grades.save_grades')}
                </button>
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
        title={t('classes_screen.actions.delete_title')}
        message={t('classes_screen.actions.delete_confirm')}
        confirmText={t('classes_screen.actions.delete')}
        variant="danger"
      />
    </div>
  );
};

export default ClassesScreen;
