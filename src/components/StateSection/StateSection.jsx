import './StateSection.css';

const StateSection = ({ title, titleIcon: TitleIcon, children }) => {
  return (
    <div className="state-section">
      <h2 className="state-section-title">
        {TitleIcon && <TitleIcon className="state-section-title-icon" />}
        {title}
      </h2>
      <div className="state-section-grid">
        {children}
      </div>
    </div>
  );
};

export default StateSection;

