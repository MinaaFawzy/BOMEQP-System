import { useEffect, useState } from 'react';
import { useTranslation } from '../../../hooks/useTranslation';
import { useAuth } from '../../../context/AuthContext';
import { useHeader } from '../../../context/HeaderContext';
import { accAPI, authAPI, publicAPI } from '../../../services/api';
import { validateEmail, validatePhone, validateRequired, validateMinLength, validatePassword, validatePasswordConfirmation } from '../../../utils/validation';
import { User, Mail, Phone, MapPin, CheckCircle, AlertCircle, Globe, Building2, FileText, Edit, X, Save, Lock, KeyRound, Upload, File, Trash2, Eye, Image as ImageIcon, Shield, Calendar, Clock, CreditCard } from 'lucide-react';
import FormInput from '../../../components/FormInput/FormInput';
import './ProfileScreen.css';
import '../../../components/FormInput/FormInput.css';

const ProfileScreen = () => {
  const { user } = useAuth();
  const { setHeaderTitle, setHeaderSubtitle } = useHeader();
  const { t, currentLanguage, changeLanguage, languages } = useTranslation('accreditation');
  const [formData, setFormData] = useState({
    // 1. Accreditation Body Information
    legal_name: '',
    email: '',
    phone: '',
    fax: '',
    website: '',

    // 2. Physical Address
    physical_street: '',
    physical_city: '',
    physical_country: '',
    physical_postal_code: '',

    // 3. Mailing Address
    mailing_same_as_physical: false,
    mailing_street: '',
    mailing_city: '',
    mailing_country: '',
    mailing_postal_code: '',

    // 4. Primary Contact
    primary_contact_title: '',
    primary_contact_first_name: '',
    primary_contact_last_name: '',
    primary_contact_email: '',
    primary_contact_country: '',
    primary_contact_mobile: '',

    // 5. Secondary Contact
    secondary_contact_title: '',
    secondary_contact_first_name: '',
    secondary_contact_last_name: '',
    secondary_contact_email: '',
    secondary_contact_country: '',
    secondary_contact_mobile: '',

    // 6. Additional Information
    company_gov_registry_number: '',
    how_did_you_hear_about_us: '',

    // 7. Agreements
    agreed_to_receive_communications: false,
    agreed_to_terms_and_conditions: false,

    // Legacy fields kept for compatibility or other logic
    name: '',
    stripe_account_id: '',
  });

  // File states
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);

  const [primaryPassportFile, setPrimaryPassportFile] = useState(null);
  const [secondaryPassportFile, setSecondaryPassportFile] = useState(null);
  const [companyCertFile, setCompanyCertFile] = useState(null);

  const [documents, setDocuments] = useState([]);
  const [newDocuments, setNewDocuments] = useState([]);
  const [updatingDocuments, setUpdatingDocuments] = useState([]);
  const [uploadingDocuments, setUploadingDocuments] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    password: '',
    password_confirmation: '',
  });
  const [changingPassword, setChangingPassword] = useState(false);
  const [verifyingStripeAccount, setVerifyingStripeAccount] = useState(false);
  const [stripeAccountInfo, setStripeAccountInfo] = useState(null);
  const [stripeAccountError, setStripeAccountError] = useState('');
  const [newDocumentType, setNewDocumentType] = useState('license');

  // Countries and Cities
  const [countries, setCountries] = useState([]);
  const [mailingCities, setMailingCities] = useState([]);
  const [physicalCities, setPhysicalCities] = useState([]);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [loadingMailingCities, setLoadingMailingCities] = useState(false);
  const [loadingPhysicalCities, setLoadingPhysicalCities] = useState(false);

  useEffect(() => {
    loadCountries();
  }, []);

  useEffect(() => {
    if (countries.length > 0) {
      loadProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countries.length]);

  // Load cities effects
  useEffect(() => {
    if (formData.mailing_country && !formData.mailing_same_as_physical) {
      loadMailingCities(formData.mailing_country);
    }
  }, [formData.mailing_country, formData.mailing_same_as_physical]);

  useEffect(() => {
    if (formData.physical_country) {
      loadPhysicalCities(formData.physical_country);
    }
  }, [formData.physical_country]);

  const loadProfile = async () => {
    try {
      setLoadingProfile(true);
      const response = await accAPI.getProfile();
      // Handle different response structures
      const profile = response?.profile || response?.acc || response?.data || response || {};
      setProfileData(profile);

      // Set documents
      setDocuments(profile.documents || []);

      // Helper to find country code
      const findCountryCode = (nameOrCode) => {
        if (!nameOrCode) return '';
        if (countries.length === 0) return nameOrCode;
        const found = countries.find(c => c.name === nameOrCode || c.code === nameOrCode);
        return found ? found.code : nameOrCode;
      };

      const physicalCountryCode = findCountryCode(profile.physical_address?.country || profile.country);
      const mailingCountryCode = findCountryCode(profile.mailing_address?.country);

      setFormData({
        // 1. Accreditation Body Information
        legal_name: profile.legal_name || '',
        email: profile.email || user?.email || '',
        phone: profile.phone || user?.phone || '',
        fax: profile.fax || '',
        website: profile.website || '',

        // 2. Physical Address
        physical_street: profile.physical_address?.street || profile.address || '',
        physical_city: profile.physical_address?.city || '',
        physical_country: physicalCountryCode,
        physical_postal_code: profile.physical_address?.postal_code || '',

        // 3. Mailing Address
        mailing_same_as_physical: profile.mailing_address?.same_as_physical ?? false,
        mailing_street: profile.mailing_address?.street || '',
        mailing_city: profile.mailing_address?.city || '',
        mailing_country: mailingCountryCode,
        mailing_postal_code: profile.mailing_address?.postal_code || '',

        // 4. Primary Contact
        primary_contact_title: profile.primary_contact?.title || '',
        primary_contact_first_name: profile.primary_contact?.first_name || '',
        primary_contact_last_name: profile.primary_contact?.last_name || '',
        primary_contact_email: profile.primary_contact?.email || '',
        primary_contact_country: findCountryCode(profile.primary_contact?.country),
        primary_contact_mobile: profile.primary_contact?.mobile || '',

        // 5. Secondary Contact
        secondary_contact_title: profile.secondary_contact?.title || '',
        secondary_contact_first_name: profile.secondary_contact?.first_name || '',
        secondary_contact_last_name: profile.secondary_contact?.last_name || '',
        secondary_contact_email: profile.secondary_contact?.email || '',
        secondary_contact_country: findCountryCode(profile.secondary_contact?.country),
        secondary_contact_mobile: profile.secondary_contact?.mobile || '',

        // 6. Additional Information
        company_gov_registry_number: profile.company_gov_registry_number || '',
        how_did_you_hear_about_us: profile.how_did_you_hear_about_us || '',

        // 7. Agreements
        agreed_to_receive_communications: profile.agreed_to_receive_communications ? true : false,
        agreed_to_terms_and_conditions: profile.agreed_to_terms_and_conditions ? true : false,

        // Legacy
        name: profile.name || user?.name || '',
        stripe_account_id: profile.stripe_account_id || '',
      });

      // Load cities if countries are set
      if (mailingCountryCode && !profile.mailing_address?.same_as_physical) {
        await loadMailingCities(mailingCountryCode);
      }
      if (physicalCountryCode) {
        await loadPhysicalCities(physicalCountryCode);
      }

      // Set logo preview if logo_url exists
      if (profile.logo_url) {
        setLogoPreview(profile.logo_url);
      } else {
        setLogoPreview(null);
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
      // Fallback to minimal data
      if (user) {
        setFormData(prev => ({ ...prev, email: user.email, name: user.name }));
      }
      setDocuments([]);
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => {
    setHeaderTitle(t('profile_screen.header.title'));
    setHeaderSubtitle(t('profile_screen.header.subtitle'));
    return () => {
      setHeaderTitle(null);
      setHeaderSubtitle(null);
    };
  }, [setHeaderTitle, setHeaderSubtitle, t]);

  const loadCountries = async () => {
    setLoadingCountries(true);
    try {
      const response = await publicAPI.getCountries();
      setCountries(response.countries || response.data || []);
    } catch (error) {
      console.error('Failed to load countries:', error);
      setCountries([]);
    } finally {
      setLoadingCountries(false);
    }
  };

  const loadMailingCities = async (countryCode) => {
    if (!countryCode) {
      setMailingCities([]);
      return;
    }

    setLoadingMailingCities(true);
    try {
      const response = await publicAPI.getCities(countryCode);
      let citiesData = response.cities || response.data?.cities || response.data || response || [];

      // Convert object to array if needed
      if (!Array.isArray(citiesData) && typeof citiesData === 'object') {
        citiesData = Object.values(citiesData);
      }

      setMailingCities(Array.isArray(citiesData) ? citiesData : []);
    } catch (error) {
      console.error('Failed to load mailing cities:', error);
      setMailingCities([]);
    } finally {
      setLoadingMailingCities(false);
    }
  };

  const loadPhysicalCities = async (countryCode) => {
    if (!countryCode) {
      setPhysicalCities([]);
      return;
    }

    setLoadingPhysicalCities(true);
    try {
      const response = await publicAPI.getCities(countryCode);
      let citiesData = response.cities || response.data?.cities || response.data || response || [];

      // Convert object to array if needed
      if (!Array.isArray(citiesData) && typeof citiesData === 'object') {
        citiesData = Object.values(citiesData);
      }

      setPhysicalCities(Array.isArray(citiesData) ? citiesData : []);
    } catch (error) {
      console.error('Failed to load physical cities:', error);
      setPhysicalCities([]);
    } finally {
      setLoadingPhysicalCities(false);
    }
  };

  // Helper function to get country name from code
  const getCountryName = (countryCode) => {
    if (!countryCode) return '';
    const country = countries.find(c => c.code === countryCode || c.name === countryCode);
    return country ? country.name : countryCode;
  };

  // Helper function to get city name
  const getCityName = (cityName) => {
    return cityName || '';
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    // Reset city when country changes
    const updatedFormData = {
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    };

    if (name === 'mailing_country') {
      updatedFormData.mailing_city = '';
    } else if (name === 'physical_country') {
      updatedFormData.physical_city = '';
    }

    setFormData(updatedFormData);

    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Compare files by reading and hashing them
  const compareFiles = async (file1, file2) => {
    if (!file1 || !file2) return false;

    // Quick comparison: size and name
    if (file1.size !== file2.size || file1.name !== file2.name) {
      return false;
    }

    // Read both files and compare content hash
    try {
      const [hash1, hash2] = await Promise.all([
        calculateFileHash(file1),
        calculateFileHash(file2)
      ]);

      return hash1 === hash2;
    } catch (error) {
      console.error('Error comparing files:', error);
      // If hash comparison fails, compare by size, name, and lastModified
      return file1.size === file2.size &&
        file1.name === file2.name &&
        file1.lastModified === file2.lastModified;
    }
  };

  // Calculate simple hash for file comparison
  const calculateFileHash = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const arrayBuffer = e.target.result;
        // Simple hash: sum of first 1000 bytes + file size
        const view = new Uint8Array(arrayBuffer);
        let hash = 0;
        const bytesToCheck = Math.min(1000, view.length);
        for (let i = 0; i < bytesToCheck; i++) {
          hash = ((hash << 5) - hash) + view[i];
          hash = hash & hash; // Convert to 32bit integer
        }
        resolve(`${hash}_${file.size}_${file.name}`);
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  // Check if logo file is different from current logo
  const isLogoChanged = async (newFile) => {
    if (!newFile || !profileData?.logo_url) return true;

    try {
      // Fetch current logo to compare
      const response = await fetch(profileData.logo_url);
      const blob = await response.blob();
      const currentFile = new File([blob], profileData.logo_url.split('/').pop(), { type: blob.type });

      return !(await compareFiles(newFile, currentFile));
    } catch (error) {
      console.error('Error comparing logo:', error);
      // If comparison fails, assume it's different (safer to upload)
      return true;
    }
  };

  // Check if document file is different from existing document
  const isDocumentChanged = async (newFile, documentUrl) => {
    if (!newFile || !documentUrl) return true;

    try {
      // Fetch current document to compare
      const response = await fetch(documentUrl);
      const blob = await response.blob();
      const currentFile = new File([blob], documentUrl.split('/').pop(), { type: blob.type });

      return !(await compareFiles(newFile, currentFile));
    } catch (error) {
      console.error('Error comparing document:', error);
      // If comparison fails, assume it's different (safer to upload)
      return true;
    }
  };

  // Handle logo file upload
  const handleLogoChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type - According to API: JPG, JPEG, PNG only
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        setErrors({ logo: t('profile_screen.validation.logo_type') });
        e.target.value = ''; // Reset input
        return;
      }

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrors({ logo: t('profile_screen.validation.logo_size') });
        e.target.value = ''; // Reset input
        return;
      }

      // Compare with current logo
      const isChanged = await isLogoChanged(file);
      if (!isChanged) {
        setErrors({ logo: 'This file is the same as the current logo. No changes needed.' });
        e.target.value = ''; // Reset input
        return;
      }

      setLogoFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);

      // Clear error
      if (errors.logo) {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.logo;
          return newErrors;
        });
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    setSuccessMessage('');

    // --- Validation ---
    const validationErrors = {};

    // 1. Acc Info
    if (!formData.legal_name) validationErrors.legal_name = t('profile_screen.validation.required');
    if (!formData.email) validationErrors.email = t('profile_screen.validation.required');
    else if (validateEmail(formData.email)) validationErrors.email = t('profile_screen.validation.invalid_email');
    if (!formData.phone) validationErrors.phone = t('profile_screen.validation.required');

    // 2. Physical Address
    if (!formData.physical_street) validationErrors.physical_street = t('profile_screen.validation.required');
    if (!formData.physical_city) validationErrors.physical_city = t('profile_screen.validation.required');
    if (!formData.physical_country) validationErrors.physical_country = t('profile_screen.validation.required');
    if (!formData.physical_postal_code) validationErrors.physical_postal_code = t('profile_screen.validation.required');

    // 3. Mailing Address (if not same)
    if (!formData.mailing_same_as_physical) {
      if (!formData.mailing_street) validationErrors.mailing_street = t('profile_screen.validation.required');
      if (!formData.mailing_city) validationErrors.mailing_city = t('profile_screen.validation.required');
      if (!formData.mailing_country) validationErrors.mailing_country = t('profile_screen.validation.required');
      if (!formData.mailing_postal_code) validationErrors.mailing_postal_code = t('profile_screen.validation.required');
    }

    // 4. Primary Contact
    if (!formData.primary_contact_title) validationErrors.primary_contact_title = t('profile_screen.validation.required');
    if (!formData.primary_contact_first_name) validationErrors.primary_contact_first_name = t('profile_screen.validation.required');
    if (!formData.primary_contact_last_name) validationErrors.primary_contact_last_name = t('profile_screen.validation.required');
    if (!formData.primary_contact_email) validationErrors.primary_contact_email = t('profile_screen.validation.required');
    else if (validateEmail(formData.primary_contact_email)) validationErrors.primary_contact_email = t('profile_screen.validation.invalid_email');
    if (!formData.primary_contact_country) validationErrors.primary_contact_country = t('profile_screen.validation.required');
    if (!formData.primary_contact_mobile) validationErrors.primary_contact_mobile = t('profile_screen.validation.required');
    // File validation: Required if not already uploaded (how to check? we can check if URL exists in profileData)
    if (!primaryPassportFile && !profileData?.primary_contact?.passport_url) {
      // Ideally this should be required, but for updates maybe optional if already exists? 
      // Requirement says "Required: Yes". Assuming if it exists on backend it's fine.
      // Let's check profileData structure for existing file.
      // The requirement structure shows passport_url in response.
      if (!profileData?.primary_contact?.passport_url) {
        validationErrors.primary_contact_passport = t('profile_screen.validation.required');
      }
    }

    // 5. Secondary Contact
    if (!formData.secondary_contact_title) validationErrors.secondary_contact_title = t('profile_screen.validation.required');
    if (!formData.secondary_contact_first_name) validationErrors.secondary_contact_first_name = t('profile_screen.validation.required');
    if (!formData.secondary_contact_last_name) validationErrors.secondary_contact_last_name = t('profile_screen.validation.required');
    if (!formData.secondary_contact_email) validationErrors.secondary_contact_email = t('profile_screen.validation.required');
    else if (validateEmail(formData.secondary_contact_email)) validationErrors.secondary_contact_email = t('profile_screen.validation.invalid_email');
    if (!formData.secondary_contact_country) validationErrors.secondary_contact_country = t('profile_screen.validation.required');
    if (!formData.secondary_contact_mobile) validationErrors.secondary_contact_mobile = t('profile_screen.validation.required');
    if (!secondaryPassportFile && !profileData?.secondary_contact?.passport_url) {
      if (!profileData?.secondary_contact?.passport_url) {
        validationErrors.secondary_contact_passport = t('profile_screen.validation.required');
      }
    }

    // 6. Additional Info
    // company_gov_registry_number is optional
    // company_registration_certificate is optional

    // 7. Agreements
    if (!formData.agreed_to_receive_communications) validationErrors.agreed_to_receive_communications = t('profile_screen.validation.required');
    if (!formData.agreed_to_terms_and_conditions) validationErrors.agreed_to_terms_and_conditions = t('profile_screen.validation.required');

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setLoading(false);
      // Scroll to top or first error could be nice
      window.scrollTo(0, 0);
      return;
    }

    try {
      // Use FormData for file uploads (multipart/form-data)
      const formDataToSend = new FormData();

      // Append all text fields
      Object.keys(formData).forEach(key => {
        const value = formData[key];
        if (value !== null && value !== undefined) {
          if (typeof value === 'boolean') {
            formDataToSend.append(key, value ? '1' : '0');
          } else {
            formDataToSend.append(key, value);
          }
        }
      });

      // Append Files
      if (logoFile) formDataToSend.append('logo', logoFile);
      if (primaryPassportFile) formDataToSend.append('primary_contact_passport', primaryPassportFile);
      if (secondaryPassportFile) formDataToSend.append('secondary_contact_passport', secondaryPassportFile);
      if (companyCertFile) formDataToSend.append('company_registration_certificate', companyCertFile);

      // Legacy Documents (if still used alongside new structure)
      newDocuments.forEach((doc, index) => {
        formDataToSend.append(`documents[${index}][document_type]`, doc.document_type);
        formDataToSend.append(`documents[${index}][file]`, doc.file);
      });

      updatingDocuments.forEach((doc, index) => {
        const docIndex = newDocuments.length + index;
        formDataToSend.append(`documents[${docIndex}][id]`, doc.id.toString());
        formDataToSend.append(`documents[${docIndex}][document_type]`, doc.document_type);
        if (doc.file) {
          formDataToSend.append(`documents[${docIndex}][file]`, doc.file);
        }
      });

      // Update API call
      const response = await accAPI.updateProfile(formDataToSend);

      const updatedProfile = response?.profile || response || {};
      setProfileData(updatedProfile);
      setDocuments(updatedProfile.documents || []);

      // Update logo preview if logo_url is returned
      if (updatedProfile.logo_url) setLogoPreview(updatedProfile.logo_url);
      else if (!updatedProfile.logo_url && !logoFile) setLogoPreview(null);

      // Clear file inputs
      setLogoFile(null);
      setPrimaryPassportFile(null);
      setSecondaryPassportFile(null);
      setCompanyCertFile(null);
      setNewDocuments([]);
      setUpdatingDocuments([]);

      // Reload profile to ensure everything is synced
      await loadProfile();

      setSuccessMessage(t('profile_screen.messages.profile_updated'));
      setIsEditing(false);
      setTimeout(() => setSuccessMessage(''), 3000);

    } catch (error) {
      console.error('Failed to update profile:', error);
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      } else {
        setErrors({ general: error.response?.data?.message || error.message || 'Failed to update profile' });
      }
      window.scrollTo(0, 0);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    setIsEditing(false);
    setErrors({});
    setNewDocuments([]);
    setUpdatingDocuments([]);
    setLogoFile(null);
    setPrimaryPassportFile(null);
    setSecondaryPassportFile(null);
    setCompanyCertFile(null);

    // Reset form data to original profile by reloading from API
    await loadProfile();
  };

  // Document management handlers
  const handleAddNewDocument = (file, documentType) => {
    if (!file || !documentType) return;

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      setErrors({ documents: t('profile_screen.validation.file_type') });
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setErrors({ documents: t('profile_screen.validation.file_size') });
      return;
    }

    setNewDocuments([...newDocuments, { file, document_type: documentType }]);
    if (errors.documents) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.documents;
        return newErrors;
      });
    }
  };

  const handleRemoveNewDocument = (index) => {
    setNewDocuments(newDocuments.filter((_, i) => i !== index));
  };

  const handleUpdateDocument = async (documentId, file, documentType) => {
    if (!documentType) return;

    if (file) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        setErrors({ documents: t('profile_screen.validation.file_type') });
        return;
      }

      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        setErrors({ documents: t('profile_screen.validation.file_size') });
        return;
      }

      // Compare with existing document if updating
      const existingDoc = documents.find(doc => doc.id === documentId);
      if (existingDoc?.document_url) {
        const isChanged = await isDocumentChanged(file, existingDoc.document_url);
        if (!isChanged) {
          setErrors({ documents: 'This file is the same as the current document. No changes needed.' });
          return;
        }
      }
    }

    const existingIndex = updatingDocuments.findIndex(doc => doc.id === documentId);
    if (existingIndex >= 0) {
      const updated = [...updatingDocuments];
      updated[existingIndex] = { id: documentId, file: file || updated[existingIndex].file, document_type: documentType };
      setUpdatingDocuments(updated);
    } else {
      setUpdatingDocuments([...updatingDocuments, { id: documentId, file, document_type: documentType }]);
    }

    if (errors.documents) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.documents;
        return newErrors;
      });
    }
  };

  const handleRemoveDocumentUpdate = (documentId) => {
    setUpdatingDocuments(updatingDocuments.filter(doc => doc.id !== documentId));
  };

  const getDocumentTypeLabel = (type) => {
    const labels = {
      license: 'License',
      registration: 'Registration',
      certificate: 'Certificate',
      other: 'Other'
    };
    return labels[type] || type;
  };

  const formatDate = (dateString) => {
    if (!dateString) return t('profile_screen.common.na');
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
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
    if (e && e.preventDefault) {
      e.preventDefault();
    }

    // Validation
    const passwordErrors = {};
    if (!passwordData.current_password) {
      passwordErrors.current_password = t('profile_screen.validation.required');
    }
    const newPasswordError = validatePassword(passwordData.password, 8, true);
    if (newPasswordError) passwordErrors.password = newPasswordError;
    const confirmPasswordError = validatePasswordConfirmation(passwordData.password, passwordData.password_confirmation);
    if (confirmPasswordError) passwordErrors.password_confirmation = confirmPasswordError;

    if (Object.keys(passwordErrors).length > 0) {
      setErrors(passwordErrors);
      return;
    }

    setChangingPassword(true);
    setErrors({});
    setSuccessMessage('');

    try {
      await authAPI.changePassword(passwordData);
      setSuccessMessage(t('profile_screen.messages.password_changed'));
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

  const handleVerifyStripeAccount = async () => {
    if (!formData.stripe_account_id || !formData.stripe_account_id.trim()) {
      setStripeAccountError('Please enter a Stripe Account ID');
      return;
    }

    if (!formData.stripe_account_id.startsWith('acct_')) {
      setStripeAccountError('Stripe Account ID must start with "acct_"');
      return;
    }

    setVerifyingStripeAccount(true);
    setStripeAccountError('');
    setStripeAccountInfo(null);

    try {
      const response = await accAPI.verifyStripeAccount(formData.stripe_account_id.trim());

      if (response.valid && response.account) {
        setStripeAccountInfo(response.account);
        setStripeAccountError('');
      } else {
        setStripeAccountError(response.message || response.error || 'Invalid Stripe Account');
        setStripeAccountInfo(null);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to verify Stripe Account';
      setStripeAccountError(errorMessage);
      setStripeAccountInfo(null);
    } finally {
      setVerifyingStripeAccount(false);
    }
  };

  const handleRemoveStripeAccount = async () => {
    if (!confirm('Are you sure you want to remove your Stripe Account? This will stop automatic payment splitting.')) {
      return;
    }

    const updatedFormData = {
      ...formData,
      stripe_account_id: '',
    };
    setFormData(updatedFormData);
    setStripeAccountInfo(null);
    setStripeAccountError('');

    // Save the profile with empty stripe_account_id
    try {
      setLoading(true);
      const formDataToSend = new FormData();
      Object.keys(updatedFormData).forEach(key => {
        if (key === 'stripe_account_id') {
          formDataToSend.append(key, '');
        } else if (updatedFormData[key] !== null && updatedFormData[key] !== undefined) {
          formDataToSend.append(key, updatedFormData[key]);
        }
      });

      await accAPI.updateProfile(formDataToSend);
      await loadProfile();
      setSuccessMessage('Stripe Account removed successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Failed to remove Stripe Account:', error);
      const errorObj = {};
      if (error.response?.data?.errors) {
        Object.assign(errorObj, error.response.data.errors);
      }
      errorObj.stripe_account = error.response?.data?.message || error.message || 'Failed to remove Stripe Account';
      setErrors(errorObj);
    } finally {
      setLoading(false);
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
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt="Organization Logo"
                  className="profile-avatar"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    if (e.target.nextSibling) {
                      e.target.nextSibling.style.display = 'flex';
                    }
                  }}
                />
              ) : null}
              <div className="profile-avatar-placeholder" style={{ display: logoPreview ? 'none' : 'flex' }}>
                <Building2 size={48} />
              </div>

              {/* Upload Logo Button - Inside Circle */}
              {isEditing && (
                <label className="profile-avatar-upload-overlay" title={t('profile_screen.buttons.upload_logo')}>
                  <Upload size={20} />
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png"
                    onChange={handleLogoChange}
                    style={{ display: 'none' }}
                  />
                </label>
              )}

              {/* Show file name if logo is selected */}
              {isEditing && logoFile && (
                <div className="profile-avatar-file-info">
                  <p className="text-xs text-white bg-black bg-opacity-70 px-2 py-1 rounded">
                    {logoFile.name}
                  </p>
                </div>
              )}

              {/* Show error if exists */}
              {isEditing && errors.logo && (
                <div className="profile-avatar-file-info" style={{ bottom: '-3.5rem' }}>
                  <p className="text-xs text-red-600 bg-red-50 border border-red-200 px-2 py-1 rounded">
                    {errors.logo}
                  </p>
                </div>
              )}
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
                {t('profile_screen.header.edit')}
              </button>
            )}
          </div>
        </div>

        {/* Profile Form */}
        <form onSubmit={handleSubmit} className="profile-form">
          {/* 1. Accreditation Body Information */}
          <div className="profile-form-section">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-50 rounded-lg"><Building2 className="text-blue-600" size={24} /></div>
              <div>
                <h2 className="profile-section-title">{t('profile_screen.sections.accreditation_info.title')}</h2>
                <p className="text-sm text-gray-500 mt-1">{t('profile_screen.sections.accreditation_info.subtitle')}</p>
              </div>
            </div>
            <div className="profile-form-grid">
              <FormInput label={t('profile_screen.form.legal_name')} name="legal_name" value={formData.legal_name} onChange={handleChange} disabled={!isEditing} error={errors.legal_name} required />
              <FormInput label={t('profile_screen.form.email')} name="email" type="email" value={formData.email} onChange={handleChange} disabled={!isEditing} error={errors.email} required />
              <FormInput label={t('profile_screen.form.phone')} name="phone" type="tel" value={formData.phone} onChange={handleChange} disabled={!isEditing} error={errors.phone} required />
              <FormInput label={t('profile_screen.form.fax')} name="fax" value={formData.fax} onChange={handleChange} disabled={!isEditing} error={errors.fax} />
              <FormInput label={t('profile_screen.form.website')} name="website" type="url" value={formData.website} onChange={handleChange} disabled={!isEditing} error={errors.website} />

              {/* Legacy Display */}
              {/* Legacy Display */}
              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <span className={`profile-status-badge ${profileData?.status || 'active'}`}>{t(`profile_screen.status.${profileData?.status || 'active'}`)}</span>
              </div>
            </div>
          </div>

          {/* 2. Physical Address */}
          <div className="profile-form-section">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-50 rounded-lg"><MapPin className="text-green-600" size={24} /></div>
              <div>
                <h2 className="profile-section-title">{t('profile_screen.sections.physical_address.title')}</h2>
                <p className="text-sm text-gray-500 mt-1">{t('profile_screen.sections.physical_address.subtitle')}</p>
              </div>
            </div>
            <div className="profile-form-grid">
              <FormInput label={t('profile_screen.form.street_address')} name="physical_street" value={formData.physical_street} onChange={handleChange} disabled={!isEditing} error={errors.physical_street} required />
              <FormInput label={t('profile_screen.form.postal_code')} name="physical_postal_code" value={formData.physical_postal_code} onChange={handleChange} disabled={!isEditing} error={errors.physical_postal_code} required />
              {isEditing ? (
                <>
                  <FormInput label={t('profile_screen.form.country')} name="physical_country" type="select" value={formData.physical_country} onChange={handleChange} disabled={loadingCountries} error={errors.physical_country} required
                    options={[{ value: '', label: t('profile_screen.placeholders.select_country') }, ...countries.map(c => ({ value: c.code, label: c.name }))]} />
                  <FormInput label={t('profile_screen.form.city')} name="physical_city" type="select" value={formData.physical_city} onChange={handleChange} disabled={!formData.physical_country} error={errors.physical_city} required
                    options={[{ value: '', label: t('profile_screen.placeholders.select_city') }, ...physicalCities.map(c => ({ value: c.name || c, label: c.name || c }))]} />
                </>
              ) : (
                <>
                  <div className="bg-gray-50 p-3 rounded border border-gray-200"><label className="block text-xs text-gray-500">{t('profile_screen.form.country')}</label>{getCountryName(formData.physical_country)}</div>
                  <div className="bg-gray-50 p-3 rounded border border-gray-200"><label className="block text-xs text-gray-500">{t('profile_screen.form.city')}</label>{getCityName(formData.physical_city)}</div>
                </>
              )}
            </div>
          </div>

          {/* 3. Mailing Address */}
          <div className="profile-form-section">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-yellow-50 rounded-lg"><Mail className="text-yellow-600" size={24} /></div>
              <div>
                <h2 className="profile-section-title">{t('profile_screen.sections.mailing_address.title')}</h2>
                <div className="flex items-center mt-2">
                  <input type="checkbox" id="mailing_same" name="mailing_same_as_physical" checked={formData.mailing_same_as_physical} onChange={(e) => handleChange({ target: { name: 'mailing_same_as_physical', value: e.target.checked } })} disabled={!isEditing} className="mr-2 h-4 w-4 text-blue-600 rounded" />
                  <label htmlFor="mailing_same" className="text-sm text-gray-700">{t('profile_screen.sections.mailing_address.same_as_physical')}</label>
                </div>
              </div>
            </div>
            {!formData.mailing_same_as_physical && (
              <div className="profile-form-grid">
                <FormInput label={t('profile_screen.form.street_address')} name="mailing_street" value={formData.mailing_street} onChange={handleChange} disabled={!isEditing} error={errors.mailing_street} required />
                <FormInput label={t('profile_screen.form.postal_code')} name="mailing_postal_code" value={formData.mailing_postal_code} onChange={handleChange} disabled={!isEditing} error={errors.mailing_postal_code} required />
                {isEditing ? (
                  <>
                    <FormInput label={t('profile_screen.form.country')} name="mailing_country" type="select" value={formData.mailing_country} onChange={handleChange} disabled={loadingCountries} error={errors.mailing_country} required
                      options={[{ value: '', label: t('profile_screen.placeholders.select_country') }, ...countries.map(c => ({ value: c.code, label: c.name }))]} />
                    <FormInput label={t('profile_screen.form.city')} name="mailing_city" type="select" value={formData.mailing_city} onChange={handleChange} disabled={!formData.mailing_country} error={errors.mailing_city} required
                      options={[{ value: '', label: t('profile_screen.placeholders.select_city') }, ...mailingCities.map(c => ({ value: c.name || c, label: c.name || c }))]} />
                  </>
                ) : (
                  <>
                    <div className="bg-gray-50 p-3 rounded border border-gray-200"><label className="block text-xs text-gray-500">{t('profile_screen.form.country')}</label>{getCountryName(formData.mailing_country)}</div>
                    <div className="bg-gray-50 p-3 rounded border border-gray-200"><label className="block text-xs text-gray-500">{t('profile_screen.form.city')}</label>{getCityName(formData.mailing_city)}</div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* 4. Primary Contact */}
          <div className="profile-form-section">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-50 rounded-lg"><User className="text-purple-600" size={24} /></div>
              <div>
                <h2 className="profile-section-title">{t('profile_screen.sections.primary_contact.title')}</h2>
                <p className="text-sm text-gray-500 mt-1">{t('profile_screen.sections.primary_contact.subtitle')}</p>
              </div>
            </div>
            <div className="profile-form-grid">
              <FormInput label={t('profile_screen.form.title')} name="primary_contact_title" type="select" value={formData.primary_contact_title} onChange={handleChange} disabled={!isEditing} error={errors.primary_contact_title} required options={['Mr.', 'Mrs.', 'Eng.', 'Prof.'].map(t => ({ value: t, label: t }))} />
              <FormInput label={t('profile_screen.form.first_name')} name="primary_contact_first_name" value={formData.primary_contact_first_name} onChange={handleChange} disabled={!isEditing} error={errors.primary_contact_first_name} required />
              <FormInput label={t('profile_screen.form.last_name')} name="primary_contact_last_name" value={formData.primary_contact_last_name} onChange={handleChange} disabled={!isEditing} error={errors.primary_contact_last_name} required />
              <FormInput label={t('profile_screen.form.email')} name="primary_contact_email" type="email" value={formData.primary_contact_email} onChange={handleChange} disabled={!isEditing} error={errors.primary_contact_email} required />
              <FormInput label={t('profile_screen.form.mobile')} name="primary_contact_mobile" type="tel" value={formData.primary_contact_mobile} onChange={handleChange} disabled={!isEditing} error={errors.primary_contact_mobile} required />
              {isEditing ? (
                <FormInput label={t('profile_screen.form.country')} name="primary_contact_country" type="select" value={formData.primary_contact_country} onChange={handleChange} disabled={loadingCountries} error={errors.primary_contact_country} required
                  options={[{ value: '', label: t('profile_screen.placeholders.select_country') }, ...countries.map(c => ({ value: c.code, label: c.name }))]} />
              ) : (
                <div className="bg-gray-50 p-3 rounded border border-gray-200"><label className="block text-xs text-gray-500">{t('profile_screen.form.country')}</label>{getCountryName(formData.primary_contact_country)}</div>
              )}

              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile_screen.form.passport_copy')} {isEditing && <span className="text-red-500">*</span>}</label>
                {profileData?.primary_contact?.passport_url && (
                  <div className="mb-2">
                    <a href={profileData.primary_contact.passport_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-1"><FileText size={16} /> {t('profile_screen.form.view_passport')}</a>
                  </div>
                )}
                {isEditing && (
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setPrimaryPassportFile(e.target.files[0])} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                )}
                {errors.primary_contact_passport && <p className="text-red-500 text-xs mt-1">{errors.primary_contact_passport}</p>}
              </div>
            </div>
          </div>

          {/* 5. Secondary Contact */}
          <div className="profile-form-section">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-indigo-50 rounded-lg"><User className="text-indigo-600" size={24} /></div>
              <div>
                <h2 className="profile-section-title">{t('profile_screen.sections.secondary_contact.title')}</h2>
                <p className="text-sm text-gray-500 mt-1">{t('profile_screen.sections.secondary_contact.subtitle')}</p>
              </div>
            </div>
            <div className="profile-form-grid">
              <FormInput label={t('profile_screen.form.title')} name="secondary_contact_title" type="select" value={formData.secondary_contact_title} onChange={handleChange} disabled={!isEditing} error={errors.secondary_contact_title} required options={['Mr.', 'Mrs.', 'Eng.', 'Prof.'].map(t => ({ value: t, label: t }))} />
              <FormInput label={t('profile_screen.form.first_name')} name="secondary_contact_first_name" value={formData.secondary_contact_first_name} onChange={handleChange} disabled={!isEditing} error={errors.secondary_contact_first_name} required />
              <FormInput label={t('profile_screen.form.last_name')} name="secondary_contact_last_name" value={formData.secondary_contact_last_name} onChange={handleChange} disabled={!isEditing} error={errors.secondary_contact_last_name} required />
              <FormInput label={t('profile_screen.form.email')} name="secondary_contact_email" type="email" value={formData.secondary_contact_email} onChange={handleChange} disabled={!isEditing} error={errors.secondary_contact_email} required />
              <FormInput label={t('profile_screen.form.mobile')} name="secondary_contact_mobile" type="tel" value={formData.secondary_contact_mobile} onChange={handleChange} disabled={!isEditing} error={errors.secondary_contact_mobile} required />
              {isEditing ? (
                <FormInput label={t('profile_screen.form.country')} name="secondary_contact_country" type="select" value={formData.secondary_contact_country} onChange={handleChange} disabled={loadingCountries} error={errors.secondary_contact_country} required
                  options={[{ value: '', label: t('profile_screen.placeholders.select_country') }, ...countries.map(c => ({ value: c.code, label: c.name }))]} />
              ) : (
                <div className="bg-gray-50 p-3 rounded border border-gray-200"><label className="block text-xs text-gray-500">{t('profile_screen.form.country')}</label>{getCountryName(formData.secondary_contact_country)}</div>
              )}

              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile_screen.form.passport_copy')} {isEditing && <span className="text-red-500">*</span>}</label>
                {profileData?.secondary_contact?.passport_url && (
                  <div className="mb-2">
                    <a href={profileData.secondary_contact.passport_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-1"><FileText size={16} /> {t('profile_screen.form.view_passport')}</a>
                  </div>
                )}
                {isEditing && (
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setSecondaryPassportFile(e.target.files[0])} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                )}
                {errors.secondary_contact_passport && <p className="text-red-500 text-xs mt-1">{errors.secondary_contact_passport}</p>}
              </div>
            </div>
          </div>

          {/* 6. Additional Information */}
          <div className="profile-form-section">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-orange-50 rounded-lg"><FileText className="text-orange-600" size={24} /></div>
              <div>
                <h2 className="profile-section-title">{t('profile_screen.sections.additional_info.title')}</h2>
                <p className="text-sm text-gray-500 mt-1">{t('profile_screen.sections.additional_info.subtitle')}</p>
              </div>
            </div>
            <div className="profile-form-grid">
              <FormInput label={t('profile_screen.form.gov_registry_number')} name="company_gov_registry_number" value={formData.company_gov_registry_number} onChange={handleChange} disabled={!isEditing} error={errors.company_gov_registry_number} required />
              <FormInput label={t('profile_screen.form.hear_about_us')} name="how_did_you_hear_about_us" value={formData.how_did_you_hear_about_us} onChange={handleChange} disabled={!isEditing} error={errors.how_did_you_hear_about_us} />

              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile_screen.form.company_certificate')} {isEditing && <span className="text-red-500">*</span>}</label>
                {profileData?.company_registration_certificate_url && (
                  <div className="mb-2">
                    <a href={profileData.company_registration_certificate_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-1"><FileText size={16} /> {t('profile_screen.form.view_certificate')}</a>
                  </div>
                )}
                {isEditing && (
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setCompanyCertFile(e.target.files[0])} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                )}
                {errors.company_registration_certificate && <p className="text-red-500 text-xs mt-1">{errors.company_registration_certificate}</p>}
              </div>
            </div>
          </div>

          {/* 7. Agreements */}
          <div className="profile-form-section">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-gray-50 rounded-lg"><Shield className="text-gray-600" size={24} /></div>
              <div>
                <h2 className="profile-section-title">{t('profile_screen.sections.agreements.title')}</h2>
                <p className="text-sm text-gray-500 mt-1">{t('profile_screen.sections.agreements.subtitle')}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-start">
                <input type="checkbox" id="agreed_comms" name="agreed_to_receive_communications" checked={formData.agreed_to_receive_communications} onChange={(e) => handleChange({ target: { name: 'agreed_to_receive_communications', value: e.target.checked } })} disabled={!isEditing} className="mt-1 h-4 w-4 text-blue-600 rounded" />
                <div className="ml-3">
                  <label htmlFor="agreed_comms" className="text-sm font-medium text-gray-700">{t('profile_screen.agreements.receive_comms')}</label>
                  {errors.agreed_to_receive_communications && <p className="text-red-500 text-xs mt-1">{errors.agreed_to_receive_communications}</p>}
                </div>
              </div>
              <div className="flex items-start">
                <input type="checkbox" id="agreed_terms" name="agreed_to_terms_and_conditions" checked={formData.agreed_to_terms_and_conditions} onChange={(e) => handleChange({ target: { name: 'agreed_to_terms_and_conditions', value: e.target.checked } })} disabled={!isEditing} className="mt-1 h-4 w-4 text-blue-600 rounded" />
                <div className="ml-3">
                  <label htmlFor="agreed_terms" className="text-sm font-medium text-gray-700">{t('profile_screen.agreements.terms')}</label>
                  {errors.agreed_to_terms_and_conditions && <p className="text-red-500 text-xs mt-1">{errors.agreed_to_terms_and_conditions}</p>}
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          {isEditing && (
            <div className="profile-actions">
              <button type="button" onClick={handleCancel} className="profile-cancel-btn" disabled={loading}>{t('profile_screen.buttons.cancel')}</button>
              <button type="submit" className="profile-save-btn" disabled={loading}>
                {loading ? <div className="loader small"></div> : <><Save size={18} /> {t('profile_screen.buttons.save')}</>}
              </button>
            </div>
          )}

        </form>

        {/* Stripe Account Management Section
        <div className="profile-content stripe-section">
          <div className="profile-form-section">
            <div className="flex items-center gap-3 mb-4" style={{ marginTop: 0 }}>
              <div className="p-2 bg-blue-50 rounded-lg">
                <CreditCard className="text-blue-600" size={24} />
              </div>
              <div>
                <h2 className="profile-section-title" style={{ margin: 0 }}>Stripe Account</h2>
                <p className="text-sm text-gray-500 mt-1">Manage your Stripe Connect account for automatic payment splitting</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Current Status 
              {profileData?.stripe_account_configured !== undefined && (
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-gray-900">Account Status</p>
                    <span className={`profile-status-badge ${profileData.stripe_account_configured ? 'verified' : 'pending'}`}>
                      {profileData.stripe_account_configured ? (
                        <>
                          <CheckCircle size={14} />
                          Configured
                        </>
                      ) : (
                        <>
                          <AlertCircle size={14} />
                          Not Configured
                        </>
                      )}
                    </span>
                  </div>
                  {profileData.stripe_account_id && (
                    <p className="text-sm text-gray-600 font-mono mt-1">{profileData.stripe_account_id}</p>
                  )}
                </div>
              )}

              {/* Stripe Account ID Input 
              <div>
                <FormInput
                  label="Stripe Account ID"
                  name="stripe_account_id"
                  type="text"
                  value={formData.stripe_account_id}
                  onChange={(e) => {
                    handleChange(e);
                    setStripeAccountError('');
                    setStripeAccountInfo(null);
                  }}
                  placeholder="acct_..."
                  disabled={!isEditing}
                  error={errors.stripe_account_id || stripeAccountError}
                  helpText="Enter your Stripe Connect Account ID (must start with 'acct_')"
                />

                 Verify Button 
                {isEditing && formData.stripe_account_id && (
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={handleVerifyStripeAccount}
                      disabled={!formData.stripe_account_id.trim() || verifyingStripeAccount || loading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-2"
                    >
                      {verifyingStripeAccount ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          Verifying...
                        </>
                      ) : (
                        <>
                          <CheckCircle size={16} />
                          Verify Account
                        </>
                      )}
                    </button>
                  </div>
                )}

                Verification Result
                {stripeAccountInfo && (
                  <div className="mt-3 p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center mb-2">
                      <CheckCircle size={16} className="text-green-600 mr-2" />
                      <p className="text-sm font-semibold text-green-900">Account Verified</p>
                    </div>
                    <div className="space-y-1 text-xs text-green-800 mt-2">
                      <p><strong>Account ID:</strong> {stripeAccountInfo.id}</p>
                      <p><strong>Type:</strong> {stripeAccountInfo.type || 'N/A'}</p>
                      <p><strong>Charges Enabled:</strong> {stripeAccountInfo.charges_enabled ? 'Yes' : 'No'}</p>
                      <p><strong>Payouts Enabled:</strong> {stripeAccountInfo.payouts_enabled ? 'Yes' : 'No'}</p>
                      <p><strong>Details Submitted:</strong> {stripeAccountInfo.details_submitted ? 'Yes' : 'No'}</p>
                    </div>
                    {(!stripeAccountInfo.charges_enabled || !stripeAccountInfo.details_submitted) && (
                      <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
                        <p className="text-xs text-yellow-800">
                          <strong>Warning:</strong> This account may not be able to receive payments.
                          Please ensure the account is fully configured in Stripe Dashboard.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                Error Message
                {stripeAccountError && !stripeAccountInfo && (
                  <div className="mt-3 p-4 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-center mb-2">
                      <AlertCircle size={16} className="text-red-600 mr-2" />
                      <p className="text-sm font-semibold text-red-900">Verification Failed</p>
                    </div>
                    <p className="text-xs text-red-800">{stripeAccountError}</p>
                  </div>
                )}
              </div>

              Remove Button
              {isEditing && profileData?.stripe_account_id && (
                <div className="pt-2 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={handleRemoveStripeAccount}
                    disabled={loading}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-2"
                  >
                    <Trash2 size={16} />
                    Remove Stripe Account
                  </button>
                </div>
              )}

              Information
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <h4 className="text-sm font-semibold text-yellow-900 mb-2">About Stripe Connect Accounts</h4>
                <ul className="text-xs text-yellow-800 space-y-1 list-disc list-inside">
                  <li>Stripe Account ID must start with "acct_"</li>
                  <li>When configured, payments are automatically split between you and the platform</li>
                  <li>You receive: Total Amount - Commission</li>
                  <li>Platform receives: Commission (based on your commission percentage)</li>
                  <li>If not configured, all payments go to the platform for manual settlement</li>
                </ul>
              </div>

              Save and Cancel Buttons
              {isEditing && (
                <div className="flex gap-3 pt-4 border-t border-gray-200 justify-end">
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
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      handleSubmit(e);
                    }}
                    className="profile-save-btn"
                    disabled={loading}
                  >
                    <Save size={18} />
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              )}
            </div>
        </div>
        </div> */}

        {/* Language Section - Separate from Profile Form */}
        <div className="profile-content language-section">
          <div className="profile-form-section">
            <div className="flex items-center gap-3 mb-4" style={{ marginTop: 0 }}>
              <div className="p-2 bg-teal-50 rounded-lg">
                <Globe className="text-teal-600" size={24} />
              </div>
              <div>
                <h2 className="profile-section-title" style={{ margin: 0 }}>{t('profile_screen.sections.language.title')}</h2>
                <p className="text-sm text-gray-500 mt-1">{t('profile_screen.sections.language.subtitle')}</p>
              </div>
            </div>

            <div className="profile-form-grid">
              <FormInput
                label={t('profile_screen.form.language')}
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

        {/* Change Password Section - Separate from Profile Form */}
        <div className="profile-content password-section">
          <div className="profile-form-section">
            <div className="flex items-center gap-3 mb-4" style={{ marginTop: 0 }}>
              <div className="p-2 bg-red-50 rounded-lg">
                <KeyRound className="text-red-600" size={24} />
              </div>
              <div>
                <h2 className="profile-section-title" style={{ margin: 0 }}>{t('profile_screen.sections.password.title')}</h2>
                <p className="text-sm text-gray-500 mt-1">{t('profile_screen.sections.password.subtitle')}</p>
              </div>
            </div>

            <form onSubmit={handleChangePassword} className="password-form">
              <div className="space-y-4">
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

                <div className="profile-form-grid">
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

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="profile-change-password-btn"
                    disabled={changingPassword}
                  >
                    <Lock size={18} />
                    {changingPassword ? t('profile_screen.password.submitting') : t('profile_screen.password.submit')}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileScreen;
