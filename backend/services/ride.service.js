const rideModel = require('../models/ride.model');
const mapService = require('./maps.service');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

async function getFare(pickup, destination) {

    if (!pickup || !destination) {
        throw new Error('Pickup and destination are required');
    }

    const distanceTime = await mapService.getDistanceTime(pickup, destination);

    const baseFare = {
        auto: 30,
        car: 50,
        moto: 20
    };

    const perKmRate = {
        auto: 10,
        car: 15,
        moto: 8
    };

    const perMinuteRate = {
        auto: 2,
        car: 3,
        moto: 1.5
    };



    const fare = {
        auto: Math.round(baseFare.auto + ((distanceTime.distance.value / 1000) * perKmRate.auto) + ((distanceTime.duration.value / 60) * perMinuteRate.auto)),
        car: Math.round(baseFare.car + ((distanceTime.distance.value / 1000) * perKmRate.car) + ((distanceTime.duration.value / 60) * perMinuteRate.car)),
        moto: Math.round(baseFare.moto + ((distanceTime.distance.value / 1000) * perKmRate.moto) + ((distanceTime.duration.value / 60) * perMinuteRate.moto))
    };

    return fare;


}

module.exports.getFare = getFare;


function getOtp(num) {
    function generateOtp(num) {
        const otp = crypto.randomInt(Math.pow(10, num - 1), Math.pow(10, num)).toString();
        return otp;
    }
    return generateOtp(num);
}


module.exports.createRide = async ({
    user, pickup, destination, vehicleType
}) => {
    if (!user || !pickup || !destination || !vehicleType) {
        throw new Error('All fields are required');
    }

    const fare = await getFare(pickup, destination);



    const ride = rideModel.create({
        user,
        pickup,
        destination,
        otp: getOtp(6),
        fare: fare[ vehicleType ]
    })

    return ride;
}

module.exports.confirmRide = async ({
    rideId, captain
}) => {
    if (!rideId) {
        throw new Error('Ride id is required');
    }

    await rideModel.findOneAndUpdate({
        _id: rideId
    }, {
        status: 'accepted',
        captain: captain._id
    })

    const ride = await rideModel.findOne({
        _id: rideId
    }).populate('user').populate('captain').select('+otp');

    if (!ride) {
        throw new Error('Ride not found');
    }

    return ride;

}

module.exports.startRide = async ({ rideId, otp, captain }) => {
    if (!rideId || !otp) {
        throw new Error('Ride id and OTP are required');
    }

    const ride = await rideModel.findOne({
        _id: rideId,
        captain: captain._id
    }).populate('user').populate('captain').select('+otp');

    if (!ride) {
        throw new Error('Ride not found');
    }

    if (ride.status !== 'accepted') {
        throw new Error('Ride not accepted');
    }

    if (ride.otp !== otp) {
        throw new Error('Invalid OTP');
    }

    const updatedRide = await rideModel.findOneAndUpdate({
        _id: rideId
    }, {
        status: 'ongoing'
    }, { new: true, returnDocument: 'after' }).populate('user').populate('captain');

    return updatedRide;
}

module.exports.endRide = async ({ rideId, captain }) => {
    if (!rideId) {
        throw new Error('Ride id is required');
    }

    const ride = await rideModel.findOne({
        _id: rideId,
        captain: captain._id
    }).populate('user').populate('captain').select('+otp');

    if (!ride) {
        throw new Error('Ride not found');
    }

    if (ride.status !== 'ongoing') {
        throw new Error('Ride not ongoing');
    }

    const updatedRide = await rideModel.findOneAndUpdate({
        _id: rideId
    }, {
        status: 'completed'
    }, { new: true, returnDocument: 'after' }).populate('user').populate('captain');

    return updatedRide;
}

module.exports.cancelRideByUser = async ({ rideId, user, reason }) => {
    if (!rideId) {
        throw new Error('Ride id is required');
    }

    const ride = await rideModel.findOne({
        _id: rideId,
        user: user._id
    }).populate('user').populate('captain');

    if (!ride) {
        throw new Error('Ride not found or unauthorized');
    }

    if (ride.status === 'completed' || ride.status === 'cancelled') {
        throw new Error(`Cannot cancel ride with status '${ride.status}'`);
    }

    const updatedRide = await rideModel.findOneAndUpdate({
        _id: rideId
    }, {
        status: 'cancelled',
        cancellationReason: reason || 'Cancelled by user',
        cancelledBy: 'user',
        cancelledAt: new Date()
    }, { new: true, returnDocument: 'after' }).populate('user').populate('captain');

    return updatedRide;
}

module.exports.cancelRideByCaptain = async ({ rideId, captain, reason }) => {
    if (!rideId) {
        throw new Error('Ride id is required');
    }

    const ride = await rideModel.findOne({
        _id: rideId,
        captain: captain._id
    }).populate('user').populate('captain');

    if (!ride) {
        throw new Error('Ride not found or unauthorized');
    }

    if (ride.status === 'completed' || ride.status === 'cancelled') {
        throw new Error(`Cannot cancel ride with status '${ride.status}'`);
    }

    const updatedRide = await rideModel.findOneAndUpdate({
        _id: rideId
    }, {
        status: 'cancelled',
        cancellationReason: reason || 'Cancelled by captain',
        cancelledBy: 'captain',
        cancelledAt: new Date()
    }, { new: true, returnDocument: 'after' }).populate('user').populate('captain');

    return updatedRide;
}

module.exports.getUserRideHistory = async ({ userId, page = 1, limit = 10, status = 'all' }) => {
    if (!userId) {
        throw new Error('User ID is required');
    }

    const query = { user: userId };
    if (status && status !== 'all') {
        query.status = status;
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    const totalRides = await rideModel.countDocuments(query);
    const totalPages = Math.ceil(totalRides / limitNum) || 1;

    const rides = await rideModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('captain');

    return {
        rides,
        totalRides,
        totalPages,
        currentPage: pageNum
    };
}

module.exports.getCaptainRideHistory = async ({ captainId, page = 1, limit = 10, status = 'all' }) => {
    if (!captainId) {
        throw new Error('Captain ID is required');
    }

    const query = { captain: captainId };
    if (status && status !== 'all') {
        query.status = status;
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    const totalRides = await rideModel.countDocuments(query);
    const totalPages = Math.ceil(totalRides / limitNum) || 1;

    const rides = await rideModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('user');

    const allCaptainRides = await rideModel.find({ captain: captainId });
    let totalEarnings = 0;
    let completedTrips = 0;
    let cancelledTrips = 0;

    allCaptainRides.forEach(r => {
        if (r.status === 'completed') {
            totalEarnings += (r.fare || 0);
            completedTrips++;
        } else if (r.status === 'cancelled') {
            cancelledTrips++;
        }
    });

    return {
        rides,
        summary: {
            totalEarnings: Math.round(totalEarnings * 100) / 100,
            completedTrips,
            cancelledTrips,
            totalAssigned: allCaptainRides.length
        },
        totalRides,
        totalPages,
        currentPage: pageNum
    };
}