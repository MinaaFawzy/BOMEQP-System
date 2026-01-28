import { useEffect, useState, useRef, useCallback } from 'react';
import { useTranslation } from '../../../hooks/useTranslation';
import { useNavigate } from 'react-router-dom';
import { accAPI } from '../../../services/api';
import { useHeader } from '../../../context/HeaderContext';
import { Plus, Eye, Edit, Trash2, Upload, X, Save, Type, Image as ImageIcon } from 'lucide-react';
import Modal from '../../../components/Modal/Modal';
import FormInput from '../../../components/FormInput/FormInput';
import DataTable from '../../../components/DataTable/DataTable';
import DetailForm from '../../../components/DetailForm/DetailForm';
import './CertificateTemplatesScreen.css';

const CertificateTemplatesScreen = () => {
  const { t } = useTranslation('accreditation');
  const navigate = useNavigate();
  const { setHeaderActions, setHeaderTitle, setHeaderSubtitle } = useHeader();
  const [templates, setTemplates] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [courses, setCourses] = useState([]);
  const [templateType, setTemplateType] = useState('category'); // 'category' or 'course'

  // Form state
  const [formData, setFormData] = useState({
    category_id: '',
    course_id: '',
    name: '',
    status: 'active',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadTemplates();
    loadCategories();
    loadCourses();
  }, []);

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

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const params = { per_page: 1000 };
      const data = await accAPI.listCertificateTemplates(params);

      let templatesArray = [];
      if (data.data) {
        templatesArray = data.data || [];
      } else if (data.templates) {
        templatesArray = data.templates || [];
      } else {
        templatesArray = Array.isArray(data) ? data : [];
      }

      setTemplates(templatesArray);
    } catch (error) {
      console.error('Failed to load templates:', error);
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const data = await accAPI.listCategories({ per_page: 1000 });

      let categoriesArray = [];
      if (data.data) {
        categoriesArray = data.data || [];
      } else if (data.categories) {
        categoriesArray = data.categories || [];
      } else {
        categoriesArray = Array.isArray(data) ? data : [];
      }

      setCategories(categoriesArray);
    } catch (error) {
      console.error('Failed to load categories:', error);
      setCategories([]);
    }
  };

  const loadCourses = async () => {
    try {
      const data = await accAPI.listCourses({ per_page: 1000 });

      let coursesArray = [];
      if (data.data) {
        coursesArray = data.data || [];
      } else if (data.courses) {
        coursesArray = data.courses || [];
      } else {
        coursesArray = Array.isArray(data) ? data : [];
      }

      setCourses(coursesArray);
    } catch (error) {
      console.error('Failed to load courses:', error);
      setCourses([]);
    }
  };

  const handleOpenModal = () => {
    setIsEditMode(false);
    setFormData({
      category_id: '',
      name: '',
      status: 'active',
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormData({
      category_id: '',
      name: '',
      status: 'active',
    });
    setErrors({});
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
        name: formData.name.trim(),
        status: formData.status,
      };

      if (templateType === 'category') {
        templateData.category_id = parseInt(formData.category_id);
      } else {
        templateData.course_id = parseInt(formData.course_id);
      }

      let template;
      if (isEditMode) {
        template = await accAPI.updateTemplate(selectedTemplate.id, templateData);
      } else {
        template = await accAPI.createCertificateTemplate(templateData);
      }

      handleCloseModal();
      loadTemplates();

      // Open designer if creating new template
      // Open designer if creating new template
      if (!isEditMode && template.template) {
        navigate(`/acc/certificate-templates/${template.template.id}/design`);
      }
    } catch (error) {
      console.error('Failed to save template:', error);
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      } else if (error.response?.data?.message) {
        setErrors({ general: error.response.data.message });
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
      loadTemplates();
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
    const type = template.course_id ? 'course' : 'category';
    setTemplateType(type);
    setFormData({
      category_id: template.category_id?.toString() || '',
      course_id: template.course_id?.toString() || '',
      name: template.name || '',
      status: template.status || 'active',
    });
    setErrors({});
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
      header: t('certificate_templates_screen.table.target', 'Target'),
      accessor: 'target',
      sortable: false,
      render: (value, row) => {
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
    {
      header: t('certificate_templates_screen.table.status'),
      accessor: 'status',
      sortable: true,
      render: (value) => (
        <span className={`px-3 py-1.5 inline-flex text-xs leading-5 font-bold rounded-full ${value === 'active'
          ? 'bg-green-100 text-green-800'
          : 'bg-gray-100 text-gray-800'
          }`}>
          {value ? t(`certificate_templates_screen.status.${value}`, { defaultValue: value.charAt(0).toUpperCase() + value.slice(1) }) : t('certificate_templates_screen.common.na')}
        </span>
      )
    },
    {
      header: t('certificate_templates_screen.table.actions'),
      accessor: 'actions',
      sortable: false,
      render: (value, row) => (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => handleViewDetails(row)}
            className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100"
            title={t('certificate_templates_screen.actions.view_details')}
          >
            <Eye size={16} />
          </button>
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

  const filterOptions = [
    { value: 'all', label: t('certificate_templates_screen.filters.all'), filterFn: () => true },
    { value: 'active', label: t('certificate_templates_screen.filters.active'), filterFn: (t) => t.status === 'active' },
    { value: 'inactive', label: t('certificate_templates_screen.filters.inactive'), filterFn: (t) => t.status === 'inactive' },
  ];



  return (
    <div>
      <DataTable
        columns={columns}
        data={templates}
        isLoading={loading}
        searchable={true}
        searchPlaceholder={t('certificate_templates_screen.search.placeholder')}
        filterable={true}
        filterOptions={filterOptions}
        defaultFilter="all"
        sortable={true}
        onRowClick={handleViewDetails}
      />

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={isEditMode ? t('certificate_templates_screen.modal.edit_title') : t('certificate_templates_screen.modal.create_title')}
        size="md"
      >
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <FormInput
              label={t('certificate_templates_screen.form.template_name')}
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              error={errors.name}
            />

            <div className="space-y-2 mb-4">
              <label className="block text-sm font-medium text-gray-700">
                {t('certificate_templates_screen.form.scope', 'Template Scope')}
              </label>
              <div className="flex space-x-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio text-primary-600"
                    name="templateType"
                    value="category"
                    checked={templateType === 'category'}
                    onChange={() => setTemplateType('category')}
                  />
                  <span className="ml-2">{t('certificate_templates_screen.form.category_level', 'Category Level')}</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio text-primary-600"
                    name="templateType"
                    value="course"
                    checked={templateType === 'course'}
                    onChange={() => setTemplateType('course')}
                  />
                  <span className="ml-2">{t('certificate_templates_screen.form.course_specific', 'Course Specific')}</span>
                </label>
              </div>
            </div>

            {templateType === 'category' ? (
              <FormInput
                label={t('certificate_templates_screen.form.category')}
                name="category_id"
                type="select"
                value={formData.category_id}
                onChange={handleChange}
                required={templateType === 'category'}
                options={[
                  { value: '', label: t('certificate_templates_screen.form.select_category') },
                  ...categories.map(cat => ({
                    value: cat.id.toString(),
                    label: cat.name || cat.name_ar || `Category ${cat.id}`
                  }))
                ]}
                error={errors.category_id}
              />
            ) : (
              <FormInput
                label={t('certificate_templates_screen.form.course', 'Course')}
                name="course_id"
                type="select"
                value={formData.course_id}
                onChange={handleChange}
                required={templateType === 'course'}
                options={[
                  { value: '', label: t('certificate_templates_screen.form.select_course', 'Select Course') },
                  ...courses.map(course => ({
                    value: course.id.toString(),
                    label: course.title || course.title_en || course.name || `Course ${course.id}`
                  }))
                ]}
                error={errors.course_id}
              />
            )}

            <FormInput
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
            />

            {errors.general && (
              <p className="text-sm text-red-600">{errors.general}</p>
            )}

            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={handleCloseModal}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                {t('certificate_templates_screen.buttons.cancel')}
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {saving ? t('certificate_templates_screen.buttons.saving') : isEditMode ? t('certificate_templates_screen.buttons.update') : t('certificate_templates_screen.buttons.create')}
              </button>
            </div>
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
                key: 'target',
                label: t('certificate_templates_screen.details.target', 'Target'),
                render: (value) => {
                  if (selectedTemplate.course_id) {
                    const course = selectedTemplate.course || courses.find(c => c.id === selectedTemplate.course_id);
                    return (
                      <div>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800 mr-2">
                          {t('certificate_templates_screen.common.course', 'Course')}
                        </span>
                        <span>
                          {course?.title || course?.title_en || course?.name || t('certificate_templates_screen.common.na')}
                        </span>
                      </div>
                    );
                  }

                  const category = selectedTemplate.category || categories.find(c => c.id === selectedTemplate.category_id);
                  return (
                    <div>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-purple-100 text-purple-800 mr-2">
                        {t('certificate_templates_screen.common.category', 'Category')}
                      </span>
                      <span>
                        {category?.name || category?.name_ar || t('certificate_templates_screen.common.na')}
                      </span>
                    </div>
                  );
                }
              },
              { key: 'status', label: t('certificate_templates_screen.details.status') },
              {
                key: 'config_json',
                label: t('certificate_templates_screen.details.configuration'),
                render: (value) => value ? (
                  <pre className="text-xs bg-gray-50 p-3 rounded overflow-auto max-h-64">
                    {JSON.stringify(value, null, 2)}
                  </pre>
                ) : t('certificate_templates_screen.details.no_configuration')
              },
              {
                key: 'background_image_url',
                label: t('certificate_templates_screen.details.background_image'),
                render: (value) => value ? (
                  <img src={value} alt="Background" className="max-w-full h-48 object-contain border rounded" />
                ) : t('certificate_templates_screen.details.no_background')
              },
            ]}
          />
        )}
      </Modal>
    </div>
  );
};

export default CertificateTemplatesScreen;