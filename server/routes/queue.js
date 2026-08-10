import { Router } from 'express';
import * as qm from '../services/queueManager.js';
import { buildAudioSequence, getAudioFiles } from '../services/audioService.js';
import { getDb } from '../db/connection.js';

export default function queueRoutes(io) {
  const router = Router();

  router.post('/queue/take', (req, res) => {
    try {
      const { serviceId, priority = 0 } = req.body;
      if (!serviceId) return res.status(400).json({ error: 'serviceId required' });

      const queue = qm.takeQueue(serviceId, priority);
      io.emit('queue:created', { queue });
      io.emit('stats:updated', { stats: qm.getQueueStats() });

      res.json({ data: queue });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/queue/next/:counterId', (req, res) => {
    try {
      const queue = qm.getNextQueue(parseInt(req.params.counterId));
      if (!queue) return res.json({ data: null, message: 'No queue available' });

      const audio = buildAudioSequence(queue);
      io.emit('queue:calling', { queue, audio: getAudioFiles(audio) });
      io.emit('counter:updated', { counterId: req.params.counterId });
      io.emit('stats:updated', { stats: qm.getQueueStats() });

      res.json({ data: queue, audio: getAudioFiles(audio) });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.put('/queue/:id/status', (req, res) => {
    try {
      const { status } = req.body;
      if (!['calling', 'serving', 'done', 'skip', 'cancelled'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }

      const queue = qm.updateQueueStatus(parseInt(req.params.id), status);
      io.emit('queue:updated', { queue });
      io.emit('stats:updated', { stats: qm.getQueueStats() });

      if (queue.counter_id) {
        io.emit('counter:updated', { counterId: queue.counter_id });
      }

      res.json({ data: queue });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/queue/active', (req, res) => {
    try {
      const queues = qm.getActiveQueues();
      res.json({ data: queues });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/queue/stats', (req, res) => {
    try {
      const stats = qm.getQueueStats();
      res.json({ data: stats });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/queue/history/:counterId', (req, res) => {
    try {
      const db = getDb();
      const rows = db.prepare(`
        SELECT q.*, s.name as service_name, s.color as service_color
        FROM queues q
        JOIN services s ON q.service_id = s.id
        WHERE q.counter_id = ? AND q.status IN ('done', 'skip')
        ORDER BY q.done_at DESC
        LIMIT 10
      `).all(parseInt(req.params.counterId));
      res.json({ data: rows });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
