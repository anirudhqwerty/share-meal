require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const authRoutes = require('../routes/auth');
const donationRoutes = require('../routes/donations');
const requestRoutes = require('../routes/requests');
const pickupRoutes = require('../routes/pickups');
const notificationRoutes = require('../routes/notifications');
const { authenticateToken } = require('../middleware/auth');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Routes — auth is partially public (register needs token from Supabase), business routes protected
app.use('/api/auth', authRoutes);
app.use('/api/donations', authenticateToken, donationRoutes);
app.use('/api/requests', authenticateToken, requestRoutes);
app.use('/api/pickups', authenticateToken, pickupRoutes);
app.use('/api/notifications', authenticateToken, notificationRoutes);

// 404 handler
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => console.log(`🚀 Share-Meal API running on port ${PORT}`));
}

module.exports = app;
