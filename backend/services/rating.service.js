const ratingModel = require('../models/rating.model');
const rideModel = require('../models/ride.model');
const mongoose = require('mongoose');

module.exports.createRatingByUser = async ({ rideId, user, rating, review }) => {
    if (!rideId || !rating) {
        throw new Error('Ride ID and rating value are required');
    }

    const ratingVal = parseInt(rating, 10);
    if (isNaN(ratingVal) || ratingVal < 1 || ratingVal > 5) {
        throw new Error('Rating must be an integer between 1 and 5');
    }

    const ride = await rideModel.findOne({
        _id: rideId,
        user: user._id
    });

    if (!ride) {
        throw new Error('Ride not found or unauthorized');
    }

    if (ride.status !== 'completed') {
        throw new Error('Can only rate completed rides');
    }

    if (!ride.captain) {
        throw new Error('No captain assigned to this ride');
    }

    // Check duplicate submission
    const existing = await ratingModel.findOne({
        ride: rideId,
        giverRole: 'user'
    });

    if (existing) {
        throw new Error('You have already rated this ride');
    }

    const newRating = await ratingModel.create({
        ride: rideId,
        givenBy: user._id,
        givenTo: ride.captain,
        giverRole: 'user',
        receiverRole: 'captain',
        rating: ratingVal,
        review: review || ''
    });

    return newRating;
};

module.exports.createRatingByCaptain = async ({ rideId, captain, rating, review }) => {
    if (!rideId || !rating) {
        throw new Error('Ride ID and rating value are required');
    }

    const ratingVal = parseInt(rating, 10);
    if (isNaN(ratingVal) || ratingVal < 1 || ratingVal > 5) {
        throw new Error('Rating must be an integer between 1 and 5');
    }

    const ride = await rideModel.findOne({
        _id: rideId,
        captain: captain._id
    });

    if (!ride) {
        throw new Error('Ride not found or unauthorized');
    }

    if (ride.status !== 'completed') {
        throw new Error('Can only rate completed rides');
    }

    // Check duplicate submission
    const existing = await ratingModel.findOne({
        ride: rideId,
        giverRole: 'captain'
    });

    if (existing) {
        throw new Error('You have already rated this ride');
    }

    const newRating = await ratingModel.create({
        ride: rideId,
        givenBy: captain._id,
        givenTo: ride.user,
        giverRole: 'captain',
        receiverRole: 'user',
        rating: ratingVal,
        review: review || ''
    });

    return newRating;
};

module.exports.getAverageRating = async ({ targetId, receiverRole }) => {
    if (!targetId || !receiverRole) {
        throw new Error('Target ID and receiver role are required');
    }

    const result = await ratingModel.aggregate([
        {
            $match: {
                givenTo: new mongoose.Types.ObjectId(targetId),
                receiverRole: receiverRole
            }
        },
        {
            $group: {
                _id: '$givenTo',
                averageRating: { $avg: '$rating' },
                totalReviews: { $sum: 1 }
            }
        }
    ]);

    if (result.length > 0) {
        return {
            averageRating: Math.round(result[0].averageRating * 10) / 10,
            totalReviews: result[0].totalReviews
        };
    }

    return {
        averageRating: 5.0, // Default for new accounts
        totalReviews: 0
    };
};

module.exports.getRatingHistoryForTarget = async ({ targetId, receiverRole, page = 1, limit = 10 }) => {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    const query = {
        givenTo: targetId,
        receiverRole
    };

    const totalRatings = await ratingModel.countDocuments(query);
    const ratings = await ratingModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('givenBy');

    return {
        ratings,
        totalRatings,
        totalPages: Math.ceil(totalRatings / limitNum) || 1,
        currentPage: pageNum
    };
};

module.exports.getRatingByRide = async ({ rideId, userId, captainId }) => {
    const query = { ride: rideId };
    if (userId) {
        query.givenBy = userId;
        query.giverRole = 'user';
    } else if (captainId) {
        query.givenBy = captainId;
        query.giverRole = 'captain';
    } else {
        return null;
    }
    return await ratingModel.findOne(query);
};

