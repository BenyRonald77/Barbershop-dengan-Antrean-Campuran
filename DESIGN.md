# DESIGN.md — Arah Desain Barbershop dengan Antrean Campuran

Catatan jujur: arah desain di bawah ini ditulis oleh pembuat aplikasi (bukan dari pemilik usaha), untuk kebutuhan alat operasional internal toko. Ini bukan brief dari pemilik barbershop asli, jadi anggap ini sebagai draf arah desain kerja, bukan identitas merek final yang sudah disetujui pemilik usaha.

## Identitas & Nuansa

Alat ini dipakai kasir setiap hari di tempat yang sibuk: layar dilihat sambil berdiri, sering diselingi obrolan dengan pelanggan. Nuansa yang dituju adalah bengkel cukur yang mapan dan tenang dalam bekerja (kulit, kayu, logam tua), bukan aplikasi startup yang ramai. Warna gelap dipakai bukan karena tren "dark mode terlihat teknis", tapi karena layar kasir sering menyala berjam-jam di ruangan dengan pencahayaan barbershop yang cenderung hangat dan redup, dan warna gelap hangat lebih nyaman dilihat lama dibanding putih terang.

## Palet Warna

Maksimal 2-3 warna inti + 1 aksen (di luar warna netral), sesuai batas palet:

| Peran | Warna | Alasan satu baris |
|---|---|---|
| Latar utama (netral gelap) | `#1C1916` | Charcoal hangat (bukan abu-abu kebiruan) supaya terasa seperti kayu/kulit tua, bukan tema "tech gelap" generik. |
| Teks/permukaan terang (netral) | `#F3ECE2` | Krem gading, bukan putih murni, supaya kontras di atas charcoal tetap hangat dan tidak menyilaukan mata kasir yang menatap layar lama. |
| Abu-abu teks sekunder (netral) | `#9C8D7D` | Untuk label dan teks pendukung, kontrasnya sengaja dijaga di atas 4.5:1 terhadap latar gelap maupun terang. |
| Warna inti 1 | `#6B2B2E` (oxblood/merah anggur tua) | Dipakai untuk nav bar dan header seksi, mengingatkan pada kursi kulit barbershop klasik tanpa meniru pola barber pole yang klise. |
| Warna aksen | `#C9822F` (tembaga/amber) | Satu warna aksen untuk tombol aksi utama (Panggil Berikutnya, kirim booking, kirim WhatsApp) dan banner "giliran hampir tiba", dipakai sedikit dan konsisten supaya mata langsung tahu mana tindakan yang bisa ditekan. |

Warna status fungsional (bukan bagian dari palet dekoratif, tapi kebutuhan legibilitas data, tetap desaturasi supaya tidak menambah "jumlah warna" di layar):
- Menunggu: abu-netral `#9C8D7D` pada badge outline.
- Dipanggil: aksen tembaga `#C9822F` (menandakan sedang aktif/perlu perhatian).
- Selesai: hijau lumut redup `#5C7A52` (bukan hijau neon), menandakan status selesai secara jujur tanpa menambah kegembiraan visual yang tidak perlu.
- Batal / Tidak Hadir: merah bata redup `#8C4B42`, dibedakan dari oxblood inti supaya tidak tertukar dengan warna nav.

Latar terang dipakai pada halaman publik (booking dan cek status) memakai kartu krem gading `#F3ECE2` di atas charcoal, bukan seluruh halaman putih, supaya tetap satu keluarga warna dengan sisi kasir.

## Tipografi

Stack: `system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`.

Alasan: ini alat internal yang harus tetap terbuka cepat walau koneksi wifi toko lambat atau putus sesaat, jadi font sistem dipakai supaya tidak ada permintaan ke CDN font sama sekali (bukan gaya "terlihat teknis", tapi keandalan offline yang nyata). Tidak ada font judul terpisah: variasi hierarki cukup dari ukuran dan ketebalan huruf dalam satu keluarga font yang sama, supaya halaman tetap konsisten dan ringan dimuat.

## Dial Liveliness

| Dial | Nilai | Alasan satu baris |
|---|---|---|
| ENERGY | 2 (Balanced, semacam Stripe/Vercel) | Alat operasional harian butuh terasa hidup dan punya identitas warna, tapi tidak boleh riuh karena dipakai berulang kali sepanjang hari kerja. |
| RHYTHM | 2 (konsisten dengan sedikit variasi) | Dashboard, papan antrean, dan halaman booking punya kebutuhan konten berbeda sehingga tata letaknya sengaja tidak seragam, tapi tetap satu bahasa visual supaya kasir tidak bingung berpindah halaman. |
| MOTION | 1 (hover state saja, tanpa animasi hias) | Data antrean berubah setiap saat lewat polling; animasi hias hanya akan mengganggu pembacaan angka yang berubah cepat, jadi gerakan dibatasi pada umpan balik interaksi (hover, fokus, transisi status singkat). |

## Bacaan Desain (Design Read)

Membaca ini sebagai: alat manajemen antrean internal untuk kasir dan halaman publik ringan untuk pelanggan, gaya visual craft/bengkel cukur yang hangat dan tenang, dial ENERGY 2 / RHYTHM 2 / MOTION 1.

## Keputusan Layout Utama & Alasan

- **Papan antrean berbasis kolom per kapster** (bukan tabel tunggal semua kapster dicampur): kasir perlu melihat sekilas antrean kapster mana yang menumpuk, jadi pengelompokan per kapster adalah kebutuhan konten, bukan dekorasi grid.
- **Tidak ada sidebar/dashboard shell generik.** Navigasi memakai top nav sederhana berisi halaman yang benar-benar ada (Dashboard, Kapster, Layanan, Antrean, Booking, Cek Status), karena aplikasi ini kecil dan sidebar hanya akan menjadi ruang kosong.
- **Kartu dipakai hanya untuk satuan antrean dan ringkasan kapster**, bukan untuk setiap elemen UI, supaya kartu tetap berarti "satu entitas" dan tidak menjadi dekorasi kosong.
- **Radius kecil dan konsisten** (6-10px) dipakai di tombol, input, dan kartu; tidak ada bentuk pil di semua elemen, supaya radius tetap terasa sebagai pilihan bukan default.
- **Bayangan dipakai tipis, hanya pada kartu antrean yang sedang `dipanggil`**, sebagai penanda elevasi status aktif, bukan default di semua kartu.
