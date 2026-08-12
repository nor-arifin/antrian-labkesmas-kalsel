import { getDb } from '../db/connection.js';
import { readFileSync } from 'fs';
import { join } from 'path';

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

  const priorityText = queue.priority === 3 ? 'Cito' : queue.priority === 1 ? 'Lansia' : queue.priority === 2 ? 'Ibu Hamil' : 'Tidak';

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

export function generateTicketHTML(queueId) {
  const { queue } = generateTicket(queueId);

  const clinicName = getDb().prepare("SELECT value FROM settings WHERE key = 'clinic_name'").get()?.value || 'LABKESDA KALTENG';

  const waitingCount = getDb().prepare(`
    SELECT COUNT(*) as count FROM queues
    WHERE service_id = ? AND status = 'waiting' AND created_at < ?
  `).get(queue.service_id, queue.created_at)?.count || 0;

  const estMinutes = waitingCount * 5;

  const now = new Date();
  const dateStr = now.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

  const priorityText = queue.priority === 3 ? 'Cito' : queue.priority === 1 ? 'Lansia' : queue.priority === 2 ? 'Ibu Hamil' : 'Tidak';

  let logoBase64 = '';
  try {
    const logoPath = join(process.cwd(), 'public', 'logo', 'antian_logo.svg');
    const logoSvg = readFileSync(logoPath, 'utf8');
    logoBase64 = `data:image/svg+xml;base64,${Buffer.from(logoSvg).toString('base64')}`;
  } catch (e) {
    logoBase64 = '';
  }

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  @page { size: 80mm auto; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Courier New', Courier, monospace;
    font-size: 11px;
    line-height: 1.4;
    color: #000;
    width: 80mm;
    padding: 3mm;
  }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .large { font-size: 24px; }
  .logo { width: 50px; margin: 0 auto 2mm; display: block; }
  .divider { border-top: 1px dashed #000; margin: 3mm 0; }
  .row { display: flex; justify-content: space-between; }
  .label { color: #555; }
</style>
</head>
<body>
  <div class="center">
    ${logoBase64 ? `<img src="${logoBase64}" class="logo" />` : ''}
    <div class="bold">${clinicName}</div>
  </div>
  <div class="divider"></div>
  <div class="center bold large">${queue.queue_number}</div>
  <div class="divider"></div>
  <div>Layanan   : ${queue.service_name}</div>
  <div>Prioritas : ${priorityText}</div>
  <div>Antrian di depan : ${waitingCount} orang</div>
  <div>Estimasi tunggu  : ~${estMinutes} menit</div>
  <div class="divider"></div>
  <div class="center">${dateStr}  ${timeStr}</div>
</body>
</html>`;
}
