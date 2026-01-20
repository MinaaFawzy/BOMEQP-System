import { useEffect, useState, useMemo } from 'react';
import { adminAPI } from '../../../services/api';
import { useHeader } from '../../../context/HeaderContext';
import { Link2, Users, CheckCircle, XCircle, Clock, Search, Filter, Eye, Play, RotateCcw, Unlink } from 'lucide-react';
import Modal from '../../../components/Modal/Modal';
import DataTable from '../../../components/DataTable/DataTable';
import TabCard from '../../../components/TabCard/TabCard';
import Pagination from '../../../components/Pagination/Pagination';
import CustomButton from '../../../components/CustomButton/CustomButton';
import './StripeConnectScreen.css';

const StripeConnectScreen = () => {
    const { setHeaderTitle, setHeaderSubtitle } = useHeader();
    const [accounts, setAccounts] = useState([]);
    const [stats, setStats] = useState(null);
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
    const [typeFilter, setTypeFilter] = useState('all');

    // Modal states
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState(null);
    const [initiateModalOpen, setInitiateModalOpen] = useState(false);

    // For initiate modal - load all accounts for dropdown
    const [allAccountsForDropdown, setAllAccountsForDropdown] = useState([]);
    const [loadingAllAccounts, setLoadingAllAccounts] = useState(false);
    const [selectedAccountForInitiate, setSelectedAccountForInitiate] = useState(null);
    const [initiateCountry, setInitiateCountry] = useState('EG');

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setPage(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        setHeaderTitle('Stripe Connect Management');
        setHeaderSubtitle('Manage Stripe Connect accounts for all users');
        return () => {
            setHeaderTitle(null);
            setHeaderSubtitle(null);
        };
    }, [setHeaderTitle, setHeaderSubtitle]);

    useEffect(() => {
        loadAccounts();
        loadStats();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, perPage, debouncedSearch, statusFilter, typeFilter]);

    const loadAccounts = async () => {
        setLoading(true);
        try {
            const params = {
                page,
                per_page: perPage
            };

            if (debouncedSearch) params.search = debouncedSearch;
            if (statusFilter !== 'all') params.status = statusFilter;
            if (typeFilter !== 'all') params.type = typeFilter;

            const response = await adminAPI.getAllStripeConnectAccounts(params);
            const data = response?.data || response || {};

            setAccounts(data.accounts || []);
            setTotalItems(data.total || 0);
            setTotalPages(data.last_page || 1);
        } catch (error) {
            console.error('Failed to load accounts:', error);
            setAccounts([]);
        } finally {
            setLoading(false);
        }
    };

    const loadStats = async () => {
        try {
            const response = await adminAPI.getStripeConnectStats();
            setStats(response?.data || null);
        } catch (error) {
            console.error('Failed to load stats:', error);
        }
    };

    // Load all accounts for the dropdown when opening initiate modal
    const loadAllAccountsForDropdown = async () => {
        setLoadingAllAccounts(true);
        try {
            // Load all accounts without pagination
            const response = await adminAPI.getAllStripeConnectAccounts({ per_page: 1000 });
            const data = response?.data || response || {};
            setAllAccountsForDropdown(data.accounts || []);
        } catch (error) {
            console.error('Failed to load all accounts:', error);
            setAllAccountsForDropdown([]);
        } finally {
            setLoadingAllAccounts(false);
        }
    };

    const handleViewDetails = async (account) => {
        try {
            const response = await adminAPI.getStripeConnectAccountDetails(account.type, account.id);
            const accountData = response?.data || {};
            setSelectedAccount({
                ...accountData,
                account: {
                    ...accountData.account,
                    type: account.type,
                    id: account.id
                }
            });
            setDetailModalOpen(true);
        } catch (error) {
            console.error('Failed to load account details:', error);
            alert('Failed to load account details');
        }
    };

    const handleOpenInitiateModal = () => {
        setInitiateModalOpen(true);
        loadAllAccountsForDropdown();
    };

    const handleInitiateConnect = async () => {
        if (!selectedAccountForInitiate) {
            alert('Please select an account');
            return;
        }

        setActionLoading(true);
        try {
            await adminAPI.initiateStripeConnect({
                account_type: selectedAccountForInitiate.type,
                account_id: selectedAccountForInitiate.id,
                country: initiateCountry
            });
            alert('Stripe Connect initiated successfully');
            setInitiateModalOpen(false);
            setSelectedAccountForInitiate(null);
            setInitiateCountry('EG');
            loadAccounts();
            loadStats();
        } catch (error) {
            console.error('Failed to initiate Stripe Connect:', error);
            alert(error?.response?.data?.message || 'Failed to initiate Stripe Connect');
        } finally {
            setActionLoading(false);
        }
    };

    const handleRetry = async (account) => {
        if (!confirm(`Retry Stripe Connect for ${account.name}?`)) return;

        setActionLoading(true);
        try {
            await adminAPI.retryStripeConnect(account.type, account.id);
            alert('Retry initiated successfully');
            loadAccounts();
        } catch (error) {
            console.error('Failed to retry:', error);
            alert(error?.response?.data?.message || 'Failed to retry');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDisconnect = async (account) => {
        if (!confirm(`Disconnect Stripe Connect for ${account.name}? This action cannot be undone.`)) return;

        setActionLoading(true);
        try {
            await adminAPI.disconnectStripeConnect(account.type, account.id);
            alert('Disconnected successfully');
            loadAccounts();
            loadStats();
        } catch (error) {
            console.error('Failed to disconnect:', error);
            alert(error?.response?.data?.message || 'Failed to disconnect');
        } finally {
            setActionLoading(false);
        }
    };

    // Updated to use account from details modal directly
    const handleResendLink = async () => {
        if (!selectedAccount?.account) {
            alert('No account selected');
            return;
        }

        setActionLoading(true);
        try {
            const payload = { account_type: selectedAccount.account.type, account_id: parseInt(selectedAccount.account.id) }; console.log('Resend link payload:', payload); await adminAPI.resendStripeOnboardingLink(payload);
            alert('Onboarding link sent successfully');
        } catch (error) {
            console.error('Failed to resend link:', error);
            alert(error?.response?.data?.message || 'Failed to resend link');
        } finally {
            setActionLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        const statusMap = {
            connected: { label: 'Connected', class: 'status-connected' },
            pending: { label: 'Pending', class: 'status-pending' },
            failed: { label: 'Failed', class: 'status-failed' },
            inactive: { label: 'Inactive', class: 'status-inactive' },
            updating: { label: 'Updating', class: 'status-updating' }
        };
        const statusInfo = statusMap[status] || { label: status, class: 'status-inactive' };
        return <span className={`status-badge ${statusInfo.class}`}>{statusInfo.label}</span>;
    };

    const columns = useMemo(() => [
        {
            header: 'Name',
            accessor: 'name',
            sortable: true,
        },
        {
            header: 'Email',
            accessor: 'email',
            sortable: true,
        },
        {
            header: 'Type',
            accessor: 'type',
            sortable: true,
            render: (value) => (
                <span className="type-badge">{value?.replace('_', ' ').toUpperCase()}</span>
            ),
        },
        {
            header: 'Stripe Status',
            accessor: 'stripe_connect_status',
            sortable: true,
            render: (value) => getStatusBadge(value),
        },
        {
            header: 'Connected At',
            accessor: 'stripe_connected_at',
            sortable: true,
            render: (value) => value ? new Date(value).toLocaleDateString() : 'N/A',
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
                    {row.stripe_connect_status === 'failed' && (
                        <button
                            className="action-btn retry"
                            onClick={() => handleRetry(row)}
                            title="Retry"
                            disabled={actionLoading}
                        >
                            <RotateCcw size={16} />
                        </button>
                    )}
                    {row.stripe_connect_status === 'connected' && (
                        <button
                            className="action-btn disconnect"
                            onClick={() => handleDisconnect(row)}
                            title="Disconnect"
                            disabled={actionLoading}
                        >
                            <Unlink size={16} />
                        </button>
                    )}
                </div>
            ),
        },
    ], [actionLoading]);

    return (
        <div className="stripe-connect-container">
            {/* Statistics Cards */}
            {stats && (
                <div className="summary-cards-grid">
                    <TabCard
                        name="Total Accounts"
                        value={stats.total || 0}
                        icon={Users}
                        colorType="indigo"
                    />
                    <TabCard
                        name="Connected"
                        value={stats.connected || 0}
                        icon={CheckCircle}
                        colorType="green"
                    />
                    <TabCard
                        name="Pending"
                        value={stats.pending || 0}
                        icon={Clock}
                        colorType="yellow"
                    />
                    <TabCard
                        name="Failed"
                        value={stats.failed || 0}
                        icon={XCircle}
                        colorType="red"
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
                            placeholder="Search by name or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="search-input"
                        />
                    </div>

                    <div className="filter-container">
                        <Filter className="filter-icon" size={20} />
                        <select
                            value={typeFilter}
                            onChange={(e) => {
                                setTypeFilter(e.target.value);
                                setPage(1);
                            }}
                            className="filter-select"
                        >
                            <option value="all">All Types</option>
                            <option value="acc">ACC</option>
                            <option value="training_center">Training Center</option>
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
                            <option value="connected">Connected</option>
                            <option value="pending">Pending</option>
                            <option value="failed">Failed</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>

                    <CustomButton
                        onClick={handleOpenInitiateModal}
                        icon={Play}
                        variant="primary"
                    >
                        Initiate Connect
                    </CustomButton>
                </div>
            </div>

            {/* Accounts Table */}
            <div className="datatable-container">
                <DataTable
                    columns={columns}
                    data={accounts}
                    onView={handleViewDetails}
                    isLoading={loading}
                    emptyMessage="No accounts found"
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

            <Modal
                isOpen={initiateModalOpen}
                onClose={() => {
                    setInitiateModalOpen(false);
                    setSelectedAccountForInitiate(null);
                }}
                title="Initiate Stripe Connect"
                size="md"
            >
                <div className="initiate-form">
                    <div className="form-group">
                        <label>Select Account</label>
                        {loadingAllAccounts ? (
                            <p>Loading accounts...</p>
                        ) : (
                            <select
                                value={selectedAccountForInitiate ? `${selectedAccountForInitiate.type}-${selectedAccountForInitiate.id}` : ''}
                                onChange={(e) => {
                                    if (!e.target.value) {
                                        setSelectedAccountForInitiate(null);
                                        return;
                                    }
                                    const [type, id] = e.target.value.split('-');
                                    const account = allAccountsForDropdown.find(
                                        acc => acc.type === type && acc.id === parseInt(id)
                                    );
                                    setSelectedAccountForInitiate(account || null);
                                }}
                                className="form-control"
                            >
                                <option value="">-- Select an account --</option>
                                {allAccountsForDropdown.map((account) => (
                                    <option key={`${account.type}-${account.id}`} value={`${account.type}-${account.id}`}>
                                        {account.name} ({account.email}) - {account.type.replace('_', ' ').toUpperCase()}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>
                    <div className="form-group">
                        <label>Country</label>
                        <input
                            type="text"
                            value={initiateCountry}
                            onChange={(e) => setInitiateCountry(e.target.value)}
                            className="form-control"
                            placeholder="Country code (e.g., EG)"
                        />
                    </div>
                    <div className="modal-actions">
                        <CustomButton
                            onClick={handleInitiateConnect}
                            loading={actionLoading}
                            variant="primary"
                        >
                            Initiate
                        </CustomButton>
                        <CustomButton
                            onClick={() => {
                                setInitiateModalOpen(false);
                                setSelectedAccountForInitiate(null);
                            }}
                            variant="secondary"
                        >
                            Cancel
                        </CustomButton>
                    </div>
                </div>
            </Modal>

            {/* Detail Modal */}
            <Modal
                isOpen={detailModalOpen}
                onClose={() => {
                    setDetailModalOpen(false);
                    setSelectedAccount(null);
                }}
                title="Account Details"
                size="lg"
            >
                {selectedAccount && (
                    <div className="account-details">
                        <div className="detail-section">
                            <h3>Account Information</h3>
                            <div className="detail-grid">
                                <div className="detail-item">
                                    <span className="detail-label">Name:</span>
                                    <span className="detail-value">{selectedAccount.account?.name}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Email:</span>
                                    <span className="detail-value">{selectedAccount.account?.email}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Type:</span>
                                    <span className="detail-value">{selectedAccount.account?.type}</span>
                                </div>
                            </div>
                        </div>

                        {selectedAccount.stripe_status && (
                            <div className="detail-section">
                                <h3>Stripe Status</h3>
                                <div className="detail-grid">
                                    <div className="detail-item">
                                        <span className="detail-label">Status:</span>
                                        {getStatusBadge(selectedAccount.stripe_status.status)}
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">Stripe Account ID:</span>
                                        <span className="detail-value">{selectedAccount.stripe_status.stripe_account_id || 'N/A'}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">Connected At:</span>
                                        <span className="detail-value">
                                            {selectedAccount.stripe_status.connected_at
                                                ? new Date(selectedAccount.stripe_status.connected_at).toLocaleString()
                                                : 'N/A'}
                                        </span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">Onboarding Completed:</span>
                                        <span className="detail-value">
                                            {selectedAccount.stripe_status.onboarding_completed ? 'Yes' : 'No'}
                                        </span>
                                    </div>
                                </div>

                                {selectedAccount.stripe_status.onboarding_url && (
                                    <div className="detail-item full-width">
                                        <span className="detail-label">Onboarding URL:</span>
                                        <a
                                            href={selectedAccount.stripe_status.onboarding_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="onboarding-link"
                                        >
                                            Open Onboarding Link
                                        </a>
                                    </div>
                                )}

                                {selectedAccount.stripe_status.bank_info && (
                                    <div className="detail-item full-width">
                                        <span className="detail-label">Bank:</span>
                                        <span className="detail-value">
                                            {selectedAccount.stripe_status.bank_info.bank_name} - {selectedAccount.stripe_status.bank_info.account_number}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="modal-actions">
                            {selectedAccount.stripe_status?.status === 'pending' && (
                                <CustomButton
                                    onClick={handleResendLink}
                                    loading={actionLoading}
                                    variant="primary"
                                >
                                    Resend Onboarding Link
                                </CustomButton>
                            )}
                            <CustomButton
                                onClick={() => setDetailModalOpen(false)}
                                variant="secondary"
                            >
                                Close
                            </CustomButton>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default StripeConnectScreen;


