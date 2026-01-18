
import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { trainingCenterAPI } from '../../../services/api';
import { useHeader } from '../../../context/HeaderContext';
import { FileText, Plus, Eye, Download, BookOpen, Calendar, User, Award, Building2, CheckCircle } from 'lucide-react';
import Modal from '../../../components/Modal/Modal';
import FormInput from '../../../components/FormInput/FormInput';
import DataTable from '../../../components/DataTable/DataTable';
import DetailForm from '../../../components/DetailForm/DetailForm';
import Pagination from '../../../components/Pagination/Pagination';
import './CertificatesScreen.css';
import '../../../components/FormInput/FormInput.css';

const TrainingCenterCertificatesScreen = () => {
  const { setHeaderActions, setHeaderTitle, setHeaderSubtitle } = useHeader();
  const [certificates, setCertificates] = useState([]);
  const [accs, setAccs] = useState([]);
  const [courses, setCourses] = useState([]);
  const [allCertificates, setAllCertificates] = useState([]); // For duplicate check
  const [loading, setLoading] = useState(true);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCertificates, setTotalCertificates] = useState(0);
  const [paginationInfo, setPaginationInfo] = useState({ from: 0, to: 0 });

  // Status filter
  const [statusFilter, setStatusFilter] = useState('all');
  const [completedClasses, setCompletedClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedCertificate, setSelectedCertificate] = useState(null);
  const [formData, setFormData] = useState({
    acc_id: '',
    course_id: '',
    trainee_id: '',
    trainee_name: '',
    issue_date: '',
    expiry_date: '',
    class_id: '',
    instructor_id: '',
  });
  const [selectedClassTrainees, setSelectedClassTrainees] = useState([]);
  const [errors, setErrors] = useState({});
  const [generating, setGenerating] = useState(false);
  const [loadingACCs, setLoadingACCs] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(false);

  // Load data when pagination changes
  useEffect(() => {
    loadData();
  }, [currentPage, perPage]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Build query parameters
      const params = {
        page: currentPage,
        per_page: perPage,
      };

      const certData = await trainingCenterAPI.listCertificates(params);

      // Handle paginated response
      let certificatesArray = [];
      if (certData.data) {
        certificatesArray = certData.data || [];
      } else if (certData.certificates) {
        certificatesArray = certData.certificates || [];
      } else {
        certificatesArray = Array.isArray(certData) ? certData : [];
      }

      setCertificates(certificatesArray);

      // Update pagination metadata
      if (certData.total !== undefined) {
        setTotalCertificates(certData.total);
        setTotalPages(certData.last_page || 1);
        setPaginationInfo({
          from: certData.from || 0,
          to: certData.to || 0,
        });
      } else {
        // Fallback for non-paginated response
        setTotalCertificates(certificatesArray.length);
        setTotalPages(1);
        setPaginationInfo({
          from: certificatesArray.length > 0 ? 1 : 0,
          to: certificatesArray.length,
        });
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      setCertificates([]);
      setTotalCertificates(0);
      setTotalPages(1);
      setPaginationInfo({ from: 0, to: 0 });
    } finally {
      setLoading(false);
    }
  };

  const loadACCs = async () => {
    setLoadingACCs(true);
    try {
      const data = await trainingCenterAPI.getAuthorizedACCs({ per_page: 1000 });

      let accsArray = [];
      if (data.accs) {
        accsArray = data.accs || [];
      } else if (data.data) {
        accsArray = data.data || [];
      } else {
        accsArray = Array.isArray(data) ? data : [];
      }

      setAccs(accsArray);
    } catch (error) {
      console.error('Failed to load Accreditations:', error);
      setAccs([]);
    } finally {
      setLoadingACCs(false);
    }
  };

  const loadCourses = async (accId) => {
    if (!accId) {
      setCourses([]);
      return;
    }

    setLoadingCourses(true);
    try {
      const data = await trainingCenterAPI.getCoursesForCertificate({ acc_id: accId, per_page: 1000 });

      let coursesArray = [];
      if (data.courses) {
        coursesArray = data.courses || [];
      } else if (data.data) {
        coursesArray = data.data || [];
      } else {
        coursesArray = Array.isArray(data) ? data : [];
      }

      setCourses(coursesArray);
    } catch (error) {
      console.error('Failed to load courses:', error);
      setCourses([]);
    } finally {
      setLoadingCourses(false);
    }
  };

  const loadCompletedClasses = async () => {
    setLoadingClasses(true);
    try {
      const response = await trainingCenterAPI.listClasses({ per_page: 1000 });
      let classesList = [];

      // Handle different response structures
      if (response.classes) {
        classesList = response.classes;
      } else if (response.data) {
        classesList = response.data;
      } else if (Array.isArray(response)) {
        classesList = response;
      }

      setCompletedClasses(classesList);
    } catch (error) {
      console.error("Failed to load classes", error);
      setCompletedClasses([]);
    } finally {
      setLoadingClasses(false);
    }
  };

  const loadAllCertificates = async () => {
    try {
      const response = await trainingCenterAPI.listCertificates({ per_page: 10000 });
      let certs = [];
      if (response.data) {
        certs = response.data || [];
      } else if (response.certificates) {
        certs = response.certificates || [];
      } else {
        certs = Array.isArray(response) ? response : [];
      }
      setAllCertificates(certs);
    } catch (error) {
      console.error("Failed to load all certificates for validation", error);
    }
  };

  const handleOpenModal = useCallback(async () => {
    setFormData({
      acc_id: '',
      course_id: '',
      trainee_id: '',
      trainee_name: '',
      issue_date: new Date().toISOString().split('T')[0],
      expiry_date: '',
      class_id: '',
      instructor_id: '',
    });
    setSelectedClassTrainees([]);
    setErrors({});
    setCourses([]);

    if (accs.length === 0) {
      await loadACCs();
    }

    // Load reference data
    await Promise.all([
      loadCompletedClasses(),
      loadAllCertificates()
    ]);

    setIsModalOpen(true);
  }, [accs.length]);

  useEffect(() => {
    setHeaderTitle('Certificates');
    setHeaderSubtitle('Issue and manage training certificates');
    setHeaderActions(
      <button
        onClick={handleOpenModal}
        className="header-create-btn"
      >
        <Plus size={20} />
        Issue Certificate
      </button>
    );
    return () => {
      setHeaderActions(null);
      setHeaderTitle(null);
      setHeaderSubtitle(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setHeaderActions, setHeaderTitle, setHeaderSubtitle, handleOpenModal]);

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormData({
      acc_id: '',
      course_id: '',
      trainee_id: '',
      trainee_name: '',
      issue_date: new Date().toISOString().split('T')[0],
      expiry_date: '',
      class_id: '',
      instructor_id: '',
    });
    setSelectedClassTrainees([]);
    setErrors({});
    setCourses([]);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'acc_id') {
      // When ACC changes, reset course and load courses for new ACC
      setFormData(prev => ({
        ...prev,
        acc_id: value,
        course_id: '', // Reset course selection
      }));
      setCourses([]); // Clear courses
      if (value) {
        loadCourses(parseInt(value));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));
    }

    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleClassChange = (e) => {
    const classId = e.target.value;

    if (!classId) {
      // Reset if cleared
      setFormData(prev => ({
        ...prev,
        class_id: '',
        acc_id: '',
        course_id: '',
        instructor_id: '',
        trainee_id: '',
        trainee_name: '',
      }));
      setSelectedClassTrainees([]);
      return;
    }

    const selectedClass = completedClasses.find(c => c.id.toString() === classId);

    if (selectedClass) {
      // Auto-populate
      // Extract IDs using flexible access (handles object or direct ID)
      const accId = selectedClass.acc_id || selectedClass.course?.acc_id || selectedClass.acc?.id || '';
      const courseId = selectedClass.course_id || selectedClass.course?.id || '';
      const instructorId = selectedClass.instructor_id || selectedClass.instructor?.id || '';

      // Extract trainees from the class
      const trainees = selectedClass.trainees || [];
      setSelectedClassTrainees(trainees);

      setFormData(prev => ({
        ...prev,
        class_id: classId,
        acc_id: accId ? accId.toString() : '',
        course_id: courseId ? courseId.toString() : '',
        instructor_id: instructorId ? instructorId.toString() : '',
        trainee_id: '', // Reset trainee selection
        trainee_name: '', // Reset trainee name
      }));
    }
  };

  const handleTraineeChange = (e) => {
    const traineeId = e.target.value;

    if (!traineeId) {
      setFormData(prev => ({
        ...prev,
        trainee_id: '',
        trainee_name: '',
      }));
      return;
    }

    const selectedTrainee = selectedClassTrainees.find(t => t.id.toString() === traineeId);

    if (selectedTrainee) {
      const fullName = `${selectedTrainee.first_name} ${selectedTrainee.last_name} `;
      setFormData(prev => ({
        ...prev,
        trainee_id: traineeId,
        trainee_name: fullName,
      }));

      // Check for duplicates
      if (formData.class_id) {
        const duplicate = allCertificates.find(cert =>
          (cert.class_id == formData.class_id || cert.class?.id == formData.class_id) &&
          (cert.trainee_id == traineeId || cert.trainee?.id == traineeId)
        );

        if (duplicate) {
          setErrors(prev => ({
            ...prev,
            trainee_id_duplicate: 'A certificate has already been issued to this trainee for this class.'
          }));
        } else {
          setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors.trainee_id_duplicate;
            return newErrors;
          });
        }
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGenerating(true);
    setErrors({});

    // Client-side validation
    if (!formData.class_id) {
      // ... existing validation
      if (!formData.acc_id) {
        setErrors({ acc_id: 'Please select an Accreditation' });
        setGenerating(false);
        return;
      }
      if (!formData.course_id) {
        setErrors({ course_id: 'Please select a course' });
        setGenerating(false);
        return;
      }
    }

    if (!formData.trainee_id) {
      setErrors({ trainee_id: 'Please select a trainee' });
      setGenerating(false);
      return;
    }

    // Duplicate Check on Submit
    if (formData.class_id) {
      const duplicate = allCertificates.find(cert =>
        (cert.class_id == formData.class_id || cert.class?.id == formData.class_id) &&
        (cert.trainee_id == formData.trainee_id || cert.trainee?.id == formData.trainee_id)
      );
      if (duplicate) {
        setErrors({ trainee_id_duplicate: 'Cannot issue certificate: Duplicate record found for this class and trainee.' });
        setGenerating(false);
        return;
      }
    }

    if (!formData.issue_date) {
      setErrors({ issue_date: 'Issue date is required' });
      setGenerating(false);
      return;
    }
    if (formData.expiry_date && formData.expiry_date < formData.issue_date) {
      setErrors({ expiry_date: 'Expiry date must be after issue date' });
      setGenerating(false);
      return;
    }

    try {
      const submitData = {
        acc_id: formData.acc_id ? parseInt(formData.acc_id) : null,
        course_id: formData.course_id ? parseInt(formData.course_id) : null,
        trainee_name: formData.trainee_name.trim(),
        issue_date: formData.issue_date,
        expiry_date: formData.expiry_date || null,
        class_id: formData.class_id ? parseInt(formData.class_id) : null,
        instructor_id: formData.instructor_id ? parseInt(formData.instructor_id) : null,
        trainee_id: formData.trainee_id ? parseInt(formData.trainee_id) : null,
      };

      const response = await trainingCenterAPI.issueCertificate(submitData);

      // Show success message
      alert('Certificate issued successfully!');

      handleCloseModal();
      loadData();
    } catch (error) {
      console.error('Failed to issue certificate:', error);
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      } else if (error.response?.data?.message) {
        setErrors({ general: error.response.data.message });
      } else {
        setErrors({ general: 'Failed to issue certificate. Please try again.' });
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleViewDetails = useCallback(async (cert) => {
    setSelectedCertificate(cert);
    setDetailModalOpen(true);

    // Fetch fresh validity status to ensure we show the latest status
    try {
      const response = await trainingCenterAPI.checkCertificateValidity(cert.id);
      if (response && response.certificate) {
        setSelectedCertificate(prev => {
          // If we've switched certificates in the meantime, don't update
          if (prev?.id !== cert.id) return prev;

          // Merge existing data with new data, ensuring we don't lose the PDF URL
          // if the validity endpoint doesn't return it
          return {
            ...prev,
            ...response.certificate,
            certificate_pdf_url: response.certificate.certificate_pdf_url || prev.certificate_pdf_url
          };
        });
      }
    } catch (error) {
      console.error('Failed to check validity for details:', error);
    }
  }, []);

  const handleRowClick = useCallback((cert) => {
    handleViewDetails(cert);
  }, [handleViewDetails]);

  const handleDownload = async (cert) => {
    try {
      // Step 1: Check validity first
      let validityStatus = null;
      try {
        const validityResponse = await trainingCenterAPI.checkCertificateValidity(cert.id);
        validityStatus = validityResponse;
      } catch (validationError) {
        console.warn('Failed to check certificate validity:', validationError);
        // We continue to try download even if validation check fails, 
        // identifying network issues vs actual validity problems might be good but let's proceed with caution
      }

      if (validityStatus && !validityStatus.valid) {
        const proceed = window.confirm(
          `Certificate Status Alert: \n\n` +
          `Status: ${validityStatus.status.toUpperCase()} \n` +
          `Message: ${validityStatus.message} \n\n` +
          `Do you still want to download this certificate ? `
        );
        if (!proceed) return;
      }

      // Step 2: Download
      const response = await trainingCenterAPI.downloadCertificatePDF(cert.id);

      // Check if response is an error (JSON error responses)
      // When axios receives a blob response that's actually JSON, we need to check the content type
      if (response.data instanceof Blob) {
        // Check if blob is actually JSON error
        const blobType = response.data.type;
        if (blobType && blobType.includes('application/json')) {
          const errorText = await response.data.text();
          const errorJson = JSON.parse(errorText);
          throw new Error(errorJson.message || 'Download failed');
        }
      }

      // Create download link
      const blob = response.data instanceof Blob ? response.data : new Blob([response.data]);

      // Determine extension based on content type
      let extension = 'pdf';
      if (blob.type === 'image/png') extension = 'png';
      else if (blob.type === 'image/jpeg') extension = 'jpg';

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `certificate-${cert.certificate_number || cert.id}.${extension}`);
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Failed to download certificate:', error);

      // Handle errors with better error messages
      let errorMessage = 'Failed to download certificate. Please try again.';

      if (error.response) {
        if (error.response.data instanceof Blob) {
          try {
            const errorText = await error.response.data.text();
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.message || errorMessage;
          } catch {
            // If parsing fails, use default message
          }
        } else if (error.response.data?.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.status === 403) {
          errorMessage = 'You do not have permission to download this certificate.';
        } else if (error.response.status === 404) {
          errorMessage = 'Certificate file not found.';
        } else if (error.response.status === 500) {
          errorMessage = 'Server error. Please try again later.';
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      alert(errorMessage);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

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
      render: (value) => (
        <div className="text-sm font-semibold text-gray-900">
          {value || 'N/A'}
        </div>
      )
    },
    {
      header: 'Course',
      accessor: 'course',
      sortable: true,
      render: (value) => {
        const courseName = typeof value === 'object' ? value?.name || 'N/A' : value || 'N/A';
        return (
          <div className="text-sm text-gray-700">
            {courseName}
          </div>
        );
      }
    },
    {
      header: 'Accreditation',
      accessor: 'course',
      sortable: true,
      render: (value, row) => {
        // ACC is nested in course.acc
        const accName = row.course?.acc?.name || value?.acc?.name || 'N/A';
        return (
          <div className="text-sm text-gray-700">
            {accName}
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
      render: (value) => {
        let badgeClass = 'bg-gray-100 text-gray-800 border-gray-200';
        let icon = null;

        switch (value) {
          case 'valid':
            badgeClass = 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300';
            break;
          case 'expired':
            badgeClass = 'bg-gradient-to-r from-orange-100 to-orange-200 text-orange-800 border border-orange-300';
            break;
          case 'revoked':
            badgeClass = 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 border border-red-300';
            break;
          default:
            // fallback for boolean or other states
            if (value === true) badgeClass = 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300';
            else if (value === false) badgeClass = 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 border border-red-300';
            break;
        }

        return (
          <span className={`px-3 py-1.5 inline-flex text-xs leading-5 font-bold rounded-full shadow-sm w-20 justify-center text-center ${badgeClass}`}>
            {value ? (typeof value === 'string' ? value.charAt(0).toUpperCase() + value.slice(1) : (value ? 'Valid' : 'Invalid')) : 'N/A'}
          </span>
        );
      }
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
          <button
            onClick={() => handleDownload(row)}
            className="p-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:scale-110 transition-all duration-200 shadow-sm hover:shadow-md"
            title="Download Certificate"
          >
            <Download size={16} />
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

  const filterOptions = useMemo(() => [
    { value: 'all', label: 'All Status', filterFn: () => true },
    { value: 'valid', label: 'Valid', filterFn: (cert) => cert.status === 'valid' },
    { value: 'expired', label: 'Expired', filterFn: (cert) => cert.status === 'expired' },
    { value: 'revoked', label: 'Revoked', filterFn: (cert) => cert.status === 'revoked' },
  ], []);

  const handleStatusFilterChange = (e) => {
    setStatusFilter(e.target.value);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePerPageChange = (newPerPage) => {
    setPerPage(newPerPage);
    setCurrentPage(1); // Reset to first page when changing page size
  };

  return (
    <div>
      <DataTable
        columns={columns}
        data={certificates.filter(cert => {
          if (statusFilter === 'all') return true;
          return cert.status === statusFilter;
        })}
        isLoading={loading}
        searchable={true}
        searchPlaceholder="Search by certificate number, trainee name, or course..."
        filterable={false}
        sortable={false}
        onRowClick={handleRowClick}
        customFilters={
          <select
            id="statusFilter"
            value={statusFilter}
            onChange={handleStatusFilterChange}
            className="pagination-select border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white min-w-[140px] cursor-pointer hover:border-gray-400 transition-colors"
          >
            <option value="all">All Status</option>
            <option value="valid">Valid</option>
            <option value="expired">Expired</option>
            <option value="revoked">Revoked</option>
          </select>
        }
      />


      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalCertificates}
        perPage={perPage}
        onPageChange={handlePageChange}
        onPerPageChange={handlePerPageChange}
        showPerPageSelector={true}
        perPageOptions={[15, 25, 50, 100]}
        className="mt-6"
      />


      {/* Issue Certificate Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title="Issue Certificate"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="modal-form">
          {errors.general && (
            <div className="form-error-general">
              <p className="form-error-general-text">{errors.general}</p>
            </div>
          )}

          {/* Step 1: Select Class (Mandatory) */}
          <FormInput
            label="Class"
            name="class_id"
            type="select"
            value={formData.class_id}
            onChange={handleClassChange}
            disabled={loadingClasses}
            required
            options={
              loadingClasses
                ? [{ value: '', label: 'Loading classes...' }]
                : completedClasses.length > 0
                  ? [
                    { value: '', label: 'Select Class' },
                    ...completedClasses.map(cls => ({
                      value: cls.id.toString(),
                      label: cls.course?.name || cls.name || `Class ${cls.id} `
                    }))
                  ]
                  : [{ value: '', label: 'No classes available' }]
            }
            error={errors.class_id}
            helpText="Select a class to issue a certificate for"
          />

          {/* Student Information - Shown when Class is selected */}
          {formData.class_id && (
            <>
              <FormInput
                label="Trainee"
                name="trainee_id"
                type="select"
                value={formData.trainee_id}
                onChange={handleTraineeChange}
                required
                error={errors.trainee_id}
                helpText="Select a trainee from this class"
                options={
                  selectedClassTrainees.length > 0
                    ? [
                      { value: '', label: 'Select Trainee' },
                      ...selectedClassTrainees.map(trainee => ({
                        value: trainee.id.toString(),
                        label: `${trainee.first_name} ${trainee.last_name}${trainee.email ? ` (${trainee.email})` : ''} `
                      }))
                    ]
                    : [{ value: '', label: 'No trainees in this class' }]
                }
              />
              {errors.trainee_id_duplicate && (
                <div className="text-red-500 text-sm mt-1">
                  {errors.trainee_id_duplicate}
                </div>
              )}
            </>
          )}

          <div className="form-grid">
            <FormInput
              label="Issue Date"
              name="issue_date"
              type="date"
              value={formData.issue_date}
              onChange={handleChange}
              required
              error={errors.issue_date}
            />

            <FormInput
              label="Expiry Date (Optional)"
              name="expiry_date"
              type="date"
              value={formData.expiry_date}
              onChange={handleChange}
              error={errors.expiry_date}
              helpText="Must be after issue date"
            />
          </div>

          <div className="hidden">
            {/* Hidden fields to ensure state binding if needed for debugging, but mostly we just need the values in state */}
            <input type="hidden" name="acc_id" value={formData.acc_id} />
          </div>

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
              disabled={generating || !formData.class_id || !formData.trainee_id || !formData.issue_date}
              className="form-btn form-btn-submit"
            >
              {generating ? 'Generating...' : 'Issue Certificate'}
            </button>
          </div>
        </form>
      </Modal>

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
                { key: 'verification_code', label: 'Verification Code', icon: FileText },
                { key: 'trainee_name', label: 'Trainee Name', icon: User },
                { key: 'acc', label: 'Accreditation', icon: Building2, render: (value) => typeof value === 'object' ? value?.name || 'N/A' : value || 'N/A' },
                { key: 'course', label: 'Course', icon: BookOpen, render: (value) => typeof value === 'object' ? value?.name || 'N/A' : value || 'N/A' },
                { key: 'issue_date', label: 'Issue Date', icon: Calendar, render: (value) => formatDate(value) },
                { key: 'expiry_date', label: 'Expiry Date', icon: Calendar, render: (value) => formatDate(value) },
                { key: 'status', label: 'Status', type: 'status' },
                {
                  key: 'certificate_pdf_url',
                  label: 'Certificate File',
                  icon: Download,
                  render: (value) => (
                    <div className="flex gap-2">
                      {value && (
                        <a
                          href={value}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                        >
                          <Eye size={16} />
                          View Certificate
                        </a>
                      )}
                      <button
                        onClick={() => handleDownload(selectedCertificate)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <Download size={16} />
                        Download Certificate
                      </button>
                    </div>
                  )
                },
              ]}
            />
          </div>
        )}
      </Modal>
    </div >
  );
};

export default TrainingCenterCertificatesScreen;
