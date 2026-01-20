import React from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import LanguageSwitcher from '../LanguageSwitcher/LanguageSwitcher';

/**
 * Example component demonstrating how to use the localization system
 * 
 * This component shows:
 * 1. How to use the useTranslation hook
 * 2. How to access translations from different namespaces
 * 3. How to use nested translations
 * 4. How to integrate the LanguageSwitcher component
 */
const LocalizationExample = () => {
    // Get translations from different namespaces
    const { t: tCommon } = useTranslation('common');
    const { t: tAuth } = useTranslation('auth');
    const { t: tNav } = useTranslation('navigation');

    // You can also get language info
    const { currentLanguage, isRTL } = useTranslation();

    return (
        <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1>{tCommon('app_name')}</h1>
                <LanguageSwitcher />
            </div>

            <div style={{ marginBottom: '2rem' }}>
                <p>Current Language: <strong>{currentLanguage}</strong></p>
                <p>Is RTL: <strong>{isRTL ? 'Yes' : 'No'}</strong></p>
            </div>

            <section style={{ marginBottom: '2rem' }}>
                <h2>Common Translations</h2>
                <ul>
                    <li>{tCommon('welcome')}</li>
                    <li>{tCommon('save')}</li>
                    <li>{tCommon('cancel')}</li>
                    <li>{tCommon('delete')}</li>
                    <li>{tCommon('search')}</li>
                </ul>
            </section>

            <section style={{ marginBottom: '2rem' }}>
                <h2>Authentication Translations</h2>
                <ul>
                    <li>{tAuth('login')}</li>
                    <li>{tAuth('register')}</li>
                    <li>{tAuth('email')}</li>
                    <li>{tAuth('password')}</li>
                    <li>{tAuth('forgot_password')}</li>
                </ul>
            </section>

            <section style={{ marginBottom: '2rem' }}>
                <h2>Navigation Translations (Nested)</h2>
                <ul>
                    <li>{tNav('dashboard')}</li>
                    <li>{tNav('acc_admin.dashboard')}</li>
                    <li>{tNav('acc_admin.courses')}</li>
                    <li>{tNav('training_center.trainees')}</li>
                    <li>{tNav('instructor.earnings')}</li>
                </ul>
            </section>
        </div>
    );
};

export default LocalizationExample;
