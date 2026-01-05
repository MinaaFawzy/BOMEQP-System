import { useEffect, useState, useMemo } from 'react';
import { adminAPI } from '../../../services/api';
import { useHeader } from '../../../context/HeaderContext';
import { Building2, Eye, Edit, Tag, Mail, CheckCircle, Clock, ClipboardList, X, Plus, CreditCard, Trash2, AlertCircle } from 'lucide-react';
import Modal from '../../../components/Modal/Modal';
import FormInput from '../../../components/FormInput/FormInput';
import Button from '../../../components/Button/Button';
import TabCard from '../../../components/TabCard/TabCard';
import TabCardsGrid from '../../../components/TabCardsGrid/TabCardsGrid';
import DataTable from '../../../components/DataTable/DataTable';
import PresentDataForm from '../../../components/PresentDataForm/PresentDataForm';
import './AllACCsScreen.css';

const AllACCsScreen = () => {
  const { setHeaderTitle, setHeaderSubtitle } = useHeader();
  const [allAccs, setAllAccs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [commissionModalOpen, setCommissionModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [selectedACC, setSelectedACC] = useState(null);
  const [commissionPercentage, setCommissionPercentage] = useState('');
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [accFormData, setAccFormData] = useState({
    name: '',
    legal_name: '',
    registration_number: '',
    country: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    logo_url: '',
    status: 'active',
    registration_fee_paid: false,
    registration_fee_amount: '',
    commission_percentage: '',
  });
  const [accErrors, setAccErrors] = useState({});

  useEffect(() => {
    setHeaderTitle('All Accreditation Bodies');
    setHeaderSubtitle('Manage all accreditation bodies');
    return () => {
      setHeaderTitle(null);
      setHeaderSubtitle(null);
    };
  }, [setHeaderTitle, setHeaderSubtitle]);

  const loadCategories = async () => {
    try {
      const data = await adminAPI.listCategories();
      setCategories(data.categories || []);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadACCs = async () => {
    setLoading(true);
    try {
      const data = await adminAPI.listACCs({ per_page: 1000 });
      let accsArray = [];
      if (data.data) {
        accsArray = data.data || [];
      } else if (data.accs) {
        accsArray = data.accs || [];
      } else {
        accsArray = Array.isArray(data) ? data : [];
      }
      setAllAccs(accsArray);
    } catch (error) {
      console.error('Failed to load ACCs:', error);
      setAllAccs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadACCs();
    loadCategories();
  }, []);

  const handleViewDetails = async (acc) => {
    try {
      const data = await adminAPI.getACCDetails(acc.id);
      const accData = {
        ...data.acc,
        categories: data.acc.categories || []
      };
      setSelectedACC(accData);
      setDetailModalOpen(true);
    } catch (error) {
      console.error('Failed to load ACC details:', error);
      const accData = {
        ...acc,
        categories: acc.categories || []
      };
      setSelectedACC(accData);
      setDetailModalOpen(true);
    }
  };

  const handleSetCommission = (acc) => {
    setSelectedACC(acc);
    setCommissionPercentage(acc.commission_percentage || '');
    setCommissionModalOpen(true);
  };

  const handleSaveCommission = async () => {
    if (!commissionPercentage || isNaN(commissionPercentage)) {
      alert('Please enter a valid commission percentage');
      return;
    }
    
    const percentage = parseFloat(commissionPercentage);
    if (percentage < 0 || percentage > 100) {
      alert('Commission percentage must be between 0 and 100');
      return;
    }
    
    setSaving(true);
    try {
      await adminAPI.setCommissionPercentage(selectedACC.id, {
        commission_percentage: percentage,
      });
      await loadACCs();
      setCommissionModalOpen(false);
      setSelectedACC(null);
      setCommissionPercentage('');
      alert('Commission percentage set successfully!');
    } catch (error) {
      alert('Failed to set commission: ' + (error.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const handleEditACC = async (acc) => {
    try {
      const data = await adminAPI.getACCDetails(acc.id);
      const accData = data.acc;
      setSelectedACC(accData);
      setAccFormData({
        name: accData.name || '',
        legal_name: accData.legal_name || '',
        registration_number: accData.registration_number || '',
        country: accData.country || '',
        address: accData.address || '',
        phone: accData.phone || '',
        email: accData.email || '',
        website: accData.website || '',
        logo_url: accData.logo_url || '',
        status: accData.status || 'active',
        registration_fee_paid: accData.registration_fee_paid || false,
        registration_fee_amount: accData.registration_fee_amount || '',
        commission_percentage: accData.commission_percentage || '',
      });
      setAccErrors({});
      setEditModalOpen(true);
    } catch (error) {
      console.error('Failed to load ACC details:', error);
      alert('Failed to load ACC details');
    }
  };

  const handleAccFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setAccFormData({
      ...accFormData,
      [name]: type === 'checkbox' ? checked : value,
    });
    setAccErrors({});
  };

  const handleSaveACC = async (e) => {
    e.preventDefault();
    setSaving(true);
    setAccErrors({});

    try {
      await adminAPI.updateACC(selectedACC.id, accFormData);
      await loadACCs();
      setEditModalOpen(false);
      setSelectedACC(null);
      alert('ACC updated successfully!');
    } catch (error) {
      if (error.response?.data?.errors) {
        setAccErrors(error.response.data.errors);
      } else {
        setAccErrors({ general: error.response?.data?.message || error.message || 'Failed to update ACC' });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleOpenCategoryModal = async (acc) => {
    try {
      const data = await adminAPI.getACCCategories(acc.id);
      const accData = {
        ...data.acc,
        categories: data.categories || []
      };
      setSelectedACC(accData);
      setCategoryModalOpen(true);
    } catch (error) {
      console.error('Failed to load ACC categories:', error);
      try {
        const fallbackData = await adminAPI.getACCDetails(acc.id);
        const accData = {
          ...fallbackData.acc,
          categories: fallbackData.acc.categories || []
        };
        setSelectedACC(accData);
        setCategoryModalOpen(true);
      } catch (fallbackError) {
        console.error('Failed to load ACC details:', fallbackError);
        const accData = {
          ...acc,
          categories: acc.categories || []
        };
        setSelectedACC(accData);
        setCategoryModalOpen(true);
      }
    }
  };

  const handleAssignCategory = async () => {
    if (!selectedCategoryId) {
      alert('Please select a category');
      return;
    }

    setSaving(true);
    try {
      await adminAPI.assignCategoryToACC(selectedACC.id, {
        category_id: parseInt(selectedCategoryId),
      });
      const data = await adminAPI.getACCCategories(selectedACC.id);
      const accData = {
        ...data.acc,
        categories: data.categories || []
      };
      setSelectedACC(accData);
      setSelectedCategoryId('');
      await loadCategories();
      alert('Category assigned successfully!');
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
      alert('Failed to assign category: ' + errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveCategory = async (categoryId) => {
    if (!confirm('Are you sure you want to remove this category?')) {
      return;
    }

    setSaving(true);
    try {
      await adminAPI.removeCategoryFromACC(selectedACC.id, {
        category_id: categoryId,
      });
      const data = await adminAPI.getACCCategories(selectedACC.id);
      const accData = {
        ...data.acc,
        categories: data.categories || []
      };
      setSelectedACC(accData);
      await loadCategories();
      alert('Category removed successfully!');
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
      alert('Failed to remove category: ' + errorMessage);
    } finally {
      setSaving(false);
    }
  };

  // Client-side filtering
  const filteredAccs = useMemo(() => {
    let filtered = [...allAccs];

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(acc => acc.status === statusFilter);
    }

    // Add search text for DataTable search
    return filtered.map(acc => ({
      ...acc,
      _searchText: `${acc.name || ''} ${acc.email || ''}`.toLowerCase()
    }));
  }, [allAccs, statusFilter]);

  // Calculate stats from all ACCs
  const totalCount = allAccs.length;
  const activeCount = allAccs.filter(acc => acc.status === 'active').length;
  const pendingCount = allAccs.filter(acc => acc.status === 'pending').length;

  // DataTable columns
  const columns = useMemo(() => [
    {
      header: 'ACC Name',
      accessor: 'name',
      sortable: true,
      render: (value, row) => (
        <div className="flex items-center">
          <div className="w-10 h-10 mr-3 relative">
            {row.logo_url ? (
              <>
                <img 
                  src={row.logo_url} 
                  alt={value || 'ACC Logo'} 
                  className="w-10 h-10 rounded-lg object-cover border border-gray-200"
                  width="40"
                  height="40"
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    const fallback = e.target.parentElement?.querySelector('.logo-fallback');
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
                <div 
                  className="logo-fallback w-10 h-10 bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg items-center justify-center hidden"
                  style={{ display: 'none', position: 'absolute', top: 0, left: 0 }}
                >
                  <Building2 className="h-5 w-5 text-primary-600" />
                </div>
              </>
            ) : (
              <div className="w-10 h-10 bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg flex items-center justify-center">
                <Building2 className="h-5 w-5 text-primary-600" />
              </div>
            )}
          </div>
          <div className="font-medium text-gray-900">{value || 'N/A'}</div>
        </div>
      )
    },
    {
      header: 'Email',
      accessor: 'email',
      sortable: true,
      render: (value) => (
        <div className="flex items-center text-sm text-gray-600">
          <Mail className="h-4 w-4 mr-2 text-gray-400" />
          {value || 'N/A'}
        </div>
      )
    },
    {
      header: 'Status',
      accessor: 'status',
      sortable: true,
      render: (value) => {
        const statusConfig = {
          active: { 
            badgeClass: 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300',
            icon: CheckCircle 
          },
          pending: { 
            badgeClass: 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 border border-yellow-300',
            icon: Clock 
          },
          inactive: { 
            badgeClass: 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300',
            icon: Clock 
          }
        };
        const config = statusConfig[value] || statusConfig.pending;
        const Icon = config.icon;
        return (
          <span className={`px-3 py-1.5 inline-flex items-center text-xs leading-5 font-bold rounded-full shadow-sm ${config.badgeClass}`}>
            <Icon size={12} className="mr-1" />
            {value ? value.charAt(0).toUpperCase() + value.slice(1) : 'N/A'}
          </span>
        );
      }
    },
    {
      header: 'Commission %',
      accessor: 'commission_percentage',
      sortable: true,
      render: (value) => (
        <span className="text-sm text-gray-600">
          {value ? `${value}%` : <span className="text-gray-400">Not Set</span>}
        </span>
      )
    },
    {
      header: 'Stripe Account',
      accessor: 'stripe_account_configured',
      sortable: true,
      render: (value, row) => (
        <div className="flex items-center">
          {row.stripe_account_configured ? (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              <CheckCircle size={12} className="mr-1" />
              Configured
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
              <AlertCircle size={12} className="mr-1" />
              Not Configured
            </span>
          )}
        </div>
      )
    },
    {
      header: 'Created',
      accessor: 'created_at',
      sortable: true,
      render: (value) => (
        <span className="text-sm text-gray-600">
          {value ? new Date(value).toLocaleDateString() : 'N/A'}
        </span>
      )
    }
  ], []);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;
  }

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <TabCardsGrid columns={{ mobile: 1, tablet: 2, desktop: 3 }}>
        <TabCard
          name="Total"
          value={totalCount}
          icon={ClipboardList}
          colorType="indigo"
          isActive={statusFilter === 'all'}
          onClick={() => setStatusFilter('all')}
        />
        <TabCard
          name="Active"
          value={activeCount}
          icon={CheckCircle}
          colorType="green"
          isActive={statusFilter === 'active'}
          onClick={() => setStatusFilter('active')}
        />
        <TabCard
          name="Pending"
          value={pendingCount}
          icon={Clock}
          colorType="yellow"
          isActive={statusFilter === 'pending'}
          onClick={() => setStatusFilter('pending')}
        />
      </TabCardsGrid>

      {/* DataTable */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100">
        <DataTable
          columns={columns}
          data={filteredAccs}
          onView={handleViewDetails}
          onRowClick={handleViewDetails}
          onEdit={handleEditACC}
          isLoading={loading}
          emptyMessage="No ACCs found"
          searchable={true}
          filterable={false}
          searchPlaceholder="Search by name or email..."
        />
      </div>

      {/* ACC Detail Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedACC(null);
        }}
        title="ACC Details"
        size="lg"
      >
        <div className="space-y-6">
          <PresentDataForm
            data={selectedACC}
            isLoading={false}
            emptyMessage="No ACC data available"
          />
          {selectedACC && (
            <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
              <Button
                variant="outline"
                fullWidth
                icon={<Edit size={20} />}
                onClick={() => {
                  setDetailModalOpen(false);
                  handleEditACC(selectedACC);
                }}
              >
                Edit ACC
              </Button>
              <Button
                variant="primary"
                fullWidth
                icon={<Tag size={20} />}
                onClick={() => {
                  setDetailModalOpen(false);
                  handleOpenCategoryModal(selectedACC);
                }}
              >
                Manage Categories
              </Button>
            </div>
          )}
        </div>
      </Modal>

      {/* Set Commission Modal */}
      <Modal
        isOpen={commissionModalOpen}
        onClose={() => {
          setCommissionModalOpen(false);
          setSelectedACC(null);
          setCommissionPercentage('');
        }}
        title={`Set Commission for ${selectedACC?.name}`}
        size="lg"
      >
        <div className="space-y-6">
          <FormInput
            label="Commission Percentage (0-100)"
            name="commission_percentage"
            type="number"
            value={commissionPercentage}
            onChange={(e) => setCommissionPercentage(e.target.value)}
            required
            min="0"
            max="100"
            step="0.1"
            placeholder="e.g., 15.5"
          />

          <div className="flex space-x-3 pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              fullWidth
              onClick={() => {
                setCommissionModalOpen(false);
                setSelectedACC(null);
                setCommissionPercentage('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              fullWidth
              onClick={handleSaveCommission}
              disabled={saving}
              loading={saving}
            >
              Save Commission
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit ACC Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedACC(null);
          setAccFormData({
            name: '',
            legal_name: '',
            registration_number: '',
            country: '',
            address: '',
            phone: '',
            email: '',
            website: '',
            logo_url: '',
            status: 'active',
            registration_fee_paid: false,
            registration_fee_amount: '',
            commission_percentage: '',
          });
          setAccErrors({});
        }}
        title={`Edit ACC: ${selectedACC?.name}`}
        size="lg"
      >
        <form onSubmit={handleSaveACC} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="Name"
              name="name"
              value={accFormData.name}
              onChange={handleAccFormChange}
              error={accErrors.name}
            />
            <FormInput
              label="Legal Name"
              name="legal_name"
              value={accFormData.legal_name}
              onChange={handleAccFormChange}
              error={accErrors.legal_name}
            />
            <FormInput
              label="Registration Number"
              name="registration_number"
              value={accFormData.registration_number}
              onChange={handleAccFormChange}
              error={accErrors.registration_number}
            />
            <FormInput
              label="Country"
              name="country"
              value={accFormData.country}
              onChange={handleAccFormChange}
              error={accErrors.country}
            />
            <FormInput
              label="Address"
              name="address"
              value={accFormData.address}
              onChange={handleAccFormChange}
              textarea
              rows={2}
              error={accErrors.address}
            />
            <FormInput
              label="Phone"
              name="phone"
              value={accFormData.phone}
              onChange={handleAccFormChange}
              error={accErrors.phone}
            />
            <FormInput
              label="Email"
              name="email"
              type="email"
              value={accFormData.email}
              onChange={handleAccFormChange}
              error={accErrors.email}
            />
            <FormInput
              label="Website"
              name="website"
              type="url"
              value={accFormData.website}
              onChange={handleAccFormChange}
              error={accErrors.website}
            />
            <FormInput
              label="Logo URL"
              name="logo_url"
              type="url"
              value={accFormData.logo_url}
              onChange={handleAccFormChange}
              error={accErrors.logo_url}
            />
            <FormInput
              label="Status"
              name="status"
              type="select"
              value={accFormData.status}
              onChange={handleAccFormChange}
              options={[
                { value: 'pending', label: 'Pending' },
                { value: 'active', label: 'Active' },
                { value: 'suspended', label: 'Suspended' },
                { value: 'expired', label: 'Expired' },
                { value: 'rejected', label: 'Rejected' },
              ]}
              error={accErrors.status}
            />
            <FormInput
              label="Registration Fee Amount"
              name="registration_fee_amount"
              type="number"
              value={accFormData.registration_fee_amount}
              onChange={handleAccFormChange}
              min="0"
              step="0.01"
              error={accErrors.registration_fee_amount}
            />
            <FormInput
              label="Commission Percentage"
              name="commission_percentage"
              type="number"
              value={accFormData.commission_percentage}
              onChange={handleAccFormChange}
              min="0"
              max="100"
              step="0.1"
              error={accErrors.commission_percentage}
            />
            <div className="flex items-center">
              <input
                type="checkbox"
                name="registration_fee_paid"
                checked={accFormData.registration_fee_paid}
                onChange={handleAccFormChange}
                className="mr-2"
              />
              <label className="text-sm text-gray-700">Registration Fee Paid</label>
            </div>
          </div>

          {accErrors.general && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600 font-medium">{accErrors.general}</p>
            </div>
          )}

          <div className="flex space-x-3 pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              fullWidth
              onClick={() => {
                setEditModalOpen(false);
                setSelectedACC(null);
                setAccErrors({});
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              fullWidth
              type="submit"
              disabled={saving}
              loading={saving}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Category Assignment Modal */}
      <Modal
        isOpen={categoryModalOpen}
        onClose={() => {
          setCategoryModalOpen(false);
          setSelectedACC(null);
          setSelectedCategoryId('');
        }}
        title={`Manage Categories for ${selectedACC?.name}`}
        size="lg"
      >
        <div className="space-y-6">
          {/* Assign Category Section */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Assign Category</h3>
            <div className="flex gap-3">
              <select
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none bg-white cursor-pointer category-select"
              >
                <option value="">Select a category...</option>
                {categories
                  .filter(cat => {
                    if (!selectedACC?.categories || selectedACC.categories.length === 0) {
                      return true;
                    }
                    return !selectedACC.categories.some(accCat => {
                      const accCatId = typeof accCat === 'object' ? accCat.id : accCat;
                      const catId = typeof cat === 'object' ? cat.id : cat;
                      return accCatId === catId;
                    });
                  })
                  .map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
              </select>
              <Button
                onClick={handleAssignCategory}
                disabled={!selectedCategoryId || saving}
                loading={saving}
                icon={<Plus size={20} />}
              >
                Assign
              </Button>
            </div>
          </div>

          {/* Assigned Categories List */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Assigned Categories {selectedACC?.categories && Array.isArray(selectedACC.categories) && selectedACC.categories.length > 0 && (
                <span className="text-sm font-normal text-gray-500">({selectedACC.categories.length})</span>
              )}
            </h3>
            {selectedACC?.categories && Array.isArray(selectedACC.categories) && selectedACC.categories.length > 0 ? (
              <div className="space-y-3">
                {selectedACC.categories.map((category) => {
                  const categoryId = category.id;
                  const subCategories = category.sub_categories || [];
                  const pivot = category.pivot;
                  
                  return (
                    <div
                      key={categoryId}
                      className="p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900">{category.name}</span>
                            {category.name_ar && (
                              <span className="text-sm text-gray-500">({category.name_ar})</span>
                            )}
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              category.status === 'active' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {category.status}
                            </span>
                          </div>
                          {category.description && (
                            <p className="text-sm text-gray-600 mt-1">{category.description}</p>
                          )}
                          {subCategories.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs text-gray-500 mb-1">Sub Categories ({subCategories.length}):</p>
                              <div className="flex flex-wrap gap-1">
                                {subCategories.map((subCat) => (
                                  <span key={subCat.id} className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded">
                                    {subCat.name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {pivot && (
                            <p className="text-xs text-gray-400 mt-2">
                              Assigned on: {new Date(pivot.created_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => handleRemoveCategory(categoryId)}
                          disabled={saving}
                          className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ml-4"
                          title="Remove Category"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 text-center bg-gray-50 rounded-lg">
                <Tag className="mx-auto text-gray-400 mb-2" size={32} />
                <p className="text-gray-500">No categories assigned</p>
                <p className="text-sm text-gray-400 mt-1">Assign categories to this ACC to get started</p>
              </div>
            )}
          </div>

          <div className="flex space-x-3 pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              fullWidth
              onClick={() => {
                setCategoryModalOpen(false);
                setSelectedACC(null);
                setSelectedCategoryId('');
              }}
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
};

export default AllACCsScreen;
