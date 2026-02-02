import { useTranslation as useI18nTranslation } from 'react-i18next';

/**
 * Custom hook for translations with simplified API
 * 
 * Usage examples:
 * 
 * 1. Basic translation:
 *    const { t } = useTranslation();
 *    t('save') // Returns "Save" or "حفظ"
 * 
 * 2. Translation from specific namespace:
 *    const { t } = useTranslation('auth');
 *    t('login') // Returns "Login" or "تسجيل الدخول"
 * 
 * 3. Nested translation:
 *    const { t } = useTranslation('navigation');
 *    t('acc_admin.dashboard') // Returns "Dashboard" or "لوحة التحكم"
 * 
 * 4. Change language:
 *    const { changeLanguage, currentLanguage } = useTranslation();
 *    changeLanguage('ar'); // Switch to Arabic
 * 
 * 5. Check if RTL:
 *    const { isRTL } = useTranslation();
 *    if (isRTL) { ... }
 */
export const useTranslation = (namespace = 'common') => {
    const { t, i18n } = useI18nTranslation(namespace);

    const changeLanguage = async (lng) => {
        try {
            // Check if user is logged in
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://app.bomeqp.com/api/api';

            if (token) {
                // Determine header key
                const authHeader = `Bearer ${token}`;

                // Sync with backend
                const response = await fetch(`${API_BASE_URL}/auth/profile`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': authHeader,
                        'Accept': 'application/json',
                    },
                    body: JSON.stringify({ language: lng })
                });

                if (!response.ok) {
                    throw new Error('Failed to update language preference on server');
                }
            }

            // Sync successful or not logged in -> Apply changes
            await i18n.changeLanguage(lng);

            // Reload page to reflect changes
            window.location.reload();

        } catch (error) {
            console.error('Language change failed:', error);
            throw error; // Propagate error so component can stop loading state
        }
    };

    return {
        t,
        i18n,
        currentLanguage: i18n.language,
        changeLanguage,
        isRTL: i18n.language === 'ar',
        languages: {
            en: 'English',
            ar: 'العربية',
            'zh-CN': '中文',
            es: 'Español',
            hi: 'हिन्दी',
        },
    };
};

export default useTranslation;
