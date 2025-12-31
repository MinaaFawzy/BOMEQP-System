import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { trainingCenterAPI } from '../../../services/api';
import { Users, Award, BookOpen, Building2, CheckCircle, Calendar } from 'lucide-react';
import DashboardCard from '../../../components/DashboardCard/DashboardCard';
import LoadingSpinner from '../../../components/LoadingSpinner/LoadingSpinner';
import StateSection from '../../../components/StateSection/StateSection';
import StateItem from '../../../components/StateItem/StateItem';
import './DashboardScreen.css';

const TrainingCenterDashboardScreen = () => {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [counts, setCounts] = useState({
    accs: 0,
    classes: 0,
    instructors: 0,
    certificates: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      // Use the dedicated dashboard endpoint
      const data = await trainingCenterAPI.getDashboard();
      
      // API returns: authorized_accreditations, classes, instructors, certificates, training_center_state { status, registration_date, accreditation_status }
      setDashboardData(data);
      
      setCounts({
        accs: data.authorized_accreditations || 0,
        classes: data.classes || 0,
        instructors: data.instructors || 0,
        certificates: data.certificates || 0
      });
    } catch (error) {
      console.error('Failed to load dashboard:', error);
      setDashboardData(null);
      setCounts({
        accs: 0,
        classes: 0,
        instructors: 0,
        certificates: 0
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="dashboard-container">
      {dashboardData && (
        <>
          {/* Stats Cards */}
          <div className="dashboard-stats-grid">
            {/* Certificates Card */}
            <DashboardCard
              icon={Award}
              colorType="certificates"
              label="Certificates"
              value={counts.certificates}
              hint="Click to view details"
              onClick={() => navigate('/training-center/certificates')}
            />
            
            {/* Accreditation Card */}
            <DashboardCard
              icon={Building2}
              colorType="acc"
              label="Authorized Accreditation"
              value={counts.accs}
              hint="Click to view details"
              onClick={() => navigate('/training-center/accs')}
            />

            {/* Classes Card */}
            <DashboardCard
              icon={BookOpen}
              colorType="classes"
              label="Classes"
              value={counts.classes}
              hint="Click to view details"
              onClick={() => navigate('/training-center/classes')}
            />

            {/* Instructors Card */}
            <DashboardCard
              icon={Users}
              colorType="instructors"
              label="Instructors"
              value={counts.instructors}
              hint="Click to view details"
              onClick={() => navigate('/training-center/instructors')}
            />

          </div>


          {/* Training Center State Section */}
          <StateSection title="Training Center State" titleIcon={Building2}>
            <StateItem
              icon={CheckCircle}
              iconColorType="green"
              label="Status"
              value={dashboardData.training_center_state?.status || 'N/A'}
              capitalize={true}
            />
            <StateItem
              icon={Calendar}
              iconColorType="blue"
              label="Registration Date"
              value={dashboardData.training_center_state?.registration_date || 'N/A'}
            />
            <StateItem
              icon={Award}
              iconColorType="purple"
              label="Accreditation Status"
              value={dashboardData.training_center_state?.accreditation_status || 'Not Verified'}
            />
          </StateSection>

        </>
      )}
    </div>
  );
};

export default TrainingCenterDashboardScreen;
