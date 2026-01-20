# 🤝 How We'll Work Together on Translations

## Our Workflow

### Your Part:
1. **Identify the strings** you need for your feature/screen
2. **Write them in English** in a list
3. **Tell me** which namespace they belong to (or if you need a new one)

### My Part:
1. **Provide Arabic translations** for all your strings
2. **Update the JSON files** (both English and Arabic)
3. **Update i18n.js** if you need a new namespace
4. **Show you** how to use them in your components

---

## 📝 Template for Requesting Translations

When you need translations, just send me a message like this:

```
I need translations for the [Feature Name] screen.
Namespace: [existing namespace or "new: featurename"]

Strings:
1. Page title
2. Save button
3. Cancel button
4. Success message
5. Error message
...etc
```

Or even simpler:

```
Add these to common:
- Export to Excel
- Print Report
- Select All
- Deselect All
```

---

## 🎯 Examples

### Example 1: Adding to Existing Namespace

**You say:**
```
Add these to the "common" namespace:
- Download Certificate
- Upload Document
- Verify Email
```

**I'll respond with:**
```json
// I'll add to src/locales/en/common.json:
{
  "download_certificate": "Download Certificate",
  "upload_document": "Upload Document",
  "verify_email": "Verify Email"
}

// And to src/locales/ar/common.json:
{
  "download_certificate": "تحميل الشهادة",
  "upload_document": "رفع المستند",
  "verify_email": "التحقق من البريد الإلكتروني"
}
```

**You use it:**
```jsx
const { t } = useTranslation();
<button>{t('download_certificate')}</button>
```

---

### Example 2: Creating New Namespace

**You say:**
```
I'm working on the Certificates screen. I need a new namespace called "certificates" with these strings:

- Certificate List (page title)
- Issue Certificate (button)
- Certificate Number (label)
- Issue Date (label)
- Expiry Date (label)
- Status (label)
- Valid (status)
- Expired (status)
- Download PDF (button)
- Verify Certificate (button)
```

**I'll respond:**
1. Create `src/locales/en/certificates.json` with English translations
2. Create `src/locales/ar/certificates.json` with Arabic translations
3. Update `src/i18n.js` to include the new namespace
4. Show you how to use it

**You use it:**
```jsx
const { t } = useTranslation('certificates');
<h1>{t('certificate_list')}</h1>
<button>{t('issue_certificate')}</button>
```

---

### Example 3: Nested Translations

**You say:**
```
Add these to "navigation" under a new "certificates" section:
- Certificates (main menu)
- Issue New (submenu)
- View All (submenu)
- Templates (submenu)
```

**I'll add:**
```json
// English
{
  "certificates": {
    "main": "Certificates",
    "issue_new": "Issue New",
    "view_all": "View All",
    "templates": "Templates"
  }
}

// Arabic
{
  "certificates": {
    "main": "الشهادات",
    "issue_new": "إصدار جديد",
    "view_all": "عرض الكل",
    "templates": "القوالب"
  }
}
```

**You use it:**
```jsx
const { t } = useTranslation('navigation');
<span>{t('certificates.main')}</span>
<span>{t('certificates.issue_new')}</span>
```

---

## 🔄 Typical Conversation Flow

### Scenario: You're building a new screen

**You:**
> I'm building the Trainees screen. I need translations for:
> - Page title: "Trainees"
> - Add button: "Add Trainee"
> - Search placeholder: "Search trainees..."
> - Table headers: Name, Email, Phone, Status, Actions
> - Status options: Active, Inactive, Pending
> - Actions: Edit, Delete, View Details
> 
> Should I use common or create a new namespace?

**Me:**
> Let's create a new namespace called "trainees" for this screen. I'll set it up now.
> 
> [I create the files and update i18n.js]
> 
> Done! Here's how to use it:
> ```jsx
> const { t } = useTranslation('trainees');
> <h1>{t('page_title')}</h1>
> <button>{t('add_trainee')}</button>
> ```

**You:**
> Perfect! Can you also add these validation messages:
> - "Name is required"
> - "Invalid email format"
> - "Phone number must be 10 digits"

**Me:**
> Added to the trainees namespace under "validation":
> ```jsx
> t('validation.name_required')
> t('validation.invalid_email')
> t('validation.phone_format')
> ```

---

## 💡 Tips for Efficient Collaboration

### ✅ DO:
- **Group related strings** when requesting (e.g., "all form labels", "all error messages")
- **Specify the context** (e.g., "for the login form", "for the dashboard")
- **Use clear English** - I'll handle the Arabic
- **Ask for help** deciding on namespace organization

### ❌ DON'T:
- Don't worry about the Arabic translations - that's my job
- Don't manually edit i18n.js - tell me and I'll update it
- Don't create new namespaces without telling me first

---

## 🚀 Getting Started

### Right Now:
1. **Look at your current screens**
2. **Make a list of all hardcoded strings**
3. **Tell me which screen/feature** they're for
4. **I'll organize and translate them**

### Example First Request:
```
Let's start with the Login screen. Here are all the strings:

Page:
- Welcome back
- Sign in to your account

Form:
- Email address
- Password
- Remember me
- Forgot password?
- Sign in button

Errors:
- Invalid email or password
- Please fill in all fields
- Account is inactive

Links:
- Don't have an account? Register
```

---

## 📞 Communication Templates

### For New Strings:
```
Namespace: [name]
Strings:
- [string 1]
- [string 2]
- [string 3]
```

### For Updates:
```
Update [namespace]:
Change "[old key]" from "[old value]" to "[new value]"
```

### For New Namespace:
```
New namespace: [name]
For: [feature/screen description]
Strings: [list]
```

---

## 🎯 Current Status

✅ **Setup Complete**
- i18n configured
- English & Arabic support
- RTL support
- 3 namespaces ready (common, auth, navigation)
- 120+ strings already translated

✅ **Ready to Use**
- Just import `useTranslation` hook
- Add `<LanguageSwitcher />` to test
- Start replacing hardcoded strings

🚀 **Next Step**
Tell me which screen you want to start with, and I'll help you translate all its strings!

---

## 📚 Quick Links

- **Full Documentation**: `LOCALIZATION.md`
- **Implementation Summary**: `LOCALIZATION_SUMMARY.md`
- **Quick Reference**: `QUICK_REFERENCE.md`
- **This Guide**: `WORKFLOW.md`

---

**Ready when you are! Just tell me what you need translated.** 🎉
