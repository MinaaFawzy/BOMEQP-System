import { useEffect, useState, useMemo } from 'react';
import { trainingCenterAPI } from '../../../services/api';
import { useHeader } from '../../../context/HeaderContext';
import { Building2, Send, Eye, CheckCircle, Clock, XCircle, Plus, Trash2, FileText, Upload, Loader, Mail, Search } from 'lucide-react';
import Modal from '../../../components/Modal/Modal';
import FormInput from '../../../components/FormInput/FormInput';
import Pagination from '../../../components/Pagination/Pagination';
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
  const [requestForm, setRequestForm] = useState({
    documents: [],
    additional_info: '',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

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

  // Filter and paginate ACCs client-side
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
    
    return filtered;
  }, [allAccs, searchTerm]);

  // Filter and paginate authorizations client-side
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
    
    return filtered;
  }, [allAuthorizations, searchTerm]);

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

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    
    if (requestForm.documents.length === 0) {
      setErrors({ general: 'Please upload at least one document' });
      return;
    }
    
    const invalidDocs = requestForm.documents.filter(doc => !doc.type || !doc.file);
    if (invalidDocs.length > 0) {
      setErrors({ general: 'Please ensure all documents have both type and file uploaded' });
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
  };

  const handleFileSelect = (index, file) => {
    if (!file) return;
    
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/jpg',
      'image/png'
    ];
    
    const allowedExtensions = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
      alert('Please upload a valid file type: PDF, DOC, DOCX, JPG, JPEG, or PNG');
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
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
  };

  const handleViewDetails = (acc) => {
    setSelectedACC(acc);
    setDetailModalOpen(true);
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
                  <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">ACC Name</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Email</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider">Country</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider">Status</th>
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
                  <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">ACC</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Email</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider">Country</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider">Request Date</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider">Reviewed At</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider">Additional Info</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {paginatedAuthorizations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
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
                        <td className="px-4 py-3 text-sm text-gray-600 text-center">
                          <div className="max-w-xs truncate mx-auto" title={auth.additional_info || 'N/A'}>
                            {auth.additional_info ? (
                              <span className="text-gray-700">{auth.additional_info}</span>
                            ) : (
                              <span className="text-gray-400">N/A</span>
                            )}
                          </div>
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
            onChange={(e) => setRequestForm({ ...requestForm, additional_info: e.target.value })}
            textarea
            rows={4}
            placeholder="Provide any additional information about your training center..."
            error={errors.additional_info}
            disabled={submitting}
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
    </div>
  );
};

export default ACCsScreen;
