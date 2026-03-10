import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useTranslation } from '../../../hooks/useTranslation';
import { accAPI } from '../../../services/api';
import { useHeader } from '../../../context/HeaderContext';
import { GraduationCap, Plus, Edit, Trash2, Eye, Clock, DollarSign, Hash, Calendar, BookOpen, Search } from 'lucide-react';
import Modal from '../../../components/Modal/Modal';
import ConfirmDialog from '../../../components/ConfirmDialog/ConfirmDialog';
import FormInput from '../../../components/FormInput/FormInput';
import DataTable from '../../../components/DataTable/DataTable';
import DetailForm from '../../../components/DetailForm/DetailForm';
import Pagination from '../../../components/Pagination/Pagination';
import BulkImportExportMenu from '../../../components/BulkImportExportMenu/BulkImportExportMenu';
import { validateRequired, validateNumber, validateMinLength, validateMaxLength } from '../../../utils/validation';
import './CoursesScreen.css';

const CoursesScreen = () => {
  const { t } = useTranslation('accreditation');
  const { setHeaderActions, setHeaderTitle, setHeaderSubtitle } = useHeader();
  const handleOpenModalRef = useRef(null);
  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [allSubCategories, setAllSubCategories] = useState([]);
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
    per_page: 10,
    from: 0,
    to: 0
  });

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [formData, setFormData] = useState({
    category_id: '',
    sub_category_id: '',
    name: '',
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
    loadCategories();
    loadSubCategories();
  }, []);

  // Load data when dependencies change
  useEffect(() => {
    loadCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, levelFilter, pagination.current_page, pagination.per_page, debouncedSearch]);

  // Set header actions and title
  useEffect(() => {
    setHeaderTitle(t('courses_screen.header.title'));
    setHeaderSubtitle(t('courses_screen.header.subtitle'));

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
        {t('courses_screen.header.add')}
      </button>
    );

    return () => {
      setHeaderActions(null);
      setHeaderTitle(null);
      setHeaderSubtitle(null);
    };
  }, [setHeaderActions, setHeaderTitle, setHeaderSubtitle, t]);

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

  const loadCategories = async () => {
    try {
      const data = await accAPI.listCategories({ per_page: 1000 });

      // Handle various response structures
      if (data.data && Array.isArray(data.data)) {
        setCategories(data.data);
      } else if (data.categories && Array.isArray(data.categories)) {
        setCategories(data.categories);
      } else if (Array.isArray(data)) {
        setCategories(data);
      } else {
        console.warn('Unexpected categories response format:', data);
        setCategories([]);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
      setCategories([]);
    }
  };

  const loadSubCategories = async () => {
    try {
      // Fetch all sub-categories for the dropdown
      const data = await accAPI.listSubCategories({ per_page: 1000 });

      // Handle various response structures
      if (data.data && Array.isArray(data.data)) {
        // Laravel pagination results
        setAllSubCategories(data.data);
        setSubCategories(data.data);
      } else if (data.sub_categories && Array.isArray(data.sub_categories)) {
        // Wrapped in key
        setAllSubCategories(data.sub_categories);
        setSubCategories(data.sub_categories);
      } else if (Array.isArray(data)) {
        // Direct array
        setAllSubCategories(data);
        setSubCategories(data);
      } else {
        console.warn('Unexpected sub categories response format:', data);
        setAllSubCategories([]);
        setSubCategories([]);
      }
    } catch (error) {
      console.error('Failed to load sub categories:', error);
      setAllSubCategories([]);
      setSubCategories([]);
    }
  };

  const handleOpenModal = useCallback((course = null) => {
    if (course) {
      setSelectedCourse(course);

      // Get category_id from sub_category if available
      const categoryId = course.sub_category?.category_id || '';

      setFormData({
        category_id: categoryId,
        sub_category_id: course.sub_category_id || '',
        name: course.name || '',
        code: course.code || '',
        description: course.description || '',
        duration_hours: course.duration_hours || '',
        max_capacity: course.max_capacity || '',
        level: course.level || 'beginner',
        status: course.status || 'active',
        assessor_required: course.assessor_required || false,
      });

      // Filter sub-categories based on category
      if (categoryId) {
        const filtered = allSubCategories.filter(sub => sub.category_id === parseInt(categoryId));
        setSubCategories(filtered);
      } else {
        setSubCategories([]);
      }

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
        category_id: '',
        sub_category_id: '',
        name: '',
        code: '',
        description: '',
        duration_hours: '',
        max_capacity: '',
        level: 'beginner',
        status: 'active',
        assessor_required: false,
      });
      setSubCategories([]);
      setPricingData({
        base_price: '',
        currency: 'USD',
      });
    }
    setErrors({});
    setIsModalOpen(true);
  }, [allSubCategories]);

  // Update ref when handleOpenModal is defined
  useEffect(() => {
    handleOpenModalRef.current = () => handleOpenModal();
  }, []);

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCourse(null);
    setFormData({
      category_id: '',
      sub_category_id: '',
      name: '',
      code: '',
      description: '',
      duration_hours: '',
      level: 'beginner',
      status: 'active',
      assessor_required: false,
    });
    setSubCategories([]);
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

  const handleCategoryChange = (e) => {
    const categoryId = e.target.value;
    setFormData({
      ...formData,
      category_id: categoryId,
      sub_category_id: '', // Reset sub-category when category changes
    });

    // Filter sub-categories based on selected category
    if (categoryId) {
      const filtered = allSubCategories.filter(sub => sub.category_id === parseInt(categoryId));
      setSubCategories(filtered);
    } else {
      setSubCategories([]);
    }

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
      newErrors.name = t('courses_screen.validation.course_name_required');
    } else if (formData.name.length > 255) {
      newErrors.name = t('courses_screen.validation.course_name_max');
    }



    if (!formData.code || formData.code.trim() === '') {
      newErrors.code = t('courses_screen.validation.course_code_required');
    } else if (formData.code.length > 255) {
      newErrors.code = t('courses_screen.validation.course_code_max');
    }

    // Description is now required
    if (!formData.description || formData.description.trim() === '') {
      newErrors.description = 'Description is required';
    }

    if (!formData.category_id) {
      newErrors.category_id = t('courses_screen.validation.category_required');
    }

    if (!formData.sub_category_id) {
      newErrors.sub_category_id = t('courses_screen.validation.sub_category_required');
    }

    const durationError = validateRequired(formData.duration_hours, 'Duration');
    if (durationError) {
      newErrors.duration_hours = t('courses_screen.validation.duration_min');
    } else {
      const durationNum = parseInt(formData.duration_hours);
      if (isNaN(durationNum) || durationNum < 1) {
        newErrors.duration_hours = t('courses_screen.validation.duration_min');
      }
    }

    // Validate max_capacity (required field)
    if (!formData.max_capacity || formData.max_capacity.toString().trim() === '') {
      newErrors.max_capacity = t('courses_screen.validation.capacity_required');
    } else {
      const maxCapacityNum = parseInt(formData.max_capacity);
      if (isNaN(maxCapacityNum) || maxCapacityNum < 1) {
        newErrors.max_capacity = t('courses_screen.validation.capacity_min');
      }
    }

    if (!formData.level) {
      newErrors.level = 'Level is required';
    } else if (!['beginner', 'intermediate', 'advanced'].includes(formData.level)) {
      newErrors.level = t('courses_screen.validation.invalid_level');
    }

    if (!formData.status) {
      newErrors.status = 'Status is required';
    } else if (!['active', 'inactive', 'archived'].includes(formData.status)) {
      newErrors.status = t('courses_screen.validation.invalid_status');
    }

    // Validate pricing - base_price is now required
    if (!pricingData.base_price || pricingData.base_price.toString().trim() === '') {
      newErrors.base_price = 'Price is required';
    } else {
      const basePriceError = validateNumber(pricingData.base_price, 'Base Price', 0);
      if (basePriceError) {
        newErrors.base_price = basePriceError;
      }
    }

    if (!pricingData.currency || pricingData.currency.trim() === '') {
      newErrors.currency = t('courses_screen.validation.currency_required');
    } else if (pricingData.currency.length !== 3) {
      newErrors.currency = 'Currency must be a 3-character code (e.g., USD)';
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

      // Pricing is now required - always include it
      const pricing = {
        base_price: parseFloat(pricingData.base_price),
        currency: pricingData.currency,
      };

      payload.pricing = pricing;

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
      alert(selectedCourse ? t('courses_screen.messages.updated_success') : t('courses_screen.messages.created_success'));
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

      alert(`${t('courses_screen.messages.save_failed')}: ${error.response?.data?.message || error.message || 'Failed to save course'}`);
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
      alert(t('courses_screen.messages.deleted_success'));
    } catch (error) {
      alert(t('courses_screen.messages.save_failed') + ': ' + (error.message || 'Unknown error'));
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
      header: t('courses_screen.table.course'),
      accessor: 'name',
      sortable: true,
      render: (value, row) => (
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg flex items-center justify-center mr-3">
            <GraduationCap className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900">{value || t('courses_screen.common.na')}</div>
            {row.code && <div className="text-xs text-gray-400 mt-1">{t('courses_screen.form.course_code')}: {row.code}</div>}
          </div>
        </div>
      )
    },
    {
      header: t('courses_screen.table.level'),
      accessor: 'level',
      sortable: true,
      render: (value) => (
        <span className="px-3 py-1.5 inline-flex text-xs font-bold rounded-full shadow-sm bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-300 capitalize">
          {value || t('courses_screen.common.na')}
        </span>
      )
    },
    {
      header: t('courses_screen.table.duration'),
      accessor: 'duration_hours',
      sortable: true,
      render: (value) => (
        <div className="flex items-center text-sm text-gray-600 gap-2">
          <Clock className="h-4 w-4 mr-2 text-gray-400" />
          {value ? `${value} ${t('courses_screen.common.hours')}` : t('courses_screen.common.na')}
        </div>
      )
    },
    {
      header: t('courses_screen.table.status'),
      accessor: 'status',
      sortable: true,
      render: (value) => (
        <span className={`px-3 py-1.5 inline-flex text-xs leading-5 font-bold rounded-full shadow-sm ${value === 'active' ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300' :
          'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300'
          }`}>
          {value ? t(`courses_screen.status.${value}`, { defaultValue: value.charAt(0).toUpperCase() + value.slice(1) }) : t('courses_screen.common.na')}
        </span>
      )
    },
    {
      header: t('courses_screen.table.pricing'),
      accessor: 'pricing',
      sortable: false,
      render: (value, row) => {
        const pricing = row.current_price || row.pricing ||
          (row.certificate_pricing && row.certificate_pricing.length > 0
            ? row.certificate_pricing[0]
            : null);
        return pricing ? (
          <div className="flex items-center text-sm font-semibold text-gray-900 gap-2">
            <DollarSign className="h-4 w-4 mr-1 text-primary-600" />
            {parseFloat(pricing.base_price || 0).toFixed(2)} {pricing.currency || 'USD'}
          </div>
        ) : (
          <span className="text-sm text-gray-400">{t('courses_screen.pricing.not_set')}</span>
        );
      }
    },
    {
      header: t('courses_screen.table.assessor'),
      accessor: 'assessor_required',
      sortable: true,
      render: (value) => (
        value ? (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
            {t('courses_screen.assessor.required')}
          </span>
        ) : (
          <span className="text-sm text-gray-400">{t('courses_screen.assessor.not_required')}</span>
        )
      )
    },
    {
      header: t('courses_screen.table.actions'),
      accessor: 'actions',
      sortable: false,
      render: (value, row) => (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => handleOpenModal(row)}
            className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 hover:scale-110 transition-all duration-200 shadow-sm hover:shadow-md"
            title={t('courses_screen.actions.edit')}
          >
            <Edit size={16} />
          </button>
          <button
            onClick={() => handleDelete(row)}
            className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 hover:scale-110 transition-all duration-200 shadow-sm hover:shadow-md"
            title={t('courses_screen.actions.delete')}
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ], [handleOpenModal, handleDelete]);


  // ── Bulk import/export handlers ────────────────────────────────────────────
  const handleDownloadCoursesTemplate = (format) => accAPI.downloadCoursesTemplate(format);

  const handleImportCourses = async (formData) => {
    const result = await accAPI.importCourses(formData);
    // Refresh the courses list after a successful import
    await loadCourses();
    return result;
  };
  // ───────────────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Search and Filters */}
      <div className="mb-4">
        <div className="flex gap-4">
          {/* Search Input */}
          <div className="relative flex-1">
            <input
              type="text"
              placeholder={t('courses_screen.search.placeholder')}
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
              <option value="all">{t('courses_screen.filters.all_status')}</option>
              <option value="active">{t('courses_screen.filters.active')}</option>
              <option value="inactive">{t('courses_screen.filters.inactive')}</option>
            </select>
          </div>

          {/* Bulk Import / Export */}
          <BulkImportExportMenu
            mode="courses"
            onDownloadCategories={handleDownloadCoursesTemplate}
            onImportCategories={handleImportCourses}
          />
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
          emptyMessage={t('courses_screen.table.no_courses')}
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
        title={selectedCourse ? t('courses_screen.header.edit') : t('courses_screen.header.add')}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label={t('courses_screen.form.course_name_en')}
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              error={errors.name}
            />

            <FormInput
              label={t('courses_screen.form.course_code')}
              name="code"
              value={formData.code}
              onChange={handleChange}
              required
              placeholder="e.g., AST-101"
              error={errors.code}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label={t('courses_screen.form.category')}
              name="category_id"
              type="select"
              value={formData.category_id}
              onChange={handleCategoryChange}
              required
              options={categories.map(cat => ({
                value: cat.id,
                label: cat.name || cat.title || `Category ${cat.id}`,
              }))}
              error={errors.category_id}
            />

            <FormInput
              label={t('courses_screen.form.sub_category')}
              name="sub_category_id"
              type="select"
              value={formData.sub_category_id}
              onChange={handleChange}
              required
              disabled={!formData.category_id}
              options={formData.category_id ? subCategories.map(cat => ({
                value: cat.id,
                label: cat.name || cat.title || `Sub Category ${cat.id}`,
              })) : []}
              error={errors.sub_category_id}
              placeholder={!formData.category_id ? "Please select a category first" : "Select sub-category"}
            />
          </div>

          <FormInput
            label={t('courses_screen.form.description')}
            name="description"
            value={formData.description}
            onChange={handleChange}
            required
            textarea
            rows={4}
            error={errors.description}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label={t('courses_screen.form.duration_hours')}
              name="duration_hours"
              type="number"
              value={formData.duration_hours}
              onChange={handleChange}
              required
              min="1"
              error={errors.duration_hours}
            />

            <FormInput
              label={t('courses_screen.form.max_capacity')}
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
              label={t('courses_screen.form.level')}
              name="level"
              type="select"
              value={formData.level}
              onChange={handleChange}
              options={[
                { value: 'beginner', label: t('courses_screen.filters.beginner') },
                { value: 'intermediate', label: t('courses_screen.filters.intermediate') },
                { value: 'advanced', label: t('courses_screen.filters.advanced') },
              ]}
              error={errors.level}
            />

            <FormInput
              label={t('courses_screen.form.status')}
              name="status"
              type="select"
              value={formData.status}
              onChange={handleChange}
              options={[
                { value: 'active', label: t('courses_screen.filters.active') },
                { value: 'inactive', label: t('courses_screen.filters.inactive') },
                { value: 'archived', label: t('courses_screen.filters.archived') },
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
              {t('courses_screen.form.assessor_required')}
            </label>
          </div>
          <p className="text-xs text-gray-500 -mt-2 ml-6">{t('courses_screen.form.assessor_required_hint')}</p>

          {/* Pricing Section */}
          <div className="border-t pt-4 mt-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <DollarSign size={20} className="text-primary-600" />
              {t('courses_screen.pricing.information_title')}
            </h3>
            <p className="text-sm text-red-600 mb-4 font-medium">
              * Price is required
            </p>

            {/* Base Price and Currency */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                label={t('courses_screen.pricing.base_price')}
                name="base_price"
                type="number"
                value={pricingData.base_price}
                onChange={handlePricingChange}
                required
                placeholder="0.00"
                step="0.01"
                min="0"
                error={errors.base_price}
              />

              <FormInput
                label={t('courses_screen.pricing.currency')}
                name="currency"
                type="select"
                value={pricingData.currency}
                onChange={handlePricingChange}
                required
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
              {t('courses_screen.actions.cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? t('courses_screen.actions.saving') : selectedCourse ? t('courses_screen.header.update') : t('courses_screen.header.create')}
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
        title={t('courses_screen.details.modal_title')}
        size="lg"
      >
        {selectedCourse && (
          <div className="space-y-6">
            {/* Course Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <GraduationCap className="mr-2" size={20} />
                {t('courses_screen.details.course_information')}
              </h3>
              <DetailForm
                data={selectedCourse}
                fields={[
                  { key: 'id', label: t('courses_screen.details.course_id'), icon: Hash, render: (value) => value ? `#${value}` : t('courses_screen.common.na'), showEmpty: false },
                  { key: 'name', label: t('courses_screen.details.course_name'), icon: BookOpen },
                  { key: 'code', label: t('courses_screen.details.course_code'), icon: Hash },
                  { key: 'level', label: t('courses_screen.form.level'), render: (value) => value ? value.charAt(0).toUpperCase() + value.slice(1) : t('courses_screen.common.na') },
                  { key: 'duration_hours', label: t('courses_screen.details.duration'), icon: Clock, render: (value) => value ? `${value} ${t('courses_screen.common.hours')}` : t('courses_screen.common.na') },
                  { key: 'max_capacity', label: t('courses_screen.details.max_capacity'), render: (value) => value ? `${value} ${t('courses_screen.common.trainees')}` : t('courses_screen.common.na') },
                  { key: 'status', label: t('courses_screen.form.status'), type: 'status' },
                  { key: 'assessor_required', label: t('courses_screen.form.assessor_required'), render: (value) => value ? t('courses_screen.assessor.required') : t('courses_screen.assessor.not_required') },
                  { key: 'created_at', label: t('courses_screen.details.created_at'), type: 'datetime', icon: Calendar, showEmpty: false },
                  { key: 'updated_at', label: t('courses_screen.details.updated_at'), type: 'datetime', icon: Calendar, showEmpty: false },
                ]}
              />
            </div>

            {/* Category Information */}
            {selectedCourse.sub_category && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <BookOpen className="mr-2" size={20} />
                  {t('courses_screen.details.category_information')}
                </h3>
                <DetailForm
                  data={selectedCourse.sub_category}
                  fields={[
                    { key: 'id', label: 'Sub Category ID', icon: Hash, render: (value) => value ? `#${value}` : t('courses_screen.common.na'), showEmpty: false },
                    { key: 'name', label: t('courses_screen.details.sub_category'), icon: BookOpen },
                    { key: 'description', label: 'Sub Category Description', fullWidth: true, showEmpty: false },
                  ]}
                />
                {selectedCourse.sub_category.category && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1">{t('courses_screen.details.category')}</p>
                    <p className="text-base font-semibold text-gray-900">
                      {selectedCourse.sub_category.category.name || t('courses_screen.common.na')}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Description */}
            {selectedCourse.description && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">{t('courses_screen.form.description')}</h3>
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
                    {t('courses_screen.details.pricing_information')}
                  </h3>
                  <div className="p-4 bg-gradient-to-br from-primary-50 to-primary-100 rounded-lg border border-primary-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                      <div className="p-4 bg-white rounded-lg">
                        <p className="text-sm text-gray-500 mb-1">{t('courses_screen.pricing.base_price')}</p>
                        <p className="text-lg font-bold text-gray-900">
                          {parseFloat(pricing.base_price || 0).toFixed(2)} {pricing.currency || 'USD'}
                        </p>
                      </div>

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
                      {t('courses_screen.pricing.note')}
                    </p>
                  </div>
                </div>
              ) : (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                    <DollarSign size={20} className="mr-2" />
                    {t('courses_screen.details.pricing_information')}
                  </h3>
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-3">
                      <DollarSign className="text-gray-400" size={20} />
                      <div>
                        <p className="text-sm font-medium text-gray-700">{t('courses_screen.details.no_pricing')}</p>
                        <p className="text-xs text-gray-500 mt-1">{t('courses_screen.details.no_pricing_hint')}</p>
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
        title={t('courses_screen.actions.delete_confirm_title')}
        message={t('courses_screen.actions.delete_confirm_message')}
        confirmText={t('courses_screen.actions.delete')}
        variant="danger"
      />
    </div>
  );
};

export default CoursesScreen;
