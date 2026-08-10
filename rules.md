# Development Rules & Conventions

## Code Style

### JavaScript/Node.js
- ES Modules (`import`/`export`) di seluruh project
- `"type": "module"` di package.json
- 2 spaces indentation
- Semicolon di akhir statement
- Single quotes untuk string
- camelCase untuk variables/functions
- UPPER_SNAKE_CASE untuk environment variables

### React (JSX)
- Functional components dengan hooks
- Arrow functions untuk components
- PascalCase untuk component names
- camelCase untuk props, variables, functions
- One component per file

## File Naming

```
server/
  routes/queue.js         ← lowercase, single word
  services/queueManager.js ← camelCase
  db/connection.js        ← lowercase

src/
  pages/Kiosk.jsx         ← PascalCase (components)
  components/CounterCard.jsx ← PascalCase
  hooks/useSocket.js      ← camelCase, prefix "use"
  lib/api.js              ← lowercase
```

## API Conventions

### REST Endpoints
```
GET    /api/resource          → List
GET    /api/resource/:id      → Detail
POST   /api/resource          → Create
PUT    /api/resource/:id      → Update
DELETE /api/resource/:id      → Delete
```

### Response Format
```json
// Success
{ "data": { ... } }
{ "data": [ ... ] }

// Error
{ "error": "Message" }
```

### HTTP Status Codes
- 200: Success
- 201: Created
- 400: Bad Request
- 404: Not Found
- 500: Internal Server Error

## Database Rules

### SQLite
- Selalu gunakan WAL mode
- Gunakan prepared statements (better-sqlite3 otomatis)
- Foreign keys selalu ON
- Reset sequence setiap hari jam 23:00

### Naming Convention
- Tables: plural, lowercase (`queues`, `services`, `counters`)
- Columns: snake_case (`queue_number`, `service_id`, `created_at`)
- Indexes: `idx_{table}_{column}`

## Socket.IO Events

### Naming
```
{entity}:{action}

Contoh:
queue:created
queue:calling
queue:updated
counter:updated
stats:updated
system:reset
```

### Payload
```json
{
  "queue": { "id": 1, "queue_number": "A001", ... },
  "counter": { "id": 1, "name": "Loket 1", ... }
}
```

## Docker Rules

### Images
- Base: `node:20-alpine` (production)
- Multi-stage build
- `.dockerignore` untuk exclude node_modules, .git

### Volumes
- `./data` → SQLite database (persist)
- `./public/audio` → Audio files

### Environment
- Selalu gunakan `.env` untuk konfigurasi
- Jangan hardcode secrets

## Git Rules

### Branch Naming
```
main          ← production
develop       ← development
feature/xxx   ← fitur baru
fix/xxx       ← bug fix
```

### Commit Message
```
type(scope): description

type: feat, fix, docs, style, refactor, test, chore
scope: api, db, ui, docker, etc.

Contoh:
feat(api): add queue take endpoint
fix(printer): correct auto-cutter command
docs: add PRD.md
```

## Testing

### Manual Testing Checklist
- [ ] Kiosk: Ambil nomor → tiket tercetak
- [ ] Kiosk: Prioritas lansia → nomor dipanggil duluan
- [ ] Display: Update real-time saat nomor berubah
- [ ] Counter: Next/Skip/Done berfungsi
- [ ] Counter: Audio terputar saat memanggil
- [ ] Dashboard: Statistik update real-time
- [ ] Dashboard: CRUD layanan/loket
- [ ] Dashboard: Export PDF laporan
- [ ] Reset: Jam 23:00 antrian di-cancel
- [ ] Docker: Semua service berjalan
- [ ] Printer: Tiket tercetak dengan benar

## Performance

### SQLite
- Index pada column yang sering di-query
- WAL mode untuk concurrent read/write
- Busy timeout 5000ms

### Frontend
- Lazy load pages
- Socket.IO untuk real-time (bukan polling)
- Optimize bundle size

### Backend
- Prepared statements untuk query yang sering dipakai
- Connection pooling tidak diperlukan (SQLite)
- Error handling di semua route

## Security (Basic)

- Tidak ada autentikasi (in scope)
- CORS dikonfigurasi untuk production
- Environment variables untuk sensitive data
- Jangan expose SQLite file via static serving
- Rate limiting opsional

## Documentation

- Semua file harus ada header komentar
- API endpoints didokumentasikan di README
- Database schema di Schema.md
- Workflow di workflow.md
