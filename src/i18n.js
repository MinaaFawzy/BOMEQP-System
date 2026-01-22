import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import English translations
import enCommon from './locales/en/common.json';
import enAuth from './locales/en/auth.json';
import enNavigation from './locales/en/navigation.json';
import enTrainingCenter from './locales/en/training_center.json';
import enAccreditation from './locales/en/accreditation.json';
import enInstructor from './locales/en/instructor.json';

// Import Arabic translations
import arCommon from './locales/ar/common.json';
import arAuth from './locales/ar/auth.json';
import arNavigation from './locales/ar/navigation.json';
import arTrainingCenter from './locales/ar/training_center.json';
import arAccreditation from './locales/ar/accreditation.json';
import arInstructor from './locales/ar/instructor.json';

// Import Chinese (Simplified) translations
import zhCNCommon from './locales/zh-CN/common.json';
import zhCNAuth from './locales/zh-CN/auth.json';
import zhCNNavigation from './locales/zh-CN/navigation.json';
import zhCNTrainingCenter from './locales/zh-CN/training_center.json';
import zhCNAccreditation from './locales/zh-CN/accreditation.json';
import zhCNInstructor from './locales/zh-CN/instructor.json';

// Import Hindi translations
import hiCommon from './locales/hi/common.json';
import hiAuth from './locales/hi/auth.json';
import hiNavigation from './locales/hi/navigation.json';
import hiTrainingCenter from './locales/hi/training_center.json';
import hiAccreditation from './locales/hi/accreditation.json';
import hiInstructor from './locales/hi/instructor.json';

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
                accreditation: enAccreditation,
                instructor: enInstructor,
            },
            ar: {
                common: arCommon,
                auth: arAuth,
                navigation: arNavigation,
                training_center: arTrainingCenter,
                accreditation: arAccreditation,
                instructor: arInstructor,
            },
            zhCN: {
                common: zhCNCommon,
                auth: zhCNAuth,
                navigation: zhCNNavigation,
                training_center: zhCNTrainingCenter,
                accreditation: zhCNAccreditation,
                instructor: zhCNInstructor,
            },
            hi: {
                common: hiCommon,
                auth: hiAuth,
                navigation: hiNavigation,
                training_center: hiTrainingCenter,
                accreditation: hiAccreditation,
                instructor: hiInstructor,
            },
        },
        lng: savedLanguage, // default language
        fallbackLng: 'en', // fallback language if translation is missing
        ns: ['common', 'auth', 'navigation', 'training_center', 'accreditation', 'instructor'], // namespaces
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
