import { useEffect, useState, useMemo } from 'react';
import { adminAPI } from '../../../services/api';
import { useHeader } from '../../../context/HeaderContext';
import { Building2, CheckCircle, XCircle, Clock, Eye, Mail, ClipboardList, Phone, MapPin, Globe, FileText, Hash, Calendar } from 'lucide-react';
import Modal from '../../../components/Modal/Modal';
import Button from '../../../components/Button/Button';
import TabCard from '../../../components/TabCard/TabCard';
import TabCardsGrid from '../../../components/TabCardsGrid/TabCardsGrid';
import DataTable from '../../../components/DataTable/DataTable';
import DetailForm from '../../../components/DetailForm/DetailForm';
import './TrainingCenterApplicationsScreen.css';
import FormInput from '../../../components/FormInput/FormInput';
import Pagination from '../../../components/Pagination/Pagination';
import useDebounce from '../../../hooks/useDebounce';

const TrainingCenterApplicationsScreen = () => {
  const { setHeaderTitle, setHeaderSubtitle } = useHeader();
  const [allApplications, setAllApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 500);
  const [pagination, setPagination] = useState({
    current_page: 1,
    per_page: 10,
    total: 0,
    last_page: 1
  });
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    rejected: 0
  });

  useEffect(() => {
    setHeaderTitle('Training Provider Applications');
    setHeaderSubtitle('Review and manage Training Provider registration applications');
    return () => {
      setHeaderTitle(null);
      setHeaderSubtitle(null);
    };
  }, [setHeaderTitle, setHeaderSubtitle]);

  const loadApplications = async (page = 1, search = '', status = 'all') => {
    try {
      setLoading(true);
      const params = {
        page,
        per_page: pagination.per_page,
        ...(search && { search }),
        ...(status !== 'all' && { status })
      };

      const data = await adminAPI.getTrainingCenterApplications(params);

      let apps = [];
      if (data.data) apps = data.data;
      else if (data.applications) apps = data.applications;
      else if (Array.isArray(data)) apps = data;

      setAllApplications(apps);

      // Update pagination
      if (data.meta || data.pagination) {
        const meta = data.meta || data.pagination;
        setPagination(prev => ({
          ...prev,
          current_page: meta.current_page || page,
          total: meta.total || 0,
          last_page: meta.last_page || 1,
          per_page: meta.per_page || prev.per_page
        }));
      } else if (data.total !== undefined) {
        setPagination(prev => ({
          ...prev,
          current_page: data.current_page || page,
          total: data.total || apps.length,
          last_page: data.last_page || 1
        }));
      }

      // Update stats if available
      if (data.statistics) {
        setStats({
          total: data.statistics.total || 0,
          pending: data.statistics.pending || 0,
          rejected: data.statistics.rejected || 0
        });
      }
    } catch (error) {
      console.error('Failed to load applications:', error);
      alert('Failed to load applications: ' + (error.message || 'Unknown error'));
      setAllApplications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplications(pagination.current_page, debouncedSearch, statusFilter);
  }, [pagination.current_page, debouncedSearch, statusFilter]);

  const handlePageChange = (page) => {
    setPagination(prev => ({ ...prev, current_page: page }));
  };

  const handleSearch = (term) => {
    setSearchTerm(term);
    setPagination(prev => ({ ...prev, current_page: 1 }));
  };

  const handleStatusChange = (status) => {
    setStatusFilter(status);
    setPagination(prev => ({ ...prev, current_page: 1 }));
  };

  const handleApprove = async (id) => {
    if (!confirm('Are you sure you want to approve this Training Provider application?')) {
      return;
    }
    try {
      await adminAPI.approveTrainingCenterApplication(id);
      alert('Training Provider application approved successfully!');
      await loadApplications();
    } catch (error) {
      alert('Failed to approve application: ' + (error.message || 'Unknown error'));
    }
  };

  const handleViewDetails = (app) => {
    setSelectedApp(app);
    setDetailModalOpen(true);
  };

  const handleReject = (app) => {
    setSelectedApp(app);
    setRejectionReason('');
    setRejectDialogOpen(true);
  };

  const confirmReject = async () => {
    if (!rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }
    try {
      await adminAPI.rejectTrainingCenterApplication(selectedApp.id, { rejection_reason: rejectionReason });
      alert('Training Provider application rejected');
      await loadApplications();
      setRejectDialogOpen(false);
      setSelectedApp(null);
      setRejectionReason('');
    } catch (error) {
      alert('Failed to reject application: ' + (error.message || 'Unknown error'));
    }
  };

  // Calculate stats from all applications - fallback if API doesn't return statistics
  // Or use state stats
  const totalCount = stats.total || (statusFilter === 'all' ? pagination.total : 0);
  const pendingCount = stats.pending || 0;
  const rejectedCount = stats.rejected || 0;

  // DataTable columns
  const columns = useMemo(() => [
    {
      header: 'Training Provider',
      accessor: 'name',
      sortable: true,
      render: (value, row) => (
        <div className="flex items-center">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg flex items-center justify-center mr-3">
            <Building2 className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <div className="font-medium text-gray-900">{value || 'N/A'}</div>
            <div className="text-xs text-gray-500">{row.legal_name || ''}</div>
          </div>
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
          inactive: {
            badgeClass: 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 border border-red-300',
            icon: XCircle
          },
          rejected: {
            badgeClass: 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 border border-red-300',
            icon: XCircle
          },
          pending: {
            badgeClass: 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 border border-yellow-300',
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
      header: 'Date',
      accessor: 'created_at',
      sortable: true,
      render: (value) => (
        <span className="text-sm text-gray-600">
          {value ? new Date(value).toLocaleDateString() : 'N/A'}
        </span>
      )
    }
  ], []);

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
          onClick={() => handleStatusChange('all')}
        />
        <TabCard
          name="Pending"
          value={pendingCount}
          icon={Clock}
          colorType="yellow"
          isActive={statusFilter === 'pending'}
          onClick={() => handleStatusChange('pending')}
        />
        <TabCard
          name="Rejected"
          value={rejectedCount}
          icon={XCircle}
          colorType="red"
          isActive={statusFilter === 'rejected'}
          onClick={() => handleStatusChange('rejected')}
        />
      </TabCardsGrid>

      {/* DataTable */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100">
        <DataTable
          columns={columns}
          data={allApplications}
          onView={handleViewDetails}
          onRowClick={handleViewDetails}
          isLoading={loading}
          emptyMessage="No applications found"
          searchable={true}
          searchValue={searchTerm}
          onSearch={handleSearch}
          filterable={false}
          searchPlaceholder="Search by training provider name, email, or legal name..."
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
      </div>

      {/* Detail View Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedApp(null);
        }}
        title="Training Provider Application Details"
        size="lg"
      >
        <div className="space-y-6">
          {selectedApp && (
            <>
              <DetailForm
                data={{
                  ...selectedApp,
                  // Company Info
                  name: selectedApp.name || selectedApp.legal_name,

                  // Address Merging
                  physical_address_full: [
                    selectedApp.address, // Payload uses 'address' for physical street
                    selectedApp.city,
                    selectedApp.country,
                    selectedApp.physical_postal_code || selectedApp.postal_code
                  ].filter(Boolean).join(', '),

                  mailing_address_full: (selectedApp.mailing_same_as_physical)
                    ? 'Same as Physical Address'
                    : [
                      selectedApp.mailing_address,
                      selectedApp.mailing_city,
                      selectedApp.mailing_country,
                      selectedApp.mailing_postal_code
                    ].filter(Boolean).join(', '),

                  // Primary Contact
                  primary_contact_full_name: [
                    selectedApp.primary_contact_title,
                    selectedApp.primary_contact_first_name,
                    selectedApp.primary_contact_last_name
                  ].filter(Boolean).join(' '),

                  // Secondary Contact
                  secondary_contact_full_name: [
                    selectedApp.secondary_contact_title,
                    selectedApp.secondary_contact_first_name,
                    selectedApp.secondary_contact_last_name
                  ].filter(Boolean).join(' '),

                  // Arrays
                  interested_fields_str: Array.isArray(selectedApp.interested_fields)
                    ? selectedApp.interested_fields.join(', ')
                    : selectedApp.interested_fields,

                  // Agreements
                  agreements_summary: [
                    selectedApp.agreed_to_receive_communications ? 'Receives Comms' : null,
                    selectedApp.agreed_to_terms_and_conditions ? 'Terms Accepted' : null
                  ].filter(Boolean).join(', '),
                }}
                fields={[
                  { key: 'name', label: 'Company Name', icon: Building2 },
                  { key: 'legal_name', label: 'Legal Name', showEmpty: false },
                  { key: 'registration_number', label: 'Registration Number', icon: Hash, showEmpty: false },
                  { key: 'training_provider_type', label: 'Provider Type', showEmpty: false },
                  { key: 'email', label: 'Company Email', type: 'email', icon: Mail },
                  { key: 'phone', label: 'Phone', icon: Phone, showEmpty: false },
                  { key: 'fax', label: 'Fax', showEmpty: false },
                  { key: 'website', label: 'Website', type: 'url', icon: Globe, showEmpty: false },

                  { key: 'physical_address_full', label: 'Physical Address', icon: MapPin, fullWidth: true, showEmpty: false },
                  { key: 'mailing_address_full', label: 'Mailing Address', icon: MapPin, fullWidth: true, showEmpty: false },

                  // Primary Contact
                  { key: 'primary_contact_full_name', label: 'Primary Contact Name', showEmpty: false },
                  { key: 'primary_contact_email', label: 'Primary Contact Email', type: 'email', showEmpty: false },
                  { key: 'primary_contact_mobile', label: 'Primary Contact Mobile', showEmpty: false },
                  { key: 'primary_contact_country', label: 'Primary Contact Country', showEmpty: false },

                  // Secondary Contact
                  { key: 'secondary_contact_full_name', label: 'Secondary Contact Name', showEmpty: false },
                  { key: 'secondary_contact_email', label: 'Secondary Contact Email', type: 'email', showEmpty: false },
                  { key: 'secondary_contact_mobile', label: 'Secondary Contact Mobile', showEmpty: false },
                  { key: 'secondary_contact_country', label: 'Secondary Contact Country', showEmpty: false },

                  { key: 'company_gov_registry_number', label: 'Gov Registry Number', showEmpty: false },
                  { key: 'interested_fields_str', label: 'Interested Fields', showEmpty: false },

                  // Documents
                  {
                    key: 'company_registration_certificate_url',
                    label: 'Registration Certificate',
                    render: (value) => value ? (
                      <a
                        href={value}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Eye size={16} className="mr-2" /> View Certificate
                      </a>
                    ) : null,
                    showEmpty: false
                  },
                  {
                    key: 'facility_floorplan_url',
                    label: 'Facility Floorplan',
                    render: (value) => value ? (
                      <a
                        href={value}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Eye size={16} className="mr-2" /> View Floorplan
                      </a>
                    ) : null,
                    showEmpty: false
                  },

                  { key: 'how_did_you_hear_about_us', label: 'How did you hear about us?', showEmpty: false },
                  { key: 'agreements_summary', label: 'Agreements', showEmpty: false },

                  { key: 'status', label: 'Status', type: 'status' },
                  { key: 'created_at', label: 'Created At', type: 'datetime', icon: Calendar, showEmpty: false },
                ]}
              />
              {(selectedApp.training_center?.description || selectedApp.description) && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Description</p>
                  <p className="text-base text-gray-900">
                    {selectedApp.training_center?.description || selectedApp.description}
                  </p>
                </div>
              )}
            </>
          )}
          {selectedApp && selectedApp.status === 'pending' && (
            <div className="flex space-x-3 pt-4 border-t border-gray-200">
              <Button
                variant="success"
                fullWidth
                icon={<CheckCircle size={20} />}
                onClick={async () => {
                  await handleApprove(selectedApp.id);
                  setDetailModalOpen(false);
                }}
              >
                Approve Application
              </Button>
              <Button
                variant="danger"
                fullWidth
                icon={<XCircle size={20} />}
                onClick={() => {
                  setDetailModalOpen(false);
                  handleReject(selectedApp);
                }}
              >
                Reject Application
              </Button>
            </div>
          )}
        </div>
      </Modal>

      {/* Reject Dialog */}
      <Modal
        isOpen={rejectDialogOpen}
        onClose={() => {
          setRejectDialogOpen(false);
          setSelectedApp(null);
          setRejectionReason('');
        }}
        title="Reject Training Provider Application"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Please provide a reason for rejecting this application:
          </p>
          <FormInput
            label="Rejection Reason"
            name="rejection_reason"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            textarea
            rows={4}
            required
            placeholder="Enter the reason for rejection..."
          />
          <div className="flex space-x-3 pt-4">
            <Button
              variant="outline"
              fullWidth
              onClick={() => {
                setRejectDialogOpen(false);
                setSelectedApp(null);
                setRejectionReason('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              fullWidth
              onClick={confirmReject}
            >
              Reject Application
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default TrainingCenterApplicationsScreen;
