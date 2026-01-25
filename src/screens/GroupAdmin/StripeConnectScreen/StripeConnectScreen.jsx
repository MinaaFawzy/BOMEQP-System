import { useEffect, useState, useMemo } from 'react';
import { adminAPI, publicAPI } from '../../../services/api';
import { useHeader } from '../../../context/HeaderContext';
import { Link2, Users, User, Mail, Calendar, CheckCircle, XCircle, Clock, Search, Filter, Eye, Play, RotateCcw, Unlink } from 'lucide-react';
import Modal from '../../../components/Modal/Modal';
import DataTable from '../../../components/DataTable/DataTable';
import TabCard from '../../../components/TabCard/TabCard';
import TabCardsGrid from '../../../components/TabCardsGrid/TabCardsGrid';
import Pagination from '../../../components/Pagination/Pagination';
import CustomButton from '../../../components/CustomButton/CustomButton';
import './StripeConnectScreen.css';

const StripeConnectScreen = () => {
    const { setHeaderTitle, setHeaderSubtitle, setHeaderActions } = useHeader();
    const [accounts, setAccounts] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    // Pagination State
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
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
    const [countries, setCountries] = useState([]);

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
        setHeaderActions(
            <button
                onClick={handleOpenInitiateModal}
                className="header-create-btn"
            >
                <Play size={20} className="header-create-btn-icon" />
                Initiate Connect
            </button>
        );
        return () => {
            setHeaderTitle(null);
            setHeaderSubtitle(null);
            setHeaderActions(null);
        };
    }, [setHeaderTitle, setHeaderSubtitle, setHeaderActions]);

    useEffect(() => {
        loadAccounts();
        loadStats();
        loadCountries();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, perPage, debouncedSearch, statusFilter, typeFilter]);

    const loadCountries = async () => {
        try {
            const data = await publicAPI.getCountries();
            setCountries(data?.countries || data || []);
        } catch (error) {
            console.error('Failed to load countries:', error);
        }
    };

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
        const statusConfig = {
            connected: {
                label: 'Connected',
                badgeClass: 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300',
                icon: CheckCircle
            },
            pending: {
                label: 'Pending',
                badgeClass: 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 border border-yellow-300',
                icon: Clock
            },
            failed: {
                label: 'Failed',
                badgeClass: 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 border border-red-300',
                icon: XCircle
            },
            inactive: {
                label: 'Inactive',
                badgeClass: 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300',
                icon: Clock
            },
            updating: {
                label: 'Updating',
                badgeClass: 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-300',
                icon: Clock
            }
        };

        const config = statusConfig[status] || statusConfig.inactive;
        const Icon = config.icon;

        return (
            <span className={`px-3 py-1.5 inline-flex items-center text-xs leading-5 font-bold rounded-full shadow-sm ${config.badgeClass}`}>
                <Icon size={12} className="mr-1" />
                {config.label}
            </span>
        );
    };

    const columns = useMemo(() => [
        {
            header: 'Account',
            accessor: 'name',
            sortable: true,
            render: (value, row) => (
                <div className="flex items-center">
                    <div className="w-10 h-10 mr-3 flex items-center justify-center bg-gray-100 rounded-lg">
                        <User className="h-5 w-5 text-gray-500" />
                    </div>
                    <div>
                        <div className="font-medium text-gray-900">{value}</div>
                        {row.type && (
                            <div className="text-xs text-gray-500 uppercase">{row.type.replace('_', ' ')}</div>
                        )}
                    </div>
                </div>
            )
        },
        {
            header: 'Email',
            accessor: 'email',
            sortable: true,
            render: (value) => (
                <div className="flex items-center text-sm text-gray-600">
                    <Mail className="h-4 w-4 mr-2 text-gray-400" />
                    {value || 'N/A'}
                </div>
            )
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
            render: (value) => (
                <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                    {value ? new Date(value).toLocaleDateString() : 'N/A'}
                </div>
            )
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
        <div className="space-y-4">
            {/* Statistics Cards */}
            {stats && (
                <TabCardsGrid columns={{ mobile: 1, tablet: 2, desktop: 4 }}>
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
                </TabCardsGrid>
            )}

            {/* DataTable */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                <DataTable
                    columns={columns}
                    data={accounts}
                    onView={handleViewDetails}
                    isLoading={loading}
                    emptyMessage="No accounts found"
                    searchable={true}
                    searchValue={searchTerm}
                    onSearch={setSearchTerm}
                    searchPlaceholder="Search by name or email..."
                    filterable={false}
                    customFilters={
                        <div className="flex gap-2">
                            <select
                                value={statusFilter}
                                onChange={(e) => {
                                    setStatusFilter(e.target.value);
                                    setPage(1);
                                }}
                                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                            >
                                <option value="all">All Status</option>
                                <option value="connected">Connected</option>
                                <option value="pending">Pending</option>
                                <option value="failed">Failed</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>
                    }
                />

                {accounts.length > 0 && (
                    <div className="border-t border-gray-100">
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
                )}
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
                                        {account.name}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>
                    <div className="form-group">
                        <label>Country</label>
                        <select
                            value={initiateCountry}
                            onChange={(e) => setInitiateCountry(e.target.value)}
                            className="form-control"
                        >
                            <option value="">-- Select a country --</option>
                            {Array.isArray(countries) ? (
                                countries.map((c) => (
                                    <option key={c.code || c.id} value={c.code || c.id}>
                                        {c.name}
                                    </option>
                                ))
                            ) : (
                                Object.entries(countries).map(([code, name]) => (
                                    <option key={code} value={code}>
                                        {name}
                                    </option>
                                ))
                            )}
                        </select>
                    </div>
                    <div className="modal-actions">
                        <button
                            onClick={handleInitiateConnect}
                            disabled={actionLoading}
                            className="custom-button custom-button-primary"
                        >
                            {actionLoading ? 'Initiating...' : 'Initiate'}
                        </button>
                        <button
                            onClick={() => {
                                setInitiateModalOpen(false);
                                setSelectedAccountForInitiate(null);
                            }}
                            className="custom-button custom-button-secondary"
                        >
                            Cancel
                        </button>
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
                                <button
                                    onClick={handleResendLink}
                                    disabled={actionLoading}
                                    className="custom-button custom-button-primary"
                                >
                                    {actionLoading ? 'Sending...' : 'Resend Onboarding Link'}
                                </button>
                            )}
                            <button
                                onClick={() => {
                                    setDetailModalOpen(false);
                                    setSelectedAccount(null);
                                }}
                                className="custom-button custom-button-secondary"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default StripeConnectScreen;


