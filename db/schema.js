// Skema database. Semua tabel dibuat dengan CREATE TABLE IF NOT EXISTS supaya
// aman dijalankan setiap kali server dinyalakan, tanpa perlu alat migrasi terpisah.
const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS kapster (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kode TEXT NOT NULL UNIQUE,
  nama TEXT NOT NULL,
  aktif INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS layanan (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nama TEXT NOT NULL,
  durasi_menit INTEGER NOT NULL,
  harga INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS antrean (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kapster_id INTEGER NOT NULL REFERENCES kapster(id),
  nomor_antre TEXT NOT NULL,
  tanggal TEXT NOT NULL,
  urutan_harian INTEGER NOT NULL,
  tipe TEXT NOT NULL CHECK(tipe IN ('booking','walkin')),
  nama_pelanggan TEXT NOT NULL,
  no_hp TEXT,
  status TEXT NOT NULL CHECK(status IN ('menunggu','dipanggil','selesai','batal','tidak_hadir')) DEFAULT 'menunggu',
  total_durasi_menit INTEGER NOT NULL DEFAULT 0,
  dibuat_pada TEXT NOT NULL,
  mulai_pada TEXT,
  selesai_pada TEXT,
  notifikasi_terkirim_pada TEXT
);

CREATE TABLE IF NOT EXISTS antrean_layanan (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  antrean_id INTEGER NOT NULL REFERENCES antrean(id),
  layanan_id INTEGER NOT NULL REFERENCES layanan(id),
  durasi_menit_saat_itu INTEGER NOT NULL,
  harga_saat_itu INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_antrean_kapster_tanggal ON antrean(kapster_id, tanggal);
CREATE INDEX IF NOT EXISTS idx_antrean_status ON antrean(status);
CREATE INDEX IF NOT EXISTS idx_antrean_no_hp ON antrean(no_hp);
CREATE INDEX IF NOT EXISTS idx_antrean_layanan_antrean_id ON antrean_layanan(antrean_id);
`;

function initSchema(db) {
  db.exec(SCHEMA_SQL);
}

module.exports = { SCHEMA_SQL, initSchema };
