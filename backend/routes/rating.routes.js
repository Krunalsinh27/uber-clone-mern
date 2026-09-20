const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const ratingController = require('../controllers/rating.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.post('/user-rate-captain',
    authMiddleware.authUser,
    body('rideId').isMongoId().withMessage('Invalid ride id'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('review').optional().isString(),
    ratingController.createRatingByUser
);

router.post('/captain-rate-user',
    authMiddleware.authCaptain,
    body('rideId').isMongoId().withMessage('Invalid ride id'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('review').optional().isString(),
    ratingController.createRatingByCaptain
);

router.get('/captain/:captainId',
    param('captainId').isMongoId().withMessage('Invalid captain id'),
    ratingController.getCaptainRating
);

router.get('/user/:userId',
    param('userId').isMongoId().withMessage('Invalid user id'),
    ratingController.getUserRating
);

router.get('/ride/:rideId',
    authMiddleware.authUserOrCaptain,
    param('rideId').isMongoId().withMessage('Invalid ride id'),
    ratingController.getRatingForRide
);

module.exports = router;

