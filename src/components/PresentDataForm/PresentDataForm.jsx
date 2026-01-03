import { Building2, Clock, Layers, DollarSign, Mail, Phone, FileText, CheckCircle, XCircle, AlertCircle, Users, Globe, Award, BookOpen, Calendar, MapPin, Tag } from 'lucide-react';
import './PresentDataForm.css';

const PresentDataForm = ({ data, isLoading, emptyMessage = 'No data available' }) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-8 text-gray-500">
        {emptyMessage}
      </div>
    );
  }

  // Helper function to render a field
  const renderField = (label, value, icon = null, className = '') => {
    if (!value && value !== 0 && value !== false) return null;
    
    return (
      <div className={`p-4 bg-gray-50 rounded-lg ${className}`}>
        <p className="text-sm text-gray-500 mb-1 flex items-center">
          {icon && <span className="mr-2">{icon}</span>}
          {label}
        </p>
        <p className="text-base font-semibold text-gray-900">{value}</p>
      </div>
    );
  };

  // Helper function to render status badge
  const renderStatusBadge = (status) => {
    const statusConfig = {
      active: { 
        badgeClass: 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300',
        icon: CheckCircle 
      },
      approved: { 
        badgeClass: 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300',
        icon: CheckCircle 
      },
      pending: { 
        badgeClass: 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 border border-yellow-300',
        icon: Clock 
      },
      rejected: { 
        badgeClass: 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 border border-red-300',
        icon: XCircle 
      },
      inactive: { 
        badgeClass: 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300',
        icon: Clock 
      },
      suspended: { 
        badgeClass: 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 border border-red-300',
        icon: XCircle 
      },
      archived: { 
        badgeClass: 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300',
        icon: Clock 
      }
    };
    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;
    return (
      <span className={`px-3 py-1.5 inline-flex items-center text-xs leading-5 font-bold rounded-full shadow-sm ${config.badgeClass}`}>
        <Icon size={12} className="mr-1" />
        {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'N/A'}
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Basic Information - Generic Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Name fields */}
        {data.name && (
          <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-700 font-medium mb-1">Name</p>
            <p className="text-lg font-semibold text-gray-900">{data.name}</p>
          </div>
        )}
        {data.name_ar && (
          <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-700 font-medium mb-1">Name (Arabic)</p>
            <p className="text-lg font-semibold text-gray-900">{data.name_ar}</p>
          </div>
        )}
        {data.legal_name && renderField('Legal Name', data.legal_name)}
        {data.first_name && renderField('First Name', data.first_name)}
        {data.last_name && renderField('Last Name', data.last_name)}
        {data.full_name && renderField('Full Name', data.full_name)}
        
        {/* Contact fields */}
        {data.email && renderField('Email', data.email, <Mail size={16} />)}
        {data.phone && renderField('Phone', data.phone, <Phone size={16} />)}
        {data.country && renderField('Country', data.country, <MapPin size={16} />)}
        {data.city && renderField('City', data.city, <MapPin size={16} />)}
        {data.address && renderField('Address', data.address, <MapPin size={16} />, 'md:col-span-2')}
        
        {/* Identification fields */}
        {data.registration_number && renderField('Registration Number', data.registration_number)}
        {data.id_number && renderField('ID Number', data.id_number)}
        {data.code && renderField(data.code.includes('Course') ? 'Course Code' : 'Code', data.code)}
        
        {/* Course-specific fields */}
        {data.level && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500 mb-1">Level</p>
            <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 capitalize">
              {data.level}
            </span>
          </div>
        )}
        {data.duration_hours && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500 mb-1 flex items-center">
              <Clock size={16} className="mr-2" />
              Duration
            </p>
            <p className="text-base font-semibold text-gray-900">
              {data.duration_hours} hours
            </p>
          </div>
        )}
        
        {/* Status field */}
        {data.status && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500 mb-1">Status</p>
            {renderStatusBadge(data.status)}
          </div>
        )}
        
        {/* Financial fields */}
        {data.commission_percentage !== undefined && data.commission_percentage !== null && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500 mb-1">Commission Percentage</p>
            <p className="text-base font-semibold text-gray-900">
              {data.commission_percentage ? `${data.commission_percentage}%` : 'Not Set'}
            </p>
          </div>
        )}
        {data.authorization_price && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500 mb-1 flex items-center">
              <DollarSign size={16} className="mr-2" />
              Authorization Price
            </p>
            <p className="text-base font-semibold text-gray-900">
              ${parseFloat(data.authorization_price || 0).toFixed(2)}
            </p>
          </div>
        )}
        
        {/* Stripe Account */}
        {data.stripe_account_configured !== undefined && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500 mb-1">Stripe Account</p>
            <div className="flex items-center gap-2">
              {data.stripe_account_configured ? (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  <CheckCircle size={12} className="mr-1" />
                  Configured
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  <AlertCircle size={12} className="mr-1" />
                  Not Configured
                </span>
              )}
              {data.stripe_account_id && (
                <span className="text-xs text-gray-500 font-mono">{data.stripe_account_id}</span>
              )}
            </div>
          </div>
        )}
        
        {/* Website */}
        {data.website && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500 mb-1">Website</p>
            <a href={data.website} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">
              {data.website}
            </a>
          </div>
        )}
        
        {/* Date fields */}
        {data.created_at && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500 mb-1">Created At</p>
            <p className="text-base font-semibold text-gray-900">
              {new Date(data.created_at).toLocaleDateString()}
            </p>
          </div>
        )}
        {data.request_date && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500 mb-1 flex items-center">
              <Calendar size={16} className="mr-2" />
              Request Date
            </p>
            <p className="text-base font-semibold text-gray-900">
              {new Date(data.request_date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
        )}
      </div>

      {/* Description */}
      {data.description && (
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-500 mb-2 font-medium">Description</p>
          <p className="text-base text-gray-900 whitespace-pre-wrap">{data.description}</p>
        </div>
      )}

      {/* ACC Information */}
      {data.acc && (
        <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
          <div className="flex items-center mb-3">
            <Building2 className="h-5 w-5 text-purple-600 mr-2" />
            <p className="text-sm font-semibold text-purple-900">Accreditation Body (ACC)</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.acc.name && (
              <div>
                <p className="text-xs text-purple-700 mb-1">Name</p>
                <p className="text-sm font-medium text-gray-900">{data.acc.name}</p>
              </div>
            )}
            {data.acc.legal_name && (
              <div>
                <p className="text-xs text-purple-700 mb-1">Legal Name</p>
                <p className="text-sm font-medium text-gray-900">{data.acc.legal_name}</p>
              </div>
            )}
            {data.acc.email && (
              <div>
                <p className="text-xs text-purple-700 mb-1">Email</p>
                <p className="text-sm font-medium text-gray-900">{data.acc.email}</p>
              </div>
            )}
            {data.acc.phone && (
              <div>
                <p className="text-xs text-purple-700 mb-1">Phone</p>
                <p className="text-sm font-medium text-gray-900">{data.acc.phone}</p>
              </div>
            )}
            {data.acc.status && (
              <div>
                <p className="text-xs text-purple-700 mb-1">Status</p>
                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                  data.acc.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {data.acc.status}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Training Center Information */}
      {data.training_center && (
        <div className="p-4 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg border border-indigo-200">
          <div className="flex items-center mb-3">
            <Building2 className="h-5 w-5 text-indigo-600 mr-2" />
            <p className="text-sm font-semibold text-indigo-900">Training Center</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {typeof data.training_center === 'string' ? (
              <p className="text-sm font-medium text-gray-900">{data.training_center}</p>
            ) : (
              <>
                {data.training_center.name && (
                  <div>
                    <p className="text-xs text-indigo-700 mb-1">Name</p>
                    <p className="text-sm font-medium text-gray-900">{data.training_center.name}</p>
                  </div>
                )}
                {data.training_center.email && (
                  <div>
                    <p className="text-xs text-indigo-700 mb-1">Email</p>
                    <p className="text-sm font-medium text-gray-900">{data.training_center.email}</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Instructor Information */}
      {data.instructor && (
        <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
          <div className="flex items-center mb-3">
            <Users className="h-5 w-5 text-blue-600 mr-2" />
            <p className="text-sm font-semibold text-blue-900">Instructor</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.instructor.first_name && (
              <div>
                <p className="text-xs text-blue-700 mb-1">First Name</p>
                <p className="text-sm font-medium text-gray-900">{data.instructor.first_name}</p>
              </div>
            )}
            {data.instructor.last_name && (
              <div>
                <p className="text-xs text-blue-700 mb-1">Last Name</p>
                <p className="text-sm font-medium text-gray-900">{data.instructor.last_name}</p>
              </div>
            )}
            {data.instructor.email && (
              <div>
                <p className="text-xs text-blue-700 mb-1">Email</p>
                <p className="text-sm font-medium text-gray-900">{data.instructor.email}</p>
              </div>
            )}
            {data.instructor.phone && (
              <div>
                <p className="text-xs text-blue-700 mb-1">Phone</p>
                <p className="text-sm font-medium text-gray-900">{data.instructor.phone}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sub Category Information */}
      {data.sub_category && (
        <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
          <div className="flex items-center mb-3">
            <Layers className="h-5 w-5 text-green-600 mr-2" />
            <p className="text-sm font-semibold text-green-900">Sub Category</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.sub_category.name && (
              <div>
                <p className="text-xs text-green-700 mb-1">Sub Category Name</p>
                <p className="text-sm font-medium text-gray-900">{data.sub_category.name}</p>
                {data.sub_category.name_ar && (
                  <p className="text-xs text-gray-600 mt-1">{data.sub_category.name_ar}</p>
                )}
              </div>
            )}
            {data.sub_category.category && (
              <div>
                <p className="text-xs text-green-700 mb-1">Parent Category</p>
                <p className="text-sm font-medium text-gray-900">{data.sub_category.category.name || 'N/A'}</p>
                {data.sub_category.category.name_ar && (
                  <p className="text-xs text-gray-600 mt-1">{data.sub_category.category.name_ar}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Certificate Pricing */}
      {data.certificate_pricing && Array.isArray(data.certificate_pricing) && data.certificate_pricing.length > 0 && (
        <div className="p-4 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg border border-yellow-200">
          <div className="flex items-center mb-3">
            <DollarSign className="h-5 w-5 text-yellow-600 mr-2" />
            <p className="text-sm font-semibold text-yellow-900">Certificate Pricing</p>
          </div>
          <div className="space-y-3">
            {data.certificate_pricing.map((pricing, index) => (
              <div key={index} className="bg-white rounded-lg p-3 border border-yellow-200">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {pricing.base_price !== undefined && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Base Price</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {parseFloat(pricing.base_price || 0).toFixed(2)} {pricing.currency || 'USD'}
                      </p>
                    </div>
                  )}
                  {pricing.group_commission_percentage !== undefined && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Group Commission</p>
                      <p className="text-sm font-medium text-gray-700">{pricing.group_commission_percentage || '0'}%</p>
                    </div>
                  )}
                  {pricing.training_center_commission_percentage !== undefined && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Training Center Commission</p>
                      <p className="text-sm font-medium text-gray-700">{pricing.training_center_commission_percentage || '0'}%</p>
                    </div>
                  )}
                  {pricing.instructor_commission_percentage !== undefined && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Instructor Commission</p>
                      <p className="text-sm font-medium text-gray-700">{pricing.instructor_commission_percentage || '0'}%</p>
                    </div>
                  )}
                  {pricing.effective_from && (
                    <div className="col-span-2">
                      <p className="text-xs text-gray-500 mb-1">Effective From</p>
                      <p className="text-sm text-gray-700">
                        {new Date(pricing.effective_from).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  {pricing.effective_to && (
                    <div className="col-span-2">
                      <p className="text-xs text-gray-500 mb-1">Effective To</p>
                      <p className="text-sm text-gray-700">
                        {new Date(pricing.effective_to).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Documents */}
      {(data.documents || data.documents_json) && Array.isArray(data.documents || data.documents_json) && (data.documents || data.documents_json).length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
            <FileText className="mr-2" size={20} />
            Documents
          </h3>
          <div className="space-y-2">
            {(data.documents || data.documents_json).map((doc, index) => (
              <div key={index} className="p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{doc.document_type || doc.type || `Document ${index + 1}`}</p>
                  {doc.verified !== undefined && (
                    <p className="text-sm text-gray-500">{doc.verified ? 'Verified' : 'Not Verified'}</p>
                  )}
                  {doc.description && (
                    <p className="text-sm text-gray-500">{doc.description}</p>
                  )}
                </div>
                {(doc.document_url || doc.url) && (
                  <a
                    href={(doc.document_url || doc.url).startsWith('http') 
                      ? (doc.document_url || doc.url)
                      : `${import.meta.env.VITE_API_BASE_URL || 'https://aeroenix.com/v1/api'}${doc.document_url || doc.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                  >
                    View Document
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subscriptions */}
      {data.subscriptions && Array.isArray(data.subscriptions) && data.subscriptions.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Subscriptions</h3>
          <div className="space-y-2">
            {data.subscriptions.map((sub, index) => (
              <div key={index} className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-900">
                  {sub.subscription_start_date} - {sub.subscription_end_date}
                </p>
                {sub.payment_status && (
                  <p className="text-sm text-gray-500">Status: {sub.payment_status}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Categories */}
      {data.categories && Array.isArray(data.categories) && data.categories.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
            <Tag className="mr-2" size={20} />
            Assigned Categories
          </h3>
          <div className="space-y-2">
            {data.categories.map((category, index) => {
              const categoryId = typeof category === 'object' ? category.id : category;
              const categoryName = typeof category === 'object' ? category.name : `Category ${categoryId}`;
              return (
                <div key={categoryId || index} className="p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                  <span className="font-medium text-gray-900">{categoryName}</span>
                  {typeof category === 'object' && category.status && (
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      category.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {category.status}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Languages */}
      {data.languages && Array.isArray(data.languages) && data.languages.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
            <Globe className="mr-2" size={20} />
            Languages
          </h3>
          <div className="flex flex-wrap gap-2">
            {data.languages.map((lang, index) => (
              <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                {lang}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Specializations */}
      {data.specializations && Array.isArray(data.specializations) && data.specializations.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
            <Globe className="mr-2" size={20} />
            Specializations
          </h3>
          <div className="flex flex-wrap gap-2">
            {data.specializations.map((spec, index) => (
              <span key={index} className="px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-sm">
                {spec}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Certificates */}
      {data.certificates_json && Array.isArray(data.certificates_json) && data.certificates_json.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
            <Award className="mr-2" size={20} />
            Certificates
          </h3>
          <div className="space-y-2">
            {data.certificates_json.map((cert, index) => (
              <div key={index} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="font-medium text-gray-900">{cert.name || cert.certificate_name || `Certificate ${index + 1}`}</p>
                {cert.issued_by && (
                  <p className="text-sm text-gray-500">Issued by: {cert.issued_by}</p>
                )}
                {cert.year && (
                  <p className="text-sm text-gray-500">Year: {cert.year}</p>
                )}
                {cert.url && (
                  <a
                    href={cert.url.startsWith('http') ? cert.url : `${import.meta.env.VITE_API_BASE_URL || 'https://aeroenix.com/v1/api'}${cert.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 hover:text-primary-700 text-sm font-medium mt-2 inline-block"
                  >
                    View Certificate
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CV / Resume */}
      {data.cv_url && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
            <FileText className="mr-2" size={20} />
            CV / Resume
          </h3>
          <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                  <FileText className="text-white" size={24} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Curriculum Vitae</p>
                  <p className="text-xs text-gray-600">Click to view the CV</p>
                </div>
              </div>
              <a
                href={data.cv_url.startsWith('http') 
                  ? data.cv_url
                  : `${import.meta.env.VITE_API_BASE_URL || 'https://aeroenix.com/v1/api'}${data.cv_url}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
              >
                <FileText size={18} className="mr-2" />
                View CV
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Classes */}
      {data.classes && Array.isArray(data.classes) && data.classes.length > 0 && (
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm font-semibold text-gray-900 mb-3">Classes ({data.classes.length})</p>
          <div className="space-y-2">
            {data.classes.map((classItem) => (
              <div key={classItem.id} className="bg-white rounded-lg p-3 border border-gray-200">
                <p className="text-sm font-medium text-gray-900">{classItem.name || `Class ${classItem.id}`}</p>
                {classItem.status && (
                  <span className={`inline-block mt-2 px-2 py-1 rounded-full text-xs font-medium ${
                    classItem.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {classItem.status}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Commission Information */}
      {data.commission_percentage !== null && data.commission_percentage !== undefined && data.authorization_price && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
            <DollarSign className="mr-2" size={20} />
            Commission Information
          </h3>
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <p className="text-sm text-gray-500 mb-1">Commission Percentage</p>
            <p className="text-2xl font-bold text-green-900">
              {parseFloat(data.commission_percentage).toFixed(2)}%
            </p>
            {data.authorization_price && (
              <div className="mt-3 space-y-1 text-sm">
                <p className="text-gray-700">
                  Group receives: <span className="font-semibold">${(parseFloat(data.authorization_price) * parseFloat(data.commission_percentage) / 100).toFixed(2)}</span>
                </p>
                <p className="text-gray-700">
                  ACC receives: <span className="font-semibold">${(parseFloat(data.authorization_price) * (100 - parseFloat(data.commission_percentage)) / 100).toFixed(2)}</span>
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Timestamps */}
      {(data.created_at || data.updated_at) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
          {data.created_at && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Created At</p>
              <p className="text-sm text-gray-700">
                {new Date(data.created_at).toLocaleString()}
              </p>
            </div>
          )}
          {data.updated_at && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Updated At</p>
              <p className="text-sm text-gray-700">
                {new Date(data.updated_at).toLocaleString()}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PresentDataForm;
