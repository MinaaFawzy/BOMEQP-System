import { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useHeader } from '../../../context/HeaderContext';
import { accAPI, authAPI } from '../../../services/api';
import { User, Mail, Phone, MapPin, CreditCard, CheckCircle, AlertCircle, Globe, Building2, FileText, Edit, X, Save, Lock, KeyRound } from 'lucide-react';
import FormInput from '../../../components/FormInput/FormInput';
import './ProfileScreen.css';
import '../../../components/FormInput/FormInput.css';

const ProfileScreen = () => {
  const { user } = useAuth();
  const { setHeaderTitle, setHeaderSubtitle } = useHeader();
  const [formData, setFormData] = useState({
    name: '',
    legal_name: '',
    email: '',
    phone: '',
    country: '',
    address: '',
    website: '',
    stripe_account_id: '',
  });
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [verifyingAccount, setVerifyingAccount] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState(null); // { valid: true/false, message: string, account: object }
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    password: '',
    password_confirmation: '',
  });
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoadingProfile(true);
      const response = await accAPI.getProfile();
      // Handle different response structures
      const profile = response?.profile || response?.acc || response?.data || response || {};
      setProfileData(profile);
      
      setFormData({
        name: profile.name || user?.name || '',
        legal_name: profile.legal_name || '',
        email: profile.email || user?.email || '',
        phone: profile.phone || user?.phone || '',
        country: profile.country || '',
        address: profile.address || user?.address || '',
        website: profile.website || '',
        stripe_account_id: profile.stripe_account_id || profile.stripe_connect_account_id || '',
      });
    } catch (error) {
      console.error('Failed to load profile:', error);
      // Fallback to user data if API fails
      if (user) {
        setFormData({
          name: user.name || '',
          legal_name: '',
          email: user.email || '',
          phone: user.phone || '',
          country: '',
          address: user.address || '',
          website: '',
          stripe_account_id: '',
        });
      }
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => {
    setHeaderTitle('Profile');
    setHeaderSubtitle('Manage your account information');
    return () => {
      setHeaderTitle(null);
      setHeaderSubtitle(null);
    };
  }, [setHeaderTitle, setHeaderSubtitle]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
    // Clear verification status when Stripe Account ID changes
    if (name === 'stripe_account_id' && verificationStatus) {
      setVerificationStatus(null);
    }
  };

  // Validate Stripe Account ID format
  const validateStripeAccountId = (value) => {
    if (!value || value.trim() === '') {
      return null; // Empty is allowed (can be removed)
    }
    if (!value.startsWith('acct_')) {
      return 'Stripe account ID must start with "acct_"';
    }
    if (value.length < 12) {
      return 'Stripe account ID is too short';
    }
    return null;
  };

  // Verify Stripe Account before saving
  const verifyStripeAccount = async (stripeAccountId) => {
    if (!stripeAccountId || stripeAccountId.trim() === '') {
      setVerificationStatus(null);
      return { valid: true }; // Empty is allowed
    }

    try {
      setVerifyingAccount(true);
      const response = await accAPI.verifyStripeAccount(stripeAccountId.trim());
      const result = response?.data || response;
      
      if (result.valid) {
        setVerificationStatus({
          valid: true,
          message: result.message || 'Stripe account is valid and connected',
          account: result.account,
        });
        return { valid: true, account: result.account };
      } else {
        setVerificationStatus({
          valid: false,
          message: result.message || result.error || 'Stripe account verification failed',
          error: result.error,
        });
        return { valid: false, error: result.error, message: result.message };
      }
    } catch (error) {
      console.error('Stripe account verification error:', error);
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'Failed to verify Stripe account. Please check your connection and try again.';
      
      setVerificationStatus({
        valid: false,
        message: errorMessage,
        error: error.response?.data?.error || error.message,
      });
      return { valid: false, error: errorMessage };
    } finally {
      setVerifyingAccount(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    setSuccessMessage('');
    setVerificationStatus(null);

    // Validate Stripe Account ID format
    const stripeValidationError = validateStripeAccountId(formData.stripe_account_id);
    if (stripeValidationError) {
      setErrors({ stripe_account_id: stripeValidationError });
      setLoading(false);
      return;
    }

    // Verify Stripe Account if provided
    if (formData.stripe_account_id && formData.stripe_account_id.trim() !== '') {
      const verification = await verifyStripeAccount(formData.stripe_account_id);
      if (!verification.valid) {
        setErrors({ 
          stripe_account_id: verification.message || verification.error || 'Invalid Stripe account. Please verify the account ID is correct and the account is properly connected to the platform.'
        });
        setLoading(false);
        return;
      }
    }

    try {
      // Prepare data - send null if stripe_account_id is empty
      const submitData = {
        ...formData,
        stripe_account_id: formData.stripe_account_id?.trim() || null,
      };
      
      const response = await accAPI.updateProfile(submitData);
      const updatedProfile = response?.profile || response?.data || response;
      setProfileData(updatedProfile);
      
      // Clear verification status after successful save
      setVerificationStatus(null);
      
      setSuccessMessage('Profile updated successfully!');
      setIsEditing(false);
      await loadProfile(); // Reload to get latest data
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Failed to update profile:', error);
      
      // Handle specific error codes
      if (error.response?.data?.error_code === 'invalid_stripe_account') {
        setErrors({ 
          stripe_account_id: error.response.data.message || 'The Stripe account is not valid. Payment will use standard flow.'
        });
      } else if (error.response?.status === 422) {
        // Validation errors
        const errorData = error.response.data;
        if (errorData.errors) {
          setErrors(errorData.errors);
        } else if (errorData.message) {
          setErrors({ general: errorData.message });
        } else {
          setErrors({ general: 'Validation failed. Please check your input.' });
        }
      } else if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      } else if (error.response?.data?.message) {
        setErrors({ general: error.response.data.message });
      } else {
        setErrors({ general: error.message || 'Failed to update profile. Please try again.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setErrors({});
    setVerificationStatus(null);
    // Reset form data to original profile
    if (profileData) {
      setFormData({
        name: profileData.name || user?.name || '',
        legal_name: profileData.legal_name || '',
        email: profileData.email || user?.email || '',
        phone: profileData.phone || user?.phone || '',
        country: profileData.country || '',
        address: profileData.address || user?.address || '',
        website: profileData.website || '',
        stripe_account_id: profileData.stripe_account_id || profileData.stripe_connect_account_id || '',
      });
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData({
      ...passwordData,
      [name]: value,
    });
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setChangingPassword(true);
    setErrors({});
    setSuccessMessage('');

    try {
      await authAPI.changePassword(passwordData);
      setSuccessMessage('Password changed successfully!');
      setPasswordData({
        current_password: '',
        password: '',
        password_confirmation: '',
      });
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Failed to change password:', error);
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      } else if (error.response?.data?.message) {
        setErrors({ password: error.response.data.message });
      } else {
        setErrors({ password: error.message || 'Failed to change password. Please try again.' });
      }
    } finally {
      setChangingPassword(false);
    }
  };

  if (loadingProfile) {
    return (
      <div className="profile-loading-container">
        <div className="profile-loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      {/* Success Message */}
      {successMessage && (
        <div className="profile-success-message">
          <CheckCircle size={20} />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Error Message */}
      {errors.general && (
        <div className="profile-error-message">
          <AlertCircle size={20} />
          <span>{errors.general}</span>
        </div>
      )}

      <div className="profile-content">
        {/* Profile Header */}
        <div className="profile-header">
          <div className="profile-avatar-section">
            <div className="profile-avatar-container">
              <div className="profile-avatar-placeholder">
                <Building2 size={48} />
              </div>
            </div>
          </div>
          <div className="profile-header-info">
            <h1 className="profile-name">{formData.name || 'ACC Admin'}</h1>
            <p className="profile-email">{formData.email || 'No email provided'}</p>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="profile-edit-btn"
              >
                <Edit size={18} />
                Edit Profile
              </button>
            )}
          </div>
        </div>

        {/* Profile Form */}
        <form onSubmit={handleSubmit} className="profile-form">
          <div className="profile-form-section">
            <div className="flex items-center gap-3 mb-4" style={{ marginTop: 0 }}>
              <div className="p-2 bg-blue-50 rounded-lg">
                <User className="text-blue-600" size={24} />
              </div>
              <div>
                <h2 className="profile-section-title" style={{ margin: 0 }}>Basic Information</h2>
                <p className="text-sm text-gray-500 mt-1">Your personal and contact details</p>
              </div>
            </div>
            <div className="profile-form-grid">
              <FormInput
                label="Name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                required
                disabled={!isEditing}
                error={errors.name}
              />
              <FormInput
                label="Legal Name"
                name="legal_name"
                type="text"
                value={formData.legal_name}
                onChange={handleChange}
                disabled={!isEditing}
                error={errors.legal_name}
                helpText="Official legal name of your organization"
              />
              <FormInput
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={!isEditing}
                error={errors.email}
              />
              <FormInput
                label="Phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                disabled={!isEditing}
                error={errors.phone}
              />
              <FormInput
                label="Website"
                name="website"
                type="url"
                value={formData.website}
                onChange={handleChange}
                placeholder="https://example.com"
                disabled={!isEditing}
                error={errors.website}
              />
            </div>
          </div>

          <div className="profile-form-section">
            <div className="flex items-center gap-3 mb-4" style={{ marginTop: 0 }}>
              <div className="p-2 bg-green-50 rounded-lg">
                <MapPin className="text-green-600" size={24} />
              </div>
              <div>
                <h2 className="profile-section-title" style={{ margin: 0 }}>Address Information</h2>
                <p className="text-sm text-gray-500 mt-1">Your location and address details</p>
              </div>
            </div>
            <div className="profile-form-grid">
              <FormInput
                label="Address"
                name="address"
                type="text"
                value={formData.address}
                onChange={handleChange}
                disabled={!isEditing}
                error={errors.address}
              />
              <FormInput
                label="Country"
                name="country"
                type="text"
                value={formData.country}
                onChange={handleChange}
                disabled={!isEditing}
                error={errors.country}
              />
            </div>
          </div>

          {/* Stripe Connect Settings Section */}
          <div className="profile-form-section">
            <div className="flex items-center gap-3 mb-4" style={{ marginTop: 0 }}>
              <div className="p-2 bg-indigo-50 rounded-lg">
                <CreditCard className="text-indigo-600" size={24} />
              </div>
              <div>
                <h2 className="profile-section-title" style={{ margin: 0 }}>Stripe Payment Settings</h2>
                <p className="text-sm text-gray-500 mt-1">Configure your payment gateway integration</p>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 mb-4 border border-blue-200">
              <p className="text-sm text-gray-700 mb-2">
                <strong>Enable Destination Charges:</strong> Enter your Stripe Connect Account ID to automatically receive payments directly to your Stripe account.
              </p>
              <p className="text-xs text-gray-600">
                When configured, payments will be automatically split between your account and the platform commission. You'll receive payments directly in your Stripe account.
              </p>
            </div>

            {/* Status Indicator */}
            <div className="mb-4 p-3 rounded-lg border">
              {profileData?.stripe_account_configured || formData.stripe_account_id ? (
                <div className="bg-green-50 border-green-200 border">
                  <p className="text-sm text-green-800 flex items-center gap-2">
                    <CheckCircle size={16} className="text-green-600" />
                    <strong>Status: Configured</strong>
                  </p>
                  {profileData?.stripe_account_configured && (
                    <p className="text-xs text-green-700 mt-1 ml-6">
                      ℹ️ Payments will be automatically split between your account and the platform.
                    </p>
                  )}
                </div>
              ) : (
                <div className="bg-yellow-50 border-yellow-200 border">
                  <p className="text-sm text-yellow-800 flex items-center gap-2">
                    <AlertCircle size={16} className="text-yellow-600" />
                    <strong>Status: Not Configured</strong>
                  </p>
                  <p className="text-xs text-yellow-700 mt-1 ml-6">
                    Configure your Stripe account to enable automatic payment splitting.
                  </p>
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <FormInput
                label="Stripe Connect Account ID"
                name="stripe_account_id"
                type="text"
                value={formData.stripe_account_id}
                onChange={handleChange}
                placeholder="acct_xxxxxxxxxxxxx"
                error={errors.stripe_account_id}
                helpText="Your Stripe Connect account ID (starts with 'acct_'). You can find this in your Stripe Dashboard under Settings → Connect → Accounts."
                disabled={!isEditing || verifyingAccount}
              />
              
              {/* Verify Account Button */}
              {isEditing && formData.stripe_account_id && 
               formData.stripe_account_id.trim() !== '' && 
               !validateStripeAccountId(formData.stripe_account_id) && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={async () => {
                      await verifyStripeAccount(formData.stripe_account_id);
                    }}
                    disabled={verifyingAccount}
                    className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {verifyingAccount ? 'Verifying...' : 'Verify Account'}
                  </button>
                </div>
              )}
            </div>

            {/* Real-time validation feedback */}
            {isEditing && formData.stripe_account_id && formData.stripe_account_id.trim() !== '' && (
              <div className="mt-2">
                {validateStripeAccountId(formData.stripe_account_id) ? (
                  <div className="p-2 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-xs text-red-600 flex items-center gap-2">
                      <AlertCircle size={14} />
                      {validateStripeAccountId(formData.stripe_account_id)}
                    </p>
                  </div>
                ) : (
                  <div className="p-2 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-xs text-green-600 flex items-center gap-2">
                      <CheckCircle size={14} />
                      Valid Stripe account ID format
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Verification Status */}
            {isEditing && verifyingAccount && (
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-800 flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  Verifying Stripe account...
                </p>
              </div>
            )}

            {isEditing && verificationStatus && !verifyingAccount && (
              <div className={`mt-2 p-3 rounded-lg border ${
                verificationStatus.valid 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-red-50 border-red-200'
              }`}>
                <p className={`text-xs flex items-center gap-2 ${
                  verificationStatus.valid ? 'text-green-800' : 'text-red-800'
                }`}>
                  {verificationStatus.valid ? (
                    <CheckCircle size={14} className="text-green-600" />
                  ) : (
                    <AlertCircle size={14} className="text-red-600" />
                  )}
                  <strong>{verificationStatus.valid ? 'Verified:' : 'Verification Failed:'}</strong>
                  {verificationStatus.message}
                </p>
                {verificationStatus.valid && verificationStatus.account && (
                  <div className="mt-2 ml-6 text-xs text-green-700">
                    <p>Account Type: {verificationStatus.account.type || 'N/A'}</p>
                    <p>Charges Enabled: {verificationStatus.account.charges_enabled ? 'Yes' : 'No'}</p>
                    <p>Payouts Enabled: {verificationStatus.account.payouts_enabled ? 'Yes' : 'No'}</p>
                    <p>Details Submitted: {verificationStatus.account.details_submitted ? 'Yes' : 'No'}</p>
                  </div>
                )}
              </div>
            )}
            
            {isEditing && formData.stripe_account_id && !validateStripeAccountId(formData.stripe_account_id) && !verificationStatus && (
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-800 flex items-center gap-2">
                  <FileText size={14} />
                  <strong>Current Account ID:</strong> {formData.stripe_account_id}
                </p>
                <p className="text-xs text-blue-700 mt-1 ml-6">
                  This account will be verified when you save the profile.
                </p>
              </div>
            )}
          </div>

          {/* Change Password Section */}
          <div className="profile-form-section">
            <div className="flex items-center gap-3 mb-4" style={{ marginTop: 0 }}>
              <div className="p-2 bg-red-50 rounded-lg">
                <KeyRound className="text-red-600" size={24} />
              </div>
              <div>
                <h2 className="profile-section-title" style={{ margin: 0 }}>Change Password</h2>
                <p className="text-sm text-gray-500 mt-1">Update your account password</p>
              </div>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <FormInput
                label="Current Password"
                type="password"
                name="current_password"
                value={passwordData.current_password}
                onChange={handlePasswordChange}
                required
                error={errors.current_password}
              />

              <div className="profile-form-grid">
                <FormInput
                  label="New Password"
                  type="password"
                  name="password"
                  value={passwordData.password}
                  onChange={handlePasswordChange}
                  required
                  error={errors.password}
                />

                <FormInput
                  label="Confirm New Password"
                  type="password"
                  name="password_confirmation"
                  value={passwordData.password_confirmation}
                  onChange={handlePasswordChange}
                  required
                  error={errors.password_confirmation}
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="profile-change-password-btn"
                  disabled={changingPassword}
                >
                  <Lock size={18} />
                  {changingPassword ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </form>
          </div>

          {/* Form Actions */}
          {isEditing && (
            <div className="profile-form-actions">
              <button
                type="button"
                onClick={handleCancel}
                className="profile-cancel-btn"
                disabled={loading}
              >
                <X size={18} />
                Cancel
              </button>
              <button
                type="submit"
                className="profile-save-btn"
                disabled={loading}
              >
                <Save size={18} />
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default ProfileScreen;
