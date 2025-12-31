import './InfoBox.css';

const InfoBox = ({ 
  title, 
  content, 
  icon: Icon, 
  variant = 'blue', 
  showHeader = false 
}) => {
  return (
    <div className={`info-box info-box-${variant}`}>
      {showHeader && Icon ? (
        <div className="info-box-header">
          <Icon className={`info-box-icon info-box-icon-${variant}`} />
          <div className="info-box-content-wrapper">
            <p className={`info-box-title info-box-title-${variant}`}>{title}</p>
            <p className="info-box-content">{content}</p>
          </div>
        </div>
      ) : (
        <>
          <p className={`info-box-title info-box-title-${variant}`}>{title}</p>
          <p className="info-box-content">{content}</p>
        </>
      )}
    </div>
  );
};

export default InfoBox;

