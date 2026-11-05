import React from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { DashboardLayout } from './app/(dashboard)/layout.js';
import { useAuth } from './features/auth/hooks/use-auth.js';
import { LoginPage } from './features/auth/components/LoginPage.js';
import { UnauthorizedPage, MaintenancePage } from './components/ui/StatusPages.js';
import {
  OrganizationMain,
  OrganizationFormPage,
} from './features/organizations/index.js';
import {
  DepartmentMain,
  DepartmentFormPage,
} from './features/departments/index.js';
import {
  RoleMain,
  RoleFormPage,
  UserRoleMain,
  UserRoleFormPage,
} from './features/roles/index.js';
import { AuditLogMain } from './features/audit-logs/index.js';

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
  const { isAuthenticated, user, logout } = useAuth();

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

export const RootApp: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* 1. Public Authentication Route */}
      <Route path="/login" element={<LoginPage />} />

      {/* 2. Root Entry: Navigate to /organizations if authenticated, otherwise to /login */}
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
          <ProtectedDashboardLayout>
            <OrganizationFormPage />
          </ProtectedDashboardLayout>
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

      {/* User Roles */}
      <Route
        path="/admin/permissions"
        element={
          <ProtectedDashboardLayout>
            <UserRoleMain />
          </ProtectedDashboardLayout>
        }
      />
      <Route
        path="/admin/permissions/new"
        element={
          <ProtectedDashboardLayout>
            <UserRoleFormPage />
          </ProtectedDashboardLayout>
        }
      />
      <Route
        path="/admin/permissions/:id/edit"
        element={
          <ProtectedDashboardLayout>
            <UserRoleFormPage />
          </ProtectedDashboardLayout>
        }
      />

      {/* Audit Logs & Governance */}
      <Route
        path="/admin/security/audit"
        element={
          <ProtectedDashboardLayout>
            <AuditLogMain />
          </ProtectedDashboardLayout>
        }
      />
      <Route
        path="/audit-logs"
        element={
          <ProtectedDashboardLayout>
            <AuditLogMain />
          </ProtectedDashboardLayout>
        }
      />

      {/* Status pages */}
      <Route path="/401" element={<UnauthorizedPage />} />
      <Route
        path="/maintenance"
        element={
          <ProtectedDashboardLayout>
            <MaintenancePage />
          </ProtectedDashboardLayout>
        }
      />

      {/* Catch-all: unfinished / unknown modules -> maintenance page */}
      <Route
        path="*"
        element={
          <ProtectedDashboardLayout>
            <MaintenancePage />
          </ProtectedDashboardLayout>
        }
      />
    </Routes>
  );
};

export default RootApp;
