import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    MenuItem,
    IconButton,
    Backdrop,
    CircularProgress
} from '@mui/material';
import {
    Visibility,
    VisibilityOff,
    CloudUpload as CloudUploadIcon,
    ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import CustomInput from '../../../components/CustomInput/CustomInput';
import PasswordHints from '../../../components/PasswordHints/PasswordHints';
import {
    validateEmail,
    validatePassword
} from '../../../utils/validation';
import { publicAPI, authAPI } from '../../../services/api';
import './CompleteRegistrationScreen.css';

const InterestChip = ({ label, checked, onChange }) => (
    <label className={`chip ${checked ? 'active' : ''}`}>
        <input
            type="checkbox"
            checked={checked}
            onChange={() => onChange(label)}
        />
        <span>{label}</span>
    </label>
);

const FileUploadField = ({ label, required, acceptedTypes = ".pdf,.jpg,.jpeg,.png", name, onChange, error, fileName }) => (
    <div className="field">
        <label>{label} <span className="req">{required && '*'}</span></label>
        <div
            className={`file-upload-box ${error ? 'error-border' : ''}`}
            style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: '20px', borderRadius: '12px', border: error ? '1px dashed red' : '1px dashed rgba(0,0,0,0.1)',
                cursor: 'pointer', backgroundColor: fileName ? '#f0f9ff' : 'transparent'
            }}
            onClick={() => document.getElementById(`file-${name}`).click()}
        >
            <CloudUploadIcon sx={{ color: error ? 'red' : 'text.secondary', mb: 1 }} />
            <span style={{ fontSize: '12px', color: error ? 'red' : 'text.secondary', textAlign: 'center' }}>
                {fileName ? (
                    <span style={{ color: '#000', fontWeight: 'bold' }}>{fileName}</span>
                ) : (
                    <>
                        Click to upload<br />
                        {acceptedTypes.replace(/\./g, '').toUpperCase().split(',').join(', ')}
                    </>
                )}
            </span>
            <input
                id={`file-${name}`}
                type="file"
                hidden
                accept={acceptedTypes}
                onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) onChange(name, file);
                }}
            />
        </div>
        {error && <span className="error-text" style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>{error}</span>}
    </div>
);

const CompleteRegistrationScreen = () => {
    const location = useLocation();
    const navigate = useNavigate();

    // Default to 'training_center', but will update based on navigation state
    const [role, setRole] = useState('training_center');
    const [submitting, setSubmitting] = useState(false);
    const [countries, setCountries] = useState([]);
    const [cities, setCities] = useState([]);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [formData, setFormData] = useState({
        // Auth & Organization
        company_name: '',
        name: '', // ACC Admin Name
        website: '',
        primary_email: '', // Company/Body Email
        password: '',
        confirm_password: '',
        telephone: '',
        fax: '',
        provider_type: '',

        // Physical Address
        physical_address: '',
        physical_city: '',
        physical_country: '',
        physical_postal: '',

        // Mailing Address
        mailing_same_as_physical: null, // Initially null/unset logic if needed, but UI uses checkbox
        mailing_address: '',
        mailing_city: '',
        mailing_country: '',
        mailing_postal: '',

        // Primary Contact
        primary_title: '',
        primary_first_name: '',
        primary_last_name: '',
        primary_email_contact: '',
        primary_country: '',
        primary_mobile: '',

        // Secondary Contact
        has_secondary_contact: false,
        secondary_title: '',
        secondary_first_name: '',
        secondary_last_name: '',
        secondary_email: '',
        secondary_country: '',
        secondary_mobile: '',

        // Additional Info
        company_gov_registry_number: '', // Renamed in mapping later
        referral_source: '',
        interested_fields: [],

        // Files
        company_registration_certificate: null,
        facility_floorplan: null,

        // Consents
        agree_communications: false,
        agree_terms: false
    });

    const [errors, setErrors] = useState({});

    // Init Role from Router State
    useEffect(() => {
        if (location.state?.role) {
            // Map 'training_center_admin' -> 'training_center' to simplify internal logic
            const r = location.state.role === 'training_center_admin' ? 'training_center' : location.state.role;
            setRole(r);
        }
    }, [location.state]);

    // Fetch Locations 
    useEffect(() => {
        const fetchCountries = async () => {
            try {
                const response = await publicAPI.getCountries();
                // Handle different response structures: { countries: [...] } vs [...]
                setCountries(response.countries || response.data || []);
            } catch (error) {
                console.error("Failed to fetch countries", error);
            }
        };
        fetchCountries();
    }, []);

    const fetchCities = async (countryCode) => {
        try {
            const response = await publicAPI.getCities(countryCode);
            // API returns array of city objects or { cities: [...] }
            setCities(response.cities || response.data || response || []);
        } catch (error) {
            console.error("Failed to fetch cities", error);
            setCities([]);
        }
    };

    const handleChange = (e) => {
        const { name, value, checked, type } = e.target;

        // Handle "Same as Physical" checkbox logic specifically if needed
        if (name === 'mailing_same_as_physical') {
            setFormData(prev => ({ ...prev, [name]: checked }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: type === 'checkbox' ? checked : value
            }));
        }

        if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
        if (name === 'physical_country') fetchCities(value);
    };

    const handleInterestChange = (interest) => {
        setFormData(prev => {
            const current = prev.interested_fields;
            if (current.includes(interest)) {
                return { ...prev, interested_fields: current.filter(i => i !== interest) };
            } else {
                return { ...prev, interested_fields: [...current, interest] };
            }
        });
    };

    const handleFileChange = (name, file) => {
        setFormData(prev => ({ ...prev, [name]: file }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
    };

    const validateForm = () => {
        const newErrors = {};
        const isTrainingCenter = role === 'training_center';

        // 1. Company Info
        if (!formData.company_name) newErrors.company_name = 'Required';
        if (role === 'acc_admin' && !formData.name) newErrors.name = 'Required';
        if (role === 'training_center' && !formData.name) newErrors.name = 'Required';

        // Company Email
        if (!formData.primary_email) newErrors.primary_email = 'Required';
        else if (validateEmail(formData.primary_email)) newErrors.primary_email = 'Invalid email';

        // Password
        const passErr = validatePassword(formData.password, 8, true);
        if (passErr) newErrors.password = passErr;
        if (formData.password !== formData.confirm_password) newErrors.confirm_password = 'Passwords mismatch';

        // Telephone
        if (!formData.telephone) newErrors.telephone = 'Required';

        // Training Provider Type
        if (isTrainingCenter && !formData.provider_type) newErrors.provider_type = 'Required';

        // 2. Physical Address
        if (!formData.physical_address) newErrors.physical_address = 'Required';
        if (!formData.physical_city) newErrors.physical_city = 'Required';
        if (!formData.physical_country) newErrors.physical_country = 'Required';
        if (!formData.physical_postal) newErrors.physical_postal = 'Required';

        // 3. Mailing Address
        if (!formData.mailing_same_as_physical) {
            // For Training Center, conditional requiring. For Acc Admin, usually required.
            // Based on API doc: "If 'Same as Physical Address' is Unchecked: The following fields become required" for TC.
            if (!formData.mailing_address) newErrors.mailing_address = 'Required';
            if (!formData.mailing_city) newErrors.mailing_city = 'Required';
            if (!formData.mailing_country) newErrors.mailing_country = 'Required';
            if (!formData.mailing_postal) newErrors.mailing_postal = 'Required';
        }

        // 4. Primary Contact
        if (!formData.primary_title) newErrors.primary_title = 'Required';
        if (!formData.primary_first_name) newErrors.primary_first_name = 'Required';
        if (!formData.primary_last_name) newErrors.primary_last_name = 'Required';
        if (!formData.primary_email_contact) newErrors.primary_email_contact = 'Required';
        else if (validateEmail(formData.primary_email_contact)) newErrors.primary_email_contact = 'Invalid email';
        if (!formData.primary_country) newErrors.primary_country = 'Required';
        if (!formData.primary_mobile) newErrors.primary_mobile = 'Required';

        // 5. Secondary Contact
        // Logic: "Secondary Contact (Required for ACC)" vs "Optional for Training Center"
        if (role === 'acc_admin') {
            // For ACC, check all fields regardless of has_secondary_contact flag (it should be forced true or UI should imply it)
            if (!formData.secondary_title) newErrors.secondary_title = 'Required';
            if (!formData.secondary_first_name) newErrors.secondary_first_name = 'Required';
            if (!formData.secondary_last_name) newErrors.secondary_last_name = 'Required';
            if (!formData.secondary_email) newErrors.secondary_email = 'Required';
            else if (validateEmail(formData.secondary_email)) newErrors.secondary_email = 'Invalid email';
            if (!formData.secondary_country) newErrors.secondary_country = 'Required';
            if (!formData.secondary_mobile) newErrors.secondary_mobile = 'Required';
        } else if (formData.has_secondary_contact) {
            // For Training Center, only if checked
            if (!formData.secondary_title) newErrors.secondary_title = 'Required';
            if (!formData.secondary_first_name) newErrors.secondary_first_name = 'Required';
            if (!formData.secondary_last_name) newErrors.secondary_last_name = 'Required';
            if (!formData.secondary_email) newErrors.secondary_email = 'Required';
            else if (validateEmail(formData.secondary_email)) newErrors.secondary_email = 'Invalid email';
            if (!formData.secondary_country) newErrors.secondary_country = 'Required';
            if (!formData.secondary_mobile) newErrors.secondary_mobile = 'Required';
        }

        // 6. Additional Info
        // Gov Registry Number is Required for TC and ACC
        // The input name is 'gov_registry_number' so we must validate that key.
        if (!formData.gov_registry_number) newErrors.gov_registry_number = 'Required';

        // Files
        // Company Registration Certificate: Required
        if (!formData.company_registration_certificate) newErrors.company_registration_certificate = 'Required';

        // Passport Uploads (Required for ACC)
        if (role === 'acc_admin') {
            if (!formData.primary_contact_passport) newErrors.primary_contact_passport = 'Required';
            if (!formData.secondary_contact_passport) newErrors.secondary_contact_passport = 'Required';
        }

        // Facility Floorplan required for Training Center
        if (isTrainingCenter && !formData.facility_floorplan) newErrors.facility_floorplan = 'Required';


        // 7. Consents - Both must be true
        if (!formData.agree_communications) newErrors.agree_communications = 'Required';
        if (!formData.agree_terms) newErrors.agree_terms = 'Required';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (validateForm()) {
            setSubmitting(true);
            try {
                const isTrainingCenter = role === 'training_center';
                const submissionData = new FormData();

                // --- User Account Fields ---
                // Name: Use the name field for both ACC and TC
                const userName = formData.name || `${formData.primary_first_name} ${formData.primary_last_name}`.trim();
                submissionData.append('name', userName);
                // Email: Spec says "User's email". Using Primary Contact Email (User Account email).
                submissionData.append('email', formData.primary_email);
                submissionData.append('password', formData.password);
                submissionData.append('password_confirmation', formData.confirm_password);

                // Role Mapping
                submissionData.append('role', isTrainingCenter ? 'training_center_admin' : 'acc_admin');

                // --- Training Center / Entity Fields ---

                if (isTrainingCenter) {
                    submissionData.append('company_name', formData.company_name);
                    submissionData.append('company_email', formData.primary_email);
                } else {
                    submissionData.append('legal_name', formData.company_name);
                    submissionData.append('acc_email', formData.primary_email);
                }

                // Primary Contact
                submissionData.append('primary_contact_title', formData.primary_title);
                submissionData.append('primary_contact_first_name', formData.primary_first_name);
                submissionData.append('primary_contact_last_name', formData.primary_last_name);
                submissionData.append('primary_contact_email', formData.primary_email_contact);

                submissionData.append('telephone', formData.telephone); // Legacy support
                submissionData.append('telephone_number', formData.telephone); // Correct field
                if (formData.website) submissionData.append('website', formData.website);
                if (formData.fax) submissionData.append('fax', formData.fax);

                if (isTrainingCenter) {
                    submissionData.append('training_provider_type', formData.provider_type);
                }

                // Physical Address
                submissionData.append('address', formData.physical_address);
                submissionData.append('city', formData.physical_city);
                submissionData.append('country', formData.physical_country);
                submissionData.append('postal_code', formData.physical_postal);

                // Mailing Address
                const mailingSame = formData.mailing_same_as_physical ? 1 : 0;
                submissionData.append('mailing_same_as_physical', mailingSame);

                if (!mailingSame) {
                    submissionData.append('mailing_address', formData.mailing_address);
                    submissionData.append('mailing_city', formData.mailing_city);
                    submissionData.append('mailing_country', formData.mailing_country);
                    submissionData.append('mailing_postal_code', formData.mailing_postal);
                }

                submissionData.append('primary_contact_country', formData.primary_country);
                submissionData.append('primary_contact_mobile', formData.primary_mobile);

                // Secondary Contact
                // For ACC, secondary contact is mandatory.
                // For TC, it's optional based on checkbox.
                const shouldSendSecondary = !isTrainingCenter || formData.has_secondary_contact;

                // Set flag: for TC it's 0/1. For ACC, it's effectively 1 but API might ignore it or we just send fields.
                // Spec for ACC says "Secondary Contact (Required for ACC)".
                // We'll send has_secondary_contact=1 if ACC, just to be safe, or 0/1 if TC.
                submissionData.append('has_secondary_contact', shouldSendSecondary ? 1 : 0);

                if (shouldSendSecondary) {
                    submissionData.append('secondary_contact_title', formData.secondary_title);
                    submissionData.append('secondary_contact_first_name', formData.secondary_first_name);
                    submissionData.append('secondary_contact_last_name', formData.secondary_last_name);
                    submissionData.append('secondary_contact_email', formData.secondary_email);
                    submissionData.append('secondary_contact_country', formData.secondary_country);
                    submissionData.append('secondary_contact_mobile', formData.secondary_mobile);
                }

                // Additional Information
                // Additional Information
                submissionData.append('company_gov_registry_number', formData.gov_registry_number);
                if (formData.referral_source) submissionData.append('how_did_you_hear_about_us', formData.referral_source); // Optional per ACC Spec

                // Interested Fields (Array) - Only for Training Center
                if (isTrainingCenter && formData.interested_fields.length > 0) {
                    formData.interested_fields.forEach((field, index) => {
                        submissionData.append(`interested_fields[${index}]`, field);
                    });
                }

                // Agreements
                submissionData.append('agreed_to_receive_communications', formData.agree_communications ? 1 : 0);
                submissionData.append('agreed_to_terms_and_conditions', formData.agree_terms ? 1 : 0);

                // Files
                if (formData.company_registration_certificate) {
                    submissionData.append('company_registration_certificate', formData.company_registration_certificate);
                }

                if (isTrainingCenter && formData.facility_floorplan) {
                    submissionData.append('facility_floorplan', formData.facility_floorplan);
                }

                // ACC Passport Uploads
                if (!isTrainingCenter) {
                    if (formData.primary_contact_passport) submissionData.append('primary_contact_passport', formData.primary_contact_passport);
                    if (formData.secondary_contact_passport) submissionData.append('secondary_contact_passport', formData.secondary_contact_passport);
                }

                console.log("Submitting Registration...", Object.fromEntries(submissionData));

                await authAPI.register(submissionData);

                alert("Registration successful! Please check your email.");
                navigate('/login');

            } catch (error) {
                console.error("Registration validation failed:", error);
                if (error.response?.data?.errors) {
                    setErrors(error.response.data.errors);
                    // Scroll to top to see errors
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                } else {
                    alert('Registration failed. Please try again.');
                }
            } finally {
                setSubmitting(false);
            }
        } else {
            console.log("Form validation failed", errors);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const isTraining = role === 'training_center';
    const isAcc = role === 'acc_admin';

    // Helper to generate Title Dropdown items
    const titleOptions = [
        { value: 'Mr.', label: 'Mr.' },
        { value: 'Mrs.', label: 'Mrs.' },
        { value: 'Eng.', label: 'Eng.' },
        { value: 'Prof.', label: 'Prof.' }
    ];

    return (
        <div className="auth-page-root">
            <main className="shell">
                <header className="topbar">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <IconButton onClick={() => navigate(-1)} sx={{ color: 'var(--text-primary)' }}>
                            <ArrowBackIcon />
                        </IconButton>
                        <div>
                            <h1>Create Account</h1>
                            <p>{isTraining ? 'Training Center Registration' : 'Accreditation Body Registration'}</p>
                        </div>
                    </div>
                </header>

                <form className="registration-card" onSubmit={handleSubmit} noValidate>

                    {/* --- Company Information --- */}
                    <section className="section">
                        <div className="section-head">
                            <h2>{isAcc ? 'Accreditation Body Information' : 'Company Information'}</h2>
                            <span className="hint">* Required fields</span>
                        </div>

                        <div className="grid">
                            <div className="field">
                                <label>{isAcc ? 'Accreditation Legal Name' : 'Company Name'} <span className="req">*</span></label>
                                <CustomInput
                                    name="company_name"
                                    value={formData.company_name}
                                    onChange={handleChange}
                                    error={!!errors.company_name}
                                    helperText={errors.company_name}
                                />
                            </div>
                            {isAcc && (
                                <div className="field">
                                    <label>Name <span className="req">*</span></label>
                                    <CustomInput
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        error={!!errors.name}
                                        helperText={errors.name}
                                    />
                                </div>
                            )}
                            {isTraining && (
                                <div className="field">
                                    <label>Name <span className="req">*</span></label>
                                    <CustomInput
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        error={!!errors.name}
                                        helperText={errors.name}
                                    />
                                </div>
                            )}
                            <div className="field">
                                <label>Website</label>
                                <CustomInput
                                    name="website"
                                    value={formData.website}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="field" style={{ gridColumn: 'span 12' }}>
                                <label>{isAcc ? 'Email address' : 'Company Email address'} <span className="req">*</span></label>
                                <CustomInput
                                    name="primary_email"
                                    value={formData.primary_email}
                                    onChange={handleChange}
                                    error={!!errors.primary_email}
                                    helperText={errors.primary_email}
                                />
                            </div>

                            {/* Password Fields */}
                            <div className="field">
                                <label>Password <span className="req">*</span></label>
                                <CustomInput
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={formData.password}
                                    onChange={handleChange}
                                    error={!!errors.password}
                                    helperText={errors.password}
                                    endIcon={
                                        <IconButton onClick={() => setShowPassword(!showPassword)} size="small" sx={{ color: 'text.secondary' }}>
                                            {showPassword ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    }
                                />
                                {formData.password && <PasswordHints password={formData.password} />}
                            </div>
                            <div className="field">
                                <label>Confirm Password <span className="req">*</span></label>
                                <CustomInput
                                    name="confirm_password"
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    value={formData.confirm_password}
                                    onChange={handleChange}
                                    error={!!errors.confirm_password}
                                    helperText={errors.confirm_password}
                                    endIcon={
                                        <IconButton onClick={() => setShowConfirmPassword(!showConfirmPassword)} size="small" sx={{ color: 'text.secondary' }}>
                                            {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    }
                                />
                            </div>

                            <div className="field">
                                <label>Telephone Number <span className="req">*</span></label>
                                <CustomInput
                                    name="telephone"
                                    value={formData.telephone}
                                    onChange={handleChange}
                                    error={!!errors.telephone}
                                    helperText={errors.telephone}
                                />
                            </div>
                            <div className="field">
                                <label>Fax</label>
                                <CustomInput
                                    name="fax"
                                    value={formData.fax}
                                    onChange={handleChange}
                                />
                            </div>

                            {isTraining && (
                                <div className="field">
                                    <label>Training Provider Type <span className="req">*</span></label>
                                    <CustomInput
                                        select
                                        name="provider_type"
                                        value={formData.provider_type}
                                        onChange={handleChange}
                                        error={!!errors.provider_type}
                                    >
                                        <MenuItem value="Training Center">Training Center</MenuItem>
                                        <MenuItem value="Institute">Institute</MenuItem>
                                        <MenuItem value="University">University</MenuItem>
                                    </CustomInput>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* --- Physical Address --- */}
                    <section className="section">
                        <div className="section-head">
                            <h2>Physical Address <span className="req">*</span></h2>
                        </div>
                        <div className="grid">
                            <div className="field">
                                <label>Address <span className="req">*</span></label>
                                <CustomInput
                                    name="physical_address"
                                    value={formData.physical_address}
                                    onChange={handleChange}
                                    error={!!errors.physical_address}
                                />
                            </div>
                            <div className="field">
                                <label>Country <span className="req">*</span></label>
                                <CustomInput
                                    select
                                    name="physical_country"
                                    value={formData.physical_country}
                                    onChange={handleChange}
                                    error={!!errors.physical_country}
                                >
                                    {countries.map(c => <MenuItem key={c.code} value={c.code}>{c.name}</MenuItem>)}
                                </CustomInput>
                            </div>
                            <div className="field">
                                <label>City <span className="req">*</span></label>
                                <CustomInput
                                    select
                                    name="physical_city"
                                    value={formData.physical_city}
                                    onChange={handleChange}
                                    error={!!errors.physical_city}
                                    disabled={!cities.length}
                                >
                                    {cities.map(c => <MenuItem key={c.id} value={c.name}>{c.name}</MenuItem>)}
                                </CustomInput>
                            </div>
                            <div className="field">
                                <label>Postal Code <span className="req">*</span></label>
                                <CustomInput
                                    name="physical_postal"
                                    value={formData.physical_postal}
                                    onChange={handleChange}
                                    error={!!errors.physical_postal}
                                />
                            </div>
                        </div>
                    </section>

                    {/* --- Mailing Address --- */}
                    <section className="section">
                        <div className="section-head">
                            <h2>Mailing address {isAcc && <span className="req">*</span>}</h2>
                            {isTraining && <span className="hint">(Optional)</span>}
                        </div>
                        <div className="row">
                            <label className="check">
                                <input
                                    type="checkbox"
                                    checked={formData.mailing_same_as_physical ?? false}
                                    onChange={(e) => handleChange({ target: { name: 'mailing_same_as_physical', type: 'checkbox', checked: e.target.checked } })}
                                />
                                <span>Same as Physical address</span>
                            </label>
                        </div>

                        {!formData.mailing_same_as_physical && (
                            <div className="grid">
                                <div className="field">
                                    <label>Address {isAcc && <span className="req">*</span>}</label>
                                    <CustomInput
                                        name="mailing_address"
                                        value={formData.mailing_address}
                                        onChange={handleChange}
                                        error={!!errors.mailing_address}
                                    />
                                </div>
                                <div className="field">
                                    <label>Country {isAcc && <span className="req">*</span>}</label>
                                    <CustomInput
                                        select
                                        name="mailing_country"
                                        value={formData.mailing_country}
                                        onChange={handleChange}
                                        error={!!errors.mailing_country}
                                    >
                                        {countries.map(c => <MenuItem key={c.code} value={c.code}>{c.name}</MenuItem>)}
                                    </CustomInput>
                                </div>
                                <div className="field">
                                    <label>City {isAcc && <span className="req">*</span>}</label>
                                    <CustomInput
                                        name="mailing_city"
                                        value={formData.mailing_city}
                                        onChange={handleChange}
                                        error={!!errors.mailing_city}
                                    />
                                </div>
                                <div className="field">
                                    <label>Postal Code {isAcc && <span className="req">*</span>}</label>
                                    <CustomInput
                                        name="mailing_postal"
                                        value={formData.mailing_postal}
                                        onChange={handleChange}
                                        error={!!errors.mailing_postal}
                                    />
                                </div>
                            </div>
                        )}
                    </section>

                    {/* --- Primary Contact --- */}
                    <section className="section">
                        <div className="section-head">
                            <h2>Primary Contact <span className="req">*</span></h2>
                        </div>
                        <div className="grid">
                            <div className="field" style={{ gridColumn: 'span 3' }}>
                                <label>Title <span className="req">*</span></label>
                                <CustomInput
                                    select
                                    name="primary_title"
                                    value={formData.primary_title}
                                    onChange={handleChange}
                                    error={!!errors.primary_title}
                                >
                                    {titleOptions.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
                                </CustomInput>
                            </div>
                            <div className="field" style={{ gridColumn: 'span 9' }}>
                                <label>First Name <span className="req">*</span></label>
                                <CustomInput
                                    name="primary_first_name"
                                    value={formData.primary_first_name}
                                    onChange={handleChange}
                                    error={!!errors.primary_first_name}
                                />
                            </div>
                            <div className="field">
                                <label>Last Name <span className="req">*</span></label>
                                <CustomInput
                                    name="primary_last_name"
                                    value={formData.primary_last_name}
                                    onChange={handleChange}
                                    error={!!errors.primary_last_name}
                                />
                            </div>
                            <div className="field">
                                <label>E-mail address <span className="req">*</span></label>
                                <CustomInput
                                    name="primary_email_contact"
                                    value={formData.primary_email_contact}
                                    onChange={handleChange}
                                    error={!!errors.primary_email_contact}
                                />
                            </div>
                            <div className="field">
                                <label>Country <span className="req">*</span></label>
                                <CustomInput
                                    select
                                    name="primary_country"
                                    value={formData.primary_country}
                                    onChange={handleChange}
                                    error={!!errors.primary_country}
                                >
                                    {countries.map(c => <MenuItem key={c.code} value={c.code}>{c.name}</MenuItem>)}
                                </CustomInput>
                            </div>
                            <div className="field">
                                <label>Mobile Number <span className="req">*</span></label>
                                <CustomInput
                                    name="primary_mobile"
                                    value={formData.primary_mobile}
                                    onChange={handleChange}
                                    error={!!errors.primary_mobile}
                                />
                            </div>
                            {isAcc && (
                                <div className="field">
                                    <FileUploadField
                                        label="Upload Primary Contact Passport"
                                        required
                                        name="primary_contact_passport"
                                        fileName={formData.primary_contact_passport?.name}
                                        onChange={handleFileChange}
                                        error={errors.primary_contact_passport}
                                    />
                                </div>
                            )}
                        </div>
                    </section>

                    {/* --- Secondary Contact --- */}
                    <section className="section">
                        <div className="section-head">
                            <h2>Secondary Contact {isAcc ? <span className="req">* (Required)</span> : <span className="hint">(Optional)</span>}</h2>
                        </div>

                        {/* Checkbox only for Training Center */}
                        {isTraining && (
                            <div className="row">
                                <label className="check">
                                    <input
                                        type="checkbox"
                                        checked={formData.has_secondary_contact}
                                        onChange={(e) => handleChange({ target: { name: 'has_secondary_contact', type: 'checkbox', checked: e.target.checked } })}
                                    />
                                    <span>Add Secondary Contact</span>
                                </label>
                            </div>
                        )}

                        {/* Always show for ACC, or if checked for Training */}
                        {(isAcc || formData.has_secondary_contact) && (
                            <div className="grid">
                                <div className="field" style={{ gridColumn: 'span 3' }}>
                                    <label>Title <span className="req">*</span></label>
                                    <CustomInput
                                        select
                                        name="secondary_title"
                                        value={formData.secondary_title}
                                        onChange={handleChange}
                                        error={!!errors.secondary_title}
                                    >
                                        {titleOptions.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
                                    </CustomInput>
                                </div>
                                <div className="field" style={{ gridColumn: 'span 9' }}>
                                    <label>First Name <span className="req">*</span></label>
                                    <CustomInput
                                        name="secondary_first_name"
                                        value={formData.secondary_first_name}
                                        onChange={handleChange}
                                        error={!!errors.secondary_first_name}
                                    />
                                </div>
                                <div className="field">
                                    <label>Last Name <span className="req">*</span></label>
                                    <CustomInput
                                        name="secondary_last_name"
                                        value={formData.secondary_last_name}
                                        onChange={handleChange}
                                        error={!!errors.secondary_last_name}
                                    />
                                </div>
                                <div className="field">
                                    <label>E-mail address <span className="req">*</span></label>
                                    <CustomInput
                                        name="secondary_email"
                                        value={formData.secondary_email}
                                        onChange={handleChange}
                                        error={!!errors.secondary_email}
                                    />
                                </div>
                                <div className="field">
                                    <label>Country <span className="req">*</span></label>
                                    <CustomInput
                                        select
                                        name="secondary_country"
                                        value={formData.secondary_country}
                                        onChange={handleChange}
                                        error={!!errors.secondary_country}
                                    >
                                        {countries.map(c => <MenuItem key={c.code} value={c.code}>{c.name}</MenuItem>)}
                                    </CustomInput>
                                </div>
                                <div className="field">
                                    <label>Mobile Number <span className="req">*</span></label>
                                    <CustomInput
                                        name="secondary_mobile"
                                        value={formData.secondary_mobile}
                                        onChange={handleChange}
                                        error={!!errors.secondary_mobile}
                                    />
                                </div>
                                {isAcc && (
                                    <div className="field">
                                        <FileUploadField
                                            label="Upload Secondary Contact Passport"
                                            required
                                            name="secondary_contact_passport"
                                            fileName={formData.secondary_contact_passport?.name}
                                            onChange={handleFileChange}
                                            error={errors.secondary_contact_passport}
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                    </section>

                    {/* --- Additional Info --- */}
                    <section className="section">
                        <div className="section-head">
                            <h2>Additional Info</h2>
                        </div>
                        <div className="grid">
                            <div className="field">
                                <label>Company GOV Registry Number <span className="req">*</span></label>
                                <CustomInput
                                    name="gov_registry_number"
                                    value={formData.gov_registry_number}
                                    onChange={handleChange}
                                    error={!!errors.company_gov_registry_number || !!errors.gov_registry_number} // Check both keys
                                    helperText={errors.company_gov_registry_number || errors.gov_registry_number}
                                />
                            </div>
                            <FileUploadField
                                label="Upload the Company Registration Certificate"
                                required
                                name="company_registration_certificate"
                                fileName={formData.company_registration_certificate?.name}
                                onChange={handleFileChange}
                                error={errors.company_registration_certificate}
                            />

                            {isTraining && (
                                <>
                                    <FileUploadField
                                        label="Upload facility floorplan"
                                        required
                                        name="facility_floorplan"
                                        fileName={formData.facility_floorplan?.name}
                                        onChange={handleFileChange}
                                        error={errors.facility_floorplan}
                                    />
                                    <div className="field">
                                        <label>Interested Fields</label>
                                        <div className="chips">
                                            {['QHSE', 'Food Safety', 'Management'].map(f => (
                                                <InterestChip
                                                    key={f}
                                                    label={f}
                                                    checked={formData.interested_fields.includes(f)}
                                                    onChange={handleInterestChange}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}

                            <div className="field">
                                <label>How did you hear about us?</label>
                                <CustomInput
                                    name="referral_source"
                                    value={formData.referral_source}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                    </section>

                    {/* --- Consents --- */}
                    <section className="section">
                        <div className="section-head">
                            <h2>Check marks <span className="req">*</span></h2>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <label className="check">
                                <input
                                    type="checkbox"
                                    checked={formData.agree_communications}
                                    onChange={(e) => handleChange({ target: { name: 'agree_communications', type: 'checkbox', checked: e.target.checked } })}
                                />
                                <span>I agreed to receive other communications from {isAcc ? 'BOMEQP' : 'Accreditation Name'}. <a href="#" style={{ color: 'var(--primary)' }}>Privacy Policy</a></span>
                            </label>
                            {errors.agree_communications && <span className="req" style={{ fontSize: '12px' }}>Required</span>}

                            <label className="check">
                                <input
                                    type="checkbox"
                                    checked={formData.agree_terms}
                                    onChange={(e) => handleChange({ target: { name: 'agree_terms', type: 'checkbox', checked: e.target.checked } })}
                                />
                                <span>I confirm that I have read, understood, and accepted the terms and conditions.</span>
                            </label>
                            {errors.agree_terms && <span className="req" style={{ fontSize: '13px' }}>You must accept the terms.</span>}
                        </div>
                    </section>

                    <footer className="actions">
                        <button type="submit" className="btn primary">Create account</button>
                    </footer>

                </form>
            </main>
            <Backdrop
                sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
                open={submitting}
            >
                <CircularProgress color="inherit" />
            </Backdrop>
        </div>
    );
};

export default CompleteRegistrationScreen;
