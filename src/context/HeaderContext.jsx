import { createContext, useContext, useState, useCallback, useMemo } from 'react';

const HeaderContext = createContext(null);

export const useHeader = () => {
  const context = useContext(HeaderContext);
  if (!context) {
    return {
      setHeaderActions: () => {},
      setHeaderTitle: () => {},
      setHeaderSubtitle: () => {},
      headerActions: null,
      headerTitle: null,
      headerSubtitle: null,
    };
  }
  return context;
};

export const HeaderProvider = ({ children }) => {
  const [headerActions, setHeaderActions] = useState(null);
  const [headerTitle, setHeaderTitle] = useState(null);
  const [headerSubtitle, setHeaderSubtitle] = useState(null);

  // Memoize setters to prevent unnecessary re-renders
  const setHeaderActionsMemo = useCallback((actions) => {
    setHeaderActions(actions);
  }, []);

  const setHeaderTitleMemo = useCallback((title) => {
    setHeaderTitle(title);
  }, []);

  const setHeaderSubtitleMemo = useCallback((subtitle) => {
    setHeaderSubtitle(subtitle);
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  // Only recreate when actual values change, not when setters change (they're stable)
  const contextValue = useMemo(() => ({
    headerActions,
    headerTitle,
    headerSubtitle,
    setHeaderActions: setHeaderActionsMemo,
    setHeaderTitle: setHeaderTitleMemo,
    setHeaderSubtitle: setHeaderSubtitleMemo,
  }), [headerActions, headerTitle, headerSubtitle]);

  return (
    <HeaderContext.Provider value={contextValue}>
      {children}
    </HeaderContext.Provider>
  );
};

