import './DetailItem.css';

const DetailItem = ({ label, value, icon: Icon, fullWidth = false, children }) => {
  return (
    <div className={`detail-item ${fullWidth ? 'detail-item-full' : ''}`}>
      <p className={`detail-label ${Icon ? 'detail-label-with-icon' : ''}`}>
        {Icon && <Icon size={16} className="detail-label-icon" />}
        {label}
      </p>
      {children || (
        <p className="detail-value">{value || 'N/A'}</p>
      )}
    </div>
  );
};

export default DetailItem;

