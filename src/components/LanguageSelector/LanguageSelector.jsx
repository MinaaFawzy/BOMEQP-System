import { useState, useEffect } from 'react';
import { X, Globe, ChevronDown } from 'lucide-react';
import { publicAPI } from '../../services/api';
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
  placeholder = 'Select a language...',
  useAPI = false
}) => {
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [languages, setLanguages] = useState(useAPI ? [] : LANGUAGES);
  const [loadingLanguages, setLoadingLanguages] = useState(false);

  useEffect(() => {
    if (useAPI) {
      loadLanguages();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useAPI]);

  const loadLanguages = async () => {
    setLoadingLanguages(true);
    try {
      console.log('📡 [LanguageSelector] Loading languages from API...');
      const response = await publicAPI.getLanguages();
      console.log('✅ [LanguageSelector] Languages received:', response);
      let languagesList = response.languages || response.data?.languages || response.data || response || [];
      
      // Convert object to array if needed
      if (!Array.isArray(languagesList) && typeof languagesList === 'object') {
        languagesList = Object.values(languagesList);
      }
      
      // Extract language names if objects have 'name' property
      languagesList = languagesList.map(lang => 
        typeof lang === 'object' ? (lang.name || lang.language || lang) : lang
      );
      
      setLanguages(Array.isArray(languagesList) && languagesList.length > 0 ? languagesList : LANGUAGES);
      console.log(`✅ [LanguageSelector] Loaded ${languages.length} languages`);
    } catch (error) {
      console.error('❌ [LanguageSelector] Failed to load languages:', error);
      console.error('❌ [LanguageSelector] Error details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      // Fallback to default languages if API fails
      setLanguages(LANGUAGES);
    } finally {
      setLoadingLanguages(false);
    }
  };

  // Convert value to array if it's a string (comma-separated) or already an array
  const selectedLanguages = Array.isArray(value) 
    ? value 
    : (value ? value.split(',').map(s => s.trim()).filter(s => s) : []);

  const availableLanguages = languages.filter(
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
            disabled={disabled || loadingLanguages || availableLanguages.length === 0}
            className="language-selector-select"
          >
            <option value="">
              {loadingLanguages ? 'Loading languages...' : placeholder}
            </option>
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
              {lang}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemoveLanguage(lang)}
                  className="language-selector-remove-btn"
                  title="Remove language"
                >
                  <X size={14} />
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

