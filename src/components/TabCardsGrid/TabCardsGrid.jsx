import './TabCardsGrid.css';

const TabCardsGrid = ({ children, columns = { mobile: 1, tablet: 2, desktop: 2 } }) => {
  return (
    <div 
      className="tab-cards-grid"
      style={{
        '--columns-mobile': columns.mobile,
        '--columns-tablet': columns.tablet,
        '--columns-desktop': columns.desktop
      }}
    >
      {children}
    </div>
  );
};

export default TabCardsGrid;

