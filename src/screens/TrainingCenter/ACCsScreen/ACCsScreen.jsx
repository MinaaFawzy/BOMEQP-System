import { useEffect, useState, useMemo, useCallback } from 'react';
import { trainingCenterAPI } from '../../../services/api';
import { useHeader } from '../../../context/HeaderContext';
import useDebounce from '../../../hooks/useDebounce';
import { Building2, Send, Eye, CheckCircle, Clock, XCircle, Plus, Trash2, FileText, Upload, Loader, Mail, MessageSquare, Download, MapPin, Globe, Phone } from 'lucide-react';
import Modal from '../../../components/Modal/Modal';
import FormInput from '../../../components/FormInput/FormInput';
import LoadingSpinner from '../../../components/LoadingSpinner/LoadingSpinner';
import TabCard from '../../../components/TabCard/TabCard';
import TabCardsGrid from '../../../components/TabCardsGrid/TabCardsGrid';
import DataTable from '../../../components/DataTable/DataTable';
import AuthorizationRequestForm from '../../../components/AuthorizationRequestForm/AuthorizationRequestForm';
import DetailForm from '../../../components/DetailForm/DetailForm';
import InfoBox from '../../../components/InfoBox/InfoBox';
import DocumentsList from '../../../components/DocumentsList/DocumentsList';
import Pagination from '../../../components/Pagination/Pagination';
import { validateFile, validateArray, validateMaxLength } from '../../../utils/validation';
import './ACCsScreen.css';

const ACCsScreen = () => {
  const { setHeaderTitle, setHeaderSubtitle } = useHeader();
  const [allAccs, setAllAccs] = useState([]);
  const [allAuthorizations, setAllAuthorizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('available');

  // Total counts for cards (from API)
  const [totalAccsCount, setTotalAccsCount] = useState(0);
  const [totalAuthsCount, setTotalAuthsCount] = useState(0);

  // Pagination State - ACCs
  const [accsPage, setAccsPage] = useState(1);
  const [accsPerPage, setAccsPerPage] = useState(10);
  const [accsTotalPages, setAccsTotalPages] = useState(1);
  const [accsSearchTerm, setAccsSearchTerm] = useState('');
  const debouncedAccsSearchTerm = useDebounce(accsSearchTerm, 500);
  const [isAccsSearchLoading, setIsAccsSearchLoading] = useState(false);

  // Pagination State - Authorizations
  const [authPage, setAuthPage] = useState(1);
  const [authPerPage, setAuthPerPage] = useState(10);
  const [authTotalPages, setAuthTotalPages] = useState(1);
  const [authSearchTerm, setAuthSearchTerm] = useState('');
  const debouncedAuthSearchTerm = useDebounce(authSearchTerm, 500);
  const [isAuthSearchLoading, setIsAuthSearchLoading] = useState(false);

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

  const loadACCs = useCallback(async (page, limit, search = '', showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      } else {
        setIsAccsSearchLoading(true);
      }

      // Load data with pagination and search
      const accsData = await trainingCenterAPI.listACCs({
        page,
        per_page: limit,
        ...(search && { search })
      });

      let accsArray = [];
      if (accsData?.data) {
        accsArray = Array.isArray(accsData.data) ? accsData.data : [];
      } else if (accsData?.accs) {
        accsArray = Array.isArray(accsData.accs) ? accsData.accs : [];
      } else if (Array.isArray(accsData)) {
        accsArray = accsData;
      }

      setAllAccs(accsArray);

      // Update total count for card display and pagination
      if (accsData) {
        const totalCount = accsData.total || accsArray.length;
        setTotalAccsCount(totalCount);
        setAccsTotalPages(accsData.last_page || Math.ceil(totalCount / limit) || 1);
      }
    } catch (error) {
      console.error('Failed to load ACCs:', error);
    } finally {
      setLoading(false);
      setIsAccsSearchLoading(false);
    }
  }, []);

  const loadAuthorizations = useCallback(async (page, limit, search = '', showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      } else {
        setIsAuthSearchLoading(true);
      }

      // Load data with pagination and search
      const authData = await trainingCenterAPI.getAuthorizationStatus({
        page,
        per_page: limit,
        ...(search && { search })
      });

      let authArray = [];
      if (authData?.data) {
        authArray = Array.isArray(authData.data) ? authData.data : [];
      } else if (authData?.authorizations) {
        authArray = Array.isArray(authData.authorizations) ? authData.authorizations : [];
      } else if (Array.isArray(authData)) {
        authArray = authData;
      }

      setAllAuthorizations(authArray);

      // Update total count for card display
      if (authData) {
        const totalCount = authData.total || authArray.length;
        setTotalAuthsCount(totalCount);
        setAuthTotalPages(authData.last_page || Math.ceil(totalCount / limit) || 1);
      }
    } catch (error) {
      console.error('Failed to load authorizations:', error);
    } finally {
      setLoading(false);
      setIsAuthSearchLoading(false);
    }
  }, []);

  // Load data on change
  useEffect(() => {
    if (accsSearchTerm !== debouncedAccsSearchTerm) {
      return;
    }
    const showLoading = allAccs.length === 0;
    loadACCs(accsPage, accsPerPage, debouncedAccsSearchTerm, showLoading);
  }, [loadACCs, accsPage, accsPerPage, debouncedAccsSearchTerm, accsSearchTerm]);

  useEffect(() => {
    if (authSearchTerm !== debouncedAuthSearchTerm) {
      return;
    }
    const showLoading = allAuthorizations.length === 0;
    loadAuthorizations(authPage, authPerPage, debouncedAuthSearchTerm, showLoading);
  }, [loadAuthorizations, authPage, authPerPage, debouncedAuthSearchTerm, authSearchTerm]);

  useEffect(() => {
    setHeaderTitle('Accreditation Bodies');
    setHeaderSubtitle('Browse and request authorization from Accreditation Bodies');
    return () => {
      setHeaderTitle(null);
      setHeaderSubtitle(null);
    };
  }, [setHeaderTitle, setHeaderSubtitle]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    // Don't reload data, just switch the view
  };

  const accsColumns = useMemo(() => [
    {
      header: 'Accreditation Body Name',
      accessor: 'name',
      sortable: true,
      render: (value, row) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div className="accs-table-row-icon-wrapper" style={{ position: 'relative' }}>
            {row.logo_url ? (
              <>
                <img
                  src={row.logo_url}
                  alt={value || 'ACC Logo'}
                  className="accs-table-row-icon"
                  width="40"
                  height="40"
                  loading="lazy"
                  decoding="async"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb'
                  }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    const fallback = e.target.parentElement?.querySelector('.logo-fallback');
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
                <div
                  className="logo-fallback accs-table-row-icon-wrapper"
                  style={{ display: 'none', position: 'absolute', top: 0, left: 0 }}
                >
                  <Building2 className="accs-table-row-icon" />
                </div>
              </>
            ) : (
              <Building2 className="accs-table-row-icon" />
            )}
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
        <span className={`accs-status-badge ${value === 'active' ? 'accs-status-badge-active' : 'accs-status-badge-default'
          }`}>
          {value ? value.charAt(0).toUpperCase() + value.slice(1) : 'N/A'}
        </span>
      )
    },
    {
      header: 'Actions',
      accessor: 'actions',
      sortable: false,
      render: (value, row) => {
        const isAuthorized = allAuthorizations.some(auth => auth.acc?.id === row.id);

        return (
          <div className="accs-action-buttons" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => handleViewDetails(row)}
              className="accs-action-button accs-action-button-primary"
              title="View Details"
            >
              <Eye size={16} />
            </button>
            {row.status === 'active' ? (
              !isAuthorized && (
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
              )
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
        );
      }
    }
  ], [allAuthorizations]);

  // Define columns for Authorizations table
  const authorizationsColumns = useMemo(() => [
    {
      header: 'ACC',
      accessor: 'acc',
      sortable: true,
      render: (value) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div className="accs-table-row-icon-wrapper" style={{ position: 'relative' }}>
            {value?.logo_url ? (
              <>
                <img
                  src={value.logo_url}
                  alt={value?.name || 'ACC Logo'}
                  className="accs-table-row-icon"
                  width="40"
                  height="40"
                  loading="lazy"
                  decoding="async"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb'
                  }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    const fallback = e.target.parentElement?.querySelector('.logo-fallback');
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
                <div
                  className="logo-fallback accs-table-row-icon-wrapper"
                  style={{ display: 'none', position: 'absolute', top: 0, left: 0 }}
                >
                  <Building2 className="accs-table-row-icon" />
                </div>
              </>
            ) : (
              <Building2 className="accs-table-row-icon" />
            )}
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

      submitFormData.append('acc_id', selectedACC.id);

      const response = await trainingCenterAPI.requestAuthorization(submitFormData);

      // Reload both datasets after successful submission
      await Promise.all([
        loadACCs(accsPage, accsPerPage),
        loadAuthorizations(authPage, authPerPage)
      ]);
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
          value={totalAccsCount}
          icon={Building2}
          colorType="indigo"
          isActive={activeTab === 'available'}
          onClick={() => handleTabChange('available')}
        />
        <TabCard
          name="My Authorizations"
          value={totalAuthsCount}
          icon={CheckCircle}
          colorType="blue"
          isActive={activeTab === 'authorizations'}
          onClick={() => handleTabChange('authorizations')}
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
            searchValue={accsSearchTerm}
            onSearch={(value) => {
              setAccsSearchTerm(value);
              setAccsPage(1);
            }}
          />
          <Pagination
            currentPage={accsPage}
            totalPages={accsTotalPages}
            totalItems={totalAccsCount}
            perPage={accsPerPage}
            onPageChange={setAccsPage}
            onPerPageChange={(perPage) => {
              setAccsPerPage(perPage);
              setAccsPage(1);
            }}
          />
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
            searchValue={authSearchTerm}
            onSearch={(value) => {
              setAuthSearchTerm(value);
              setAuthPage(1);
            }}
          />
          <Pagination
            currentPage={authPage}
            totalPages={authTotalPages}
            totalItems={totalAuthsCount}
            perPage={authPerPage}
            onPageChange={setAuthPage}
            onPerPageChange={(perPage) => {
              setAuthPerPage(perPage);
              setAuthPage(1);
            }}
          />
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
        title="Accreditation Body Details"
        size="lg"
      >
        {selectedACC && (
          <div className="accs-detail-section">
            <DetailForm
              data={selectedACC}
              fields={[
                { key: 'id', label: 'ID', showEmpty: false },
                { key: 'name', label: 'Name', icon: Building2 },
                { key: 'email', label: 'Email', type: 'email', icon: Mail },
                { key: 'phone', label: 'Phone', icon: Phone, showEmpty: false },
                { key: 'country', label: 'Country', icon: MapPin, showEmpty: false },
                { key: 'address', label: 'Address', icon: MapPin, showEmpty: false },
                { key: 'website', label: 'Website', type: 'url', icon: Globe, showEmpty: false },
                { key: 'status', label: 'Status', type: 'status' },
                { key: 'description', label: 'Description', fullWidth: true, showEmpty: false },
                { key: 'created_at', label: 'Created At', type: 'datetime', icon: Clock, showEmpty: false },
                { key: 'updated_at', label: 'Updated At', type: 'datetime', icon: Clock, showEmpty: false },
              ]}
            />
            {selectedACC.status === 'active' && !allAuthorizations.some(auth => auth.acc?.id === selectedACC.id) && (
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
            <DetailForm
              data={selectedAuthorization.acc || {}}
              fields={[
                { key: 'name', label: 'ACC Name', icon: Building2 },
                { key: 'email', label: 'Email', type: 'email', icon: Mail },
                { key: 'country', label: 'Country', icon: MapPin, showEmpty: false },
              ]}
            />

            <DetailForm
              data={selectedAuthorization}
              fields={[
                { key: 'status', label: 'Status', type: 'status' },
                { key: 'request_date', label: 'Request Date', type: 'datetime', icon: Clock },
                { key: 'reviewed_at', label: 'Reviewed At', type: 'datetime', icon: CheckCircle, showEmpty: false },
              ]}
            />

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
