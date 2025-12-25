import { useEffect, useState } from 'react';
import { trainingCenterAPI } from '../../../services/api';
import { useHeader } from '../../../context/HeaderContext';
import { FileText, Plus, Eye, Download, Search, Filter, ChevronUp, ChevronDown, BookOpen, Calendar, User } from 'lucide-react';
import Modal from '../../../components/Modal/Modal';
import FormInput from '../../../components/FormInput/FormInput';
import Pagination from '../../../components/Pagination/Pagination';
import './CertificatesScreen.css';
import '../../../components/FormInput/FormInput.css';

const TrainingCenterCertificatesScreen = () => {
  const { setHeaderActions, setHeaderTitle, setHeaderSubtitle } = useHeader();
  const [certificates, setCertificates] = useState([]);
  const [sortedCertificates, setSortedCertificates] = useState([]);
  const [classes, setClasses] = useState([]);
  const [codes, setCodes] = useState([]);
  const [filteredCodes, setFilteredCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedCertificate, setSelectedCertificate] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [pagination, setPagination] = useState({
    currentPage: 1,
    perPage: 10,
    totalPages: 1,
    totalItems: 0,
  });
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
  }, [pagination.currentPage, pagination.perPage, searchTerm, statusFilter]);

  useEffect(() => {
    applySort();
  }, [certificates, sortConfig]);

  useEffect(() => {
    setHeaderTitle('Certificates');
    setHeaderSubtitle('Manage and generate training certificates');
    setHeaderActions(
      <button
        onClick={handleOpenModal}
        className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 flex items-center gap-2 transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-xl"
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
      const params = {
        page: pagination.currentPage,
        per_page: pagination.perPage,
      };
      
      if (searchTerm) {
        params.search = searchTerm;
      }
      
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      
      const [certData, classesData, codesData] = await Promise.all([
        trainingCenterAPI.listCertificates(params),
        trainingCenterAPI.listClasses(),
        trainingCenterAPI.getCodeInventory({ status: 'available' }),
      ]);
      
      let certificatesArray = [];
      if (certData.data) {
        certificatesArray = certData.data || [];
        setPagination(prev => ({
          ...prev,
          totalPages: certData.last_page || certData.total_pages || 1,
          totalItems: certData.total || 0,
        }));
      } else if (certData.certificates) {
        certificatesArray = certData.certificates || [];
        setPagination(prev => ({
          ...prev,
          totalPages: 1,
          totalItems: certData.certificates?.length || 0,
        }));
      } else {
        certificatesArray = Array.isArray(certData) ? certData : [];
        setPagination(prev => ({
          ...prev,
          totalPages: 1,
          totalItems: certificatesArray.length,
        }));
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
  
  const handlePageChange = (page) => {
    setPagination(prev => ({ ...prev, currentPage: page }));
  };
  
  const handlePerPageChange = (perPage) => {
    setPagination(prev => ({ ...prev, perPage, currentPage: 1 }));
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const applySort = () => {
    let sorted = [...certificates];

    // Apply sorting
    if (sortConfig.key) {
      sorted.sort((a, b) => {
        let aValue, bValue;
        
        if (sortConfig.key === 'course') {
          aValue = typeof a.course === 'object' ? (a.course?.name || '') : (a.course || '');
          bValue = typeof b.course === 'object' ? (b.course?.name || '') : (b.course || '');
        } else if (sortConfig.key === 'issue_date') {
          aValue = new Date(a.issue_date || 0);
          bValue = new Date(b.issue_date || 0);
        } else {
          aValue = a[sortConfig.key] || '';
          bValue = b[sortConfig.key] || '';
        }
        
        if (sortConfig.key === 'issue_date') {
          // Already Date objects
        } else if (typeof aValue === 'string') {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }
        
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    setSortedCertificates(sorted);
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
      setPagination(prev => ({ ...prev, currentPage: 1 }));
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

  const renderSortIcon = (key) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />;
    }
    return null;
  };

  return (
    <div>

      {/* Search and Filter Section */}
      <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-100 mb-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by certificate number, trainee name, course, or verification code..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPagination(prev => ({ ...prev, currentPage: 1 }));
              }}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPagination(prev => ({ ...prev, currentPage: 1 }));
              }}
              className="pl-10 pr-8 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none bg-white cursor-pointer transition-all"
            >
              <option value="all">All Status</option>
              <option value="valid">Valid</option>
              <option value="expired">Expired</option>
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
                  onClick={() => handleSort('certificate_number')}
                >
                  <div className="flex items-center gap-2">
                    Certificate Number
                    {renderSortIcon('certificate_number')}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-primary-700 transition-colors select-none"
                  onClick={() => handleSort('trainee_name')}
                >
                  <div className="flex items-center gap-2">
                    Trainee
                    {renderSortIcon('trainee_name')}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-primary-700 transition-colors select-none"
                  onClick={() => handleSort('course')}
                >
                  <div className="flex items-center gap-2">
                    Course
                    {renderSortIcon('course')}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-primary-700 transition-colors select-none"
                  onClick={() => handleSort('issue_date')}
                >
                  <div className="flex items-center gap-2">
                    Issue Date
                    {renderSortIcon('issue_date')}
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
                <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-primary-600"></div>
                    </div>
                  </td>
                </tr>
              ) : sortedCertificates.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <FileText className="text-gray-400" size={32} />
                      </div>
                      <p className="text-gray-500 font-medium">No certificates found</p>
                      <p className="text-sm text-gray-400 mt-1">
                        {searchTerm || statusFilter !== 'all' ? 'Try adjusting your filters' : 'Generate your first certificate!'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                sortedCertificates.map((cert, index) => (
                  <tr
                    key={cert.id || index}
                    className="hover:bg-gradient-to-r hover:from-primary-50/30 hover:to-white transition-all duration-200 cursor-pointer group table-row-animated"
                    style={{ '--animation-delay': `${index * 0.03}s` }}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg flex items-center justify-center mr-3 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                          <FileText className="h-5 w-5 text-primary-600" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900 group-hover:text-primary-700 transition-colors">
                            {cert.certificate_number || 'N/A'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <User className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">{cert.trainee_name || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <BookOpen className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">
                          {typeof cert.course === 'object' ? cert.course?.name || 'N/A' : cert.course || 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-600">
                          {cert.issue_date ? new Date(cert.issue_date).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-3 py-1.5 inline-flex text-xs leading-5 font-bold rounded-full shadow-sm ${
                        cert.status === 'valid' 
                          ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300'
                          : 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 border border-red-300'
                      }`}>
                        {cert.status ? cert.status.charAt(0).toUpperCase() + cert.status.slice(1) : 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewDetails(cert)}
                          className="text-primary-600 hover:text-primary-900 p-2 rounded hover:bg-primary-50 transition-all"
                          title="View Details"
                        >
                          <Eye size={18} />
                        </button>
                        {cert.certificate_pdf_url ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownload(cert);
                            }}
                            className="text-blue-600 hover:text-blue-900 p-2 rounded hover:bg-blue-50 transition-all"
                            title="Download PDF"
                          >
                            <Download size={18} />
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewDetails(cert);
                            }}
                            className="text-blue-600 hover:text-blue-900 p-2 rounded hover:bg-blue-50 transition-all"
                            title="View Info"
                          >
                            <FileText size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {!loading && pagination.totalItems > 0 && (
          <div className="px-4 py-4 border-t border-gray-200">
            <Pagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              totalItems={pagination.totalItems}
              perPage={pagination.perPage}
              onPageChange={handlePageChange}
              onPerPageChange={handlePerPageChange}
            />
          </div>
        )}
      </div>

      {/* Generate Certificate Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title="Generate Certificate"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.general && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{errors.general}</p>
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

          <div className="flex space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleCloseModal}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={generating}
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Certificate Number</p>
                <p className="text-base font-semibold text-gray-900">{selectedCertificate.certificate_number}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Verification Code</p>
                <p className="text-base font-semibold text-gray-900 font-mono">{selectedCertificate.verification_code || 'N/A'}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Trainee Name</p>
                <p className="text-base font-semibold text-gray-900">{selectedCertificate.trainee_name}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Course</p>
                <p className="text-base font-semibold text-gray-900">
                  {typeof selectedCertificate.course === 'object' ? selectedCertificate.course?.name : selectedCertificate.course}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Issue Date</p>
                <p className="text-base font-semibold text-gray-900">
                  {selectedCertificate.issue_date ? new Date(selectedCertificate.issue_date).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Expiry Date</p>
                <p className="text-base font-semibold text-gray-900">
                  {selectedCertificate.expiry_date ? new Date(selectedCertificate.expiry_date).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Status</p>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                  selectedCertificate.status === 'valid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {selectedCertificate.status}
                </span>
              </div>
            </div>
            {selectedCertificate.certificate_pdf_url && (
              <div className="flex space-x-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => handleDownload(selectedCertificate)}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center justify-center transition-colors"
                >
                  <Download size={20} className="mr-2" />
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