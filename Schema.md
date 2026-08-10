# Database Schema

## SQLite Configuration

```sql
PRAGMA journal_mode=WAL;
PRAGMA busy_timeout=5000;
PRAGMA foreign_keys=ON;
```

## Tables

### services — Jenis Layanan

| Column | Type | Constraint | Description |
|--------|------|------------|-------------|
| id | INTEGER | PK, AUTOINCREMENT | |
| name | TEXT | NOT NULL | Nama layanan |
| prefix | TEXT | NOT NULL, UNIQUE | Kode awal nomor (A/B/C/D) |
| color | TEXT | DEFAULT '#3B82F6' | Warna untuk display |
| is_active | INTEGER | DEFAULT 1 | Aktif/tidak |
| created_at | TEXT | DEFAULT datetime('now','localtime') | |

### counters — Loket/Kounter

| Column | Type | Constraint | Description |
|--------|------|------------|-------------|
| id | INTEGER | PK, AUTOINCREMENT | |
| name | TEXT | NOT NULL | Nama loket |
| service_id | INTEGER | FK → services(id) | Layanan yang dilayani |
| is_active | INTEGER | DEFAULT 1 | Aktif/tidak |
| current_queue_id | INTEGER | FK → queues(id) | Antrian sedang dilayani |

### queues — Antrian

| Column | Type | Constraint | Description |
|--------|------|------------|-------------|
| id | INTEGER | PK, AUTOINCREMENT | |
| queue_number | TEXT | NOT NULL | Nomor antrian (A001) |
| service_id | INTEGER | NOT NULL, FK → services(id) | Jenis layanan |
| status | TEXT | DEFAULT 'waiting' | Status antrian |
| priority | INTEGER | DEFAULT 0 | 0=normal, 1=lansia, 2=hamil |
| counter_id | INTEGER | FK → counters(id) | Loket yang melayani |
| called_at | TEXT | NULL | Waktu dipanggil |
| served_at | TEXT | NULL | Waktu mulai dilayani |
| done_at | TEXT | NULL | Waktu selesai |
| created_at | TEXT | DEFAULT datetime('now','localtime') | Waktu ambil nomor |

**Status flow:** `waiting` → `calling` → `serving` → `done`
**Alternate:** `waiting` → `skip`, `waiting` → `cancelled`

### settings — Pengaturan

| Column | Type | Constraint | Description |
|--------|------|------------|-------------|
| key | TEXT | PK | Nama pengaturan |
| value | TEXT | NOT NULL | Nilai |

**Default settings:**
```
clinic_name = "LABORATORIUM KESEHATAN PROVINSI KALIMANTAN TENGAH"
reset_hour = 23
max_queue_per_day = 200
```

## Indexes

```sql
CREATE INDEX idx_queues_status ON queues(status);
CREATE INDEX idx_queues_service_status ON queues(service_id, status);
CREATE INDEX idx_queues_priority ON queues(priority DESC, created_at ASC);
CREATE INDEX idx_queues_created ON queues(created_at);
CREATE INDEX idx_counters_service ON counters(service_id);
```

## Seed Data

### Services
| id | name | prefix | color |
|----|------|--------|-------|
| 1 | Pendaftaran | A | #3B82F6 |
| 2 | Penunjang | B | #10B981 |
| 3 | Konsultasi | C | #F59E0B |
| 4 | Pengambilan Hasil | D | #EF4444 |

### Counters
| id | name | service_id |
|----|------|------------|
| 1 | Loket 1 | 1 |
| 2 | Loket 2 | 2 |
| 3 | Loket 3 | 3 |
| 4 | Loket 4 | 4 |

## Queue Number Format

```
{prefix}{sequence:3d}

Contoh: A001, A002, B001, C015, D003
```

Sequence reset setiap hari jam 23:00.

## Query Patterns

### Ambil antrian berikutnya (prioritas dulu)
```sql
SELECT * FROM queues
WHERE status = 'waiting'
  AND service_id = ?
ORDER BY priority DESC, created_at ASC
LIMIT 1;
```

### Statistik hari ini
```sql
SELECT
  COUNT(*) as total,
  SUM(CASE WHEN status = 'waiting' THEN 1 ELSE 0 END) as waiting,
  SUM(CASE WHEN status IN ('calling','serving') THEN 1 ELSE 0 END) as serving,
  SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as done,
  AVG(CASE WHEN done_at IS NOT NULL
    THEN (julianday(done_at) - julianday(created_at)) * 24 * 60
  END) as avg_wait_minutes
FROM queues
WHERE date(created_at) = date('now', 'localtime');
```

### Reset harian
```sql
UPDATE queues SET status = 'cancelled'
WHERE status IN ('waiting', 'calling');

UPDATE counters SET current_queue_id = NULL;
```
