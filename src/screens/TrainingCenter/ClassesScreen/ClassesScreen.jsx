import { useEffect, useState, useMemo } from 'react';
import { trainingCenterAPI } from '../../../services/api';
import { useHeader } from '../../../context/HeaderContext';
import axios from 'axios';
import { GraduationCap, Plus, Edit, Trash2, Eye, CheckCircle, Users, Calendar, MapPin, Search, Filter, ChevronUp, ChevronDown, Clock, XCircle } from 'lucide-react';
import Modal from '../../../components/Modal/Modal';
import ConfirmDialog from '../../../components/ConfirmDialog/ConfirmDialog';
import Pagination from '../../../components/Pagination/Pagination';
import './ClassesScreen.css';
import FormInput from '../../../components/FormInput/FormInput';

const ClassesScreen = () => {
  const { setHeaderActions, setHeaderTitle, setHeaderSubtitle } = useHeader();
  const [classes, setClasses] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [availableCourses, setAvailableCourses] = useState([]);
  const [hasAuthorizations, setHasAuthorizations] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [formData, setFormData] = useState({
    course_id: '',
    class_id: '',
    instructor_id: '',
    start_date: '',
    end_date: '',
    max_capacity: '',
    location: 'physical',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    perPage: 10,
    totalPages: 1,
    totalItems: 0,
  });

  useEffect(() => {
    loadData();
  }, [searchTerm]); // Load all data once, pagination and statusFilter are handled client-side

  useEffect(() => {
    if (isModalOpen) {
      loadAvailableCourses();
    }
  }, [isModalOpen]);

  useEffect(() => {
    setHeaderTitle('Classes');
    setHeaderSubtitle('Manage your training classes');
    setHeaderActions(
      <button
        onClick={() => handleOpenModal()}
        className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 flex items-center transition-all duration-200 hover:scale-105"
      >
        <Plus size={20} className="mr-2" />
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
      const params = {
        page: pagination.currentPage,
        per_page: pagination.perPage,
      };
      
      // Only send searchTerm to API, statusFilter is handled client-side
      if (searchTerm) {
        params.search = searchTerm;
      }
      
      const [classesData, instructorsData] = await Promise.all([
        trainingCenterAPI.listClasses(params),
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
  
  const handlePageChange = (page) => {
    setPagination(prev => ({ ...prev, currentPage: page }));
  };
  
  const handlePerPageChange = (perPage) => {
    setPagination(prev => ({ ...prev, perPage, currentPage: 1 }));
  };

  const loadAvailableCourses = async () => {
    try {
      // Get approved authorizations from /training-center/authorizations
      const authData = await trainingCenterAPI.getAuthorizationStatus();
      console.log('Authorization data:', authData);
      
      const allAuthorizations = authData.authorizations || authData.data || [];
      console.log('All authorizations:', allAuthorizations);
      
      // Check for approved/active authorizations - try multiple status values
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
        console.log('No approved authorizations found. All authorizations:', allAuthorizations);
        setHasAuthorizations(false);
        setAvailableCourses([]);
        return;
      }
      
      setHasAuthorizations(true);

      // Get courses from each approved ACC
      const coursePromises = approvedAuthorizations.map(async (auth) => {
        try {
          // Try multiple ways to get acc_id
          const accId = auth.acc_id || auth.acc?.id || auth.id;
          const accName = auth.acc?.name || auth.acc_name || auth.name || 'Unknown ACC';
          
          console.log(`Processing authorization for ACC:`, { accId, accName, auth });
          
          if (!accId) {
            console.warn('No ACC ID found in authorization:', auth);
            return [];
          }
          
          // Get courses from authorized ACC
          const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
          const baseURL = import.meta.env.VITE_API_BASE_URL || 'https://aeroenix.com/v1/api';
          
          // Try multiple endpoints
          const endpoints = [
            `${baseURL}/training-center/accs/${accId}/courses`,
            `${baseURL}/acc/${accId}/courses`,
            `${baseURL}/training-center/courses?acc_id=${accId}`,
          ];
          
          for (const endpoint of endpoints) {
            try {
              console.log(`Trying endpoint: ${endpoint}`);
              const response = await axios.get(endpoint, {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Accept': 'application/json',
                },
              });
              
              const data = response.data;
              const courses = data.courses || data.data || data || [];
              
              if (courses.length > 0) {
                console.log(`Successfully loaded ${courses.length} courses from ACC ${accId} using ${endpoint}`);
                return courses.map(course => ({
                  ...course,
                  acc_id: accId,
                  acc_name: accName,
                }));
              }
            } catch (error) {
              console.log(`Endpoint ${endpoint} failed:`, error.response?.status, error.message);
              // Continue to next endpoint
            }
          }
          
          console.warn(`All endpoints failed for ACC ${accId}`);
          return [];
        } catch (error) {
          console.error(`Failed to load courses from authorization:`, error, auth);
        }
        return [];
      });

      const coursesArrays = await Promise.all(coursePromises);
      const allCourses = coursesArrays.flat();
      setAvailableCourses(allCourses);
      
      console.log(`Loaded ${allCourses.length} courses from ${approvedAuthorizations.length} authorized ACC(s)`);
      
      if (allCourses.length === 0 && approvedAuthorizations.length > 0) {
        console.warn('No courses found despite having approved authorizations. Check endpoint availability.');
      }
    } catch (error) {
      console.error('Failed to load courses:', error);
      console.error('Error details:', error.response?.data || error.message);
      setAvailableCourses([]);
    }
  };

  const handleOpenModal = (classItem = null) => {
    if (classItem) {
      setSelectedClass(classItem);
      setFormData({
        course_id: classItem.course_id || '',
        class_id: classItem.class_id || '',
        instructor_id: classItem.instructor_id || '',
        start_date: classItem.start_date ? classItem.start_date.split('T')[0] : '',
        end_date: classItem.end_date ? classItem.end_date.split('T')[0] : '',
        max_capacity: classItem.max_capacity || '',
        location: classItem.location || 'physical',
      });
    } else {
      setSelectedClass(null);
      setFormData({
        course_id: '',
        class_id: '',
        instructor_id: '',
        start_date: '',
        end_date: '',
        max_capacity: '',
        location: 'physical',
      });
    }
    setErrors({});
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedClass(null);
    setFormData({
      course_id: '',
      class_id: '',
      instructor_id: '',
      start_date: '',
      end_date: '',
      max_capacity: '',
      location: 'physical',
    });
    setErrors({});
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setErrors({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});

    try {
      // Validate required fields
      if (!formData.course_id) {
        setErrors({ course_id: 'Course is required' });
        setSaving(false);
        return;
      }
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
      if (!formData.max_capacity) {
        setErrors({ max_capacity: 'Max capacity is required' });
        setSaving(false);
        return;
      }

      // Prepare submit data exactly as specified
      const submitData = {
        course_id: parseInt(formData.course_id),
        class_id: parseInt(formData.class_id),
        instructor_id: parseInt(formData.instructor_id),
        start_date: formData.start_date,
        end_date: formData.end_date,
        max_capacity: parseInt(formData.max_capacity),
        location: formData.location,
      };

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
      setSelectedClass(data.class);
      setDetailModalOpen(true);
    } catch (error) {
      console.error('Failed to load class details:', error);
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

  // Sort classes
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Filter and sort classes (status filtering is done client-side)
  const filteredAndSortedClasses = useMemo(() => {
    let filtered = [...classes];

    // Apply status filter (client-side)
    if (statusFilter !== 'all') {
      filtered = filtered.filter(classItem => classItem.status === statusFilter);
    }

    // Apply sorting
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aValue, bValue;
        
        if (sortConfig.key === 'course') {
          aValue = typeof a.course === 'string' ? a.course : (a.course?.name || '').toLowerCase();
          bValue = typeof b.course === 'string' ? b.course : (b.course?.name || '').toLowerCase();
        } else if (sortConfig.key === 'instructor') {
          const aInst = typeof a.instructor === 'string' ? a.instructor : 
            (a.instructor?.first_name && a.instructor?.last_name 
              ? `${a.instructor.first_name} ${a.instructor.last_name}` 
              : '').toLowerCase();
          const bInst = typeof b.instructor === 'string' ? b.instructor : 
            (b.instructor?.first_name && b.instructor?.last_name 
              ? `${b.instructor.first_name} ${b.instructor.last_name}` 
              : '').toLowerCase();
          aValue = aInst;
          bValue = bInst;
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
  }, [classes, statusFilter, sortConfig]);

  // Paginate filtered data client-side
  const paginatedClasses = useMemo(() => {
    const start = (pagination.currentPage - 1) * pagination.perPage;
    const end = start + pagination.perPage;
    return filteredAndSortedClasses.slice(start, end);
  }, [filteredAndSortedClasses, pagination.currentPage, pagination.perPage]);

  // Update pagination totals based on filtered data
  useEffect(() => {
    const totalItems = filteredAndSortedClasses.length;
    const totalPages = Math.ceil(totalItems / pagination.perPage) || 1;
    setPagination(prev => ({
      ...prev,
      totalItems,
      totalPages,
      currentPage: prev.currentPage > totalPages ? 1 : prev.currentPage,
    }));
  }, [filteredAndSortedClasses.length, pagination.perPage]);

  // Calculate stats from all classes (not filtered, not paginated)
  const totalCount = classes.length;
  const scheduledCount = classes.filter(c => c.status === 'scheduled').length;
  const completedCount = classes.filter(c => c.status === 'completed').length;
  const cancelledCount = classes.filter(c => c.status === 'cancelled').length;

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;
  }

  return (
    <div className="space-y-4">

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Classes */}
        <div 
          onClick={() => setStatusFilter('all')}
          className={`bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl shadow-lg p-6 border border-primary-200 hover:shadow-xl transition-all duration-300 cursor-pointer ${
            statusFilter === 'all' ? 'ring-2 ring-primary-500' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-primary-700 mb-2">Total Classes</p>
              <p className="text-3xl font-bold text-primary-900">{totalCount}</p>
            </div>
            <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg">
              <GraduationCap className="text-white" size={32} />
            </div>
          </div>
        </div>

        {/* Scheduled */}
        <div 
          onClick={() => setStatusFilter('scheduled')}
          className={`bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-lg p-6 border border-blue-200 hover:shadow-xl transition-all duration-300 cursor-pointer ${
            statusFilter === 'scheduled' ? 'ring-2 ring-blue-500' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-700 mb-2">Scheduled</p>
              <p className="text-3xl font-bold text-blue-900">{scheduledCount}</p>
            </div>
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <Calendar className="text-white" size={32} />
            </div>
          </div>
        </div>

        {/* Completed */}
        <div 
          onClick={() => setStatusFilter('completed')}
          className={`bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-lg p-6 border border-green-200 hover:shadow-xl transition-all duration-300 cursor-pointer ${
            statusFilter === 'completed' ? 'ring-2 ring-green-500' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-700 mb-2">Completed</p>
              <p className="text-3xl font-bold text-green-900">{completedCount}</p>
            </div>
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
              <CheckCircle className="text-white" size={32} />
            </div>
          </div>
        </div>

        {/* Cancelled - Commented out */}
        {/* <div 
          onClick={() => setStatusFilter('cancelled')}
          className={`bg-gradient-to-br from-red-50 to-red-100 rounded-xl shadow-lg p-6 border border-red-200 hover:shadow-xl transition-all duration-300 cursor-pointer ${
            statusFilter === 'cancelled' ? 'ring-2 ring-red-500' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-700 mb-2">Cancelled</p>
              <p className="text-3xl font-bold text-red-900">{cancelledCount}</p>
            </div>
            <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
              <XCircle className="text-white" size={32} />
            </div>
          </div>
        </div> */}
      </div>

      {/* Search and Filter Section */}
      <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-100">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search Input */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by course or instructor..."
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
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
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
                  onClick={() => handleSort('course')}
                >
                  <div className="flex items-center gap-2">
                    Course
                    {sortConfig.key === 'course' && (
                      sortConfig.direction === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                    )}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-primary-700 transition-colors select-none"
                  onClick={() => handleSort('instructor')}
                >
                  <div className="flex items-center gap-2">
                    Instructor
                    {sortConfig.key === 'instructor' && (
                      sortConfig.direction === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                    )}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-primary-700 transition-colors select-none"
                  onClick={() => handleSort('start_date')}
                >
                  <div className="flex items-center justify-center gap-2">
                    Start Date
                    {sortConfig.key === 'start_date' && (
                      sortConfig.direction === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                    )}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-primary-700 transition-colors select-none"
                  onClick={() => handleSort('end_date')}
                >
                  <div className="flex items-center justify-center gap-2">
                    End Date
                    {sortConfig.key === 'end_date' && (
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
                <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider">Enrollment</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {paginatedClasses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <GraduationCap className="text-gray-400" size={32} />
                      </div>
                      <p className="text-gray-500 font-medium">
                        {searchTerm || statusFilter !== 'all' ? 'No classes found matching your search' : 'No classes found'}
                      </p>
                      <p className="text-sm text-gray-400 mt-1">
                        {searchTerm || statusFilter !== 'all' ? 'Try adjusting your search criteria' : 'Create your first class to get started!'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedClasses.map((classItem, index) => {
                  const statusConfig = {
                    scheduled: { bg: 'from-blue-100 to-blue-200', text: 'text-blue-800', border: 'border-blue-300', icon: Clock },
                    completed: { bg: 'from-green-100 to-green-200', text: 'text-green-800', border: 'border-green-300', icon: CheckCircle },
                    cancelled: { bg: 'from-red-100 to-red-200', text: 'text-red-800', border: 'border-red-300', icon: XCircle },
                  };
                  const config = statusConfig[classItem.status] || { bg: 'from-gray-100 to-gray-200', text: 'text-gray-800', border: 'border-gray-300', icon: Clock };
                  const StatusIcon = config.icon;
                  const courseName = typeof classItem.course === 'string' ? classItem.course : (classItem.course?.name || 'N/A');
                  const instructorName = typeof classItem.instructor === 'string'
                    ? classItem.instructor
                    : (classItem.instructor?.first_name && classItem.instructor?.last_name
                      ? `${classItem.instructor.first_name} ${classItem.instructor.last_name}`
                      : 'N/A');
                  
                  return (
                    <tr
                      key={classItem.id || index}
                      className="hover:bg-gradient-to-r hover:from-primary-50/30 hover:to-white transition-all duration-200 cursor-pointer group table-row-animated"
                      onClick={() => handleViewDetails(classItem)}
                      style={{ '--animation-delay': `${index * 0.03}s` }}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg flex items-center justify-center mr-3 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                            <GraduationCap className="h-5 w-5 text-primary-600" />
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-900 group-hover:text-primary-700 transition-colors">
                              {courseName}
                            </div>
                            {classItem.class_id && (
                              <div className="text-xs text-gray-500">ID: {classItem.class_id}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-600">
                          <Users className="h-4 w-4 mr-2 text-gray-400" />
                          {instructorName}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center text-sm text-gray-600">
                          <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                          {classItem.start_date ? new Date(classItem.start_date).toLocaleDateString() : 'N/A'}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center text-sm text-gray-600">
                          <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                          {classItem.end_date ? new Date(classItem.end_date).toLocaleDateString() : 'N/A'}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <span className={`px-3 py-1.5 inline-flex items-center text-xs leading-5 font-bold rounded-full shadow-sm bg-gradient-to-r ${config.bg} ${config.text} border ${config.border}`}>
                          <StatusIcon size={14} className="mr-1" />
                          {classItem.status ? classItem.status.charAt(0).toUpperCase() + classItem.status.slice(1) : 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-gray-600">
                        {classItem.enrolled_count || 0} / {classItem.max_capacity || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenModal(classItem);
                            }}
                            className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 hover:scale-110 transition-all duration-200 shadow-sm hover:shadow-md"
                            title="Edit"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(classItem);
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
        {!loading && filteredAndSortedClasses.length > 0 && (
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
        title={selectedClass ? 'Edit Class' : 'Create New Class'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Course <span className="text-red-500">*</span>
            </label>
            <select
              name="course_id"
              value={formData.course_id}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none bg-white cursor-pointer transition-all"
            >
              <option value="">Select a course...</option>
              {availableCourses.map(course => {
                    const courseName = course.name || course.code || `Course ${course.id}`;
                const accName = course.acc_name || course.acc?.name || '';
                const label = accName ? `${courseName} - ${accName}` : courseName;
                return (
                  <option key={course.id} value={course.id}>
                    {label}
                  </option>
                );
              })}
            </select>
            {errors.course_id && (
              <p className="mt-1 text-sm text-red-600">{errors.course_id}</p>
            )}
            {availableCourses.length === 0 && !loading && (
              <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800 font-medium mb-1">No courses available</p>
                <p className="text-xs text-yellow-700">
                  {hasAuthorizations 
                    ? 'No courses found from your authorized ACCs. Please check if the ACCs have published courses.'
                    : 'Please ensure you have authorization from at least one ACC. Courses from authorized ACCs will appear here.'}
                </p>
              </div>
            )}
          </div>

          <FormInput
            label="Class ID"
            name="class_id"
            type="number"
            value={formData.class_id}
            onChange={handleChange}
            required
            placeholder="Enter class ID"
            error={errors.class_id}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Instructor <span className="text-red-500">*</span>
            </label>
            <select
            name="instructor_id"
            value={formData.instructor_id}
            onChange={handleChange}
            required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none bg-white cursor-pointer transition-all"
            >
              <option value="">Select an instructor...</option>
              {instructors.map(inst => (
                <option key={inst.id} value={inst.id}>
                  {inst.first_name} {inst.last_name}
                </option>
              ))}
            </select>
            {errors.instructor_id && (
              <p className="mt-1 text-sm text-red-600">{errors.instructor_id}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="Max Capacity"
              name="max_capacity"
              type="number"
              value={formData.max_capacity}
              onChange={handleChange}
              required
              error={errors.max_capacity}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location <span className="text-red-500">*</span>
              </label>
              <select
              name="location"
              value={formData.location}
              onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none bg-white cursor-pointer transition-all"
              >
                <option value="physical">Physical</option>
                <option value="online">Online</option>
              </select>
              {errors.location && (
                <p className="mt-1 text-sm text-red-600">{errors.location}</p>
              )}
            </div>
          </div>

          {errors.general && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600 font-medium">{errors.general}</p>
            </div>
          )}
          
          {Object.keys(errors).filter(key => key !== 'general').length > 0 && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600 font-medium mb-2">Please fix the following errors:</p>
              <ul className="list-disc list-inside text-sm text-red-600">
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
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Course</p>
                <p className="text-base font-semibold text-gray-900">
                  {typeof selectedClass.course === 'string' ? selectedClass.course : (selectedClass.course?.name || 'N/A')}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Instructor</p>
                <p className="text-base font-semibold text-gray-900">
                  {typeof selectedClass.instructor === 'string' 
                    ? selectedClass.instructor 
                    : (selectedClass.instructor?.first_name && selectedClass.instructor?.last_name
                      ? `${selectedClass.instructor.first_name} ${selectedClass.instructor.last_name}`
                      : 'N/A')}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Start Date</p>
                <p className="text-base font-semibold text-gray-900">
                  {selectedClass.start_date ? new Date(selectedClass.start_date).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">End Date</p>
                <p className="text-base font-semibold text-gray-900">
                  {selectedClass.end_date ? new Date(selectedClass.end_date).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Status</p>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                  selectedClass.status === 'completed' ? 'bg-green-100 text-green-800' :
                  selectedClass.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {selectedClass.status}
                </span>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Enrollment</p>
                <p className="text-base font-semibold text-gray-900">
                  {selectedClass.enrolled_count || 0} / {selectedClass.max_capacity || 0}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Location</p>
                <p className="text-base font-semibold text-gray-900">
                  {selectedClass.location ? selectedClass.location.charAt(0).toUpperCase() + selectedClass.location.slice(1) : 'N/A'}
                </p>
              </div>
            </div>
            {selectedClass.status !== 'completed' && (
              <div className="flex space-x-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    handleMarkComplete(selectedClass);
                    setDetailModalOpen(false);
                  }}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center transition-colors"
                >
                  <CheckCircle size={20} className="mr-2" />
                  Mark as Complete
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
        title="Delete Class"
        message={`Are you sure you want to delete this class? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
};

export default ClassesScreen;
