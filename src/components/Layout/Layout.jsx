import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useHeader } from '../../context/HeaderContext';
import { accAPI, instructorAPI } from '../../services/api';
import NotificationBell from '../NotificationBell/NotificationBell';
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  GraduationCap, 
  FileText, 
  Settings, 
  LogOut,
  Menu,
  X,
  FileCheck,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  School,
  CreditCard,
  Award,
  Tag,
  BookOpen,
  Wallet,
  FolderTree,
  UserCheck,
  Sliders,
  Receipt,
  Clock,
  User,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import './Layout.css';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const { headerActions, headerTitle, headerSubtitle } = useHeader();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSubscribed, setIsSubscribed] = useState(null); // null = loading, true/false = loaded
  const [isAssessor, setIsAssessor] = useState(false); // Track is_assessor status for instructors
  
  // Load is_assessor from dashboard if user is instructor
  useEffect(() => {
    const loadInstructorAssessorStatus = async () => {
      if (user?.role === 'instructor') {
        try {
          const dashboardData = await instructorAPI.getDashboard();
          const assessorStatus = dashboardData?.profile?.is_assessor || dashboardData?.is_assessor || false;
          setIsAssessor(assessorStatus === true || assessorStatus === 'true' || assessorStatus === 1);
        } catch (error) {
          console.error('Failed to load instructor assessor status:', error);
          // Fallback to user.is_assessor if available
          setIsAssessor(user?.is_assessor === true || user?.is_assessor === 'true' || user?.is_assessor === 1);
        }
      } else {
        setIsAssessor(false);
      }
    };
    
    loadInstructorAssessorStatus();
  }, [user]);
  
  // Sidebar open by default, persist state in localStorage
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('sidebarOpen');
    return saved !== null ? JSON.parse(saved) : true;
  });
  
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved !== null ? JSON.parse(saved) : false;
  });

  // Track expanded menu groups
  const [expandedGroups, setExpandedGroups] = useState(() => {
    const saved = localStorage.getItem('expandedGroups');
    return saved ? JSON.parse(saved) : {};
  });

  // Save expanded groups state
  useEffect(() => {
    localStorage.setItem('expandedGroups', JSON.stringify(expandedGroups));
  }, [expandedGroups]);

  const toggleGroup = (groupKey) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey]
    }));
  };

  // Save sidebar state to localStorage
  useEffect(() => {
    localStorage.setItem('sidebarOpen', JSON.stringify(sidebarOpen));
  }, [sidebarOpen]);

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(sidebarCollapsed));
  }, [sidebarCollapsed]);

  // Check subscription status for ACC admins
  useEffect(() => {
    const checkSubscription = async () => {
      if (user?.role === 'acc_admin') {
        try {
          const data = await accAPI.getSubscription();
          // If subscription exists and has valid dates, consider them subscribed
          const subscription = data.subscription;
          if (subscription && subscription.subscription_end_date) {
            const endDate = new Date(subscription.subscription_end_date);
            const today = new Date();
            // Check if subscription is active (end date is in the future)
            setIsSubscribed(endDate > today);
          } else {
            setIsSubscribed(false);
          }
        } catch (error) {
          // If subscription doesn't exist or error, consider them unsubscribed
          console.error('Failed to load subscription:', error);
          setIsSubscribed(false);
        }
      } else {
        // Not an ACC admin, so subscription check not needed
        setIsSubscribed(true);
      }
    };

    if (user) {
      checkSubscription();
    }
  }, [user]);

  // Don't show layout for pending account screen
  if (location.pathname === '/pending-account') {
    return children;
  }

  // Redirect unsubscribed ACC admins to subscription page
  useEffect(() => {
    if (user?.role === 'acc_admin' && isSubscribed === false) {
      // Allow access to subscription page and profile
      const allowedPaths = ['/acc/subscription', '/profile'];
      if (!allowedPaths.some(path => location.pathname.startsWith(path))) {
        navigate('/acc/subscription');
      }
    }
  }, [user, isSubscribed, location.pathname, navigate]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Menu items based on user role with grouping
  const getMenuItems = () => {
    const baseItems = [
      { type: 'single', path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    ];

    switch (user?.role) {
      case 'group_admin':
        return [
          ...baseItems,
          {
            type: 'group',
            key: 'acc-management',
            icon: Building2,
            label: 'ACC Management',
            items: [
              { path: '/admin/accs', icon: FileCheck, label: 'ACC Applications' },
              { path: '/admin/training-center-applications', icon: FileCheck, label: 'TC Applications' },
              { path: '/admin/all-accs', icon: Building2, label: 'Accreditation Bodies' },
            ]
          },
          {
            type: 'group',
            key: 'training-management',
            icon: Users,
            label: 'Training & Instructors',
            items: [
              { path: '/admin/all-training-centers', icon: School, label: 'Training Centers' },
              { path: '/admin/all-instructors', icon: Users, label: 'Instructors' },
              { path: '/admin/instructor-authorizations', icon: UserCheck, label: 'Instructor Commissions' },
            ]
          },
          {
            type: 'group',
            key: 'courses-management',
            icon: GraduationCap,
            label: 'Courses & Categories',
            items: [
              { path: '/admin/all-courses', icon: GraduationCap, label: 'Courses' },
              { path: '/admin/categories', icon: FolderTree, label: 'Course Categories' },
            ]
          },
          {
            type: 'group',
            key: 'financial-settings',
            icon: CreditCard,
            label: 'Financial & Settings',
            items: [
              { path: '/admin/payment-transactions', icon: Receipt, label: 'Payment Transactions' },
              { path: '/admin/pending-payments', icon: Clock, label: 'Pending Payments' },
              { path: '/admin/stripe-settings', icon: Sliders, label: 'Stripe Settings' },
            ]
          },
        ];
      case 'acc_admin':
        // If not subscribed, only show Subscription tab
        if (isSubscribed === false) {
          return [
            { type: 'single', path: '/acc/subscription', icon: CreditCard, label: 'Subscription' },
          ];
        }
        // If subscribed or still loading, show all items
        return [
          ...baseItems,
          { type: 'single', path: '/acc/subscription', icon: CreditCard, label: 'Subscription' },
          {
            type: 'group',
            key: 'management',
            icon: Users,
            label: 'Management',
            items: [
              { path: '/acc/training-centers', icon: Building2, label: 'Training Centers' },
              { path: '/acc/instructors', icon: Users, label: 'Instructors' },
            ]
          },
          {
            type: 'group',
            key: 'courses-content',
            icon: GraduationCap,
            label: 'Courses & Content',
            items: [
              { path: '/acc/courses', icon: GraduationCap, label: 'Courses' },
              { path: '/acc/classes', icon: School, label: 'Classes' },
              { path: '/acc/certificates', icon: Award, label: 'Certificates' },
              { path: '/acc/discount-codes', icon: Tag, label: 'Discount Codes' },
              { path: '/acc/categories', icon: FolderTree, label: 'Course Categories' },
            ]
          },
          {
            type: 'group',
            key: 'financial',
            icon: CreditCard,
            label: 'Financial',
            items: [
              { path: '/acc/payment-transactions', icon: Receipt, label: 'Payment Transactions' },
              { path: '/acc/pending-payments', icon: Clock, label: 'Pending Payments' },
            ]
          },
        ];
      case 'training_center_admin':
        return [
          ...baseItems,
          { type: 'single', path: '/training-center/accs', icon: Building2, label: 'Accreditation Bodies' },
          {
            type: 'group',
            key: 'people-management',
            icon: Users,
            label: 'People Management',
            items: [
              { path: '/training-center/instructors', icon: Users, label: 'Instructors' },
              { path: '/training-center/trainees', icon: UserCheck, label: 'Trainees' },
              { path: '/training-center/instructor-authorizations', icon: UserCheck, label: 'Instructor Auth' },
            ]
          },
          {
            type: 'group',
            key: 'courses-classes',
            icon: GraduationCap,
            label: 'Courses & Classes',
            items: [
              { path: '/training-center/classes', icon: GraduationCap, label: 'Classes' },
              { path: '/training-center/certificates', icon: Award, label: 'Certificates' },
            ]
          },
          {
            type: 'group',
            key: 'financial',
            icon: Wallet,
            label: 'Financial',
            items: [
              { path: '/training-center/codes', icon: Tag, label: 'Codes' },
              // { path: '/training-center/wallet', icon: Wallet, label: 'Wallet' },
              { path: '/training-center/payment-transactions', icon: Receipt, label: 'Payment Transactions' },
            ]
          },
        ];
      case 'instructor':
        return [
          ...baseItems,
          { type: 'single', path: '/instructor/classes', icon: GraduationCap, label: 'Classes' },
          // {
          //   type: 'group',
          //   key: 'work',
          //   icon: GraduationCap,
          //   label: 'Work',
          //   items: [
          //     { path: '/instructor/classes', icon: GraduationCap, label: 'Classes' },
          //     // { path: '/instructor/materials', icon: BookOpen, label: 'Materials' },
          //     // { path: '/instructor/earnings', icon: Wallet, label: 'Earnings' },
          //   ]
          // },
        ];
      default:
        return baseItems;
    }
  };

  const menuItems = getMenuItems();

  // Get page title from current route or context
  const getPageTitle = () => {
    if (headerTitle) return headerTitle;
    
    const path = location.pathname;
    
    // Dashboard
    if (path === '/dashboard') return 'Dashboard';
    
    // Group Admin routes
    if (path === '/admin/accs') return 'ACC Applications';
    if (path === '/admin/training-center-applications') return 'TC Applications';
    if (path === '/admin/all-accs') return 'Accreditation Bodies';
    if (path === '/admin/all-training-centers') return 'Training Centers';
    if (path === '/admin/all-instructors') return 'Instructors';
    if (path === '/admin/all-courses') return 'Courses';
    if (path === '/admin/categories') return 'Course Categories';
    if (path === '/admin/instructor-authorizations') return 'Instructor Commissions';
    if (path === '/admin/payment-transactions') return 'Payment Transactions';
    if (path === '/admin/pending-payments') return 'Pending Payments';
    if (path === '/admin/stripe-settings') return 'Stripe Settings';
    
    // ACC Admin routes
    if (path === '/acc/dashboard') return 'Dashboard';
    if (path === '/acc/subscription') return 'Subscription Management';
    if (path === '/acc/training-centers') return 'Training Centers';
    if (path === '/acc/instructors') return 'Instructors';
    if (path === '/acc/courses') return 'Courses';
    if (path === '/acc/certificates') return 'Certificates';
    if (path === '/acc/materials') return 'Materials';
    if (path === '/acc/discount-codes') return 'Discount Codes';
    if (path === '/acc/categories') return 'Course Categories';
    if (path === '/acc/classes') return 'Classes';
    if (path === '/acc/payment-transactions') return 'Payment Transactions';
    if (path === '/acc/pending-payments') return 'Pending Payments';
    
    // Training Center routes
    if (path === '/training-center/dashboard') return 'Dashboard';
    if (path === '/training-center/accs') return 'Accreditation Bodies';
    if (path === '/training-center/instructors') return 'Instructors';
    if (path === '/training-center/trainees') return 'Trainees';
    if (path === '/training-center/classes') return 'Classes';
    if (path === '/training-center/codes') return 'Codes';
    if (path === '/training-center/certificates') return 'Certificates';
    if (path === '/training-center/instructor-authorizations') return 'Instructor Authorizations';
    if (path === '/training-center/payment-transactions') return 'Payment Transactions';
    if (path === '/training-center/wallet') return 'Payment Transactions';
    if (path === '/training-center/marketplace') return 'Marketplace';
    
    // Instructor routes
    if (path === '/instructor/dashboard') return 'Dashboard';
    if (path === '/instructor/classes') return 'Classes';
    if (path === '/instructor/materials') return 'Materials';
    if (path === '/instructor/earnings') return 'Earnings';
    
    // Profile
    if (path === '/profile') return 'Profile';
    
    // Default: extract from path
    const segments = path.split('/').filter(Boolean);
    if (segments.length > 0) {
      const lastSegment = segments[segments.length - 1];
      return lastSegment
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
    
    return 'Dashboard';
  };

  const getPageSubtitle = () => {
    if (headerSubtitle) return headerSubtitle;
    
    const path = location.pathname;
    if (path === '/dashboard' || path === '/acc/dashboard' || path === '/training-center/dashboard' || path === '/instructor/dashboard') {
      return "Welcome back! Here's your overview";
    }
    if (path === '/profile') return 'Manage your account settings and preferences';
    return 'Manage and view your information';
  };

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Mobile menu button */}
      <div 
        className="lg:hidden fixed top-0 left-0 right-0 z-50 backdrop-blur-sm shadow-lg px-4 py-3 flex items-center justify-between layout-gradient-primary"
      >
        <h1 className="text-xl font-bold text-white">BOMEQP</h1>
        <div className="flex items-center gap-3">
          {/* User Name with Profile */}
          <Link
            to="/profile"
            className="flex items-center gap-2 transition-all duration-200 hover:opacity-80"
          >
            <span className="text-white font-bold text-sm">
              {user?.name || 'User'}
            </span>
            <div
              className="p-1 transition-all duration-200"
              title="Profile Settings"
            >
              <User size={16} className="text-white" />
            </div>
          </Link>
          {/* Notification Icon */}
          <NotificationBell />
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg text-white/80 sidebar-hover transition-all duration-200 hover:scale-110"
          >
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`fixed lg:static inset-y-0 left-0 z-50 border-r shadow-xl lg:shadow-none transform transition-all duration-300 ease-out layout-gradient-sidebar ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          } ${
            sidebarCollapsed ? 'w-16' : 'w-64'
          }`}
          style={{ overflow: 'visible' }}
        >
          <div className="flex flex-col h-full max-h-screen overflow-visible">
            {/* Logo Section - Fixed at top */}
            <div 
              className={`flex-shrink-0 border-b animate-slide-down layout-section-bg ${
                sidebarCollapsed ? 'p-3' : 'p-4'
              }`}
            >
              <div className="flex items-center justify-between">
                {!sidebarCollapsed && (
                  <div className="flex-1">
                    <h1 className="text-xl font-bold text-white">
                      BOMEQP
                    </h1>
                    <p className="text-xs text-primary-200 mt-1 capitalize">
                      {user?.role === 'instructor' 
                        ? (isAssessor ? 'Assessor' : 'Instructor')
                        : (user?.role?.replace('_', ' ') || '')}
                    </p>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    className={`p-1.5 rounded-lg text-white/70 sidebar-hover transition-all duration-200 hover:scale-110 ${
                      sidebarCollapsed ? 'w-full flex justify-center' : ''
                    }`}
                    title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                  >
                    {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Navigation - Scrollable middle section */}
            <nav className={`flex-1 min-h-0 ${
              sidebarCollapsed ? 'p-2 overflow-visible' : 'p-4 overflow-y-auto custom-scrollbar'
            }`}
            style={sidebarCollapsed ? { overflowX: 'visible', overflowY: 'visible' } : { overflowX: 'visible' }}
            >
              <ul className="space-y-1.5" style={{ overflow: 'visible' }}>
                {menuItems.map((item, index) => {
                  if (item.type === 'single') {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    return (
                      <li key={`${item.path}-${index}`} className="stagger-item" style={{ '--animation-delay': `${index * 0.03}s`, overflow: 'visible' }}>
                        {sidebarCollapsed ? (
                          <div className="relative group sidebar-item-collapsed">
                            <Link
                              to={item.path}
                              onClick={() => {
                                setSidebarOpen(false);
                                setSidebarCollapsed(false);
                              }}
                              className={`flex items-center rounded-xl transition-all duration-200 ease-out relative px-2 py-2 justify-center w-full group-hover-trigger ${
                                isActive
                                  ? 'text-[var(--tertiary-color)]'
                                  : 'text-white/80 nav-item-hover hover:bg-white/10'
                              }`}
                            >
                              {Icon && (
                                <Icon 
                                  size={20} 
                                  className={`transition-all duration-200 flex-shrink-0 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} 
                                />
                              )}
                            </Link>
                            {/* Hover tooltip showing title */}
                            <div className="sidebar-tooltip">
                              {item.label}
                            </div>
                          </div>
                        ) : (
                          <Link
                            to={item.path}
                            onClick={() => setSidebarOpen(false)}
                            className={`flex items-center rounded-xl transition-all duration-200 ease-out relative group px-4 py-3 min-w-0 ${
                              isActive
                                ? 'text-[var(--tertiary-color)]'
                                : 'text-white/80 nav-item-hover hover:scale-105 hover:shadow-md'
                            }`}
                          >
                            {Icon && (
                              <Icon 
                                size={20} 
                                className={`transition-all duration-200 flex-shrink-0 mr-3 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} 
                              />
                            )}
                            <span className="font-medium text-sm whitespace-nowrap truncate flex-1 min-w-0">{item.label}</span>
                            {isActive && (
                              <div className="absolute right-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-[var(--tertiary-color)] rounded-full flex-shrink-0"></div>
                            )}
                            {!isActive && (
                              <div className="absolute left-0 top-0 bottom-0 w-1 bg-white/50 rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                            )}
                          </Link>
                        )}
                      </li>
                    );
                  } else if (item.type === 'group') {
                    const GroupIcon = item.icon;
                    const hasActiveChild = item.items.some(child => location.pathname === child.path);
                    // Respect user's expand/collapse preference - don't auto-expand even if active
                    // Default to expanded (true) if not set, but respect user's toggle choice
                    const isExpanded = expandedGroups[item.key] !== false; // Default to true (expanded)
                    
                    return (
                      <li key={item.key} className="stagger-item" style={{ '--animation-delay': `${index * 0.03}s`, overflow: 'visible' }}>
                        {sidebarCollapsed ? (
                          // Collapsed sidebar - show group icon with hover title and click to expand
                          <div className="relative group sidebar-item-collapsed">
                            <button
                              onClick={() => setSidebarCollapsed(false)}
                              className="px-2 py-2 flex justify-center w-full rounded-xl transition-all duration-200 hover:bg-white/10 nav-item-hover group-hover-trigger"
                            >
                              <GroupIcon size={20} className="text-white/80" />
                            </button>
                            {/* Hover tooltip showing title */}
                            <div className="sidebar-tooltip">
                              {item.label}
                            </div>
                          </div>
                        ) : (
                          <>
                            {/* Group header */}
                            <button
                              onClick={() => toggleGroup(item.key)}
                              className={`w-full flex items-center px-3 py-2 rounded-xl transition-all duration-200 ease-out relative group ${
                                hasActiveChild
                                  ? 'bg-white/10 backdrop-blur-sm'
                                  : 'text-white/80 nav-item-hover hover:bg-white/5'
                              }`}
                            >
                              {GroupIcon && (
                                <GroupIcon 
                                  size={20} 
                                  className="transition-all duration-200 flex-shrink-0 mr-3 group-hover:scale-110 text-white/80"
                                />
                              )}
                              <span className="font-medium text-sm whitespace-nowrap flex-1 min-w-0 text-left text-white/80">{item.label}</span>
                              {isExpanded ? (
                                <ChevronUp size={16} className="flex-shrink-0 ml-2 transition-transform duration-200 text-white/80" />
                              ) : (
                                <ChevronDown size={16} className="flex-shrink-0 ml-2 transition-transform duration-200 text-white/80" />
                              )}
                            </button>
                            {/* Group items */}
                            {isExpanded && (
                              <ul className="mt-1 ml-3 space-y-0.5 pl-3 border-l-2 border-white/10">
                                {item.items.map((childItem, childIndex) => {
                                  const ChildIcon = childItem.icon;
                                  const isChildActive = location.pathname === childItem.path;
                                  return (
                                    <li key={`${childItem.path}-${childIndex}`}>
                                      <Link
                                        to={childItem.path}
                                        onClick={() => setSidebarOpen(false)}
                                        className={`flex items-center px-2 py-1.5 rounded-lg transition-all duration-200 ease-out relative group ${
                                          isChildActive
                                            ? 'text-[var(--tertiary-color)]'
                                            : 'text-white/70 nav-item-hover hover:bg-white/10 hover:text-white'
                                        }`}
                                      >
                                        {ChildIcon && (
                                          <ChildIcon 
                                            size={18} 
                                            className="transition-all duration-200 flex-shrink-0 mr-2.5 group-hover:scale-110" 
                                          />
                                        )}
                                        <span className="font-medium text-sm whitespace-nowrap truncate flex-1 min-w-0">{childItem.label}</span>
                                        {isChildActive && (
                                          <div className="absolute right-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-[var(--tertiary-color)] rounded-full flex-shrink-0"></div>
                                        )}
                                      </Link>
                                    </li>
                                  );
                                })}
                              </ul>
                            )}
                          </>
                        )}
                      </li>
                    );
                  }
                  return null;
                })}
              </ul>
            </nav>

            {/* User menu - Fixed at bottom */}
            <div 
              className="flex-shrink-0 p-3 border-t animate-slide-up layout-section-bg"
            >
              <Link
                to="/profile"
                className={`flex items-center px-3 py-2 rounded-lg text-white/80 sidebar-hover mb-1.5 transition-all duration-200 hover:scale-105 group ${sidebarCollapsed ? 'justify-center' : ''}`}
                title={sidebarCollapsed ? 'Settings' : ''}
              >
                <Settings 
                  size={16} 
                  className={`transition-transform duration-200 group-hover:rotate-90 flex-shrink-0 ${sidebarCollapsed ? '' : 'mr-2'}`} 
                />
                {!sidebarCollapsed && <span className="text-sm font-medium">Settings</span>}
              </Link>
              <button
                onClick={handleLogout}
                className={`w-full flex items-center px-3 py-2 rounded-lg text-red-300 hover:bg-red-500/20 transition-all duration-200 hover:scale-105 group ${sidebarCollapsed ? 'justify-center' : ''}`}
                title={sidebarCollapsed ? 'Logout' : ''}
              >
                <LogOut 
                  size={16} 
                  className={`transition-transform duration-200 group-hover:translate-x-1 flex-shrink-0 ${sidebarCollapsed ? '' : 'mr-2'}`} 
                />
                {!sidebarCollapsed && <span className="text-sm font-medium">Logout</span>}
              </button>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className={`flex-1 min-w-0 transition-all duration-300 overflow-y-auto h-screen ${sidebarCollapsed ? 'lg:ml-0' : 'lg:ml-0'}`}>
          {/* Fixed Full-Width Header */}
          <header className="sticky top-0 z-30 w-full px-8">
            <div className="rounded-b-2xl shadow-xl p-4 lg:p-6 relative overflow-hidden screen-header-gradient">
              <div className="absolute inset-0 opacity-20 screen-pattern-overlay"></div>
              <div className="relative z-10 flex flex-col gap-1">
                {/* Top Row: Title and User Info */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1 truncate">{getPageTitle()}</h1>
                  <p className="text-white/80 text-sm sm:text-base">{getPageSubtitle()}</p>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    {/* User Name with Profile */}
                    <Link
                      to="/profile"
                      className="flex items-center gap-2 transition-all duration-200 cursor-pointer group hover:opacity-80"
                    >
                      <span className="text-white font-bold text-base">
                        {user?.name || 'User'}
                      </span>
                      <div
                        className="p-1.5 transition-all duration-200 group-hover:scale-110"
                        title="Profile Settings"
                      >
                        <User size={20} className="text-white" />
                      </div>
                    </Link>
                    {/* Notification Icon */}
                    <NotificationBell />
                  </div>
                </div>
                {/* Bottom Row: Header Actions (if they exist) */}
                  {headerActions && (
                  <div className="flex items-center justify-end gap-2 scale-90 origin-top-right">
                      {headerActions}
                    </div>
                  )}
              </div>
            </div>
          </header>

          <main className="p-4 lg:p-9 animate-fade-in min-h-full">
            <div className="max-w-7xl mx-auto">
              {
              // user?.role === 'training_center_admin' ? (
              //   // Coming Soon Screen for Training Center Admin
              //   <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center">
              //     <div className="text-center max-w-2xl mx-auto px-4">
              //       <div className="mb-8">
              //         <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 mb-6 animate-pulse">
              //           <Building2 size={48} className="text-white" />
              //         </div>
              //       </div>
              //       <h1 className="text-5xl font-bold text-gray-900 mb-4 animate-fade-in">
              //         Coming Soon
              //       </h1>
              //       <p className="text-xl text-gray-600 mb-8 animate-fade-in" style={{ animationDelay: '0.1s' }}>
              //         We're working hard to bring you an amazing experience. 
              //         The Training Center Admin portal will be available shortly.
              //       </p>
              //       <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in" style={{ animationDelay: '0.2s' }}>
              //         <button
              //           onClick={handleLogout}
              //           className="px-8 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-lg shadow-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 hover:scale-105 flex items-center gap-2"
              //         >
              //           <LogOut size={20} />
              //           Logout
              //         </button>
              //       </div>
              //     </div>
              //   </div>
              // ) : 
              (
                children
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 lg:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default Layout;
