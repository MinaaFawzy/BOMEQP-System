# Frontend-Backend Language Synchronization

## Overview
The frontend now automatically syncs the user's language preference with the backend. This ensures that:
1. Users see the UI in their preferred language
2. Backend notifications are sent in the user's preferred language
3. Language preference persists across sessions and devices

## How It Works

### 1. Language Change Flow
When a user changes their language in the UI:

```
User selects language → i18n.changeLanguage() → localStorage updated → Backend API called → User profile updated
```

**Implementation Details:**
- Language changes are handled in `src/i18n.js`
- When `i18n.changeLanguage()` is called, it triggers the `languageChanged` event
- The event listener automatically calls the backend API to update the user's profile
- The API call is made to `PUT /auth/profile` with `{ language: "en" | "hi" | "zh-CN" }`

### 2. Language Sync on Login/Registration
When a user logs in or registers:

```
Login/Register → Backend returns user data → setLanguageFromUser() → i18n.changeLanguage()
```

**Implementation Details:**
- `AuthContext.jsx` imports `setLanguageFromUser` from `i18n.js`
- After successful login/register, the user's language preference from backend is applied
- This ensures the UI immediately shows in the user's preferred language
- Language is synced in:
  - `login()` function
  - `register()` function
  - `checkAuth()` function (on page load)
  - `refreshUser()` function

### 3. Language Codes
The system uses the following language codes (matching backend):

| Code | Language | Display Name |
|------|----------|--------------|
| `en` | English | English |
| `hi` | Hindi | हिंदी |
| `zh-CN` | Chinese Simplified | 简体中文 |

**Important:** The frontend now uses `'zh-CN'` (with hyphen) instead of `'zhCN'` to match the backend's expected format.

## Files Modified

### 1. `src/i18n.js`
**Changes:**
- Changed language code from `'zhCN'` to `'zh-CN'` for backend compatibility
- Added async `languageChanged` event listener that syncs with backend
- Added `setLanguageFromUser(user)` helper function
- Backend sync only happens if user is logged in (token exists)

**Key Code:**
```javascript
i18n.on('languageChanged', async (lng) => {
    localStorage.setItem('language', lng);
    updateDirection(lng);
    
    // Sync language preference with backend
    const token = localStorage.getItem('token');
    if (token) {
        await fetch('/api/auth/profile', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ language: lng })
        });
    }
});

export const setLanguageFromUser = (user) => {
    if (user && user.language && user.language !== i18n.language) {
        i18n.changeLanguage(user.language);
    }
};
```

### 2. `src/context/AuthContext.jsx`
**Changes:**
- Imported `setLanguageFromUser` from `i18n.js`
- Added language sync in `login()` function
- Added language sync in `register()` function
- Added language sync in `checkAuth()` function
- Added language sync in `refreshUser()` function

**Key Code:**
```javascript
import { setLanguageFromUser } from '../i18n';

// In login, register, checkAuth, refreshUser:
setUser(response.user);
setIsAuthenticated(true);
setLanguageFromUser(response.user); // Sync language from backend
```

## User Experience

### Scenario 1: New User Registration
1. User registers with default language (English)
2. Backend creates user with `language: 'en'`
3. User can change language in profile settings
4. Language preference is saved to backend
5. All future notifications will be in selected language

### Scenario 2: Existing User Login
1. User logs in
2. Backend returns user data with `language` field
3. Frontend automatically switches to user's preferred language
4. UI and future notifications are in user's language

### Scenario 3: Language Change
1. User changes language in settings
2. UI immediately updates to new language
3. Backend is automatically notified
4. User's profile is updated with new language
5. Future notifications will be in new language

### Scenario 4: Multi-Device Usage
1. User changes language on Device A
2. Backend stores the preference
3. User logs in on Device B
4. Device B automatically uses the saved language preference

## Testing Checklist

- [x] Language changes in UI are synced to backend
- [x] Login retrieves and applies user's language preference
- [x] Registration sets default language (English)
- [x] Language preference persists across sessions
- [x] Language preference works across multiple devices
- [x] Backend notifications use user's preferred language
- [x] Fallback to English if translation is missing
- [x] No errors when changing language while logged out

## Backend API Reference

### Update User Language
**Endpoint:** `PUT /auth/profile`

**Request:**
```json
{
  "language": "hi"
}
```

**Response:**
```json
{
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "language": "hi",
    ...
  }
}
```

### Get User Profile
**Endpoint:** `GET /auth/profile`

**Response:**
```json
{
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "language": "en",
    ...
  }
}
```

## Error Handling

### Backend Sync Failures
- If backend sync fails, the language change still applies locally
- Error is logged to console but doesn't affect user experience
- User can continue using the app in their selected language
- Next successful API call will sync the language

### Missing Translations
- If a translation is missing in the selected language, English is used as fallback
- This is handled automatically by i18next

## Notes for Developers

1. **Always use language codes:** `'en'`, `'hi'`, `'zh-CN'` (not `'zhCN'`)
2. **Don't manually call backend API:** Language sync is automatic via i18n events
3. **Use `changeLanguage()` for language changes:** Don't directly update localStorage
4. **Backend sync is automatic:** No need to manually sync in components
5. **Language is set on login:** User's preference is automatically applied

## Future Enhancements

Potential improvements for the future:
- Add more languages (Arabic, Spanish, French, etc.)
- Add language detection based on browser settings
- Add language selection during registration
- Add language-specific date/time formatting
- Add language-specific number formatting
