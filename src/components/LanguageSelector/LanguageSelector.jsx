import { useState } from 'react';
import { X, Globe } from 'lucide-react';
import './LanguageSelector.css';

const LANGUAGES = [
  'English', 'Arabic', 'French', 'Spanish', 'German', 'Italian', 'Portuguese', 
  'Russian', 'Chinese', 'Japanese', 'Korean', 'Hindi', 'Turkish', 'Dutch', 
  'Swedish', 'Norwegian', 'Danish', 'Finnish', 'Polish', 'Czech', 'Greek', 
  'Hebrew', 'Thai', 'Vietnamese', 'Indonesian', 'Malay', 'Tagalog', 'Urdu',
  'Persian', 'Bengali', 'Punjabi', 'Tamil', 'Telugu', 'Marathi', 'Gujarati'
];

const LanguageSelector = ({ 
  value = [], 
  onChange, 
  label = 'Languages',
  error,
  disabled = false,
  placeholder = 'Select a language...'
}) => {
  const [selectedLanguage, setSelectedLanguage] = useState('');

  // Convert value to array if it's a string (comma-separated) or already an array
  const selectedLanguages = Array.isArray(value) 
    ? value 
    : (value ? value.split(',').map(s => s.trim()).filter(s => s) : []);

  const availableLanguages = LANGUAGES.filter(
    lang => !selectedLanguages.includes(lang)
  );

  const handleLanguageSelect = (e) => {
    const language = e.target.value;
    if (language && !selectedLanguages.includes(language)) {
      const newLanguages = [...selectedLanguages, language];
      onChange(newLanguages);
      setSelectedLanguage('');
    }
  };

  const handleRemoveLanguage = (languageToRemove) => {
    const newLanguages = selectedLanguages.filter(lang => lang !== languageToRemove);
    onChange(newLanguages);
  };

  return (
    <div className="language-selector-container">
      <label className="language-selector-label">
        {label}
      </label>
      
      <div className="language-selector-wrapper">
        <div className="language-selector-input-wrapper">
          <Globe className="language-selector-icon" size={18} />
          <select
            value={selectedLanguage}
            onChange={handleLanguageSelect}
            disabled={disabled || availableLanguages.length === 0}
            className="language-selector-select"
          >
            <option value="">{placeholder}</option>
            {availableLanguages.map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedLanguages.length > 0 && (
        <div className="language-selector-tags">
          {selectedLanguages.map((lang, index) => (
            <span
              key={index}
              className="language-selector-tag"
            >
              <Globe size={12} className="language-selector-tag-icon" />
              {lang}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemoveLanguage(lang)}
                  className="language-selector-remove-btn"
                  title="Remove language"
                >
                  <X size={12} />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {error && (
        <p className="language-selector-error">{error}</p>
      )}
    </div>
  );
};

export default LanguageSelector;
export { LANGUAGES };

