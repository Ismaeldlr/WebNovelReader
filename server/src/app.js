const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const libraryRoutes = require('./routes/library');
const authRoutes = require('./routes/auth');
const exploreRoutes = require('./routes/explore');
const novelRoutes = require('./routes/novels');
const importRoutes = require('./routes/import');

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.static('public'));

// Routes
app.use('/api/health', require('./routes/health'));
app.use('/api/auth', authRoutes);
app.use('/api/explore', exploreRoutes);
app.use('/api/library', libraryRoutes);
app.use('/api/novels', novelRoutes);
app.use('/api/import', importRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, data: null, error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  const isUploadError = err.name === 'MulterError' || err.message === 'Please choose a valid EPUB file.';
  const status = err.status || (isUploadError ? 400 : 500);

  res.status(status).json({
    success: false,
    data: null,
    error: status < 500 ? err.message : 'Internal server error',
  });
});

module.exports = app;
