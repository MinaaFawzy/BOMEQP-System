import { useEffect, useState, useMemo } from 'react';
import { adminAPI } from '../../../services/api';
import { useHeader } from '../../../context/HeaderContext';
import { Plus, FileText, Edit, Trash2, Layers, CheckCircle } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState('categories');
  
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

  useEffect(() => {
    setHeaderTitle('Course Categories');
    setHeaderSubtitle('Manage global categories and sub-categories');
    return () => {
      setHeaderTitle(null);
      setHeaderSubtitle(null);
    };
  }, [setHeaderTitle, setHeaderSubtitle]);

  useEffect(() => {
    loadCategories();
    loadSubCategories(); // Load sub categories on mount to calculate stats
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const data = await adminAPI.listCategories({ per_page: 1000 });
      
      let catsList = [];
      if (data?.data) {
        catsList = Array.isArray(data.data) ? data.data : [];
      } else if (data?.categories) {
        catsList = Array.isArray(data.categories) ? data.categories : [];
      } else {
        catsList = Array.isArray(data) ? data : [];
      }
      
      setAllCategories(catsList);
    } catch (error) {
      console.error('Failed to load categories:', error);
      setAllCategories([]);
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

  // Prepare data for DataTable with search text
  const categoryTableData = useMemo(() => {
    return allCategories.map(category => ({
      ...category,
      _searchText: `${category.name || ''} ${category.name_ar || ''} ${category.description || ''}`.toLowerCase()
    }));
  }, [allCategories]);

  const subCategoryTableData = useMemo(() => {
    return allSubCategories.map(subCat => {
      const category = allCategories.find(cat => cat.id === subCat.category_id);
      return {
        ...subCat,
        _searchText: `${subCat.name || ''} ${subCat.name_ar || ''} ${category?.name || ''}`.toLowerCase()
      };
    });
  }, [allSubCategories, allCategories]);

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

  // DataTable columns for Categories
  const categoryColumns = useMemo(() => [
    {
      header: 'Category',
      accessor: 'name',
      sortable: true,
      render: (value, row) => (
        <div className="flex items-center">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg flex items-center justify-center mr-3">
            <FileText className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <div className="font-medium text-gray-900">{value || 'N/A'}</div>
            {row.name_ar && <div className="text-xs text-gray-500">{row.name_ar}</div>}
          </div>
        </div>
      )
    },
    {
      header: 'Description',
      accessor: 'description',
      sortable: true,
      render: (value) => (
        <div className="text-sm text-gray-600 max-w-xs truncate">
          {value || '-'}
        </div>
      )
    },
    {
      header: 'Status',
      accessor: 'status',
      sortable: true,
      render: (value) => {
        const isActive = value === 'active';
        return (
          <span className={`px-3 py-1.5 inline-flex items-center text-xs leading-5 font-bold rounded-full shadow-sm ${
            isActive
              ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300'
              : 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300'
          }`}>
            {isActive && <CheckCircle size={12} className="mr-1" />}
            {value ? value.charAt(0).toUpperCase() + value.slice(1) : 'N/A'}
          </span>
        );
      }
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
  ], []);

  // DataTable columns for Sub Categories
  const subCategoryColumns = useMemo(() => [
    {
      header: 'Sub Category',
      accessor: 'name',
      sortable: true,
      render: (value, row) => (
        <div className="flex items-center">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg flex items-center justify-center mr-3">
            <Layers className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <div className="font-medium text-gray-900">{value || 'N/A'}</div>
            {row.name_ar && <div className="text-xs text-gray-500">{row.name_ar}</div>}
          </div>
        </div>
      )
    },
    {
      header: 'Category',
      accessor: 'category_id',
      sortable: true,
      render: (value) => {
        const category = allCategories.find(cat => cat.id === value);
        return (
          <div className="text-sm text-gray-600">
            {category ? category.name : `Category ID: ${value}`}
          </div>
        );
      }
    },
    {
      header: 'Status',
      accessor: 'status',
      sortable: true,
      render: (value) => {
        const isActive = value === 'active';
        return (
          <span className={`px-3 py-1.5 inline-flex items-center text-xs leading-5 font-bold rounded-full shadow-sm ${
            isActive
              ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300'
              : 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300'
          }`}>
            {isActive && <CheckCircle size={12} className="mr-1" />}
            {value ? value.charAt(0).toUpperCase() + value.slice(1) : 'N/A'}
          </span>
        );
      }
    },
    {
      header: 'Actions',
      accessor: 'actions',
      sortable: false,
      render: (value, row) => (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => handleOpenSubCategoryModal(row)}
            className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 hover:scale-110 transition-all duration-200 shadow-sm hover:shadow-md"
            title="Edit"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={() => handleDeleteSubCategory(row)}
            className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 hover:scale-110 transition-all duration-200 shadow-sm hover:shadow-md"
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ], [allCategories]);

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

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-1.5">
        <div className="flex space-x-2">
        <button
          onClick={() => setActiveTab('categories')}
          className={`tab-button flex-1 px-6 py-3.5 font-semibold rounded-lg transition-all duration-300 flex items-center justify-center gap-2 ${
            activeTab === 'categories' 
                ? 'text-white shadow-lg tab-active-gradient' 
                : 'text-gray-500 bg-gray-100 hover:text-primary-700 hover:bg-primary-50 border border-gray-200'
          }`}
        >
            <FileText size={20} className={activeTab === 'categories' ? 'text-white' : 'text-gray-500'} />
          Categories
        </button>
        <button
          onClick={() => setActiveTab('sub-categories')}
          className={`tab-button flex-1 px-6 py-3.5 font-semibold rounded-lg transition-all duration-300 flex items-center justify-center gap-2 ${
            activeTab === 'sub-categories' 
                ? 'text-white shadow-lg tab-active-gradient' 
                : 'text-gray-500 bg-gray-100 hover:text-primary-700 hover:bg-primary-50 border border-gray-200'
          }`}
        >
            <Layers size={20} className={activeTab === 'sub-categories' ? 'text-white' : 'text-gray-500'} />
          Sub Categories
        </button>
        </div>
      </div>

      {/* Categories Tab Content */}
      {activeTab === 'categories' && (
        <>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Categories</h2>
            <Button
              onClick={() => handleOpenModal()}
              icon={<Plus size={20} />}
            >
              Add Category
            </Button>
          </div>

          {/* DataTable */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100">
            <DataTable
              columns={categoryColumns}
              data={categoryTableData}
              isLoading={loading}
              emptyMessage="No categories found"
              searchable={true}
              filterable={false}
              searchPlaceholder="Search by name, description..."
            />
          </div>
        </>
      )}

      {/* Sub Categories Tab Content */}
      {activeTab === 'sub-categories' && (
        <>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Sub Categories</h2>
            <Button
              onClick={() => handleOpenSubCategoryModal()}
              icon={<Plus size={20} />}
            >
              Add Sub Category
            </Button>
          </div>

          {/* DataTable */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100">
            <DataTable
              columns={subCategoryColumns}
              data={subCategoryTableData}
              isLoading={subCategoriesLoading}
              emptyMessage="No sub categories found"
              searchable={true}
              filterable={false}
              searchPlaceholder="Search by name, category..."
            />
          </div>
        </>
      )}

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
