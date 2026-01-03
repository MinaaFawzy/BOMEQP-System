import { useEffect, useState, useMemo } from 'react';
import { adminAPI } from '../../../services/api';
import { useHeader } from '../../../context/HeaderContext';
import { Building2, Eye, Mail, MapPin, School, CheckCircle, Clock, Edit, ClipboardList, XCircle } from 'lucide-react';
import Modal from '../../../components/Modal/Modal';
import FormInput from '../../../components/FormInput/FormInput';
import Button from '../../../components/Button/Button';
import TabCard from '../../../components/TabCard/TabCard';
import TabCardsGrid from '../../../components/TabCardsGrid/TabCardsGrid';
import DataTable from '../../../components/DataTable/DataTable';
import PresentDataForm from '../../../components/PresentDataForm/PresentDataForm';
import './AllTrainingCentersScreen.css';

const AllTrainingCentersScreen = () => {
  const { setHeaderTitle, setHeaderSubtitle } = useHeader();
  const [allTrainingCenters, setAllTrainingCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedTC, setSelectedTC] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [saving, setSaving] = useState(false);
  const [tcFormData, setTcFormData] = useState({
    name: '',
    legal_name: '',
    registration_number: '',
    country: '',
    city: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    logo_url: '',
    referred_by_group: false,
    status: 'active',
  });
  const [tcErrors, setTcErrors] = useState({});

  useEffect(() => {
    setHeaderTitle('All Training Centers');
    setHeaderSubtitle('Manage all training centers');
    return () => {
      setHeaderTitle(null);
      setHeaderSubtitle(null);
    };
  }, [setHeaderTitle, setHeaderSubtitle]);

  const loadTrainingCenters = async () => {
    setLoading(true);
    try {
      const data = await adminAPI.listTrainingCenters({ per_page: 1000 });
      let centersList = [];
      if (data.data) {
        centersList = data.data || [];
      } else if (data.training_centers) {
        centersList = data.training_centers || [];
      } else {
        centersList = Array.isArray(data) ? data : [];
      }
      setAllTrainingCenters(centersList);
    } catch (error) {
      console.error('Failed to load training centers:', error);
      setAllTrainingCenters([]);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    loadTrainingCenters();
  }, []);

  const handleViewDetails = async (tc) => {
    try {
      const data = await adminAPI.getTrainingCenterDetails(tc.id);
      setSelectedTC(data.training_center);
      setDetailModalOpen(true);
    } catch (error) {
      console.error('Failed to load training center details:', error);
      setSelectedTC(tc);
      setDetailModalOpen(true);
    }
  };

  const handleEditTrainingCenter = async (tc) => {
    try {
      const data = await adminAPI.getTrainingCenterDetails(tc.id);
      const tcData = data.training_center;
      setSelectedTC(tcData);
      setTcFormData({
        name: tcData.name || '',
        legal_name: tcData.legal_name || '',
        registration_number: tcData.registration_number || '',
        country: tcData.country || '',
        city: tcData.city || '',
        address: tcData.address || '',
        phone: tcData.phone || '',
        email: tcData.email || '',
        website: tcData.website || '',
        logo_url: tcData.logo_url || '',
        referred_by_group: tcData.referred_by_group || false,
        status: tcData.status || 'active',
      });
      setTcErrors({});
      setEditModalOpen(true);
    } catch (error) {
      console.error('Failed to load training center details:', error);
      alert('Failed to load training center details');
    }
  };

  const handleTcFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setTcFormData({
      ...tcFormData,
      [name]: type === 'checkbox' ? checked : value,
    });
    setTcErrors({});
  };

  const handleSaveTrainingCenter = async (e) => {
    e.preventDefault();
    setSaving(true);
    setTcErrors({});

    try {
      await adminAPI.updateTrainingCenter(selectedTC.id, tcFormData);
      await loadTrainingCenters();
      setEditModalOpen(false);
      setSelectedTC(null);
      alert('Training center updated successfully!');
    } catch (error) {
      if (error.response?.data?.errors) {
        setTcErrors(error.response.data.errors);
      } else {
        setTcErrors({ general: error.response?.data?.message || error.message || 'Failed to update training center' });
      }
    } finally {
      setSaving(false);
    }
  };

  // Client-side filtering
  const filteredTrainingCenters = useMemo(() => {
    let filtered = [...allTrainingCenters];

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(tc => tc.status === statusFilter);
    }

    // Add search text for DataTable search
    return filtered.map(tc => ({
      ...tc,
      _searchText: `${tc.name || ''} ${tc.email || ''}`.toLowerCase()
    }));
  }, [allTrainingCenters, statusFilter]);

  // Calculate stats from all training centers
  const totalCount = allTrainingCenters.length;
  const activeCount = allTrainingCenters.filter(tc => tc.status === 'active').length;
  const pendingCount = allTrainingCenters.filter(tc => tc.status === 'pending').length;
  const inactiveCount = allTrainingCenters.filter(tc => tc.status === 'inactive').length;

  // DataTable columns
  const columns = useMemo(() => [
    {
      header: 'Training Center',
      accessor: 'name',
      sortable: true,
      render: (value) => (
        <div className="flex items-center">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg flex items-center justify-center mr-3">
            <School className="h-5 w-5 text-primary-600" />
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
      header: 'Country',
      accessor: 'country',
      sortable: true,
      render: (value) => (
        <div className="flex items-center text-sm text-gray-600">
          <MapPin className="h-4 w-4 mr-2 text-gray-400" />
          {value || 'N/A'}
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
      <TabCardsGrid columns={{ mobile: 1, tablet: 2, desktop: 4 }}>
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
        <TabCard
          name="Inactive"
          value={inactiveCount}
          icon={XCircle}
          colorType="gray"
          isActive={statusFilter === 'inactive'}
          onClick={() => setStatusFilter('inactive')}
        />
      </TabCardsGrid>

      {/* DataTable */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100">
        <DataTable
          columns={columns}
          data={filteredTrainingCenters}
          onView={handleViewDetails}
          onRowClick={handleViewDetails}
          onEdit={handleEditTrainingCenter}
          isLoading={loading}
          emptyMessage="No training centers found"
          searchable={true}
          filterable={false}
          searchPlaceholder="Search by name or email..."
        />
      </div>

      {/* Training Center Detail Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedTC(null);
        }}
        title="Training Center Details"
        size="lg"
      >
        <div className="space-y-6">
          <PresentDataForm
            data={selectedTC}
            isLoading={false}
            emptyMessage="No training center data available"
          />
          {selectedTC && (
            <div className="flex space-x-3 pt-4 border-t border-gray-200">
              <Button
                variant="outline"
                fullWidth
                icon={<Edit size={20} />}
                onClick={() => {
                  setDetailModalOpen(false);
                  handleEditTrainingCenter(selectedTC);
                }}
              >
                Edit Training Center
              </Button>
            </div>
          )}
        </div>
      </Modal>

      {/* Edit Training Center Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedTC(null);
          setTcFormData({
            name: '',
            legal_name: '',
            registration_number: '',
            country: '',
            city: '',
            address: '',
            phone: '',
            email: '',
            website: '',
            logo_url: '',
            referred_by_group: false,
            status: 'active',
          });
          setTcErrors({});
        }}
        title={`Edit Training Center: ${selectedTC?.name}`}
        size="lg"
      >
        <form onSubmit={handleSaveTrainingCenter} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="Name"
              name="name"
              value={tcFormData.name}
              onChange={handleTcFormChange}
              error={tcErrors.name}
            />
            <FormInput
              label="Legal Name"
              name="legal_name"
              value={tcFormData.legal_name}
              onChange={handleTcFormChange}
              error={tcErrors.legal_name}
            />
            <FormInput
              label="Registration Number"
              name="registration_number"
              value={tcFormData.registration_number}
              onChange={handleTcFormChange}
              error={tcErrors.registration_number}
            />
            <FormInput
              label="Country"
              name="country"
              value={tcFormData.country}
              onChange={handleTcFormChange}
              error={tcErrors.country}
            />
            <FormInput
              label="City"
              name="city"
              value={tcFormData.city}
              onChange={handleTcFormChange}
              error={tcErrors.city}
            />
            <FormInput
              label="Address"
              name="address"
              value={tcFormData.address}
              onChange={handleTcFormChange}
              textarea
              rows={2}
              error={tcErrors.address}
            />
            <FormInput
              label="Phone"
              name="phone"
              value={tcFormData.phone}
              onChange={handleTcFormChange}
              error={tcErrors.phone}
            />
            <FormInput
              label="Email"
              name="email"
              type="email"
              value={tcFormData.email}
              onChange={handleTcFormChange}
              error={tcErrors.email}
            />
            <FormInput
              label="Website"
              name="website"
              type="url"
              value={tcFormData.website}
              onChange={handleTcFormChange}
              error={tcErrors.website}
            />
            <FormInput
              label="Logo URL"
              name="logo_url"
              type="url"
              value={tcFormData.logo_url}
              onChange={handleTcFormChange}
              error={tcErrors.logo_url}
            />
            <FormInput
              label="Status"
              name="status"
              type="select"
              value={tcFormData.status}
              onChange={handleTcFormChange}
              options={[
                { value: 'pending', label: 'Pending' },
                { value: 'active', label: 'Active' },
                { value: 'suspended', label: 'Suspended' },
                { value: 'inactive', label: 'Inactive' },
              ]}
              error={tcErrors.status}
            />
            <div className="flex items-center">
              <input
                type="checkbox"
                name="referred_by_group"
                checked={tcFormData.referred_by_group}
                onChange={handleTcFormChange}
                className="mr-2"
              />
              <label className="text-sm text-gray-700">Referred by Group</label>
            </div>
          </div>

          {tcErrors.general && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600 font-medium">{tcErrors.general}</p>
            </div>
          )}

          <div className="flex space-x-3 pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              fullWidth
              onClick={() => {
                setEditModalOpen(false);
                setSelectedTC(null);
                setTcErrors({});
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
    </div>
  );
};

export default AllTrainingCentersScreen;
