# Firebase Remote Config - Quick Start Guide

## ✅ What's Been Implemented

### 1. **Firebase Configuration** (`src/config/firebase.js`)
- ✅ Remote Config initialized with security settings
- ✅ Private variables to store timeout values
- ✅ Initialization promise to prevent tampering
- ✅ Default fallback values (30 seconds timeout)
- ✅ Functions to get timeout and retry configuration

### 2. **API Integration** (`src/services/api.js`)
- ✅ Axios instance now uses Remote Config timeout
- ✅ Timeout is fetched from Firebase on app startup
- ✅ Cannot be easily bypassed by code modification

### 3. **App Initialization** (`src/App.jsx`)
- ✅ Remote Config initializes when app starts
- ✅ Runs before any API calls are made
- ✅ Error handling for initialization failures

## 🚀 Next Steps - Firebase Console Setup

### Step 1: Go to Firebase Console
1. Visit: https://console.firebase.google.com/
2. Select project: **bomeqp**
3. Click **Remote Config** in left sidebar (under "Engage")

### Step 2: Add Parameter
Click **Add parameter** and enter:

**Parameter 1: API Timeout**
```
Parameter key: api_timeout
Data type: Number
Default value: 30000
Description: API request timeout in milliseconds
```

**Parameter 2: Retry Attempts (Optional)**
```
Parameter key: api_retry_attempts
Data type: Number
Default value: 3
Description: Number of retry attempts for failed requests
```

**Parameter 3: Retry Delay (Optional)**
```
Parameter key: api_retry_delay
Data type: Number
Default value: 1000
Description: Delay between retries in milliseconds
```

### Step 3: Publish
1. Click **Publish changes**
2. Add description: "Initial API timeout configuration"
3. Click **Publish**

## 🔒 Security Features

### What Makes It Secure?

1. **Private Variables**: Timeout stored in closure, not accessible globally
2. **Minimum Fetch Interval**: 1 hour - prevents frequent config refreshes
3. **Initialization Lock**: Config can only be initialized once
4. **Default Fallbacks**: App works even if Firebase is unavailable
5. **Server-Side Control**: You control values from Firebase Console

### What Can Still Be Bypassed?

⚠️ **Important**: This is NOT 100% secure. Someone with:
- Browser DevTools can still modify network requests
- Code access can modify the source code
- Advanced knowledge can bypass client-side restrictions

### Recommended Additional Security

1. **Server-Side Timeout**: Implement timeout on your API server
2. **Rate Limiting**: Limit requests per user/IP
3. **Authentication**: Ensure proper API authentication
4. **Monitoring**: Track unusual API usage patterns

## 📊 How to Change Timeout Values

### From Firebase Console (Recommended)
1. Go to Firebase Console → Remote Config
2. Edit `api_timeout` parameter
3. Change value (e.g., `60000` for 60 seconds)
4. Click **Publish changes**
5. App will fetch new value within 1 hour (or on restart)

### Recommended Timeout Values
- **Fast APIs**: 15000-30000ms (15-30 seconds)
- **Normal APIs**: 30000-60000ms (30-60 seconds)
- **Slow APIs**: 60000-120000ms (1-2 minutes)
- **File Uploads**: 120000-300000ms (2-5 minutes)

## 🧪 Testing

### 1. Check Browser Console
When app starts, you should see:
```
🔧 Initializing Firebase Remote Config...
✅ Remote Config fetched and activated
🔒 API Timeout set to: 30000ms
```

### 2. Test Timeout
1. Set timeout to 5000ms (5 seconds) in Firebase Console
2. Restart the app
3. Make an API call that takes longer than 5 seconds
4. It should timeout and show an error

### 3. Test Default Fallback
1. Disconnect from internet
2. Restart the app
3. Check console - should show:
```
⚠️ Using default timeout: 30000ms
```

## 📝 Code Examples

### Get Current Timeout
```javascript
import { getApiTimeout } from './config/firebase';

const timeout = getApiTimeout();
console.log('Current API timeout:', timeout);
```

### Manually Refresh Config (Testing Only)
```javascript
import { refreshRemoteConfig } from './config/firebase';

// Force refresh (bypasses 1-hour interval)
await refreshRemoteConfig();
```

### Get Retry Configuration
```javascript
import { getRetryConfig } from './config/firebase';

const config = getRetryConfig();
console.log('Retry attempts:', config.attempts);
console.log('Retry delay:', config.delay);
```

## 🐛 Troubleshooting

### Issue: "Remote Config not initialized"
**Solution**: 
- Check if app is connected to internet
- Verify Firebase project ID is correct
- Check browser console for errors

### Issue: Timeout not working
**Solution**:
- Verify parameter key is exactly `api_timeout` (case-sensitive)
- Check if value is a number, not a string
- Restart the app to force config fetch

### Issue: Changes not reflecting
**Solution**:
- Wait 1 hour for automatic refresh
- Or restart the app
- Or call `refreshRemoteConfig()` for testing

## 📚 Additional Resources

- **Full Documentation**: See `FIREBASE_REMOTE_CONFIG_SETUP.md`
- **Firebase Docs**: https://firebase.google.com/docs/remote-config
- **Firebase Console**: https://console.firebase.google.com/

## ⚡ Quick Commands

```bash
# Build the project
npm run build

# Run development server
npm run dev

# Check for errors
npm run lint
```

## 🎯 Summary

✅ **Implemented**:
- Firebase Remote Config integration
- Secure timeout management
- Automatic initialization on app startup
- Default fallback values

⏭️ **Next Steps**:
1. Set up parameters in Firebase Console
2. Test with different timeout values
3. Monitor app behavior
4. Implement server-side timeout (recommended)

🔐 **Security Level**: Medium
- Harder to bypass than hardcoded values
- Not 100% secure (client-side can always be modified)
- Should be combined with server-side validation
