// === server.js ===
// Entry point: connects to MongoDB, sets up routes, serves static frontend.

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env
dotenv.config();

const authRoutes     = require('./routes/auth');
const gameRoutes     = require('./routes/game');
const withdrawRoutes = require('./routes/withdraw');
const adminRoutes    = require('./routes/admin');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve frontend from /public
app.use(express.static(path.join(__dirname, 'public')));

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/withdraw', withdrawRoutes);
app.use('/api/admin', adminRoutes);

// Fallback: serve index.html for any other GET
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
