import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { instructorAPI } from '../../../services/api';
import { GraduationCap, CheckCircle, Eye, MapPin, Calendar, Users } from 'lucide-react';
import Modal from '../../../components/Modal/Modal';
import FormInput from '../../../components/FormInput/FormInput';
import Pagination from '../../../components/Pagination/Pagination';
import './ClassesScreen.css';
import DataTable from '../../../components/DataTable/DataTable';

const InstructorClassesScreen = () => {
  const [searchParams] = useSearchParams();
  const statusParam = searchParams.get('status');
  
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
  
  // Determine initial filter based on URL parameter
  const getInitialFilter = () => {
    if (!statusParam) return 'all';
    if (statusParam === 'scheduled') return 'scheduled';
    if (statusParam === 'completed') return 'completed';
    return 'all';
  };
  
  const [selectedFilter, setSelectedFilter] = useState(() => getInitialFilter());

  useEffect(() => {
    loadClasses();
  }, [pagination.currentPage, pagination.perPage]);

  // Update filter when URL parameter changes
  useEffect(() => {
    const newFilter = getInitialFilter();
    setSelectedFilter(newFilter);
  }, [statusParam]);

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

  const getStatusClass = (status) => {
    if (status === 'completed') return 'status-completed';
    if (status === 'scheduled') return 'status-scheduled';
    return 'status-default';
  };

  const getModalStatusClass = (status) => {
    if (status === 'completed') return 'modal-status-completed';
    if (status === 'scheduled') return 'modal-status-scheduled';
    return 'modal-status-default';
  };

  const columns = [
    {
      header: 'Course',
      accessor: 'course',
      render: (value, row) => {
        const courseName = typeof value === 'string' ? value : (value?.name || row.course?.name || 'N/A');
        return (
          <div className="course-cell">
            <GraduationCap className="course-icon" />
            <span className="course-name">{courseName}</span>
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
      header: 'Exam Date',
      accessor: 'exam_date',
      render: (value) => value ? new Date(value).toLocaleDateString() : 'Not set',
    },
    {
      header: 'Exam Score',
      accessor: 'exam_score',
      render: (value) => value !== null && value !== undefined ? `${parseFloat(value).toFixed(2)}%` : 'N/A',
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (value) => (
        <span className={`status-badge ${getStatusClass(value)}`}>
          {value}
        </span>
      ),
    },
    {
      header: 'Enrolled',
      accessor: 'enrolled_count',
      render: (value, row) => `${value || 0}/${row.course?.max_capacity || 'N/A'}`,
    },
  ];

  // Filter options for status
  const filterOptions = [
    { value: 'all', label: 'All Classes' },
    { value: 'scheduled', label: 'Scheduled', filterFn: (row) => row.status === 'scheduled' },
    { value: 'completed', label: 'Completed', filterFn: (row) => row.status === 'completed' },
  ];

  return (
    <div>
      <DataTable
        columns={columns}
        data={classes}
        onView={handleViewDetails}
        onRowClick={handleViewDetails}
        isLoading={loading}
        emptyMessage="No classes assigned yet."
        searchable={true}
        filterable={true}
        filterOptions={filterOptions}
        sortable={true}
        searchPlaceholder="Search classes..."
        defaultFilter={selectedFilter}
      />
      
      {/* Pagination */}
      {!loading && pagination.totalItems > 0 && (
        <div className="pagination-container">
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
          <div className="modal-content">
            <div className="modal-grid">
              <div className="modal-field">
                <p className="modal-field-label">
                  <GraduationCap size={16} className="modal-field-label-icon" />
                  Course
                </p>
                <p className="modal-field-value">
                  {typeof selectedClass.course === 'string' ? selectedClass.course : (selectedClass.course?.name || 'N/A')}
                </p>
              </div>
              <div className="modal-field">
                <p className="modal-field-label">Training Center</p>
                <p className="modal-field-value">
                  {typeof selectedClass.training_center === 'string' ? selectedClass.training_center : (selectedClass.training_center?.name || 'N/A')}
                </p>
              </div>
              <div className="modal-field">
                <p className="modal-field-label">
                  <Calendar size={16} className="modal-field-label-icon" />
                  Start Date
                </p>
                <p className="modal-field-value">
                  {selectedClass.start_date ? new Date(selectedClass.start_date).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <div className="modal-field">
                <p className="modal-field-label">
                  <Calendar size={16} className="modal-field-label-icon" />
                  End Date
                </p>
                <p className="modal-field-value">
                  {selectedClass.end_date ? new Date(selectedClass.end_date).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              {selectedClass.exam_date && (
                <div className="modal-field" style={{ backgroundColor: '#faf5ff', borderColor: '#e9d5ff' }}>
                  <p className="modal-field-label" style={{ color: '#9333ea' }}>
                    <Calendar size={16} className="modal-field-label-icon" />
                    Exam Date
                  </p>
                  <p className="modal-field-value" style={{ color: '#7e22ce' }}>
                    {new Date(selectedClass.exam_date).toLocaleDateString()}
                  </p>
                </div>
              )}
              {selectedClass.exam_score !== null && selectedClass.exam_score !== undefined && (
                <div className="modal-field" style={{ backgroundColor: '#eef2ff', borderColor: '#c7d2fe' }}>
                  <p className="modal-field-label" style={{ color: '#4f46e5' }}>
                    Exam Score
                  </p>
                  <p className="modal-field-value" style={{ color: '#4338ca', fontWeight: 'bold' }}>
                    {parseFloat(selectedClass.exam_score).toFixed(2)}%
                  </p>
                </div>
              )}
              <div className="modal-field">
                <p className="modal-field-label">
                  <Users size={16} className="modal-field-label-icon" />
                  Enrollment
                </p>
                <p className="modal-field-value">
                  {selectedClass.enrolled_count || 0} / {selectedClass.course?.max_capacity || 'N/A'}
                </p>
              </div>
              <div className="modal-field">
                <p className="modal-field-label">Status</p>
                <span className={`modal-status-badge ${getModalStatusClass(selectedClass.status)}`}>
                  {selectedClass.status}
                </span>
              </div>
            </div>
            {selectedClass.location_details && (
              <div className="location-field">
                <p className="modal-field-label">
                  <MapPin size={16} className="modal-field-label-icon" />
                  Location
                </p>
                <p className="modal-field-value">{selectedClass.location_details}</p>
              </div>
            )}
            {selectedClass.materials && selectedClass.materials.length > 0 && (
              <div className="materials-section">
                <h3 className="materials-title">Course Materials</h3>
                <div className="materials-list">
                  {selectedClass.materials.map((material, index) => (
                    <div key={index} className="material-item">
                      <p className="material-name">{material.name}</p>
                      {material.file_url && (
                        <a
                          href={material.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="material-link"
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
              <div className="modal-actions">
                <button
                  onClick={() => {
                    setDetailModalOpen(false);
                    handleMarkComplete(selectedClass);
                  }}
                  className="complete-button"
                >
                  <CheckCircle size={20} className="complete-button-icon" />
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
        <div className="complete-modal-content">
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
          <div className="complete-modal-actions">
            <button
              onClick={() => {
                setCompleteModalOpen(false);
                setSelectedClass(null);
                setCompletionData({ completion_rate_percentage: '', notes: '' });
              }}
              className="cancel-button"
            >
              Cancel
            </button>
            <button
              onClick={confirmComplete}
              className="confirm-button"
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
