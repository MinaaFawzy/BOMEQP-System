import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { instructorAPI } from '../../../services/api';
import { useHeader } from '../../../context/HeaderContext';
import { 
  Users, 
  BookOpen, 
  Building2, 
  Award,
  CheckCircle,
  ArrowRight,
  Calendar,
  MapPin,
  Mail,
  Phone,
  User
} from 'lucide-react';
import './DashboardScreen.css';

const InstructorDashboardScreen = () => {
  const { setHeaderTitle, setHeaderSubtitle } = useHeader();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const hasLoadedRef = useRef(false);
  const isLoadingRef = useRef(false);

  const loadDashboard = useCallback(async () => {
    // Prevent duplicate concurrent requests
    if (isLoadingRef.current) {
      console.log('🔄 Dashboard load already in progress, skipping duplicate request');
      return;
    }

    isLoadingRef.current = true;
    try {
      // API interceptor returns response.data directly
      const data = await instructorAPI.getDashboard();
      
      // Set dashboard data according to API documentation structure
      // Response includes: profile, statistics, recent_classes, training_centers, accs, unread_notifications_count
      setDashboardData(data || {});
    } catch (error) {
      console.error('Failed to load dashboard:', error);
      setDashboardData(null);
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    // Only load once on mount
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      loadDashboard();
    }
  }, [loadDashboard]);

  useEffect(() => {
    setHeaderTitle(null);
    setHeaderSubtitle(null);
    return () => {
      setHeaderTitle(null);
      setHeaderSubtitle(null);
    };
  }, [setHeaderTitle, setHeaderSubtitle]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'scheduled':
        return 'status-scheduled';
      case 'in_progress':
        return 'status-in-progress';
      case 'completed':
        return 'status-completed';
      case 'cancelled':
        return 'status-cancelled';
      default:
        return 'status-default';
    }
  };

  const getTrainingStatusClass = (status) => {
    return status === 'active' ? 'training-item-status-active' : 'training-item-status-inactive';
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="error-container">
        <div className="error-text">
          <p>Failed to load dashboard data</p>
        </div>
      </div>
    );
  }

  // Extract data according to API documentation structure
  const statistics = dashboardData?.statistics || {};
  const recent_classes = dashboardData?.recent_classes || [];
  const training_centers = dashboardData?.training_centers || [];
  const accs = dashboardData?.accs || [];
  const profile = dashboardData?.profile || {};
  const unread_notifications_count = dashboardData?.unread_notifications_count || 0;

  // Extract statistics according to API documentation
  // API returns: total_classes, upcoming_classes, in_progress, completed
  const totalClasses = Number(statistics?.total_classes || 0);
  // Use upcoming_classes for scheduled count (as per API response)
  const scheduledClasses = Number(statistics?.upcoming_classes || statistics?.scheduled || 0);
  const completedClasses = Number(statistics?.completed || 0);
  
  // Count arrays
  const trainingCentersCount = Array.isArray(training_centers) ? training_centers.length : 0;
  const accsCount = Array.isArray(accs) ? accs.length : 0;

  return (
    <div className="dashboard-container">
      {/* Statistics Cards */}
      <div className="stats-grid">
        {/* Total Classes */}
        <div 
          onClick={() => navigate('/instructor/classes')}
          className="stat-card stat-card-blue"
        >
          <div className="stat-card-header">
            <div className="stat-card-content">
              <p className="stat-label">Total Classes</p>
              <p className="stat-value">
                {totalClasses}
              </p>
              <p className="stat-description">Click to view all</p>
            </div>
            <div className="stat-icon-container">
              <BookOpen className="stat-icon" />
            </div>
          </div>
        </div>

        {/* Scheduled Classes */}
        <div 
          onClick={() => navigate('/instructor/classes?status=scheduled')}
          className="stat-card stat-card-purple"
        >
          <div className="stat-card-header">
            <div className="stat-card-content">
              <p className="stat-label">Scheduled</p>
              <p className="stat-value">
                {scheduledClasses}
              </p>
              <p className="stat-description">Scheduled classes</p>
            </div>
            <div className="stat-icon-container">
              <Calendar className="stat-icon" />
            </div>
          </div>
        </div>

        {/* Completed Classes */}
        <div 
          onClick={() => navigate('/instructor/classes?status=completed')}
          className="stat-card stat-card-green"
        >
          <div className="stat-card-header">
            <div className="stat-card-content">
              <p className="stat-label">Completed</p>
              <p className="stat-value">
                {completedClasses}
              </p>
              <p className="stat-description">Finished classes</p>
            </div>
            <div className="stat-icon-container">
              <CheckCircle className="stat-icon" />
            </div>
          </div>
        </div>
      </div>

      <div className="main-grid">
        {/* Recent Classes */}
        <div className="card recent-classes-card">
          <div className="card-header">
            <div className="card-header-content">
              <h2 className="card-title">
                <BookOpen className="card-title-icon" size={24} />
                Recent Classes
              </h2>
              <button
                onClick={() => navigate('/instructor/classes')}
                className="card-button"
              >
                View All
                <ArrowRight size={16} className="card-button-icon" />
              </button>
            </div>
          </div>
          <div className="table-container">
            {recent_classes && recent_classes.length > 0 ? (
              <table className="table">
                <thead>
                  <tr>
                    <th>Course</th>
                    <th>Training Center</th>
                    <th>Dates</th>
                    <th>Status</th>
                    <th>Students</th>
                  </tr>
                </thead>
                <tbody>
                  {recent_classes.slice(0, 3).map((classItem, index) => {
                    const maxCapacity = classItem.max_capacity ?? classItem.course?.max_capacity;
                    const enrolledCount = classItem.enrolled_count || 0;
                    const progressPercentage = maxCapacity !== undefined 
                      ? Math.min(100, (enrolledCount / maxCapacity) * 100) 
                      : 0;

                    return (
                      <tr key={classItem.id}>
                        <td>
                          <div className="table-cell-content">
                            <div className="table-cell-main">
                              {classItem.course?.name || 'N/A'}
                            </div>
                            {classItem.course?.code && (
                              <div className="table-cell-secondary">
                                Code: {classItem.course.code}
                              </div>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="table-cell-content">
                            <div className="table-cell-main">
                              {classItem.training_center?.name || 'N/A'}
                            </div>
                            {classItem.location_details && (
                              <div className="table-cell-secondary">
                                <MapPin size={12} className="table-cell-icon" />
                                {classItem.location === 'physical' ? classItem.location_details : 'Online'}
                              </div>
                            )}
                          </div>
                        </td>
                        <td>
                          {classItem.start_date ? (
                            <div className="table-cell-date">
                              <div className="table-cell-date-main">
                                {formatDate(classItem.start_date)}
                              </div>
                              {classItem.end_date && (
                                <div className="table-cell-date-sub">
                                  to {formatDate(classItem.end_date)}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="table-cell-na">N/A</span>
                          )}
                        </td>
                        <td>
                          <span className={`status-badge ${getStatusClass(classItem.status)}`}>
                            {classItem.status ? classItem.status.replace('_', ' ') : 'N/A'}
                          </span>
                        </td>
                        <td>
                          <div className="students-cell">
                            <div className="students-count">
                              {enrolledCount} / {maxCapacity ?? 'N/A'}
                            </div>
                            {maxCapacity !== undefined && (
                              <div className="progress-container">
                                <div 
                                  className="progress-bar"
                                  style={{ width: `${progressPercentage}%` }}
                                />
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="empty-state">
                <BookOpen className="empty-state-icon" size={48} />
                <p className="empty-state-text">No classes found</p>
                <p className="empty-state-subtext">You don't have any classes yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Profile Summary */}
        <div className="card profile-card">
          <div className="card-header">
            <h2 className="card-title">
              <User className="card-title-icon" size={24} />
              Profile Summary
            </h2>
          </div>
          <div className="profile-content">
            <div className="profile-field">
              <p className="profile-label">Name</p>
              <p className="profile-value">{profile?.name || 'N/A'}</p>
            </div>
            <div className="profile-field">
              <p className="profile-label">
                <Mail size={14} className="profile-label-icon" />
                Email
              </p>
              <p className="profile-value">{profile?.email || 'N/A'}</p>
            </div>
            <button
              onClick={() => navigate('/profile')}
              className="profile-button"
            >
              View Full Profile
            </button>
          </div>
        </div>
      </div>

      {/* Training Centers & ACCs */}
      <div className="training-grid">
        {/* Training Centers */}
        <div className="card">
          <div className="card-header">
            <div className="card-header-content">
              <h2 className="card-title">
                <Building2 className="card-title-icon" size={24} />
                Training Centers
              </h2>
              {trainingCentersCount > 0 && (
                <span className="badge">
                  {trainingCentersCount}
                </span>
              )}
            </div>
          </div>
          <div className="profile-content">
            {trainingCentersCount > 0 ? (
              <div className="training-list">
                {training_centers.slice(0, 3).map((tc) => (
                  <div key={tc.id} className="training-item">
                    <div className="training-item-content">
                      <div className="training-item-main">
                        <p className="training-item-name">{tc.name}</p>
                        {tc.city && (
                          <p className="training-item-location">
                            <MapPin size={12} className="training-item-location-icon" />
                            {tc.city}, {tc.country}
                          </p>
                        )}
                        {tc.classes_count !== undefined && (
                          <p className="training-item-count">
                            {tc.classes_count} {tc.classes_count === 1 ? 'class' : 'classes'}
                          </p>
                        )}
                      </div>
                      {tc.status && (
                        <span className={`training-item-status ${getTrainingStatusClass(tc.status)}`}>
                          {tc.status}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {trainingCentersCount > 3 && (
                  <button
                    onClick={() => navigate('/instructor/training-centers')}
                    className="training-view-all"
                  >
                    View All ({trainingCentersCount})
                  </button>
                )}
              </div>
            ) : (
              <div className="empty-training">
                <Building2 className="empty-training-icon" size={48} />
                <p className="empty-training-text">No training centers found</p>
              </div>
            )}
          </div>
        </div>

        {/* ACCs */}
        <div className="card">
          <div className="card-header">
            <div className="card-header-content">
              <h2 className="card-title">
                <Award className="card-title-icon" size={24} />
                Accreditation Bodies
              </h2>
              {accsCount > 0 && (
                <span className="badge">
                  {accsCount}
                </span>
              )}
            </div>
          </div>
          <div className="profile-content">
            {accsCount > 0 ? (
              <div className="training-list">
                {accs.slice(0, 3).map((acc) => (
                  <div key={acc.id} className="training-item">
                    <div className="training-item-content">
                      <div className="training-item-main">
                        <p className="training-item-name">{acc.name}</p>
                        {acc.country && (
                          <p className="training-item-location">
                            <MapPin size={12} className="training-item-location-icon" />
                            {acc.country}
                          </p>
                        )}
                        {acc.is_authorized && (
                          <div className="authorized-badge">
                            <CheckCircle size={14} className="authorized-icon" />
                            <span className="authorized-text">Authorized</span>
                            {acc.authorization_date && (
                              <span className="authorized-date">
                                {formatDate(acc.authorization_date)}
                              </span>
                            )}
                          </div>
                        )}
                        {acc.classes_count !== undefined && (
                          <p className="training-item-count">
                            {acc.classes_count} {acc.classes_count === 1 ? 'class' : 'classes'}
                          </p>
                        )}
                      </div>
                      {acc.status && (
                        <span className={`training-item-status ${getTrainingStatusClass(acc.status)}`}>
                          {acc.status}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {accsCount > 3 && (
                  <button
                    onClick={() => navigate('/instructor/accs')}
                    className="training-view-all"
                  >
                    View All ({accsCount})
                  </button>
                )}
              </div>
            ) : (
              <div className="empty-training">
                <Award className="empty-training-icon" size={48} />
                <p className="empty-training-text">No ACCs found</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstructorDashboardScreen;
