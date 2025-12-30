import { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { authAPI } from '../services/api';
import { setAuthToken, getAuthToken } from '../config/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const isCheckingAuthRef = useRef(false);
  const hasCheckedAuthRef = useRef(false);

  useEffect(() => {
    // Check if user is logged in on mount - only once
    if (!hasCheckedAuthRef.current) {
      hasCheckedAuthRef.current = true;
      checkAuth();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAuth = async () => {
    // Prevent duplicate concurrent auth checks
    if (isCheckingAuthRef.current) {
      console.log('🔄 Auth check already in progress, skipping duplicate request');
      return;
    }

    isCheckingAuthRef.current = true;
    try {
      setLoading(true);
      const token = getAuthToken();
      if (token) {
        try {
          // Verify token by fetching profile
          const response = await authAPI.getProfile();
          if (response.user) {
            // Allow pending ACC admins to stay logged in during current session
            // Their token is in sessionStorage, so it will be cleared when browser closes
            // This allows them to see pending-account page, but they must log in again when they return
            setUser(response.user);
            setIsAuthenticated(true);
          } else {
            // Token invalid, clear it
            setAuthToken(null);
            sessionStorage.removeItem('auth_token');
            sessionStorage.removeItem('token');
            setUser(null);
            setIsAuthenticated(false);
          }
        } catch (profileError) {
          // If profile fetch fails with 401, token is invalid
          if (profileError.response?.status === 401) {
            setAuthToken(null);
            sessionStorage.removeItem('auth_token');
            sessionStorage.removeItem('token');
            setUser(null);
            setIsAuthenticated(false);
          } else {
            // Other errors (network, etc.) - don't clear session, just set as not authenticated
            console.error('Profile fetch error:', profileError);
            setUser(null);
            setIsAuthenticated(false);
          }
        }
      } else {
        // No token, user is not authenticated
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      // Catch any unexpected errors
      console.error('Auth check failed:', error);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
      isCheckingAuthRef.current = false;
    }
  };

  const login = async (email, password) => {
    try {
      const response = await authAPI.login({ email, password });
      
      if (response.token) {
        // For pending ACC admins, use sessionStorage instead of localStorage
        // This way the session is cleared when browser closes
        const isPendingACC = response.user?.role === 'acc_admin' && 
                            (response.user?.status === 'pending' || response.user?.status === 'inactive');
        
        if (isPendingACC) {
          // Store token in sessionStorage (cleared when browser closes)
          sessionStorage.setItem('auth_token', response.token);
          sessionStorage.setItem('token', response.token);
        } else {
          // Store token in localStorage for active users
          setAuthToken(response.token);
        }
        
        setUser(response.user);
        setIsAuthenticated(true);
        
        return { 
          success: true, 
          data: response,
          isActive: response.user?.status === 'active',
          userStatus: response.user?.status 
        };
      }
      
      return { success: false, error: 'Login failed. Please try again.' };
    } catch (error) {
      console.error('Login error:', error);
      
      // Extract error message from response
      let errorMessage = 'Login failed. Please try again.';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.errors) {
        // Handle validation errors
        const errors = error.response.data.errors;
        const firstError = Object.values(errors)[0];
        errorMessage = Array.isArray(firstError) ? firstError[0] : firstError;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      return { success: false, error: errorMessage };
    }
  };

  const register = async (fullName, email, password, confirmPassword, role) => {
    try {
      const response = await authAPI.register({
        name: fullName,
        email,
        password,
        password_confirmation: confirmPassword,
        role
      });
      
      if (response.token) {
        setAuthToken(response.token);
        setUser(response.user);
        setIsAuthenticated(true);
        
        return { 
          success: true, 
          data: response,
          isActive: response.user?.status === 'active',
          userStatus: response.user?.status
        };
      }
      
      return { success: false, error: 'Registration failed. Please try again.' };
    } catch (error) {
      console.error('Register error:', error);
      
      // Extract error message from response
      let errorMessage = 'Registration failed. Please try again.';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.errors) {
        // Handle validation errors
        const errors = error.response.data.errors;
        const firstError = Object.values(errors)[0];
        errorMessage = Array.isArray(firstError) ? firstError[0] : firstError;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      return { success: false, error: errorMessage };
    }
  };

  const logout = async () => {
    try {
      // If user is pending ACC admin, clear sessionStorage and localStorage
      if (user?.role === 'acc_admin' && 
          (user?.status === 'pending' || user?.status === 'inactive')) {
        // Clear sessionStorage (where pending ACC token is stored)
        sessionStorage.clear();
        // Clear localStorage token if exists
        localStorage.removeItem('auth_token');
        localStorage.removeItem('token');
        setAuthToken(null);
        setUser(null);
        setIsAuthenticated(false);
        return;
      }
      
      // For other users, call logout API
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always clear token and user data on logout
      setAuthToken(null);
      setUser(null);
      setIsAuthenticated(false);
      // Clear any other stored data
      localStorage.removeItem('sidebarOpen');
      localStorage.removeItem('sidebarCollapsed');
    }
  };

  const updateUser = (userData) => {
    setUser(userData);
  };

  const forgotPassword = async (email) => {
    try {
      const response = await authAPI.forgotPassword({ email });
      return { success: true, data: response };
    } catch (error) {
      let errorMessage = 'Failed to send reset email. Please try again.';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      return { success: false, error: errorMessage };
    }
  };

  const resetPassword = async (token, email, password, passwordConfirmation) => {
    try {
      const response = await authAPI.resetPassword({
        token,
        email,
        password,
        password_confirmation: passwordConfirmation
      });
      return { success: true, data: response };
    } catch (error) {
      let errorMessage = 'Failed to reset password. Please try again.';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.errors) {
        // Handle validation errors
        const errors = error.response.data.errors;
        const firstError = Object.values(errors)[0];
        errorMessage = Array.isArray(firstError) ? firstError[0] : firstError;
      }
      
      return { success: false, error: errorMessage };
    }
  };

  const refreshUser = async () => {
    try {
      const response = await authAPI.getProfile();
      if (response.user) {
        setUser(response.user);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  const value = useMemo(() => ({
    user,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
    updateUser,
    checkAuth,
    forgotPassword,
    resetPassword,
    refreshUser,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [user, loading, isAuthenticated]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
