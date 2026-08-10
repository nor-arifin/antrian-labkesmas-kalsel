# Product Requirements Document (PRD)

## Sistem Antrian Digital — Labkesda Kalteng

### 1. Overview

Sistem antrian digital berbasis web untuk Laboratorium Kesehatan Provinsi Kalimantan Tengah. Menggantikan antrian manual dengan nomor digital, pemanggilan otomatis via suara, dan dashboard monitoring real-time.

### 2. Goals

- Mengurangi waktu tunggu pengunjung dengan informasi real-time
- Meningkatkan efisiensi petugas loket
- Memberikan data statistik untuk pengambilan keputusan
- Tampilan profesional dan terintegrasi

### 3. Users

| User | Akses | Perangkat |
|------|-------|-----------|
| Pengunjung | Ambil nomor antrian | Tablet/touchscreen (kiosk) |
| Petugas Loket | Panggil/lewati/selesaikan antrian | PC/Laptop |
| Supervisor/Admin | Monitoring + laporan + pengaturan | PC/Laptop |
| Pengunjung (pasif) | Melihat status antrian | TV/Layar display |

### 4. Fitur Utama

#### 4.1 Kiosk (Ambil Nomor)
- Pilihan layanan: Pendaftaran, Penunjang, Konsultasi, Pengambilan Hasil
- Toggle prioritas: Normal, Lansia, Ibu Hamil
- Cetak tiket termal 80mm otomatis
- Tampilan nomor antrian + jumlah antrian di depan

#### 4.2 Display Antrian
- Grid status semua loket aktif
- Nomor yang sedang dilayani per loket
- Daftar antrian menunggu
- Running text informasi
- Auto-refresh via WebSocket

#### 4.3 Panel Petugas Loket
- Nomor saat ini + nomor berikutnya
- 3 tombol aksi: Panggil | Lewati | Selesai
- Riwayat 10 antrian terakhir
- Auto-play audio saat memanggil

#### 4.4 Dashboard Admin
- Statistik: total hari ini, sedang dilayani, rata-rata waktu tunggu
- Tabel antrian real-time (filter by status)
- CRUD Layanan dan Loket
- Laporan: Harian, Mingguan, Bulanan (export PDF)
- Reset manual

### 5. Non-Functional Requirements

| Aspek | Requirement |
|-------|-------------|
| Response time | < 200ms untuk semua API |
| Concurrent users | 50+ koneksi simultan |
| Availability | 99.9% (jam operasional) |
| Database | SQLite dengan WAL mode |
| Printer | Iware 80mm, ESC/POS, auto-cutter |
| Audio | File .mp3 lokal, Web Audio API |
| Reset | Otomatis jam 23:00 WIB |
| Docker | Multi-stage build + nginx |
| SSL | Optional (production) |

### 6. Out of Scope

- Integrasi SMS/WhatsApp
- Mobile app native
- Multi-cabang
- Autentikasi user/login
- Payment integration

### 7. Success Metrics

- Waktu tunggu rata-rata < 15 menit
- 100% antrian tercatat secara digital
- Laporan tersedia otomatis setiap hari
- Zero antrian hilang/tidak terpanggil
