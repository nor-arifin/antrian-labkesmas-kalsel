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

    const byCounter = db.prepare(`
      SELECT
        c.name as counter_name,
        COUNT(*) as total,
        SUM(CASE WHEN q.status = 'done' THEN 1 ELSE 0 END) as completed,
        ROUND(AVG(CASE WHEN q.done_at IS NOT NULL AND q.served_at IS NOT NULL
          THEN (julianday(q.done_at) - julianday(q.served_at)) * 24 * 60
        END), 1) as avg_service_minutes,
        ROUND(AVG(CASE WHEN q.served_at IS NOT NULL AND q.called_at IS NOT NULL
          THEN (julianday(q.served_at) - julianday(q.called_at)) * 24 * 60
        END), 1) as avg_wait_called_minutes
      FROM queues q
      LEFT JOIN counters c ON q.counter_id = c.id
      WHERE date(q.created_at) = ? AND q.counter_id IS NOT NULL
      GROUP BY q.counter_id
      ORDER BY c.name
    `).all(date);

    const summary = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
        ROUND(AVG(CASE WHEN done_at IS NOT NULL
          THEN (julianday(done_at) - julianday(created_at)) * 24 * 60
        END), 1) as avg_wait_minutes,
        ROUND(AVG(CASE WHEN done_at IS NOT NULL AND served_at IS NOT NULL
          THEN (julianday(done_at) - julianday(served_at)) * 24 * 60
        END), 1) as avg_service_minutes,
        ROUND(AVG(CASE WHEN served_at IS NOT NULL AND called_at IS NOT NULL
          THEN (julianday(served_at) - julianday(called_at)) * 24 * 60
        END), 1) as avg_wait_called_minutes
      FROM queues WHERE date(created_at) = ?
    `).get(date);

    res.json({ data: { date, summary, byService: stats, byCounter } });
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

router.get('/report/daily-detail', (req, res) => {
  try {
    const db = getDb();
    const date = req.query.date || new Date().toISOString().slice(0, 10);

    const queues = db.prepare(`
      SELECT
        q.queue_number,
        s.name as service_name,
        CASE
          WHEN q.priority = 3 THEN 'Cito'
          WHEN q.priority = 1 THEN 'Lansia'
          WHEN q.priority = 2 THEN 'Ibu Hamil'
          ELSE 'Normal'
        END as priority_label,
        c.name as counter_name,
        q.created_at,
        q.called_at,
        q.served_at,
        q.done_at,
        q.status,
        CASE WHEN q.called_at IS NOT NULL
          THEN ROUND((julianday(q.called_at) - julianday(q.created_at)) * 24 * 60, 1)
        END as wait_created_to_called,
        CASE WHEN q.served_at IS NOT NULL AND q.called_at IS NOT NULL
          THEN ROUND((julianday(q.served_at) - julianday(q.called_at)) * 24 * 60, 1)
        END as wait_called_to_served,
        CASE WHEN q.done_at IS NOT NULL AND q.served_at IS NOT NULL
          THEN ROUND((julianday(q.done_at) - julianday(q.served_at)) * 24 * 60, 1)
        END as service_duration
      FROM queues q
      JOIN services s ON q.service_id = s.id
      LEFT JOIN counters c ON q.counter_id = c.id
      WHERE date(q.created_at) = ?
      ORDER BY q.created_at
    `).all(date);

    res.json({ data: { date, queues } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
