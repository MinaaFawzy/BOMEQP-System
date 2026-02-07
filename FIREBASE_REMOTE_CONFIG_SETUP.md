# Firebase Remote Config Setup Guide

## Overview
This guide explains how to set up Firebase Remote Config to manage API timeout values for the BOMEQP system. The timeout values are fetched from Firebase and cannot be easily removed or bypassed by someone who has access to the project code.

## Security Features Implemented

### 1. **Private Variables**
- The timeout value is stored in a private variable `_secureApiTimeout` that's not directly accessible from outside the module
- This makes it harder for someone to modify the timeout value at runtime

### 2. **Initialization Promise**
- Remote Config is initialized once when the app starts
- Subsequent calls return the same promise, preventing re-initialization attempts

### 3. **Minimum Fetch Interval**
- Set to 1 hour (3600000ms) to prevent frequent fetching
- This limits how often someone can try to refresh the config

### 4. **Fetch Timeout**
- Set to 10 seconds to prevent hanging requests
- Ensures the app doesn't wait indefinitely for config values

### 5. **Default Fallback Values**
- If Remote Config fails to load, default values are used
- Ensures the app continues to function even if Firebase is unavailable

## Firebase Console Setup

### Step 1: Access Remote Config
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **bomeqp**
3. In the left sidebar, click on **Remote Config** (under "Engage" section)

### Step 2: Create Parameters

#### Parameter 1: API Timeout
- **Parameter key**: `api_timeout`
- **Data type**: Number
- **Default value**: `30000` (30 seconds in milliseconds)
- **Description**: Timeout for API requests in milliseconds

#### Parameter 2: API Retry Attempts (Optional)
- **Parameter key**: `api_retry_attempts`
- **Data type**: Number
- **Default value**: `3`
- **Description**: Number of retry attempts for failed API requests

#### Parameter 3: API Retry Delay (Optional)
- **Parameter key**: `api_retry_delay`
- **Data type**: Number
- **Default value**: `1000` (1 second in milliseconds)
- **Description**: Delay between retry attempts in milliseconds

### Step 3: Publish Changes
1. After adding all parameters, click **Publish changes**
2. Add a description for the change (e.g., "Initial API timeout configuration")
3. Click **Publish** to confirm

## How to Update Timeout Values

### Method 1: Firebase Console (Recommended)
1. Go to Firebase Console → Remote Config
2. Find the `api_timeout` parameter
3. Click **Edit**
4. Change the value (in milliseconds)
   - Example: `60000` for 60 seconds
   - Example: `15000` for 15 seconds
5. Click **Publish changes**
6. The app will fetch the new value within 1 hour (or on next app restart)

### Method 2: Programmatically (Advanced)
You can use the Firebase Admin SDK to update Remote Config values programmatically.

## Testing the Implementation

### 1. Check Console Logs
When the app starts, you should see these logs:
```
🔧 Initializing Firebase Remote Config...
✅ Remote Config fetched and activated
🔒 API Timeout set to: 30000ms
```

### 2. Verify Timeout is Applied
- Open browser DevTools → Network tab
- Make an API request
- Check the request timing
- If it takes longer than the configured timeout, it should fail

### 3. Test with Different Values
1. Set `api_timeout` to `5000` (5 seconds) in Firebase Console
2. Publish changes
3. Restart the app or wait for the fetch interval
4. Verify the new timeout is applied

## Conditional Values (Advanced)

You can set different timeout values based on conditions:

### By User Property
1. In Firebase Console → Remote Config
2. Click on a parameter → **Add value for condition**
3. Create a condition (e.g., "Premium Users")
4. Set different timeout values for different user segments

### By App Version
1. Create a condition based on app version
2. Set longer timeouts for older versions
3. Set shorter timeouts for newer versions

### By Platform
1. Create conditions for different platforms (web, mobile)
2. Set appropriate timeouts for each platform

## Security Best Practices

### 1. **Restrict Firebase Console Access**
- Only give Firebase Console access to trusted team members
- Use Firebase IAM roles to limit who can modify Remote Config

### 2. **Set Reasonable Timeout Values**
- Too short: Users may experience frequent timeouts
- Too long: App may hang for too long on slow connections
- Recommended: 30-60 seconds for most API calls

### 3. **Monitor Changes**
- Firebase Console shows a history of all Remote Config changes
- Review changes regularly to detect unauthorized modifications

### 4. **Use Environment-Specific Configs**
- Create separate Firebase projects for development and production
- Test timeout changes in development before applying to production

## Troubleshooting

### Issue: Remote Config not loading
**Solution**: Check browser console for errors. Ensure:
- Firebase is properly initialized
- Internet connection is available
- Firebase project ID is correct

### Issue: Timeout not being applied
**Solution**: 
- Check if `initializeRemoteConfig()` is called on app startup
- Verify the parameter key is exactly `api_timeout`
- Check console logs for initialization status

### Issue: Changes not reflecting immediately
**Solution**: 
- Remote Config has a 1-hour minimum fetch interval
- Restart the app to force a new fetch
- Or call `refreshRemoteConfig()` programmatically (for testing only)

## Code Reference

### Get Current Timeout Value
```javascript
import { getApiTimeout } from './config/firebase';

const timeout = getApiTimeout();
console.log('Current timeout:', timeout);
```

### Manually Refresh Config (Testing Only)
```javascript
import { refreshRemoteConfig } from './config/firebase';

// Force refresh Remote Config
await refreshRemoteConfig();
```

### Get Retry Configuration
```javascript
import { getRetryConfig } from './config/firebase';

const retryConfig = getRetryConfig();
console.log('Retry attempts:', retryConfig.attempts);
console.log('Retry delay:', retryConfig.delay);
```

## Default Values

If Remote Config fails to load, these default values are used:

| Parameter | Default Value | Description |
|-----------|---------------|-------------|
| `api_timeout` | 30000 | 30 seconds |
| `api_retry_attempts` | 3 | 3 retry attempts |
| `api_retry_delay` | 1000 | 1 second delay |

## Additional Security Measures

### 1. **Code Obfuscation** (Optional)
- Use a build tool to minify and obfuscate the code
- Makes it harder to understand and modify the timeout logic

### 2. **Server-Side Validation** (Recommended)
- Implement server-side request timeout limits
- Even if client bypasses timeout, server will enforce limits

### 3. **Rate Limiting** (Recommended)
- Implement API rate limiting on the server
- Prevents abuse even if timeout is bypassed

### 4. **Monitoring and Alerts**
- Set up Firebase Analytics to track config fetch events
- Alert on unusual patterns (e.g., too many config fetches)

## Summary

✅ **What's Protected:**
- Timeout values are fetched from Firebase Remote Config
- Values are stored in private variables
- Minimum fetch interval prevents frequent updates
- Default values ensure app continues working

✅ **What's NOT Protected:**
- Someone with code access can still modify the code itself
- Browser DevTools can still intercept network requests
- Server-side validation is still needed for complete security

✅ **Recommendation:**
- Use this as part of a defense-in-depth strategy
- Combine with server-side timeout enforcement
- Implement proper API authentication and rate limiting
- Monitor for unusual activity
