import { useEffect, useState, useMemo } from 'react';
import { adminAPI } from '../../../services/api';
import { useHeader } from '../../../context/HeaderContext';
import { ArrowRightLeft, DollarSign, CheckCircle, XCircle, Clock, Search, Filter, Eye, RotateCcw, Calendar } from 'lucide-react';
import Modal from '../../../components/Modal/Modal';
import DataTable from '../../../components/DataTable/DataTable';
import TabCard from '../../../components/TabCard/TabCard';
import Pagination from '../../../components/Pagination/Pagination';
import './TransfersScreen.css';

const TransfersScreen = () => {
    const { setHeaderTitle, setHeaderSubtitle } = useHeader();
    const [transfers, setTransfers] = useState([]);
    const [statistics, setStatistics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    // Pagination State
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(15);
    const [totalItems, setTotalItems] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [userTypeFilter, setUserTypeFilter] = useState('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    // Modal states
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [selectedTransfer, setSelectedTransfer] = useState(null);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setPage(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        setHeaderTitle('Automatic Transfers');
        setHeaderSubtitle('Manage automatic money transfers');
        return () => {
            setHeaderTitle(null);
            setHeaderSubtitle(null);
        };
    }, [setHeaderTitle, setHeaderSubtitle]);

    useEffect(() => {
        loadTransfers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, perPage, debouncedSearch, statusFilter, userTypeFilter, dateFrom, dateTo]);

    const loadTransfers = async () => {
        setLoading(true);
        try {
            const params = {
                page,
                per_page: perPage
            };

            if (debouncedSearch) params.search = debouncedSearch;
            if (statusFilter !== 'all') params.status = statusFilter;
            if (userTypeFilter !== 'all') params.user_type = userTypeFilter;
            if (dateFrom) params.date_from = dateFrom;
            if (dateTo) params.date_to = dateTo;

            const response = await adminAPI.getAllTransfers(params);
            const data = response?.data || [];
            const stats = response?.statistics || null;

            setTransfers(Array.isArray(data) ? data : []);
            setStatistics(stats);
            setTotalItems(response?.pagination?.total || 0);
            setTotalPages(response?.pagination?.last_page || 1);
        } catch (error) {
            console.error('Failed to load transfers:', error);
            setTransfers([]);
            setStatistics(null);
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetails = async (transfer) => {
        try {
            const response = await adminAPI.getTransferDetails(transfer.id);
            setSelectedTransfer(response?.transfer || null);
            setDetailModalOpen(true);
        } catch (error) {
            console.error('Failed to load transfer details:', error);
            alert('Failed to load transfer details');
        }
    };

    const handleRetry = async (transfer) => {
        if (!confirm(`Retry transfer for ${transfer.user_name}?`)) return;

        setActionLoading(true);
        try {
            await adminAPI.retryFailedTransfer(transfer.id);
            alert('Transfer retry initiated successfully');
            loadTransfers();
        } catch (error) {
            console.error('Failed to retry transfer:', error);
            alert(error?.response?.data?.message || 'Failed to retry transfer');
        } finally {
            setActionLoading(false);
        }
    };

    const formatCurrency = (amount, currency = 'USD') => {
        return `${parseFloat(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getStatusBadge = (status) => {
        const statusMap = {
            completed: { label: 'Completed', class: 'status-completed' },
            pending: { label: 'Pending', class: 'status-pending' },
            processing: { label: 'Processing', class: 'status-processing' },
            failed: { label: 'Failed', class: 'status-failed' },
            retrying: { label: 'Retrying', class: 'status-retrying' }
        };
        const statusInfo = statusMap[status] || { label: status, class: 'status-pending' };
        return <span className={`status-badge ${statusInfo.class}`}>{statusInfo.label}</span>;
    };

    const columns = useMemo(() => [
        {
            header: 'User',
            accessor: 'user_name',
            sortable: true,
            render: (value, row) => (
                <div className="user-column">
                    <div className="user-name">{value || 'N/A'}</div>
                    <div className="user-type">{row.user_type?.replace('_', ' ')}</div>
                </div>
            ),
        },
        {
            header: 'Gross Amount',
            accessor: 'gross_amount',
            sortable: true,
            render: (value) => (
                <span className="amount-value">{formatCurrency(value)}</span>
            ),
        },
        {
            header: 'Commission',
            accessor: 'commission_amount',
            sortable: true,
            render: (value) => (
                <span className="commission-value">{formatCurrency(value)}</span>
            ),
        },
        {
            header: 'Net Amount',
            accessor: 'net_amount',
            sortable: true,
            render: (value) => (
                <span className="net-amount-value">{formatCurrency(value)}</span>
            ),
        },
        {
            header: 'Status',
            accessor: 'status',
            sortable: true,
            render: (value) => getStatusBadge(value),
        },
        {
            header: 'Date',
            accessor: 'created_at',
            sortable: true,
            render: (value) => (
                <div className="date-column">
                    <Calendar className="date-icon" size={16} />
                    {formatDate(value)}
                </div>
            ),
        },
        {
            header: 'Actions',
            accessor: 'actions',
            render: (_, row) => (
                <div className="action-buttons">
                    <button
                        className="action-btn view"
                        onClick={() => handleViewDetails(row)}
                        title="View Details"
                    >
                        <Eye size={16} />
                    </button>
                    {row.status === 'failed' && (
                        <button
                            className="action-btn retry"
                            onClick={() => handleRetry(row)}
                            title="Retry Transfer"
                            disabled={actionLoading}
                        >
                            <RotateCcw size={16} />
                        </button>
                    )}
                </div>
            ),
        },
    ], [actionLoading]);

    return (
        <div className="transfers-container">
            {/* Statistics Cards */}
            {statistics && (
                <div className="summary-cards-grid">
                    <TabCard
                        name="Total Transfers"
                        value={statistics.total || 0}
                        icon={ArrowRightLeft}
                        colorType="indigo"
                    />
                    <TabCard
                        name="Completed"
                        value={statistics.completed || 0}
                        icon={CheckCircle}
                        colorType="green"
                    />
                    <TabCard
                        name="Pending"
                        value={statistics.pending || 0}
                        icon={Clock}
                        colorType="yellow"
                    />
                    <TabCard
                        name="Failed"
                        value={statistics.failed || 0}
                        icon={XCircle}
                        colorType="red"
                    />
                    <TabCard
                        name="Total Gross"
                        value={formatCurrency(statistics.total_gross_amount || 0)}
                        icon={DollarSign}
                        colorType="blue"
                    />
                    <TabCard
                        name="Total Commission"
                        value={formatCurrency(statistics.total_commission_amount || 0)}
                        icon={DollarSign}
                        colorType="purple"
                    />
                    <TabCard
                        name="Total Net"
                        value={formatCurrency(statistics.total_net_amount || 0)}
                        icon={DollarSign}
                        colorType="green"
                    />
                </div>
            )}

            {/* Search and Filters */}
            <div className="search-filters-section">
                <div className="search-filters-container">
                    <div className="search-input-container">
                        <Search className="search-icon" size={20} />
                        <input
                            type="text"
                            placeholder="Search by Stripe transfer ID or account ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="search-input"
                        />
                    </div>

                    <div className="filter-container">
                        <Filter className="filter-icon" size={20} />
                        <select
                            value={userTypeFilter}
                            onChange={(e) => {
                                setUserTypeFilter(e.target.value);
                                setPage(1);
                            }}
                            className="filter-select"
                        >
                            <option value="all">All User Types</option>
                            <option value="acc">ACC</option>
                            <option value="training_center">Training Provider</option>
                            <option value="instructor">Instructor</option>
                        </select>
                    </div>

                    <div className="filter-container">
                        <Filter className="filter-icon" size={20} />
                        <select
                            value={statusFilter}
                            onChange={(e) => {
                                setStatusFilter(e.target.value);
                                setPage(1);
                            }}
                            className="filter-select"
                        >
                            <option value="all">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="processing">Processing</option>
                            <option value="completed">Completed</option>
                            <option value="failed">Failed</option>
                            <option value="retrying">Retrying</option>
                        </select>
                    </div>

                    <div className="date-filter-container">
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => {
                                setDateFrom(e.target.value);
                                setPage(1);
                            }}
                            className="date-input"
                            placeholder="From"
                        />
                        <span className="date-separator">to</span>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => {
                                setDateTo(e.target.value);
                                setPage(1);
                            }}
                            className="date-input"
                            placeholder="To"
                        />
                    </div>
                </div>
            </div>

            {/* Transfers Table */}
            <div className="datatable-container">
                <DataTable
                    columns={columns}
                    data={transfers}
                    onView={handleViewDetails}
                    isLoading={loading}
                    emptyMessage="No transfers found"
                    searchable={false}
                    filterable={false}
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

            {/* Detail Modal */}
            <Modal
                isOpen={detailModalOpen}
                onClose={() => {
                    setDetailModalOpen(false);
                    setSelectedTransfer(null);
                }}
                title="Transfer Details"
                size="lg"
            >
                {selectedTransfer && (
                    <div className="transfer-details">
                        <div className="detail-section">
                            <h3>Transfer Information</h3>
                            <div className="detail-grid">
                                <div className="detail-item">
                                    <span className="detail-label">Transaction ID:</span>
                                    <span className="detail-value">{selectedTransfer.transaction_id}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">User:</span>
                                    <span className="detail-value">{selectedTransfer.user_name || 'N/A'}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">User Type:</span>
                                    <span className="detail-value">{selectedTransfer.user_type?.replace('_', ' ')}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Status:</span>
                                    {getStatusBadge(selectedTransfer.status)}
                                </div>
                            </div>
                        </div>

                        <div className="detail-section">
                            <h3>Amount Breakdown</h3>
                            <div className="detail-grid">
                                <div className="detail-item">
                                    <span className="detail-label">Gross Amount:</span>
                                    <span className="detail-value amount">{formatCurrency(selectedTransfer.gross_amount)}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Commission (15%):</span>
                                    <span className="detail-value commission">{formatCurrency(selectedTransfer.commission_amount)}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Net Amount:</span>
                                    <span className="detail-value net">{formatCurrency(selectedTransfer.net_amount)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="detail-section">
                            <h3>Stripe Information</h3>
                            <div className="detail-grid">
                                <div className="detail-item full-width">
                                    <span className="detail-label">Stripe Transfer ID:</span>
                                    <span className="detail-value mono">{selectedTransfer.stripe_transfer_id || 'N/A'}</span>
                                </div>
                                <div className="detail-item full-width">
                                    <span className="detail-label">Stripe Account ID:</span>
                                    <span className="detail-value mono">{selectedTransfer.stripe_account_id || 'N/A'}</span>
                                </div>
                            </div>
                        </div>

                        {selectedTransfer.error_message && (
                            <div className="detail-section error-section">
                                <h3>Error Information</h3>
                                <div className="error-message">{selectedTransfer.error_message}</div>
                                <div className="retry-info">
                                    <span className="detail-label">Retry Count:</span>
                                    <span className="detail-value">{selectedTransfer.retry_count || 0}</span>
                                </div>
                            </div>
                        )}

                        <div className="detail-section">
                            <h3>Timestamps</h3>
                            <div className="detail-grid">
                                <div className="detail-item">
                                    <span className="detail-label">Created At:</span>
                                    <span className="detail-value">{formatDateTime(selectedTransfer.created_at)}</span>
                                </div>
                                {selectedTransfer.processed_at && (
                                    <div className="detail-item">
                                        <span className="detail-label">Processed At:</span>
                                        <span className="detail-value">{formatDateTime(selectedTransfer.processed_at)}</span>
                                    </div>
                                )}
                                {selectedTransfer.completed_at && (
                                    <div className="detail-item">
                                        <span className="detail-label">Completed At:</span>
                                        <span className="detail-value">{formatDateTime(selectedTransfer.completed_at)}</span>
                                    </div>
                                )}
                                {selectedTransfer.failed_at && (
                                    <div className="detail-item">
                                        <span className="detail-label">Failed At:</span>
                                        <span className="detail-value">{formatDateTime(selectedTransfer.failed_at)}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default TransfersScreen;
