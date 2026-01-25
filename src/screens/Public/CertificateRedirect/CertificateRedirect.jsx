import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const CertificateRedirect = () => {
    const { code } = useParams();
    const navigate = useNavigate();

    useEffect(() => {
        if (code) {
            navigate(`/verify-certificate?code=${code}`, { replace: true });
        } else {
            navigate('/verify-certificate', { replace: true });
        }
    }, [code, navigate]);

    return null;
};

export default CertificateRedirect;
