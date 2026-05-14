const express = require('express');
const multer = require('multer');
const fs = require('fs');
const representativeController = require('../controllers/representativeController');
const authController = require('../controllers/authController');

const router = express.Router();

// Setup Multer for representative photos
const uploadDir = 'uploads/representatives/';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = file.mimetype.split('/')[1];
    cb(null, `rep-${Date.now()}-${Math.round(Math.random() * 1E9)}.${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 } // 2MB limit
});

// Protect all routes
router.use(authController.protect);

// Get pending approvals for the current user's level
router.get('/pending-approvals', representativeController.getPendingApprovals);

// High-speed search for registrants across divisions
router.get('/search-citizens', representativeController.searchCitizens);

// Get specific citizen details
router.get('/citizens/:citizenId', representativeController.getCitizenDetails);

// Get statistics
router.get('/stats', representativeController.getRepresentativeStats);
// Activate user account
router.patch('/:userId/activate', representativeController.activateUser);

// Get representatives created by current user
router.get('/my-representatives', representativeController.getMyRepresentatives);

// Manage representatives
router.put('/:userId', representativeController.updateRepresentative);
router.delete('/:userId', representativeController.deleteRepresentative);
router.patch('/:userId/status', representativeController.updateRepresentativeStatus);

// Create representative account (restricted by role)
router.post('/create',
  authController.protect,
  upload.single('photo'),
  (req, res, next) => {
    if (!['national', 'region', 'zone', 'woreda'].includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to perform this action'
      });
    }
    next();
  },
  representativeController.createRepresentative
);

module.exports = router;