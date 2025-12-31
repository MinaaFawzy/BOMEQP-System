import { CheckCircle, Clock, XCircle } from 'lucide-react';
import './StatusBadge.css';

const StatusBadge = ({ status, variant = 'detail' }) => {
  const statusConfig = {
    active: { 
      badgeClass: variant === 'detail' ? 'status-badge-detail-active' : 'status-badge-active', 
      icon: CheckCircle 
    },
    approved: { 
      badgeClass: variant === 'detail' ? 'status-badge-detail-approved' : 'status-badge-approved', 
      icon: CheckCircle 
    },
    rejected: { 
      badgeClass: variant === 'detail' ? 'status-badge-detail-rejected' : 'status-badge-rejected', 
      icon: XCircle 
    },
    pending: { 
      badgeClass: variant === 'detail' ? 'status-badge-detail-pending' : 'status-badge-pending', 
      icon: Clock 
    },
    returned: { 
      badgeClass: variant === 'detail' ? 'status-badge-detail-returned' : 'status-badge-returned', 
      icon: Clock 
    },
  };
  
  const config = statusConfig[status] || statusConfig.pending;
  const Icon = config.icon;
  
  return (
    <span className={`status-badge ${config.badgeClass}`}>
      {variant === 'detail' && <Icon size={14} className="status-badge-icon" />}
      {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'N/A'}
    </span>
  );
};

export default StatusBadge;

