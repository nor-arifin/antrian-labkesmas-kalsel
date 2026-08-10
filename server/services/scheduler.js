import cron from 'node-cron';
import { resetQueues } from './queueManager.js';

export function startScheduler(io) {
  const resetHour = process.env.RESET_HOUR || 23;

  cron.schedule(`0 ${resetHour} * * *`, () => {
    console.log(`[${new Date().toISOString()}] Running daily reset...`);
    resetQueues();
    io.emit('system:reset', { message: 'Antrian harian di-reset' });
    console.log('Daily reset completed');
  });

  console.log(`Scheduler started: reset at ${resetHour}:00`);
}
