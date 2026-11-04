import express from 'express';
import cors from 'cors';
import { apiRouter } from './routes/index.js';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(express.static('public'));

  // Mount API router
  app.use('/api', apiRouter);

  // Global 404 handler
  app.use((req, res) => {
    res.status(404).json({ error: `Route ${req.method} ${req.url} not found` });
  });

  return app;
}
