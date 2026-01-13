import { Mail, Phone, MapPin, FileText, Calendar, User, Building2, Globe, Award, CheckCircle, XCircle, Clock, AlertCircle, ArrowLeft } from 'lucide-react';
import './DetailForm.css';

const DetailForm = ({ data, fields, className = '' }) => {
  if (!data) {
    return (
      <div className="detail-form-empty">
        <p className="detail-form-empty-text">No data available</p>
      </div>
    );
  }

  // Default field renderer
  const renderField = (field, value) => {
    if (field.hidden && field.hidden(value)) return null;
    if (!value && value !== 0 && value !== false && field.showEmpty !== true) return null;

    const displayValue = value || value === 0 || value === false ? value : field.emptyText || 'N/A';

    return (
      <div className={`detail-form-item ${field.fullWidth ? 'detail-form-item-full' : ''}`}>
        <div className="detail-form-label">
          {field.icon && <field.icon size={16} className="detail-form-label-icon" />}
          {field.label}
        </div>
        <div className="detail-form-value">
          {field.render ? field.render(displayValue, data) : (
            field.type === 'email' ? (
              <a href={`mailto:${displayValue}`} className="detail-form-link">
                {displayValue}
              </a>
            ) : field.type === 'url' || field.type === 'link' ? (
              <a
                href={displayValue.startsWith('http') ? displayValue : `https://${displayValue}`}
                target="_blank"
                rel="noopener noreferrer"
                className="detail-form-link"
              >
                {displayValue}
              </a>
            ) : field.type === 'date' ? (
              new Date(displayValue).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })
            ) : field.type === 'datetime' ? (
              new Date(displayValue).toLocaleString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })
            ) : field.type === 'status' ? (
              renderStatusBadge(displayValue)
            ) : field.type === 'badge' ? (
              <span className={`detail-form-badge ${field.badgeClass || ''}`}>
                {displayValue}
              </span>
            ) : (
              displayValue
            )
          )}
        </div>
      </div>
    );
  };

  // Status badge renderer
  const renderStatusBadge = (status) => {
    const statusConfig = {
      active: {
        class: 'detail-form-status-active',
        icon: CheckCircle
      },
      approved: {
        class: 'detail-form-status-active',
        icon: CheckCircle
      },
      pending: {
        class: 'detail-form-status-pending',
        icon: Clock
      },
      rejected: {
        class: 'detail-form-status-rejected',
        icon: XCircle
      },
      inactive: {
        class: 'detail-form-status-inactive',
        icon: Clock
      },
      suspended: {
        class: 'detail-form-status-suspended',
        icon: XCircle
      },
      enrolled: {
        class: 'detail-form-status-enrolled',
        icon: CheckCircle
      },
      completed: {
        class: 'detail-form-status-completed',
        icon: CheckCircle
      },
      dropped: {
        class: 'detail-form-status-dropped',
        icon: XCircle
      },
      in_progress: {
        class: 'detail-form-status-enrolled',
        icon: Clock
      },
      cancelled: {
        class: 'detail-form-status-rejected',
        icon: XCircle
      },
      scheduled: {
        class: 'detail-form-status-pending',
        icon: Clock
      },
      returned: {
        class: 'detail-form-status-enrolled',
        icon: ArrowLeft
      },
      valid: {
        class: 'detail-form-status-active',
        icon: CheckCircle
      },
      expired: {
        class: 'detail-form-status-expired',
        icon: Clock
      },
      revoked: {
        class: 'detail-form-status-rejected',
        icon: XCircle
      }
    };

    const config = statusConfig[status?.toLowerCase()] || {
      class: 'detail-form-status-default',
      icon: AlertCircle
    };
    const Icon = config.icon;

    return (
      <span className={`detail-form-status-badge ${config.class}`}>
        <Icon size={14} className="detail-form-status-icon" />
        {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'N/A'}
      </span>
    );
  };

  // Filter out null/undefined fields to avoid white space
  const validFields = fields?.filter((field, index) => {
    const fieldKey = field.key || field.name;
    const value = field.transform ? field.transform(data[fieldKey], data) : data[fieldKey];
    // Don't render if field should be hidden or empty (unless showEmpty is true)
    if (field.hidden && field.hidden(value)) return false;
    if (!value && value !== 0 && value !== false && field.showEmpty !== true) return false;
    return true;
  }) || [];

  return (
    <div className={`detail-form-container ${className}`}>
      {validFields.length > 0 ? (
        <div className="detail-form-grid">
          {validFields.map((field, index) => {
            const fieldKey = field.key || field.name;
            const value = field.transform ? field.transform(data[fieldKey], data) : data[fieldKey];
            return (
              <div key={fieldKey || index}>
                {renderField(field, value)}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="detail-form-empty">
          <p className="detail-form-empty-text">No data available</p>
        </div>
      )}
    </div>
  );
};

export default DetailForm;
