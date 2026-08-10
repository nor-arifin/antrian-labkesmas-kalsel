import { Router } from 'express';
import { getDb } from '../db/connection.js';

const router = Router();

router.get('/service', (req, res) => {
  try {
    const db = getDb();
    const services = db.prepare('SELECT * FROM services ORDER BY prefix').all();
    res.json({ data: services });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/service', (req, res) => {
  try {
    const db = getDb();
    const { name, prefix, color = '#3B82F6' } = req.body;
    if (!name || !prefix) return res.status(400).json({ error: 'name and prefix required' });

    const result = db.prepare('INSERT INTO services (name, prefix, color) VALUES (?, ?, ?)').run(name, prefix.toUpperCase(), color);
    const service = db.prepare('SELECT * FROM services WHERE id = ?').get(result.lastInsertRowid);
    res.json({ data: service });
  } catch (err) {
    if (err.message?.includes('UNIQUE')) return res.status(400).json({ error: 'Prefix already exists' });
    res.status(500).json({ error: err.message });
  }
});

router.put('/service/:id', (req, res) => {
  try {
    const db = getDb();
    const { name, prefix, color, is_active } = req.body;
    const fields = [];
    const values = [];

    if (name !== undefined) { fields.push('name = ?'); values.push(name); }
    if (prefix !== undefined) { fields.push('prefix = ?'); values.push(prefix.toUpperCase()); }
    if (color !== undefined) { fields.push('color = ?'); values.push(color); }
    if (is_active !== undefined) { fields.push('is_active = ?'); values.push(is_active ? 1 : 0); }

    if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });

    values.push(req.params.id);
    db.prepare(`UPDATE services SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    const service = db.prepare('SELECT * FROM services WHERE id = ?').get(req.params.id);
    res.json({ data: service });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/service/:id', (req, res) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM services WHERE id = ?').run(req.params.id);
    res.json({ data: { deleted: true } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
