import { useEffect, useState, useMemo } from 'react';
import { adminAPI } from '../../../services/api';
import { useHeader } from '../../../context/HeaderContext';
import { Users, Mail, Phone, Building2, CheckCircle, Clock, XCircle, Eye, Edit, ClipboardList, Upload, FileText, X } from 'lucide-react';
import Modal from '../../../components/Modal/Modal';
import FormInput from '../../../components/FormInput/FormInput';
import Button from '../../../components/Button/Button';
import TabCard from '../../../components/TabCard/TabCard';
import TabCardsGrid from '../../../components/TabCardsGrid/TabCardsGrid';
import DataTable from '../../../components/DataTable/DataTable';
import PresentDataForm from '../../../components/PresentDataForm/PresentDataForm';
import LanguageSelector from '../../../components/LanguageSelector/LanguageSelector';
import './AllInstructorsScreen.css';

const AllInstructorsScreen = () => {
  const { setHeaderTitle, setHeaderSubtitle } = useHeader();
  const [allInstructors, setAllInstructors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedInstructor, setSelectedInstructor] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [saving, setSaving] = useState(false);
  const [cvFile, setCvFile] = useState(null);
  const [cvPreview, setCvPreview] = useState(null);
  const [instructorFormData, setInstructorFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    id_number: '',
    certificates_json: [],
    specializations: [],
    languages: [],
    status: 'active',
  });
  const [instructorErrors, setInstructorErrors] = useState({});

  useEffect(() => {
    setHeaderTitle('Instructors');
    setHeaderSubtitle('View and manage all instructors across all ACCs');
    return () => {
      setHeaderTitle(null);
      setHeaderSubtitle(null);
    };
  }, [setHeaderTitle, setHeaderSubtitle]);

  const loadInstructors = async () => {
    setLoading(true);
    try {
      const data = await adminAPI.listInstructors({ per_page: 1000 });
      let instructorsList = [];
      if (data.data) {
        instructorsList = data.data || [];
      } else if (data.instructors) {
        instructorsList = data.instructors || [];
      } else {
        instructorsList = Array.isArray(data) ? data : [];
      }
      setAllInstructors(instructorsList);
    } catch (error) {
      console.error('Failed to load instructors:', error);
      setAllInstructors([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInstructors();
  }, []);

  const handleViewDetails = async (instructor) => {
    setDetailLoading(true);
    setDetailModalOpen(true);
    try {
      const data = await adminAPI.getInstructorDetails(instructor.id);
      setSelectedInstructor(data.instructor);
    } catch (error) {
      console.error('Failed to load instructor details:', error);
      setSelectedInstructor(instructor);
      if (error.response?.status === 404) {
        alert('Instructor not found');
      }
    } finally {
      setDetailLoading(false);
    }
  };

  const handleEditInstructor = async (instructor) => {
    try {
      const data = await adminAPI.getInstructorDetails(instructor.id);
      const instData = data.instructor;
      setSelectedInstructor(instData);
      setInstructorFormData({
        first_name: instData.first_name || '',
        last_name: instData.last_name || '',
        email: instData.email || '',
        phone: instData.phone || '',
        id_number: instData.id_number || '',
        certificates_json: instData.certificates_json || [],
        specializations: instData.specializations || [],
        languages: instData.specializations || instData.languages || [], // Use specializations as languages
        status: instData.status || 'active',
      });
      setCvFile(null);
      setCvPreview(instData.cv_url || null);
      setInstructorErrors({});
      setEditModalOpen(true);
    } catch (error) {
      console.error('Failed to load instructor details:', error);
      alert('Failed to load instructor details');
    }
  };

  const handleInstructorFormChange = (e) => {
    const { name, value } = e.target;
    setInstructorFormData({
      ...instructorFormData,
      [name]: value,
    });
    setInstructorErrors({});
  };

  const handleCvFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      const allowedExtensions = ['.pdf', '.doc', '.docx'];
      const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
      
      if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
        setInstructorErrors({ cv_file: 'CV must be a PDF or DOC/DOCX file' });
        e.target.value = '';
        return;
      }
      
      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        setInstructorErrors({ cv_file: 'CV file size must not exceed 10MB' });
        e.target.value = '';
        return;
      }
      
      setCvFile(file);
      setCvPreview(URL.createObjectURL(file));
      
      // Clear error
      if (instructorErrors.cv_file) {
        setInstructorErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.cv_file;
          return newErrors;
        });
      }
    }
  };

  const handleRemoveCvFile = () => {
    setCvFile(null);
    setCvPreview(null);
    const fileInput = document.querySelector('input[name="cv_file"]');
    if (fileInput) fileInput.value = '';
  };

  const handleLanguagesChange = (languages) => {
    setInstructorFormData({
      ...instructorFormData,
      languages: Array.isArray(languages) ? languages : [],
    });
    setInstructorErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.languages;
      return newErrors;
    });
  };

  const handleSaveInstructor = async (e) => {
    e.preventDefault();
    setSaving(true);
    setInstructorErrors({});

    try {
      let dataToSend = { ...instructorFormData };
      
      // Use languages as specializations (since specializations is used for languages)
      const specializationsArray = Array.isArray(dataToSend.languages) 
        ? dataToSend.languages 
        : (dataToSend.languages ? dataToSend.languages.split(',').map(s => s.trim()).filter(s => s) : []);
      
      // If CV file is selected, use FormData
      if (cvFile) {
        const formData = new FormData();
        
        // Append basic fields
        if (dataToSend.first_name) formData.append('first_name', dataToSend.first_name);
        if (dataToSend.last_name) formData.append('last_name', dataToSend.last_name);
        if (dataToSend.email) formData.append('email', dataToSend.email);
        if (dataToSend.phone) formData.append('phone', dataToSend.phone);
        if (dataToSend.id_number) formData.append('id_number', dataToSend.id_number);
        if (dataToSend.status) formData.append('status', dataToSend.status);
        
        // Append certificates_json as JSON string (only if not empty)
        if (dataToSend.certificates_json && Array.isArray(dataToSend.certificates_json) && dataToSend.certificates_json.length > 0) {
          formData.append('certificates_json', JSON.stringify(dataToSend.certificates_json));
        } else if (dataToSend.certificates_json && !Array.isArray(dataToSend.certificates_json)) {
          formData.append('certificates_json', JSON.stringify(dataToSend.certificates_json));
        }
        
        // Append specializations as array (specializations[])
        if (specializationsArray.length > 0) {
          specializationsArray.forEach(spec => {
            formData.append('specializations[]', spec);
          });
        }
        
        formData.append('cv', cvFile);
        
        console.log('📡 [AllInstructorsScreen] Updating instructor with FormData');
        console.log('📦 [AllInstructorsScreen] FormData contents:');
        for (const [key, value] of formData.entries()) {
          if (value instanceof File) {
            console.log(`  📄 ${key}: File(${value.name}, ${value.size} bytes, ${value.type})`);
          } else {
            console.log(`  📝 ${key}:`, value);
          }
        }
        console.log('📦 [AllInstructorsScreen] Specializations:', specializationsArray);
        await adminAPI.updateInstructor(selectedInstructor.id, formData);
      } else {
        // Use JSON object (no file upload)
        const formattedData = {
          first_name: dataToSend.first_name,
          last_name: dataToSend.last_name,
          email: dataToSend.email,
          phone: dataToSend.phone || null,
          id_number: dataToSend.id_number || null,
          status: dataToSend.status,
          specializations: specializationsArray, // Send as array, not JSON string
        };
        
        // Only include certificates_json if it's not empty
        if (dataToSend.certificates_json && Array.isArray(dataToSend.certificates_json) && dataToSend.certificates_json.length > 0) {
          formattedData.certificates_json = dataToSend.certificates_json;
        } else if (dataToSend.certificates_json && !Array.isArray(dataToSend.certificates_json)) {
          formattedData.certificates_json = dataToSend.certificates_json;
        }
        
        console.log('📡 [AllInstructorsScreen] Updating instructor with JSON');
        console.log('📦 [AllInstructorsScreen] Formatted data:', formattedData);
        await adminAPI.updateInstructor(selectedInstructor.id, formattedData);
      }
      
      await loadInstructors();
      setEditModalOpen(false);
      setSelectedInstructor(null);
      setCvFile(null);
      setCvPreview(null);
      alert('Instructor updated successfully!');
    } catch (error) {
      console.error('❌ [AllInstructorsScreen] Failed to update instructor:', error);
      console.error('❌ [AllInstructorsScreen] Error response:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      
      if (error.response?.data?.errors) {
        console.error('❌ [AllInstructorsScreen] Validation errors:', error.response.data.errors);
        setInstructorErrors(error.response.data.errors);
      } else if (error.response?.data?.message) {
        setInstructorErrors({ general: error.response.data.message });
      } else {
        setInstructorErrors({ general: error.message || 'Failed to update instructor' });
      }
    } finally {
      setSaving(false);
    }
  };

  // Client-side filtering
  const filteredInstructors = useMemo(() => {
    let filtered = [...allInstructors];

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(i => i.status === statusFilter);
    }

    // Add search text for DataTable search
    return filtered.map(instructor => {
      const trainingCenterName = instructor.training_center 
        ? (typeof instructor.training_center === 'string' ? instructor.training_center : instructor.training_center.name)
        : '';
      return {
        ...instructor,
        _searchText: `${instructor.first_name || ''} ${instructor.last_name || ''} ${instructor.email || ''} ${trainingCenterName}`.toLowerCase()
      };
    });
  }, [allInstructors, statusFilter]);

  // Calculate stats from all instructors
  const totalCount = allInstructors.length;
  const activeCount = allInstructors.filter(i => i.status === 'active').length;
  const pendingCount = allInstructors.filter(i => i.status === 'pending').length;
  const suspendedCount = allInstructors.filter(i => i.status === 'suspended').length;

  // DataTable columns
  const columns = useMemo(() => [
    {
      header: 'Instructor',
      accessor: 'name',
      sortable: true,
      render: (value, row) => (
        <div className="flex items-center">
          <div className="w-10 h-10 mr-3 relative">
            {row.photo_url ? (
              <>
                <img 
                  src={row.photo_url} 
                  alt={`${row.first_name} ${row.last_name}` || 'Instructor Photo'} 
                  className="w-10 h-10 rounded-lg object-cover border border-gray-200"
                  width="40"
                  height="40"
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    const fallback = e.target.parentElement?.querySelector('.photo-fallback');
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
                <div 
                  className="photo-fallback w-10 h-10 bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg items-center justify-center hidden"
                  style={{ display: 'none', position: 'absolute', top: 0, left: 0 }}
                >
                  <Users className="h-5 w-5 text-primary-600" />
                </div>
              </>
            ) : (
              <div className="w-10 h-10 bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg flex items-center justify-center">
            <Users className="h-5 w-5 text-primary-600" />
              </div>
            )}
          </div>
          <div>
            <div className="font-medium text-gray-900">
              {row.first_name} {row.last_name}
            </div>
            {row.id_number && (
              <div className="text-xs text-gray-500">ID: {row.id_number}</div>
            )}
          </div>
        </div>
      )
    },
    {
      header: 'Email',
      accessor: 'email',
      sortable: true,
      render: (value) => (
        <div className="flex items-center text-sm text-gray-600">
          <Mail className="h-4 w-4 mr-2 text-gray-400" />
          {value || 'N/A'}
        </div>
      )
    },
    {
      header: 'Phone',
      accessor: 'phone',
      sortable: true,
      render: (value) => (
        value ? (
          <div className="flex items-center text-sm text-gray-600">
            <Phone className="h-4 w-4 mr-2 text-gray-400" />
            {value}
          </div>
        ) : (
          <span className="text-sm text-gray-400">N/A</span>
        )
      )
    },
    {
      header: 'Training Center',
      accessor: 'training_center',
      sortable: true,
      render: (value) => {
        const trainingCenterName = value 
          ? (typeof value === 'string' ? value : value.name)
          : 'N/A';
        return (
          <div className="flex items-center text-sm text-gray-600">
            <Building2 className="h-4 w-4 mr-2 text-gray-400" />
            {trainingCenterName}
          </div>
        );
      }
    },
    {
      header: 'Status',
      accessor: 'status',
      sortable: true,
      render: (value) => {
        const statusConfig = {
          active: { 
            badgeClass: 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300',
            icon: CheckCircle 
          },
          pending: { 
            badgeClass: 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 border border-yellow-300',
            icon: Clock 
          },
          suspended: { 
            badgeClass: 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 border border-red-300',
            icon: XCircle 
          },
          inactive: { 
            badgeClass: 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300',
            icon: Clock 
          }
        };
        const config = statusConfig[value] || statusConfig.pending;
        const Icon = config.icon;
        return (
          <span className={`px-3 py-1.5 inline-flex items-center text-xs leading-5 font-bold rounded-full shadow-sm ${config.badgeClass}`}>
            <Icon size={12} className="mr-1" />
            {value ? value.charAt(0).toUpperCase() + value.slice(1) : 'N/A'}
          </span>
        );
      }
    }
  ], []);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;
  }

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <TabCardsGrid columns={{ mobile: 1, tablet: 2, desktop: 4 }}>
        <TabCard
          name="Total"
          value={totalCount}
          icon={ClipboardList}
          colorType="indigo"
          isActive={statusFilter === 'all'}
          onClick={() => setStatusFilter('all')}
        />
        <TabCard
          name="Active"
          value={activeCount}
          icon={CheckCircle}
          colorType="green"
          isActive={statusFilter === 'active'}
          onClick={() => setStatusFilter('active')}
        />
        <TabCard
          name="Pending"
          value={pendingCount}
          icon={Clock}
          colorType="yellow"
          isActive={statusFilter === 'pending'}
          onClick={() => setStatusFilter('pending')}
        />
        <TabCard
          name="Suspended"
          value={suspendedCount}
          icon={XCircle}
          colorType="red"
          isActive={statusFilter === 'suspended'}
          onClick={() => setStatusFilter('suspended')}
        />
      </TabCardsGrid>

      {/* DataTable */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100">
        <DataTable
          columns={columns}
          data={filteredInstructors}
          onView={handleViewDetails}
          onRowClick={handleViewDetails}
          onEdit={handleEditInstructor}
          isLoading={loading}
          emptyMessage="No instructors found"
          searchable={true}
          filterable={false}
          searchPlaceholder="Search by name, email, or training center..."
        />
      </div>

      {/* Instructor Detail Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedInstructor(null);
        }}
        title="Instructor Details"
        size="lg"
      >
        <div className="space-y-6">
          <PresentDataForm
            data={selectedInstructor}
            isLoading={detailLoading}
            emptyMessage="No instructor data available"
          />
          {selectedInstructor && (
            <div className="flex space-x-3 pt-4 border-t border-gray-200">
              <Button
                variant="outline"
                fullWidth
                icon={<Edit size={20} />}
                onClick={() => {
                  setDetailModalOpen(false);
                  handleEditInstructor(selectedInstructor);
                }}
              >
                Edit Instructor
              </Button>
            </div>
          )}
        </div>
      </Modal>

      {/* Edit Instructor Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedInstructor(null);
          setInstructorFormData({
            first_name: '',
            last_name: '',
            email: '',
            phone: '',
            id_number: '',
            certificates_json: [],
            specializations: [],
            languages: [],
            status: 'active',
          });
          setCvFile(null);
          setCvPreview(null);
          setInstructorErrors({});
        }}
        title={`Edit Instructor: ${selectedInstructor?.first_name} ${selectedInstructor?.last_name}`}
        size="lg"
      >
        <form onSubmit={handleSaveInstructor} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="First Name"
              name="first_name"
              value={instructorFormData.first_name}
              onChange={handleInstructorFormChange}
              error={instructorErrors.first_name}
            />
            <FormInput
              label="Last Name"
              name="last_name"
              value={instructorFormData.last_name}
              onChange={handleInstructorFormChange}
              error={instructorErrors.last_name}
            />
            <FormInput
              label="Email"
              name="email"
              type="email"
              value={instructorFormData.email}
              onChange={handleInstructorFormChange}
              error={instructorErrors.email}
            />
            <FormInput
              label="Phone"
              name="phone"
              value={instructorFormData.phone}
              onChange={handleInstructorFormChange}
              error={instructorErrors.phone}
            />
            <FormInput
              label="ID Number"
              name="id_number"
              value={instructorFormData.id_number}
              onChange={handleInstructorFormChange}
              error={instructorErrors.id_number}
            />
            
            {/* CV File Upload */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                CV Document (PDF or DOC/DOCX)
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-primary-400 transition-colors">
                {cvPreview || selectedInstructor?.cv_url ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                        <FileText className="text-primary-600" size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {cvFile ? cvFile.name : 'Current CV'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {cvFile ? `${(cvFile.size / 1024 / 1024).toFixed(2)} MB` : 'Click to replace'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {(cvPreview || selectedInstructor?.cv_url) && !cvFile && (
                        <a
                          href={selectedInstructor?.cv_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 text-sm text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        >
                          View
                        </a>
                      )}
                      <label className="cursor-pointer px-3 py-1.5 text-sm text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                        Replace
                        <input
                          type="file"
                          name="cv_file"
                          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                          onChange={handleCvFileChange}
                          className="hidden"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={handleRemoveCvFile}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-3">
                      <Upload className="text-gray-400" size={24} />
                    </div>
                    <span className="text-sm font-medium text-gray-700">Click to upload CV</span>
                    <span className="text-xs text-gray-500 mt-1">PDF, DOC, or DOCX (Max 10MB)</span>
                    <input
                      type="file"
                      name="cv_file"
                      accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      onChange={handleCvFileChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
              {instructorErrors.cv_file && (
                <p className="mt-1 text-sm text-red-600">{instructorErrors.cv_file}</p>
              )}
            </div>

            <FormInput
              label="Status"
              name="status"
              type="select"
              value={instructorFormData.status}
              onChange={handleInstructorFormChange}
              options={[
                { value: 'pending', label: 'Pending' },
                { value: 'active', label: 'Active' },
                { value: 'suspended', label: 'Suspended' },
                { value: 'inactive', label: 'Inactive' },
              ]}
              error={instructorErrors.status}
            />
            <div className="md:col-span-2">
              <LanguageSelector
                value={instructorFormData.languages || []}
                onChange={handleLanguagesChange}
                label="Languages"
                error={instructorErrors.languages || instructorErrors.specializations}
                disabled={false}
                placeholder="Select a language..."
                useAPI={false}
              />
            </div>
          </div>

          {instructorErrors.general && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600 font-medium">{instructorErrors.general}</p>
            </div>
          )}

          <div className="flex space-x-3 pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              fullWidth
              onClick={() => {
                setEditModalOpen(false);
                setSelectedInstructor(null);
                setInstructorErrors({});
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              fullWidth
              type="submit"
              disabled={saving}
              loading={saving}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AllInstructorsScreen;
