import { useEffect, useState, useMemo, useRef } from 'react';
import { adminAPI, publicAPI } from '../../../services/api';
import { useHeader } from '../../../context/HeaderContext';
import { validateEmail, validatePhone, validateRequired, validateMinLength } from '../../../utils/validation';
import { Building2, Eye, Mail, MapPin, School, CheckCircle, Clock, Edit, ClipboardList, XCircle, Phone, Globe, User, FileText, ExternalLink } from 'lucide-react';
import Modal from '../../../components/Modal/Modal';
import FormInput from '../../../components/FormInput/FormInput';
import Button from '../../../components/Button/Button';
import TabCard from '../../../components/TabCard/TabCard';
import TabCardsGrid from '../../../components/TabCardsGrid/TabCardsGrid';
import DataTable from '../../../components/DataTable/DataTable';
import DetailForm from '../../../components/DetailForm/DetailForm';
import Pagination from '../../../components/Pagination/Pagination';
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
    referred_by_group: false,
    status: 'active',
  });
  const [tcErrors, setTcErrors] = useState({});
  const [countries, setCountries] = useState([]);
  const [cities, setCities] = useState([]);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

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

  // Stats State
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    pending: 0,
    inactive: 0
  });

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
    setHeaderTitle('All Training Providers');
    setHeaderSubtitle('Manage all training providers');
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

    loadTrainingCenters(showLoading);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, pagination.current_page, pagination.per_page, debouncedSearch, searchQuery]);

  useEffect(() => {
    loadCountries();
  }, []);

  const loadTrainingCenters = async (showLoading = true) => {
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

      const data = await adminAPI.listTrainingCenters(params);

      // Handle Laravel pagination response
      let centersList = [];
      if (data.data) {
        centersList = data.data || [];
      } else if (data.training_centers) {
        centersList = data.training_centers || [];
      } else {
        centersList = Array.isArray(data) ? data : [];
      }

      setAllTrainingCenters(centersList);

      // Update pagination state
      if (data) {
        const totalItems = data.total || (data.statistics?.total) || centersList.length;
        const currentPerPage = pagination.per_page;
        const calculatedLastPage = data.last_page || Math.ceil(totalItems / currentPerPage) || 1;
        const calculatedFrom = data.from || (centersList.length > 0 ? ((pagination.current_page - 1) * currentPerPage) + 1 : 0);
        const calculatedTo = data.to || (centersList.length > 0 ? calculatedFrom + centersList.length - 1 : 0);

        setPagination(prev => ({
          ...prev,
          current_page: data.current_page || prev.current_page || 1,
          last_page: calculatedLastPage,
          total: totalItems,
          from: calculatedFrom,
          to: calculatedTo
        }));
      }

      // Update stats from API response if available
      if (data.statistics) {
        setStats({
          total: data.statistics.total || 0,
          active: data.statistics.active || 0,
          pending: data.statistics.pending || 0,
          inactive: data.statistics.inactive || 0
        });
      }

      hasDataRef.current = true;
    } catch (error) {
      console.error('Failed to load training providers:', error);
      setAllTrainingCenters([]);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
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

  const loadCountries = async () => {
    setLoadingCountries(true);
    try {
      const response = await publicAPI.getCountries();
      setCountries(response.countries || response.data || []);
    } catch (error) {
      console.error('Failed to load countries:', error);
      setCountries([]);
    } finally {
      setLoadingCountries(false);
    }
  };

  const loadCities = async (countryCode) => {
    if (!countryCode) {
      setCities([]);
      return;
    }

    setLoadingCities(true);
    try {
      const response = await publicAPI.getCities(countryCode);
      let citiesData = response.cities || response.data?.cities || response.data || response || [];

      // Convert object to array if needed (when API returns object with numeric keys)
      if (!Array.isArray(citiesData) && typeof citiesData === 'object') {
        citiesData = Object.values(citiesData);
      }

      // Ensure cities is always an array
      setCities(Array.isArray(citiesData) ? citiesData : []);
    } catch (error) {
      console.error('Failed to load cities:', error);
      setCities([]);
    } finally {
      setLoadingCities(false);
    }
  };

  const handleViewDetails = async (tc) => {
    try {
      const data = await adminAPI.getTrainingCenterDetails(tc.id);
      setSelectedTC(data.training_center);
      setDetailModalOpen(true);
    } catch (error) {
      console.error('Failed to load training provider details:', error);
      setSelectedTC(tc);
      setDetailModalOpen(true);
    }
  };

  const handleEditTrainingCenter = async (tc) => {
    try {
      const data = await adminAPI.getTrainingCenterDetails(tc.id);
      const tcData = data.training_center;
      setSelectedTC(tcData);
      const countryValue = tcData.country || '';
      setTcFormData({
        name: tcData.name || '',
        legal_name: tcData.legal_name || '',
        registration_number: tcData.registration_number || '',
        country: countryValue,
        city: tcData.city || '',
        address: tcData.address || '',
        phone: tcData.phone || '',
        email: tcData.email || '',
        website: tcData.website || '',
        referred_by_group: tcData.referred_by_group || false,
        status: tcData.status || 'active',
      });
      setTcErrors({});
      // Load cities if country is selected
      if (countryValue) {
        await loadCities(countryValue);
      } else {
        setCities([]);
      }
      setEditModalOpen(true);
    } catch (error) {
      console.error('Failed to load training provider details:', error);
      alert('Failed to load training provider details');
    }
  };

  const handleTcFormChange = async (e) => {
    const { name, value, type, checked } = e.target;

    // If country changes, load cities for that country and reset city
    if (name === 'country') {
      setTcFormData({
        ...tcFormData,
        [name]: value,
        city: '', // Reset city when country changes
      });
      setTcErrors({});
      await loadCities(value);
    } else {
      setTcFormData({
        ...tcFormData,
        [name]: type === 'checkbox' ? checked : value,
      });
      setTcErrors({});
    }
  };

  const handleSaveTrainingCenter = async (e) => {
    e.preventDefault();
    setSaving(true);
    setTcErrors({});

    // Validation
    const validationErrors = {};
    const nameError = validateRequired(tcFormData.name, 'Name');
    if (nameError) validationErrors.name = nameError;
    const emailError = validateEmail(tcFormData.email);
    if (emailError) validationErrors.email = emailError;
    if (tcFormData.phone) {
      const phoneError = validatePhone(tcFormData.phone, 10);
      if (phoneError) validationErrors.phone = phoneError;
    }
    if (tcFormData.registration_number) {
      const regError = validateMinLength(tcFormData.registration_number, 5, 'Registration number');
      if (regError) validationErrors.registration_number = regError;
    }

    if (Object.keys(validationErrors).length > 0) {
      setTcErrors(validationErrors);
      setSaving(false);
      return;
    }

    try {
      await adminAPI.updateTrainingCenter(selectedTC.id, tcFormData);
      await loadTrainingCenters();
      setEditModalOpen(false);
      setSelectedTC(null);
      alert('Training provider updated successfully!');
    } catch (error) {
      if (error.response?.data?.errors) {
        setTcErrors(error.response.data.errors);
      } else {
        setTcErrors({ general: error.response?.data?.message || error.message || 'Failed to update training provider' });
      }
    } finally {
      setSaving(false);
    }
  };

  // filteredTrainingCenters removed - using server-side filtering

  // Use stats from API response or calculate from current data
  const totalCount = stats.total || pagination.total;
  const activeCount = stats.active;
  const pendingCount = stats.pending;
  const inactiveCount = stats.inactive;

  // DataTable columns
  const columns = useMemo(() => [
    {
      header: 'Training Provider',
      accessor: 'name',
      sortable: true,
      render: (value, row) => (
        <div className="flex items-center">
          <div className="w-10 h-10 mr-3 relative">
            {row.logo_url ? (
              <>
                <img
                  src={row.logo_url}
                  alt={value || 'Training Provider Logo'}
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
                  <School className="h-5 w-5 text-primary-600" />
                </div>
              </>
            ) : (
              <div className="w-10 h-10 bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg flex items-center justify-center">
                <School className="h-5 w-5 text-primary-600" />
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
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        <DataTable
          columns={columns}
          data={allTrainingCenters}
          onView={handleViewDetails}
          onRowClick={handleViewDetails}
          onEdit={handleEditTrainingCenter}
          isLoading={loading}
          emptyMessage="No training providers found"
          searchable={true}
          searchValue={searchQuery}
          searchPlaceholder="Search by name, email, legal name, registration number, or country..."
          onSearch={(value) => {
            setSearchQuery(value);
          }}
          filterable={false}
        />

        {/* Pagination */}
        {allTrainingCenters.length > 0 && (
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

      {/* Training Provider Detail Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedTC(null);
        }}
        title="Training Provider Details"
        size="lg"
      >
        <div className="space-y-6">
          {selectedTC && (
            <>
              <DetailForm
                data={{
                  ...selectedTC,
                  primary_contact_name: [
                    selectedTC.primary_contact_title,
                    selectedTC.primary_contact_first_name,
                    selectedTC.primary_contact_last_name
                  ].filter(Boolean).join(' '),
                  secondary_contact_name: [
                    selectedTC.secondary_contact_title,
                    selectedTC.secondary_contact_first_name,
                    selectedTC.secondary_contact_last_name
                  ].filter(Boolean).join(' '),
                  full_address: [
                    selectedTC.address,
                    selectedTC.city,
                    selectedTC.country,
                    selectedTC.physical_postal_code
                  ].filter(Boolean).join(', '),
                  mailing_full_address: [
                    selectedTC.mailing_address,
                    selectedTC.mailing_city,
                    selectedTC.mailing_country,
                    selectedTC.mailing_postal_code
                  ].filter(Boolean).join(', '),
                }}
                fields={[
                  // Company Information
                  { key: 'name', label: 'Company Name', icon: Building2 },
                  { key: 'website', label: 'Website', type: 'url', icon: Globe, showEmpty: false },
                  { key: 'email', label: 'Company Email', type: 'email', icon: Mail },
                  { key: 'phone', label: 'Telephone Number', icon: Phone },
                  { key: 'fax', label: 'Fax', icon: Phone, showEmpty: false },
                  { key: 'training_provider_type', label: 'Training Provider Type', showEmpty: false },

                  // Physical Address
                  { key: 'full_address', label: 'Physical Address', icon: MapPin, fullWidth: true, showEmpty: false },

                  // Mailing Address
                  {
                    key: 'mailing_same_as_physical',
                    label: 'Mailing Same as Physical',
                    transform: (value) => value ? 'Yes' : 'No',
                    showEmpty: false
                  },
                  { key: 'mailing_full_address', label: 'Mailing Address', icon: Mail, fullWidth: true, showEmpty: false },

                  // Primary Contact
                  { key: 'primary_contact_name', label: 'Primary Contact', icon: User, showEmpty: false },
                  { key: 'primary_contact_email', label: 'Primary Contact Email', type: 'email', showEmpty: false },
                  { key: 'primary_contact_country', label: 'Primary Contact Country', showEmpty: false },
                  { key: 'primary_contact_mobile', label: 'Primary Contact Mobile', showEmpty: false },

                  // Secondary Contact
                  {
                    key: 'has_secondary_contact',
                    label: 'Has Secondary Contact',
                    transform: (value) => value ? 'Yes' : 'No',
                    showEmpty: false
                  },
                  { key: 'secondary_contact_name', label: 'Secondary Contact', icon: User, showEmpty: false },
                  { key: 'secondary_contact_email', label: 'Secondary Contact Email', type: 'email', showEmpty: false },
                  { key: 'secondary_contact_country', label: 'Secondary Contact Country', showEmpty: false },
                  { key: 'secondary_contact_mobile', label: 'Secondary Contact Mobile', showEmpty: false },

                  // Additional Information
                  { key: 'company_gov_registry_number', label: 'GOV Registry Number', showEmpty: false },
                  {
                    key: 'company_registration_certificate_url',
                    label: 'Registration Certificate',
                    showEmpty: false,
                    render: (value) => (
                      <a
                        href={value}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-3 py-1.5 bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100 transition-colors text-sm font-medium"
                      >
                        <FileText size={16} className="mr-2" />
                        View Certificate
                        <ExternalLink size={14} className="ml-1 opacity-70" />
                      </a>
                    )
                  },
                  {
                    key: 'facility_floorplan_url',
                    label: 'Facility Floorplan',
                    showEmpty: false,
                    render: (value) => (
                      <a
                        href={value}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-3 py-1.5 bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100 transition-colors text-sm font-medium"
                      >
                        <MapPin size={16} className="mr-2" />
                        View Floorplan
                        <ExternalLink size={14} className="ml-1 opacity-70" />
                      </a>
                    )
                  },
                  {
                    key: 'interested_fields',
                    label: 'Interested Fields',
                    transform: (value) => Array.isArray(value) ? value.join(', ') : value,
                    showEmpty: false
                  },
                  { key: 'how_did_you_hear_about_us', label: 'How Did You Hear About Us', showEmpty: false },

                  // Legacy fields
                  { key: 'legal_name', label: 'Legal Name', showEmpty: false },
                  { key: 'registration_number', label: 'Registration Number', showEmpty: false },
                  { key: 'status', label: 'Status', type: 'status' },
                ]}
              />
            </>
          )}
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
                Edit Training Provider
              </Button>
            </div>
          )}
        </div>
      </Modal>

      {/* Edit Training Provider Modal */}
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
            referred_by_group: false,
            status: 'active',
          });
          setTcErrors({});
          setCities([]);
        }}
        title={`Edit Training Provider: ${selectedTC?.name}`}
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
              placeholder="Enter registration number (minimum 5 characters)"
            />
            <FormInput
              label="Country"
              name="country"
              type="select"
              value={tcFormData.country}
              onChange={handleTcFormChange}
              disabled={loadingCountries}
              options={loadingCountries
                ? [{ value: '', label: 'Loading countries...' }]
                : countries.length > 0
                  ? [
                    { value: '', label: 'Select a country' },
                    ...countries.map(country => ({
                      value: country.code || country.name || country,
                      label: country.name || country.code || country,
                    }))
                  ]
                  : [{ value: '', label: 'No countries available' }]
              }
              error={tcErrors.country}
            />
            <FormInput
              label="City"
              name="city"
              type="select"
              value={tcFormData.city}
              onChange={handleTcFormChange}
              disabled={!tcFormData.country || loadingCities}
              options={
                !tcFormData.country
                  ? [{ value: '', label: 'Select a country first' }]
                  : loadingCities
                    ? [{ value: '', label: 'Loading cities...' }]
                    : cities.length > 0
                      ? [
                        { value: '', label: 'Select a city' },
                        ...cities.map(city => ({
                          value: city.name || city,
                          label: city.name || city,
                        }))
                      ]
                      : [{ value: '', label: 'No cities available' }]
              }
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
              placeholder="Enter phone number (10-13 digits)"
            />
            <FormInput
              label="Email"
              name="email"
              type="email"
              value={tcFormData.email}
              onChange={handleTcFormChange}
              error={tcErrors.email}
              placeholder="example@example.com"
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
