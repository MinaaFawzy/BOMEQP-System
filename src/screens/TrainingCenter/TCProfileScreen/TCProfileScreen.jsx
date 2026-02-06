import { useEffect, useState } from 'react';
import { useTranslation } from '../../../hooks/useTranslation';
import { trainingCenterAPI, publicAPI } from '../../../services/api';
import { useHeader } from '../../../context/HeaderContext';
import { validateEmail, validatePhone, validateRequired, validatePassword, validatePasswordConfirmation } from '../../../utils/validation';
import {
  User, Building2, Mail, Phone, MapPin, Globe, Save, Edit, X, Upload, CheckCircle, AlertCircle,
  FileText, Briefcase, Users, Building, Hash, Printer, Lock, KeyRound
} from 'lucide-react';
import FormInput from '../../../components/FormInput/FormInput';
import Button from '../../../components/Button/Button';
import LanguageSwitcher from '../../../components/LanguageSwitcher/LanguageSwitcher';
import './TCProfileScreen.css';
import '../../../components/FormInput/FormInput.css';

const TCProfileScreen = () => {
  const { t, currentLanguage, changeLanguage, languages } = useTranslation('training_center');
  const { setHeaderTitle, setHeaderSubtitle } = useHeader();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');

  // Countries list
  const [countries, setCountries] = useState([]);
  const [loadingCountries, setLoadingCountries] = useState(false);

  const [formData, setFormData] = useState({
    // Company Information
    user_name: '', // User's personal name
    name: '',
    website: '',
    email: '',
    phone: '',
    fax: '',
    training_provider_type: '',

    // Physical Address
    address: '',
    city: '',
    country: '',
    physical_postal_code: '',

    // Mailing Address
    mailing_same_as_physical: true,
    mailing_address: '',
    mailing_city: '',
    mailing_country: '',
    mailing_postal_code: '',

    // Primary Contact
    primary_contact_title: '',
    primary_contact_first_name: '',
    primary_contact_last_name: '',
    primary_contact_email: '',
    primary_contact_country: '',
    primary_contact_mobile: '',

    // Secondary Contact
    has_secondary_contact: false,
    secondary_contact_title: '',
    secondary_contact_first_name: '',
    secondary_contact_last_name: '',
    secondary_contact_email: '',
    secondary_contact_country: '',
    secondary_contact_mobile: '',

    // Additional Information
    company_gov_registry_number: '',
    company_registration_certificate: null,
    company_registration_certificate_url: '',
    facility_floorplan: null,
    facility_floorplan_url: '',
    interested_fields: [],
    how_did_you_hear_about_us: '',

    // Logo
    logo: null,
    logo_url: '',
  });

  // Password change state
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    password: '',
    password_confirmation: '',
  });

  const titleOptions = ['Mr.', 'Mrs.', 'Eng.', 'Prof.'];
  const trainingProviderTypes = ['Training Center', 'Institute', 'University'];
  const interestedFieldsOptions = ['QHSE', 'Food Safety', 'Management'];

  useEffect(() => {
    setHeaderTitle(t('tc_profile_screen.header.title'));
    setHeaderSubtitle(t('tc_profile_screen.header.subtitle'));
    return () => {
      setHeaderTitle(null);
      setHeaderSubtitle(null);
    };
  }, [setHeaderTitle, setHeaderSubtitle, t]);

  useEffect(() => {
    loadCountries();
    loadProfile();
  }, []);

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

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await trainingCenterAPI.getProfile();
      const data = response?.profile || response?.training_center || response?.data || response;

      if (data) {
        setProfile(data);
        setFormData({
          // Company Information
          user_name: data.user_name || '',
          name: data.name || '',
          website: data.website || '',
          email: data.email || '',
          phone: data.phone || '',
          fax: data.fax || '',
          training_provider_type: data.training_provider_type || '',

          // Physical Address
          address: data.address || '',
          city: data.city || '',
          country: data.country || '',
          physical_postal_code: data.physical_postal_code || '',

          // Mailing Address
          mailing_same_as_physical: data.mailing_same_as_physical !== false,
          mailing_address: data.mailing_address || '',
          mailing_city: data.mailing_city || '',
          mailing_country: data.mailing_country || '',
          mailing_postal_code: data.mailing_postal_code || '',

          // Primary Contact
          primary_contact_title: data.primary_contact_title || '',
          primary_contact_first_name: data.primary_contact_first_name || '',
          primary_contact_last_name: data.primary_contact_last_name || '',
          primary_contact_email: data.primary_contact_email || '',
          primary_contact_country: data.primary_contact_country || '',
          primary_contact_mobile: data.primary_contact_mobile || '',

          // Secondary Contact
          has_secondary_contact: data.has_secondary_contact || false,
          secondary_contact_title: data.secondary_contact_title || '',
          secondary_contact_first_name: data.secondary_contact_first_name || '',
          secondary_contact_last_name: data.secondary_contact_last_name || '',
          secondary_contact_email: data.secondary_contact_email || '',
          secondary_contact_country: data.secondary_contact_country || '',
          secondary_contact_mobile: data.secondary_contact_mobile || '',

          // Additional Information
          company_gov_registry_number: data.company_gov_registry_number || '',
          company_registration_certificate: null,
          company_registration_certificate_url: data.company_registration_certificate_url || '',
          facility_floorplan: null,
          facility_floorplan_url: data.facility_floorplan_url || '',
          interested_fields: Array.isArray(data.interested_fields) ? data.interested_fields : [],
          how_did_you_hear_about_us: data.how_did_you_hear_about_us || '',

          // Logo
          logo: null,
          logo_url: data.logo || data.logo_url || '',
        });
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
      setErrors({ general: t('tc_profile_screen.errors.load_failed') });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, files, type, checked } = e.target;

    if (type === 'file' && files && files[0]) {
      const file = files[0];

      // Validate file based on field
      if (name === 'logo') {
        if (!file.type.startsWith('image/')) {
          setErrors({ ...errors, logo: 'Please select an image file' });
          return;
        }
        if (file.size > 5 * 1024 * 1024) {
          setErrors({ ...errors, logo: 'Image size must be less than 5MB' });
          return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
          setFormData({ ...formData, logo: file, logo_url: reader.result });
        };
        reader.readAsDataURL(file);
      } else if (name === 'company_registration_certificate' || name === 'facility_floorplan') {
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
        if (!allowedTypes.includes(file.type)) {
          setErrors({ ...errors, [name]: 'Please select a PDF, JPEG, or PNG file' });
          return;
        }
        if (file.size > 10 * 1024 * 1024) {
          setErrors({ ...errors, [name]: t('tc_profile_screen.sections.additional_info.registration_formats') });
          return;
        }
        setFormData({ ...formData, [name]: file });
      }
      setErrors({ ...errors, [name]: null });
    } else if (type === 'checkbox') {
      if (name === 'mailing_same_as_physical') {
        setFormData({
          ...formData,
          [name]: checked,
          // Clear mailing address if same as physical
          ...(checked && {
            mailing_address: '',
            mailing_city: '',
            mailing_country: '',
            mailing_postal_code: ''
          })
        });
      } else if (name === 'has_secondary_contact') {
        setFormData({
          ...formData,
          [name]: checked,
          // Clear secondary contact if unchecked
          ...(!checked && {
            secondary_contact_title: '',
            secondary_contact_first_name: '',
            secondary_contact_last_name: '',
            secondary_contact_email: '',
            secondary_contact_country: '',
            secondary_contact_mobile: ''
          })
        });
      } else {
        setFormData({ ...formData, [name]: checked });
      }
    } else {
      setFormData({ ...formData, [name]: value });
      if (errors[name]) {
        setErrors({ ...errors, [name]: null });
      }
    }
  };

  const handleInterestedFieldsChange = (field) => {
    const currentFields = formData.interested_fields || [];
    const newFields = currentFields.includes(field)
      ? currentFields.filter(f => f !== field)
      : [...currentFields, field];
    setFormData({ ...formData, interested_fields: newFields });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    setSuccessMessage('');

    // Validation
    const validationErrors = {};

    // Company Information
    if (!formData.user_name) validationErrors.user_name = 'User name is required';
    if (!formData.name) validationErrors.name = 'Company name is required';
    if (!formData.email) validationErrors.email = 'Email is required';
    else if (validateEmail(formData.email)) validationErrors.email = validateEmail(formData.email);
    if (!formData.phone) validationErrors.phone = 'Phone is required';
    if (!formData.training_provider_type) validationErrors.training_provider_type = 'Training provider type is required';

    // Physical Address
    if (!formData.address) validationErrors.address = 'Address is required';
    if (!formData.city) validationErrors.city = 'City is required';
    if (!formData.country) validationErrors.country = 'Country is required';
    if (!formData.physical_postal_code) validationErrors.physical_postal_code = 'Postal code is required';

    // Mailing Address (if not same as physical)
    if (!formData.mailing_same_as_physical) {
      if (!formData.mailing_address) validationErrors.mailing_address = 'Mailing address is required';
      if (!formData.mailing_city) validationErrors.mailing_city = 'Mailing city is required';
      if (!formData.mailing_country) validationErrors.mailing_country = 'Mailing country is required';
      if (!formData.mailing_postal_code) validationErrors.mailing_postal_code = 'Mailing postal code is required';
    }

    // Primary Contact
    if (!formData.primary_contact_title) validationErrors.primary_contact_title = 'Title is required';
    if (!formData.primary_contact_first_name) validationErrors.primary_contact_first_name = 'First name is required';
    if (!formData.primary_contact_last_name) validationErrors.primary_contact_last_name = 'Last name is required';
    if (!formData.primary_contact_email) validationErrors.primary_contact_email = 'Email is required';
    if (!formData.primary_contact_country) validationErrors.primary_contact_country = 'Country is required';
    if (!formData.primary_contact_mobile) validationErrors.primary_contact_mobile = 'Mobile is required';

    // Secondary Contact (if enabled)
    if (formData.has_secondary_contact) {
      if (!formData.secondary_contact_title) validationErrors.secondary_contact_title = 'Title is required';
      if (!formData.secondary_contact_first_name) validationErrors.secondary_contact_first_name = 'First name is required';
      if (!formData.secondary_contact_last_name) validationErrors.secondary_contact_last_name = 'Last name is required';
      if (!formData.secondary_contact_email) validationErrors.secondary_contact_email = 'Email is required';
      if (!formData.secondary_contact_country) validationErrors.secondary_contact_country = 'Country is required';
      if (!formData.secondary_contact_mobile) validationErrors.secondary_contact_mobile = 'Mobile is required';
    }

    // Additional Information
    if (!formData.company_gov_registry_number) validationErrors.company_gov_registry_number = 'Company GOV Registry Number is required';
    if (!formData.company_registration_certificate && !formData.company_registration_certificate_url) {
      validationErrors.company_registration_certificate = 'Company Registration Certificate is required';
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setSaving(false);
      return;
    }

    try {
      const submitData = new FormData();

      // Company Information
      submitData.append('user_name', formData.user_name);
      submitData.append('name', formData.name);
      if (formData.website) submitData.append('website', formData.website);
      submitData.append('email', formData.email);
      submitData.append('phone', formData.phone);
      if (formData.fax) submitData.append('fax', formData.fax);
      submitData.append('training_provider_type', formData.training_provider_type);

      // Physical Address
      submitData.append('address', formData.address);
      submitData.append('city', formData.city);
      submitData.append('country', formData.country);
      submitData.append('physical_postal_code', formData.physical_postal_code);

      // Mailing Address - send as 1 or 0 for boolean
      submitData.append('mailing_same_as_physical', formData.mailing_same_as_physical ? 1 : 0);
      // Always send mailing address fields (empty if same as physical)
      submitData.append('mailing_address', formData.mailing_same_as_physical ? '' : formData.mailing_address);
      submitData.append('mailing_city', formData.mailing_same_as_physical ? '' : formData.mailing_city);
      submitData.append('mailing_country', formData.mailing_same_as_physical ? '' : formData.mailing_country);
      submitData.append('mailing_postal_code', formData.mailing_same_as_physical ? '' : formData.mailing_postal_code);

      // Primary Contact
      submitData.append('primary_contact_title', formData.primary_contact_title);
      submitData.append('primary_contact_first_name', formData.primary_contact_first_name);
      submitData.append('primary_contact_last_name', formData.primary_contact_last_name);
      submitData.append('primary_contact_email', formData.primary_contact_email);
      submitData.append('primary_contact_country', formData.primary_contact_country);
      submitData.append('primary_contact_mobile', formData.primary_contact_mobile);

      // Secondary Contact - send as 1 or 0 for boolean
      submitData.append('has_secondary_contact', formData.has_secondary_contact ? 1 : 0);
      // Always send secondary contact fields (empty if not needed)
      submitData.append('secondary_contact_title', formData.has_secondary_contact ? formData.secondary_contact_title : '');
      submitData.append('secondary_contact_first_name', formData.has_secondary_contact ? formData.secondary_contact_first_name : '');
      submitData.append('secondary_contact_last_name', formData.has_secondary_contact ? formData.secondary_contact_last_name : '');
      submitData.append('secondary_contact_email', formData.has_secondary_contact ? formData.secondary_contact_email : '');
      submitData.append('secondary_contact_country', formData.has_secondary_contact ? formData.secondary_contact_country : '');
      submitData.append('secondary_contact_mobile', formData.has_secondary_contact ? formData.secondary_contact_mobile : '');

      // Additional Information
      submitData.append('company_gov_registry_number', formData.company_gov_registry_number);
      if (formData.company_registration_certificate instanceof File) {
        submitData.append('company_registration_certificate', formData.company_registration_certificate);
      }
      if (formData.facility_floorplan instanceof File) {
        submitData.append('facility_floorplan', formData.facility_floorplan);
      }
      if (formData.interested_fields && formData.interested_fields.length > 0) {
        formData.interested_fields.forEach((field, index) => {
          submitData.append(`interested_fields[${index}]`, field);
        });
      }
      if (formData.how_did_you_hear_about_us) {
        submitData.append('how_did_you_hear_about_us', formData.how_did_you_hear_about_us);
      }

      // Logo
      if (formData.logo instanceof File) {
        submitData.append('logo', formData.logo);
      }

      // Update profile
      const response = await trainingCenterAPI.updateProfile(submitData);

      setSuccessMessage(t('tc_profile_screen.messages.profile_updated'));
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
          setErrors({ general: t('tc_profile_screen.errors.update_failed') });
        }
      } else if (error.message) {
        setErrors({ general: error.message });
      } else {
        setErrors({ general: t('tc_profile_screen.errors.update_failed') });
      }
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    setSuccessMessage('');

    // Validation
    const passwordErrors = {};
    if (!passwordData.current_password) {
      passwordErrors.current_password = 'Current password is required';
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
      setSuccessMessage(t('tc_profile_screen.messages.password_changed'));
      setPasswordData({
        current_password: '',
        password: '',
        password_confirmation: '',
      });
      // Scroll to top to show success message
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      if (error.errors) {
        setErrors(error.errors);
      } else {
        setErrors({ password: error.message || t('tc_profile_screen.errors.password_change_failed') });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setErrors({});
    loadProfile();
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
            <h1 className="profile-name">{formData.name || t('tc_profile_screen.common.training_center')}</h1>
            <p className="profile-email">{formData.email || t('tc_profile_screen.common.no_email')}</p>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="profile-edit-btn"
              >
                <Edit size={18} />
                {t('tc_profile_screen.actions.edit')}
              </button>
            )}
          </div>
        </div>

        {/* Profile Form */}
        <form onSubmit={handleSubmit} className="profile-form">
          {/* 1. Company Information */}
          <div className="profile-form-section">
            <div className="flex items-center mb-6 pb-4 border-b border-gray-200">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center mr-4">
                <Building2 className="text-blue-600" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{t('tc_profile_screen.sections.company_info.title')}</h2>
                <p className="text-sm text-gray-500">{t('tc_profile_screen.sections.company_info.subtitle')}</p>
              </div>
            </div>
            <div className="profile-form-grid">
              <FormInput
                label={t('tc_profile_screen.sections.company_info.user_name')}
                name="user_name"
                value={formData.user_name}
                onChange={handleChange}
                required
                disabled={!isEditing}
                error={errors.user_name}
              />
              <FormInput
                label={t('tc_profile_screen.sections.company_info.company_name')}
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                disabled={!isEditing}
                error={errors.name}
              />
              <FormInput
                label={t('tc_profile_screen.sections.company_info.website')}
                name="website"
                type="url"
                value={formData.website}
                onChange={handleChange}
                disabled={!isEditing}
                error={errors.website}
                placeholder="https://example.com"
              />
              <FormInput
                label={t('tc_profile_screen.sections.company_info.email')}
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={!isEditing}
                error={errors.email}
              />
              <FormInput
                label={t('tc_profile_screen.sections.company_info.phone')}
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                required
                disabled={!isEditing}
                error={errors.phone}
              />
              <FormInput
                label={t('tc_profile_screen.sections.company_info.fax')}
                name="fax"
                type="tel"
                value={formData.fax}
                onChange={handleChange}
                disabled={!isEditing}
                error={errors.fax}
              />
              <FormInput
                label={t('tc_profile_screen.sections.company_info.training_provider_type')}
                name="training_provider_type"
                type="select"
                value={formData.training_provider_type}
                onChange={handleChange}
                required
                disabled={!isEditing}
                error={errors.training_provider_type}
                options={[
                  { value: '', label: t('tc_profile_screen.sections.company_info.select_type') },
                  ...trainingProviderTypes.map(type => ({ value: type, label: type }))
                ]}
              />
            </div>
          </div>

          {/* 2. Physical Address */}
          <div className="profile-form-section">
            <div className="flex items-center mb-6 pb-4 border-b border-gray-200">
              <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-green-200 rounded-xl flex items-center justify-center mr-4">
                <MapPin className="text-green-600" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{t('tc_profile_screen.sections.physical_address.title')}</h2>
                <p className="text-sm text-gray-500">{t('tc_profile_screen.sections.physical_address.subtitle')}</p>
              </div>
            </div>
            <div className="profile-form-grid">
              <FormInput
                label={t('tc_profile_screen.sections.physical_address.address')}
                name="address"
                value={formData.address}
                onChange={handleChange}
                required
                disabled={!isEditing}
                error={errors.address}
              />
              <FormInput
                label={t('tc_profile_screen.sections.physical_address.city')}
                name="city"
                value={formData.city}
                onChange={handleChange}
                required
                disabled={!isEditing}
                error={errors.city}
              />
              <FormInput
                label={t('tc_profile_screen.sections.physical_address.country')}
                name="country"
                type="select"
                value={formData.country}
                onChange={handleChange}
                required
                disabled={!isEditing || loadingCountries}
                error={errors.country}
                options={[
                  { value: '', label: t('tc_profile_screen.sections.physical_address.select_country') },
                  ...countries.map(c => ({ value: c.code, label: c.name }))
                ]}
              />
              <FormInput
                label={t('tc_profile_screen.sections.physical_address.postal_code')}
                name="physical_postal_code"
                value={formData.physical_postal_code}
                onChange={handleChange}
                required
                disabled={!isEditing}
                error={errors.physical_postal_code}
              />
            </div>
          </div>

          {/* 3. Mailing Address */}
          <div className="profile-form-section">
            <div className="flex items-center mb-6 pb-4 border-b border-gray-200">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl flex items-center justify-center mr-4">
                <Mail className="text-purple-600" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{t('tc_profile_screen.sections.mailing_address.title')}</h2>
                <p className="text-sm text-gray-500">{t('tc_profile_screen.sections.mailing_address.subtitle')}</p>
              </div>
            </div>
            <div className="mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="mailing_same_as_physical"
                  checked={formData.mailing_same_as_physical}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700">{t('tc_profile_screen.sections.mailing_address.same_as_physical')}</span>
              </label>
            </div>
            {!formData.mailing_same_as_physical && (
              <div className="profile-form-grid">
                <FormInput
                  label={t('tc_profile_screen.sections.mailing_address.address')}
                  name="mailing_address"
                  value={formData.mailing_address}
                  onChange={handleChange}
                  required={!formData.mailing_same_as_physical}
                  disabled={!isEditing}
                  error={errors.mailing_address}
                />
                <FormInput
                  label={t('tc_profile_screen.sections.mailing_address.city')}
                  name="mailing_city"
                  value={formData.mailing_city}
                  onChange={handleChange}
                  required={!formData.mailing_same_as_physical}
                  disabled={!isEditing}
                  error={errors.mailing_city}
                />
                <FormInput
                  label={t('tc_profile_screen.sections.mailing_address.country')}
                  name="mailing_country"
                  type="select"
                  value={formData.mailing_country}
                  onChange={handleChange}
                  required={!formData.mailing_same_as_physical}
                  disabled={!isEditing || loadingCountries}
                  error={errors.mailing_country}
                  options={[
                    { value: '', label: t('tc_profile_screen.sections.physical_address.select_country') },
                    ...countries.map(c => ({ value: c.code, label: c.name }))
                  ]}
                />
                <FormInput
                  label={t('tc_profile_screen.sections.mailing_address.postal_code')}
                  name="mailing_postal_code"
                  value={formData.mailing_postal_code}
                  onChange={handleChange}
                  required={!formData.mailing_same_as_physical}
                  disabled={!isEditing}
                  error={errors.mailing_postal_code}
                />
              </div>
            )}
          </div>

          {/* 4. Primary Contact */}
          <div className="profile-form-section">
            <div className="flex items-center mb-6 pb-4 border-b border-gray-200">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-orange-200 rounded-xl flex items-center justify-center mr-4">
                <User className="text-orange-600" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{t('tc_profile_screen.sections.primary_contact.title')}</h2>
                <p className="text-sm text-gray-500">{t('tc_profile_screen.sections.primary_contact.subtitle')}</p>
              </div>
            </div>
            <div className="profile-form-grid">
              <FormInput
                label={t('tc_profile_screen.sections.primary_contact.contact_title')}
                name="primary_contact_title"
                type="select"
                value={formData.primary_contact_title}
                onChange={handleChange}
                required
                disabled={!isEditing}
                error={errors.primary_contact_title}
                options={[
                  { value: '', label: t('tc_profile_screen.sections.primary_contact.select_title') },
                  ...titleOptions.map(title => ({ value: title, label: title }))
                ]}
              />
              <FormInput
                label={t('tc_profile_screen.sections.primary_contact.first_name')}
                name="primary_contact_first_name"
                value={formData.primary_contact_first_name}
                onChange={handleChange}
                required
                disabled={!isEditing}
                error={errors.primary_contact_first_name}
              />
              <FormInput
                label={t('tc_profile_screen.sections.primary_contact.last_name')}
                name="primary_contact_last_name"
                value={formData.primary_contact_last_name}
                onChange={handleChange}
                required
                disabled={!isEditing}
                error={errors.primary_contact_last_name}
              />
              <FormInput
                label={t('tc_profile_screen.sections.primary_contact.email')}
                name="primary_contact_email"
                type="email"
                value={formData.primary_contact_email}
                onChange={handleChange}
                required
                disabled={!isEditing}
                error={errors.primary_contact_email}
              />
              <FormInput
                label={t('tc_profile_screen.sections.primary_contact.country')}
                name="primary_contact_country"
                type="select"
                value={formData.primary_contact_country}
                onChange={handleChange}
                required
                disabled={!isEditing || loadingCountries}
                error={errors.primary_contact_country}
                options={[
                  { value: '', label: t('tc_profile_screen.sections.physical_address.select_country') },
                  ...countries.map(c => ({ value: c.code, label: c.name }))
                ]}
              />
              <FormInput
                label={t('tc_profile_screen.sections.primary_contact.mobile')}
                name="primary_contact_mobile"
                type="tel"
                value={formData.primary_contact_mobile}
                onChange={handleChange}
                required
                disabled={!isEditing}
                error={errors.primary_contact_mobile}
              />
            </div>
          </div>

          {/* 5. Secondary Contact */}
          <div className="profile-form-section">
            <div className="flex items-center mb-6 pb-4 border-b border-gray-200">
              <div className="w-12 h-12 bg-gradient-to-br from-cyan-100 to-cyan-200 rounded-xl flex items-center justify-center mr-4">
                <Users className="text-cyan-600" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{t('tc_profile_screen.sections.secondary_contact.title')}</h2>
                <p className="text-sm text-gray-500">{t('tc_profile_screen.sections.secondary_contact.subtitle')}</p>
              </div>
            </div>
            <div className="mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="has_secondary_contact"
                  checked={formData.has_secondary_contact}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700">{t('tc_profile_screen.sections.secondary_contact.add')}</span>
              </label>
            </div>
            {formData.has_secondary_contact && (
              <div className="profile-form-grid">
                <FormInput
                  label={t('tc_profile_screen.sections.secondary_contact.contact_title')}
                  name="secondary_contact_title"
                  type="select"
                  value={formData.secondary_contact_title}
                  onChange={handleChange}
                  required={formData.has_secondary_contact}
                  disabled={!isEditing}
                  error={errors.secondary_contact_title}
                  options={[
                    { value: '', label: t('tc_profile_screen.sections.primary_contact.select_title') },
                    ...titleOptions.map(title => ({ value: title, label: title }))
                  ]}
                />
                <FormInput
                  label={t('tc_profile_screen.sections.secondary_contact.first_name')}
                  name="secondary_contact_first_name"
                  value={formData.secondary_contact_first_name}
                  onChange={handleChange}
                  required={formData.has_secondary_contact}
                  disabled={!isEditing}
                  error={errors.secondary_contact_first_name}
                />
                <FormInput
                  label={t('tc_profile_screen.sections.secondary_contact.last_name')}
                  name="secondary_contact_last_name"
                  value={formData.secondary_contact_last_name}
                  onChange={handleChange}
                  required={formData.has_secondary_contact}
                  disabled={!isEditing}
                  error={errors.secondary_contact_last_name}
                />
                <FormInput
                  label={t('tc_profile_screen.sections.secondary_contact.email')}
                  name="secondary_contact_email"
                  type="email"
                  value={formData.secondary_contact_email}
                  onChange={handleChange}
                  required={formData.has_secondary_contact}
                  disabled={!isEditing}
                  error={errors.secondary_contact_email}
                />
                <FormInput
                  label={t('tc_profile_screen.sections.secondary_contact.country')}
                  name="secondary_contact_country"
                  type="select"
                  value={formData.secondary_contact_country}
                  onChange={handleChange}
                  required={formData.has_secondary_contact}
                  disabled={!isEditing || loadingCountries}
                  error={errors.secondary_contact_country}
                  options={[
                    { value: '', label: t('tc_profile_screen.sections.physical_address.select_country') },
                    ...countries.map(c => ({ value: c.code, label: c.name }))
                  ]}
                />
                <FormInput
                  label={t('tc_profile_screen.sections.secondary_contact.mobile')}
                  name="secondary_contact_mobile"
                  type="tel"
                  value={formData.secondary_contact_mobile}
                  onChange={handleChange}
                  required={formData.has_secondary_contact}
                  disabled={!isEditing}
                  error={errors.secondary_contact_mobile}
                />
              </div>
            )}
          </div>

          {/* 6. Additional Information */}
          <div className="profile-form-section">
            <div className="flex items-center mb-6 pb-4 border-b border-gray-200">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-xl flex items-center justify-center mr-4">
                <FileText className="text-indigo-600" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{t('tc_profile_screen.sections.additional_info.title')}</h2>
                <p className="text-sm text-gray-500">{t('tc_profile_screen.sections.additional_info.subtitle')}</p>
              </div>
            </div>
            <div className="profile-form-grid">
              <FormInput
                label={t('tc_profile_screen.sections.additional_info.gov_registry_number')}
                name="company_gov_registry_number"
                value={formData.company_gov_registry_number}
                onChange={handleChange}
                required
                disabled={!isEditing}
                error={errors.company_gov_registry_number}
              />
            </div>

            {/* Company Registration Certificate */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('tc_profile_screen.sections.additional_info.registration_certificate')} <span className="text-red-500">*</span>
              </label>
              {formData.company_registration_certificate_url && !formData.company_registration_certificate && (
                <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <a
                    href={formData.company_registration_certificate_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary-600 hover:underline flex items-center gap-2"
                  >
                    <FileText size={16} />
                    {t('tc_profile_screen.sections.additional_info.view_current_certificate')}
                  </a>
                </div>
              )}
              {isEditing && (
                <div>
                  <input
                    type="file"
                    name="company_registration_certificate"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleChange}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                  />
                  <p className="mt-1 text-xs text-gray-500">{t('tc_profile_screen.sections.additional_info.registration_formats')}</p>
                  {errors.company_registration_certificate && (
                    <p className="mt-1 text-sm text-red-600">{errors.company_registration_certificate}</p>
                  )}
                  {formData.company_registration_certificate && (
                    <p className="mt-2 text-sm text-green-600 flex items-center gap-2">
                      <CheckCircle size={16} />
                      File selected: {formData.company_registration_certificate.name}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Facility Floorplan */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('tc_profile_screen.sections.additional_info.facility_floorplan')}
              </label>
              {formData.facility_floorplan_url && !formData.facility_floorplan && (
                <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <a
                    href={formData.facility_floorplan_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary-600 hover:underline flex items-center gap-2"
                  >
                    <FileText size={16} />
                    {t('tc_profile_screen.sections.additional_info.view_current_floorplan')}
                  </a>
                </div>
              )}
              {isEditing && (
                <div>
                  <input
                    type="file"
                    name="facility_floorplan"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleChange}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                  />
                  <p className="mt-1 text-xs text-gray-500">{t('tc_profile_screen.sections.additional_info.registration_formats')}</p>
                  {errors.facility_floorplan && (
                    <p className="mt-1 text-sm text-red-600">{errors.facility_floorplan}</p>
                  )}
                  {formData.facility_floorplan && (
                    <p className="mt-2 text-sm text-green-600 flex items-center gap-2">
                      <CheckCircle size={16} />
                      File selected: {formData.facility_floorplan.name}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Interested Fields */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('tc_profile_screen.sections.additional_info.interested_fields')}
              </label>
              <div className="space-y-2">
                {interestedFieldsOptions.map(field => (
                  <label key={field} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.interested_fields.includes(field)}
                      onChange={() => handleInterestedFieldsChange(field)}
                      disabled={!isEditing}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-700">{field}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* How did you hear about us */}
            <div className="mt-4">
              <FormInput
                label={t('tc_profile_screen.sections.additional_info.how_did_you_hear')}
                name="how_did_you_hear_about_us"
                textarea
                rows={3}
                value={formData.how_did_you_hear_about_us}
                onChange={handleChange}
                disabled={!isEditing}
                error={errors.how_did_you_hear_about_us}
                placeholder={t('tc_profile_screen.sections.additional_info.how_did_you_hear_placeholder')}
              />
            </div>
          </div>

          {/* Form Actions */}
          {isEditing && (
            <div className="profile-form-actions">
              <Button
                type="button"
                onClick={handleCancel}
                variant="outline"
                disabled={saving}
              >
                <X size={18} />
                {t('tc_profile_screen.actions.cancel')}
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={saving}
                loading={saving}
              >
                <Save size={18} />
                {saving ? t('tc_profile_screen.actions.saving') : t('tc_profile_screen.actions.save')}
              </Button>
            </div>
          )}
        </form>

        {/* Change Password Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 mt-6">
          <div className="flex items-center mb-6 pb-4 border-b border-gray-200">
            <div className="w-12 h-12 bg-gradient-to-br from-red-100 to-red-200 rounded-xl flex items-center justify-center mr-4">
              <KeyRound className="text-red-600" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{t('tc_profile_screen.password.title')}</h2>
              <p className="text-sm text-gray-500">{t('tc_profile_screen.password.subtitle')}</p>
            </div>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-5">
            <FormInput
              label={t('tc_profile_screen.password.current')}
              type="password"
              name="current_password"
              value={passwordData.current_password}
              onChange={handlePasswordChange}
              required
              error={errors.current_password}
              placeholder={t('tc_profile_screen.password.current_placeholder')}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <FormInput
                label={t('tc_profile_screen.password.new')}
                type="password"
                name="password"
                value={passwordData.password}
                onChange={handlePasswordChange}
                required
                error={errors.password}
                placeholder={t('tc_profile_screen.password.new_placeholder')}
              />

              <FormInput
                label={t('tc_profile_screen.password.confirm')}
                type="password"
                name="password_confirmation"
                value={passwordData.password_confirmation}
                onChange={handlePasswordChange}
                required
                error={errors.password_confirmation}
                placeholder={t('tc_profile_screen.password.confirm_placeholder')}
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
                {t('tc_profile_screen.password.submit')}
              </Button>
            </div>
          </form>
        </div>

        {/* Language Settings Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 mt-6">
          <div className="flex items-center mb-6 pb-4 border-b border-gray-200">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center mr-4">
              <Globe className="text-blue-600" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{t('tc_profile_screen.language.title')}</h2>
              <p className="text-sm text-gray-500">{t('tc_profile_screen.language.subtitle')}</p>
            </div>
          </div>

          <div className="profile-form-grid">
            <LanguageSwitcher
              label={t('tc_profile_screen.language.application_language')}
              className="w-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TCProfileScreen;
