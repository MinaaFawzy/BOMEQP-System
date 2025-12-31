import { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useHeader } from '../../../context/HeaderContext';
import { accAPI } from '../../../services/api';
import { User, Mail, Phone, MapPin, CreditCard, CheckCircle, AlertCircle, Globe, Building2, FileText } from 'lucide-react';
import FormInput from '../../../components/FormInput/FormInput';
import Button from '../../../components/Button/Button';
import './ProfileScreen.css';

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
  const [errors, setErrors] = useState({});
  const [verifyingAccount, setVerifyingAccount] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState(null); // { valid: true/false, message: string, account: object }

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
      
      alert('Profile updated successfully!');
      await loadProfile(); // Reload to get latest data
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

  if (loadingProfile) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.general && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{errors.general}</p>
            </div>
          )}

          <FormInput
            label="Name"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleChange}
            required
            icon={<User size={18} />}
            error={errors.name}
          />

          <FormInput
            label="Legal Name"
            name="legal_name"
            type="text"
            value={formData.legal_name}
            onChange={handleChange}
            icon={<Building2 size={18} />}
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
            icon={<Mail size={18} />}
            error={errors.email}
          />

          <FormInput
            label="Phone"
            name="phone"
            type="tel"
            value={formData.phone}
            onChange={handleChange}
            icon={<Phone size={18} />}
            error={errors.phone}
          />

          <FormInput
            label="Country"
            name="country"
            type="text"
            value={formData.country}
            onChange={handleChange}
            icon={<MapPin size={18} />}
            error={errors.country}
          />

          <FormInput
            label="Address"
            name="address"
            type="text"
            value={formData.address}
            onChange={handleChange}
            icon={<MapPin size={18} />}
            error={errors.address}
          />

          <FormInput
            label="Website"
            name="website"
            type="url"
            value={formData.website}
            onChange={handleChange}
            placeholder="https://example.com"
            icon={<Globe size={18} />}
            error={errors.website}
          />

          {/* Stripe Connect Settings Section */}
          <div className="border-t pt-6 mt-6">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 mb-4 border border-blue-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <CreditCard size={20} className="text-blue-600" />
                Stripe Payment Settings
              </h3>
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
                icon={<CreditCard size={18} />}
                error={errors.stripe_account_id}
                helpText="Your Stripe Connect account ID (starts with 'acct_'). You can find this in your Stripe Dashboard under Settings → Connect → Accounts."
                disabled={verifyingAccount}
              />
              
              {/* Verify Account Button */}
              {formData.stripe_account_id && 
               formData.stripe_account_id.trim() !== '' && 
               !validateStripeAccountId(formData.stripe_account_id) && (
                <div className="flex justify-end">
                  <Button
                    type="button"
                    onClick={async () => {
                      await verifyStripeAccount(formData.stripe_account_id);
                    }}
                    disabled={verifyingAccount}
                    loading={verifyingAccount}
                    variant="outline"
                    className="text-sm"
                  >
                    {verifyingAccount ? 'Verifying...' : 'Verify Account'}
                  </Button>
                </div>
              )}
            </div>

            {/* Real-time validation feedback */}
            {formData.stripe_account_id && formData.stripe_account_id.trim() !== '' && (
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
            {verifyingAccount && (
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-800 flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  Verifying Stripe account...
                </p>
              </div>
            )}

            {verificationStatus && !verifyingAccount && (
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
            
            {formData.stripe_account_id && !validateStripeAccountId(formData.stripe_account_id) && !verificationStatus && (
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

          <div className="flex justify-end pt-4">
            <Button
              type="submit"
              disabled={loading}
              loading={loading}
            >
              Update Profile
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileScreen;
