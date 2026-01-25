import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Shield, Search } from 'lucide-react';
import './CertificateVerificationScreen.css';

const CertificateVerificationScreen = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);

  // Pre-fill code from URL query parameter
  useEffect(() => {
    const codeFromUrl = searchParams.get('code');
    if (codeFromUrl) {
      setVerificationCode(codeFromUrl);
    }
  }, [searchParams]);

  const handleVerify = async (e) => {
    e.preventDefault();

    if (!verificationCode.trim()) {
      return;
    }

    setLoading(true);

    // Navigate to certificate details page with the code
    navigate(`/certificates/verify/${verificationCode.trim()}/details`);
  };

  return (
    <div className="verify-page">
      <div className="verify-container">
        <div className="verify-card">
          {/* Icon */}
          <div className="verify-icon">
            <Shield size={64} />
          </div>

          {/* Title */}
          <h1 className="verify-title">Certificate Verification</h1>
          <p className="verify-description">
            Enter your certificate verification code to confirm authenticity
          </p>

          {/* Form */}
          <form onSubmit={handleVerify} className="verify-form">
            <div className="verify-input-group">
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="Enter verification code"
                className="verify-input"
                disabled={loading}
                autoFocus
              />
              <button
                type="submit"
                disabled={loading || !verificationCode.trim()}
                className="verify-button"
              >
                {loading ? (
                  <>
                    <div className="verify-spinner"></div>
                    Verifying...
                  </>
                ) : (
                  <>
                    <Search size={20} />
                    Verify
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Info */}
          <p className="verify-info">
            The verification code is located on your certificate document
          </p>
        </div>
      </div>
    </div>
  );
};

export default CertificateVerificationScreen;