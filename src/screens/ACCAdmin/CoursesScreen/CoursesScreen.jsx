import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { accAPI } from '../../../services/api';
import { useHeader } from '../../../context/HeaderContext';
import { GraduationCap, Plus, Edit, Trash2, Eye, Clock, DollarSign, Hash, Calendar, BookOpen, Search } from 'lucide-react';
import Modal from '../../../components/Modal/Modal';
import ConfirmDialog from '../../../components/ConfirmDialog/ConfirmDialog';
import FormInput from '../../../components/FormInput/FormInput';
import DataTable from '../../../components/DataTable/DataTable';
import DetailForm from '../../../components/DetailForm/DetailForm';
import Pagination from '../../../components/Pagination/Pagination';
import { validateRequired, validateNumber, validateMinLength, validateMaxLength } from '../../../utils/validation';
import './CoursesScreen.css';

const CoursesScreen = () => {
  const { setHeaderActions, setHeaderTitle, setHeaderSubtitle } = useHeader();
  const handleOpenModalRef = useRef(null);
  const [courses, setCourses] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');

  // Pagination State
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
    per_page: 5,
    from: 0,
    to: 0
  });

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
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

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPagination(prev => ({ ...prev, current_page: 1 }));
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    loadSubCategories();
  }, []);

  // Load data when dependencies change
  useEffect(() => {
    loadCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, levelFilter, pagination.current_page, pagination.per_page, debouncedSearch]);

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
      // Build query parameters for server-side filtering and pagination
      const params = {
        page: pagination.current_page,
        per_page: pagination.per_page,
        search: debouncedSearch,
      };

      // Add filters if not 'all'
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      if (levelFilter !== 'all') {
        params.level = levelFilter;
      }

      const data = await accAPI.listCourses(params);

      // Handle Laravel pagination response
      const coursesArray = data.data || [];
      setCourses(coursesArray);

      // Update pagination state
      if (data) {
        setPagination(prev => ({
          ...prev,
          current_page: data.current_page || 1,
          last_page: data.last_page || 1,
          total: data.total || 0,
          from: data.from || 0,
          to: data.to || 0
        }));
      }
    } catch (error) {
      console.error('Failed to load courses:', error);
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  // Pagination handlers
  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, current_page: newPage }));
  };

  const handlePerPageChange = (newPerPage) => {
    setPagination(prev => ({
      ...prev,
      per_page: parseInt(newPerPage),
      current_page: 1
    }));
  };

  const loadSubCategories = async () => {
    try {
      // Fetch all sub-categories for the dropdown
      const data = await accAPI.listSubCategories({ per_page: 1000 });

      // Handle various response structures
      if (data.data && Array.isArray(data.data)) {
        // Laravel pagination results
        setSubCategories(data.data);
      } else if (data.sub_categories && Array.isArray(data.sub_categories)) {
        // Wrapped in key
        setSubCategories(data.sub_categories);
      } else if (Array.isArray(data)) {
        // Direct array
        setSubCategories(data);
      } else {
        console.warn('Unexpected sub categories response format:', data);
        setSubCategories([]);
      }
    } catch (error) {
      console.error('Failed to load sub categories:', error);
      setSubCategories([]);
    }
  };

  const handleOpenModal = useCallback((course = null) => {
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
  }, []);

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
      // Reload courses
      await loadCourses();
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

  const handleDelete = useCallback((course) => {
    setSelectedCourse(course);
    setIsDeleteDialogOpen(true);
  }, []);

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
      setSelectedCourse(data.course || data);
      setDetailModalOpen(true);
    } catch (error) {
      console.error('Failed to load course details:', error);
      setSelectedCourse(course);
      setDetailModalOpen(true);
    }
  };

  const handleRowClick = (course) => {
    handleViewDetails(course);
  };

  // Define columns for DataTable
  const columns = useMemo(() => [
    {
      header: 'Course',
      accessor: 'name',
      sortable: true,
      render: (value, row) => (
        <div className="flex items-center">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg flex items-center justify-center mr-3">
            <GraduationCap className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900">{value || 'N/A'}</div>
            {row.code && <div className="text-xs text-gray-400 mt-1">Code: {row.code}</div>}
          </div>
        </div>
      )
    },
    {
      header: 'Level',
      accessor: 'level',
      sortable: true,
      render: (value) => (
        <span className="px-3 py-1.5 inline-flex text-xs font-bold rounded-full shadow-sm bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-300 capitalize">
          {value || 'N/A'}
        </span>
      )
    },
    {
      header: 'Duration',
      accessor: 'duration_hours',
      sortable: true,
      render: (value) => (
        <div className="flex items-center text-sm text-gray-600">
          <Clock className="h-4 w-4 mr-2 text-gray-400" />
          {value ? `${value} hrs` : 'N/A'}
        </div>
      )
    },
    {
      header: 'Status',
      accessor: 'status',
      sortable: true,
      render: (value) => (
        <span className={`px-3 py-1.5 inline-flex text-xs leading-5 font-bold rounded-full shadow-sm ${value === 'active' ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300' :
          'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300'
          }`}>
          {value ? value.charAt(0).toUpperCase() + value.slice(1) : 'N/A'}
        </span>
      )
    },
    {
      header: 'Pricing',
      accessor: 'pricing',
      sortable: false,
      render: (value, row) => {
        const pricing = row.current_price || row.pricing ||
          (row.certificate_pricing && row.certificate_pricing.length > 0
            ? row.certificate_pricing[0]
            : null);
        return pricing ? (
          <div className="flex items-center text-sm font-semibold text-gray-900">
            <DollarSign className="h-4 w-4 mr-1 text-primary-600" />
            {parseFloat(pricing.base_price || 0).toFixed(2)} {pricing.currency || 'USD'}
          </div>
        ) : (
          <span className="text-sm text-gray-400">Not set</span>
        );
      }
    },
    {
      header: 'Assessor',
      accessor: 'assessor_required',
      sortable: true,
      render: (value) => (
        value ? (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
            Required
          </span>
        ) : (
          <span className="text-sm text-gray-400">Not Required</span>
        )
      )
    },
    {
      header: 'Actions',
      accessor: 'actions',
      sortable: false,
      render: (value, row) => (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => handleOpenModal(row)}
            className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 hover:scale-110 transition-all duration-200 shadow-sm hover:shadow-md"
            title="Edit"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={() => handleDelete(row)}
            className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 hover:scale-110 transition-all duration-200 shadow-sm hover:shadow-md"
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ], [handleOpenModal, handleDelete]);


  return (
    <div>
      {/* Search and Filters */}
      <div className="mb-4">
        <div className="flex gap-4">
          {/* Search Input */}
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search courses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
            />
            <div className="absolute left-3 top-2.5 text-gray-400">
              <Search size={20} />
            </div>
          </div>

          {/* Status Filter */}
          <div className="w-48">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPagination(prev => ({ ...prev, current_page: 1 }));
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all bg-white cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27currentColor%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e')] bg-[length:1.25rem] bg-[right_0.5rem_center] bg-no-repeat pr-10"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* DataTable */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        <DataTable
          columns={columns}
          data={courses}
          isLoading={loading}
          searchable={false}
          sortable={true}
          filterable={false}
          emptyMessage="No courses found"
          onRowClick={(course) => handleRowClick(course)}
        />

        {/* Pagination */}
        {pagination.total > 0 && (
          <div className="border-t border-gray-100">
            <Pagination
              currentPage={pagination.current_page}
              totalPages={pagination.last_page}
              onPageChange={handlePageChange}
              totalItems={pagination.total}
              perPage={pagination.per_page}
              onPerPageChange={handlePerPageChange}
            />
          </div>
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
            {/* Course Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <GraduationCap className="mr-2" size={20} />
                Course Information
              </h3>
              <DetailForm
                data={selectedCourse}
                fields={[
                  { key: 'id', label: 'Course ID', icon: Hash, render: (value) => value ? `#${value}` : 'N/A', showEmpty: false },
                  { key: 'name', label: 'Course Name (English)', icon: BookOpen },
                  { key: 'name_ar', label: 'Course Name (Arabic)', showEmpty: false },
                  { key: 'code', label: 'Course Code', icon: Hash },
                  { key: 'level', label: 'Level', render: (value) => value ? value.charAt(0).toUpperCase() + value.slice(1) : 'N/A' },
                  { key: 'duration_hours', label: 'Duration', icon: Clock, render: (value) => value ? `${value} hours` : 'N/A' },
                  { key: 'max_capacity', label: 'Max Capacity', render: (value) => value ? `${value} trainees` : 'N/A' },
                  { key: 'status', label: 'Status', type: 'status' },
                  { key: 'assessor_required', label: 'Assessor Required', render: (value) => value ? 'Required' : 'Not Required' },
                  { key: 'created_at', label: 'Created At', type: 'datetime', icon: Calendar, showEmpty: false },
                  { key: 'updated_at', label: 'Updated At', type: 'datetime', icon: Calendar, showEmpty: false },
                ]}
              />
            </div>

            {/* Category Information */}
            {selectedCourse.sub_category && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <BookOpen className="mr-2" size={20} />
                  Category Information
                </h3>
                <DetailForm
                  data={selectedCourse.sub_category}
                  fields={[
                    { key: 'id', label: 'Sub Category ID', icon: Hash, render: (value) => value ? `#${value}` : 'N/A', showEmpty: false },
                    { key: 'name', label: 'Sub Category', icon: BookOpen },
                    { key: 'description', label: 'Sub Category Description', fullWidth: true, showEmpty: false },
                  ]}
                />
                {selectedCourse.sub_category.category && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1">Category</p>
                    <p className="text-base font-semibold text-gray-900">
                      {selectedCourse.sub_category.category.name || 'N/A'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Description */}
            {selectedCourse.description && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-base text-gray-900 whitespace-pre-wrap">{selectedCourse.description}</p>
                </div>
              </div>
            )}
            {/* Pricing Information */}
            {(() => {
              // Check for pricing in multiple possible locations
              const pricing = selectedCourse.current_price ||
                selectedCourse.pricing ||
                (selectedCourse.certificate_pricing && selectedCourse.certificate_pricing.length > 0
                  ? selectedCourse.certificate_pricing[0]
                  : null);

              return pricing ? (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <DollarSign size={20} className="mr-2" />
                    Pricing Information
                  </h3>
                  <div className="p-4 bg-gradient-to-br from-primary-50 to-primary-100 rounded-lg border border-primary-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {pricing.id && (
                        <div className="p-4 bg-white rounded-lg">
                          <p className="text-sm text-gray-500 mb-1 flex items-center">
                            <Hash size={14} className="mr-1" />
                            Pricing ID
                          </p>
                          <p className="text-base font-semibold text-gray-900">
                            #{pricing.id}
                          </p>
                        </div>
                      )}
                      <div className="p-4 bg-white rounded-lg">
                        <p className="text-sm text-gray-500 mb-1">Base Price</p>
                        <p className="text-lg font-bold text-gray-900">
                          {parseFloat(pricing.base_price || 0).toFixed(2)} {pricing.currency || 'USD'}
                        </p>
                      </div>
                      {pricing.group_commission_percentage !== undefined && pricing.group_commission_percentage !== null && (
                        <div className="p-4 bg-white rounded-lg">
                          <p className="text-sm text-gray-500 mb-1">Group Commission</p>
                          <p className="text-base font-semibold text-gray-900">
                            {parseFloat(pricing.group_commission_percentage || 0).toFixed(2)}%
                          </p>
                        </div>
                      )}
                      {pricing.training_center_commission_percentage !== undefined && pricing.training_center_commission_percentage !== null && (
                        <div className="p-4 bg-white rounded-lg">
                          <p className="text-sm text-gray-500 mb-1">Training Center Commission</p>
                          <p className="text-base font-semibold text-gray-900">
                            {parseFloat(pricing.training_center_commission_percentage || 0).toFixed(2)}%
                          </p>
                        </div>
                      )}
                      {pricing.instructor_commission_percentage !== undefined && pricing.instructor_commission_percentage !== null && (
                        <div className="p-4 bg-white rounded-lg">
                          <p className="text-sm text-gray-500 mb-1">Instructor Commission</p>
                          <p className="text-base font-semibold text-gray-900">
                            {parseFloat(pricing.instructor_commission_percentage || 0).toFixed(2)}%
                          </p>
                        </div>
                      )}
                      {pricing.effective_from && (
                        <div className="p-4 bg-white rounded-lg">
                          <p className="text-sm text-gray-500 mb-1 flex items-center">
                            <Calendar size={14} className="mr-1" />
                            Effective From
                          </p>
                          <p className="text-base font-semibold text-gray-900">
                            {new Date(pricing.effective_from).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                        </div>
                      )}
                      {pricing.effective_to && (
                        <div className="p-4 bg-white rounded-lg">
                          <p className="text-sm text-gray-500 mb-1 flex items-center">
                            <Calendar size={14} className="mr-1" />
                            Effective To
                          </p>
                          <p className="text-base font-semibold text-gray-900">
                            {new Date(pricing.effective_to).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                        </div>
                      )}
                      {pricing.created_at && (
                        <div className="p-4 bg-white rounded-lg">
                          <p className="text-sm text-gray-500 mb-1 flex items-center">
                            <Calendar size={14} className="mr-1" />
                            Created At
                          </p>
                          <p className="text-base font-semibold text-gray-900">
                            {new Date(pricing.created_at).toLocaleString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      )}
                      {pricing.updated_at && (
                        <div className="p-4 bg-white rounded-lg">
                          <p className="text-sm text-gray-500 mb-1 flex items-center">
                            <Calendar size={14} className="mr-1" />
                            Updated At
                          </p>
                          <p className="text-base font-semibold text-gray-900">
                            {new Date(pricing.updated_at).toLocaleString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-3">
                      Note: Commission percentages are managed by Group Admins. Pricing is effective immediately when set.
                    </p>
                  </div>
                </div>
              ) : (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                    <DollarSign size={20} className="mr-2" />
                    Pricing Information
                  </h3>
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-3">
                      <DollarSign className="text-gray-400" size={20} />
                      <div>
                        <p className="text-sm font-medium text-gray-700">No pricing set</p>
                        <p className="text-xs text-gray-500 mt-1">You can add pricing when editing the course</p>
                      </div>
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
