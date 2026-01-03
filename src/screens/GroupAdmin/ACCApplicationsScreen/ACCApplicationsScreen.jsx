import { useEffect, useState, useMemo } from 'react';
import { adminAPI } from '../../../services/api';
import { useHeader } from '../../../context/HeaderContext';
import { Building2, CheckCircle, XCircle, Clock, Eye, Mail, ClipboardList } from 'lucide-react';
import Modal from '../../../components/Modal/Modal';
import Button from '../../../components/Button/Button';
import TabCard from '../../../components/TabCard/TabCard';
import TabCardsGrid from '../../../components/TabCardsGrid/TabCardsGrid';
import DataTable from '../../../components/DataTable/DataTable';
import PresentDataForm from '../../../components/PresentDataForm/PresentDataForm';
import './ACCApplicationsScreen.css';
import FormInput from '../../../components/FormInput/FormInput';

const ACCApplicationsScreen = () => {
  const { setHeaderTitle, setHeaderSubtitle } = useHeader();
  const [allApplications, setAllApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    setHeaderTitle('ACC Applications');
    setHeaderSubtitle('Review and manage ACC registration applications');
    return () => {
      setHeaderTitle(null);
      setHeaderSubtitle(null);
    };
  }, [setHeaderTitle, setHeaderSubtitle]);

  const loadApplications = async () => {
    setLoading(true);
    try {
      const data = await adminAPI.getACCApplications();
      setAllApplications(data.applications || []);
    } catch (error) {
      console.error('Failed to load applications:', error);
      setAllApplications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();
  }, []);

  const handleApprove = async (id) => {
    try {
      await adminAPI.approveACCApplication(id);
      await loadApplications();
    } catch (error) {
      alert('Failed to approve application: ' + (error.message || 'Unknown error'));
    }
  };

  const handleViewDetails = async (app) => {
    try {
      const data = await adminAPI.getACCApplication(app.id);
      setSelectedApp(data.application);
      setDetailModalOpen(true);
    } catch (error) {
      console.error('Failed to load application details:', error);
      setSelectedApp(app);
      setDetailModalOpen(true);
    }
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
      await adminAPI.rejectACCApplication(selectedApp.id, { rejection_reason: rejectionReason });
      await loadApplications();
      setRejectDialogOpen(false);
      setSelectedApp(null);
      setRejectionReason('');
    } catch (error) {
      alert('Failed to reject application: ' + (error.message || 'Unknown error'));
    }
  };

  // Client-side filtering
  const filteredApplications = useMemo(() => {
    let filtered = [...allApplications];

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(app => app.status === statusFilter);
    }

    // Add search text for DataTable search
    return filtered.map(app => ({
      ...app,
      _searchText: `${app.name || ''} ${app.email || ''} ${app.legal_name || ''}`.toLowerCase()
    }));
  }, [allApplications, statusFilter]);

  // Calculate stats from all applications
  const totalCount = allApplications.length;
  const pendingCount = allApplications.filter(app => app.status === 'pending').length;
  const rejectedCount = allApplications.filter(app => app.status === 'rejected').length;

  // DataTable columns
  const columns = useMemo(() => [
    {
      header: 'Organization',
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
          approved: { 
            badgeClass: 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300',
            icon: CheckCircle 
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
          onClick={() => setStatusFilter('all')}
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
          name="Rejected"
          value={rejectedCount}
          icon={XCircle}
          colorType="red"
          isActive={statusFilter === 'rejected'}
          onClick={() => setStatusFilter('rejected')}
        />
      </TabCardsGrid>

      {/* DataTable */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100">
        <DataTable
          columns={columns}
          data={filteredApplications}
          onView={handleViewDetails}
          onRowClick={handleViewDetails}
          isLoading={loading}
          emptyMessage="No applications found"
          searchable={true}
          filterable={false}
          searchPlaceholder="Search by organization name, email, or legal name..."
        />
      </div>

      {/* Detail View Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedApp(null);
        }}
        title="ACC Application Details"
        size="lg"
      >
        <div className="space-y-6">
          <PresentDataForm
            data={selectedApp}
            isLoading={false}
            emptyMessage="No application data available"
          />
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
        title="Reject ACC Application"
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

export default ACCApplicationsScreen;
