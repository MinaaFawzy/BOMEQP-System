import './StateItem.css';

const StateItem = ({ icon: Icon, iconColorType, label, value, capitalize = false }) => {
  return (
    <div className="state-item">
      <div className="state-item-content">
        <div className={`state-icon-wrapper state-icon-wrapper-${iconColorType}`}>
          <Icon className={`state-icon state-icon-${iconColorType}`} />
        </div>
        <div>
          <p className="state-label">{label}</p>
          <p className={`state-value ${capitalize ? 'state-value-capitalize' : ''}`}>
            {value}
          </p>
        </div>
      </div>
    </div>
  );
};

export default StateItem;

