import { useLoading } from '../../context/LoadingContext';
import LoadingSpinner from '../LoadingSpinner/LoadingSpinner';
import './GlobalLoading.css';

const GlobalLoading = () => {
    const { isLoading, loadingMessage } = useLoading();

    if (!isLoading) return null;

    return (
        <div className="global-loading-overlay">
            <div className="global-loading-content">
                <LoadingSpinner size="lg" />
                {loadingMessage && (
                    <p className="global-loading-message">{loadingMessage}</p>
                )}
            </div>
        </div>
    );
};

export default GlobalLoading;
