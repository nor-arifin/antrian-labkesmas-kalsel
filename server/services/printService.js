import { getDb } from '../db/connection.js';
import { readFileSync } from 'fs';
import { join } from 'path';
import sharp from 'sharp';

const LOGO_SVG_PATH = join(process.cwd(), 'public', 'logo', 'logoticket.svg');
const LOGO_WIDTH_PX = 384;

let _logoSvgBase64 = null;
let _logoBitmap = null;

async function loadLogoAssets() {
  if (_logoSvgBase64 && _logoBitmap) return;

  const svg = readFileSync(LOGO_SVG_PATH, 'utf8');
  _logoSvgBase64 = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;

  const { data, info } = await sharp(Buffer.from(svg))
    .resize(LOGO_WIDTH_PX)
    .greyscale()
    .normalise()
    .threshold(128)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const bytesPerRow = Math.ceil(info.width / 8);
  const padded = Buffer.alloc(bytesPerRow * info.height);
  for (let row = 0; row < info.height; row++) {
    for (let col = 0; col < info.width; col++) {
      const srcIdx = row * info.width + col;
      if (data[srcIdx] === 0) {
        const dstIdx = row * bytesPerRow + Math.floor(col / 8);
        padded[dstIdx] |= 0x80 >> (col % 8);
      }
    }
  }

  _logoBitmap = { width: info.width, height: info.height, bytes: padded };
}

export async function getLogoSvgBase64() {
  await loadLogoAssets();
  return _logoSvgBase64;
}

export async function getLogoBitmap() {
  await loadLogoAssets();
  return _logoBitmap;
}

export async function generateTicket(queueId) {
  const db = getDb();
  const queue = db.prepare(`
    SELECT q.*, s.name as service_name, s.prefix
    FROM queues q
    JOIN services s ON q.service_id = s.id
    WHERE q.id = ?
  `).get(queueId);

  if (!queue) throw new Error('Queue not found');

  const waitingCount = db.prepare(`
    SELECT COUNT(*) as count FROM queues
    WHERE service_id = ? AND status = 'waiting' AND created_at < ?
  `).get(queue.service_id, queue.created_at)?.count || 0;

  const now = new Date();
  const dateStr = now.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

  const priorityText = queue.priority === 3 ? 'Cito' : queue.priority === 1 ? 'Lansia' : queue.priority === 2 ? 'Ibu Hamil' : 'Tidak';

  const logoBitmap = await getLogoBitmap();

  const lines = [
    { type: 'image', bitmap: logoBitmap, align: 'center' },
    { text: '', align: 'center', bold: false, size: [1,1] },
    { text: '- - - - - - - - - - - - - - - - - - - - - - - - - -', align: 'center', bold: false, size: [1,1] },
    { text: '', align: 'center', bold: false, size: [1,1] },
    { text: queue.queue_number, align: 'center', bold: true, size: [4,4], prePad: 16, postPad: 16 },
    { text: '', align: 'center', bold: false, size: [1,1] },
    { text: `LAYANAN     : ${queue.service_name}`, align: 'left', bold: false, size: [1,1] },
    { text: `PRIORITAS   : ${priorityText}`, align: 'left', bold: false, size: [1,1] },
    { text: `ANTRIAN DI DEPAN : ${waitingCount} orang`, align: 'left', bold: false, size: [1,1] },
    { text: '', align: 'center', bold: false, size: [1,1] },
    { text: '- - - - - - - - - - - - - - - - - - - - - - - - - -', align: 'center', bold: false, size: [1,1] },
    { text: `${dateStr}  ${timeStr}`, align: 'center', bold: false, size: [1,1] },
    { text: '', align: 'center', bold: false, size: [1,1] },
    { text: 'Terima kasih atas kunjungan Anda', align: 'center', bold: false, size: [1,1] },
    { text: 'Simpan tiket sebagai bukti antrian', align: 'center', bold: false, size: [1,1] },
  ];

  return { lines, queue };
}

export async function generateTicketHTML(queueId) {
  const { queue } = await generateTicket(queueId);

  const waitingCount = getDb().prepare(`
    SELECT COUNT(*) as count FROM queues
    WHERE service_id = ? AND status = 'waiting' AND created_at < ?
  `).get(queue.service_id, queue.created_at)?.count || 0;

  const now = new Date();
  const dateStr = now.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

  const priorityText = queue.priority === 3 ? 'Cito' : queue.priority === 1 ? 'Lansia' : queue.priority === 2 ? 'Ibu Hamil' : 'Tidak';

  const logoBase64 = await getLogoSvgBase64();

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
  .logo {
    width: 80px;
    height: auto;
    margin: 0 auto 2mm;
    display: block;
  }
  .divider {
    border-top: 1px dashed #000;
    margin: 3mm 0;
    font-size: 10px;
    letter-spacing: 1px;
    color: #555;
  }
  .queue-number {
    font-size: 56px;
    font-weight: 900;
    letter-spacing: 4px;
    text-align: center;
    margin: 4mm 0;
    font-family: 'Courier New', Courier, monospace;
  }
  .field { margin: 1mm 0; font-size: 11px; }
  .footer {
    font-size: 10px;
    font-style: italic;
    text-align: center;
    margin-top: 1mm;
    color: #333;
  }
</style>
</head>
<body>
  <div class="center">
    ${logoBase64 ? `<img src="${logoBase64}" class="logo" />` : ''}
  </div>
  <div class="divider">- - - - - - - - - - - - - - -</div>
  <div class="queue-number">${queue.queue_number}</div>
  <div class="divider">- - - - - - - - - - - - - - -</div>
  <div class="field">LAYANAN     : ${queue.service_name}</div>
  <div class="field">PRIORITAS   : ${priorityText}</div>
  <div class="field">ANTRIAN DI DEPAN : ${waitingCount} orang</div>
  <div class="divider">- - - - - - - - - - - - - - -</div>
  <div class="center">${dateStr}  ${timeStr}</div>
  <div class="footer">Terima kasih atas kunjungan Anda</div>
  <div class="footer">Simpan tiket sebagai bukti antrian</div>
</body>
</html>`;
}
