const express = require('express');
const reportTransmissionController = require('../controllers/reportTransmissionController');
const authController = require('../controllers/authController');

const router = express.Router();

// Send report to higher level
router.post('/send',
  authController.protect,
  reportTransmissionController.sendReportToHigherLevel
);

// Get received reports
router.get('/received',
  authController.protect,
  reportTransmissionController.getReceivedReports
);

// Get sent reports
router.get('/sent',
  authController.protect,
  reportTransmissionController.getSentReports
);

// Get report details
router.get('/:reportId',
  authController.protect,
  reportTransmissionController.getReportDetails
);

// Mark report as received
router.patch('/:reportId/receive',
  authController.protect,
  reportTransmissionController.markReportAsReceived
);

// Mark report as reviewed
router.patch('/:reportId/review',
  authController.protect,
  reportTransmissionController.markReportAsReviewed
);

module.exports = router;
