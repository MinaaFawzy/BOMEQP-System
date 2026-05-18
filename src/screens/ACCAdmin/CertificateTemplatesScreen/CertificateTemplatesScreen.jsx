import { useEffect, useState, useRef, useCallback } from 'react';
import { useTranslation } from '../../../hooks/useTranslation';
import { useNavigate } from 'react-router-dom';
import { accAPI } from '../../../services/api';
import { useHeader } from '../../../context/HeaderContext';
import { Plus, Eye, Edit, Trash2, Upload, X, Save, Type, Image as ImageIcon, ChevronUp, ChevronDown, Search, CheckCircle, BookOpen, XCircle, Building2, GraduationCap } from 'lucide-react';
import Modal from '../../../components/Modal/Modal';
import FormInput from '../../../components/FormInput/FormInput';
import DataTable from '../../../components/DataTable/DataTable';
import DetailForm from '../../../components/DetailForm/DetailForm';
import Pagination from '../../../components/Pagination/Pagination';
import useDebounce from '../../../hooks/useDebounce';
import './CertificateTemplatesScreen.css';

const CertificateTemplatesScreen = () => {
  const { t } = useTranslation('accreditation');
  const navigate = useNavigate();
  const { setHeaderActions, setHeaderTitle, setHeaderSubtitle } = useHeader();
  const [templates, setTemplates] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subCategoriesMap, setSubCategoriesMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [courses, setCourses] = useState([]);

  // Tree View State
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [expandedSubCategories, setExpandedSubCategories] = useState(new Set());
  const [courseSearchTerm, setCourseSearchTerm] = useState('');

  // Pagination & Search
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 500);
  const [pagination, setPagination] = useState({
    current_page: 1,
    per_page: 10,
    total: 0,
    last_page: 1
  });

  // Form state
  const [formData, setFormData] = useState({
    template_type: 'course',
    course_ids: [],
    name: '',
    status: 'active',
    include_card: false,
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadTemplates(pagination.current_page, debouncedSearch);
  }, [pagination.current_page, debouncedSearch]);

  const handlePageChange = (page) => {
    setPagination(prev => ({ ...prev, current_page: page }));
  };

  const handleSearch = (term) => {
    setSearchTerm(term);
    setPagination(prev => ({ ...prev, current_page: 1 }));
  };

  useEffect(() => {
    setHeaderTitle(t('certificate_templates_screen.header.title'));
    setHeaderSubtitle(t('certificate_templates_screen.header.subtitle'));
    setHeaderActions(
      <button
        onClick={handleOpenModal}
        className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 flex items-center gap-2 transition-colors shadow-lg hover:shadow-xl"
      >
        <Plus size={20} />
        {t('certificate_templates_screen.header.create')}
      </button>
    );
    return () => {
      setHeaderActions(null);
      setHeaderTitle(null);
      setHeaderSubtitle(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setHeaderActions, setHeaderTitle, setHeaderSubtitle, t]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [categoriesData, subCategoriesData, coursesData] = await Promise.all([
        accAPI.listCategories({ per_page: 10000 }),
        accAPI.listSubCategories({ per_page: 10000 }),
        accAPI.listCourses({ per_page: 10000 })
      ]);

      // Templates loaded separately in useEffect


      // Process Categories 
      let categoriesArray = [];
      if (categoriesData.data) {
        categoriesArray = categoriesData.data || [];
      } else if (categoriesData.categories) {
        categoriesArray = categoriesData.categories || [];
      } else {
        categoriesArray = Array.isArray(categoriesData) ? categoriesData : [];
      }
      setCategories(categoriesArray);

      // Process SubCategories
      let subCategoriesArray = [];
      if (subCategoriesData.data) {
        subCategoriesArray = subCategoriesData.data || [];
      } else if (subCategoriesData.sub_categories) {
        subCategoriesArray = subCategoriesData.sub_categories || [];
      } else {
        subCategoriesArray = Array.isArray(subCategoriesData) ? subCategoriesData : [];
      }

      const subCatsMap = {};
      subCategoriesArray.forEach(sc => {
        if (!subCatsMap[sc.category_id]) subCatsMap[sc.category_id] = [];
        subCatsMap[sc.category_id].push(sc);
      });
      setSubCategoriesMap(subCatsMap);

      // Process Courses
      let coursesArray = [];
      if (coursesData.data) {
        coursesArray = coursesData.data || [];
      } else if (coursesData.courses) {
        coursesArray = coursesData.courses || [];
      } else {
        coursesArray = Array.isArray(coursesData) ? coursesData : [];
      }
      setCourses(coursesArray);

    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async (page = 1, search = '') => {
    setLoading(true);
    try {
      const params = {
        page,
        per_page: pagination.per_page,
        ...(search && { search })
      };

      const data = await accAPI.listCertificateTemplates(params);
      let templatesArray = [];
      if (data.data) templatesArray = data.data;
      else if (data.templates) templatesArray = data.templates;
      else templatesArray = Array.isArray(data) ? data : [];

      setTemplates(templatesArray);

      // handle pagination
      if (data) {
        setPagination(prev => ({
          ...prev,
          current_page: data.current_page || data.meta?.current_page || page,
          total: data.total || data.meta?.total || templatesArray.length,
          last_page: data.last_page || data.meta?.last_page || 1,
          per_page: data.per_page || data.meta?.per_page || prev.per_page
        }));
      }

    } catch (error) {
      console.error('Failed to load templates:', error);
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = () => {
    setIsEditMode(false);
    setFormData({
      template_type: 'course',
      course_ids: [],
      name: '',
      status: 'active',
      include_card: false,
    });
    setErrors({});
    setExpandedCategories(new Set());
    setExpandedSubCategories(new Set());
    setCourseSearchTerm('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormData({
      template_type: 'course',
      course_ids: [],
      name: '',
      status: 'active',
      include_card: false,
    });
    setErrors({});
    setExpandedCategories(new Set());
    setExpandedSubCategories(new Set());
    setCourseSearchTerm('');
  };

  // Helper functions for Tree Selection
  const toggleCategoryExpansion = (categoryId) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) newSet.delete(categoryId);
      else newSet.add(categoryId);
      return newSet;
    });
  };

  const toggleSubCategoryExpansion = (subCategoryId) => {
    setExpandedSubCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(subCategoryId)) newSet.delete(subCategoryId);
      else newSet.add(subCategoryId);
      return newSet;
    });
  };

  const getCoursesForCategory = (categoryId) => {
    const subCats = subCategoriesMap[categoryId] || [];
    const subCatIds = subCats.map(sc => sc.id);
    return courses.filter(c => {
      const cSubId = c.sub_category_id || c.sub_category?.id;
      return subCatIds.includes(cSubId);
    });
  };

  const getCoursesForSubCategory = (subCategoryId) => {
    return courses.filter(c => {
      const cSubId = c.sub_category_id || c.sub_category?.id;
      return cSubId == subCategoryId;
    });
  };

  const handleCategoryToggle = (categoryId) => {
    const categoryCourses = getCoursesForCategory(categoryId);
    const selectableIds = categoryCourses.map(c => c.id);

    if (selectableIds.length === 0) return;

    setFormData(prev => {
      const currentIds = prev.course_ids || [];
      const allSelected = selectableIds.every(id => currentIds.includes(id));

      let newIds;
      if (allSelected) {
        // Deselect all
        newIds = currentIds.filter(id => !selectableIds.includes(id));
      } else {
        // Select all
        const idsToAdd = selectableIds.filter(id => !currentIds.includes(id));
        newIds = [...currentIds, ...idsToAdd];
      }
      return { ...prev, course_ids: newIds };
    });
  };

  const handleSubCategoryToggle = (subCategoryId) => {
    const subCatCourses = getCoursesForSubCategory(subCategoryId);
    const selectableIds = subCatCourses.map(c => c.id);

    if (selectableIds.length === 0) return;

    setFormData(prev => {
      const currentIds = prev.course_ids || [];
      const allSelected = selectableIds.every(id => currentIds.includes(id));

      let newIds;
      if (allSelected) {
        newIds = currentIds.filter(id => !selectableIds.includes(id));
      } else {
        const idsToAdd = selectableIds.filter(id => !currentIds.includes(id));
        newIds = [...currentIds, ...idsToAdd];
      }
      return { ...prev, course_ids: newIds };
    });
  };

  const handleCourseToggle = (courseId) => {
    setFormData(prev => {
      const currentIds = prev.course_ids || [];
      const newIds = currentIds.includes(courseId)
        ? currentIds.filter(id => id !== courseId)
        : [...currentIds, courseId];
      return { ...prev, course_ids: newIds };
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
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
    setSaving(true);
    setErrors({});

    try {
      const templateData = {
        template_type: formData.template_type,
        name: formData.name.trim(),
        status: formData.status,
      };

      // Only include course_ids and include_card for course type templates
      if (formData.template_type === 'course') {
        templateData.course_ids = formData.course_ids;
        templateData.include_card = formData.include_card;

        if (!templateData.course_ids || templateData.course_ids.length === 0) {
          setErrors({ general: t('certificate_templates_screen.errors.no_courses_selected', 'Please select at least one course') });
          setSaving(false);
          return;
        }
      }

      let template;
      if (isEditMode) {
        template = await accAPI.updateTemplate(selectedTemplate.id, templateData);
      } else {
        template = await accAPI.createCertificateTemplate(templateData);
      }

      handleCloseModal();
      handleCloseModal();
      loadTemplates(pagination.current_page, debouncedSearch);

      // Open designer if creating new template
      if (!isEditMode && template.template) {
        navigate(`/acc/certificate-templates/${template.template.id}/design`);
      }
    } catch (error) {
      console.error('Failed to save template:', error);

      // Handle API validation errors
      const errorData = error.response?.data;

      if (errorData) {
        const newErrors = {};

        // Handle field-specific errors (e.g., template_type validation)
        if (errorData.errors) {
          Object.keys(errorData.errors).forEach(field => {
            const fieldErrors = errorData.errors[field];
            // Join array of errors into a single string
            newErrors[field] = Array.isArray(fieldErrors) ? fieldErrors.join(', ') : fieldErrors;
          });
        }

        // Handle general message - display only the message
        if (errorData.message) {
          newErrors.general = errorData.message;
        }

        // If we have any errors, set them
        if (Object.keys(newErrors).length > 0) {
          setErrors(newErrors);
        } else {
          setErrors({ general: t('certificate_templates_screen.errors.save_failed') });
        }
      } else {
        setErrors({ general: t('certificate_templates_screen.errors.save_failed') });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleOpenDesigner = (template) => {
    navigate(`/acc/certificate-templates/${template.id}/design`);
  };

  const handleDelete = async (template, force = false) => {
    // First confirmation
    if (!force && !window.confirm(t('certificate_templates_screen.confirmations.delete', { name: template.name }))) {
      return;
    }

    try {
      await accAPI.deleteTemplate(template.id, force);
      await accAPI.deleteTemplate(template.id, force);
      loadTemplates(pagination.current_page, debouncedSearch);
    } catch (error) {
      console.error('Failed to delete template:', error);

      // Check if error is because template is in use
      const errorData = error?.response?.data;
      if (errorData?.certificate_count && errorData?.certificate_count > 0) {
        const count = errorData.certificate_count;
        const message = t('certificate_templates_screen.errors.delete_in_use', { count });

        if (window.confirm(message)) {
          // User confirmed force delete
          handleDelete(template, true);
        }
      } else {
        alert(errorData?.message || t('certificate_templates_screen.errors.delete_failed'));
      }
    }
  };

  const handleViewDetails = (template) => {
    setSelectedTemplate(template);
    setDetailModalOpen(true);
  };

  const handleEdit = (template) => {
    setSelectedTemplate(template);
    setIsEditMode(true);

    const templateType = template.template_type || 'course';

    // Determine course_ids only for course-type templates
    let courseIds = [];
    if (templateType === 'course') {
      if (template.courses && Array.isArray(template.courses) && template.courses.length > 0) {
        courseIds = template.courses.map(c => c.id);
      } else if (template.course_id) {
        // Legacy single course
        courseIds = [template.course_id];
      }
    }

    setFormData({
      template_type: templateType,
      course_ids: courseIds,
      name: template.name || '',
      status: template.status || 'active',
      include_card: templateType === 'course' ? (template.include_card ?? false) : false,
    });
    setErrors({});
    setExpandedCategories(new Set());
    setExpandedSubCategories(new Set());
    setCourseSearchTerm('');
    setIsModalOpen(true);
  };

  const columns = [
    {
      header: t('certificate_templates_screen.table.name'),
      accessor: 'name',
      sortable: true,
      render: (value) => (
        <div className="text-sm font-semibold text-gray-900">
          {value || t('certificate_templates_screen.common.na')}
        </div>
      )
    },
    {
      header: t('certificate_templates_screen.table.type', 'Type'),
      accessor: 'template_type',
      sortable: true,
      render: (value, row) => {
        const typeConfig = {
          course: {
            icon: BookOpen,
            label: t('certificate_templates_screen.types.course', 'Course'),
            bgColor: 'bg-blue-100',
            textColor: 'text-blue-800'
          },
          training_center: {
            icon: Building2,
            label: t('certificate_templates_screen.types.training_center', 'Training Provider'),
            bgColor: 'bg-green-100',
            textColor: 'text-green-800'
          },
          instructor: {
            icon: GraduationCap,
            label: t('certificate_templates_screen.types.instructor', 'Instructor'),
            bgColor: 'bg-purple-100',
            textColor: 'text-purple-800'
          }
        };

        const type = value || 'course';
        const config = typeConfig[type] || typeConfig.course;
        const Icon = config.icon;

        return (
          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold px-2 py-1 rounded ${config.bgColor} ${config.textColor} flex items-center gap-1`}>
              <Icon size={14} />
              {config.label}
            </span>
          </div>
        );
      }
    },
    {
      header: t('certificate_templates_screen.table.target', 'Target'),
      accessor: 'target',
      sortable: false,
      render: (value, row) => {
        // For training_center and instructor types, show type-specific info
        if (row.template_type === 'training_center') {
          return (
            <div className="text-sm text-gray-600 italic">
              {t('certificate_templates_screen.common.all_training_centers', 'All Training Providers')}
            </div>
          );
        }

        if (row.template_type === 'instructor') {
          return (
            <div className="text-sm text-gray-600 italic">
              {t('certificate_templates_screen.common.all_instructors', 'All Instructors')}
            </div>
          );
        }

        // Course type templates
        // New Many-to-Many Relationship
        if (row.courses && row.courses.length > 0) {
          if (row.courses.length === 1) {
            const course = row.courses[0];
            return (
              <div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800 mr-2">
                  {t('certificate_templates_screen.common.course', 'Course')}
                </span>
                <span className="text-sm text-gray-700">
                  {course.title || course.title_en || course.name}
                </span>
              </div>
            );
          }
          return (
            <div title={row.courses.map(c => c.name || c.title).join(', ')}>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 mr-2">
                {t('certificate_templates_screen.common.multiple_courses', 'Multiple Courses')}
              </span>
            </div>
          );
        }

        // Legacy Course ID
        if (row.course_id) {
          const course = row.course || courses.find(c => c.id === row.course_id);
          return (
            <div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800 mr-2">
                {t('certificate_templates_screen.common.course', 'Course')}
              </span>
              <span className="text-sm text-gray-700">
                {course?.title || course?.title_en || course?.name || t('certificate_templates_screen.common.na')}
              </span>
            </div>
          );
        }

        // Legacy Category ID
        const category = row.category || categories.find(c => c.id === row.category_id);
        return (
          <div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-purple-100 text-purple-800 mr-2">
              {t('certificate_templates_screen.common.category', 'Category')}
            </span>
            <span className="text-sm text-gray-700">
              {category?.name || category?.name_ar || t('certificate_templates_screen.common.na')}
            </span>
          </div>
        );
      }
    },
    // {
    //   header: t('certificate_templates_screen.table.status'),
    //   accessor: 'status',
    //   sortable: true,
    //   render: (value) => (
    //     <span className={`px-3 py-1.5 inline-flex text-xs leading-5 font-bold rounded-full ${value === 'active'
    //       ? 'bg-green-100 text-green-800'
    //       : 'bg-gray-100 text-gray-800'
    //       }`}>
    //       {value ? t(`certificate_templates_screen.status.${value}`, { defaultValue: value.charAt(0).toUpperCase() + value.slice(1) }) : t('certificate_templates_screen.common.na')}
    //     </span>
    //   )
    // },
    {
      header: t('certificate_templates_screen.table.actions'),
      accessor: 'actions',
      sortable: false,
      render: (value, row) => (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>

          <button
            onClick={() => handleEdit(row)}
            className="p-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100"
            title={t('certificate_templates_screen.actions.edit')}
          >
            <Edit size={16} />
          </button>
          <button
            onClick={() => handleOpenDesigner(row)}
            className="p-2 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100"
            title={t('certificate_templates_screen.actions.design')}
          >
            <ImageIcon size={16} />
          </button>
          <button
            onClick={() => handleDelete(row)}
            className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
            title={t('certificate_templates_screen.actions.delete')}
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ];

  // const filterOptions = [
  //   { value: 'all', label: t('certificate_templates_screen.filters.all'), filterFn: () => true },
  //   { value: 'active', label: t('certificate_templates_screen.filters.active'), filterFn: (t) => t.status === 'active' },
  //   { value: 'inactive', label: t('certificate_templates_screen.filters.inactive'), filterFn: (t) => t.status === 'inactive' },
  // ];



  return (
    <div>
      <DataTable
        columns={columns}
        data={templates}
        isLoading={loading}
        searchable={true}
        searchValue={searchTerm}
        onSearch={handleSearch}
        searchPlaceholder={t('certificate_templates_screen.search.placeholder')}
        filterable={true}
        // filterOptions={filterOptions}
        defaultFilter="all"
        sortable={true}
        onRowClick={handleViewDetails}
      />

      <div className="p-4 border-t border-gray-100">
        <Pagination
          currentPage={pagination.current_page}
          totalPages={pagination.last_page}
          totalItems={pagination.total}
          perPage={pagination.per_page}
          onPageChange={handlePageChange}
        />
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={isEditMode ? t('certificate_templates_screen.modal.edit_title') : t('certificate_templates_screen.modal.create_title')}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Template Type Selector - Only show when creating new template */}
          {!isEditMode && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('certificate_templates_screen.form.template_type', 'Template Type')} <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, template_type: 'course', course_ids: [] }))}
                  className={`p-4 rounded-lg border-2 transition-all ${formData.template_type === 'course'
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                >
                  <BookOpen className={`mx-auto mb-2 ${formData.template_type === 'course' ? 'text-blue-600' : 'text-gray-400'
                    }`} size={24} />
                  <div className={`text-sm font-medium ${formData.template_type === 'course' ? 'text-blue-900' : 'text-gray-700'
                    }`}>
                    {t('certificate_templates_screen.types.course', 'Course')}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {t('certificate_templates_screen.type_descriptions.course', 'For course completion')}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, template_type: 'training_center', course_ids: [] }))}
                  className={`p-4 rounded-lg border-2 transition-all ${formData.template_type === 'training_center'
                    ? 'border-green-500 bg-green-50 shadow-md'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                >
                  <Building2 className={`mx-auto mb-2 ${formData.template_type === 'training_center' ? 'text-green-600' : 'text-gray-400'
                    }`} size={24} />
                  <div className={`text-sm font-medium ${formData.template_type === 'training_center' ? 'text-green-900' : 'text-gray-700'
                    }`}>
                    {t('certificate_templates_screen.types.training_center', 'Training Provider')}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {t('certificate_templates_screen.type_descriptions.training_center', 'For Training Provider authorization')}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, template_type: 'instructor', course_ids: [] }))}
                  className={`p-4 rounded-lg border-2 transition-all ${formData.template_type === 'instructor'
                    ? 'border-purple-500 bg-purple-50 shadow-md'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                >
                  <GraduationCap className={`mx-auto mb-2 ${formData.template_type === 'instructor' ? 'text-purple-600' : 'text-gray-400'
                    }`} size={24} />
                  <div className={`text-sm font-medium ${formData.template_type === 'instructor' ? 'text-purple-900' : 'text-gray-700'
                    }`}>
                    {t('certificate_templates_screen.types.instructor', 'Instructor')}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {t('certificate_templates_screen.type_descriptions.instructor', 'For instructor authorization')}
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Show template type as read-only when editing */}
          {isEditMode && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('certificate_templates_screen.form.template_type', 'Template Type')}
              </label>
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2">
                  {formData.template_type === 'course' && <BookOpen className="text-blue-600" size={20} />}
                  {formData.template_type === 'training_center' && <Building2 className="text-green-600" size={20} />}
                  {formData.template_type === 'instructor' && <GraduationCap className="text-purple-600" size={20} />}
                  <span className="text-sm font-medium text-gray-700">
                    {t(`certificate_templates_screen.types.${formData.template_type}`, formData.template_type)}
                  </span>
                  <span className="text-xs text-gray-500 ml-auto">
                    {t('certificate_templates_screen.common.cannot_change_type', '(Cannot be changed)')}
                  </span>
                </div>
              </div>
            </div>
          )}

          <FormInput
            label={t('certificate_templates_screen.form.template_name')}
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            error={errors.name}
          />

          {/* Include Card Switch - Only show for course type templates */}
          {formData.template_type === 'course' && (
            <div className="include-card-toggle-row">
              <div className="include-card-toggle-text">
                <span className="include-card-toggle-label">
                  {t('certificate_templates_screen.form.include_card', 'Include Card')}
                </span>
                <span className="include-card-toggle-desc">
                  {t('certificate_templates_screen.form.include_card_desc', 'Attach a trainee card as a second page in the generated PDF')}
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={formData.include_card}
                onClick={() => setFormData(prev => ({ ...prev, include_card: !prev.include_card }))}
                className={`include-card-switch ${formData.include_card ? 'include-card-switch--on' : 'include-card-switch--off'}`}
              >
                <span className="include-card-switch__thumb" />
              </button>
            </div>
          )}

          {/* Course Selection - Only show for course type templates */}
          {formData.template_type === 'course' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('certificate_templates_screen.form.select_courses', 'Select Courses')} <span className="text-red-500">*</span>
              </label>

              <div className="mb-4">
                <input
                  type="text"
                  value={courseSearchTerm}
                  onChange={(e) => setCourseSearchTerm(e.target.value)}
                  placeholder={t('certificate_templates_screen.search.placeholder', 'Search courses...')}
                  className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
              </div>

              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {categories.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-gray-200 border-dashed">
                    {t('certificate_templates_screen.no_categories', 'No categories found')}
                  </div>
                ) : (
                  categories.map(category => {
                    const categoryCourses = getCoursesForCategory(category.id);
                    const categorySubCats = subCategoriesMap[category.id] || [];

                    const hasMatchingChildren = courseSearchTerm && categoryCourses.some(c =>
                      (c.name || '').toLowerCase().includes(courseSearchTerm.toLowerCase()) ||
                      (c.code || '').toLowerCase().includes(courseSearchTerm.toLowerCase())
                    );

                    if (courseSearchTerm && !hasMatchingChildren) {
                      return null;
                    }

                    if (!courseSearchTerm && categoryCourses.length === 0) return null;

                    const selectableIds = categoryCourses.map(c => c.id);
                    const isAllSelected = selectableIds.length > 0 && selectableIds.every(id => formData.course_ids.includes(id));
                    const isSomeSelected = selectableIds.some(id => formData.course_ids.includes(id));
                    const isExpanded = courseSearchTerm ? true : expandedCategories.has(category.id);

                    return (
                      <div key={category.id} className="border border-gray-200 rounded-lg overflow-hidden mb-2 last:mb-0">
                        <div
                          className="flex items-center justify-between p-3 bg-white cursor-pointer hover:bg-gray-50 transition-colors"
                          onClick={(e) => {
                            if (e.target.type === 'checkbox') return;
                            toggleCategoryExpansion(category.id);
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isAllSelected}
                              ref={input => input && (input.indeterminate = isSomeSelected && !isAllSelected)}
                              onChange={() => handleCategoryToggle(category.id)}
                              onClick={e => e.stopPropagation()}
                              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded cursor-pointer"
                            />
                            <div>
                              <span className="text-sm font-medium text-gray-900 block">
                                {category.name || category.name_ar || `Category ${category.id}`}
                              </span>
                              <span className="text-xs text-gray-500 block">
                                ({categoryCourses.length} {t('certificate_templates_screen.common.courses', 'courses')})
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="text-gray-400 p-1"
                          >
                            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                          </button>
                        </div>

                        {isExpanded && (
                          <div className="border-t border-gray-200 bg-gray-50 p-2 space-y-2">
                            {categorySubCats.map(subCat => {
                              const subCatCourses = getCoursesForSubCategory(subCat.id);

                              const filteredSubCatCourses = subCatCourses.filter(course => {
                                if (!courseSearchTerm) return true;
                                const term = courseSearchTerm.toLowerCase();
                                return (course.name || '').toLowerCase().includes(term) ||
                                  (course.code || '').toLowerCase().includes(term);
                              });

                              if (filteredSubCatCourses.length === 0) return null;

                              const subCatIds = filteredSubCatCourses.map(c => c.id);
                              const isSubAllSelected = subCatIds.length > 0 && subCatIds.every(id => formData.course_ids.includes(id));
                              const isSubSomeSelected = subCatIds.some(id => formData.course_ids.includes(id));
                              const isSubExpanded = courseSearchTerm ? true : expandedSubCategories.has(subCat.id);

                              return (
                                <div key={subCat.id} className="bg-white border border-gray-200 rounded-md">
                                  <div
                                    className="flex items-center justify-between p-2 cursor-pointer hover:bg-gray-50 rounded-t-md"
                                    onClick={(e) => {
                                      if (e.target.type === 'checkbox') return;
                                      toggleSubCategoryExpansion(subCat.id);
                                    }}
                                  >
                                    <div className="flex items-center gap-3 pl-2">
                                      <input
                                        type="checkbox"
                                        checked={isSubAllSelected}
                                        ref={input => input && (input.indeterminate = isSubSomeSelected && !isSubAllSelected)}
                                        onChange={() => handleSubCategoryToggle(subCat.id)}
                                        onClick={e => e.stopPropagation()}
                                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded cursor-pointer"
                                      />
                                      <span className="text-sm font-medium text-gray-700">
                                        {subCat.name || `Sub-Cat ${subCat.id}`}
                                        <span className="text-gray-400 font-normal ml-1">({filteredSubCatCourses.length})</span>
                                      </span>
                                    </div>
                                    <div className="text-gray-400">
                                      {isSubExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    </div>
                                  </div>

                                  {isSubExpanded && (
                                    <div className="border-t border-gray-100">
                                      {filteredSubCatCourses.map(course => {
                                        const isSelected = formData.course_ids.includes(course.id);
                                        return (
                                          <div
                                            key={course.id}
                                            className={`flex items-start gap-3 p-2 pl-8 border-b border-gray-50 last:border-0 hover:bg-gray-50 cursor-pointer ${isSelected ? 'bg-primary-50' : ''}`}
                                            onClick={() => handleCourseToggle(course.id)}
                                          >
                                            <input
                                              type="checkbox"
                                              checked={isSelected}
                                              onChange={() => handleCourseToggle(course.id)}
                                              onClick={e => e.stopPropagation()}
                                              className="mt-0.5 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded cursor-pointer"
                                            />
                                            <div className="flex-1 min-w-0">
                                              <div className="text-sm text-gray-700 font-medium">
                                                {course.name || course.title || course.title_en}
                                              </div>
                                              {course.code && (
                                                <div className="text-xs text-gray-400 mt-0.5">
                                                  {course.code}
                                                </div>
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
                        )}
                      </div>
                    );
                  })
                )}
              </div>
              {errors.course_ids && <p className="mt-1 text-sm text-red-600">{errors.course_ids}</p>}
            </div>
          )}

          {/* <FormInput
            label={t('certificate_templates_screen.form.status')}
            name="status"
            type="select"
            value={formData.status}
            onChange={handleChange}
            required
            options={[
              { value: 'active', label: t('certificate_templates_screen.status.active') },
              { value: 'inactive', label: t('certificate_templates_screen.status.inactive') }
            ]}
            error={errors.status}
            /> */}

          {errors.general && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">
              {errors.general}
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t border-gray-100 mt-4">
            <button
              type="button"
              onClick={handleCloseModal}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200 transition-colors bg-white font-medium shadow-sm"
            >
              {t('certificate_templates_screen.buttons.cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 transition-colors font-medium shadow-sm"
            >
              {saving ? t('certificate_templates_screen.buttons.saving') : isEditMode ? t('certificate_templates_screen.buttons.update') : t('certificate_templates_screen.buttons.create')}
            </button>
          </div>
        </form>
      </Modal>


      {/* Template Designer Modal - REMOVED, now using standalone screen */}


      {/* Detail Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedTemplate(null);
        }}
        title={t('certificate_templates_screen.modal.details_title')}
        size="lg"
      >
        {selectedTemplate && (
          <DetailForm
            data={selectedTemplate}
            fields={[
              { key: 'name', label: t('certificate_templates_screen.details.template_name') },
              {
                key: 'template_type',
                label: t('certificate_templates_screen.form.template_type', 'Template Type'),
                render: (value) => {
                  const typeConfig = {
                    course: { icon: BookOpen, label: t('certificate_templates_screen.types.course', 'Course'), color: 'blue' },
                    training_center: { icon: Building2, label: t('certificate_templates_screen.types.training_center', 'Training Provider'), color: 'green' },
                    instructor: { icon: GraduationCap, label: t('certificate_templates_screen.types.instructor', 'Instructor'), color: 'purple' }
                  };
                  const type = value || 'course';
                  const config = typeConfig[type] || typeConfig.course;
                  const Icon = config.icon;
                  return (
                    <div className="flex items-center gap-2">
                      <Icon className={`text-${config.color}-600`} size={18} />
                      <span className="text-sm font-medium">{config.label}</span>
                    </div>
                  );
                }
              },
              { key: 'status', label: t('certificate_templates_screen.details.status') },
              // Only show assigned courses field for course-type templates
              ...(selectedTemplate?.template_type === 'course' || !selectedTemplate?.template_type ? [{
                key: 'courses',
                label: t('certificate_templates_screen.form.assigned_courses', 'Assigned Courses'),
                showEmpty: true,
                render: (_, row) => {
                  // Course type templates
                  if (row.courses && row.courses.length > 0) {
                    return (
                      <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-primary-100 text-primary-800">
                            {row.courses.length} {t('certificate_templates_screen.common.courses', 'Courses')}
                          </span>
                        </div>
                        <ul className="space-y-1 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                          {row.courses.map(course => (
                            <li key={course.id} className="text-sm text-gray-700 flex items-start gap-2 bg-white p-2 rounded border border-gray-100">
                              <BookOpen size={14} className="mt-0.5 text-gray-400 shrink-0" />
                              <span>{course.title || course.title_en || course.name || `Course ${course.id}`}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  }

                  if (row.course_id) {
                    const course = row.course || courses.find(c => c.id === row.course_id);
                    return (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                          {t('certificate_templates_screen.common.course', 'Course')}
                        </span>
                        <span className="text-sm text-gray-700">
                          {course?.title || course?.title_en || course?.name || t('certificate_templates_screen.common.na')}
                        </span>
                      </div>
                    );
                  }

                  const category = row.category || categories.find(c => c.id === row.category_id);
                  if (category) {
                    return (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                          {t('certificate_templates_screen.common.category', 'Category')}
                        </span>
                        <span className="text-sm text-gray-700">
                          {category?.name || category?.name_ar || t('certificate_templates_screen.common.na')}
                        </span>
                      </div>
                    );
                  }

                  return <span className="text-gray-400 italic">{t('certificate_templates_screen.common.na', 'N/A')}</span>;
                }
              }] : [])
            ]}
          />
        )}
      </Modal>
    </div >
  );
};

export default CertificateTemplatesScreen;