import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
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
import { useTranslation } from '../../../hooks/useTranslation';
import { validateFile, validateArray, validateMaxLength } from '../../../utils/validation';
import './ACCsScreen.css';

const ACCsScreen = () => {
  const { setHeaderTitle, setHeaderSubtitle } = useHeader();
  const [allAccs, setAllAccs] = useState([]);
  const [allAuthorizations, setAllAuthorizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('available');
  const { t } = useTranslation(['training_center', 'accreditation']);

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

  const hasDataRef = useRef(false);

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
      hasDataRef.current = true;
    } catch (error) {
      console.error(t('Failed to load Accreditations:'), error);
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
      hasDataRef.current = true;
    } catch (error) {
      console.error(t('Failed to load authorizations:'), error);
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
    const showLoading = !hasDataRef.current || allAccs.length === 0;

    // Only load if active tab is available or it's the first load
    if (activeTab === 'available' || !hasDataRef.current || allAccs.length === 0) {
      loadACCs(accsPage, accsPerPage, debouncedAccsSearchTerm, showLoading);
    }
  }, [loadACCs, accsPage, accsPerPage, debouncedAccsSearchTerm, accsSearchTerm, activeTab, allAccs.length]);

  useEffect(() => {
    if (authSearchTerm !== debouncedAuthSearchTerm) {
      return;
    }
    const showLoading = !hasDataRef.current || allAuthorizations.length === 0;

    // Only load if active tab is authorizations or it's the first load
    if (activeTab === 'authorizations' || !hasDataRef.current || allAuthorizations.length === 0) {
      loadAuthorizations(authPage, authPerPage, debouncedAuthSearchTerm, showLoading);
    }
  }, [loadAuthorizations, authPage, authPerPage, debouncedAuthSearchTerm, authSearchTerm, activeTab, allAuthorizations.length]);

  useEffect(() => {
    setHeaderTitle(t('accreditations.accreditation_Bodies'));
    setHeaderSubtitle(t('accreditations.browse_and_request_authorization_from_Accreditation_Bodies'));
    return () => {
      setHeaderTitle(null);
      setHeaderSubtitle(null);
    };
  }, [setHeaderTitle, setHeaderSubtitle, t]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  const accsColumns = useMemo(() => [
    {
      header: t('accreditations.accreditation_body_name'),
      accessor: 'name',
      sortable: true,
      render: (value, row) => (
        <div className="gap-3" style={{ display: 'flex', alignItems: 'center' }}>
          <div className="accs-table-row-icon-wrapper" style={{ position: 'relative' }}>
            {row.logo_url ? (
              <>
                <img
                  src={row.logo_url}
                  alt={value || t('accreditations.acc_logo')}
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
            <div className="accs-table-row-name">{value || t('accreditations.na')}</div>
          </div>
        </div>
      )
    },
    {
      header: t('accreditations.email'),
      accessor: 'email',
      sortable: true,
      render: (value) => (
        <div className="accs-table-row-email gap-3">
          <Mail className="accs-table-row-email-icon" />
          {value || t('accreditations.na')}
        </div>
      )
    },
    {
      header: t('accreditations.country'),
      accessor: 'country',
      sortable: true,
      render: (value) => (
        <span className="accs-table-row-text">{value || t('accreditations.na')}</span>
      )
    },
    {
      header: t('accreditations.status'),
      accessor: 'status',
      sortable: true,
      render: (value) => (
        <span className={`accs-status-badge ${value === 'active' ? 'accs-status-badge-active' : 'accs-status-badge-default'
          }`}>
          {value ? (t(`accreditations.${value}`) || value.charAt(0).toUpperCase() + value.slice(1)) : t('accreditations.na')}
        </span>
      )
    },
    {
      header: t('accreditations.actions'),
      accessor: 'actions',
      sortable: false,
      render: (value, row) => {
        // Check if there is already an active or pending request for this ACC
        const activeAuth = allAuthorizations.find(auth =>
          auth.acc?.id === row.id && ['pending', 'approved', 'active'].includes(auth.status)
        );
        // Allow request only if there is NO active/pending request
        const canRequest = !activeAuth;

        return (
          <div className="accs-action-buttons" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => handleViewDetails(row)}
              className="accs-action-button accs-action-button-primary"
              title={t('accreditations.view_details')}
            >
              <Eye size={16} />
            </button>
            {row.status === 'active' ? (
              canRequest && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRequestAuth(row);
                  }}
                  className="accs-action-button accs-action-button-green"
                // title={t('accreditations.request_authorization')}
                >
                  <span className="request-auth-text">{t('accreditations.apply', "Apply")} </span>
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
                title={t('accreditations.view_info')}
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
      header: t('accreditations.acc'),
      accessor: 'acc',
      sortable: true,
      render: (value) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div className="accs-table-row-icon-wrapper" style={{ position: 'relative' }}>
            {value?.logo_url ? (
              <>
                <img
                  src={value.logo_url}
                  alt={value?.name || t('accreditations.acc_logo')}
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
              {value?.name || t('accreditations.na')}
            </div>
          </div>
        </div>
      )
    },
    {
      header: t('accreditations.email'),
      accessor: 'acc',
      sortable: true,
      render: (value) => (
        <div className="accs-table-row-email">
          <Mail className="accs-table-row-email-icon" />
          {value?.email || t('accreditations.na')}
        </div>
      )
    },
    {
      header: t('accreditations.country'),
      accessor: 'acc',
      sortable: true,
      render: (value) => (
        <span className="accs-table-row-text">{value?.country || t('accreditations.na')}</span>
      )
    },
    {
      header: t('accreditations.status'),
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
            {value ? (t(`accreditations.${value}`) || value) : t('accreditations.na')}
          </span>
        );
      }
    },
    {
      header: t('accreditations.request_date'),
      accessor: 'request_date',
      sortable: true,
      render: (value) => (
        <span className="accs-table-row-text">
          {value ? new Date(value).toLocaleDateString() : t('accreditations.na')}
        </span>
      )
    },
    {
      header: t('accreditations.reviewed_at'),
      accessor: 'reviewed_at',
      sortable: true,
      render: (value) => (
        <span className="accs-table-row-text">
          {value ? new Date(value).toLocaleDateString() : t('accreditations.pending')}
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
      alert(t('accreditations.authorization_request_submitted_successfully'));
    } catch (error) {
      if (setFormErrors) {
        if (error.response) {
          const status = error.response.status;
          const errorData = error.response.data;

          if (status === 400 && (errorData.message?.includes('already exists') || errorData.message?.includes('already been submitted'))) {
            setFormErrors({ general: t('accreditations.authorization_request_already_exists') });
          }
          else if (status === 422 && (errorData.message?.includes('No valid documents') || errorData.message?.includes('documents uploaded'))) {
            setFormErrors({
              general: t('accreditations.no_valid_documents_uploaded'),
              hint: t('accreditations.use_formdata_with_structure')
            });
          }
          else if (status === 422 && errorData.errors) {
            setFormErrors(errorData.errors);
          }
          else if (status === 422 && errorData.message) {
            setFormErrors({ general: errorData.message });
          }
          else if (status === 500) {
            setFormErrors({ general: t('accreditations.server_error_occurred') });
          }
          else if (errorData.message) {
            setFormErrors({ general: errorData.message });
          } else {
            setFormErrors({ general: t('accreditations.failed_to_submit_request') });
          }
        } else if (error.errors) {
          setFormErrors(error.errors);
        } else if (error.message) {
          setFormErrors({ general: error.message || t('training_center.failed_to_submit_request') });
        } else {
          setFormErrors({ general: t('training_center.failed_to_submit_request') });
        }
      }
    } finally {
      setSubmitting(false);
    }
  };


  const handleViewDetails = (acc) => {
    // Flatten/Prepare data for DetailForm
    const accData = {
      ...acc,

      // Company Information
      name: acc.legal_name || acc.name,
      email: acc.email,
      phone: acc.phone,
      fax: acc.fax,
      website: acc.website,

      // Physical Address - Merged with fallbacks
      physical_address_full: [
        acc.physical_address?.street || acc.physical_street || acc.address,
        acc.physical_address?.city || acc.physical_city,
        acc.physical_address?.country || acc.physical_country || acc.country,
        acc.physical_address?.postal_code || acc.physical_postal_code
      ].filter(Boolean).join(', '),

      // Mailing Address - Merged with fallbacks
      mailing_address_full: (acc.mailing_same_as_physical || acc.mailing_address?.same_as_physical)
        ? t('accreditations.same_as_physical_address')
        : [
          acc.mailing_address?.street || acc.mailing_street,
          acc.mailing_address?.city || acc.mailing_city,
          acc.mailing_address?.country || acc.mailing_country,
          acc.mailing_address?.postal_code || acc.mailing_postal_code
        ].filter(Boolean).join(', '),

      // Primary Contact - Merged with fallbacks
      primary_contact_full_name: [
        acc.primary_contact?.title || acc.primary_contact_title,
        acc.primary_contact?.first_name || acc.primary_contact_first_name,
        acc.primary_contact?.last_name || acc.primary_contact_last_name
      ].filter(Boolean).join(' '),
      primary_contact_email: acc.primary_contact?.email || acc.primary_contact_email,
      primary_contact_mobile: acc.primary_contact?.mobile || acc.primary_contact_mobile,
      primary_contact_country: acc.primary_contact?.country || acc.primary_contact_country,
      primary_contact_passport_url: acc.primary_contact?.passport_url || acc.primary_contact_passport_url,

      // Secondary Contact - Merged with fallbacks
      secondary_contact_full_name: [
        acc.secondary_contact?.title || acc.secondary_contact_title,
        acc.secondary_contact?.first_name || acc.secondary_contact_first_name,
        acc.secondary_contact?.last_name || acc.secondary_contact_last_name
      ].filter(Boolean).join(' '),
      secondary_contact_email: acc.secondary_contact?.email || acc.secondary_contact_email,
      secondary_contact_mobile: acc.secondary_contact?.mobile || acc.secondary_contact_mobile,
      secondary_contact_country: acc.secondary_contact?.country || acc.secondary_contact_country,
      secondary_contact_passport_url: acc.secondary_contact?.passport_url || acc.secondary_contact_passport_url,

      // Additional Info
      company_gov_registry_number: acc.company_gov_registry_number,
      company_registration_certificate_url: acc.company_registration_certificate_url,
      how_did_you_hear_about_us: acc.how_did_you_hear_about_us,

      // Agreements
      agreements_summary: [
        acc.agreed_to_receive_communications ? t('accreditations.receives_communications') : null,
        acc.agreed_to_terms_and_conditions ? t('accreditations.terms_accepted') : null
      ].filter(Boolean).join(', ')
    };

    setSelectedACC(accData);
    setDetailModalOpen(true);
  };

  const handleViewAuthorizationDetails = (auth) => {
    // Prepare ACC data in the same format as handleViewDetails
    const acc = auth.acc || {};
    const accData = {
      ...acc,

      // Company Information
      name: acc.legal_name || acc.name,
      email: acc.email,
      phone: acc.phone,
      // fax: acc.fax,
      // website: acc.website,

      // Physical Address - Merged with fallbacks
      physical_address_full: [
        acc.physical_address?.street || acc.physical_street || acc.address,
        acc.physical_address?.city || acc.physical_city,
        acc.physical_address?.country || acc.physical_country || acc.country,
        acc.physical_address?.postal_code || acc.physical_postal_code
      ].filter(Boolean).join(', '),

      // Mailing Address - Merged with fallbacks
      mailing_address_full: (acc.mailing_same_as_physical || acc.mailing_address?.same_as_physical)
        ? 'Same as Physical Address'
        : [
          acc.mailing_address?.street || acc.mailing_street,
          acc.mailing_address?.city || acc.mailing_city,
          acc.mailing_address?.country || acc.mailing_country,
          acc.mailing_address?.postal_code || acc.mailing_postal_code
        ].filter(Boolean).join(', '),

      // Primary Contact - Merged with fallbacks
      primary_contact_full_name: [
        acc.primary_contact?.title || acc.primary_contact_title,
        acc.primary_contact?.first_name || acc.primary_contact_first_name,
        acc.primary_contact?.last_name || acc.primary_contact_last_name
      ].filter(Boolean).join(' '),
      primary_contact_email: acc.primary_contact?.email || acc.primary_contact_email,
      primary_contact_mobile: acc.primary_contact?.mobile || acc.primary_contact_mobile,
      primary_contact_country: acc.primary_contact?.country || acc.primary_contact_country,
      primary_contact_passport_url: acc.primary_contact?.passport_url || acc.primary_contact_passport_url,

      // Secondary Contact - Merged with fallbacks
      secondary_contact_full_name: [
        acc.secondary_contact?.title || acc.secondary_contact_title,
        acc.secondary_contact?.first_name || acc.secondary_contact_first_name,
        acc.secondary_contact?.last_name || acc.secondary_contact_last_name
      ].filter(Boolean).join(' '),
      secondary_contact_email: acc.secondary_contact?.email || acc.secondary_contact_email,
      secondary_contact_mobile: acc.secondary_contact?.mobile || acc.secondary_contact_mobile,
      secondary_contact_country: acc.secondary_contact?.country || acc.secondary_contact_country,
      secondary_contact_passport_url: acc.secondary_contact?.passport_url || acc.secondary_contact_passport_url,

      // Additional Info
      company_gov_registry_number: acc.company_gov_registry_number,
      company_registration_certificate_url: acc.company_registration_certificate_url,
      how_did_you_hear_about_us: acc.how_did_you_hear_about_us,

      // Agreements
      agreements_summary: [
        acc.agreed_to_receive_communications ? 'Receives Comms' : null,
        acc.agreed_to_terms_and_conditions ? 'Terms Accepted' : null
      ].filter(Boolean).join(', ')
    };

    // Set both the authorization and the prepared ACC data
    setSelectedAuthorization({ ...auth, acc: accData });
    setAuthDetailModalOpen(true);
  };

  if (loading && allAccs.length === 0 && allAuthorizations.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <div className="accs-container">

      {/* Tab Cards - Full Width */}
      <TabCardsGrid columns={{ mobile: 1, tablet: 2, desktop: 2 }}>
        <TabCard
          name={t('accreditations.available_accreditation')}
          value={totalAccsCount}
          icon={Building2}
          colorType="indigo"
          isActive={activeTab === 'available'}
          onClick={() => handleTabChange('available')}
        />
        <TabCard
          name={t('accreditations.my_authorizations')}
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
            searchPlaceholder={t('accreditations.search_by_name_email_or_country')}
            emptyMessage={t('accreditations.no_accs_found')}
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
            onPageChange={(page) => {
              setAccsPage(page);
            }}
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
            searchPlaceholder={t("accreditations.search_by_accreditations_name_or_status")}
            emptyMessage={t("accreditations.no_authorization_requests_found")}
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
            onPageChange={(page) => {
              setAuthPage(page);
            }}
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
        title={`${t("accreditations.request_authorization_from")} ${selectedACC?.name}`}
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
        title={t('accreditations.accreditation_body_details')}
        size="lg"
      >
        {selectedACC && (
          <div className="accs-detail-section">
            <DetailForm
              data={selectedACC}
              fields={[
                // { key: 'id', label: t('accreditations.id'), showEmpty: false },
                { key: 'name', label: t('accreditations.name'), icon: Building2 },
                { key: 'email', label: t('accreditations.email'), type: 'email', icon: Mail },
                { key: 'phone', label: t('accreditations.phone'), icon: Phone, showEmpty: false },
                // { key: 'fax', label: 'Fax', showEmpty: false },
                // { key: 'website', label: t('accreditations.website'), type: 'url', icon: Globe, showEmpty: false },
                // { key: 'physical_address_full', label: t('accreditations.physical_address'), icon: MapPin, fullWidth: true, showEmpty: false },
                // { key: 'mailing_address_full', label: t('accreditations.mailing_address'), icon: MapPin, fullWidth: true, showEmpty: false },
                // { key: 'primary_contact_full_name', label: t('accreditations.primary_contact'), showEmpty: false },
                // { key: 'primary_contact_email', label: t('accreditations.primary_contact_email'), type: 'email', showEmpty: false },
                // { key: 'primary_contact_mobile', label: t('accreditations.primary_contact_mobile'), showEmpty: false },
                // { key: 'primary_contact_country', label: t('accreditations.primary_contact_country'), showEmpty: false },
                // {
                //   key: 'primary_contact_passport_url',
                //   label: t('accreditations.primary_contact_passport'),
                //   render: (value) => value ? (
                //     <a
                //       href={value}
                //       target="_blank"
                //       rel="noreferrer"
                //       style={{
                //         display: 'inline-flex',
                //         alignItems: 'center',
                //         padding: '6px 12px',
                //         backgroundColor: '#3b82f6',
                //         color: 'white',
                //         borderRadius: '6px',
                //         textDecoration: 'none',
                //         fontSize: '14px'
                //       }}
                //       onClick={(e) => e.stopPropagation()}
                //     >
                //       <Eye size={16} style={{ marginRight: '8px' }} />
                //       {t('accreditations.view') || 'View'}
                //     </a>
                //   ) : null,
                //   showEmpty: false
                // },

                // { key: 'secondary_contact_full_name', label: t('accreditations.secondary_contact'), showEmpty: false },
                // { key: 'secondary_contact_email', label: t('accreditations.secondary_contact_email'), type: 'email', showEmpty: false },
                // { key: 'secondary_contact_mobile', label: t('accreditations.secondary_contact_mobile'), showEmpty: false },
                // { key: 'secondary_contact_country', label: t('accreditations.secondary_contact_country'), showEmpty: false },
                // {
                //   key: 'secondary_contact_passport_url',
                //   label: t('accreditations.secondary_contact_passport'),
                //   render: (value) => value ? (
                //     <a
                //       href={value}
                //       target="_blank"
                //       rel="noreferrer"
                //       style={{
                //         display: 'inline-flex',
                //         alignItems: 'center',
                //         padding: '6px 12px',
                //         backgroundColor: '#3b82f6',
                //         color: 'white',
                //         borderRadius: '6px',
                //         textDecoration: 'none',
                //         fontSize: '14px'
                //       }}
                //       onClick={(e) => e.stopPropagation()}
                //     >
                //       <Eye size={16} style={{ marginRight: '8px' }} />
                //       {t('accreditations.view') || 'View'}
                //     </a>
                //   ) : null,
                //   showEmpty: false
                // },

                // { key: 'company_gov_registry_number', label: t('accreditations.gov_registry_number'), showEmpty: false },
                // {
                //   key: 'company_registration_certificate_url',
                //   label: t('accreditations.registration_certificate'),
                //   render: (value) => value ? (
                //     <a
                //       href={value}
                //       target="_blank"
                //       rel="noreferrer"
                //       style={{
                //         display: 'inline-flex',
                //         alignItems: 'center',
                //         padding: '6px 12px',
                //         backgroundColor: '#3b82f6',
                //         color: 'white',
                //         borderRadius: '6px',
                //         textDecoration: 'none',
                //         fontSize: '14px'
                //       }}
                //       onClick={(e) => e.stopPropagation()}
                //     >
                //       <Eye size={16} style={{ marginRight: '8px' }} />
                //       {t('accreditations.view') || 'View'}
                //     </a>
                //   ) : null,
                //   showEmpty: false
                // },
                // { key: 'how_did_you_hear_about_us', label: t('accreditations.how_did_you_hear_about_us'), showEmpty: false },
                // { key: 'agreements_summary', label: t('accreditations.agreements'), showEmpty: false },

                // { key: 'status', label: t('accreditations.status'), type: 'status' },
                // { key: 'description', label: t('accreditations.description'), fullWidth: true, showEmpty: false },
                // { key: 'created_at', label: t('accreditations.created_at'), type: 'datetime', icon: Clock, showEmpty: false },
                // { key: 'updated_at', label: t('accreditations.updated_at'), type: 'datetime', icon: Clock, showEmpty: false },
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
                  {t("accreditations.request_authorization")}
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
        title={t("accreditations.authorization_request_details")}
        size="lg"
      >
        {selectedAuthorization && (
          <div className="accs-detail-section">
            {/* ACC Information - Complete Details */}
            <DetailForm
              data={selectedAuthorization.acc || {}}
              fields={[
                // { key: 'id', label: t('accreditations.id'), showEmpty: false },
                { key: 'name', label: t('accreditations.name'), icon: Building2 },
                { key: 'email', label: t('accreditations.email'), type: 'email', icon: Mail },
                { key: 'phone', label: t('accreditations.phone'), icon: Phone, showEmpty: false },
                // { key: 'fax', label: t('accreditations.fax'), showEmpty: false },
                // { key: 'website', label: t('accreditations.website'), type: 'url', icon: Globe, showEmpty: false },
                // { key: 'physical_address_full', label: t('accreditations.physical_address'), icon: MapPin, fullWidth: true, showEmpty: false },
                // { key: 'mailing_address_full', label: t('accreditations.mailing_address'), icon: MapPin, fullWidth: true, showEmpty: false },
                // { key: 'primary_contact_full_name', label: t('accreditations.primary_contact'), showEmpty: false },
                // { key: 'primary_contact_email', label: t('accreditations.primary_contact_email'), type: 'email', showEmpty: false },
                // { key: 'primary_contact_mobile', label: t('accreditations.primary_contact_mobile'), showEmpty: false },
                // { key: 'primary_contact_country', label: t('accreditations.primary_contact_country'), showEmpty: false },
                // { key: 'company_gov_registry_number', label: t('accreditations.gov_registry_number'), showEmpty: false },
                { key: 'status', label: t('accreditations.status'), type: 'status' },
                // { key: 'description', label: t('accreditations.description'), fullWidth: true, showEmpty: false },
                // { key: 'created_at', label: t('accreditations.created_at'), type: 'datetime', icon: Clock, showEmpty: false },
                // { key: 'updated_at', label: t('accreditations.updated_at'), type: 'datetime', icon: Clock, showEmpty: false },
              ]}
            />

            {/* Authorization Status Information */}
            <DetailForm
              data={selectedAuthorization}
              fields={[
                // { key: 'status', label: t('accreditations.status'), type: 'status' },
                { key: 'request_date', label: t('accreditations.request_date'), type: 'datetime', icon: Clock },
                { key: 'reviewed_at', label: t('accreditations.reviewed_at'), type: 'datetime', icon: CheckCircle, showEmpty: false },
              ]}
            />

            {/* Additional Information */}
            {selectedAuthorization.additional_info && (
              <InfoBox
                title={t("accreditations.additional_information")}
                content={selectedAuthorization.additional_info}
                variant="blue"
              />
            )}

            {/* ACC Comment (when status is returned) */}
            {selectedAuthorization.status === 'returned' && selectedAuthorization.return_comment && (
              <InfoBox
                title={t("accreditations.accreditation_body_comment_return_reason")}
                content={selectedAuthorization.return_comment}
                icon={MessageSquare}
                variant="yellow"
                showHeader
              />
            )}

            {/* ACC Rejection Reason (if exists) */}
            {selectedAuthorization.status === 'rejected' && selectedAuthorization.rejection_reason && (
              <InfoBox
                title={t("accreditations.rejection_reason")}
                content={selectedAuthorization.rejection_reason}
                icon={XCircle}
                variant="red"
                showHeader
              />
            )}

            {/* Documents */}
            <DocumentsList
              documents={selectedAuthorization.documents}
              title={t("accreditations.submitted_documents")}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ACCsScreen;
