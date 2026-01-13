import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { publicAPI } from '../../../services/api';
import { CheckCircle, XCircle, FileText, User, BookOpen, Calendar, Hash, Award, Search, Download } from 'lucide-react';
import './CertificateVerificationScreen.css';

const CertificateVerificationScreen = () => {
  const { code } = useParams();
  const [searchParams] = useSearchParams();
  const urlCode = code || searchParams.get('code') || '';
  const [verificationCode, setVerificationCode] = useState(urlCode);
  const [loading, setLoading] = useState(false);
  const [certificate, setCertificate] = useState(null);
  const [error, setError] = useState(null);

  // Auto-verify if code is provided in URL
  useEffect(() => {
    if (urlCode && urlCode.trim()) {
      handleVerifyFromCode(urlCode.trim());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, searchParams]);

  const handleVerifyFromCode = async (codeToVerify) => {
    setLoading(true);
    setError(null);
    setCertificate(null);
    setVerificationCode(codeToVerify);

    try {
      const data = await publicAPI.verifyCertificate(codeToVerify);
      
      // Handle different response structures
      const certData = data.certificate || data;
      
      if (certData.status === 'revoked') {
        setError('This certificate has been revoked and is no longer valid.');
        setCertificate(null);
      } else if (certData.status === 'expired') {
        setError('This certificate has expired and is no longer valid.');
        setCertificate(certData); // Still show the certificate info
      } else {
        setCertificate(certData);
        setError(null);
      }
    } catch (err) {
      console.error('Verification error:', err);
      
      if (err.response?.status === 404) {
        setError('Certificate not found. Please check the verification code and try again.');
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else if (err.message) {
        setError(err.message);
      } else {
        setError('Failed to verify certificate. Please try again.');
      }
      setCertificate(null);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    
    if (!verificationCode.trim()) {
      setError('Please enter a verification code');
      return;
    }

    setLoading(true);
    setError(null);
    setCertificate(null);

    try {
      const data = await publicAPI.verifyCertificate(verificationCode.trim());
      
      // Handle different response structures
      const certData = data.certificate || data;
      
      if (certData.status === 'revoked') {
        setError('This certificate has been revoked and is no longer valid.');
        setCertificate(null);
      } else if (certData.status === 'expired') {
        setError('This certificate has expired and is no longer valid.');
        setCertificate(certData); // Still show the certificate info
      } else {
        setCertificate(certData);
        setError(null);
      }
    } catch (err) {
      console.error('Verification error:', err);
      
      if (err.response?.status === 404) {
        setError('Certificate not found. Please check the verification code and try again.');
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else if (err.message) {
        setError(err.message);
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

  return (
    <div className="certificate-verification-container">
      <div className="certificate-verification-content">
        {/* Header */}
        <div className="verification-header">
          <div className="verification-header-icon">
            <Award size={48} />
          </div>
          <h1 className="verification-title">Certificate Verification</h1>
          <p className="verification-subtitle">
            Enter the verification code to verify the authenticity of a certificate
          </p>
        </div>

        {/* Verification Form */}
        <form onSubmit={handleVerify} className="verification-form">
          <div className="verification-input-group">
            <div className="verification-input-wrapper">
              <Hash className="verification-input-icon" size={20} />
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => {
                  setVerificationCode(e.target.value);
                  setError(null);
                  setCertificate(null);
                }}
                placeholder="Enter verification code"
                className="verification-input"
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !verificationCode.trim()}
              className="verification-button"
            >
              {loading ? (
                <>
                  <div className="verification-spinner"></div>
                  Verifying...
                </>
              ) : (
                <>
                  <Search size={20} />
                  Verify Certificate
                </>
              )}
            </button>
          </div>
        </form>

        {/* Error Message */}
        {error && (
          <div className="verification-error">
            <XCircle size={20} />
            <p>{error}</p>
          </div>
        )}

        {/* Certificate Details */}
        {certificate && (
          <div className="certificate-details">
            <div className="certificate-details-header">
              <CheckCircle size={24} className="certificate-valid-icon" />
              <h2 className="certificate-details-title">
                {certificate.status === 'valid' ? 'Certificate Verified' : 'Certificate Information'}
              </h2>
            </div>

            <div className="certificate-details-content">
              <div className="certificate-detail-item">
                <div className="certificate-detail-label">
                  <FileText size={18} />
                  Certificate Number
                </div>
                <div className="certificate-detail-value">
                  {certificate.certificate_number || 'N/A'}
                </div>
              </div>

              <div className="certificate-detail-item">
                <div className="certificate-detail-label">
                  <Hash size={18} />
                  Verification Code
                </div>
                <div className="certificate-detail-value">
                  {certificate.verification_code || 'N/A'}
                </div>
              </div>

              {(certificate.trainee_name || certificate.student_name) && (
                <div className="certificate-detail-item">
                  <div className="certificate-detail-label">
                    <User size={18} />
                    Trainee Name
                  </div>
                  <div className="certificate-detail-value">
                    {certificate.trainee_name || certificate.student_name || 'N/A'}
                  </div>
                </div>
              )}

              {certificate.course && (
                <div className="certificate-detail-item">
                  <div className="certificate-detail-label">
                    <BookOpen size={18} />
                    Course
                  </div>
                  <div className="certificate-detail-value">
                    {typeof certificate.course === 'object' 
                      ? certificate.course.name || 'N/A'
                      : certificate.course || 'N/A'}
                  </div>
                </div>
              )}

              {certificate.template && (
                <div className="certificate-detail-item">
                  <div className="certificate-detail-label">
                    <FileText size={18} />
                    Template
                  </div>
                  <div className="certificate-detail-value">
                    {typeof certificate.template === 'object' 
                      ? certificate.template.name || 'N/A'
                      : certificate.template || 'N/A'}
                  </div>
                </div>
              )}

              {certificate.issue_date && (
                <div className="certificate-detail-item">
                  <div className="certificate-detail-label">
                    <Calendar size={18} />
                    Issue Date
                  </div>
                  <div className="certificate-detail-value">
                    {formatDate(certificate.issue_date)}
                  </div>
                </div>
              )}

              {certificate.expiry_date && (
                <div className="certificate-detail-item">
                  <div className="certificate-detail-label">
                    <Calendar size={18} />
                    Expiry Date
                  </div>
                  <div className="certificate-detail-value">
                    {formatDate(certificate.expiry_date)}
                  </div>
                </div>
              )}

              {certificate.certificate_pdf_url && (
                <div className="certificate-detail-item">
                  <div className="certificate-detail-label">
                    <Download size={18} />
                    Certificate PDF
                  </div>
                  <div className="certificate-detail-value">
                    <a
                      href={certificate.certificate_pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="certificate-download-link"
                    >
                      <Download size={16} />
                      Download PDF
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CertificateVerificationScreen;