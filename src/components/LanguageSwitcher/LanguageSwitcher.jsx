import React from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import './LanguageSwitcher.css';

/**
 * LanguageSwitcher Component
 * 
 * A dropdown component for switching between available languages.
 * Automatically updates the UI direction (LTR/RTL) and persists the selection.
 */
const LanguageSwitcher = ({ className = '' }) => {
    const { currentLanguage, changeLanguage, languages } = useTranslation();

    const handleLanguageChange = (event) => {
        const newLanguage = event.target.value;
        changeLanguage(newLanguage);
    };

    return (
        <div className={`language-switcher ${className}`}>
            <select
                value={currentLanguage}
                onChange={handleLanguageChange}
                className="language-select"
                aria-label="Select Language"
            >
                {Object.entries(languages).map(([code, name]) => (
                    <option key={code} value={code}>
                        {name}
                    </option>
                ))}
            </select>
        </div>
    );
};

export default LanguageSwitcher;
