# 🚀 Quick Reference - Adding Translations

## For You (The Developer)

### When You Want to Add a New String:

#### Option 1: Add to Existing Files (Recommended for most cases)

1. **Open both files:**
   - `src/locales/en/[namespace].json`
   - `src/locales/ar/[namespace].json`

2. **Add your string to both:**
   ```json
   // English file
   {
     "your_new_key": "Your English Text"
   }
   
   // Arabic file
   {
     "your_new_key": "النص العربي الخاص بك"
   }
   ```

3. **Tell me the key and I'll translate it** (or use Google Translate for now)

4. **Use it in your component:**
   ```jsx
   const { t } = useTranslation('namespace');
   <button>{t('your_new_key')}</button>
   ```

#### Option 2: Create New Namespace (For a whole new feature)

1. **Copy the template files:**
   - Copy `src/locales/en/_template.json` → `src/locales/en/yourfeature.json`
   - Copy `src/locales/ar/_template.json` → `src/locales/ar/yourfeature.json`

2. **Add your translations to both files**

3. **Tell me to update `i18n.js`** (I'll add the imports and configuration)

4. **Use it:**
   ```jsx
   const { t } = useTranslation('yourfeature');
   ```

---

## 📝 Common Patterns

### Simple Button
```jsx
const { t } = useTranslation();
<button>{t('save')}</button>
```

### Form Label
```jsx
const { t } = useTranslation('auth');
<label>{t('email')}</label>
```

### Page Title
```jsx
const { t } = useTranslation('navigation');
<h1>{t('acc_admin.dashboard')}</h1>
```

### Error Message
```jsx
const { t } = useTranslation('auth');
alert(t('login_error'));
```

---

## 🎯 Workflow

### When Working on a New Screen:

1. **List all the strings** you need (buttons, labels, messages, etc.)
2. **Decide which namespace** to use:
   - General UI stuff → `common`
   - Login/Register → `auth`
   - Menu items → `navigation`
   - New feature → Create new namespace

3. **Add English strings** to the JSON file
4. **Tell me the English strings** and I'll provide Arabic translations
5. **Add Arabic translations** to the Arabic JSON file
6. **Use in your components** with `useTranslation`

---

## 📋 Example: Adding a New Screen

Let's say you're adding a "Reports" screen:

### Step 1: Create the namespace files
```bash
# Copy templates
src/locales/en/reports.json
src/locales/ar/reports.json
```

### Step 2: Add your strings (English)
```json
{
  "title": "Reports",
  "generate_report": "Generate Report",
  "export_pdf": "Export as PDF",
  "date_range": "Date Range",
  "filters": {
    "status": "Status",
    "type": "Type",
    "date": "Date"
  }
}
```

### Step 3: Tell me these strings and I'll give you Arabic:
```json
{
  "title": "التقارير",
  "generate_report": "إنشاء تقرير",
  "export_pdf": "تصدير كـ PDF",
  "date_range": "نطاق التاريخ",
  "filters": {
    "status": "الحالة",
    "type": "النوع",
    "date": "التاريخ"
  }
}
```

### Step 4: Tell me to update i18n.js
I'll add:
```javascript
import enReports from './locales/en/reports.json';
import arReports from './locales/ar/reports.json';
```

### Step 5: Use in your component
```jsx
import { useTranslation } from '../hooks/useTranslation';

function ReportsScreen() {
  const { t } = useTranslation('reports');
  
  return (
    <div>
      <h1>{t('title')}</h1>
      <button>{t('generate_report')}</button>
      <button>{t('export_pdf')}</button>
      <label>{t('filters.status')}</label>
    </div>
  );
}
```

---

## 🔑 Key Points

1. **Always add to BOTH English and Arabic files**
2. **Use descriptive keys** (not `text1`, `text2`)
3. **Group related items** with nested objects
4. **Test with both languages** to see how it looks
5. **Ask me for Arabic translations** if you're not sure

---

## 🆘 Quick Help

**Q: Where do I add a button label?**
A: `src/locales/en/common.json` and `src/locales/ar/common.json`

**Q: Where do I add login/register text?**
A: `src/locales/en/auth.json` and `src/locales/ar/auth.json`

**Q: Where do I add menu items?**
A: `src/locales/en/navigation.json` and `src/locales/ar/navigation.json`

**Q: I need a whole new section for my feature?**
A: Create new files and tell me to update `i18n.js`

**Q: How do I test it?**
A: Add `<LanguageSwitcher />` to your component and switch languages

---

## 📞 When You Need Me

Just tell me:
1. **What strings you need** (in English)
2. **Which namespace** (or if you need a new one)
3. I'll provide the **Arabic translations**
4. I'll **update i18n.js** if needed

That's it! 🎉
