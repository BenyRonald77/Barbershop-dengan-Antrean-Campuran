# PRD: Barbershop dengan Antrean Campuran

## Latar Belakang & Tujuan

Barbershop pada umumnya melayani dua jenis pelanggan: pelanggan yang datang langsung (walk-in) dan pelanggan yang sudah memesan lebih dulu secara online (booking). Masalah yang sering muncul adalah kedua jenis pelanggan ini dikelola secara terpisah, sehingga kapster bisa bingung siapa yang harus dilayani lebih dulu, dan pelanggan tidak tahu berapa lama lagi mereka harus menunggu.

Aplikasi ini menyatukan booking online dan walk-in ke dalam satu antrean per kapster yang berjalan berdasarkan urutan kedatangan (FIFO), lalu menghitung estimasi waktu tunggu dari total durasi layanan yang dipilih setiap pelanggan di depannya. Tujuannya:

1. Kasir punya satu papan antrean per kapster yang jelas, tanpa perlu menggabungkan catatan booking dan walk-in secara manual.
2. Pelanggan tahu perkiraan waktu tunggu mereka tanpa harus bertanya berulang kali ke kasir.
3. Pelanggan mendapat tanda peringatan ketika gilirannya hampir tiba, sehingga tidak perlu menunggu di tempat sepanjang waktu.

## Target Pengguna

- **Kasir/admin toko**: mengelola data kapster dan layanan, menjalankan papan antrean (memanggil, menyelesaikan, membatalkan), dan menambahkan pelanggan walk-in.
- **Pelanggan**: melakukan booking online dari HP sendiri, atau menjadi walk-in yang didaftarkan kasir di tempat. Pelanggan juga bisa membuka halaman cek status untuk memantau posisi antreannya.

## Ruang Lingkup Fitur

1. Manajemen data kapster (tambah, ubah, aktif/nonaktif).
2. Manajemen data layanan (nama, durasi dalam menit, harga).
3. Antrean campuran per kapster: walk-in dan booking online masuk ke satu antrean yang sama, urut berdasarkan waktu dibuat.
4. Booking online publik: pelanggan memilih kapster, satu atau lebih layanan, mengisi nama dan nomor HP, lalu mendapat nomor antrean beserta estimasi waktu tunggu.
5. Papan antrean (kasir): melihat status semua antrean per kapster hari ini dan menjalankan aksi Panggil Berikutnya, Selesai, Tidak Hadir, Batal.
6. Halaman cek status antrean publik: pelanggan memasukkan nomor HP atau nomor antrean untuk melihat posisi dan estimasi waktu tunggu secara real time (polling berkala).
7. Notifikasi giliran hampir tiba: ditampilkan sebagai banner di halaman cek status, ditambah tombol kasir untuk mengirim pesan WhatsApp nyata ke pelanggan (deep link wa.me) dan mencatat waktu pengiriman.
8. Dashboard ringkasan: jumlah antrean hari ini per kapster berdasarkan status, dan siapa yang sedang dilayani.

## Di Luar Ruang Lingkup

- **Tidak ada sistem login/autentikasi.** Ini adalah alat internal single-tenant untuk satu toko, dipakai di satu perangkat kasir. Ini adalah keputusan pemotongan lingkup yang disengaja, bukan kelalaian, agar fokus pengembangan ada di alur antrean itu sendiri.
- Tidak ada pembayaran online atau integrasi kasir/POS.
- Tidak ada pengiriman SMS/push notification otomatis melalui pihak ketiga berbayar. Notifikasi WhatsApp dilakukan dengan deep link manual yang dipicu kasir, bukan pengiriman otomatis di background, karena pengiriman otomatis butuh akun WhatsApp Business API berbayar yang berada di luar lingkup versi ini.
- Tidak ada manajemen multi-cabang/multi-toko.
- Tidak ada laporan keuangan/rekap pendapatan (harga dicatat per antrean untuk keperluan riwayat, tapi laporan keuangan lengkap ditunda ke versi berikutnya).

## Model Data & Entitas

- **kapster**: `id`, `kode` (kode singkat untuk penomoran antrean, misal "B"), `nama`, `aktif` (0/1).
- **layanan**: `id`, `nama`, `durasi_menit`, `harga`.
- **antrean**: `id`, `kapster_id`, `nomor_antre` (contoh "B-01", reset harian per kapster), `tipe` (`booking` atau `walkin`), `nama_pelanggan`, `no_hp`, `status` (`menunggu`, `dipanggil`, `selesai`, `batal`, `tidak_hadir`), `total_durasi_menit`, `dibuat_pada`, `mulai_pada`, `selesai_pada`, `notifikasi_terkirim_pada`.
- **antrean_layanan**: tabel penghubung agar satu antrean bisa memuat beberapa layanan sekaligus: `id`, `antrean_id`, `layanan_id`, `durasi_menit_saat_itu`, `harga_saat_itu` (dicatat pada saat transaksi supaya riwayat tidak berubah kalau harga layanan diubah di kemudian hari).

## Alur Pengguna Utama

**Alur booking online:**
1. Pelanggan membuka halaman `/booking`.
2. Memilih kapster yang aktif, memilih satu atau lebih layanan, mengisi nama dan nomor HP.
3. Sistem menghitung total durasi, membuat nomor antrean baru untuk kapster tersebut hari ini, menyimpan baris `antrean` dengan `tipe = booking` dan status `menunggu`.
4. Pelanggan melihat halaman hasil: nomor antrean dan estimasi waktu tunggu saat itu.

**Alur walk-in:**
1. Pelanggan datang ke toko, kasir membuka `/antrean`.
2. Kasir memilih kapster, mencatat nama dan nomor HP (opsional untuk notifikasi), memilih layanan, menekan "Tambah Walk-in".
3. Sistem membuat baris `antrean` dengan `tipe = walkin`, masuk ke antrean kapster yang sama, di posisi berikutnya sesuai waktu dibuat.

**Alur kasir menjalankan antrean:**
1. Kasir membuka papan `/antrean`, melihat daftar per kapster terurut `menunggu` lalu `dipanggil`.
2. Menekan "Panggil Berikutnya" untuk antrean `menunggu` paling depan pada kapster tersebut, statusnya berubah `dipanggil` dan `mulai_pada` diisi waktu sekarang.
3. Setelah selesai memotong, menekan "Selesai", status menjadi `selesai`, `selesai_pada` diisi.
4. Jika pelanggan tidak muncul saat dipanggil, kasir menekan "Tidak Hadir". Jika pelanggan/kasir membatalkan sebelum dipanggil, menekan "Batal".
5. Ketika sisa waktu tunggu pelanggan berikutnya sudah dekat, kasir dapat menekan "Kirim Notifikasi WhatsApp" yang membuka chat WhatsApp berisi pesan giliran ke nomor HP pelanggan tersebut.

**Alur cek status pelanggan:**
1. Pelanggan membuka `/antrean/cek`, memasukkan nomor HP atau nomor antrean.
2. Halaman menampilkan posisi antrean, estimasi waktu tunggu, dan status saat ini.
3. Halaman melakukan polling setiap kurang lebih 10 detik. Jika kondisi "giliran hampir tiba" terpenuhi, tampil banner yang jelas.

## Aturan Bisnis Penting

- **Satu antrean gabungan per kapster.** Booking online dan walk-in untuk kapster yang sama masuk ke tabel `antrean` yang sama, tidak dipisah tabel atau flag prioritas. Urutan layanan murni FIFO berdasarkan kolom `dibuat_pada`.
- **Penomoran antrean harian per kapster.** Nomor antrean berbentuk `<kode kapster>-<urutan 2 digit>`, contoh "B-01", "B-02". Urutan dihitung ulang dari 1 setiap hari untuk setiap kapster (dihitung dari jumlah baris `antrean` yang dibuat untuk kapster tersebut pada tanggal berjalan, dijalankan di dalam transaksi database agar tidak ada nomor yang bentrok).
- **Cara menghitung estimasi waktu tunggu** untuk sebuah antrean berstatus `menunggu`:
  1. Ambil semua antrean pada kapster yang sama, yang dibuat lebih dulu (`dibuat_pada` lebih awal) dan masih berstatus `menunggu` atau `dipanggil`.
  2. Jumlahkan `total_durasi_menit` seluruh antrean tersebut.
  3. Jika ada satu antrean berstatus `dipanggil` di antaranya, kurangi hasil jumlah tersebut dengan menit yang sudah berjalan sejak `mulai_pada` sampai waktu sekarang (supaya waktu yang sudah terpakai tidak dihitung dua kali). Jika hasil pengurangan ini negatif, dianggap nol.
  4. Hasil akhir adalah estimasi menit tunggu sebelum antrean tersebut dipanggil.
- **Kondisi "giliran hampir tiba"**: benar jika antrean tersebut adalah antrean `menunggu` paling depan pada kapster itu (next-in-line), ATAU estimasi waktu tunggunya kurang dari atau sama dengan 10 menit. Kondisi ini dihitung ulang setiap kali halaman cek status melakukan polling, tidak disimpan sebagai status tersendiri.
- **Notifikasi WhatsApp bersifat manual dan jujur.** Sistem tidak pernah mengklaim mengirim SMS/push otomatis. Tombol "Kirim Notifikasi WhatsApp" membuka tautan `wa.me/<no_hp>?text=...` berisi pesan giliran yang sudah disiapkan, kasir sendiri yang menekan kirim di WhatsApp. Sistem mencatat `notifikasi_terkirim_pada` begitu tautan tersebut dibuka dari sistem, sebagai bukti bahwa notifikasi sudah diproses oleh kasir.
- **Perubahan status queue bersifat satu arah** dalam siklus normal: `menunggu -> dipanggil -> selesai`, dengan percabangan `menunggu -> batal` dan `dipanggil -> tidak_hadir`. Antrean yang sudah `selesai`, `batal`, atau `tidak_hadir` tidak bisa diubah lagi statusnya dari papan antrean.
- **Harga dan durasi dicatat saat transaksi** di `antrean_layanan` (`harga_saat_itu`, `durasi_menit_saat_itu`) supaya riwayat antrean lama tidak berubah kalau harga atau durasi layanan diedit setelahnya.

## Kebutuhan Non-Fungsional

- **Tanpa langkah build.** `npm install && npm start` harus langsung berjalan.
- **Penyimpanan lokal berbasis file** (SQLite melalui better-sqlite3) supaya toko tidak bergantung pada koneksi internet untuk operasional harian.
- **Operasi atomik** untuk hal yang perlu konsisten, seperti penerbitan nomor antrean baru, memakai transaksi database supaya tidak terjadi nomor antrean ganda saat dua permintaan datang hampir bersamaan.
- **Tampilan mobile-friendly**, karena halaman booking dan cek status kemungkinan besar dibuka dari HP pelanggan, bukan komputer.
- **Live update ringan**: papan antrean dan halaman cek status memakai polling `fetch` berkala (bukan websocket) supaya implementasi tetap sederhana dan cukup untuk skala satu toko.
- **Aksesibilitas dasar**: kontras warna teks memenuhi WCAG AA, semua tombol bisa dioperasikan dengan keyboard.

## Tumpukan Teknologi & Alasan

- **Node.js + Express**: cukup untuk aplikasi server-rendered skala kecil tanpa API kompleks, mudah dijalankan di server toko yang sederhana.
- **better-sqlite3**: database file tunggal, tidak butuh server database terpisah, operasi sinkron cocok untuk logika antrean yang harus konsisten secara berurutan (nomor antrean, perhitungan estimasi).
- **EJS**: server-rendered view, tidak butuh proses build seperti React/Vue, cocok untuk tim satu toko yang ingin menjalankan aplikasi tanpa tahapan kompilasi.
- **CSS murni buatan sendiri (tanpa Tailwind/CDN font)**: aplikasi ini adalah alat internal yang harus tetap bisa dibuka meski koneksi internet toko lambat atau terputus sesaat, jadi tidak bergantung pada CDN font atau framework CSS dari luar.
- **JavaScript vanilla seperlunya**: hanya dipakai untuk polling papan antrean/status setiap kurang lebih 10 detik dan untuk membangun tautan WhatsApp, tidak ada framework front-end.

## Rencana Rilis

1. Pasang skill kualitas kode dan desain (selesai).
2. Dokumen PRD (dokumen ini).
3. Dokumen arah desain (`DESIGN.md`).
4. Scaffold proyek: `package.json`, `server.js`, skema database, layout EJS bersama, CSS dasar.
5. Manajemen kapster dan layanan (CRUD).
6. Antrean campuran walk-in dan booking online dengan estimasi waktu tunggu dan penomoran harian.
7. Halaman cek status antrean publik dan notifikasi giliran via WhatsApp.
8. Dashboard ringkasan antrean harian.
9. README cara menjalankan proyek.
