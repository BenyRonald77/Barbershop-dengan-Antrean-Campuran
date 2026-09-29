(function () {
  var INTERVAL_MS = 10000;

  function idsSaatIni() {
    var ids = [];
    document.querySelectorAll('[data-antrean-id]').forEach(function (el) {
      ids.push(el.getAttribute('data-antrean-id'));
    });
    return ids.sort().join(',');
  }

  function perbarui() {
    fetch('/antrean/data.json')
      .then(function (res) {
        if (!res.ok) throw new Error('Gagal memuat data antrean');
        return res.json();
      })
      .then(function (data) {
        var idBaru = [];
        data.papan.forEach(function (p) {
          p.antreanAktif.forEach(function (a) {
            idBaru.push(String(a.id));
          });
        });
        idBaru.sort();

        if (idBaru.join(',') !== idsSaatIni()) {
          // Struktur antrean berubah (ada yang dipanggil/selesai dari
          // perangkat lain), muat ulang halaman supaya papan tetap akurat.
          window.location.reload();
          return;
        }

        data.papan.forEach(function (p) {
          p.antreanAktif.forEach(function (a) {
            var el = document.querySelector('[data-antrean-id="' + a.id + '"] [data-estimasi]');
            if (el && a.estimasi_menit !== null && a.estimasi_menit !== undefined) {
              el.textContent = a.estimasi_menit;
            }
          });
        });
      })
      .catch(function () {
        // Koneksi terputus sesaat, coba lagi di siklus berikutnya tanpa
        // mengganggu tampilan yang sudah ada.
      });
  }

  setInterval(perbarui, INTERVAL_MS);
})();
