import { useState } from 'react';
import { FileText, Plus, Trash2, CheckCircle, Upload, Send, Loader } from 'lucide-react';
import FormInput from '../FormInput/FormInput';
import { validateFile, validateMaxLength } from '../../utils/validation';
import { useTranslation } from '../../hooks/useTranslation';
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
  const { t } = useTranslation('training_center');
  const [formData, setFormData] = useState(initialData);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};

    // Validate documents
    if (formData.documents.length === 0) {
      newErrors.general = t('authorization_form.please_upload_at_least_one_document');
      return newErrors;
    }

    // Validate each document
    formData.documents.forEach((doc, index) => {
      // Validate document type
      if (!doc.type || doc.type.trim() === '') {
        newErrors[`documents.${index}.type`] = t('authorization_form.document_type_required');
      }

      // Validate document file
      if (!doc.file) {
        newErrors[`documents.${index}.file`] = t('authorization_form.please_upload_file');
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
        t('authorization_form.additional_information')
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
            <p className="authorization-request-form-overlay-text">{t('authorization_form.uploading_files_please_wait')}</p>
            <p className="authorization-request-form-overlay-hint">{t('authorization_form.please_wait_moment')}</p>
          </div>
        </div>
      )}
      <form onSubmit={handleSubmit} className="authorization-request-form">
        {/* Documents Section */}
        <div>
          <div className="authorization-request-form-section-header">
            <h3 className="authorization-request-form-section-title">
              <FileText size={20} className="authorization-request-form-section-title-icon" />
              {t('authorization_form.documents')}
            </h3>
            <button
              type="button"
              onClick={handleAddDocument}
              disabled={submitting}
              className="authorization-request-form-button-add"
            >
              <Plus size={16} className="authorization-request-form-button-add-icon" />
              {t('authorization_form.add_document')}
            </button>
          </div>

          {formData.documents.length === 0 ? (
            <div className="authorization-request-form-warning-box">
              <p className="authorization-request-form-warning-text">{t('authorization_form.no_documents_added')}</p>
              <p className="authorization-request-form-warning-hint">{t('authorization_form.at_least_one_document_required')}</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {formData.documents.map((doc, index) => (
                <div key={index} className="authorization-request-form-document-item">
                  <div className="authorization-request-form-document-header">
                    <span className="authorization-request-form-document-number">{t('authorization_form.document_number', { number: index + 1 })}</span>
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
                      <FormInput
                        label={t('authorization_form.document_type')}
                        name={`documents.${index}.type`}
                        type="select"
                        value={doc.type || ''}
                        onChange={(e) => handleDocumentChange(index, 'type', e.target.value)}
                        required
                        disabled={submitting}
                        error={errors[`documents.${index}.type`]}
                        options={[
                          { value: '', label: t('authorization_form.select_document_type') },
                          { value: 'license', label: t('authorization_form.license') },
                          { value: 'certificate', label: t('authorization_form.certificate') },
                          { value: 'registration', label: t('authorization_form.registration') },
                          { value: 'other', label: t('authorization_form.other') }
                        ]}
                      />
                    </div>
                    <div>
                      <label className="authorization-request-form-label">
                        {t('authorization_form.upload_document')} <span className="authorization-request-form-label-required">*</span>
                        <span className="authorization-request-form-label-hint">{t('authorization_form.upload_document_hint')}</span>
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
                          className={`authorization-request-form-file-upload-label ${submitting
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
                                {doc.fileName || t('authorization_form.file_selected')}
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
                              <span className="authorization-request-form-file-upload-text authorization-request-form-file-upload-text-default">{t('authorization_form.click_to_upload_file')}</span>
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
                            {t('authorization_form.remove_file')}
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
          label={t('authorization_form.additional_information')}
          name="additional_info"
          value={formData.additional_info}
          onChange={handleAdditionalInfoChange}
          textarea
          rows={4}
          placeholder={t('authorization_form.provide_additional_info')}
          error={errors.additional_info}
          disabled={submitting}
          helpText={t('authorization_form.maximum_5000_characters')}
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
            {t('authorization_form.cancel')}
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="authorization-request-form-button authorization-request-form-button-submit"
          >
            {submitting ? (
              <>
                <Loader size={16} className="authorization-request-form-button-spinner" />
                {t('authorization_form.uploading_submitting')}
              </>
            ) : (
              <>
                <Send size={16} className="authorization-request-form-button-icon" />
                {t('authorization_form.submit_request')}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AuthorizationRequestForm;

