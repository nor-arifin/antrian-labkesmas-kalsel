import { getDb } from './connection.js';

export function seedDB() {
  const db = getDb();
  const result = db.prepare('SELECT COUNT(*) as count FROM services').get();
  if (result.count > 0) return;

  const insertService = db.prepare('INSERT INTO services (name, prefix, color) VALUES (?, ?, ?)');
  const insertCounter = db.prepare('INSERT INTO counters (name, service_id) VALUES (?, ?)');
  const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');

  insertService.run('Pendaftaran Medis', 'A', '#3B82F6');
  insertService.run('Pendaftaran Lingkungan', 'B', '#10B981');
  insertService.run('BPJS', 'C', '#F59E0B');
  insertService.run('Pengambilan Hasil Lingkungan', 'D', '#EF4444');

  insertCounter.run('Loket 1', 1);  // Pendaftaran Medis
  insertCounter.run('Loket 2', 1);  // Pendaftaran Medis
  insertCounter.run('Loket 3', 1);  // Pendaftaran Medis
  insertCounter.run('Loket 4', 1);  // Pendaftaran Medis

  insertSetting.run('clinic_name', 'LABORATORIUM KESEHATAN PROVINSI KALIMANTAN SELATAN');
  insertSetting.run('reset_hour', '23');
  insertSetting.run('max_queue_per_day', '200');

  console.log('Database seeded');
}
