import { getDb } from '../db/connection.js';

export function generateQueueNumber(serviceId) {
  const db = getDb();
  const service = db.prepare('SELECT prefix FROM services WHERE id = ?').get(serviceId);
  if (!service) throw new Error('Service not found');

  const today = new Date().toISOString().slice(0, 10);
  const last = db.prepare(`
    SELECT queue_number FROM queues
    WHERE service_id = ?
      AND date(created_at) = ?
      AND status != 'cancelled'
    ORDER BY id DESC LIMIT 1
  `).get(serviceId, today);

  let seq = 1;
  if (last) {
    const num = parseInt(last.queue_number.slice(1), 10);
    seq = num + 1;
  }

  return `${service.prefix}${String(seq).padStart(3, '0')}`;
}

export function takeQueue(serviceId, priority = 0) {
  const db = getDb();
  const queueNumber = generateQueueNumber(serviceId);

  const stmt = db.prepare(`
    INSERT INTO queues (queue_number, service_id, priority, status)
    VALUES (?, ?, ?, 'waiting')
  `);

  const result = stmt.run(queueNumber, serviceId, priority);
  return db.prepare('SELECT * FROM queues WHERE id = ?').get(result.lastInsertRowid);
}

export function getNextQueue(counterId) {
  const db = getDb();
  const counter = db.prepare('SELECT * FROM counters WHERE id = ?').get(counterId);
  if (!counter) throw new Error('Counter not found');

  const queue = db.prepare(`
    SELECT * FROM queues
    WHERE status = 'waiting' AND service_id = ?
    ORDER BY priority DESC, created_at ASC
    LIMIT 1
  `).get(counter.service_id);

  if (!queue) return null;

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE queues SET status = 'calling', counter_id = ?, called_at = ? WHERE id = ?
  `).run(counterId, now, queue.id);

  db.prepare('UPDATE counters SET current_queue_id = ? WHERE id = ?').run(queue.id, counterId);

  return db.prepare('SELECT * FROM queues WHERE id = ?').get(queue.id);
}

export function updateQueueStatus(id, status) {
  const db = getDb();
  const now = new Date().toISOString();

  if (status === 'serving') {
    db.prepare('UPDATE queues SET status = ?, served_at = ? WHERE id = ?').run(status, now, id);
  } else if (status === 'done') {
    db.prepare('UPDATE queues SET status = ?, done_at = ? WHERE id = ?').run(status, now, id);
  } else {
    db.prepare('UPDATE queues SET status = ? WHERE id = ?').run(status, id);
  }

  if (status === 'done' || status === 'skip') {
    const queue = db.prepare('SELECT counter_id FROM queues WHERE id = ?').get(id);
    if (queue?.counter_id) {
      db.prepare('UPDATE counters SET current_queue_id = NULL WHERE id = ?').run(queue.counter_id);
    }
  }

  return db.prepare('SELECT * FROM queues WHERE id = ?').get(id);
}

export function getActiveQueues() {
  const db = getDb();
  return db.prepare(`
    SELECT q.*, s.name as service_name, s.color as service_color, c.name as counter_name
    FROM queues q
    JOIN services s ON q.service_id = s.id
    LEFT JOIN counters c ON q.counter_id = c.id
    WHERE q.status IN ('waiting', 'calling', 'serving')
    ORDER BY q.priority DESC, q.created_at ASC
  `).all();
}

export function getQueueStats() {
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);
  return db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'waiting' THEN 1 ELSE 0 END) as waiting,
      SUM(CASE WHEN status IN ('calling', 'serving') THEN 1 ELSE 0 END) as serving,
      SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as done,
      SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
      ROUND(AVG(CASE WHEN done_at IS NOT NULL
        THEN (julianday(done_at) - julianday(created_at)) * 24 * 60
      END), 1) as avg_wait_minutes
    FROM queues
    WHERE date(created_at) = ?
  `).get(today);
}

export function resetQueues() {
  const db = getDb();
  db.prepare(`
    UPDATE queues SET status = 'cancelled'
    WHERE status IN ('waiting', 'calling')
  `).run();
  db.prepare('UPDATE counters SET current_queue_id = NULL').run();
}
