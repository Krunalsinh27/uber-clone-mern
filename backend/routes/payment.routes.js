const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const paymentController = require('../controllers/payment.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.post('/create-order',
    authMiddleware.authUser,
    body('rideId').isMongoId().withMessage('Invalid ride id'),
    paymentController.createOrder
);

router.post('/verify-payment',
    authMiddleware.authUser,
    body('rideId').isMongoId().withMessage('Invalid ride id'),
    body('razorpay_order_id').isString().notEmpty().withMessage('Razorpay order id required'),
    body('razorpay_payment_id').isString().notEmpty().withMessage('Razorpay payment id required'),
    body('razorpay_signature').isString().notEmpty().withMessage('Razorpay signature required'),
    paymentController.verifyPayment
);

router.post('/payment-failed',
    authMiddleware.authUser,
    body('rideId').isMongoId().withMessage('Invalid ride id'),
    body('reason').optional().isString(),
    paymentController.paymentFailed
);

module.exports = router;
