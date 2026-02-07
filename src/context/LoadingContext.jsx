import { createContext, useContext, useState, useCallback } from 'react';

const LoadingContext = createContext();

export const useLoading = () => {
    const context = useContext(LoadingContext);
    if (!context) {
        throw new Error('useLoading must be used within a LoadingProvider');
    }
    return context;
};

export const LoadingProvider = ({ children }) => {
    const [loadingCount, setLoadingCount] = useState(0);
    const [loadingMessage, setLoadingMessage] = useState('');

    const showLoading = useCallback((message = '') => {
        setLoadingCount(prev => prev + 1);
        if (message) {
            setLoadingMessage(message);
        }
    }, []);

    const hideLoading = useCallback(() => {
        setLoadingCount(prev => {
            const newCount = Math.max(0, prev - 1);
            if (newCount === 0) {
                setLoadingMessage('');
            }
            return newCount;
        });
    }, []);

    const isLoading = loadingCount > 0;

    const value = {
        isLoading,
        loadingMessage,
        showLoading,
        hideLoading,
    };

    return (
        <LoadingContext.Provider value={value}>
            {children}
        </LoadingContext.Provider>
    );
};

export default LoadingContext;
