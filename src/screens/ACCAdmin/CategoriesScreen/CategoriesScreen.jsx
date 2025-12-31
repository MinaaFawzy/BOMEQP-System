import { useEffect, useState } from 'react';
import { accAPI } from '../../../services/api';
import { useHeader } from '../../../context/HeaderContext';
import { Plus, FileText, Edit, Trash2, Layers, ChevronUp, ChevronDown, Search, Eye, RefreshCw } from 'lucide-react';
import Modal from '../../../components/Modal/Modal';
import ConfirmDialog from '../../../components/ConfirmDialog/ConfirmDialog';
import Button from '../../../components/Button/Button';
import Pagination from '../../../components/Pagination/Pagination';
import './CategoriesScreen.css';
import FormInput from '../../../components/FormInput/FormInput';

const CategoriesScreen = () => {
  const { setHeaderTitle, setHeaderSubtitle } = useHeader();
  const [activeTab, setActiveTab] = useState('categories');
  const [prevActiveTab, setPrevActiveTab] = useState('categories');
  
  const [categories, setCategories] = useState([]);
  const [sortedCategories, setSortedCategories] = useState([]);
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
  const [categorySortConfig, setCategorySortConfig] = useState({ key: null, direction: 'asc' });
  const [categorySearchTerm, setCategorySearchTerm] = useState('');
  const [categoryStatusFilter, setCategoryStatusFilter] = useState('all');
  const [categoryPagination, setCategoryPagination] = useState({
    currentPage: 1,
    perPage: 10,
    totalPages: 1,
    totalItems: 0,
  });

  const [subCategories, setSubCategories] = useState([]);
  const [sortedSubCategories, setSortedSubCategories] = useState([]);
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
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [subCategoryPagination, setSubCategoryPagination] = useState({
    currentPage: 1,
    perPage: 10,
    totalPages: 1,
    totalItems: 0,
  });

  useEffect(() => {
    loadCategories();
  }, [categoryPagination.currentPage, categoryPagination.perPage, categorySearchTerm, categoryStatusFilter]);

  useEffect(() => {
    setHeaderTitle('Categories');
    setHeaderSubtitle('View assigned categories and manage your own categories');
    return () => {
      setHeaderTitle(null);
      setHeaderSubtitle(null);
    };
  }, [setHeaderTitle, setHeaderSubtitle]);

  // Reload categories when switching to categories tab from another tab to ensure fresh data (including newly assigned categories)
  useEffect(() => {
    if (activeTab === 'categories' && prevActiveTab !== 'categories' && !loading) {
      loadCategories();
    }
    setPrevActiveTab(activeTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const params = {
        page: categoryPagination.currentPage,
        per_page: categoryPagination.perPage,
      };
      
      if (categorySearchTerm) {
        params.search = categorySearchTerm;
      }
      
      if (categoryStatusFilter !== 'all') {
        params.status = categoryStatusFilter;
      }
      
      const data = await accAPI.listCategories(params);
      
      // Handle different response structures
      let catsList = [];
      if (data?.data) {
        catsList = Array.isArray(data.data) ? data.data : [];
        setCategoryPagination(prev => ({
          ...prev,
          totalPages: data.last_page || data.total_pages || 1,
          totalItems: data.total || 0,
        }));
      } else if (data?.categories && Array.isArray(data.categories)) {
        catsList = data.categories;
        setCategoryPagination(prev => ({
          ...prev,
          totalPages: 1,
          totalItems: data.categories?.length || 0,
        }));
      } else if (Array.isArray(data)) {
        catsList = data;
      } else {
        console.warn('Unexpected API response structure:', data);
        catsList = [];
        setCategoryPagination(prev => ({
          ...prev,
          totalPages: 1,
          totalItems: 0,
        }));
      }
      
      setCategories(catsList);
      setSortedCategories(catsList);
      
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
        setSubCategories(allSubCats);
        setSortedSubCategories(allSubCats);
        setSubCategoriesLoading(false);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
      console.error('Error details:', error.response?.data || error.message);
      // Set empty arrays on error to prevent UI issues
      setCategories([]);
      setSortedCategories([]);
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
      setCategoryPagination(prev => ({ ...prev, currentPage: 1 }));
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
      setCategoryPagination(prev => ({ ...prev, currentPage: 1 }));
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
        page: subCategoryPagination.currentPage,
        per_page: subCategoryPagination.perPage,
      };
      
      if (categoryId) {
        params.category_id = categoryId;
      }
      
      if (searchTerm) {
        params.search = searchTerm;
      }
      
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      
      const data = await accAPI.listSubCategories(params);
      
      let subCatsList = [];
      if (data?.data) {
        subCatsList = Array.isArray(data.data) ? data.data : [];
        setSubCategoryPagination(prev => ({
          ...prev,
          totalPages: data.last_page || data.total_pages || 1,
          totalItems: data.total || 0,
        }));
      } else if (data?.sub_categories) {
        subCatsList = Array.isArray(data.sub_categories) ? data.sub_categories : [];
        setSubCategoryPagination(prev => ({
          ...prev,
          totalPages: 1,
          totalItems: data.sub_categories?.length || 0,
        }));
      } else {
        subCatsList = Array.isArray(data) ? data : [];
        setSubCategoryPagination(prev => ({
          ...prev,
          totalPages: 1,
          totalItems: subCatsList.length,
        }));
      }
      
      setSubCategories(subCatsList);
      setSortedSubCategories(subCatsList);
    } catch (error) {
      console.error('Failed to load sub categories:', error);
      setSubCategories([]);
      setSortedSubCategories([]);
    } finally {
      setSubCategoriesLoading(false);
    }
  };
  
  const handleCategoryPageChange = (page) => {
    setCategoryPagination(prev => ({ ...prev, currentPage: page }));
  };
  
  const handleCategoryPerPageChange = (perPage) => {
    setCategoryPagination(prev => ({ ...prev, perPage, currentPage: 1 }));
  };
  
  const handleSubCategoryPageChange = (page) => {
    setSubCategoryPagination(prev => ({ ...prev, currentPage: page }));
  };
  
  const handleSubCategoryPerPageChange = (perPage) => {
    setSubCategoryPagination(prev => ({ ...prev, perPage, currentPage: 1 }));
  };

  // Sort categories
  const handleCategorySort = (key) => {
    let direction = 'asc';
    if (categorySortConfig.key === key && categorySortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setCategorySortConfig({ key, direction });
  };

  // Sort sub categories
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Apply sorting when sortConfig or categories change (filtering is now server-side)
  useEffect(() => {
    if (activeTab !== 'categories') return;
    
    let sorted = [...categories];

    // Apply sorting
    if (categorySortConfig.key) {
      sorted.sort((a, b) => {
        let aValue, bValue;
        
        if (categorySortConfig.key === 'name') {
          aValue = (a.name || '').toLowerCase();
          bValue = (b.name || '').toLowerCase();
        } else {
          aValue = a[categorySortConfig.key] || '';
          bValue = b[categorySortConfig.key] || '';
        }
        
        if (typeof aValue === 'string') {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }
        
        if (aValue < bValue) {
          return categorySortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return categorySortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    
    setSortedCategories(sorted);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categorySortConfig, categories, activeTab]);
  
  // Load sub categories when tab changes or pagination/filters change
  useEffect(() => {
    if (activeTab === 'sub-categories') {
      loadSubCategories();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, subCategoryPagination.currentPage, subCategoryPagination.perPage, searchTerm, statusFilter]);

  // Apply filtering and sorting when filters, sortConfig, or subCategories change
  useEffect(() => {
    if (activeTab !== 'sub-categories') return;
    
    let filtered = [...subCategories];

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(subCat => {
        const name = subCat.name || '';
        const nameAr = subCat.name_ar || '';
        return name.toLowerCase().includes(term) || nameAr.toLowerCase().includes(term);
      });
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(subCat => subCat.status === statusFilter);
    }

    // Apply sorting
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aValue, bValue;
        
        if (sortConfig.key === 'name') {
          aValue = (a.name || '').toLowerCase();
          bValue = (b.name || '').toLowerCase();
        } else if (sortConfig.key === 'category_id') {
          const aCat = categories.find(cat => cat.id === a.category_id);
          const bCat = categories.find(cat => cat.id === b.category_id);
          aValue = aCat ? (aCat.name || '').toLowerCase() : '';
          bValue = bCat ? (bCat.name || '').toLowerCase() : '';
        } else {
          aValue = a[sortConfig.key] || '';
          bValue = b[sortConfig.key] || '';
        }
        
        if (typeof aValue === 'string') {
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
    
    setSortedSubCategories(filtered);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortConfig, subCategories, searchTerm, statusFilter, activeTab, categories]);

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
      setSubCategoryPagination(prev => ({ ...prev, currentPage: 1 }));
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
      setSubCategoryPagination(prev => ({ ...prev, currentPage: 1 }));
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
  
  // Helper function to check if category can be edited/deleted (only if created by this ACC)
  // According to API: ACC can only update/delete categories they created
  // We check created_by to determine if ACC can manage it
  // Note: The API will also validate this, but we can hide buttons for better UX
  const canManageCategory = (category) => {
    // If created_by exists, it means this ACC created it (assuming created_by matches current user)
    // For now, we'll show buttons and let API handle the actual permission check
    // This provides better UX - user can try to edit, API will reject if not allowed
    return true;
  };
  
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

  if (loading && activeTab === 'categories') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Categories */}
        <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl shadow-lg p-6 border border-primary-200 hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-primary-700 mb-2">Total Categories</p>
              <p className="text-3xl font-bold text-primary-900">{totalCategories}</p>
            </div>
            <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg">
              <FileText className="text-white" size={32} />
            </div>
          </div>
        </div>

        {/* Active Categories */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-lg p-6 border border-green-200 hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-700 mb-2">Active Categories</p>
              <p className="text-3xl font-bold text-green-900">{activeCategories}</p>
            </div>
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
              <FileText className="text-white" size={32} />
            </div>
          </div>
        </div>

        {/* Total Sub Categories */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-lg p-6 border border-blue-200 hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-700 mb-2">Sub Categories</p>
              <p className="text-3xl font-bold text-blue-900">{totalSubCategories}</p>
            </div>
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <Layers className="text-white" size={32} />
            </div>
          </div>
        </div>

        {/* Active Sub Categories */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow-lg p-6 border border-purple-200 hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-700 mb-2">Active Sub Categories</p>
              <p className="text-3xl font-bold text-purple-900">{activeSubCategories}</p>
            </div>
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <Layers className="text-white" size={32} />
            </div>
          </div>
        </div>
      </div>

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

          {/* Search and Filter Section */}
          <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-100 mb-4">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search Input */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search by name..."
                  value={categorySearchTerm}
                  onChange={(e) => {
                    setCategorySearchTerm(e.target.value);
                    setCategoryPagination(prev => ({ ...prev, currentPage: 1 }));
                  }}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                />
              </div>
              
              {/* Status Filter */}
              <div className="relative">
                <Layers className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <select
                  value={categoryStatusFilter}
                  onChange={(e) => {
                    setCategoryStatusFilter(e.target.value);
                    setCategoryPagination(prev => ({ ...prev, currentPage: 1 }));
                  }}
                  className="pl-10 pr-8 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none bg-white cursor-pointer transition-all"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="table-header-gradient">
                    <tr>
                      <th 
                        className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-primary-700 transition-colors select-none"
                        onClick={() => handleCategorySort('name')}
                      >
                        <div className="flex items-center gap-2">
                          Category
                          {categorySortConfig.key === 'name' && (
                            categorySortConfig.direction === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                          )}
                        </div>
                      </th>
                      <th 
                        className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-primary-700 transition-colors select-none"
                        onClick={() => handleCategorySort('description')}
                      >
                        <div className="flex items-center gap-2">
                          Description
                          {categorySortConfig.key === 'description' && (
                            categorySortConfig.direction === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                          )}
                        </div>
                      </th>
                      <th 
                        className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-primary-700 transition-colors select-none"
                        onClick={() => handleCategorySort('status')}
                      >
                        <div className="flex items-center gap-2">
                          Status
                          {categorySortConfig.key === 'status' && (
                            categorySortConfig.direction === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                          )}
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {sortedCategories.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center">
                          <div className="flex flex-col items-center">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                              <FileText className="text-gray-400" size={32} />
                            </div>
                            <p className="text-gray-500 font-medium">No categories found</p>
                            <p className="text-sm text-gray-400 mt-1">Create your first category to get started</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      sortedCategories.map((category, index) => (
                        <tr
                          key={category.id || index}
                          className="hover:bg-gradient-to-r hover:from-primary-50/30 hover:to-white transition-all duration-200 group table-row-animated"
                          style={{ '--animation-delay': `${index * 0.03}s` }}
                        >
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg flex items-center justify-center mr-3 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                                <FileText className="h-5 w-5 text-primary-600" />
                              </div>
                              <div>
                                <div className="text-sm font-semibold text-gray-900 group-hover:text-primary-700 transition-colors">{category.name}</div>
                                {category.name_ar && <div className="text-xs text-gray-500">{category.name_ar}</div>}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-gray-600 max-w-xs truncate">
                              {category.description || '-'}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`px-3 py-1.5 inline-flex text-xs leading-5 font-bold rounded-full shadow-sm ${
                              category.status === 'active' 
                                ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300' 
                                : 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300'
                            }`}>
                              {category.status.charAt(0).toUpperCase() + category.status.slice(1)}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex flex-col gap-1">
                              <span className={`px-3 py-1.5 inline-flex text-xs leading-5 font-bold rounded-full shadow-sm ${
                                isCategoryCreatedByMe(category)
                                  ? 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-300' 
                                  : 'bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 border border-purple-300'
                              }`}>
                                {isCategoryCreatedByMe(category) ? 'Created by Me' : 'Assigned by Admin'}
                              </span>
                              {category.sub_categories && category.sub_categories.length > 0 && (
                                <span className="text-xs text-gray-500">
                                  {category.sub_categories.length} sub-categor{category.sub_categories.length === 1 ? 'y' : 'ies'}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleOpenModal(category)}
                                className={`p-2 rounded-lg hover:scale-110 transition-all duration-200 shadow-sm hover:shadow-md ${
                                  isCategoryCreatedByMe(category)
                                    ? 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                                    : 'bg-gray-50 text-gray-400 hover:bg-gray-100 cursor-not-allowed'
                                }`}
                                title={isCategoryCreatedByMe(category) ? 'Edit Category' : 'Cannot edit - Assigned by Admin'}
                                disabled={!isCategoryCreatedByMe(category)}
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                onClick={() => handleDelete(category)}
                                className={`p-2 rounded-lg hover:scale-110 transition-all duration-200 shadow-sm hover:shadow-md ${
                                  isCategoryCreatedByMe(category)
                                    ? 'bg-red-50 text-red-600 hover:bg-red-100'
                                    : 'bg-gray-50 text-gray-400 hover:bg-gray-100 cursor-not-allowed'
                                }`}
                                title={isCategoryCreatedByMe(category) ? 'Delete Category' : 'Cannot delete - Assigned by Admin'}
                                disabled={!isCategoryCreatedByMe(category)}
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
            </div>
          )}
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

          {/* Search and Filter Section */}
          <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-100 mb-4">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search Input */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search by name..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setSubCategoryPagination(prev => ({ ...prev, currentPage: 1 }));
                  }}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                />
              </div>
              
              {/* Status Filter */}
              <div className="relative">
                <Layers className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setSubCategoryPagination(prev => ({ ...prev, currentPage: 1 }));
                  }}
                  className="pl-10 pr-8 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none bg-white cursor-pointer transition-all"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table */}
          {subCategoriesLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : (
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
                          Sub Category
                          {sortConfig.key === 'name' && (
                            sortConfig.direction === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                          )}
                        </div>
                      </th>
                      <th 
                        className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-primary-700 transition-colors select-none"
                        onClick={() => handleSort('category_id')}
                      >
                        <div className="flex items-center gap-2">
                          Category
                          {sortConfig.key === 'category_id' && (
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
                      <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {sortedSubCategories.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-12 text-center">
                          <div className="flex flex-col items-center">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                              <Layers className="text-gray-400" size={32} />
                            </div>
                            <p className="text-gray-500 font-medium">No sub categories found</p>
                            <p className="text-sm text-gray-400 mt-1">Create your first sub category to get started</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      sortedSubCategories.map((subCategory, index) => {
                        const category = categories.find(cat => cat.id === subCategory.category_id);
                        return (
                          <tr
                            key={subCategory.id || index}
                            className="hover:bg-gradient-to-r hover:from-primary-50/30 hover:to-white transition-all duration-200 group table-row-animated"
                            style={{ '--animation-delay': `${index * 0.03}s` }}
                          >
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="w-10 h-10 bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg flex items-center justify-center mr-3 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                                  <FileText className="h-5 w-5 text-primary-600" />
                                </div>
                                <div>
                                  <div className="text-sm font-semibold text-gray-900 group-hover:text-primary-700 transition-colors">{subCategory.name}</div>
                                  {subCategory.name_ar && <div className="text-xs text-gray-500">{subCategory.name_ar}</div>}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm text-gray-600">
                                {category ? category.name : `Category ID: ${subCategory.category_id}`}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`px-3 py-1.5 inline-flex text-xs leading-5 font-bold rounded-full shadow-sm ${
                                subCategory.status === 'active' 
                                  ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300' 
                                  : 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300'
                              }`}>
                                {subCategory.status.charAt(0).toUpperCase() + subCategory.status.slice(1)}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleOpenSubCategoryModal(subCategory)}
                                  className={`p-2 rounded-lg hover:scale-110 transition-all duration-200 shadow-sm hover:shadow-md ${
                                    isSubCategoryCreatedByMe(subCategory)
                                      ? 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                                      : 'bg-gray-50 text-gray-400 hover:bg-gray-100 cursor-not-allowed'
                                  }`}
                                  title={isSubCategoryCreatedByMe(subCategory) ? 'Edit Sub Category' : 'Cannot edit - Created by Admin'}
                                  disabled={!isSubCategoryCreatedByMe(subCategory)}
                                >
                                  <Edit size={16} />
                                </button>
                                <button
                                  onClick={() => handleDeleteSubCategory(subCategory)}
                                  className={`p-2 rounded-lg hover:scale-110 transition-all duration-200 shadow-sm hover:shadow-md ${
                                    isSubCategoryCreatedByMe(subCategory)
                                      ? 'bg-red-50 text-red-600 hover:bg-red-100'
                                      : 'bg-gray-50 text-gray-400 hover:bg-gray-100 cursor-not-allowed'
                                  }`}
                                  title={isSubCategoryCreatedByMe(subCategory) ? 'Delete Sub Category' : 'Cannot delete - Created by Admin'}
                                  disabled={!isSubCategoryCreatedByMe(subCategory)}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination for Sub Categories */}
              {!subCategoriesLoading && activeTab === 'sub-categories' && subCategoryPagination.totalItems > 0 && (
                <Pagination
                  currentPage={subCategoryPagination.currentPage}
                  totalPages={subCategoryPagination.totalPages}
                  totalItems={subCategoryPagination.totalItems}
                  perPage={subCategoryPagination.perPage}
                  onPageChange={handleSubCategoryPageChange}
                  onPerPageChange={handleSubCategoryPerPageChange}
                />
              )}
            </div>
          )}
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

