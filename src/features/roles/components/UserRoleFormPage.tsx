// ==============================================================================
// JK-PAYROLL: ASSIGN USERS TO ROLE (UNIFIED MULTI-USER ASSIGNMENT WORKSPACE)
// Enables assigning a security role to one or multiple users simultaneously
// Architecture: Strict Multi-Tenancy & Cascading RBAC (Roles have FK to Organization)
// Design System: "Midnight & Champagne Steel"
// File: src/features/roles/components/UserRoleFormPage.tsx
// ==============================================================================

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  Loader2,
  Search,
  Check,
  X,
  Users,
  CheckCheck,
  ArrowLeft,
  Building2,
  UserX,
} from 'lucide-react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { UserRoleItem } from '../types.js';
import { fetchUserRoleById } from '../services/user-role.client.js';
import { useUserRoleMutations } from '../hooks/useUserRoleMutations.js';
import {
  SearchableSelect,
  type SearchableOption,
} from '../../../client/components/ui/SearchableSelect.js';
import { Button, Badge } from '../../../client/components/ui/index.js';
import { useAuth } from '../../auth/hooks/use-auth.js';
import { authFetch } from '../../../client/lib/auth-session.js';

export interface UserRoleFormPageProps {
  userRoleIdOverride?: string;
  onNavigateBack?: () => void;
  onSuccess?: (item: UserRoleItem) => void;
}

// Available Default Facilities / Organizations
export const DEFAULT_ORGANIZATIONS = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Acme Corporation',
    code: 'ACME',
    description: 'Primary corporate tenant facility',
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    name: 'Nexus Dynamics',
    code: 'NEXUS',
    description: 'Cloud Infrastructure & Engineering facility',
  },
  {
    id: '00000000-0000-0000-0000-000000000000',
    name: 'Global Platform (System)',
    code: 'SYSTEM',
    description: 'System-wide administrative scope',
  },
];

// Actual Departments by Facility (Fallback & Seeded Reference)
export const DEFAULT_FACILITY_DEPARTMENTS: Record<
  string,
  Array<{ id: string; name: string; code: string }>
> = {
  // Acme Corporation
  '00000000-0000-0000-0000-000000000001': [
    { id: 'dept-101', name: 'Finance', code: 'FIN' },
    { id: 'dept-102', name: 'Human Resources', code: 'HR' },
    { id: 'dept-103', name: 'Operations', code: 'OPS' },
    { id: 'dept-104', name: 'Engineering', code: 'ENG' },
    { id: 'dept-105', name: 'Executive', code: 'EXEC' },
  ],
  // Nexus Dynamics
  '00000000-0000-0000-0000-000000000002': [
    { id: 'dept-201', name: 'Cloud Infrastructure', code: 'CLOUD' },
    { id: 'dept-202', name: 'Software Engineering', code: 'SWE' },
    { id: 'dept-203', name: 'Corporate Finance', code: 'CORP-FIN' },
    { id: 'dept-204', name: 'Operations', code: 'OPS' },
  ],
  // Global Platform
  '00000000-0000-0000-0000-000000000000': [
    { id: 'dept-001', name: 'System Root', code: 'ROOT' },
    { id: 'dept-002', name: 'Security & Compliance', code: 'SEC' },
    { id: 'dept-003', name: 'Global Operations', code: 'OPS' },
  ],
};

export interface RoleItemDefinition {
  id: string;
  code: string;
  name: string;
  description: string;
  isSystem: boolean;
  organizationId?: string | null;
}

// Available Default Roles (With Foreign Key to Organization / Facility)
export const DEFAULT_ROLES: RoleItemDefinition[] = [
  {
    id: 'c0000000-0000-0000-0000-000000000001',
    code: 'ADMIN',
    name: 'Administrator',
    description: 'Full organizational authority across administrative operations',
    isSystem: true,
    organizationId: null, // System-level
  },
  {
    id: 'c0000000-0000-0000-0000-000000000004',
    code: 'HR_MGR',
    name: 'Human Resources Manager',
    description: 'Manages employee records, HR operations, and related organizational resources.',
    isSystem: false,
    organizationId: '00000000-0000-0000-0000-000000000001', // Acme Corporation
  },
  {
    id: 'c0000000-0000-0000-0000-000000000002',
    code: 'FIN_OFF',
    name: 'Finance Officer',
    description: 'Oversees payroll runs, financial accounts, statutory remittances, and ledgers',
    isSystem: false,
    organizationId: '00000000-0000-0000-0000-000000000001', // Acme Corporation
  },
  {
    id: 'c0000000-0000-0000-0000-000000000003',
    code: 'SUPER_ADMIN',
    name: 'Super Administrator',
    description: 'Platform-wide root authority across all modules and tenant environments',
    isSystem: true,
    organizationId: null, // System-level
  },
  {
    id: 'c0000000-0000-0000-0000-000000000005',
    code: 'NEXUS_LEAD',
    name: 'Nexus Cloud Lead',
    description: 'Engineering cluster management and infrastructure access control',
    isSystem: false,
    organizationId: '00000000-0000-0000-0000-000000000002', // Nexus Dynamics
  },
];

// Available Users for Selection with Current Role and Organization Tenancy
export interface UserCandidate {
  id: string;
  name: string;
  email: string;
  tenantId: string;
  currentRole: string; // 'Unassigned' or role name
  dept: string;
}

export const AVAILABLE_USERS: UserCandidate[] = [
  // --- Acme Corporation ---
  // Finance
  {
    id: 'usr-101',
    name: 'John Michael Santos',
    email: 'john.santos@example.com',
    tenantId: '00000000-0000-0000-0000-000000000001',
    currentRole: 'Staff',
    dept: 'Finance',
  },
  {
    id: 'usr-102',
    name: 'Carlos Miguel Fernandez',
    email: 'carlos.fernandez@example.com',
    tenantId: '00000000-0000-0000-0000-000000000001',
    currentRole: 'Unassigned',
    dept: 'Finance',
  },
  {
    id: 'usr-103',
    name: 'David Kim',
    email: 'david.kim@enterprise.net',
    tenantId: '00000000-0000-0000-0000-000000000001',
    currentRole: 'Finance Officer',
    dept: 'Finance',
  },
  // Human Resources
  {
    id: 'usr-104',
    name: 'Maria Angela Reyes',
    email: 'maria.reyes@example.com',
    tenantId: '00000000-0000-0000-0000-000000000001',
    currentRole: 'Staff',
    dept: 'Human Resources',
  },
  {
    id: 'usr-105',
    name: 'Patricia Ann Gomez',
    email: 'patricia.gomez@example.com',
    tenantId: '00000000-0000-0000-0000-000000000001',
    currentRole: 'Unassigned',
    dept: 'Human Resources',
  },
  {
    id: 'usr-1',
    name: 'Rachel Sterling',
    email: 'rachel.sterling@enterprise.net',
    tenantId: '00000000-0000-0000-0000-000000000001',
    currentRole: 'Human Resources Manager',
    dept: 'Human Resources',
  },
  // Operations
  {
    id: 'usr-106',
    name: 'Mark David Cruz',
    email: 'mark.cruz@example.com',
    tenantId: '00000000-0000-0000-0000-000000000001',
    currentRole: 'Supervisor',
    dept: 'Operations',
  },
  {
    id: 'usr-107',
    name: 'Daniel Vance Torres',
    email: 'daniel.torres@example.com',
    tenantId: '00000000-0000-0000-0000-000000000001',
    currentRole: 'Unassigned',
    dept: 'Operations',
  },
  {
    id: 'usr-5',
    name: 'Sarah Jenkins',
    email: 's.jenkins@enterprise.net',
    tenantId: '00000000-0000-0000-0000-000000000001',
    currentRole: 'Payroll Officer',
    dept: 'Operations',
  },
  // Engineering
  {
    id: 'usr-108',
    name: 'Angela Mae Lopez',
    email: 'angela.lopez@example.com',
    tenantId: '00000000-0000-0000-0000-000000000001',
    currentRole: 'Software Engineer',
    dept: 'Engineering',
  },
  {
    id: 'usr-109',
    name: 'Kristine Joy Bautista',
    email: 'kristine.bautista@example.com',
    tenantId: '00000000-0000-0000-0000-000000000001',
    currentRole: 'Unassigned',
    dept: 'Engineering',
  },
  {
    id: 'usr-3',
    name: 'Elena Rostova',
    email: 'e.rostova@enterprise.net',
    tenantId: '00000000-0000-0000-0000-000000000001',
    currentRole: 'Technical Lead',
    dept: 'Engineering',
  },
  // Executive
  {
    id: '00000000-0000-0000-0000-000000000002',
    name: 'Alexander Wright',
    email: 'admin@apexcorp.com',
    tenantId: '00000000-0000-0000-0000-000000000001',
    currentRole: 'Administrator',
    dept: 'Executive',
  },
  {
    id: 'usr-110',
    name: 'Beatrice Tan',
    email: 'beatrice.tan@example.com',
    tenantId: '00000000-0000-0000-0000-000000000001',
    currentRole: 'Unassigned',
    dept: 'Executive',
  },

  // --- Nexus Dynamics ---
  {
    id: 'usr-6',
    name: 'James Thornton',
    email: 'j.thornton@nexus.net',
    tenantId: '00000000-0000-0000-0000-000000000002',
    currentRole: 'Senior Accountant',
    dept: 'Corporate Finance',
  },
  {
    id: 'usr-201',
    name: 'Ryan Foster',
    email: 'ryan.foster@nexus.net',
    tenantId: '00000000-0000-0000-0000-000000000002',
    currentRole: 'Unassigned',
    dept: 'Corporate Finance',
  },
  {
    id: 'usr-7',
    name: 'Chloe Bennett',
    email: 'c.bennett@nexus.net',
    tenantId: '00000000-0000-0000-0000-000000000002',
    currentRole: 'Software Engineer',
    dept: 'Software Engineering',
  },
  {
    id: 'usr-202',
    name: 'Lucas Vance',
    email: 'lucas.vance@nexus.net',
    tenantId: '00000000-0000-0000-0000-000000000002',
    currentRole: 'Unassigned',
    dept: 'Software Engineering',
  },
  {
    id: 'usr-8',
    name: 'Oliver Queen',
    email: 'o.queen@nexus.net',
    tenantId: '00000000-0000-0000-0000-000000000002',
    currentRole: 'Operations Analyst',
    dept: 'Cloud Infrastructure',
  },
  {
    id: 'usr-203',
    name: 'Sophia Chen',
    email: 'sophia.chen@nexus.net',
    tenantId: '00000000-0000-0000-0000-000000000002',
    currentRole: 'Unassigned',
    dept: 'Cloud Infrastructure',
  },

  // --- Global Platform ---
  {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Super Administrator',
    email: 'superadmin@paypulse.internal',
    tenantId: '00000000-0000-0000-0000-000000000000',
    currentRole: 'Super Administrator',
    dept: 'System Root',
  },
  {
    id: 'usr-001',
    name: 'Liam Rivera',
    email: 'liam.rivera@paypulse.internal',
    tenantId: '00000000-0000-0000-0000-000000000000',
    currentRole: 'Unassigned',
    dept: 'Security & Compliance',
  },
  {
    id: 'usr-002',
    name: 'Hannah Morales',
    email: 'hannah.morales@paypulse.internal',
    tenantId: '00000000-0000-0000-0000-000000000000',
    currentRole: 'Unassigned',
    dept: 'Global Operations',
  },
];

export const UserRoleFormPage: React.FC<UserRoleFormPageProps> = ({
  userRoleIdOverride,
  onNavigateBack,
  onSuccess,
}) => {
  const params = useParams<{ id?: string }>();
  const id = userRoleIdOverride || params.id;
  const isEditMode = Boolean(id);
  const { token } = useAuth();

  let navigate: ((path: string) => void) | undefined;
  let searchParams = new URLSearchParams();
  try {
    navigate = useNavigate();
    const loc = useLocation();
    searchParams = new URLSearchParams(loc.search);
  } catch {
    navigate = undefined;
  }

  const queryRoleId = searchParams.get('roleId');

  const handleBack = () => {
    if (onNavigateBack) {
      onNavigateBack();
    } else if (navigate) {
      navigate('/admin/roles');
    }
  };

  const [isLoadingItem, setIsLoadingItem] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Live Organizations & Roles state
  const [orgList, setOrgList] = useState(DEFAULT_ORGANIZATIONS);
  const [roleList, setRoleList] = useState<RoleItemDefinition[]>(DEFAULT_ROLES);
  const [userList, setUserList] = useState<UserCandidate[]>(AVAILABLE_USERS);

  // Facility Actual Departments State
  const [facilityDepartments, setFacilityDepartments] = useState<
    Array<{ id: string; name: string; code?: string }>
  >(DEFAULT_FACILITY_DEPARTMENTS[DEFAULT_ORGANIZATIONS[0].id] || []);
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(false);

  // Form State
  const [tenantId, setTenantId] = useState<string>(DEFAULT_ORGANIZATIONS[0].id);
  const [userId, setUserId] = useState<string>(AVAILABLE_USERS[0].id);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [roleId, setRoleId] = useState<string>(queryRoleId || DEFAULT_ROLES[0].id);
  const [isActive, setIsActive] = useState<boolean>(true);

  // Filters within multi-user workspace
  const [userSearch, setUserSearch] = useState<string>('');
  // Department filter: defaults to 'All' so employees are immediately visible
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('All');
  // Role assignment status filter: 'ALL' | 'UNASSIGNED' | 'ASSIGNED'
  const [roleStatusFilter, setRoleStatusFilter] = useState<
    'ALL' | 'UNASSIGNED' | 'ASSIGNED'
  >('ALL');

  const { assignRole, updateRole, isSubmitting, error: mutationError } =
    useUserRoleMutations();

  // Load organizations, roles, and profiles
  useEffect(() => {
    let isMounted = true;
    const loadLookups = async () => {
      try {
        const [orgsRes, rolesRes, usersRes] = await Promise.all([
          authFetch('/api/organizations').catch(() => null),
          authFetch('/api/roles').catch(() => null),
          authFetch('/api/users').catch(() => null),
        ]);

        if (orgsRes && orgsRes.ok) {
          const json = await orgsRes.json();
          const list = Array.isArray(json)
            ? json
            : Array.isArray(json.data)
            ? json.data
            : [];
          if (isMounted && list.length > 0) {
            setOrgList(
              list.map((o: any) => ({
                id: o.id,
                name: o.name,
                code: o.code || o.slug || 'ORG',
                description: o.industry || 'Tenant organization facility',
              }))
            );
          }
        }

        if (rolesRes && rolesRes.ok) {
          const json = await rolesRes.json();
          const list = Array.isArray(json)
            ? json
            : Array.isArray(json.items)
            ? json.items
            : Array.isArray(json.data)
            ? json.data
            : [];
          if (isMounted && list.length > 0) {
            setRoleList(
              list.map((r: any) => ({
                id: r.id,
                code: r.code,
                name: r.name,
                description: r.description || 'Security role definition.',
                isSystem:
                  r.roleType === 'SYSTEM' ||
                  r.code === 'SUPER_ADMIN' ||
                  r.code === 'ADMIN',
                organizationId: r.organizationId || r.organization_id || null,
              }))
            );
          }
        }

        if (usersRes && usersRes.ok) {
          const json = await usersRes.json();
          const list = Array.isArray(json)
            ? json
            : Array.isArray(json.users)
            ? json.users
            : Array.isArray(json.data)
            ? json.data
            : [];
          if (isMounted && list.length > 0) {
            setUserList(
              list.map((u: any) => ({
                id: u.id,
                name: u.fullName || u.name || 'User',
                email: u.email || '',
                tenantId:
                  u.tenantId || u.organizationId || DEFAULT_ORGANIZATIONS[0].id,
                currentRole: u.roleName || u.roleCode || 'Unassigned',
                dept: u.departmentName || u.dept || 'Operations',
              }))
            );
          }
        }
      } catch {
        // Fallback to defaults
      }
    };
    loadLookups();
    return () => {
      isMounted = false;
    };
  }, [token]);

  // Fetch actual departments for the selected facility (tenantId)
  useEffect(() => {
    let isMounted = true;
    const fetchFacilityDepartments = async () => {
      setIsLoadingDepartments(true);
      try {
        const res = await authFetch(`/api/departments?organizationId=${tenantId}`).catch(
          () => null
        );
        if (res && res.ok) {
          const json = await res.json();
          const items = Array.isArray(json.data)
            ? json.data
            : Array.isArray(json.items)
            ? json.items
            : [];
          if (isMounted && items.length > 0) {
            setFacilityDepartments(
              items.map((d: any) => ({
                id: d.id,
                name: d.name,
                code: d.code,
              }))
            );
            setIsLoadingDepartments(false);
            return;
          }
        }
      } catch {
        // Fallback below
      }

      if (isMounted) {
        const fallback =
          DEFAULT_FACILITY_DEPARTMENTS[tenantId] ||
          DEFAULT_FACILITY_DEPARTMENTS['00000000-0000-0000-0000-000000000001'] ||
          [];
        setFacilityDepartments(fallback);
        setIsLoadingDepartments(false);
      }
    };

    fetchFacilityDepartments();
    return () => {
      isMounted = false;
    };
  }, [tenantId, token]);

  // Fetch custom roles for the selected organization/facility scope (foreign key bound)
  useEffect(() => {
    let isMounted = true;
    const fetchOrgRoles = async () => {
      try {
        const res = await authFetch(`/api/roles?organizationId=${tenantId}`).catch(
          () => null
        );
        if (res && res.ok) {
          const json = await res.json();
          const items = Array.isArray(json.data)
            ? json.data
            : Array.isArray(json.items)
            ? json.items
            : [];
          if (isMounted && items.length > 0) {
            setRoleList((prev) => {
              const customRoles = items.map((r: any) => ({
                id: r.id,
                code: r.code,
                name: r.name,
                description: r.description || 'Custom organizational role.',
                isSystem: false,
                organizationId: tenantId,
              }));
              const systemRoles = prev.filter((r) => r.isSystem || !r.organizationId);
              return [...systemRoles, ...customRoles];
            });
          }
        }
      } catch {
        // Fallback
      }
    };
    fetchOrgRoles();
    return () => {
      isMounted = false;
    };
  }, [tenantId, token]);

  // Available roles for the selected organization scope (FK: organization_id is null or equals tenantId)
  const availableOrgRoles = useMemo(() => {
    return roleList.filter(
      (r) => !r.organizationId || r.organizationId === tenantId || r.isSystem
    );
  }, [roleList, tenantId]);

  // Ensure roleId is valid for the current organization
  useEffect(() => {
    if (availableOrgRoles.length > 0 && !availableOrgRoles.some((r) => r.id === roleId)) {
      setRoleId(availableOrgRoles[0].id);
    }
  }, [availableOrgRoles, roleId]);

  // Sync roleId if query parameter changes or is initially provided
  useEffect(() => {
    if (queryRoleId && availableOrgRoles.some((r) => r.id === queryRoleId)) {
      setRoleId(queryRoleId);
    }
  }, [queryRoleId, availableOrgRoles]);

  // Load existing role assignment for edit mode
  useEffect(() => {
    if (isEditMode && id) {
      setIsLoadingItem(true);
      setLoadError(null);
      fetchUserRoleById(id)
        .then((data) => {
          if (data) {
            setTenantId(data.tenantId);
            setUserId(data.userId);
            setSelectedUserIds([data.userId]);
            setRoleId(data.roleId);
            setIsActive(data.isActive);
            const existingUser = userList.find((u) => u.id === data.userId);
            if (existingUser) {
              setSelectedDeptFilter(existingUser.dept);
            } else {
              setSelectedDeptFilter('All');
            }
          }
        })
        .catch((err) => {
          setLoadError(err.message || 'Failed to load user role assignment');
        })
        .finally(() => {
          setIsLoadingItem(false);
        });
    }
  }, [id, isEditMode, userList]);

  // Active Role and Active Organization objects
  const activeRole = useMemo(() => {
    return (
      availableOrgRoles.find((r) => r.id === roleId) ||
      availableOrgRoles[0] ||
      DEFAULT_ROLES[0]
    );
  }, [availableOrgRoles, roleId]);

  const activeOrg = useMemo(() => {
    return (
      orgList.find((o) => o.id === tenantId) || orgList[0] || DEFAULT_ORGANIZATIONS[0]
    );
  }, [orgList, tenantId]);

  // Facility Change: resets user selections, resets department to 'All', retains immediate visibility
  const handleTenantChange = (newTenantId: string) => {
    setTenantId(newTenantId);
    setSelectedUserIds([]);
    setSelectedDeptFilter('All'); // Show all employees of the newly selected facility immediately
    setUserSearch('');
    setRoleStatusFilter('ALL');
  };

  // Rule: Check if a user already has the selected role
  const isUserAlreadyAssigned = (user: UserCandidate) => {
    if (!activeRole) return false;
    if (!user.currentRole || user.currentRole === 'Unassigned') return false;
    const userRole = (user.currentRole || '').toLowerCase().trim();
    const roleName = (activeRole.name || '').toLowerCase().trim();
    const roleCode = (activeRole.code || '').toLowerCase().trim();
    return (
      userRole === roleName ||
      userRole === roleCode ||
      (roleCode === 'hr_mgr' && userRole === 'human resources manager') ||
      (roleCode === 'admin' && userRole === 'administrator') ||
      (roleCode === 'fin_off' && userRole === 'finance officer')
    );
  };

  // Candidates belonging to the selected organization/facility scope
  const facilityEmployees = useMemo(() => {
    return userList.filter((u) => {
      if (!u.tenantId) return true;
      if (tenantId === '00000000-0000-0000-0000-000000000000') return true;
      return u.tenantId === tenantId;
    });
  }, [userList, tenantId]);

  // Employees filtered by department selection
  const departmentEmployees = useMemo(() => {
    if (!selectedDeptFilter || selectedDeptFilter === 'All') {
      return facilityEmployees;
    }
    return facilityEmployees.filter(
      (u) => u.dept.toLowerCase() === selectedDeptFilter.toLowerCase()
    );
  }, [facilityEmployees, selectedDeptFilter]);

  // Filtered employees: strictly searches person name, applies department and role status filter
  const filteredUsers = useMemo(() => {
    return departmentEmployees.filter((u) => {
      // 1. Role Status Filter
      if (roleStatusFilter === 'UNASSIGNED') {
        const isUnassigned = !u.currentRole || u.currentRole === 'Unassigned';
        if (!isUnassigned) return false;
      } else if (roleStatusFilter === 'ASSIGNED') {
        const isAssigned = u.currentRole && u.currentRole !== 'Unassigned';
        if (!isAssigned) return false;
      }

      // 2. Search Term: strictly filter by PERSON NAME per user instruction
      if (userSearch.trim()) {
        const term = userSearch.toLowerCase().trim();
        return u.name.toLowerCase().includes(term);
      }

      return true;
    });
  }, [departmentEmployees, roleStatusFilter, userSearch]);

  // Selected users full objects for pills tray
  const selectedUserObjects = useMemo(() => {
    return facilityEmployees.filter((u) => selectedUserIds.includes(u.id));
  }, [facilityEmployees, selectedUserIds]);

  // Selectable candidates in current filtered view (excluding already-assigned users)
  const selectableFiltered = useMemo(() => {
    return filteredUsers.filter((u) => !isUserAlreadyAssigned(u));
  }, [filteredUsers, activeRole]);

  const allSelectableFilteredSelected = useMemo(() => {
    return (
      selectableFiltered.length > 0 &&
      selectableFiltered.every((u) => selectedUserIds.includes(u.id))
    );
  }, [selectableFiltered, selectedUserIds]);

  const someSelectableFilteredSelected = useMemo(() => {
    return (
      selectableFiltered.some((u) => selectedUserIds.includes(u.id)) &&
      !allSelectableFilteredSelected
    );
  }, [selectableFiltered, selectedUserIds, allSelectableFilteredSelected]);

  // Master checkbox ref for indeterminate state
  const masterCheckboxRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (masterCheckboxRef.current) {
      masterCheckboxRef.current.indeterminate = someSelectableFilteredSelected;
      masterCheckboxRef.current.checked = allSelectableFilteredSelected;
    }
  }, [allSelectableFilteredSelected, someSelectableFilteredSelected]);

  // Toggle single user selection
  const handleToggleUser = (userIdToToggle: string) => {
    const candidate = facilityEmployees.find((u) => u.id === userIdToToggle);
    if (candidate && isUserAlreadyAssigned(candidate)) return;

    if (isEditMode) {
      setUserId(userIdToToggle);
      setSelectedUserIds([userIdToToggle]);
      return;
    }

    if (selectedUserIds.includes(userIdToToggle)) {
      setSelectedUserIds(selectedUserIds.filter((uid) => uid !== userIdToToggle));
    } else {
      setSelectedUserIds([...selectedUserIds, userIdToToggle]);
    }
  };

  // Master checkbox toggle
  const handleMasterCheckboxToggle = () => {
    if (allSelectableFilteredSelected) {
      const selectableIds = new Set(selectableFiltered.map((u) => u.id));
      setSelectedUserIds(selectedUserIds.filter((id) => !selectableIds.has(id)));
    } else {
      const newIds = selectableFiltered.map((u) => u.id);
      setSelectedUserIds(Array.from(new Set([...selectedUserIds, ...newIds])));
    }
  };

  // Select all currently filtered users (excluding already-assigned users)
  const handleSelectAllFiltered = () => {
    const newIds = selectableFiltered.map((u) => u.id);
    setSelectedUserIds(Array.from(new Set([...selectedUserIds, ...newIds])));
  };

  // Clear all selections
  const handleClearSelection = () => {
    setSelectedUserIds([]);
  };

  const orgOptions: SearchableOption[] = useMemo(
    () =>
      orgList.map((org) => ({
        value: org.id,
        label: org.name,
        sublabel: org.code,
        avatarText: String(org.name || '?').slice(0, 2).toUpperCase(),
        avatarColor:
          org.id === '00000000-0000-0000-0000-000000000000'
            ? 'bg-[#0F172A]'
            : 'bg-indigo-600',
      })),
    [orgList]
  );

  const roleOptions: SearchableOption[] = useMemo(
    () =>
      availableOrgRoles.map((r) => ({
        value: r.id,
        label: `${r.name} (${r.code})`,
        sublabel: r.organizationId
          ? `Tenant Role • ${r.description}`
          : `System Role • ${r.description}`,
        badge: r.isSystem ? 'SYSTEM' : 'CUSTOM',
      })),
    [availableOrgRoles]
  );

  // Department options for SearchableSelect (matches Organization filter component)
  const departmentOptions: SearchableOption[] = useMemo(() => {
    const options: SearchableOption[] = [
      {
        value: 'All',
        label: 'All Departments',
        sublabel: `${facilityEmployees.length} total members in facility`,
        avatarText: 'ALL',
        avatarColor: 'bg-[#0F172A]',
      },
    ];

    facilityDepartments.forEach((dept) => {
      const countInDept = facilityEmployees.filter(
        (u) => u.dept.toLowerCase() === dept.name.toLowerCase()
      ).length;
      options.push({
        value: dept.name,
        label: dept.name,
        sublabel: dept.code
          ? `${dept.code} • ${countInDept} member${countInDept === 1 ? '' : 's'}`
          : `${countInDept} member${countInDept === 1 ? '' : 's'}`,
        badge: `${countInDept}`,
        avatarText: (dept.code || dept.name.slice(0, 2)).toUpperCase(),
        avatarColor: 'bg-slate-700',
      });
    });

    return options;
  }, [facilityDepartments, facilityEmployees]);

  // Submit handler (supports batch multi-user assignment)
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSuccessMessage(null);

    const targetIds = isEditMode ? [userId] : selectedUserIds;
    if (targetIds.length === 0 || !roleId || !tenantId) return;

    try {
      let result: UserRoleItem;
      if (isEditMode && id) {
        result = await updateRole(id, {
          tenantId,
          userId,
          roleId,
          isActive,
        });
      } else {
        const promises = targetIds.map((uId) =>
          assignRole({
            tenantId,
            userId: uId,
            roleId,
            isActive: true,
          })
        );
        const results = await Promise.all(promises);
        result = results[0];
      }

      setSuccessMessage(
        isEditMode
          ? 'User role assignment updated successfully.'
          : `Security role "${activeRole.name}" successfully assigned to ${targetIds.length} team member${
              targetIds.length > 1 ? 's' : ''
            }.`
      );

      if (onSuccess) {
        onSuccess(result);
      } else {
        setTimeout(() => {
          handleBack();
        }, 1200);
      }
    } catch {
      // Handled by mutation hook error state
    }
  };

  if (isEditMode && isLoadingItem) {
    return (
      <div className="p-16 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-[#6B7280]">
          <Loader2 className="w-6 h-6 animate-spin text-[#0F172A] dark:text-white" />
          <span className="text-xs font-medium">Loading user role details...</span>
        </div>
      </div>
    );
  }

  const isFormValid =
    Boolean(roleId) && Boolean(tenantId) && selectedUserIds.length > 0;

  // Unassigned counter for prompt indicators
  const unassignedInFacilityCount = facilityEmployees.filter(
    (u) => !u.currentRole || u.currentRole === 'Unassigned'
  ).length;

  return (
    <div className="space-y-6 pb-20 text-[#111827] dark:text-white max-w-7xl mx-auto">
      {/* ================================================================== */}
      {/* 1. PAGE HEADER & NAVIGATION BAR                                    */}
      {/* ================================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#E5E7EB] dark:border-slate-800">
        <div>
          {/* Breadcrumb Navigation */}
          <div className="flex items-center space-x-2 mb-1.5">
            <button
              type="button"
              onClick={handleBack}
              className="text-xs font-semibold text-[#6B7280] hover:text-[#111827] dark:hover:text-white transition-colors cursor-pointer flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-0.5" />
              <span>Roles</span>
            </button>
            <span className="text-xs text-[#CBD5E1] dark:text-slate-700">/</span>
            <button
              type="button"
              onClick={handleBack}
              className="text-xs font-semibold text-[#6B7280] hover:text-[#111827] dark:hover:text-white transition-colors cursor-pointer"
            >
              Role Directory
            </button>
            <span className="text-xs text-[#CBD5E1] dark:text-slate-700">/</span>
            <span className="text-xs font-semibold text-[#111827] dark:text-slate-200">
              {isEditMode ? 'Edit Assignment' : 'Assign Users to Role'}
            </span>
          </div>

          <h1 className="text-2xl font-bold text-[#111827] dark:text-white tracking-tight flex items-center gap-2">
            <span>{isEditMode ? 'Edit Assignment' : 'Assign Users to Role'}</span>
          </h1>
          <p className="text-xs text-[#6B7280] dark:text-slate-400 mt-1">
            Assign a target security role to one or multiple users simultaneously within a facility.
          </p>
        </div>

        {/* Header Actions (Top Right) */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={handleBack}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={() => handleSubmit()}
            disabled={isSubmitting || !isFormValid}
            isLoading={isSubmitting}
            leftIcon={<ShieldCheck className="w-4 h-4" />}
          >
            {selectedUserIds.length > 1
              ? `Assign Role to ${selectedUserIds.length} Users`
              : selectedUserIds.length === 1
              ? 'Assign Role to 1 User'
              : 'Assign Role'}
          </Button>
        </div>
      </div>

      {/* Notifications / Alerts */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-medium flex items-center gap-2.5 shadow-2xs">
          <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {(mutationError || loadError) && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-medium flex items-center gap-2.5 shadow-2xs">
          <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0" />
          <span>{mutationError || loadError}</span>
        </div>
      )}

      {/* ================================================================== */}
      {/* 2. FORM WORKSPACE                                                  */}
      {/* ================================================================== */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ================================================================ */}
        {/* STEP 1: ROLE CONFIGURATION & SCOPE                               */}
        {/* ================================================================ */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-[#E5E7EB] dark:border-slate-800 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3.5 border-b border-[#E5E7EB] dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-md bg-[#0F172A] text-white text-[11px] font-bold flex items-center justify-center font-mono">
                01
              </span>
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#111827] dark:text-slate-200">
                  Role Configuration &amp; Facility Scope
                </h2>
                <p className="text-[11px] text-[#6B7280] dark:text-slate-400">
                  Step 1 • Select security role template and facility organization boundary
                </p>
              </div>
            </div>
            <Badge variant="neutral" size="sm">
              Step 1 of 2
            </Badge>
          </div>

          {/* Two-Column Responsive Grid */}
          <div
            className={`grid grid-cols-1 ${
              isEditMode ? 'md:grid-cols-3' : 'md:grid-cols-2'
            } gap-5`}
          >
            {/* 1. Security Role (Required - Foreign Key Filtered by Facility) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#111827] dark:text-slate-200">
                Security Role <span className="text-rose-500">*</span>
              </label>
              <SearchableSelect
                value={roleId}
                onChange={(val) => setRoleId(val)}
                searchPlaceholder="Search roles..."
                options={roleOptions}
              />
              <p className="text-[11px] text-[#6B7280] dark:text-slate-400">
                Roles available for {activeOrg.name} (system roles &amp; tenant custom roles).
              </p>
            </div>

            {/* 2. Facility Organization Scope (Required) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#111827] dark:text-slate-200">
                Facility / Organization Scope <span className="text-rose-500">*</span>
              </label>
              <SearchableSelect
                value={tenantId}
                onChange={handleTenantChange}
                searchPlaceholder="Search facilities..."
                options={orgOptions}
              />
              <p className="text-[11px] text-[#6B7280] dark:text-slate-400">
                Selected facility defines the tenant boundary for roles and employees.
              </p>
            </div>

            {/* Operational Status (Edit Mode Only) */}
            {isEditMode && (
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#111827] dark:text-slate-200">
                  Assignment Status
                </label>
                <div className="grid grid-cols-2 gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={() => setIsActive(true)}
                    className={`h-9 px-3 rounded-lg text-xs font-medium border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      isActive
                        ? 'border-[#0F172A] bg-[#0F172A] text-white shadow-xs'
                        : 'border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#475569] hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-[#22A06B]" />
                    <span>Active</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsActive(false)}
                    className={`h-9 px-3 rounded-lg text-xs font-medium border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      !isActive
                        ? 'border-[#0F172A] bg-[#0F172A] text-white shadow-xs'
                        : 'border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#475569] hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-[#DC6262]" />
                    <span>Inactive</span>
                  </button>
                </div>
                <p className="text-[11px] text-[#6B7280] dark:text-slate-400">
                  Inactive roles remain bound but cannot exercise permissions.
                </p>
              </div>
            )}
          </div>

          {/* Selected Role Preview Panel */}
          <div className="p-4 rounded-xl bg-[#F8FAFC] dark:bg-slate-800/60 border border-[#E5E7EB] dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-[#E5E7EB] dark:border-slate-700 text-[#0F172A] dark:text-white flex items-center justify-center font-mono font-bold text-sm shadow-2xs flex-shrink-0">
                {activeRole.code?.slice(0, 2) || 'RO'}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm text-[#111827] dark:text-white">
                    {activeRole.name}
                  </span>
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-[#E5E7EB] dark:border-slate-700 text-[#475569] dark:text-slate-300 font-semibold">
                    {activeRole.code}
                  </span>
                  <Badge variant="neutral" size="sm">
                    {activeRole.isSystem ? 'SYSTEM' : 'CUSTOM'}
                  </Badge>
                  <span className="text-[11px] text-[#6B7280] dark:text-slate-400 font-medium">
                    Security Role
                  </span>
                </div>
                <p className="text-xs text-[#6B7280] dark:text-slate-400 mt-1 line-clamp-2">
                  {activeRole.description}
                </p>
                <div className="flex items-center gap-1.5 mt-2 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Applies to all selected members</span>
                </div>
              </div>
            </div>

            <div className="text-right flex-shrink-0 text-[11px] text-[#475569] dark:text-slate-400 font-medium sm:border-l sm:border-[#E5E7EB] sm:dark:border-slate-700 sm:pl-4">
              <div className="flex items-center gap-1.5 sm:justify-end text-[#6B7280] dark:text-slate-400">
                <Building2 className="w-3.5 h-3.5" />
                <span>Selected Facility</span>
              </div>
              <div className="font-semibold text-xs text-[#111827] dark:text-white mt-0.5">
                {activeOrg.name}
              </div>
              <div className="text-[10px] text-[#6B7280] dark:text-slate-400 mt-0.5">
                {unassignedInFacilityCount} unassigned member{unassignedInFacilityCount === 1 ? '' : 's'}
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================ */}
        {/* STEP 2: SELECT TEAM MEMBERS WORKSPACE                            */}
        {/* ================================================================ */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-[#E5E7EB] dark:border-slate-800 shadow-xs overflow-hidden">
          {/* Header & Filter Toolbar */}
          <div className="p-5 border-b border-[#E5E7EB] dark:border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-md bg-[#0F172A] text-white text-[11px] font-bold flex items-center justify-center font-mono">
                  02
                </span>
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[#111827] dark:text-slate-200">
                    Select Team Members
                  </h2>
                  <p className="text-[11px] text-[#6B7280] dark:text-slate-400">
                    Step 2 • Choose one or multiple organization members who will receive this role
                  </p>
                </div>
              </div>

              {/* Selection Information and Actions */}
              <div className="flex items-center gap-2.5 self-start sm:self-auto">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-[#F1F5F9] dark:bg-slate-800 text-[#0F172A] dark:text-white border border-[#E2E8F0] dark:border-slate-700 font-mono">
                  {selectedUserIds.length} selected
                </span>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAllFiltered}
                  disabled={selectableFiltered.length === 0}
                  leftIcon={<CheckCheck className="w-3.5 h-3.5" />}
                  title="Select all filtered candidates who do not already have this role"
                >
                  Select All Filtered
                </Button>

                {selectedUserIds.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleClearSelection}
                    leftIcon={<X className="w-3.5 h-3.5" />}
                    className="text-[#6B7280] hover:text-rose-600"
                  >
                    Clear Selection
                  </Button>
                )}
              </div>
            </div>

            {/* Filter Toolbar: 3 Functional Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              {/* 1. Search Input - Strictly Person Name per Instruction */}
              <div className="sm:col-span-12 md:col-span-5 relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280] pointer-events-none" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search by person name..."
                  className="w-full min-h-[42px] pl-9 pr-8 text-xs rounded-xl border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#111827] dark:text-white placeholder-[#6B7280] focus:outline-none focus:ring-1 focus:ring-[#0F172A] dark:focus:ring-white transition-all font-sans shadow-2xs"
                />
                {userSearch && (
                  <button
                    type="button"
                    onClick={() => setUserSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-[#6B7280] hover:text-[#111827] dark:hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* 2. Facility Department Dropdown (SearchableSelect - exact same dropdown as Organization filter) */}
              <div className="sm:col-span-6 md:col-span-4">
                <SearchableSelect
                  value={selectedDeptFilter}
                  onChange={(val) => setSelectedDeptFilter(val || 'All')}
                  placeholder="All Departments"
                  searchPlaceholder="Search facility departments..."
                  options={departmentOptions}
                  disabled={isLoadingDepartments}
                />
              </div>

              {/* 3. Role Status Filter */}
              <div className="sm:col-span-6 md:col-span-3">
                <select
                  value={roleStatusFilter}
                  onChange={(e) =>
                    setRoleStatusFilter(e.target.value as 'ALL' | 'UNASSIGNED' | 'ASSIGNED')
                  }
                  className="w-full min-h-[42px] px-3 text-xs rounded-xl border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#111827] dark:text-white focus:outline-none focus:ring-1 focus:ring-[#0F172A] transition-all cursor-pointer font-sans shadow-2xs"
                >
                  <option value="ALL">All Role Statuses</option>
                  <option value="UNASSIGNED">No Role (Unassigned)</option>
                  <option value="ASSIGNED">Already Has a Role</option>
                </select>
              </div>
            </div>

            {/* Quick Context Banner when "No Role (Unassigned)" filter is active */}
            {roleStatusFilter === 'UNASSIGNED' && (
              <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#F8FAFC] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-xs text-[#475569] dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <UserX className="w-3.5 h-3.5 text-[#0F172A] dark:text-slate-200" />
                  <span className="font-semibold text-[#111827] dark:text-white">
                    Showing unassigned members only:
                  </span>
                  <span>
                    {filteredUsers.length} employee{filteredUsers.length === 1 ? '' : 's'} with no role assigned yet.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setRoleStatusFilter('ALL')}
                  className="text-[11px] text-[#6B7280] hover:text-[#111827] dark:hover:text-white underline cursor-pointer"
                >
                  Show all
                </button>
              </div>
            )}
          </div>

          {/* Team Member Selection Data Table */}
          <div className="overflow-x-auto max-h-[380px] overflow-y-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#F8FAFC] dark:bg-slate-800/80 border-b border-[#E5E7EB] dark:border-slate-700 text-[11px] font-bold uppercase tracking-wider text-[#6B7280] dark:text-slate-400 sticky top-0 z-10 select-none">
                <tr>
                  <th className="py-3 px-3 text-center w-12">
                    <label className="inline-flex items-center justify-center cursor-pointer">
                      <input
                        ref={masterCheckboxRef}
                        type="checkbox"
                        disabled={selectableFiltered.length === 0}
                        checked={allSelectableFilteredSelected}
                        onChange={handleMasterCheckboxToggle}
                        className="w-4 h-4 rounded text-[#0F172A] focus:ring-[#0F172A] border-[#D1D5DB] dark:border-slate-600 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      />
                    </label>
                  </th>
                  <th className="py-3 px-4">Team Member</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Current Role</th>
                  <th className="py-3 px-4 text-right">Selection</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] dark:divide-slate-800 text-xs">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-12 text-center text-[#6B7280] dark:text-slate-400"
                    >
                      <Users className="w-8 h-8 mx-auto mb-2 opacity-40 stroke-[1.5]" />
                      <p className="font-semibold text-xs text-[#111827] dark:text-slate-200">
                        No team members found
                      </p>
                      <p className="text-[11px] text-[#9CA3AF] mt-0.5">
                        {userSearch.trim()
                          ? `No person named "${userSearch}" found in this selection.`
                          : roleStatusFilter === 'UNASSIGNED'
                          ? 'All team members in this selection already have assigned roles.'
                          : 'Try adjusting the department or role filter.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isSelected = selectedUserIds.includes(u.id);
                    const alreadyAssigned = isUserAlreadyAssigned(u);
                    const isUnassigned = !u.currentRole || u.currentRole === 'Unassigned';

                    const initials =
                      u.name
                        .split(' ')
                        .map((p) => p[0])
                        .filter(Boolean)
                        .slice(0, 2)
                        .join('')
                        .toUpperCase() || 'U';

                    return (
                      <tr
                        key={u.id}
                        onClick={() => {
                          if (!alreadyAssigned) handleToggleUser(u.id);
                        }}
                        className={`transition-colors select-none ${
                          alreadyAssigned
                            ? 'opacity-60 bg-slate-50/50 dark:bg-slate-900/40 cursor-not-allowed'
                            : isSelected
                            ? 'bg-[#0F172A]/5 dark:bg-slate-800/70 border-l-3 border-[#0F172A] dark:border-white font-medium cursor-pointer'
                            : 'hover:bg-[#F8FAFC] dark:hover:bg-slate-800/40 border-l-3 border-transparent cursor-pointer'
                        }`}
                      >
                        {/* Checkbox */}
                        <td
                          className="py-3 px-3 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={alreadyAssigned}
                            onChange={() => {
                              if (!alreadyAssigned) handleToggleUser(u.id);
                            }}
                            title={
                              alreadyAssigned
                                ? 'User already has this role'
                                : undefined
                            }
                            className={`w-4 h-4 rounded text-[#0F172A] focus:ring-[#0F172A] border-[#D1D5DB] dark:border-slate-600 ${
                              alreadyAssigned
                                ? 'cursor-not-allowed opacity-40'
                                : 'cursor-pointer'
                            }`}
                          />
                        </td>

                        {/* Team Member Identity */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-[#0F172A] text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-[#111827] dark:text-white truncate text-xs flex items-center gap-1.5">
                                <span>{u.name}</span>
                                {isUnassigned && (
                                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                                    No Role
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-[#6B7280] dark:text-slate-400 font-mono truncate">
                                {u.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Department Badge */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[#F1F5F9] dark:bg-slate-800 border border-[#E5E7EB] dark:border-slate-700 text-[#475569] dark:text-slate-300">
                            {u.dept}
                          </span>
                        </td>

                        {/* Current Role */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          {isUnassigned ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                              Unassigned
                            </span>
                          ) : (
                            <Badge variant="neutral" size="sm">
                              {u.currentRole}
                            </Badge>
                          )}
                        </td>

                        {/* Selection Status Indicator */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {alreadyAssigned ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-[#F1F5F9] dark:bg-slate-800 text-[#64748B] dark:text-slate-400 border border-[#E2E8F0] dark:border-slate-700">
                              <Check className="w-3 h-3 text-[#64748B]" />
                              <span>Already Assigned</span>
                            </span>
                          ) : isSelected ? (
                            <div className="inline-flex items-center gap-2 text-[12px] font-medium text-[#111827] dark:text-slate-200">
                              <span className="w-2 h-2 rounded-full bg-[#22A06B]" />
                              <span>Selected</span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-2 text-[12px] font-medium text-[#6B7280] dark:text-slate-400">
                              <span className="w-2 h-2 rounded-full bg-[#94A3B8]" />
                              <span>Unselected</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Selected Users Chip Tray (Visible only when >= 1 user selected) */}
          {selectedUserObjects.length > 0 && (
            <div className="p-4 bg-[#FBFBFC] dark:bg-slate-800/40 border-t border-[#E5E7EB] dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-[#111827] dark:text-white">
                    Selected Team Members
                  </h3>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#0F172A] text-white font-mono">
                    {selectedUserObjects.length} Member{selectedUserObjects.length === 1 ? '' : 's'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="text-[11px] text-[#6B7280] hover:text-rose-600 transition-colors font-medium cursor-pointer"
                >
                  Clear all
                </button>
              </div>

              <div className="flex flex-wrap gap-2 pt-1 max-h-28 overflow-y-auto custom-scrollbar">
                {selectedUserObjects.map((u) => (
                  <span
                    key={u.id}
                    className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-lg text-xs bg-white dark:bg-slate-800 border border-[#E5E7EB] dark:border-slate-700 text-[#111827] dark:text-white shadow-2xs"
                  >
                    <span className="font-medium">{u.name}</span>
                    <button
                      type="button"
                      onClick={() => handleToggleUser(u.id)}
                      className="p-0.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                      title={`Remove ${u.name}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ================================================================ */}
        {/* 4. BOTTOM STICKY ACTION BAR                                      */}
        {/* ================================================================ */}
        <div className="sticky bottom-0 z-20 -mx-4 -mb-16 mt-8 px-6 py-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-[#E5E7EB] dark:border-slate-800 shadow-lg rounded-b-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Assignment Summary (Left) */}
          <div>
            <div className="text-sm font-bold text-[#111827] dark:text-white flex items-center gap-2">
              <span>
                {selectedUserIds.length} Team Member
                {selectedUserIds.length === 1 ? '' : 's'} Selected
              </span>
              {selectedUserIds.length > 0 && (
                <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                  Ready to assign
                </span>
              )}
            </div>
            <div className="text-xs text-[#6B7280] dark:text-slate-400 mt-0.5">
              For role: <span className="font-semibold text-[#111827] dark:text-slate-200">{activeRole.name}</span>
              <span className="mx-1.5">•</span>
              Facility: <span className="font-semibold text-[#111827] dark:text-slate-200">{activeOrg.name}</span>
            </div>
          </div>

          {/* Action Buttons (Right) */}
          <div className="flex items-center gap-2.5 self-end sm:self-auto flex-shrink-0">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={handleBack}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={isSubmitting || !isFormValid}
              isLoading={isSubmitting}
              leftIcon={<ShieldCheck className="w-4 h-4" />}
            >
              {selectedUserIds.length > 1
                ? `Assign Role to ${selectedUserIds.length} Users`
                : selectedUserIds.length === 1
                ? 'Assign Role to 1 User'
                : 'Assign Role'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default UserRoleFormPage;
