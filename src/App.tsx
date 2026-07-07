import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
} from 'react-router-dom';

import { AppShell } from '@/components/layout/AppShell';
import { ApprovalModeToggle } from '@/components/approval/ApprovalModeToggle';
import { RoleSwitcher } from '@/components/auth/RoleSwitcher';
import { ROLE_VALUES } from '@/domain/models/authz';
import { LoadingState } from '@/components/shared/LoadingState';
import { AuthPage } from '@/pages/AuthPage';
import { ApprovalPage } from '@/pages/ApprovalPage';
import { CategoryManagementPage } from '@/pages/CategoryManagementPage';
import { CustomerDetailPage } from '@/pages/CustomerDetailPage';
import { CustomerFormPage } from '@/pages/CustomerFormPage';
import { CustomerListPage } from '@/pages/CustomerListPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { GuidePage } from '@/pages/GuidePage';
import { ProductDetailPage } from '@/pages/ProductDetailPage';
import { ProductFormPage } from '@/pages/ProductFormPage';
import { ProductListPage } from '@/pages/ProductListPage';
import { WorkQueuePage } from '@/pages/WorkQueuePage';
import { useAuth } from '@/usecase/auth/use-auth';

function FullScreenLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <LoadingState />
    </div>
  );
}

/** Renders the sign-in screen, redirecting authenticated users to the app. */
function AuthRoute() {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <FullScreenLoading />;
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <AuthPage />;
}

/** Guards the app: gates on auth, then wraps children in the app shell. */
function ProtectedLayout() {
  const {
    user,
    isAuthenticated,
    loading,
    signOut,
    activeRole,
    setActiveRole,
    requireApproval,
    setRequireApproval,
  } = useAuth();
  if (loading) return <FullScreenLoading />;
  if (!isAuthenticated) return <Navigate to="/auth" replace />;
  return (
    <AppShell
      userName={user?.name ?? ''}
      onSignOut={() => {
        void signOut();
      }}
      headerExtra={
        <>
          <ApprovalModeToggle
            enabled={requireApproval}
            onChange={setRequireApproval}
          />
          <RoleSwitcher
            activeRole={activeRole}
            options={ROLE_VALUES}
            onChange={setActiveRole}
          />
        </>
      }
    >
      <Outlet />
    </AppShell>
  );
}

/** Route table for the MDM app. */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<AuthRoute />} />
        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/customers" element={<CustomerListPage />} />
          <Route path="/customers/new" element={<CustomerFormPage />} />
          <Route path="/customers/:id" element={<CustomerDetailPage />} />
          <Route path="/customers/:id/edit" element={<CustomerFormPage />} />
          <Route path="/products" element={<ProductListPage />} />
          <Route path="/products/new" element={<ProductFormPage />} />
          <Route path="/products/:id" element={<ProductDetailPage />} />
          <Route path="/products/:id/edit" element={<ProductFormPage />} />
          <Route path="/categories" element={<CategoryManagementPage />} />
          <Route path="/workqueue" element={<WorkQueuePage />} />
          <Route path="/approvals" element={<ApprovalPage />} />
          <Route path="/guide" element={<GuidePage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
