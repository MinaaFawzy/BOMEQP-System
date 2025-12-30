import { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useHeader } from '../../../context/HeaderContext';
import { instructorAPI, publicAPI } from '../../../services/api';
import FormInput from '../../../components/FormInput/FormInput';
import Button from '../../../components/Button/Button';
import LanguageSelector from '../../../components/LanguageSelector/LanguageSelector';
import { 
  User, Mail, Lock, Save, KeyRound,
  Phone, MapPin, FileText, Upload, X
} from 'lucide-react';
import axios from 'axios';
import './InstructorProfileScreen.css';

const InstructorProfileScreen = () => {
  const { user } = useAuth();
  const { setHeaderTitle, setHeaderSubtitle } = useHeader();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Instructor profile data
  const [instructorData, setInstructorData] = useState(null);
  const [cvUrl, setCvUrl] = useState(null);
  const [uploadingCv, setUploadingCv] = useState(false);
  
  // Countries and Cities
  const [countries, setCountries] = useState([]);
  const [cities, setCities] = useState([]);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: user?.email || '',
    phone: '',
    country: '',
    city: '',
    id_number: '',
    specializations: [],
  });
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    password: '',
    password_confirmation: '',
  });
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState('');

  useEffect(() => {
    setHeaderTitle('Profile');
    setHeaderSubtitle('Manage your account settings and preferences');
    return () => {
      setHeaderTitle(null);
      setHeaderSubtitle(null);
    };
  }, [setHeaderTitle, setHeaderSubtitle]);

  useEffect(() => {
    loadCountries();
  }, []);

  useEffect(() => {
    if (countries.length > 0) {
      loadProfile();
    }
  }, [countries.length]);

  useEffect(() => {
    if (formData.country) {
      loadCities(formData.country);
    } else {
      setCities([]);
      setFormData(prev => ({ ...prev, city: '' }));
    }
  }, [formData.country]);

  // Ensure city is selected after cities are loaded
  useEffect(() => {
    if (cities.length > 0 && instructorData?.city && !formData.city) {
      const cityExists = cities.some(c => c.name === instructorData.city);
      if (cityExists) {
        setFormData(prev => ({ ...prev, city: instructorData.city }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cities.length, instructorData?.city]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const profileResponse = await instructorAPI.getProfile();
      const instructorProfile = profileResponse.profile || profileResponse.instructor || profileResponse;
      setInstructorData(instructorProfile);
      
      // Find country code if country is a name (not code)
      let countryCode = instructorProfile.country || '';
      if (countryCode && countries.length > 0) {
        // If country is a name, find the code
        const countryObj = countries.find(c => c.name === countryCode || c.code === countryCode);
        if (countryObj) {
          countryCode = countryObj.code;
        }
      }
      
      const cityName = instructorProfile.city || '';
      
      setFormData({
        first_name: instructorProfile.first_name || '',
        last_name: instructorProfile.last_name || '',
        email: instructorProfile.email || user?.email || '',
        phone: instructorProfile.phone || '',
        country: countryCode,
        city: cityName,
        id_number: instructorProfile.id_number || '',
        specializations: instructorProfile.specializations || [],
      });
      
      // Load cities if country exists
      if (countryCode) {
        await loadCities(countryCode);
      }
      
      if (instructorProfile.cv_url || instructorProfile.cv || instructorProfile.resume_url || instructorProfile.resume) {
        setCvUrl(instructorProfile.cv_url || instructorProfile.cv || instructorProfile.resume_url || instructorProfile.resume);
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCountries = async () => {
    setLoadingCountries(true);
    try {
      const response = await publicAPI.getCountries();
      setCountries(response.countries || []);
    } catch (error) {
      console.error('Failed to load countries:', error);
      setCountries([]);
    } finally {
      setLoadingCountries(false);
    }
  };

  const loadCities = async (countryCode) => {
    if (!countryCode) {
      setCities([]);
      return;
    }
    
    setLoadingCities(true);
    try {
      const response = await publicAPI.getCities(countryCode);
      let citiesData = response.cities || response.data?.cities || response.data || response || [];
      
      // Convert object to array if needed (when API returns object with numeric keys)
      if (!Array.isArray(citiesData) && typeof citiesData === 'object') {
        citiesData = Object.values(citiesData);
      }
      
      // Ensure cities is always an array
      setCities(Array.isArray(citiesData) ? citiesData : []);
    } catch (error) {
      console.error('Failed to load cities:', error);
      setCities([]);
    } finally {
      setLoadingCities(false);
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
      const updatePayload = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone || null,
        country: formData.country || null,
        city: formData.city || null,
        id_number: formData.id_number || null,
        specializations: formData.specializations || [],
      };
      
      const response = await instructorAPI.updateProfile(updatePayload);
      const updatedInstructor = response.profile || response.instructor || response;
      setInstructorData(updatedInstructor);
      setSuccess('Profile updated successfully!');
      
      setFormData(prev => ({
        ...prev,
        first_name: updatedInstructor.first_name || prev.first_name,
        last_name: updatedInstructor.last_name || prev.last_name,
        email: updatedInstructor.email || prev.email,
        phone: updatedInstructor.phone || prev.phone || '',
        country: updatedInstructor.country || prev.country || '',
        city: updatedInstructor.city || prev.city || '',
        id_number: updatedInstructor.id_number || prev.id_number || '',
        specializations: updatedInstructor.specializations || prev.specializations || [],
      }));
      
      if (updatedInstructor.cv_url || updatedInstructor.cv) {
        setCvUrl(updatedInstructor.cv_url || updatedInstructor.cv);
      }
    } catch (error) {
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      } else if (error.errors) {
        setErrors(error.errors);
      } else {
        setErrors({ general: error.response?.data?.message || error.message || 'Failed to update profile' });
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
      const { authAPI } = await import('../../../services/api');
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

  const handleCvFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (file.type !== 'application/pdf') {
      setErrors({ cv: 'Only PDF files are allowed' });
      e.target.value = '';
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setErrors({ cv: 'File size must be less than 10MB' });
      e.target.value = '';
      return;
    }

    // Clear previous errors
    setErrors({});
    setSuccess('');

    // Upload immediately when file is selected
    setUploadingCv(true);
    try {
      const formData = new FormData();
      formData.append('cv', file);

      const response = await instructorAPI.updateProfile(formData);
      const updatedProfile = response.profile || response.instructor || response;

      if (updatedProfile.cv_url || updatedProfile.cv) {
        setCvUrl(updatedProfile.cv_url || updatedProfile.cv);
        setInstructorData(updatedProfile);
        setSuccess('CV uploaded successfully!');
      } else {
        throw new Error('CV upload failed - no CV URL returned');
      }

      // Reset file input
      e.target.value = '';
    } catch (error) {
      console.error('Failed to upload CV:', error);
      if (error.response?.data?.message) {
        setErrors({ cv: error.response.data.message });
      } else if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      } else {
        setErrors({ cv: error.message || 'Failed to upload CV' });
      }
    } finally {
      setUploadingCv(false);
    }
  };

  const handleRemoveCv = async () => {
    if (!confirm('Are you sure you want to remove your CV? This action cannot be undone.')) {
      return;
    }

    setUploadingCv(true);
    setErrors({});
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('cv', '');

      const response = await instructorAPI.updateProfile(formData);
      const updatedProfile = response.profile || response.instructor || response;

      setInstructorData(updatedProfile);
      setCvUrl(null);
      setSuccess('CV removed successfully!');
    } catch (error) {
      console.error('Failed to remove CV:', error);
      if (error.response?.data?.message) {
        setErrors({ cv: error.response.data.message });
      } else {
        setErrors({ cv: error.message || 'Failed to remove CV' });
      }
    } finally {
      setUploadingCv(false);
    }
  };

  if (loading) {
    return (
      <div className="instructor-profile-loading">
        <div className="instructor-profile-spinner"></div>
      </div>
    );
  }

  return (
    <div className="instructor-profile-container">
      {success && (
        <div className="instructor-profile-success">
          <Save className="instructor-profile-success-icon" size={24} />
          <p className="instructor-profile-success-text">{success}</p>
        </div>
      )}

      <div className="instructor-profile-content">
        {/* Profile Information */}
        <div className="instructor-profile-section">
          <div className="instructor-profile-card">
            <div className="instructor-profile-card-header">
              <div className="instructor-profile-card-icon-wrapper">
                <User className="instructor-profile-card-icon" size={24} />
              </div>
              <div>
                <h2 className="instructor-profile-card-title">Profile Information</h2>
                <p className="instructor-profile-card-subtitle">Update your personal details</p>
              </div>
            </div>

            <form onSubmit={handleUpdateProfile} className="instructor-profile-form">
              <div className="instructor-profile-form-grid">
                <FormInput
                  label="First Name"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleProfileChange}
                  required
                  error={errors.first_name}
                />

                <FormInput
                  label="Last Name"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleProfileChange}
                  required
                  error={errors.last_name}
                />
              </div>

              <div className="instructor-profile-form-grid">
                <FormInput
                  label="Email Address"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleProfileChange}
                  required
                  error={errors.email}
                />

                <FormInput
                  label="Phone Number"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleProfileChange}
                  error={errors.phone}
                />
              </div>

              <div className="instructor-profile-form-grid">
                <div className="instructor-profile-select-wrapper">
                  <label className="instructor-profile-select-label">
                    Country
                  </label>
                  <div className="instructor-profile-select-container">
                    <MapPin className="instructor-profile-select-icon" size={18} />
                    <select
                      name="country"
                      value={formData.country}
                      onChange={handleProfileChange}
                      className="instructor-profile-select"
                      disabled={loadingCountries}
                    >
                      <option value="">Select Country</option>
                      {countries.map((country) => (
                        <option key={country.code} value={country.code}>
                          {country.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {errors.country && (
                    <p className="instructor-profile-error">{errors.country}</p>
                  )}
                </div>

                <div className="instructor-profile-select-wrapper">
                  <label className="instructor-profile-select-label">
                    City
                  </label>
                  <div className="instructor-profile-select-container">
                    <MapPin className="instructor-profile-select-icon" size={18} />
                    <select
                      name="city"
                      value={formData.city}
                      onChange={handleProfileChange}
                      className="instructor-profile-select"
                      disabled={!formData.country || loadingCities}
                        >
                          <option value="">Select City</option>
                          {Array.isArray(cities) && cities.map((city, index) => (
                            <option key={index} value={city.name}>
                              {city.name}
                            </option>
                          ))}
                        </select>
                  </div>
                  {errors.city && (
                    <p className="instructor-profile-error">{errors.city}</p>
                  )}
                </div>
              </div>

              <div className="instructor-profile-form-grid">
                <FormInput
                  label="ID Number"
                  name="id_number"
                  value={formData.id_number}
                  onChange={handleProfileChange}
                  error={errors.id_number}
                />
                
                {/* Assessor Status (Read-only) */}
                <div className="instructor-profile-select-wrapper">
                  <label className="instructor-profile-select-label">
                    Type
                  </label>
                  <div className="instructor-profile-select-container">
                    {instructorData?.is_assessor ? (
                      <span className="inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200">
                        Assessor
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 border border-gray-200">
                        Instructor
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">This field is managed by your Training Center</p>
                </div>
              </div>

              {/* Specializations */}
              <LanguageSelector
                label="Languages"
                value={formData.specializations}
                onChange={(specializations) => {
                  setFormData({ ...formData, specializations });
                  setErrors({});
                }}
                error={errors.specializations}
              />

              {errors.general && (
                <div className="instructor-profile-error-box">
                  <p className="instructor-profile-error-text">{errors.general}</p>
                </div>
              )}

              <div className="instructor-profile-form-actions">
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

          {/* Change Password and CV Section */}
          <div className="instructor-profile-grid-2">
            {/* Change Password */}
            <div className="instructor-profile-card">
              <div className="instructor-profile-card-header">
                <div className="instructor-profile-card-icon-wrapper instructor-profile-card-icon-red">
                  <KeyRound className="instructor-profile-card-icon" size={24} />
                </div>
                <div>
                  <h2 className="instructor-profile-card-title">Change Password</h2>
                  <p className="instructor-profile-card-subtitle">Update your account password</p>
                </div>
              </div>

              <form onSubmit={handleChangePassword} className="instructor-profile-form">
                <FormInput
                  label="Current Password"
                  type="password"
                  name="current_password"
                  value={passwordData.current_password}
                  onChange={handlePasswordChange}
                  required
                  error={errors.current_password}
                />

                <div className="instructor-profile-form-grid">
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

                <div className="instructor-profile-form-actions">
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
            
            {/* Instructor CV Section */}
            <div className="instructor-profile-card">
              <div className="instructor-profile-card-header">
                <div className="instructor-profile-card-icon-wrapper instructor-profile-card-icon-indigo">
                  <FileText className="instructor-profile-card-icon" size={24} />
                </div>
                <div>
                  <h2 className="instructor-profile-card-title">CV / Resume</h2>
                  <p className="instructor-profile-card-subtitle">Upload or update your curriculum vitae</p>
                </div>
              </div>

              <div className="instructor-profile-cv-content">
                {/* Current CV Display */}
                {cvUrl && (
                  <div className="mb-4 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                          <FileText className="text-white" size={24} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">Current CV</p>
                          <a 
                            href={cvUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:text-blue-700 underline"
                          >
                            View CV
                          </a>
                        </div>
                      </div>
                      <button
                        onClick={handleRemoveCv}
                        disabled={uploadingCv}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Remove CV"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Upload CV */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {cvUrl ? 'Update CV' : 'Upload CV'}
                  </label>
                  <label className="block w-full p-6 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 hover:border-primary-400 hover:bg-primary-50/30 transition-all cursor-pointer">
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={handleCvFileChange}
                      disabled={uploadingCv}
                      className="hidden"
                    />
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className="w-12 h-12 bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg flex items-center justify-center mb-3">
                        <Upload className="text-primary-600" size={24} />
                      </div>
                      {uploadingCv ? (
                        <>
                          <p className="text-sm font-medium text-gray-700 mb-1">Uploading CV...</p>
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary-600 border-t-transparent mt-2"></div>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-medium text-gray-700 mb-1">
                            {cvUrl ? 'Click to update CV' : 'Click to upload CV'}
                          </p>
                          <p className="text-xs text-gray-500">PDF only, maximum 10MB</p>
                        </>
                      )}
                    </div>
                  </label>
                  {errors.cv && (
                    <p className="mt-2 text-sm text-red-600">{errors.cv}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstructorProfileScreen;

