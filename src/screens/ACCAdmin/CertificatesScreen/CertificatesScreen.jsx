import { useEffect, useState } from 'react';
import { accAPI } from '../../../services/api';
import { useHeader } from '../../../context/HeaderContext';
import { FileText, Plus, Award, Search, Filter, ChevronUp, ChevronDown } from 'lucide-react';
import Modal from '../../../components/Modal/Modal';
import FormInput from '../../../components/FormInput/FormInput';
import Pagination from '../../../components/Pagination/Pagination';
import './CertificatesScreen.css';

const CertificatesScreen = () => {
  const { setHeaderActions, setHeaderTitle, setHeaderSubtitle } = useHeader();
  const [certificates, setCertificates] = useState([]);
  const [sortedCertificates, setSortedCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
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
    trainee_name: '',
    course: '',
    issue_date: '',
    status: 'valid',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCertificates();
  }, [pagination.currentPage, pagination.perPage, searchTerm, statusFilter]);

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
        page: pagination.currentPage,
        per_page: pagination.perPage,
      };
      
      if (searchTerm) {
        params.search = searchTerm;
      }
      
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      
      const data = await accAPI.listCertificates(params);
      
      let certificatesArray = [];
      if (data.data) {
        certificatesArray = data.data || [];
        setPagination(prev => ({
          ...prev,
          totalPages: data.last_page || data.total_pages || 1,
          totalItems: data.total || 0,
        }));
      } else if (data.certificates) {
        certificatesArray = data.certificates || [];
        setPagination(prev => ({
          ...prev,
          totalPages: 1,
          totalItems: data.certificates?.length || 0,
        }));
      } else {
        certificatesArray = Array.isArray(data) ? data : [];
        setPagination(prev => ({
          ...prev,
          totalPages: 1,
          totalItems: certificatesArray.length,
        }));
      }
      
      setCertificates(certificatesArray);
      setSortedCertificates(certificatesArray);
    } catch (error) {
      console.error('Failed to load certificates:', error);
      setCertificates([]);
      setSortedCertificates([]);
    } finally {
      setLoading(false);
    }
  };

  // Sort handler
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Apply sorting (filtering is now done server-side via API)
  useEffect(() => {
    let sorted = [...certificates];

    // Apply sorting
    if (sortConfig.key) {
      sorted.sort((a, b) => {
        let aValue, bValue;
        
        if (sortConfig.key === 'certificate_number') {
          aValue = (a.certificate_number || '').toLowerCase();
          bValue = (b.certificate_number || '').toLowerCase();
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
        
        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    
    setSortedCertificates(sorted);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortConfig, certificates]);
  
  const handlePageChange = (page) => {
    setPagination(prev => ({ ...prev, currentPage: page }));
  };
  
  const handlePerPageChange = (perPage) => {
    setPagination(prev => ({ ...prev, perPage, currentPage: 1 }));
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
      // Reset to first page after creating
      setPagination(prev => ({ ...prev, currentPage: 1 }));
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


  return (
    <div>

      {/* Search and Filter Section */}
      <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-100 mb-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search Input */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by number, trainee, or course..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPagination(prev => ({ ...prev, currentPage: 1 }));
              }}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
            />
          </div>
          
          {/* Status Filter */}
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
              <option value="invalid">Invalid</option>
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
                    {sortConfig.key === 'certificate_number' && (
                      sortConfig.direction === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                    )}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-primary-700 transition-colors select-none"
                  onClick={() => handleSort('trainee_name')}
                >
                  <div className="flex items-center gap-2">
                    Trainee
                    {sortConfig.key === 'trainee_name' && (
                      sortConfig.direction === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                    )}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-primary-700 transition-colors select-none"
                  onClick={() => handleSort('course')}
                >
                  <div className="flex items-center gap-2">
                    Course
                    {sortConfig.key === 'course' && (
                      sortConfig.direction === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                    )}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-primary-700 transition-colors select-none"
                  onClick={() => handleSort('issue_date')}
                >
                  <div className="flex items-center gap-2">
                    Issue Date
                    {sortConfig.key === 'issue_date' && (
                      sortConfig.direction === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                    )}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-primary-700 transition-colors select-none"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center gap-2">
                    Status
                    {sortConfig.key === 'status' && (
                      sortConfig.direction === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                    )}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-primary-600"></div>
                    </div>
                  </td>
                </tr>
              ) : sortedCertificates.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <Award className="text-gray-400" size={32} />
                      </div>
                      <p className="text-gray-500 font-medium">No certificates found</p>
                      <p className="text-sm text-gray-400 mt-1">
                        {searchTerm || statusFilter !== 'all' ? 'Try adjusting your filters' : 'Create your first certificate!'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                sortedCertificates.map((cert, index) => (
                  <tr
                    key={cert.id || index}
                    className="table-row-animated hover:bg-gradient-to-r hover:from-primary-50/30 hover:to-white transition-all duration-200 cursor-pointer group"
                    style={{ '--animation-delay': `${index * 0.03}s` }}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg flex items-center justify-center mr-3 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                          <Award className="h-5 w-5 text-primary-600" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900 group-hover:text-primary-700 transition-colors">{cert.certificate_number || 'N/A'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">{cert.trainee_name || 'N/A'}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-700">{cert.course || 'N/A'}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {cert.issue_date ? new Date(cert.issue_date).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-3 py-1.5 inline-flex text-xs leading-5 font-bold rounded-full shadow-sm ${
                        cert.status === 'valid' ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300' :
                        'bg-gradient-to-r from-red-100 to-red-200 text-red-800 border border-red-300'
                      }`}>
                        {cert.status ? cert.status.charAt(0).toUpperCase() + cert.status.slice(1) : 'N/A'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {!loading && pagination.totalItems > 0 && (
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
