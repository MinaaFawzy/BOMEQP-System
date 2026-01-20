import './CustomButton.css';

const CustomButton = ({
    children,
    onClick,
    variant = 'primary',
    icon: Icon,
    loading = false,
    disabled = false,
    type = 'button',
    className = ''
}) => {
    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled || loading}
            className={`custom-button custom-button-${variant} ${loading ? 'loading' : ''} ${className}`}
        >
            {loading ? (
                <>
                    <span className="spinner"></span>
                    <span>Loading...</span>
                </>
            ) : (
                <>
                    {Icon && <Icon size={18} className="button-icon" />}
                    <span>{children}</span>
                </>
            )}
        </button>
    );
};

export default CustomButton;
