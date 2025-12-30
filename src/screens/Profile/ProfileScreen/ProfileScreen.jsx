import { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useHeader } from '../../../context/HeaderContext';
import { authAPI, instructorAPI, publicAPI } from '../../../services/api';
import FormInput from '../../../components/FormInput/FormInput';
import Button from '../../../components/Button/Button';
import LanguageSelector from '../../../components/LanguageSelector/LanguageSelector';
import { 
  User, Mail, Lock, Save, Shield, CheckCircle, Clock, Calendar, KeyRound,
  Phone, MapPin, FileText, Upload, X, Award, Building2
} from 'lucide-react';
import axios from 'axios';
import './ProfileScreen.css';

const ProfileScreen = () => {
  const { user, updateUser } = useAuth();
  const { setHeaderTitle, setHeaderSubtitle } = useHeader();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const isInstructor = user?.role === 'instructor';
  
  // Instructor profile data
  const [instructorData, setInstructorData] = useState(null);
  const [cvFile, setCvFile] = useState(null);
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
    loadCountries();
  }, []);

  useEffect(() => {
    if (countries.length > 0 || !isInstructor) {
      loadProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countries.length, isInstructor]);

  useEffect(() => {
    if (isInstructor && formData.country) {
      loadCities(formData.country);
    } else if (isInstructor && !formData.country) {
      setCities([]);
      setFormData(prev => ({ ...prev, city: '' }));
    }
  }, [formData.country, isInstructor]);

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
      if (isInstructor) {
        // Load instructor profile
        const profileResponse = await instructorAPI.getProfile();
        
        // Extract instructor data from response (check profile.profile or profile.instructor)
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
        
        // Set CV URL if exists
        if (instructorProfile.cv_url || instructorProfile.cv || instructorProfile.resume_url || instructorProfile.resume) {
          setCvUrl(instructorProfile.cv_url || instructorProfile.cv || instructorProfile.resume_url || instructorProfile.resume);
        }
      } else {
        // Load regular user profile
        const response = await authAPI.getProfile();
        setFormData({
          first_name: '',
          last_name: '',
          name: response.user.name || '',
          email: response.user.email || '',
          phone: '',
          country: '',
          city: '',
        });
        updateUser(response.user);
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
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
      // Reset city when country changes
      ...(name === 'country' && { city: '' }),
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
      if (isInstructor) {
        // Update instructor profile
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
        
        // Update form data with response data to ensure sync
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
        
        // Update CV URL if changed
        if (updatedInstructor.cv_url || updatedInstructor.cv) {
          setCvUrl(updatedInstructor.cv_url || updatedInstructor.cv);
        }
      } else {
        // Update regular user profile
        const response = await authAPI.updateProfile(formData);
        updateUser(response.user);
        setSuccess('Profile updated successfully!');
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

  const handleCvChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        setErrors({ cv: 'Please upload a PDF or Word document' });
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrors({ cv: 'File size must be less than 5MB' });
        return;
      }
      
      setCvFile(file);
      setErrors({});
    }
  };

  const handleCvUpload = async () => {
    if (!cvFile) return;
    
    setUploadingCv(true);
    setErrors({});
    setSuccess('');

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('cv', cvFile);
      
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token') || 
                   sessionStorage.getItem('auth_token') || sessionStorage.getItem('token');
      
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://aeroenix.com/v1/api';
      
      const response = await axios.put(`${API_BASE_URL}/instructor/profile`, formDataToSend, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      // Update CV URL from response
      const updatedInstructor = response.data.profile || response.data.instructor || response.data;
      if (updatedInstructor.cv_url || updatedInstructor.cv) {
        setCvUrl(updatedInstructor.cv_url || updatedInstructor.cv);
      }
      setInstructorData(updatedInstructor);
      
      // Update form data with all fields from response
      setFormData(prev => ({
        ...prev,
        first_name: updatedInstructor.first_name || prev.first_name,
        last_name: updatedInstructor.last_name || prev.last_name,
        email: updatedInstructor.email || prev.email,
        phone: updatedInstructor.phone || prev.phone,
        country: updatedInstructor.country || prev.country,
        city: updatedInstructor.city || prev.city,
        id_number: updatedInstructor.id_number || prev.id_number,
        specializations: updatedInstructor.specializations || prev.specializations,
      }));
      setCvFile(null);
      setSuccess('CV uploaded successfully!');
    } catch (error) {
      console.error('Failed to upload CV:', error);
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      } else {
        setErrors({ cv: error.response?.data?.message || error.message || 'Failed to upload CV' });
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
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token') || 
                   sessionStorage.getItem('auth_token') || sessionStorage.getItem('token');
      
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://aeroenix.com/v1/api';
      
      // Send request to remove CV (set cv to null)
      const formDataToSend = new FormData();
      formDataToSend.append('cv', '');
      
      const response = await axios.put(`${API_BASE_URL}/instructor/profile`, formDataToSend, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      // Update instructor data from response
      const updatedInstructor = response.data.profile || response.data.instructor || response.data;
      setInstructorData(updatedInstructor);
      setCvUrl(null);
      setCvFile(null);
      setSuccess('CV removed successfully!');
      
      // Update form data with all fields from response
      setFormData(prev => ({
        ...prev,
        first_name: updatedInstructor.first_name || prev.first_name,
        last_name: updatedInstructor.last_name || prev.last_name,
        email: updatedInstructor.email || prev.email,
        phone: updatedInstructor.phone || prev.phone,
        country: updatedInstructor.country || prev.country,
        city: updatedInstructor.city || prev.city,
        id_number: updatedInstructor.id_number || prev.id_number,
        specializations: updatedInstructor.specializations || prev.specializations,
      }));
    } catch (error) {
      console.error('Failed to remove CV:', error);
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      } else {
        setErrors({ cv: error.response?.data?.message || error.message || 'Failed to remove CV' });
      }
    } finally {
      setUploadingCv(false);
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

      <div className="space-y-4">
        {/* Profile Information */}
        <div className="space-y-4">
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
              {isInstructor ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="relative">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Country
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <select
                          name="country"
                          value={formData.country}
                          onChange={handleProfileChange}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none bg-white cursor-pointer transition-all"
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
                        <p className="mt-1 text-sm text-red-600">{errors.country}</p>
                      )}
                    </div>

                    <div className="relative">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        City
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <select
                          name="city"
                          value={formData.city}
                          onChange={handleProfileChange}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none bg-white cursor-pointer transition-all"
                          disabled={!formData.country || loadingCities}
                        >
                          <option value="">Select City</option>
                          {cities.map((city, index) => (
                            <option key={index} value={city.name}>
                              {city.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      {errors.city && (
                        <p className="mt-1 text-sm text-red-600">{errors.city}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <FormInput
                      label="ID Number"
                      name="id_number"
                      value={formData.id_number}
                      onChange={handleProfileChange}
                      error={errors.id_number}
                    />
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
                </>
              ) : (
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
              )}

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

          {/* Change Password and CV Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
            
            {/* Instructor CV Section */}
            {isInstructor && (
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <div className="flex items-center mb-6 pb-4 border-b border-gray-200">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-xl flex items-center justify-center mr-4">
                  <FileText className="text-indigo-600" size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">CV / Resume</h2>
                  <p className="text-sm text-gray-500">Upload or update your curriculum vitae</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Current CV Display */}
                {cvUrl && (
                  <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <FileText className="text-green-600 flex-shrink-0 mt-1" size={24} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 mb-2">Current CV</p>
                          <a 
                            href={cvUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 underline font-medium mb-2 break-all"
                          >
                            <FileText size={16} />
                            {cvUrl.split('/').pop().split('?')[0] || 'View CV'}
                          </a>
                          <p className="text-xs text-gray-500">
                            Click the link above to view your current CV in a new tab
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={handleRemoveCv}
                        disabled={uploadingCv}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                        title="Remove CV"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>
                )}

                {/* No CV Message */}
                {!cvUrl && !cvFile && (
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-3">
                      <FileText className="text-gray-400" size={20} />
                      <div>
                        <p className="text-sm font-medium text-gray-700">No CV uploaded</p>
                        <p className="text-xs text-gray-500 mt-1">Upload your CV below to get started</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Upload New CV */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {cvUrl ? 'Update CV' : 'Upload CV'}
                    </label>
                    <div className="flex items-center gap-3">
                      <label className="flex-1 cursor-pointer">
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx"
                          onChange={handleCvChange}
                          className="hidden"
                        />
                        <div className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors">
                          <div className="text-center">
                            <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                            <p className="text-sm text-gray-600">
                              {cvFile ? cvFile.name : 'Click to select PDF or Word document'}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">Max size: 5MB</p>
                          </div>
                        </div>
                      </label>
                    </div>
                    {errors.cv && (
                      <p className="mt-2 text-sm text-red-600">{errors.cv}</p>
                    )}
                  </div>

                  {cvFile && (
                    <div className="flex gap-3">
                      <Button
                        onClick={handleCvUpload}
                        disabled={uploadingCv}
                        loading={uploadingCv}
                        icon={<Upload size={18} />}
                      >
                        {uploadingCv ? 'Uploading...' : 'Upload CV'}
                      </Button>
                      <Button
                        onClick={() => setCvFile(null)}
                        variant="secondary"
                        disabled={uploadingCv}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileScreen;
