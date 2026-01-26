import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import English translations
import enCommon from './locales/en/common.json';
import enAuth from './locales/en/auth.json';
import enNavigation from './locales/en/navigation.json';
import enTrainingCenter from './locales/en/training_center.json';
import enAccreditation from './locales/en/accreditation.json';
import enInstructor from './locales/en/instructor.json';
import enNotifications from './locales/en/notifications.json';

// Import Arabic translations
import arCommon from './locales/ar/common.json';
import arAuth from './locales/ar/auth.json';
import arNavigation from './locales/ar/navigation.json';
import arTrainingCenter from './locales/ar/training_center.json';
import arAccreditation from './locales/ar/accreditation.json';
import arInstructor from './locales/ar/instructor.json';
// import arNotifications from './locales/ar/notifications.json';

// Import Chinese (Simplified) translations
import zhCNCommon from './locales/zh-CN/common.json';
import zhCNAuth from './locales/zh-CN/auth.json';
import zhCNNavigation from './locales/zh-CN/navigation.json';
import zhCNTrainingCenter from './locales/zh-CN/training_center.json';
import zhCNAccreditation from './locales/zh-CN/accreditation.json';
import zhCNInstructor from './locales/zh-CN/instructor.json';
import zhCNNotifications from './locales/zh-CN/notifications.json';

// Import Hindi translations
import hiCommon from './locales/hi/common.json';
import hiAuth from './locales/hi/auth.json';
import hiNavigation from './locales/hi/navigation.json';
import hiTrainingCenter from './locales/hi/training_center.json';
import hiAccreditation from './locales/hi/accreditation.json';
import hiInstructor from './locales/hi/instructor.json';
import hiNotifications from './locales/hi/notifications.json';

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
                notifications: enNotifications,
            },
            ar: {
                common: arCommon,
                auth: arAuth,
                navigation: arNavigation,
                training_center: arTrainingCenter,
                accreditation: arAccreditation,
                instructor: arInstructor,
            },
            'zh-CN': { // Chinese Simplified - matches backend language code format
                common: zhCNCommon,
                auth: zhCNAuth,
                navigation: zhCNNavigation,
                training_center: zhCNTrainingCenter,
                accreditation: zhCNAccreditation,
                instructor: zhCNInstructor,
                notifications: zhCNNotifications,
            },
            'hi': {
                common: hiCommon,
                auth: hiAuth,
                navigation: hiNavigation,
                training_center: hiTrainingCenter,
                accreditation: hiAccreditation,
                instructor: hiInstructor,
                notifications: hiNotifications,
            },
        },
        lng: savedLanguage, // default language
        fallbackLng: 'en', // fallback language if translation is missing
        ns: ['common', 'auth', 'navigation', 'training_center', 'accreditation', 'instructor', 'notifications'], // namespaces
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

// Listen for language changes and sync with backend
i18n.on('languageChanged', async (lng) => {
    localStorage.setItem('language', lng);
    updateDirection(lng);

    // Sync language preference with backend
    try {
        const token = localStorage.getItem('token');
        if (token) {
            // Only sync if user is logged in
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'https://aeroenix.com/v1/api'}/auth/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                },
                body: JSON.stringify({ language: lng })
            });

            if (response.ok) {
                console.log('Language preference synced with backend:', lng);
            }
        }
    } catch (error) {
        console.error('Failed to sync language with backend:', error);
        // Don't throw error - language change should still work locally
    }
});

// Helper function to set language from backend user data
export const setLanguageFromUser = (user) => {
    if (user && user.language && user.language !== i18n.language) {
        i18n.changeLanguage(user.language);
    }
};

export default i18n;
