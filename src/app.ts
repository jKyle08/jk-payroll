import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { apiRouter } from './routes/index.js';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Mount API router first
  app.use('/api', apiRouter);

  // Serve compiled React frontend
  const clientDist = path.resolve('dist/client');
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    // SPA fallback: any non-API GET request serves React index.html
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  // Global 404 handler for API routes
  app.use((req, res) => {
    res.status(404).json({ error: `Route ${req.method} ${req.url} not found` });
  });

  return app;
}
