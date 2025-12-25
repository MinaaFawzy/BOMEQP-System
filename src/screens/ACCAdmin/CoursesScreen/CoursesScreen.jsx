import { useEffect, useState, useRef } from 'react';
import { accAPI } from '../../../services/api';
import { useHeader } from '../../../context/HeaderContext';
import { GraduationCap, Plus, Edit, Trash2, Eye, Search, Filter, Clock, ChevronUp, ChevronDown, DollarSign } from 'lucide-react';
import Modal from '../../../components/Modal/Modal';
import ConfirmDialog from '../../../components/ConfirmDialog/ConfirmDialog';
import FormInput from '../../../components/FormInput/FormInput';
import Pagination from '../../../components/Pagination/Pagination';
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
    level: 'beginner',
    status: 'active',
  });
  const [pricingData, setPricingData] = useState({
    base_price: '',
    currency: 'USD',
    effective_from: '',
    effective_to: '',
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

  const loadCourses = async () => {
    setLoading(true);
    try {
      // Build query parameters - all filtering is done client-side, no need to send filters to API
      const params = {
        page: pagination.currentPage,
        per_page: pagination.perPage,
      };
      
      const data = await accAPI.listCourses(params);
      
      // Handle paginated response structure
      let coursesArray = [];
      if (data.data) {
        // Laravel pagination format
        coursesArray = data.data || [];
        setPagination(prev => ({
          ...prev,
          totalPages: data.last_page || data.total_pages || 1,
          totalItems: data.total || 0,
        }));
      } else if (data.courses) {
        // Non-paginated format (fallback)
        coursesArray = data.courses || [];
        setPagination(prev => ({
          ...prev,
          totalPages: 1,
          totalItems: data.courses?.length || 0,
        }));
      } else {
        // Array format
        coursesArray = Array.isArray(data) ? data : [];
        setPagination(prev => ({
          ...prev,
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
        level: course.level || 'beginner',
        status: course.status || 'active',
      });
      // Load pricing data if available (check both pricing and current_price)
      const pricing = course.current_price || course.pricing;
      if (pricing) {
        setPricingData({
          base_price: pricing.base_price || '',
          currency: pricing.currency || 'USD',
          effective_from: pricing.effective_from ? pricing.effective_from.split('T')[0] : '',
          effective_to: pricing.effective_to ? pricing.effective_to.split('T')[0] : '',
        });
      } else {
        setPricingData({
          base_price: '',
          currency: 'USD',
          effective_from: '',
          effective_to: '',
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
        level: 'beginner',
        status: 'active',
      });
      setPricingData({
        base_price: '',
        currency: 'USD',
        effective_from: '',
        effective_to: '',
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
    setErrors({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});

    try {
      // Build the request payload with proper type conversions
      const payload = {
        ...formData,
        sub_category_id: parseInt(formData.sub_category_id),
        duration_hours: parseInt(formData.duration_hours),
      };
      
      // Check if pricing data should be included
      // According to API docs: if pricing object is included, all pricing fields are required
      // Commission percentages are NOT set by ACC - they are automatically taken from ACC's commission_percentage
      // Only include pricing if base_price is provided (required field)
      if (pricingData.base_price) {
        // Validate that all required pricing fields are present
        if (!pricingData.currency) {
          setErrors({ currency: 'Currency is required when pricing is set' });
          setSaving(false);
          return;
        }
        if (!pricingData.effective_from) {
          setErrors({ effective_from: 'Effective from date is required when pricing is set' });
          setSaving(false);
          return;
        }
        
        // Build pricing object with required fields only
        const pricing = {
          base_price: parseFloat(pricingData.base_price),
          currency: pricingData.currency,
          effective_from: pricingData.effective_from,
        };
        
        // Include effective_to if provided (optional field, can be null)
        if (pricingData.effective_to) {
          pricing.effective_to = pricingData.effective_to;
        } else {
          // Set to null if not provided (API accepts null for no expiration)
          pricing.effective_to = null;
        }
        
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

      await loadCourses();
      handleCloseModal();
      // Reset to first page after creating/updating
      setPagination(prev => ({ ...prev, currentPage: 1 }));
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
                <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Actions</th>
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
              ) : sortedCourses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
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
                      {course.current_price || course.pricing ? (
                        <div className="flex items-center text-sm font-semibold text-gray-900">
                          <DollarSign className="h-4 w-4 mr-1 text-primary-600" />
                          {parseFloat((course.current_price || course.pricing).base_price || 0).toFixed(2)} {(course.current_price || course.pricing).currency || 'USD'}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">Not set</span>
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormInput
              label="Duration (Hours)"
              name="duration_hours"
              type="number"
              value={formData.duration_hours}
              onChange={handleChange}
              error={errors.duration_hours}
            />

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
              ]}
              error={errors.status}
            />
          </div>

          {/* Pricing Section */}
          <div className="border-t pt-4 mt-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <DollarSign size={20} className="text-primary-600" />
              Pricing Information
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Optional: Set pricing at creation time. Commission percentage is automatically taken from your ACC's commission percentage set by Group Admin.
            </p>
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

              <FormInput
                label="Effective From"
                name="effective_from"
                type="date"
                value={pricingData.effective_from}
                onChange={handlePricingChange}
                error={errors.effective_from}
              />

              <FormInput
                label="Effective To (Optional)"
                name="effective_to"
                type="date"
                value={pricingData.effective_to}
                onChange={handlePricingChange}
                error={errors.effective_to}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Course Name</p>
                <p className="text-base font-semibold text-gray-900">{selectedCourse.name}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Course Code</p>
                <p className="text-base font-semibold text-gray-900">{selectedCourse.code}</p>
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
                <p className="text-sm text-gray-500 mb-1">Status</p>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                  selectedCourse.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {selectedCourse.status}
                </span>
              </div>
            </div>
            {selectedCourse.description && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Description</p>
                <p className="text-base text-gray-900">{selectedCourse.description}</p>
              </div>
            )}
            {(selectedCourse.current_price || selectedCourse.pricing) && (
              <div className="p-4 bg-gradient-to-br from-primary-50 to-primary-100 rounded-lg border border-primary-200">
                <h4 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <DollarSign size={18} className="text-primary-600" />
                  Pricing Information
                </h4>
                {(() => {
                  const pricing = selectedCourse.current_price || selectedCourse.pricing;
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Base Price</p>
                        <p className="text-lg font-bold text-gray-900">
                          {parseFloat(pricing.base_price || 0).toFixed(2)} {pricing.currency || 'USD'}
                        </p>
                      </div>
                      {pricing.group_commission_percentage !== undefined && pricing.group_commission_percentage !== null && (
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Group Commission</p>
                          <p className="text-base font-semibold text-gray-900">
                            {parseFloat(pricing.group_commission_percentage || 0).toFixed(2)}%
                          </p>
                          <p className="text-xs text-gray-400 mt-1">(Automatically set by Group Admin)</p>
                        </div>
                      )}
                      {pricing.effective_from && (
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Effective From</p>
                          <p className="text-base font-semibold text-gray-900">
                            {pricing.effective_from.split('T')[0]}
                          </p>
                        </div>
                      )}
                      {pricing.effective_to && (
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Effective To</p>
                          <p className="text-base font-semibold text-gray-900">
                            {pricing.effective_to.split('T')[0]}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })()}
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
