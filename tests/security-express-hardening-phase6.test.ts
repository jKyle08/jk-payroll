// ==============================================================================
// JK-PAYROLL: PHASE 6 EXPRESS PRODUCTION HARDENING TEST SUITE
// File: tests/security-express-hardening-phase6.test.ts
// Scope: CORS Whitelist, Trust Proxy, Security Headers, Health Checks & Error Sanitization
// ==============================================================================

import { describe, it, expect, afterEach, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/server/app.js';
import { validateEnv } from '../src/server/config/env.js';

describe('Phase 6 — Express Production Hardening Suite', () => {
  const originalEnv = { ...process.env };
  const dummySecret = 'test-secret-key-32chars-minimum-length-req';

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  // ============================================================================
  // 1. ENVIRONMENT CONFIGURATION & VALIDATION
  // ============================================================================
  describe('Environment Configuration & Validation (SEC-PHASE6-ENV)', () => {
    it('Production mode enforces ALLOWED_ORIGINS presence', () => {
      expect(() => {
        validateEnv({
          NODE_ENV: 'production',
          SUPABASE_URL: 'https://test-prod.supabase.co',
          SUPABASE_ANON_KEY: 'valid-anon-key',
          SUPABASE_SERVICE_ROLE_KEY: 'valid-service-role-key',
          ALLOWED_ORIGINS: '',
        });
      }).toThrow(/ALLOWED_ORIGINS must be configured in production/i);
    });

    it('Parses and trims comma-separated ALLOWED_ORIGINS correctly', () => {
      const config = validateEnv({
        NODE_ENV: 'test',
        JWT_SECRET: dummySecret,
        ALLOWED_ORIGINS: ' https://app.paypulse.io , https://admin.paypulse.io, ',
      });
      expect(config.ALLOWED_ORIGINS).toEqual([
        'https://app.paypulse.io',
        'https://admin.paypulse.io',
      ]);
    });

    it('Correctly parses TRUST_PROXY flag', () => {
      const configTrue = validateEnv({
        NODE_ENV: 'test',
        JWT_SECRET: dummySecret,
        TRUST_PROXY: 'true',
      });
      expect(configTrue.TRUST_PROXY).toBe(true);

      const configOne = validateEnv({
        NODE_ENV: 'test',
        JWT_SECRET: dummySecret,
        TRUST_PROXY: '1',
      });
      expect(configOne.TRUST_PROXY).toBe(true);

      const configFalse = validateEnv({
        NODE_ENV: 'test',
        JWT_SECRET: dummySecret,
        TRUST_PROXY: 'false',
      });
      expect(configFalse.TRUST_PROXY).toBe(false);
    });
  });

  // ============================================================================
  // 2. CORS PRODUCTION WHITELIST
  // ============================================================================
  describe('Production CORS Policy Enforcement (SEC-PHASE6-CORS)', () => {
    it('Allows non-browser requests without Origin header (e.g. cURL, internal RPC)', async () => {
      const app = createApp();
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
    });

    it('Allows requests from whitelisted production origin', async () => {
      process.env.NODE_ENV = 'production';
      process.env.ALLOWED_ORIGINS = 'https://payroll.paypulse.internal,https://app.paypulse.io';

      const app = createApp();
      const res = await request(app)
        .get('/health')
        .set('Origin', 'https://payroll.paypulse.internal');

      expect(res.status).toBe(200);
      expect(res.headers['access-control-allow-origin']).toBe('https://payroll.paypulse.internal');
      expect(res.headers['access-control-allow-credentials']).toBe('true');
    });

    it('Rejects requests from unapproved origins in production mode', async () => {
      process.env.NODE_ENV = 'production';
      process.env.ALLOWED_ORIGINS = 'https://app.paypulse.io';

      const app = createApp();
      const res = await request(app)
        .get('/health')
        .set('Origin', 'https://malicious-attacker.com');

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/Access denied.*origin not allowed by CORS policy/i);
    });

    it('Rejects localhost fallback in production mode', async () => {
      process.env.NODE_ENV = 'production';
      process.env.ALLOWED_ORIGINS = 'https://app.paypulse.io';

      const app = createApp();
      const res = await request(app)
        .get('/health')
        .set('Origin', 'http://localhost:3000');

      expect(res.status).toBe(403);
    });

    it('Handles CORS preflight OPTIONS request with credentials and allowed headers', async () => {
      process.env.NODE_ENV = 'production';
      process.env.ALLOWED_ORIGINS = 'https://app.paypulse.io';

      const app = createApp();
      const res = await request(app)
        .options('/api/auth/me')
        .set('Origin', 'https://app.paypulse.io')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type,Authorization,x-tenant-id');

      expect(res.status).toBe(204);
      expect(res.headers['access-control-allow-origin']).toBe('https://app.paypulse.io');
      expect(res.headers['access-control-allow-credentials']).toBe('true');
      expect(res.headers['access-control-allow-methods']).toContain('POST');
    });
  });

  // ============================================================================
  // 3. SECURITY HEADERS
  // ============================================================================
  describe('Security Headers Baseline', () => {
    it('Emits X-Content-Type-Options: nosniff', async () => {
      const app = createApp();
      const res = await request(app).get('/health');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
    });

    it('Emits X-Frame-Options: DENY', async () => {
      const app = createApp();
      const res = await request(app).get('/health');
      expect(res.headers['x-frame-options']).toBe('DENY');
    });

    it('Emits Referrer-Policy: strict-origin-when-cross-origin', async () => {
      const app = createApp();
      const res = await request(app).get('/health');
      expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    });

    it('Emits HSTS header in production mode', async () => {
      process.env.NODE_ENV = 'production';
      process.env.ALLOWED_ORIGINS = 'https://app.paypulse.io';

      const app = createApp();
      const res = await request(app).get('/health');
      expect(res.headers['strict-transport-security']).toBe('max-age=31536000; includeSubDomains');
    });
  });

  // ============================================================================
  // 4. HEALTH CHECK & MONITORING ENDPOINTS
  // ============================================================================
  describe('Health Check Endpoints', () => {
    it('Root /health returns uptime, status and timestamp', async () => {
      const app = createApp();
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
      expect(typeof res.body.uptime).toBe('number');
      expect(typeof res.body.timestamp).toBe('string');
    });

    it('/api/health returns status ok', async () => {
      const app = createApp();
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });

  // ============================================================================
  // 5. ERROR SANITIZATION & LEAK PREVENTION
  // ============================================================================
  describe('Error Sanitization & Secret Exposure Prevention', () => {
    it('Sanitizes 500 error responses in production to prevent stack traces', async () => {
      process.env.NODE_ENV = 'production';
      process.env.ALLOWED_ORIGINS = 'https://app.paypulse.io';

      const app = createApp({
        configureTestRoutes: (testApp) => {
          testApp.get('/test-error', () => {
            throw new Error('Database password failed: postgres://user:secretpass@host');
          });
        },
      });

      const res = await request(app).get('/test-error');
      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Internal Server Error');
      expect(res.body.stack).toBeUndefined();
      expect(JSON.stringify(res.body)).not.toContain('secretpass');
    });
  });
});
