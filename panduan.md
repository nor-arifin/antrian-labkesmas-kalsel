# Panduan Instalasi & Operasional — Sistem Antrian Digital Labkesda Kalsel

Panduan ini menjelaskan cara memasang dan menjalankan **Sistem Antrian Digital Labkesda Kalsel** untuk operasional harian, termasuk aplikasi **Kiosk Windows (.exe)**.

## Arsitektur

Semua mesin terhubung ke **satu server pusat** di VPS (`https://antrian.labkesmas-kalsel.id`). Satu database, sinkron realtime.

| Peran | Alat | Cara akses | Butuh printer? |
|-------|------|-----------|----------------|
| **Kiosk** (pasien ambil nomor) | Aplikasi `.exe` Windows | Install installer, jalankan | Ya (cetak tiket) |
| **Counter/Loket** (petugas layani) | Browser Chrome/Edge | `https://antrian.labkesmas-kalsel.id/counter/1` | Tidak |
| **Display** (layar pemanggil nomor) | Browser full-screen | `https://antrian.labkesmas-kalsel.id/display` | Tidak |
| **Dashboard** (admin/laporan) | Browser | `https://antrian.labkesmas-kalsel.id/dashboard` | Tidak |

> **Kiosk .exe TIDAK butuh Node.js / npm / source code** — langsung install & pakai. Cukup koneksi internet.

---

## 1. Pasang Aplikasi Kiosk di Windows (termasuk Windows 8.1)

### 1.1. Prasyarat
- **OS**: Windows 8.1, 10, atau 11 (32-bit atau 64-bit — installer disediakan per-arch)
- **Internet**: stabil (kiosk terhubung ke server VPS)
- **Printer**: ter-install & terdeteksi Windows (untuk cetak tiket)

### 1.2. Set Printer Default di Windows
1. **Start** → **Settings** → **Bluetooth & devices** → **Printers & scanners**.
2. Klik printer yang dipakai untuk tiket.
3. Klik **Set as default**.
4. Klik **Print test page** untuk memastikan live.

Verifikasi: buka **Notepad** → ketik teks → **File** → **Print** → pastikan keluar dari printer default.

### 1.3. Install Aplikasi Kiosk
1. Dapatkan file installer dari developer (folder `electron/release`):
   - `Antrian Labkesda Kalsel Kiosk-Setup-1.0.0.exe` — paket gabungan 32+64-bit
   - `...-x64.exe` — khusus 64-bit | `...-ia32.exe` — khusus 32-bit (Windows 8.1 32-bit)
2. **Double-click** file `.exe`.
3. Ikuti wizard installer:
   - Pilih folder instalasi (default `C:\Program Files\...`) → **Next**.
   - Centang **Create a desktop shortcut** → **Install**.
4. Tunggu selesai → muncul shortcut **Antrian Kiosk** di desktop / Start Menu.

### 1.4. Jalankan & Gunakan
1. **Double-click** shortcut **Antrian Kiosk**.
2. Jendela full-screen terbuka menuju halaman kiosk di server pusat.
3. Pasien pilih layanan → klik tombol → **tiket langsung tercetak otomatis** (tanpa dialog) ke printer default.
4. Kalau cetak gagal: klik tombol **Cetak Ulang** di UI untuk retry (tanpa ambil nomor baru).

> **Mengubah server tujuan**: secara default kiosk menghubungi `https://antrian.labkesmas-kalsel.id`. Kalau dipasang di instalasi lain, developer dapat mengatur `KIOSK_URL` (lihat bagian **Pengembangan**).

### 1.5. Keluar dari Kiosk
Tekan `Alt + F4` (atau tutup jendela) untuk keluar dari mode kiosk.

---

## 2. Counter / Loket (PC Petugas)

1. Buka **Chrome** atau **Edge** di PC loket.
2. Akses `https://antrian.labkesmas-kalsel.id/counter/1` (angka = nomor loket; loket 2 → `/counter/2`, dst).
3. Saat pasien datang: klik **Panggil** — nomor muncul di Display + suara pemanggil otomatis.
4. Selesai layani: klik **Selesai**. Ada tombol **Panggil Ulang** untuk panggil lagi nomor terakhir.
5. Bak untuk jeda: **Istirahat/Tutup** (mengubah status loket).

Halaman ini realtime via Server-Sent/socket — nomor dari kiosk langsung muncul tanpa refresh.

---

## 3. Display (Layar Pemanggil Nomor)

1. Buka **Chrome/Edge** di PC / Smart TV (mode desktop) yang jadi layar monitor.
2. Akses `https://antrian.labkesmas-kalsel.id/display`.
3. Tekan **F11** (Windows) untuk full-screen dan sembunyikan toolbar.
4. Layar menampilkan nomor yang sedang dipanggil + antrian per loket + audio otomatis.

**Video iklan/display**: upload via Dashboard → menu pengaturan video. Video tersimpan di server pusat dan diputar otomatis saat tidak ada panggilan.

---

## 4. Dashboard / Admin

1. Buka `https://antrian.labkesmas-kalsel.id/dashboard`.
2. Fitur utama:
   - **Statistik realtime**: antrian aktif, sedang dilayani, selesai, rata-rata tunggu
   - **Layanan** (jenis tes/unit) — tambah/edit/hapus & urutan
   - **Loket/Counter** — tambah/edit/hapus, status istirahat
   - **Laporan harian/mingguan/bulanan** + ekspor PDF
   - **Reset antrian** (mulai hari baru — biasanya otomatis jam 23:00)
   - **Pengaturan video display** & nama klinik

---

## 5. Troubleshooting

### Kiosk: jendela kosong / putih
- Pastikan PC kiosk punya akses internet (buka `https://antrian.labkesmas-kalsel.id` di browser biasa).
- Tunggu beberapa detik — halaman butuh waktu termuat.
- Pastikan server VPS hidup: buka domain dari HP/PC lain.

### Kiosk: tiket tidak tercetak
1. Cek printer: **Start** → **Settings** → **Printers & scanners** → status **Ready** (bukan **Offline**).
2. Restart **Print Spooler**:
   ```bat
   net stop spooler
   net start spooler
   ```
3. Cek printer masih **default** (lihat 1.2).
4. Klik **Cetak Ulang** di UI kiosk.

### Kiosk: aplikasi tidak bisa install di Windows 8.1
- Pastikan versi installer benar: Windows 8.1 32-bit pakai `...-ia32.exe`, 64-bit pakai `...-x64.exe` atau paket gabungan.
- Aplikasi dibangun dengan Electron 22 (rilis terakhir yang mendukung Windows 8.1) — tidak perlu langkah tambahan.

### Halaman counter/display tidak update
- Pastikan browser modern (Chrome/Edge terbaru). Di Windows 8.1, versi Chrome/Edge terbatas (Chromium 109) — untuk counter/display disarankan PC Windows 10/11 atau pakai Chrome "last supported" untuk 8.1.

### Koneksi internet mati
- Kiosk & browser **berhenti berfungsi** selama offline (semua bergantung pada server VPS). Setelah internet pulih, otomatis tersambung kembali (reconnect otomatis).

---

## 6. Pengembangan (Developer)

### 6.1. Menjalankan lokal (mode dev)
```bash
npm install            # root
cd electron && npm install
npm run kiosk          # dari root: build + bundle server + buka Electron mode LOKAL (tanpa domain)
```
- Mode lokal (tanpa env): kiosk menjalankan server+DB sendiri di mesin — untuk pengujian offline.
- Mode remote: `KIOSK_URL=https://antrian.labkesmas-kalsel.id npm run kiosk` → load URL domain.
- `KIOSK_LOCAL=1` memaksa mode lokal meski aplikasi adalah paket terpasang.

### 6.2. Mengubah server tujuan kiosk
Elektron kiosk memilih target mengikuti urutan:
1. Env `KIOSK_URL` (jika diset)
2. Default paket → `https://antrian.labkesmas-kalsel.id/kiosk`
3. `KIOSK_LOCAL=1` → mode lokal (server in-process)

### 6.3. Membangun installer Windows
```bash
npm run build:electron             # vite build + esbuild bundel server
cd electron && npx electron-builder --win    # hasil di electron/release/
```
Bisa dibangun dari macOS (electron-builder mengunduh tooling-nya sendiri). Atau pakai **GitHub Actions** (`.github/workflows/build-windows.yml`) — di-trigger manual atau tag `v*`, upload artifact otomatis.

### 6.4. Deploy server ke VPS (Dokploy/Docker + Traefik)
1. Push kode terbaru (termasuk `server/`, `public/`, `Dockerfile`, `docker-compose-dokploy.yml`).
2. Di Dokploy: **Redeploy** service — build image & container restart.
3. Domain `antrian.labkesmas-kalsel.id` via Traefik + Let's Encrypt (sudah dikonfigurasi di `docker-compose-dokploy.yml`).
4. **Data tersimpan di volume** `/app/data` — backup = salin folder `data/` dari VPS.

> Penting: setelah deploy, pastikan `GET https://antrian.labkesmas-kalsel.id/sw.js` mengembalikan `application/javascript` (bukan HTML) — ini penanda build sudah terbaru; build lama mengembalikan HTML dan membuat Service Worker gagal.

---

## Catatan Penting
- **Satu database**: semua data (nomor antrian, laporan) hidup di server VPS. Jangan jalankan mode lokal untuk produksi — hanya untuk tes.
- **Reset harian** otomatis jam **23:00** (Asia/Pontianak) — hari baru mulai tanpa perlu reset manual.
- **Windows 8.1**: didukung penuh untuk **kiosk .exe**. Untuk browser (counter/display), gunakan PC/layar dengan OS lebih baru karena browser modern sudah tidak mendukung 8.1.
