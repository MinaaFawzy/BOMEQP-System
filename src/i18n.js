import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import English translations
import enCommon from './locales/en/common.json';
import enAuth from './locales/en/auth.json';
import enNavigation from './locales/en/navigation.json';
import enTrainingCenter from './locales/en/training_center.json';

// Import Arabic translations
import arCommon from './locales/ar/common.json';
import arAuth from './locales/ar/auth.json';
import arNavigation from './locales/ar/navigation.json';
import arTrainingCenter from './locales/ar/training_center.json';

// Get saved language from localStorage or default to 'en'
const savedLanguage = localStorage.getItem('language') || 'en';

// Configure i18next
i18n
    .use(initReactI18next) // passes i18n down to react-i18next
    .init({
        resources: {
            en: {
                common: enCommon,
                auth: enAuth,
                navigation: enNavigation,
                training_center: enTrainingCenter,
            },
            ar: {
                common: arCommon,
                auth: arAuth,
                navigation: arNavigation,
                training_center: arTrainingCenter,
            },
        },
        lng: savedLanguage, // default language
        fallbackLng: 'en', // fallback language if translation is missing
        ns: ['common', 'auth', 'navigation', 'training_center'], // namespaces
        defaultNS: 'common', // default namespace
        interpolation: {
            escapeValue: false, // react already safes from xss
        },
        react: {
            useSuspense: false, // disable suspense for now
        },
    });

// Update document direction based on language
const updateDirection = (language) => {
    const isRTL = language === 'ar';
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
};

// Set initial direction
updateDirection(savedLanguage);

// Listen for language changes
i18n.on('languageChanged', (lng) => {
    localStorage.setItem('language', lng);
    updateDirection(lng);
});

export default i18n;
