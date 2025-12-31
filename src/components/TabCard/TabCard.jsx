import './TabCard.css';

const TabCard = ({ name, value, icon: Icon, colorType, isActive, onClick }) => {
  return (
    <div 
      onClick={onClick}
      className={`tab-card tab-card-${colorType} ${isActive ? 'active' : ''}`}
    >
      <div className="tab-card-content">
        <div>
          <p className={`tab-card-label tab-card-label-${colorType}`}>{name}</p>
          <p className={`tab-card-value tab-card-value-${colorType}`}>{value}</p>
        </div>
        <div className={`tab-card-icon-wrapper tab-card-icon-wrapper-${colorType}`}>
          <Icon className="tab-card-icon" size={32} />
        </div>
      </div>
    </div>
  );
};

export default TabCard;

