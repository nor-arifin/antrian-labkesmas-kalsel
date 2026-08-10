import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { initDB } from './db/connection.js';
import { seedDB } from './db/seed.js';
import queueRoutes from './routes/queue.js';
import serviceRoutes from './routes/service.js';
import counterRoutes from './routes/counter.js';
import reportRoutes from './routes/report.js';
import printRoutes from './routes/print.js';
import settingsRoutes from './routes/settings.js';
import { setupSocket } from './socket/handlers.js';
import { startScheduler } from './services/scheduler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

app.use(cors());
app.use(express.json());

const isProd = process.env.NODE_ENV === 'production';

if (isProd) {
  app.use(express.static(join(__dirname, '..', 'public', 'static')));
  app.use('/audio', express.static(join(__dirname, '..', 'public', 'audio')));
}

app.use('/api', queueRoutes(io));
app.use('/api', serviceRoutes);
app.use('/api', counterRoutes(io));
app.use('/api', reportRoutes);
app.use('/api', printRoutes(io));
app.use('/api', settingsRoutes(io));

if (isProd) {
  app.get('*', (req, res) => {
    res.sendFile(join(__dirname, '..', 'public', 'static', 'index.html'));
  });
}

setupSocket(io);

const PORT = process.env.PORT || 3001;

async function start() {
  await initDB();
  seedDB();
  startScheduler(io);

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
