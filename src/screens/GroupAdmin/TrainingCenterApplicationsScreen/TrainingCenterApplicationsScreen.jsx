import { useEffect, useState, useMemo } from 'react';
import { adminAPI } from '../../../services/api';
import { useHeader } from '../../../context/HeaderContext';
import { Building2, CheckCircle, XCircle, Clock, Eye, Mail, Phone, MapPin, FileText, ClipboardList, Search, Filter, ChevronUp, ChevronDown } from 'lucide-react';
import Modal from '../../../components/Modal/Modal';
import ConfirmDialog from '../../../components/ConfirmDialog/ConfirmDialog';
import Button from '../../../components/Button/Button';
import './TrainingCenterApplicationsScreen.css';
import FormInput from '../../../components/FormInput/FormInput';

const TrainingCenterApplicationsScreen = () => {
  const { setHeaderTitle, setHeaderSubtitle } = useHeader();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  useEffect(() => {
    loadApplications();
  }, []);

  useEffect(() => {
    setHeaderTitle('Training Center Applications');
    setHeaderSubtitle('Review and manage Training Center registration applications');
    return () => {
      setHeaderTitle(null);
      setHeaderSubtitle(null);
    };
  }, [setHeaderTitle, setHeaderSubtitle]);

  const loadApplications = async () => {
    try {
      setLoading(true);
      const data = await adminAPI.getTrainingCenterApplications();
      setApplications(data.applications || []);
    } catch (error) {
      console.error('Failed to load applications:', error);
      alert('Failed to load applications: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    if (!confirm('Are you sure you want to approve this Training Center application?')) {
      return;
    }
    try {
      await adminAPI.approveTrainingCenterApplication(id);
      alert('Training Center application approved successfully!');
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
      alert('Training Center application rejected');
      await loadApplications();
      setRejectDialogOpen(false);
      setSelectedApp(null);
      setRejectionReason('');
    } catch (error) {
      alert('Failed to reject application: ' + (error.message || 'Unknown error'));
    }
  };

  // Sort handler
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Filter and sort applications
  const filteredAndSortedApplications = useMemo(() => {
    let filtered = [...applications];

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(app => {
        const name = app.name || '';
        const email = app.email || '';
        const legalName = app.legal_name || '';
        return name.toLowerCase().includes(term) || 
               email.toLowerCase().includes(term) ||
               legalName.toLowerCase().includes(term);
      });
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(app => app.status === statusFilter);
    }

    // Apply sorting
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aValue, bValue;
        
        if (sortConfig.key === 'name') {
          aValue = (a.name || '').toLowerCase();
          bValue = (b.name || '').toLowerCase();
        } else if (sortConfig.key === 'created_at') {
          aValue = new Date(a.created_at || 0).getTime();
          bValue = new Date(b.created_at || 0).getTime();
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
    
    return filtered;
  }, [applications, searchTerm, statusFilter, sortConfig]);

  // Calculate stats
  const totalCount = applications.length;
  const pendingCount = applications.filter(app => app.status === 'pending').length;
  const rejectedCount = applications.filter(app => app.status === 'inactive' || app.status === 'rejected').length;

  const renderSortIcon = (key) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />;
    }
    return null;
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;
  }

  return (
    <div className="space-y-4">

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Applications */}
        <div 
          onClick={() => setStatusFilter('all')}
          className={`bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl shadow-lg p-6 border border-primary-200 hover:shadow-xl transition-all duration-300 cursor-pointer ${
            statusFilter === 'all' ? 'ring-2 ring-primary-500' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-primary-700 mb-2">Total</p>
              <p className="text-3xl font-bold text-primary-900">{totalCount}</p>
            </div>
            <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg">
              <ClipboardList className="text-white" size={32} />
            </div>
          </div>
        </div>

        {/* Pending */}
        <div 
          onClick={() => setStatusFilter('pending')}
          className={`bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl shadow-lg p-6 border border-yellow-200 hover:shadow-xl transition-all duration-300 cursor-pointer ${
            statusFilter === 'pending' ? 'ring-2 ring-yellow-500' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-700 mb-2">Pending</p>
              <p className="text-3xl font-bold text-yellow-900">{pendingCount}</p>
            </div>
            <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center shadow-lg">
              <Clock className="text-white" size={32} />
            </div>
          </div>
        </div>

        {/* Rejected */}
        <div 
          onClick={() => setStatusFilter('rejected')}
          className={`bg-gradient-to-br from-red-50 to-red-100 rounded-xl shadow-lg p-6 border border-red-200 hover:shadow-xl transition-all duration-300 cursor-pointer ${
            statusFilter === 'rejected' ? 'ring-2 ring-red-500' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-700 mb-2">Rejected</p>
              <p className="text-3xl font-bold text-red-900">{rejectedCount}</p>
            </div>
            <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
              <XCircle className="text-white" size={32} />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter Section */}
      <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-100">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by training center name, email, or legal name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-10 pr-8 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none bg-white cursor-pointer transition-all"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
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
                    Training Center
                    {renderSortIcon('name')}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-primary-700 transition-colors select-none"
                  onClick={() => handleSort('email')}
                >
                  <div className="flex items-center gap-2">
                    Email
                    {renderSortIcon('email')}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-primary-700 transition-colors select-none"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center gap-2">
                    Status
                    {renderSortIcon('status')}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-primary-700 transition-colors select-none"
                  onClick={() => handleSort('created_at')}
                >
                  <div className="flex items-center gap-2">
                    Date
                    {renderSortIcon('created_at')}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAndSortedApplications.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center">
                      <ClipboardList className="h-12 w-12 text-gray-400 mb-4" />
                      <p className="text-lg font-medium">No applications found</p>
                      <p className="text-sm">Try adjusting your search or filter criteria</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAndSortedApplications.map((app) => (
                  <tr 
                    key={app.id} 
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => handleViewDetails(app)}
                  >
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg flex items-center justify-center mr-3">
                          <Building2 className="h-5 w-5 text-primary-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{app.name || 'N/A'}</div>
                          <div className="text-xs text-gray-500">{app.legal_name || ''}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-600">
                        <Mail className="h-4 w-4 mr-2 text-gray-400" />
                        {app.email || 'N/A'}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1.5 inline-flex items-center text-xs leading-5 font-bold rounded-full shadow-sm ${
                        app.status === 'active' ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300' :
                        app.status === 'inactive' || app.status === 'rejected' ? 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 border border-red-300' :
                        'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 border border-yellow-300'
                      }`}>
                        {app.status === 'pending' && <Clock size={12} className="mr-1" />}
                        {app.status === 'active' && <CheckCircle size={12} className="mr-1" />}
                        {(app.status === 'inactive' || app.status === 'rejected') && <XCircle size={12} className="mr-1" />}
                        {app.status ? app.status.charAt(0).toUpperCase() + app.status.slice(1) : 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                      {app.created_at ? new Date(app.created_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewDetails(app)}
                          className="p-2 rounded-lg bg-primary-50 text-primary-600 hover:bg-primary-100 hover:scale-110 transition-all duration-200 shadow-sm hover:shadow-md"
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                        {app.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(app.id)}
                              className="p-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 hover:scale-110 transition-all duration-200 shadow-sm hover:shadow-md"
                              title="Approve"
                            >
                              <CheckCircle size={16} />
                            </button>
                            <button
                              onClick={() => handleReject(app)}
                              className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 hover:scale-110 transition-all duration-200 shadow-sm hover:shadow-md"
                              title="Reject"
                            >
                              <XCircle size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail View Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedApp(null);
        }}
        title="Training Center Application Details"
        size="lg"
      >
        {selectedApp && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Training Center Name</p>
                <p className="text-base font-semibold text-gray-900">{selectedApp.name}</p>
              </div>
              {selectedApp.legal_name && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Legal Name</p>
                  <p className="text-base font-semibold text-gray-900">{selectedApp.legal_name}</p>
                </div>
              )}
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1 flex items-center">
                  <Mail size={16} className="mr-2" />
                  Email
                </p>
                <p className="text-base font-semibold text-gray-900">{selectedApp.email}</p>
              </div>
              {selectedApp.phone && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1 flex items-center">
                    <Phone size={16} className="mr-2" />
                    Phone
                  </p>
                  <p className="text-base font-semibold text-gray-900">{selectedApp.phone}</p>
                </div>
              )}
              {selectedApp.country && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1 flex items-center">
                    <MapPin size={16} className="mr-2" />
                    Country
                  </p>
                  <p className="text-base font-semibold text-gray-900">{selectedApp.country}</p>
                </div>
              )}
              {selectedApp.city && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1 flex items-center">
                    <MapPin size={16} className="mr-2" />
                    City
                  </p>
                  <p className="text-base font-semibold text-gray-900">{selectedApp.city}</p>
                </div>
              )}
              {selectedApp.address && (
                <div className="p-4 bg-gray-50 rounded-lg md:col-span-2">
                  <p className="text-sm text-gray-500 mb-1">Address</p>
                  <p className="text-base font-semibold text-gray-900">{selectedApp.address}</p>
                </div>
              )}
              {selectedApp.registration_number && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Registration Number</p>
                  <p className="text-base font-semibold text-gray-900">{selectedApp.registration_number}</p>
                </div>
              )}
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Status</p>
                <span className={`px-3 py-1.5 inline-flex items-center text-xs leading-5 font-bold rounded-full shadow-sm ${
                  selectedApp.status === 'active' ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300' :
                  selectedApp.status === 'inactive' || selectedApp.status === 'rejected' ? 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 border border-red-300' :
                  'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 border border-yellow-300'
                }`}>
                  {selectedApp.status === 'pending' && <Clock size={12} className="mr-1" />}
                  {selectedApp.status === 'active' && <CheckCircle size={12} className="mr-1" />}
                  {(selectedApp.status === 'inactive' || selectedApp.status === 'rejected') && <XCircle size={12} className="mr-1" />}
                  {selectedApp.status ? selectedApp.status.charAt(0).toUpperCase() + selectedApp.status.slice(1) : 'N/A'}
                </span>
              </div>
            </div>

            {selectedApp.status === 'pending' && (
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
        )}
      </Modal>

      {/* Reject Dialog */}
      <Modal
        isOpen={rejectDialogOpen}
        onClose={() => {
          setRejectDialogOpen(false);
          setSelectedApp(null);
          setRejectionReason('');
        }}
        title="Reject Training Center Application"
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

