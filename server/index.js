process.env.TZ = process.env.TZ || 'Asia/Pontianak';

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

const __dirname = typeof globalThis.__dirname !== 'undefined'
  ? globalThis.__dirname
  : dirname(fileURLToPath(import.meta.url));

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

app.use(cors());
app.use(express.json());

const isProd = process.env.NODE_ENV === 'production';

const publicDir = process.env.PUBLIC_DIR || join(__dirname, '..', 'public');
const videoDir = process.env.VIDEO_DIR || join(publicDir, 'videos');
const staticDir = process.env.STATIC_DIR || join(__dirname, '..', 'public', 'static');

app.use('/audio', express.static(join(publicDir, 'audio')));
app.use('/logo', express.static(join(publicDir, 'logo'), { maxAge: '1d' }));
app.use('/videos', express.static(videoDir, { maxAge: '1h' }));

if (isProd) {
  app.use(express.static(staticDir));
}

app.use('/api', queueRoutes(io));
app.use('/api', serviceRoutes);
app.use('/api', counterRoutes(io));
app.use('/api', reportRoutes);
app.use('/api', printRoutes(io));
app.use('/api', settingsRoutes(io));

if (isProd) {
  app.get('/sw.js', (req, res) => {
    res.set('Cache-Control', 'no-cache');
    res.sendFile(join(staticDir, 'sw.js'));
  });

  app.get('*', (req, res) => {
    res.sendFile(join(staticDir, 'index.html'));
  });
}

setupSocket(io);

const PORT = process.env.PORT === '0' ? 0 : (process.env.PORT || 3001);

async function start() {
  await initDB();
  seedDB();
  startScheduler(io);

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${server.address().port}`);
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

export { server, app };
