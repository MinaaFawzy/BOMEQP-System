import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from '../../../hooks/useTranslation';
import { accAPI } from '../../../services/api';
import { useHeader } from '../../../context/HeaderContext';
import { Users, Eye, Mail, Building2, Award, BookOpen, Search, CheckCircle } from 'lucide-react';
import Modal from '../../../components/Modal/Modal';
import DataTable from '../../../components/DataTable/DataTable';
import DetailForm from '../../../components/DetailForm/DetailForm';
import Pagination from '../../../components/Pagination/Pagination';
import './AuthorizedInstructorsScreen.css';

const AuthorizedInstructorsScreen = () => {
    const { t } = useTranslation('accreditation');
    const { setHeaderTitle, setHeaderSubtitle } = useHeader();

    // Data State
    const [instructors, setInstructors] = useState([]);
    const [pagination, setPagination] = useState({
        current_page: 1,
        last_page: 1,
        total: 0,
        per_page: 15,
    });

    // UI State
    const [loading, setLoading] = useState(true);
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [selectedInstructor, setSelectedInstructor] = useState(null);

    // Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
            setPagination(prev => ({ ...prev, current_page: 1 }));
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Load data when dependencies change
    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pagination.current_page, pagination.per_page, debouncedSearch]);

    useEffect(() => {
        setHeaderTitle(t('authorized_instructors_screen.header.title'));
        setHeaderSubtitle(t('authorized_instructors_screen.header.subtitle'));
        return () => {
            setHeaderTitle(null);
            setHeaderSubtitle(null);
        };
    }, [setHeaderTitle, setHeaderSubtitle]);

    const loadData = async () => {
        setLoading(true);
        try {
            const params = {
                page: pagination.current_page,
                per_page: pagination.per_page,
            };

            if (debouncedSearch) {
                params.search = debouncedSearch;
            }

            const response = await accAPI.listAuthorizedInstructors(params);

            const instructorsList = response?.instructors || response?.data || [];
            setInstructors(Array.isArray(instructorsList) ? instructorsList : []);

            // Update pagination
            if (response?.pagination) {
                setPagination(prev => ({
                    ...prev,
                    current_page: response.pagination.current_page || 1,
                    last_page: response.pagination.last_page || 1,
                    total: response.pagination.total || 0,
                }));
            }
        } catch (error) {
            console.error('Failed to load instructors:', error);
            setInstructors([]);
        } finally {
            setLoading(false);
        }
    };

    const handlePageChange = (newPage) => {
        setPagination(prev => ({ ...prev, current_page: newPage }));
    };

    const handlePerPageChange = (newPerPage) => {
        setPagination(prev => ({
            ...prev,
            per_page: parseInt(newPerPage),
            current_page: 1
        }));
    };

    const handleViewDetails = (instructor) => {
        setSelectedInstructor(instructor);
        setDetailModalOpen(true);
    };

    // Define columns for DataTable
    const columns = useMemo(() => [
        {
            header: t('authorized_instructors_screen.table.instructor'),
            accessor: 'first_name',
            sortable: true,
            render: (value, row) => {
                const fullName = `${row.first_name || ''} ${row.last_name || ''}`.trim();
                const photoUrl = row.photo_url;
                return (
                    <div className="flex items-center">
                        <div className="w-10 h-10 mr-3 relative">
                            {photoUrl ? (
                                <>
                                    <img
                                        src={photoUrl}
                                        alt={fullName || 'Instructor Photo'}
                                        className="w-10 h-10 rounded-lg object-cover border border-gray-200"
                                        width="40"
                                        height="40"
                                        loading="lazy"
                                        decoding="async"
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                            const fallback = e.target.parentElement?.querySelector('.photo-fallback');
                                            if (fallback) fallback.style.display = 'flex';
                                        }}
                                    />
                                    <div
                                        className="photo-fallback w-10 h-10 bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg items-center justify-center hidden"
                                        style={{ display: 'none', position: 'absolute', top: 0, left: 0 }}
                                    >
                                        <Users className="h-5 w-5 text-primary-600" />
                                    </div>
                                </>
                            ) : (
                                <div className="w-10 h-10 bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg flex items-center justify-center">
                                    <Users className="h-5 w-5 text-primary-600" />
                                </div>
                            )}
                        </div>
                        <div>
                            <div className="text-sm font-semibold text-gray-900">{fullName || t('authorized_instructors_screen.common.na')}</div>
                        </div>
                    </div>
                );
            }
        },
        {
            header: t('authorized_instructors_screen.table.email'),
            accessor: 'email',
            sortable: true,
            render: (value) => (
                <div className="flex items-center text-sm text-gray-600">
                    <Mail className="h-4 w-4 mr-2 text-gray-400" />
                    {value || t('authorized_instructors_screen.common.na')}
                </div>
            )
        },
        {
            header: t('authorized_instructors_screen.table.training_center'),
            accessor: 'training_center',
            sortable: true,
            render: (value) => (
                <div className="flex items-center text-sm text-gray-600">
                    <Building2 className="h-4 w-4 mr-2 text-gray-400" />
                    {value?.name || value?.legal_name || t('authorized_instructors_screen.common.na')}
                </div>
            )
        },
        {
            header: t('authorized_instructors_screen.table.commission'),
            accessor: 'authorization',
            sortable: true,
            render: (value) => (
                <span className="text-sm font-medium text-gray-900">
                    {value?.commission_percentage ? `${value.commission_percentage}%` : t('authorized_instructors_screen.common.na')}
                </span>
            )
        },
        {
            header: t('authorized_instructors_screen.table.payment_status'),
            accessor: 'authorization',
            sortable: true,
            render: (value) => {
                const status = value?.payment_status || 'pending';
                const statusConfig = {
                    paid: {
                        badgeClass: 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300',
                        icon: CheckCircle
                    },
                    pending: {
                        badgeClass: 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 border border-yellow-300',
                        icon: CheckCircle
                    }
                };
                const config = statusConfig[status] || statusConfig.pending;
                const Icon = config.icon;
                return (
                    <span className={`px-3 py-1.5 inline-flex items-center text-xs leading-5 font-bold rounded-full shadow-sm ${config.badgeClass}`}>
                        <Icon size={12} className="mr-1" />
                        {t(`authorized_instructors_screen.status.${status}`)}
                    </span>
                );
            }
        },
        {
            header: t('authorized_instructors_screen.table.actions'),
            accessor: 'actions',
            sortable: false,
            render: (value, row) => (
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                        onClick={() => handleViewDetails(row)}
                        className="p-2 rounded-lg bg-primary-50 text-primary-600 hover:bg-primary-100 hover:scale-110 transition-all duration-200 shadow-sm hover:shadow-md"
                        title={t('authorized_instructors_screen.actions.view_details')}
                    >
                        <Eye size={16} />
                    </button>
                </div>
            )
        }
    ], []);

    return (
        <div>
            {/* Search Input */}
            <div className="mb-4">
                <div className="relative">
                    <input
                        type="text"
                        placeholder={t('authorized_instructors_screen.search.placeholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                    />
                    <div className="absolute left-3 top-2.5 text-gray-400">
                        <Search size={20} />
                    </div>
                </div>
            </div>

            {/* DataTable */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                <DataTable
                    columns={columns}
                    data={instructors}
                    isLoading={loading}
                    searchable={false}
                    sortable={true}
                    filterable={false}
                    emptyMessage={t('authorized_instructors_screen.table.empty')}
                    onRowClick={(instructor) => handleViewDetails(instructor)}
                />

                {/* Pagination */}
                {pagination.total > 0 && (
                    <div className="border-t border-gray-100">
                        <Pagination
                            currentPage={pagination.current_page}
                            totalPages={pagination.last_page}
                            onPageChange={handlePageChange}
                            totalItems={pagination.total}
                            perPage={pagination.per_page}
                            onPerPageChange={handlePerPageChange}
                        />
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            <Modal
                isOpen={detailModalOpen}
                onClose={() => {
                    setDetailModalOpen(false);
                    setSelectedInstructor(null);
                }}
                title={t('authorized_instructors_screen.details.modal_title')}
                size="lg"
            >
                {selectedInstructor && (
                    <div className="space-y-6">
                        {/* Instructor Photo */}
                        <div className="flex justify-center mb-6">
                            {selectedInstructor.photo_url ? (
                                <img
                                    src={selectedInstructor.photo_url}
                                    alt="Instructor"
                                    className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
                                />
                            ) : (
                                <div className="w-32 h-32 rounded-full bg-gray-100 flex items-center justify-center border-4 border-white shadow-lg">
                                    <Users size={64} className="text-gray-400" />
                                </div>
                            )}
                        </div>

                        {/* Instructor Information */}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                <Users className="mr-2" size={20} />
                                {t('authorized_instructors_screen.details.instructor_info')}
                            </h3>
                            <DetailForm
                                data={selectedInstructor}
                                fields={[
                                    { key: 'first_name', label: t('authorized_instructors_screen.details.first_name') },
                                    { key: 'last_name', label: t('authorized_instructors_screen.details.last_name') },
                                    { key: 'email', label: t('authorized_instructors_screen.details.email'), type: 'email', icon: Mail },
                                    { key: 'phone', label: t('authorized_instructors_screen.details.phone') },
                                ]}
                            />
                        </div>

                        {/* Training Center */}
                        {selectedInstructor.training_center && (
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                    <Building2 className="mr-2" size={20} />
                                    {t('authorized_instructors_screen.details.training_center_info')}
                                </h3>
                                <DetailForm
                                    data={selectedInstructor.training_center}
                                    fields={[
                                        { key: 'name', label: t('authorized_instructors_screen.details.name'), icon: Building2 },
                                        { key: 'email', label: t('authorized_instructors_screen.details.email'), type: 'email', icon: Mail },
                                    ]}
                                />
                            </div>
                        )}

                        {/* Authorization Details */}
                        {selectedInstructor.authorization && (
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                    <Award className="mr-2" size={20} />
                                    {t('authorized_instructors_screen.details.authorization_details')}
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
                                        <p className="text-sm text-green-600 font-medium mb-1">{t('authorized_instructors_screen.cards.commission_percentage')}</p>
                                        <p className="text-2xl font-bold text-gray-900">
                                            {selectedInstructor.authorization.commission_percentage}%
                                        </p>
                                    </div>
                                    <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                                        <p className="text-sm text-blue-600 font-medium mb-1">{t('authorized_instructors_screen.cards.authorization_price')}</p>
                                        <p className="text-2xl font-bold text-gray-900">
                                            ${parseFloat(selectedInstructor.authorization.authorization_price || 0).toFixed(2)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Authorized Courses */}
                        {selectedInstructor.authorized_courses && Array.isArray(selectedInstructor.authorized_courses) && selectedInstructor.authorized_courses.length > 0 && (
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                    <BookOpen className="mr-2" size={20} />
                                    {t('authorized_instructors_screen.details.authorized_courses')} ({selectedInstructor.authorized_courses.length})
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {selectedInstructor.authorized_courses.map((course, index) => (
                                        <div key={course.id || index} className="p-4 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg border border-indigo-200 hover:shadow-md transition-shadow">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="px-2 py-0.5 bg-indigo-600 text-white text-xs font-bold rounded">{course.code}</span>
                                                    </div>
                                                    <p className="font-semibold text-gray-900 text-base">{course.name}</p>
                                                    {course.name_ar && (
                                                        <p className="text-sm text-gray-600 mt-1">{course.name_ar}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default AuthorizedInstructorsScreen;
