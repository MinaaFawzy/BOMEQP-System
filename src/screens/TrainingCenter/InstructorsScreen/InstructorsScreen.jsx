import { useEffect, useState, useMemo } from 'react';
import { trainingCenterAPI } from '../../../services/api';
import { useHeader } from '../../../context/HeaderContext';
import { getAuthToken } from '../../../config/api';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://aeroenix.com/v1/api';
import { Users, Plus, Edit, Trash2, Eye, Mail, Phone, Search, Filter, CheckCircle, Clock, XCircle, ChevronUp, ChevronDown, X, Globe, Send, Building2, BookOpen } from 'lucide-react';
import Modal from '../../../components/Modal/Modal';
import ConfirmDialog from '../../../components/ConfirmDialog/ConfirmDialog';
import Pagination from '../../../components/Pagination/Pagination';
import './InstructorsScreen.css';
import FormInput from '../../../components/FormInput/FormInput';

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
  const [courses, setCourses] = useState([]);
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
    id_number: '',
    cv: null,
    specializations: '',
  });
  const [cvFile, setCvFile] = useState(null);
  const [cvFileName, setCvFileName] = useState('');
  const [existingCvUrl, setExistingCvUrl] = useState('');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [pagination, setPagination] = useState({
    currentPage: 1,
    perPage: 10,
    totalPages: 1,
    totalItems: 0,
  });

  // List of languages
  const languages = [
    'English', 'Arabic', 'French', 'Spanish', 'German', 'Italian', 'Portuguese', 
    'Russian', 'Chinese', 'Japanese', 'Korean', 'Hindi', 'Turkish', 'Dutch', 
    'Swedish', 'Norwegian', 'Danish', 'Finnish', 'Polish', 'Czech', 'Greek', 
    'Hebrew', 'Thai', 'Vietnamese', 'Indonesian', 'Malay', 'Tagalog', 'Urdu',
    'Persian', 'Bengali', 'Punjabi', 'Tamil', 'Telugu', 'Marathi', 'Gujarati'
  ];

  useEffect(() => {
    loadInstructors();
  }, [pagination.currentPage, pagination.perPage, searchTerm]); // statusFilter is handled client-side

  useEffect(() => {
    setHeaderTitle('Instructors');
    setHeaderSubtitle('Manage your instructors');
    setHeaderActions(
      <button
        onClick={() => handleOpenModal()}
        className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 flex items-center transition-all duration-200 hover:scale-105"
      >
        <Plus size={20} className="mr-2" />
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

  const loadInstructors = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.currentPage,
        per_page: pagination.perPage,
      };
      
      // Only send searchTerm to API, statusFilter is handled client-side
      if (searchTerm) {
        params.search = searchTerm;
      }
      
      const data = await trainingCenterAPI.listInstructors(params);
      
      let instructorsArray = [];
      if (data?.data) {
        instructorsArray = Array.isArray(data.data) ? data.data : (data.data?.instructors || []);
        setPagination(prev => ({
          ...prev,
          totalPages: data.last_page || data.total_pages || 1,
          totalItems: data.total || 0,
        }));
      } else if (data?.instructors) {
        instructorsArray = data.instructors;
        setPagination(prev => ({
          ...prev,
          totalPages: 1,
          totalItems: data.instructors?.length || 0,
        }));
      } else if (Array.isArray(data)) {
        instructorsArray = data;
        setPagination(prev => ({
          ...prev,
          totalPages: 1,
          totalItems: data.length,
        }));
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
  
  const handlePageChange = (page) => {
    setPagination(prev => ({ ...prev, currentPage: page }));
  };
  
  const handlePerPageChange = (perPage) => {
    setPagination(prev => ({ ...prev, perPage, currentPage: 1 }));
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
          ? instructor.specializations.join(', ') 
          : instructor.specializations || '',
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
        specializations: '',
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
      specializations: '',
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

  const handleLanguageSelect = (e) => {
    const language = e.target.value;
    if (language && !formData.specializations.split(',').map(s => s.trim()).includes(language)) {
      const currentSpecializations = formData.specializations.trim();
      const newSpecializations = currentSpecializations 
        ? `${currentSpecializations}, ${language}`
        : language;
      setFormData({
        ...formData,
        specializations: newSpecializations,
      });
      setSelectedLanguage('');
      setErrors({});
    }
  };

  const handleRemoveLanguage = (languageToRemove) => {
    const currentSpecializations = formData.specializations
      .split(',')
      .map(s => s.trim())
      .filter(s => s && s !== languageToRemove)
      .join(', ');
    setFormData({
      ...formData,
      specializations: currentSpecializations,
    });
  };

  const getSelectedLanguages = () => {
    return formData.specializations
      .split(',')
      .map(s => s.trim())
      .filter(s => s);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});

    try {
      // Prepare submit data - convert specializations to array and clean up empty fields
      const specializationsArray = formData.specializations
        ? formData.specializations.split(',').map(s => s.trim()).filter(s => s)
        : [];

      // Use FormData for file upload
      const submitData = new FormData();
      submitData.append('first_name', formData.first_name.trim());
      submitData.append('last_name', formData.last_name.trim());
      submitData.append('email', formData.email.trim());
      
      if (formData.phone?.trim()) {
        submitData.append('phone', formData.phone.trim());
      }
      if (formData.id_number?.trim()) {
        submitData.append('id_number', formData.id_number.trim());
      }
      
      // Append CV file if a new file is selected
      if (cvFile) {
        submitData.append('cv', cvFile);
      }
      
      // Append specializations as array
      if (specializationsArray.length > 0) {
        specializationsArray.forEach(spec => {
          submitData.append('specializations[]', spec);
        });
      }

      console.log('Submitting instructor data with FormData');

      if (selectedInstructor) {
        await trainingCenterAPI.updateInstructor(selectedInstructor.id, submitData);
      } else {
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
      course_ids: [],
    });
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
    } catch (error) {
      console.error('Failed to load request form data:', error);
      setAccs([]);
    }
  };

  const handleAccChange = async (accId) => {
    // Clear courses immediately when ACC changes
    setRequestForm({ ...requestForm, acc_id: accId, course_ids: [] });
    setCourses([]);
    
    if (!accId) {
      return;
    }

    try {
      const token = getAuthToken();
      const baseURL = import.meta.env.VITE_API_BASE_URL || 'https://aeroenix.com/v1/api';
      
      // Try to get courses directly from ACC endpoint (same as ClassesScreen)
      const endpoints = [
        `${baseURL}/training-center/accs/${accId}/courses`,
        `${baseURL}/acc/${accId}/courses`,
        `${baseURL}/training-center/courses?acc_id=${accId}`,
      ];
      
      let courses = [];
      
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
          courses = data.courses || data.data || data || [];
          
          if (courses.length > 0) {
            // Ensure all courses have acc_id set
            courses = courses.map(course => ({
              ...course,
              acc_id: parseInt(accId),
            }));
            break; // Success, exit loop
          }
        } catch (error) {
          // Continue to next endpoint
          continue;
        }
      }
      
      // If direct endpoint didn't work, fallback to classes
      if (courses.length === 0) {
        try {
          const classesData = await trainingCenterAPI.listClasses({ acc_id: accId });
          const classesList = classesData?.classes || classesData?.data || [];
          
          const courseMap = new Map();
          classesList.forEach(cls => {
            // Verify the class belongs to the selected ACC
            const classAccId = cls.acc_id || cls.acc?.id;
            if (classAccId && parseInt(classAccId) === parseInt(accId) && cls.course) {
              const courseObj = typeof cls.course === 'object' ? cls.course : { id: cls.course, name: cls.course };
              const courseKey = courseObj.id || courseObj.name;
              
              if (courseKey && !courseMap.has(courseKey)) {
                courseMap.set(courseKey, {
                  ...courseObj,
                  acc_id: parseInt(accId),
                });
                courses.push(courseMap.get(courseKey));
              }
            }
          });
        } catch (err) {
          console.error('Failed to load courses from classes:', err);
        }
      }
      
      // Final filter: ensure all courses belong to the selected ACC
      const filteredCourses = courses.filter(course => {
        const courseAccId = course.acc_id || course.acc?.id;
        return courseAccId && parseInt(courseAccId) === parseInt(accId);
      });
      
      setCourses(filteredCourses);
    } catch (error) {
      console.error('Failed to load courses:', error);
      setCourses([]);
    }
  };

  const handleCourseToggle = (courseId) => {
    setRequestForm(prev => {
      const courseIds = prev.course_ids || [];
      if (courseIds.includes(courseId)) {
        return { ...prev, course_ids: courseIds.filter(id => id !== courseId) };
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
      if (!requestForm.acc_id || !requestForm.course_ids || requestForm.course_ids.length === 0) {
        setRequestErrors({ general: 'Please select an ACC and at least one course' });
        setRequesting(false);
        return;
      }

      const submitData = {
        acc_id: parseInt(requestForm.acc_id),
        course_ids: requestForm.course_ids.map(id => parseInt(id)),
      };

      await trainingCenterAPI.requestInstructorAuthorization(selectedInstructor.id, submitData);
      setRequestAuthModalOpen(false);
      setRequestForm({
        acc_id: '',
        course_ids: [],
      });
      setSelectedInstructor(null);
      alert('Authorization request submitted successfully!');
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

  // Sort instructors
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Filter and sort instructors (status filtering is done client-side)
  const filteredAndSortedInstructors = useMemo(() => {
    let filtered = [...instructors];

    // Apply status filter (client-side)
    if (statusFilter !== 'all') {
      filtered = filtered.filter(instructor => instructor.status === statusFilter);
    }

    // Apply sorting
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aValue, bValue;
        
        if (sortConfig.key === 'name') {
          aValue = `${a.first_name || ''} ${a.last_name || ''}`.trim().toLowerCase();
          bValue = `${b.first_name || ''} ${b.last_name || ''}`.trim().toLowerCase();
        } else {
          aValue = a[sortConfig.key] || '';
          bValue = b[sortConfig.key] || '';
        }
        
        if (typeof aValue === 'string') {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }
        
        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    
    return filtered;
  }, [instructors, statusFilter, sortConfig]);

  // Calculate stats - use pagination.totalItems for total, status counts from current page only
  // Note: Status counts are approximate (current page only) since we use server-side pagination
  const totalCount = pagination.totalItems || instructors.length;
  const activeCount = instructors.filter(i => i.status === 'active').length;
  const pendingCount = instructors.filter(i => i.status === 'pending').length;
  const suspendedCount = instructors.filter(i => i.status === 'suspended').length;

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;
  }

  return (
    <div className="space-y-4">

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Instructors */}
        <div 
          onClick={() => setStatusFilter('all')}
          className={`bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl shadow-lg p-6 border border-primary-200 hover:shadow-xl transition-all duration-300 cursor-pointer ${
            statusFilter === 'all' ? 'ring-2 ring-primary-500' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-primary-700 mb-2">Total Instructors</p>
              <p className="text-3xl font-bold text-primary-900">{totalCount}</p>
            </div>
            <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg">
              <Users className="text-white" size={32} />
            </div>
          </div>
        </div>

        {/* Active */}
        <div 
          onClick={() => setStatusFilter('active')}
          className={`bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-lg p-6 border border-green-200 hover:shadow-xl transition-all duration-300 cursor-pointer ${
            statusFilter === 'active' ? 'ring-2 ring-green-500' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-700 mb-2">Active</p>
              <p className="text-3xl font-bold text-green-900">{activeCount}</p>
            </div>
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
              <CheckCircle className="text-white" size={32} />
            </div>
          </div>
        </div>

        {/* Pending */}
        <div 
          onClick={() => setStatusFilter('pending')}
          className={`bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl shadow-lg p-6 border border-yellow-200 hover:shadow-xl transition-all duration-300 cursor-pointer ${
            statusFilter === 'pending' ? 'ring-2 ring-yellow-500' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-700 mb-2">Pending</p>
              <p className="text-3xl font-bold text-yellow-900">{pendingCount}</p>
            </div>
            <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center shadow-lg">
              <Clock className="text-white" size={32} />
            </div>
          </div>
        </div>

        {/* Suspended */}
        <div 
          onClick={() => setStatusFilter('suspended')}
          className={`bg-gradient-to-br from-red-50 to-red-100 rounded-xl shadow-lg p-6 border border-red-200 hover:shadow-xl transition-all duration-300 cursor-pointer ${
            statusFilter === 'suspended' ? 'ring-2 ring-red-500' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-700 mb-2">Suspended</p>
              <p className="text-3xl font-bold text-red-900">{suspendedCount}</p>
            </div>
            <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
              <XCircle className="text-white" size={32} />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter Section */}
      <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-100">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search Input */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPagination(prev => ({ ...prev, currentPage: 1 }));
              }}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
            />
          </div>
          
          {/* Status Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-10 pr-8 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none bg-white cursor-pointer transition-all"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="suspended">Suspended</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="table-header-gradient">
              <tr>
                <th 
                  className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-primary-700 transition-colors select-none"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-2">
                    Instructor
                    {sortConfig.key === 'name' && (
                      sortConfig.direction === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                    )}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-primary-700 transition-colors select-none"
                  onClick={() => handleSort('email')}
                >
                  <div className="flex items-center gap-2">
                    Email
                    {sortConfig.key === 'email' && (
                      sortConfig.direction === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                    )}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-primary-700 transition-colors select-none"
                  onClick={() => handleSort('phone')}
                >
                  <div className="flex items-center gap-2">
                    Phone
                    {sortConfig.key === 'phone' && (
                      sortConfig.direction === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                    )}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-primary-700 transition-colors select-none"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center justify-center gap-2">
                    Status
                    {sortConfig.key === 'status' && (
                      sortConfig.direction === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                    )}
                  </div>
                </th>
                <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider">Languages</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filteredAndSortedInstructors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <Users className="text-gray-400" size={32} />
                      </div>
                      <p className="text-gray-500 font-medium">
                        {searchTerm || statusFilter !== 'all' ? 'No instructors found matching your search' : 'No instructors found'}
                      </p>
                      <p className="text-sm text-gray-400 mt-1">
                        {searchTerm || statusFilter !== 'all' ? 'Try adjusting your search criteria' : 'Add your first instructor to get started!'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAndSortedInstructors.map((instructor, index) => {
                  const statusConfig = {
                    active: { bg: 'from-green-100 to-green-200', text: 'text-green-800', border: 'border-green-300', icon: CheckCircle },
                    pending: { bg: 'from-yellow-100 to-yellow-200', text: 'text-yellow-800', border: 'border-yellow-300', icon: Clock },
                    suspended: { bg: 'from-red-100 to-red-200', text: 'text-red-800', border: 'border-red-300', icon: XCircle },
                    inactive: { bg: 'from-gray-100 to-gray-200', text: 'text-gray-800', border: 'border-gray-300', icon: Clock },
                  };
                  const config = statusConfig[instructor.status] || statusConfig.inactive;
                  const StatusIcon = config.icon;
                  
                  // Get languages/specializations
                  const instructorLanguages = Array.isArray(instructor.specializations) 
                    ? instructor.specializations 
                    : (instructor.specializations ? instructor.specializations.split(',').map(s => s.trim()).filter(s => s) : []);
                  
                  return (
                    <tr
                      key={instructor.id || index}
                      className="hover:bg-gradient-to-r hover:from-primary-50/30 hover:to-white transition-all duration-200 cursor-pointer group table-row-animated"
                      onClick={() => handleViewDetails(instructor)}
                      style={{ '--animation-delay': `${index * 0.03}s` }}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg flex items-center justify-center mr-3 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                            <Users className="h-5 w-5 text-primary-600" />
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-900 group-hover:text-primary-700 transition-colors">
                              {instructor.first_name} {instructor.last_name}
                            </div>
                            {instructor.id_number && (
                              <div className="text-xs text-gray-500">ID: {instructor.id_number}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-600">
                          <Mail className="h-4 w-4 mr-2 text-gray-400" />
                          {instructor.email}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {instructor.phone ? (
                          <div className="flex items-center text-sm text-gray-600">
                            <Phone className="h-4 w-4 mr-2 text-gray-400" />
                            {instructor.phone}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <span className={`px-3 py-1.5 inline-flex items-center text-xs leading-5 font-bold rounded-full shadow-sm bg-gradient-to-r ${config.bg} ${config.text} border ${config.border}`}>
                          <StatusIcon size={14} className="mr-1" />
                          {instructor.status ? instructor.status.charAt(0).toUpperCase() + instructor.status.slice(1) : 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        {instructorLanguages.length > 0 ? (
                          <div className="flex flex-wrap gap-1 justify-center items-center">
                            {instructorLanguages.slice(0, 2).map((lang, langIndex) => (
                              <span
                                key={langIndex}
                                className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-primary-100 text-primary-800 border border-primary-200"
                              >
                                <Globe size={12} className="mr-1" />
                                {lang}
                              </span>
                            ))}
                            {instructorLanguages.length > 2 && (
                              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                                +{instructorLanguages.length - 2}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenModal(instructor);
                            }}
                            className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 hover:scale-110 transition-all duration-200 shadow-sm hover:shadow-md"
                            title="Edit"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRequestAuthorization(instructor);
                            }}
                            className="p-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 hover:scale-110 transition-all duration-200 shadow-sm hover:shadow-md"
                            title="Request Authorization"
                          >
                            <Send size={16} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(instructor);
                            }}
                            className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 hover:scale-110 transition-all duration-200 shadow-sm hover:shadow-md"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {!loading && pagination.totalItems > 0 && (
          <Pagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            perPage={pagination.perPage}
            onPageChange={handlePageChange}
            onPerPageChange={handlePerPageChange}
          />
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={selectedInstructor ? 'Edit Instructor' : 'Add New Instructor'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              CV (PDF)
            </label>
            <div className="space-y-2">
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 cursor-pointer"
              />
              {cvFileName && (
                <p className="text-sm text-gray-600">
                  Selected: <span className="font-medium">{cvFileName}</span>
                </p>
              )}
              {existingCvUrl && !cvFile && (
                <div className="p-2 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-xs text-gray-500 mb-1">Current CV:</p>
                  <a
                    href={existingCvUrl.startsWith('http') ? existingCvUrl : `${API_BASE_URL}${existingCvUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary-600 hover:text-primary-700 underline"
                  >
                    View Current CV
                  </a>
                </div>
              )}
              <p className="text-xs text-gray-500">
                PDF only, maximum 10MB
              </p>
              {errors.cv && (
                <p className="text-sm text-red-600">{errors.cv}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Languages
            </label>
            <div className="relative">
              <select
                value={selectedLanguage}
                onChange={handleLanguageSelect}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none bg-white cursor-pointer transition-all"
              >
                <option value="">Select a language...</option>
                {languages
                  .filter(lang => !getSelectedLanguages().includes(lang))
                  .map((lang) => (
                    <option key={lang} value={lang}>
                      {lang}
                    </option>
                  ))}
              </select>
            </div>
            {getSelectedLanguages().length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {getSelectedLanguages().map((lang, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800 border border-primary-200"
                  >
                    {lang}
                    <button
                      type="button"
                      onClick={() => handleRemoveLanguage(lang)}
                      className="ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-primary-200 transition-colors"
                    >
                      <X size={12} className="text-primary-600" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {errors.specializations && (
              <p className="mt-1 text-sm text-red-600">{errors.specializations}</p>
            )}
          </div>

          {errors.general && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600 font-medium">{errors.general}</p>
            </div>
          )}
          
          {/* Display field-specific errors */}
          {Object.keys(errors).filter(key => key !== 'general' && key !== 'specializations').map((key) => (
            errors[key] && (
              <p key={key} className="text-sm text-red-600">
                {key}: {errors[key]}
              </p>
            )
          ))}

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={handleCloseModal}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">First Name</p>
                <p className="text-base font-semibold text-gray-900">{selectedInstructor.first_name || 'N/A'}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Last Name</p>
                <p className="text-base font-semibold text-gray-900">{selectedInstructor.last_name || 'N/A'}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1 flex items-center">
                  <Mail size={16} className="mr-2" />
                  Email
                </p>
                <p className="text-base font-semibold text-gray-900">{selectedInstructor.email || 'N/A'}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1 flex items-center">
                  <Phone size={16} className="mr-2" />
                  Phone
                </p>
                <p className="text-base font-semibold text-gray-900">{selectedInstructor.phone || 'N/A'}</p>
              </div>
              {selectedInstructor.id_number && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">ID Number</p>
                  <p className="text-base font-semibold text-gray-900">{selectedInstructor.id_number}</p>
                </div>
              )}
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Status</p>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                  selectedInstructor.status === 'active' ? 'bg-green-100 text-green-800' :
                  selectedInstructor.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  selectedInstructor.status === 'suspended' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {selectedInstructor.status}
                </span>
              </div>
            </div>
            {selectedInstructor.specializations && selectedInstructor.specializations.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Specializations</h3>
                <div className="flex flex-wrap gap-2">
                  {Array.isArray(selectedInstructor.specializations) ? (
                    selectedInstructor.specializations.map((spec, index) => (
                      <span key={index} className="px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-sm">
                        {spec}
                      </span>
                    ))
                  ) : (
                    <span className="px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-sm">
                      {selectedInstructor.specializations}
                    </span>
                  )}
                </div>
              </div>
            )}
            {selectedInstructor.cv_url && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-2">CV</p>
                <a
                  href={selectedInstructor.cv_url.startsWith('http') 
                    ? selectedInstructor.cv_url 
                    : `${API_BASE_URL}${selectedInstructor.cv_url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <BookOpen size={16} className="mr-2" />
                  View CV (PDF)
                </a>
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
            course_ids: [],
          });
          setRequestErrors({});
          setCourses([]);
        }}
        title={`Request Authorization for ${selectedInstructor ? `${selectedInstructor.first_name} ${selectedInstructor.last_name}` : 'Instructor'}`}
        size="lg"
      >
        <form onSubmit={handleRequestSubmit} className="space-y-4">
          {requestErrors.general && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{requestErrors.general}</p>
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
            <p className="text-sm text-yellow-600 mt-1">
              No approved ACCs found. Please request and get approval from an ACC first.
            </p>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Courses <span className="text-red-500 ml-1">*</span>
            </label>
            {!requestForm.acc_id ? (
              <p className="text-sm text-gray-500">Please select an ACC first</p>
            ) : courses.length === 0 ? (
              <p className="text-sm text-yellow-600">No courses available for the selected ACC</p>
            ) : (
              <div className="max-h-60 overflow-y-auto border border-gray-300 rounded-lg p-3 space-y-2">
                {courses.map(course => (
                  <label
                    key={course.id || course.name}
                    className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={requestForm.course_ids?.includes(course.id) || false}
                      onChange={() => handleCourseToggle(course.id)}
                      className="mr-3 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-900">{course.name || course.code || `Course ${course.id}`}</span>
                  </label>
                ))}
              </div>
            )}
            {requestErrors.course_ids && <p className="mt-1 text-sm text-red-600">{requestErrors.course_ids}</p>}
          </div>

          <div className="flex space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => {
                setRequestAuthModalOpen(false);
                setRequestErrors({});
              }}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={requesting}
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
