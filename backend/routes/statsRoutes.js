const express = require('express');
const statsController = require('../controllers/statsController');
const authController = require('../controllers/authController');

const router = express.Router();

// Protect all routes
router.use(authController.protect);

// Get dashboard stats
router.get('/dashboard-stats', statsController.getDashboardStats);

// National time-series statistics (Citizen Reg + Vital Events + Aggregate)
router.get('/national-statistics', statsController.getNationalStatistics);

module.exports = router;