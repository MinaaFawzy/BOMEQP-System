import { useEffect, useState, useMemo, useRef } from 'react';
import { adminAPI } from '../../../services/api';
import { useHeader } from '../../../context/HeaderContext';
import { Plus, FileText, Edit, Trash2, Layers, CheckCircle, ChevronDown, ChevronUp, ClipboardList, XCircle } from 'lucide-react';
import Modal from '../../../components/Modal/Modal';
import ConfirmDialog from '../../../components/ConfirmDialog/ConfirmDialog';
import Button from '../../../components/Button/Button';
import TabCard from '../../../components/TabCard/TabCard';
import TabCardsGrid from '../../../components/TabCardsGrid/TabCardsGrid';
import DataTable from '../../../components/DataTable/DataTable';
import Pagination from '../../../components/Pagination/Pagination';
import './CategoriesScreen.css';
import FormInput from '../../../components/FormInput/FormInput';

const CategoriesScreen = () => {
  const { setHeaderTitle, setHeaderSubtitle } = useHeader();

  const [allCategories, setAllCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    name_ar: '',
    description: '',
    status: 'active',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Pagination State
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
    per_page: 10,
    from: 0,
    to: 0
  });

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Stats State
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0
  });

  const [allSubCategories, setAllSubCategories] = useState([]);
  const [subCategoriesLoading, setSubCategoriesLoading] = useState(true);
  const [isSubCategoryModalOpen, setIsSubCategoryModalOpen] = useState(false);
  const [isSubCategoryDeleteDialogOpen, setIsSubCategoryDeleteDialogOpen] = useState(false);
  const [selectedSubCategory, setSelectedSubCategory] = useState(null);
  const [subCategoryFormData, setSubCategoryFormData] = useState({
    category_id: '',
    name: '',
    name_ar: '',
    description: '',
    status: 'active',
  });
  const [subCategoryErrors, setSubCategoryErrors] = useState({});
  const [subCategorySaving, setSubCategorySaving] = useState(false);

  // Track if data has been loaded before
  const hasDataRef = useRef(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPagination(prev => ({ ...prev, current_page: 1 }));
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setHeaderTitle('Course Categories');
    setHeaderSubtitle('Manage global categories and sub-categories');
    return () => {
      setHeaderTitle(null);
      setHeaderSubtitle(null);
    };
  }, [setHeaderTitle, setHeaderSubtitle]);

  // Load data when dependencies change
  useEffect(() => {
    const showLoading = !hasDataRef.current;

    // Don't load if search is still being debounced
    if (searchQuery !== debouncedSearch) {
      return;
    }

    loadCategories(showLoading);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.current_page, pagination.per_page, debouncedSearch, statusFilter]);

  useEffect(() => {
    loadSubCategories(); // Load sub categories on mount or when needed
  }, []);

  const loadCategories = async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    }
    try {
      // Build query parameters
      const params = {
        page: pagination.current_page,
        per_page: pagination.per_page,
      };

      // Add search if there's a value
      if (debouncedSearch) {
        params.search = debouncedSearch;
      }

      // Add status filter if not 'all'
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      const data = await adminAPI.listCategories(params);

      let catsList = [];
      if (data?.data) {
        catsList = Array.isArray(data.data) ? data.data : [];
      } else if (data?.categories) {
        catsList = Array.isArray(data.categories) ? data.categories : [];
      } else {
        catsList = Array.isArray(data) ? data : [];
      }

      setAllCategories(catsList);

      // Update pagination state
      if (data) {
        const totalItems = data.total || (data.statistics?.total) || catsList.length;
        const currentPerPage = pagination.per_page;
        const calculatedLastPage = data.last_page || Math.ceil(totalItems / currentPerPage) || 1;
        const calculatedFrom = data.from || (catsList.length > 0 ? ((pagination.current_page - 1) * currentPerPage) + 1 : 0);
        const calculatedTo = data.to || (catsList.length > 0 ? calculatedFrom + catsList.length - 1 : 0);

        setPagination(prev => ({
          ...prev,
          current_page: data.current_page || prev.current_page || 1,
          last_page: calculatedLastPage,
          total: totalItems,
          from: calculatedFrom,
          to: calculatedTo
        }));

        // Update stats if available
        if (data.statistics) {
          setStats({
            total: data.statistics.total || 0,
            active: data.statistics.active || 0,
            inactive: data.statistics.inactive || 0
          });
        }
      }

      hasDataRef.current = true;
    } catch (error) {
      console.error('Failed to load categories:', error);
      setAllCategories([]);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

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

  const handleOpenModal = (category = null) => {
    if (category) {
      setSelectedCategory(category);
      setFormData({
        name: category.name || '',
        name_ar: category.name_ar || '',
        description: category.description || '',
        status: category.status || 'active',
      });
    } else {
      setSelectedCategory(null);
      setFormData({
        name: '',
        name_ar: '',
        description: '',
        status: 'active',
      });
    }
    setErrors({});
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCategory(null);
    setFormData({
      name: '',
      name_ar: '',
      description: '',
      status: 'active',
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
      if (selectedCategory) {
        await adminAPI.updateCategory(selectedCategory.id, formData);
      } else {
        await adminAPI.createCategory(formData);
      }
      await loadCategories();
      handleCloseModal();
    } catch (error) {
      if (error.errors) {
        setErrors(error.errors);
      } else {
        setErrors({ general: error.message || 'Failed to save category' });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (category) => {
    setSelectedCategory(category);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await adminAPI.deleteCategory(selectedCategory.id);
      await loadCategories();
    } catch (error) {
      alert('Failed to delete category: ' + (error.message || 'Unknown error'));
    }
    setIsDeleteDialogOpen(false);
    setSelectedCategory(null);
  };

  const loadSubCategories = async (categoryId = null) => {
    setSubCategoriesLoading(true);
    try {
      const params = { per_page: 1000 };

      if (categoryId) {
        params.category_id = categoryId;
      }

      const data = await adminAPI.listSubCategories(params);

      let subCatsList = [];
      if (data?.data) {
        subCatsList = Array.isArray(data.data) ? data.data : [];
      } else if (data?.sub_categories) {
        subCatsList = Array.isArray(data.sub_categories) ? data.sub_categories : [];
      } else {
        subCatsList = Array.isArray(data) ? data : [];
      }

      setAllSubCategories(subCatsList);
    } catch (error) {
      console.error('Failed to load sub categories:', error);
      setAllSubCategories([]);
    } finally {
      setSubCategoriesLoading(false);
    }
  };

  // Get sub categories for a specific category
  const getSubCategoriesForCategory = (categoryId) => {
    return allSubCategories.filter(subCat => subCat.category_id === categoryId);
  };

  // Define columns for DataTable
  const columns = useMemo(() => [
    {
      header: 'Category',
      accessor: 'name',
      sortable: true,
      render: (value, row, { isExpanded, toggleExpand }) => {
        const categorySubCats = getSubCategoriesForCategory(row.id);
        return (
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (toggleExpand) toggleExpand(e);
              }}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              {isExpanded ? (
                <ChevronUp size={18} className="text-gray-600" />
              ) : (
                <ChevronDown size={18} className="text-gray-600" />
              )}
            </button>
            <div className="w-10 h-10 bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900">
                {row.name || 'N/A'}
              </div>
              {row.name_ar && (
                <div className="text-xs text-gray-500">{row.name_ar}</div>
              )}
              {categorySubCats.length > 0 && (
                <div className="text-xs text-gray-400 mt-0.5">
                  {categorySubCats.length} sub-categor{categorySubCats.length === 1 ? 'y' : 'ies'}
                </div>
              )}
            </div>
          </div>
        );
      },
    },
    {
      header: 'Description',
      accessor: 'description',
      sortable: true,
      render: (value) => (
        <div className="text-sm text-gray-600 max-w-xs truncate">
          {value || '-'}
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: 'status',
      sortable: true,
      render: (value) => (
        <span className={`px-3 py-1.5 inline-flex items-center text-xs leading-5 font-bold rounded-full shadow-sm ${value === 'active'
          ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300'
          : 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300'
          }`}>
          {value === 'active' && <CheckCircle size={12} className="mr-1" />}
          {value ? value.charAt(0).toUpperCase() + value.slice(1) : 'N/A'}
        </span>
      ),
    },
  ], [allSubCategories]);

  // Render expanded row content
  const renderExpandedRow = (category) => {
    const categorySubCats = getSubCategoriesForCategory(category.id);
    return (
      <div>
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Sub Categories for "{category.name}"
          </h3>
        </div>
        {categorySubCats.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm bg-white rounded-lg border border-gray-200">
            No sub categories found for this category.
          </div>
        ) : (
          <div className="space-y-2 mb-4">
            {categorySubCats.map(subCat => (
              <div
                key={subCat.id}
                className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-8 h-8 bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg flex items-center justify-center">
                      <Layers className="h-4 w-4 text-primary-600" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-gray-900">
                        {subCat.name || 'N/A'}
                      </div>
                      {subCat.name_ar && (
                        <div className="text-xs text-gray-500">{subCat.name_ar}</div>
                      )}
                      {subCat.description && (
                        <div className="text-xs text-gray-400 mt-1">{subCat.description}</div>
                      )}
                    </div>
                    <span className={`px-3 py-1 inline-flex items-center text-xs font-bold rounded-full ${subCat.status === 'active'
                      ? 'bg-green-100 text-green-800 border border-green-300'
                      : 'bg-gray-100 text-gray-800 border border-gray-300'
                      }`}>
                      {subCat.status === 'active' && <CheckCircle size={12} className="mr-1" />}
                      {subCat.status ? subCat.status.charAt(0).toUpperCase() + subCat.status.slice(1) : 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleOpenSubCategoryModal(subCat)}
                      className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 hover:scale-110 transition-all duration-200 shadow-sm hover:shadow-md"
                      title="Edit"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteSubCategory(subCat)}
                      className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 hover:scale-110 transition-all duration-200 shadow-sm hover:shadow-md"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="pt-4 border-t border-gray-200">
          <button
            onClick={() => {
              setSubCategoryFormData({
                category_id: category.id,
                name: '',
                name_ar: '',
                description: '',
                status: 'active',
              });
              setSelectedSubCategory(null);
              setSubCategoryErrors({});
              setIsSubCategoryModalOpen(true);
            }}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <Plus size={16} />
            Add Sub Category
          </button>
        </div>
      </div>
    );
  };

  const handleOpenSubCategoryModal = (subCategory = null) => {
    if (subCategory) {
      setSelectedSubCategory(subCategory);
      setSubCategoryFormData({
        category_id: subCategory.category_id || '',
        name: subCategory.name || '',
        name_ar: subCategory.name_ar || '',
        description: subCategory.description || '',
        status: subCategory.status || 'active',
      });
    } else {
      setSelectedSubCategory(null);
      setSubCategoryFormData({
        category_id: '',
        name: '',
        name_ar: '',
        description: '',
        status: 'active',
      });
    }
    setSubCategoryErrors({});
    setIsSubCategoryModalOpen(true);
  };

  const handleCloseSubCategoryModal = () => {
    setIsSubCategoryModalOpen(false);
    setSelectedSubCategory(null);
    setSubCategoryFormData({
      category_id: '',
      name: '',
      name_ar: '',
      description: '',
      status: 'active',
    });
    setSubCategoryErrors({});
  };

  const handleSubCategoryChange = (e) => {
    setSubCategoryFormData({
      ...subCategoryFormData,
      [e.target.name]: e.target.value,
    });
    setSubCategoryErrors({});
  };

  const handleSubCategorySubmit = async (e) => {
    e.preventDefault();
    setSubCategorySaving(true);
    setSubCategoryErrors({});

    try {
      if (selectedSubCategory) {
        await adminAPI.updateSubCategory(selectedSubCategory.id, subCategoryFormData);
      } else {
        await adminAPI.createSubCategory(subCategoryFormData);
      }
      await loadSubCategories();
      handleCloseSubCategoryModal();
    } catch (error) {
      if (error.response?.data?.errors) {
        setSubCategoryErrors(error.response.data.errors);
      } else if (error.response?.data?.message) {
        setSubCategoryErrors({ general: error.response.data.message });
      } else {
        setSubCategoryErrors({ general: error.message || 'Failed to save sub category' });
      }
    } finally {
      setSubCategorySaving(false);
    }
  };

  const handleDeleteSubCategory = (subCategory) => {
    setSelectedSubCategory(subCategory);
    setIsSubCategoryDeleteDialogOpen(true);
  };

  const confirmDeleteSubCategory = async () => {
    try {
      await adminAPI.deleteSubCategory(selectedSubCategory.id);
      await loadSubCategories();
    } catch (error) {
      alert('Failed to delete sub category: ' + (error.message || 'Unknown error'));
    }
    setIsSubCategoryDeleteDialogOpen(false);
    setSelectedSubCategory(null);
  };

  // Calculate stats
  const totalCategories = allCategories.length;
  const activeCategories = allCategories.filter(c => c.status === 'active').length;
  const totalSubCategories = allSubCategories.length;
  const activeSubCategories = allSubCategories.filter(sc => sc.status === 'active').length;


  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <TabCardsGrid columns={{ mobile: 1, tablet: 2, desktop: 4 }}>
        <TabCard
          name="Total Categories"
          value={totalCategories}
          icon={FileText}
          colorType="indigo"
        />
        <TabCard
          name="Active Categories"
          value={activeCategories}
          icon={CheckCircle}
          colorType="green"
        />
        <TabCard
          name="Total Sub Categories"
          value={totalSubCategories}
          icon={Layers}
          colorType="blue"
        />
        <TabCard
          name="Active Sub Categories"
          value={activeSubCategories}
          icon={CheckCircle}
          colorType="purple"
        />
      </TabCardsGrid>

      {/* Categories Table with Expandable Sub Categories */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">Categories</h2>
          <Button
            onClick={() => handleOpenModal()}
            icon={<Plus size={20} />}
          >
            Add Category
          </Button>
        </div>

        <DataTable
          columns={columns}
          data={allCategories}
          onEdit={handleOpenModal}
          onDelete={handleDelete}
          isLoading={loading}
          emptyMessage="No categories found. Create your first category to get started!"
          searchable={true}
          searchValue={searchQuery}
          onSearch={(value) => setSearchQuery(value)}
          filterable={false}
          searchPlaceholder="Search by name..."

          sortable={true}
          expandable={true}
          renderExpandedRow={renderExpandedRow}
        />

        {allCategories.length > 0 && (
          <div className="border-t border-gray-100">
            <Pagination
              currentPage={pagination.current_page}
              totalPages={pagination.last_page}
              totalItems={pagination.total}
              perPage={pagination.per_page}
              onPageChange={handlePageChange}
              onPerPageChange={handlePerPageChange}
            />
          </div>
        )}
      </div>

      {/* Add/Edit Category Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={selectedCategory ? 'Edit Category' : 'Add New Category'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormInput
            label="Category Name (English)"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            error={errors.name}
          />

          <FormInput
            label="Category Name (Arabic)"
            name="name_ar"
            value={formData.name_ar}
            onChange={handleChange}
            error={errors.name_ar}
          />

          <FormInput
            label="Description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            textarea
            rows={3}
            error={errors.description}
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
            <Button
              type="submit"
              disabled={saving}
              loading={saving}
              fullWidth
            >
              {selectedCategory ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Category Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setSelectedCategory(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Category"
        message={`Are you sure you want to delete "${selectedCategory?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />

      {/* Sub Category Add/Edit Modal */}
      <Modal
        isOpen={isSubCategoryModalOpen}
        onClose={handleCloseSubCategoryModal}
        title={selectedSubCategory ? 'Edit Sub Category' : 'Add New Sub Category'}
        size="md"
      >
        <form onSubmit={handleSubCategorySubmit} className="space-y-4">
          <FormInput
            label="Category"
            name="category_id"
            type="select"
            value={subCategoryFormData.category_id}
            onChange={handleSubCategoryChange}
            required
            disabled={true}
            options={allCategories.map(cat => ({
              value: cat.id,
              label: cat.name || `Category ${cat.id}`,
            }))}
            error={subCategoryErrors.category_id}
          />

          <FormInput
            label="Sub Category Name (English)"
            name="name"
            value={subCategoryFormData.name}
            onChange={handleSubCategoryChange}
            required
            error={subCategoryErrors.name}
          />

          <FormInput
            label="Sub Category Name (Arabic)"
            name="name_ar"
            value={subCategoryFormData.name_ar}
            onChange={handleSubCategoryChange}
            error={subCategoryErrors.name_ar}
          />

          <FormInput
            label="Description"
            name="description"
            value={subCategoryFormData.description}
            onChange={handleSubCategoryChange}
            textarea
            rows={3}
            error={subCategoryErrors.description}
          />

          <FormInput
            label="Status"
            name="status"
            type="select"
            value={subCategoryFormData.status}
            onChange={handleSubCategoryChange}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ]}
            error={subCategoryErrors.status}
          />

          {subCategoryErrors.general && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600 font-medium">{subCategoryErrors.general}</p>
            </div>
          )}

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={handleCloseSubCategoryModal}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all duration-200 hover:scale-105 transform"
            >
              Cancel
            </button>
            <Button
              type="submit"
              disabled={subCategorySaving}
              loading={subCategorySaving}
              fullWidth
            >
              {selectedSubCategory ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Sub Category Delete Confirmation */}
      <ConfirmDialog
        isOpen={isSubCategoryDeleteDialogOpen}
        onClose={() => {
          setIsSubCategoryDeleteDialogOpen(false);
          setSelectedSubCategory(null);
        }}
        onConfirm={confirmDeleteSubCategory}
        title="Delete Sub Category"
        message={`Are you sure you want to delete "${selectedSubCategory?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
};

export default CategoriesScreen;
