import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { initDb, getDbHealth, closeDatabases } from './src/db.js';
import apiRouter from './src/routes/api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Health Check Endpoints (for Render, Docker, and monitoring)
const handleHealthCheck = async (req, res) => {
  const dbStatus = await getDbHealth();
  const statusCode = dbStatus.healthy ? 200 : 503;
  res.status(statusCode).json({
    status: dbStatus.healthy ? 'healthy' : 'unhealthy',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production',
    db: dbStatus
  });
};

app.get('/api/health', handleHealthCheck);
app.get('/healthz', handleHealthCheck);

// Primary API mount under /api, plus root mount for base URLs without /api prefix
app.use('/api', apiRouter);
app.use('/', apiRouter);

// Serve static frontend build if present (e.g. single-service deployments on Render)
const distPath = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/login') || req.path === '/healthz') return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

const PORT = process.env.PORT || 5001;

let server;
initDb().then(() => {
  server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT} (0.0.0.0)`);
  });
}).catch(err => {
  console.error("Failed to initialize database:", err);
  process.exit(1);
});

// Graceful Shutdown on Render / Container restarts
const shutdown = async (signal) => {
  console.log(`Received ${signal}. Gracefully terminating application...`);
  if (server) {
    server.close(async () => {
      console.log('HTTP server closed.');
      await closeDatabases();
      console.log('SQLite database connections closed cleanly.');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

