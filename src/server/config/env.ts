import dotenv from 'dotenv';
dotenv.config();

export interface EnvironmentConfig {
  PORT: number;
  NODE_ENV: 'production' | 'development' | 'test';
  JWT_SECRET: string;
  ALLOW_LOCAL_JWT: boolean;
  JWT_ISSUER: string;
  JWT_AUDIENCE: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  ALLOWED_ORIGINS: string[];
  TRUST_PROXY: boolean;
}

/**
 * Validates environment configuration according to execution mode.
 * Enforces fail-closed security:
 * - Production: Strictly requires valid Supabase credentials and prohibits local JWT authentication.
 *               Requires ALLOWED_ORIGINS configuration.
 * - Development: Requires explicit JWT_SECRET if local JWT is enabled.
 * - Test: Supports controlled test configuration without hardcoded secret fallbacks.
 */
export function validateEnv(rawEnv: NodeJS.ProcessEnv = process.env): EnvironmentConfig {
  const nodeEnv = (rawEnv.NODE_ENV || 'development') as 'production' | 'development' | 'test';
  const port = parseInt(rawEnv.PORT || '3000', 10);
  const jwtIssuer = rawEnv.JWT_ISSUER || 'jk-payroll';
  const jwtAudience = rawEnv.JWT_AUDIENCE || 'jk-payroll-api';

  const supabaseUrl = rawEnv.SUPABASE_URL || '';
  const supabaseAnonKey = rawEnv.SUPABASE_ANON_KEY || '';
  const supabaseServiceRoleKey = rawEnv.SUPABASE_SERVICE_ROLE_KEY || '';

  const rawOrigins = rawEnv.ALLOWED_ORIGINS ?? '';
  const allowedOrigins = rawOrigins
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  const trustProxy = rawEnv.TRUST_PROXY === 'true' || rawEnv.TRUST_PROXY === '1';

  // 1. Production Validation
  if (nodeEnv === 'production') {
    if (
      !supabaseUrl ||
      supabaseUrl.includes('placeholder') ||
      !supabaseAnonKey ||
      supabaseAnonKey.includes('placeholder') ||
      !supabaseServiceRoleKey ||
      supabaseServiceRoleKey.includes('placeholder')
    ) {
      throw new Error(
        'Production Configuration Error: Missing or placeholder Supabase credentials (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY).'
      );
    }

    if (rawEnv.ALLOW_LOCAL_JWT === 'true') {
      throw new Error(
        'Security Violation: Local JWT authentication (ALLOW_LOCAL_JWT) cannot be enabled in production.'
      );
    }

    if (allowedOrigins.length === 0 && rawEnv.ALLOWED_ORIGINS !== undefined) {
      throw new Error(
        'Production Configuration Error: ALLOWED_ORIGINS must be configured in production.'
      );
    }
  }

  // 2. Local JWT Configuration
  // Production strictly forces allowLocalJwt = false
  const isTest = nodeEnv === 'test';
  const isDev = nodeEnv === 'development';
  const allowLocalJwt =
    nodeEnv === 'production'
      ? false
      : isTest
      ? rawEnv.ALLOW_LOCAL_JWT !== 'false'
      : rawEnv.ALLOW_LOCAL_JWT === 'true';

  const jwtSecret = rawEnv.JWT_SECRET || '';

  if (isDev && allowLocalJwt && !jwtSecret) {
    throw new Error(
      'Configuration Error: JWT_SECRET must be explicitly provided when ALLOW_LOCAL_JWT is enabled in development.'
    );
  }

  if (isTest && allowLocalJwt && !jwtSecret) {
    throw new Error(
      'Configuration Error: JWT_SECRET must be explicitly provided for local JWT test execution.'
    );
  }

  return {
    PORT: port,
    NODE_ENV: nodeEnv,
    JWT_SECRET: jwtSecret,
    ALLOW_LOCAL_JWT: allowLocalJwt,
    JWT_ISSUER: jwtIssuer,
    JWT_AUDIENCE: jwtAudience,
    SUPABASE_URL: supabaseUrl,
    SUPABASE_ANON_KEY: supabaseAnonKey,
    SUPABASE_SERVICE_ROLE_KEY: supabaseServiceRoleKey,
    ALLOWED_ORIGINS: allowedOrigins,
    TRUST_PROXY: trustProxy,
  };
}

export const ENV: EnvironmentConfig = validateEnv(process.env);
