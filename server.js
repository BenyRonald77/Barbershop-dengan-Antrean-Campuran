const path = require('path');
const express = require('express');
const db = require('./db');
const kapsterRouter = require('./routes/kapster');
const layananRouter = require('./routes/layanan');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
  res.locals.currentPath = req.path;
  res.locals.flashSuccess = req.query.success || null;
  res.locals.flashError = req.query.error || null;
  next();
});

app.get('/', (req, res) => {
  res.render('dashboard', { title: 'Dashboard' });
});

app.use('/kapster', kapsterRouter);
app.use('/layanan', layananRouter);

app.use((req, res) => {
  res.status(404).render('404', { title: 'Halaman Tidak Ditemukan' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render('500', { title: 'Terjadi Kesalahan', pesan: err.message });
});

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Barbershop Antrean berjalan di http://localhost:${PORT}`);
  });
}

module.exports = app;
