import { useEffect, useState, useMemo, useCallback } from 'react';
import { useTranslation } from '../../../hooks/useTranslation';
import { accAPI } from '../../../services/api';
import { useHeader } from '../../../context/HeaderContext';
import { Award, Eye, FileText, User, BookOpen, Calendar, Hash, Download, CheckCircle } from 'lucide-react';
import Modal from '../../../components/Modal/Modal';
import DataTable from '../../../components/DataTable/DataTable';
import DetailForm from '../../../components/DetailForm/DetailForm';
import Pagination from '../../../components/Pagination/Pagination';
import FilterMenu from '../../../components/FilterMenu/FilterMenu';
import useDebounce from '../../../hooks/useDebounce';
import './CertificatesScreen.css';

const CertificatesScreen = () => {
  const { t } = useTranslation('accreditation');
  const { setHeaderActions, setHeaderTitle, setHeaderSubtitle } = useHeader();
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedCertificate, setSelectedCertificate] = useState(null);
  const [filters, setFilters] = useState({ type: '', status: '' });

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
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 500);

  // Load data when dependencies change
  useEffect(() => {
    loadCertificates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.current_page, pagination.per_page, debouncedSearch, filters]);

  const handleSearch = (term) => {
    setSearchTerm(term);
    setPagination(prev => ({ ...prev, current_page: 1 }));
  };

  useEffect(() => {
    setHeaderTitle(t('certificates_screen.header.title'));
    setHeaderSubtitle(t('certificates_screen.header.subtitle'));
    setHeaderActions(null);
    return () => {
      setHeaderActions(null);
      setHeaderTitle(null);
      setHeaderSubtitle(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setHeaderActions, setHeaderTitle, setHeaderSubtitle, t]);

  const loadCertificates = async () => {
    setLoading(true);
    try {
      // Build query parameters for server-side filtering and pagination
      const params = {
        page: pagination.current_page,
        per_page: pagination.per_page,
      };

      // Only add search if there's a value
      if (debouncedSearch) {
        params.search = debouncedSearch;
      }

      // Add status filter if not empty or 'all'
      if (filters.status && filters.status !== 'all') {
        params.status = filters.status;
      }

      // Add type filter if not empty or 'all'
      if (filters.type && filters.type !== 'all') {
        params.type = filters.type;
      }

      const data = await accAPI.listCertificates(params);

      // Handle Laravel pagination response
      const certificatesArray = data.data || [];
      setCertificates(certificatesArray);

      // Update pagination state
      if (data) {
        setPagination(prev => ({
          ...prev,
          current_page: data.current_page || 1,
          last_page: data.last_page || 1,
          total: data.total || 0,
          from: data.from || 0,
          to: data.to || 0
        }));
      }
    } catch (error) {
      console.error('Failed to load certificates:', error);
      setCertificates([]);
    } finally {
      setLoading(false);
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

  const handleFilterApply = (newFilters) => {
    setFilters(newFilters);
    setPagination(prev => ({ ...prev, current_page: 1 }));
  };

  const handleFilterClear = (clearedFilters) => {
    setFilters(clearedFilters);
    setPagination(prev => ({ ...prev, current_page: 1 }));
  };

  // Format date helper
  const formatDate = (dateString) => {
    if (!dateString) return t('certificates_screen.common.na');
    return new Date(dateString).toLocaleDateString();
  };

  const handleViewDetails = useCallback((cert) => {
    setSelectedCertificate(cert);
    setDetailModalOpen(true);
  }, []);

  const handleRowClick = useCallback((cert) => {
    handleViewDetails(cert);
  }, [handleViewDetails]);

  // Define columns for DataTable
  const columns = useMemo(() => [
    {
      header: t('certificates_screen.table.certificate_number'),
      accessor: 'certificate_number',
      sortable: true,
      render: (value, row) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg flex items-center justify-center">
            <Award className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900">
              {value || t('certificates_screen.common.na')}
            </div>
          </div>
        </div>
      )
    },
    {
      header: t('certificates_screen.table.name'),
      accessor: 'name',
      sortable: true,
      render: (value, row) => (
        <div className="text-sm font-semibold text-gray-900">
          {value || row.student_name || t('certificates_screen.common.na')}
        </div>
      )
    },
    {
      header: t('certificates_screen.table.type'),
      accessor: 'type',
      sortable: true,
      render: (value) => (
        <div className="text-sm text-gray-700 capitalize">
          {value || t('certificates_screen.common.na')}
        </div>
      )
    },
    {
      header: t('certificates_screen.table.course'),
      accessor: 'course',
      sortable: true,
      render: (value, row) => {
        const courseName = typeof value === 'object' ? value?.name || t('certificates_screen.common.na') : value || t('certificates_screen.common.na');
        return (
          <div className="text-sm text-gray-700">
            {courseName}
          </div>
        );
      }
    },
    {
      header: t('certificates_screen.table.issue_date'),
      accessor: 'issue_date',
      sortable: true,
      render: (value) => (
        <div className="text-sm text-gray-600">
          {formatDate(value)}
        </div>
      )
    },
    {
      header: t('certificates_screen.table.status'),
      accessor: 'status',
      sortable: true,
      render: (value) => (
        <span className={`px-3 py-1.5 inline-flex text-xs leading-5 font-bold rounded-full shadow-sm ${value === 'valid' ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300' :
          'bg-gradient-to-r from-red-100 to-red-200 text-red-800 border border-red-300'
          }`}>
          {value ? t(`certificates_screen.status.${value}`, { defaultValue: value.charAt(0).toUpperCase() + value.slice(1) }) : t('certificates_screen.common.na')}
        </span>
      )
    },
    {
      header: t('certificates_screen.table.actions'),
      accessor: 'actions',
      sortable: false,
      render: (value, row) => (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => handleViewDetails(row)}
            className="p-2 rounded-lg bg-primary-50 text-primary-600 hover:bg-primary-100 hover:scale-110 transition-all duration-200 shadow-sm hover:shadow-md"
            title={t('certificates_screen.actions.view_details')}
          >
            <Eye size={16} />
          </button>
          {row.verification_code && (
            <a
              href={`/certificates/verify/${row.verification_code}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 hover:scale-110 transition-all duration-200 shadow-sm hover:shadow-md"
              title={t('certificates_screen.actions.verify')}
              onClick={(e) => e.stopPropagation()}
            >
              <CheckCircle size={16} />
            </a>
          )}
        </div>
      )
    }
  ], [handleViewDetails]);

  // filterOptions removed - using server-side filtering

  return (
    <div>
      {/* DataTable with Search & Filters */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        <DataTable
          columns={columns}
          data={certificates}
          isLoading={loading}
          searchable={true}
          searchValue={searchTerm}
          onSearch={handleSearch}
          searchPlaceholder={t('certificates_screen.search.placeholder')}
          filterable={false}
          sortable={true}
          onRowClick={handleRowClick}
          customFilters={
            <FilterMenu
              filters={filters}
              onApply={handleFilterApply}
              onClear={handleFilterClear}
              showLocation={false}
              showAssessorStatus={false}
              showCertificateType={true}
              showStatus={true}
            />
          }
        />

        {/* Pagination */}
        {pagination.total > 0 && (
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

      {/* Detail Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedCertificate(null);
        }}
        title={t('certificates_screen.details.modal_title')}
        size="lg"
      >
        {selectedCertificate && (
          <div className="detail-modal-container">
            <DetailForm
              data={selectedCertificate}
              fields={[
                { key: 'certificate_number', label: t('certificates_screen.details.certificate_number'), icon: FileText },
                { key: 'name', label: t('certificates_screen.details.trainee_name'), icon: User, render: (value, row) => value || row.student_name || row.trainee_name || t('certificates_screen.common.na') },
                { key: 'type', label: t('certificates_screen.table.type'), icon: User, render: (value) => <span className="capitalize">{value || t('certificates_screen.common.na')}</span> },
                { key: 'course', label: t('certificates_screen.details.course'), icon: BookOpen, render: (value) => typeof value === 'object' ? value?.name || t('certificates_screen.common.na') : value || t('certificates_screen.common.na') },
                { key: 'template', label: t('certificates_screen.details.template'), icon: FileText, render: (value) => typeof value === 'object' ? value?.name || t('certificates_screen.common.na') : value || t('certificates_screen.common.na') },
                { key: 'issue_date', label: t('certificates_screen.details.issue_date'), icon: Calendar, render: (value) => formatDate(value) },
                { key: 'expiry_date', label: t('certificates_screen.details.expiry_date'), icon: Calendar, render: (value) => formatDate(value) },
                { key: 'verification_code', label: t('certificates_screen.details.verification_code'), icon: Hash },
                {
                  key: 'certificate_pdf_url',
                  label: t('certificates_screen.details.files_label'),
                  icon: FileText,
                  render: (value, row) => (
                    <div className="flex flex-wrap gap-3">
                      {value ? (
                        <a
                          href={value}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 font-semibold text-sm group"
                        >
                          <Eye size={18} className="group-hover:scale-110 transition-transform duration-300" />
                          {t('certificates_screen.details.view_certificate')}
                        </a>
                      ) : (
                        <span className="text-gray-400 text-sm">{t('certificates_screen.common.na')}</span>
                      )}
                      {row?.card_pdf_url && (
                        <a
                          href={row.card_pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 font-semibold text-sm group"
                        >
                          <Eye size={18} className="group-hover:scale-110 transition-transform duration-300" />
                          {t('certificates_screen.details.view_card')}
                        </a>
                      )}
                    </div>
                  )
                },
                { key: 'status', label: t('certificates_screen.details.status'), type: 'status' },
              ]}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default CertificatesScreen;
