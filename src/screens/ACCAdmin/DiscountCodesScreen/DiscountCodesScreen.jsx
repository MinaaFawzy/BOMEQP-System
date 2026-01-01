import { useEffect, useState, useMemo } from 'react';
import { accAPI } from '../../../services/api';
import { useHeader } from '../../../context/HeaderContext';
import { Tag, Plus, BookOpen } from 'lucide-react';
import Modal from '../../../components/Modal/Modal';
import ConfirmDialog from '../../../components/ConfirmDialog/ConfirmDialog';
import FormInput from '../../../components/FormInput/FormInput';
import DataTable from '../../../components/DataTable/DataTable';
import './DiscountCodesScreen.css';
import '../../../components/FormInput/FormInput.css';

const DiscountCodesScreen = () => {
  const { setHeaderActions, setHeaderTitle, setHeaderSubtitle } = useHeader();
  const [codes, setCodes] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCode, setSelectedCode] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    discount_percentage: '',
    discount_type: 'time_limited',
    valid_from: '',
    valid_until: '',
    status: 'active',
    course_id: '',
    total_quantity: '',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCodes();
    loadCourses();
  }, []);

  useEffect(() => {
    setHeaderTitle('Discount Codes');
    setHeaderSubtitle('Manage and track all discount codes');
    setHeaderActions(
      <button
        onClick={handleOpenModal}
        className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 flex items-center gap-2 transition-colors shadow-lg hover:shadow-xl"
      >
        <Plus size={20} />
        Add Code
      </button>
    );
    return () => {
      setHeaderActions(null);
      setHeaderTitle(null);
      setHeaderSubtitle(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setHeaderActions, setHeaderTitle, setHeaderSubtitle]);

  const loadCodes = async () => {
    setLoading(true);
    try {
      const params = {
        per_page: 1000, // Load all data
      };
      
      const data = await accAPI.listDiscountCodes(params);
      
      // Handle response structure
      let codesArray = [];
      if (data.data) {
        // Laravel pagination format
        codesArray = data.data || [];
      } else if (data.discount_codes) {
        // Non-paginated format (fallback)
        codesArray = data.discount_codes || [];
      } else {
        // Array format
        codesArray = Array.isArray(data) ? data : [];
      }
      
      // Add _searchText for better search functionality
      codesArray = codesArray.map(code => ({
        ...code,
        _searchText: [
          code.code,
          code.discount_type,
          code.status,
          ...getCourseNames(code)
        ].filter(Boolean).join(' ').toLowerCase()
      }));
      
      setCodes(codesArray);
    } catch (error) {
      console.error('Failed to load codes:', error);
      setCodes([]);
    } finally {
      setLoading(false);
    }
  };

  const loadCourses = async () => {
    try {
      const data = await accAPI.listCourses();
      setCourses(data.courses || []);
    } catch (error) {
      console.error('Failed to load courses:', error);
    }
  };

  // Helper function to get course names from IDs or course objects
  const getCourseNames = (code) => {
    // Check if code has courses array (nested objects)
    if (code.courses && Array.isArray(code.courses) && code.courses.length > 0) {
      return code.courses.map(course => course.name || course.title || 'Unknown Course');
    }
    
    // Otherwise, try to get IDs and look them up
    const courseIds = code.applicable_course_ids || code.course_ids || [];
    if (!Array.isArray(courseIds) || courseIds.length === 0) {
      return [];
    }
    
    return courseIds
      .map(id => {
        const course = courses.find(c => c.id === id);
        return course ? course.name : null;
      })
      .filter(name => name !== null);
  };

  const handleOpenModal = (code = null) => {
    // Always reset errors first
    setErrors({});
    
    // Always clear selectedCode first to ensure clean state
    setSelectedCode(null);
    
    if (code && code.id) {
      // Edit mode - code is provided with valid ID
      console.log('Opening modal for EDIT - code:', code);
      console.log('Code ID:', code.id);
      setSelectedCode(code);
      // Load course ID - handle both single course_id and array of course_ids
      let courseId = '';
      if (code.course_id) {
        courseId = code.course_id.toString();
      } else if (code.applicable_course_ids && code.applicable_course_ids.length > 0) {
        courseId = code.applicable_course_ids[0].toString();
      } else if (code.courses && code.courses.length > 0) {
        courseId = code.courses[0].id?.toString() || '';
      }
      
      setFormData({
        code: code.code || '',
        discount_percentage: code.discount_percentage || '',
        discount_type: code.discount_type || 'time_limited',
        valid_from: code.start_date ? code.start_date.split('T')[0] : '',
        valid_until: code.end_date ? code.end_date.split('T')[0] : '',
        status: code.status || 'active',
        course_id: courseId,
        total_quantity: code.total_quantity || '',
      });
    } else {
      // Create mode - no code provided or code has no ID, reset everything
      console.log('Opening modal for CREATE - resetting all fields');
      setSelectedCode(null);
      setFormData({
        code: '',
        discount_percentage: '',
        discount_type: 'time_limited',
        valid_from: '',
        valid_until: '',
        status: 'active',
        course_id: '',
        total_quantity: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCode(null);
    setFormData({
      code: '',
      discount_percentage: '',
      discount_type: 'time_limited',
      valid_from: '',
      valid_until: '',
      status: 'active',
      course_id: '',
      total_quantity: '',
    });
    setErrors({});
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Clear previous errors
    setErrors({});
    
    // Client-side validation
    const validationErrors = {};
    if (!formData.code || !formData.code.trim()) {
      validationErrors.code = 'Discount code is required';
    }
    if (!formData.discount_percentage || isNaN(formData.discount_percentage) || parseFloat(formData.discount_percentage) <= 0) {
      validationErrors.discount_percentage = 'Valid discount percentage is required';
    }
    if (!formData.discount_type) {
      validationErrors.discount_type = 'Discount type is required';
    }
    if (!formData.course_id) {
      validationErrors.course_id = 'Course is required';
    }
    
    // Validation based on discount type
    if (formData.discount_type === 'time_limited') {
      if (!formData.valid_from) {
        validationErrors.valid_from = 'Valid from date is required';
      }
      if (!formData.valid_until) {
        validationErrors.valid_until = 'Valid until date is required';
      }
      if (formData.valid_from && formData.valid_until && new Date(formData.valid_from) >= new Date(formData.valid_until)) {
        validationErrors.valid_until = 'Valid until date must be after valid from date';
      }
    } else if (formData.discount_type === 'quantity_based') {
      if (!formData.total_quantity || isNaN(formData.total_quantity) || parseInt(formData.total_quantity) <= 0) {
        validationErrors.total_quantity = 'Total quantity is required and must be greater than 0';
      }
    }

    // If validation fails, show errors and stop
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    // Validation passed, proceed with submission
    setSaving(true);

    try {
      // Build request payload matching API format exactly
      const submitData = {
        code: formData.code.trim(),
        discount_type: formData.discount_type,
        discount_percentage: parseFloat(formData.discount_percentage),
        applicable_course_ids: [parseInt(formData.course_id)],
        status: formData.status,
      };

      // Add fields based on discount type
      if (formData.discount_type === 'time_limited') {
        submitData.start_date = formData.valid_from;
        submitData.end_date = formData.valid_until;
        // Don't include total_quantity for time_limited type
      } else if (formData.discount_type === 'quantity_based') {
        submitData.total_quantity = parseInt(formData.total_quantity);
        // Don't include start_date and end_date for quantity_based type
      }

      console.log('Submitting discount code:', JSON.stringify(submitData, null, 2));
      console.log('Selected code:', selectedCode);
      console.log('Is creating new code:', !selectedCode);
      
      let response;
      // Check if we have a valid selectedCode with an ID for update
      if (selectedCode && (selectedCode.id || selectedCode.discount_code_id || selectedCode.discount_code?.id)) {
        // Update existing code - check for id in different possible fields
        const codeId = selectedCode.id || selectedCode.discount_code_id || selectedCode.discount_code?.id;
        console.log('Updating discount code with ID:', codeId);
        response = await accAPI.updateDiscountCode(codeId, submitData);
        console.log('Discount code updated:', response);
        alert('Discount code updated successfully!');
      } else {
        // Create new code - POST /api/acc/discount-codes
        // Ensure selectedCode is null/undefined for create
        if (selectedCode) {
          console.warn('Warning: selectedCode exists but has no ID, treating as create');
          setSelectedCode(null);
        }
        console.log('Creating new discount code via POST...');
        response = await accAPI.createDiscountCode(submitData);
        console.log('Discount code created:', response);
        alert('Discount code created successfully!');
      }
      
      await loadCodes();
      handleCloseModal();
    } catch (error) {
      console.error('Failed to create discount code:', error);
      console.error('Error response:', error.response);
      console.error('Error data:', error.response?.data);
      
      // Handle different error response structures
      if (error.response?.data) {
        const errorData = error.response.data;
        
        // Laravel validation errors format
        if (errorData.errors) {
          const formattedErrors = {};
          Object.keys(errorData.errors).forEach(key => {
            formattedErrors[key] = Array.isArray(errorData.errors[key]) 
              ? errorData.errors[key][0] 
              : errorData.errors[key];
          });
          setErrors(formattedErrors);
        } 
        // Single error message
        else if (errorData.message) {
          setErrors({ general: errorData.message });
        }
        // Error object with field names
        else {
          setErrors(errorData);
        }
      } 
      // Network or other errors
      else if (error.message) {
        setErrors({ general: error.message });
      } 
      else {
        setErrors({ general: 'Failed to create discount code. Please try again.' });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (code) => {
    setSelectedCode(code);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    try {
      // Check for id in different possible fields
      const codeId = selectedCode?.id || selectedCode?.discount_code_id || selectedCode?.discount_code?.id;
      if (!codeId) {
        throw new Error('Cannot delete: Discount code ID not found');
      }
      console.log('Deleting discount code with ID:', codeId);
      await accAPI.deleteDiscountCode(codeId);
      await loadCodes();
      alert('Discount code deleted successfully!');
    } catch (error) {
      console.error('Failed to delete discount code:', error);
      console.error('Selected code:', selectedCode);
      alert('Failed to delete discount code: ' + (error.response?.data?.message || error.message || 'Unknown error'));
    }
    setIsDeleteDialogOpen(false);
    setSelectedCode(null);
  };

  // Format date helper
  const formatDate = (dateString) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString();
  };

  // Define columns for DataTable
  const columns = useMemo(() => [
    {
      header: 'Code',
      accessor: 'code',
      sortable: true,
      render: (value, row) => (
        <div className="flex items-center">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg flex items-center justify-center mr-3">
            <Tag className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900">
              {value || 'N/A'}
            </div>
          </div>
        </div>
      )
    },
    {
      header: 'Discount',
      accessor: 'discount_percentage',
      sortable: true,
      render: (value) => (
        <span className="text-xl font-bold text-primary-600">
          {parseFloat(value) || 0}%
        </span>
      )
    },
    {
      header: 'Type',
      accessor: 'discount_type',
      sortable: true,
      render: (value) => (
        <span className="px-3 py-1 bg-purple-50 text-purple-700 rounded-md text-xs font-medium capitalize">
          {value ? value.replace(/_/g, ' ') : 'N/A'}
        </span>
      )
    },
    {
      header: 'Courses',
      accessor: 'courses',
      sortable: false,
      render: (value, row) => {
        const courseNames = getCourseNames(row);
        
        if (courseNames.length === 0) {
          return (
            <span className="text-sm text-gray-400 italic">No courses assigned</span>
          );
        }
        
        return (
          <div className="flex flex-wrap gap-1.5">
            {courseNames.map((name, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-medium border border-blue-200"
                title={name}
              >
                <BookOpen size={12} />
                <span className="max-w-[150px] truncate">{name}</span>
              </span>
            ))}
          </div>
        );
      }
    },
    {
      header: 'Status',
      accessor: 'status',
      sortable: true,
      render: (value) => (
        <span className={`px-3 py-1.5 inline-flex text-xs leading-5 font-bold rounded-full shadow-sm ${
          value === 'active' ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300' :
          'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300'
        }`}>
          {value ? value.charAt(0).toUpperCase() + value.slice(1) : 'N/A'}
        </span>
      )
    },
    {
      header: 'Start Date',
      accessor: 'start_date',
      sortable: true,
      render: (value) => (
        value ? (
          <span className="text-sm text-gray-700 font-medium">
            {formatDate(value)}
          </span>
        ) : (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">
            Not Set
          </span>
        )
      )
    },
    {
      header: 'End Date',
      accessor: 'end_date',
      sortable: true,
      render: (value) => (
        value ? (
          <span className="text-sm text-gray-700 font-medium">
            {formatDate(value)}
          </span>
        ) : (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">
            Not Set
          </span>
        )
      )
    },
    {
      header: 'Quantity',
      accessor: 'total_quantity',
      sortable: true,
      render: (value, row) => {
        if (row.discount_type === 'quantity_based') {
          const used = row.used_quantity || 0;
          const total = value || 0;
          const percentage = total > 0 ? Math.round((used / total) * 100) : 0;
          
          return (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-primary-700">
                  {used}
                </span>
                <span className="text-gray-400">/</span>
                <span className="text-sm font-semibold text-gray-700">
                  {total}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full transition-all"
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
                <span className="text-xs text-gray-500 whitespace-nowrap">
                  {percentage}%
                </span>
              </div>
            </div>
          );
        } else {
          return (
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-600 border border-blue-200">
              N/A
            </span>
          );
        }
      }
    }
  ], [courses]);

  // Filter options for status
  const filterOptions = useMemo(() => [
    { value: 'all', label: 'All Status', filterFn: () => true },
    { 
      value: 'active', 
      label: 'Active', 
      filterFn: (code) => code.status === 'active' 
    },
    { 
      value: 'inactive', 
      label: 'Inactive', 
      filterFn: (code) => code.status === 'inactive' 
    }
  ], []);

  return (
    <div>
      <DataTable
        columns={columns}
        data={codes}
        isLoading={loading}
        searchable={true}
        searchPlaceholder="Search by code or type..."
        filterable={true}
        filterOptions={filterOptions}
        defaultFilter="all"
        sortable={true}
        emptyMessage="No discount codes found. Create your first discount code!"
        onEdit={handleOpenModal}
        onDelete={handleDelete}
      />

      {/* Add/Edit Discount Code Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={selectedCode && (selectedCode.id || selectedCode.discount_code_id) ? 'Edit Discount Code' : 'Add New Discount Code'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.general && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{errors.general}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="Discount Code"
              name="code"
              value={formData.code}
              onChange={handleChange}
              required
              placeholder="e.g., SAVE20"
              error={errors.code}
            />

            <FormInput
              label="Discount Percentage"
              name="discount_percentage"
              type="number"
              value={formData.discount_percentage}
              onChange={handleChange}
              required
              min="0"
              max="100"
              placeholder="e.g., 20"
              error={errors.discount_percentage}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Course <span className="text-red-500 ml-1">*</span>
            </label>
            <select
              name="course_id"
              value={formData.course_id}
              onChange={handleChange}
              required
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 cursor-pointer appearance-none bg-white form-input-select ${
                errors.course_id ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <option value="">Select a course...</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name} {course.code ? `(${course.code})` : ''}
                </option>
              ))}
            </select>
            {errors.course_id && <p className="mt-1 text-sm text-red-600">{errors.course_id}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Discount Type <span className="text-red-500 ml-1">*</span>
              </label>
              <select
                name="discount_type"
                value={formData.discount_type}
                onChange={handleChange}
                required
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 cursor-pointer appearance-none bg-white form-input-select ${
                  errors.discount_type ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <option value="time_limited">Time Limited</option>
                <option value="quantity_based">Quantity Based</option>
              </select>
              {errors.discount_type && <p className="mt-1 text-sm text-red-600">{errors.discount_type}</p>}
            </div>

            <FormInput
              label="Status"
              name="status"
              type="select"
              value={formData.status}
              onChange={handleChange}
              required
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
              ]}
              error={errors.status}
            />
          </div>

          {/* Conditional fields based on discount type */}
          {formData.discount_type === 'time_limited' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                label="Valid From"
                name="valid_from"
                type="date"
                value={formData.valid_from}
                onChange={handleChange}
                required
                error={errors.valid_from}
              />

              <FormInput
                label="Valid Until"
                name="valid_until"
                type="date"
                value={formData.valid_until}
                onChange={handleChange}
                required
                error={errors.valid_until}
              />
            </div>
          )}

          {formData.discount_type === 'quantity_based' && (
            <FormInput
              label="Total Quantity"
              name="total_quantity"
              type="number"
              value={formData.total_quantity}
              onChange={handleChange}
              required
              min="1"
              placeholder="e.g., 100"
              error={errors.total_quantity}
            />
          )}

          <div className="flex space-x-3 pt-4 border-t border-gray-200">
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
              {saving ? (selectedCode && (selectedCode.id || selectedCode.discount_code_id) ? 'Updating...' : 'Creating...') : (selectedCode && (selectedCode.id || selectedCode.discount_code_id) ? 'Update Discount Code' : 'Create Discount Code')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setSelectedCode(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Discount Code"
        message={`Are you sure you want to delete discount code "${selectedCode?.code}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
};

export default DiscountCodesScreen;
