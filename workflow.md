# Workflow & Alur Sistem

## 1. Alur Utama — Pengunjung Ambil Nomor

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Kiosk   │────▶│  Backend │────▶│ Database │────▶│  Print   │
│ (Tablet) │     │  Express │     │  SQLite  │     │ 80mm     │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
     │                                   │
     │ 1. Pilih Layanan                  │
     │ 2. Toggle Prioritas               │
     │ 3. Tekan "Ambil Nomor"            │
     │                                   │
     │         ┌──────────┐              │
     │────────▶│  Socket  │──────────────│
     │         │  .IO    │              │
     │         └──────────┘              │
     │              │                    │
     │              ▼                    │
     │         ┌──────────┐              │
     │         │ Display  │              │
     │         │   (TV)   │              │
     │         └──────────┘              │
     │                                   │
     ▼                                   │
  ┌─────────┐                            │
  │ Tiket   │◀───────────────────────────┘
  │ Tercetak│
  └─────────┘
```

### Detail Alur:
1. Pengunjung membuka `/kiosk` di tablet
2. Memilih jenis layanan (Pendaftaran/Penunjang/Konsultasi/Pengambilan Hasil)
3. Mengaktifkan toggle prioritas jika perlu (Lansia/Ibu Hamil)
4. Menekan tombol layanan → POST `/api/queue/take`
5. Backend generate nomor antrian (A001, B003, dst)
6. Backend simpan ke database (status: waiting)
7. Backend generate ESC/POS bytes untuk tiket
8. Backend emit socket `queue:created` ke semua client
9. Display (TV) update tampilan
10. Kiosk cetak tiket via thermal printer
11. Tiket tercetak dengan auto-cutter

---

## 2. Alur Pemanggilan — Petugas Loket

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│ Counter  │────▶│  Backend │────▶│ Database │
│  (PC)    │     │          │     │          │
└──────────┘     └──────────┘     └──────────┘
     │                │                │
     │ 1. Tekan       │                │
     │   "Panggil"    │                │
     │                ▼                │
     │         ┌──────────┐           │
     │         │  Socket  │           │
     │         │  .IO    │───────────│
     │         └──────────┘           │
     │              │                 │
     │              ▼                 │
     │         ┌──────────┐           │
     │         │ Display  │           │
     │         │  (TV)    │           │
     │         └──────────┘           │
     │                                │
     │         ┌──────────┐           │
     │         │  Audio   │           │
     │         │ Playback │           │
     │         └──────────┘           │
     │                                │
     ▼                                │
  ┌─────────┐                         │
  │ Nomor   │◀────────────────────────┘
  │ Berikut │
  └─────────┘
```

### Detail Alur:
1. Petugas membuka `/counter/:id` di PC
2. Menekan tombol "Panggil" (Next)
3. Backend query antrian berikutnya (prioritas dulu)
4. Backend update status → `calling`
5. Backend update `counter.current_queue_id`
6. Backend emit socket `queue:calling` + `counter:updated`
7. Semua client menerima event
8. Display (TV) update nomor yang dipanggil
9. Semua browser putar audio: "Nomor A001 di Loket 1"
10. Petugas melayani → tekan "Selesai"
11. Backend update status → `done`

---

## 3. Alur Reset Harian (Jam 23:00)

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│  Cron    │────▶│  Backend │────▶│ Database │
│ (23:00)  │     │          │     │          │
└──────────┘     └──────────┘     └──────────┘
                        │                │
                        │ 1. Cancel      │
                        │    waiting &   │
                        │    calling     │
                        │                │
                        │ 2. Clear       │
                        │    counter     │
                        │    current     │
                        │                │
                        │ 3. Emit        │
                        │    socket      │
                        │    event       │
                        ▼                │
                 ┌──────────┐            │
                 │  Socket  │────────────┘
                 │  .IO    │
                 └──────────┘
                        │
                        ▼
                 ┌──────────┐
                 │ Semua    │
                 │ Client   │
                 │ (reset)  │
                 └──────────┘
```

### Detail Alur:
1. `node-cron` trigger jam 23:00
2. UPDATE queues SET status = 'cancelled' WHERE status IN ('waiting', 'calling')
3. UPDATE counters SET current_queue_id = NULL
4. Emit socket `system:reset`
5. Semua client (Display, Counter, Dashboard) reset tampilan
6. Kiosk siap untuk antrian hari berikutnya

---

## 4. Alur Real-Time (Socket.IO)

```
┌──────────┐
│  Kiosk   │──┐
└──────────┘  │
              │    ┌──────────┐    ┌──────────┐
┌──────────┐  ├───▶│  Server  │───▶│ Display  │
│ Counter  │──┤    │  (SOIO)  │    │   (TV)   │
└──────────┘  │    └──────────┘    └──────────┘
              │         │
┌──────────┐  │         │
│Dashboard │──┘         ▼
└──────────┘    ┌──────────┐
                │ Semua    │
                │ Client   │
                └──────────┘
```

### Event Flow:
1. Kiosk → `POST /api/queue/take` → Server emit `queue:created`
2. Counter → `PUT /api/queue/:id/status` (calling) → Server emit `queue:calling`
3. Counter → `PUT /api/queue/:id/status` (done) → Server emit `queue:updated`
4. Semua perubahan → Server emit `stats:updated` ke Dashboard

---

## 5. Alur Cetak Tiket (ESC/POS)

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Kiosk   │────▶│  Backend │────▶│ ESC/POS  │────▶│ Printer  │
│          │     │          │     │ Builder  │     │ 80mm     │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
                        │                │                │
                        │ 1. Generate    │                │
                        │    nomor       │                │
                        │                │                │
                        │ 2. Build       │                │
                        │    ESC/POS     │                │
                        │    bytes       │                │
                        │                │                │
                        │ 3. Return      │                │
                        │    bytes       │                │
                        │                │                │
                        │ 4. Send to ────│────────────────│
                        │    printer     │                │
```

### Format Tiket:
```
┌────────────────────────────────┐
│                                │
│  LAB. KESEHATAN PROV. KALTENG │  ← center, bold
│  ═══════════════════════════   │  ← horizontal rule
│                                │
│      Nomor: A001               │  ← center, large
│                                │
│  Layanan: Pendaftaran          │  ← left
│  Prioritas: Tidak              │  ← left
│                                │
│  Antrian di depan: 5 orang     │  ← left
│  Estimasi tunggu: ~15 menit    │  ← left
│                                │
│  ═══════════════════════════   │
│  10/08/2026  09:15:32         │  ← center
│                                │
└────────────────────────────────┘
         │
         ▼
    Auto-cutter
```

---

## 6. Alur Audio Panggilan

```
Petugas tekan "Panggil"
         │
         ▼
┌──────────────────────────────────────────┐
│           Audio Sequence                 │
│                                          │
│  alert.mp3 → nomor.mp3 → A.mp3 →        │
│  0.mp3 → 0.mp3 → 1.mp3 → diloket.mp3 → │
│  1.mp3                                  │
│                                          │
│  "Ting" → "Nomor" → "A" → "0" → "0" →   │
│  "1" → "di Loket" → "1"                 │
└──────────────────────────────────────────┘
         │
         ▼
   Web Audio API
   (putar di semua browser)
```

### Prioritas Audio:
- Normal: "Nomor A001 di Loket 1"
- Lansia: "Prioritas. Nomor A001 di Loket 1"
- Hamil: "Prioritas. Nomor A001 di Loket 1"

---

## 7. Alur Laporan

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│Dashboard │────▶│  Backend │────▶│  Query   │────▶│  PDFKit  │
│          │     │          │     │  SQLite  │     │          │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
     │                                   │                │
     │  1. Pilih jenis laporan           │                │
     │  2. Pilih periode                 │                │
     │  3. Klik "Export"                 │                │
     │                                   │                │
     │         ┌──────────┐              │                │
     │         │  Query   │◀─────────────┘                │
     │         │  Data    │                               │
     │         └──────────┘                               │
     │              │                                     │
     │              ▼                                     │
     │         ┌──────────┐                               │
     │         │ Generate │◀──────────────────────────────┘
     │         │   PDF    │
     │         └──────────┘
     │              │
     │              ▼
     │         ┌──────────┐
     │         │ Download │
     │         │   PDF    │
     │         └──────────┘
```

### Jenis Laporan:
1. **Harian**: Total pengunjung, per layanan, waktu tunggu rata-rata
2. **Mingguan**: Tren harian, perbandingan layanan
3. **Bulanan**: Grafik harian, ringkasan bulanan
