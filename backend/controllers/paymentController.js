const axios = require('axios');
const User = require('../models/User');
const VitalEvent = require('../models/VitalEvent');
const { notify } = require('../utils/notificationHelper');

// @desc    Initialize Chapa Payment
// @route   POST /api/payment/initialize
// @access  Private (Citizen)

exports.initializePayment = async (req, res) => {
    try {
        console.log('='.repeat(50));
        console.log('PAYMENT INITIALIZATION STARTED');
        console.log('='.repeat(50));

        // Check if user exists in request
        if (!req.user) {
            return res.status(401).json({
                status: 'error',
                message: 'User not authenticated'
            });
        }

        const userId = req.user._id || req.user.id;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }

        const { paymentType, eventId } = req.body;

        // Validate payment type
        if (!paymentType || (paymentType !== 'vital_event' && paymentType !== 'resident_id')) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid payment type. Must be either "vital_event" or "resident_id"'
            });
        }

        let vitalEvent = null;
        let amount = parseFloat(process.env.CERTIFICATE_PRICE) || 100;
        let description = '';
        let title = '';

        // Handle different payment types
        if (paymentType === 'vital_event') {
            if (!eventId) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Event ID is required for vital event payment'
                });
            }

            vitalEvent = await VitalEvent.findById(eventId);
            if (!vitalEvent) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Vital event not found'
                });
            }

            // Check if already paid
            if (vitalEvent.certificate && vitalEvent.certificate.paymentStatus === 'paid') {
                return res.status(400).json({
                    status: 'error',
                    message: 'This vital event certificate is already paid'
                });
            }

            // FIX: Shorten title to under 16 characters
            const eventType = vitalEvent.type.charAt(0).toUpperCase() + vitalEvent.type.slice(1);
            title = eventType.length > 10 ? eventType.substring(0, 10) : eventType;

            // FIX: Shorten description to under 50 characters and use only allowed characters
            description = `Cert ${eventId.slice(-6)}`.substring(0, 20);

        } else if (paymentType === 'resident_id') {
            // Check if already paid
            if (user.certificatePayment && user.certificatePayment.status === 'paid') {
                return res.status(400).json({
                    status: 'error',
                    message: 'Resident ID certificate already paid'
                });
            }

            // FIX: Short titles
            title = "Resident ID";
            description = "ID Card Payment";
        }

        // Generate transaction reference (under 50 chars)
        // Format: TX-{TYPE}-{Date.now()}-{FULL_ID}
        const type_prefix = paymentType === 'vital_event' ? 'VE' : 'RID';
        const targetId = paymentType === 'vital_event' ? eventId : user._id.toString();

        let tx_ref = `TX-${type_prefix}-${Date.now()}-${targetId}`;

        // Ensure tx_ref is under 50 chars (it should be around 45 chars)
        if (tx_ref.length > 49) {
            tx_ref = tx_ref.substring(0, 49);
        }

        // Get user email
        let userEmail = user.personalInfo?.email || user.email;
        
        // Fallback to parent's email for child accounts
        if (!userEmail && (user.isChild || user.identityLinkage?.id_type === 'Parental Reference')) {
            if (user.identityLinkage?.reference_id) {
                const parent = await User.findOne({ 'personalInfo.idNumber': user.identityLinkage.reference_id });
                if (parent) {
                    userEmail = parent.personalInfo?.email || parent.email;
                }
            }
            if (!userEmail && user.createdBy) {
                const parent = await User.findById(user.createdBy);
                if (parent) {
                    userEmail = parent.personalInfo?.email || parent.email;
                }
            }
        }
        
        if (!userEmail) {
            console.warn('User has no email and no parent email found:', user._id);
        }

        // Prepare Chapa API request data with shortened fields
        const data = {
            amount: amount,
            currency: process.env.CURRENCY || 'ETB',
            email: userEmail || 'customer@example.com',
            first_name: (user.personalInfo?.firstName || 'Citizen').substring(0, 20),
            last_name: (user.personalInfo?.lastName || '').substring(0, 20),
            tx_ref: tx_ref,
            callback_url: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/payment/verify/${tx_ref}?redirect=true`,
            return_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/verify?tx_ref=${tx_ref}`,
            customization: {
                title: title.substring(0, 15), // Max 16 chars
                description: description.substring(0, 49) // Max 50 chars, with only allowed chars
            }
        };

        console.log('📤 Sending to Chapa:', JSON.stringify(data, null, 2));

        // Check if CHAPA_SECRET_KEY is set
        if (!process.env.CHAPA_SECRET_KEY) {
            console.error('❌ CHAPA_SECRET_KEY is not set');
            return res.status(500).json({
                status: 'error',
                message: 'Payment gateway configuration error'
            });
        }

        // Chapa API Call
        const response = await axios.post('https://api.chapa.co/v1/transaction/initialize', data, {
            headers: {
                Authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('✅ Chapa API response received');
        console.log('Chapa response data:', JSON.stringify(response.data, null, 2));

        if (response.data && response.data.status === 'success') {
            if (paymentType === 'vital_event' && vitalEvent) {
                // Save payment info to vital event
                vitalEvent.certificate = {
                    ...vitalEvent.certificate,
                    paymentStatus: 'pending',
                    paymentReference: tx_ref,
                    paymentAmount: amount,
                    paymentInitiatedAt: new Date()
                };
                await vitalEvent.save();
                console.log(`✅ Payment initiated for vital event ${eventId}: ${tx_ref}`);
            } else {
                // Save payment info to user
                user.certificatePayment = {
                    status: 'pending',
                    transactionReference: tx_ref,
                    amount: amount,
                    initiatedAt: new Date()
                };
                await user.save();
                console.log(`✅ Payment initiated for resident ID: ${tx_ref}`);
            }

            return res.status(200).json({
                status: 'success',
                checkout_url: response.data.data.checkout_url,
                tx_ref: tx_ref
            });
        } else {
            console.error('❌ Chapa returned error:', response.data);
            throw new Error(response.data.message || 'Payment initialization failed');
        }

    } catch (error) {
        console.error('='.repeat(50));
        console.error('❌ CHAPA INITIALIZATION ERROR');
        console.error('='.repeat(50));
        console.error('Error message:', error.message);

        if (error.response) {
            console.error('Error response data:', error.response.data);
            console.error('Error response status:', error.response.status);

            return res.status(error.response.status || 500).json({
                status: 'error',
                message: error.response.data?.message || 'Payment gateway error',
                details: error.response.data
            });
        } else if (error.request) {
            console.error('No response received from Chapa');
            return res.status(503).json({
                status: 'error',
                message: 'Payment gateway is not responding. Please try again later.'
            });
        } else {
            console.error('Error setting up request:', error.message);
            return res.status(500).json({
                status: 'error',
                message: error.message || 'Error connecting to payment gateway'
            });
        }
    }
};

// @desc    Verify Chapa Payment
// @route   GET /api/payment/verify/:tx_ref
// @access  Public (for callback)
exports.verifyPayment = async (req, res) => {
    try {
        const { tx_ref } = req.params;
        console.log('Verifying payment for tx_ref:', tx_ref);

        // Chapa Verification Call
        const response = await axios.get(`https://api.chapa.co/v1/transaction/verify/${tx_ref}`, {
            headers: {
                Authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}`
            }
        });

        console.log('Chapa verification response:', response.data);

        if (response.data.status === 'success' && response.data.data?.status === 'success') {
            const isVitalEvent = tx_ref.includes('-VE-');
            let updatedData = null;

            if (isVitalEvent) {
                // Extract eventId from tx_ref: TX-VE-timestamp-userId-eventId
                const parts = tx_ref.split('-');
                const eventId = parts[parts.length - 1];

                const event = await VitalEvent.findByIdAndUpdate(
                    eventId,
                    {
                        $set: {
                            'certificate.paymentStatus': 'paid', // 'paid' is in enum
                            'certificate.paidAt': new Date(),
                            'certificate.paymentReference': tx_ref,
                            'certificate.paymentVerified': true
                        }
                    },
                    { new: true }
                );

                if (!event) {
                    console.error('Vital event not found for ID:', eventId);
                    if (req.query.redirect === 'true') {
                        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/failed?tx_ref=${tx_ref}&reason=event_not_found`);
                    }
                    return res.status(404).json({
                        status: 'error',
                        message: 'Vital Event mapping failed'
                    });
                }

                updatedData = event.certificate;
                console.log(`✅ Payment verified for vital event ${eventId}`);

                // Notify Citizen
                await notify({
                    recipient: event.citizen,
                    type: 'system',
                    category: 'success',
                    message: `Your payment for ${event.type} certificate has been processed successfully.`,
                    data: { eventId, tx_ref }
                });

            } else {
                // Resident ID Verification
                const user = await User.findOneAndUpdate(
                    { 'certificatePayment.transactionReference': tx_ref },
                    {
                        $set: {
                            'certificatePayment.status': 'paid',
                            'certificatePayment.paidAt': new Date(),
                            'certificatePayment.verified': true
                        }
                    },
                    { new: true }
                );

                if (!user) {
                    console.error('User not found for tx_ref:', tx_ref);
                    if (req.query.redirect === 'true') {
                        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/failed?tx_ref=${tx_ref}&reason=user_not_found`);
                    }
                    return res.status(404).json({
                        status: 'error',
                        message: 'User mapping failed'
                    });
                }

                updatedData = user.certificatePayment;
                console.log(`✅ Payment verified for resident ID: ${tx_ref}`);

                // Notify Citizen
                await notify({
                    recipient: user._id,
                    type: 'system',
                    category: 'success',
                    message: 'Your payment for Resident ID has been processed successfully.',
                    data: { tx_ref }
                });
            }

            // Check if this is a callback or direct verification request
            if (req.query.redirect === 'true') {
                // Redirect to frontend success page
                return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/success?tx_ref=${tx_ref}`);
            }

            return res.status(200).json({
                status: 'success',
                message: isVitalEvent ? 'Vital Event payment verified successfully' : 'Resident ID payment verified successfully',
                data: updatedData
            });

        } else {
            console.log('Payment verification failed:', response.data);

            if (req.query.redirect === 'true') {
                return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/failed?tx_ref=${tx_ref}&reason=verification_failed`);
            }

            res.status(400).json({
                status: 'error',
                message: 'Payment verification failed or incomplete'
            });
        }

    } catch (error) {
        console.error('Chapa Verification Error:', error);

        if (req.query.redirect === 'true') {
            return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/failed?tx_ref=${req.params.tx_ref}&reason=server_error`);
        }

        res.status(500).json({
            status: 'error',
            message: 'Error verifying payment'
        });
    }
};

// @desc    Get payment status
// @route   GET /api/payment/status/:tx_ref
// @access  Private (Citizen)
exports.getPaymentStatus = async (req, res) => {
    try {
        const { tx_ref } = req.params;
        const userId = req.user._id || req.user.id;

        console.log(`Getting payment status for ${tx_ref} for user ${userId}`);

        const isVitalEvent = tx_ref.includes('-VE-');
        let paymentInfo = null;

        if (isVitalEvent) {
            const parts = tx_ref.split('-');
            const eventId = parts[parts.length - 1];

            const event = await VitalEvent.findOne({
                _id: eventId,
                citizen: userId
            });

            if (!event) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Vital event not found'
                });
            }

            paymentInfo = {
                ...event.certificate,
                transactionReference: event.certificate?.paymentReference,
                status: event.certificate?.paymentStatus,
                amount: event.certificate?.paymentAmount,
                paidAt: event.certificate?.paidAt
            };
        } else {
            const user = await User.findById(userId);
            if (user.certificatePayment?.transactionReference === tx_ref) {
                paymentInfo = user.certificatePayment;
            } else {
                return res.status(404).json({
                    status: 'error',
                    message: 'Payment information not found'
                });
            }
        }

        if (!paymentInfo) {
            return res.status(404).json({
                status: 'error',
                message: 'Payment information not found'
            });
        }

        res.status(200).json({
            status: 'success',
            data: paymentInfo
        });

    } catch (error) {
        console.error('Error getting payment status:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error retrieving payment status'
        });
    }
};