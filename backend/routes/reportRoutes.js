const express = require('express');
const reportController = require('../controllers/reportController');
const authController = require('../controllers/authController');

const router = express.Router();

const advancedReportController = require('../controllers/advancedReportController');

router.use(authController.protect);

router.get('/standardized/:period',
  authController.restrictTo('kebele', 'woreda', 'zone', 'region', 'national', 'kebele_representative', 'woreda_representative', 'zone_representative', 'region_representative'),
  advancedReportController.generateStandardizedReport
);

router.post('/generate',
  authController.restrictTo('kebele', 'woreda', 'zone', 'region', 'national', 'kebele_representative', 'woreda_representative', 'zone_representative', 'region_representative'),
  reportController.generateReport
);

router.patch('/:reportId/send',
  authController.restrictTo('kebele', 'woreda', 'zone', 'region', 'national', 'kebele_representative', 'woreda_representative', 'zone_representative', 'region_representative'),
  reportController.sendReport
);

module.exports = router;