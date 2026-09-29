(function () {
  var INTERVAL_MS = 10000;
  var wrap = document.querySelector('[data-cek-query]');
  if (!wrap) return;

  var query = wrap.getAttribute('data-cek-query');
  var STATUS_LABEL = {
    menunggu: 'Menunggu',
    dipanggil: 'Dipanggil',
    selesai: 'Selesai',
    batal: 'Batal',
    tidak_hadir: 'Tidak Hadir'
  };

  function perbarui() {
    fetch('/antrean/cek/data.json?' + query)
      .then(function (res) {
        if (!res.ok) throw new Error('Gagal memuat status antrean');
        return res.json();
      })
      .then(function (data) {
        var idSekarang = [];
        document.querySelectorAll('[data-cek-id]').forEach(function (el) {
          idSekarang.push(el.getAttribute('data-cek-id'));
        });
        var idBaru = data.hasil.map(function (a) {
          return String(a.id);
        });

        if (idBaru.sort().join(',') !== idSekarang.sort().join(',')) {
          window.location.reload();
          return;
        }

        data.hasil.forEach(function (a) {
          var kartu = document.querySelector('[data-cek-id="' + a.id + '"]');
          if (!kartu) return;

          var badge = kartu.querySelector('[data-cek-status]');
          if (badge && badge.textContent.trim() !== STATUS_LABEL[a.status]) {
            // Status berubah sejak halaman dimuat (misalnya baru dipanggil
            // atau selesai), muat ulang supaya seluruh isi kartu akurat.
            window.location.reload();
            return;
          }

          var estimasiEl = kartu.querySelector('[data-cek-estimasi]');
          if (estimasiEl && a.estimasi_menit !== null && a.estimasi_menit !== undefined) {
            estimasiEl.textContent = a.estimasi_menit;
          }
          var posisiEl = kartu.querySelector('[data-cek-posisi]');
          if (posisiEl && a.posisi !== null && a.posisi !== undefined) {
            posisiEl.textContent = 'ke-' + a.posisi;
          }
          var banner = kartu.querySelector('[data-cek-banner]');
          if (banner) {
            banner.style.display = a.hampir_tiba ? '' : 'none';
          }
        });
      })
      .catch(function () {
        // Koneksi terputus sesaat, biarkan tampilan terakhir dan coba lagi
        // pada siklus berikutnya.
      });
  }

  setInterval(perbarui, INTERVAL_MS);
})();
