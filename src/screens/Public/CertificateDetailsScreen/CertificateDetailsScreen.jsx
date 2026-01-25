import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { publicAPI } from '../../../services/api';
import {
    CheckCircle, XCircle, Shield, User, BookOpen, Calendar,
    Building2, Mail, Phone, Globe, MapPin, FileText, ArrowLeft, Award, Hash
} from 'lucide-react';
import './CertificateDetailsScreen.css';

const CertificateDetailsScreen = () => {
    const { code } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [certificate, setCertificate] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (code && code.trim()) {
            verifyCertificate(code.trim());
        } else {
            navigate('/verify-certificate');
        }
    }, [code]);

    const verifyCertificate = async (verificationCode) => {
        setLoading(true);
        setError(null);
        setCertificate(null);

        try {
            const data = await publicAPI.verifyCertificate(verificationCode);
            const certData = data.certificate || data;

            if (certData.status === 'revoked') {
                setError('This certificate has been revoked and is no longer valid.');
                setCertificate(null);
            } else if (certData.status === 'expired') {
                setError('This certificate has expired and is no longer valid.');
                setCertificate(certData);
            } else {
                setCertificate(certData);
                setError(null);
            }
        } catch (err) {
            console.error('Verification error:', err);
            if (err.response?.status === 404) {
                setError('Certificate not found. Please check the verification code.');
            } else if (err.response?.data?.message) {
                setError(err.response.data.message);
            } else {
                setError('Failed to verify certificate. Please try again.');
            }
            setCertificate(null);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    if (loading) {
        return (
            <div className="cert-loading">
                <div className="cert-loading-spinner"></div>
                <p>Verifying authenticity...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="cert-error-container">
                <button onClick={() => navigate('/verify-certificate')} className="cert-back-btn">
                    <ArrowLeft size={16} /> Back
                </button>
                <div className="cert-error-icon">
                    <XCircle size={64} style={{ display: 'inline' }} />
                </div>
                <h2 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '1rem' }}>Verification Failed</h2>
                <p style={{ fontSize: '1.25rem', color: '#666' }}>{error}</p>
            </div>
        );
    }

    return (
        <div className="cert-page">
            <button onClick={() => navigate('/verify-certificate')} className="cert-back-btn">
                <ArrowLeft size={16} /> Verify Another
            </button>

            {/* 1. HERO: Status */}
            <div className="cert-hero">
                <div className="cert-status-badge">
                    <CheckCircle size={16} />
                    <span>Valid Certificate</span>
                </div>
                <h1 className="cert-title">Certificate Verified</h1>
                <p className="cert-subtitle">The authenticity of this document has been confirmed by our secure verification system.</p>
            </div>

            <div className="cert-container">

                {/* 2. ACC HIGHLIGHT SECTION (Black Background) */}
                {certificate?.acc && (
                    <div className="cert-acc-section">
                        <div className="cert-acc-container">
                            {certificate.acc.logo_url && (
                                <div className="cert-acc-logo-wrapper">
                                    <img src={certificate.acc.logo_url} alt={certificate.acc.name} className="cert-acc-logo" />
                                </div>
                            )}
                            <div className="cert-acc-content">
                                <span className="cert-acc-label">Accredited By</span>
                                <h2 className="cert-acc-name">{certificate.acc.name}</h2>
                                {certificate.acc.legal_name && certificate.acc.legal_name !== certificate.acc.name && (
                                    <p className="cert-acc-legal">{certificate.acc.legal_name}</p>
                                )}

                                <div className="cert-acc-grid">
                                    {certificate.acc.registration_number && (
                                        <div className="cert-acc-item">
                                            <FileText size={18} />
                                            <span>Reg: {certificate.acc.registration_number}</span>
                                        </div>
                                    )}
                                    {certificate.acc.website && (
                                        <div className="cert-acc-item">
                                            <Globe size={18} />
                                            <a href={certificate.acc.website} target="_blank" rel="noopener noreferrer">
                                                {certificate.acc.website.replace(/^https?:\/\//, '')}
                                            </a>
                                        </div>
                                    )}
                                    {certificate.acc.email && (
                                        <div className="cert-acc-item">
                                            <Mail size={18} />
                                            <span>{certificate.acc.email}</span>
                                        </div>
                                    )}
                                    {certificate.acc.country && (
                                        <div className="cert-acc-item">
                                            <MapPin size={18} />
                                            <span>{certificate.acc.country}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 3. DETAILS GRID (Wide Layout) */}
                <div className="cert-details-section">
                    <h2 className="cert-section-title">Certificate Details</h2>
                    <div className="cert-grid-layout">

                        {/* Trainee - MOVED TO TOP */}
                        {(certificate.trainee_name || certificate.student_name) && (
                            <div className="cert-data-box" style={{ gridColumn: 'span 2' }}>
                                <span className="cert-data-label"><User size={14} /> Trainee Name</span>
                                <span className="cert-data-value">{certificate.trainee_name || certificate.student_name}</span>
                            </div>
                        )}

                        {/* Course - MOVED TO TOP */}
                        {certificate.course && (
                            <div className="cert-data-box" style={{ gridColumn: 'span 2' }}>
                                <span className="cert-data-label"><BookOpen size={14} /> Course</span>
                                <span className="cert-data-value">
                                    {typeof certificate.course === 'object' ? certificate.course.name : certificate.course}
                                </span>
                            </div>
                        )}

                        {/* Certificate No */}
                        <div className="cert-data-box">
                            <span className="cert-data-label"><Hash size={14} /> Certificate Number</span>
                            <span className="cert-data-value" style={{ fontSize: '1.25rem' }}>{certificate.certificate_number || 'N/A'}</span>
                        </div>

                        {/* Verification Code */}
                        <div className="cert-data-box">
                            <span className="cert-data-label"><Shield size={14} /> Verification Code</span>
                            <span className="cert-data-value" style={{ fontSize: '1rem', fontFamily: 'monospace' }}>{certificate.verification_code || code}</span>
                        </div>

                        {/* Issue Date */}
                        {certificate.issue_date && (
                            <div className="cert-data-box">
                                <span className="cert-data-label"><Calendar size={14} /> Issue Date</span>
                                <span className="cert-data-value">{formatDate(certificate.issue_date)}</span>
                            </div>
                        )}

                        {/* Expiry Date */}
                        {certificate.expiry_date && (
                            <div className="cert-data-box">
                                <span className="cert-data-label"><Calendar size={14} /> Expiry Date</span>
                                <span className="cert-data-value">{formatDate(certificate.expiry_date)}</span>
                            </div>
                        )}

                    </div>

                    {/* 4. TRAINING CENTER SECTION */}
                    {certificate.training_center && (
                        <div className="cert-tc-section">
                            <div className="cert-tc-header">
                                <Building2 size={24} />
                                <span className="cert-tc-title">Training Center Verification</span>
                            </div>

                            <div className="cert-tc-card">
                                <div className="cert-tc-logo-area">
                                    {certificate.training_center.logo_url ? (
                                        <img src={certificate.training_center.logo_url} alt="TC Logo" className="cert-tc-logo" />
                                    ) : (
                                        <Building2 size={64} color="#e5e7eb" />
                                    )}
                                </div>
                                <div className="cert-tc-content">
                                    <h3 className="cert-tc-name">{certificate.training_center.name}</h3>
                                    {certificate.training_center.legal_name && certificate.training_center.legal_name !== certificate.training_center.name && (
                                        <p style={{ color: '#666', fontStyle: 'italic', marginBottom: '1rem' }}>{certificate.training_center.legal_name}</p>
                                    )}

                                    <div className="cert-tc-grid">
                                        {certificate.training_center.registration_number && (
                                            <div className="cert-tc-item">
                                                <FileText size={16} /> <span>Reg: {certificate.training_center.registration_number}</span>
                                            </div>
                                        )}
                                        {(certificate.training_center.city || certificate.training_center.country) && (
                                            <div className="cert-tc-item">
                                                <MapPin size={16} />
                                                <span>{[certificate.training_center.city, certificate.training_center.country].filter(Boolean).join(', ')}</span>
                                            </div>
                                        )}
                                        {certificate.training_center.email && (
                                            <div className="cert-tc-item">
                                                <Mail size={16} /> <span>{certificate.training_center.email}</span>
                                            </div>
                                        )}
                                        {certificate.training_center.website && (
                                            <div className="cert-tc-item">
                                                <Globe size={16} />
                                                <a href={certificate.training_center.website} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>
                                                    {certificate.training_center.website.replace(/^https?:\/\//, '')}
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default CertificateDetailsScreen;
