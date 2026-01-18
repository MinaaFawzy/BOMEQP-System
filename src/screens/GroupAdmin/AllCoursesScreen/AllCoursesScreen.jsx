import { useEffect, useState, useMemo, useRef } from 'react';
import { adminAPI } from '../../../services/api';
import { useHeader } from '../../../context/HeaderContext';
import { GraduationCap, Eye, Building2, Clock, CheckCircle, XCircle, Layers, FileText, ClipboardList, BookOpen, Hash, Calendar } from 'lucide-react';
import Modal from '../../../components/Modal/Modal';
import TabCard from '../../../components/TabCard/TabCard';
import TabCardsGrid from '../../../components/TabCardsGrid/TabCardsGrid';
import DataTable from '../../../components/DataTable/DataTable';
import DetailForm from '../../../components/DetailForm/DetailForm';
import Pagination from '../../../components/Pagination/Pagination';
import './AllCoursesScreen.css';

const AllCoursesScreen = () => {
  const { setHeaderTitle, setHeaderSubtitle } = useHeader();
  const [allCourses, setAllCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
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

  // Stats State
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    archived: 0
  });

  // Track if data has been loaded before
  const hasDataRef = useRef(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPagination(prev => ({ ...prev, current_page: 1 }));
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setHeaderTitle('Courses');
    setHeaderSubtitle('View and manage all courses across all ACCs');
    return () => {
      setHeaderTitle(null);
      setHeaderSubtitle(null);
    };
  }, [setHeaderTitle, setHeaderSubtitle]);

  // Load data when dependencies change
  useEffect(() => {
    const showLoading = !hasDataRef.current;

    // Don't load if search is still being debounced
    if (searchQuery !== debouncedSearch) {
      return;
    }

    loadCourses(showLoading);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, pagination.current_page, pagination.per_page, debouncedSearch, searchQuery]);

  const loadCourses = async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    }
    try {
      // Build query parameters
      const params = {
        page: pagination.current_page,
        per_page: pagination.per_page,
      };

      // Add search if there's a value
      if (debouncedSearch) {
        params.search = debouncedSearch;
      }

      // Add status filter if not 'all'
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      const data = await adminAPI.listCourses(params);

      let coursesList = [];
      if (data.data) {
        coursesList = data.data || [];
      } else if (data.courses) {
        coursesList = data.courses || [];
      } else {
        coursesList = Array.isArray(data) ? data : [];
      }
      setAllCourses(coursesList);

      // Update pagination state
      if (data) {
        const totalItems = data.total || (data.statistics?.total) || coursesList.length;
        const currentPerPage = pagination.per_page;
        const calculatedLastPage = data.last_page || Math.ceil(totalItems / currentPerPage) || 1;
        const calculatedFrom = data.from || (coursesList.length > 0 ? ((pagination.current_page - 1) * currentPerPage) + 1 : 0);
        const calculatedTo = data.to || (coursesList.length > 0 ? calculatedFrom + coursesList.length - 1 : 0);

        setPagination(prev => ({
          ...prev,
          current_page: data.current_page || prev.current_page || 1,
          last_page: calculatedLastPage,
          total: totalItems,
          from: calculatedFrom,
          to: calculatedTo
        }));
      }

      // Update stats from API response if available
      if (data.statistics) {
        setStats({
          total: data.statistics.total || 0,
          active: data.statistics.active || 0,
          inactive: data.statistics.inactive || 0,
          archived: data.statistics.archived || 0
        });
      }

      hasDataRef.current = true;
    } catch (error) {
      console.error('Failed to load courses:', error);
      setAllCourses([]);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

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

  // Use stats from API response or calculate from current data
  const totalCount = stats.total || pagination.total;
  const activeCount = stats.active;
  const inactiveCount = stats.inactive;
  const archivedCount = stats.archived;

  // DataTable columns
  const columns = useMemo(() => [
    {
      header: 'Course',
      accessor: 'name',
      sortable: true,
      render: (value, row) => (
        <div className="flex items-center">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg flex items-center justify-center mr-3">
            <GraduationCap className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <div className="font-medium text-gray-900">{value || 'N/A'}</div>
            {row.name_ar && <div className="text-xs text-gray-500">{row.name_ar}</div>}
            {row.code && <div className="text-xs text-gray-400 mt-1">Code: {row.code}</div>}
          </div>
        </div>
      )
    },
    {
      header: 'ACC',
      accessor: 'acc',
      sortable: true,
      render: (value) => {
        const accName = value && typeof value === 'object' ? value.name : 'N/A';
        return (
          <div className="flex items-center text-sm text-gray-600">
            <Building2 className="h-4 w-4 mr-2 text-gray-400" />
            {accName}
          </div>
        );
      }
    },
    {
      header: 'Sub Category',
      accessor: 'sub_category',
      sortable: true,
      render: (value) => {
        const subCatName = value && typeof value === 'object' ? value.name : 'N/A';
        return (
          <div className="text-sm text-gray-600">
            {subCatName}
          </div>
        );
      }
    },
    {
      header: 'Level',
      accessor: 'level',
      sortable: true,
      render: (value) => (
        <span className="px-3 py-1.5 inline-flex text-xs font-bold rounded-full shadow-sm bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-300 capitalize">
          {value || 'N/A'}
        </span>
      )
    },
    {
      header: 'Duration',
      accessor: 'duration_hours',
      sortable: true,
      render: (value) => (
        <div className="flex items-center text-sm text-gray-600">
          <Clock className="h-4 w-4 mr-2 text-gray-400" />
          {value ? `${value} hrs` : 'N/A'}
        </div>
      )
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
          inactive: {
            badgeClass: 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 border border-yellow-300',
            icon: XCircle
          },
          archived: {
            badgeClass: 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300',
            icon: XCircle
          }
        };
        const config = statusConfig[value] || statusConfig.inactive;
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
          name="Inactive"
          value={inactiveCount}
          icon={XCircle}
          colorType="yellow"
          isActive={statusFilter === 'inactive'}
          onClick={() => setStatusFilter('inactive')}
        />
        <TabCard
          name="Archived"
          value={archivedCount}
          icon={XCircle}
          colorType="gray"
          isActive={statusFilter === 'archived'}
          onClick={() => setStatusFilter('archived')}
        />
      </TabCardsGrid>

      {/* DataTable */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100">
        <DataTable
          columns={columns}
          data={allCourses}
          onView={handleViewDetails}
          onRowClick={handleViewDetails}
          isLoading={loading}
          emptyMessage="No courses found"
          searchable={true}
          searchValue={searchQuery}
          onSearch={(value) => {
            setSearchQuery(value);
          }}
          filterable={false}
          searchPlaceholder="Search by name, code, ACC, or sub category..."
        />

        {/* Pagination */}
        {allCourses.length > 0 && (
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

      {/* Course Detail Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedCourse(null);
        }}
        title="Course Details"
        size="lg"
      >
        {detailLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : selectedCourse ? (
          <DetailForm
            data={selectedCourse}
            fields={[
              { key: 'name', label: 'Course Name', icon: GraduationCap },
              { key: 'name_ar', label: 'Course Name (Arabic)', showEmpty: false },
              { key: 'code', label: 'Course Code', icon: Hash, showEmpty: false },
              {
                key: 'acc',
                label: 'ACC',
                icon: Building2,
                render: (value) => value && typeof value === 'object' ? value.name : (value || 'N/A'),
                showEmpty: false
              },
              {
                key: 'sub_category',
                label: 'Sub Category',
                icon: Layers,
                render: (value) => value && typeof value === 'object' ? value.name : (value || 'N/A'),
                showEmpty: false
              },
              { key: 'level', label: 'Level', render: (value) => value ? value.charAt(0).toUpperCase() + value.slice(1) : 'N/A', showEmpty: false },
              { key: 'duration_hours', label: 'Duration', icon: Clock, render: (value) => value ? `${value} hours` : 'N/A', showEmpty: false },
              { key: 'max_capacity', label: 'Max Capacity', render: (value) => value ? `${value} trainees` : 'N/A', showEmpty: false },
              { key: 'status', label: 'Status', type: 'status' },
              { key: 'created_at', label: 'Created At', type: 'datetime', icon: Calendar, showEmpty: false },
              { key: 'updated_at', label: 'Updated At', type: 'datetime', icon: Calendar, showEmpty: false },
            ]}
          />
        ) : (
          <div className="text-center py-12 text-gray-500">No course data available</div>
        )}
      </Modal>
    </div>
  );
};

export default AllCoursesScreen;
