const express = require('express');
const certificateController = require('../controllers/certificateController');
const authController = require('../controllers/authController');

const router = express.Router();

// Protect all certificate routes
router.use(authController.protect);

// Generate birth certificate (Woreda issues after completion)
router.post('/birth/:eventId/generate',
  authController.restrictTo('woreda', 'woreda_representative'),
  certificateController.generateBirthCertificate
);

// Generate marriage certificate (Woreda issues after completion)
router.post('/marriage/:eventId/generate',
  authController.restrictTo('woreda', 'woreda_representative'),
  certificateController.generateMarriageCertificate
);

// Generate death certificate (Woreda issues after completion)
router.post('/death/:eventId/generate',
  authController.restrictTo('woreda', 'woreda_representative'),
  certificateController.generateDeathCertificate
);

// Download certificate (Citizen and all representatives)
router.get('/:eventId/download',
  authController.restrictTo('citizen', 'kebele', 'woreda', 'zone', 'region', 'national', 'kebele_representative', 'woreda_representative', 'zone_representative', 'region_representative'),
  certificateController.downloadCertificate
);

// Generate/Download Resident ID Card
router.get('/resident-id/:citizenId',
  authController.restrictTo('citizen', 'kebele', 'woreda', 'zone', 'region', 'national', 'kebele_representative', 'woreda_representative', 'zone_representative', 'region_representative'),
  certificateController.generateResidentIDCard
);

module.exports = router;