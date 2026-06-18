# CommunityMap

Platform web crowdsourcing modern untuk pelaporan infrastruktur publik dan kondisi jalan secara real-time. Dibangun untuk mempermudah partisipasi warga dalam memonitor, melaporkan, dan berdiskusi mengenai masalah infrastruktur lingkungan mereka kepada dinas terkait.

![CommunityMap Preview](frontend/public/images/report-road.svg)

## 🌟 Fitur Utama

### 👥 Sistem Pengguna & Autentikasi
- **Registrasi & Login Mulus**: Autentikasi menggunakan JWT.
- **Profil Pengguna Publik**: Laman profil unik untuk tiap pengguna (`/users/[username]`) yang menampilkan riwayat laporan mereka.
- **Kustomisasi Profil**: Pengaturan nama, username unik, dan foto profil.

### 🗺️ Pemetaan & Pelaporan (*Core Features*)
- **Peta Interaktif Publik**: Integrasi *react-map-gl* dengan animasi *fly-to* halus ke lokasi laporan spesifik.
- **Pembuatan Laporan Terperinci**: Dukungan gambar, titik koordinat peta (latitude/longitude), area (kecamatan/distrik), deskripsi, dan estimasi alamat dinamis.
- **Filter Cerdas di Peta & Feeds**: Saring laporan berdasarkan kategori (Jalan Berlubang, Lampu Mati, Banjir, dsb), status, distrik, dan rentang waktu.
- **Manajemen Status**: Alur pelaporan (*New -> Verified -> In Progress -> Resolved/Rejected*) dengan pencatatan log perubahan status (oleh Admin/Sistem).

### 💬 Interaksi Sosial & Keterlibatan
- **Sistem Komentar Bersarang (*Nested Comments*)**: Warga dan admin dapat saling membalas komentar di suatu laporan.
- **Mention Pengguna**: Sistem tag `@username` di dalam komentar yang bisa diklik untuk menuju profil.
- **Upvote & Downvote**: Prioritas laporan dapat dilihat dari seberapa banyak warga yang setuju/tidak setuju dengan masalah tersebut.
- **Live Chat**: Fitur percakapan real-time antar sesama pengguna dan antara warga dengan dinas/admin.

### 🛡️ Dasbor Admin
- **Verifikasi Laporan**: Admin dapat memeriksa dan memverifikasi laporan yang valid, atau menolak yang tidak sesuai.
- **Tinjauan Cepat**: Ringkasan total laporan, status, serta lokasi-lokasi kritis.

## 🛠️ Teknologi yang Digunakan

- **Frontend**: Next.js 15 (App Router), React, TypeScript, TailwindCSS, MapLibre GL.
- **Backend**: Node.js, Express.js, JWT Authentication.
- **Database**: PostgreSQL (Via Docker Compose) dengan fallback ke *In-Memory Database* untuk kelancaran *development*.
- **Tools Tambahan**: Docker, Lucide Icons.

## 📂 Struktur Proyek

Folder utama dipisah supaya pembagian kerja jelas:
- `frontend` - Web app Next.js (UI, routing, state management)
- `backend` - API dan business logic (Autentikasi, modul Laporan, Chat, Upload)
- `database` - Schema dan seed SQL
- `infra` - Konfigurasi local setup dan deployment (Docker Compose)
- `docs` - Catatan rancangan tim

## 🚀 Menjalankan Project

Berikut adalah cara menjalankan aplikasi ini baik menggunakan database _in-memory_ untuk pengujian cepat, maupun menggunakan PostgreSQL via Docker untuk pengalaman *development* yang lebih solid.

### 1. Menjalankan Semua secara Paralel (Paling Mudah)

Jika Anda sudah menginstal **Docker**, cara tercepat untuk menjalankan *Frontend*, *Backend*, dan *Database* secara bersamaan adalah:

```bash
npm install
npm run stack:up
```

Atau di sistem operasi Windows:
```powershell
run.bat
```

Lalu buka:
- **Frontend**: `http://localhost:3000`
- **Backend API**: `http://localhost:4000/api/health`

### 2. Menjalankan Layanan secara Terpisah (Manual)

Untuk kontrol lebih (*debugging*), Anda bisa menjalankan *Backend* dan *Frontend* di terminal yang terpisah:

#### a. Menjalankan Database PostgreSQL (Docker Compose)
Pastikan Docker Desktop aktif, lalu jalankan:
```bash
# Menjalankan PostgreSQL di background menggunakan konfigurasi infra/docker-compose.yml
npm run db:up

# Jika ingin mematikan database:
npm run db:down
```

#### b. Menjalankan Backend
Buka terminal baru, lalu masuk ke folder root:
```bash
# Otomatis akan tersambung ke PostgreSQL di port 5433 (jika db:up sudah dijalankan)
# Jika db:up tidak dijalankan, backend akan menggunakan fallback In-Memory Database
npm run dev -w backend
```

#### c. Menjalankan Frontend
Buka terminal baru lagi, lalu masuk ke folder root:
```bash
npm run dev -w frontend
```
Frontend akan otomatis berjalan di `http://localhost:3000`.

### Jika Ada Port Bentrok
Kalau sebelumnya ada server lama yang masih *nyangkut* di port (3000/4000/5433), jalankan perintah pembersihan ini sebelum menjalankan ulang:
```bash
npm run dev:clean
```

## 🗄️ Database Lokal & Fallback

- Secara default, konfigurasi `infra/docker-compose.yml` akan memetakan PostgreSQL ke **Port 5433**.
- Jika PostgreSQL berhasil terhubung, backend akan secara otomatis menjalankan proses sinkronisasi dan sinkronisasi skema SQL.
- Jika PostgreSQL belum tersedia atau gagal terhubung, backend otomatis melakukan fallback ke **database in-memory** agar mode dev tetap bisa diuji coba.
- Jika backend belum aktif saat frontend dibuka di mode development, halaman publik tetap aman dibuka dengan *state* kosong sampai backend siap.
- Saat backend aktif untuk pertama kalinya, sistem akan **otomatis mengisi akun demo** dan **40 laporan seed** yang tersebar di Pulau Jawa ke database.

## 🔑 Akun Demo (Seed Data)

Gunakan akun berikut untuk mencoba fitur (jika mode *seeding* berjalan):

- **Warga / Pengguna Umum**
  - Email: `warga@email.com`
  - Password: `password`
- **Admin / Dinas Terkait**
  - Email: `admin@dpu.go.id`
  - Password: `password`

## Anggota Kelompok

1.   18224079 - Rafi Putra Nugraha
2.   13524100 - Arghawisesa Dwinanda Arham
3.   13524090 - Nashiruddin Akram

---

## 📝 Penambahan Fitur: Perencana Rute A* (Tugas IF2211)

Bagian ini merangkum komitmen ekspansi proyek secara besar-besaran untuk memenuhi tugas mata kuliah IF2211 Strategi Algoritma. Fitur ini diawali oleh _commit_ `feat: A* route planner (backend + frontend)` dan disempurnakan melalui beberapa perbaikan lanjutan.

### Kondisi Awal Proyek (Sebelum Commit)
Pada awalnya (versi mata kuliah ET3204), aplikasi **CommunityMap tidak memiliki fitur rute sama sekali**. Aplikasi hanya berfungsi sebagai dasbor pelaporan publik biasa di mana admin/petugas melihat lokasi pada peta titik per titik tanpa panduan arah yang logis untuk dikunjungi.

### Pengembangan Baru & Optimalisasi Lanjutan (Sesudah Commit)
Seluruh modul *routing* di-koding dari awal untuk mendukung pembuatan rute peninjauan menggunakan algoritma pencarian heuristik.

#### 1. Pengembangan Backend & Algoritma A* (TSP Optimal)
Sistem *backend* Node.js sekarang dilengkapi modul perhitungan rute menggunakan Algoritma A-Star. Algoritma A* secara khusus dirancang menggunakan **Pencarian Ruang Status (State-Space Search)** agar beroperasi layaknya algoritma penyelesaian *Traveling Salesperson Problem (TSP)* yang dijamin menghasilkan solusi terpendek secara absolut (Optimal Global). Pencarian dievaluasi dengan fungsi $f(n) = g(n) + h(n)$, di mana bobot $g(n)$ adalah Jarak Haversine aktual, dan heuristik $h(n)$ adalah estimasi sisa Jarak Manhattan. Batas pelaporan maksimal diterapkan hingga 12 titik untuk menghindari eksponensial faktorial yang menyebabkan batas waktu memori (OOM).
* **File Baru/Terdampak:**
  * `backend/src/modules/routing/routing.service.js` (Logika Priority Queue dan State-Space A*)
  * `backend/src/modules/routing/routing.routes.js` (Router API REST)
  * `backend/src/app.js` (Pendaftaran rute API)

#### 2. Visualisasi Peta Terpadu (OSRM & Frontend)
Membuat halaman perencana rute interaktif di *frontend* React. Daripada sekadar menarik garis imaginer yang lurus di atas perumahan warga, aplikasi sekarang terhubung dengan **API Open Source Routing Machine (OSRM)** yang bertugas membaca keluaran titik A* dan menarik garis mengikuti kelokan jalan raya nyata. Setiap segmen *waypoint* antar jalan diberikan garis rute dengan **warna khusus (Color-Coded)** yang terhubung langsung pada daftar langkah-demi-langkah interaktif di sebelah kanan peta.
* **File Baru/Terdampak:**
  * `frontend/src/app/routing/route-planner.tsx` (Logika map interaktif & OSRM API)
  * `frontend/src/lib/api/client.ts` (API Client TypeScript)

#### 3. Keamanan Otorisasi Khusus Admin
Mengingat fitur penyusunan rute membutuhkan kalkulasi berat dan bersifat rahasia secara operasional, fitur ini yang mulanya tidak ada (dan sempat terekspos di navigasi publik) kini diisolasi eksklusif hanya untuk Administrator dan Dinas Pekerjaan Umum (DPU). 
* **File Baru/Terdampak:**
  * `frontend/src/app/routing/page.tsx` (Halaman dibungkus komponen otorisasi Admin)
  * `frontend/src/components/layout/admin-shell.tsx` (Menu navigasi rute hanya muncul di sidebar dasbor Admin)
  * `frontend/src/components/layout/site-header.tsx` (Penghapusan menu dari bilah atas warga)

#### 4. Tema Antarmuka Profesional (UI/CSS)
Desain antarmuka (UI) dari rute secara spesifik disesuaikan dengan nuansa korporat *AdminShell* yang rapi, terang, responsif, dan mudah dibaca tanpa ada jargon-jargon perhitungan matematika yang dapat membingungkan operator yang tidak memiliki latar belakang IT.
* **File Baru/Terdampak:**
  * `frontend/src/app/routing/routing.css` (Implementasi penataan flex/grid yang estetik dan adaptif)
