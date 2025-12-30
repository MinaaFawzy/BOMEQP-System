import { useEffect, useState, useMemo } from 'react';
import { trainingCenterAPI } from '../../../services/api';
import { useHeader } from '../../../context/HeaderContext';
import { Building2, Send, Eye, CheckCircle, Clock, XCircle, Plus, Trash2, FileText, Upload, Loader, Mail, Search, ChevronUp, ChevronDown, MessageSquare, Download } from 'lucide-react';
import Modal from '../../../components/Modal/Modal';
import FormInput from '../../../components/FormInput/FormInput';
import Pagination from '../../../components/Pagination/Pagination';
import { validateFile, validateArray, validateMaxLength } from '../../../utils/validation';
import './ACCsScreen.css';

const ACCsScreen = () => {
  const { setHeaderTitle, setHeaderSubtitle } = useHeader();
  const [allAccs, setAllAccs] = useState([]);
  const [allAuthorizations, setAllAuthorizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('available');
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({
    currentPage: 1,
    perPage: 10,
    totalPages: 1,
    totalItems: 0,
  });
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedACC, setSelectedACC] = useState(null);
  const [selectedAuthorization, setSelectedAuthorization] = useState(null);
  const [authDetailModalOpen, setAuthDetailModalOpen] = useState(false);
  const [requestForm, setRequestForm] = useState({
    documents: [],
    additional_info: '',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [accSortConfig, setAccSortConfig] = useState({ key: null, direction: 'asc' });
  const [authSortConfig, setAuthSortConfig] = useState({ key: null, direction: 'asc' });

  useEffect(() => {
    loadAllData();
  }, [searchTerm]); // Load all data once, pagination and activeTab are handled client-side

  useEffect(() => {
    setHeaderTitle('Accreditation Bodies');
    setHeaderSubtitle('Browse and request authorization from Accreditation Bodies');
    return () => {
      setHeaderTitle(null);
      setHeaderSubtitle(null);
    };
  }, [setHeaderTitle, setHeaderSubtitle]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      
      const params = {
        page: pagination.currentPage,
        per_page: pagination.perPage,
      };
      
      // Only send searchTerm to API if provided
      if (searchTerm) {
        params.search = searchTerm;
      }
      
      // Load both datasets in parallel
      const [accsResult, authResult] = await Promise.allSettled([
        trainingCenterAPI.listACCs(params),
        trainingCenterAPI.getAuthorizationStatus(params)
      ]);

      if (accsResult.status === 'fulfilled') {
        const accsData = accsResult.value;
        let accsArray = [];
        if (accsData?.data) {
          accsArray = Array.isArray(accsData.data) ? accsData.data : [];
        } else if (accsData?.accs) {
          accsArray = Array.isArray(accsData.accs) ? accsData.accs : [];
        } else if (Array.isArray(accsData)) {
          accsArray = accsData;
        }
        setAllAccs(accsArray);
      }

      if (authResult.status === 'fulfilled') {
        const authData = authResult.value;
        let authArray = [];
        if (authData?.data) {
          authArray = Array.isArray(authData.data) ? authData.data : [];
        } else if (authData?.authorizations) {
          authArray = Array.isArray(authData.authorizations) ? authData.authorizations : [];
        } else if (Array.isArray(authData)) {
          authArray = authData;
        }
        setAllAuthorizations(authArray);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
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

  // Sort handlers
  const handleAccSort = (key) => {
    let direction = 'asc';
    if (accSortConfig.key === key && accSortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setAccSortConfig({ key, direction });
  };

  const handleAuthSort = (key) => {
    let direction = 'asc';
    if (authSortConfig.key === key && authSortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setAuthSortConfig({ key, direction });
  };

  // Filter and sort ACCs client-side
  const filteredAccs = useMemo(() => {
    let filtered = [...allAccs];
    
    // Apply search filter (if searchTerm is not sent to API)
    // Note: If searchTerm is sent to API, filtering is already done server-side
    // But we keep client-side filtering as fallback
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(acc => {
        const name = (acc.name || '').toLowerCase();
        const email = (acc.email || '').toLowerCase();
        const country = (acc.country || '').toLowerCase();
        return name.includes(term) || email.includes(term) || country.includes(term);
      });
    }
    
    // Apply sorting
    if (accSortConfig.key) {
      filtered.sort((a, b) => {
        let aValue, bValue;
        
        if (accSortConfig.key === 'name') {
          aValue = (a.name || '').toLowerCase();
          bValue = (b.name || '').toLowerCase();
        } else if (accSortConfig.key === 'email') {
          aValue = (a.email || '').toLowerCase();
          bValue = (b.email || '').toLowerCase();
        } else if (accSortConfig.key === 'country') {
          aValue = (a.country || '').toLowerCase();
          bValue = (b.country || '').toLowerCase();
        } else {
          aValue = a[accSortConfig.key] || '';
          bValue = b[accSortConfig.key] || '';
        }
        
        if (typeof aValue === 'string') {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }
        
        if (aValue < bValue) {
          return accSortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return accSortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    
    return filtered;
  }, [allAccs, searchTerm, accSortConfig]);

  // Filter and sort authorizations client-side
  const filteredAuthorizations = useMemo(() => {
    let filtered = [...allAuthorizations];
    
    // Apply search filter (if searchTerm is not sent to API)
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(auth => {
        const accName = (auth.acc?.name || '').toLowerCase();
        const accEmail = (auth.acc?.email || '').toLowerCase();
        const status = (auth.status || '').toLowerCase();
        return accName.includes(term) || accEmail.includes(term) || status.includes(term);
      });
    }
    
    // Apply sorting
    if (authSortConfig.key) {
      filtered.sort((a, b) => {
        let aValue, bValue;
        
        if (authSortConfig.key === 'acc_name') {
          aValue = (a.acc?.name || '').toLowerCase();
          bValue = (b.acc?.name || '').toLowerCase();
        } else if (authSortConfig.key === 'email') {
          aValue = (a.acc?.email || '').toLowerCase();
          bValue = (b.acc?.email || '').toLowerCase();
        } else if (authSortConfig.key === 'country') {
          aValue = (a.acc?.country || '').toLowerCase();
          bValue = (b.acc?.country || '').toLowerCase();
        } else if (authSortConfig.key === 'status') {
          aValue = (a.status || '').toLowerCase();
          bValue = (b.status || '').toLowerCase();
        } else if (authSortConfig.key === 'request_date') {
          aValue = a.request_date ? new Date(a.request_date).getTime() : 0;
          bValue = b.request_date ? new Date(b.request_date).getTime() : 0;
        } else if (authSortConfig.key === 'reviewed_at') {
          aValue = a.reviewed_at ? new Date(a.reviewed_at).getTime() : 0;
          bValue = b.reviewed_at ? new Date(b.reviewed_at).getTime() : 0;
        } else {
          aValue = a[authSortConfig.key] || '';
          bValue = b[authSortConfig.key] || '';
        }
        
        if (authSortConfig.key === 'request_date' || authSortConfig.key === 'reviewed_at') {
          // Already numbers
        } else if (typeof aValue === 'string') {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }
        
        if (aValue < bValue) {
          return authSortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return authSortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    
    return filtered;
  }, [allAuthorizations, searchTerm, authSortConfig]);

  // Paginate filtered data client-side
  const paginatedAccs = useMemo(() => {
    const start = (pagination.currentPage - 1) * pagination.perPage;
    const end = start + pagination.perPage;
    return filteredAccs.slice(start, end);
  }, [filteredAccs, pagination.currentPage, pagination.perPage]);

  const paginatedAuthorizations = useMemo(() => {
    const start = (pagination.currentPage - 1) * pagination.perPage;
    const end = start + pagination.perPage;
    return filteredAuthorizations.slice(start, end);
  }, [filteredAuthorizations, pagination.currentPage, pagination.perPage]);

  // Update pagination totals based on filtered data
  useEffect(() => {
    const totalItems = activeTab === 'available' ? filteredAccs.length : filteredAuthorizations.length;
    const totalPages = Math.ceil(totalItems / pagination.perPage) || 1;
    setPagination(prev => ({
      ...prev,
      totalItems,
      totalPages,
      currentPage: prev.currentPage > totalPages ? 1 : prev.currentPage,
    }));
  }, [filteredAccs.length, filteredAuthorizations.length, activeTab, pagination.perPage]);

  const handleRequestAuth = (acc) => {
    setSelectedACC(acc);
    setRequestForm({
      documents: [],
      additional_info: '',
    });
    setErrors({});
    setRequestModalOpen(true);
  };

  const validateRequestForm = () => {
    const newErrors = {};

    // Validate documents
    if (requestForm.documents.length === 0) {
      newErrors.general = 'Please upload at least one document';
      return newErrors;
    }

    // Validate each document
    requestForm.documents.forEach((doc, index) => {
      // Validate document type
      if (!doc.type || doc.type.trim() === '') {
        newErrors[`documents.${index}.type`] = 'Document type is required';
      }

      // Validate document file
      if (!doc.file) {
        newErrors[`documents.${index}.file`] = 'Please upload a file';
      } else {
        const fileError = validateFile(doc.file, {
          required: true,
          maxSize: 10 * 1024 * 1024, // 10MB
          allowedTypes: [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'image/jpeg',
            'image/jpg',
            'image/png'
          ],
          fieldName: 'Document file'
        });
        if (fileError) {
          newErrors[`documents.${index}.file`] = fileError;
        }
      }
    });

    // Validate additional info (optional but if provided, check max length)
    if (requestForm.additional_info) {
      const additionalInfoError = validateMaxLength(
        requestForm.additional_info,
        5000,
        'Additional information'
      );
      if (additionalInfoError) {
        newErrors.additional_info = additionalInfoError;
      }
    }

    return newErrors;
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    
    // Validate form
    const validationErrors = validateRequestForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    setSubmitting(true);
    setErrors({});

    try {
      const formData = new FormData();
      
      requestForm.documents.forEach((doc, index) => {
        formData.append(`documents[${index}][type]`, doc.type);
        formData.append(`documents[${index}][file]`, doc.file);
      });
      
      if (requestForm.additional_info) {
        formData.append('additional_info', requestForm.additional_info);
      }
      
      const response = await trainingCenterAPI.requestAuthorization(selectedACC.id, formData);
      
      await loadAllData();
      setRequestModalOpen(false);
      setRequestForm({
        documents: [],
        additional_info: '',
      });
      alert('Authorization request submitted successfully!');
    } catch (error) {
      if (error.response) {
        const status = error.response.status;
        const errorData = error.response.data;
        
        if (status === 400 && (errorData.message?.includes('already exists') || errorData.message?.includes('already been submitted'))) {
          setErrors({ general: 'An authorization request for this ACC already exists. Please check your existing authorizations.' });
        }
        else if (status === 422 && (errorData.message?.includes('No valid documents') || errorData.message?.includes('documents uploaded'))) {
          setErrors({ 
            general: 'No valid documents uploaded. Please ensure files are uploaded correctly.',
            hint: 'Use FormData with structure: documents[0][type]=license&documents[0][file]=<file>'
          });
        }
        else if (status === 422 && errorData.errors) {
          setErrors(errorData.errors);
        }
        else if (status === 422 && errorData.message) {
          setErrors({ general: errorData.message });
        }
        else if (status === 500) {
          setErrors({ general: 'Server error occurred. Please try again later or contact support if the problem persists.' });
        }
        else if (errorData.message) {
          setErrors({ general: errorData.message });
        } else {
          setErrors({ general: 'Failed to submit request. Please try again.' });
        }
      } else if (error.errors) {
        setErrors(error.errors);
      } else if (error.message) {
        setErrors({ general: error.message || 'Failed to submit request' });
      } else {
        setErrors({ general: 'Failed to submit request. Please try again.' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddDocument = () => {
    setRequestForm({
      ...requestForm,
      documents: [...requestForm.documents, { type: '', file: null }],
    });
  };

  const handleRemoveDocument = (index) => {
    setRequestForm({
      ...requestForm,
      documents: requestForm.documents.filter((_, i) => i !== index),
    });
  };

  const handleDocumentChange = (index, field, value) => {
    const updatedDocuments = [...requestForm.documents];
    updatedDocuments[index] = {
      ...updatedDocuments[index],
      [field]: value,
    };
    setRequestForm({
      ...requestForm,
      documents: updatedDocuments,
    });
    
    // Clear error for this field when user starts typing
    if (errors[`documents.${index}.${field}`]) {
      const newErrors = { ...errors };
      delete newErrors[`documents.${index}.${field}`];
      setErrors(newErrors);
    }
  };

  const handleFileSelect = (index, file) => {
    if (!file) return;
    
    // Validate file using validation utility
    const fileError = validateFile(file, {
      required: true,
      maxSize: 10 * 1024 * 1024, // 10MB
      allowedTypes: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/jpg',
        'image/png'
      ],
      fieldName: 'Document file'
    });
    
    if (fileError) {
      setErrors({
        ...errors,
        [`documents.${index}.file`]: fileError
      });
      return;
    }
    
    const updatedDocuments = [...requestForm.documents];
    updatedDocuments[index] = {
      ...updatedDocuments[index],
      file: file,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    };
    
    setRequestForm({
      ...requestForm,
      documents: updatedDocuments,
    });
    
    // Clear error for this field
    if (errors[`documents.${index}.file`]) {
      const newErrors = { ...errors };
      delete newErrors[`documents.${index}.file`];
      setErrors(newErrors);
    }
  };

  const handleViewDetails = (acc) => {
    setSelectedACC(acc);
    setDetailModalOpen(true);
  };

  const handleViewAuthorizationDetails = (auth) => {
    setSelectedAuthorization(auth);
    setAuthDetailModalOpen(true);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;
  }

  return (
    <div className="space-y-4">

      {/* Tab Cards - Full Width */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Available Accreditation Card */}
        <div 
        onClick={() => setActiveTab('available')}
        className={`bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl shadow-lg p-6 border border-indigo-200 hover:shadow-xl transition-all duration-300 cursor-pointer ${
          activeTab === 'available' ? 'ring-2 ring-indigo-500' : ''
        }`}
      >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-indigo-700 mb-2">Available Accreditation</p>
              <p className="text-3xl font-bold text-indigo-900">{allAccs.length}</p>
            </div>
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <Building2 className="text-white" size={32} />
            </div>
          </div>
        </div>

        {/* My Authorizations Card */}
        <div 
        onClick={() => setActiveTab('authorizations')}
        className={`bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-lg p-6 border border-blue-200 hover:shadow-xl transition-all duration-300 cursor-pointer ${
          activeTab === 'authorizations' ? 'ring-2 ring-blue-500' : ''
        }`}
      >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-700 mb-2">My Authorizations</p>
              <p className="text-3xl font-bold text-blue-900">{allAuthorizations.length}</p>
            </div>
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <CheckCircle className="text-white" size={32} />
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-100">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder={activeTab === 'available' ? "Search by name, email, or country..." : "Search by ACC name or status..."}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPagination(prev => ({ ...prev, currentPage: 1 }));
              }}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-64 bg-white rounded-xl shadow-lg border border-gray-100">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : activeTab === 'available' ? (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="table-header-gradient">
                <tr>
                  <th 
                    className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-primary-700 transition-colors select-none"
                    onClick={() => handleAccSort('name')}
                  >
                    <div className="flex items-center gap-2">
                      ACC Name
                      {accSortConfig.key === 'name' && (
                        accSortConfig.direction === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-primary-700 transition-colors select-none"
                    onClick={() => handleAccSort('email')}
                  >
                    <div className="flex items-center gap-2">
                      Email
                      {accSortConfig.key === 'email' && (
                        accSortConfig.direction === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-primary-700 transition-colors select-none"
                    onClick={() => handleAccSort('country')}
                  >
                    <div className="flex items-center justify-center gap-2">
                      Country
                      {accSortConfig.key === 'country' && (
                        accSortConfig.direction === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-primary-700 transition-colors select-none"
                    onClick={() => handleAccSort('status')}
                  >
                    <div className="flex items-center justify-center gap-2">
                      Status
                      {accSortConfig.key === 'status' && (
                        accSortConfig.direction === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {paginatedAccs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                          <Building2 className="text-gray-400" size={32} />
                        </div>
                        <p className="text-gray-500 font-medium">
                          {searchTerm ? 'No ACCs found matching your search' : 'No ACCs found'}
                        </p>
                        <p className="text-sm text-gray-400 mt-1">
                          {searchTerm ? 'Try adjusting your search terms' : 'No ACCs available'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedAccs.map((acc, index) => (
                    <tr
                      key={acc.id}
                      className="hover:bg-gradient-to-r hover:from-primary-50/30 hover:to-white transition-all duration-200 cursor-pointer group table-row-animated"
                      onClick={() => handleViewDetails(acc)}
                      style={{ '--animation-delay': `${index * 0.03}s` }}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg flex items-center justify-center mr-3 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                            <Building2 className="h-5 w-5 text-primary-600" />
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-900 group-hover:text-primary-700 transition-colors">{acc.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-600">
                          <Mail className="h-4 w-4 mr-2 text-gray-400" />
                          {acc.email}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 text-center">
                        {acc.country || 'N/A'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <span className={`px-3 py-1.5 inline-flex text-xs leading-5 font-bold rounded-full shadow-sm ${
                          acc.status === 'active' ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300' :
                          'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300'
                        }`}>
                          {acc.status ? acc.status.charAt(0).toUpperCase() + acc.status.slice(1) : 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleViewDetails(acc)}
                            className="p-2 rounded-lg bg-primary-50 text-primary-600 hover:bg-primary-100 hover:scale-110 transition-all duration-200 shadow-sm hover:shadow-md"
                            title="View Details"
                          >
                            <Eye size={16} />
                          </button>
                          {acc.status === 'active' ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRequestAuth(acc);
                              }}
                              className="p-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 hover:scale-110 transition-all duration-200 shadow-sm hover:shadow-md"
                              title="Request Authorization"
                            >
                              <Send size={16} />
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewDetails(acc);
                              }}
                              className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 hover:scale-110 transition-all duration-200 shadow-sm hover:shadow-md"
                              title="View Info"
                            >
                              <Eye size={16} />
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
          
          {/* Pagination for Available ACCs */}
          {!loading && activeTab === 'available' && pagination.totalItems > 0 && (
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
      ) : (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="table-header-gradient">
                <tr>
                  <th 
                    className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-primary-700 transition-colors select-none"
                    onClick={() => handleAuthSort('acc_name')}
                  >
                    <div className="flex items-center gap-2">
                      ACC
                      {authSortConfig.key === 'acc_name' && (
                        authSortConfig.direction === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-primary-700 transition-colors select-none"
                    onClick={() => handleAuthSort('email')}
                  >
                    <div className="flex items-center gap-2">
                      Email
                      {authSortConfig.key === 'email' && (
                        authSortConfig.direction === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-primary-700 transition-colors select-none"
                    onClick={() => handleAuthSort('country')}
                  >
                    <div className="flex items-center justify-center gap-2">
                      Country
                      {authSortConfig.key === 'country' && (
                        authSortConfig.direction === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-primary-700 transition-colors select-none"
                    onClick={() => handleAuthSort('status')}
                  >
                    <div className="flex items-center justify-center gap-2">
                      Status
                      {authSortConfig.key === 'status' && (
                        authSortConfig.direction === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-primary-700 transition-colors select-none"
                    onClick={() => handleAuthSort('request_date')}
                  >
                    <div className="flex items-center justify-center gap-2">
                      Request Date
                      {authSortConfig.key === 'request_date' && (
                        authSortConfig.direction === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-primary-700 transition-colors select-none"
                    onClick={() => handleAuthSort('reviewed_at')}
                  >
                    <div className="flex items-center justify-center gap-2">
                      Reviewed At
                      {authSortConfig.key === 'reviewed_at' && (
                        authSortConfig.direction === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                      )}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {paginatedAuthorizations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                          <Clock className="text-gray-400" size={32} />
                        </div>
                        <p className="text-gray-500 font-medium">
                          {searchTerm ? 'No authorizations found matching your search' : 'No authorization requests found'}
                        </p>
                        <p className="text-sm text-gray-400 mt-1">
                          {searchTerm ? 'Try adjusting your search terms' : 'No authorization requests available'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedAuthorizations.map((auth, index) => {
                    const statusConfig = {
                      approved: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
                      rejected: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle },
                      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock },
                      returned: { bg: 'bg-blue-100', text: 'text-blue-800', icon: Clock },
                    };
                    const config = statusConfig[auth.status] || statusConfig.pending;
                    const Icon = config.icon;
                    return (
                      <tr
                        key={auth.id}
                        className="hover:bg-gradient-to-r hover:from-primary-50/30 hover:to-white transition-all duration-200 cursor-pointer group table-row-animated"
                        onClick={() => handleViewAuthorizationDetails(auth)}
                        style={{ '--animation-delay': `${index * 0.03}s` }}
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg flex items-center justify-center mr-3 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                              <Building2 className="h-5 w-5 text-primary-600" />
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-gray-900 group-hover:text-primary-700 transition-colors">
                                {auth.acc?.name || 'N/A'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center text-sm text-gray-600">
                            <Mail className="h-4 w-4 mr-2 text-gray-400" />
                            {auth.acc?.email || 'N/A'}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 text-center">
                          {auth.acc?.country || 'N/A'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <span className={`px-3 py-1.5 inline-flex items-center text-xs leading-5 font-bold rounded-full shadow-sm ${
                            auth.status === 'approved' ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300' :
                            auth.status === 'rejected' ? 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 border border-red-300' :
                            auth.status === 'pending' ? 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 border border-yellow-300' :
                            auth.status === 'returned' ? 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-300' :
                            'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300'
                          }`}>
                            <Icon size={14} className="mr-1" />
                            {auth.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 text-center">
                          {auth.request_date ? new Date(auth.request_date).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 text-center">
                          {auth.reviewed_at ? new Date(auth.reviewed_at).toLocaleDateString() : 'Pending'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination for Authorizations */}
          {!loading && activeTab === 'authorizations' && pagination.totalItems > 0 && (
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
      )}

      {/* Request Authorization Modal */}
      <Modal
        isOpen={requestModalOpen}
        onClose={() => {
          if (!submitting) {
            setRequestModalOpen(false);
            setSelectedACC(null);
            setRequestForm({
              documents: [],
              additional_info: '',
            });
            setErrors({});
          }
        }}
        title={`Request Authorization from ${selectedACC?.name}`}
        size="lg"
      >
        <div className="relative">
          {submitting && (
            <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-20 rounded-lg">
              <div className="flex flex-col items-center">
                <Loader size={32} className="animate-spin text-primary-600 mb-2" />
                <p className="text-sm text-gray-600 font-medium">Uploading files and submitting request...</p>
                <p className="text-xs text-gray-500 mt-1">Please wait, this may take a moment</p>
              </div>
            </div>
          )}
          <form onSubmit={handleSubmitRequest} className="space-y-6">
          {/* Documents Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <FileText size={20} className="mr-2" />
                Documents
              </h3>
              <button
                type="button"
                onClick={handleAddDocument}
                disabled={submitting}
                className="px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center text-sm transition-all duration-200 hover:scale-105 transform disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none btn-primary"
              >
                <Plus size={16} className="mr-1" />
                Add Document
              </button>
            </div>

            {requestForm.documents.length === 0 ? (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
                <p className="text-sm text-yellow-800 font-medium mb-1">No documents added</p>
                <p className="text-xs text-yellow-600">At least one document is required. Click "Add Document" to add one.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {requestForm.documents.map((doc, index) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-sm font-medium text-gray-700">Document {index + 1}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveDocument(index)}
                        disabled={submitting}
                        className="text-red-600 hover:text-red-700 p-1 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Remove document"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Document Type <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={doc.type || ''}
                          onChange={(e) => handleDocumentChange(index, 'type', e.target.value)}
                          required
                          disabled={submitting}
                          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                            errors[`documents.${index}.type`] ? 'border-red-300' : 'border-gray-300'
                          } ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <option value="">Select document type</option>
                          <option value="license">License</option>
                          <option value="certificate">Certificate</option>
                          <option value="registration">Registration</option>
                          <option value="other">Other</option>
                        </select>
                        {errors[`documents.${index}.type`] && (
                          <p className="mt-1 text-sm text-red-600">{errors[`documents.${index}.type`][0]}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Upload Document <span className="text-red-500">*</span>
                          <span className="text-xs text-gray-500 ml-2">(PDF, DOC, DOCX, JPG, JPEG, PNG - Max 10MB)</span>
                        </label>
                        <div className="relative">
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleFileSelect(index, file);
                              }
                            }}
                            disabled={submitting}
                            className="hidden"
                            id={`file-upload-${index}`}
                          />
                          <label
                            htmlFor={`file-upload-${index}`}
                            className={`flex items-center justify-center w-full px-4 py-2 border-2 border-dashed rounded-lg transition-colors ${
                              submitting
                                ? 'opacity-50 cursor-not-allowed border-gray-300 bg-gray-50'
                                : doc.file
                                ? 'border-green-300 bg-green-50 hover:border-green-400 cursor-pointer'
                                : 'border-gray-300 hover:border-primary-400 hover:bg-primary-50 cursor-pointer'
                            }`}
                          >
                            {doc.file ? (
                              <>
                                <CheckCircle size={16} className="mr-2 text-green-600" />
                                <span className="text-sm text-green-700">
                                  {doc.fileName || 'File selected'}
                                </span>
                                {doc.fileSize && (
                                  <span className="text-xs text-gray-500 ml-2">
                                    ({(doc.fileSize / 1024 / 1024).toFixed(2)} MB)
                                  </span>
                                )}
                              </>
                            ) : (
                              <>
                                <Upload size={16} className="mr-2" />
                                <span className="text-sm text-gray-600">Click to upload file</span>
                              </>
                            )}
                          </label>
                        </div>
                        {errors[`documents.${index}.file`] && (
                          <p className="mt-1 text-sm text-red-600">{errors[`documents.${index}.file`][0]}</p>
                        )}
                        {doc.file && (
                          <div className="mt-2 flex items-center space-x-3">
                            <button
                              type="button"
                              onClick={() => {
                                const updatedDocuments = [...requestForm.documents];
                                updatedDocuments[index] = {
                                  ...updatedDocuments[index],
                                  file: null,
                                  fileName: '',
                                  fileSize: null,
                                  fileType: null,
                                };
                                setRequestForm({
                                  ...requestForm,
                                  documents: updatedDocuments,
                                });
                                const fileInput = document.getElementById(`file-upload-${index}`);
                                if (fileInput) fileInput.value = '';
                              }}
                              disabled={submitting}
                              className="text-sm text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Remove File
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Additional Information */}
          <FormInput
            label="Additional Information"
            name="additional_info"
            value={requestForm.additional_info}
            onChange={(e) => {
              setRequestForm({ ...requestForm, additional_info: e.target.value });
              // Clear error when user starts typing
              if (errors.additional_info) {
                const newErrors = { ...errors };
                delete newErrors.additional_info;
                setErrors(newErrors);
              }
            }}
            textarea
            rows={4}
            placeholder="Provide any additional information about your training center..."
            error={errors.additional_info}
            disabled={submitting}
            helpText="Maximum 5000 characters"
          />

          {errors.general && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600 font-medium">{errors.general}</p>
              {errors.hint && (
                <p className="text-xs text-red-500 mt-1">{errors.hint}</p>
              )}
            </div>
          )}

          <div className="flex space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => {
                setRequestModalOpen(false);
                setSelectedACC(null);
                setRequestForm({
                  documents: [],
                  additional_info: '',
                });
                setErrors({});
              }}
              disabled={submitting}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all duration-200 hover:scale-105 transform disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all duration-200 hover:scale-105 transform disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center btn-primary"
            >
              {submitting ? (
                <>
                  <Loader size={16} className="mr-2 animate-spin" />
                  Uploading & Submitting...
                </>
              ) : (
                <>
                  <Send size={16} className="mr-2" />
                  Submit Request
                </>
              )}
            </button>
          </div>
        </form>
        </div>
      </Modal>

      {/* ACC Detail Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedACC(null);
        }}
        title="ACC Details"
        size="md"
      >
        {selectedACC && (
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">Name</p>
              <p className="text-base font-semibold text-gray-900">{selectedACC.name}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">Email</p>
              <p className="text-base font-semibold text-gray-900">{selectedACC.email}</p>
            </div>
            {selectedACC.country && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Country</p>
                <p className="text-base font-semibold text-gray-900">{selectedACC.country}</p>
              </div>
            )}
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">Status</p>
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                selectedACC.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {selectedACC.status}
              </span>
            </div>
            {selectedACC.status === 'active' && (
              <div className="flex space-x-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setDetailModalOpen(false);
                    handleRequestAuth(selectedACC);
                  }}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center justify-center"
                >
                  <Send size={20} className="mr-2" />
                  Request Authorization
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Authorization Detail Modal */}
      <Modal
        isOpen={authDetailModalOpen}
        onClose={() => {
          setAuthDetailModalOpen(false);
          setSelectedAuthorization(null);
        }}
        title="Authorization Request Details"
        size="lg"
      >
        {selectedAuthorization && (
          <div className="space-y-4">
            {/* ACC Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">ACC Name</p>
                <p className="text-base font-semibold text-gray-900">{selectedAuthorization.acc?.name || 'N/A'}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1 flex items-center">
                  <Mail size={16} className="mr-2" />
                  Email
                </p>
                <p className="text-base font-semibold text-gray-900">{selectedAuthorization.acc?.email || 'N/A'}</p>
              </div>
              {selectedAuthorization.acc?.country && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Country</p>
                  <p className="text-base font-semibold text-gray-900">{selectedAuthorization.acc.country}</p>
                </div>
              )}
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Status</p>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                  selectedAuthorization.status === 'approved' ? 'bg-green-100 text-green-800' :
                  selectedAuthorization.status === 'rejected' ? 'bg-red-100 text-red-800' :
                  selectedAuthorization.status === 'returned' ? 'bg-blue-100 text-blue-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {selectedAuthorization.status ? selectedAuthorization.status.charAt(0).toUpperCase() + selectedAuthorization.status.slice(1) : 'Pending'}
                </span>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1 flex items-center">
                  <Clock size={16} className="mr-2" />
                  Request Date
                </p>
                <p className="text-base font-semibold text-gray-900">
                  {selectedAuthorization.request_date ? new Date(selectedAuthorization.request_date).toLocaleString() : 'N/A'}
                </p>
              </div>
              {selectedAuthorization.reviewed_at && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1 flex items-center">
                    <CheckCircle size={16} className="mr-2" />
                    Reviewed At
                  </p>
                  <p className="text-base font-semibold text-gray-900">
                    {new Date(selectedAuthorization.reviewed_at).toLocaleString()}
                  </p>
                </div>
              )}
            </div>

            {/* Additional Information */}
            {selectedAuthorization.additional_info && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm font-semibold text-blue-900 mb-2">Additional Information</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedAuthorization.additional_info}</p>
              </div>
            )}

            {/* ACC Comment (when status is returned) */}
            {selectedAuthorization.status === 'returned' && selectedAuthorization.return_comment && (
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-start gap-3">
                  <MessageSquare className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-yellow-900 mb-2">ACC Comment / Return Reason</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedAuthorization.return_comment}</p>
                  </div>
                </div>
              </div>
            )}

            {/* ACC Rejection Reason (if exists) */}
            {selectedAuthorization.status === 'rejected' && selectedAuthorization.rejection_reason && (
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-start gap-3">
                  <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-red-900 mb-2">Rejection Reason</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedAuthorization.rejection_reason}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Documents */}
            {selectedAuthorization.documents && selectedAuthorization.documents.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                  <FileText size={18} className="mr-2" />
                  Submitted Documents
                </p>
                <div className="space-y-2">
                  {selectedAuthorization.documents.map((doc, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileText size={20} className="text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {doc.type ? doc.type.charAt(0).toUpperCase() + doc.type.slice(1) : `Document ${index + 1}`}
                          </p>
                          {doc.file_name && (
                            <p className="text-xs text-gray-500">{doc.file_name}</p>
                          )}
                        </div>
                      </div>
                      {doc.file_url && (
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                          title="Download document"
                        >
                          <Download size={18} />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ACCsScreen;
