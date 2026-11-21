// Shared embedded-PostgreSQL (PGlite) harness for security integration tests.
// NOTE: this is an EMBEDDED PostgreSQL engine, not the Supabase staging database.
import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
import path from 'node:path';

const SUPABASE_BASELINE_SQL = `
  CREATE SCHEMA IF NOT EXISTS auth;
  CREATE TABLE IF NOT EXISTS auth.users (
    id UUID PRIMARY KEY,
    email TEXT,
    confirmation_token TEXT DEFAULT '',
    recovery_token TEXT DEFAULT '',
    email_change_token_new TEXT DEFAULT '',
    email_change TEXT DEFAULT '',
    email_change_token_current TEXT DEFAULT '',
    phone_change TEXT DEFAULT '',
    phone_change_token TEXT DEFAULT '',
    reauthentication_token TEXT DEFAULT '',
    raw_app_meta_data JSONB DEFAULT '{}'::jsonb,
    raw_user_meta_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT clock_timestamp()
  );
  CREATE TABLE IF NOT EXISTS auth.identities (
    id UUID, user_id UUID REFERENCES auth.users(id), provider_id TEXT,
    identity_data JSONB DEFAULT '{}'::jsonb, provider TEXT,
    last_sign_in_at TIMESTAMPTZ, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ,
    PRIMARY KEY (provider_id, provider)
  );
  CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID AS $$
    SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::UUID;
  $$ LANGUAGE sql STABLE;
  CREATE OR REPLACE FUNCTION auth.jwt() RETURNS JSONB AS $$
    SELECT COALESCE(NULLIF(current_setting('request.jwt.claims', true), '')::JSONB, '{}'::jsonb);
  $$ LANGUAGE sql STABLE;
  CREATE OR REPLACE FUNCTION auth.role() RETURNS TEXT AS $$
    SELECT COALESCE(NULLIF(current_setting('request.jwt.claim.role', true), ''), 'anon');
  $$ LANGUAGE sql STABLE;
  DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon; END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated; END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role; END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN CREATE ROLE supabase_auth_admin; END IF;
  END $$;
`;

/** Loads the Supabase-like baseline and applies migrations in filename order (optionally up to a file). */
export async function createMigratedDb(upToInclusive?: string): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(SUPABASE_BASELINE_SQL);

  const dir = path.resolve('supabase/migrations');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  for (const file of files) {
    let sql = fs.readFileSync(path.join(dir, file), 'utf8');
    // wasm build has no uuid-ossp/pgcrypto contrib; gen_random_uuid() is built in.
    sql = sql.replace(/CREATE\s+EXTENSION\s+IF\s+NOT\s+EXISTS\s+["']?(uuid-ossp|pgcrypto)["']?;?/gi, '-- extension skipped');
    if (file === '20261104000002_functions_and_rls.sql') {
      // migration 2 references organizations.is_active which migration 12 adds later (pre-existing ordering quirk)
      await db.exec(`ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;`);
    }
    await db.exec(sql);
    if (upToInclusive && file === upToInclusive) break;
  }
  // Mirror Supabase defaults for service_role (BYPASSRLS + full table/function rights).
  await db.exec(`
    ALTER ROLE service_role BYPASSRLS;
    GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
    GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
  `);
  return db;
}

export type DbRole = 'anon' | 'authenticated' | 'service_role';

export function session(db: PGlite) {
  return {
    /** Superuser/owner context (migrations, function owner). */
    async owner() {
      await db.exec(`SET ROLE postgres;`);
      await db.exec(`SET request.jwt.claim.sub = '';`);
      await db.exec(`SET request.jwt.claim.role = 'service_role';`);
      await db.exec(`SET request.jwt.claims = '{}';`);
    },
    async as(userId: string | null, role: DbRole = 'authenticated', appMetadata: Record<string, any> = {}) {
      await db.exec(`SET ROLE postgres;`);
      await db.exec(`SET ROLE ${role};`);
      await db.exec(`SET request.jwt.claim.sub = '${userId ?? ''}';`);
      await db.exec(`SET request.jwt.claim.role = '${role}';`);
      await db.exec(`SET request.jwt.claims = '${JSON.stringify({ sub: userId, role, app_metadata: appMetadata }).replace(/'/g, "''")}';`);
    },
  };
}

export async function expectRejected(fn: () => Promise<unknown>, pattern: RegExp): Promise<void> {
  let message: string | null = null;
  try {
    await fn();
  } catch (e: any) {
    message = String(e?.message ?? e);
  }
  if (message === null) throw new Error(`Expected statement to be rejected (${pattern}) but it succeeded`);
  if (!pattern.test(message)) throw new Error(`Rejected with unexpected error: ${message} (wanted ${pattern})`);
}
