const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const libraryRoutes = require('./routes/library');
const authRoutes = require('./routes/auth');

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json());

// Routes
app.use('/api/health', require('./routes/health'));
app.use('/api/auth', authRoutes);
app.use('/api/library', libraryRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, data: null, error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    data: null,
    error: err.status ? err.message : 'Internal server error',
  });
});

module.exports = app;
