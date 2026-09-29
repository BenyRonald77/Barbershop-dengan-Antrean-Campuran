// Logika inti antrean campuran: pembuatan nomor antrean harian per kapster,
// estimasi waktu tunggu, dan perpindahan status. Dipakai bersama oleh route
// booking, walk-in, dan papan antrean supaya aturannya konsisten di satu tempat.

const AMBANG_HAMPIR_TIBA_MENIT = 10;

function todayStr(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function nowIso() {
  return new Date().toISOString();
}

class AturanAntreanError extends Error {}

function buatAntrean(db, { kapsterId, tipe, namaPelanggan, noHp, layananIds }) {
  const jalankan = db.transaction(() => {
    const kapster = db.prepare('SELECT * FROM kapster WHERE id = ? AND aktif = 1').get(kapsterId);
    if (!kapster) {
      throw new AturanAntreanError('Kapster tidak ditemukan atau sedang tidak aktif.');
    }
    if (!namaPelanggan || !namaPelanggan.trim()) {
      throw new AturanAntreanError('Nama pelanggan wajib diisi.');
    }
    if (!Array.isArray(layananIds) || layananIds.length === 0) {
      throw new AturanAntreanError('Pilih minimal satu layanan.');
    }

    const layananRows = layananIds.map((id) => {
      const row = db.prepare('SELECT * FROM layanan WHERE id = ?').get(id);
      if (!row) throw new AturanAntreanError('Salah satu layanan yang dipilih tidak ditemukan.');
      return row;
    });

    const totalDurasi = layananRows.reduce((sum, l) => sum + l.durasi_menit, 0);
    const tanggal = todayStr();
    const jumlahHariIni = db
      .prepare('SELECT COUNT(*) AS c FROM antrean WHERE kapster_id = ? AND tanggal = ?')
      .get(kapsterId, tanggal).c;
    const urutan = jumlahHariIni + 1;
    const nomorAntre = `${kapster.kode}-${String(urutan).padStart(2, '0')}`;
    const dibuatPada = nowIso();

    const info = db
      .prepare(
        `INSERT INTO antrean
          (kapster_id, nomor_antre, tanggal, urutan_harian, tipe, nama_pelanggan, no_hp, status, total_durasi_menit, dibuat_pada)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'menunggu', ?, ?)`
      )
      .run(kapsterId, nomorAntre, tanggal, urutan, tipe, namaPelanggan.trim(), noHp ? noHp.trim() : null, totalDurasi, dibuatPada);

    const antreanId = info.lastInsertRowid;
    const insertLayanan = db.prepare(
      `INSERT INTO antrean_layanan (antrean_id, layanan_id, durasi_menit_saat_itu, harga_saat_itu)
       VALUES (?, ?, ?, ?)`
    );
    for (const l of layananRows) {
      insertLayanan.run(antreanId, l.id, l.durasi_menit, l.harga);
    }

    return antreanId;
  });

  return jalankan();
}

function getAntreanById(db, id) {
  return db
    .prepare(
      `SELECT antrean.*, kapster.nama AS kapster_nama, kapster.kode AS kapster_kode
       FROM antrean JOIN kapster ON kapster.id = antrean.kapster_id
       WHERE antrean.id = ?`
    )
    .get(id);
}

function getLayananUntukAntrean(db, antreanId) {
  return db
    .prepare(
      `SELECT antrean_layanan.*, layanan.nama AS layanan_nama
       FROM antrean_layanan JOIN layanan ON layanan.id = antrean_layanan.layanan_id
       WHERE antrean_id = ?`
    )
    .all(antreanId);
}

function listAntreanKapsterHariIni(db, kapsterId, tanggal = todayStr()) {
  return db
    .prepare(
      `SELECT * FROM antrean WHERE kapster_id = ? AND tanggal = ? ORDER BY dibuat_pada ASC`
    )
    .all(kapsterId, tanggal);
}

// Antrean di depan (dibuat lebih dulu) pada kapster yang sama, yang masih
// berstatus menunggu atau dipanggil, dalam urutan waktu dibuat.
function antreanDiDepan(db, antrean) {
  return db
    .prepare(
      `SELECT * FROM antrean
       WHERE kapster_id = ? AND tanggal = ? AND dibuat_pada < ?
         AND status IN ('menunggu', 'dipanggil')
       ORDER BY dibuat_pada ASC`
    )
    .all(antrean.kapster_id, antrean.tanggal, antrean.dibuat_pada);
}

// Estimasi menit tunggu sebelum antrean ini dipanggil. Lihat PRD bagian
// "Aturan Bisnis Penting" untuk rumus lengkapnya.
function estimasiTungguMenit(db, antrean) {
  if (antrean.status === 'dipanggil') return 0;
  if (antrean.status !== 'menunggu') return null;

  const didepan = antreanDiDepan(db, antrean);
  let totalMenit = didepan.reduce((sum, a) => sum + a.total_durasi_menit, 0);

  const yangSedangDipanggil = didepan.find((a) => a.status === 'dipanggil');
  if (yangSedangDipanggil && yangSedangDipanggil.mulai_pada) {
    const elapsedMs = Date.now() - new Date(yangSedangDipanggil.mulai_pada).getTime();
    const elapsedMenit = Math.floor(elapsedMs / 60000);
    totalMenit -= elapsedMenit;
  }

  return Math.max(0, totalMenit);
}

// Posisi urutan di antara pelanggan yang masih menunggu (tidak menghitung
// yang sedang dipanggil karena sudah duduk di kursi).
function posisiTunggu(db, antrean) {
  if (antrean.status !== 'menunggu') return null;
  const didepan = antreanDiDepan(db, antrean).filter((a) => a.status === 'menunggu');
  return didepan.length + 1;
}

function apakahBerikutnya(db, antrean) {
  if (antrean.status !== 'menunggu') return false;
  const berikutnya = db
    .prepare(
      `SELECT id FROM antrean WHERE kapster_id = ? AND tanggal = ? AND status = 'menunggu'
       ORDER BY dibuat_pada ASC LIMIT 1`
    )
    .get(antrean.kapster_id, antrean.tanggal);
  return !!berikutnya && berikutnya.id === antrean.id;
}

// Kondisi "giliran hampir tiba": antrean ini berikutnya dalam antrean, ATAU
// estimasi tunggunya sudah 10 menit atau kurang.
function giliranHampirTiba(db, antrean) {
  if (antrean.status !== 'menunggu') return false;
  const estimasi = estimasiTungguMenit(db, antrean);
  return apakahBerikutnya(db, antrean) || (estimasi !== null && estimasi <= AMBANG_HAMPIR_TIBA_MENIT);
}

function panggilBerikutnya(db, kapsterId) {
  const jalankan = db.transaction(() => {
    const tanggal = todayStr();
    const sedangDilayani = db
      .prepare(`SELECT id FROM antrean WHERE kapster_id = ? AND tanggal = ? AND status = 'dipanggil'`)
      .get(kapsterId, tanggal);
    if (sedangDilayani) {
      throw new AturanAntreanError('Masih ada pelanggan yang sedang dilayani kapster ini.');
    }
    const berikutnya = db
      .prepare(
        `SELECT * FROM antrean WHERE kapster_id = ? AND tanggal = ? AND status = 'menunggu'
         ORDER BY dibuat_pada ASC LIMIT 1`
      )
      .get(kapsterId, tanggal);
    if (!berikutnya) {
      throw new AturanAntreanError('Tidak ada antrean yang menunggu untuk kapster ini.');
    }
    db.prepare(`UPDATE antrean SET status = 'dipanggil', mulai_pada = ? WHERE id = ?`).run(
      nowIso(),
      berikutnya.id
    );
    return berikutnya.id;
  });
  return jalankan();
}

function tandaiSelesai(db, antreanId) {
  const jalankan = db.transaction(() => {
    const antrean = getAntreanById(db, antreanId);
    if (!antrean) throw new AturanAntreanError('Antrean tidak ditemukan.');
    if (antrean.status !== 'dipanggil') {
      throw new AturanAntreanError('Hanya antrean yang sedang dipanggil yang bisa diselesaikan.');
    }
    db.prepare(`UPDATE antrean SET status = 'selesai', selesai_pada = ? WHERE id = ?`).run(
      nowIso(),
      antreanId
    );
  });
  jalankan();
}

function tandaiBatal(db, antreanId) {
  const jalankan = db.transaction(() => {
    const antrean = getAntreanById(db, antreanId);
    if (!antrean) throw new AturanAntreanError('Antrean tidak ditemukan.');
    if (antrean.status !== 'menunggu') {
      throw new AturanAntreanError('Hanya antrean yang masih menunggu yang bisa dibatalkan.');
    }
    db.prepare(`UPDATE antrean SET status = 'batal', selesai_pada = ? WHERE id = ?`).run(
      nowIso(),
      antreanId
    );
  });
  jalankan();
}

function tandaiTidakHadir(db, antreanId) {
  const jalankan = db.transaction(() => {
    const antrean = getAntreanById(db, antreanId);
    if (!antrean) throw new AturanAntreanError('Antrean tidak ditemukan.');
    if (antrean.status !== 'dipanggil') {
      throw new AturanAntreanError('Hanya antrean yang sedang dipanggil yang bisa ditandai tidak hadir.');
    }
    db.prepare(`UPDATE antrean SET status = 'tidak_hadir', selesai_pada = ? WHERE id = ?`).run(
      nowIso(),
      antreanId
    );
  });
  jalankan();
}

function catatNotifikasiTerkirim(db, antreanId) {
  const antrean = getAntreanById(db, antreanId);
  if (!antrean) throw new AturanAntreanError('Antrean tidak ditemukan.');
  if (!antrean.no_hp) throw new AturanAntreanError('Antrean ini tidak punya nomor HP untuk dihubungi.');
  db.prepare(`UPDATE antrean SET notifikasi_terkirim_pada = ? WHERE id = ?`).run(nowIso(), antreanId);
}

function buatPesanWhatsapp(db, antrean) {
  const estimasi = estimasiTungguMenit(db, antrean);
  let isiGiliran;
  if (antrean.status === 'dipanggil') {
    isiGiliran = 'Sekarang giliran Anda, silakan menuju kursi kapster.';
  } else if (estimasi !== null && estimasi <= AMBANG_HAMPIR_TIBA_MENIT) {
    isiGiliran = `Giliran Anda sebentar lagi, kurang lebih ${estimasi} menit lagi.`;
  } else {
    isiGiliran = `Estimasi tunggu Anda saat ini sekitar ${estimasi} menit.`;
  }
  const pesan =
    `Halo ${antrean.nama_pelanggan}, ini info antrean di ${antrean.kapster_nama || 'barbershop'} ` +
    `dengan nomor antre ${antrean.nomor_antre}. ${isiGiliran}`;
  return pesan;
}

function nomorHpKeWa(noHp) {
  const digitSaja = (noHp || '').replace(/[^0-9]/g, '');
  if (digitSaja.startsWith('0')) return '62' + digitSaja.slice(1);
  if (digitSaja.startsWith('62')) return digitSaja;
  return digitSaja;
}

function cariAntreanUntukCek(db, { noHp, nomorAntre }) {
  const tanggal = todayStr();
  if (nomorAntre) {
    return db
      .prepare(`SELECT * FROM antrean WHERE tanggal = ? AND nomor_antre = ? ORDER BY dibuat_pada DESC`)
      .all(tanggal, nomorAntre.trim().toUpperCase());
  }
  if (noHp) {
    return db
      .prepare(`SELECT * FROM antrean WHERE tanggal = ? AND no_hp = ? ORDER BY dibuat_pada DESC`)
      .all(tanggal, noHp.trim());
  }
  return [];
}

module.exports = {
  AturanAntreanError,
  todayStr,
  nowIso,
  buatAntrean,
  getAntreanById,
  getLayananUntukAntrean,
  listAntreanKapsterHariIni,
  estimasiTungguMenit,
  posisiTunggu,
  apakahBerikutnya,
  giliranHampirTiba,
  panggilBerikutnya,
  tandaiSelesai,
  tandaiBatal,
  tandaiTidakHadir,
  catatNotifikasiTerkirim,
  buatPesanWhatsapp,
  nomorHpKeWa,
  cariAntreanUntukCek,
  AMBANG_HAMPIR_TIBA_MENIT
};
