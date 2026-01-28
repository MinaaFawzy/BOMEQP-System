import { useEffect, useState, useMemo, useRef } from 'react';
import { trainingCenterAPI } from '../../../services/api';
import { useHeader } from '../../../context/HeaderContext';
import useDebounce from '../../../hooks/useDebounce';
import { validateEmail, validatePhone, validateRequired, validateUKID } from '../../../utils/validation';
import { UserCheck, Plus, Edit, Trash2, Eye, Mail, Phone, Search, Filter, CheckCircle, Clock, XCircle, ChevronUp, ChevronDown, X, FileImage, BookOpen, Calendar, Upload, User } from 'lucide-react';
import Modal from '../../../components/Modal/Modal';
import ConfirmDialog from '../../../components/ConfirmDialog/ConfirmDialog';
import LoadingSpinner from '../../../components/LoadingSpinner/LoadingSpinner';
import TabCard from '../../../components/TabCard/TabCard';
import TabCardsGrid from '../../../components/TabCardsGrid/TabCardsGrid';
import DataTable from '../../../components/DataTable/DataTable';
import './TraineesScreen.css';
import FormInput from '../../../components/FormInput/FormInput';
import DetailForm from '../../../components/DetailForm/DetailForm';
import Pagination from '../../../components/Pagination/Pagination';
import { useTranslation } from '../../../hooks/useTranslation';

const TraineesScreen = () => {
  const { t } = useTranslation('training_center');
  const { setHeaderActions, setHeaderTitle, setHeaderSubtitle } = useHeader();
  const [trainees, setTrainees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedTrainee, setSelectedTrainee] = useState(null);
  const [trainingClasses, setTrainingClasses] = useState([]);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    nationality: '',
    id_number: '',
    id_image: null,
    card_image: null,
    enrolled_classes: [],
    status: 'active',
  });
  const [idImagePreview, setIdImagePreview] = useState(null);
  const [cardImagePreview, setCardImagePreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [resizingImage, setResizingImage] = useState(null); // 'id_image' or 'card_image' or null
  const [searchTerm, setSearchTerm] = useState('');

  const [statusFilter, setStatusFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // Pagination State
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const hasDataRef = useRef(false);

  // Statistics from API
  const [statistics, setStatistics] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    suspended: 0
  });

  useEffect(() => {
    loadTrainingClasses();
  }, []);

  useEffect(() => {
    const showLoading = !hasDataRef.current;

    if (searchTerm !== debouncedSearchTerm) {
      return;
    }

    loadTrainees(page, perPage, debouncedSearchTerm, statusFilter, showLoading);
  }, [page, perPage, debouncedSearchTerm, statusFilter, searchTerm]);

  useEffect(() => {
    setHeaderTitle(t('trainees.header.title'));
    setHeaderSubtitle(t('trainees.header.subtitle'));
    setHeaderActions(
      <button
        onClick={() => handleOpenModal()}
        className="trainees-header-button"
      >
        <Plus size={20} className="trainees-header-button-icon" />
        {t('trainees.actions.addTrainee')}
      </button>
    );
    return () => {
      setHeaderActions(null);
      setHeaderTitle(null);
      setHeaderSubtitle(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setHeaderActions, setHeaderTitle, setHeaderSubtitle, t]);

  const loadTrainees = async (pageArg = 1, limitArg = 10, search = '', status = 'all', showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    } else {
      setIsSearchLoading(true);
    }
    try {
      // Load data with pagination
      const params = {
        page: pageArg,
        per_page: limitArg,
        ...(search && { search }),
        ...(status !== 'all' && { status })
      };
      const data = await trainingCenterAPI.listTrainees(params);

      let traineesArray = [];
      if (data?.trainees) {
        traineesArray = data.trainees;
      } else if (Array.isArray(data)) {
        traineesArray = data;
      } else {
        traineesArray = [];
      }
      setTrainees(traineesArray);

      // Update pagination info
      if (data) {
        // Use pagination data from response
        if (data.pagination) {
          setTotalItems(data.pagination.total || 0);
          setTotalPages(data.pagination.last_page || 1);
        } else {
          const total = data.total || traineesArray.length;
          setTotalItems(total);
          setTotalPages(data.last_page || Math.ceil(total / limitArg) || 1);
        }

        // Update statistics from API response
        if (data.statistics) {
          setStatistics({
            total: data.statistics.total || 0,
            active: data.statistics.active || 0,
            inactive: data.statistics.inactive || 0,
            suspended: data.statistics.suspended || 0
          });
        }
      }
      hasDataRef.current = true;
    } catch (error) {
      console.error('Failed to load trainees:', error);
      setTrainees([]);
    } finally {
      setLoading(false);
      setIsSearchLoading(false);
    }
  };

  const loadTrainingClasses = async () => {
    try {
      const data = await trainingCenterAPI.listClasses();
      const classes = data?.classes || data?.data || [];
      setTrainingClasses(classes);
    } catch (error) {
      console.error('Failed to load training classes:', error);
      setTrainingClasses([]);
    }
  };



  const handleOpenModal = (trainee = null) => {
    if (trainee) {
      setSelectedTrainee(trainee);
      setFormData({
        first_name: trainee.first_name || '',
        last_name: trainee.last_name || '',
        email: trainee.email || '',
        phone: trainee.phone || '',
        nationality: trainee.nationality || '',
        id_number: trainee.id_number || '',
        id_image: null,
        card_image: null,
        enrolled_classes: trainee.training_classes?.map(tc => tc.id) || [],
        status: trainee.status || 'active',
      });
      setIdImagePreview(trainee.id_image_url || null);
      setCardImagePreview(trainee.card_image_url || null);
    } else {
      setSelectedTrainee(null);
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        nationality: '',
        id_number: '',
        id_image: null,
        card_image: null,
        enrolled_classes: [],
        status: 'active',
      });
      setIdImagePreview(null);
      setCardImagePreview(null);
    }
    setErrors({});
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTrainee(null);
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      nationality: '',
      id_number: '',
      id_image: null,
      card_image: null,
      enrolled_classes: [],
      status: 'active',
    });
    setIdImagePreview(null);
    setCardImagePreview(null);
    setErrors({});
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    setErrors({});
  };

  // Resize image function
  const resizeImage = (file, maxWidth = 1920, maxHeight = 1920, quality = 0.8) => {
    return new Promise((resolve) => {
      // If it's a PDF, return as-is
      if (file.type === 'application/pdf') {
        resolve(file);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          // Calculate new dimensions
          if (width > maxWidth || height > maxHeight) {
            if (width > height) {
              height = (height * maxWidth) / width;
              width = maxWidth;
            } else {
              width = (width * maxHeight) / height;
              height = maxHeight;
            }
          }

          // Create canvas and resize
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to blob
          canvas.toBlob(
            (blob) => {
              if (blob) {
                // Create a new File object with the resized image
                const resizedFile = new File([blob], file.name, {
                  type: file.type,
                  lastModified: Date.now(),
                });
                resolve(resizedFile);
              } else {
                resolve(file); // Fallback to original if conversion fails
              }
            },
            file.type,
            quality
          );
        };
        img.onerror = () => resolve(file); // Fallback to original on error
        img.src = e.target.result;
      };
      reader.onerror = () => resolve(file); // Fallback to original on error
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e, type) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        setErrors({ [type]: t('trainees.errors.fileType') });

        return;
      }
      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        setErrors({ [type]: t('trainees.errors.fileSize') });
        return;
      }

      setResizingImage(type);
      try {
        // Resize image if it's an image file (not PDF)
        let processedFile = file;
        if (file.type.startsWith('image/')) {
          processedFile = await resizeImage(file);
          console.log(`Image resized: ${file.size} bytes -> ${processedFile.size} bytes`);
        }

        setFormData({
          ...formData,
          [type]: processedFile,
        });

        // Create preview for images
        if (type === 'id_image' && processedFile.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onloadend = () => {
            setIdImagePreview(reader.result);
          };
          reader.readAsDataURL(processedFile);
        } else if (type === 'card_image' && processedFile.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onloadend = () => {
            setCardImagePreview(reader.result);
          };
          reader.readAsDataURL(processedFile);
        }
        setErrors({});
      } catch (error) {
        console.error('Error processing image:', error);
        setErrors({ [type]: t('trainees.errors.fileProcessing') });
      } finally {
        setResizingImage(null);
      }
    }
  };

  const handleClassToggle = (classId) => {
    setFormData(prev => {
      const enrolledClasses = prev.enrolled_classes || [];
      if (enrolledClasses.includes(classId)) {
        return { ...prev, enrolled_classes: enrolledClasses.filter(id => id !== classId) };
      } else {
        return { ...prev, enrolled_classes: [...enrolledClasses, classId] };
      }
    });
  };

  const handleRemoveImage = (type) => {
    if (type === 'id_image') {
      setFormData(prev => ({ ...prev, id_image: null }));
      setIdImagePreview(null);
    } else if (type === 'card_image') {
      setFormData(prev => ({ ...prev, card_image: null }));
      setCardImagePreview(null);
    }
    setErrors({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('🚀 handleSubmit called - UPDATE mode:', !!selectedTrainee);
    console.log('📋 Current formData:', formData);
    setSaving(true);
    setErrors({});

    // Validation - All fields are now required per API update
    const validationErrors = {};

    // Required text fields
    const firstNameError = validateRequired(formData.first_name, 'First name');
    if (firstNameError) validationErrors.first_name = firstNameError;

    const lastNameError = validateRequired(formData.last_name, 'Last name');
    if (lastNameError) validationErrors.last_name = lastNameError;

    const emailError = validateEmail(formData.email);
    if (emailError) validationErrors.email = emailError;

    const phoneError = validateRequired(formData.phone, 'Phone');
    if (phoneError) {
      validationErrors.phone = phoneError;
    } else {
      const phoneFormatError = validatePhone(formData.phone, 10);
      if (phoneFormatError) validationErrors.phone = phoneFormatError;
    }

    const nationalityError = validateRequired(formData.nationality, 'Nationality');
    if (nationalityError) validationErrors.nationality = nationalityError;

    const idNumberError = validateRequired(formData.id_number, 'ID number');
    if (idNumberError) {
      validationErrors.id_number = idNumberError;
    } else {
      const idFormatError = validateUKID(formData.id_number, 'ID number');
      if (idFormatError) validationErrors.id_number = idFormatError;
    }

    // File validations - required for create, optional for update if file already exists
    if (!selectedTrainee) {
      // Create mode - files are required
      if (!formData.id_image) {
        validationErrors.id_image = t('trainees.errors.idImageRequired');
      }
      if (!formData.card_image) {
        validationErrors.card_image = t('trainees.errors.cardImageRequired');
      }
    } else {
      // Edit mode - files are only required if no existing file URL
      if (!formData.id_image && !idImagePreview) {
        validationErrors.id_image = t('trainees.errors.idImageRequired');
      }
      if (!formData.card_image && !cardImagePreview) {
        validationErrors.card_image = t('trainees.errors.cardImageRequired');
      }
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setSaving(false);
      return;
    }

    try {
      const submitFormData = new FormData();

      if (selectedTrainee) {
        console.log('🔄 Starting UPDATE for trainee ID:', selectedTrainee.id);

        // Step 1: Build FormData - All fields are required per API update
        // Text fields - all required
        if (formData.first_name !== undefined && formData.first_name !== null && formData.first_name.trim()) {
          submitFormData.append('first_name', formData.first_name.trim());
        }
        if (formData.last_name !== undefined && formData.last_name !== null && formData.last_name.trim()) {
          submitFormData.append('last_name', formData.last_name.trim());
        }
        if (formData.email !== undefined && formData.email !== null && formData.email.trim()) {
          submitFormData.append('email', formData.email.trim());
        }
        if (formData.phone !== undefined && formData.phone !== null && formData.phone.trim()) {
          submitFormData.append('phone', formData.phone.trim());
        }
        if (formData.nationality !== undefined && formData.nationality !== null && formData.nationality.trim()) {
          submitFormData.append('nationality', formData.nationality.trim());
        }
        if (formData.id_number !== undefined && formData.id_number !== null && formData.id_number.trim()) {
          submitFormData.append('id_number', formData.id_number.trim());
        }
        if (formData.status !== undefined && formData.status !== null) {
          submitFormData.append('status', formData.status);
        }

        // File fields - only append if new file has been selected (File objects)
        // If field is omitted, existing file remains unchanged
        if (formData.id_image instanceof File) {
          submitFormData.append('id_image', formData.id_image);
        }
        if (formData.card_image instanceof File) {
          submitFormData.append('card_image', formData.card_image);
        }

        // Array field - enrolled_classes
        // Only append if array is present and is actually an array
        // Use array notation: enrolled_classes[] for each element
        if (formData.enrolled_classes !== undefined && Array.isArray(formData.enrolled_classes)) {
          // Append each class ID separately with array notation
          formData.enrolled_classes.forEach((classId) => {
            submitFormData.append('enrolled_classes[]', classId);
          });
        }

        // Debug: Log FormData contents - Multiple ways to ensure visibility
        console.log('========================================');
        console.log('📤 UPDATE Trainee - FormData Contents');
        console.log('========================================');
        console.log('Trainee ID:', selectedTrainee.id);
        console.log('FormData entries:');

        // Method 1: Using forEach
        submitFormData.forEach((value, key) => {
          if (value instanceof File) {
            console.log(`  ${key}: File - ${value.name} (${value.size} bytes, type: ${value.type})`);
          } else {
            console.log(`  ${key}: ${value}`);
          }
        });

        // Method 2: Using entries
        const entries = Array.from(submitFormData.entries());
        console.log('FormData entries array:', entries.map(([key, value]) => ({
          key,
          value: value instanceof File ? `File: ${value.name}` : value
        })));

        // Method 3: Object.fromEntries (may not work for files)
        try {
          const formDataObj = Object.fromEntries(submitFormData.entries());
          console.log('FormData as object:', formDataObj);
        } catch (err) {
          console.log('Could not convert FormData to object:', err.message);
        }

        console.log('========================================');

        await trainingCenterAPI.updateTrainee(selectedTrainee.id, submitFormData);
      } else {
        console.log('🆕 Starting CREATE new trainee');
        // For creates: Send all required fields
        submitFormData.append('first_name', formData.first_name.trim());
        submitFormData.append('last_name', formData.last_name.trim());
        submitFormData.append('email', formData.email.trim());
        submitFormData.append('phone', formData.phone.trim());
        submitFormData.append('nationality', formData.nationality.trim());
        submitFormData.append('id_number', formData.id_number.trim());
        submitFormData.append('status', formData.status);

        // Add files if provided
        if (formData.id_image instanceof File) {
          submitFormData.append('id_image', formData.id_image);
        }
        if (formData.card_image instanceof File) {
          submitFormData.append('card_image', formData.card_image);
        }

        // Add enrolled classes
        if (formData.enrolled_classes && Array.isArray(formData.enrolled_classes)) {
          formData.enrolled_classes.forEach((classId) => {
            submitFormData.append('enrolled_classes[]', classId);
          });
        }

        // Debug: Log FormData contents - Multiple ways to ensure visibility
        console.log('========================================');
        console.log('📤 CREATE Trainee - FormData Contents');
        console.log('========================================');
        console.log('FormData entries:');

        // Method 1: Using forEach
        submitFormData.forEach((value, key) => {
          if (value instanceof File) {
            console.log(`  ${key}: File - ${value.name} (${value.size} bytes, type: ${value.type})`);
          } else {
            console.log(`  ${key}: ${value}`);
          }
        });

        // Method 2: Using entries
        const entries = Array.from(submitFormData.entries());
        console.log('FormData entries array:', entries.map(([key, value]) => ({
          key,
          value: value instanceof File ? `File: ${value.name}` : value
        })));

        // Method 3: Object.fromEntries (may not work for files)
        try {
          const formDataObj = Object.fromEntries(submitFormData.entries());
          console.log('FormData as object:', formDataObj);
        } catch (err) {
          console.log('Could not convert FormData to object:', err.message);
        }

        console.log('========================================');

        await trainingCenterAPI.createTrainee(submitFormData);
      }
      await loadTrainees(page, perPage, debouncedSearchTerm, statusFilter);
      handleCloseModal();
    } catch (error) {
      console.error('Error submitting trainee:', error);
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      } else if (error.response?.data?.message) {
        setErrors({ general: error.response.data.message });
      } else {
        setErrors({ general: error.message || t('trainees.errors.unknown') });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (trainee) => {
    setSelectedTrainee(trainee);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await trainingCenterAPI.deleteTrainee(selectedTrainee.id);
      await loadTrainees(page, perPage, debouncedSearchTerm, statusFilter);
    } catch (error) {
      alert(t('trainees.errors.deleteFailedPrefix') + (error.message || t('trainees.errors.unknown')));
    }
    setIsDeleteDialogOpen(false);
    setSelectedTrainee(null);
  };

  const handleViewDetails = async (trainee) => {
    try {
      const data = await trainingCenterAPI.getTraineeDetails(trainee.id);
      setSelectedTrainee(data.trainee);
      setDetailModalOpen(true);
    } catch (error) {
      console.error('Failed to load trainee details:', error);
      setSelectedTrainee(trainee);
      setDetailModalOpen(true);
    }
  };

  // Use statistics from API response
  const totalCount = statistics.total;
  const activeCount = statistics.active;
  const inactiveCount = statistics.inactive;
  const suspendedCount = statistics.suspended;

  // Define columns for DataTable
  const traineesColumns = useMemo(() => [
    {
      header: t('trainees.table.columns.trainee'),
      accessor: 'name',
      sortable: true,
      render: (value, row) => (
        <div className="trainees-column-trainee">
          <div className="trainees-column-icon-wrapper" style={{ position: 'relative' }}>
            {row.id_image_url ? (
              <>
                <img
                  src={row.id_image_url}
                  alt={`${row.first_name} ${row.last_name}` || 'Trainee ID Image'}
                  className="trainees-column-icon"
                  width="40"
                  height="40"
                  loading="lazy"
                  decoding="async"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb'
                  }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    const fallback = e.target.parentElement?.querySelector('.id-image-fallback');
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
                <div
                  className="id-image-fallback trainees-column-icon-wrapper"
                  style={{ display: 'none', position: 'absolute', top: 0, left: 0 }}
                >
                  <UserCheck className="trainees-column-icon" />
                </div>
              </>
            ) : (
              <UserCheck className="trainees-column-icon" />
            )}
          </div>
          <div>
            <div className="trainees-column-name">
              {row.first_name} {row.last_name}
            </div>
          </div>
        </div>
      )
    },
    {
      header: t('trainees.table.columns.email'),
      accessor: 'email',
      sortable: true,
      render: (value) => (
        <div className="trainees-column-email">
          <Mail className="trainees-column-email-icon" />
          {value}
        </div>
      )
    },
    {
      header: t('trainees.table.columns.phone'),
      accessor: 'phone',
      sortable: true,
      render: (value) => (
        value ? (
          <div className="trainees-column-phone">
            <Phone className="trainees-column-phone-icon" />
            {value}
          </div>
        ) : (
          <span className="trainees-column-na">{t('trainees.common.na')}</span>
        )
      )
    },
    {
      header: t('trainees.table.columns.nationality'),
      accessor: 'nationality',
      sortable: true,
      render: (value) => (
        <span className="trainees-column-nationality">{value || t('trainees.common.na')}</span>
      )
    },
    {
      header: t('trainees.table.columns.idNumber'),
      accessor: 'id_number',
      sortable: true,
      render: (value) => (
        <span className="trainees-column-id-number">{value || t('trainees.common.na')}</span>
      )
    },
    {
      header: t('trainees.table.columns.status'),
      accessor: 'status',
      sortable: true,
      render: (value) => {
        const statusConfig = {
          active: { icon: CheckCircle, class: 'trainees-column-status-badge-active' },
          inactive: { icon: Clock, class: 'trainees-column-status-badge-inactive' },
          suspended: { icon: XCircle, class: 'trainees-column-status-badge-suspended' },
        };
        const config = statusConfig[value] || statusConfig.inactive;
        const StatusIcon = config.icon;
        return (
          <span className={`trainees-column-status-badge ${config.class}`}>
            <StatusIcon size={14} className="trainees-column-status-icon" />
            {value ? t(`trainees.status.${value}`) : t('trainees.common.na')}
          </span>
        );
      }
    },
    {
      header: t('trainees.table.columns.classes'),
      accessor: 'training_classes',
      sortable: false,
      render: (value) => (
        value && value.length > 0 ? (
          <div className="trainees-column-classes">
            <BookOpen size={16} className="trainees-column-classes-icon" />
            <span className="trainees-column-classes-count">{value.length}</span>
          </div>
        ) : (
          <span className="trainees-column-na">{t('trainees.common.zero')}</span>
        )
      )
    },
    {
      header: t('trainees.table.columns.actions'),
      accessor: 'actions',
      sortable: false,
      render: (value, row) => (
        <div className="trainees-column-actions" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleOpenModal(row);
            }}
            className="trainees-action-button trainees-action-button-edit"
            title={t('trainees.actions.edit')}
          >
            <Edit size={16} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(row);
            }}
            className="trainees-action-button trainees-action-button-delete"
            title={t('trainees.actions.delete')}
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ], []);

  if (loading && trainees.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <div className="trainees-container">

      {/* Stats Cards */}
      <TabCardsGrid columns={{ mobile: 1, tablet: 2, desktop: 4 }}>
        <TabCard
          name={t('trainees.stats.total')}
          value={totalCount}
          icon={UserCheck}
          colorType="indigo"
          isActive={statusFilter === 'all'}
          onClick={() => {
            setStatusFilter('all');
            setPage(1);
          }}
        />
        <TabCard
          name={t('trainees.status.active')}
          value={activeCount}
          icon={CheckCircle}
          colorType="green"
          isActive={statusFilter === 'active'}
          onClick={() => {
            setStatusFilter('active');
            setPage(1);
          }}
        />
        <TabCard
          name={t('trainees.status.inactive')}
          value={inactiveCount}
          icon={Clock}
          colorType="blue"
          isActive={statusFilter === 'inactive'}
          onClick={() => {
            setStatusFilter('inactive');
            setPage(1);
          }}
        />
        <TabCard
          name={t('trainees.status.suspended')}
          value={suspendedCount}
          icon={XCircle}
          colorType="red"
          isActive={statusFilter === 'suspended'}
          onClick={() => {
            setStatusFilter('suspended');
            setPage(1);
          }}
        />
      </TabCardsGrid>

      {/* Table */}
      <div className="trainees-table-container">
        <DataTable
          columns={traineesColumns}
          data={trainees}
          isLoading={loading}
          rowsPerPage={perPage}
          searchValue={searchTerm}
          onSearch={(value) => {
            setSearchTerm(value);
            setPage(1);
          }}
          searchable={true}
          sortable={true}
          filterable={true}
          searchPlaceholder={t('trainees.table.searchPlaceholder')}
          emptyMessage={t('trainees.table.emptyMessage')}
          filterOptions={[
            { value: 'all', label: t('trainees.filters.allStatus'), filterFn: null },
            { value: 'active', label: t('trainees.status.active'), filterFn: (row) => row.status === 'active' },
            { value: 'inactive', label: t('trainees.status.inactive'), filterFn: (row) => row.status === 'inactive' },
            { value: 'suspended', label: t('trainees.status.suspended'), filterFn: (row) => row.status === 'suspended' },
          ]}
          defaultFilter={statusFilter}
          onRowClick={(trainee) => handleViewDetails(trainee)}
        />
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={totalItems}
          perPage={perPage}
          onPageChange={(p) => {
            setPage(p);
          }}
          onPerPageChange={(newPerPage) => {
            setPerPage(newPerPage);
            setPage(1);
          }}
        />
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={selectedTrainee ? t('trainees.actions.updateTrainee') : t('trainees.actions.addTrainee')}
        size="lg"
      >
        {saving && (
          <div className="trainees-form-loading-overlay">
            <div className="trainees-form-loading-spinner">
              <div className="trainees-form-spinner"></div>
              <p className="trainees-form-loading-text">{t('trainees.modal.saving')}</p>
            </div>
          </div>
        )}
        <form onSubmit={handleSubmit} className={`trainees-form ${saving ? 'trainees-form-saving' : ''}`}>
          <div className="trainees-form-grid">
            <FormInput
              label={t('trainees.form.firstName')}
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              required
              error={errors.first_name}
              disabled={saving}
            />

            <FormInput
              label={t('trainees.form.lastName')}
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              required
              error={errors.last_name}
              disabled={saving}
            />
          </div>

          <div className="trainees-form-grid">
            <FormInput
              label={t('trainees.form.email')}
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              error={errors.email}
              disabled={saving}
            />

            <FormInput
              label={t('trainees.form.phone')}
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              required
              error={errors.phone}
              disabled={saving}
            />
          </div>

          <div className="trainees-form-grid">
            <FormInput
              label={t('trainees.form.nationality')}
              name="nationality"
              value={formData.nationality}
              onChange={handleChange}
              required
              error={errors.nationality}
              disabled={saving}
              placeholder={t('trainees.placeholders.nationality')}
            />

            <FormInput
              label={t('trainees.form.idNumber')}
              name="id_number"
              value={formData.id_number}
              onChange={handleChange}
              required
              error={errors.id_number}
              disabled={saving}
              placeholder={t('trainees.placeholders.idNumber')}
            />
          </div>

          <div className="trainees-form-grid">
            <FormInput
              label={t('trainees.form.status')}
              name="status"
              type="select"
              value={formData.status}
              onChange={handleChange}
              options={[
                { value: 'active', label: t('trainees.status.active') },
                { value: 'inactive', label: t('trainees.status.inactive') },
                { value: 'suspended', label: t('trainees.status.suspended') },
              ]}
              error={errors.status}
              disabled={saving}
            />
          </div>

          {/* ID Image Upload */}
          <div>
            <label className="trainees-image-label">
              {t('trainees.upload.idImage')} <span className="trainees-image-label-required">*</span>
            </label>

            {resizingImage === 'id_image' ? (
              <div className="trainees-image-resizing">
                <div className="trainees-image-resizing-spinner"></div>
                <p className="trainees-image-resizing-text">{t('trainees.upload.resizing')}</p>
              </div>
            ) : idImagePreview ? (
              <div className="trainees-image-preview-container">
                <div className="trainees-image-preview-box">
                  <img
                    src={idImagePreview}
                    alt="ID Preview"
                    className="trainees-image-preview-img"
                  />
                  <div className="trainees-image-preview-overlay">
                    <div className="trainees-image-preview-actions">
                      <label>
                        <input
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,application/pdf"
                          onChange={(e) => handleFileChange(e, 'id_image')}
                          className="trainees-image-upload-input"
                          disabled={saving || resizingImage !== null}
                        />
                        <div className="trainees-image-change-button">
                          <Upload size={18} />
                          <span className="trainees-image-change-text">{t('trainees.upload.change')}</span>
                        </div>
                      </label>
                      <button
                        type="button"
                        onClick={() => handleRemoveImage('id_image')}
                        className="trainees-image-remove-button"
                        disabled={saving}
                      >
                        <X size={18} />
                        <span className="trainees-image-remove-text">{t('trainees.upload.remove')}</span>
                      </button>
                    </div>
                  </div>
                </div>
                {formData.id_image instanceof File && (
                  <p className="trainees-image-file-name">
                    <FileImage size={14} />
                    {formData.id_image.name} ({Math.round(formData.id_image.size / 1024)} KB)
                  </p>
                )}
              </div>
            ) : (
              <label className="trainees-image-upload-label">
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,application/pdf"
                  onChange={(e) => handleFileChange(e, 'id_image')}
                  className="trainees-image-upload-input"
                  disabled={saving || resizingImage !== null}
                />
                <div className="trainees-image-upload-area">
                  <div className="trainees-image-upload-inner">
                    <div className="trainees-image-upload-icon-wrapper">
                      <Upload className="text-white" size={28} />
                    </div>
                    <p className="trainees-image-upload-text-title">
                      {t('trainees.upload.uploadIdTitle')}
                    </p>
                    <p className="trainees-image-upload-text-hint">
                      {t('trainees.upload.hint')}
                    </p>
                    <p className="trainees-image-upload-text-small">
                      {t('trainees.upload.formatsHint')}
                    </p>
                  </div>
                </div>
              </label>
            )}
            {errors.id_image && (
              <p className="trainees-image-error">
                <XCircle size={16} />
                {Array.isArray(errors.id_image) ? errors.id_image[0] : errors.id_image}
              </p>
            )}
          </div>

          {/* Card Image Upload */}
          <div>
            <label className="trainees-image-label">
              {t('trainees.upload.cardImage')} <span className="trainees-image-label-required">*</span>
            </label>

            {resizingImage === 'card_image' ? (
              <div className="trainees-image-resizing">
                <div className="trainees-image-resizing-spinner"></div>
                <p className="trainees-image-resizing-text">{t('trainees.upload.resizing')}</p>
              </div>
            ) : cardImagePreview ? (
              <div className="trainees-image-preview-container">
                <div className="trainees-image-preview-box">
                  <img
                    src={cardImagePreview}
                    alt="Card Preview"
                    className="trainees-image-preview-img"
                  />
                  <div className="trainees-image-preview-overlay">
                    <div className="trainees-image-preview-actions">
                      <label>
                        <input
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,application/pdf"
                          onChange={(e) => handleFileChange(e, 'card_image')}
                          className="trainees-image-upload-input"
                          disabled={saving || resizingImage !== null}
                        />
                        <div className="trainees-image-change-button">
                          <Upload size={18} />
                          <span className="trainees-image-change-text">{t('trainees.upload.change')}</span>
                        </div>
                      </label>
                      <button
                        type="button"
                        onClick={() => handleRemoveImage('card_image')}
                        className="trainees-image-remove-button"
                        disabled={saving}
                      >
                        <X size={18} />
                        <span className="trainees-image-remove-text">{t('trainees.upload.remove')}</span>
                      </button>
                    </div>
                  </div>
                </div>
                {formData.card_image instanceof File && (
                  <p className="trainees-image-file-name">
                    <FileImage size={14} />
                    {formData.card_image.name} ({Math.round(formData.card_image.size / 1024)} KB)
                  </p>
                )}
              </div>
            ) : (
              <label className="trainees-image-upload-label">
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,application/pdf"
                  onChange={(e) => handleFileChange(e, 'card_image')}
                  className="trainees-image-upload-input"
                  disabled={saving || resizingImage !== null}
                />
                <div className="trainees-image-upload-area">
                  <div className="trainees-image-upload-inner">
                    <div className="trainees-image-upload-icon-wrapper">
                      <Upload className="text-white" size={28} />
                    </div>
                    <p className="trainees-image-upload-text-title">
                      {t('trainees.upload.uploadCardTitle')}
                    </p>
                    <p className="trainees-image-upload-text-hint">
                      {t('trainees.upload.hint')}
                    </p>
                    <p className="trainees-image-upload-text-small">
                      {t('trainees.upload.formatsHint')}
                    </p>
                  </div>
                </div>
              </label>
            )}
            {errors.card_image && (
              <p className="trainees-image-error">
                <XCircle size={16} />
                {Array.isArray(errors.card_image) ? errors.card_image[0] : errors.card_image}
              </p>
            )}
          </div>

          {/* Enrolled Classes */}
          <div>
            <label className="trainees-classes-label">
              {t('trainees.classes.title')}
            </label>
            {trainingClasses.length === 0 ? (
              <p className="trainees-classes-empty">{t('trainees.classes.empty')}</p>
            ) : (
              <div className="trainees-classes-container">
                {trainingClasses.map(trainingClass => (
                  <label
                    key={trainingClass.id}
                    className="trainees-class-item"
                  >
                    <input
                      type="checkbox"
                      checked={formData.enrolled_classes?.includes(trainingClass.id) || false}
                      onChange={() => handleClassToggle(trainingClass.id)}
                      className="trainees-class-checkbox"
                      disabled={saving}
                    />
                    <div className="trainees-class-info">
                      <span className="trainees-class-name">
                        {trainingClass.course?.name || trainingClass.name || t('trainees.classes.classFallback', { id: trainingClass.id })}
                      </span>
                      {trainingClass.start_date && trainingClass.end_date && (
                        <div className="trainees-class-date">
                          <Calendar size={12} />
                          {new Date(trainingClass.start_date).toLocaleDateString()} - {new Date(trainingClass.end_date).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            )}
            {errors.enrolled_classes && (
              <p className="trainees-classes-error">{Array.isArray(errors.enrolled_classes) ? errors.enrolled_classes[0] : errors.enrolled_classes}</p>
            )}
          </div>

          {errors.general && (
            <div className="trainees-error-box">
              <p className="trainees-error-text-bold">{errors.general}</p>
            </div>
          )}

          {/* Display field-specific errors */}
          {Object.keys(errors).filter(key => key !== 'general' && key !== 'id_image' && key !== 'card_image' && key !== 'enrolled_classes').map((key) => (
            errors[key] && (
              <p key={key} className="trainees-error-text">
                {key}: {Array.isArray(errors[key]) ? errors[key][0] : errors[key]}
              </p>
            )
          ))}

          <div className="trainees-form-actions">
            <button
              type="button"
              onClick={handleCloseModal}
              className="trainees-button-cancel"
            >
              {t('trainees.buttons.cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="trainees-button-submit"
            >
              {saving ? 'Saving...' : selectedTrainee ? t('trainees.header.updateTrainee') : t('trainees.header.addTrainee')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Trainee Detail Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedTrainee(null);
        }}
        title={t('trainees.details.title')}
        size="lg"
      >
        {selectedTrainee && (
          <div className="trainees-detail-container">
            <DetailForm
              data={selectedTrainee}
              fields={[
                { key: 'first_name', label: t('trainees.details.detailFields.firstName'), icon: User },
                { key: 'last_name', label: t('trainees.details.detailFields.lastName'), icon: User },
                { key: 'email', label: t('trainees.details.detailFields.email'), type: 'email', icon: Mail },
                { key: 'nationality', label: t('trainees.details.detailFields.nationality'), icon: User },
                { key: 'phone', label: t('trainees.details.detailFields.phoneNo'), icon: Phone },
                { key: 'id_number', label: t('trainees.details.detailFields.passportIdNumber'), showEmpty: false },
                { key: 'status', label: t('trainees.fields.status'), type: 'status' },
              ]}
            />

            {/* ID and Card Images */}
            <div className="trainees-detail-images-grid">
              {selectedTrainee.id_image_url && (
                <div className="trainees-detail-image-box">
                  <p className="trainees-detail-image-label">{t('trainees.details.detailFields.uploadPassportId')}</p>
                  <a href={selectedTrainee.id_image_url} target="_blank" rel="noopener noreferrer" className="trainees-detail-image-link">
                    <img src={selectedTrainee.id_image_url} alt="ID" className="trainees-detail-image" loading="lazy" decoding="async" />
                  </a>
                </div>
              )}
              {selectedTrainee.card_image_url && (
                <div className="trainees-detail-image-box">
                  <p className="trainees-detail-image-label">{t('trainees.details.detailFields.picUpload')}</p>
                  <a href={selectedTrainee.card_image_url} target="_blank" rel="noopener noreferrer" className="trainees-detail-image-link">
                    <img src={selectedTrainee.card_image_url} alt="Card" className="trainees-detail-image" loading="lazy" decoding="async" />
                  </a>
                </div>
              )}
            </div>

            {/* Training Classes */}
            {/* Training Classes - Dropdown */}
            {selectedTrainee.training_classes && selectedTrainee.training_classes.length > 0 && (
              <details className="trainees-classes-dropdown">
                <summary className="trainees-classes-dropdown-summary">
                  <span className="trainees-classes-dropdown-title">
                    {t('trainees.details.enrolledClassesWithCount', { count: selectedTrainee.training_classes.length })}
                  </span>
                  <ChevronDown size={20} className="trainees-classes-dropdown-icon" />
                </summary>
                <div className="trainees-classes-dropdown-content">
                  {selectedTrainee.training_classes.map((tc, index) => (
                    <div key={index} className="trainees-class-detail-item">
                      <div className="trainees-class-detail-header">
                        <div>
                          <p className="trainees-class-detail-name">
                            {tc.course?.name || tc.name || t('trainees.classes.classFallback', { id: tc.id })}
                          </p>
                          {tc.start_date && tc.end_date && (
                            <p className="trainees-class-detail-date">
                              <Calendar size={12} />
                              {new Date(tc.start_date).toLocaleDateString()} - {new Date(tc.end_date).toLocaleDateString()}
                            </p>
                          )}
                          {tc.instructor && (
                            <p className="trainees-class-detail-instructor">
                              {t('trainees.classes.instructorPrefix')} {tc.instructor.first_name} {tc.instructor.last_name}
                            </p>
                          )}
                        </div>
                        {tc.pivot?.status && (
                          <span className={`trainees-class-detail-status ${tc.pivot.status === 'enrolled' ? 'trainees-class-detail-status-enrolled' :
                            tc.pivot.status === 'completed' ? 'trainees-class-detail-status-completed' :
                              tc.pivot.status === 'dropped' ? 'trainees-class-detail-status-dropped' :
                                'trainees-class-detail-status-other'
                            }`}>
                            {tc.pivot.status}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setSelectedTrainee(null);
        }}
        onConfirm={confirmDelete}
        title={t('trainees.deleteDialog.title')}
        message={t('trainees.deleteDialog.message', { name: `${selectedTrainee?.first_name} ${selectedTrainee?.last_name}` })}
        confirmText={t('trainees.actions.delete')}
        variant="danger"
      />
    </div>
  );
};

export default TraineesScreen;

