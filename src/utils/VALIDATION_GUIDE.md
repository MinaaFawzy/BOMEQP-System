# Validation Guide

دليل استخدام Validation في جميع الـ Forms في المشروع

## الاستيراد

```javascript
import { 
  validateEmail, 
  validatePhone, 
  validateRequired, 
  validatePassword,
  validateNumber,
  validateFile,
  validateForm,
  hasFormErrors
} from '../../../utils/validation';
```

## أمثلة الاستخدام

### 1. Email Validation

```javascript
const [email, setEmail] = useState('');
const [emailError, setEmailError] = useState('');

const handleEmailChange = (e) => {
  const value = e.target.value;
  setEmail(value);
  // Validate on change
  const error = validateEmail(value);
  setEmailError(error);
};

// في الـ form
<FormInput
  label="Email"
  name="email"
  type="email"
  value={email}
  onChange={handleEmailChange}
  error={emailError}
  required
/>
```

### 2. Phone Validation

```javascript
const [phone, setPhone] = useState('');
const [phoneError, setPhoneError] = useState('');

const handlePhoneChange = (e) => {
  const value = e.target.value;
  setPhone(value);
  const error = validatePhone(value);
  setPhoneError(error);
};
```

### 3. Required Field Validation

```javascript
const [name, setName] = useState('');
const [nameError, setNameError] = useState('');

const handleNameChange = (e) => {
  const value = e.target.value;
  setName(value);
  const error = validateRequired(value, 'Name');
  setNameError(error);
};
```

### 4. Password Validation

```javascript
const [password, setPassword] = useState('');
const [passwordError, setPasswordError] = useState('');

const handlePasswordChange = (e) => {
  const value = e.target.value;
  setPassword(value);
  const error = validatePassword(value, 8); // minimum 8 characters
  setPasswordError(error);
};
```

### 5. Number Validation

```javascript
const [price, setPrice] = useState('');
const [priceError, setPriceError] = useState('');

const handlePriceChange = (e) => {
  const value = e.target.value;
  setPrice(value);
  const error = validatePositiveNumber(value, 'Price');
  setPriceError(error);
};
```

### 6. File Validation

```javascript
const [file, setFile] = useState(null);
const [fileError, setFileError] = useState('');

const handleFileChange = (e) => {
  const selectedFile = e.target.files[0];
  if (selectedFile) {
    const error = validateFile(selectedFile, {
      required: true,
      maxSize: 10 * 1024 * 1024, // 10MB
      allowedTypes: ['application/pdf', 'image/jpeg', 'image/png'],
      fieldName: 'Document'
    });
    setFileError(error);
    if (!error) {
      setFile(selectedFile);
    }
  }
};
```

### 7. Form Validation (Complete Example)

```javascript
import { validateForm, hasFormErrors } from '../../../utils/validation';

const [formData, setFormData] = useState({
  name: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: ''
});

const [errors, setErrors] = useState({});

// Define validation rules
const validationRules = {
  name: [
    { type: 'required', message: 'Name' }
  ],
  email: [
    { type: 'required', message: 'Email' },
    { type: 'email' }
  ],
  phone: [
    { type: 'required', message: 'Phone' },
    { type: 'phone' }
  ],
  password: [
    { type: 'required', message: 'Password' },
    { type: 'password', minLength: 8 }
  ],
  confirmPassword: [
    { type: 'required', message: 'Password confirmation' },
    { type: 'passwordConfirmation', passwordField: 'password' }
  ]
};

const handleSubmit = async (e) => {
  e.preventDefault();
  
  // Validate entire form
  const validationErrors = validateForm(formData, validationRules);
  
  if (hasFormErrors(validationErrors)) {
    setErrors(validationErrors);
    return;
  }
  
  // Form is valid, proceed with submission
  // ...
};

// Handle input changes with real-time validation
const handleChange = (field, value) => {
  setFormData({ ...formData, [field]: value });
  
  // Clear error for this field when user starts typing
  if (errors[field]) {
    const newErrors = { ...errors };
    delete newErrors[field];
    setErrors(newErrors);
  }
};
```

### 8. Real-time Validation Pattern

```javascript
const [formData, setFormData] = useState({
  email: '',
  phone: ''
});

const [errors, setErrors] = useState({});

const handleInputChange = (field, value) => {
  // Update form data
  setFormData({ ...formData, [field]: value });
  
  // Validate immediately
  let error = '';
  if (field === 'email') {
    error = validateEmail(value);
  } else if (field === 'phone') {
    error = validatePhone(value);
  }
  
  // Update errors
  if (error) {
    setErrors({ ...errors, [field]: error });
  } else {
    // Clear error if validation passes
    const newErrors = { ...errors };
    delete newErrors[field];
    setErrors(newErrors);
  }
};
```

## Validation Functions المتاحة

### Basic Validations
- `validateRequired(value, fieldName)` - التحقق من الحقول المطلوبة
- `validateEmail(email)` - التحقق من صحة البريد الإلكتروني
- `validatePhone(phone)` - التحقق من رقم الهاتف
- `validatePassword(password, minLength)` - التحقق من كلمة المرور
- `validatePasswordConfirmation(password, confirmPassword)` - التحقق من تطابق كلمات المرور

### Number Validations
- `validateNumber(value, fieldName, min, max)` - التحقق من الأرقام
- `validatePositiveNumber(value, fieldName)` - التحقق من الأرقام الموجبة
- `validatePercentage(value, fieldName)` - التحقق من النسب المئوية (0-100)

### String Validations
- `validateMinLength(value, minLength, fieldName)` - التحقق من الحد الأدنى للطول
- `validateMaxLength(value, maxLength, fieldName)` - التحقق من الحد الأقصى للطول

### Date Validations
- `validateDate(date, fieldName, minDate, maxDate)` - التحقق من التواريخ

### File Validations
- `validateFile(file, options)` - التحقق من الملفات
  - `required`: boolean
  - `maxSize`: number (bytes)
  - `allowedTypes`: array of MIME types
  - `fieldName`: string

### Other Validations
- `validateURL(url, fieldName)` - التحقق من الروابط
- `validateArray(array, fieldName, minItems)` - التحقق من المصفوفات
- `validateCreditCard(cardNumber)` - التحقق من أرقام البطاقات
- `validateCVV(cvv)` - التحقق من CVV
- `validateExpiryDate(expiry)` - التحقق من تاريخ انتهاء البطاقة

### Form Validation
- `validateForm(formData, validationRules)` - التحقق من الـ form كامل
- `hasFormErrors(errors)` - التحقق من وجود أخطاء
- `clearFormErrors(setErrors)` - مسح جميع الأخطاء

## Best Practices

1. **Real-time Validation**: قم بالتحقق من الحقول أثناء الكتابة لتحسين تجربة المستخدم
2. **Clear Errors on Change**: امسح الأخطاء عندما يبدأ المستخدم بالكتابة
3. **Validate on Submit**: قم بالتحقق من جميع الحقول عند الإرسال
4. **Show Helpful Messages**: استخدم رسائل خطأ واضحة ومفيدة
5. **Required Fields**: ضع علامة * على الحقول المطلوبة
6. **File Size Limits**: حدد حجم الملفات المسموح بها بوضوح
7. **Character Limits**: أظهر الحد الأقصى للأحرف في الحقول الطويلة

## مثال كامل - Form Component

```javascript
import { useState } from 'react';
import FormInput from '../../../components/FormInput/FormInput';
import { 
  validateEmail, 
  validatePhone, 
  validateRequired,
  validatePassword,
  validatePasswordConfirmation
} from '../../../utils/validation';

const MyForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    
    // Clear error when user starts typing
    if (errors[field]) {
      const newErrors = { ...errors };
      delete newErrors[field];
      setErrors(newErrors);
    }
  };

  const validateField = (field, value) => {
    let error = '';
    
    switch (field) {
      case 'name':
        error = validateRequired(value, 'Name');
        break;
      case 'email':
        error = validateRequired(value, 'Email') || validateEmail(value);
        break;
      case 'phone':
        error = validateRequired(value, 'Phone') || validatePhone(value);
        break;
      case 'password':
        error = validateRequired(value, 'Password') || validatePassword(value);
        break;
      case 'confirmPassword':
        error = validateRequired(value, 'Password confirmation') || 
                validatePasswordConfirmation(formData.password, value);
        break;
    }
    
    if (error) {
      setErrors({ ...errors, [field]: error });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate all fields
    Object.keys(formData).forEach(field => {
      validateField(field, formData[field]);
    });
    
    // Check if there are any errors
    if (Object.keys(errors).length > 0) {
      return;
    }
    
    setSubmitting(true);
    // Submit form...
  };

  return (
    <form onSubmit={handleSubmit}>
      <FormInput
        label="Name"
        name="name"
        value={formData.name}
        onChange={(e) => handleChange('name', e.target.value)}
        onBlur={() => validateField('name', formData.name)}
        error={errors.name}
        required
      />
      
      <FormInput
        label="Email"
        name="email"
        type="email"
        value={formData.email}
        onChange={(e) => handleChange('email', e.target.value)}
        onBlur={() => validateField('email', formData.email)}
        error={errors.email}
        required
      />
      
      {/* More fields... */}
      
      <button type="submit" disabled={submitting}>
        Submit
      </button>
    </form>
  );
};
```

## ملاحظات مهمة

- جميع دوال الـ validation ترجع string فارغ `''` إذا كان الحقل صحيح
- ترجع رسالة خطأ إذا كان الحقل غير صحيح
- استخدم `validateForm` للتحقق من الـ form كامل في مرة واحدة
- استخدم validation فردي للحقول للتحقق في الوقت الفعلي

