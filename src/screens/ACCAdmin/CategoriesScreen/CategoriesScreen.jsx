import { useEffect, useState, useMemo } from 'react';
import { accAPI } from '../../../services/api';
import { useHeader } from '../../../context/HeaderContext';
import { Plus, FileText, Layers, RefreshCw, Edit, Trash2, ChevronDown, ChevronUp, CheckCircle } from 'lucide-react';
import Modal from '../../../components/Modal/Modal';
import ConfirmDialog from '../../../components/ConfirmDialog/ConfirmDialog';
import Button from '../../../components/Button/Button';
import TabCard from '../../../components/TabCard/TabCard';
import TabCardsGrid from '../../../components/TabCardsGrid/TabCardsGrid';
import DataTable from '../../../components/DataTable/DataTable';
import './CategoriesScreen.css';
import FormInput from '../../../components/FormInput/FormInput';

const CategoriesScreen = () => {
  const { setHeaderTitle, setHeaderSubtitle } = useHeader();
  
  const [categories, setCategories] = useState([]);
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

  const [subCategories, setSubCategories] = useState([]);
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

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    setHeaderTitle('Categories');
    setHeaderSubtitle('View assigned categories and manage your own categories');
    return () => {
      setHeaderTitle(null);
      setHeaderSubtitle(null);
    };
  }, [setHeaderTitle, setHeaderSubtitle]);


  const loadCategories = async () => {
    try {
      setLoading(true);
      const params = {
        per_page: 1000, // Load all data
      };
      
      const data = await accAPI.listCategories(params);
      
      // Handle different response structures
      let catsList = [];
      if (data?.data) {
        catsList = Array.isArray(data.data) ? data.data : [];
      } else if (data?.categories && Array.isArray(data.categories)) {
        catsList = data.categories;
      } else if (Array.isArray(data)) {
        catsList = data;
      } else {
        console.warn('Unexpected API response structure:', data);
        catsList = [];
      }
      
      // Add _searchText for better search functionality
      catsList = catsList.map(cat => ({
        ...cat,
        _searchText: [
          cat.name,
          cat.name_ar,
          cat.description,
          cat.status
        ].filter(Boolean).join(' ').toLowerCase()
      }));
      
      setCategories(catsList);
      
      // Extract sub_categories from categories (they come nested in the response)
      const allSubCats = [];
      catsList.forEach(cat => {
        if (cat.sub_categories && Array.isArray(cat.sub_categories)) {
          allSubCats.push(...cat.sub_categories);
        }
      });
      
      // Also load sub categories separately to get all accessible ones
      if (catsList.length > 0) {
        await loadSubCategories();
      } else if (allSubCats.length > 0) {
        // If we got sub_categories from categories, use them
        const subCatsWithSearch = allSubCats.map(subCat => ({
          ...subCat,
          _searchText: [
            subCat.name,
            subCat.name_ar,
            subCat.description,
            subCat.status
          ].filter(Boolean).join(' ').toLowerCase()
        }));
        setSubCategories(subCatsWithSearch);
        setSubCategoriesLoading(false);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
      console.error('Error details:', error.response?.data || error.message);
      // Set empty arrays on error to prevent UI issues
      setCategories([]);
    } finally {
      setLoading(false);
    }
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
        await accAPI.updateCategory(selectedCategory.id, formData);
      } else {
        await accAPI.createCategory(formData);
      }
      await loadCategories();
      handleCloseModal();
    } catch (error) {
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      } else if (error.response?.data?.message) {
        setErrors({ general: error.response.data.message });
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
      await accAPI.deleteCategory(selectedCategory.id);
      await loadCategories();
    } catch (error) {
      alert('Failed to delete category: ' + (error.response?.data?.message || error.message || 'Unknown error'));
    }
    setIsDeleteDialogOpen(false);
    setSelectedCategory(null);
  };

  const loadSubCategories = async (categoryId = null) => {
    setSubCategoriesLoading(true);
    try {
      const params = {
        per_page: 1000, // Load all data
      };
      
      if (categoryId) {
        params.category_id = categoryId;
      }
      
      const data = await accAPI.listSubCategories(params);
      
      let subCatsList = [];
      if (data?.data) {
        subCatsList = Array.isArray(data.data) ? data.data : [];
      } else if (data?.sub_categories) {
        subCatsList = Array.isArray(data.sub_categories) ? data.sub_categories : [];
      } else {
        subCatsList = Array.isArray(data) ? data : [];
      }
      
      // Add _searchText for better search functionality
      subCatsList = subCatsList.map(subCat => {
        const category = categories.find(cat => cat.id === subCat.category_id);
        return {
          ...subCat,
          _searchText: [
            subCat.name,
            subCat.name_ar,
            subCat.description,
            subCat.status,
            category?.name || ''
          ].filter(Boolean).join(' ').toLowerCase()
        };
      });
      
      setSubCategories(subCatsList);
    } catch (error) {
      console.error('Failed to load sub categories:', error);
      setSubCategories([]);
    } finally {
      setSubCategoriesLoading(false);
    }
  };
  
  // Load sub categories when categories are loaded
  useEffect(() => {
    if (categories.length > 0) {
      loadSubCategories();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories.length]);

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
        await accAPI.updateSubCategory(selectedSubCategory.id, subCategoryFormData);
      } else {
        await accAPI.createSubCategory(subCategoryFormData);
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
      await accAPI.deleteSubCategory(selectedSubCategory.id);
      await loadSubCategories();
    } catch (error) {
      alert('Failed to delete sub category: ' + (error.response?.data?.message || error.message || 'Unknown error'));
    }
    setIsSubCategoryDeleteDialogOpen(false);
    setSelectedSubCategory(null);
  };

  // Calculate stats - show all accessible categories (assigned + created)
  // According to API: ACC can see categories assigned to them or created by them
  const totalCategories = categories.length;
  const activeCategories = categories.filter(c => c.status === 'active').length;
  const totalSubCategories = subCategories.length;
  const activeSubCategories = subCategories.filter(sc => sc.status === 'active').length;
  
  // Check if category was created by current ACC (for UI display)
  const isCategoryCreatedByMe = (category) => {
    // If created_by = 1, it's assigned by Admin
    // If created_by != 1 (and not null), it's created by this ACC
    return category.created_by != null && category.created_by !== undefined && category.created_by !== 1;
  };

  // Check if sub category was created by current ACC (for UI display)
  const isSubCategoryCreatedByMe = (subCategory) => {
    // If created_by = 1, it's assigned by Admin
    // If created_by != 1 (and not null), it's created by this ACC
    return subCategory.created_by != null && subCategory.created_by !== undefined && subCategory.created_by !== 1;
  };

  // Get sub categories for a specific category
  const getSubCategoriesForCategory = (categoryId) => {
    return subCategories.filter(subCat => subCat.category_id === categoryId);
  };

  // Prepare data for DataTable with search text
  const categoriesData = useMemo(() => {
    return categories.map(category => ({
      ...category,
      _searchText: `${category.name || ''} ${category.name_ar || ''} ${category.description || ''} ${category.status || ''}`.toLowerCase()
    }));
  }, [categories]);

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
        <span className={`px-3 py-1.5 inline-flex text-xs leading-5 font-bold rounded-full shadow-sm ${
          value === 'active' 
            ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300' 
            : 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300'
        }`}>
          {value ? value.charAt(0).toUpperCase() + value.slice(1) : 'N/A'}
        </span>
      ),
    },
    {
      header: 'Type',
      accessor: 'type',
      sortable: false,
      render: (value, row) => (
        <div className="flex flex-col gap-1">
          <span className={`px-3 py-1.5 inline-flex text-xs leading-5 font-bold rounded-full shadow-sm ${
            isCategoryCreatedByMe(row)
              ? 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-300' 
              : 'bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 border border-purple-300'
          }`}>
            {isCategoryCreatedByMe(row) ? 'Created by Me' : 'Assigned by Admin'}
          </span>
        </div>
      ),
    },
    {
      header: 'Actions',
      accessor: 'actions',
      sortable: false,
      render: (value, row) => {
        const canEdit = isCategoryCreatedByMe(row);
        return (
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => {
                if (canEdit) {
                  handleOpenModal(row);
                }
              }}
              className={`p-2 rounded-lg hover:scale-110 transition-all duration-200 shadow-sm hover:shadow-md ${
                canEdit
                  ? 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                  : 'bg-gray-50 text-gray-400 hover:bg-gray-100 cursor-not-allowed'
              }`}
              title={canEdit ? 'Edit Category' : 'Cannot edit - Assigned by Admin'}
              disabled={!canEdit}
            >
              <Edit size={16} />
            </button>
            <button
              onClick={() => {
                if (canEdit) {
                  handleDelete(row);
                }
              }}
              className={`p-2 rounded-lg hover:scale-110 transition-all duration-200 shadow-sm hover:shadow-md ${
                canEdit
                  ? 'bg-red-50 text-red-600 hover:bg-red-100'
                  : 'bg-gray-50 text-gray-400 hover:bg-gray-100 cursor-not-allowed'
              }`}
              title={canEdit ? 'Delete Category' : 'Cannot delete - Assigned by Admin'}
              disabled={!canEdit}
            >
              <Trash2 size={16} />
            </button>
          </div>
        );
      },
    },
  ], [subCategories]);

  // Filter options for DataTable
  const filterOptions = useMemo(() => [
    { value: 'all', label: 'All Status', filterFn: () => true },
    { value: 'active', label: 'Active', filterFn: (row) => row.status === 'active' },
    { value: 'inactive', label: 'Inactive', filterFn: (row) => row.status === 'inactive' },
  ], []);

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
                    <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                      subCat.status === 'active' 
                        ? 'bg-green-100 text-green-800 border border-green-300' 
                        : 'bg-gray-100 text-gray-800 border border-gray-300'
                    }`}>
                      {subCat.status ? subCat.status.charAt(0).toUpperCase() + subCat.status.slice(1) : 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleOpenSubCategoryModal(subCat)}
                      className={`p-2 rounded-lg hover:scale-110 transition-all duration-200 shadow-sm hover:shadow-md ${
                        isSubCategoryCreatedByMe(subCat)
                          ? 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                          : 'bg-gray-50 text-gray-400 hover:bg-gray-100 cursor-not-allowed'
                      }`}
                      title={isSubCategoryCreatedByMe(subCat) ? 'Edit Sub Category' : 'Cannot edit - Created by Admin'}
                      disabled={!isSubCategoryCreatedByMe(subCat)}
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteSubCategory(subCat)}
                      className={`p-2 rounded-lg hover:scale-110 transition-all duration-200 shadow-sm hover:shadow-md ${
                        isSubCategoryCreatedByMe(subCat)
                          ? 'bg-red-50 text-red-600 hover:bg-red-100'
                          : 'bg-gray-50 text-gray-400 hover:bg-gray-100 cursor-not-allowed'
                      }`}
                      title={isSubCategoryCreatedByMe(subCat) ? 'Delete Sub Category' : 'Cannot delete - Created by Admin'}
                      disabled={!isSubCategoryCreatedByMe(subCat)}
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

  // Filter options for sub categories
  const subCategoryFilterOptions = useMemo(() => [
    { value: 'all', label: 'All Status', filterFn: () => true },
    { 
      value: 'active', 
      label: 'Active', 
      filterFn: (subCat) => subCat.status === 'active' 
    },
    { 
      value: 'inactive', 
      label: 'Inactive', 
      filterFn: (subCat) => subCat.status === 'inactive' 
    }
  ], []);


  return (
    <div className="space-y-4">

      {/* Stats Cards */}
      <TabCardsGrid columns={{ mobile: 1, tablet: 2, desktop: 4 }} className="mb-6">
        <TabCard
          name="Total Categories"
          value={totalCategories}
          icon={FileText}
          colorType="indigo"
        />
        <TabCard
          name="Active Categories"
          value={activeCategories}
          icon={FileText}
          colorType="green"
        />
        <TabCard
          name="Sub Categories"
          value={totalSubCategories}
          icon={Layers}
          colorType="blue"
        />
        <TabCard
          name="Active Sub Categories"
          value={activeSubCategories}
          icon={Layers}
          colorType="purple"
        />
      </TabCardsGrid>

      {/* Categories Table with Expandable Sub Categories */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">Categories</h2>
          <div className="flex gap-2">
            <Button
              onClick={() => loadCategories()}
              icon={<RefreshCw size={20} />}
              variant="outline"
              disabled={loading}
              loading={loading}
              title="Refresh categories list"
            >
              Refresh
            </Button>
            <Button
              onClick={() => handleOpenModal()}
              icon={<Plus size={20} />}
            >
              Add Category
            </Button>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={categoriesData}
          isLoading={loading}
          emptyMessage="No categories found. Create your first category to get started!"
          searchable={true}
          filterable={true}
          searchPlaceholder="Search by name..."
          filterOptions={filterOptions}
          sortable={true}
          expandable={true}
          renderExpandedRow={renderExpandedRow}
        />
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
            options={categories
              .filter(cat => cat.id) // Only show categories with valid IDs
              .map(cat => ({
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

