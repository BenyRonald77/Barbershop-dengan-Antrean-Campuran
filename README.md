# Barbershop dengan Antrean Campuran

Aplikasi manajemen antrean untuk barbershop yang menggabungkan booking online dan pelanggan walk-in ke dalam satu antrean per kapster, dengan estimasi waktu tunggu otomatis dan notifikasi giliran lewat WhatsApp.

Dokumen lengkap: [PRD.md](./PRD.md) untuk kebutuhan produk, [DESIGN.md](./DESIGN.md) untuk arah desain.

## Menjalankan Proyek

Butuh Node.js versi 18 ke atas.

```bash
npm install
npm start
```

Setelah berjalan, buka `http://localhost:3000` di browser. Tidak ada langkah build tambahan, dan tidak ada sistem login (lihat bagian "Di Luar Ruang Lingkup" di PRD.md).

Port bisa diganti lewat variabel lingkungan `PORT`, misalnya:

```bash
PORT=8080 npm start
```

## Penyimpanan Data

Data disimpan di file SQLite `data/app.db`, dibuat otomatis saat server pertama kali dijalankan. File ini tidak ikut disimpan di repository (lihat `.gitignore`); skema tabelnya ada di `db/schema.js` dan dijalankan ulang secara aman setiap kali server dinyalakan.

Untuk memulai dari data kosong, hentikan server lalu hapus `data/app.db` (beserta `data/app.db-wal` dan `data/app.db-shm` jika ada).

## Struktur Proyek

```
server.js           Bootstrap Express, pemasangan semua route
db/                  Koneksi database dan skema tabel
lib/                 Logika bisnis inti (perhitungan antrean) dan util format
routes/              Route per fitur: dashboard, kapster, layanan, antrean, booking
views/               Template EJS, dibagi per fitur, dengan partials/ untuk header & footer bersama
public/              Aset statis: CSS murni dan JavaScript sisi klien seperlunya
```

## Alur Pemakaian Singkat

1. Buka **Kapster** untuk menambahkan kapster yang bekerja hari itu.
2. Buka **Layanan** untuk menambahkan jenis layanan beserta durasi dan harganya.
3. Pelanggan booking online lewat halaman **Booking**, atau kasir menambahkan pelanggan walk-in lewat **Papan Antrean**.
4. Kasir menjalankan antrean dari **Papan Antrean**: Panggil Berikutnya, Selesai, Tidak Hadir, atau Batal.
5. Pelanggan bisa memantau posisi antreannya sendiri lewat **Cek Status**, memasukkan nomor HP atau nomor antrean.
6. Saat giliran pelanggan sudah dekat, kasir bisa menekan **Kirim Notifikasi WhatsApp** pada antrean tersebut untuk membuka pesan siap kirim ke nomor HP pelanggan.

## Catatan Notifikasi WhatsApp

Tombol notifikasi tidak mengirim pesan secara otomatis. Tombol ini membuka tautan `wa.me` berisi pesan yang sudah disiapkan, dan kasir sendiri yang menekan kirim di aplikasi WhatsApp. Waktu penggunaan tombol ini dicatat di data antrean sebagai bukti bahwa notifikasi sudah diproses.
