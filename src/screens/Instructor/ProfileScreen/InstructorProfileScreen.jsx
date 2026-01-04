import { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useHeader } from '../../../context/HeaderContext';
import { instructorAPI, publicAPI } from '../../../services/api';
import FormInput from '../../../components/FormInput/FormInput';
import Button from '../../../components/Button/Button';
import LanguageSelector from '../../../components/LanguageSelector/LanguageSelector';
import { 
  User, Mail, Lock, Save, KeyRound,
  Phone, MapPin, FileText, Upload, X, CheckCircle, Award, Calendar, Eye, Trash2, Edit
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
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  
  // Countries and Cities
  const [countries, setCountries] = useState([]);
  const [cities, setCities] = useState([]);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  
  // Certificates
  const [certificates, setCertificates] = useState([]);
  const [newCertificates, setNewCertificates] = useState([]); // Array of { name, issue_date, file }
  
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
      
      // Set certificates
      setCertificates(instructorProfile.certificates || []);
      
      // Load cities if country exists
      if (countryCode) {
        await loadCities(countryCode);
      }
      
      if (instructorProfile.cv_url || instructorProfile.cv) {
        setCvUrl(instructorProfile.cv_url || instructorProfile.cv);
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
      
      if (!Array.isArray(citiesData) && typeof citiesData === 'object') {
        citiesData = Object.values(citiesData);
      }
      
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
      let updatedInstructor;
      
      // Check if we have certificates to upload
      const hasCertificates = newCertificates.length > 0;
      
      if (hasCertificates) {
        // Use FormData for file uploads
        const formDataToSend = new FormData();
        
        // Add basic fields
        if (formData.first_name) formDataToSend.append('first_name', formData.first_name);
        if (formData.last_name) formDataToSend.append('last_name', formData.last_name);
        if (formData.phone) formDataToSend.append('phone', formData.phone);
        if (formData.country) formDataToSend.append('country', formData.country);
        if (formData.city) formDataToSend.append('city', formData.city);
        if (formData.id_number) formDataToSend.append('id_number', formData.id_number);
        if (formData.specializations && formData.specializations.length > 0) {
          formData.specializations.forEach(spec => {
            formDataToSend.append('specializations[]', spec);
          });
        }
        
        // Add new certificates only
        newCertificates.forEach((cert, index) => {
          formDataToSend.append(`certificates[${index}][name]`, cert.name);
          formDataToSend.append(`certificates[${index}][issue_date]`, cert.issue_date);
          if (cert.file) {
            formDataToSend.append(`certificates[${index}][certificate_file]`, cert.file);
          }
        });
        
        const response = await instructorAPI.updateProfile(formDataToSend);
        updatedInstructor = response.profile || response.instructor || response;
        setInstructorData(updatedInstructor);
        setCertificates(updatedInstructor.certificates || []);
        setNewCertificates([]);
        setSuccess('Profile updated successfully!');
      } else {
        // Regular JSON update
      const updatePayload = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone || null,
        country: formData.country || null,
        city: formData.city || null,
        id_number: formData.id_number || null,
        specializations: formData.specializations || [],
      };
      
      const response = await instructorAPI.updateProfile(updatePayload);
        updatedInstructor = response.profile || response.instructor || response;
      setInstructorData(updatedInstructor);
      setSuccess('Profile updated successfully!');
      }
      
      // Update form data
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
      
      // Reload profile to get latest data
      await loadProfile();
      
      // Close edit mode after successful save
      setIsEditingProfile(false);
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

    if (file.type !== 'application/pdf') {
      setErrors({ cv: 'Only PDF files are allowed' });
      e.target.value = '';
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrors({ cv: 'File size must be less than 10MB' });
      e.target.value = '';
      return;
    }

    setErrors({});
    setSuccess('');

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

  // Certificate handlers
  const handleAddNewCertificate = () => {
    setNewCertificates([...newCertificates, { name: '', issue_date: '', file: null }]);
  };

  const handleUpdateNewCertificate = (index, field, value) => {
    const updated = [...newCertificates];
    updated[index] = { ...updated[index], [field]: value };
    setNewCertificates(updated);
  };

  const handleRemoveNewCertificate = (index) => {
    setNewCertificates(newCertificates.filter((_, i) => i !== index));
  };


  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="instructor-profile-loading">
        <div className="instructor-profile-spinner"></div>
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
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gradient-to-br from-primary-100 to-primary-200 rounded-xl flex items-center justify-center mr-4">
                <User className="text-primary-600" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Profile Information</h2>
                <p className="text-sm text-gray-500">Update your personal details</p>
              </div>
            </div>
            {!isEditingProfile && (
              <Button
                type="button"
                variant="primary"
                onClick={() => setIsEditingProfile(true)}
                icon={<Edit size={18} />}
              >
                Edit Profile
              </Button>
            )}
            </div>

          <form onSubmit={handleUpdateProfile} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <FormInput
                  label="First Name"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleProfileChange}
                  required
                disabled={!isEditingProfile}
                  error={errors.first_name}
                />

                <FormInput
                  label="Last Name"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleProfileChange}
                  required
                disabled={!isEditingProfile}
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
                disabled
                  error={errors.email}
                helpText="Email cannot be changed"
                />

                <FormInput
                  label="Phone Number"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleProfileChange}
                disabled={!isEditingProfile}
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
                    className={`w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none bg-white cursor-pointer transition-all ${!isEditingProfile ? 'no-dropdown-arrow' : ''}`}
                    disabled={!isEditingProfile || loadingCountries}
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
                    className={`w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none bg-white cursor-pointer transition-all ${!isEditingProfile ? 'no-dropdown-arrow' : ''}`}
                    disabled={!isEditingProfile || !formData.country || loadingCities}
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
                disabled={!isEditingProfile}
                  error={errors.id_number}
                />
                
                {/* Assessor Status (Read-only) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type
                  </label>
                <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50">
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
              label="Specializations"
                value={formData.specializations}
                onChange={(specializations) => {
                  setFormData({ ...formData, specializations });
                  setErrors({});
                }}
                error={errors.specializations}
              disabled={!isEditingProfile}
            />

            {/* CV Section */}
            <div className="pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-lg flex items-center justify-center">
                    <FileText className="text-indigo-600" size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">CV / Resume</h3>
                    <p className="text-sm text-gray-500">Upload or update your curriculum vitae</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {/* Current CV Display */}
                {cvUrl && !isEditingProfile && (
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
                    </div>
                  </div>
                )}

                {/* No CV Message */}
                {!cvUrl && !uploadingCv && !isEditingProfile && (
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-3">
                      <FileText className="text-gray-400" size={20} />
                      <div>
                        <p className="text-sm font-medium text-gray-700">No CV uploaded</p>
                        <p className="text-xs text-gray-500 mt-1">Click Edit Profile to upload your CV</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Upload/Edit CV */}
                {isEditingProfile && (
                  <div className="space-y-3">
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

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {cvUrl ? 'Update CV' : 'Upload CV'}
                      </label>
                      <label className="flex items-center justify-center w-full px-4 py-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors cursor-pointer">
                        <input
                          type="file"
                          accept=".pdf,application/pdf"
                          onChange={handleCvFileChange}
                          disabled={uploadingCv}
                          className="hidden"
                        />
                        <div className="text-center">
                          {uploadingCv ? (
                            <>
                              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent mx-auto mb-2"></div>
                              <p className="text-sm text-gray-600">Uploading CV...</p>
                            </>
                          ) : (
                            <>
                              <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                              <p className="text-sm text-gray-600">
                                {cvUrl ? 'Click to update CV' : 'Click to upload CV'}
                              </p>
                              <p className="text-xs text-gray-400 mt-1">PDF only, maximum 10MB</p>
                            </>
                          )}
                        </div>
                      </label>
                      {errors.cv && (
                        <p className="mt-2 text-sm text-red-600">{errors.cv}</p>
                      )}
                    </div>

                  </div>
                )}
              </div>
            </div>

            {errors.general && (
              <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
                <p className="text-sm text-red-700 font-medium">{errors.general}</p>
              </div>
            )}
          </form>
        </div>

        {/* Certificates Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center mb-6 pb-4 border-b border-gray-200">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl flex items-center justify-center mr-4">
              <Award className="text-purple-600" size={24} />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900">Certificates</h2>
              <p className="text-sm text-gray-500">Manage your professional certificates</p>
            </div>
            {isEditingProfile && (
              <Button
                type="button"
                variant="secondary"
                onClick={handleAddNewCertificate}
                icon={<Award size={18} />}
              >
                Add Certificate
              </Button>
            )}
          </div>

          <div className="space-y-4">
            {/* Existing Certificates */}
            {certificates.length > 0 && (
              <div className="space-y-3">
                {certificates.map((cert, index) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Certificate Name</label>
                            <p className="text-sm text-gray-900">{cert.name}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Issue Date</label>
                            <p className="text-sm text-gray-900">{formatDate(cert.issue_date)}</p>
                          </div>
                        </div>
                        {cert.url && (
                          <div className="mt-3 flex items-center gap-2">
                            <a
                              href={cert.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-primary-600 hover:text-primary-700 underline flex items-center gap-1"
                            >
                              <Eye size={16} />
                              View Certificate
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* New Certificates */}
            {newCertificates.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700">New Certificates to Add</h3>
                {newCertificates.map((cert, index) => (
                  <div key={index} className="p-4 border-2 border-dashed border-primary-300 rounded-lg bg-primary-50">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <FormInput
                            label="Certificate Name"
                            value={cert.name}
                            onChange={(e) => handleUpdateNewCertificate(index, 'name', e.target.value)}
                            required
                            error={errors[`new_certificates.${index}.name`]}
                          />
                          <FormInput
                            label="Issue Date"
                            type="date"
                            value={cert.issue_date}
                            onChange={(e) => handleUpdateNewCertificate(index, 'issue_date', e.target.value)}
                            required
                            error={errors[`new_certificates.${index}.issue_date`]}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Certificate File (PDF) *
                          </label>
                          <input
                            type="file"
                            accept=".pdf,application/pdf"
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (file) {
                                if (file.type !== 'application/pdf') {
                                  setErrors({ [`new_certificates.${index}.file`]: 'Only PDF files are allowed' });
                                  return;
                                }
                                if (file.size > 10 * 1024 * 1024) {
                                  setErrors({ [`new_certificates.${index}.file`]: 'File size must be less than 10MB' });
                                  return;
                                }
                                handleUpdateNewCertificate(index, 'file', file);
                              }
                            }}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                            required
                          />
                          {cert.file && (
                            <p className="mt-1 text-xs text-gray-500">Selected: {cert.file.name}</p>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveNewCertificate(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {certificates.length === 0 && newCertificates.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Award size={48} className="mx-auto mb-3 text-gray-300" />
                <p>No certificates added yet</p>
              </div>
            )}

            {isEditingProfile && (
              <div className="pt-4 border-t border-gray-200 flex gap-3 mt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setIsEditingProfile(false);
                    setErrors({});
                    setNewCertificates([]);
                    // Reload profile to reset changes
                    loadProfile();
                  }}
                  disabled={saving}
                  fullWidth
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleUpdateProfile}
                  fullWidth
                  disabled={saving}
                  loading={saving}
                  icon={<Save size={20} />}
                >
                  Save Changes
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Change Password Section */}
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
    </div>
  );
};

export default InstructorProfileScreen;
