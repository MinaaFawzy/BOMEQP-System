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
import PasswordHints from '../../../components/PasswordHints/PasswordHints';
import { validatePassword, validatePasswordConfirmation } from '../../../utils/validation';
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
  const [errors, setErrors] = useState({});

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
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    setError('');
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setErrors({});

    // Validate form
    const validationErrors = {};
    const passwordError = validatePassword(formData.password, 8, true); // isNewPassword = true
    const confirmPasswordError = validatePasswordConfirmation(formData.password, formData.confirmPassword);
    
    if (passwordError) validationErrors.password = passwordError;
    if (confirmPasswordError) validationErrors.confirmPassword = confirmPasswordError;

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
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
              placeholder="Enter your new password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={handleChange}
              required
              error={!!errors.password}
              helperText={errors.password}
              showPasswordHints={true}
              passwordHintsComponent={<PasswordHints password={formData.password} />}
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
              placeholder="Confirm your new password"
              name="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              error={!!errors.confirmPassword}
              helperText={errors.confirmPassword}
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
