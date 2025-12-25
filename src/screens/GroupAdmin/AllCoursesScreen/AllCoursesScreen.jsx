import { useEffect, useState } from 'react';
import { adminAPI } from '../../../services/api';
import { useHeader } from '../../../context/HeaderContext';
import { GraduationCap, Eye, Building2, Clock, DollarSign, Search, X, Layers, ChevronUp, ChevronDown, CheckCircle, XCircle, FileText } from 'lucide-react';
import Modal from '../../../components/Modal/Modal';
import Button from '../../../components/Button/Button';
import Pagination from '../../../components/Pagination/Pagination';
import './AllCoursesScreen.css';

const AllCoursesScreen = () => {
  const { setHeaderTitle, setHeaderSubtitle } = useHeader();
  const [courses, setCourses] = useState([]);
  const [allCourses, setAllCourses] = useState([]); // Unfiltered list for stats
  const [sortedCourses, setSortedCourses] = useState([]);
  const [paginatedData, setPaginatedData] = useState([]);
  const [filteredTotal, setFilteredTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');
  const [pagination, setPagination] = useState({
    currentPage: 1,
    perPage: 10,
    totalPages: 1,
    totalItems: 0,
  });

  // Load courses with pagination
  useEffect(() => {
    loadCourses();
  }, [pagination.currentPage, pagination.perPage]);

  useEffect(() => {
    setHeaderTitle('Courses');
    setHeaderSubtitle('View and manage all courses across all ACCs');
    return () => {
      setHeaderTitle(null);
      setHeaderSubtitle(null);
    };
  }, [setHeaderTitle, setHeaderSubtitle]);

  const loadCourses = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.currentPage,
        per_page: pagination.perPage,
      };
      
      // All filtering (statusFilter, levelFilter, searchTerm) is now client-side only
      
      const data = await adminAPI.listCourses(params);
      
      let coursesList = [];
      if (data.data) {
        coursesList = data.data || [];
        setPagination(prev => ({
          ...prev,
          totalPages: data.last_page || data.total_pages || 1,
          totalItems: data.total || 0,
        }));
      } else if (data.courses) {
        coursesList = data.courses || [];
        setPagination(prev => ({
          ...prev,
          totalPages: 1,
          totalItems: data.courses?.length || 0,
        }));
      } else {
        coursesList = Array.isArray(data) ? data : [];
        setPagination(prev => ({
          ...prev,
          totalPages: 1,
          totalItems: coursesList.length,
        }));
      }
      
      setCourses(coursesList);
      setSortedCourses(coursesList);
      setAllCourses(coursesList); // Also set for stats
    } catch (error) {
      console.error('Failed to load courses:', error);
      setCourses([]);
      setSortedCourses([]);
      setAllCourses([]);
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

  // Sort courses
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Apply filtering and sorting
  useEffect(() => {
    let filtered = [...courses];

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(course => course.status === statusFilter);
    }

    // Apply level filter
    if (levelFilter !== 'all') {
      filtered = filtered.filter(course => course.level === levelFilter);
    }

    // Apply search filter (client-side)
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(course => {
        const name = (course.name || '').toLowerCase();
        const code = (course.code || '').toLowerCase();
        return name.includes(searchLower) || code.includes(searchLower);
      });
    }

    // Apply sorting
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aValue, bValue;
        
        if (sortConfig.key === 'name') {
          aValue = (a.name || '').toLowerCase();
          bValue = (b.name || '').toLowerCase();
        } else if (sortConfig.key === 'acc') {
          const aACC = a.acc;
          const bACC = b.acc;
          aValue = typeof aACC === 'object' && aACC ? (aACC.name || '').toLowerCase() : '';
          bValue = typeof bACC === 'object' && bACC ? (bACC.name || '').toLowerCase() : '';
        } else if (sortConfig.key === 'sub_category') {
          const aSubCat = a.sub_category;
          const bSubCat = b.sub_category;
          aValue = typeof aSubCat === 'object' && aSubCat ? (aSubCat.name || '').toLowerCase() : '';
          bValue = typeof bSubCat === 'object' && bSubCat ? (bSubCat.name || '').toLowerCase() : '';
        } else if (sortConfig.key === 'duration_hours') {
          aValue = a.duration_hours || 0;
          bValue = b.duration_hours || 0;
        } else {
          aValue = a[sortConfig.key] || '';
          bValue = b[sortConfig.key] || '';
        }
        
        if (sortConfig.key === 'duration_hours') {
          // Already numbers
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
    
    setSortedCourses(filtered);
    setFilteredTotal(filtered.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortConfig, courses, statusFilter, levelFilter, searchTerm]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPagination(prev => {
      if (prev.currentPage !== 1) {
        return { ...prev, currentPage: 1 };
      }
      return prev;
    });
  }, [statusFilter, levelFilter, searchTerm]);

  // Apply pagination to filtered data
  useEffect(() => {
    const startIndex = (pagination.currentPage - 1) * pagination.perPage;
    const endIndex = startIndex + pagination.perPage;
    const paginated = sortedCourses.slice(startIndex, endIndex);
    setPaginatedData(paginated);
  }, [sortedCourses, pagination.currentPage, pagination.perPage]);

  const handleViewDetails = async (course) => {
    setDetailModalOpen(true);
    setDetailLoading(true);
    try {
      const data = await adminAPI.getCourseDetails(course.id);
      setSelectedCourse(data.course || course);
    } catch (error) {
      console.error('Failed to load course details:', error);
      setSelectedCourse(course);
    } finally {
      setDetailLoading(false);
    }
  };

  // Calculate stats from all courses (unfiltered)
  const totalCount = allCourses.length;
  const activeCount = allCourses.filter(c => c.status === 'active').length;
  const inactiveCount = allCourses.filter(c => c.status === 'inactive').length;
  const archivedCount = allCourses.filter(c => c.status === 'archived').length;

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;
  }

  return (
    <div className="space-y-4">

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Courses */}
        <div
          onClick={() => {
            setStatusFilter('all');
            setPagination(prev => ({ ...prev, currentPage: 1 }));
          }}
          className={`bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl shadow-lg p-6 border border-primary-200 hover:shadow-xl transition-all duration-300 cursor-pointer ${
            statusFilter === 'all' ? 'ring-2 ring-primary-500' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-primary-700 mb-2">Total Courses</p>
              <p className="text-3xl font-bold text-primary-900">{totalCount}</p>
            </div>
            <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg">
              <GraduationCap className="text-white" size={32} />
            </div>
          </div>
        </div>

        {/* Active */}
        <div
          onClick={() => {
            setStatusFilter('active');
            setPagination(prev => ({ ...prev, currentPage: 1 }));
          }}
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

        {/* Inactive */}
        <div
          onClick={() => {
            setStatusFilter('inactive');
            setPagination(prev => ({ ...prev, currentPage: 1 }));
          }}
          className={`bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl shadow-lg p-6 border border-yellow-200 hover:shadow-xl transition-all duration-300 cursor-pointer ${
            statusFilter === 'inactive' ? 'ring-2 ring-yellow-500' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-700 mb-2">Inactive</p>
              <p className="text-3xl font-bold text-yellow-900">{inactiveCount}</p>
            </div>
            <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center shadow-lg">
              <Clock className="text-white" size={32} />
            </div>
          </div>
        </div>

        {/* Archived */}
        <div
          onClick={() => {
            setStatusFilter('archived');
            setPagination(prev => ({ ...prev, currentPage: 1 }));
          }}
          className={`bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-all duration-300 cursor-pointer ${
            statusFilter === 'archived' ? 'ring-2 ring-gray-500' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Archived</p>
              <p className="text-3xl font-bold text-gray-900">{archivedCount}</p>
            </div>
            <div className="w-16 h-16 bg-gradient-to-br from-gray-500 to-gray-600 rounded-xl flex items-center justify-center shadow-lg">
              <XCircle className="text-white" size={32} />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter Section */}
      <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-100">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search Input */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by name or code..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPagination(prev => ({ ...prev, currentPage: 1 }));
              }}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Level Filter */}
          <div className="relative">
            <Layers className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <select
              value={levelFilter}
              onChange={(e) => {
                setLevelFilter(e.target.value);
                setPagination(prev => ({ ...prev, currentPage: 1 }));
              }}
              className="pl-10 pr-8 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none bg-white cursor-pointer transition-all"
            >
              <option value="all">All Levels</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
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
                    Course
                    {sortConfig.key === 'name' && (
                      sortConfig.direction === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                    )}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-primary-700 transition-colors select-none"
                  onClick={() => handleSort('acc')}
                >
                  <div className="flex items-center gap-2">
                    ACC
                    {sortConfig.key === 'acc' && (
                      sortConfig.direction === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                    )}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-primary-700 transition-colors select-none"
                  onClick={() => handleSort('sub_category')}
                >
                  <div className="flex items-center gap-2">
                    Sub Category
                    {sortConfig.key === 'sub_category' && (
                      sortConfig.direction === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                    )}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-primary-700 transition-colors select-none"
                  onClick={() => handleSort('level')}
                >
                  <div className="flex items-center gap-2">
                    Level
                    {sortConfig.key === 'level' && (
                      sortConfig.direction === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                    )}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-primary-700 transition-colors select-none"
                  onClick={() => handleSort('duration_hours')}
                >
                  <div className="flex items-center gap-2">
                    Duration
                    {sortConfig.key === 'duration_hours' && (
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
                <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {sortedCourses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <GraduationCap className="text-gray-400" size={32} />
                      </div>
                      <p className="text-gray-500 font-medium">No courses found</p>
                      <p className="text-sm text-gray-400 mt-1">No courses match your search criteria</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedData.map((course, index) => {
                  const accName = course.acc && typeof course.acc === 'object' ? course.acc.name : 'N/A';
                  const subCatName = course.sub_category && typeof course.sub_category === 'object' ? course.sub_category.name : 'N/A';
                  
                  return (
                    <tr
                      key={course.id || index}
                      className="hover:bg-gradient-to-r hover:from-primary-50/30 hover:to-white transition-all duration-200 cursor-pointer group table-row-animated"
                      onClick={() => handleViewDetails(course)}
                      style={{ '--animation-delay': `${index * 0.03}s` }}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg flex items-center justify-center mr-3 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                            <GraduationCap className="h-5 w-5 text-primary-600" />
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-900 group-hover:text-primary-700 transition-colors">{course.name}</div>
                            {course.name_ar && <div className="text-xs text-gray-500">{course.name_ar}</div>}
                            {course.code && <div className="text-xs text-gray-400 mt-1">Code: {course.code}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-600">
                          <Building2 className="h-4 w-4 mr-2 text-gray-400" />
                          {accName}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-600">
                          {subCatName}
                          {course.sub_category && typeof course.sub_category === 'object' && course.sub_category.category && (
                            <div className="text-xs text-gray-500 mt-1">{course.sub_category.category.name}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="px-3 py-1.5 inline-flex text-xs font-bold rounded-full shadow-sm bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-300 capitalize">
                          {course.level || 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-600">
                          <Clock className="h-4 w-4 mr-2 text-gray-400" />
                          {course.duration_hours ? `${course.duration_hours} hrs` : 'N/A'}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-3 py-1.5 inline-flex text-xs leading-5 font-bold rounded-full shadow-sm ${
                          course.status === 'active' ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300' :
                          course.status === 'inactive' ? 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 border border-yellow-300' :
                          'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300'
                        }`}>
                          {course.status ? course.status.charAt(0).toUpperCase() + course.status.slice(1) : 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleViewDetails(course)}
                            className="p-2 rounded-lg bg-primary-50 text-primary-600 hover:bg-primary-100 hover:scale-110 transition-all duration-200 shadow-sm hover:shadow-md"
                            title="View Details"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewDetails(course);
                            }}
                            className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 hover:scale-110 transition-all duration-200 shadow-sm hover:shadow-md"
                            title="Course Info"
                          >
                            <FileText size={16} />
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
        
        {/* Pagination */}
        {!loading && filteredTotal > 0 && (
          <Pagination
            currentPage={pagination.currentPage}
            totalPages={Math.ceil(filteredTotal / pagination.perPage)}
            totalItems={filteredTotal}
            perPage={pagination.perPage}
            onPageChange={handlePageChange}
            onPerPageChange={handlePerPageChange}
          />
        )}
      </div>

      {/* Course Detail Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedCourse(null);
        }}
        title="Course Details"
        size="xl"
      >
        {detailLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : selectedCourse ? (
          <div className="space-y-6 animate-fade-in">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-700 font-medium mb-1">Course Name (English)</p>
                <p className="text-lg font-semibold text-gray-900">{selectedCourse.name || 'N/A'}</p>
              </div>
              {selectedCourse.name_ar && (
                <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-700 font-medium mb-1">Course Name (Arabic)</p>
                  <p className="text-lg font-semibold text-gray-900">{selectedCourse.name_ar}</p>
                </div>
              )}
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Course Code</p>
                <p className="text-base font-semibold text-gray-900">{selectedCourse.code || 'N/A'}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Level</p>
                <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 capitalize">
                  {selectedCourse.level || 'N/A'}
                </span>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1 flex items-center">
                  <Clock size={16} className="mr-2" />
                  Duration
                </p>
                <p className="text-base font-semibold text-gray-900">
                  {selectedCourse.duration_hours ? `${selectedCourse.duration_hours} hours` : 'N/A'}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Status</p>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                  selectedCourse.status === 'active' 
                    ? 'bg-green-100 text-green-800' 
                    : selectedCourse.status === 'inactive'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {selectedCourse.status || 'N/A'}
                </span>
              </div>
            </div>

            {selectedCourse.description && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-2 font-medium">Description</p>
                <p className="text-base text-gray-900 whitespace-pre-wrap">{selectedCourse.description}</p>
              </div>
            )}

            {/* ACC Information */}
            {selectedCourse.acc && (
              <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
                <div className="flex items-center mb-3">
                  <Building2 className="h-5 w-5 text-purple-600 mr-2" />
                  <p className="text-sm font-semibold text-purple-900">Accreditation Body (ACC)</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-purple-700 mb-1">Name</p>
                    <p className="text-sm font-medium text-gray-900">{selectedCourse.acc.name || 'N/A'}</p>
                  </div>
                  {selectedCourse.acc.legal_name && (
                    <div>
                      <p className="text-xs text-purple-700 mb-1">Legal Name</p>
                      <p className="text-sm font-medium text-gray-900">{selectedCourse.acc.legal_name}</p>
                    </div>
                  )}
                  {selectedCourse.acc.email && (
                    <div>
                      <p className="text-xs text-purple-700 mb-1">Email</p>
                      <p className="text-sm font-medium text-gray-900">{selectedCourse.acc.email}</p>
                    </div>
                  )}
                  {selectedCourse.acc.phone && (
                    <div>
                      <p className="text-xs text-purple-700 mb-1">Phone</p>
                      <p className="text-sm font-medium text-gray-900">{selectedCourse.acc.phone}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-purple-700 mb-1">Status</p>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                      selectedCourse.acc.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {selectedCourse.acc.status || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Sub Category Information */}
            {selectedCourse.sub_category && (
              <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
                <div className="flex items-center mb-3">
                  <Layers className="h-5 w-5 text-green-600 mr-2" />
                  <p className="text-sm font-semibold text-green-900">Sub Category</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-green-700 mb-1">Sub Category Name</p>
                    <p className="text-sm font-medium text-gray-900">{selectedCourse.sub_category.name || 'N/A'}</p>
                    {selectedCourse.sub_category.name_ar && (
                      <p className="text-xs text-gray-600 mt-1">{selectedCourse.sub_category.name_ar}</p>
                    )}
                  </div>
                  {selectedCourse.sub_category.category && (
                    <div>
                      <p className="text-xs text-green-700 mb-1">Parent Category</p>
                      <p className="text-sm font-medium text-gray-900">{selectedCourse.sub_category.category.name || 'N/A'}</p>
                      {selectedCourse.sub_category.category.name_ar && (
                        <p className="text-xs text-gray-600 mt-1">{selectedCourse.sub_category.category.name_ar}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Certificate Pricing */}
            {selectedCourse.certificate_pricing && selectedCourse.certificate_pricing.length > 0 && (
              <div className="p-4 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg border border-yellow-200">
                <div className="flex items-center mb-3">
                  <DollarSign className="h-5 w-5 text-yellow-600 mr-2" />
                  <p className="text-sm font-semibold text-yellow-900">Certificate Pricing</p>
                </div>
                <div className="space-y-3">
                  {selectedCourse.certificate_pricing.map((pricing, index) => (
                    <div key={index} className="bg-white rounded-lg p-3 border border-yellow-200">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Base Price</p>
                          <p className="text-sm font-semibold text-gray-900">
                            {parseFloat(pricing.base_price || 0).toFixed(2)} {pricing.currency || 'USD'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Group Commission</p>
                          <p className="text-sm font-medium text-gray-700">{pricing.group_commission_percentage || '0'}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Training Center Commission</p>
                          <p className="text-sm font-medium text-gray-700">{pricing.training_center_commission_percentage || '0'}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Instructor Commission</p>
                          <p className="text-sm font-medium text-gray-700">{pricing.instructor_commission_percentage || '0'}%</p>
                        </div>
                        {pricing.effective_from && (
                          <div className="col-span-2">
                            <p className="text-xs text-gray-500 mb-1">Effective From</p>
                            <p className="text-sm text-gray-700">
                              {new Date(pricing.effective_from).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                        {pricing.effective_to && (
                          <div className="col-span-2">
                            <p className="text-xs text-gray-500 mb-1">Effective To</p>
                            <p className="text-sm text-gray-700">
                              {new Date(pricing.effective_to).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Classes */}
            {selectedCourse.classes && selectedCourse.classes.length > 0 && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-semibold text-gray-900 mb-3">Classes ({selectedCourse.classes.length})</p>
                <div className="space-y-2">
                  {selectedCourse.classes.map((classItem) => (
                    <div key={classItem.id} className="bg-white rounded-lg p-3 border border-gray-200">
                      <p className="text-sm font-medium text-gray-900">{classItem.name || `Class ${classItem.id}`}</p>
                      <span className={`inline-block mt-2 px-2 py-1 rounded-full text-xs font-medium ${
                        classItem.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {classItem.status || 'N/A'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Timestamps */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
              {selectedCourse.created_at && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Created At</p>
                  <p className="text-sm text-gray-700">
                    {new Date(selectedCourse.created_at).toLocaleString()}
                  </p>
                </div>
              )}
              {selectedCourse.updated_at && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Updated At</p>
                  <p className="text-sm text-gray-700">
                    {new Date(selectedCourse.updated_at).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No course data available
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AllCoursesScreen;
