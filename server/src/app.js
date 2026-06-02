const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(morgan('dev'));
app.use(express.json());

// Routes
app.use('/api/health', require('./routes/health'));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, data: null, error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, data: null, error: 'Internal server error' });
});

module.exports = app;