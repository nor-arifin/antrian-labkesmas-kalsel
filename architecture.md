# Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        DEPLOYMENT TARGET                        │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    Docker Compose                         │  │
│  │                                                           │  │
│  │  ┌─────────────┐    ┌─────────────┐    ┌──────────────┐  │  │
│  │  │    nginx     │    │   backend   │    │   printer    │  │  │
│  │  │  (alpine)    │───▶│  (node:20)  │───▶│  Iware 80mm  │  │  │
│  │  │  :80/:443    │    │  :3001      │    │  /dev/usb    │  │  │
│  │  └──────┬───────┘    └──────┬──────┘    └──────────────┘  │  │
│  │         │                   │                              │  │
│  │         │              ┌────┴────┐                         │  │
│  │         │              │         │                         │  │
│  │         │         ┌────▼───┐ ┌───▼────┐                   │  │
│  │         │         │  data/ │ │public/ │                   │  │
│  │         │         │antrian │ │ audio/ │                   │  │
│  │         │         │  .db   │ │        │                   │  │
│  │         │         └────────┘ └────────┘                   │  │
│  │         │                                                  │  │
│  │  ┌──────▼──────────────────────────────────────────────┐  │  │
│  │  │                   Client Apps                       │  │  │
│  │  │                                                     │  │  │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐│  │  │
│  │  │  │  Kiosk   │ │ Display  │ │ Counter  │ │Dashboard││  │  │
│  │  │  │ (Tablet) │ │   (TV)   │ │   (PC)   │ │  (PC)  ││  │  │
│  │  │  └──────────┘ └──────────┘ └──────────┘ └────────┘│  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Reverse Proxy | nginx:alpine | HTTP routing, SSL termination |
| Backend | Node.js 20 + Express | API server, business logic |
| Real-time | Socket.IO | WebSocket communication |
| Database | SQLite (better-sqlite3) | Persistent storage |
| Frontend | React 19 + Vite | UI framework |
| Styling | Tailwind CSS | CSS framework |
| Printer | escpos-builder-ts | ESC/POS thermal printer |
| Audio | Web Audio API | Voice announcements |
| Scheduler | node-cron | Auto-reset jam 23:00 |
| PDF | PDFKit | Report generation |
| Container | Docker + Compose | Deployment |

## Backend Architecture

```
server/
├── index.js                 # Entry point (Express + Socket.IO)
├── db/
│   ├── connection.js        # SQLite connection (WAL mode)
│   ├── schema.js            # CREATE TABLE statements
│   └── seed.js              # Default data
├── routes/
│   ├── queue.js             # Queue CRUD + business logic
│   ├── service.js           # Service management
│   ├── counter.js           # Counter management
│   └── report.js            # Report generation
├── services/
│   ├── queueManager.js      # Queue logic (priority, next, etc.)
│   ├── printService.js      # ESC/POS generation
│   ├── audioService.js      # Audio sequence builder
│   └── scheduler.js         # Cron jobs
└── socket/
    └── handlers.js          # Socket.IO event handlers
```

### Request Flow

```
Client → nginx → Express → Route → Service → SQLite
  │                                    │
  │                                    ├→ Socket.IO → All Clients
  │                                    │
  │◀───────────────────────────────────┘
  │
  └── Response (JSON)
```

## Frontend Architecture

```
src/
├── main.jsx                 # Entry point
├── App.jsx                  # Router setup
├── index.css                # Tailwind imports
├── pages/
│   ├── Kiosk.jsx            # /kiosk
│   ├── Display.jsx          # /display
│   ├── Counter.jsx          # /counter/:id
│   └── Dashboard.jsx        # /dashboard
├── components/              # Reusable UI components
├── hooks/
│   ├── useSocket.js         # Socket.IO hook
│   └── useAudio.js          # Audio playback hook
└── lib/
    ├── api.js               # HTTP client
    └── printer.js           # Print trigger
```

### Client-Server Communication

```
┌─────────────┐     HTTP/REST     ┌─────────────┐
│   Frontend  │◀──────────────────▶│   Backend   │
│   (React)   │                   │   (Express) │
│             │     WebSocket     │             │
│             │◀─────────────────▶│             │
└─────────────┘   (Socket.IO)    └─────────────┘
```

### Socket.IO Event Map

```
Kiosk ───POST /api/queue/take───▶ Backend
                                    │
                                    ├──emit──▶ Display (queue:created)
                                    ├──emit──▶ Counter (queue:created)
                                    └──emit──▶ Dashboard (stats:updated)

Counter ──PUT /api/queue/:id/status──▶ Backend
                                        │
                                        ├──emit──▶ Display (queue:calling)
                                        ├──emit──▶ All (queue:updated)
                                        └──emit──▶ Dashboard (stats:updated)
```

## Database Architecture

```
┌─────────────────────────────────────────┐
│              SQLite (WAL mode)           │
│                                         │
│  ┌──────────┐    ┌──────────────────┐   │
│  │ services │◀───│     queues       │   │
│  └────┬─────┘    │──────────────────│   │
│       │          │ id               │   │
│       │          │ queue_number     │   │
│       │          │ service_id (FK)  │   │
│       │          │ status           │   │
│       │          │ priority         │   │
│       │          │ counter_id (FK)  │   │
│       │          │ called_at        │   │
│       │          │ served_at        │   │
│       │          │ done_at          │   │
│       │          │ created_at       │   │
│       │          └──────────────────┘   │
│       │                                 │
│  ┌────▼─────┐    ┌──────────────────┐   │
│  │ counters │    │    settings      │   │
│  └──────────┘    └──────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

## Print Architecture

```
┌─────────────┐    ESC/POS bytes    ┌─────────────┐
│   Backend   │────────────────────▶│   Printer   │
│ (escpos-    │                     │  Iware 80mm │
│  builder)   │                     │  (USB)      │
└─────────────┘                     └─────────────┘
       │
       │ Generate bytes:
       │ - init()
       │ - align('center')
       │ - bold()
       │ - size(2,2)
       │ - textLine('NOMOR ANTRIAN')
       │ - size(3,3)
       │ - textLine('A001')
       │ - cut()
       │
       └──▶ Uint8Array → /dev/usb/lp0
```

## Audio Architecture

```
┌─────────────┐    Socket.IO     ┌─────────────┐
│   Backend   │─────────────────▶│   Display   │
│             │   queue:calling  │   (TV)      │
└─────────────┘                  └──────┬──────┘
                                        │
                                        │ Web Audio API
                                        │
                                        ▼
                                 ┌─────────────┐
                                 │   Speaker   │
                                 │  "Nomor A001│
                                 │  di Loket 1"│
                                 └─────────────┘
```

### Audio File Structure

```
public/audio/
├── alert.mp3         # Notifikasi awal
├── nomor.mp3         # "Nomor"
├── diloket.mp3       # "di Loket"
├── lansia.mp3        # "Prioritas Lansia"
├── hamil.mp3         # "Prioritas Ibu Hamil"
├── nomor/            # Huruf layanan
│   ├── A.mp3
│   ├── B.mp3
│   ├── C.mp3
│   └── D.mp3
└── angka/            # Angka 0-9
    ├── 0.mp3
    ├── 1.mp3
    └── ...
```

## Docker Architecture

### Production

```yaml
services:
  nginx:
    image: nginx:alpine
    ports: ["80:80", "443:443"]
    volumes:
      - ./nginx/nginx.conf
      - ./nginx/ssl
    depends_on: [backend]

  backend:
    build: .
    devices: ["/dev/usb:/dev/usb"]
    volumes:
      - ./data:/app/data
      - ./public/audio:/app/public/audio
    environment:
      - NODE_ENV=production
      - PORT=3001
```

### Development

```yaml
services:
  backend:
    build: .
    ports: ["3001:3001"]
    volumes:
      - ./server:/app/server
      - ./data:/app/data
    environment:
      - NODE_ENV=development
```

## Deployment Modes

| Mode | Command | Printer | SSL | Use Case |
|------|---------|---------|-----|----------|
| Dev | `docker compose -f docker-compose.dev.yml up` | Mock | No | Development |
| Local | `docker compose up -d` | USB `/dev/usb/lp0` | No | On-site |
| Production | `docker compose up -d --build` | USB or Network | Yes | Server |

## Network Architecture

```
┌─────────────────────────────────────────┐
│              Local Network              │
│                                         │
│  ┌──────────┐                           │
│  │  Kiosk   │──────┐                    │
│  │ (Tablet) │      │                    │
│  └──────────┘      │    ┌──────────┐   │
│                    ├───▶│  Server  │   │
│  ┌──────────┐      │    │ (Docker) │   │
│  │ Display  │──────┤    └──────────┘   │
│  │   (TV)   │      │         │         │
│  └──────────┘      │         │         │
│                    │    ┌────▼────┐    │
│  ┌──────────┐      │    │ Printer │    │
│  │ Counter  │──────┘    │ (USB)   │    │
│  │   (PC)   │           └─────────┘    │
│  └──────────┘                           │
│                                         │
│  ┌──────────┐                           │
│  │Dashboard │──────┘                    │
│  │   (PC)   │                           │
│  └──────────┘                           │
└─────────────────────────────────────────┘
```

## Data Flow Summary

1. **Take Number**: Kiosk → API → DB → Socket → Display
2. **Call Number**: Counter → API → DB → Socket → Display + Audio
3. **Complete**: Counter → API → DB → Socket → Dashboard
4. **Reset**: Cron → DB → Socket → All Clients
5. **Report**: Dashboard → API → DB → PDF → Download
