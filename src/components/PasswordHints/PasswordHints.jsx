import React from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import './PasswordHints.css';

const PasswordHints = ({ password, show = true }) => {
  if (!show) return null;

  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  };

  const hints = [
    { key: 'length', label: 'At least 8 characters', met: checks.length },
    { key: 'uppercase', label: 'One uppercase letter', met: checks.uppercase },
    { key: 'number', label: 'One number', met: checks.number },
    { key: 'special', label: 'One special character', met: checks.special },
  ];

  return (
    <div className="password-hints-popup">
      <div className="password-hints-header">
        Password Requirements:
      </div>
      <div className="password-hints-list">
        {hints.map((hint) => (
          <div key={hint.key} className={`password-hint-item ${hint.met ? 'met' : ''}`}>
            {hint.met ? (
              <CheckCircle size={16} className="password-hint-icon met" />
            ) : (
              <XCircle size={16} className="password-hint-icon" />
            )}
            <span className={`password-hint-text ${hint.met ? 'met' : ''}`}>
              {hint.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PasswordHints;
