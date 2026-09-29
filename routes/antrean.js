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

function papanAntreanData() {
  const daftarKapster = db.prepare('SELECT * FROM kapster ORDER BY aktif DESC, nama ASC').all();
  return daftarKapster.map((k) => {
    const daftarAntrean = queue.listAntreanKapsterHariIni(db, k.id).map((a) => ({
      ...a,
      estimasi_menit: queue.estimasiTungguMenit(db, a),
      layanan: queue.getLayananUntukAntrean(db, a.id)
    }));
    return {
      kapster: k,
      antreanAktif: daftarAntrean.filter((a) => a.status === 'menunggu' || a.status === 'dipanggil'),
      antreanSelesai: daftarAntrean.filter((a) => !['menunggu', 'dipanggil'].includes(a.status))
    };
  });
}

router.get('/', (req, res) => {
  res.render('antrean/board', {
    title: 'Papan Antrean',
    papan: papanAntreanData(),
    daftarKapster: kapsterAktif(),
    daftarLayanan: semuaLayanan()
  });
});

// Data JSON ringkas untuk polling papan antrean tanpa memuat ulang halaman.
router.get('/data.json', (req, res) => {
  const papan = papanAntreanData().map((p) => ({
    kapsterId: p.kapster.id,
    antreanAktif: p.antreanAktif.map((a) => ({
      id: a.id,
      nomor_antre: a.nomor_antre,
      status: a.status,
      estimasi_menit: a.estimasi_menit
    }))
  }));
  res.json({ papan, waktuServer: new Date().toISOString() });
});

router.post('/walkin', (req, res) => {
  const { kapster_id, nama_pelanggan, no_hp, layanan_id } = req.body;
  const layananIds = Array.isArray(layanan_id) ? layanan_id : layanan_id ? [layanan_id] : [];
  try {
    const id = queue.buatAntrean(db, {
      kapsterId: kapster_id,
      tipe: 'walkin',
      namaPelanggan: nama_pelanggan,
      noHp: no_hp,
      layananIds
    });
    const antrean = queue.getAntreanById(db, id);
    res.redirect(
      '/antrean?success=' + encodeURIComponent(`Walk-in ditambahkan dengan nomor antre ${antrean.nomor_antre}.`)
    );
  } catch (err) {
    res.redirect('/antrean?error=' + encodeURIComponent(err.message));
  }
});

router.post('/:id/panggil', (req, res) => {
  const antrean = queue.getAntreanById(db, req.params.id);
  if (!antrean) return res.redirect('/antrean?error=' + encodeURIComponent('Antrean tidak ditemukan.'));
  try {
    queue.panggilBerikutnya(db, antrean.kapster_id);
    res.redirect('/antrean?success=' + encodeURIComponent('Antrean berikutnya dipanggil.'));
  } catch (err) {
    res.redirect('/antrean?error=' + encodeURIComponent(err.message));
  }
});

router.post('/:id/selesai', (req, res) => {
  try {
    queue.tandaiSelesai(db, req.params.id);
    res.redirect('/antrean?success=' + encodeURIComponent('Antrean ditandai selesai.'));
  } catch (err) {
    res.redirect('/antrean?error=' + encodeURIComponent(err.message));
  }
});

router.post('/:id/batal', (req, res) => {
  try {
    queue.tandaiBatal(db, req.params.id);
    res.redirect('/antrean?success=' + encodeURIComponent('Antrean dibatalkan.'));
  } catch (err) {
    res.redirect('/antrean?error=' + encodeURIComponent(err.message));
  }
});

router.post('/:id/tidak-hadir', (req, res) => {
  try {
    queue.tandaiTidakHadir(db, req.params.id);
    res.redirect('/antrean?success=' + encodeURIComponent('Antrean ditandai tidak hadir.'));
  } catch (err) {
    res.redirect('/antrean?error=' + encodeURIComponent(err.message));
  }
});

// Membuat tautan wa.me berisi pesan giliran dan mencatat waktu pengiriman.
// Ini bukan pengiriman otomatis: kasir sendiri yang menekan kirim di WhatsApp
// setelah tautan terbuka (lihat PRD, bagian notifikasi WhatsApp).
router.post('/:id/notify', (req, res) => {
  const antrean = queue.getAntreanById(db, req.params.id);
  if (!antrean) return res.redirect('/antrean?error=' + encodeURIComponent('Antrean tidak ditemukan.'));
  if (!antrean.no_hp) {
    return res.redirect('/antrean?error=' + encodeURIComponent('Antrean ini tidak punya nomor HP.'));
  }
  try {
    const pesan = queue.buatPesanWhatsapp(db, antrean);
    const nomorWa = queue.nomorHpKeWa(antrean.no_hp);
    queue.catatNotifikasiTerkirim(db, antrean.id);
    const linkWa = `https://wa.me/${nomorWa}?text=${encodeURIComponent(pesan)}`;
    res.redirect(linkWa);
  } catch (err) {
    res.redirect('/antrean?error=' + encodeURIComponent(err.message));
  }
});

router.get('/cek', (req, res) => {
  const { no_hp, nomor } = req.query;
  let hasil = [];
  const sudahCari = Boolean(no_hp || nomor);
  if (sudahCari) {
    hasil = queue.cariAntreanUntukCek(db, { noHp: no_hp, nomorAntre: nomor }).map((a) => {
      const kapster = db.prepare('SELECT * FROM kapster WHERE id = ?').get(a.kapster_id);
      return {
        ...a,
        kapster_nama: kapster ? kapster.nama : '-',
        estimasi_menit: queue.estimasiTungguMenit(db, a),
        posisi: queue.posisiTunggu(db, a),
        hampir_tiba: queue.giliranHampirTiba(db, a),
        layanan: queue.getLayananUntukAntrean(db, a.id)
      };
    });
  }
  res.render('antrean/cek', {
    title: 'Cek Status Antrean',
    hasil,
    sudahCari,
    queryNoHp: no_hp || '',
    queryNomor: nomor || ''
  });
});

// Data JSON ringkas dipakai halaman cek status untuk polling setiap ~10 detik.
router.get('/cek/data.json', (req, res) => {
  const { no_hp, nomor } = req.query;
  const hasil = queue.cariAntreanUntukCek(db, { noHp: no_hp, nomorAntre: nomor }).map((a) => ({
    id: a.id,
    nomor_antre: a.nomor_antre,
    status: a.status,
    estimasi_menit: queue.estimasiTungguMenit(db, a),
    posisi: queue.posisiTunggu(db, a),
    hampir_tiba: queue.giliranHampirTiba(db, a)
  }));
  res.json({ hasil, waktuServer: new Date().toISOString() });
});

module.exports = router;
