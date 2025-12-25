import { useEffect, useState } from 'react';
import { instructorAPI } from '../../../services/api';
import { GraduationCap, CheckCircle, Eye, MapPin, Calendar, Users } from 'lucide-react';
import Modal from '../../../components/Modal/Modal';
import FormInput from '../../../components/FormInput/FormInput';
import Pagination from '../../../components/Pagination/Pagination';
import './ClassesScreen.css';
import DataTable from '../../../components/DataTable/DataTable';

const InstructorClassesScreen = () => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    perPage: 10,
    totalPages: 1,
    totalItems: 0,
  });
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [completionData, setCompletionData] = useState({
    completion_rate_percentage: '',
    notes: '',
  });

  useEffect(() => {
    loadClasses();
  }, [pagination.currentPage, pagination.perPage]);

  const loadClasses = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.currentPage,
        per_page: pagination.perPage,
      };
      
      const data = await instructorAPI.listClasses(params);
      
      let classesArray = [];
      if (data.data) {
        classesArray = data.data || [];
        setPagination(prev => ({
          ...prev,
          totalPages: data.last_page || data.total_pages || 1,
          totalItems: data.total || 0,
        }));
      } else if (data.classes) {
        classesArray = data.classes || [];
        setPagination(prev => ({
          ...prev,
          totalPages: 1,
          totalItems: data.classes?.length || 0,
        }));
      } else {
        classesArray = Array.isArray(data) ? data : [];
        setPagination(prev => ({
          ...prev,
          totalPages: 1,
          totalItems: classesArray.length,
        }));
      }
      
      setClasses(classesArray);
    } catch (error) {
      console.error('Failed to load classes:', error);
      setClasses([]);
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

  const handleViewDetails = async (classItem) => {
    try {
      const data = await instructorAPI.getClassDetails(classItem.id);
      setSelectedClass(data.class);
      setDetailModalOpen(true);
    } catch (error) {
      console.error('Failed to load class details:', error);
      setSelectedClass(classItem);
      setDetailModalOpen(true);
    }
  };

  const handleMarkComplete = (classItem) => {
    setSelectedClass(classItem);
    setCompletionData({
      completion_rate_percentage: '',
      notes: '',
    });
    setCompleteModalOpen(true);
  };

  const confirmComplete = async () => {
    if (!completionData.completion_rate_percentage) {
      alert('Please enter completion rate percentage');
      return;
    }
    try {
      await instructorAPI.markClassComplete(selectedClass.id, completionData);
      await loadClasses();
      setCompleteModalOpen(false);
      setSelectedClass(null);
      setCompletionData({ completion_rate_percentage: '', notes: '' });
      setPagination(prev => ({ ...prev, currentPage: 1 }));
      alert('Class marked as complete!');
    } catch (error) {
      alert('Failed to mark complete: ' + (error.message || 'Unknown error'));
    }
  };

  const columns = [
    {
      header: 'Course',
      accessor: 'course',
      render: (value, row) => {
        const courseName = typeof value === 'string' ? value : (value?.name || row.course?.name || 'N/A');
        return (
          <div className="flex items-center">
            <GraduationCap className="h-5 w-5 text-gray-400 mr-3" />
            <span className="font-medium text-gray-900">{courseName}</span>
          </div>
        );
      },
    },
    {
      header: 'Training Center',
      accessor: 'training_center',
      render: (value) => {
        return typeof value === 'string' ? value : (value?.name || 'N/A');
      },
    },
    {
      header: 'Start Date',
      accessor: 'start_date',
      render: (value) => value ? new Date(value).toLocaleDateString() : 'N/A',
    },
    {
      header: 'End Date',
      accessor: 'end_date',
      render: (value) => value ? new Date(value).toLocaleDateString() : 'N/A',
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (value) => (
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
          value === 'completed' ? 'bg-green-100 text-green-800' :
          value === 'scheduled' ? 'bg-blue-100 text-blue-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {value}
        </span>
      ),
    },
    {
      header: 'Enrolled',
      accessor: 'enrolled_count',
      render: (value, row) => `${value || 0}/${row.max_capacity || 0}`,
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Classes</h1>
        <p className="text-gray-600 mt-2">View and manage your assigned classes</p>
      </div>

      <DataTable
        columns={columns}
        data={classes}
        onView={handleViewDetails}
        onRowClick={handleViewDetails}
        isLoading={loading}
        emptyMessage="No classes assigned yet."
      />
      
      {/* Pagination */}
      {!loading && pagination.totalItems > 0 && (
        <div className="mt-4 bg-white rounded-xl shadow-lg p-4 border border-gray-100">
          <Pagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            perPage={pagination.perPage}
            onPageChange={handlePageChange}
            onPerPageChange={handlePerPageChange}
          />
        </div>
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
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1 flex items-center">
                  <GraduationCap size={16} className="mr-2" />
                  Course
                </p>
                <p className="text-base font-semibold text-gray-900">
                  {typeof selectedClass.course === 'string' ? selectedClass.course : (selectedClass.course?.name || 'N/A')}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Training Center</p>
                <p className="text-base font-semibold text-gray-900">
                  {typeof selectedClass.training_center === 'string' ? selectedClass.training_center : (selectedClass.training_center?.name || 'N/A')}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1 flex items-center">
                  <Calendar size={16} className="mr-2" />
                  Start Date
                </p>
                <p className="text-base font-semibold text-gray-900">
                  {selectedClass.start_date ? new Date(selectedClass.start_date).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1 flex items-center">
                  <Calendar size={16} className="mr-2" />
                  End Date
                </p>
                <p className="text-base font-semibold text-gray-900">
                  {selectedClass.end_date ? new Date(selectedClass.end_date).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1 flex items-center">
                  <Users size={16} className="mr-2" />
                  Enrollment
                </p>
                <p className="text-base font-semibold text-gray-900">
                  {selectedClass.enrolled_count || 0} / {selectedClass.max_capacity || 0}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Status</p>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                  selectedClass.status === 'completed' ? 'bg-green-100 text-green-800' :
                  selectedClass.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {selectedClass.status}
                </span>
              </div>
            </div>
            {selectedClass.location_details && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1 flex items-center">
                  <MapPin size={16} className="mr-2" />
                  Location
                </p>
                <p className="text-base font-semibold text-gray-900">{selectedClass.location_details}</p>
              </div>
            )}
            {selectedClass.materials && selectedClass.materials.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Course Materials</h3>
                <div className="space-y-2">
                  {selectedClass.materials.map((material, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg">
                      <p className="font-medium text-gray-900">{material.name}</p>
                      {material.file_url && (
                        <a
                          href={material.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary-600 hover:text-primary-700 text-sm"
                        >
                          Download
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {selectedClass.status !== 'completed' && (
              <div className="flex space-x-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setDetailModalOpen(false);
                    handleMarkComplete(selectedClass);
                  }}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center"
                >
                  <CheckCircle size={20} className="mr-2" />
                  Mark as Complete
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Mark Complete Modal */}
      <Modal
        isOpen={completeModalOpen}
        onClose={() => {
          setCompleteModalOpen(false);
          setSelectedClass(null);
          setCompletionData({ completion_rate_percentage: '', notes: '' });
        }}
        title="Mark Class as Complete"
        size="md"
      >
        <div className="space-y-4">
          <FormInput
            label="Completion Rate (%)"
            name="completion_rate_percentage"
            type="number"
            value={completionData.completion_rate_percentage}
            onChange={(e) => setCompletionData({ ...completionData, completion_rate_percentage: e.target.value })}
            required
            min="0"
            max="100"
            placeholder="e.g., 95"
          />
          <FormInput
            label="Notes (Optional)"
            name="notes"
            value={completionData.notes}
            onChange={(e) => setCompletionData({ ...completionData, notes: e.target.value })}
            textarea
            rows={4}
            placeholder="Add any notes about the class completion..."
          />
          <div className="flex space-x-3 pt-4">
            <button
              onClick={() => {
                setCompleteModalOpen(false);
                setSelectedClass(null);
                setCompletionData({ completion_rate_percentage: '', notes: '' });
              }}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={confirmComplete}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Mark Complete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default InstructorClassesScreen;
