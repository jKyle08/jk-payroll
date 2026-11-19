// ==============================================================================
// JK-PAYROLL: SERVER EXPRESS APPLICATION FACTORY
// File: src/server/app.ts
// ==============================================================================

import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { apiRouter } from './routes/index.js';
import { ENV } from './config/env.js';

export function createApp(options?: { configureTestRoutes?: (app: express.Application) => void }) {
  const app = express();

  // 1. Trust Proxy Configuration
  // When running behind a reverse proxy (e.g. AWS ALB, Cloudflare, NGINX), TRUST_PROXY must be enabled
  if (ENV.TRUST_PROXY || process.env.TRUST_PROXY === 'true' || process.env.TRUST_PROXY === '1') {
    app.set('trust proxy', 1);
  } else {
    app.set('trust proxy', false);
  }

  // 2. Production Security Headers
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '0');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    if (process.env.NODE_ENV === 'production' || ENV.NODE_ENV === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
  });

  // 3. Environment-Driven CORS Configuration
  const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (process.env.NODE_ENV === 'production' && allowedOrigins.length === 0) {
    throw new Error('ALLOWED_ORIGINS must be configured in production');
  }

  const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
      // Allow non-browser requests (e.g. Supertest, server-to-server, cURL without Origin header)
      if (!origin) {
        return callback(null, true);
      }

      if (process.env.NODE_ENV !== 'production') {
        // Development / Test mode: allow localhost loopback or explicitly configured origins
        if (
          /^http:\/\/localhost(:\d+)?$/.test(origin) ||
          /^http:\/\/127\.0\.0\.1(:\d+)?$/.test(origin) ||
          allowedOrigins.includes(origin)
        ) {
          return callback(null, true);
        }
      } else {
        // Production: strict whitelist enforcement (no localhost fallback)
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
      }

      return callback(
        new Error(`CORS Error: Origin '${origin}' is not allowed by ALLOWED_ORIGINS whitelist`)
      );
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
      'x-tenant-id',
      'x-organization-id',
    ],
    exposedHeaders: ['Content-Range', 'X-Total-Count'],
    maxAge: 86400, // 24-hour preflight cache
  };

  app.use(cors(corsOptions));

  // 4. Request Body Size Limits & Parsers
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // 5. Root Health-Check Endpoint
  app.get('/health', (_req, res) => {
    res.status(200).json({
      status: 'healthy',
      environment: process.env.NODE_ENV || ENV.NODE_ENV,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  if (options?.configureTestRoutes) {
    options.configureTestRoutes(app);
  }

  // 6. Mount API router
  app.use('/api', apiRouter);

  // 7. Serve compiled React frontend
  const clientDist = path.resolve('dist/client');
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    // SPA fallback: any non-API GET request serves React index.html
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path === '/health') return next();
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  // 8. Global 404 handler for API routes
  app.use((req, res) => {
    res.status(404).json({ error: `Route ${req.method} ${req.url} not found` });
  });

  // 9. Centralized Error Sanitization Handler
  app.use(
    (
      err: any,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      const status = err.status || err.statusCode || 500;
      const isProd = process.env.NODE_ENV === 'production';

      if (err.message && err.message.includes('CORS Error')) {
        res.status(403).json({
          success: false,
          error: 'Access denied: origin not allowed by CORS policy',
        });
        return;
      }

      const message =
        isProd && status === 500
          ? 'Internal Server Error'
          : err.message || 'Internal Server Error';

      res.status(status).json({
        success: false,
        error: message,
        ...(isProd ? {} : { stack: err.stack }),
      });
    }
  );

  return app;
}

export default createApp;
