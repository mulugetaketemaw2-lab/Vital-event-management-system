const User = require('../models/User');

/**
 * Handles National Fayda ID verification logic
 */

// Simple in-memory store for OTPs (for testing purposes)
// In a real app, this would be in Redis or a DB with expiry
const otpStore = new Map();

/**
 * Trigger National ID verification - Phase Two, Step A & B
 * Generates an OTP and simulates sending it to the user's mobile
 */
exports.verifyID = async (req, res) => {
    try {
        const { idNumber } = req.body;

        if (!idNumber) {
            return res.status(400).json({
                status: 'error',
                message: 'National Fayda ID number is required'
            });
        }

        // Phase One: Basic numeric validation for the ID
        if (!/^\d{10,16}$/.test(idNumber)) {
            return res.status(400).json({
                status: 'error',
                message: 'National Fayda ID must be 10-16 digits'
            });
        }

        // Step B: OTP Generation
        // In our modern system, we'll use a fixed OTP for testing or generate a random 6-digit one
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Store OTP with ID number (expires in 5 minutes)
        otpStore.set(idNumber, {
            otp,
            expires: Date.now() + 5 * 60 * 1000
        });

        console.log(`[FAYDA SYSTEM] Generated OTP ${otp} for ID ${idNumber}`);

        // In a real system, here we would call the actual National ID API/SMS Gateway

        res.status(200).json({
            status: 'success',
            message: 'OTP sent successfully to your registered mobile number.',
            // In development/demo mode, we might return the OTP for ease of use
            // but the prompt says it's sent to mobile. We'll return it in the log.
            debug_otp: process.env.NODE_ENV === 'development' ? otp : undefined
        });

    } catch (error) {
        console.error('Fayda ID Verify Error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to initiate National ID verification'
        });
    }
};

/**
 * Verify the OTP entered by the user - Phase Two, Step D
 */
exports.verifyOTP = async (req, res) => {
    try {
        const { idNumber, otp } = req.body;

        if (!idNumber || !otp) {
            return res.status(400).json({
                status: 'error',
                message: 'ID Number and OTP are required'
            });
        }

        const storedData = otpStore.get(idNumber);

        if (!storedData) {
            return res.status(400).json({
                status: 'error',
                message: 'No verification session found for this ID'
            });
        }

        if (Date.now() > storedData.expires) {
            otpStore.delete(idNumber);
            return res.status(400).json({
                status: 'error',
                message: 'OTP has expired. Please request a new one.'
            });
        }

        if (storedData.otp !== otp) {
            return res.status(400).json({
                status: 'error',
                message: 'Incorrect OTP. Please try again.'
            });
        }

        // Success! 
        otpStore.delete(idNumber);

        res.status(200).json({
            status: 'success',
            message: 'Identity verified successfully!'
        });

    } catch (error) {
        console.error('Fayda OTP Verify Error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Identity verification failed'
        });
    }
};
