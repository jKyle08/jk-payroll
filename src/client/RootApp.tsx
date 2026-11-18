import React from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { DashboardLayout } from './layouts/DashboardLayout.js';
import { useAuth } from '../features/auth/hooks/use-auth.js';
import { LoginPage } from '../features/auth/components/LoginPage.js';
import { UnauthorizedPage, MaintenancePage } from './components/ui/StatusPages.js';
import {
  OrganizationMain,
  OrganizationFormPage,
} from '../features/organizations/index.js';
import { StandaloneOnboardPage } from './pages/onboarding/StandaloneOnboardPage.js';
import { TokenOnboardPage } from './pages/onboarding/TokenOnboardPage.js';
import { NewOrganizationPage } from './pages/organizations/NewOrganizationPage.js';
import {
  DepartmentMain,
  DepartmentFormPage,
} from '../features/departments/index.js';
import {
  RoleMain,
  RoleFormPage,
  UserRoleMain,
  UserRoleFormPage,
} from '../features/roles/index.js';
import { AuditLogMain } from '../features/audit-logs/index.js';

const DepartmentCreatePage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <DepartmentFormPage
      mode="create"
      onSave={async () => { navigate('/admin/departments'); }}
      onCancel={() => { navigate('/admin/departments'); }}
    />
  );
};

const DepartmentEditPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <DepartmentFormPage
      mode="edit"
      onSave={async () => { navigate('/admin/departments'); }}
      onCancel={() => { navigate('/admin/departments'); }}
    />
  );
};

/**
 * Route protection wrapper requiring active session
 */
const ProtectedDashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <DashboardLayout
      initialUser={user ? {
        id: user.userId,
        fullName: user.fullName,
        email: user.email,
        initials: user.fullName ? user.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'AD',
        isActive: true,
        tenantId: user.tenantId,
        tenantName: user.tenantName,
        tenantCode: user.tenantCode,
        departmentName: user.departmentName || 'General',
        role: user.isSuperAdmin ? 'Super Admin' : user.isTenantAdmin ? 'Tenant Admin' : 'Staff',
      } : undefined}
      initialPermissions={user?.effectivePermissions || []}
      initialTenantCode={user?.tenantCode || 'APEX-HLTH'}
    >
      {children}
    </DashboardLayout>
  );
};

/**
 * Route protection wrapper requiring active session but without Dashboard Chrome (Sidebar/Topbar)
 */
const ProtectedOnboardingRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export const RootApp: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* 1. Public Authentication Route */}
      <Route path="/login" element={<LoginPage />} />

      {/* 2. Standalone Client Onboarding Routes (No sidebar or dashboard chrome) */}
      <Route path="/onboard" element={<StandaloneOnboardPage />} />
      <Route path="/onboarding" element={<StandaloneOnboardPage />} />
      <Route path="/onboarding/:token" element={<TokenOnboardPage />} />

      {/* 3. Root Entry: Navigate to /organizations if authenticated, otherwise to /login */}
      <Route
        path="/"
        element={<Navigate to={isAuthenticated ? "/organizations" : "/login"} replace />}
      />
      <Route
        path="/dashboard"
        element={<Navigate to={isAuthenticated ? "/organizations" : "/login"} replace />}
      />

      {/* Organizations / Tenants */}
      <Route
        path="/organizations"
        element={
          <ProtectedDashboardLayout>
            <OrganizationMain />
          </ProtectedDashboardLayout>
        }
      />
      <Route
        path="/organizations/new"
        element={
          <ProtectedOnboardingRoute>
            <NewOrganizationPage />
          </ProtectedOnboardingRoute>
        }
      />
      <Route
        path="/organizations/:id/edit"
        element={
          <ProtectedDashboardLayout>
            <OrganizationFormPage />
          </ProtectedDashboardLayout>
        }
      />
      <Route
        path="/admin/tenants"
        element={
          <ProtectedDashboardLayout>
            <OrganizationMain />
          </ProtectedDashboardLayout>
        }
      />

      {/* Departments */}
      <Route
        path="/admin/departments"
        element={
          <ProtectedDashboardLayout>
            <DepartmentMain />
          </ProtectedDashboardLayout>
        }
      />
      <Route
        path="/admin/departments/new"
        element={
          <ProtectedDashboardLayout>
            <DepartmentCreatePage />
          </ProtectedDashboardLayout>
        }
      />
      <Route
        path="/admin/departments/:id/edit"
        element={
          <ProtectedDashboardLayout>
            <DepartmentEditPage />
          </ProtectedDashboardLayout>
        }
      />

      {/* Roles & Permissions */}
      <Route
        path="/admin/roles"
        element={
          <ProtectedDashboardLayout>
            <RoleMain />
          </ProtectedDashboardLayout>
        }
      />
      <Route
        path="/admin/roles/new"
        element={
          <ProtectedDashboardLayout>
            <RoleFormPage />
          </ProtectedDashboardLayout>
        }
      />
      <Route
        path="/admin/roles/assign"
        element={
          <ProtectedDashboardLayout>
            <UserRoleFormPage />
          </ProtectedDashboardLayout>
        }
      />
      <Route
        path="/admin/roles/:id/edit"
        element={
          <ProtectedDashboardLayout>
            <RoleFormPage />
          </ProtectedDashboardLayout>
        }
      />
      <Route
        path="/admin/user-roles"
        element={
          <ProtectedDashboardLayout>
            <UserRoleMain />
          </ProtectedDashboardLayout>
        }
      />

      {/* Audit Logs */}
      <Route
        path="/admin/audit-logs"
        element={
          <ProtectedDashboardLayout>
            <AuditLogMain />
          </ProtectedDashboardLayout>
        }
      />
      <Route
        path="/admin/audit"
        element={
          <ProtectedDashboardLayout>
            <AuditLogMain />
          </ProtectedDashboardLayout>
        }
      />

      {/* Error & Gating Pages */}
      <Route
        path="/unauthorized"
        element={
          <ProtectedDashboardLayout>
            <UnauthorizedPage />
          </ProtectedDashboardLayout>
        }
      />
      <Route
        path="/maintenance"
        element={
          <ProtectedDashboardLayout>
            <MaintenancePage />
          </ProtectedDashboardLayout>
        }
      />

      {/* 404 Fallback Route */}
      <Route
        path="*"
        element={
          <ProtectedDashboardLayout>
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Page Not Found
              </h2>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                The requested URL route could not be found within PayPulse.
              </p>
              <button
                type="button"
                onClick={() => window.history.back()}
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
              >
                Go Back
              </button>
            </div>
          </ProtectedDashboardLayout>
        }
      />
    </Routes>
  );
};

export default RootApp;
