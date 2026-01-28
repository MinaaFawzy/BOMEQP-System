import { useState, useRef, useEffect } from 'react';
import { Globe, Check } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import './HeaderLanguageSwitcher.css';

const HeaderLanguageSwitcher = () => {
    const { currentLanguage, changeLanguage, languages } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });
    const dropdownRef = useRef(null);
    const buttonRef = useRef(null);

    // Calculate dropdown position when opening
    useEffect(() => {
        if (isOpen && buttonRef.current) {
            const buttonRect = buttonRef.current.getBoundingClientRect();
            // const dropdownWidth = 180; // Approximate width
            // const maxDropdownWidth = window.innerWidth - 32;

            const isRTL = document.dir === 'rtl' || document.body.dir === 'rtl';

            if (isRTL) {
                // RTL: Align left edge
                let leftPosition = buttonRect.left;
                if (leftPosition < 16) {
                    leftPosition = 16;
                }

                setDropdownPosition({
                    top: buttonRect.bottom + 12,
                    left: leftPosition,
                    right: 'auto',
                });
            } else {
                // LTR: Align right edge
                let rightPosition = window.innerWidth - buttonRect.right;
                if (rightPosition < 16) {
                    rightPosition = 16;
                }

                setDropdownPosition({
                    top: buttonRect.bottom + 12,
                    right: rightPosition,
                    left: 'auto',
                });
            }
        }
    }, [isOpen]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target) &&
                buttonRef.current &&
                !buttonRef.current.contains(event.target)
            ) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const [isLoading, setIsLoading] = useState(false);

    const handleLanguageChange = async (langCode) => {
        setIsLoading(true);
        try {
            await changeLanguage(langCode);
        } catch (error) {
            console.error('Failed to change language:', error);
            setIsLoading(false);
            alert("We cannot reach this language right now. Please try again later.");
        }
        setIsOpen(false);
    };

    return (
        <div className="header-language-switcher-container">
            <button
                ref={buttonRef}
                onClick={() => !isLoading && setIsOpen(!isOpen)}
                className={`header-language-button ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                title="Change Language"
                aria-label="Change Language"
                disabled={isLoading}
            >
                {isLoading ? (
                    <div className="animate-spin h-5 w-5 border-2 border-gray-500 rounded-full border-t-transparent"></div>
                ) : (
                    <Globe size={20} />
                )}
            </button>

            {isOpen && !isLoading && (
                <div
                    className="header-language-dropdown"
                    ref={dropdownRef}
                    style={{
                        top: `${dropdownPosition.top}px`,
                        right: dropdownPosition.right === 'auto' ? 'auto' : `${dropdownPosition.right}px`,
                        left: dropdownPosition.left === 'auto' ? 'auto' : `${dropdownPosition.left}px`,
                    }}
                >
                    {Object.entries(languages).map(([code, name]) => (
                        <button
                            key={code}
                            className={`header-language-option ${currentLanguage === code ? 'active' : ''}`}
                            onClick={() => handleLanguageChange(code)}
                            disabled={isLoading}
                        >
                            <span className="flex items-center">
                                {name}
                            </span>
                            {currentLanguage === code && <Check size={16} className="text-blue-500" />}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default HeaderLanguageSwitcher;
