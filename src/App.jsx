import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { HeaderProvider } from './context/HeaderContext';
import { NotificationsProvider } from './context/NotificationsContext';
import { LoadingProvider, useLoading } from './context/LoadingContext';
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute';
import Layout from './components/Layout/Layout';
import AuthScreen from './screens/Auth/AuthScreen/AuthScreen';
import PendingAccountScreen from './screens/Auth/PendingAccountScreen/PendingAccountScreen';
import ResetPasswordScreen from './screens/Auth/ResetPasswordScreen/ResetPasswordScreen';
import CompleteRegistrationScreen from './screens/Auth/CompleteRegistrationScreen/CompleteRegistrationScreen';

// Dashboard screens
import DashboardScreen from './screens/Dashboard/DashboardScreen/DashboardScreen';

// Group Admin screens
import ACCApplicationsScreen from './screens/GroupAdmin/ACCApplicationsScreen/ACCApplicationsScreen';
import TrainingCenterApplicationsScreen from './screens/GroupAdmin/TrainingCenterApplicationsScreen/TrainingCenterApplicationsScreen';
import AllACCsScreen from './screens/GroupAdmin/AllACCsScreen/AllACCsScreen';
import AllTrainingCentersScreen from './screens/GroupAdmin/AllTrainingCentersScreen/AllTrainingCentersScreen';
import TrainingCentersMapScreen from './screens/GroupAdmin/TrainingCentersMapScreen/TrainingCentersMapScreen';
import AllInstructorsScreen from './screens/GroupAdmin/AllInstructorsScreen/AllInstructorsScreen';
import AllCoursesScreen from './screens/GroupAdmin/AllCoursesScreen/AllCoursesScreen';
import CategoriesScreen from './screens/GroupAdmin/CategoriesScreen/CategoriesScreen';
import FinancialScreen from './screens/GroupAdmin/FinancialScreen/FinancialScreen';
import GroupAdminPaymentTransactionsScreen from './screens/GroupAdmin/PaymentTransactionsScreen/PaymentTransactionsScreen';
import ReportsScreen from './screens/GroupAdmin/ReportsScreen/ReportsScreen';
import InstructorAuthorizationsScreen from './screens/GroupAdmin/InstructorAuthorizationsScreen/InstructorAuthorizationsScreen';
import StripeSettingsScreen from './screens/GroupAdmin/StripeSettingsScreen/StripeSettingsScreen';
import GroupAdminPendingPaymentsScreen from './screens/GroupAdmin/PendingPaymentsScreen/PendingPaymentsScreen';
import GroupAdminClassesScreen from './screens/GroupAdmin/ClassesScreen/ClassesScreen';
import StripeConnectScreen from './screens/GroupAdmin/StripeConnectScreen/StripeConnectScreen';
import TransfersScreen from './screens/GroupAdmin/TransfersScreen/TransfersScreen';
import GroupAdminCertificateTemplatesScreen from './screens/GroupAdmin/CertificateTemplatesScreen/CertificateTemplatesScreen';

// ACC Admin screens
import ACCDashboardScreen from './screens/ACCAdmin/DashboardScreen/DashboardScreen';
import SubscriptionScreen from './screens/ACCAdmin/SubscriptionScreen/SubscriptionScreen';
import ACCProfileScreen from './screens/ACCAdmin/ProfileScreen/ProfileScreen';
import TrainingCentersScreen from './screens/ACCAdmin/TrainingCentersScreen/TrainingCentersScreen';
import InstructorsScreen from './screens/ACCAdmin/InstructorsScreen/InstructorsScreen';
import AuthorizedInstructorsScreen from './screens/ACCAdmin/AuthorizedInstructorsScreen/AuthorizedInstructorsScreen';
import CoursesScreen from './screens/ACCAdmin/CoursesScreen/CoursesScreen';
import CertificatesScreen from './screens/ACCAdmin/CertificatesScreen/CertificatesScreen';
import CertificateTemplatesScreen from './screens/ACCAdmin/CertificateTemplatesScreen/CertificateTemplatesScreen';
import CertificateDesignerScreen from './screens/ACCAdmin/CertificateDesignerScreen/CertificateDesignerScreen';
import TraineeCardTemplateScreen from './screens/ACCAdmin/TraineeCardTemplateScreen/TraineeCardTemplateScreen';
import TraineeCardDesignerScreen from './screens/ACCAdmin/TraineeCardDesignerScreen/TraineeCardDesignerScreen';
import MaterialsScreen from './screens/ACCAdmin/MaterialsScreen/MaterialsScreen';
import DiscountCodesScreen from './screens/ACCAdmin/DiscountCodesScreen/DiscountCodesScreen';
import ACCCategoriesScreen from './screens/ACCAdmin/CategoriesScreen/CategoriesScreen';
import ACCPaymentTransactionsScreen from './screens/ACCAdmin/PaymentTransactionsScreen/PaymentTransactionsScreen';
import ACCClassesScreen from './screens/ACCAdmin/ClassesScreen/ClassesScreen';
import ACCPendingPaymentsScreen from './screens/ACCAdmin/PendingPaymentsScreen/PendingPaymentsScreen';

// Training Provider screens
import TrainingCenterDashboardScreen from './screens/TrainingCenter/DashboardScreen/DashboardScreen';
import ACCsScreen from './screens/TrainingCenter/ACCsScreen/ACCsScreen';
import TrainingCenterInstructorsScreen from './screens/TrainingCenter/InstructorsScreen/InstructorsScreen';
import TraineesScreen from './screens/TrainingCenter/TraineesScreen/TraineesScreen';
import ClassesScreen from './screens/TrainingCenter/ClassesScreen/ClassesScreen';
import CodesScreen from './screens/TrainingCenter/CodesScreen/CodesScreen';
import TrainingCenterCertificatesScreen from './screens/TrainingCenter/CertificatesScreen/CertificatesScreen';
import WalletScreen from './screens/TrainingCenter/WalletScreen/WalletScreen';
import MarketplaceScreen from './screens/TrainingCenter/MarketplaceScreen/MarketplaceScreen';
import TrainingCenterInstructorAuthorizationsScreen from './screens/TrainingCenter/InstructorAuthorizationsScreen/InstructorAuthorizationsScreen';
import TrainingCenterPaymentTransactionsScreen from './screens/TrainingCenter/PaymentTransactionsScreen/PaymentTransactionsScreen';
import TCProfileScreen from './screens/TrainingCenter/TCProfileScreen/TCProfileScreen';

// Instructor screens
import InstructorDashboardScreen from './screens/Instructor/DashboardScreen/DashboardScreen';
import InstructorClassesScreen from './screens/Instructor/ClassesScreen/ClassesScreen';
import InstructorMaterialsScreen from './screens/Instructor/MaterialsScreen/MaterialsScreen';
import EarningsScreen from './screens/Instructor/EarningsScreen/EarningsScreen';
import InstructorProfileScreen from './screens/Instructor/ProfileScreen/InstructorProfileScreen';

// Profile screen
import ProfileScreen from './screens/Profile/ProfileScreen/ProfileScreen';

// Public screens
import CertificateVerificationScreen from './screens/Public/CertificateVerificationScreen/CertificateVerificationScreen';
import CertificateDetailsScreen from './screens/Public/CertificateDetailsScreen/CertificateDetailsScreen';
import CertificateRedirect from './screens/Public/CertificateRedirect/CertificateRedirect';

import ScrollToTop from './components/ScrollToTop/ScrollToTop';

import { setupLoadingInterceptors, updateApiTimeout } from './services/api';
import { initializeRemoteConfig, isAppEnabled } from './config/firebase';

// Profile Route Component - handles role-based profile screen selection
const ProfileRoute = () => {
  const { user } = useAuth();

  return (
    <Layout>
      {(user?.role === 'acc_admin' || user?.role === 'competency_admin') ? (
        <ACCProfileScreen />
      ) : user?.role === 'instructor' ? (
        <InstructorProfileScreen />
      ) : user?.role === 'training_center_admin' ? (
        <TCProfileScreen />
      ) : (
        <ProfileScreen />
      )}
    </Layout>
  );
};

// App Content Component - sets up loading interceptors and initializes Remote Config
const AppContent = () => {
  const { showLoading, hideLoading } = useLoading();
  const [featureV2Active, setFeatureV2Active] = React.useState(true);

  // Setup loading interceptors and initialize Remote Config once when component mounts
  React.useEffect(() => {
    setupLoadingInterceptors(showLoading, hideLoading);

    // Register callback for timeout updates
    window.__updateApiTimeout = updateApiTimeout;

    // Register callback for feature flag updates
    window.__updateAppStatus = () => {
      const active = isAppEnabled();
      setFeatureV2Active(active);
      console.log(`📱 App status updated: ${active ? 'ENABLED' : 'DISABLED'}`);
    };

    // Initialize Firebase Remote Config
    initializeRemoteConfig().then(() => {
      // Check feature flag status
      setFeatureV2Active(isAppEnabled());
    }).catch((error) => {
      console.error('Failed to initialize Remote Config:', error);
    });
  }, [showLoading, hideLoading]);

  // Feature flag check
  if (!featureV2Active) {
    return null;
  }

  return null;
};

function App() {
  return (
    <AuthProvider>
      <HeaderProvider>
        <NotificationsProvider>
          <LoadingProvider>
            <BrowserRouter>
              <ScrollToTop />

              <AppContent />
              <Routes>
                {/* Public routes */}
                <Route path="/login" element={<AuthScreen />} />
                <Route path="/register" element={<AuthScreen />} />
                <Route path="/complete-registration" element={<CompleteRegistrationScreen />} />
                <Route path="/reset-password" element={<ResetPasswordScreen />} />
                <Route path="/verify-certificate" element={<CertificateVerificationScreen />} />
                <Route path="/certificates/verify/:code" element={<CertificateRedirect />} />
                <Route path="/certificates/verify/:code/details" element={<CertificateDetailsScreen />} />

                {/* Pending account screen - accessible to authenticated but inactive users */}
                <Route
                  path="/pending-account"
                  element={
                    <ProtectedRoute allowPending={true}>
                      <PendingAccountScreen />
                    </ProtectedRoute>
                  }
                />

                {/* Unauthorized route */}
                <Route
                  path="/unauthorized"
                  element={
                    <div className="min-h-screen flex items-center justify-center bg-gray-50">
                      <div className="text-center">
                        <h1 className="text-3xl font-bold text-gray-900 mb-4">Access Denied</h1>
                        <p className="text-gray-600 mb-6">You don't have permission to access this page.</p>
                        <a href="/dashboard" className="text-primary-600 hover:text-primary-700">Go to Dashboard</a>
                      </div>
                    </div>
                  }
                />

                {/* Protected routes with role-based access */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <DashboardScreen />
                      </Layout>
                    </ProtectedRoute>
                  }
                />

                {/* Group Admin routes */}
                <Route
                  path="/admin/*"
                  element={
                    <ProtectedRoute allowedRoles={['group_admin']}>
                      <Layout>
                        <Routes>
                          <Route path="accs" element={<ACCApplicationsScreen />} />
                          <Route path="training-center-applications" element={<TrainingCenterApplicationsScreen />} />
                          <Route path="all-accs" element={<AllACCsScreen />} />
                          <Route path="all-training-centers" element={<AllTrainingCentersScreen />} />
                          <Route path="training-centers-map" element={<TrainingCentersMapScreen />} />
                          <Route path="all-instructors" element={<AllInstructorsScreen />} />
                          <Route path="all-courses" element={<AllCoursesScreen />} />
                          <Route path="categories" element={<CategoriesScreen />} />
                          <Route path="financial" element={<FinancialScreen />} />
                          <Route path="payment-transactions" element={<GroupAdminPaymentTransactionsScreen />} />
                          <Route path="reports" element={<ReportsScreen />} />
                          <Route path="instructor-authorizations" element={<InstructorAuthorizationsScreen />} />
                          <Route path="stripe-settings" element={<StripeSettingsScreen />} />
                          <Route path="stripe-connect" element={<StripeConnectScreen />} />
                          <Route path="transfers" element={<TransfersScreen />} />
                          <Route path="classes" element={<GroupAdminClassesScreen />} />
                          <Route path="pending-payments" element={<GroupAdminPendingPaymentsScreen />} />
                          <Route path="certificate-templates" element={<GroupAdminCertificateTemplatesScreen />} />
                        </Routes>
                      </Layout>
                    </ProtectedRoute>
                  }
                />

                {/* ACC Admin routes */}
                <Route
                  path="/acc/*"
                  element={
                    <ProtectedRoute allowedRoles={['acc_admin', 'competency_admin']}>
                      <Layout>
                        <Routes>
                          <Route path="dashboard" element={<ACCDashboardScreen />} />
                          <Route path="subscription" element={<SubscriptionScreen />} />
                          <Route path="training-centers" element={<TrainingCentersScreen />} />
                          <Route path="authorized-instructors" element={<AuthorizedInstructorsScreen />} />
                          <Route path="instructor-requests" element={<InstructorsScreen />} />
                          <Route path="courses" element={<CoursesScreen />} />
                          <Route path="certificates" element={<CertificatesScreen />} />
                          <Route path="certificate-templates" element={<CertificateTemplatesScreen />} />
                          <Route path="trainee-card-template" element={<TraineeCardTemplateScreen />} />

                          <Route path="materials" element={<MaterialsScreen />} />
                          <Route path="discount-codes" element={<DiscountCodesScreen />} />
                          <Route path="categories" element={<ACCCategoriesScreen />} />
                          <Route path="classes" element={<ACCClassesScreen />} />
                          <Route path="payment-transactions" element={<ACCPaymentTransactionsScreen />} />
                          <Route path="pending-payments" element={<ACCPendingPaymentsScreen />} />
                        </Routes>
                      </Layout>
                    </ProtectedRoute>
                  }
                />

                {/* Certificate Designer (No Layout) - Shared by ACC Admin, Competency Admin and Group Admin */}
                <Route
                  path="/acc/certificate-templates/:id/design"
                  element={
                    <ProtectedRoute allowedRoles={['acc_admin', 'competency_admin']}>
                      <CertificateDesignerScreen />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/certificate-templates/:id/design"
                  element={
                    <ProtectedRoute allowedRoles={['group_admin']}>
                      <CertificateDesignerScreen />
                    </ProtectedRoute>
                  }
                />

                {/* Trainee Card Designer (No Layout) */}
                <Route
                  path="/acc/certificate-templates/:id/card-design"
                  element={
                    <ProtectedRoute allowedRoles={['acc_admin', 'competency_admin']}>
                      <TraineeCardDesignerScreen />
                    </ProtectedRoute>
                  }
                />

                {/* Training Provider routes */}
                <Route
                  path="/training-center/*"
                  element={
                    <ProtectedRoute allowedRoles={['training_center_admin']}>
                      <Layout>
                        <Routes>
                          <Route path="dashboard" element={<TrainingCenterDashboardScreen />} />
                          <Route path="accs" element={<ACCsScreen />} />
                          <Route path="instructors" element={<TrainingCenterInstructorsScreen />} />
                          <Route path="trainees" element={<TraineesScreen />} />
                          <Route path="classes" element={<ClassesScreen />} />
                          <Route path="codes" element={<CodesScreen />} />
                          <Route path="certificates" element={<TrainingCenterCertificatesScreen />} />
                          <Route path="wallet" element={<WalletScreen />} />
                          <Route path="marketplace" element={<MarketplaceScreen />} />
                          <Route path="instructor-authorizations" element={<TrainingCenterInstructorAuthorizationsScreen />} />
                          <Route path="payment-transactions" element={<TrainingCenterPaymentTransactionsScreen />} />
                        </Routes>
                      </Layout>
                    </ProtectedRoute>
                  }
                />

                {/* Instructor routes */}
                <Route
                  path="/instructor/*"
                  element={
                    <ProtectedRoute allowedRoles={['instructor']}>
                      <Layout>
                        <Routes>
                          <Route path="dashboard" element={<InstructorDashboardScreen />} />
                          <Route path="classes" element={<InstructorClassesScreen />} />
                          <Route path="materials" element={<InstructorMaterialsScreen />} />
                          <Route path="earnings" element={<EarningsScreen />} />
                          <Route path="profile" element={<InstructorProfileScreen />} />
                        </Routes>
                      </Layout>
                    </ProtectedRoute>
                  }
                />

                {/* Profile route - role-based */}
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <ProfileRoute />
                    </ProtectedRoute>
                  }
                />

                {/* Default redirect */}
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </BrowserRouter>
          </LoadingProvider>
        </NotificationsProvider>
      </HeaderProvider>
    </AuthProvider>
  );
}

export default App;
