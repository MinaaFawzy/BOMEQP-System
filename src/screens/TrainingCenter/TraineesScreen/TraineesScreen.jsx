import { useEffect, useState, useMemo } from 'react';
import { trainingCenterAPI } from '../../../services/api';
import { useHeader } from '../../../context/HeaderContext';
import { UserCheck, Plus, Edit, Trash2, Eye, Mail, Phone, Search, Filter, CheckCircle, Clock, XCircle, ChevronUp, ChevronDown, X, FileImage, BookOpen, Calendar, Upload } from 'lucide-react';
import Modal from '../../../components/Modal/Modal';
import ConfirmDialog from '../../../components/ConfirmDialog/ConfirmDialog';
import LoadingSpinner from '../../../components/LoadingSpinner/LoadingSpinner';
import TabCard from '../../../components/TabCard/TabCard';
import TabCardsGrid from '../../../components/TabCardsGrid/TabCardsGrid';
import DataTable from '../../../components/DataTable/DataTable';
import './TraineesScreen.css';
import FormInput from '../../../components/FormInput/FormInput';

const TraineesScreen = () => {
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

  useEffect(() => {
    loadTrainees();
    loadTrainingClasses();
  }, []);

  useEffect(() => {
    setHeaderTitle('Trainees');
    setHeaderSubtitle('Manage your trainees');
      setHeaderActions(
      <button
        onClick={() => handleOpenModal()}
        className="trainees-header-button"
      >
        <Plus size={20} className="trainees-header-button-icon" />
        Add Trainee
      </button>
    );
    return () => {
      setHeaderActions(null);
      setHeaderTitle(null);
      setHeaderSubtitle(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setHeaderActions, setHeaderTitle, setHeaderSubtitle]);

  const loadTrainees = async () => {
    setLoading(true);
    try {
      // Load all data - search and statusFilter are handled client-side
      const params = {
        per_page: 1000,
        ...(searchTerm && { search: searchTerm }),
      };
      const data = await trainingCenterAPI.listTrainees(params);
      if (data?.trainees) {
        setTrainees(data.trainees);
      } else if (Array.isArray(data)) {
        setTrainees(data);
      } else {
        setTrainees([]);
      }
    } catch (error) {
      console.error('Failed to load trainees:', error);
      setTrainees([]);
    } finally {
      setLoading(false);
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

  useEffect(() => {
    loadTrainees();
  }, [searchTerm]); // Reload when searchTerm changes, statusFilter is client-side only

  const handleOpenModal = (trainee = null) => {
    if (trainee) {
      setSelectedTrainee(trainee);
      setFormData({
        first_name: trainee.first_name || '',
        last_name: trainee.last_name || '',
        email: trainee.email || '',
        phone: trainee.phone || '',
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
        setErrors({ [type]: 'File must be jpeg, jpg, png, or pdf' });
        return;
      }
      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        setErrors({ [type]: 'File size must be less than 10MB' });
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
        setErrors({ [type]: 'Failed to process image. Please try again.' });
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

    try {
      const submitFormData = new FormData();
      
      if (selectedTrainee) {
        console.log('🔄 Starting UPDATE for trainee ID:', selectedTrainee.id);
        
        // Step 1: Build FormData - Only include fields you want to update (partial updates)
        // Text fields - only append if field has value
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
      await loadTrainees();
      handleCloseModal();
    } catch (error) {
      console.error('Error submitting trainee:', error);
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      } else if (error.response?.data?.message) {
        setErrors({ general: error.response.data.message });
      } else {
        setErrors({ general: error.message || 'Failed to save trainee' });
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
      await loadTrainees();
    } catch (error) {
      alert('Failed to delete trainee: ' + (error.message || 'Unknown error'));
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

  // Calculate stats from all trainees (not filtered)
  const totalCount = trainees.length;
  const activeCount = trainees.filter(t => t.status === 'active').length;
  const inactiveCount = trainees.filter(t => t.status === 'inactive').length;
  const suspendedCount = trainees.filter(t => t.status === 'suspended').length;

  // Define columns for DataTable
  const traineesColumns = useMemo(() => [
    {
      header: 'Trainee',
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
      header: 'Email',
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
      header: 'Phone',
      accessor: 'phone',
      sortable: true,
      render: (value) => (
        value ? (
          <div className="trainees-column-phone">
            <Phone className="trainees-column-phone-icon" />
            {value}
          </div>
        ) : (
          <span className="trainees-column-na">N/A</span>
        )
      )
    },
    {
      header: 'ID Number',
      accessor: 'id_number',
      sortable: true,
      render: (value) => (
        <span className="trainees-column-id-number">{value || 'N/A'}</span>
      )
    },
    {
      header: 'Status',
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
            {value ? value.charAt(0).toUpperCase() + value.slice(1) : 'N/A'}
          </span>
        );
      }
    },
    {
      header: 'Classes',
      accessor: 'training_classes',
      sortable: false,
      render: (value) => (
        value && value.length > 0 ? (
          <div className="trainees-column-classes">
            <BookOpen size={16} className="trainees-column-classes-icon" />
            <span className="trainees-column-classes-count">{value.length}</span>
          </div>
        ) : (
          <span className="trainees-column-na">0</span>
        )
      )
    },
    {
      header: 'Actions',
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
            title="Edit"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(row);
            }}
            className="trainees-action-button trainees-action-button-delete"
            title="Delete"
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
          name="Total Trainees"
          value={totalCount}
          icon={UserCheck}
          colorType="indigo"
          isActive={statusFilter === 'all'}
          onClick={() => setStatusFilter('all')}
        />
        <TabCard
          name="Active"
          value={activeCount}
          icon={CheckCircle}
          colorType="green"
          isActive={statusFilter === 'active'}
          onClick={() => setStatusFilter('active')}
        />
        <TabCard
          name="Inactive"
          value={inactiveCount}
          icon={Clock}
          colorType="blue"
          isActive={statusFilter === 'inactive'}
          onClick={() => setStatusFilter('inactive')}
        />
        <TabCard
          name="Suspended"
          value={suspendedCount}
          icon={XCircle}
          colorType="red"
          isActive={statusFilter === 'suspended'}
          onClick={() => setStatusFilter('suspended')}
        />
      </TabCardsGrid>

      {/* Table */}
      <div className="trainees-table-container">
        <DataTable
          columns={traineesColumns}
          data={trainees}
          isLoading={loading}
          searchable={true}
          sortable={true}
          filterable={true}
          searchPlaceholder="Search by name, email, phone, or ID number..."
          emptyMessage="No trainees found"
          filterOptions={[
            { value: 'all', label: 'All Status', filterFn: null },
            { value: 'active', label: 'Active', filterFn: (row) => row.status === 'active' },
            { value: 'inactive', label: 'Inactive', filterFn: (row) => row.status === 'inactive' },
            { value: 'suspended', label: 'Suspended', filterFn: (row) => row.status === 'suspended' },
          ]}
          defaultFilter={statusFilter}
          onRowClick={(trainee) => handleViewDetails(trainee)}
        />
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={selectedTrainee ? 'Edit Trainee' : 'Add New Trainee'}
        size="lg"
      >
        {saving && (
          <div className="trainees-form-loading-overlay">
            <div className="trainees-form-loading-spinner">
              <div className="trainees-form-spinner"></div>
              <p className="trainees-form-loading-text">Saving trainee...</p>
            </div>
          </div>
        )}
        <form onSubmit={handleSubmit} className={`trainees-form ${saving ? 'trainees-form-saving' : ''}`}>
          <div className="trainees-form-grid">
            <FormInput
              label="First Name"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              required
              error={errors.first_name}
              disabled={saving}
            />

            <FormInput
              label="Last Name"
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
              label="Email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              error={errors.email}
              disabled={saving}
            />

            <FormInput
              label="Phone"
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
              label="ID Number"
              name="id_number"
              value={formData.id_number}
              onChange={handleChange}
              required
              error={errors.id_number}
              disabled={saving}
            />

            <FormInput
              label="Status"
              name="status"
              type="select"
              value={formData.status}
              onChange={handleChange}
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
                { value: 'suspended', label: 'Suspended' },
              ]}
              error={errors.status}
              disabled={saving}
            />
          </div>

          {/* ID Image Upload */}
          <div>
            <label className="trainees-image-label">
              ID Image {!selectedTrainee && <span className="trainees-image-label-required">*</span>}
            </label>
            
            {resizingImage === 'id_image' ? (
              <div className="trainees-image-resizing">
                <div className="trainees-image-resizing-spinner"></div>
                <p className="trainees-image-resizing-text">Resizing image...</p>
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
                          <span className="trainees-image-change-text">Change</span>
                        </div>
                      </label>
                      <button
                        type="button"
                        onClick={() => handleRemoveImage('id_image')}
                        className="trainees-image-remove-button"
                        disabled={saving}
                      >
                        <X size={18} />
                        <span className="trainees-image-remove-text">Remove</span>
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
                      Upload ID Image
                    </p>
                    <p className="trainees-image-upload-text-hint">
                      Click to browse or drag and drop
                    </p>
                    <p className="trainees-image-upload-text-small">
                      JPEG, JPG, PNG, PDF (Max 10MB - Images will be auto-resized)
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
              Card Image {!selectedTrainee && <span className="trainees-image-label-required">*</span>}
            </label>
            
            {resizingImage === 'card_image' ? (
              <div className="trainees-image-resizing">
                <div className="trainees-image-resizing-spinner"></div>
                <p className="trainees-image-resizing-text">Resizing image...</p>
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
                          <span className="trainees-image-change-text">Change</span>
                        </div>
                      </label>
                      <button
                        type="button"
                        onClick={() => handleRemoveImage('card_image')}
                        className="trainees-image-remove-button"
                        disabled={saving}
                      >
                        <X size={18} />
                        <span className="trainees-image-remove-text">Remove</span>
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
                      Upload Card Image
                    </p>
                    <p className="trainees-image-upload-text-hint">
                      Click to browse or drag and drop
                    </p>
                    <p className="trainees-image-upload-text-small">
                      JPEG, JPG, PNG, PDF (Max 10MB - Images will be auto-resized)
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
              Enrolled Classes
            </label>
            {trainingClasses.length === 0 ? (
              <p className="trainees-classes-empty">No training classes available</p>
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
                        {trainingClass.course?.name || trainingClass.name || `Class ${trainingClass.id}`}
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
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="trainees-button-submit"
            >
              {saving ? 'Saving...' : selectedTrainee ? 'Update Trainee' : 'Add Trainee'}
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
        title="Trainee Details"
        size="lg"
      >
        {selectedTrainee && (
          <div className="trainees-detail-container">
            <div className="trainees-detail-grid">
              <div className="trainees-detail-item">
                <p className="trainees-detail-label">First Name</p>
                <p className="trainees-detail-value">{selectedTrainee.first_name || 'N/A'}</p>
              </div>
              <div className="trainees-detail-item">
                <p className="trainees-detail-label">Last Name</p>
                <p className="trainees-detail-value">{selectedTrainee.last_name || 'N/A'}</p>
              </div>
              <div className="trainees-detail-item">
                <p className="trainees-detail-label">
                  <Mail size={16} className="trainees-detail-label-icon" />
                  Email
                </p>
                <p className="trainees-detail-value">{selectedTrainee.email || 'N/A'}</p>
              </div>
              <div className="trainees-detail-item">
                <p className="trainees-detail-label">
                  <Phone size={16} className="trainees-detail-label-icon" />
                  Phone
                </p>
                <p className="trainees-detail-value">{selectedTrainee.phone || 'N/A'}</p>
              </div>
              {selectedTrainee.id_number && (
                <div className="trainees-detail-item">
                  <p className="trainees-detail-label">ID Number</p>
                  <p className="trainees-detail-value">{selectedTrainee.id_number}</p>
                </div>
              )}
              <div className="trainees-detail-item">
                <p className="trainees-detail-label">Status</p>
                <span className={`trainees-detail-status ${
                  selectedTrainee.status === 'active' ? 'trainees-detail-status-active' :
                  selectedTrainee.status === 'inactive' ? 'trainees-detail-status-inactive' :
                  'trainees-detail-status-suspended'
                }`}>
                  {selectedTrainee.status}
                </span>
              </div>
            </div>

            {/* ID and Card Images */}
            <div className="trainees-detail-images-grid">
              {selectedTrainee.id_image_url && (
                <div className="trainees-detail-image-box">
                  <p className="trainees-detail-image-label">ID Image</p>
                  <a href={selectedTrainee.id_image_url} target="_blank" rel="noopener noreferrer" className="trainees-detail-image-link">
                    <img src={selectedTrainee.id_image_url} alt="ID" className="trainees-detail-image" loading="lazy" decoding="async" />
                  </a>
                </div>
              )}
              {selectedTrainee.card_image_url && (
                <div className="trainees-detail-image-box">
                  <p className="trainees-detail-image-label">Card Image</p>
                  <a href={selectedTrainee.card_image_url} target="_blank" rel="noopener noreferrer" className="trainees-detail-image-link">
                    <img src={selectedTrainee.card_image_url} alt="Card" className="trainees-detail-image" loading="lazy" decoding="async" />
                  </a>
                </div>
              )}
            </div>

            {/* Training Classes */}
            {selectedTrainee.training_classes && selectedTrainee.training_classes.length > 0 && (
              <div>
                <h3 className="trainees-classes-title">Enrolled Classes</h3>
                <div className="trainees-classes-list">
                  {selectedTrainee.training_classes.map((tc, index) => (
                    <div key={index} className="trainees-class-detail-item">
                      <div className="trainees-class-detail-header">
                        <div>
                          <p className="trainees-class-detail-name">
                            {tc.course?.name || tc.name || `Class ${tc.id}`}
                          </p>
                          {tc.start_date && tc.end_date && (
                            <p className="trainees-class-detail-date">
                              <Calendar size={12} />
                              {new Date(tc.start_date).toLocaleDateString()} - {new Date(tc.end_date).toLocaleDateString()}
                            </p>
                          )}
                          {tc.instructor && (
                            <p className="trainees-class-detail-instructor">
                              Instructor: {tc.instructor.first_name} {tc.instructor.last_name}
                            </p>
                          )}
                        </div>
                        {tc.pivot?.status && (
                          <span className={`trainees-class-detail-status ${
                            tc.pivot.status === 'enrolled' ? 'trainees-class-detail-status-enrolled' :
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
              </div>
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
        title="Delete Trainee"
        message={`Are you sure you want to delete "${selectedTrainee?.first_name} ${selectedTrainee?.last_name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
};

export default TraineesScreen;

