const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const authController = require('../controllers/authController');

// Public callback route (no auth required for Chapa callback)
router.get('/verify/:tx_ref', paymentController.verifyPayment);

// // Protected routes
router.use(authController.protect);
// router.use(authController.restrictTo('citizen'));

router.post('/initialize', paymentController.initializePayment);
router.get('/status/:tx_ref', paymentController.getPaymentStatus);

// Add this temporary debug route
// Debug route to check event (temporary, can be removed later)
router.get('/debug/check-event/:eventId', authController.protect, async (req, res) => {
    try {
        const { eventId } = req.params;
        const userId = req.user._id || req.user.id;
        
        console.log('Debug - Checking event:', eventId);
        console.log('Debug - User ID:', userId);
        
        // Find the event
        const event = await VitalEvent.findById(eventId);
        
        if (!event) {
            return res.status(404).json({
                status: 'error',
                message: 'Event not found',
                eventId
            });
        }
        
        // Check if user owns this event
        const isOwner = event.citizen && event.citizen.toString() === userId.toString();
        
        res.json({
            status: 'success',
            data: {
                eventId: event._id,
                type: event.type,
                status: event.status,
                citizen: event.citizen,
                isOwner,
                certificate: event.certificate || null,
                paymentStatus: event.certificate?.paymentStatus || 'unpaid',
                createdAt: event.createdAt
            }
        });
    } catch (error) {
        console.error('Debug error:', error);
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});
module.exports = router;