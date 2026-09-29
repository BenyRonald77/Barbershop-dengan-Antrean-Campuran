const express = require('express');
const db = require('../db');

const router = express.Router();

function semuaLayanan() {
  return db.prepare('SELECT * FROM layanan ORDER BY nama ASC').all();
}

router.get('/', (req, res) => {
  res.render('layanan/index', {
    title: 'Layanan',
    daftarLayanan: semuaLayanan()
  });
});

router.post('/', (req, res) => {
  const { nama, durasi_menit, harga } = req.body;
  const durasi = parseInt(durasi_menit, 10);
  const hargaAngka = parseInt(harga, 10);
  if (!nama || !nama.trim() || !Number.isInteger(durasi) || durasi <= 0 || !Number.isInteger(hargaAngka) || hargaAngka < 0) {
    return res.redirect(
      '/layanan?error=' + encodeURIComponent('Nama, durasi (menit, angka positif), dan harga wajib diisi dengan benar.')
    );
  }
  db.prepare('INSERT INTO layanan (nama, durasi_menit, harga) VALUES (?, ?, ?)').run(
    nama.trim(),
    durasi,
    hargaAngka
  );
  res.redirect('/layanan?success=' + encodeURIComponent(`Layanan "${nama.trim()}" ditambahkan.`));
});

router.post('/:id/update', (req, res) => {
  const { nama, durasi_menit, harga } = req.body;
  const durasi = parseInt(durasi_menit, 10);
  const hargaAngka = parseInt(harga, 10);
  if (!nama || !nama.trim() || !Number.isInteger(durasi) || durasi <= 0 || !Number.isInteger(hargaAngka) || hargaAngka < 0) {
    return res.redirect(
      '/layanan?error=' + encodeURIComponent('Nama, durasi (menit, angka positif), dan harga wajib diisi dengan benar.')
    );
  }
  db.prepare('UPDATE layanan SET nama = ?, durasi_menit = ?, harga = ? WHERE id = ?').run(
    nama.trim(),
    durasi,
    hargaAngka,
    req.params.id
  );
  res.redirect('/layanan?success=' + encodeURIComponent('Data layanan diperbarui.'));
});

router.post('/:id/delete', (req, res) => {
  const dipakai = db
    .prepare('SELECT COUNT(*) AS c FROM antrean_layanan WHERE layanan_id = ?')
    .get(req.params.id).c;
  if (dipakai > 0) {
    return res.redirect(
      '/layanan?error=' +
        encodeURIComponent('Layanan ini sudah pernah dipakai di riwayat antrean, tidak bisa dihapus.')
    );
  }
  db.prepare('DELETE FROM layanan WHERE id = ?').run(req.params.id);
  res.redirect('/layanan?success=' + encodeURIComponent('Layanan dihapus.'));
});

module.exports = router;
