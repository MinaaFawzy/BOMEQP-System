import { useEffect, useState, useMemo } from 'react';
import { trainingCenterAPI } from '../../../services/api';
import { useHeader } from '../../../context/HeaderContext';
import { FileText, Plus, Eye, Download, BookOpen, Calendar, User, CheckCircle, XCircle } from 'lucide-react';
import Modal from '../../../components/Modal/Modal';
import FormInput from '../../../components/FormInput/FormInput';
import DataTable from '../../../components/DataTable/DataTable';
import './CertificatesScreen.css';
import '../../../components/FormInput/FormInput.css';

const TrainingCenterCertificatesScreen = () => {
  const { setHeaderActions, setHeaderTitle, setHeaderSubtitle } = useHeader();
  const [certificates, setCertificates] = useState([]);
  const [classes, setClasses] = useState([]);
  const [codes, setCodes] = useState([]);
  const [filteredCodes, setFilteredCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedCertificate, setSelectedCertificate] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [formData, setFormData] = useState({
    training_class_id: '',
    code_id: '',
    trainee_name: '',
    trainee_id_number: '',
    issue_date: '',
  });
  const [errors, setErrors] = useState({});
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadData();
  }, []); // Load all data once, pagination and filtering are handled client-side

  useEffect(() => {
    setHeaderTitle('Certificates');
    setHeaderSubtitle('Manage and generate training certificates');
    setHeaderActions(
      <button
        onClick={handleOpenModal}
        className="header-create-btn"
      >
        <Plus size={20} />
        Generate Certificate
      </button>
    );
    return () => {
      setHeaderActions(null);
      setHeaderTitle(null);
      setHeaderSubtitle(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setHeaderActions, setHeaderTitle, setHeaderSubtitle]);

  const loadData = async () => {
    try {
      setLoading(true);
      // Load all data - search and statusFilter are handled client-side by DataTable
      const [certData, classesData, codesData] = await Promise.all([
        trainingCenterAPI.listCertificates({ per_page: 1000 }),
        trainingCenterAPI.listClasses(),
        trainingCenterAPI.getCodeInventory({ status: 'available' }),
      ]);
      
      let certificatesArray = [];
      if (certData.data) {
        certificatesArray = certData.data || [];
      } else if (certData.certificates) {
        certificatesArray = certData.certificates || [];
      } else {
        certificatesArray = Array.isArray(certData) ? certData : [];
      }
      
      setCertificates(certificatesArray);
      setClasses(classesData.classes || []);
      setCodes(codesData.codes || []);
    } catch (error) {
      console.error('Failed to load data:', error);
      setCertificates([]);
    } finally {
      setLoading(false);
    }
  };
  

  const handleOpenModal = () => {
    setFormData({
      training_class_id: '',
      code_id: '',
      trainee_name: '',
      trainee_id_number: '',
      issue_date: new Date().toISOString().split('T')[0],
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormData({
      training_class_id: '',
      code_id: '',
      trainee_name: '',
      trainee_id_number: '',
      issue_date: new Date().toISOString().split('T')[0],
    });
    setErrors({});
    setFilteredCodes([]); // Reset filtered codes
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // If training_class_id changes, filter codes and reset code_id
    if (name === 'training_class_id') {
      const selectedClass = classes.find(cls => cls.id === parseInt(value));
      if (selectedClass) {
        // Get course from the selected class
        const classCourseId = typeof selectedClass.course === 'object' 
          ? selectedClass.course?.id 
          : selectedClass.course;
        
        // Filter codes that match the course
        const filtered = codes.filter(code => {
          const codeCourseId = typeof code.course === 'object' 
            ? code.course?.id 
            : code.course;
          return codeCourseId === classCourseId || codeCourseId == classCourseId;
        });
        setFilteredCodes(filtered);
        
        // Reset code_id if current selection doesn't match the filtered codes
        setFormData({
          ...formData,
          training_class_id: value,
          code_id: '', // Reset code selection
        });
      } else {
        setFilteredCodes([]);
        setFormData({
          ...formData,
          training_class_id: value,
          code_id: '',
        });
      }
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
    
    if (errors[e.target.name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[e.target.name];
        return newErrors;
      });
    }
  };

  // Filter codes when modal opens and codes are loaded
  useEffect(() => {
    if (isModalOpen && formData.training_class_id) {
      const selectedClass = classes.find(cls => cls.id === parseInt(formData.training_class_id));
      if (selectedClass) {
        const classCourseId = typeof selectedClass.course === 'object' 
          ? selectedClass.course?.id 
          : selectedClass.course;
        
        const filtered = codes.filter(code => {
          const codeCourseId = typeof code.course === 'object' 
            ? code.course?.id 
            : code.course;
          return codeCourseId === classCourseId || codeCourseId == classCourseId;
        });
        setFilteredCodes(filtered);
      }
    } else if (isModalOpen && !formData.training_class_id) {
      setFilteredCodes([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isModalOpen, codes, classes]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGenerating(true);
    setErrors({});

    try {
      const submitData = {
        training_class_id: parseInt(formData.training_class_id),
        code_id: parseInt(formData.code_id),
        trainee_name: formData.trainee_name.trim(),
        trainee_id_number: formData.trainee_id_number.trim(),
        issue_date: formData.issue_date || new Date().toISOString().split('T')[0],
      };
      
      await trainingCenterAPI.generateCertificate(submitData);
      await loadData();
      handleCloseModal();
      alert('Certificate generated successfully!');
    } catch (error) {
      console.error('Failed to generate certificate:', error);
      if (error.response?.data) {
        const errorData = error.response.data;
        if (errorData.errors) {
          const formattedErrors = {};
          Object.keys(errorData.errors).forEach(key => {
            formattedErrors[key] = Array.isArray(errorData.errors[key]) 
              ? errorData.errors[key][0] 
              : errorData.errors[key];
          });
          setErrors(formattedErrors);
        } else if (errorData.message) {
          setErrors({ general: errorData.message });
        } else {
          setErrors(errorData);
        }
      } else if (error.message) {
        setErrors({ general: error.message });
      } else {
        setErrors({ general: 'Failed to generate certificate. Please try again.' });
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleViewDetails = async (cert) => {
    try {
      const data = await trainingCenterAPI.getCertificateDetails(cert.id);
      setSelectedCertificate(data.certificate || cert);
      setDetailModalOpen(true);
    } catch (error) {
      console.error('Failed to load certificate details:', error);
      setSelectedCertificate(cert);
      setDetailModalOpen(true);
    }
  };

  const handleDownload = (cert) => {
    if (cert.certificate_pdf_url) {
      window.open(cert.certificate_pdf_url, '_blank');
    } else {
      alert('Certificate PDF not available');
    }
  };

  // Define columns for DataTable
  const columns = useMemo(() => [
    {
      header: 'Certificate Number',
      accessor: 'certificate_number',
      sortable: true,
      render: (value, row) => (
        <div className="certificate-number-container">
          <div className="certificate-number-icon-container">
            <FileText className="certificate-number-icon" />
          </div>
          <div>
            <div className="certificate-number-text">
              {row.certificate_number || 'N/A'}
            </div>
          </div>
        </div>
      ),
    },
    {
      header: 'Trainee',
      accessor: 'trainee_name',
      sortable: true,
      render: (value, row) => (
        <div className="trainee-container">
          <User className="trainee-icon" />
          {row.trainee_name || 'N/A'}
        </div>
      ),
    },
    {
      header: 'Course',
      accessor: 'course',
      sortable: true,
      render: (value, row) => (
        <div className="course-container">
          <BookOpen className="course-icon" />
          {typeof row.course === 'object' ? row.course?.name || 'N/A' : row.course || 'N/A'}
        </div>
      ),
    },
    {
      header: 'Issue Date',
      accessor: 'issue_date',
      sortable: true,
      render: (value, row) => (
        <div className="date-container">
          <Calendar className="date-icon" />
          {row.issue_date ? new Date(row.issue_date).toLocaleDateString() : 'N/A'}
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: 'status',
      sortable: true,
      render: (value, row) => {
        const isValid = row.status === 'valid';
        const StatusIcon = isValid ? CheckCircle : XCircle;
        return (
          <div className="status-container">
            <span className={`status-badge ${isValid ? 'valid' : 'expired'}`}>
              <StatusIcon size={14} className="status-icon" />
              {row.status ? row.status.charAt(0).toUpperCase() + row.status.slice(1) : 'N/A'}
            </span>
          </div>
        );
      },
    },
    {
      header: 'Actions',
      accessor: 'actions',
      sortable: false,
      render: (value, row) => (
        <div className="actions-container">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleViewDetails(row);
            }}
            className="action-btn action-btn-view"
            title="View Details"
          >
            <Eye size={18} />
          </button>
          {row.certificate_pdf_url ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDownload(row);
              }}
              className="action-btn action-btn-download"
              title="Download PDF"
            >
              <Download size={18} />
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleViewDetails(row);
              }}
              className="action-btn action-btn-download"
              title="View Info"
            >
              <FileText size={18} />
            </button>
          )}
        </div>
      ),
    },
  ], [handleViewDetails, handleDownload]);

  // Filter options for DataTable
  const filterOptions = useMemo(() => [
    { value: 'all', label: 'All Status', filterFn: () => true },
    { value: 'valid', label: 'Valid', filterFn: (row) => row.status === 'valid' },
    { value: 'expired', label: 'Expired', filterFn: (row) => row.status === 'expired' },
  ], []);

  // Add searchable text to each row for better search functionality
  const dataWithSearchText = useMemo(() => {
    return certificates.map(cert => {
      const courseName = typeof cert.course === 'object' ? cert.course?.name || '' : cert.course || '';
      const searchText = [
        cert.certificate_number || '',
        cert.trainee_name || '',
        courseName,
        cert.verification_code || '',
        cert.status || '',
      ].filter(Boolean).join(' ').toLowerCase();
      
      return {
        ...cert,
        _searchText: searchText,
      };
    });
  }, [certificates]);


  return (
    <div>
      {/* DataTable */}
      <div className="datatable-container">
        <DataTable
          columns={columns}
          data={dataWithSearchText}
          onRowClick={handleViewDetails}
          isLoading={loading}
          emptyMessage={
            certificates.length === 0 && !loading ? (
              <div className="empty-state-container">
                <div className="empty-state-icon-container">
                  <FileText className="empty-state-icon" size={32} />
                </div>
                <p className="empty-state-title">No certificates found</p>
                <p className="empty-state-subtitle">Generate your first certificate!</p>
              </div>
            ) : 'No certificates found matching your filters'
          }
          searchable={true}
          filterable={true}
          searchPlaceholder="Search by certificate number, trainee name, course, or verification code..."
          filterOptions={filterOptions}
          sortable={true}
          defaultFilter={statusFilter}
        />
      </div>

      {/* Generate Certificate Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title="Generate Certificate"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="modal-form">
          {errors.general && (
            <div className="form-error-general">
              <p className="form-error-general-text">{errors.general}</p>
            </div>
          )}

          <FormInput
            label="Training Class"
            name="training_class_id"
            type="select"
            value={formData.training_class_id}
            onChange={handleChange}
            required
            options={classes.length > 0 ? classes.map(cls => ({
              value: cls.id,
              label: `${typeof cls.course === 'object' ? cls.course?.name : cls.course} - ${new Date(cls.start_date).toLocaleDateString()}`,
            })) : [{ value: '', label: 'No classes available' }]}
            error={errors.training_class_id}
          />

          <FormInput
            label="Certificate Code"
            name="code_id"
            type="select"
            value={formData.code_id}
            onChange={handleChange}
            required
            disabled={!formData.training_class_id || filteredCodes.length === 0}
            options={
              !formData.training_class_id
                ? [{ value: '', label: 'Please select a training class first' }]
                : filteredCodes.length > 0
                ? filteredCodes.map(code => ({
                    value: code.id,
                    label: `${code.code} - ${typeof code.course === 'object' ? code.course?.name : code.course} (${code.status})`,
                  }))
                : [{ value: '', label: 'No available codes for this class' }]
            }
            error={errors.code_id}
            helpText={formData.training_class_id && filteredCodes.length === 0 ? 'No available codes match the selected training class' : ''}
          />

          <div className="form-grid">
            <FormInput
              label="Trainee Name"
              name="trainee_name"
              value={formData.trainee_name}
              onChange={handleChange}
              required
              error={errors.trainee_name}
            />

            <FormInput
              label="Trainee ID Number"
              name="trainee_id_number"
              value={formData.trainee_id_number}
              onChange={handleChange}
              required
              error={errors.trainee_id_number}
            />
          </div>

          <FormInput
            label="Issue Date"
            name="issue_date"
            type="date"
            value={formData.issue_date}
            onChange={handleChange}
            required
            error={errors.issue_date}
          />

          <div className="form-actions">
            <button
              type="button"
              onClick={handleCloseModal}
              className="form-btn form-btn-cancel"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={generating}
              className="form-btn form-btn-submit"
            >
              {generating ? 'Generating...' : 'Generate Certificate'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Certificate Detail Modal */}
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
            <div className="detail-modal-grid">
              <div className="detail-modal-item">
                <p className="detail-modal-label">Certificate Number</p>
                <p className="detail-modal-value">{selectedCertificate.certificate_number}</p>
              </div>
              <div className="detail-modal-item">
                <p className="detail-modal-label">Verification Code</p>
                <p className="detail-modal-value detail-modal-value-mono">{selectedCertificate.verification_code || 'N/A'}</p>
              </div>
              <div className="detail-modal-item">
                <p className="detail-modal-label">Trainee Name</p>
                <p className="detail-modal-value">{selectedCertificate.trainee_name}</p>
              </div>
              <div className="detail-modal-item">
                <p className="detail-modal-label">Course</p>
                <p className="detail-modal-value">
                  {typeof selectedCertificate.course === 'object' ? selectedCertificate.course?.name : selectedCertificate.course}
                </p>
              </div>
              <div className="detail-modal-item">
                <p className="detail-modal-label">Issue Date</p>
                <p className="detail-modal-value">
                  {selectedCertificate.issue_date ? new Date(selectedCertificate.issue_date).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <div className="detail-modal-item">
                <p className="detail-modal-label">Expiry Date</p>
                <p className="detail-modal-value">
                  {selectedCertificate.expiry_date ? new Date(selectedCertificate.expiry_date).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <div className="detail-modal-item">
                <p className="detail-modal-label">Status</p>
                <span className={`detail-modal-badge ${selectedCertificate.status === 'valid' ? 'valid' : 'expired'}`}>
                  {selectedCertificate.status}
                </span>
              </div>
            </div>
            {selectedCertificate.certificate_pdf_url && (
              <div className="detail-modal-actions">
                <button
                  onClick={() => handleDownload(selectedCertificate)}
                  className="detail-modal-action-btn"
                >
                  <Download size={20} className="detail-modal-action-icon" />
                  Download PDF
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default TrainingCenterCertificatesScreen;