import i18n from '../i18n';

/**
 * Utility functions for working with translations outside of React components
 * Use these when you need translations in utility functions, API calls, etc.
 */

/**
 * Get a translation outside of a React component
 * @param {string} key - Translation key
 * @param {string} namespace - Namespace (default: 'common')
 * @param {object} options - Interpolation options
 * @returns {string} Translated string
 */
export const translate = (key, namespace = 'common', options = {}) => {
    return i18n.t(key, { ns: namespace, ...options });
};

/**
 * Get current language
 * @returns {string} Current language code ('en' or 'ar')
 */
export const getCurrentLanguage = () => {
    return i18n.language;
};

/**
 * Check if current language is RTL
 * @returns {boolean} True if RTL, false otherwise
 */
export const isRTL = () => {
    return i18n.language === 'ar';
};

/**
 * Change language programmatically
 * @param {string} language - Language code ('en' or 'ar')
 */
export const changeLanguage = (language) => {
    return i18n.changeLanguage(language);
};

/**
 * Format date according to current locale
 * @param {Date|string} date - Date to format
 * @param {object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
export const formatDate = (date, options = {}) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const locale = i18n.language === 'ar' ? 'ar-SA' : 'en-US';

    const defaultOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        ...options,
    };

    return new Intl.DateTimeFormat(locale, defaultOptions).format(dateObj);
};

/**
 * Format number according to current locale
 * @param {number} number - Number to format
 * @param {object} options - Intl.NumberFormat options
 * @returns {string} Formatted number string
 */
export const formatNumber = (number, options = {}) => {
    const locale = i18n.language === 'ar' ? 'ar-SA' : 'en-US';
    return new Intl.NumberFormat(locale, options).format(number);
};

/**
 * Format currency according to current locale
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (default: 'USD')
 * @param {object} options - Additional Intl.NumberFormat options
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, currency = 'USD', options = {}) => {
    const locale = i18n.language === 'ar' ? 'ar-SA' : 'en-US';

    const defaultOptions = {
        style: 'currency',
        currency,
        ...options,
    };

    return new Intl.NumberFormat(locale, defaultOptions).format(amount);
};

/**
 * Get direction for current language
 * @returns {string} 'rtl' or 'ltr'
 */
export const getDirection = () => {
    return isRTL() ? 'rtl' : 'ltr';
};

/**
 * Get all available languages
 * @returns {object} Object with language codes as keys and names as values
 */
export const getAvailableLanguages = () => {
    return {
        en: 'English',
        ar: 'العربية',
    };
};

export default {
    translate,
    getCurrentLanguage,
    isRTL,
    changeLanguage,
    formatDate,
    formatNumber,
    formatCurrency,
    getDirection,
    getAvailableLanguages,
};
