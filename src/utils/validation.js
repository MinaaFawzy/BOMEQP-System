/**
 * Validation utility functions for form validation
 */

// Email validation
export const validateEmail = (email) => {
  if (!email) return 'Email is required';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return 'Please enter a valid email address';
  return '';
};

// Phone validation
export const validatePhone = (phone) => {
  if (!phone) return 'Phone number is required';
  // Allow international format with +, spaces, dashes, and parentheses
  const phoneRegex = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/;
  if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
    return 'Please enter a valid phone number';
  }
  return '';
};

// Required field validation
export const validateRequired = (value, fieldName = 'This field') => {
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    return `${fieldName} is required`;
  }
  return '';
};

// Minimum length validation
export const validateMinLength = (value, minLength, fieldName = 'This field') => {
  if (!value) return '';
  if (value.length < minLength) {
    return `${fieldName} must be at least ${minLength} characters`;
  }
  return '';
};

// Maximum length validation
export const validateMaxLength = (value, maxLength, fieldName = 'This field') => {
  if (!value) return '';
  if (value.length > maxLength) {
    return `${fieldName} must be at most ${maxLength} characters`;
  }
  return '';
};

// Password validation
export const validatePassword = (password, minLength = 8) => {
  if (!password) return 'Password is required';
  if (password.length < minLength) {
    return `Password must be at least ${minLength} characters`;
  }
  // Optional: Add more password strength requirements
  // if (!/(?=.*[a-z])/.test(password)) return 'Password must contain at least one lowercase letter';
  // if (!/(?=.*[A-Z])/.test(password)) return 'Password must contain at least one uppercase letter';
  // if (!/(?=.*\d)/.test(password)) return 'Password must contain at least one number';
  return '';
};

// Password confirmation validation
export const validatePasswordConfirmation = (password, confirmPassword) => {
  if (!confirmPassword) return 'Please confirm your password';
  if (password !== confirmPassword) return 'Passwords do not match';
  return '';
};

// Number validation
export const validateNumber = (value, fieldName = 'This field', min = null, max = null) => {
  if (value === '' || value === null || value === undefined) {
    return `${fieldName} is required`;
  }
  const num = Number(value);
  if (isNaN(num)) {
    return `${fieldName} must be a valid number`;
  }
  if (min !== null && num < min) {
    return `${fieldName} must be at least ${min}`;
  }
  if (max !== null && num > max) {
    return `${fieldName} must be at most ${max}`;
  }
  return '';
};

// Positive number validation
export const validatePositiveNumber = (value, fieldName = 'This field') => {
  const error = validateNumber(value, fieldName);
  if (error) return error;
  if (Number(value) <= 0) {
    return `${fieldName} must be greater than 0`;
  }
  return '';
};

// Percentage validation (0-100)
export const validatePercentage = (value, fieldName = 'Percentage') => {
  return validateNumber(value, fieldName, 0, 100);
};

// Date validation
export const validateDate = (date, fieldName = 'Date', minDate = null, maxDate = null) => {
  if (!date) return `${fieldName} is required`;
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) {
    return `Please enter a valid ${fieldName.toLowerCase()}`;
  }
  if (minDate) {
    const min = new Date(minDate);
    if (dateObj < min) {
      return `${fieldName} must be after ${new Date(minDate).toLocaleDateString()}`;
    }
  }
  if (maxDate) {
    const max = new Date(maxDate);
    if (dateObj > max) {
      return `${fieldName} must be before ${new Date(maxDate).toLocaleDateString()}`;
    }
  }
  return '';
};

// URL validation
export const validateURL = (url, fieldName = 'URL') => {
  if (!url) return `${fieldName} is required`;
  try {
    new URL(url);
    return '';
  } catch {
    return `Please enter a valid ${fieldName.toLowerCase()}`;
  }
};

// File validation
export const validateFile = (file, options = {}) => {
  const {
    required = true,
    maxSize = 10 * 1024 * 1024, // 10MB default
    allowedTypes = [],
    fieldName = 'File'
  } = options;

  if (required && !file) {
    return `${fieldName} is required`;
  }

  if (file) {
    // Check file size
    if (file.size > maxSize) {
      const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(2);
      return `${fieldName} size must be less than ${maxSizeMB}MB`;
    }

    // Check file type
    if (allowedTypes.length > 0) {
      const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
      const allowedExtensions = allowedTypes.map(type => type.toLowerCase());
      if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
        return `${fieldName} type is not allowed. Allowed types: ${allowedTypes.join(', ')}`;
      }
    }
  }

  return '';
};

// Array validation (for checkboxes, multi-select, etc.)
export const validateArray = (array, fieldName = 'This field', minItems = 1) => {
  if (!array || !Array.isArray(array) || array.length < minItems) {
    return `Please select at least ${minItems} ${fieldName.toLowerCase()}`;
  }
  return '';
};

// Credit card number validation (basic)
export const validateCreditCard = (cardNumber) => {
  if (!cardNumber) return 'Card number is required';
  // Remove spaces and dashes
  const cleaned = cardNumber.replace(/[\s-]/g, '');
  // Check if it's all digits and has valid length (13-19 digits)
  if (!/^\d{13,19}$/.test(cleaned)) {
    return 'Please enter a valid card number';
  }
  return '';
};

// CVV validation
export const validateCVV = (cvv) => {
  if (!cvv) return 'CVV is required';
  if (!/^\d{3,4}$/.test(cvv)) {
    return 'Please enter a valid CVV (3-4 digits)';
  }
  return '';
};

// Expiry date validation (MM/YY format)
export const validateExpiryDate = (expiry) => {
  if (!expiry) return 'Expiry date is required';
  const regex = /^(0[1-9]|1[0-2])\/\d{2}$/;
  if (!regex.test(expiry)) {
    return 'Please enter a valid expiry date (MM/YY)';
  }
  const [month, year] = expiry.split('/');
  const expiryDate = new Date(2000 + parseInt(year), parseInt(month) - 1);
  const now = new Date();
  if (expiryDate < now) {
    return 'Card has expired';
  }
  return '';
};

// Generic form validator
export const validateForm = (formData, validationRules) => {
  const errors = {};

  Object.keys(validationRules).forEach((fieldName) => {
    const rules = validationRules[fieldName];
    const value = formData[fieldName];

    // Check each validation rule
    for (const rule of rules) {
      let error = '';

      if (rule.type === 'required') {
        error = validateRequired(value, rule.message || fieldName);
      } else if (rule.type === 'email') {
        error = validateEmail(value);
      } else if (rule.type === 'phone') {
        error = validatePhone(value);
      } else if (rule.type === 'minLength') {
        error = validateMinLength(value, rule.value, rule.message || fieldName);
      } else if (rule.type === 'maxLength') {
        error = validateMaxLength(value, rule.value, rule.message || fieldName);
      } else if (rule.type === 'password') {
        error = validatePassword(value, rule.minLength);
      } else if (rule.type === 'passwordConfirmation') {
        error = validatePasswordConfirmation(formData[rule.passwordField], value);
      } else if (rule.type === 'number') {
        error = validateNumber(value, rule.message || fieldName, rule.min, rule.max);
      } else if (rule.type === 'positiveNumber') {
        error = validatePositiveNumber(value, rule.message || fieldName);
      } else if (rule.type === 'percentage') {
        error = validatePercentage(value, rule.message || fieldName);
      } else if (rule.type === 'date') {
        error = validateDate(value, rule.message || fieldName, rule.minDate, rule.maxDate);
      } else if (rule.type === 'url') {
        error = validateURL(value, rule.message || fieldName);
      } else if (rule.type === 'file') {
        error = validateFile(value, rule.options || {});
      } else if (rule.type === 'array') {
        error = validateArray(value, rule.message || fieldName, rule.minItems);
      } else if (rule.type === 'custom') {
        error = rule.validator(value, formData);
      }

      if (error) {
        errors[fieldName] = error;
        break; // Stop at first error for this field
      }
    }
  });

  return errors;
};

// Check if form has errors
export const hasFormErrors = (errors) => {
  return Object.keys(errors).length > 0;
};

// Clear form errors
export const clearFormErrors = (setErrors) => {
  setErrors({});
};

