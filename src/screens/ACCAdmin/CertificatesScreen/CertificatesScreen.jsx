import { useEffect, useState, useMemo, useCallback } from 'react';
import { accAPI } from '../../../services/api';
import { useHeader } from '../../../context/HeaderContext';
import { Award, Eye, FileText, User, BookOpen, Calendar, Hash, Download, CheckCircle } from 'lucide-react';
import Modal from '../../../components/Modal/Modal';
import DataTable from '../../../components/DataTable/DataTable';
import DetailForm from '../../../components/DetailForm/DetailForm';
import './CertificatesScreen.css';

const CertificatesScreen = () => {
  const { setHeaderActions, setHeaderTitle, setHeaderSubtitle } = useHeader();
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedCertificate, setSelectedCertificate] = useState(null);

  useEffect(() => {
    loadCertificates();
  }, []);

  useEffect(() => {
    setHeaderTitle('Certificates');
    setHeaderSubtitle('View all certificates issued using your templates');
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
      const params = {
        per_page: 1000,
      };

      const data = await accAPI.listCertificates(params);

      let certificatesArray = [];
      if (data.data) {
        certificatesArray = data.data || [];
      } else if (data.certificates) {
        certificatesArray = data.certificates || [];
      } else {
        certificatesArray = Array.isArray(data) ? data : [];
      }

      // Add _searchText for better search functionality
      certificatesArray = certificatesArray.map(cert => {
        const courseName = typeof cert.course === 'object' ? cert.course?.name || '' : cert.course || '';
        const templateName = typeof cert.template === 'object' ? cert.template?.name || '' : cert.template || '';
        return {
          ...cert,
          _searchText: [
            cert.certificate_number,
            cert.trainee_name || cert.student_name,
            courseName,
            templateName,
            cert.status
          ].filter(Boolean).join(' ').toLowerCase()
        };
      });

      setCertificates(certificatesArray);
    } catch (error) {
      console.error('Failed to load certificates:', error);
      setCertificates([]);
    } finally {
      setLoading(false);
    }
  };

  // Format date helper
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
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
      header: 'Certificate Number',
      accessor: 'certificate_number',
      sortable: true,
      render: (value, row) => (
        <div className="flex items-center">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg flex items-center justify-center mr-3">
            <Award className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900">
              {value || 'N/A'}
            </div>
          </div>
        </div>
      )
    },
    {
      header: 'Trainee',
      accessor: 'trainee_name',
      sortable: true,
      render: (value, row) => (
        <div className="text-sm font-semibold text-gray-900">
          {value || row.student_name || 'N/A'}
        </div>
      )
    },
    {
      header: 'Course',
      accessor: 'course',
      sortable: true,
      render: (value, row) => {
        const courseName = typeof value === 'object' ? value?.name || 'N/A' : value || 'N/A';
        return (
          <div className="text-sm text-gray-700">
            {courseName}
          </div>
        );
      }
    },
    {
      header: 'Issue Date',
      accessor: 'issue_date',
      sortable: true,
      render: (value) => (
        <div className="text-sm text-gray-600">
          {formatDate(value)}
        </div>
      )
    },
    {
      header: 'Status',
      accessor: 'status',
      sortable: true,
      render: (value) => (
        <span className={`px-3 py-1.5 inline-flex text-xs leading-5 font-bold rounded-full shadow-sm ${value === 'valid' ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300' :
          'bg-gradient-to-r from-red-100 to-red-200 text-red-800 border border-red-300'
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
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => handleViewDetails(row)}
            className="p-2 rounded-lg bg-primary-50 text-primary-600 hover:bg-primary-100 hover:scale-110 transition-all duration-200 shadow-sm hover:shadow-md"
            title="View Details"
          >
            <Eye size={16} />
          </button>
          {row.verification_code && (
            <a
              href={`/certificates/verify/${row.verification_code}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 hover:scale-110 transition-all duration-200 shadow-sm hover:shadow-md"
              title="Verify Certificate"
              onClick={(e) => e.stopPropagation()}
            >
              <CheckCircle size={16} />
            </a>
          )}
        </div>
      )
    }
  ], [handleViewDetails]);

  // Filter options for status
  const filterOptions = useMemo(() => [
    { value: 'all', label: 'All Status', filterFn: () => true },
    {
      value: 'valid',
      label: 'Valid',
      filterFn: (cert) => cert.status === 'valid'
    },
    {
      value: 'invalid',
      label: 'Invalid',
      filterFn: (cert) => cert.status === 'invalid'
    }
  ], []);

  return (
    <div>
      <DataTable
        columns={columns}
        data={certificates}
        isLoading={loading}
        searchable={true}
        searchPlaceholder="Search by number, trainee, course, or template..."
        filterable={true}
        filterOptions={filterOptions}
        defaultFilter="all"
        sortable={true}
        onRowClick={handleRowClick}
      />

      {/* Detail Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedCertificate(null);
        }}
        title="Certificate Details"
        size="lg"
      >
        {selectedCertificate && (
          <div className="detail-modal-container">
            <DetailForm
              data={selectedCertificate}
              fields={[
                { key: 'certificate_number', label: 'Certificate Number', icon: FileText },
                { key: 'trainee_name', label: 'Trainee Name', icon: User, render: (value, row) => value || row.student_name || 'N/A' },
                { key: 'course', label: 'Course', icon: BookOpen, render: (value) => typeof value === 'object' ? value?.name || 'N/A' : value || 'N/A' },
                { key: 'template', label: 'Template', icon: FileText, render: (value) => typeof value === 'object' ? value?.name || 'N/A' : value || 'N/A' },
                { key: 'issue_date', label: 'Issue Date', icon: Calendar, render: (value) => formatDate(value) },
                { key: 'expiry_date', label: 'Expiry Date', icon: Calendar, render: (value) => formatDate(value) },
                { key: 'verification_code', label: 'Verification Code', icon: Hash },
                {
                  key: 'certificate_pdf_url',
                  label: 'Certificate PDF',
                  icon: Download,
                  render: (value) => value ? (
                    <a
                      href={value}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:text-primary-700 underline"
                    >
                      Download PDF
                    </a>
                  ) : 'N/A'
                },
                { key: 'status', label: 'Status', type: 'status' },
              ]}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default CertificatesScreen;
