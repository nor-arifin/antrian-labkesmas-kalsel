import { Router } from 'express';
import { getDb } from '../db/connection.js';

export default function counterRoutes(io) {
  const router = Router();

  router.get('/counter', (req, res) => {
    try {
      const db = getDb();
      const counters = db.prepare(`
        SELECT c.*, s.name as service_name, s.prefix as service_prefix, s.color as service_color
        FROM counters c
        LEFT JOIN services s ON c.service_id = s.id
        ORDER BY c.id
      `).all();
      res.json({ data: counters });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/counter', (req, res) => {
    try {
      const db = getDb();
      const { name, serviceId } = req.body;
      if (!name || !serviceId) return res.status(400).json({ error: 'name and serviceId required' });

      const result = db.prepare('INSERT INTO counters (name, service_id) VALUES (?, ?)').run(name, serviceId);
      const counter = db.prepare('SELECT * FROM counters WHERE id = ?').get(result.lastInsertRowid);
      io.emit('counter:updated', { counter });
      res.json({ data: counter });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.put('/counter/:id', (req, res) => {
    try {
      const db = getDb();
      const { name, serviceId, is_active } = req.body;
      const fields = [];
      const values = [];

      if (name !== undefined) { fields.push('name = ?'); values.push(name); }
      if (serviceId !== undefined) { fields.push('service_id = ?'); values.push(serviceId); }
      if (is_active !== undefined) { fields.push('is_active = ?'); values.push(is_active ? 1 : 0); }

      if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });

      values.push(req.params.id);
      db.prepare(`UPDATE counters SET ${fields.join(', ')} WHERE id = ?`).run(...values);
      const counter = db.prepare('SELECT * FROM counters WHERE id = ?').get(req.params.id);
      io.emit('counter:updated', { counter });
      res.json({ data: counter });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.delete('/counter/:id', (req, res) => {
    try {
      const db = getDb();
      db.prepare('DELETE FROM counters WHERE id = ?').run(req.params.id);
      res.json({ data: { deleted: true } });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.put('/counter/:id/break', (req, res) => {
    try {
      const db = getDb();
      const counter = db.prepare('SELECT * FROM counters WHERE id = ?').get(req.params.id);
      if (!counter) return res.status(404).json({ error: 'Counter not found' });

      const newStatus = counter.status === 'break' ? 'active' : 'break';
      db.prepare('UPDATE counters SET status = ? WHERE id = ?').run(newStatus, req.params.id);

      const updated = db.prepare(`
        SELECT c.*, s.name as service_name, s.prefix as service_prefix, s.color as service_color
        FROM counters c
        LEFT JOIN services s ON c.service_id = s.id
        WHERE c.id = ?
      `).get(req.params.id);

      io.emit('counter:updated', { counter: updated });
      res.json({ data: updated });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
