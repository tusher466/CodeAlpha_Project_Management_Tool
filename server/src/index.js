import express from 'express';
import http from 'node:http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import { initDatabase } from './db/database.js';
import { seedDatabase } from './db/seed.js';
import { setupSocketIO } from './sockets/socketHandler.js';

import authRouter from './routes/auth.js';
import createProjectsRouter from './routes/projects.js';
import createColumnsRouter from './routes/columns.js';
import createTasksRouter from './routes/tasks.js';
import createCommentsRouter from './routes/comments.js';
import createNotificationsRouter from './routes/notifications.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// Cross-origin setup
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const socketService = setupSocketIO(io);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount Routes
app.use('/api/auth', authRouter);
app.use('/api/projects', createProjectsRouter(socketService));
app.use('/api', createColumnsRouter(socketService));
app.use('/api', createTasksRouter(socketService));
app.use('/api', createCommentsRouter(socketService));
app.use('/api/notifications', createNotificationsRouter());

// Serve client dist if built
const clientDistPath = path.join(__dirname, '../../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

const PORT = process.env.PORT || 5000;

// Initialize Database & Start Server
async function start() {
  try {
    initDatabase();
    await seedDatabase();

    server.listen(PORT, () => {
      console.log(`===============================================`);
      console.log(`🚀 TaskPulse Collaborative Server running on port ${PORT}`);
      console.log(`📡 WebSocket server listening on ws://localhost:${PORT}`);
      console.log(`===============================================`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();

