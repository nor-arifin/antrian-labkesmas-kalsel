import db from './connection.js';

export function initDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      prefix TEXT NOT NULL UNIQUE,
      color TEXT DEFAULT '#3B82F6',
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS counters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      service_id INTEGER REFERENCES services(id),
      is_active INTEGER DEFAULT 1,
      current_queue_id INTEGER
    );

    CREATE TABLE IF NOT EXISTS queues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      queue_number TEXT NOT NULL,
      service_id INTEGER NOT NULL REFERENCES services(id),
      status TEXT DEFAULT 'waiting' CHECK(status IN ('waiting','calling','serving','done','skip','cancelled')),
      priority INTEGER DEFAULT 0,
      counter_id INTEGER REFERENCES counters(id),
      called_at TEXT,
      served_at TEXT,
      done_at TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_queues_status ON queues(status);
    CREATE INDEX IF NOT EXISTS idx_queues_service_status ON queues(service_id, status);
    CREATE INDEX IF NOT EXISTS idx_queues_priority ON queues(priority DESC, created_at ASC);
    CREATE INDEX IF NOT EXISTS idx_queues_created ON queues(created_at);
    CREATE INDEX IF NOT EXISTS idx_counters_service ON counters(service_id);
  `);

  console.log('Database initialized');
}
