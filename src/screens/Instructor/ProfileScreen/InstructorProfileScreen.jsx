import { useEffect, useState } from 'react';
import { useTranslation } from '../../../hooks/useTranslation';
import { useAuth } from '../../../context/AuthContext';
import { useHeader } from '../../../context/HeaderContext';
import { instructorAPI, publicAPI } from '../../../services/api';
import { validateEmail, validatePhone, validateRequired, validateUKID, validatePassword, validatePasswordConfirmation } from '../../../utils/validation';
import FormInput from '../../../components/FormInput/FormInput';
import Button from '../../../components/Button/Button';
import LanguageSelector from '../../../components/LanguageSelector/LanguageSelector';
import {
  User, Mail, Lock, Save, KeyRound, Globe,
  Phone, MapPin, FileText, Upload, X, CheckCircle, Award, Calendar, Eye, Trash2, Edit, Clock, Building2
} from 'lucide-react';
import './InstructorProfileScreen.css';

const InstructorProfileScreen = () => {
  const { t, currentLanguage, changeLanguage, languages } = useTranslation('instructor');
  const { user } = useAuth();
  const { setHeaderTitle, setHeaderSubtitle } = useHeader();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Instructor profile data
  const [instructorData, setInstructorData] = useState(null);
  const [cvUrl, setCvUrl] = useState(null);
  const [uploadingCv, setUploadingCv] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [passportFile, setPassportFile] = useState(null);
  const [passportUrl, setPassportUrl] = useState(null);
  const [uploadingPassport, setUploadingPassport] = useState(false);

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
    date_of_birth: '',
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
    setHeaderTitle(t('profile_screen.header.title'));
    setHeaderSubtitle(t('profile_screen.header.subtitle'));
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
        date_of_birth: instructorProfile.date_of_birth ? instructorProfile.date_of_birth.split('T')[0] : '',
        country: countryCode,
        city: cityName,
        id_number: instructorProfile.id_number || '',
        specializations: instructorProfile.specializations || instructorProfile.languages || [],
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

      // Set photo URL if available
      if (instructorProfile.photo_url || instructorProfile.photo) {
        setPhotoUrl(instructorProfile.photo_url || instructorProfile.photo);
      } else {
        setPhotoUrl(null);
      }

      // Set passport URL if available
      if (instructorProfile.passport_image_url || instructorProfile.passport) {
        setPassportUrl(instructorProfile.passport_image_url || instructorProfile.passport);
      } else {
        setPassportUrl(null);
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

    // Validation
    const validationErrors = {};
    const firstNameError = validateRequired(formData.first_name, t('profile_screen.form.first_name'));
    if (firstNameError) validationErrors.first_name = firstNameError;
    const lastNameError = validateRequired(formData.last_name, t('profile_screen.form.last_name'));
    if (lastNameError) validationErrors.last_name = lastNameError;
    if (formData.phone) {
      const phoneError = validatePhone(formData.phone, 10);
      if (phoneError) validationErrors.phone = phoneError;
    }
    if (formData.id_number) {
      const idError = validateUKID(formData.id_number, t('profile_screen.form.id_number'));
      if (idError) validationErrors.id_number = idError;
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setSaving(false);
      return;
    }

    try {
      let updatedInstructor;

      // Check if we have certificates to upload or photo file or passport file
      const hasCertificates = newCertificates.length > 0;
      const hasPhotoFile = photoFile instanceof File;
      const hasPassportFile = passportFile instanceof File;

      if (hasCertificates || hasPhotoFile || hasPassportFile) {
        // Use FormData for file uploads
        const formDataToSend = new FormData();

        // Add basic fields
        if (formData.first_name) formDataToSend.append('first_name', formData.first_name);
        if (formData.last_name) formDataToSend.append('last_name', formData.last_name);
        if (formData.phone) formDataToSend.append('phone', formData.phone);
        if (formData.date_of_birth) formDataToSend.append('date_of_birth', formData.date_of_birth);
        if (formData.country) formDataToSend.append('country', formData.country);
        if (formData.city) formDataToSend.append('city', formData.city);
        if (formData.id_number) formDataToSend.append('id_number', formData.id_number);
        if (formData.specializations && formData.specializations.length > 0) {
          formData.specializations.forEach(spec => {
            formDataToSend.append('languages[]', spec);
          });
        }

        // Add photo if selected
        if (hasPhotoFile) {
          formDataToSend.append('photo', photoFile);
        }

        // Add passport if selected
        if (hasPassportFile) {
          formDataToSend.append('passport', passportFile);
        }

        // Add new certificates only
        newCertificates.forEach((cert, index) => {
          formDataToSend.append(`certificates[${index}][name]`, cert.name);
          formDataToSend.append(`certificates[${index}][issue_date]`, cert.issue_date);
          if (cert.file) {
            formDataToSend.append(`certificates[${index}][certificate_file]`, cert.file);
          }
        });

        // Print FormData contents
        console.log('📦 FormData Contents:');
        console.log('📋 FormData object:', formDataToSend);
        for (const [key, value] of formDataToSend.entries()) {
          if (value instanceof File) {
            console.log(`  ${key}: File(${value.name}, ${value.size} bytes, ${value.type})`);
          } else {
            console.log(`  ${key}:`, value);
          }
        }
        console.log('📤 Sending POST request to /instructor/profile');

        const response = await instructorAPI.updateProfile(formDataToSend);
        updatedInstructor = response.profile || response.instructor || response;
        setInstructorData(updatedInstructor);
        setCertificates(updatedInstructor.certificates || []);
        setNewCertificates([]);
        if (hasPhotoFile && (updatedInstructor.photo_url || updatedInstructor.photo)) {
          setPhotoUrl(updatedInstructor.photo_url || updatedInstructor.photo);
          setPhotoFile(null);
        }
        if (hasPassportFile && (updatedInstructor.passport_image_url || updatedInstructor.passport)) {
          setPassportUrl(updatedInstructor.passport_image_url || updatedInstructor.passport);
          setPassportFile(null);
        }
        setSuccess(t('profile_screen.messages.profile_updated'));
      } else {
        // Regular JSON update
        const updatePayload = {
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone || null,
          date_of_birth: formData.date_of_birth || null,
          country: formData.country || null,
          city: formData.city || null,
          id_number: formData.id_number || null,
          languages: formData.specializations || [],
        };

        // Print update payload
        console.log('📄 JSON Update Payload:');
        console.log(JSON.stringify(updatePayload, null, 2));
        console.log('📤 Sending POST request to /instructor/profile');

        const response = await instructorAPI.updateProfile(updatePayload);
        updatedInstructor = response.profile || response.instructor || response;
        setInstructorData(updatedInstructor);
        setSuccess(t('profile_screen.messages.profile_updated'));
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

      // Update photo URL if changed
      if (updatedInstructor.photo_url || updatedInstructor.photo) {
        setPhotoUrl(updatedInstructor.photo_url || updatedInstructor.photo);
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
        setErrors({ general: error.response?.data?.message || error.message || t('profile_screen.validation.password_failed') });
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

    // Validation
    const passwordErrors = {};
    if (!passwordData.current_password) {
      passwordErrors.current_password = t('profile_screen.validation.password_required');
    }
    const newPasswordError = validatePassword(passwordData.password, 8, true);
    if (newPasswordError) passwordErrors.password = newPasswordError;
    const confirmPasswordError = validatePasswordConfirmation(passwordData.password, passwordData.password_confirmation);
    if (confirmPasswordError) passwordErrors.password_confirmation = confirmPasswordError;

    if (Object.keys(passwordErrors).length > 0) {
      setErrors(passwordErrors);
      setSaving(false);
      return;
    }

    try {
      const { authAPI } = await import('../../../services/api');
      await authAPI.changePassword(passwordData);
      setSuccess(t('profile_screen.messages.password_changed'));
      setPasswordData({
        current_password: '',
        password: '',
        password_confirmation: '',
      });
    } catch (error) {
      if (error.errors) {
        setErrors(error.errors);
      } else {
        setErrors({ password: error.message || t('profile_screen.validation.password_failed') });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCvFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setErrors({ cv: t('profile_screen.validation.file_type') });
      e.target.value = '';
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrors({ cv: t('profile_screen.validation.file_size') });
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
        setSuccess(t('profile_screen.messages.profile_updated')); // Reusing general success message or generic upload success
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
        setErrors({ cv: error.message || t('profile_screen.validation.password_failed') }); // Fallback or new key? Did not see generic fail
      }
    } finally {
      setUploadingCv(false);
    }
  };

  const handleRemoveCv = async () => {
    if (!confirm(t('profile_screen.cv.remove_confirm'))) {
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
      setSuccess(t('profile_screen.messages.profile_updated'));
    } catch (error) {
      console.error('Failed to remove CV:', error);
      if (error.response?.data?.message) {
        setErrors({ cv: error.response.data.message });
      } else {
        setErrors({ cv: error.message || t('profile_screen.validation.password_failed') }); // Reusing generic fail
      }
    } finally {
      setUploadingCv(false);
    }
  };

  // Resize image function (resize only, no compression)
  const resizeImage = (file, maxWidth = 800, maxHeight = 800) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Calculate new dimensions only if image exceeds max dimensions
          if (width > maxWidth || height > maxHeight) {
            if (width > height) {
              if (width > maxWidth) {
                height = (height * maxWidth) / width;
                width = maxWidth;
              }
            } else {
              if (height > maxHeight) {
                width = (width * maxHeight) / height;
                height = maxHeight;
              }
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Use quality = 1.0 (100%) to avoid compression, only resize
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Failed to resize image'));
              }
            },
            file.type || 'image/jpeg',
            1.0 // No compression - quality = 100%
          );
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handlePhotoFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Clear previous errors
    setErrors({ ...errors, photo: undefined });

    // Validate file type - only allow jpg, jpeg, png
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    const fileType = file.type.toLowerCase();
    if (!allowedTypes.includes(fileType)) {
      setErrors({ ...errors, photo: t('profile_screen.validation.photo_type') });
      e.target.value = '';
      return;
    }

    // Resize image before setting it
    try {
      const resizedBlob = await resizeImage(file);
      const resizedFile = new File([resizedBlob], file.name, { type: file.type });

      // Set photo file and create preview
      setPhotoFile(resizedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoUrl(reader.result);
      };
      reader.onerror = () => {
        setErrors({ ...errors, photo: 'Failed to load image preview' });
      };
      reader.readAsDataURL(resizedFile);
    } catch (error) {
      console.error('Failed to resize image:', error);
      setErrors({ ...errors, photo: t('profile_screen.validation.photo_type') }); // Generic photo error
      e.target.value = '';
    }

    e.target.value = '';
  };

  const handlePassportFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Clear previous errors
    setErrors({ ...errors, passport: undefined });

    // Validate file type - allow jpg, jpeg, png, pdf
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    const fileType = file.type.toLowerCase();
    if (!allowedTypes.includes(fileType)) {
      setErrors({ ...errors, passport: t('profile_screen.validation.photo_type') }); // Closest match
      e.target.value = '';
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setErrors({ ...errors, passport: t('profile_screen.validation.file_size') });
      e.target.value = '';
      return;
    }

    setUploadingPassport(true);
    try {
      // If it's an image, resize it; if PDF, use as-is
      if (file.type.startsWith('image/')) {
        const resizedBlob = await resizeImage(file);
        const resizedFile = new File([resizedBlob], file.name, { type: file.type });

        // Set passport file and create preview
        setPassportFile(resizedFile);
        const reader = new FileReader();
        reader.onloadend = () => {
          setPassportUrl(reader.result);
        };
        reader.onerror = () => {
          setErrors({ ...errors, passport: 'Failed to load file preview' });
        };
        reader.readAsDataURL(resizedFile);
      } else {
        // For PDF, just set the file
        setPassportFile(file);
        setPassportUrl(null); // No preview for PDF
      }
    } catch (error) {
      console.error('Failed to process passport file:', error);
      setErrors({ ...errors, passport: t('profile_screen.validation.photo_type') });
      e.target.value = '';
    } finally {
      setUploadingPassport(false);
    }

    e.target.value = '';
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
    if (!dateString) return t('profile_screen.common.na');
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
                <h2 className="text-xl font-semibold text-gray-900">{t('profile_screen.sections.profile_info.title')}</h2>
                <p className="text-sm text-gray-500">{t('profile_screen.sections.profile_info.subtitle')}</p>
              </div>
            </div>
            {!isEditingProfile && (
              <Button
                type="button"
                variant="primary"
                onClick={() => setIsEditingProfile(true)}
                icon={<Edit size={18} />}
              >
                {t('profile_screen.header.edit')}
              </Button>
            )}
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-5">
            {/* Profile Photo Section */}
            <div className="pb-4 border-b border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                {t('profile_screen.profile_photo.label')}
              </label>
              <div className="flex items-center gap-6">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-gray-200 bg-gray-100 flex items-center justify-center">
                    {photoUrl ? (
                      <img src={photoUrl} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <User className="text-gray-400" size={40} />
                    )}
                  </div>
                  {saving && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent"></div>
                    </div>
                  )}
                </div>
                {isEditingProfile && (
                  <div className="flex items-center gap-3">
                    <label className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors cursor-pointer">
                      <input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png"
                        onChange={handlePhotoFileSelect}
                        disabled={saving}
                        className="hidden"
                      />
                      <Upload className="h-4 w-4 text-gray-600 mr-2" />
                      <span className="text-sm text-gray-700">
                        {photoFile ? t('profile_screen.profile_photo.change') : t('profile_screen.profile_photo.select')}
                      </span>
                    </label>
                  </div>
                )}
              </div>
              {isEditingProfile && (
                <div className="mt-2">
                  <p className="text-xs text-gray-500">{t('profile_screen.profile_photo.hint')}</p>
                  {errors.photo && (
                    <p className="text-sm text-red-600 mt-1">{errors.photo}</p>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <FormInput
                label={t('profile_screen.form.first_name')}
                name="first_name"
                value={formData.first_name}
                onChange={handleProfileChange}
                required
                disabled={!isEditingProfile}
                error={errors.first_name}
              />

              <FormInput
                label={t('profile_screen.form.last_name')}
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
                label={t('profile_screen.form.email')}
                type="email"
                name="email"
                value={formData.email}
                onChange={handleProfileChange}
                required
                disabled
                error={errors.email}
                helpText={t('profile_screen.form.email_help')}
              />

              <FormInput
                label={t('profile_screen.form.phone')}
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleProfileChange}
                disabled={!isEditingProfile}
                error={errors.phone}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <FormInput
                label={t('profile_screen.form.date_of_birth')}
                name="date_of_birth"
                type="date"
                value={formData.date_of_birth}
                onChange={handleProfileChange}
                disabled={!isEditingProfile}
                error={errors.date_of_birth}
                required
              />

              <FormInput
                label="ID Number"
                name="id_number"
                value={formData.id_number}
                onChange={handleProfileChange}
                disabled={!isEditingProfile}
                error={errors.id_number}
                placeholder={t('profile_screen.form.id_placeholder')}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('profile_screen.form.country')}
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
                    <option value="">{t('profile_screen.form.select_country')}</option>
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
                  {t('profile_screen.form.city')}
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
                    <option value="">{t('profile_screen.form.select_city')}</option>
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
                label={t('profile_screen.form.id_number')}
                name="id_number"
                value={formData.id_number}
                onChange={handleProfileChange}
                disabled={!isEditingProfile}
                error={errors.id_number}
                placeholder={t('profile_screen.form.id_placeholder')}
              />

              {/* Assessor Status (Read-only) */}
              {/* Assessor Status (Read-only) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('profile_screen.form.type')}
                </label>
                <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50">
                  {instructorData?.is_assessor ? (
                    <span className="inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200">
                      {t('profile_screen.status.assessor')}
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 border border-gray-200">
                      {t('profile_screen.status.instructor')}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">{t('profile_screen.validation.this_field_is_managed_by_your_training_center')}</p>
              </div>

              {/* Account Status (Read-only) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('profile_screen.form.account_status')}
                </label>
                <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50">
                  {instructorData?.status === 'active' && (
                    <span className="inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium bg-green-100 text-green-800 border border-green-200">
                      <CheckCircle size={16} className="mr-2" />
                      {t('profile_screen.status.active')}
                    </span>
                  )}
                  {instructorData?.status === 'pending' && (
                    <span className="inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                      <Clock size={16} className="mr-2" />
                      {t('profile_screen.status.pending')}
                    </span>
                  )}
                  {instructorData?.status === 'suspended' && (
                    <span className="inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium bg-red-100 text-red-800 border border-red-200">
                      <X size={16} className="mr-2" />
                      {t('profile_screen.status.suspended')}
                    </span>
                  )}
                  {instructorData?.status === 'inactive' && (
                    <span className="inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 border border-gray-200">
                      {t('profile_screen.status.inactive')}
                    </span>
                  )}
                  {!instructorData?.status && (
                    <span className="text-sm text-gray-500">{t('profile_screen.common.na')}</span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">{t('profile_screen.validation.your_account_status_is_managed_by_your_training_center')}</p>
              </div>
            </div>

            {/* Training Center Information (Read-only) */}
            {instructorData?.training_center && (
              <div className="pt-4 border-t border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('profile_screen.form.training_center')}
                </label>
                <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg flex items-center justify-center">
                      <Building2 className="text-primary-600" size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {instructorData.training_center.name || t('profile_screen.common.na')}
                      </p>
                      {instructorData.training_center.email && (
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                          <Mail size={12} />
                          {instructorData.training_center.email}
                        </p>
                      )}
                      {instructorData.training_center.phone && (
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                          <Phone size={12} />
                          {instructorData.training_center.phone}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">{t('profile_screen.validation.you_are_registered_under_this_training_center')}</p>
              </div>
            )}

            {/* Specializations */}
            <LanguageSelector
              label={t('profile_screen.form.specializations')}
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
                    <h3 className="text-lg font-semibold text-gray-900">{t('profile_screen.sections.cv.title')}</h3>
                    <p className="text-sm text-gray-500">{t('profile_screen.sections.cv.subtitle')}</p>
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
                          <p className="text-sm font-semibold text-gray-900 mb-2">{t('profile_screen.cv.current')}</p>
                          <a
                            href={cvUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 underline font-medium mb-2 break-all"
                          >
                            <FileText size={16} />
                            {cvUrl.split('/').pop().split('?')[0] || t('profile_screen.cv.view')}
                          </a>
                          <p className="text-xs text-gray-500">
                            {t('profile_screen.validation.click_to_view')}
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
                        <p className="text-sm font-medium text-gray-700">{t('profile_screen.cv.none')}</p>
                        <p className="text-xs text-gray-500 mt-1">{t('profile_screen.cv.none_hint')}</p>
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
                              <p className="text-sm font-semibold text-gray-900 mb-2">{t('profile_screen.cv.current')}</p>
                              <a
                                href={cvUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 underline font-medium mb-2 break-all"
                              >
                                <FileText size={16} />
                                {cvUrl.split('/').pop().split('?')[0] || t('profile_screen.cv.view')}
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
                        {cvUrl ? t('profile_screen.cv.update') : t('profile_screen.cv.upload')}
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
                              <p className="text-sm text-gray-600">{t('profile_screen.cv.uploading')}</p>
                            </>
                          ) : (
                            <>
                              <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                              <p className="text-sm text-gray-600">
                                {cvUrl ? t('profile_screen.cv.update') : t('profile_screen.cv.upload')}
                              </p>
                              <p className="text-xs text-gray-400 mt-1">{t('profile_screen.cv.hint')}</p>
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

            {/* Passport Copy Section */}
            <div className="pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center">
                    <FileText className="text-blue-600" size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{t('profile_screen.sections.passport.title')}</h3>
                    <p className="text-sm text-gray-500">{t('profile_screen.sections.passport.subtitle')}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {/* Current Passport Display */}
                {passportUrl && !isEditingProfile && (
                  <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <FileText className="text-blue-600 flex-shrink-0 mt-1" size={24} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 mb-2">{t('profile_screen.passport.current')}</p>
                          <a
                            href={passportUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 underline font-medium mb-2 break-all"
                          >
                            <FileText size={16} />
                            {passportUrl.split('/').pop().split('?')[0] || t('profile_screen.passport.view')}
                          </a>
                          <p className="text-xs text-gray-500">
                            Click the link above to view your current passport in a new tab
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* No Passport Message */}
                {!passportUrl && !uploadingPassport && !isEditingProfile && (
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-3">
                      <FileText className="text-gray-400" size={20} />
                      <div>
                        <p className="text-sm font-medium text-gray-700">{t('profile_screen.passport.none')}</p>
                        <p className="text-xs text-gray-500 mt-1">{t('profile_screen.passport.none_hint')}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Upload/Edit Passport */}
                {isEditingProfile && (
                  <div className="space-y-3">
                    {passportUrl && (
                      <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <FileText className="text-blue-600 flex-shrink-0 mt-1" size={24} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 mb-2">{t('profile_screen.passport.current')}</p>
                              <a
                                href={passportUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 underline font-medium mb-2 break-all"
                              >
                                <FileText size={16} />
                                {passportUrl.split('/').pop().split('?')[0] || t('profile_screen.passport.view')}
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {passportUrl ? t('profile_screen.passport.update') : t('profile_screen.passport.upload')}
                      </label>
                      <label className="flex items-center justify-center w-full px-4 py-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors cursor-pointer">
                        <input
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,application/pdf"
                          onChange={handlePassportFileSelect}
                          disabled={uploadingPassport}
                          className="hidden"
                        />
                        <div className="text-center">
                          {uploadingPassport ? (
                            <>
                              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent mx-auto mb-2"></div>
                              <p className="text-sm text-gray-600">{t('profile_screen.passport.processing')}</p>
                            </>
                          ) : (
                            <>
                              <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                              <p className="text-sm text-gray-600">
                                {passportUrl ? t('profile_screen.passport.update') : t('profile_screen.passport.upload')}
                              </p>
                              <p className="text-xs text-gray-400 mt-1">{t('profile_screen.passport.hint')}</p>
                            </>
                          )}
                        </div>
                      </label>
                      {errors.passport && (
                        <p className="mt-2 text-sm text-red-600">{errors.passport}</p>
                      )}
                      {passportFile && (
                        <p className="mt-2 text-sm text-green-600 flex items-center gap-2">
                          <CheckCircle size={16} />
                          Passport file selected: {passportFile.name}
                        </p>
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
              <h2 className="text-xl font-semibold text-gray-900">{t('profile_screen.sections.certificates.title')}</h2>
              <p className="text-sm text-gray-500">{t('profile_screen.sections.certificates.subtitle')}</p>
            </div>
            {isEditingProfile && (
              <Button
                type="button"
                variant="secondary"
                onClick={handleAddNewCertificate}
                icon={<Award size={18} />}
              >
                {t('profile_screen.certificates.add')}
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
                            <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile_screen.certificates.name')}</label>
                            <p className="text-sm text-gray-900">{cert.name}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile_screen.certificates.issue_date')}</label>
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
                              {t('profile_screen.certificates.view')}
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
                <h3 className="text-sm font-semibold text-gray-700">{t('profile_screen.certificates.new_title')}</h3>
                {newCertificates.map((cert, index) => (
                  <div key={index} className="p-4 border-2 border-dashed border-primary-300 rounded-lg bg-primary-50">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <FormInput
                            label={t('profile_screen.certificates.name')}
                            value={cert.name}
                            onChange={(e) => handleUpdateNewCertificate(index, 'name', e.target.value)}
                            required
                            error={errors[`new_certificates.${index}.name`]}
                          />
                          <FormInput
                            label={t('profile_screen.certificates.issue_date')}
                            type="date"
                            value={cert.issue_date}
                            onChange={(e) => handleUpdateNewCertificate(index, 'issue_date', e.target.value)}
                            required
                            error={errors[`new_certificates.${index}.issue_date`]}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('profile_screen.certificates.file')} *
                          </label>
                          <input
                            type="file"
                            accept=".pdf,application/pdf"
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (file) {
                                if (file.type !== 'application/pdf') {
                                  setErrors({ [`new_certificates.${index}.file`]: t('profile_screen.validation.file_type') });
                                  return;
                                }
                                if (file.size > 10 * 1024 * 1024) {
                                  setErrors({ [`new_certificates.${index}.file`]: t('profile_screen.validation.file_size') });
                                  return;
                                }
                                handleUpdateNewCertificate(index, 'file', file);
                              }
                            }}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                            required
                          />
                          {cert.file && (
                            <p className="mt-1 text-xs text-gray-500">{t('profile_screen.certificates.selected')} {cert.file.name}</p>
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
                <p>{t('profile_screen.certificates.none')}</p>
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
                  {t('profile_screen.buttons.cancel')}
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
                  {t('profile_screen.buttons.save')}
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
              <h2 className="text-xl font-semibold text-gray-900">{t('profile_screen.sections.password.title')}</h2>
              <p className="text-sm text-gray-500">{t('profile_screen.sections.password.subtitle')}</p>
            </div>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-5">
            <FormInput
              label={t('profile_screen.password.current')}
              type="password"
              name="current_password"
              value={passwordData.current_password}
              onChange={handlePasswordChange}
              required
              error={errors.current_password}
              placeholder={t('profile_screen.password.current_placeholder')}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <FormInput
                label={t('profile_screen.password.new')}
                type="password"
                name="password"
                value={passwordData.password}
                onChange={handlePasswordChange}
                required
                error={errors.password}
                placeholder={t('profile_screen.password.new_placeholder')}
              />

              <FormInput
                label={t('profile_screen.password.confirm')}
                type="password"
                name="password_confirmation"
                value={passwordData.password_confirmation}
                onChange={handlePasswordChange}
                required
                error={errors.password_confirmation}
                placeholder={t('profile_screen.password.confirm_placeholder')}
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
                {t('profile_screen.password.submit')}
              </Button>
            </div>
          </form>
        </div>

        {/* Language Settings Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center mb-6 pb-4 border-b border-gray-200">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center mr-4">
              <Globe className="text-blue-600" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{t('profile_screen.sections.language.title')}</h2>
              <p className="text-sm text-gray-500">{t('profile_screen.sections.language.subtitle')}</p>
            </div>
          </div>

          <div className="profile-form-grid">
            <FormInput
              label={t('profile_screen.sections.language.application_language')}
              type="select"
              value={currentLanguage}
              onChange={(e) => changeLanguage(e.target.value)}
              options={Object.keys(languages).map((code) => ({
                value: code,
                label: languages[code],
              }))}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstructorProfileScreen;
