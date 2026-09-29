const express = require('express');
const db = require('../db');
const queue = require('../lib/queue');

const router = express.Router();

const URUTAN_STATUS = ['menunggu', 'dipanggil', 'selesai', 'batal', 'tidak_hadir'];

function ringkasanHariIni() {
  const tanggal = queue.todayStr();
  const daftarKapster = db.prepare('SELECT * FROM kapster ORDER BY aktif DESC, nama ASC').all();

  return daftarKapster.map((k) => {
    const baris = db
      .prepare('SELECT status, COUNT(*) AS jumlah FROM antrean WHERE kapster_id = ? AND tanggal = ? GROUP BY status')
      .all(k.id, tanggal);

    const hitung = {};
    URUTAN_STATUS.forEach((s) => {
      hitung[s] = 0;
    });
    baris.forEach((b) => {
      hitung[b.status] = b.jumlah;
    });

    const totalHariIni = URUTAN_STATUS.reduce((sum, s) => sum + hitung[s], 0);

    const sedangDilayani = db
      .prepare(
        `SELECT antrean.* FROM antrean WHERE kapster_id = ? AND tanggal = ? AND status = 'dipanggil' LIMIT 1`
      )
      .get(k.id, tanggal);

    let layananSedangDilayani = [];
    if (sedangDilayani) {
      layananSedangDilayani = queue.getLayananUntukAntrean(db, sedangDilayani.id);
    }

    return {
      kapster: k,
      hitung,
      totalHariIni,
      sedangDilayani,
      layananSedangDilayani
    };
  });
}

router.get('/', (req, res) => {
  res.render('dashboard', {
    title: 'Dashboard',
    ringkasan: ringkasanHariIni(),
    tanggalHariIni: queue.todayStr()
  });
});

module.exports = router;
