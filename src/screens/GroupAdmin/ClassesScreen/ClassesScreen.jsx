import { useEffect, useState, useMemo } from 'react';
import { adminAPI } from '../../../services/api';
import { useHeader } from '../../../context/HeaderContext';
import { BookOpen, Users, Calendar, CheckCircle, Clock, XCircle, Search, Filter } from 'lucide-react';
import DataTable from '../../../components/DataTable/DataTable';
import Pagination from '../../../components/Pagination/Pagination';
import TabCard from '../../../components/TabCard/TabCard';
import './ClassesScreen.css';

const ClassesScreen = () => {
    const { setHeaderTitle, setHeaderSubtitle } = useHeader();
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);

    // Pagination State
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    // Filter State (Client-side for now, or hybrid)
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    useEffect(() => {
        setHeaderTitle('Classes Management');
        setHeaderSubtitle('View and manage all training classes');
        return () => {
            setHeaderTitle(null);
            setHeaderSubtitle(null);
        };
    }, [setHeaderTitle, setHeaderSubtitle]);

    useEffect(() => {
        loadClasses(page, perPage);
    }, [page, perPage]);

    const loadClasses = async (pageArg = 1, limitArg = 10) => {
        setLoading(true);
        try {
            const response = await adminAPI.listClasses({
                page: pageArg,
                per_page: limitArg
            });

            const data = response?.classes || response?.data || [];
            setClasses(Array.isArray(data) ? data : []);

            // Handle Pagination Info
            if (response) {
                const total = response.total || (response.meta?.total) || data.length;
                setTotalItems(total);
                const lastPage = response.last_page || (response.meta?.last_page) || Math.ceil(total / limitArg) || 1;
                setTotalPages(lastPage);
            }
        } catch (error) {
            console.error('Failed to load classes:', error);
            setClasses([]);
        } finally {
            setLoading(false);
        }
    };

    // Process data for display (add search text, apply local filters if needed)
    const processedClasses = useMemo(() => {
        let result = classes.map(cls => {
            // Add _searchText for easy searching
            const searchStr = [
                cls.name,
                cls.course?.name,
                cls.course?.code,
                cls.status,
                cls.id
            ].filter(Boolean).join(' ').toLowerCase();

            return { ...cls, _searchText: searchStr };
        });

        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            result = result.filter(cls => cls._searchText.includes(lowerTerm));
        }

        if (statusFilter !== 'all') {
            result = result.filter(cls => cls.status === statusFilter);
        }

        return result;
    }, [classes, searchTerm, statusFilter]);

    // Calculate Stats
    const stats = useMemo(() => {
        // Note: If server-side pagination is strictly enforced without returning total counts for all statuses,
        // these specific status counts will only reflect the current page. 
        // Usually, admin dashboards need a separate "stats" endpoint or the list endpoint returns these counts.
        // Assuming for now we just show current page or total items for simple stats.
        return {
            total: totalItems,
            active: classes.filter(c => c.status === 'active').length, // This is only for current page if not provided by API
        };
    }, [classes, totalItems]);


    const columns = useMemo(() => [
        {
            header: 'Class ID',
            accessor: 'id',
            sortable: true,
            render: (value) => <span className="text-gray-500">#{value}</span>
        },
        {
            header: 'Class Name',
            accessor: 'name',
            sortable: true,
            render: (value, row) => (
                <div className="font-medium text-gray-900">{value}</div>
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

    return (
        <div className="admin-classes-screen">
            <div className="stats-grid">
                <TabCard
                    name="Total Classes"
                    value={stats.total}
                    icon={BookOpen}
                    colorType="indigo"
                />
                {/* Add more stats if available from API */}
            </div>

            <div className="table-container">
                <DataTable
                    columns={columns}
                    data={processedClasses}
                    isLoading={loading}
                    searchable={true}
                    searchPlaceholder="Search classes..."
                    onSearch={setSearchTerm}
                    filterable={true}
                    filterOptions={filterOptions}
                    defaultFilter={statusFilter}
                    onFilterChange={setStatusFilter}
                    emptyMessage="No classes found."
                />

                <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    totalItems={totalItems}
                    perPage={perPage}
                    onPageChange={setPage}
                    onPerPageChange={(newPerPage) => {
                        setPerPage(newPerPage);
                        setPage(1);
                    }}
                />
            </div>
        </div>
    );
};

export default ClassesScreen;
