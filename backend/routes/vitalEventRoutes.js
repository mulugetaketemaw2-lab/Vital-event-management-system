const express = require('express');
const vitalEventController = require('../controllers/vitalEventController');
const authController = require('../controllers/authController');
const router = express.Router();


// Protect all routes
router.use(authController.protect);

// Configure Multer
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const uploadDir = 'uploads/events/';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'idCard' || file.fieldname === 'documents') {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('ID Card and Documents must be PDFs'), false);
    }
  } else if (['childPhoto', 'fatherPhoto', 'motherPhoto', 'deceasedPhoto', 'husbandPhoto', 'wifePhoto'].includes(file.fieldname)) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Photos must be images'), false);
    }
  } else {
    cb(null, true);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

const eventUpload = upload.fields([
  { name: 'childPhoto', maxCount: 1 },
  { name: 'fatherPhoto', maxCount: 1 },
  { name: 'motherPhoto', maxCount: 1 },
  { name: 'deceasedPhoto', maxCount: 1 },
  { name: 'husbandPhoto', maxCount: 1 },
  { name: 'wifePhoto', maxCount: 1 },
  { name: 'idCard', maxCount: 1 },
  { name: 'documents', maxCount: 10 }
]);

const normalizeMultipartBody = (req, res, next) => {
  // Helper to parse nested keys like "location.region"
  if (req.body) {
    // Parse 'location' if it's a string (JSON)
    if (typeof req.body.location === 'string') {
      try {
        req.body.location = JSON.parse(req.body.location);
      } catch (e) {
        console.error('Failed to parse location JSON', e);
      }
    }
  }
  next();
};

router.post('/',
  eventUpload,
  normalizeMultipartBody,
  vitalEventController.createVitalEvent
);


router.get('/my-events', vitalEventController.getMyEvents);
router.get('/verify-national-id/:idNumber', vitalEventController.verifyNationalId);

// Routes for representatives
router.get('/for-review',
  authController.protect,
  (req, res, next) => {
    if (!['kebele', 'woreda', 'zone', 'region', 'national', 'kebele_representative', 'woreda_representative', 'zone_representative', 'region_representative'].includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'Only representatives can access this endpoint'
      });
    }
    next();
  },
  vitalEventController.getEventsForReview
);
// Test route to check if VitalEvent model works
router.get('/test-model', async (req, res) => {
  try {
    // Try to count documents
    const count = await VitalEvent.countDocuments();

    res.json({
      success: true,
      message: 'VitalEvent model is working',
      count: count
    });
  } catch (error) {
    console.error('Model test error:', error);
    res.status(500).json({
      success: false,
      message: 'VitalEvent model error',
      error: error.message
    });
  }
});

// Multer for review uploads (seal, signature)
const reviewUploadDir = 'uploads/reviews/';
if (!fs.existsSync(reviewUploadDir)) {
  fs.mkdirSync(reviewUploadDir, { recursive: true });
}

const reviewStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, reviewUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const reviewUpload = multer({
  storage: reviewStorage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Seal and Signature must be image files'), false);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }
});

const reviewFileUpload = reviewUpload.fields([
  { name: 'seal', maxCount: 1 },
  { name: 'signature', maxCount: 1 }
]);

// Review/approve event
router.patch('/:eventId/review',
  authController.protect,
  (req, res, next) => {
    if (!['kebele', 'woreda', 'zone', 'region', 'national', 'kebele_representative', 'woreda_representative', 'zone_representative', 'region_representative'].includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'Only authorized representatives can review/approve events'
      });
    }
    next();
  },
  reviewFileUpload,
  vitalEventController.reviewEvent
);

// High-level citizen registration review (Zone, Region, National)
router.patch('/citizen/:citizenId/review-high-level',
  authController.protect,
  (req, res, next) => {
    if (!['zone', 'region', 'national', 'zone_representative', 'region_representative'].includes(req.user.role)) {
      return res.status(403).json({ status: 'error', message: 'Unauthorized review level' });
    }
    next();
  },
  vitalEventController.reviewCitizenHighLevel
);
router.get('/stats', vitalEventController.getDashboardStats);
router.get('/jurisdiction-statistics', vitalEventController.getJurisdictionStatistics);

// Add to vitalEventRoutes.js
router.get('/test-location-conversion', authController.protect, async (req, res) => {
  try {
    const user = req.user;

    // Test conversion
    const testLocation = {
      region: '1',
      zone: '1_1',
      woreda: 'Woreda01',
      kebele: 'Kebele 01/02'
    };

    const converted = convertLocationCodesToNames(testLocation);
    const reverted = convertLocationNamesToCodes(converted);

    res.json({
      success: true,
      userLocation: user.location,
      test: {
        original: testLocation,
        toNames: converted,
        toCodes: reverted
      },
      allEvents: await VitalEvent.find({}).select('location').limit(5)
    });
  } catch (error) {
    console.error('Test error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
// Test route
router.get('/test-woreda-event',
  authController.protect,
  vitalEventController.testCreateEventForWoreda
);
// Add debug route
router.get('/debug/woreda-events',
  authController.protect,
  vitalEventController.debugWoredaEvents
);

// Check marriage status for current user
router.get('/check-marriage',
  authController.protect,
  vitalEventController.checkMarriageStatus
);

module.exports = router;