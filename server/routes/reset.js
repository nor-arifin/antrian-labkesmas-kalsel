import { Router } from 'express';
import { resetQueues } from '../services/queueManager.js';

export default function resetRoutes(io) {
  const router = Router();

  router.post('/reset', (req, res) => {
    try {
      resetQueues();
      io.emit('system:reset', { message: 'Antrian di-reset manual' });
      res.json({ data: { success: true, message: 'Queues reset' } });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
