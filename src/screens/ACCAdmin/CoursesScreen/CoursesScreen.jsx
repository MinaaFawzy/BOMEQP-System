import { useEffect, useState, useRef } from 'react';
import { accAPI } from '../../../services/api';
import { useHeader } from '../../../context/HeaderContext';
import { GraduationCap, Plus, Edit, Trash2, Eye, Search, Filter, Clock, ChevronUp, ChevronDown, DollarSign } from 'lucide-react';
import Modal from '../../../components/Modal/Modal';
import ConfirmDialog from '../../../components/ConfirmDialog/ConfirmDialog';
import FormInput from '../../../components/FormInput/FormInput';
import Pagination from '../../../components/Pagination/Pagination';
import { validateRequired, validateNumber, validateMinLength, validateMaxLength } from '../../../utils/validation';
import './CoursesScreen.css';

const CoursesScreen = () => {
  const { setHeaderActions, setHeaderTitle, setHeaderSubtitle } = useHeader();
  const handleOpenModalRef = useRef(null);
  const [courses, setCourses] = useState([]);
  const [sortedCourses, setSortedCourses] = useState([]);
  const [paginatedData, setPaginatedData] = useState([]);
  const [filteredTotal, setFilteredTotal] = useState(0);
  const [subCategories, setSubCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');
  const [pagination, setPagination] = useState({
    currentPage: 1,
    perPage: 10,
    totalPages: 1,
    totalItems: 0,
  });
  const [formData, setFormData] = useState({
    sub_category_id: '',
    name: '',
    name_ar: '',
    code: '',
    description: '',
    duration_hours: '',
    max_capacity: '',
    level: 'beginner',
    status: 'active',
    assessor_required: false,
  });
  const [pricingData, setPricingData] = useState({
    base_price: '',
    currency: 'USD',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSubCategories();
  }, []);

  useEffect(() => {
    loadCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, pagination.currentPage, pagination.perPage]);

  // Set header actions and title
  useEffect(() => {
    setHeaderTitle('Courses');
    setHeaderSubtitle('Manage and organize your course catalog');
    
    setHeaderActions(
      <button
        onClick={() => {
          if (handleOpenModalRef.current) {
            handleOpenModalRef.current();
          }
        }}
        className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 flex items-center transition-colors shadow-lg hover:shadow-xl"
      >
        <Plus size={20} className="mr-2" />
        Add Course
      </button>
    );

    return () => {
      setHeaderActions(null);
      setHeaderTitle(null);
      setHeaderSubtitle(null);
    };
  }, [setHeaderActions, setHeaderTitle, setHeaderSubtitle]);

  const loadCourses = async (page = null) => {
    setLoading(true);
    try {
      // Build query parameters - all filtering is done client-side, no need to send filters to API
      const params = {
        page: page !== null ? page : pagination.currentPage,
        per_page: pagination.perPage,
      };
      
      const data = await accAPI.listCourses(params);
      
      // Handle paginated response structure
      let coursesArray = [];
      const currentPageToSet = page !== null ? page : pagination.currentPage;
      if (data.data) {
        // Laravel pagination format
        coursesArray = data.data || [];
        setPagination(prev => ({
          ...prev,
          currentPage: currentPageToSet,
          totalPages: data.last_page || data.total_pages || 1,
          totalItems: data.total || 0,
        }));
      } else if (data.courses) {
        // Non-paginated format (fallback)
        coursesArray = data.courses || [];
        setPagination(prev => ({
          ...prev,
          currentPage: currentPageToSet,
          totalPages: 1,
          totalItems: data.courses?.length || 0,
        }));
      } else {
        // Array format
        coursesArray = Array.isArray(data) ? data : [];
        setPagination(prev => ({
          ...prev,
          currentPage: currentPageToSet,
          totalPages: 1,
          totalItems: coursesArray.length,
        }));
      }
      
      setCourses(coursesArray);
      setSortedCourses(coursesArray);
    } catch (error) {
      console.error('Failed to load courses:', error);
      setCourses([]);
      setSortedCourses([]);
    } finally {
      setLoading(false);
    }
  };

  // Sort handler
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Apply filtering and sorting
  useEffect(() => {
    let filtered = [...courses];

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(course => course.status === statusFilter);
    }

    // Apply level filter
    if (levelFilter !== 'all') {
      filtered = filtered.filter(course => course.level === levelFilter);
    }

    // Apply search filter (client-side)
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(course => {
        const name = (course.name || '').toLowerCase();
        const code = (course.code || '').toLowerCase();
        return name.includes(searchLower) || code.includes(searchLower);
      });
    }

    // Apply sorting
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aValue, bValue;
        
        if (sortConfig.key === 'name') {
          aValue = (a.name || '').toLowerCase();
          bValue = (b.name || '').toLowerCase();
        } else if (sortConfig.key === 'duration_hours') {
          aValue = a.duration_hours || 0;
          bValue = b.duration_hours || 0;
        } else {
          aValue = a[sortConfig.key] || '';
          bValue = b[sortConfig.key] || '';
        }
        
        if (sortConfig.key === 'duration_hours') {
          // Already numbers
        } else if (typeof aValue === 'string') {
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
    
    setSortedCourses(filtered);
    setFilteredTotal(filtered.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortConfig, courses, statusFilter, levelFilter, searchTerm]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPagination(prev => {
      if (prev.currentPage !== 1) {
        return { ...prev, currentPage: 1 };
      }
      return prev;
    });
  }, [statusFilter, levelFilter, searchTerm]);

  // Apply pagination to filtered data
  useEffect(() => {
    const startIndex = (pagination.currentPage - 1) * pagination.perPage;
    const endIndex = startIndex + pagination.perPage;
    const paginated = sortedCourses.slice(startIndex, endIndex);
    setPaginatedData(paginated);
  }, [sortedCourses, pagination.currentPage, pagination.perPage]);
  
  const handlePageChange = (page) => {
    setPagination(prev => ({ ...prev, currentPage: page }));
  };
  
  const handlePerPageChange = (perPage) => {
    setPagination(prev => ({ ...prev, perPage, currentPage: 1 }));
  };

  const loadSubCategories = async () => {
    try {
      const data = await accAPI.listSubCategories();
      setSubCategories(data.sub_categories || data || []);
    } catch (error) {
      console.error('Failed to load sub categories:', error);
      setSubCategories([]);
    }
  };

  const handleOpenModal = (course = null) => {
    if (course) {
      setSelectedCourse(course);
      setFormData({
        sub_category_id: course.sub_category_id || '',
        name: course.name || '',
        name_ar: course.name_ar || '',
        code: course.code || '',
        description: course.description || '',
        duration_hours: course.duration_hours || '',
        max_capacity: course.max_capacity || '',
        level: course.level || 'beginner',
        status: course.status || 'active',
        assessor_required: course.assessor_required || false,
      });
      // Load pricing data if available (check both pricing and current_price)
      const pricing = course.current_price || course.pricing || (course.certificate_pricing && course.certificate_pricing.length > 0 ? course.certificate_pricing[0] : null);
      if (pricing) {
        setPricingData({
          base_price: pricing.base_price || '',
          currency: pricing.currency || 'USD',
        });
      } else {
        setPricingData({
          base_price: '',
          currency: 'USD',
        });
      }
    } else {
      setSelectedCourse(null);
      setFormData({
        sub_category_id: '',
        name: '',
        name_ar: '',
        code: '',
        description: '',
        duration_hours: '',
        max_capacity: '',
        level: 'beginner',
        status: 'active',
        assessor_required: false,
      });
      setPricingData({
        base_price: '',
        currency: 'USD',
      });
    }
    setErrors({});
    setIsModalOpen(true);
  };

  // Update ref when handleOpenModal is defined
  useEffect(() => {
    handleOpenModalRef.current = () => handleOpenModal();
  }, []);

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCourse(null);
    setFormData({
      sub_category_id: '',
      name: '',
      name_ar: '',
      code: '',
      description: '',
      duration_hours: '',
      level: 'beginner',
      status: 'active',
      assessor_required: false,
    });
    setPricingData({
      base_price: '',
      currency: 'USD',
      group_commission_percentage: '',
      training_center_commission_percentage: '',
      instructor_commission_percentage: '',
      effective_from: '',
      effective_to: '',
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

  const handlePricingChange = (e) => {
    setPricingData({
      ...pricingData,
      [e.target.name]: e.target.value,
    });
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[e.target.name];
      return newErrors;
    });
  };

  // Validation function
  const validateForm = () => {
    const newErrors = {};

    // Validate course fields
    if (!formData.name || formData.name.trim() === '') {
      newErrors.name = 'Course name is required';
    } else if (formData.name.length > 255) {
      newErrors.name = 'Course name must be at most 255 characters';
    }

    if (formData.name_ar && formData.name_ar.length > 255) {
      newErrors.name_ar = 'Arabic name must be at most 255 characters';
    }

    if (!formData.code || formData.code.trim() === '') {
      newErrors.code = 'Course code is required';
    } else if (formData.code.length > 255) {
      newErrors.code = 'Course code must be at most 255 characters';
    }

    if (!formData.sub_category_id) {
      newErrors.sub_category_id = 'Sub category is required';
    }

    const durationError = validateRequired(formData.duration_hours, 'Duration');
    if (durationError) {
      newErrors.duration_hours = durationError;
    } else {
      const durationNum = parseInt(formData.duration_hours);
      if (isNaN(durationNum) || durationNum < 1) {
        newErrors.duration_hours = 'Duration must be at least 1 hour';
      }
    }

    // Validate max_capacity (required field)
    if (!formData.max_capacity || formData.max_capacity.toString().trim() === '') {
      newErrors.max_capacity = 'Max capacity is required';
    } else {
      const maxCapacityNum = parseInt(formData.max_capacity);
      if (isNaN(maxCapacityNum) || maxCapacityNum < 1) {
        newErrors.max_capacity = 'Max capacity must be at least 1';
      }
    }

    if (!formData.level) {
      newErrors.level = 'Level is required';
    } else if (!['beginner', 'intermediate', 'advanced'].includes(formData.level)) {
      newErrors.level = 'Invalid level selected';
    }

    if (!formData.status) {
      newErrors.status = 'Status is required';
    } else if (!['active', 'inactive', 'archived'].includes(formData.status)) {
      newErrors.status = 'Invalid status selected';
    }

    // Validate pricing if base_price is provided (pricing is completely optional)
    if (pricingData.base_price) {
      // If pricing is provided, base_price and currency are required
      const basePriceError = validateNumber(pricingData.base_price, 'Base price', 0);
      if (basePriceError) {
        newErrors.base_price = basePriceError;
      }

      if (!pricingData.currency || pricingData.currency.trim() === '') {
        newErrors.currency = 'Currency is required when pricing is set';
      } else if (pricingData.currency.length !== 3) {
        newErrors.currency = 'Currency must be a 3-character code (e.g., USD)';
      }
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});

    // Validate form
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setSaving(false);
      return;
    }

    try {
      // Build the request payload with proper type conversions
      const payload = {
        ...formData,
        sub_category_id: parseInt(formData.sub_category_id),
        duration_hours: parseInt(formData.duration_hours),
        max_capacity: parseInt(formData.max_capacity),
      };
      
      // Remove empty optional fields
      if (!formData.name_ar || formData.name_ar.trim() === '') {
        delete payload.name_ar;
      }
      if (!formData.description || formData.description.trim() === '') {
        delete payload.description;
      }
      
      // Check if pricing data should be included (pricing is completely optional)
      // According to API docs: if pricing is provided, only base_price and currency are required
      if (pricingData.base_price) {
        // Build pricing object with only base_price and currency
        const pricing = {
          base_price: parseFloat(pricingData.base_price),
          currency: pricingData.currency,
        };
        
        payload.pricing = pricing;
      }

      let response;
      if (selectedCourse) {
        // Update course with pricing included in the same request
        response = await accAPI.updateCourse(selectedCourse.id, payload);
        console.log('Course updated:', response);
      } else {
        // Create course with pricing included in the same request
        response = await accAPI.createCourse(payload);
        console.log('Course created:', response);
      }

      handleCloseModal();
      // Reset to first page after creating/updating and reload courses
      await loadCourses(1);
      alert(selectedCourse ? 'Course updated successfully!' : 'Course created successfully!');
    } catch (error) {
      console.error('Failed to save course:', error);
      console.error('Error response:', error.response);
      console.error('Error data:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      if (error.response?.data?.errors) {
        const apiErrors = error.response.data.errors;
        // Handle nested pricing errors (e.g., pricing.base_price -> base_price)
        const formattedErrors = {};
        Object.keys(apiErrors).forEach(key => {
          if (key.startsWith('pricing.')) {
            formattedErrors[key.replace('pricing.', '')] = apiErrors[key];
          } else {
            formattedErrors[key] = apiErrors[key];
          }
        });
        setErrors(formattedErrors);
      } else if (error.errors) {
        setErrors(error.errors);
      } else {
        setErrors({ general: error.response?.data?.message || error.message || 'Failed to save course' });
      }
      
      alert(`Error: ${error.response?.data?.message || error.message || 'Failed to save course'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (course) => {
    setSelectedCourse(course);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await accAPI.deleteCourse(selectedCourse.id);
      await loadCourses();
    } catch (error) {
      alert('Failed to delete course: ' + (error.message || 'Unknown error'));
    }
    setIsDeleteDialogOpen(false);
    setSelectedCourse(null);
  };

  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const handleViewDetails = async (course) => {
    try {
      const data = await accAPI.getCourseDetails(course.id);
      setSelectedCourse(data.course);
      setDetailModalOpen(true);
    } catch (error) {
      console.error('Failed to load course details:', error);
      setSelectedCourse(course);
      setDetailModalOpen(true);
    }
  };


  return (
    <div>
      {/* Search and Filter Section */}
      <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-100 mb-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search Input */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by name or code..."
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
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPagination(prev => ({ ...prev, currentPage: 1 }));
              }}
              className="pl-10 pr-8 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none bg-white cursor-pointer transition-all"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Level Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <select
              value={levelFilter}
              onChange={(e) => {
                setLevelFilter(e.target.value);
                setPagination(prev => ({ ...prev, currentPage: 1 }));
              }}
              className="pl-10 pr-8 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none bg-white cursor-pointer transition-all"
            >
              <option value="all">All Levels</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
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
                    Course
                    {sortConfig.key === 'name' && (
                      sortConfig.direction === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                    )}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-primary-700 transition-colors select-none"
                  onClick={() => handleSort('level')}
                >
                  <div className="flex items-center gap-2">
                    Level
                    {sortConfig.key === 'level' && (
                      sortConfig.direction === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                    )}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-primary-700 transition-colors select-none"
                  onClick={() => handleSort('duration_hours')}
                >
                  <div className="flex items-center gap-2">
                    Duration
                    {sortConfig.key === 'duration_hours' && (
                      sortConfig.direction === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                    )}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-primary-700 transition-colors select-none"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center gap-2">
                    Status
                    {sortConfig.key === 'status' && (
                      sortConfig.direction === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                    )}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Pricing</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider">Assessor</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-primary-600"></div>
                    </div>
                  </td>
                </tr>
              ) : sortedCourses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <GraduationCap className="text-gray-400" size={32} />
                      </div>
                      <p className="text-gray-500 font-medium">No courses found</p>
                      <p className="text-sm text-gray-400 mt-1">
                        {searchTerm || statusFilter !== 'all' || levelFilter !== 'all' ? 'Try adjusting your filters' : 'Create your first course!'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedData.map((course, index) => (
                  <tr
                    key={course.id || index}
                    className="hover:bg-gradient-to-r hover:from-primary-50/30 hover:to-white transition-all duration-200 cursor-pointer group table-row-animated"
                    onClick={() => handleViewDetails(course)}
                    style={{ '--animation-delay': `${index * 0.03}s` }}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg flex items-center justify-center mr-3 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                          <GraduationCap className="h-5 w-5 text-primary-600" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900 group-hover:text-primary-700 transition-colors">{course.name}</div>
                          {course.code && <div className="text-xs text-gray-400 mt-1">Code: {course.code}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="px-3 py-1.5 inline-flex text-xs font-bold rounded-full shadow-sm bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-300 capitalize">
                        {course.level || 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-600">
                        <Clock className="h-4 w-4 mr-2 text-gray-400" />
                        {course.duration_hours ? `${course.duration_hours} hrs` : 'N/A'}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-3 py-1.5 inline-flex text-xs leading-5 font-bold rounded-full shadow-sm ${
                        course.status === 'active' ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300' :
                        'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300'
                      }`}>
                        {course.status ? course.status.charAt(0).toUpperCase() + course.status.slice(1) : 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {(() => {
                        const pricing = course.current_price || 
                                       course.pricing || 
                                       (course.certificate_pricing && course.certificate_pricing.length > 0 
                                         ? course.certificate_pricing[0] 
                                         : null);
                        return pricing ? (
                          <div className="flex items-center text-sm font-semibold text-gray-900">
                            <DollarSign className="h-4 w-4 mr-1 text-primary-600" />
                            {parseFloat(pricing.base_price || 0).toFixed(2)} {pricing.currency || 'USD'}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">Not set</span>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      {course.assessor_required ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                          Required
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">Not Required</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenModal(course);
                          }}
                          className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 hover:scale-110 transition-all duration-200 shadow-sm hover:shadow-md"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(course);
                          }}
                          className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 hover:scale-110 transition-all duration-200 shadow-sm hover:shadow-md"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {!loading && filteredTotal > 0 && (
          <Pagination
            currentPage={pagination.currentPage}
            totalPages={Math.ceil(filteredTotal / pagination.perPage)}
            totalItems={filteredTotal}
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
        title={selectedCourse ? 'Edit Course' : 'Add New Course'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="Course Name (English)"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              error={errors.name}
            />

            <FormInput
              label="Course Name (Arabic)"
              name="name_ar"
              value={formData.name_ar}
              onChange={handleChange}
              error={errors.name_ar}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="Course Code"
              name="code"
              value={formData.code}
              onChange={handleChange}
              required
              placeholder="e.g., AST-101"
              error={errors.code}
            />

            <FormInput
              label="Sub Category"
              name="sub_category_id"
              type="select"
              value={formData.sub_category_id}
              onChange={handleChange}
              required
              options={subCategories.map(cat => ({
                value: cat.id,
                label: cat.name || cat.title || `Sub Category ${cat.id}`,
              }))}
              error={errors.sub_category_id}
            />
          </div>

          <FormInput
            label="Description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            textarea
            rows={4}
            error={errors.description}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="Duration (Hours)"
              name="duration_hours"
              type="number"
              value={formData.duration_hours}
              onChange={handleChange}
              required
              min="1"
              error={errors.duration_hours}
            />

            <FormInput
              label="Max Capacity"
              name="max_capacity"
              type="number"
              value={formData.max_capacity}
              onChange={handleChange}
              required
              min="1"
              placeholder="Maximum number of trainees per class"
              error={errors.max_capacity}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="Level"
              name="level"
              type="select"
              value={formData.level}
              onChange={handleChange}
              options={[
                { value: 'beginner', label: 'Beginner' },
                { value: 'intermediate', label: 'Intermediate' },
                { value: 'advanced', label: 'Advanced' },
              ]}
              error={errors.level}
            />

            <FormInput
              label="Status"
              name="status"
              type="select"
              value={formData.status}
              onChange={handleChange}
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
                { value: 'archived', label: 'Archived' },
              ]}
              error={errors.status}
            />
          </div>

          {/* Assessor Required Switch */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="assessor_required"
              name="assessor_required"
              checked={formData.assessor_required || false}
              onChange={(e) => setFormData({
                ...formData,
                assessor_required: e.target.checked
              })}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <label htmlFor="assessor_required" className="text-sm font-medium text-gray-700">
              Assessor Required
            </label>
          </div>
          <p className="text-xs text-gray-500 -mt-2 ml-6">This course requires an assessor</p>

          {/* Pricing Section */}
          <div className="border-t pt-4 mt-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <DollarSign size={20} className="text-primary-600" />
              Pricing Information (Optional)
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Optional: Set pricing at creation time. You can create a course without pricing and add it later if needed. Commission percentages are managed by Group Admins separately.
            </p>
            
            {/* Base Price and Currency */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                label="Base Price"
                name="base_price"
                type="number"
                value={pricingData.base_price}
                onChange={handlePricingChange}
                placeholder="0.00"
                step="0.01"
                min="0"
                error={errors.base_price}
              />

              <FormInput
                label="Currency"
                name="currency"
                type="select"
                value={pricingData.currency}
                onChange={handlePricingChange}
                options={[
                  { value: 'USD', label: 'USD' },
                  { value: 'EUR', label: 'EUR' },
                  { value: 'GBP', label: 'GBP' },
                  { value: 'SAR', label: 'SAR' },
                ]}
                error={errors.currency}
              />
            </div>
          </div>

          {errors.general && (
            <p className="text-sm text-red-600">{errors.general}</p>
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
              {saving ? 'Saving...' : selectedCourse ? 'Update Course' : 'Create Course'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedCourse(null);
        }}
        title="Course Details"
        size="lg"
      >
        {selectedCourse && (
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Course Name (English)</p>
                <p className="text-base font-semibold text-gray-900">{selectedCourse.name || 'N/A'}</p>
              </div>
              {selectedCourse.name_ar && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Course Name (Arabic)</p>
                  <p className="text-base font-semibold text-gray-900">{selectedCourse.name_ar}</p>
                </div>
              )}
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Course Code</p>
                <p className="text-base font-semibold text-gray-900">{selectedCourse.code || 'N/A'}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Level</p>
                <p className="text-base font-semibold text-gray-900 capitalize">{selectedCourse.level || 'N/A'}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Duration</p>
                <p className="text-base font-semibold text-gray-900">{selectedCourse.duration_hours ? `${selectedCourse.duration_hours} hours` : 'N/A'}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Max Capacity</p>
                <p className="text-base font-semibold text-gray-900">{selectedCourse.max_capacity ? `${selectedCourse.max_capacity} trainees` : 'N/A'}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Status</p>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                  selectedCourse.status === 'active' ? 'bg-green-100 text-green-800' : 
                  selectedCourse.status === 'inactive' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {selectedCourse.status ? selectedCourse.status.charAt(0).toUpperCase() + selectedCourse.status.slice(1) : 'N/A'}
                </span>
              </div>
            </div>

            {/* Category Information */}
            {selectedCourse.sub_category && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-gray-500 mb-2">Category</p>
                <div className="space-y-1">
                  {selectedCourse.sub_category.category && (
                    <p className="text-base font-semibold text-gray-900">
                      {selectedCourse.sub_category.category.name}
                    </p>
                  )}
                  <p className="text-sm text-gray-700">
                    Sub Category: {selectedCourse.sub_category.name}
                  </p>
                </div>
              </div>
            )}

            {/* Description */}
            {selectedCourse.description && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Description</p>
                <p className="text-base text-gray-900 whitespace-pre-wrap">{selectedCourse.description}</p>
              </div>
            )}
            {(() => {
              // Check for pricing in multiple possible locations
              const pricing = selectedCourse.current_price || 
                             selectedCourse.pricing || 
                             (selectedCourse.certificate_pricing && selectedCourse.certificate_pricing.length > 0 
                               ? selectedCourse.certificate_pricing[0] 
                               : null);
              
              return pricing ? (
                <div className="p-4 bg-gradient-to-br from-primary-50 to-primary-100 rounded-lg border border-primary-200">
                  <h4 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <DollarSign size={18} className="text-primary-600" />
                    Pricing Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Base Price</p>
                      <p className="text-lg font-bold text-gray-900">
                        {parseFloat(pricing.base_price || 0).toFixed(2)} {pricing.currency || 'USD'}
                      </p>
                    </div>
                    {pricing.created_at && (
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Set On</p>
                        <p className="text-base font-semibold text-gray-900">
                          {new Date(pricing.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-3">
                    Note: Commission percentages are managed by Group Admins. Pricing is effective immediately when set.
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-3">
                    <DollarSign className="text-gray-400" size={20} />
                    <div>
                      <p className="text-sm font-medium text-gray-700">No pricing set</p>
                      <p className="text-xs text-gray-500 mt-1">You can add pricing when editing the course</p>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setSelectedCourse(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Course"
        message={`Are you sure you want to delete "${selectedCourse?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
};

export default CoursesScreen;
