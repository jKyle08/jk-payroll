// ==============================================================================
// JK-PAYROLL: LIVE SUPABASE SEED EXECUTION SCRIPT
// File: scripts/seed-live-supabase.ts
// ==============================================================================

import { getSupabaseClient, getSupabaseAnonClient } from '../src/server/db/supabase.js';

interface UserToSeed {
  email: string;
  password: string;
  fullName: string;
  username: string;
  title: string;
  orgId: string;
  deptId?: string | null;
  isSuperAdmin: boolean;
  isOrgAdmin: boolean;
  roleId?: string | null;
}

const ROOT_ORG_ID = '00000000-0000-0000-0000-000000000000';
const APEX_ORG_ID = '00000000-0000-0000-0000-000000000001';
const APEX_DEPT_ID = 'd0000000-0000-0000-0000-000000000001';
const APEX_ORG_ADMIN_ROLE_ID = 'f0000000-0000-0000-0000-000000000004';

async function seed() {
  console.log('🚀 Connecting to Supabase live instance...');
  const client = getSupabaseClient();
  const anonClient = getSupabaseAnonClient();

  // 1. Seed Organizations
  console.log('1️⃣ Seeding organizations...');
  const orgs = [
    {
      id: ROOT_ORG_ID,
      code: 'ROOT',
      slug: 'root',
      name: 'SuperAdmin Platform',
      industry: 'Technology & Software',
      tier: 'Enterprise',
      sector: 'Private',
      domain: 'jkpayroll.com',
      status: 'Active',
      is_active: true,
      start_date: '2024-01-01T00:00:00Z',
      end_date: null,
    },
    {
      id: APEX_ORG_ID,
      code: 'APEX-HLTH',
      slug: 'apex-hlth',
      name: 'Apex Health Systems',
      industry: 'Healthcare & Life Sciences',
      tier: 'Enterprise',
      sector: 'Private',
      domain: 'apexcorp.com',
      status: 'Active',
      is_active: true,
      start_date: '2024-01-15T00:00:00Z',
      end_date: '2029-12-31T23:59:59Z',
    },
  ];

  for (const org of orgs) {
    const { error } = await client.from('organizations').upsert(org, { onConflict: 'id' });
    if (error) console.error(`Error seeding org ${org.code}:`, error.message);
    else console.log(`  ✓ Organization ${org.name} (${org.code}) ready.`);
  }

  // 2. Seed Departments
  console.log('2️⃣ Seeding departments...');
  const depts = [
    {
      id: APEX_DEPT_ID,
      organization_id: APEX_ORG_ID,
      parent_department_id: null,
      code: 'OPG',
      name: 'Office of the Provincial Governor',
      description: 'Executive governance, administrative oversight and strategic cabinet',
      depth: 0,
      tree_path: 'opg',
      is_active: true,
    },
  ];

  for (const dept of depts) {
    const { error } = await client.from('departments').upsert(dept, { onConflict: 'id' });
    if (error) console.error(`Error seeding dept ${dept.code}:`, error.message);
    else console.log(`  ✓ Department ${dept.name} (${dept.code}) ready.`);
  }

  // 3. Seed Roles
  console.log('3️⃣ Seeding roles...');
  const roles = [
    {
      id: 'f0000000-0000-0000-0000-000000000001',
      organization_id: null,
      code: 'SUPER_ADMIN',
      name: 'Platform Super Administrator',
      description: 'Full platform-level infrastructure control.',
      role_type: 'SYSTEM',
      is_default: true,
      is_mutable: false,
      is_active: true,
    },
    {
      id: 'f0000000-0000-0000-0000-000000000002',
      organization_id: null,
      code: 'ADMIN',
      name: 'System Administrator',
      description: 'Platform operator for infrastructure, integrations, and tenant diagnostics',
      role_type: 'SYSTEM',
      is_default: false,
      is_mutable: false,
      is_active: true,
    },
    {
      id: APEX_ORG_ADMIN_ROLE_ID,
      organization_id: APEX_ORG_ID,
      code: 'ORG_ADMIN',
      name: 'Organization Administrator',
      description: 'Full administrative management for Apex Health Systems',
      role_type: 'CUSTOM',
      is_default: false,
      is_mutable: true,
      is_active: true,
    },
  ];

  for (const role of roles) {
    const { error } = await client.from('roles').upsert(role, { onConflict: 'id' });
    if (error) console.error(`Error seeding role ${role.code}:`, error.message);
    else console.log(`  ✓ Role ${role.code} (${role.name}) ready.`);
  }

  // 4. Seed Modules & Entitlements
  console.log('4️⃣ Seeding organization modules & department modules...');
  const { data: allModules } = await client.from('modules').select('id, code').eq('is_active', true);
  if (allModules && allModules.length > 0) {
    const orgModules = allModules.map((m) => ({
      organization_id: APEX_ORG_ID,
      module_id: m.id,
    }));
    await client.from('organization_modules').upsert(orgModules, { onConflict: 'organization_id,module_id' });
    console.log(`  ✓ Allocated ${orgModules.length} modules to Apex Health Systems.`);

    const deptModules = allModules.map((m) => ({
      organization_id: APEX_ORG_ID,
      department_id: APEX_DEPT_ID,
      module_id: m.id,
    }));
    await client.from('department_modules').upsert(deptModules, { onConflict: 'organization_id,department_id,module_id' });
    console.log(`  ✓ Cascaded ${deptModules.length} modules to department OPG.`);
  }

  // Seed Role Permissions for ORG_ADMIN
  const { data: allActions } = await client.from('module_actions').select('id');
  if (allActions && allActions.length > 0) {
    const rolePerms = allActions.map((a) => ({
      organization_id: APEX_ORG_ID,
      role_id: APEX_ORG_ADMIN_ROLE_ID,
      module_action_id: a.id,
    }));
    await client.from('role_permissions').upsert(rolePerms, { onConflict: 'organization_id,role_id,module_action_id' });
    console.log(`  ✓ Granted ${rolePerms.length} permissions to role ORG_ADMIN.`);
  }

  // 5. Seed Users & Identities in Auth + Profiles + Memberships
  console.log('5️⃣ Provisioning Auth accounts, Profiles & Organization Memberships...');
  const usersToSeed: UserToSeed[] = [
    {
      email: 'superadmin@paypulse.internal',
      password: 'SuperAdmin2026!',
      fullName: 'Super Administrator',
      username: 'superadmin',
      title: 'Chief Systems Architect',
      orgId: ROOT_ORG_ID,
      deptId: null,
      isSuperAdmin: true,
      isOrgAdmin: true,
      roleId: null,
    },
    {
      email: 'superadmin@jkpayroll.com',
      password: 'SuperAdmin2026!',
      fullName: 'Super Administrator (JK)',
      username: 'superadmin_jk',
      title: 'Chief Systems Architect',
      orgId: ROOT_ORG_ID,
      deptId: null,
      isSuperAdmin: true,
      isOrgAdmin: true,
      roleId: null,
    },
    {
      email: 'admin@apexcorp.com',
      password: 'ApexAdmin2026!',
      fullName: 'Alexander Wright',
      username: 'awright',
      title: 'Administrator',
      orgId: APEX_ORG_ID,
      deptId: APEX_DEPT_ID,
      isSuperAdmin: false,
      isOrgAdmin: true,
      roleId: APEX_ORG_ADMIN_ROLE_ID,
    },
    {
      email: 'admin@apexhealth.com',
      password: 'ApexAdmin2026!',
      fullName: 'Dr. Aris Thorne',
      username: 'athorne',
      title: 'Chief Operating Officer',
      orgId: APEX_ORG_ID,
      deptId: APEX_DEPT_ID,
      isSuperAdmin: false,
      isOrgAdmin: true,
      roleId: APEX_ORG_ADMIN_ROLE_ID,
    },
  ];

  // List existing users
  const { data: userList } = await client.auth.admin.listUsers();
  const existingUsersByEmail = new Map<string, string>();
  if (userList?.users) {
    for (const u of userList.users) {
      if (u.email) existingUsersByEmail.set(u.email.toLowerCase(), u.id);
    }
  }

  for (const u of usersToSeed) {
    let userId = existingUsersByEmail.get(u.email.toLowerCase());

    if (!userId) {
      // Create user
      const { data: created, error: createErr } = await client.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
        user_metadata: { full_name: u.fullName },
      });
      if (createErr || !created.user) {
        console.error(`Failed to create auth user ${u.email}:`, createErr?.message);
        continue;
      }
      userId = created.user.id;
      console.log(`  ✓ Created Auth User: ${u.email} (ID: ${userId})`);
    } else {
      // Update password & confirm email
      const { error: updateErr } = await client.auth.admin.updateUserById(userId, {
        password: u.password,
        email_confirm: true,
        user_metadata: { full_name: u.fullName },
      });
      if (updateErr) {
        console.error(`Failed to update auth user ${u.email}:`, updateErr.message);
      } else {
        console.log(`  ✓ Updated Auth User & Password: ${u.email} (ID: ${userId})`);
      }
    }

    // Upsert Profile
    const { error: profileErr } = await client.from('profiles').upsert(
      {
        id: userId,
        organization_id: u.orgId,
        department_id: u.deptId,
        full_name: u.fullName,
        email: u.email,
        username: u.username,
        title: u.title,
        is_organization_admin: u.isOrgAdmin,
        is_super_admin: u.isSuperAdmin,
        is_active: true,
      },
      { onConflict: 'id' }
    );
    if (profileErr) console.error(`Error saving profile for ${u.email}:`, profileErr.message);
    else console.log(`  ✓ Profile synchronized for ${u.email}`);

    // Upsert Organization Membership
    const { error: memberErr } = await client.from('organization_members').upsert(
      {
        organization_id: u.orgId,
        user_id: userId,
        role_id: u.roleId,
        department_id: u.deptId,
        is_owner: u.isOrgAdmin,
        is_active: true,
      },
      { onConflict: 'organization_id,user_id' }
    );
    if (memberErr) console.error(`Error saving membership for ${u.email}:`, memberErr.message);
    else console.log(`  ✓ Organization membership created for ${u.email}`);

    // Upsert User Role (if role assigned)
    if (u.roleId) {
      const { error: userRoleErr } = await client.from('user_roles').upsert(
        {
          organization_id: u.orgId,
          user_id: userId,
          role_id: u.roleId,
        },
        { onConflict: 'organization_id,user_id' }
      );
      if (userRoleErr) console.error(`Error saving user role for ${u.email}:`, userRoleErr.message);
      else console.log(`  ✓ User role assigned for ${u.email}`);
    }
  }

  // 6. Test Live Authentication for each persona
  console.log('\n6️⃣ Verifying live login authentication...');
  for (const u of usersToSeed) {
    const { data: authData, error: authError } = await anonClient.auth.signInWithPassword({
      email: u.email,
      password: u.password,
    });
    if (authError || !authData.user) {
      console.error(`  ❌ Login failed for ${u.email}:`, authError?.message);
    } else {
      console.log(`  ✅ Login SUCCESS for ${u.email} (Token issued: ${authData.session?.access_token ? 'YES' : 'NO'})`);
    }
  }

  console.log('\n🎉 Live database seeding completed successfully!');
}

seed().catch((err) => {
  console.error('Fatal seeding error:', err);
  process.exit(1);
});
