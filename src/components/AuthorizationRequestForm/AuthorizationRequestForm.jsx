import { useState } from 'react';
import { FileText, Plus, Trash2, CheckCircle, Upload, Send, Loader } from 'lucide-react';
import FormInput from '../FormInput/FormInput';
import { validateFile, validateMaxLength } from '../../utils/validation';
import './AuthorizationRequestForm.css';

const AuthorizationRequestForm = ({
  onSubmit,
  onCancel,
  submitting = false,
  initialData = {
    documents: [],
    additional_info: '',
  }
}) => {
  const [formData, setFormData] = useState(initialData);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};

    // Validate documents
    if (formData.documents.length === 0) {
      newErrors.general = 'Please upload at least one document';
      return newErrors;
    }

    // Validate each document
    formData.documents.forEach((doc, index) => {
      // Validate document type
      if (!doc.type || doc.type.trim() === '') {
        newErrors[`documents.${index}.type`] = 'Document type is required';
      }

      // Validate document file
      if (!doc.file) {
        newErrors[`documents.${index}.file`] = 'Please upload a file';
      } else {
        const fileError = validateFile(doc.file, {
          required: true,
          maxSize: 10 * 1024 * 1024, // 10MB
          allowedTypes: [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'image/jpeg',
            'image/jpg',
            'image/png'
          ],
          fieldName: 'Document file'
        });
        if (fileError) {
          newErrors[`documents.${index}.file`] = fileError;
        }
      }
    });

    // Validate additional info (optional but if provided, check max length)
    if (formData.additional_info) {
      const additionalInfoError = validateMaxLength(
        formData.additional_info,
        5000,
        'Additional information'
      );
      if (additionalInfoError) {
        newErrors.additional_info = additionalInfoError;
      }
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    // Call onSubmit with form data
    if (onSubmit) {
      await onSubmit(formData, setErrors);
    }
  };

  const handleAddDocument = () => {
    setFormData({
      ...formData,
      documents: [...formData.documents, { type: '', file: null }],
    });
  };

  const handleRemoveDocument = (index) => {
    setFormData({
      ...formData,
      documents: formData.documents.filter((_, i) => i !== index),
    });
    
    // Clear errors for this document
    const newErrors = { ...errors };
    Object.keys(newErrors).forEach(key => {
      if (key.startsWith(`documents.${index}.`)) {
        delete newErrors[key];
      }
    });
    setErrors(newErrors);
  };

  const handleDocumentChange = (index, field, value) => {
    const updatedDocuments = [...formData.documents];
    updatedDocuments[index] = {
      ...updatedDocuments[index],
      [field]: value,
    };
    setFormData({
      ...formData,
      documents: updatedDocuments,
    });
    
    // Clear error for this field when user starts typing
    if (errors[`documents.${index}.${field}`]) {
      const newErrors = { ...errors };
      delete newErrors[`documents.${index}.${field}`];
      setErrors(newErrors);
    }
  };

  const handleFileSelect = (index, file) => {
    if (!file) return;
    
    // Validate file using validation utility
    const fileError = validateFile(file, {
      required: true,
      maxSize: 10 * 1024 * 1024, // 10MB
      allowedTypes: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/jpg',
        'image/png'
      ],
      fieldName: 'Document file'
    });
    
    if (fileError) {
      setErrors({
        ...errors,
        [`documents.${index}.file`]: fileError
      });
      return;
    }
    
    const updatedDocuments = [...formData.documents];
    updatedDocuments[index] = {
      ...updatedDocuments[index],
      file: file,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    };
    
    setFormData({
      ...formData,
      documents: updatedDocuments,
    });
    
    // Clear error for this field
    if (errors[`documents.${index}.file`]) {
      const newErrors = { ...errors };
      delete newErrors[`documents.${index}.file`];
      setErrors(newErrors);
    }
  };

  const handleRemoveFile = (index) => {
    const updatedDocuments = [...formData.documents];
    updatedDocuments[index] = {
      ...updatedDocuments[index],
      file: null,
      fileName: '',
      fileSize: null,
      fileType: null,
    };
    setFormData({
      ...formData,
      documents: updatedDocuments,
    });
    const fileInput = document.getElementById(`file-upload-${index}`);
    if (fileInput) fileInput.value = '';
    
    // Clear error for this field
    if (errors[`documents.${index}.file`]) {
      const newErrors = { ...errors };
      delete newErrors[`documents.${index}.file`];
      setErrors(newErrors);
    }
  };

  const handleAdditionalInfoChange = (e) => {
    setFormData({ ...formData, additional_info: e.target.value });
    // Clear error when user starts typing
    if (errors.additional_info) {
      const newErrors = { ...errors };
      delete newErrors.additional_info;
      setErrors(newErrors);
    }
  };

  const handleCancel = () => {
    setFormData(initialData);
    setErrors({});
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <div className="relative">
      {submitting && (
        <div className="authorization-request-form-overlay">
          <div className="authorization-request-form-overlay-content">
            <Loader size={32} className="authorization-request-form-spinner" />
            <p className="authorization-request-form-overlay-text">Uploading files and submitting request...</p>
            <p className="authorization-request-form-overlay-hint">Please wait, this may take a moment</p>
          </div>
        </div>
      )}
      <form onSubmit={handleSubmit} className="authorization-request-form">
        {/* Documents Section */}
        <div>
          <div className="authorization-request-form-section-header">
            <h3 className="authorization-request-form-section-title">
              <FileText size={20} className="authorization-request-form-section-title-icon" />
              Documents
            </h3>
            <button
              type="button"
              onClick={handleAddDocument}
              disabled={submitting}
              className="authorization-request-form-button-add"
            >
              <Plus size={16} className="authorization-request-form-button-add-icon" />
              Add Document
            </button>
          </div>

          {formData.documents.length === 0 ? (
            <div className="authorization-request-form-warning-box">
              <p className="authorization-request-form-warning-text">No documents added</p>
              <p className="authorization-request-form-warning-hint">At least one document is required. Click "Add Document" to add one.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {formData.documents.map((doc, index) => (
                <div key={index} className="authorization-request-form-document-item">
                  <div className="authorization-request-form-document-header">
                    <span className="authorization-request-form-document-number">Document {index + 1}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveDocument(index)}
                      disabled={submitting}
                      className="authorization-request-form-document-remove"
                      title="Remove document"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="authorization-request-form-document-grid">
                    <div>
                      <label className="authorization-request-form-label">
                        Document Type <span className="authorization-request-form-label-required">*</span>
                      </label>
                      <select
                        value={doc.type || ''}
                        onChange={(e) => handleDocumentChange(index, 'type', e.target.value)}
                        required
                        disabled={submitting}
                        className={`authorization-request-form-select ${errors[`documents.${index}.type`] ? 'error' : ''}`}
                      >
                        <option value="">Select document type</option>
                        <option value="license">License</option>
                        <option value="certificate">Certificate</option>
                        <option value="registration">Registration</option>
                        <option value="other">Other</option>
                      </select>
                      {errors[`documents.${index}.type`] && (
                        <p className="authorization-request-form-error">{errors[`documents.${index}.type`]}</p>
                      )}
                    </div>
                    <div>
                      <label className="authorization-request-form-label">
                        Upload Document <span className="authorization-request-form-label-required">*</span>
                        <span className="authorization-request-form-label-hint">(PDF, DOC, DOCX, JPG, JPEG, PNG - Max 10MB)</span>
                      </label>
                      <div className="authorization-request-form-file-upload-wrapper">
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleFileSelect(index, file);
                            }
                          }}
                          disabled={submitting}
                          className="authorization-request-form-file-upload-input"
                          id={`file-upload-${index}`}
                        />
                        <label
                          htmlFor={`file-upload-${index}`}
                          className={`authorization-request-form-file-upload-label ${
                            submitting
                              ? 'disabled'
                              : doc.file
                              ? 'has-file'
                              : 'empty'
                          }`}
                        >
                          {doc.file ? (
                            <>
                              <CheckCircle size={16} className="authorization-request-form-file-upload-icon" />
                              <span className="authorization-request-form-file-upload-text authorization-request-form-file-upload-text-success">
                                {doc.fileName || 'File selected'}
                              </span>
                              {doc.fileSize && (
                                <span className="authorization-request-form-file-upload-size">
                                  ({(doc.fileSize / 1024 / 1024).toFixed(2)} MB)
                                </span>
                              )}
                            </>
                          ) : (
                            <>
                              <Upload size={16} className="authorization-request-form-file-upload-icon" />
                              <span className="authorization-request-form-file-upload-text authorization-request-form-file-upload-text-default">Click to upload file</span>
                            </>
                          )}
                        </label>
                      </div>
                      {errors[`documents.${index}.file`] && (
                        <p className="authorization-request-form-error">{errors[`documents.${index}.file`]}</p>
                      )}
                      {doc.file && (
                        <div className="authorization-request-form-file-remove">
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(index)}
                            disabled={submitting}
                            className="authorization-request-form-file-remove-button"
                          >
                            Remove File
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Additional Information */}
        <FormInput
          label="Additional Information"
          name="additional_info"
          value={formData.additional_info}
          onChange={handleAdditionalInfoChange}
          textarea
          rows={4}
          placeholder="Provide any additional information about your training center..."
          error={errors.additional_info}
          disabled={submitting}
          helpText="Maximum 5000 characters"
        />

        {errors.general && (
          <div className="authorization-request-form-error-box">
            <p className="authorization-request-form-error-text">{errors.general}</p>
            {errors.hint && (
              <p className="authorization-request-form-error-hint">{errors.hint}</p>
            )}
          </div>
        )}

        <div className="authorization-request-form-actions">
          <button
            type="button"
            onClick={handleCancel}
            disabled={submitting}
            className="authorization-request-form-button authorization-request-form-button-cancel"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="authorization-request-form-button authorization-request-form-button-submit"
          >
            {submitting ? (
              <>
                <Loader size={16} className="authorization-request-form-button-spinner" />
                Uploading & Submitting...
              </>
            ) : (
              <>
                <Send size={16} className="authorization-request-form-button-icon" />
                Submit Request
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AuthorizationRequestForm;

