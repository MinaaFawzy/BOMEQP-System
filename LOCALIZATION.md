# 🌍 BOMEQP Localization System

This document explains how to use and manage the localization (i18n) system in the BOMEQP application.

## 📁 File Structure

```
src/
├── locales/
│   ├── en/                    # English translations
│   │   ├── common.json        # Common UI strings
│   │   ├── auth.json          # Authentication related
│   │   └── navigation.json    # Navigation menu items
│   └── ar/                    # Arabic translations
│       ├── common.json
│       ├── auth.json
│       └── navigation.json
├── i18n.js                    # i18n configuration
└── hooks/
    └── useTranslation.js      # Custom translation hook
```

## 🚀 Quick Start

### 1. Using Translations in Components

```jsx
import { useTranslation } from '../hooks/useTranslation';

function MyComponent() {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>{t('welcome')}</h1>
      <button>{t('save')}</button>
    </div>
  );
}
```

### 2. Using Different Namespaces

```jsx
// For authentication strings
const { t } = useTranslation('auth');
console.log(t('login')); // "Login" or "تسجيل الدخول"

// For navigation strings
const { t } = useTranslation('navigation');
console.log(t('dashboard')); // "Dashboard" or "لوحة التحكم"

// For common strings (default)
const { t } = useTranslation('common');
console.log(t('save')); // "Save" or "حفظ"
```

### 3. Nested Translations

```jsx
const { t } = useTranslation('navigation');

// Access nested keys with dot notation
t('acc_admin.dashboard')        // "Dashboard"
t('group_admin.all_courses')    // "All Courses"
t('training_center.trainees')   // "Trainees"
```

### 4. Changing Language

```jsx
const { changeLanguage, currentLanguage } = useTranslation();

// Switch to Arabic
changeLanguage('ar');

// Switch to English
changeLanguage('en');

// Get current language
console.log(currentLanguage); // "en" or "ar"
```

### 5. RTL Support

```jsx
const { isRTL } = useTranslation();

return (
  <div className={isRTL ? 'rtl-specific-class' : 'ltr-specific-class'}>
    Content
  </div>
);
```

### 6. Using the Language Switcher Component

```jsx
import LanguageSwitcher from '../components/LanguageSwitcher/LanguageSwitcher';

function Header() {
  return (
    <header>
      <LanguageSwitcher />
    </header>
  );
}
```

## 📝 Adding New Translations

### Step 1: Add to English File

Edit `src/locales/en/[namespace].json`:

```json
{
  "new_key": "New Translation",
  "nested": {
    "key": "Nested Translation"
  }
}
```

### Step 2: Add to Arabic File

Edit `src/locales/ar/[namespace].json`:

```json
{
  "new_key": "ترجمة جديدة",
  "nested": {
    "key": "ترجمة متداخلة"
  }
}
```

### Step 3: Use in Component

```jsx
const { t } = useTranslation('namespace');
t('new_key'); // "New Translation" or "ترجمة جديدة"
t('nested.key'); // "Nested Translation" or "ترجمة متداخلة"
```

## 🗂️ Creating New Namespaces

### Step 1: Create Translation Files

Create `src/locales/en/mynewnamespace.json`:
```json
{
  "key1": "Value 1",
  "key2": "Value 2"
}
```

Create `src/locales/ar/mynewnamespace.json`:
```json
{
  "key1": "القيمة 1",
  "key2": "القيمة 2"
}
```

### Step 2: Update i18n Configuration

Edit `src/i18n.js`:

```javascript
// Import the new namespace
import enMyNewNamespace from './locales/en/mynewnamespace.json';
import arMyNewNamespace from './locales/ar/mynewnamespace.json';

// Add to resources
resources: {
  en: {
    common: enCommon,
    auth: enAuth,
    navigation: enNavigation,
    mynewnamespace: enMyNewNamespace, // Add here
  },
  ar: {
    common: arCommon,
    auth: arAuth,
    navigation: arNavigation,
    mynewnamespace: arMyNewNamespace, // Add here
  },
},

// Add to namespaces array
ns: ['common', 'auth', 'navigation', 'mynewnamespace'],
```

### Step 3: Use the New Namespace

```jsx
const { t } = useTranslation('mynewnamespace');
t('key1'); // "Value 1" or "القيمة 1"
```

## 🎨 RTL Styling

The system automatically sets `dir="rtl"` on the `<html>` element when Arabic is selected. Use CSS to handle RTL-specific styles:

```css
/* LTR (default) */
.my-element {
  margin-left: 1rem;
}

/* RTL */
[dir="rtl"] .my-element {
  margin-left: 0;
  margin-right: 1rem;
}
```

Or use logical properties (recommended):

```css
.my-element {
  margin-inline-start: 1rem; /* Works for both LTR and RTL */
}
```

## 📋 Best Practices

1. **Use Meaningful Keys**: Use descriptive keys like `save_changes` instead of `btn1`

2. **Organize by Feature**: Create separate namespaces for different features:
   - `common.json` - Shared UI elements
   - `auth.json` - Authentication
   - `navigation.json` - Navigation menus
   - `dashboard.json` - Dashboard specific
   - etc.

3. **Keep Translations Flat When Possible**: 
   ```json
   // Good
   {
     "user_name": "User Name",
     "user_email": "User Email"
   }
   
   // Also good for related items
   {
     "user": {
       "name": "User Name",
       "email": "User Email"
     }
   }
   ```

4. **Use Consistent Naming**: 
   - Use snake_case for keys
   - Use descriptive names
   - Group related translations

5. **Always Add Both Languages**: When adding a new key, add it to both English and Arabic files

6. **Test RTL Layout**: Always test your UI with Arabic to ensure proper RTL layout

## 🔧 Advanced Usage

### Dynamic Translations with Variables

If you need to add variables to translations in the future, you can use interpolation:

```json
{
  "welcome_user": "Welcome, {{name}}!"
}
```

```jsx
t('welcome_user', { name: 'John' }); // "Welcome, John!"
```

### Pluralization

For plural forms (to be implemented when needed):

```json
{
  "item_count": "{{count}} item",
  "item_count_plural": "{{count}} items"
}
```

```jsx
t('item_count', { count: 1 }); // "1 item"
t('item_count', { count: 5 }); // "5 items"
```

## 🌐 Supported Languages

Currently supported:
- 🇬🇧 English (en) - LTR
- 🇸🇦 Arabic (ar) - RTL

## 📞 Need Help?

If you need to add new translations or have questions about the localization system, refer to this guide or check the existing translation files for examples.

---

**Last Updated**: January 2026
