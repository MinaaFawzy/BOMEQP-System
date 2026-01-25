import { useEffect, useState, useMemo, useRef } from 'react';
import { adminAPI } from '../../../services/api';
import { useHeader } from '../../../context/HeaderContext';
import { BookOpen, Users, Calendar, CheckCircle, Clock, XCircle, Search, Filter, ClipboardList } from 'lucide-react';
import DataTable from '../../../components/DataTable/DataTable';
import Pagination from '../../../components/Pagination/Pagination';
import TabCard from '../../../components/TabCard/TabCard';
import TabCardsGrid from '../../../components/TabCardsGrid/TabCardsGrid';
import './ClassesScreen.css';

const ClassesScreen = () => {
    const { setHeaderTitle, setHeaderSubtitle } = useHeader();
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);

    // Pagination State
    const [pagination, setPagination] = useState({
        current_page: 1,
        last_page: 1,
        total: 0,
        per_page: 10,
        from: 0,
        to: 0
    });

    // Search & Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    // Stats State
    const [stats, setStats] = useState({
        total: 0,
        scheduled: 0,
        in_progress: 0,
        completed: 0,
        cancelled: 0
    });

    // Track if data has been loaded before
    const hasDataRef = useRef(false);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
            setPagination(prev => ({ ...prev, current_page: 1 }));
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    useEffect(() => {
        setHeaderTitle('Classes Management');
        setHeaderSubtitle('View and manage all training classes');
        return () => {
            setHeaderTitle(null);
            setHeaderSubtitle(null);
        };
    }, [setHeaderTitle, setHeaderSubtitle]);

    // Load data when dependencies change
    useEffect(() => {
        const showLoading = !hasDataRef.current;

        // Don't load if search is still being debounced
        if (searchQuery !== debouncedSearch) {
            return;
        }

        loadClasses(showLoading);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pagination.current_page, pagination.per_page, debouncedSearch, statusFilter]);

    const loadClasses = async (showLoading = true) => {
        if (showLoading) {
            setLoading(true);
        }
        try {
            // Build query parameters
            const params = {
                page: pagination.current_page,
                per_page: pagination.per_page,
            };

            // Add search if there's a value
            if (debouncedSearch) {
                params.search = debouncedSearch;
            }

            // Add status filter if not 'all'
            if (statusFilter !== 'all') {
                params.status = statusFilter;
            }

            const response = await adminAPI.listClasses(params);

            const data = response?.classes || response?.data || [];
            setClasses(Array.isArray(data) ? data : []);

            // Update pagination state
            if (response) {
                const totalItems = response.total || (response.statistics?.total) || data.length;
                const currentPerPage = pagination.per_page;
                const calculatedLastPage = response.last_page || Math.ceil(totalItems / currentPerPage) || 1;
                const calculatedFrom = response.from || (data.length > 0 ? ((pagination.current_page - 1) * currentPerPage) + 1 : 0);
                const calculatedTo = response.to || (data.length > 0 ? calculatedFrom + data.length - 1 : 0);

                setPagination(prev => ({
                    ...prev,
                    current_page: response.current_page || prev.current_page || 1,
                    last_page: calculatedLastPage,
                    total: totalItems,
                    from: calculatedFrom,
                    to: calculatedTo
                }));

                // Update stats if available
                if (response.statistics) {
                    setStats({
                        total: response.statistics.total || 0,
                        scheduled: response.statistics.scheduled || 0,
                        in_progress: response.statistics.in_progress || 0,
                        completed: response.statistics.completed || 0,
                        cancelled: response.statistics.cancelled || 0
                    });
                }
            }

            hasDataRef.current = true;
        } catch (error) {
            console.error('Failed to load classes:', error);
            setClasses([]);
        } finally {
            if (showLoading) {
                setLoading(false);
            }
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

    const columns = useMemo(() => [
        // {
        //     header: 'Class ID',
        //     accessor: 'id',
        //     sortable: true,
        //     render: (value) => <span className="text-gray-500">#{value}</span>
        // },
        {
            header: 'Class Name',
            accessor: 'name',
            sortable: true,
            render: (value, row) => (
                <div className="font-medium text-gray-900">{value} </div>
            )
        },
        {
            header: 'Course',
            accessor: 'course.name',
            sortable: true,
            render: (value, row) => (
                <div className="flex flex-col">
                    <span className="text-gray-900">{row.course?.name || 'N/A'}</span>
                    <span className="text-xs text-gray-500">{row.course?.code}</span>
                </div>
            )
        },
        {
            header: 'Trainees',
            accessor: 'trainees',
            sortable: true,
            render: (value) => (
                <div className="flex items-center text-gray-600">
                    <Users size={16} className="mr-2" />
                    {Array.isArray(value) ? value.length : 0}
                </div>
            )
        },
        {
            header: 'Created At',
            accessor: 'created_at',
            sortable: true,
            render: (value) => (
                <div className="flex items-center text-gray-600">
                    <Calendar size={16} className="mr-2" />
                    {value ? new Date(value).toLocaleDateString() : 'N/A'}
                </div>
            )
        },
        {
            header: 'Status',
            accessor: 'status',
            sortable: true,
            render: (value) => {
                const statusConfig = {
                    scheduled: { color: 'blue', icon: Clock },
                    in_progress: { color: 'yellow', icon: Clock },
                    completed: { color: 'green', icon: CheckCircle },
                    cancelled: { color: 'red', icon: XCircle }
                };
                const config = statusConfig[value] || { color: 'gray', icon: Clock }; // Fallback
                const Icon = config.icon;

                return (
                    <span className={`status-badge status-${config.color}`}>
                        <Icon size={14} className="mr-1" />
                        {value ? value.charAt(0).toUpperCase() + value.slice(1).replace('_', ' ') : 'N/A'}
                    </span>
                );
            }
        }
    ], []);

    const filterOptions = [
        { value: 'all', label: 'All Status', filterFn: () => true },
        { value: 'scheduled', label: 'Scheduled', filterFn: (row) => row.status === 'scheduled' },
        { value: 'in_progress', label: 'In Progress', filterFn: (row) => row.status === 'in_progress' },
        { value: 'completed', label: 'Completed', filterFn: (row) => row.status === 'completed' },
        { value: 'cancelled', label: 'Cancelled', filterFn: (row) => row.status === 'cancelled' }
    ];

    // Statistics for display - use API stats if available or fallback
    const displayTotal = stats.total || pagination.total;
    const displayScheduled = stats.scheduled;
    const displayInProgress = stats.in_progress;
    const displayCompleted = stats.completed;

    // Show loading spinner only on initial load
    if (loading && classes.length === 0) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <TabCardsGrid columns={{ mobile: 1, tablet: 2, desktop: 4 }}>
                <TabCard
                    name="Total Classes"
                    value={displayTotal}
                    icon={ClipboardList}
                    colorType="indigo"
                    isActive={statusFilter === 'all'}
                    onClick={() => setStatusFilter('all')}
                />
                <TabCard
                    name="Scheduled"
                    value={displayScheduled}
                    icon={Clock}
                    colorType="blue"
                    isActive={statusFilter === 'scheduled'}
                    onClick={() => setStatusFilter('scheduled')}
                />
                <TabCard
                    name="In Progress"
                    value={displayInProgress}
                    icon={Clock}
                    colorType="yellow"
                    isActive={statusFilter === 'in_progress'}
                    onClick={() => setStatusFilter('in_progress')}
                />
                <TabCard
                    name="Completed"
                    value={displayCompleted}
                    icon={CheckCircle}
                    colorType="green"
                    isActive={statusFilter === 'completed'}
                    onClick={() => setStatusFilter('completed')}
                />
            </TabCardsGrid>

            <div className="bg-white rounded-xl shadow-lg border border-gray-100">
                <DataTable
                    columns={columns}
                    data={classes}
                    isLoading={loading}
                    searchable={true}
                    searchPlaceholder="Search classes..."
                    searchValue={searchQuery}
                    onSearch={(value) => setSearchQuery(value)}
                    filterable={false}
                    emptyMessage={
                        classes.length === 0 && !loading ? (
                            <div className="flex flex-col items-center justify-center py-12">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                    <BookOpen className="h-8 w-8 text-gray-400" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                    {searchQuery || statusFilter !== 'all' ? 'No classes found' : 'No classes yet'}
                                </h3>
                                <p className="text-sm text-gray-500 text-center max-w-sm">
                                    {searchQuery || statusFilter !== 'all'
                                        ? 'Try adjusting your search or filters to find what you\'re looking for.'
                                        : 'Classes will appear here once they are created by training centers.'}
                                </p>
                            </div>
                        ) : 'No classes found.'
                    }
                />

                {classes.length > 0 && (
                    <div className="border-t border-gray-100">
                        <Pagination
                            currentPage={pagination.current_page}
                            totalPages={pagination.last_page}
                            totalItems={pagination.total}
                            perPage={pagination.per_page}
                            onPageChange={handlePageChange}
                            onPerPageChange={handlePerPageChange}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default ClassesScreen;
