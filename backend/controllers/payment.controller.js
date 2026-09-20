const paymentService = require('../services/payment.service');
const { validationResult } = require('express-validator');

module.exports.createOrder = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { rideId } = req.body;

    try {
        const orderData = await paymentService.createOrder({
            rideId,
            user: req.user
        });

        return res.status(200).json({
            success: true,
            ...orderData
        });
    } catch (err) {
        return res.status(400).json({ message: err.message });
    }
};

module.exports.verifyPayment = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { rideId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    try {
        const ride = await paymentService.verifyPayment({
            rideId,
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            user: req.user
        });

        return res.status(200).json({
            success: true,
            message: 'Payment verified successfully',
            ride
        });
    } catch (err) {
        return res.status(400).json({ message: err.message });
    }
};

module.exports.paymentFailed = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { rideId, reason } = req.body;

    try {
        const ride = await paymentService.handlePaymentFailure({
            rideId,
            user: req.user,
            reason
        });

        return res.status(200).json({
            success: true,
            message: 'Payment status updated to failed',
            ride
        });
    } catch (err) {
        return res.status(400).json({ message: err.message });
    }
};
