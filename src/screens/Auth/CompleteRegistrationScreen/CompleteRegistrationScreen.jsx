import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    MenuItem,
    IconButton
} from '@mui/material';
import {
    Visibility,
    VisibilityOff,
    CloudUpload as CloudUploadIcon
} from '@mui/icons-material';
import CustomInput from '../../../components/CustomInput/CustomInput';
import PasswordHints from '../../../components/PasswordHints/PasswordHints';
import {
    validateEmail,
    validatePassword
} from '../../../utils/validation';
import { publicAPI } from '../../../services/api';
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

const FileUploadField = ({ label, required, acceptedTypes = ".pdf,.jpg,.jpeg,.png" }) => (
    <div className="field">
        <label>{label} <span className="req">{required && '*'}</span></label>
        <div className="file-upload-box" style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '20px', borderRadius: '12px', border: '1px dashed rgba(0,0,0,0.1)'
        }}>
            <CloudUploadIcon sx={{ color: 'text.secondary', mb: 1 }} />
            <span style={{ fontSize: '12px', color: 'text.secondary' }}>
                {acceptedTypes.replace(/\./g, '').toUpperCase().split(',').join(', ')}
            </span>
            <input type="file" hidden accept={acceptedTypes} />
        </div>
    </div>
);

const CompleteRegistrationScreen = () => {
    const location = useLocation();
    const navigate = useNavigate();

    // Default to 'training_center', but will update based on navigation state
    const [role, setRole] = useState('training_center');
    const [countries, setCountries] = useState([]);
    const [cities, setCities] = useState([]);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [formData, setFormData] = useState({
        // Auth & Organization
        company_name: '',
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
        gov_registry_number: '',
        referral_source: '',
        interested_fields: [],

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
                setCountries(response.data || []);
            } catch (error) {
                console.error("Failed to fetch countries", error);
            }
        };
        fetchCountries();
    }, []);

    const fetchCities = async (countryCode) => {
        try {
            const response = await publicAPI.getCities({ country: countryCode });
            setCities(response.data || []);
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

    const validateForm = () => {
        const newErrors = {};

        // 1. Company Info
        if (!formData.company_name) newErrors.company_name = 'Required';

        // Website is optional for Training Center? User said "Website:" in list, but usually optional. Assuming optional unless strict.
        // User list has checks (*) on "Company information", "Physical address", "Primary Contact", "Check marks" section headers.
        // But individual fields inside might not be?

        if (!formData.primary_email) newErrors.primary_email = 'Required';
        else if (!validateEmail(formData.primary_email)) newErrors.primary_email = 'Invalid email';

        const passErr = validatePassword(formData.password, 8, true);
        if (passErr) newErrors.password = passErr;
        if (formData.password !== formData.confirm_password) newErrors.confirm_password = 'Passwords mismatch';

        // Telephone & Fax
        if (!formData.telephone) newErrors.telephone = 'Required';
        // Fax optional usually

        // Training Provider Type (Training Center Only)
        if (role === 'training_center' && !formData.provider_type) newErrors.provider_type = 'Required';

        // 2. Physical Address (Starred Section)
        if (!formData.physical_address) newErrors.physical_address = 'Required';
        if (!formData.physical_city) newErrors.physical_city = 'Required';
        if (!formData.physical_country) newErrors.physical_country = 'Required';
        if (!formData.physical_postal) newErrors.physical_postal = 'Required';

        // 3. Mailing Address
        // Logic: "Mailing address (non *)" for Training Center.
        // Logic: "Mailing address *" for Accreditation Body.
        if (!formData.mailing_same_as_physical) {
            if (role === 'acc_admin') {
                if (!formData.mailing_address) newErrors.mailing_address = 'Required';
                if (!formData.mailing_city) newErrors.mailing_city = 'Required';
                if (!formData.mailing_country) newErrors.mailing_country = 'Required';
                if (!formData.mailing_postal) newErrors.mailing_postal = 'Required';
            }
        }

        // 4. Primary Contact (Starred Section)
        if (!formData.primary_title) newErrors.primary_title = 'Required';
        if (!formData.primary_first_name) newErrors.primary_first_name = 'Required';
        if (!formData.primary_last_name) newErrors.primary_last_name = 'Required';
        if (!formData.primary_email_contact) newErrors.primary_email_contact = 'Required';
        else if (!validateEmail(formData.primary_email_contact)) newErrors.primary_email_contact = 'Invalid email';
        if (!formData.primary_country) newErrors.primary_country = 'Required';
        if (!formData.primary_mobile) newErrors.primary_mobile = 'Required';

        // 5. Secondary Contact (Optional usually, user said non*)
        if (formData.has_secondary_contact) {
            // If checked, fields might be optional or required? User said "Secondary Contact (non *)".
            // Usually if you explicity Check "Add Secondary", you imply you want to fill it. 
            // Acc Body section says "Secondary Contact *". So required for Acc, Optional for Training?
            if (role === 'acc_admin') {
                if (!formData.secondary_title) newErrors.secondary_title = 'Required';
                if (!formData.secondary_first_name) newErrors.secondary_first_name = 'Required';
                if (!formData.secondary_last_name) newErrors.secondary_last_name = 'Required';
                if (!formData.secondary_email) newErrors.secondary_email = 'Required';
                if (!formData.secondary_country) newErrors.secondary_country = 'Required';
                if (!formData.secondary_mobile) newErrors.secondary_mobile = 'Required';
            }
        }

        // 6. Additional Info
        if (!formData.gov_registry_number) newErrors.gov_registry_number = 'Required';
        // File validations would happen here normally

        // 7. Consents
        if (!formData.agree_terms) newErrors.agree_terms = 'Required';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (validateForm()) {
            console.log("Submitting:", { role, ...formData });
            alert("Registration Submitted! (Check Console)");
        } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const isTraining = role === 'training_center';
    const isAcc = role === 'acc_admin';

    // Helper to generate Title Dropdown items
    const titleOptions = [
        { value: 'Mr', label: 'Mr.' },
        { value: 'Mrs', label: 'Mrs.' },
        { value: 'Eng', label: 'Eng.' },
        { value: 'Prof', label: 'Prof.' }
    ];

    return (
        <div className="auth-page-root">
            <main className="shell">
                <header className="topbar">
                    <div>
                        <h1>Create Account</h1>
                        <p>{isTraining ? 'Training Center Registration' : 'Accreditation Body Registration'}</p>
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
                                        <MenuItem value="training_center">Training Center</MenuItem>
                                        <MenuItem value="institute">Institute</MenuItem>
                                        <MenuItem value="university">University</MenuItem>
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
                                    <label>City {isAcc && <span className="req">*</span>}</label>
                                    <CustomInput
                                        name="mailing_city"
                                        value={formData.mailing_city}
                                        onChange={handleChange}
                                        error={!!errors.mailing_city}
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
                                    <FileUploadField label="Upload passport copy" required />
                                </div>
                            )}
                        </div>
                    </section>

                    {/* --- Secondary Contact --- */}
                    <section className="section">
                        <div className="section-head">
                            <h2>Secondary Contact {isAcc && <span className="req">*</span>}</h2>
                            {isTraining && <span className="hint">(Optional)</span>}
                        </div>
                        <div className="row">
                            <label className="check">
                                <input
                                    type="checkbox"
                                    checked={formData.has_secondary_contact}
                                    onChange={(e) => handleChange({ target: { name: 'has_secondary_contact', type: 'checkbox', checked: e.target.checked } })}
                                />
                                <span>Add Secondary Contact {isAcc && '(Required)'}</span>
                            </label>
                        </div>

                        {formData.has_secondary_contact && (
                            <div className="grid">
                                <div className="field" style={{ gridColumn: 'span 3' }}>
                                    <label>Title <span className="req">*</span></label>
                                    <CustomInput
                                        select
                                        name="secondary_title"
                                        value={formData.secondary_title}
                                        onChange={handleChange}
                                    >
                                        {titleOptions.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
                                    </CustomInput>
                                </div>
                                <div className="field" style={{ gridColumn: 'span 9' }}>
                                    <label>First Name <span className="req">*</span></label>
                                    <CustomInput name="secondary_first_name" value={formData.secondary_first_name} onChange={handleChange} />
                                </div>
                                <div className="field">
                                    <label>Last Name <span className="req">*</span></label>
                                    <CustomInput name="secondary_last_name" value={formData.secondary_last_name} onChange={handleChange} />
                                </div>
                                <div className="field">
                                    <label>E-mail address <span className="req">*</span></label>
                                    <CustomInput name="secondary_email" value={formData.secondary_email} onChange={handleChange} />
                                </div>
                                <div className="field">
                                    <label>Country <span className="req">*</span></label>
                                    <CustomInput select name="secondary_country" value={formData.secondary_country} onChange={handleChange}>
                                        {countries.map(c => <MenuItem key={c.code} value={c.code}>{c.name}</MenuItem>)}
                                    </CustomInput>
                                </div>
                                <div className="field">
                                    <label>Mobile Number <span className="req">*</span></label>
                                    <CustomInput name="secondary_mobile" value={formData.secondary_mobile} onChange={handleChange} />
                                </div>
                                {isAcc && (
                                    <div className="field">
                                        <FileUploadField label="Upload passport copy" required />
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
                                    error={!!errors.gov_registry_number}
                                />
                            </div>
                            <FileUploadField label="Upload the Company Registration Certificate" required />

                            {isTraining && (
                                <>
                                    <FileUploadField label="Upload facility floorplan" required />
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
        </div>
    );
};

export default CompleteRegistrationScreen;
