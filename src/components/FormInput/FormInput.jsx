import './FormInput.css';

const FormInput = ({
  label,
  type = 'text',
  name,
  value,
  onChange,
  placeholder,
  required = false,
  error,
  helpText,
  options = null, // For select
  textarea = false,
  rows = 4,
  className = '',
  disabled = false,
  viewMode = false, // New prop for read-only display mode
  min,
  max,
  step,
  ...props
}) => {
  // View mode - display data in a nice read-only format
  if (viewMode) {
    const displayValue = value || value === 0 || value === false ? value : 'N/A';
    let formattedValue = displayValue;

    // Format select values
    if (type === 'select' && options && displayValue !== 'N/A') {
      const selectedOption = options.find(opt => opt.value === displayValue);
      formattedValue = selectedOption ? selectedOption.label : displayValue;
    }

    // Format email and URL as links
    const isEmail = type === 'email' && displayValue !== 'N/A';
    const isUrl = type === 'url' && displayValue !== 'N/A';

    return (
      <div className={className}>
        {label && (
          <label className="block text-sm font-medium text-gray-500 mb-1.5">
            {label}
          </label>
        )}
        <div className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg">
          {textarea ? (
            <p className="text-base text-gray-900 whitespace-pre-wrap min-h-[60px]">
              {formattedValue}
            </p>
          ) : isEmail ? (
            <a
              href={`mailto:${formattedValue}`}
              className="text-primary-600 hover:text-primary-700 hover:underline font-medium"
            >
              {formattedValue}
            </a>
          ) : isUrl ? (
            <a
              href={formattedValue.startsWith('http') ? formattedValue : `https://${formattedValue}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 hover:text-primary-700 hover:underline font-medium break-all"
            >
              {formattedValue}
            </a>
          ) : (
            <p className="text-base text-gray-900 font-medium">
              {formattedValue}
            </p>
          )}
        </div>
        {helpText && <p className="mt-1.5 text-xs text-gray-400">{helpText}</p>}
      </div>
    );
  }

  // Edit mode - normal input fields
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      {textarea ? (
        <textarea
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          rows={rows}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 ${error ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 hover:border-gray-400'
            }`}
          {...props}
        />
      ) : type === 'select' ? (
        <select
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          disabled={disabled}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 cursor-pointer appearance-none bg-white form-input-select ${error ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 hover:border-gray-400'
            } ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : ''}`}
          {...props}
        >
          {options && options.length > 0 && options[0].value === '' ? (
            options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))
          ) : (
            <>
              <option value="">Select {label}</option>
              {options?.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </>
          )}
        </select>
      ) : (
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          min={min}
          max={max}
          step={step}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 ${error ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 hover:border-gray-400'
            } ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : ''} ${props.inputClassName || ''}`}
          {...props}
        />
      )}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      {helpText && !error && <p className="mt-1 text-sm text-gray-500">{helpText}</p>}
    </div>
  );
};

export default FormInput;
