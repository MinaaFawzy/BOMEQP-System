import { useEffect, useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { accAPI } from '../../../services/api';
import { useHeader } from '../../../context/HeaderContext';
import { Users, CheckCircle, XCircle, Eye, Clock, ArrowLeft, Mail, Building2, FileText, Globe, Phone, Calendar, Award, BookOpen, Hash, MapPin, CreditCard, UserCircle } from 'lucide-react';
import Modal from '../../../components/Modal/Modal';
import FormInput from '../../../components/FormInput/FormInput';
import ConfirmDialog from '../../../components/ConfirmDialog/ConfirmDialog';
import TabCard from '../../../components/TabCard/TabCard';
import TabCardsGrid from '../../../components/TabCardsGrid/TabCardsGrid';
import DataTable from '../../../components/DataTable/DataTable';
import PresentDataForm from '../../../components/PresentDataForm/PresentDataForm';
import './InstructorsScreen.css';

const InstructorsScreen = () => {
  const { setHeaderTitle, setHeaderSubtitle } = useHeader();
  const [searchParams, setSearchParams] = useSearchParams();
  const [allData, setAllData] = useState([]); // Unified data array
  const [loading, setLoading] = useState(true);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [authorizationPrice, setAuthorizationPrice] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [returnComment, setReturnComment] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [trainingCenters, setTrainingCenters] = useState({}); // Map of TC ID to TC name

  // Read filter from URL params on mount
  useEffect(() => {
    const filterParam = searchParams.get('filter');
    if (filterParam && ['pending', 'active', 'returned', 'all'].includes(filterParam)) {
      setStatusFilter(filterParam);
    }
  }, [searchParams]);

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  useEffect(() => {
    setHeaderTitle('Instructors');
    setHeaderSubtitle('Manage instructor authorizations and requests');
    return () => {
      setHeaderTitle(null);
      setHeaderSubtitle(null);
    };
  }, [setHeaderTitle, setHeaderSubtitle]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = {
        per_page: 1000, // Load all data
      };
      
      // Load instructor requests and training centers in parallel with pagination
      const [allRequestsData, trainingCentersData] = await Promise.all([
        accAPI.getInstructorRequests(params),
        accAPI.listAuthorizedTrainingCenters(params),
      ]);
      
      const allRequests = allRequestsData?.requests || allRequestsData?.data || [];
      
      // Create a map of training center ID to name
      const tcMap = {};
      const tcs = trainingCentersData?.training_centers || trainingCentersData?.data || [];
      tcs.forEach(tc => {
        if (tc.id) {
          tcMap[tc.id] = tc.name || tc.legal_name || `TC ${tc.id}`;
        }
      });
      setTrainingCenters(tcMap);

      // Helper function to get unique identifier for an instructor
      const getInstructorKey = (item) => {
        return item.instructor?.id || item.instructor_id || item.id;
      };

      // Normalize all requests and categorize by status
      const normalizedRequests = allRequests.map(item => {
        const instructor = item.instructor || item;
        const tcId = item.training_center_id || item.training_center?.id;
        const tcName = tcId ? (tcMap[tcId] || item.training_center?.name || `TC ${tcId}`) : 'N/A';
        return {
          ...item,
          _normalizedName: `${instructor.first_name || ''} ${instructor.last_name || ''}`.trim(),
          _normalizedEmail: instructor.email || '',
          _normalizedDate: item.request_date || item.created_at || item.updated_at,
          _normalizedTrainingCenter: tcName,
          _trainingCenterId: tcId,
          _isRequest: true,
        };
      });

      // Separate requests by status
      const pendingRequests = normalizedRequests.filter(item => item.status === 'pending');
      const returnedRequests = normalizedRequests.filter(item => item.status === 'returned');
      const approvedRequests = normalizedRequests.filter(item => item.status === 'approved' || item.status === 'active');

      // Remove duplicates within each group
      const dedupeGroup = (items) => {
        const seen = new Set();
        return items.filter(item => {
          const key = getInstructorKey(item);
          if (key && seen.has(key)) {
            return false;
          }
          if (key) seen.add(key);
          return true;
        });
      };

      const uniquePending = dedupeGroup(pendingRequests);
      const uniqueReturned = dedupeGroup(returnedRequests);
      const uniqueApproved = dedupeGroup(approvedRequests);

      // Convert approved requests to authorized instructors format
      const authorizedInstructors = uniqueApproved.map(item => {
        const instructor = item.instructor || item;
        return {
          ...item,
          id: instructor.id || item.id,
          first_name: instructor.first_name || item.first_name,
          last_name: instructor.last_name || item.last_name,
          email: instructor.email || item.email,
          phone: instructor.phone || item.phone,
          _normalizedName: `${instructor.first_name || ''} ${instructor.last_name || ''}`.trim(),
          _normalizedEmail: instructor.email || '',
          _normalizedDate: item.request_date || item.created_at || item.updated_at,
          _normalizedTrainingCenter: item._normalizedTrainingCenter || 'N/A',
          _trainingCenterId: item._trainingCenterId,
          _isRequest: false,
          status: 'active', // Approved requests become active authorized instructors
        };
      });

      // Collect all instructor IDs from pending and returned requests
      const requestIds = new Set();
      [...uniquePending, ...uniqueReturned].forEach(req => {
        const key = getInstructorKey(req);
        if (key) requestIds.add(key);
      });

      // Filter out authorized instructors that have pending/returned requests
      const filteredAuthorized = authorizedInstructors.filter(auth => {
        const key = getInstructorKey(auth);
        return !requestIds.has(key);
      });

      // Combine all unique items
      const combined = [...uniquePending, ...uniqueReturned, ...filteredAuthorized];
      
      // Final deduplication pass
      const finalSeen = new Set();
      const uniqueData = combined.filter(item => {
        const key = getInstructorKey(item);
        if (!key) return true; // Include items without key (shouldn't happen)
        if (finalSeen.has(key)) {
          return false; // Duplicate found
        }
        finalSeen.add(key);
        return true;
      });
      
      setAllData(uniqueData);
    } catch (error) {
      console.error('Failed to load data:', error);
      setAllData([]);
    } finally {
      setLoading(false);
    }
  };
  

  const handleApprove = (request) => {
    setSelectedRequest(request);
    setAuthorizationPrice('');
    setApproveModalOpen(true);
  };

  const handleViewDetails = (item) => {
    setSelectedRequest(item);
    setDetailModalOpen(true);
  };

  const handleRowClick = (item) => {
    // Allow clicking on both requests and authorized instructors to view details
    handleViewDetails(item);
  };

  // Define columns for DataTable
  const columns = useMemo(() => [
    {
      header: 'Instructor',
      accessor: '_normalizedName',
      sortable: true,
      render: (value, row) => {
        const photoUrl = row.photo_url || row.instructor?.photo_url;
        return (
          <div className="flex items-center">
            <div className="w-10 h-10 mr-3 relative">
              {photoUrl ? (
                <>
                  <img 
                    src={photoUrl} 
                    alt={value || 'Instructor Photo'} 
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
              <div className="text-sm font-semibold text-gray-900">{value || 'N/A'}</div>
            </div>
          </div>
        );
      }
    },
    {
      header: 'Email',
      accessor: '_normalizedEmail',
      sortable: true,
      render: (value) => (
        <div className="flex items-center text-sm text-gray-600">
          <Mail className="h-4 w-4 mr-2 text-gray-400" />
          {value || 'N/A'}
        </div>
      )
    },
    {
      header: 'Date',
      accessor: '_normalizedDate',
      sortable: true,
      render: (value) => (
        <span className="text-sm text-gray-600">
          {value ? new Date(value).toLocaleDateString() : 'N/A'}
        </span>
      )
    },
    {
      header: 'Status',
      accessor: 'status',
      sortable: true,
      render: (value, row) => {
        const statusConfig = {
          approved: { 
            badgeClass: 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300',
            icon: CheckCircle 
          },
          active: { 
            badgeClass: 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300',
            icon: CheckCircle 
          },
          rejected: { 
            badgeClass: 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 border border-red-300',
            icon: XCircle 
          },
          returned: { 
            badgeClass: 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-300',
            icon: ArrowLeft 
          },
          pending: { 
            badgeClass: 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 border border-yellow-300',
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
          {(row.status === 'pending' || row.status === 'returned') && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleApprove(row);
              }}
              className="p-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 hover:scale-110 transition-all duration-200 shadow-sm hover:shadow-md"
              title="Approve"
            >
              <CheckCircle size={16} />
            </button>
          )}
        </div>
      )
    }
  ], [handleViewDetails, handleApprove]);

  // Filter data based on status filter
  const filteredData = useMemo(() => {
    let filtered = [...allData];

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => {
        if (statusFilter === 'pending') {
          return item.status === 'pending';
        } else if (statusFilter === 'returned') {
          return item.status === 'returned';
        } else if (statusFilter === 'active') {
          // Active includes approved, active status, or authorized instructors (non-requests)
          return item.status === 'active' || 
                 item.status === 'approved' || 
                 (!item._isRequest && (item.status === 'active' || !item.status));
        }
        return true;
      });
    }

    // Add search text for DataTable - include all searchable fields
    filtered = filtered.map(item => ({
      ...item,
      _searchText: `${item._normalizedName || ''} ${item._normalizedEmail || ''} ${item.instructor?.first_name || ''} ${item.instructor?.last_name || ''} ${item.instructor?.email || ''} ${item.training_center?.name || ''} ${item.name || ''} ${item.email || ''} ${item.status || ''}`.toLowerCase()
    }));

    return filtered;
  }, [allData, statusFilter]);

  const confirmApprove = async () => {
    if (!authorizationPrice || parseFloat(authorizationPrice) <= 0) {
      alert('Please enter a valid authorization price');
      return;
    }
    try {
      await accAPI.approveInstructorRequest(selectedRequest.id, {
        authorization_price: parseFloat(authorizationPrice),
      });
      await loadData();
      setApproveModalOpen(false);
      setSelectedRequest(null);
      setAuthorizationPrice('');
      alert('Instructor approved successfully. Waiting for Group Admin to set commission percentage.');
    } catch (error) {
      alert('Failed to approve: ' + (error.message || 'Unknown error'));
    }
  };

  const handleReject = (request) => {
    setSelectedRequest(request);
    setRejectionReason('');
    setRejectModalOpen(true);
  };

  const confirmReject = async () => {
    if (!rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }
    try {
      await accAPI.rejectInstructorRequest(selectedRequest.id, { rejection_reason: rejectionReason });
      await loadData();
      setRejectModalOpen(false);
      setSelectedRequest(null);
      setRejectionReason('');
      alert('Instructor request rejected');
    } catch (error) {
      alert('Failed to reject: ' + (error.message || 'Unknown error'));
    }
  };

  const handleReturn = (request) => {
    setSelectedRequest(request);
    setReturnComment('');
    setReturnModalOpen(true);
  };

  const confirmReturn = async () => {
    if (!returnComment.trim()) {
      alert('Please provide a return comment');
      return;
    }
    try {
      await accAPI.returnInstructorRequest(selectedRequest.id, { return_comment: returnComment });
      await loadData();
      setReturnModalOpen(false);
      setSelectedRequest(null);
      setReturnComment('');
      alert('Request returned for revision');
    } catch (error) {
      alert('Failed to return request: ' + (error.message || 'Unknown error'));
    }
  };

  // Calculate stats from all data
  const pendingCount = allData.filter(item => item.status === 'pending').length;
  const returnedCount = allData.filter(item => item.status === 'returned').length;
  const activeCount = allData.filter(item => 
    item.status === 'active' || 
    item.status === 'approved' || 
    (!item._isRequest && (item.status === 'active' || !item.status))
  ).length;
  const totalCount = allData.length;

  return (
    <div>

      {/* Tab Cards */}
      <div className="mb-6">
        <TabCardsGrid columns={{ mobile: 1, tablet: 2, desktop: 4 }}>
          <TabCard
            name="Total"
            value={totalCount}
            icon={Users}
            colorType="indigo"
            isActive={statusFilter === 'all'}
            onClick={() => setStatusFilter('all')}
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
            name="Active"
            value={activeCount}
            icon={CheckCircle}
            colorType="green"
            isActive={statusFilter === 'active'}
            onClick={() => setStatusFilter('active')}
          />
          <TabCard
            name="Returned"
            value={returnedCount}
            icon={ArrowLeft}
            colorType="blue"
            isActive={statusFilter === 'returned'}
            onClick={() => setStatusFilter('returned')}
          />
        </TabCardsGrid>
      </div>

      {/* DataTable */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        <DataTable
          columns={columns}
          data={filteredData}
          isLoading={loading}
          searchable={true}
          sortable={true}
          filterable={false}
          searchPlaceholder="Search by name or email..."
          emptyMessage="No instructors found"
          onRowClick={(item) => handleRowClick(item)}
        />
      </div>

      {/* Detail Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedRequest(null);
        }}
        title={selectedRequest?._isRequest ? "Instructor Request Details" : "Instructor Details"}
        size="lg"
      >
        {selectedRequest && (
          <div className="space-y-6">
            {/* Prepare data for PresentDataForm - Only nested sections, no duplicate data */}
            {(() => {
              // Prepare instructor object with names (without cv_url, certificates_json, specializations - these are displayed at top level)
              let instructorData = null;
              if (selectedRequest.instructor) {
                const { cv_url, certificates_json, specializations, ...instructorRest } = selectedRequest.instructor;
                instructorData = instructorRest;
              } else if (selectedRequest.first_name || selectedRequest.last_name) {
                instructorData = {
                  first_name: selectedRequest.first_name,
                  last_name: selectedRequest.last_name,
                  email: selectedRequest.email || selectedRequest._normalizedEmail,
                  phone: selectedRequest.phone,
                  id_number: selectedRequest.id_number,
                  country: selectedRequest.country,
                  city: selectedRequest.city,
                };
              }

              // Prepare training center object with names (not ID)
              const trainingCenterData = selectedRequest.training_center ? {
                name: selectedRequest.training_center.name || selectedRequest.training_center.legal_name || selectedRequest._normalizedTrainingCenter,
                email: selectedRequest.training_center.email,
                phone: selectedRequest.training_center.phone,
                address: selectedRequest.training_center.address,
                city: selectedRequest.training_center.city,
                country: selectedRequest.training_center.country,
              } : (selectedRequest._normalizedTrainingCenter ? { name: selectedRequest._normalizedTrainingCenter } : null);

              // Prepare sub category object with names (not ID)
              const subCategoryData = selectedRequest.sub_category ? {
                name: selectedRequest.sub_category.name,
                name_ar: selectedRequest.sub_category.name_ar,
                description: selectedRequest.sub_category.description,
                category: selectedRequest.sub_category.category,
              } : null;

              // Prepare display data with only nested sections and non-duplicate fields
              const displayData = {
                // Nested sections only
                ...(instructorData && { instructor: instructorData }),
                ...(trainingCenterData && { training_center: trainingCenterData }),
                ...(subCategoryData && { sub_category: subCategoryData }),
                
                // Non-duplicate fields (not in nested sections)
                ...((selectedRequest._normalizedDate || selectedRequest.request_date || selectedRequest.created_at) && {
                  request_date: selectedRequest._normalizedDate || selectedRequest.request_date || selectedRequest.created_at
                }),
                ...(selectedRequest.documents_json && { documents_json: selectedRequest.documents_json }),
                ...((selectedRequest.instructor?.cv_url || selectedRequest.cv_url) && {
                  cv_url: selectedRequest.instructor?.cv_url || selectedRequest.cv_url
                }),
                ...((selectedRequest.instructor?.certificates_json || selectedRequest.certificates_json) && {
                  certificates_json: selectedRequest.instructor?.certificates_json || selectedRequest.certificates_json
                }),
                ...((selectedRequest.instructor?.specializations || selectedRequest.specializations) && {
                  specializations: selectedRequest.instructor?.specializations || selectedRequest.specializations
                }),
              };

              return (
                <PresentDataForm
                  data={displayData}
                  isLoading={false}
                  emptyMessage="No instructor data available"
                />
                    );
                  })()}

            {/* Sub-Category or Courses Requested */}
            {selectedRequest._isRequest && (selectedRequest.sub_category_id || selectedRequest.sub_category || selectedRequest.courses || selectedRequest.requested_courses) && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <BookOpen className="mr-2" size={20} />
                  Course Authorization Request
                </h3>
                <div className="p-4 bg-gray-50 rounded-lg">
                  {selectedRequest.sub_category_id || selectedRequest.sub_category ? (
                    <div>
                      <p className="text-sm text-gray-500 mb-2">Sub-Category Selected:</p>
                      <p className="text-base font-semibold text-gray-900">
                        {(() => {
                          // Try multiple ways to get the sub-category name
                          if (selectedRequest.sub_category?.name) {
                            return selectedRequest.sub_category.name;
                          }
                          if (selectedRequest.sub_category_name) {
                            return selectedRequest.sub_category_name;
                          }
                          if (typeof selectedRequest.sub_category === 'string') {
                            return selectedRequest.sub_category;
                          }
                          if (selectedRequest.sub_category?.name_ar) {
                            return selectedRequest.sub_category.name_ar;
                          }
                          return 'N/A';
                        })()}
                      </p>
                      {selectedRequest.sub_category?.description && (
                        <p className="text-sm text-gray-600 mt-1">{selectedRequest.sub_category.description}</p>
                      )}
                      
                      {/* Display courses from sub_category if available */}
                      {selectedRequest.sub_category?.courses && Array.isArray(selectedRequest.sub_category.courses) && selectedRequest.sub_category.courses.length > 0 && (
                        <div className="mt-4">
                          <p className="text-sm text-gray-500 mb-2 font-medium">Courses in this Sub-Category:</p>
                          <div className="space-y-2">
                            {selectedRequest.sub_category.courses.map((course, index) => (
                              <div key={course.id || index} className="p-3 bg-white rounded-lg border border-gray-200">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <p className="text-sm font-semibold text-gray-900">
                                      {course.name || course.code || `Course ${course.id || index + 1}`}
                                    </p>
                                    {course.code && (
                                      <p className="text-xs text-gray-500 mt-1">Code: {course.code}</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {(!selectedRequest.sub_category?.courses || selectedRequest.sub_category.courses.length === 0) && (
                        <p className="text-xs text-gray-500 mt-1">
                          All active courses in this sub-category will be authorized
                        </p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-gray-500 mb-2">Specific Courses Selected:</p>
                      {(() => {
                        const courses = selectedRequest.courses || selectedRequest.requested_courses || [];
                        const courseArray = Array.isArray(courses) ? courses : [];
                        return courseArray.length > 0 ? (
                          <div className="space-y-2">
                            {courseArray.map((course, index) => (
                              <div key={course.id || index} className="p-3 bg-white rounded-lg border border-gray-200">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <p className="text-sm font-semibold text-gray-900">
                                      {course.name || course.name_ar || course.code || `Course ${course.id || index + 1}`}
                                    </p>
                                    {course.code && (
                                      <p className="text-xs text-gray-500 mt-1">Code: {course.code}</p>
                                    )}
                                    {course.name_ar && course.name && course.name !== course.name_ar && (
                                      <p className="text-xs text-gray-600 mt-1">{course.name_ar}</p>
                                    )}
                                    {course.sub_category && (
                                      <p className="text-xs text-gray-500 mt-1">
                                        Sub-Category: {typeof course.sub_category === 'object' 
                                          ? (course.sub_category.name || course.sub_category.name_ar || course.sub_category)
                                          : course.sub_category}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">No courses specified</p>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>
            )}


            {/* Authorization Price (if approved) */}
            {selectedRequest.authorization_price && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Authorization Details</h3>
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm text-gray-500 mb-1">Authorization Price</p>
                  <p className="text-2xl font-bold text-green-900">
                    ${parseFloat(selectedRequest.authorization_price).toFixed(2)}
                  </p>
                </div>
              </div>
            )}

            {/* Rejection Reason (if rejected) */}
            {selectedRequest.rejection_reason && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <XCircle className="mr-2 text-red-600" size={20} />
                  Rejection Reason
                </h3>
                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-base text-gray-900">{selectedRequest.rejection_reason}</p>
                </div>
              </div>
            )}
            {/* Only show return comment for requests */}
            {selectedRequest._isRequest && selectedRequest.return_comment && (
              <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                <div className="flex items-center mb-2">
                  <ArrowLeft className="h-5 w-5 text-blue-600 mr-2" />
                  <h3 className="text-lg font-semibold text-blue-900">Return Comment</h3>
                </div>
                <p className="text-base text-gray-900">{selectedRequest.return_comment}</p>
              </div>
            )}
            {/* Only show action buttons for requests */}
            {selectedRequest._isRequest && selectedRequest.status === 'pending' && (
              <div className="flex space-x-3 pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setDetailModalOpen(false);
                  handleApprove(selectedRequest);
                }}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center"
              >
                <CheckCircle size={20} className="mr-2" />
                Approve
              </button>
              <button
                onClick={() => {
                  setDetailModalOpen(false);
                  handleReject(selectedRequest);
                }}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center"
              >
                <XCircle size={20} className="mr-2" />
                Reject
              </button>
              <button
                onClick={() => {
                  setDetailModalOpen(false);
                  handleReturn(selectedRequest);
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center"
              >
                <ArrowLeft size={20} className="mr-2" />
                Return
              </button>
            </div>
            )}
            {/* Only show action buttons for requests */}
            {selectedRequest._isRequest && selectedRequest.status === 'returned' && (
              <div className="flex space-x-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setDetailModalOpen(false);
                    handleApprove(selectedRequest);
                  }}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center"
                >
                  <CheckCircle size={20} className="mr-2" />
                  Approve
                </button>
                <button
                  onClick={() => {
                    setDetailModalOpen(false);
                    handleReject(selectedRequest);
                  }}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center"
                >
                  <XCircle size={20} className="mr-2" />
                  Reject
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Reject Modal */}
      <Modal
        isOpen={rejectModalOpen}
        onClose={() => {
          setRejectModalOpen(false);
          setSelectedRequest(null);
          setRejectionReason('');
        }}
        title="Reject Instructor Request"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-gray-600">Please provide a reason for rejecting this request:</p>
          <FormInput
            label="Rejection Reason"
            name="rejection_reason"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            textarea
            rows={4}
            required
            placeholder="Enter the reason for rejection..."
          />
          <div className="flex space-x-3 pt-4">
            <button
              onClick={() => {
                setRejectModalOpen(false);
                setSelectedRequest(null);
                setRejectionReason('');
              }}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={confirmReject}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Reject Request
            </button>
          </div>
        </div>
      </Modal>

      {/* Return Modal */}
      <Modal
        isOpen={returnModalOpen}
        onClose={() => {
          setReturnModalOpen(false);
          setSelectedRequest(null);
          setReturnComment('');
        }}
        title="Return Instructor Request"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-gray-600">Please provide comments for returning this request:</p>
          <FormInput
            label="Return Comment"
            name="return_comment"
            value={returnComment}
            onChange={(e) => setReturnComment(e.target.value)}
            textarea
            rows={4}
            required
            placeholder="Enter comments for returning the request..."
          />
          <div className="flex space-x-3 pt-4">
            <button
              onClick={() => {
                setReturnModalOpen(false);
                setSelectedRequest(null);
                setReturnComment('');
              }}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={confirmReturn}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Return Request
            </button>
          </div>
        </div>
      </Modal>

      {/* Approve Modal */}
      <Modal
        isOpen={approveModalOpen}
        onClose={() => {
          setApproveModalOpen(false);
          setSelectedRequest(null);
          setAuthorizationPrice('');
        }}
        title="Approve Instructor Request"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-gray-600">Please set the authorization price for this instructor:</p>
          <FormInput
            label="Authorization Price"
            name="authorization_price"
            type="number"
            value={authorizationPrice}
            onChange={(e) => setAuthorizationPrice(e.target.value)}
            required
            min="0"
            step="0.01"
            placeholder="500.00"
          />
          <p className="text-sm text-gray-500">
            After approval, Group Admin will need to set the commission percentage before Training Center can pay.
          </p>
          <div className="flex space-x-3 pt-4">
            <button
              onClick={() => {
                setApproveModalOpen(false);
                setSelectedRequest(null);
                setAuthorizationPrice('');
              }}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={confirmApprove}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Approve
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default InstructorsScreen;
