const express = require('express');
const db = require('../db');
const queue = require('../lib/queue');

const router = express.Router();

function kapsterAktif() {
  return db.prepare('SELECT * FROM kapster WHERE aktif = 1 ORDER BY nama ASC').all();
}

function semuaLayanan() {
  return db.prepare('SELECT * FROM layanan ORDER BY nama ASC').all();
}

router.get('/', (req, res) => {
  res.render('booking/form', {
    title: 'Booking Online',
    daftarKapster: kapsterAktif(),
    daftarLayanan: semuaLayanan()
  });
});

router.post('/', (req, res) => {
  const { kapster_id, nama_pelanggan, no_hp, layanan_id } = req.body;
  const layananIds = Array.isArray(layanan_id) ? layanan_id : layanan_id ? [layanan_id] : [];
  const daftarKapster = kapsterAktif();
  const daftarLayanan = semuaLayanan();

  try {
    if (!no_hp || !no_hp.trim()) {
      throw new queue.AturanAntreanError('Nomor HP wajib diisi supaya kami bisa mengirim info giliran.');
    }
    const id = queue.buatAntrean(db, {
      kapsterId: kapster_id,
      tipe: 'booking',
      namaPelanggan: nama_pelanggan,
      noHp: no_hp,
      layananIds
    });
    res.redirect('/booking/hasil/' + id);
  } catch (err) {
    res.render('booking/form', {
      title: 'Booking Online',
      daftarKapster,
      daftarLayanan,
      pesanError: err.message,
      inputSebelumnya: req.body
    });
  }
});

router.get('/hasil/:id', (req, res) => {
  const antrean = queue.getAntreanById(db, req.params.id);
  if (!antrean) {
    return res.redirect('/booking?error=' + encodeURIComponent('Data booking tidak ditemukan.'));
  }
  res.render('booking/hasil', {
    title: 'Booking Berhasil',
    antrean,
    estimasiMenit: queue.estimasiTungguMenit(db, antrean),
    posisi: queue.posisiTunggu(db, antrean),
    layanan: queue.getLayananUntukAntrean(db, antrean.id)
  });
});

module.exports = router;
