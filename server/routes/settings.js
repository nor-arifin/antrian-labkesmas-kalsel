import { Router } from 'express';
import { getDb } from '../db/connection.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = typeof globalThis.__dirname !== 'undefined'
  ? globalThis.__dirname
  : dirname(fileURLToPath(import.meta.url));

const VIDEO_DIR = process.env.VIDEO_DIR || join(__dirname, '..', '..', 'public', 'videos');

fs.mkdirSync(VIDEO_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, VIDEO_DIR),
  filename: (req, file, cb) => cb(null, 'display-video.mp4')
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'video/mp4') cb(null, true);
    else cb(new Error('Hanya file MP4 yang diizinkan'));
  }
});

function deleteOldVideo() {
  const files = fs.readdirSync(VIDEO_DIR).filter(f => f.endsWith('.mp4'));
  files.forEach(f => fs.unlinkSync(path.join(VIDEO_DIR, f)));
}

function getVideoFile() {
  const files = fs.readdirSync(VIDEO_DIR).filter(f => f.endsWith('.mp4'));
  return files.length > 0 ? files[0] : null;
}

export default function settingsRoutes(io) {
  const router = Router();

  router.get('/settings', (req, res) => {
    try {
      const db = getDb();
      const rows = db.prepare('SELECT * FROM settings').all();
      const settings = {};
      for (const row of rows) {
        settings[row.key] = row.value;
      }
      const videoFile = getVideoFile();
      settings.video_url = videoFile ? `/videos/${videoFile}` : null;
      res.json({ data: settings });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.put('/settings', (req, res) => {
    try {
      const db = getDb();
      const { key, value } = req.body;
      if (!key) return res.status(400).json({ error: 'key required' });

      db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value || '');
      io.emit('settings:updated', { key, value: value || '' });
      res.json({ data: { key, value: value || '' } });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/settings/video', upload.single('video'), (req, res) => {
    try {
      const db = getDb();
      db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run('video_enabled', '1');
      io.emit('settings:updated', { key: 'video_enabled', value: '1' });
      res.json({ data: { video_url: `/videos/${req.file.filename}` } });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.delete('/settings/video', (req, res) => {
    try {
      const db = getDb();
      deleteOldVideo();
      db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run('video_enabled', '0');
      io.emit('settings:updated', { key: 'video_enabled', value: '0' });
      res.json({ data: { video_url: null } });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
