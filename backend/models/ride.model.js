const mongoose = require('mongoose');


const rideSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    captain: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'captain',
    },
    pickup: {
        type: String,
        required: true,
    },
    destination: {
        type: String,
        required: true,
    },
    fare: {
        type: Number,
        required: true,
    },

    status: {
        type: String,
        enum: [ 'pending', 'accepted', "ongoing", 'completed', 'cancelled' ],
        default: 'pending',
    },

    duration: {
        type: Number,
    }, // in seconds

    distance: {
        type: Number,
    }, // in meters

    paymentID: {
        type: String,
    },
    orderId: {
        type: String,
    },
    signature: {
        type: String,
    },

    otp: {
        type: String,
        select: false,
        required: true,
    },

    cancellationReason: {
        type: String,
        default: ''
    },
    cancelledBy: {
        type: String,
        enum: [ 'user', 'captain' ]
    },
    cancelledAt: {
        type: Date
    }
}, {
    timestamps: true
});

rideSchema.index({ user: 1, createdAt: -1 });
rideSchema.index({ captain: 1, createdAt: -1 });
rideSchema.index({ status: 1 });

module.exports = mongoose.model('ride', rideSchema);