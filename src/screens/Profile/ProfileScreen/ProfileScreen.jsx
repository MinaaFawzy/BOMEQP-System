import { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useHeader } from '../../../context/HeaderContext';
import { authAPI } from '../../../services/api';
import FormInput from '../../../components/FormInput/FormInput';
import Button from '../../../components/Button/Button';
import { User, Mail, Lock, Save, Shield, CheckCircle, Clock, Calendar, KeyRound } from 'lucide-react';
import './ProfileScreen.css';

const ProfileScreen = () => {
  const { user, updateUser } = useAuth();
  const { setHeaderTitle, setHeaderSubtitle } = useHeader();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    password: '',
    password_confirmation: '',
  });
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    setHeaderTitle('Profile');
    setHeaderSubtitle('Manage your account settings and preferences');
    return () => {
      setHeaderTitle(null);
      setHeaderSubtitle(null);
    };
  }, [setHeaderTitle, setHeaderSubtitle]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const response = await authAPI.getProfile();
      setFormData({
        name: response.user.name || '',
        email: response.user.email || '',
      });
      updateUser(response.user);
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setErrors({});
    setSuccess('');
  };

  const handlePasswordChange = (e) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value,
    });
    setErrors({});
    setSuccess('');
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    setSuccess('');

    try {
      const response = await authAPI.updateProfile(formData);
      updateUser(response.user);
      setSuccess('Profile updated successfully!');
    } catch (error) {
      if (error.errors) {
        setErrors(error.errors);
      } else {
        setErrors({ general: error.message || 'Failed to update profile' });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    setSuccess('');

    try {
      await authAPI.changePassword(passwordData);
      setSuccess('Password changed successfully!');
      setPasswordData({
        current_password: '',
        password: '',
        password_confirmation: '',
      });
    } catch (error) {
      if (error.errors) {
        setErrors(error.errors);
      } else {
        setErrors({ password: error.message || 'Failed to change password' });
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto">

      {success && (
        <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-xl shadow-lg p-4 flex items-center gap-3 animate-fade-in">
          <CheckCircle className="text-green-600 flex-shrink-0" size={24} />
          <p className="text-green-800 font-medium">{success}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Profile Information */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center mb-6 pb-4 border-b border-gray-200">
              <div className="w-12 h-12 bg-gradient-to-br from-primary-100 to-primary-200 rounded-xl flex items-center justify-center mr-4">
                <User className="text-primary-600" size={24} />
              </div>
              <div>
              <h2 className="text-xl font-semibold text-gray-900">Profile Information</h2>
                <p className="text-sm text-gray-500">Update your personal details</p>
              </div>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <FormInput
                label="Full Name"
                name="name"
                value={formData.name}
                onChange={handleProfileChange}
                required
                error={errors.name}
              />

              <FormInput
                label="Email Address"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleProfileChange}
                required
                error={errors.email}
              />
              </div>

              {errors.general && (
                <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
                  <p className="text-sm text-red-700 font-medium">{errors.general}</p>
                </div>
              )}

              <div className="pt-2">
                <Button
                type="submit"
                  variant="primary"
                  fullWidth
                disabled={saving}
                  loading={saving}
                  icon={<Save size={20} />}
              >
                    Save Changes
                </Button>
              </div>
            </form>
        </div>

          {/* Change Password */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center mb-6 pb-4 border-b border-gray-200">
              <div className="w-12 h-12 bg-gradient-to-br from-red-100 to-red-200 rounded-xl flex items-center justify-center mr-4">
                <KeyRound className="text-red-600" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Change Password</h2>
                <p className="text-sm text-gray-500">Update your account password</p>
        </div>
      </div>

            <form onSubmit={handleChangePassword} className="space-y-5">
          <FormInput
            label="Current Password"
            type="password"
            name="current_password"
            value={passwordData.current_password}
            onChange={handlePasswordChange}
            required
            error={errors.current_password}
          />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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

              <div className="pt-2">
                <Button
            type="submit"
                  variant="danger"
            disabled={saving}
                  loading={saving}
                  icon={<Lock size={20} />}
                  fullWidth
                >
                  Change Password
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Account Info Sidebar */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center mb-6 pb-4 border-b border-gray-200">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center mr-4">
                <Shield className="text-blue-600" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Account Details</h3>
                <p className="text-sm text-gray-500">Your account information</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-br from-primary-50 to-primary-100 rounded-lg border border-primary-200">
                <div className="flex items-center gap-2 mb-2">
                  <User className="text-primary-600" size={16} />
                  <p className="text-xs font-medium text-primary-700 uppercase tracking-wide">Role</p>
                </div>
                <p className="text-base font-semibold text-gray-900 capitalize">
                  {user?.role?.replace('_', ' ') || 'N/A'}
                </p>
              </div>
              
              <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <Mail className="text-blue-600" size={16} />
                  <p className="text-xs font-medium text-blue-700 uppercase tracking-wide">Email</p>
                </div>
                <p className="text-sm font-medium text-gray-900 break-words">
                  {user?.email || 'N/A'}
                </p>
              </div>

              <div className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  {user?.status === 'active' ? (
                    <CheckCircle className="text-green-600" size={16} />
                  ) : (
                    <Clock className="text-yellow-600" size={16} />
                  )}
                  <p className="text-xs font-medium text-gray-700 uppercase tracking-wide">Status</p>
                </div>
                <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold shadow-sm ${
                  user?.status === 'active' 
                    ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300' 
                    : 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 border border-yellow-300'
                }`}>
                  {user?.status === 'active' ? <CheckCircle size={14} /> : <Clock size={14} />}
                  {user?.status || 'N/A'}
                </span>
              </div>

              {user?.created_at && (
                <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="text-purple-600" size={16} />
                    <p className="text-xs font-medium text-purple-700 uppercase tracking-wide">Member Since</p>
                  </div>
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(user.created_at).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Security Tips */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-lg p-6 border border-blue-200">
            <div className="flex items-center mb-4">
              <Shield className="text-blue-600 mr-3" size={20} />
              <h4 className="text-sm font-semibold text-gray-900">Security Tips</h4>
            </div>
            <ul className="space-y-2 text-xs text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>Use a strong, unique password</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>Change your password regularly</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>Never share your credentials</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileScreen;
