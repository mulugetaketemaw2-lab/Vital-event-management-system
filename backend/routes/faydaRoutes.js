const express = require('express');
const router = express.Router();
const faydaController = require('../controllers/faydaController');

// National Fayda ID verification routes
router.post('/verify-id', faydaController.verifyID);
router.post('/verify-otp', faydaController.verifyOTP);

module.exports = router;
