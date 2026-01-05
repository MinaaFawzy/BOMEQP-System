import { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useHeader } from '../../../context/HeaderContext';
import { accAPI, authAPI, publicAPI } from '../../../services/api';
import { User, Mail, Phone, MapPin, CheckCircle, AlertCircle, Globe, Building2, FileText, Edit, X, Save, Lock, KeyRound, Upload, File, Trash2, Eye, Image as ImageIcon, Shield, Calendar, Clock, CreditCard } from 'lucide-react';
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
    registration_number: '',
    stripe_account_id: '',
    // Mailing Address
    mailing_street: '',
    mailing_city: '',
    mailing_country: '',
    mailing_postal_code: '',
    // Physical Address
    physical_street: '',
    physical_city: '',
    physical_country: '',
    physical_postal_code: '',
  });
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [newDocuments, setNewDocuments] = useState([]); // Array of { file: File, document_type: string }
  const [updatingDocuments, setUpdatingDocuments] = useState([]); // Array of { id: number, file: File, document_type: string }
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

  // Load cities when mailing country changes
  useEffect(() => {
    if (formData.mailing_country) {
      loadMailingCities(formData.mailing_country);
    } else {
      setMailingCities([]);
    }
  }, [formData.mailing_country]);

  // Load cities when physical country changes
  useEffect(() => {
    if (formData.physical_country) {
      loadPhysicalCities(formData.physical_country);
    } else {
      setPhysicalCities([]);
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
      
      // Find country codes if countries are loaded
      let countryCode = profile.country || '';
      let mailingCountryCode = profile.mailing_address?.country || '';
      let physicalCountryCode = profile.physical_address?.country || '';
      
      if (countries.length > 0) {
        if (countryCode) {
          const countryObj = countries.find(c => c.name === countryCode || c.code === countryCode);
          if (countryObj) {
            countryCode = countryObj.code;
          }
        }
        if (mailingCountryCode) {
          const countryObj = countries.find(c => c.name === mailingCountryCode || c.code === mailingCountryCode);
          if (countryObj) {
            mailingCountryCode = countryObj.code;
          }
        }
        if (physicalCountryCode) {
          const countryObj = countries.find(c => c.name === physicalCountryCode || c.code === physicalCountryCode);
          if (countryObj) {
            physicalCountryCode = countryObj.code;
          }
        }
      }
      
      setFormData({
        name: profile.name || user?.name || '',
        legal_name: profile.legal_name || '',
        email: profile.email || user?.email || '',
        phone: profile.phone || user?.phone || '',
        country: countryCode,
        address: profile.address || user?.address || '',
        website: profile.website || '',
        registration_number: profile.registration_number || '',
        stripe_account_id: profile.stripe_account_id || '',
        // Mailing Address
        mailing_street: profile.mailing_address?.street || '',
        mailing_city: profile.mailing_address?.city || '',
        mailing_country: mailingCountryCode,
        mailing_postal_code: profile.mailing_address?.postal_code || '',
        // Physical Address
        physical_street: profile.physical_address?.street || '',
        physical_city: profile.physical_address?.city || '',
        physical_country: physicalCountryCode,
        physical_postal_code: profile.physical_address?.postal_code || '',
      });
      
      // Load cities if countries are set
      if (mailingCountryCode) {
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
          registration_number: '',
          stripe_account_id: '',
          mailing_street: '',
          mailing_city: '',
          mailing_country: '',
          mailing_postal_code: '',
          physical_street: '',
          physical_city: '',
          physical_country: '',
          physical_postal_code: '',
        });
        setLogoPreview(null);
      }
      setDocuments([]);
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
    const { name, value } = e.target;
    
    // Reset city when country changes
    const updatedFormData = {
      ...formData,
      [name]: value,
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
        setErrors({ logo: 'Logo must be an image file (JPG, JPEG, or PNG only)' });
        e.target.value = ''; // Reset input
        return;
      }
      
      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrors({ logo: 'Logo size must not exceed 5MB' });
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

    try {
      // Check if we have documents or logo to upload/update
      const hasDocuments = newDocuments.length > 0 || updatingDocuments.length > 0;
      const hasLogo = logoFile !== null;
      
      // Check if there are any text field changes
      const hasTextChanges = Object.keys(formData).some(key => {
        const currentValue = formData[key];
        const originalValue = profileData?.[key] || 
                            (key.startsWith('mailing_') ? profileData?.mailing_address?.[key.replace('mailing_', '')] : null) ||
                            (key.startsWith('physical_') ? profileData?.physical_address?.[key.replace('physical_', '')] : null) ||
                            '';
        return currentValue !== originalValue;
      });
      
      // If no changes at all, show message and return
      if (!hasDocuments && !hasLogo && !hasTextChanges) {
        setSuccessMessage('No changes to save.');
        setTimeout(() => setSuccessMessage(''), 3000);
        setLoading(false);
        return;
      }
      
      // PUT /acc/profile - Update ACC profile
      // According to API documentation, all fields are optional and partial updates are supported
      if (hasDocuments || hasLogo) {
        // Use FormData for file uploads (multipart/form-data)
        const formDataToSend = new FormData();
        
        // Add all text fields (when sending files, send all fields in FormData)
        Object.keys(formData).forEach(key => {
          const value = formData[key];
          // Only append if value is not empty (null, undefined, or empty string are skipped)
          // But we should send all non-empty values for consistency
          if (value !== null && value !== undefined && value !== '') {
            formDataToSend.append(key, value);
          }
        });
        
        // Add logo file if uploaded
        if (logoFile) {
          formDataToSend.append('logo', logoFile);
        }
        
        // Add new documents (documents[][document_type] and documents[][file])
        newDocuments.forEach((doc, index) => {
          formDataToSend.append(`documents[${index}][document_type]`, doc.document_type);
          formDataToSend.append(`documents[${index}][file]`, doc.file);
        });
        
        // Add updating documents (documents[][id], documents[][document_type], and optionally documents[][file])
        updatingDocuments.forEach((doc, index) => {
          const docIndex = newDocuments.length + index;
          formDataToSend.append(`documents[${docIndex}][id]`, doc.id.toString());
          formDataToSend.append(`documents[${docIndex}][document_type]`, doc.document_type);
          // Only append file if it exists (type-only updates don't need file)
          if (doc.file) {
            formDataToSend.append(`documents[${docIndex}][file]`, doc.file);
          }
        });
        
        // Update API call - FormData will be sent as multipart/form-data
        const response = await accAPI.updateProfile(formDataToSend);
        
        // According to API documentation, response structure is: { message: "...", profile: {...} }
        const updatedProfile = response?.profile || response || {};
        
        setProfileData(updatedProfile);
        setDocuments(updatedProfile.documents || []);
        
        // Update logo preview if logo_url is returned
        if (updatedProfile.logo_url) {
          setLogoPreview(updatedProfile.logo_url);
        } else {
          setLogoPreview(null);
        }
        
        // Clear document arrays and logo file
        setNewDocuments([]);
        setUpdatingDocuments([]);
        setLogoFile(null);
      } else {
        // Regular JSON update (application/json) - only send changed fields
        const submitData = {};
        Object.keys(formData).forEach(key => {
          const value = formData[key];
          const originalValue = profileData?.[key] || 
                              (key.startsWith('mailing_') ? profileData?.mailing_address?.[key.replace('mailing_', '')] : null) ||
                              (key.startsWith('physical_') ? profileData?.physical_address?.[key.replace('physical_', '')] : null) ||
                              '';
          
          // Only include changed fields (partial update)
          if (value !== originalValue && value !== null && value !== undefined && value !== '') {
            submitData[key] = value;
          }
        });
        
        // Only send if there are changes
        if (Object.keys(submitData).length > 0) {
          const response = await accAPI.updateProfile(submitData);
          
          // According to API documentation, response structure is: { message: "...", profile: {...} }
          const updatedProfile = response?.profile || response || {};
          
          setProfileData(updatedProfile);
          setDocuments(updatedProfile.documents || []);
          
          // Update logo preview if logo_url is returned
          if (updatedProfile.logo_url) {
            setLogoPreview(updatedProfile.logo_url);
          } else {
            setLogoPreview(null);
          }
        }
      }
      
      // Reload profile to get latest data
      await loadProfile();
      
      setSuccessMessage('Profile updated successfully!');
      setIsEditing(false);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Failed to update profile:', error);
      
      // Handle different error types according to API documentation
      if (error.response?.status === 401) {
        setErrors({ general: 'Unauthenticated. Please log in again.' });
      } else if (error.response?.status === 404) {
        setErrors({ general: 'ACC profile not found.' });
      } else if (error.response?.status === 422) {
        // Validation errors - Handle nested document errors
        const errorData = error.response.data;
        if (errorData.errors) {
          // Flatten nested errors (e.g., documents.0.document_type, documents.0.file)
          const flattenedErrors = {};
          Object.keys(errorData.errors).forEach(key => {
            // Handle document-specific errors
            if (key.startsWith('documents.')) {
              // Extract the field name (e.g., "documents.0.file" -> "documents")
              const fieldMatch = key.match(/^documents\.\d+\.(.+)$/);
              if (fieldMatch) {
                // Use a general documents error or the specific field
                const fieldName = fieldMatch[1];
                const errorMsg = Array.isArray(errorData.errors[key]) 
                  ? errorData.errors[key][0] 
                  : errorData.errors[key];
                
                // Add to documents error or create it
                if (!flattenedErrors.documents) {
                  flattenedErrors.documents = errorMsg;
                } else {
                  flattenedErrors.documents += `; ${errorMsg}`;
                }
              } else {
                flattenedErrors[key] = Array.isArray(errorData.errors[key]) 
                  ? errorData.errors[key][0] 
                  : errorData.errors[key];
              }
            } else {
              flattenedErrors[key] = Array.isArray(errorData.errors[key]) 
                ? errorData.errors[key][0] 
                : errorData.errors[key];
            }
          });
          setErrors(flattenedErrors);
        } else if (errorData.message) {
          setErrors({ general: errorData.message });
        } else {
          setErrors({ general: 'Validation failed. Please check your input.' });
        }
      } else if (error.response?.status === 500) {
        setErrors({ general: error.response.data?.message || 'Profile update failed. Please try again.' });
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
    setNewDocuments([]);
    setUpdatingDocuments([]);
    setLogoFile(null);
    // Reset form data to original profile
    if (profileData) {
      // Find country codes if countries are loaded
      let countryCode = profileData.country || '';
      let mailingCountryCode = profileData.mailing_address?.country || '';
      let physicalCountryCode = profileData.physical_address?.country || '';
      
      if (countries.length > 0) {
        if (countryCode) {
          const countryObj = countries.find(c => c.name === countryCode || c.code === countryCode);
          if (countryObj) {
            countryCode = countryObj.code;
          }
        }
        if (mailingCountryCode) {
          const countryObj = countries.find(c => c.name === mailingCountryCode || c.code === mailingCountryCode);
          if (countryObj) {
            mailingCountryCode = countryObj.code;
          }
        }
        if (physicalCountryCode) {
          const countryObj = countries.find(c => c.name === physicalCountryCode || c.code === physicalCountryCode);
          if (countryObj) {
            physicalCountryCode = countryObj.code;
          }
        }
      }
      
      setFormData({
        name: profileData.name || user?.name || '',
        legal_name: profileData.legal_name || '',
        email: profileData.email || user?.email || '',
        phone: profileData.phone || user?.phone || '',
        country: countryCode,
        address: profileData.address || user?.address || '',
        website: profileData.website || '',
        registration_number: profileData.registration_number || '',
        stripe_account_id: profileData.stripe_account_id || '',
        mailing_street: profileData.mailing_address?.street || '',
        mailing_city: profileData.mailing_address?.city || '',
        mailing_country: mailingCountryCode,
        mailing_postal_code: profileData.mailing_address?.postal_code || '',
        physical_street: profileData.physical_address?.street || '',
        physical_city: profileData.physical_address?.city || '',
        physical_country: physicalCountryCode,
        physical_postal_code: profileData.physical_address?.postal_code || '',
      });
      setDocuments(profileData.documents || []);
      if (profileData.logo_url) {
        setLogoPreview(profileData.logo_url);
      } else {
        setLogoPreview(null);
      }
    }
  };

  // Document management handlers
  const handleAddNewDocument = (file, documentType) => {
    if (!file || !documentType) return;
    
    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      setErrors({ documents: 'File must be PDF, JPG, JPEG, or PNG' });
      return;
    }
    
    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setErrors({ documents: 'File size must not exceed 10MB' });
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
        setErrors({ documents: 'File must be PDF, JPG, JPEG, or PNG' });
        return;
      }
      
      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        setErrors({ documents: 'File size must not exceed 10MB' });
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
    if (!dateString) return 'N/A';
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
    
    // Validate that password fields are not empty
    if (!passwordData.current_password || !passwordData.password || !passwordData.password_confirmation) {
      setErrors({ password: 'All password fields are required' });
      return;
    }
    
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
                <label className="profile-avatar-upload-overlay" title="Click to upload logo">
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
          <FormInput
                label="Registration Number"
                name="registration_number"
            type="text"
                value={formData.registration_number}
                onChange={handleChange}
                disabled={!isEditing}
                error={errors.registration_number}
                helpText="Official registration number of your organization"
              />
            </div>
            
            {/* Display Read-only Fields */}
            {profileData && (
              <div className="profile-readonly-info">
                <div className="profile-info-item">
                  <span className="profile-info-label">Status:</span>
                  <span className={`profile-status-badge ${profileData.status || 'active'}`}>
                    {profileData.status || 'Active'}
                  </span>
                </div>
                {profileData.commission_percentage !== undefined && (
                  <div className="profile-info-item">
                    <span className="profile-info-label">Commission Percentage:</span>
                    <span className="profile-info-value">{profileData.commission_percentage}%</span>
                  </div>
                )}
                {profileData.stripe_account_configured !== undefined && (
                  <div className="profile-info-item">
                    <span className="profile-info-label">Stripe Account:</span>
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
                    {profileData.stripe_account_id && (
                      <span className="profile-info-value" style={{ marginLeft: '0.5rem', fontFamily: 'monospace', fontSize: '0.875rem' }}>
                        ({profileData.stripe_account_id})
                      </span>
                    )}
                  </div>
                )}
                {profileData.created_at && (
                  <div className="profile-info-item">
                    <span className="profile-info-label">Created At:</span>
                    <span className="profile-info-value">{formatDate(profileData.created_at)}</span>
                  </div>
                )}
                {profileData.updated_at && (
                  <div className="profile-info-item">
                    <span className="profile-info-label">Last Updated:</span>
                    <span className="profile-info-value">{formatDate(profileData.updated_at)}</span>
                  </div>
                )}
                </div>
              )}
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
            
            {/* Basic Address */}
            <div className="profile-form-grid mb-6">
              <FormInput
                label="Address"
                name="address"
                type="text"
                value={formData.address}
                onChange={handleChange}
                disabled={!isEditing}
                error={errors.address}
              />
              {isEditing ? (
                <FormInput
                  label="Country"
                  name="country"
                  type="select"
                  value={formData.country}
                  onChange={handleChange}
                  disabled={loadingCountries}
                  options={[
                    { value: '', label: loadingCountries ? 'Loading countries...' : 'Select Country' },
                    ...countries.map(country => ({
                      value: country.code,
                      label: country.name,
                    })),
                  ]}
                  error={errors.country}
                />
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                  <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-900">
                    {getCountryName(formData.country) || 'Not specified'}
                  </div>
                </div>
              )}
            </div>

            {/* Mailing Address */}
            <div className="mb-6">
              <h3 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Mail className="text-green-600" size={18} />
                Mailing Address
              </h3>
              <div className="profile-form-grid">
                <FormInput
                  label="Street"
                  name="mailing_street"
                  type="text"
                  value={formData.mailing_street}
                  onChange={handleChange}
                  disabled={!isEditing}
                  error={errors.mailing_street}
                />
                {isEditing ? (
                  <>
                    <FormInput
                      label="Country"
                      name="mailing_country"
                      type="select"
                      value={formData.mailing_country}
                      onChange={handleChange}
                      disabled={loadingCountries}
                      options={[
                        { value: '', label: loadingCountries ? 'Loading countries...' : 'Select Country' },
                        ...countries.map(country => ({
                          value: country.code,
                          label: country.name,
                        })),
                      ]}
                      error={errors.mailing_country}
                    />
                    <FormInput
                      label="City"
                      name="mailing_city"
                      type="select"
                      value={formData.mailing_city}
                      onChange={handleChange}
                      disabled={!formData.mailing_country || loadingMailingCities}
                      options={[
                        { value: '', label: !formData.mailing_country ? 'Select country first' : loadingMailingCities ? 'Loading cities...' : 'Select City' },
                        ...mailingCities.map(city => ({
                          value: city.name || city,
                          label: city.name || city,
                        })),
                      ]}
                      error={errors.mailing_city}
                    />
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                      <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-900">
                        {getCountryName(formData.mailing_country) || 'Not specified'}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                      <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-900">
                        {getCityName(formData.mailing_city) || 'Not specified'}
                      </div>
                    </div>
                  </>
                )}
                <FormInput
                  label="Postal Code"
                  name="mailing_postal_code"
                  type="text"
                  value={formData.mailing_postal_code}
                  onChange={handleChange}
                  disabled={!isEditing}
                  error={errors.mailing_postal_code}
                />
              </div>
            </div>

            {/* Physical Address */}
            <div>
              <h3 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <MapPin className="text-green-600" size={18} />
                Physical Address
              </h3>
              <div className="profile-form-grid">
                <FormInput
                  label="Street"
                  name="physical_street"
                  type="text"
                  value={formData.physical_street}
                  onChange={handleChange}
                  disabled={!isEditing}
                  error={errors.physical_street}
                />
                {isEditing ? (
                  <>
                    <FormInput
                      label="Country"
                      name="physical_country"
                      type="select"
                      value={formData.physical_country}
                      onChange={handleChange}
                      disabled={loadingCountries}
                      options={[
                        { value: '', label: loadingCountries ? 'Loading countries...' : 'Select Country' },
                        ...countries.map(country => ({
                          value: country.code,
                          label: country.name,
                        })),
                      ]}
                      error={errors.physical_country}
                    />
                    <FormInput
                      label="City"
                      name="physical_city"
                      type="select"
                      value={formData.physical_city}
                      onChange={handleChange}
                      disabled={!formData.physical_country || loadingPhysicalCities}
                      options={[
                        { value: '', label: !formData.physical_country ? 'Select country first' : loadingPhysicalCities ? 'Loading cities...' : 'Select City' },
                        ...physicalCities.map(city => ({
                          value: city.name || city,
                          label: city.name || city,
                        })),
                      ]}
                      error={errors.physical_city}
                    />
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                      <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-900">
                        {getCountryName(formData.physical_country) || 'Not specified'}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                      <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-900">
                        {getCityName(formData.physical_city) || 'Not specified'}
                      </div>
                    </div>
                  </>
                )}
                <FormInput
                  label="Postal Code"
                  name="physical_postal_code"
                  type="text"
                  value={formData.physical_postal_code}
                  onChange={handleChange}
                  disabled={!isEditing}
                  error={errors.physical_postal_code}
                />
              </div>
            </div>
          </div>

          {/* Documents Section */}
          <div className="profile-form-section">
            <div className="flex items-center gap-3 mb-4" style={{ marginTop: 0 }}>
              <div className="p-2 bg-purple-50 rounded-lg">
                <FileText className="text-purple-600" size={24} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h2 className="profile-section-title" style={{ margin: 0 }}>Documents</h2>
                  {isEditing && (
                    <select
                      id="newDocumentType"
                      className="document-type-dropdown-header"
                      value={newDocumentType}
                      onChange={(e) => {
                        setNewDocumentType(e.target.value);
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <option value="license">License</option>
                      <option value="registration">Registration</option>
                      <option value="certificate">Certificate</option>
                      <option value="other">Other</option>
                    </select>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-1">Manage your organization documents</p>
              </div>
            </div>

            {errors.documents && (
              <div className="profile-error-message mb-4">
                <AlertCircle size={20} />
                <span>{errors.documents}</span>
              </div>
            )}

            {/* Existing Documents */}
            {documents.length > 0 && (
              <div className="documents-grid mb-6">
                {documents.map((doc) => {
                  const updateInfo = updatingDocuments.find(d => d.id === doc.id);
                  const currentType = updateInfo?.document_type || doc.document_type;
                  
                  return (
                    <div key={doc.id} className="document-card">
                      <div className="document-card-header">
                        <div className="document-icon">
                          <File size={24} />
                        </div>
                        <div className="document-info">
                          <h3 className="document-title">{getDocumentTypeLabel(currentType)}</h3>
                          <p className="document-date">Uploaded: {formatDate(doc.uploaded_at)}</p>
                        </div>
                        {doc.verified && (
                          <div className="document-status">
                            <span className="status-badge verified">
                              <CheckCircle size={14} />
                              Verified
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {doc.verified && doc.verified_by && (
                        <div className="document-verification-info">
                          <p className="text-xs text-gray-600">
                            Verified by: {doc.verified_by.name} ({doc.verified_by.email})
                          </p>
                          <p className="text-xs text-gray-600">
                            Verified at: {formatDate(doc.verified_at)}
                    </p>
                  </div>
                      )}

                      <div className="document-actions">
                        <a
                          href={doc.document_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="document-action-btn view"
                        >
                          <Eye size={16} />
                          View
                        </a>
                        
                        {isEditing && (
                          <>
                            <label className="document-action-btn update">
                              <Upload size={16} />
                              {updateInfo?.file ? 'Change File' : 'Update'}
                              <input
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png"
                                style={{ display: 'none' }}
                                onChange={(e) => {
                                  const file = e.target.files[0];
                                  if (file) {
                                    handleUpdateDocument(doc.id, file, currentType);
                                  }
                                }}
                              />
                            </label>
                            
                            <select
                              value={currentType}
                              onChange={(e) => handleUpdateDocument(doc.id, null, e.target.value)}
                              className="document-type-select"
                              disabled={!isEditing}
                            >
                              <option value="license">License</option>
                              <option value="registration">Registration</option>
                              <option value="certificate">Certificate</option>
                              <option value="other">Other</option>
                            </select>
                            
                            {updateInfo && (
                              <button
                                onClick={() => handleRemoveDocumentUpdate(doc.id)}
                                className="document-action-btn remove"
                              >
                                <X size={16} />
                                Cancel
                              </button>
                            )}
                          </>
                        )}
                      </div>
                      
                      {updateInfo?.file && (
                        <div className="document-update-preview">
                          <p className="text-xs text-blue-600">
                            New file: {updateInfo.file.name} ({(updateInfo.file.size / 1024).toFixed(2)} KB)
                    </p>
                  </div>
                )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* New Documents to Upload */}
            {isEditing && newDocuments.length > 0 && (
              <div className="new-documents-section mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">New Documents to Upload</h3>
                <div className="documents-grid">
                  {newDocuments.map((doc, index) => (
                    <div key={index} className="document-card new-document">
                      <div className="document-card-header">
                        <div className="document-icon">
                          <File size={24} />
                        </div>
                        <div className="document-info">
                          <h3 className="document-title">{getDocumentTypeLabel(doc.document_type)}</h3>
                          <p className="document-date">{doc.file.name} ({(doc.file.size / 1024).toFixed(2)} KB)</p>
                        </div>
                        <button
                          onClick={() => handleRemoveNewDocument(index)}
                          className="document-remove-btn"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload New Document */}
            {isEditing && (
              <label className="upload-document-section" htmlFor="document-upload-input">
                <div className="upload-document-content">
                  <Upload size={24} className="upload-icon" />
                  <div className="upload-text">
                    <p className="upload-main-text">Click to upload document</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Accepted formats: PDF, JPG, JPEG, PNG (Max 10MB)
                    </p>
                  </div>
                </div>
                <input
                  id="document-upload-input"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      handleAddNewDocument(file, newDocumentType);
                    }
                    e.target.value = ''; // Reset input
                  }}
                />
              </label>
            )}
            
            {!isEditing && documents.length === 0 && (
              <div className="no-documents-message">
                <FileText size={48} className="text-gray-300" />
                <p className="text-gray-500">No documents uploaded yet</p>
              </div>
            )}
          </div>
        </form>

        {/* Stripe Account Management Section */}
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
              {/* Current Status */}
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

              {/* Stripe Account ID Input */}
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

                {/* Verify Button */}
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

                {/* Verification Result */}
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

                {/* Error Message */}
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

              {/* Remove Button */}
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

              {/* Information */}
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

              {/* Save and Cancel Buttons */}
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
        </div>

        {/* Change Password Section - Separate from Profile Form */}
        <div className="profile-content password-section">
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

            <form onSubmit={handleChangePassword} className="password-form">
              <div className="space-y-4">
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
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileScreen;
