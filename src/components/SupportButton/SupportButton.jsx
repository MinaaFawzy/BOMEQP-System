import { useState, useRef, useEffect } from 'react';
import { Phone, Mail, MessageCircle } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import './SupportButton.css';

const SUPPORT_EMAIL = 'bahaa.riyad@gmail.com';
const SUPPORT_PHONE = '01116291000';
const SUPPORT_PHONE_WITH_CODE = '201116291000';

const SupportButton = () => {
  const { t } = useTranslation('common');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState('email');
  const [message, setMessage] = useState('');
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSend = () => {
    if (!message.trim()) return;

    if (selectedMethod === 'email') {
      const translatedSubject = t('support.emailSubject');

      const subject = encodeURIComponent(
        translatedSubject && translatedSubject !== 'support.emailSubject'
          ? translatedSubject
          : 'Support Request'
      );

      const body = encodeURIComponent(
        `Hello Support Team,

${message}
`
      );

      // ✅ فتح Gmail مباشرة (حل مضمون)
      const gmailLink =
        `https://mail.google.com/mail/?view=cm&fs=1` +
        `&to=${encodeURIComponent(SUPPORT_EMAIL)}` +
        `&su=${subject}` +
        `&body=${body}`;

      window.open(gmailLink, '_blank', 'noopener,noreferrer');

      setIsOpen(false);
      setMessage('');
    }
    else if (selectedMethod === 'phone') {
      const whatsappLink = `https://wa.me/${SUPPORT_PHONE_WITH_CODE}?text=${encodeURIComponent(message)}`;
      window.open(whatsappLink, '_blank', 'noopener,noreferrer');
      setIsOpen(false);
      setMessage('');
    }
  };

  return (
    <div className="support-button-wrapper" ref={wrapperRef}>
      <button
        type="button"
        className="support-button-fab"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Support"
        aria-expanded={isOpen}
      >
        <Phone size={24} aria-hidden />
      </button>

      {isOpen && (
        <div
          className="support-button-popup"
          role="dialog"
          aria-label="Support contact information"
        >
          <div className="support-button-popup-title">
            {t('support.title')}
          </div>

          {/* Contact Info */}
          <div className="support-button-contact-info">
            <div className="support-button-contact-item">
              <Mail size={16} className="support-button-contact-icon" />
              <span className="support-button-contact-text">
                {SUPPORT_EMAIL}
              </span>
            </div>
            <div className="support-button-contact-item">
              <MessageCircle size={16} className="support-button-contact-icon" />
              <span className="support-button-contact-text">
                {SUPPORT_PHONE}
              </span>
            </div>
          </div>

          {/* Contact Method Selection */}
          <div className="support-button-method-selection">
            <label className="support-button-radio-label">
              <input
                type="radio"
                name="contactMethod"
                value="email"
                checked={selectedMethod === 'email'}
                onChange={(e) => setSelectedMethod(e.target.value)}
                className="support-button-radio-input"
              />
              <span className="support-button-radio-text">
                <Mail size={16} />
                {t('support.email')}
              </span>
            </label>

            <label className="support-button-radio-label">
              <input
                type="radio"
                name="contactMethod"
                value="phone"
                checked={selectedMethod === 'phone'}
                onChange={(e) => setSelectedMethod(e.target.value)}
                className="support-button-radio-input"
              />
              <span className="support-button-radio-text">
                <MessageCircle size={16} />
                {t('support.phone')}
              </span>
            </label>
          </div>

          {/* Message Input */}
          <div className="support-button-message-container">
            <label className="support-button-message-label">
              {t('support.message')}
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t('support.messagePlaceholder')}
              className="support-button-message-input"
              rows={4}
            />
          </div>

          {/* Send Button */}
          <button
            type="button"
            onClick={handleSend}
            disabled={!message.trim()}
            className="support-button-send-button"
          >
            {t('support.send')}
          </button>
        </div>
      )}
    </div>
  );
};

export default SupportButton;