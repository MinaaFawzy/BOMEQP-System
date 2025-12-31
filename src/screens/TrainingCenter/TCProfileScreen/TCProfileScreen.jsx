import { useEffect, useState } from 'react';
import { trainingCenterAPI } from '../../../services/api';
import { useHeader } from '../../../context/HeaderContext';
import { User, Building2, Mail, Phone, MapPin, Globe, Save, Edit, X, Upload, CheckCircle, AlertCircle } from 'lucide-react';
import Modal from '../../../components/Modal/Modal';
import FormInput from '../../../components/FormInput/FormInput';
import './TCProfileScreen.css';
import '../../../components/FormInput/FormInput.css';

const TCProfileScreen = () => {
  const { setHeaderTitle, setHeaderSubtitle } = useHeader();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    country: '',
    postal_code: '',
    website: '',
    description: '',
    logo: null,
    logo_url: '',
  });

  useEffect(() => {
    setHeaderTitle('Profile');
    setHeaderSubtitle('Manage your training center profile information');
    return () => {
      setHeaderTitle(null);
      setHeaderSubtitle(null);
    };
  }, [setHeaderTitle, setHeaderSubtitle]);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await trainingCenterAPI.getProfile();
      const data = response?.training_center || response?.data || response;
      
      if (data) {
        setProfile(data);
        setFormData({
          name: data.name || data.training_center_name || '',
          email: data.email || '',
          phone: data.phone || data.phone_number || '',
          address: data.address || '',
          city: data.city || '',
          state: data.state || data.province || '',
          country: data.country || '',
          postal_code: data.postal_code || data.zip_code || '',
          website: data.website || data.website_url || '',
          description: data.description || data.bio || '',
          logo: null,
          logo_url: data.logo || data.logo_url || data.avatar || '',
        });
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
      setErrors({ general: 'Failed to load profile. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    
    if (name === 'logo' && files && files[0]) {
      const file = files[0];
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setErrors({ ...errors, logo: 'Please select an image file' });
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrors({ ...errors, logo: 'Image size must be less than 5MB' });
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({
          ...formData,
          logo: file,
          logo_url: reader.result,
        });
      };
      reader.readAsDataURL(file);
      setErrors({ ...errors, logo: null });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
      if (errors[name]) {
        setErrors({ ...errors, [name]: null });
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    setSuccessMessage('');

    try {
      const submitData = new FormData();
      
      // Add all form fields
      Object.keys(formData).forEach(key => {
        if (key !== 'logo_url' && formData[key] !== null && formData[key] !== '') {
          if (key === 'logo' && formData.logo instanceof File) {
            submitData.append('logo', formData.logo);
          } else if (key !== 'logo') {
            submitData.append(key, formData[key]);
          }
        }
      });

      // Update profile
      const response = await trainingCenterAPI.updateProfile(submitData);

      setSuccessMessage('Profile updated successfully!');
      setIsEditing(false);
      await loadProfile();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Failed to update profile:', error);
      if (error.response?.data) {
        const errorData = error.response.data;
        if (errorData.errors) {
          const formattedErrors = {};
          Object.keys(errorData.errors).forEach(key => {
            formattedErrors[key] = Array.isArray(errorData.errors[key]) 
              ? errorData.errors[key][0] 
              : errorData.errors[key];
          });
          setErrors(formattedErrors);
        } else if (errorData.message) {
          setErrors({ general: errorData.message });
        } else {
          setErrors({ general: 'Failed to update profile. Please try again.' });
        }
      } else if (error.message) {
        setErrors({ general: error.message });
      } else {
        setErrors({ general: 'Failed to update profile. Please try again.' });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setErrors({});
    // Reset form data to original profile
    if (profile) {
      setFormData({
        name: profile.name || profile.training_center_name || '',
        email: profile.email || '',
        phone: profile.phone || profile.phone_number || '',
        address: profile.address || '',
        city: profile.city || '',
        state: profile.state || profile.province || '',
        country: profile.country || '',
        postal_code: profile.postal_code || profile.zip_code || '',
        website: profile.website || profile.website_url || '',
        description: profile.description || profile.bio || '',
        logo: null,
        logo_url: profile.logo || profile.logo_url || profile.avatar || '',
      });
    }
  };

  if (loading) {
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
              {formData.logo_url ? (
                <img 
                  src={formData.logo_url} 
                  alt="Profile" 
                  className="profile-avatar"
                />
              ) : (
                <div className="profile-avatar-placeholder">
                  <Building2 size={48} />
                </div>
              )}
              {isEditing && (
                <label className="profile-avatar-upload">
                  <Upload size={20} />
                  <input
                    type="file"
                    name="logo"
                    accept="image/*"
                    onChange={handleChange}
                    className="profile-avatar-input"
                  />
                </label>
              )}
            </div>
            {errors.logo && (
              <p className="profile-error-text">{errors.logo}</p>
            )}
          </div>
          <div className="profile-header-info">
            <h1 className="profile-name">{formData.name || 'Training Center'}</h1>
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
            <h2 className="profile-section-title">Basic Information</h2>
            <div className="profile-form-grid">
              <FormInput
                label="Training Center Name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                required
                disabled={!isEditing}
                error={errors.name}
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
                disabled={!isEditing}
                error={errors.website}
                placeholder="https://example.com"
              />
            </div>
          </div>

          <div className="profile-form-section">
            <h2 className="profile-section-title">Address Information</h2>
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
                label="City"
                name="city"
                type="text"
                value={formData.city}
                onChange={handleChange}
                disabled={!isEditing}
                error={errors.city}
              />
              <FormInput
                label="State/Province"
                name="state"
                type="text"
                value={formData.state}
                onChange={handleChange}
                disabled={!isEditing}
                error={errors.state}
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
              <FormInput
                label="Postal Code"
                name="postal_code"
                type="text"
                value={formData.postal_code}
                onChange={handleChange}
                disabled={!isEditing}
                error={errors.postal_code}
              />
            </div>
          </div>

          <div className="profile-form-section">
            <h2 className="profile-section-title">Additional Information</h2>
            <FormInput
              label="Description"
              name="description"
              textarea={true}
              rows={6}
              value={formData.description}
              onChange={handleChange}
              disabled={!isEditing}
              error={errors.description}
              placeholder="Tell us about your training center..."
            />
          </div>

          {/* Form Actions */}
          {isEditing && (
            <div className="profile-form-actions">
              <button
                type="button"
                onClick={handleCancel}
                className="profile-cancel-btn"
                disabled={saving}
              >
                <X size={18} />
                Cancel
              </button>
              <button
                type="submit"
                className="profile-save-btn"
                disabled={saving}
              >
                <Save size={18} />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default TCProfileScreen;

