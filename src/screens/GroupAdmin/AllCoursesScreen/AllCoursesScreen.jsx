import { useEffect, useState, useMemo } from 'react';
import { adminAPI } from '../../../services/api';
import { useHeader } from '../../../context/HeaderContext';
import { GraduationCap, Eye, Building2, Clock, CheckCircle, XCircle, Layers, FileText, ClipboardList } from 'lucide-react';
import Modal from '../../../components/Modal/Modal';
import TabCard from '../../../components/TabCard/TabCard';
import TabCardsGrid from '../../../components/TabCardsGrid/TabCardsGrid';
import DataTable from '../../../components/DataTable/DataTable';
import PresentDataForm from '../../../components/PresentDataForm/PresentDataForm';
import './AllCoursesScreen.css';

const AllCoursesScreen = () => {
  const { setHeaderTitle, setHeaderSubtitle } = useHeader();
  const [allCourses, setAllCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');

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
      const data = await adminAPI.listCourses({ per_page: 1000 });
      let coursesList = [];
      if (data.data) {
        coursesList = data.data || [];
      } else if (data.courses) {
        coursesList = data.courses || [];
      } else {
        coursesList = Array.isArray(data) ? data : [];
      }
      setAllCourses(coursesList);
    } catch (error) {
      console.error('Failed to load courses:', error);
      setAllCourses([]);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    loadCourses();
  }, []);

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

  // Client-side filtering
  const filteredCourses = useMemo(() => {
    let filtered = [...allCourses];

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(course => course.status === statusFilter);
    }

    // Add search text for DataTable search
    return filtered.map(course => {
      const accName = course.acc && typeof course.acc === 'object' ? course.acc.name : '';
      const subCatName = course.sub_category && typeof course.sub_category === 'object' ? course.sub_category.name : '';
      return {
        ...course,
        _searchText: `${course.name || ''} ${course.code || ''} ${course.name_ar || ''} ${accName} ${subCatName}`.toLowerCase()
      };
    });
  }, [allCourses, statusFilter]);

  // Calculate stats from all courses
  const totalCount = allCourses.length;
  const activeCount = allCourses.filter(c => c.status === 'active').length;
  const inactiveCount = allCourses.filter(c => c.status === 'inactive').length;
  const archivedCount = allCourses.filter(c => c.status === 'archived').length;

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
          data={filteredCourses}
          onView={handleViewDetails}
          onRowClick={handleViewDetails}
          isLoading={loading}
          emptyMessage="No courses found"
          searchable={true}
          filterable={false}
          searchPlaceholder="Search by name, code, ACC, or sub category..."
        />
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
        <PresentDataForm
          data={selectedCourse}
          isLoading={detailLoading}
          emptyMessage="No course data available"
        />
      </Modal>
    </div>
  );
};

export default AllCoursesScreen;
