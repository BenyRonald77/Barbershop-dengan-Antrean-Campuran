const express = require('express');
const db = require('../db');

const router = express.Router();

function semuaKapster() {
  return db.prepare('SELECT * FROM kapster ORDER BY nama ASC').all();
}

router.get('/', (req, res) => {
  res.render('kapster/index', {
    title: 'Kapster',
    daftarKapster: semuaKapster()
  });
});

router.post('/', (req, res) => {
  const { kode, nama } = req.body;
  if (!kode || !kode.trim() || !nama || !nama.trim()) {
    return res.redirect('/kapster?error=' + encodeURIComponent('Kode dan nama kapster wajib diisi.'));
  }
  try {
    db.prepare('INSERT INTO kapster (kode, nama, aktif) VALUES (?, ?, 1)').run(
      kode.trim().toUpperCase(),
      nama.trim()
    );
    res.redirect('/kapster?success=' + encodeURIComponent(`Kapster "${nama.trim()}" ditambahkan.`));
  } catch (err) {
    let pesan = 'Gagal menambahkan kapster.';
    if (String(err.message).includes('UNIQUE')) {
      pesan = `Kode "${kode.trim().toUpperCase()}" sudah dipakai kapster lain.`;
    }
    res.redirect('/kapster?error=' + encodeURIComponent(pesan));
  }
});

router.post('/:id/update', (req, res) => {
  const { kode, nama } = req.body;
  if (!kode || !kode.trim() || !nama || !nama.trim()) {
    return res.redirect('/kapster?error=' + encodeURIComponent('Kode dan nama kapster wajib diisi.'));
  }
  try {
    db.prepare('UPDATE kapster SET kode = ?, nama = ? WHERE id = ?').run(
      kode.trim().toUpperCase(),
      nama.trim(),
      req.params.id
    );
    res.redirect('/kapster?success=' + encodeURIComponent('Data kapster diperbarui.'));
  } catch (err) {
    let pesan = 'Gagal memperbarui kapster.';
    if (String(err.message).includes('UNIQUE')) {
      pesan = `Kode "${kode.trim().toUpperCase()}" sudah dipakai kapster lain.`;
    }
    res.redirect('/kapster?error=' + encodeURIComponent(pesan));
  }
});

router.post('/:id/toggle', (req, res) => {
  const kapster = db.prepare('SELECT * FROM kapster WHERE id = ?').get(req.params.id);
  if (!kapster) {
    return res.redirect('/kapster?error=' + encodeURIComponent('Kapster tidak ditemukan.'));
  }
  db.prepare('UPDATE kapster SET aktif = ? WHERE id = ?').run(kapster.aktif ? 0 : 1, kapster.id);
  const pesan = kapster.aktif
    ? `${kapster.nama} dinonaktifkan.`
    : `${kapster.nama} diaktifkan kembali.`;
  res.redirect('/kapster?success=' + encodeURIComponent(pesan));
});

module.exports = router;
