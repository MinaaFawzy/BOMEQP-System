import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { HeaderProvider } from './context/HeaderContext';
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute';
import Layout from './components/Layout/Layout';
import AuthScreen from './screens/Auth/AuthScreen/AuthScreen';
import PendingAccountScreen from './screens/Auth/PendingAccountScreen/PendingAccountScreen';
import ResetPasswordScreen from './screens/Auth/ResetPasswordScreen/ResetPasswordScreen';

// Dashboard screens
import DashboardScreen from './screens/Dashboard/DashboardScreen/DashboardScreen';

// Group Admin screens
import ACCApplicationsScreen from './screens/GroupAdmin/ACCApplicationsScreen/ACCApplicationsScreen';
import AllACCsScreen from './screens/GroupAdmin/AllACCsScreen/AllACCsScreen';
import AllTrainingCentersScreen from './screens/GroupAdmin/AllTrainingCentersScreen/AllTrainingCentersScreen';
import AllInstructorsScreen from './screens/GroupAdmin/AllInstructorsScreen/AllInstructorsScreen';
import AllCoursesScreen from './screens/GroupAdmin/AllCoursesScreen/AllCoursesScreen';
import CategoriesScreen from './screens/GroupAdmin/CategoriesScreen/CategoriesScreen';
import FinancialScreen from './screens/GroupAdmin/FinancialScreen/FinancialScreen';
import ReportsScreen from './screens/GroupAdmin/ReportsScreen/ReportsScreen';
import InstructorAuthorizationsScreen from './screens/GroupAdmin/InstructorAuthorizationsScreen/InstructorAuthorizationsScreen';
import StripeSettingsScreen from './screens/GroupAdmin/StripeSettingsScreen/StripeSettingsScreen';

// ACC Admin screens
import ACCDashboardScreen from './screens/ACCAdmin/DashboardScreen/DashboardScreen';
import SubscriptionScreen from './screens/ACCAdmin/SubscriptionScreen/SubscriptionScreen';
import TrainingCentersScreen from './screens/ACCAdmin/TrainingCentersScreen/TrainingCentersScreen';
import InstructorsScreen from './screens/ACCAdmin/InstructorsScreen/InstructorsScreen';
import CoursesScreen from './screens/ACCAdmin/CoursesScreen/CoursesScreen';
import CertificatesScreen from './screens/ACCAdmin/CertificatesScreen/CertificatesScreen';
import MaterialsScreen from './screens/ACCAdmin/MaterialsScreen/MaterialsScreen';
import DiscountCodesScreen from './screens/ACCAdmin/DiscountCodesScreen/DiscountCodesScreen';
import ACCCategoriesScreen from './screens/ACCAdmin/CategoriesScreen/CategoriesScreen';

// Training Center screens
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

// Instructor screens
import InstructorDashboardScreen from './screens/Instructor/DashboardScreen/DashboardScreen';
import InstructorClassesScreen from './screens/Instructor/ClassesScreen/ClassesScreen';
import InstructorMaterialsScreen from './screens/Instructor/MaterialsScreen/MaterialsScreen';
import EarningsScreen from './screens/Instructor/EarningsScreen/EarningsScreen';

// Profile screen
import ProfileScreen from './screens/Profile/ProfileScreen/ProfileScreen';

function App() {
  return (
    <AuthProvider>
      <HeaderProvider>
        <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<AuthScreen />} />
          <Route path="/register" element={<AuthScreen />} />
          <Route path="/reset-password" element={<ResetPasswordScreen />} />
          
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
                    <Route path="all-accs" element={<AllACCsScreen />} />
                    <Route path="all-training-centers" element={<AllTrainingCentersScreen />} />
                    <Route path="all-instructors" element={<AllInstructorsScreen />} />
                    <Route path="all-courses" element={<AllCoursesScreen />} />
                    <Route path="categories" element={<CategoriesScreen />} />
                    <Route path="financial" element={<FinancialScreen />} />
                    <Route path="reports" element={<ReportsScreen />} />
                    <Route path="instructor-authorizations" element={<InstructorAuthorizationsScreen />} />
                    <Route path="stripe-settings" element={<StripeSettingsScreen />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* ACC Admin routes */}
          <Route
            path="/acc/*"
            element={
              <ProtectedRoute allowedRoles={['acc_admin']}>
                <Layout>
                  <Routes>
                    <Route path="dashboard" element={<ACCDashboardScreen />} />
                    <Route path="subscription" element={<SubscriptionScreen />} />
                    <Route path="training-centers" element={<TrainingCentersScreen />} />
                    <Route path="instructors" element={<InstructorsScreen />} />
                    <Route path="courses" element={<CoursesScreen />} />
                    <Route path="certificates" element={<CertificatesScreen />} />
                    <Route path="materials" element={<MaterialsScreen />} />
                    <Route path="discount-codes" element={<DiscountCodesScreen />} />
                    <Route path="categories" element={<ACCCategoriesScreen />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Training Center routes */}
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
                  </Routes>
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Profile route (all authenticated users) */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Layout>
                  <ProfileScreen />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
      </HeaderProvider>
    </AuthProvider>
  );
}

export default App;
