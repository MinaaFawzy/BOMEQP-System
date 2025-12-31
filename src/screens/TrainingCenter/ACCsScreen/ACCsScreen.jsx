import { useEffect, useState, useMemo } from 'react';
import { trainingCenterAPI } from '../../../services/api';
import { useHeader } from '../../../context/HeaderContext';
import { Building2, Send, Eye, CheckCircle, Clock, XCircle, Plus, Trash2, FileText, Upload, Loader, Mail, MessageSquare, Download } from 'lucide-react';
import Modal from '../../../components/Modal/Modal';
import FormInput from '../../../components/FormInput/FormInput';
import Pagination from '../../../components/Pagination/Pagination';
import LoadingSpinner from '../../../components/LoadingSpinner/LoadingSpinner';
import TabCard from '../../../components/TabCard/TabCard';
import TabCardsGrid from '../../../components/TabCardsGrid/TabCardsGrid';
import DataTable from '../../../components/DataTable/DataTable';
import AuthorizationRequestForm from '../../../components/AuthorizationRequestForm/AuthorizationRequestForm';
import DetailItem from '../../../components/DetailItem/DetailItem';
import DetailGrid from '../../../components/DetailGrid/DetailGrid';
import InfoBox from '../../../components/InfoBox/InfoBox';
import DocumentsList from '../../../components/DocumentsList/DocumentsList';
import StatusBadge from '../../../components/StatusBadge/StatusBadge';
import { validateFile, validateArray, validateMaxLength } from '../../../utils/validation';
import './ACCsScreen.css';

const ACCsScreen = () => {
  const { setHeaderTitle, setHeaderSubtitle } = useHeader();
  const [allAccs, setAllAccs] = useState([]);
  const [allAuthorizations, setAllAuthorizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('available');
  const [pagination, setPagination] = useState({
    currentPage: 1,
    perPage: 10,
    totalPages: 1,
    totalItems: 0,
  });
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedACC, setSelectedACC] = useState(null);
  const [selectedAuthorization, setSelectedAuthorization] = useState(null);
  const [authDetailModalOpen, setAuthDetailModalOpen] = useState(false);
  const [requestForm, setRequestForm] = useState({
    documents: [],
    additional_info: '',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadAllData();
  }, [pagination.currentPage, pagination.perPage, activeTab]); // Reload data when pagination or tab changes

  useEffect(() => {
    setHeaderTitle('Accreditation Bodies');
    setHeaderSubtitle('Browse and request authorization from Accreditation Bodies');
    return () => {
      setHeaderTitle(null);
      setHeaderSubtitle(null);
    };
  }, [setHeaderTitle, setHeaderSubtitle]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      
      // Load all data without pagination for client-side filtering and pagination
      const params = {
        page: pagination.currentPage,
        per_page: pagination.perPage,
      };
      
      // Load both datasets in parallel (without search - filtering is client-side)
      const [accsResult, authResult] = await Promise.allSettled([
        trainingCenterAPI.listACCs(params),
        trainingCenterAPI.getAuthorizationStatus(params)
      ]);

      if (accsResult.status === 'fulfilled') {
        const accsData = accsResult.value;
        let accsArray = [];
        if (accsData?.data) {
          accsArray = Array.isArray(accsData.data) ? accsData.data : [];
        } else if (accsData?.accs) {
          accsArray = Array.isArray(accsData.accs) ? accsData.accs : [];
        } else if (Array.isArray(accsData)) {
          accsArray = accsData;
        }
        setAllAccs(accsArray);
        
        // Update pagination from API response for ACCs
        if (activeTab === 'available' && accsData) {
          setPagination(prev => ({
            ...prev,
            totalPages: accsData.last_page || accsData.total_pages || 1,
            totalItems: accsData.total || accsArray.length,
          }));
        }
      }

      if (authResult.status === 'fulfilled') {
        const authData = authResult.value;
        let authArray = [];
        if (authData?.data) {
          authArray = Array.isArray(authData.data) ? authData.data : [];
        } else if (authData?.authorizations) {
          authArray = Array.isArray(authData.authorizations) ? authData.authorizations : [];
        } else if (Array.isArray(authData)) {
          authArray = authData;
        }
        setAllAuthorizations(authArray);
        
        // Update pagination from API response for Authorizations
        if (activeTab === 'authorizations' && authData) {
          setPagination(prev => ({
            ...prev,
            totalPages: authData.last_page || authData.total_pages || 1,
            totalItems: authData.total || authArray.length,
          }));
        }
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handlePageChange = (page) => {
    setPagination(prev => ({ ...prev, currentPage: page }));
  };
  
  const handlePerPageChange = (perPage) => {
    setPagination(prev => ({ ...prev, perPage, currentPage: 1 }));
  };

  // Define columns for ACCs table
  const accsColumns = useMemo(() => [
    {
      header: 'ACC Name',
      accessor: 'name',
      sortable: true,
      render: (value, row) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div className="accs-table-row-icon-wrapper">
            <Building2 className="accs-table-row-icon" />
          </div>
          <div>
            <div className="accs-table-row-name">{value || 'N/A'}</div>
          </div>
        </div>
      )
    },
    {
      header: 'Email',
      accessor: 'email',
      sortable: true,
      render: (value) => (
        <div className="accs-table-row-email">
          <Mail className="accs-table-row-email-icon" />
          {value || 'N/A'}
        </div>
      )
    },
    {
      header: 'Country',
      accessor: 'country',
      sortable: true,
      render: (value) => (
        <span className="accs-table-row-text">{value || 'N/A'}</span>
      )
    },
    {
      header: 'Status',
      accessor: 'status',
      sortable: true,
      render: (value) => (
        <span className={`accs-status-badge ${
          value === 'active' ? 'accs-status-badge-active' : 'accs-status-badge-default'
        }`}>
          {value ? value.charAt(0).toUpperCase() + value.slice(1) : 'N/A'}
        </span>
      )
    },
    {
      header: 'Actions',
      accessor: 'actions',
      sortable: false,
      render: (value, row) => (
        <div className="accs-action-buttons" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => handleViewDetails(row)}
            className="accs-action-button accs-action-button-primary"
            title="View Details"
          >
            <Eye size={16} />
          </button>
          {row.status === 'active' ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRequestAuth(row);
              }}
              className="accs-action-button accs-action-button-green"
              title="Request Authorization"
            >
              <Send size={16} />
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleViewDetails(row);
              }}
              className="accs-action-button accs-action-button-blue"
              title="View Info"
            >
              <Eye size={16} />
            </button>
          )}
        </div>
      )
    }
  ], []);

  // Define columns for Authorizations table
  const authorizationsColumns = useMemo(() => [
    {
      header: 'ACC',
      accessor: 'acc',
      sortable: true,
      render: (value) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div className="accs-table-row-icon-wrapper">
            <Building2 className="accs-table-row-icon" />
          </div>
          <div>
            <div className="accs-table-row-name">
              {value?.name || 'N/A'}
            </div>
          </div>
        </div>
      )
    },
    {
      header: 'Email',
      accessor: 'acc',
      sortable: true,
      render: (value) => (
        <div className="accs-table-row-email">
          <Mail className="accs-table-row-email-icon" />
          {value?.email || 'N/A'}
        </div>
      )
    },
    {
      header: 'Country',
      accessor: 'acc',
      sortable: true,
      render: (value) => (
        <span className="accs-table-row-text">{value?.country || 'N/A'}</span>
      )
    },
    {
      header: 'Status',
      accessor: 'status',
      sortable: true,
      render: (value) => {
        const statusConfig = {
          approved: { badgeClass: 'accs-status-badge-approved', icon: CheckCircle },
          rejected: { badgeClass: 'accs-status-badge-rejected', icon: XCircle },
          pending: { badgeClass: 'accs-status-badge-pending', icon: Clock },
          returned: { badgeClass: 'accs-status-badge-returned', icon: Clock },
        };
        const config = statusConfig[value] || statusConfig.pending;
        const Icon = config.icon;
        return (
          <span className={`accs-status-badge ${config.badgeClass}`}>
            <Icon size={14} className="accs-status-badge-icon" />
            {value || 'N/A'}
          </span>
        );
      }
    },
    {
      header: 'Request Date',
      accessor: 'request_date',
      sortable: true,
      render: (value) => (
        <span className="accs-table-row-text">
          {value ? new Date(value).toLocaleDateString() : 'N/A'}
        </span>
      )
    },
    {
      header: 'Reviewed At',
      accessor: 'reviewed_at',
      sortable: true,
      render: (value) => (
        <span className="accs-table-row-text">
          {value ? new Date(value).toLocaleDateString() : 'Pending'}
        </span>
      )
    }
  ], []);

  const handleRequestAuth = (acc) => {
    setSelectedACC(acc);
    setRequestForm({
      documents: [],
      additional_info: '',
    });
    setErrors({});
    setRequestModalOpen(true);
  };


  const handleSubmitRequest = async (formData, setFormErrors) => {
    setSubmitting(true);
    if (setFormErrors) setFormErrors({});

    try {
      const submitFormData = new FormData();
      
      formData.documents.forEach((doc, index) => {
        submitFormData.append(`documents[${index}][type]`, doc.type);
        submitFormData.append(`documents[${index}][file]`, doc.file);
      });
      
      if (formData.additional_info) {
        submitFormData.append('additional_info', formData.additional_info);
      }
      
      const response = await trainingCenterAPI.requestAuthorization(selectedACC.id, submitFormData);
      
      await loadAllData();
      setRequestModalOpen(false);
      setRequestForm({
        documents: [],
        additional_info: '',
      });
      alert('Authorization request submitted successfully!');
    } catch (error) {
      if (setFormErrors) {
        if (error.response) {
          const status = error.response.status;
          const errorData = error.response.data;
          
          if (status === 400 && (errorData.message?.includes('already exists') || errorData.message?.includes('already been submitted'))) {
            setFormErrors({ general: 'An authorization request for this ACC already exists. Please check your existing authorizations.' });
          }
          else if (status === 422 && (errorData.message?.includes('No valid documents') || errorData.message?.includes('documents uploaded'))) {
            setFormErrors({ 
              general: 'No valid documents uploaded. Please ensure files are uploaded correctly.',
              hint: 'Use FormData with structure: documents[0][type]=license&documents[0][file]=<file>'
            });
          }
          else if (status === 422 && errorData.errors) {
            setFormErrors(errorData.errors);
          }
          else if (status === 422 && errorData.message) {
            setFormErrors({ general: errorData.message });
          }
          else if (status === 500) {
            setFormErrors({ general: 'Server error occurred. Please try again later or contact support if the problem persists.' });
          }
          else if (errorData.message) {
            setFormErrors({ general: errorData.message });
          } else {
            setFormErrors({ general: 'Failed to submit request. Please try again.' });
          }
        } else if (error.errors) {
          setFormErrors(error.errors);
        } else if (error.message) {
          setFormErrors({ general: error.message || 'Failed to submit request' });
        } else {
          setFormErrors({ general: 'Failed to submit request. Please try again.' });
        }
      }
    } finally {
      setSubmitting(false);
    }
  };


  const handleViewDetails = (acc) => {
    setSelectedACC(acc);
    setDetailModalOpen(true);
  };

  const handleViewAuthorizationDetails = (auth) => {
    setSelectedAuthorization(auth);
    setAuthDetailModalOpen(true);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="accs-container">

      {/* Tab Cards - Full Width */}
      <TabCardsGrid columns={{ mobile: 1, tablet: 2, desktop: 2 }}>
        <TabCard
          name="Available Accreditation"
          value={allAccs.length}
          icon={Building2}
          colorType="indigo"
          isActive={activeTab === 'available'}
          onClick={() => setActiveTab('available')}
        />
        <TabCard
          name="My Authorizations"
          value={allAuthorizations.length}
          icon={CheckCircle}
          colorType="blue"
          isActive={activeTab === 'authorizations'}
          onClick={() => setActiveTab('authorizations')}
        />
      </TabCardsGrid>

      {/* Table */}
      {loading ? (
        <div className="accs-table-container">
          <LoadingSpinner />
        </div>
      ) : activeTab === 'available' ? (
        <div className="accs-table-container">
          <DataTable
            columns={accsColumns}
            data={allAccs}
            isLoading={loading}
            searchable={true}
            sortable={true}
            searchPlaceholder="Search by name, email, or country..."
            emptyMessage="No ACCs found"
            onRowClick={(acc) => handleViewDetails(acc)}
          />
          
          {/* Pagination for Available ACCs */}
          {!loading && activeTab === 'available' && pagination.totalItems > 0 && (
            <Pagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              totalItems={pagination.totalItems}
              perPage={pagination.perPage}
              onPageChange={handlePageChange}
              onPerPageChange={handlePerPageChange}
            />
          )}
        </div>
      ) : (
        <div className="accs-table-container">
          <DataTable
            columns={authorizationsColumns}
            data={allAuthorizations}
            isLoading={loading}
            searchable={true}
            sortable={true}
            searchPlaceholder="Search by ACC name or status..."
            emptyMessage="No authorization requests found"
            onView={(auth) => handleViewAuthorizationDetails(auth)}
            onRowClick={(auth) => handleViewAuthorizationDetails(auth)}
          />
          
          {/* Pagination for Authorizations */}
          {!loading && activeTab === 'authorizations' && pagination.totalItems > 0 && (
            <Pagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              totalItems={pagination.totalItems}
              perPage={pagination.perPage}
              onPageChange={handlePageChange}
              onPerPageChange={handlePerPageChange}
            />
          )}
        </div>
      )}

      {/* Request Authorization Modal */}
      <Modal
        isOpen={requestModalOpen}
        onClose={() => {
          if (!submitting) {
            setRequestModalOpen(false);
            setSelectedACC(null);
            setRequestForm({
              documents: [],
              additional_info: '',
            });
            setErrors({});
          }
        }}
        title={`Request Authorization from ${selectedACC?.name}`}
        size="lg"
      >
        <AuthorizationRequestForm
          onSubmit={handleSubmitRequest}
          onCancel={() => {
            setRequestModalOpen(false);
            setSelectedACC(null);
            setRequestForm({
              documents: [],
              additional_info: '',
            });
            setErrors({});
          }}
          submitting={submitting}
          initialData={requestForm}
        />
      </Modal>

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
        {selectedACC && (
          <div className="accs-detail-section">
            <DetailGrid>
              {selectedACC.id && (
                <DetailItem label="ID" value={selectedACC.id} />
              )}
              <DetailItem label="Name" value={selectedACC.name} />
              <DetailItem label="Email" value={selectedACC.email} icon={Mail} />
              {selectedACC.phone && (
                <DetailItem label="Phone" value={selectedACC.phone} />
              )}
              {selectedACC.country && (
                <DetailItem label="Country" value={selectedACC.country} />
              )}
              {selectedACC.address && (
                <DetailItem label="Address" value={selectedACC.address} />
              )}
              {selectedACC.website && (
                <DetailItem label="Website">
                  <a href={selectedACC.website} target="_blank" rel="noopener noreferrer" className="accs-detail-link">
                    {selectedACC.website}
                  </a>
                </DetailItem>
              )}
              <DetailItem label="Status">
                <StatusBadge status={selectedACC.status} variant="detail" />
              </DetailItem>
              {selectedACC.description && (
                <DetailItem label="Description" value={selectedACC.description} fullWidth />
              )}
              {selectedACC.created_at && (
                <DetailItem label="Created At" value={new Date(selectedACC.created_at).toLocaleString()} />
              )}
              {selectedACC.updated_at && (
                <DetailItem label="Updated At" value={new Date(selectedACC.updated_at).toLocaleString()} />
              )}
            </DetailGrid>
            {selectedACC.status === 'active' && (
              <div className="accs-detail-actions">
                <button
                  onClick={() => {
                    setDetailModalOpen(false);
                    handleRequestAuth(selectedACC);
                  }}
                  className="accs-detail-button"
                >
                  <Send size={20} className="accs-detail-button-icon" />
                  Request Authorization
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Authorization Detail Modal */}
      <Modal
        isOpen={authDetailModalOpen}
        onClose={() => {
          setAuthDetailModalOpen(false);
          setSelectedAuthorization(null);
        }}
        title="Authorization Request Details"
        size="lg"
      >
        {selectedAuthorization && (
          <div className="accs-detail-section">
            {/* ACC Information */}
            <DetailGrid>
              <DetailItem label="ACC Name" value={selectedAuthorization.acc?.name} />
              <DetailItem label="Email" value={selectedAuthorization.acc?.email} icon={Mail} />
              {selectedAuthorization.acc?.country && (
                <DetailItem label="Country" value={selectedAuthorization.acc.country} />
              )}
              <DetailItem label="Status">
                <StatusBadge status={selectedAuthorization.status} variant="detail" />
              </DetailItem>
            </DetailGrid>

            {/* Dates */}
            <DetailGrid>
              <DetailItem 
                label="Request Date" 
                value={selectedAuthorization.request_date ? new Date(selectedAuthorization.request_date).toLocaleString() : 'N/A'}
                icon={Clock}
              />
              {selectedAuthorization.reviewed_at && (
                <DetailItem 
                  label="Reviewed At" 
                  value={new Date(selectedAuthorization.reviewed_at).toLocaleString()}
                  icon={CheckCircle}
                />
              )}
            </DetailGrid>

            {/* Additional Information */}
            {selectedAuthorization.additional_info && (
              <InfoBox 
                title="Additional Information" 
                content={selectedAuthorization.additional_info}
                variant="blue"
              />
            )}

            {/* ACC Comment (when status is returned) */}
            {selectedAuthorization.status === 'returned' && selectedAuthorization.return_comment && (
              <InfoBox 
                title="ACC Comment / Return Reason" 
                content={selectedAuthorization.return_comment}
                icon={MessageSquare}
                variant="yellow"
                showHeader
              />
            )}

            {/* ACC Rejection Reason (if exists) */}
            {selectedAuthorization.status === 'rejected' && selectedAuthorization.rejection_reason && (
              <InfoBox 
                title="Rejection Reason" 
                content={selectedAuthorization.rejection_reason}
                icon={XCircle}
                variant="red"
                showHeader
              />
            )}

            {/* Documents */}
            <DocumentsList 
              documents={selectedAuthorization.documents} 
              title="Submitted Documents"
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ACCsScreen;
