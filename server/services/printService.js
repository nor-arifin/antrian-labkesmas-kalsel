import { getDb } from '../db/connection.js';

export function generateTicket(queueId) {
  const db = getDb();
  const queue = db.prepare(`
    SELECT q.*, s.name as service_name, s.prefix
    FROM queues q
    JOIN services s ON q.service_id = s.id
    WHERE q.id = ?
  `).get(queueId);

  if (!queue) throw new Error('Queue not found');

  const clinicName = db.prepare("SELECT value FROM settings WHERE key = 'clinic_name'").get()?.value || 'LABKESDA KALTENG';

  const waitingCount = db.prepare(`
    SELECT COUNT(*) as count FROM queues
    WHERE service_id = ? AND status = 'waiting' AND created_at < ?
  `).get(queue.service_id, queue.created_at)?.count || 0;

  const estMinutes = waitingCount * 5;

  const now = new Date();
  const dateStr = now.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

  const priorityText = queue.priority === 1 ? 'Lansia' : queue.priority === 2 ? 'Ibu Hamil' : 'Tidak';

  const CHARS = 48;
  const name = clinicName.length > CHARS ? clinicName.slice(0, CHARS) : clinicName;

  const lines = [
    { text: '', align: 'center', bold: false, size: [1,1] },
    { text: name, align: 'center', bold: true, size: [1,1] },
    { text: '================================', align: 'center', bold: false, size: [1,1] },
    { text: '', align: 'center', bold: false, size: [1,1] },
    { text: queue.queue_number, align: 'center', bold: true, size: [3,3] },
    { text: '', align: 'center', bold: false, size: [1,1] },
    { text: `Layanan   : ${queue.service_name}`, align: 'left', bold: false, size: [1,1] },
    { text: `Prioritas : ${priorityText}`, align: 'left', bold: false, size: [1,1] },
    { text: `Antrian di depan : ${waitingCount} orang`, align: 'left', bold: false, size: [1,1] },
    { text: `Estimasi tunggu  : ~${estMinutes} menit`, align: 'left', bold: false, size: [1,1] },
    { text: '', align: 'center', bold: false, size: [1,1] },
    { text: '================================', align: 'center', bold: false, size: [1,1] },
    { text: `${dateStr}  ${timeStr}`, align: 'center', bold: false, size: [1,1] },
  ];

  return { lines, queue };
}
