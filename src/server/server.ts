// ==============================================================================
// JK-PAYROLL: SERVER ENTRY POINT & BOOTSTRAP
// File: src/server/server.ts
// ==============================================================================

import { createApp } from './app.js';
import { ENV, validateEnv } from './config/env.js';

// Enforce fail-fast startup validation
try {
  validateEnv();
} catch (error: any) {
  console.error('Fatal Startup Error: Configuration validation failed:', error.message);
  process.exit(1);
}

const app = createApp();

const server = app.listen(ENV.PORT, () => {
  console.log(`JK Payroll RBAC Server listening on http://localhost:${ENV.PORT}`);
  console.log(`Environment: ${ENV.NODE_ENV}`);
});

// Graceful shutdown handling for container and process orchestrators
const gracefulShutdown = (signal: string) => {
  console.log(`Received ${signal}. Initiating graceful shutdown...`);
  server.close(() => {
    console.log('HTTP server closed successfully. Process terminating cleanly.');
    process.exit(0);
  });

  // Fail-safe force exit timeout
  setTimeout(() => {
    console.error('Graceful shutdown timeout (10s) exceeded. Forcing process termination.');
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
