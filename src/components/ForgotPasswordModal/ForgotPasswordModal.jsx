import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  CircularProgress,
  Alert
} from '@mui/material';
import { Email as EmailIcon } from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import CustomInput from '../CustomInput/CustomInput';
import './ForgotPasswordModal.css';

const ForgotPasswordModal = ({ open, onClose }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const { forgotPassword } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await forgotPassword(email);
      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.error || 'Failed to send reset email. Please try again.');
      }
    } catch (err) {
      setError('Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setSuccess(false);
    setError('');
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '16px',
          padding: '8px'
        }
      }}
    >
      <DialogTitle sx={{ fontWeight: 600, textAlign: 'center' }}>
        Reset Password
      </DialogTitle>
      <DialogContent>
        {success ? (
          <Alert severity="success" sx={{ mt: 1 }}>
            Password reset link has been sent to your email address.
          </Alert>
        ) : (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
              Enter your email address and we'll send you a link to reset your password.
            </Typography>
            <form onSubmit={handleSubmit}>
              <CustomInput
                placeholder="Email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                startIcon={<EmailIcon />}
              />
              {error && (
                <Alert severity="error" sx={{ mt: 1, mb: 2 }}>
                  {error}
                </Alert>
              )}
            </form>
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ padding: '16px 24px', gap: 1 }}>
        <Button onClick={handleClose} color="inherit">
          {success ? 'Close' : 'Cancel'}
        </Button>
        {!success && (
          <Button 
            onClick={handleSubmit}
            variant="contained"
            disabled={loading || !email}
            sx={{
              backgroundColor: 'var(--primary-color, #1a2c49)',
              '&:hover': {
                backgroundColor: 'var(--secondary-color, #2c4a5f)'
              }
            }}
          >
            {loading ? <CircularProgress size={20} color="inherit" /> : 'Send Reset Link'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ForgotPasswordModal;
