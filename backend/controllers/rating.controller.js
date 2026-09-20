const ratingService = require('../services/rating.service');
const { validationResult } = require('express-validator');

module.exports.createRatingByUser = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { rideId, rating, review } = req.body;

    try {
        const ratingDoc = await ratingService.createRatingByUser({
            rideId,
            user: req.user,
            rating,
            review
        });

        return res.status(201).json({
            success: true,
            rating: ratingDoc
        });
    } catch (err) {
        return res.status(400).json({ message: err.message });
    }
};

module.exports.createRatingByCaptain = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { rideId, rating, review } = req.body;

    try {
        const ratingDoc = await ratingService.createRatingByCaptain({
            rideId,
            captain: req.captain,
            rating,
            review
        });

        return res.status(201).json({
            success: true,
            rating: ratingDoc
        });
    } catch (err) {
        return res.status(400).json({ message: err.message });
    }
};

module.exports.getCaptainRating = async (req, res) => {
    const { captainId } = req.params;

    try {
        const stats = await ratingService.getAverageRating({
            targetId: captainId,
            receiverRole: 'captain'
        });

        return res.status(200).json({
            success: true,
            ...stats
        });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

module.exports.getUserRating = async (req, res) => {
    const { userId } = req.params;

    try {
        const stats = await ratingService.getAverageRating({
            targetId: userId,
            receiverRole: 'user'
        });

        return res.status(200).json({
            success: true,
            ...stats
        });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

module.exports.getRatingForRide = async (req, res) => {
    const { rideId } = req.params;
    const userId = req.user ? req.user._id : null;
    const captainId = req.captain ? req.captain._id : null;

    try {
        const ratingDoc = await ratingService.getRatingByRide({ rideId, userId, captainId });
        return res.status(200).json({
            success: true,
            rating: ratingDoc
        });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

