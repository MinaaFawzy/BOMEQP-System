import { useEffect, useState, useMemo, useCallback } from 'react';
import { accAPI } from '../../../services/api';
import { useHeader } from '../../../context/HeaderContext';
import { GraduationCap, Eye, Clock, Calendar, MapPin, Users, User, Building2, BookOpen, Mail, Phone, Globe, CheckCircle, XCircle, FileText, Image as ImageIcon, Hash, Search } from 'lucide-react';
import Modal from '../../../components/Modal/Modal';
import DataTable from '../../../components/DataTable/DataTable';
import DetailForm from '../../../components/DetailForm/DetailForm';
import Pagination from '../../../components/Pagination/Pagination';
import './ClassesScreen.css';

const ClassesScreen = () => {
  const { setHeaderTitle, setHeaderSubtitle } = useHeader();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  // Pagination State
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
    per_page: 5,
    from: 0,
    to: 0
  });

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPagination(prev => ({ ...prev, current_page: 1 }));
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setHeaderTitle('Classes');
    setHeaderSubtitle('View all classes from authorized training centers');
    return () => {
      setHeaderTitle(null);
      setHeaderSubtitle(null);
    };
  }, [setHeaderTitle, setHeaderSubtitle]);

  // Load data when dependencies change
  useEffect(() => {
    loadClasses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, pagination.current_page, pagination.per_page, debouncedSearch]);

  const loadClasses = async () => {
    setLoading(true);
    try {
      // Build query parameters for server-side filtering and pagination
      const params = {
        page: pagination.current_page,
        per_page: pagination.per_page,
        search: debouncedSearch,
      };

      // Add status filter if not 'all'
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      const response = await accAPI.listClasses(params);

      // Handle Laravel pagination response
      const classesArray = response?.data || [];
      setClasses(classesArray);

      // Update pagination state
      if (response) {
        setPagination(prev => ({
          ...prev,
          current_page: response.current_page || 1,
          last_page: response.last_page || 1,
          total: response.total || 0,
          from: response.from || 0,
          to: response.to || 0
        }));
      }
    } catch (error) {
      console.error('Failed to load classes:', error);
      setClasses([]);
    } finally {
      setLoading(false);
    }
  };

  // Pagination handlers
  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, current_page: newPage }));
  };

  const handlePerPageChange = (newPerPage) => {
    setPagination(prev => ({
      ...prev,
      per_page: parseInt(newPerPage),
      current_page: 1
    }));
  };

  const handleViewDetails = useCallback(async (classItem) => {
    try {
      const data = await accAPI.getClassDetails(classItem.id);
      setSelectedClass(data.class || data);
      setDetailModalOpen(true);
    } catch (error) {
      console.error('Failed to load class details:', error);
      setSelectedClass(classItem);
      setDetailModalOpen(true);
    }
  }, []);

  const handleRowClick = useCallback((classItem) => {
    handleViewDetails(classItem);
  }, []);

  // Define columns for DataTable
  const columns = useMemo(() => [
    {
      header: 'Class Name',
      accessor: 'name',
      sortable: true,
      render: (value, row) => (
        <div className="font-semibold text-gray-900">
          {value || 'N/A'}
        </div>
      )
    },
    {
      header: 'Course',
      accessor: 'course',
      sortable: true,
      render: (value, row) => (
        <div className="flex items-center">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg flex items-center justify-center mr-3">
            <BookOpen className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900">
              {value?.name || 'N/A'}
            </div>
            {value?.code && (
              <div className="text-xs text-gray-500">Code: {value.code}</div>
            )}
          </div>
        </div>
      )
    },
    {
      header: 'Training Center',
      accessor: 'training_center',
      sortable: true,
      render: (value) => (
        <div className="flex items-center">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-2">
            <Building2 className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-sm font-medium text-gray-900">
            {value?.name || 'N/A'}
          </div>
        </div>
      )
    },
    {
      header: 'Instructor',
      accessor: 'instructor',
      sortable: true,
      render: (value) => {
        if (!value) return <span className="text-sm text-gray-400">N/A</span>;
        return (
          <div className="flex items-center">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-2">
              <User className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900">
                {`${value.first_name || ''} ${value.last_name || ''}`.trim() || 'N/A'}
              </div>
              {value.email && (
                <div className="text-xs text-gray-500">{value.email}</div>
              )}
            </div>
          </div>
        );
      }
    },
    {
      header: 'Schedule',
      accessor: 'start_date',
      sortable: true,
      render: (value, row) => (
        <div className="text-sm text-gray-900">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4 text-gray-400" />
            <span className="font-medium">{formatDate(value)}</span>
          </div>
          {row.end_date && (
            <div className="text-xs text-gray-500 mt-1">
              to {formatDate(row.end_date)}
            </div>
          )}
        </div>
      )
    },
    {
      header: 'Exam Date',
      accessor: 'exam_date',
      sortable: true,
      render: (value) => (
        <div className="text-sm text-gray-900">
          {value ? (
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4 text-purple-400" />
              <span className="font-medium">{formatDate(value)}</span>
            </div>
          ) : (
            <span className="text-gray-400">Not set</span>
          )}
        </div>
      )
    },
    {
      header: 'Exam Score',
      accessor: 'exam_score',
      sortable: true,
      render: (value) => (
        <div className="text-sm text-gray-900">
          {value !== null && value !== undefined ? (
            <div className="flex items-center gap-1">
              <FileText className="h-4 w-4 text-indigo-400" />
              <span className="font-semibold">{parseFloat(value).toFixed(2)}%</span>
            </div>
          ) : (
            <span className="text-gray-400">N/A</span>
          )}
        </div>
      )
    },
    {
      header: 'Location',
      accessor: 'location',
      sortable: true,
      render: (value, row) => (
        <div className="flex items-center gap-2">
          <span className="text-lg">{getLocationIcon(value)}</span>
          <div>
            <div className="text-sm font-medium text-gray-900 capitalize">
              {value || 'N/A'}
            </div>
            {row.location_details && (
              <div className="text-xs text-gray-500 truncate max-w-xs">
                {row.location_details}
              </div>
            )}
          </div>
        </div>
      )
    },
    {
      header: 'Capacity',
      accessor: 'enrolled_count',
      sortable: true,
      render: (value, row) => (
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-gray-400" />
          <div>
            <div className="text-sm font-semibold text-gray-900">
              {value || 0} / {row.course?.max_capacity || 'N/A'}
            </div>
            {row.course?.max_capacity && (
              <div className="text-xs text-gray-500">
                {Math.round(((value || 0) / row.course.max_capacity) * 100)}% full
              </div>
            )}
          </div>
        </div>
      )
    },
    {
      header: 'Status',
      accessor: 'status',
      sortable: true,
      render: (value) => (
        <span className={`px-3 py-1.5 inline-flex text-xs leading-5 font-bold rounded-full shadow-sm ${getStatusBadgeClass(value)}`}>
          {value ? value.charAt(0).toUpperCase() + value.slice(1).replace('_', ' ') : 'N/A'}
        </span>
      )
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
        </div>
      )
    }
  ], [handleViewDetails]);

  // filteredData removed - using server-side filtering

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300';
      case 'in_progress':
        return 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-300';
      case 'scheduled':
        return 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 border border-yellow-300';
      case 'cancelled':
        return 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 border border-red-300';
      default:
        return 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300';
    }
  };

  const getLocationIcon = (location) => {
    switch (location) {
      case 'online':
        return '🌐';
      case 'hybrid':
        return '🔀';
      default:
        return '📍';
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="mb-4">
        <div className="flex gap-4">
          {/* Search Input */}
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search classes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
            />
            <div className="absolute left-3 top-2.5 text-gray-400">
              <Search size={20} />
            </div>
          </div>

          {/* Status Filter */}
          <div className="w-48">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPagination(prev => ({ ...prev, current_page: 1 }));
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all bg-white cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27currentColor%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e')] bg-[length:1.25rem] bg-[right_0.5rem_center] bg-no-repeat pr-10"
            >
              <option value="all">All Status</option>
              <option value="scheduled">Scheduled</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* DataTable */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        <DataTable
          columns={columns}
          data={classes}
          isLoading={loading}
          searchable={false}
          sortable={true}
          filterable={false}
          emptyMessage="No classes found"
          onRowClick={(classItem) => handleRowClick(classItem)}
        />

        {/* Pagination */}
        {pagination.total > 0 && (
          <div className="border-t border-gray-100">
            <Pagination
              currentPage={pagination.current_page}
              totalPages={pagination.last_page}
              onPageChange={handlePageChange}
              totalItems={pagination.total}
              perPage={pagination.per_page}
              onPerPageChange={handlePerPageChange}
            />
          </div>
        )}
      </div>

      {/* Class Detail Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedClass(null);
        }}
        title="Class Details"
        size="lg"
      >
        {selectedClass && (
          <div className="space-y-6">
            {/* Class Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <GraduationCap className="mr-2" size={20} />
                Class Information
              </h3>
              <DetailForm
                data={selectedClass}
                fields={[
                  { key: 'status', label: 'Status', type: 'status', icon: Clock },
                  { key: 'created_at', label: 'Created At', type: 'datetime', icon: Calendar, showEmpty: false },
                  { key: 'updated_at', label: 'Updated At', type: 'datetime', icon: Calendar, showEmpty: false },
                ]}
              />
            </div>

            {/* Course Information */}
            {selectedClass.course && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <BookOpen className="mr-2" size={20} />
                  Course Information
                </h3>
                <DetailForm
                  data={selectedClass.course}
                  fields={[
                    { key: 'name', label: 'Course Name', icon: BookOpen },
                    { key: 'code', label: 'Course Code', icon: Hash, showEmpty: false },
                    { key: 'name_ar', label: 'Course Name (Arabic)', showEmpty: false },
                    { key: 'duration_hours', label: 'Duration', icon: Clock, render: (value) => value ? `${value} hours` : 'N/A', showEmpty: false },
                    { key: 'level', label: 'Level', render: (value) => value ? value.charAt(0).toUpperCase() + value.slice(1) : 'N/A', showEmpty: false },
                    { key: 'max_capacity', label: 'Max Capacity', render: (value) => value ? `${value} trainees` : 'N/A', showEmpty: false },
                    { key: 'status', label: 'Course Status', type: 'status', showEmpty: false },
                  ]}
                />
                {selectedClass.course.description && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1">Description</p>
                    <p className="text-base text-gray-900 whitespace-pre-wrap">{selectedClass.course.description}</p>
                  </div>
                )}
                {selectedClass.course.sub_category && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1">Sub Category</p>
                    <p className="text-base font-semibold text-gray-900">
                      {selectedClass.course.sub_category.name || 'N/A'}
                    </p>
                    {selectedClass.course.sub_category.category && (
                      <p className="text-sm text-gray-600 mt-1">
                        Category: {selectedClass.course.sub_category.category.name || 'N/A'}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Training Center Information */}
            {selectedClass.training_center && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Building2 className="mr-2" size={20} />
                  Training Center Information
                </h3>
                <DetailForm
                  data={selectedClass.training_center}
                  fields={[
                    { key: 'name', label: 'Name', icon: Building2 },
                    { key: 'email', label: 'Email', type: 'email', icon: Mail, showEmpty: false },
                    { key: 'phone', label: 'Phone', icon: Phone, showEmpty: false },
                    { key: 'website', label: 'Website', type: 'url', icon: Globe, showEmpty: false },
                    { key: 'address', label: 'Address', icon: MapPin, fullWidth: true, showEmpty: false },
                    { key: 'city', label: 'City', icon: MapPin, showEmpty: false },
                    { key: 'country', label: 'Country', icon: MapPin, showEmpty: false },
                  ]}
                />
              </div>
            )}

            {/* Instructor Information */}
            {selectedClass.instructor && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <User className="mr-2" size={20} />
                  Instructor Information
                </h3>
                <DetailForm
                  data={selectedClass.instructor}
                  fields={[
                    { key: 'first_name', label: 'First Name', icon: User },
                    { key: 'last_name', label: 'Last Name', icon: User },
                    { key: 'email', label: 'Email', type: 'email', icon: Mail, showEmpty: false },
                    { key: 'phone', label: 'Phone', icon: Phone, showEmpty: false },
                    { key: 'country', label: 'Country', icon: MapPin, showEmpty: false },
                    { key: 'city', label: 'City', icon: MapPin, showEmpty: false },
                  ]}
                />
              </div>
            )}

            {/* Schedule Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Calendar className="mr-2" size={20} />
                Schedule Information
              </h3>
              <DetailForm
                data={selectedClass}
                fields={[
                  { key: 'start_date', label: 'Start Date', type: 'datetime', icon: Calendar },
                  { key: 'end_date', label: 'End Date', type: 'datetime', icon: Calendar, showEmpty: false },
                  { key: 'exam_date', label: 'Exam Date', type: 'datetime', icon: Calendar, showEmpty: false },
                  { key: 'exam_score', label: 'Exam Score', icon: FileText, render: (value) => value !== null && value !== undefined ? `${parseFloat(value).toFixed(2)}%` : 'N/A', showEmpty: false },
                  { key: 'start_time', label: 'Start Time', icon: Clock, showEmpty: false },
                  { key: 'end_time', label: 'End Time', icon: Clock, showEmpty: false },
                ]}
              />
              {selectedClass.schedule_json && Object.keys(selectedClass.schedule_json).length > 0 && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-700 mb-3">Weekly Schedule</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {Object.entries(selectedClass.schedule_json).map(([day, time]) => (
                      <div key={day} className="p-3 bg-white rounded-lg border border-gray-200">
                        <span className="font-semibold text-gray-900 capitalize">{day}:</span>
                        <span className="text-gray-700 ml-2">{time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Location & Capacity */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Location & Capacity</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1 flex items-center gap-2">
                    <MapPin size={14} />
                    Location Type
                  </p>
                  <p className="text-base font-semibold text-gray-900 capitalize">{selectedClass.location || 'N/A'}</p>
                  {selectedClass.location_details && (
                    <div className="mt-2">
                      <p className="text-sm text-gray-500 mb-1">Location Details</p>
                      <p className="text-sm text-gray-700">{selectedClass.location_details}</p>
                    </div>
                  )}
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1 flex items-center gap-2">
                    <Users size={14} />
                    Capacity
                  </p>
                  <p className="text-base font-semibold text-gray-900">
                    {selectedClass.enrolled_count || 0} / {selectedClass.course?.max_capacity || 'N/A'}
                  </p>
                  {selectedClass.course?.max_capacity && (
                    <div className="mt-3">
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                          className="bg-indigo-600 h-2.5 rounded-full transition-all"
                          style={{
                            width: `${Math.min(((selectedClass.enrolled_count || 0) / selectedClass.course.max_capacity) * 100, 100)}%`
                          }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {Math.round(((selectedClass.enrolled_count || 0) / selectedClass.course.max_capacity) * 100)}% full
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Trainees Information */}
            {selectedClass.trainees && Array.isArray(selectedClass.trainees) && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Users className="mr-2" size={20} />
                  Trainees ({selectedClass.trainees.length})
                </h3>
                {selectedClass.trainees.length === 0 ? (
                  <div className="p-6 bg-gray-50 rounded-lg border border-gray-200 text-center">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm font-medium text-gray-700">No trainees enrolled in this class</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedClass.trainees.map((trainee, index) => {
                      const profileImageUrl = trainee.profile_image_url || trainee.avatar_url || trainee.id_image_url || null;
                      const imageUrl = profileImageUrl
                        ? (profileImageUrl.startsWith('http')
                          ? profileImageUrl
                          : `${import.meta.env.VITE_API_BASE_URL || 'https://aeroenix.com/v1/api'}${profileImageUrl}`)
                        : null;

                      return (
                        <div key={trainee.id || index} className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-gray-100 transition-all">
                          <div className="flex items-center space-x-3">
                            {/* Profile Image - Circle */}
                            <div className="flex-shrink-0">
                              {imageUrl ? (
                                <img
                                  src={imageUrl}
                                  alt={`${trainee.first_name} ${trainee.last_name}`}
                                  className="w-10 h-10 rounded-full object-cover border-2 border-primary-200"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'flex';
                                  }}
                                />
                              ) : null}
                              <div
                                className={`w-10 h-10 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center border-2 border-primary-200 ${imageUrl ? 'hidden' : ''}`}
                              >
                                <User className="h-5 w-5 text-primary-600" />
                              </div>
                            </div>

                            {/* Name and ID */}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900">
                                {trainee.first_name} {trainee.last_name}
                              </p>
                              {trainee.id_number && (
                                <p className="text-xs text-gray-500">ID: {trainee.id_number}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ClassesScreen;

