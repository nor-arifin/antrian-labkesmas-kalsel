import { Router } from 'express';
import { writeFileSync, unlinkSync } from 'fs';
import { execSync } from 'child_process';
import { generateTicket, generateTicketHTML } from '../services/printService.js';
import { getDb } from '../db/connection.js';
import PDFDocument from 'pdfkit';

export default function printRoutes(io) {
  const router = Router();

  router.post('/print/ticket', async (req, res) => {
    try {
      const { queueId } = req.body;
      if (!queueId) return res.status(400).json({ error: 'queueId required' });

      const html = await generateTicketHTML(queueId);
      const printerDevice = process.env.PRINTER_DEVICE;

      if (printerDevice) {
        try {
          const { lines } = await generateTicket(queueId);
          const escposBytes = buildESCPOS(lines);
          const tmpFile = `/tmp/ticket_${queueId}.bin`;
          writeFileSync(tmpFile, Buffer.from(escposBytes));
          execSync(`cat ${tmpFile} > ${printerDevice}`);
          unlinkSync(tmpFile);
          res.json({ data: { success: true, printer: 'local' } });
        } catch {
          res.json({ data: { success: true, printer: 'remote', html } });
        }
      } else {
        res.json({ data: { success: true, printer: 'remote', html } });
      }
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/report/daily/pdf', (req, res) => {
    try {
      const db = getDb();
      const date = req.query.date || new Date().toISOString().slice(0, 10);

      const doc = new PDFDocument({ margin: 40 });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=laporan-${date}.pdf`);
      doc.pipe(res);

      doc.fontSize(16).text('LAPORAN HARIAN ANTRIAN', { align: 'center' });
      doc.fontSize(10).text('Labkesda Kalteng', { align: 'center' });
      doc.moveDown();
      doc.text(`Tanggal: ${date}`);
      doc.moveDown();

      const summary = db.prepare(`
        SELECT COUNT(*) as total,
          SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as completed,
          ROUND(AVG(CASE WHEN done_at IS NOT NULL
            THEN (julianday(done_at) - julianday(created_at)) * 24 * 60 END), 1) as avg_wait
        FROM queues WHERE date(created_at) = ?
      `).get(date);

      doc.text(`Total Antrian: ${summary?.total || 0}`);
      doc.text(`Selesai Dilayani: ${summary?.completed || 0}`);
      doc.text(`Rata-rata Waktu Tunggu: ${summary?.avg_wait || 0} menit`);
      doc.moveDown();

      const byService = db.prepare(`
        SELECT s.name, COUNT(*) as total,
          SUM(CASE WHEN q.status = 'done' THEN 1 ELSE 0 END) as completed
        FROM queues q JOIN services s ON q.service_id = s.id
        WHERE date(q.created_at) = ?
        GROUP BY s.id ORDER BY s.prefix
      `).all(date);

      if (byService.length > 0) {
        doc.fontSize(12).text('Per Layanan:');
        doc.moveDown(0.5);
        byService.forEach(s => {
          doc.fontSize(10).text(`  ${s.name}: ${s.total} total, ${s.completed} selesai`);
        });
      }

      doc.end();
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}

function buildESCPOS(lines) {
  const bytes = [0x1B, 0x40];

  for (const line of lines) {
    if (line.type === 'image' && line.bitmap) {
      const { width, height, bytes: imgBytes } = line.bitmap;
      const xL = width & 0xFF;
      const xH = (width >> 8) & 0xFF;
      const yL = height & 0xFF;
      const yH = (height >> 8) & 0xFF;
      bytes.push(0x1D, 0x76, 0x30, 0x00, xL, xH, yL, yH);
      for (const b of imgBytes) bytes.push(b);
      bytes.push(0x0A);
      continue;
    }

    if (line.align === 'center') bytes.push(0x1B, 0x61, 0x01);
    else if (line.align === 'right') bytes.push(0x1B, 0x61, 0x02);
    else bytes.push(0x1B, 0x61, 0x00);

    if (line.bold) bytes.push(0x1B, 0x45, 0x01);
    else bytes.push(0x1B, 0x45, 0x00);

    if (line.prePad) {
      for (let i = 0; i < line.prePad; i++) bytes.push(0x20);
    }

    if (line.size && line.size[0] > 1) {
      const w = Math.min(line.size[0] - 1, 7);
      const h = Math.min((line.size[1] || 1) - 1, 7);
      bytes.push(0x1D, 0x21, (h << 4) | w);
    } else {
      bytes.push(0x1D, 0x21, 0x00);
    }

    const encoder = new TextEncoder();
    bytes.push(...encoder.encode(line.text || ''));
    bytes.push(0x0A);

    if (line.postPad) {
      for (let i = 0; i < line.postPad; i++) bytes.push(0x20);
    }
  }

  bytes.push(0x1D, 0x56, 0x00);
  return new Uint8Array(bytes);
}
