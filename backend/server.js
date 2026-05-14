const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const seedLocations = require('./utils/locationSeeder');

const app = express();

// Debug environment variables
console.log('🔧 Environment Variables Check:');
console.log('PORT:', process.env.PORT);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'Loaded' : '❌ Not loaded');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'Loaded' : '❌ Not loaded - THIS WILL CAUSE ISSUES');

// Check if JWT_SECRET is set
if (!process.env.JWT_SECRET) {
  console.error('❌ CRITICAL ERROR: JWT_SECRET is not set in environment variables');
  console.error('Please add JWT_SECRET to your .env file');
  process.exit(1);
}

// Configuration with fallbacks
const config = {
  PORT: process.env.PORT || 5000,
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/ethiopia-vital-events',
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '90d'
};

console.log('✅ Configuration loaded successfully');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files (citizen photos, documents)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Add this with other route imports
app.use('/api/stats', require('./routes/statsRoutes'));

// Debug middleware to check requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log('Content-Type:', req.headers['content-type']);
  console.log('Body keys:', Object.keys(req.body));
  // Log body for debugging (be careful with sensitive data)
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Body keys:', Object.keys(req.body));
    // Only log non-sensitive parts
    const safeBody = { ...req.body };
    if (safeBody.password) safeBody.password = '[HIDDEN]';
    if (safeBody.confirmPassword) safeBody.confirmPassword = '[HIDDEN]';
    console.log('Safe body:', JSON.stringify(safeBody, null, 2));
  }

  next();
});

// Import routes
const authRoutes = require('./routes/authRoutes');
const eventRoutes = require('./routes/vitalEventRoutes');
const locationRoutes = require('./routes/locationRoutes');
const representativeRoutes = require('./routes/representativeRoutes');
const statsRoutes = require('./routes/statsRoutes');
const certificateRoutes = require('./routes/certificateRoutes');
const reportRoutes = require('./routes/reportRoutes');
const reportTransmissionRoutes = require('./routes/reportTransmissionRoutes');

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/events', require('./routes/vitalEventRoutes'));
app.use('/api/locations', require('./routes/locationRoutes'));
app.use('/api/representatives', require('./routes/representativeRoutes'));
app.use('/api/stats', require('./routes/statsRoutes'));
app.use('/api/certificates', require('./routes/certificateRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/report-transmission', require('./routes/reportTransmissionRoutes'));
app.use('/api/payment', require('./routes/paymentRoutes'));
app.use('/api/fayda', require('./routes/faydaRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));


app.get('/', (req, res) => {
  res.json({
    message: 'Ethiopia Vital Events System API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    availableRoutes: [
      '/api/auth/login',
      '/api/auth/register',
      '/api/events',
      '/api/locations',
      '/api/representatives'
    ]
  });
});


// Health check route
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Error Stack:', err.stack);

  res.status(500).json({
    status: 'error',
    message: 'Something went wrong!',
    ...(process.env.NODE_ENV === 'development' && { error: err.message })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.method} ${req.path} not found`
  });
});

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ethiopia-vital-events';

mongoose.connect(config.MONGODB_URI)
  .then(async () => {
    console.log('✅ Connected to MongoDB');
    // Seed location data
    await seedLocations();
    console.log(`📊 Database: ${config.MONGODB_URI}`);


    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📍 API available at http://localhost:${PORT}/api`);
      console.log(`❤️  Health check: http://localhost:${PORT}/health`);
      console.log(`🔐 JWT Status: ${config.JWT_SECRET ? '✅ Configured' : '❌ Missing'}`);

      // Start Identity Maturity Service (Daily Check)
      const identityLinkageService = require('./services/identityLinkageService');
      // Run once on startup after 5 seconds
      setTimeout(() => {
        identityLinkageService.processIdentityMaturity();
      }, 5000);
      // Then run every 24 hours
      setInterval(() => {
        identityLinkageService.processIdentityMaturity();
      }, 24 * 60 * 60 * 1000);

      // Start Advanced Report Automation Scheduler
      require('./utils/reportScheduler');
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`❌ Error: Port ${PORT} is already in use. The previous process might still be running.`);
        console.log('💡 Tip: Run "taskkill /F /IM node.exe /T" to clear all node processes.');
        process.exit(1);
      }
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.log('❌ UNHANDLED REJECTION! Shutting down...');
  console.log(err.name, err.message);
  process.exit(1);
});