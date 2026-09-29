function formatRupiah(angka) {
  const n = Number(angka) || 0;
  return 'Rp' + n.toLocaleString('id-ID');
}

function formatDurasi(menit) {
  const n = Number(menit) || 0;
  if (n < 60) return `${n} menit`;
  const jam = Math.floor(n / 60);
  const sisaMenit = n % 60;
  return sisaMenit === 0 ? `${jam} jam` : `${jam} jam ${sisaMenit} menit`;
}

function formatJam(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

const LABEL_STATUS = {
  menunggu: 'Menunggu',
  dipanggil: 'Dipanggil',
  selesai: 'Selesai',
  batal: 'Batal',
  tidak_hadir: 'Tidak Hadir'
};

const LABEL_TIPE = {
  booking: 'Booking',
  walkin: 'Walk-in'
};

module.exports = { formatRupiah, formatDurasi, formatJam, LABEL_STATUS, LABEL_TIPE };
