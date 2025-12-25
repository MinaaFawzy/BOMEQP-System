import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Typography,
  IconButton,
  CircularProgress,
  Alert,
  Link as MuiLink
} from '@mui/material';
import {
  Lock as LockIcon,
  Visibility,
  VisibilityOff,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { useAuth } from '../../../context/AuthContext';
import CustomInput from '../../../components/CustomInput/CustomInput';
import logo from '../../../assets/logo-circle.png';
import './ResetPasswordScreen.css';

const ResetPasswordScreen = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { resetPassword, isAuthenticated } = useAuth();

  const token = searchParams.get('token');
  const email = searchParams.get('email') ? decodeURIComponent(searchParams.get('email')) : null;

  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isValidLink, setIsValidLink] = useState(true);

  useEffect(() => {
    // Check if token and email are present
    if (!token || !email) {
      setIsValidLink(false);
    }

    // Redirect if already authenticated
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [token, email, isAuthenticated, navigate]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    // Validate password length
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);

    try {
      const result = await resetPassword(
        token,
        email,
        formData.password,
        formData.confirmPassword
      );

      if (result.success) {
        setSuccess(true);
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 3000);
      } else {
        setError(result.error || 'Failed to reset password. Please try again.');
      }
    } catch (err) {
      console.error('Reset password error:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isValidLink) {
    return (
      <div className="reset-password-page">
        <div className="reset-password-container">
          <div className="reset-password-form">
            <img src={logo} alt="Logo" className="reset-password-logo" />
            <Typography variant="h4" fontWeight="bold" sx={{ mb: 2, color: 'var(--primary-color)' }}>
              Invalid Reset Link
            </Typography>
            <Alert severity="error" sx={{ mb: 2 }}>
              The password reset link is invalid or has expired. Please request a new one.
            </Alert>
            <MuiLink
              href="/login"
              underline="hover"
              sx={{ cursor: 'pointer', color: 'var(--primary-color)' }}
            >
              Go to Login
            </MuiLink>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="reset-password-page">
        <div className="reset-password-container">
          <div className="reset-password-form">
            <div className="success-icon-wrapper">
              <CheckCircleIcon className="success-icon" />
            </div>
            <Typography variant="h4" fontWeight="bold" sx={{ mb: 2, color: 'var(--primary-color)' }}>
              Password Reset Successful!
            </Typography>
            <Alert severity="success" sx={{ mb: 2 }}>
              Your password has been successfully reset. Redirecting to login page...
            </Alert>
            <MuiLink
              href="/login"
              underline="hover"
              sx={{ cursor: 'pointer', color: 'var(--primary-color)' }}
            >
              Go to Login Now
            </MuiLink>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="reset-password-page">
      <div className="reset-password-container">
        <div className="reset-password-form">
          <img src={logo} alt="Logo" className="reset-password-logo" />
          <Typography variant="h4" fontWeight="bold" sx={{ mb: 2, color: 'var(--primary-color)' }}>
            Reset Password
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
            Enter your new password below. Please make sure it's at least 8 characters long.
          </Typography>

          <form onSubmit={handleSubmit}>
            <CustomInput
              placeholder="New Password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={handleChange}
              required
              startIcon={<LockIcon />}
              endIcon={
                <IconButton
                  onClick={() => setShowPassword(!showPassword)}
                  edge="end"
                  size="small"
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              }
            />

            <CustomInput
              placeholder="Confirm New Password"
              name="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              startIcon={<LockIcon />}
              endIcon={
                <IconButton
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  edge="end"
                  size="small"
                >
                  {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              }
            />

            {error && (
              <Alert severity="error" sx={{ mt: 1, mb: 2 }}>
                {error}
              </Alert>
            )}

            <button type="submit" disabled={loading} className="reset-password-submit-button">
              {loading ? <CircularProgress size={20} color="inherit" /> : 'Reset Password'}
            </button>
          </form>

          <MuiLink
            href="/login"
            underline="hover"
            sx={{ mt: 2, cursor: 'pointer', color: 'var(--primary-color)' }}
          >
            Back to Login
          </MuiLink>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordScreen;
