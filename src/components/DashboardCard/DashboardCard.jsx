import { ArrowRight } from 'lucide-react';
import './DashboardCard.css';

const DashboardCard = ({ icon: Icon, colorType, label, value, hint, onClick }) => {
  return (
    <div 
      onClick={onClick}
      className={`dashboard-card dashboard-card-${colorType}`}
    >
      <div className="dashboard-card-header">
        <div className={`dashboard-card-icon-wrapper-${colorType}`}>
          <Icon className="dashboard-card-icon" />
        </div>
        <ArrowRight className={`dashboard-card-arrow-${colorType}`} />
      </div>
      <div>
        <p className={`dashboard-card-label-${colorType}`}>{label}</p>
        <p className={`dashboard-card-value-${colorType}`}>
          {value}
        </p>
        <p className={`dashboard-card-hint-${colorType}`}>{hint}</p>
      </div>
    </div>
  );
};

export default DashboardCard;

