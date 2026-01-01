import { useEffect, useState, useMemo } from 'react';
import { accAPI } from '../../../services/api';
import { useHeader } from '../../../context/HeaderContext';
import { Plus, Award } from 'lucide-react';
import Modal from '../../../components/Modal/Modal';
import FormInput from '../../../components/FormInput/FormInput';
import DataTable from '../../../components/DataTable/DataTable';
import './CertificatesScreen.css';

const CertificatesScreen = () => {
  const { setHeaderActions, setHeaderTitle, setHeaderSubtitle } = useHeader();
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    trainee_name: '',
    course: '',
    issue_date: '',
    status: 'valid',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCertificates();
  }, []);

  useEffect(() => {
    setHeaderTitle('Certificates');
    setHeaderSubtitle('View and manage all generated certificates');
    setHeaderActions(
      <button
        onClick={handleOpenModal}
        className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 flex items-center gap-2 transition-colors shadow-lg hover:shadow-xl"
      >
        <Plus size={20} />
        Create New Certificate
      </button>
    );
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
        per_page: 1000, // Load all data
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
      certificatesArray = certificatesArray.map(cert => ({
        ...cert,
        _searchText: [
          cert.certificate_number,
          cert.trainee_name,
          cert.course,
          cert.status
        ].filter(Boolean).join(' ').toLowerCase()
      }));
      
      setCertificates(certificatesArray);
    } catch (error) {
      console.error('Failed to load certificates:', error);
      setCertificates([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = () => {
    setFormData({
      trainee_name: '',
      course: '',
      issue_date: new Date().toISOString().split('T')[0],
      status: 'valid',
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormData({
      trainee_name: '',
      course: '',
      issue_date: '',
      status: 'valid',
    });
    setErrors({});
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setErrors({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});

    try {
      await accAPI.createCertificate(formData);
      await loadCertificates();
      handleCloseModal();
    } catch (error) {
      if (error.errors) {
        setErrors(error.errors);
      } else {
        setErrors({ general: error.message || 'Failed to create certificate' });
      }
    } finally {
      setSaving(false);
    }
  };

  // Format date helper
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
      render: (value) => (
        <div className="text-sm text-gray-700">
          {value || 'N/A'}
        </div>
      )
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
        <span className={`px-3 py-1.5 inline-flex text-xs leading-5 font-bold rounded-full shadow-sm ${
          value === 'valid' ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300' :
          'bg-gradient-to-r from-red-100 to-red-200 text-red-800 border border-red-300'
        }`}>
          {value ? value.charAt(0).toUpperCase() + value.slice(1) : 'N/A'}
        </span>
      )
    }
  ], []);

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
        searchPlaceholder="Search by number, trainee, or course..."
        filterable={true}
        filterOptions={filterOptions}
        defaultFilter="all"
        sortable={true}
        emptyMessage="No certificates found. Create your first certificate!"
      />

      {/* Create Certificate Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title="Create New Certificate"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="Trainee Name"
              name="trainee_name"
              value={formData.trainee_name}
              onChange={handleChange}
              required
              error={errors.trainee_name}
            />

            <FormInput
              label="Course"
              name="course"
              value={formData.course}
              onChange={handleChange}
              required
              error={errors.course}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              label="Status"
              name="status"
              type="select"
              value={formData.status}
              onChange={handleChange}
              options={[
                { value: 'valid', label: 'Valid' },
                { value: 'invalid', label: 'Invalid' },
              ]}
              error={errors.status}
            />
          </div>

          {errors.general && (
            <p className="text-sm text-red-600">{errors.general}</p>
          )}

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={handleCloseModal}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Creating...' : 'Create Certificate'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default CertificatesScreen;
