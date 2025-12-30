import { useEffect, useState } from 'react';
import { accAPI } from '../../../services/api';
import { useHeader } from '../../../context/HeaderContext';
import { GraduationCap, Eye, Search, Filter, Clock, Calendar, MapPin, Users, User, Building2, BookOpen } from 'lucide-react';
import Modal from '../../../components/Modal/Modal';
import Pagination from '../../../components/Pagination/Pagination';
import './ClassesScreen.css';

const ClassesScreen = () => {
  const { setHeaderTitle, setHeaderSubtitle } = useHeader();
  const [classes, setClasses] = useState([]);
  const [trainingCenters, setTrainingCenters] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  
  // Filters and pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [trainingCenterFilter, setTrainingCenterFilter] = useState('all');
  const [courseFilter, setCourseFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setHeaderTitle('Classes');
    setHeaderSubtitle('View all classes from authorized training centers');
    return () => {
      setHeaderTitle(null);
      setHeaderSubtitle(null);
    };
  }, [setHeaderTitle, setHeaderSubtitle]);

  useEffect(() => {
    loadClasses();
    loadTrainingCenters();
    loadCourses();
  }, [currentPage, perPage, statusFilter, trainingCenterFilter, courseFilter, dateFrom, dateTo]);

  const loadClasses = async () => {
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        per_page: perPage,
      };
      
      if (statusFilter !== 'all') params.status = statusFilter;
      if (trainingCenterFilter !== 'all') params.training_center_id = trainingCenterFilter;
      if (courseFilter !== 'all') params.course_id = courseFilter;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const response = await accAPI.listClasses(params);
      const data = response?.data || response || [];
      
      setClasses(Array.isArray(data) ? data : (data?.data || []));
      
      if (response?.total !== undefined) {
        setTotalItems(response.total);
        setTotalPages(response.last_page || Math.ceil(response.total / perPage));
      } else if (data?.total !== undefined) {
        setTotalItems(data.total);
        setTotalPages(data.last_page || Math.ceil(data.total / perPage));
      }
    } catch (error) {
      console.error('Failed to load classes:', error);
      setClasses([]);
    } finally {
      setLoading(false);
    }
  };

  const loadTrainingCenters = async () => {
    try {
      const response = await accAPI.listAuthorizedTrainingCenters({ per_page: 100 });
      const data = response?.data || response?.training_centers || [];
      setTrainingCenters(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load training centers:', error);
    }
  };

  const loadCourses = async () => {
    try {
      const response = await accAPI.listCourses({ per_page: 100 });
      const data = response?.data || response?.courses || [];
      setCourses(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load courses:', error);
    }
  };

  const handleViewDetails = async (classItem) => {
    try {
      const data = await accAPI.getClassDetails(classItem.id);
      setSelectedClass(data);
      setDetailModalOpen(true);
    } catch (error) {
      console.error('Failed to load class details:', error);
      setSelectedClass(classItem);
      setDetailModalOpen(true);
    }
  };

  // Filter classes by search term
  const filteredClasses = classes.filter(classItem => {
    if (!searchTerm) return true;
    
    const term = searchTerm.toLowerCase();
    const courseName = classItem.course?.name || '';
    const trainingCenterName = classItem.training_center?.name || '';
    const instructorName = `${classItem.instructor?.first_name || ''} ${classItem.instructor?.last_name || ''}`.trim();
    const location = classItem.location_details || '';
    const status = classItem.status || '';
    
    return (
      courseName.toLowerCase().includes(term) ||
      trainingCenterName.toLowerCase().includes(term) ||
      instructorName.toLowerCase().includes(term) ||
      location.toLowerCase().includes(term) ||
      status.toLowerCase().includes(term)
    );
  });

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
      {/* Filters Section */}
      <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search classes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-8 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none bg-white cursor-pointer transition-all"
            >
              <option value="all">All Status</option>
              <option value="scheduled">Scheduled</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Training Center Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <select
              value={trainingCenterFilter}
              onChange={(e) => {
                setTrainingCenterFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-8 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none bg-white cursor-pointer transition-all"
            >
              <option value="all">All Training Centers</option>
              {trainingCenters.map(tc => (
                <option key={tc.id} value={tc.id}>{tc.name}</option>
              ))}
            </select>
          </div>

          {/* Course Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <select
              value={courseFilter}
              onChange={(e) => {
                setCourseFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-8 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none bg-white cursor-pointer transition-all"
            >
              <option value="all">All Courses</option>
              {courses.map(course => (
                <option key={course.id} value={course.id}>{course.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Date From */}
          <div>
            <input
              type="date"
              placeholder="Date From"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Date To */}
          <div>
            <input
              type="date"
              placeholder="Date To"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
            />
          </div>
        </div>
      </div>

      {/* Classes Table */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="table-header-gradient">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Course</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Training Center</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Instructor</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Schedule</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Location</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Capacity</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filteredClasses.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center">
                        <div className="flex flex-col items-center">
                          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <GraduationCap className="text-gray-400" size={32} />
                          </div>
                          <p className="text-gray-500 font-medium">No classes found</p>
                          <p className="text-sm text-gray-400 mt-1">
                            {searchTerm || statusFilter !== 'all' || trainingCenterFilter !== 'all' || courseFilter !== 'all'
                              ? 'No classes match your search criteria'
                              : 'No classes available'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredClasses.map((classItem, index) => (
                      <tr
                        key={classItem.id || index}
                        className="hover:bg-gradient-to-r hover:from-primary-50/30 hover:to-white transition-all duration-200 group table-row-animated"
                        style={{ '--animation-delay': `${index * 0.03}s` }}
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg flex items-center justify-center mr-3 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                              <BookOpen className="h-5 w-5 text-primary-600" />
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-gray-900 group-hover:text-primary-700 transition-colors">
                                {classItem.course?.name || 'N/A'}
                              </div>
                              <div className="text-xs text-gray-500">
                                {classItem.course?.code || ''}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-2">
                              <Building2 className="h-4 w-4 text-blue-600" />
                            </div>
                            <div className="text-sm font-medium text-gray-900">
                              {classItem.training_center?.name || 'N/A'}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {classItem.instructor ? (
                            <div className="flex items-center">
                              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-2">
                                <User className="h-4 w-4 text-green-600" />
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {`${classItem.instructor.first_name || ''} ${classItem.instructor.last_name || ''}`.trim() || 'N/A'}
                                </div>
                                {classItem.instructor.email && (
                                  <div className="text-xs text-gray-500">{classItem.instructor.email}</div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">N/A</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4 text-gray-400" />
                              <span className="font-medium">{formatDate(classItem.start_date)}</span>
                            </div>
                            {classItem.end_date && (
                              <div className="text-xs text-gray-500 mt-1">
                                to {formatDate(classItem.end_date)}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{getLocationIcon(classItem.location)}</span>
                            <div>
                              <div className="text-sm font-medium text-gray-900 capitalize">
                                {classItem.location || 'N/A'}
                              </div>
                              {classItem.location_details && (
                                <div className="text-xs text-gray-500 truncate max-w-xs">
                                  {classItem.location_details}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-gray-400" />
                            <div>
                              <div className="text-sm font-semibold text-gray-900">
                                {classItem.enrolled_count || 0} / {classItem.course?.max_capacity || 'N/A'}
                              </div>
                              <div className="text-xs text-gray-500">
                                {classItem.course?.max_capacity ? Math.round(((classItem.enrolled_count || 0) / classItem.course.max_capacity) * 100) : 0}% full
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-3 py-1.5 inline-flex text-xs leading-5 font-bold rounded-full shadow-sm ${getStatusBadgeClass(classItem.status)}`}>
                            {classItem.status?.charAt(0).toUpperCase() + classItem.status?.slice(1).replace('_', ' ') || 'N/A'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleViewDetails(classItem)}
                              className="p-2 rounded-lg bg-primary-50 text-primary-600 hover:bg-primary-100 hover:scale-110 transition-all duration-200 shadow-sm hover:shadow-md"
                              title="View Details"
                            >
                              <Eye size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalItems > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              perPage={perPage}
              onPageChange={setCurrentPage}
              onPerPageChange={(newPerPage) => {
                setPerPage(newPerPage);
                setCurrentPage(1);
              }}
            />
          )}
        </>
      )}

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
          <div className="space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Course</p>
                <p className="text-base font-semibold text-gray-900">{selectedClass.course?.name || 'N/A'}</p>
                {selectedClass.course?.code && (
                  <p className="text-sm text-gray-500 mt-1">Code: {selectedClass.course.code}</p>
                )}
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Status</p>
                <span className={`px-3 py-1.5 inline-flex text-xs leading-5 font-bold rounded-full ${getStatusBadgeClass(selectedClass.status)}`}>
                  {selectedClass.status?.charAt(0).toUpperCase() + selectedClass.status?.slice(1).replace('_', ' ') || 'N/A'}
                </span>
              </div>
            </div>

            {/* Training Center Info */}
            {selectedClass.training_center && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm font-medium text-blue-700 mb-3 flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Training Center Information
                </p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-600">Name:</span>
                    <span className="font-semibold text-gray-900 ml-2">{selectedClass.training_center.name}</span>
                  </div>
                  {selectedClass.training_center.email && (
                    <div>
                      <span className="text-gray-600">Email:</span>
                      <span className="font-semibold text-gray-900 ml-2">{selectedClass.training_center.email}</span>
                    </div>
                  )}
                  {selectedClass.training_center.phone && (
                    <div>
                      <span className="text-gray-600">Phone:</span>
                      <span className="font-semibold text-gray-900 ml-2">{selectedClass.training_center.phone}</span>
                    </div>
                  )}
                  {selectedClass.training_center.city && (
                    <div>
                      <span className="text-gray-600">Location:</span>
                      <span className="font-semibold text-gray-900 ml-2">
                        {selectedClass.training_center.city}, {selectedClass.training_center.country}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Instructor Info */}
            {selectedClass.instructor && (
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm font-medium text-green-700 mb-3 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Instructor Information
                </p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-600">Name:</span>
                    <span className="font-semibold text-gray-900 ml-2">
                      {`${selectedClass.instructor.first_name || ''} ${selectedClass.instructor.last_name || ''}`.trim() || 'N/A'}
                    </span>
                  </div>
                  {selectedClass.instructor.email && (
                    <div>
                      <span className="text-gray-600">Email:</span>
                      <span className="font-semibold text-gray-900 ml-2">{selectedClass.instructor.email}</span>
                    </div>
                  )}
                  {selectedClass.instructor.phone && (
                    <div>
                      <span className="text-gray-600">Phone:</span>
                      <span className="font-semibold text-gray-900 ml-2">{selectedClass.instructor.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Schedule Info */}
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <p className="text-sm font-medium text-purple-700 mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Schedule Information
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Start Date</p>
                  <p className="text-base font-semibold text-gray-900">{formatDate(selectedClass.start_date)}</p>
                </div>
                {selectedClass.end_date && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">End Date</p>
                    <p className="text-base font-semibold text-gray-900">{formatDate(selectedClass.end_date)}</p>
                  </div>
                )}
              </div>
              {selectedClass.schedule_json && Object.keys(selectedClass.schedule_json).length > 0 && (
                <div className="mt-3 pt-3 border-t border-purple-200">
                  <p className="text-sm text-gray-600 mb-2">Weekly Schedule</p>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(selectedClass.schedule_json).map(([day, time]) => (
                      <div key={day} className="text-sm">
                        <span className="font-semibold text-gray-900 capitalize">{day}:</span>
                        <span className="text-gray-700 ml-2">{time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Location & Capacity */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-sm text-gray-600 mb-1 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Location
                </p>
                <p className="text-base font-semibold text-gray-900 capitalize">{selectedClass.location || 'N/A'}</p>
                {selectedClass.location_details && (
                  <p className="text-sm text-gray-700 mt-1">{selectedClass.location_details}</p>
                )}
              </div>
              <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                <p className="text-sm text-gray-600 mb-1 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Capacity
                </p>
                <p className="text-base font-semibold text-gray-900">
                  {selectedClass.enrolled_count || 0} / {selectedClass.course?.max_capacity || 'N/A'}
                </p>
                {selectedClass.course?.max_capacity && (
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-indigo-600 h-2 rounded-full"
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

            {/* Course Details */}
            {selectedClass.course && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Course Details
                </p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {selectedClass.course.description && (
                    <div className="col-span-2">
                      <span className="text-gray-600">Description:</span>
                      <p className="text-gray-900 mt-1">{selectedClass.course.description}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-600">Duration:</span>
                    <span className="font-semibold text-gray-900 ml-2">{selectedClass.course.duration_hours || 'N/A'} hours</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Level:</span>
                    <span className="font-semibold text-gray-900 ml-2 capitalize">{selectedClass.course.level || 'N/A'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Created At</p>
                <p className="text-base font-semibold text-gray-900">{formatDateTime(selectedClass.created_at)}</p>
              </div>
              {selectedClass.updated_at && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Updated At</p>
                  <p className="text-base font-semibold text-gray-900">{formatDateTime(selectedClass.updated_at)}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ClassesScreen;

