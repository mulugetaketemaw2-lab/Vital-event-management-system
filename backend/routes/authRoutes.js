const express = require('express');
const authController = require('../controllers/authController');
const nationalController = require('../controllers/nationalController');
const regionalController = require('../controllers/regionalController');
const zoneController = require('../controllers/zoneController');
const woredaReportController = require('../controllers/woredaReportController');
const vitalEventController = require('../controllers/vitalEventController');
const { body } = require('express-validator');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const fs = require('fs')

const uploadDir = 'uploads/';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// File filter
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only images and PDFs are allowed'), false);
  }
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ storage, fileFilter });

const citizenUpload = upload.fields([
  { name: 'profilePhoto', maxCount: 1 },
  { name: 'idCard', maxCount: 1 },
  { name: 'documents', maxCount: 10 }
]);

// Configure Multer for Level Verification (Seal/Signature)
const verifyUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = 'uploads/verification/';
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      cb(null, `kebele-verify-${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`);
    }
  }),
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed for Seal and Signature'), false);
    }
  }
});

// Configure Multer for High-Level Verification (Seal/Signature/ID/Docs)
const woredaVerifyUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = 'uploads/verification/';
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, `woreda-verify-${uniqueSuffix}-${file.originalname}`);
    }
  }),
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only images and PDFs are allowed'), false);
    }
  }
});

const expandDottedKeys = (bodyObj) => {
  if (!bodyObj || typeof bodyObj !== 'object') return;

  Object.keys(bodyObj).forEach((key) => {
    if (!key.includes('.')) return;

    const value = bodyObj[key];
    const parts = key.split('.');
    let cursor = bodyObj;

    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i];
      if (!cursor[p] || typeof cursor[p] !== 'object') cursor[p] = {};
      cursor = cursor[p];
    }

    cursor[parts[parts.length - 1]] = value;
    delete bodyObj[key];
  });
};

const normalizeMultipartBody = (req, res, next) => {
  expandDottedKeys(req.body);
  next();
};

// Only citizen registration is allowed through frontend
router.post('/register-citizen',
  citizenUpload,
  normalizeMultipartBody,
  [
    body('username').isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('personalInfo.firstName').notEmpty().withMessage('First name is required'),
    body('personalInfo.lastName').notEmpty().withMessage('Last name is required'),
    body('role').optional().isIn(['citizen', 'kebele', 'woreda', 'zone', 'region', 'national']).withMessage('Invalid role'),

    // Location validation
    body('location.region')
      .optional()
      .isString()
      .withMessage('Region must be a string'),

    body('location.zone')
      .optional()
      .isString()
      .withMessage('Zone must be a string'),

    body('location.woreda')
      .optional()
      .isString()
      .withMessage('Woreda must be a string'),

    body('location.kebele')
      .optional()
      .isString()
      .withMessage('Kebele must be a string'),

    // Personal info validation
    body('personalInfo.email')
      .optional()
      .isEmail()
      .withMessage('Please provide a valid email'),

    body('personalInfo.phone')
      .optional()
      .isString()
      .withMessage('Phone must be a string'),

    body('personalInfo.idNumber')
      .optional()
      .isString()
      .withMessage('ID number must be a string')
  ],
  authController.registerCitizen
);

// Resubmit rejected registration
router.put('/resubmit-registration',
  authController.protect, // Must be logged in
  citizenUpload,
  normalizeMultipartBody,
  authController.resubmitCitizen
);

// Special endpoint for creating National Representative (Postman only)
router.post('/create-national', authController.createNationalRepresentative);

// User profile routes
router.get('/profile', authController.protect, authController.getProfile);
router.patch('/profile', authController.protect, authController.updateProfile);
router.patch('/change-password', authController.protect, authController.changePassword);

router.post('/login',
  [
    body('username').notEmpty().withMessage('Username is required'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  authController.login
);

// Forgot password - sends reset link to email
router.post('/forgot-password', authController.forgotPassword);

// Reset password - uses token from email link
router.post('/reset-password/:token', authController.resetPassword);

// Update Request Workflow
router.post('/initiate-update',
  authController.protect,
  citizenUpload,
  normalizeMultipartBody,
  authController.initiateUpdateRequest
);

router.get('/update-requests/pending',
  authController.protect,
  authController.getPendingUpdates
);

router.get('/update-requests/:citizenId',
  authController.protect,
  authController.getUpdateDetails
);

router.patch('/update-requests/:citizenId/kebele-review',
  authController.protect,
  authController.reviewUpdateKebele
);

router.patch('/update-requests/:citizenId/woreda-review',
  authController.protect,
  authController.reviewUpdateWoreda
);

router.patch('/update-requests/:citizenId/review-high-level',
  authController.protect,
  (req, res, next) => {
    if (!['zone', 'region', 'national', 'zone_representative', 'region_representative'].includes(req.user.role)) {
      return res.status(403).json({ status: 'error', message: 'Unauthorized update review level' });
    }
    next();
  },
  authController.reviewUpdateHighLevel
);

router.patch('/citizens/:id/review-high-level',
  authController.protect,
  woredaVerifyUpload.fields([
    { name: 'seal', maxCount: 1 },
    { name: 'signature', maxCount: 1 }
  ]),
  authController.reviewCitizenHighLevel
);

// Register new user
router.post('/register',
  [
    body('username').isLength({ min: 3 }),
    body('password').isLength({ min: 6 }),
    body('personalInfo.firstName').notEmpty(),
    body('personalInfo.lastName').notEmpty()
  ],
  authController.register
);

// Get current user (protected)
router.get('/me',
  authController.protect,
  (req, res) => {
    res.status(200).json({
      status: 'success',
      data: {
        user: req.user
      }
    });
  }
);

// Get pending citizens for kebele review
router.get('/citizens/pending',
  authController.protect,
  authController.getPendingCitizens
);

// Get citizens by kebele
router.get('/citizens/kebele/:kebele',
  authController.protect,
  authController.getKebeleCitizens
);

// Get citizens for review/view (all representative levels, jurisdiction-filtered)
router.get('/citizens/for-review',
  authController.protect,
  authController.getCitizensForReview
);

// Export citizens (jurisdiction-filtered)
router.get('/reports/citizens/export',
  authController.protect,
  authController.exportCitizens
);


// Review citizen (approve/reject)
router.patch('/citizens/:id/review',
  authController.protect,
  verifyUpload.fields([
    { name: 'seal', maxCount: 1 },
    { name: 'signature', maxCount: 1 }
  ]),
  authController.reviewCitizen
);

// Kebele level routes
router.get(
  '/kebele/pending-citizens',
  authController.protect,
  (req, res, next) => {
    if (!['kebele', 'kebele_representative'].includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'Only kebele representatives can access this endpoint'
      });
    }
    next();
  },
  authController.getPendingCitizens
);

router.put(
  '/kebele/approve-citizen/:citizenId',
  authController.protect,
  (req, res, next) => {
    if (!['kebele', 'kebele_representative'].includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'Only kebele representatives can access this endpoint'
      });
    }
    next();
  },
  verifyUpload.fields([
    { name: 'seal', maxCount: 1 },
    { name: 'signature', maxCount: 1 }
  ]),
  authController.approveCitizen
);

router.put(
  '/kebele/reject-citizen/:citizenId',
  authController.protect,
  (req, res, next) => {
    if (!['kebele', 'kebele_representative'].includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'Only kebele representatives can access this endpoint'
      });
    }
    next();
  },
  authController.rejectCitizen
);


// Woreda level routes
router.get('/citizens/woreda/pending',
  authController.protect,
  (req, res, next) => {
    if (!['woreda', 'woreda_representative'].includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'Only woreda representatives can access this endpoint'
      });
    }
    next();
  },
  authController.getCitizensForWoredaReview
);

router.patch('/citizens/:citizenId/woreda-review',
  authController.protect,
  (req, res, next) => {
    if (!['woreda', 'woreda_representative'].includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'Only woreda representatives can access this endpoint'
      });
    }
    next();
  },
  woredaVerifyUpload.fields([
    { name: 'seal', maxCount: 1 },
    { name: 'signature', maxCount: 1 },
    { name: 'idCard', maxCount: 1 },
    { name: 'documents', maxCount: 10 }
  ]),
  authController.reviewCitizenAtWoreda
);

// National level routes
router.get('/national/overview',
  authController.protect,
  (req, res, next) => {
    if (req.user.role !== 'national') {
      return res.status(403).json({
        status: 'error',
        message: 'Only national representatives can access this endpoint'
      });
    }
    next();
  },
  nationalController.getNationalOverview
);

router.post('/national/generate-report',
  authController.protect,
  (req, res, next) => {
    if (req.user.role !== 'national') {
      return res.status(403).json({
        status: 'error',
        message: 'Only national representatives can generate reports'
      });
    }
    next();
  },
  nationalController.generateNationalReport
);

// Regional level routes
router.get('/regional/overview',
  authController.protect,
  (req, res, next) => {
    if (!['region', 'region_representative'].includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'Only regional representatives can access this endpoint'
      });
    }
    next();
  },
  regionalController.getRegionalOverview
);

router.post('/regional/generate-report',
  authController.protect,
  (req, res, next) => {
    if (!['region', 'region_representative'].includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'Only regional representatives can generate reports'
      });
    }
    next();
  },
  regionalController.generateRegionalReport
);

// Zone level routes
router.get('/zone/overview',
  authController.protect,
  (req, res, next) => {
    if (!['zone', 'zone_representative'].includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'Only zone representatives can access this endpoint'
      });
    }
    next();
  },
  zoneController.getZoneOverview
);

router.post('/zone/generate-report',
  authController.protect,
  (req, res, next) => {
    if (!['zone', 'zone_representative'].includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'Only zone representatives can generate reports'
      });
    }
    next();
  },
  zoneController.generateZoneReport
);

// Woreda Report Routes
router.get('/woreda/overview',
  authController.protect,
  (req, res, next) => {
    if (!['woreda', 'woreda_representative'].includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'Only woreda representatives can access this endpoint'
      });
    }
    next();
  },
  woredaReportController.getWoredaOverview
);

router.post('/woreda/generate-report',
  authController.protect,
  (req, res, next) => {
    if (!['woreda', 'woreda_representative'].includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'Only woreda representatives can generate reports'
      });
    }
    next();
  },
  woredaReportController.generateWoredaReport
);

module.exports = router;
