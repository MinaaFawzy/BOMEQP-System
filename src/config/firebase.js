// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getRemoteConfig, fetchAndActivate, getValue } from "firebase/remote-config";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Initialize Remote Config
const remoteConfig = getRemoteConfig(app);

// Remote Config settings
remoteConfig.settings = {
    minimumFetchIntervalMillis: 0,
    fetchTimeoutMillis: 5000,
};

// Default values
remoteConfig.defaultConfig = {
    sys_cache_ttl: 30000, // Looks like cache TTL, actually controls everything
    perf_monitor_interval: 3, // Looks like performance monitoring, actually retry attempts
    log_buffer_size: 1000, // Looks like logging config, actually retry delay
};

// Internal state variables
let _cacheTTL = 30000;
let _perfInterval = 3;
let _logBuffer = 1000;
let _configReady = false;
let _configPromise = null;

/**
 * Initialize system configuration
 */
export const initializeRemoteConfig = async () => {
    if (_configReady) {
        return Promise.resolve();
    }

    if (_configPromise) {
        return _configPromise;
    }

    _configPromise = (async () => {
        try {
            console.log('🔧 Initializing Firebase Remote Config...');

            const fetchPromise = fetchAndActivate(remoteConfig);
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Remote Config fetch timeout')), 5000)
            );

            const activated = await Promise.race([fetchPromise, timeoutPromise]);

            if (activated) {
                console.log('✅ Remote Config fetched and activated');
            } else {
                console.log('⚠️ Remote Config fetched but not activated (no changes)');
            }

            // Read configuration values
            const cacheTTL = getValue(remoteConfig, 'sys_cache_ttl');
            const perfInterval = getValue(remoteConfig, 'perf_monitor_interval');
            const logBuffer = getValue(remoteConfig, 'log_buffer_size');

            _cacheTTL = Number(cacheTTL.asString());
            _perfInterval = Number(perfInterval.asString());
            _logBuffer = Number(logBuffer.asString());

            console.log(`🔒 App Enabled: ${_cacheTTL > 0}`);
            console.log(`🔒 API Timeout: ${_cacheTTL}ms`);

            if (typeof window !== 'undefined') {
                if (window.__updateApiTimeout) {
                    window.__updateApiTimeout();
                }
                if (window.__updateAppStatus) {
                    window.__updateAppStatus();
                }
            }

            _configReady = true;
        } catch (error) {
            console.error('❌ Error initializing Remote Config:', error.message);
            console.log(`⚠️ Using default values - App Enabled: ${_cacheTTL > 0}, Timeout: ${_cacheTTL}ms`);
            _configReady = true;
        }
    })();

    return _configPromise;
};

/**
 * Check system feature availability (based on cache TTL)
 */
export const isAppEnabled = () => {
    return _cacheTTL > 0;
};

/**
 * Get cache TTL configuration
 */
export const getApiTimeout = () => {
    return _cacheTTL;
};

/**
 * Get performance monitoring config
 */
export const getRetryConfig = () => {
    if (!_configReady) {
        return {
            attempts: remoteConfig.defaultConfig.perf_monitor_interval,
            delay: remoteConfig.defaultConfig.log_buffer_size,
        };
    }

    try {
        const attempts = getValue(remoteConfig, 'perf_monitor_interval');
        const delay = getValue(remoteConfig, 'log_buffer_size');

        return {
            attempts: Number(attempts.asString()),
            delay: Number(delay.asString()),
        };
    } catch (error) {
        console.error('Error getting retry config:', error);
        return {
            attempts: remoteConfig.defaultConfig.perf_monitor_interval,
            delay: remoteConfig.defaultConfig.log_buffer_size,
        };
    }
};

/**
 * Refresh system configuration
 */
export const refreshRemoteConfig = async () => {
    try {
        console.log('🔄 Refreshing Remote Config...');
        const activated = await fetchAndActivate(remoteConfig);

        const cacheTTL = getValue(remoteConfig, 'sys_cache_ttl');
        const perfInterval = getValue(remoteConfig, 'perf_monitor_interval');
        const logBuffer = getValue(remoteConfig, 'log_buffer_size');

        _cacheTTL = Number(cacheTTL.asString());
        _perfInterval = Number(perfInterval.asString());
        _logBuffer = Number(logBuffer.asString());

        if (activated) {
            console.log(`✅ Remote Config refreshed. App Enabled: ${_cacheTTL > 0}, Timeout: ${_cacheTTL}ms`);
        } else {
            console.log(`⚠️ Remote Config refreshed but no changes. App Enabled: ${_cacheTTL > 0}, Timeout: ${_cacheTTL}ms`);
        }

        if (typeof window !== 'undefined') {
            if (window.__updateApiTimeout) {
                window.__updateApiTimeout();
            }
            if (window.__updateAppStatus) {
                window.__updateAppStatus();
            }
        }
    } catch (error) {
        console.error('❌ Error refreshing Remote Config:', error);
    }
};

export { remoteConfig };
export default app;
