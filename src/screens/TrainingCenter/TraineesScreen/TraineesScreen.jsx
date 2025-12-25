import { useEffect, useState, useMemo } from 'react';
import { trainingCenterAPI } from '../../../services/api';
import { useHeader } from '../../../context/HeaderContext';
import { UserCheck, Plus, Edit, Trash2, Eye, Mail, Phone, Search, Filter, CheckCircle, Clock, XCircle, ChevronUp, ChevronDown, X, FileImage, BookOpen, Calendar } from 'lucide-react';
import Modal from '../../../components/Modal/Modal';
import ConfirmDialog from '../../../components/ConfirmDialog/ConfirmDialog';
import './TraineesScreen.css';
import FormInput from '../../../components/FormInput/FormInput';

const TraineesScreen = () => {
  const { setHeaderActions, setHeaderTitle, setHeaderSubtitle } = useHeader();
  const [trainees, setTrainees] = useState([]);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 15,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedTrainee, setSelectedTrainee] = useState(null);
  const [trainingClasses, setTrainingClasses] = useState([]);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    id_number: '',
    id_image: null,
    card_image: null,
    enrolled_classes: [],
    status: 'active',
  });
  const [idImagePreview, setIdImagePreview] = useState(null);
  const [cardImagePreview, setCardImagePreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  useEffect(() => {
    loadTrainees();
    loadTrainingClasses();
  }, []);

  useEffect(() => {
    setHeaderTitle('Trainees');
    setHeaderSubtitle('Manage your trainees');
    setHeaderActions(
      <button
        onClick={() => handleOpenModal()}
        className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 flex items-center transition-all duration-200 hover:scale-105"
      >
        <Plus size={20} className="mr-2" />
        Add Trainee
      </button>
    );
    return () => {
      setHeaderActions(null);
      setHeaderTitle(null);
      setHeaderSubtitle(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setHeaderActions, setHeaderTitle, setHeaderSubtitle]);

  const loadTrainees = async (page = 1) => {
    setLoading(true);
    try {
      const params = {
        page,
        per_page: 15,
        // Only send searchTerm to API, statusFilter is handled client-side
        ...(searchTerm && { search: searchTerm }),
      };
      const data = await trainingCenterAPI.listTrainees(params);
      if (data?.trainees) {
        setTrainees(data.trainees);
        setPagination(data.pagination || {
          current_page: page,
          last_page: 1,
          per_page: 15,
          total: data.trainees.length,
        });
      } else if (Array.isArray(data)) {
        setTrainees(data);
        setPagination({
          current_page: page,
          last_page: 1,
          per_page: 15,
          total: data.length,
        });
      } else {
        setTrainees([]);
      }
    } catch (error) {
      console.error('Failed to load trainees:', error);
      setTrainees([]);
    } finally {
      setLoading(false);
    }
  };

  const loadTrainingClasses = async () => {
    try {
      const data = await trainingCenterAPI.listClasses();
      const classes = data?.classes || data?.data || [];
      setTrainingClasses(classes);
    } catch (error) {
      console.error('Failed to load training classes:', error);
      setTrainingClasses([]);
    }
  };

  useEffect(() => {
    loadTrainees(1);
  }, [searchTerm]); // Only reload when searchTerm changes, statusFilter is client-side only

  const handleOpenModal = (trainee = null) => {
    if (trainee) {
      setSelectedTrainee(trainee);
      setFormData({
        first_name: trainee.first_name || '',
        last_name: trainee.last_name || '',
        email: trainee.email || '',
        phone: trainee.phone || '',
        id_number: trainee.id_number || '',
        id_image: null,
        card_image: null,
        enrolled_classes: trainee.training_classes?.map(tc => tc.id) || [],
        status: trainee.status || 'active',
      });
      setIdImagePreview(trainee.id_image_url || null);
      setCardImagePreview(trainee.card_image_url || null);
    } else {
      setSelectedTrainee(null);
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        id_number: '',
        id_image: null,
        card_image: null,
        enrolled_classes: [],
        status: 'active',
      });
      setIdImagePreview(null);
      setCardImagePreview(null);
    }
    setErrors({});
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTrainee(null);
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      id_number: '',
      id_image: null,
      card_image: null,
      enrolled_classes: [],
      status: 'active',
    });
    setIdImagePreview(null);
    setCardImagePreview(null);
    setErrors({});
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    setErrors({});
  };

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        setErrors({ [type]: 'File must be jpeg, jpg, png, or pdf' });
        return;
      }
      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        setErrors({ [type]: 'File size must be less than 10MB' });
        return;
      }
      setFormData({
        ...formData,
        [type]: file,
      });
      // Create preview for images
      if (type === 'id_image' && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setIdImagePreview(reader.result);
        };
        reader.readAsDataURL(file);
      } else if (type === 'card_image' && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setCardImagePreview(reader.result);
        };
        reader.readAsDataURL(file);
      }
      setErrors({});
    }
  };

  const handleClassToggle = (classId) => {
    setFormData(prev => {
      const enrolledClasses = prev.enrolled_classes || [];
      if (enrolledClasses.includes(classId)) {
        return { ...prev, enrolled_classes: enrolledClasses.filter(id => id !== classId) };
      } else {
        return { ...prev, enrolled_classes: [...enrolledClasses, classId] };
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});

    try {
      const submitFormData = new FormData();
      submitFormData.append('first_name', formData.first_name.trim());
      submitFormData.append('last_name', formData.last_name.trim());
      submitFormData.append('email', formData.email.trim());
      submitFormData.append('phone', formData.phone.trim());
      submitFormData.append('id_number', formData.id_number.trim());
      submitFormData.append('status', formData.status);

      // Only append files if they are new (File objects)
      if (formData.id_image instanceof File) {
        submitFormData.append('id_image', formData.id_image);
      }
      if (formData.card_image instanceof File) {
        submitFormData.append('card_image', formData.card_image);
      }

      // Append enrolled classes
      formData.enrolled_classes.forEach(classId => {
        submitFormData.append('enrolled_classes[]', classId);
      });

      if (selectedTrainee) {
        await trainingCenterAPI.updateTrainee(selectedTrainee.id, submitFormData);
      } else {
        await trainingCenterAPI.createTrainee(submitFormData);
      }
      await loadTrainees(pagination.current_page);
      handleCloseModal();
    } catch (error) {
      console.error('Error submitting trainee:', error);
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      } else if (error.response?.data?.message) {
        setErrors({ general: error.response.data.message });
      } else {
        setErrors({ general: error.message || 'Failed to save trainee' });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (trainee) => {
    setSelectedTrainee(trainee);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await trainingCenterAPI.deleteTrainee(selectedTrainee.id);
      await loadTrainees(pagination.current_page);
    } catch (error) {
      alert('Failed to delete trainee: ' + (error.message || 'Unknown error'));
    }
    setIsDeleteDialogOpen(false);
    setSelectedTrainee(null);
  };

  const handleViewDetails = async (trainee) => {
    try {
      const data = await trainingCenterAPI.getTraineeDetails(trainee.id);
      setSelectedTrainee(data.trainee);
      setDetailModalOpen(true);
    } catch (error) {
      console.error('Failed to load trainee details:', error);
      setSelectedTrainee(trainee);
      setDetailModalOpen(true);
    }
  };

  // Sort trainees
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Filter and sort trainees
  const filteredAndSortedTrainees = useMemo(() => {
    let filtered = [...trainees];

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(trainee => {
        const firstName = trainee.first_name || '';
        const lastName = trainee.last_name || '';
        const email = trainee.email || '';
        const phone = trainee.phone || '';
        const idNumber = trainee.id_number || '';
        const fullName = `${firstName} ${lastName}`.toLowerCase();
        return fullName.includes(term) || 
               email.toLowerCase().includes(term) ||
               phone.includes(term) ||
               idNumber.toLowerCase().includes(term);
      });
    }

    // Apply status filter (already done server-side, but keep for client-side filtering if needed)
    if (statusFilter !== 'all') {
      filtered = filtered.filter(trainee => trainee.status === statusFilter);
    }

    // Apply sorting
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aValue, bValue;
        
        if (sortConfig.key === 'name') {
          aValue = `${a.first_name || ''} ${a.last_name || ''}`.trim().toLowerCase();
          bValue = `${b.first_name || ''} ${b.last_name || ''}`.trim().toLowerCase();
        } else {
          aValue = a[sortConfig.key] || '';
          bValue = b[sortConfig.key] || '';
        }
        
        if (typeof aValue === 'string') {
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
    
    return filtered;
  }, [trainees, searchTerm, statusFilter, sortConfig]);

  // Calculate stats from all trainees (not filtered)
  const totalCount = trainees.length;
  const activeCount = trainees.filter(t => t.status === 'active').length;
  const inactiveCount = trainees.filter(t => t.status === 'inactive').length;
  const suspendedCount = trainees.filter(t => t.status === 'suspended').length;

  if (loading && trainees.length === 0) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;
  }

  return (
    <div className="space-y-4">

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div 
          onClick={() => setStatusFilter('all')}
          className={`bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl shadow-lg p-6 border border-primary-200 hover:shadow-xl transition-all duration-300 cursor-pointer ${
            statusFilter === 'all' ? 'ring-2 ring-primary-500' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-primary-700 mb-2">Total Trainees</p>
              <p className="text-3xl font-bold text-primary-900">{totalCount}</p>
            </div>
            <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg">
              <UserCheck className="text-white" size={32} />
            </div>
          </div>
        </div>

        <div 
          onClick={() => setStatusFilter('active')}
          className={`bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-lg p-6 border border-green-200 hover:shadow-xl transition-all duration-300 cursor-pointer ${
            statusFilter === 'active' ? 'ring-2 ring-green-500' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-700 mb-2">Active</p>
              <p className="text-3xl font-bold text-green-900">{activeCount}</p>
            </div>
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
              <CheckCircle className="text-white" size={32} />
            </div>
          </div>
        </div>

        <div 
          onClick={() => setStatusFilter('inactive')}
          className={`bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-all duration-300 cursor-pointer ${
            statusFilter === 'inactive' ? 'ring-2 ring-gray-500' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Inactive</p>
              <p className="text-3xl font-bold text-gray-900">{inactiveCount}</p>
            </div>
            <div className="w-16 h-16 bg-gradient-to-br from-gray-500 to-gray-600 rounded-xl flex items-center justify-center shadow-lg">
              <Clock className="text-white" size={32} />
            </div>
          </div>
        </div>

        <div 
          onClick={() => setStatusFilter('suspended')}
          className={`bg-gradient-to-br from-red-50 to-red-100 rounded-xl shadow-lg p-6 border border-red-200 hover:shadow-xl transition-all duration-300 cursor-pointer ${
            statusFilter === 'suspended' ? 'ring-2 ring-red-500' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-700 mb-2">Suspended</p>
              <p className="text-3xl font-bold text-red-900">{suspendedCount}</p>
            </div>
            <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
              <XCircle className="text-white" size={32} />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter Section */}
      <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-100">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by name, email, phone, or ID number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
            />
          </div>
          
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-10 pr-8 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none bg-white cursor-pointer transition-all"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
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
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-2">
                    Trainee
                    {sortConfig.key === 'name' && (
                      sortConfig.direction === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                    )}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-primary-700 transition-colors select-none"
                  onClick={() => handleSort('email')}
                >
                  <div className="flex items-center gap-2">
                    Email
                    {sortConfig.key === 'email' && (
                      sortConfig.direction === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                    )}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-primary-700 transition-colors select-none"
                  onClick={() => handleSort('phone')}
                >
                  <div className="flex items-center gap-2">
                    Phone
                    {sortConfig.key === 'phone' && (
                      sortConfig.direction === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                    )}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">ID Number</th>
                <th 
                  className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-primary-700 transition-colors select-none"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center justify-center gap-2">
                    Status
                    {sortConfig.key === 'status' && (
                      sortConfig.direction === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                    )}
                  </div>
                </th>
                <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider">Classes</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filteredAndSortedTrainees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <UserCheck className="text-gray-400" size={32} />
                      </div>
                      <p className="text-gray-500 font-medium">
                        {searchTerm || statusFilter !== 'all' ? 'No trainees found matching your search' : 'No trainees found'}
                      </p>
                      <p className="text-sm text-gray-400 mt-1">
                        {searchTerm || statusFilter !== 'all' ? 'Try adjusting your search criteria' : 'Add your first trainee to get started!'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAndSortedTrainees.map((trainee, index) => {
                  const statusConfig = {
                    active: { bg: 'from-green-100 to-green-200', text: 'text-green-800', border: 'border-green-300', icon: CheckCircle },
                    inactive: { bg: 'from-gray-100 to-gray-200', text: 'text-gray-800', border: 'border-gray-300', icon: Clock },
                    suspended: { bg: 'from-red-100 to-red-200', text: 'text-red-800', border: 'border-red-300', icon: XCircle },
                  };
                  const config = statusConfig[trainee.status] || statusConfig.inactive;
                  const StatusIcon = config.icon;
                  
                  return (
                    <tr
                      key={trainee.id || index}
                      className="hover:bg-gradient-to-r hover:from-primary-50/30 hover:to-white transition-all duration-200 cursor-pointer group table-row-animated"
                      onClick={() => handleViewDetails(trainee)}
                      style={{ '--animation-delay': `${index * 0.03}s` }}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg flex items-center justify-center mr-3 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                            <UserCheck className="h-5 w-5 text-primary-600" />
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-900 group-hover:text-primary-700 transition-colors">
                              {trainee.first_name} {trainee.last_name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-600">
                          <Mail className="h-4 w-4 mr-2 text-gray-400" />
                          {trainee.email}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {trainee.phone ? (
                          <div className="flex items-center text-sm text-gray-600">
                            <Phone className="h-4 w-4 mr-2 text-gray-400" />
                            {trainee.phone}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm text-gray-600">{trainee.id_number || 'N/A'}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <span className={`px-3 py-1.5 inline-flex items-center text-xs leading-5 font-bold rounded-full shadow-sm bg-gradient-to-r ${config.bg} ${config.text} border ${config.border}`}>
                          <StatusIcon size={14} className="mr-1" />
                          {trainee.status ? trainee.status.charAt(0).toUpperCase() + trainee.status.slice(1) : 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        {trainee.training_classes && trainee.training_classes.length > 0 ? (
                          <div className="flex items-center justify-center gap-1">
                            <BookOpen size={16} className="text-primary-600" />
                            <span className="text-sm text-gray-600">{trainee.training_classes.length}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">0</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenModal(trainee);
                            }}
                            className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 hover:scale-110 transition-all duration-200 shadow-sm hover:shadow-md"
                            title="Edit"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(trainee);
                            }}
                            className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 hover:scale-110 transition-all duration-200 shadow-sm hover:shadow-md"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination.last_page > 1 && (
        <div className="flex items-center justify-between bg-white rounded-xl shadow-lg p-4 border border-gray-100">
          <div className="text-sm text-gray-600">
            Showing {((pagination.current_page - 1) * pagination.per_page) + 1} to {Math.min(pagination.current_page * pagination.per_page, pagination.total)} of {pagination.total} trainees
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => loadTrainees(pagination.current_page - 1)}
              disabled={pagination.current_page === 1}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => loadTrainees(pagination.current_page + 1)}
              disabled={pagination.current_page === pagination.last_page}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={selectedTrainee ? 'Edit Trainee' : 'Add New Trainee'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="First Name"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              required
              error={errors.first_name}
            />

            <FormInput
              label="Last Name"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              required
              error={errors.last_name}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="Email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              error={errors.email}
            />

            <FormInput
              label="Phone"
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              required
              error={errors.phone}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="ID Number"
              name="id_number"
              value={formData.id_number}
              onChange={handleChange}
              required
              error={errors.id_number}
            />

            <FormInput
              label="Status"
              name="status"
              type="select"
              value={formData.status}
              onChange={handleChange}
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
                { value: 'suspended', label: 'Suspended' },
              ]}
              error={errors.status}
            />
          </div>

          {/* ID Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ID Image {!selectedTrainee && <span className="text-red-500">*</span>}
            </label>
            <div className="flex items-center gap-4">
              <label className="flex-1 cursor-pointer">
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,application/pdf"
                  onChange={(e) => handleFileChange(e, 'id_image')}
                  className="hidden"
                />
                <div className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center">
                  <FileImage size={20} className="mr-2 text-gray-600" />
                  <span className="text-sm text-gray-700">
                    {formData.id_image ? formData.id_image.name : selectedTrainee ? 'Change ID Image' : 'Choose ID Image'}
                  </span>
                </div>
              </label>
              {idImagePreview && (
                <div className="w-20 h-20 border border-gray-300 rounded-lg overflow-hidden">
                  <img src={idImagePreview} alt="ID Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
            <p className="mt-1 text-xs text-gray-500">Accepted: JPEG, JPG, PNG, PDF (Max 10MB)</p>
            {errors.id_image && (
              <p className="mt-1 text-sm text-red-600">{Array.isArray(errors.id_image) ? errors.id_image[0] : errors.id_image}</p>
            )}
          </div>

          {/* Card Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Card Image {!selectedTrainee && <span className="text-red-500">*</span>}
            </label>
            <div className="flex items-center gap-4">
              <label className="flex-1 cursor-pointer">
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,application/pdf"
                  onChange={(e) => handleFileChange(e, 'card_image')}
                  className="hidden"
                />
                <div className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center">
                  <FileImage size={20} className="mr-2 text-gray-600" />
                  <span className="text-sm text-gray-700">
                    {formData.card_image ? formData.card_image.name : selectedTrainee ? 'Change Card Image' : 'Choose Card Image'}
                  </span>
                </div>
              </label>
              {cardImagePreview && (
                <div className="w-20 h-20 border border-gray-300 rounded-lg overflow-hidden">
                  <img src={cardImagePreview} alt="Card Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
            <p className="mt-1 text-xs text-gray-500">Accepted: JPEG, JPG, PNG, PDF (Max 10MB)</p>
            {errors.card_image && (
              <p className="mt-1 text-sm text-red-600">{Array.isArray(errors.card_image) ? errors.card_image[0] : errors.card_image}</p>
            )}
          </div>

          {/* Enrolled Classes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enrolled Classes
            </label>
            {trainingClasses.length === 0 ? (
              <p className="text-sm text-gray-500">No training classes available</p>
            ) : (
              <div className="max-h-60 overflow-y-auto border border-gray-300 rounded-lg p-3 space-y-2">
                {trainingClasses.map(trainingClass => (
                  <label
                    key={trainingClass.id}
                    className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={formData.enrolled_classes?.includes(trainingClass.id) || false}
                      onChange={() => handleClassToggle(trainingClass.id)}
                      className="mr-3 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <div className="flex-1">
                      <span className="text-sm text-gray-900 font-medium">
                        {trainingClass.course?.name || trainingClass.name || `Class ${trainingClass.id}`}
                      </span>
                      {trainingClass.start_date && trainingClass.end_date && (
                        <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                          <Calendar size={12} />
                          {new Date(trainingClass.start_date).toLocaleDateString()} - {new Date(trainingClass.end_date).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            )}
            {errors.enrolled_classes && (
              <p className="mt-1 text-sm text-red-600">{Array.isArray(errors.enrolled_classes) ? errors.enrolled_classes[0] : errors.enrolled_classes}</p>
            )}
          </div>

          {errors.general && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600 font-medium">{errors.general}</p>
            </div>
          )}
          
          {/* Display field-specific errors */}
          {Object.keys(errors).filter(key => key !== 'general' && key !== 'id_image' && key !== 'card_image' && key !== 'enrolled_classes').map((key) => (
            errors[key] && (
              <p key={key} className="text-sm text-red-600">
                {key}: {Array.isArray(errors[key]) ? errors[key][0] : errors[key]}
              </p>
            )
          ))}

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
              {saving ? 'Saving...' : selectedTrainee ? 'Update Trainee' : 'Add Trainee'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Trainee Detail Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedTrainee(null);
        }}
        title="Trainee Details"
        size="lg"
      >
        {selectedTrainee && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">First Name</p>
                <p className="text-base font-semibold text-gray-900">{selectedTrainee.first_name || 'N/A'}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Last Name</p>
                <p className="text-base font-semibold text-gray-900">{selectedTrainee.last_name || 'N/A'}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1 flex items-center">
                  <Mail size={16} className="mr-2" />
                  Email
                </p>
                <p className="text-base font-semibold text-gray-900">{selectedTrainee.email || 'N/A'}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1 flex items-center">
                  <Phone size={16} className="mr-2" />
                  Phone
                </p>
                <p className="text-base font-semibold text-gray-900">{selectedTrainee.phone || 'N/A'}</p>
              </div>
              {selectedTrainee.id_number && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">ID Number</p>
                  <p className="text-base font-semibold text-gray-900">{selectedTrainee.id_number}</p>
                </div>
              )}
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Status</p>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                  selectedTrainee.status === 'active' ? 'bg-green-100 text-green-800' :
                  selectedTrainee.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                  selectedTrainee.status === 'suspended' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {selectedTrainee.status}
                </span>
              </div>
            </div>

            {/* ID and Card Images */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selectedTrainee.id_image_url && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-2">ID Image</p>
                  <a href={selectedTrainee.id_image_url} target="_blank" rel="noopener noreferrer" className="block">
                    <img src={selectedTrainee.id_image_url} alt="ID" className="w-full h-48 object-contain border border-gray-300 rounded-lg" />
                  </a>
                </div>
              )}
              {selectedTrainee.card_image_url && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-2">Card Image</p>
                  <a href={selectedTrainee.card_image_url} target="_blank" rel="noopener noreferrer" className="block">
                    <img src={selectedTrainee.card_image_url} alt="Card" className="w-full h-48 object-contain border border-gray-300 rounded-lg" />
                  </a>
                </div>
              )}
            </div>

            {/* Training Classes */}
            {selectedTrainee.training_classes && selectedTrainee.training_classes.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Enrolled Classes</h3>
                <div className="space-y-2">
                  {selectedTrainee.training_classes.map((tc, index) => (
                    <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {tc.course?.name || tc.name || `Class ${tc.id}`}
                          </p>
                          {tc.start_date && tc.end_date && (
                            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                              <Calendar size={12} />
                              {new Date(tc.start_date).toLocaleDateString()} - {new Date(tc.end_date).toLocaleDateString()}
                            </p>
                          )}
                          {tc.instructor && (
                            <p className="text-xs text-gray-500 mt-1">
                              Instructor: {tc.instructor.first_name} {tc.instructor.last_name}
                            </p>
                          )}
                        </div>
                        {tc.pivot?.status && (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            tc.pivot.status === 'enrolled' ? 'bg-blue-100 text-blue-800' :
                            tc.pivot.status === 'completed' ? 'bg-green-100 text-green-800' :
                            tc.pivot.status === 'dropped' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {tc.pivot.status}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setSelectedTrainee(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Trainee"
        message={`Are you sure you want to delete "${selectedTrainee?.first_name} ${selectedTrainee?.last_name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
};

export default TraineesScreen;

