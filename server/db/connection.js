import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = typeof globalThis.__dirname !== 'undefined'
  ? globalThis.__dirname
  : dirname(fileURLToPath(import.meta.url));

function resolveDbPath() {
  const fromEnv = process.env.DB_PATH;
  return fromEnv && fromEnv.trim() ? fromEnv : resolve(__dirname, '../../data/antrian.db');
}

function validateDbPath(p) {
  mkdirSync(dirname(p), { recursive: true });

  if (existsSync(p)) {
    if (statSync(p).isDirectory()) {
      throw new Error(
        `[DB] DB_PATH points to a directory, not a file: ${p}\n` +
        `[DB] Fix: set DB_PATH to a full file path, e.g. '/app/data/antrian.db'`
      );
    }
    return;
  }

  const looksTypo = /\/antrian\/?$/.test(p) || /\/antrian\/db$/.test(p);
  if (looksTypo) {
    throw new Error(
      `[DB] DB_PATH looks malformed: ${p}\n` +
      `[DB] Did you mean '/app/data/antrian.db'? ` +
      `Fix DB_PATH env var (remove trailing '/db' or '/').`
    );
  }

  const stem = p.replace(/\.[^./]+$/, '');
  if (stem !== p && existsSync(stem) && statSync(stem).isDirectory()) {
    throw new Error(
      `[DB] Expected file at ${p} but found directory at ${stem}.\n` +
      `[DB] Likely leftover from extracting a backup incorrectly.\n` +
      `[DB] On host: 'rm -rf ${stem}' after backing up any real DB elsewhere.`
    );
  }

  console.log(`[DB] No existing DB at ${p}; will create on first write.`);
}

const dbPath = resolveDbPath();
validateDbPath(dbPath);

let _sqlDb = null;
let _wrapper = null;

function saveDB() {
  if (!_sqlDb) return;
  try {
    const data = _sqlDb.export();
    writeFileSync(dbPath, Buffer.from(data));
  } catch (err) {
    err.message = `[DB] Failed to persist ${dbPath}: ${err.message}`;
    throw err;
  }
}

function wrapDb(sqlJsDb) {
  return {
    prepare(sql) {
      return {
        run(...params) {
          sqlJsDb.run(sql, params);
          const lastId = sqlJsDb.exec('SELECT last_insert_rowid() as id');
          saveDB();
          return { lastInsertRowid: lastId[0]?.values[0][0] || 0, changes: sqlJsDb.getRowsModified() };
        },
        get(...params) {
          const stmt = sqlJsDb.prepare(sql);
          stmt.bind(params);
          if (stmt.step()) {
            const row = stmt.getAsObject();
            stmt.free();
            return row;
          }
          stmt.free();
          return undefined;
        },
        all(...params) {
          const rows = [];
          const stmt = sqlJsDb.prepare(sql);
          stmt.bind(params);
          while (stmt.step()) {
            rows.push(stmt.getAsObject());
          }
          stmt.free();
          return rows;
        },
      };
    },
    exec(sql) {
      sqlJsDb.exec(sql);
      saveDB();
    },
    pragma(p) {
      sqlJsDb.run(`PRAGMA ${p}`);
    },
    transaction(fn) {
      return (...args) => {
        sqlJsDb.run('BEGIN TRANSACTION');
        try {
          const result = fn(...args);
          sqlJsDb.run('COMMIT');
          saveDB();
          return result;
        } catch (err) {
          sqlJsDb.run('ROLLBACK');
          throw err;
        }
      };
    },
  };
}

export async function initDB() {
  const wasmPath = process.env.SQLJS_WASM_PATH;
  const SQL = await initSqlJs(wasmPath ? { locateFile: () => wasmPath } : {});

  if (existsSync(dbPath)) {
    const buffer = readFileSync(dbPath);
    _sqlDb = new SQL.Database(buffer);
  } else {
    _sqlDb = new SQL.Database();
  }

  _sqlDb.run('PRAGMA journal_mode = WAL');
  _sqlDb.run('PRAGMA foreign_keys = ON');

  _wrapper = wrapDb(_sqlDb);

  _wrapper.exec(`
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
      status TEXT DEFAULT 'waiting',
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
  `);

  try { _wrapper.exec('CREATE INDEX IF NOT EXISTS idx_queues_status ON queues(status)'); } catch {}
  try { _wrapper.exec('CREATE INDEX IF NOT EXISTS idx_queues_service_status ON queues(service_id, status)'); } catch {}
  try { _wrapper.exec('CREATE INDEX IF NOT EXISTS idx_queues_priority ON queues(priority DESC, created_at ASC)'); } catch {}
  try { _wrapper.exec('CREATE INDEX IF NOT EXISTS idx_queues_created ON queues(created_at)'); } catch {}
  try { _wrapper.exec('CREATE INDEX IF NOT EXISTS idx_counters_service ON counters(service_id)'); } catch {}

  try { _wrapper.exec("ALTER TABLE counters ADD COLUMN status TEXT DEFAULT 'active'"); } catch {}

  console.log('Database initialized');
  return _wrapper;
}

export function getDb() {
  if (!_wrapper) throw new Error('Database not initialized. Call initDB() first.');
  return _wrapper;
}
