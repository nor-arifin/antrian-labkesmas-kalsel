import { Router } from 'express';
import { getDb } from '../db/connection.js';

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

  return router;
}
