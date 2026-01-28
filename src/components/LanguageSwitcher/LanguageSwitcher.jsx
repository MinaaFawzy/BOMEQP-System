import React, { useState } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import FormInput from '../FormInput/FormInput';
import './LanguageSwitcher.css';

/**
 * LanguageSwitcher Component
 * 
 * A dropdown component for switching between available languages.
 * Automatically updates the UI direction (LTR/RTL) and persists the selection.
 * Uses FormInput for consistent styling with the rest of the application.
 */
const LanguageSwitcher = ({ className = '', label }) => {
    const { currentLanguage, changeLanguage, languages, t } = useTranslation();

    const [isLoading, setIsLoading] = useState(false);

    const handleLanguageChange = async (event) => {
        const newLanguage = event.target.value;
        setIsLoading(true);
        try {
            await changeLanguage(newLanguage);
        } catch (error) {
            console.error('Failed to change language:', error);
            setIsLoading(false);
            alert("We cannot reach this language right now. Please try again later.");
        }
    };

    // Convert languages object to options array for FormInput
    const languageOptions = Object.entries(languages).map(([code, name]) => ({
        value: code,
        label: name
    }));

    return (
        <div className={`language-switcher flex flex-col ${className}`}>
            {label && (
                <label className="block text-sm font-medium text-gray-700 mb-1 text-left rtl:text-right">
                    {label}
                </label>
            )}
            <div className="relative-container w-full">
                {isLoading && (
                    <div className="language-switcher-loading-overlay">
                        <div className="language-switcher-spinner"></div>
                    </div>
                )}
                <FormInput
                    type="select"
                    value={currentLanguage}
                    onChange={handleLanguageChange}
                    options={languageOptions}
                    disabled={isLoading}
                    className="w-full"
                />
            </div>
        </div>
    );
};

export default LanguageSwitcher;
