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

    return {
        t,
        i18n,
        currentLanguage: i18n.language,
        changeLanguage: (lng) => i18n.changeLanguage(lng),
        isRTL: i18n.language === 'ar',
        languages: {
            en: 'English',
            // ar: 'العربية',
            'zh-CN': '中文',
            hi: 'हिन्दी',
        },
    };
};

export default useTranslation;
