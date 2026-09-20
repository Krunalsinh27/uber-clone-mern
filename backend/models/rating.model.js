const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
    ride: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ride',
        required: true
    },
    givenBy: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    givenTo: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    giverRole: {
        type: String,
        enum: [ 'user', 'captain' ],
        required: true
    },
    receiverRole: {
        type: String,
        enum: [ 'user', 'captain' ],
        required: true
    },
    rating: {
        type: Number,
        required: true,
        min: [ 1, 'Rating must be at least 1' ],
        max: [ 5, 'Rating cannot exceed 5' ]
    },
    review: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

// Ensure a single giver can rate a specific ride ONLY ONCE
ratingSchema.index({ ride: 1, giverRole: 1 }, { unique: true });

// Optimize query for target user/captain average rating calculations
ratingSchema.index({ givenTo: 1, receiverRole: 1 });

module.exports = mongoose.model('rating', ratingSchema);
