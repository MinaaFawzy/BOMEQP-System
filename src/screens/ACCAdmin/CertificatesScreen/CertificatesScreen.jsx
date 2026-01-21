import { useEffect, useState, useMemo, useCallback } from 'react';
import { useTranslation } from '../../../hooks/useTranslation';
import { accAPI } from '../../../services/api';
import { useHeader } from '../../../context/HeaderContext';
import { Award, Eye, FileText, User, BookOpen, Calendar, Hash, Download, CheckCircle, Search } from 'lucide-react';
import Modal from '../../../components/Modal/Modal';
import DataTable from '../../../components/DataTable/DataTable';
import DetailForm from '../../../components/DetailForm/DetailForm';
import Pagination from '../../../components/Pagination/Pagination';
import './CertificatesScreen.css';

const CertificatesScreen = () => {
  const { t } = useTranslation('accreditation');
  const { setHeaderActions, setHeaderTitle, setHeaderSubtitle } = useHeader();
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedCertificate, setSelectedCertificate] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  // Pagination State
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
    per_page: 5,
    from: 0,
    to: 0
  });

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPagination(prev => ({ ...prev, current_page: 1 }));
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load data when dependencies change
  useEffect(() => {
    loadCertificates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, pagination.current_page, pagination.per_page, debouncedSearch]);

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
  }, [setHeaderActions, setHeaderTitle, setHeaderSubtitle]);

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

      // Add status filter if not 'all'
      if (statusFilter !== 'all') {
        params.status = statusFilter;
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
        <div className="flex items-center">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg flex items-center justify-center mr-3">
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
      header: t('certificates_screen.table.trainee'),
      accessor: 'trainee_name',
      sortable: true,
      render: (value, row) => (
        <div className="text-sm font-semibold text-gray-900">
          {value || row.student_name || t('certificates_screen.common.na')}
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
      {/* Search and Filters */}
      <div className="mb-4">
        <div className="flex gap-4">
          {/* Search Input */}
          <div className="relative flex-1">
            <input
              type="text"
              placeholder={t('certificates_screen.search.placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
            />
            <div className="absolute left-3 top-2.5 text-gray-400">
              <Search size={20} />
            </div>
          </div>

          {/* Status Filter */}
          <div className="w-48">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPagination(prev => ({ ...prev, current_page: 1 }));
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all bg-white cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27currentColor%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e')] bg-[length:1.25rem] bg-[right_0.5rem_center] bg-no-repeat pr-10"
            >
              <option value="all">{t('certificates_screen.filters.all')}</option>
              <option value="valid">{t('certificates_screen.filters.valid')}</option>
              <option value="invalid">{t('certificates_screen.filters.invalid')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* DataTable */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        <DataTable
          columns={columns}
          data={certificates}
          isLoading={loading}
          searchable={false}
          filterable={false}
          sortable={true}
          onRowClick={handleRowClick}
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
                { key: 'trainee_name', label: t('certificates_screen.details.trainee_name'), icon: User, render: (value, row) => value || row.student_name || t('certificates_screen.common.na') },
                { key: 'course', label: t('certificates_screen.details.course'), icon: BookOpen, render: (value) => typeof value === 'object' ? value?.name || t('certificates_screen.common.na') : value || t('certificates_screen.common.na') },
                { key: 'template', label: t('certificates_screen.details.template'), icon: FileText, render: (value) => typeof value === 'object' ? value?.name || t('certificates_screen.common.na') : value || t('certificates_screen.common.na') },
                { key: 'issue_date', label: t('certificates_screen.details.issue_date'), icon: Calendar, render: (value) => formatDate(value) },
                { key: 'expiry_date', label: t('certificates_screen.details.expiry_date'), icon: Calendar, render: (value) => formatDate(value) },
                { key: 'verification_code', label: t('certificates_screen.details.verification_code'), icon: Hash },
                {
                  key: 'certificate_pdf_url',
                  label: t('certificates_screen.details.certificate_pdf'),
                  icon: Download,
                  render: (value) => value ? (
                    <a
                      href={value}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:text-primary-700 underline"
                    >
                      {t('certificates_screen.details.download_pdf')}
                    </a>
                  ) : t('certificates_screen.common.na')
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
