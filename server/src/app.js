const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const libraryRoutes = require('./routes/library');
const authRoutes = require('./routes/auth');
const exploreRoutes = require('./routes/explore');
const novelRoutes = require('./routes/novels');
const importRoutes = require('./routes/import');
const jobRoutes = require('./routes/jobs');
const readerRoutes = require('./routes/reader');
const userRoutes = require('./routes/user');
const searchRoutes = require('./routes/search');
const historyRoutes = require('./routes/history');

const app = express();

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Routes
app.use('/api/health', require('./routes/health'));
app.use('/api/auth', authRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/explore', exploreRoutes);
app.use('/api/library', libraryRoutes);
app.use('/api/novels', novelRoutes);
app.use('/api/import', importRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/reader', readerRoutes);
app.use('/api/user', userRoutes);
app.use('/api/history', historyRoutes);

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
