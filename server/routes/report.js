import { Router } from 'express';
import { getDb } from '../db/connection.js';

const router = Router();

router.get('/report/daily', (req, res) => {
  try {
    const db = getDb();
    const date = req.query.date || new Date().toISOString().slice(0, 10);

    const stats = db.prepare(`
      SELECT
        s.name as service_name, s.prefix, s.color,
        COUNT(*) as total,
        SUM(CASE WHEN q.status = 'done' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN q.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
        ROUND(AVG(CASE WHEN q.done_at IS NOT NULL
          THEN (julianday(q.done_at) - julianday(q.created_at)) * 24 * 60
        END), 1) as avg_wait_minutes
      FROM queues q
      JOIN services s ON q.service_id = s.id
      WHERE date(q.created_at) = ?
      GROUP BY s.id
      ORDER BY s.prefix
    `).all(date);

    const summary = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
        ROUND(AVG(CASE WHEN done_at IS NOT NULL
          THEN (julianday(done_at) - julianday(created_at)) * 24 * 60
        END), 1) as avg_wait_minutes
      FROM queues WHERE date(created_at) = ?
    `).get(date);

    res.json({ data: { date, summary, byService: stats } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/report/weekly', (req, res) => {
  try {
    const db = getDb();
    const end = req.query.end || new Date().toISOString().slice(0, 10);
    const start = req.query.start || new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);

    const daily = db.prepare(`
      SELECT
        date(created_at) as date,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as completed,
        ROUND(AVG(CASE WHEN done_at IS NOT NULL
          THEN (julianday(done_at) - julianday(created_at)) * 24 * 60
        END), 1) as avg_wait_minutes
      FROM queues
      WHERE date(created_at) BETWEEN ? AND ?
      GROUP BY date(created_at)
      ORDER BY date(created_at)
    `).all(start, end);

    res.json({ data: { start, end, daily } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/report/monthly', (req, res) => {
  try {
    const db = getDb();
    const month = req.query.month || new Date().getMonth() + 1;
    const year = req.query.year || new Date().getFullYear();
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

    const daily = db.prepare(`
      SELECT
        date(created_at) as date,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as completed,
        ROUND(AVG(CASE WHEN done_at IS NOT NULL
          THEN (julianday(done_at) - julianday(created_at)) * 24 * 60
        END), 1) as avg_wait_minutes
      FROM queues
      WHERE date(created_at) BETWEEN ? AND ?
      GROUP BY date(created_at)
      ORDER BY date(created_at)
    `).all(startDate, endDate);

    res.json({ data: { month, year, daily } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
