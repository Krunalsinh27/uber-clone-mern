import React from 'react';

const StarRatingDisplay = ({ rating = 5.0, totalReviews, size = 'text-sm' }) => {
    const formattedRating = typeof rating === 'number' ? rating.toFixed(1) : parseFloat(rating || 5).toFixed(1);

    return (
        <div className={`flex items-center gap-1 font-medium ${size}`}>
            <i className="ri-star-fill text-amber-400"></i>
            <span className="text-gray-900 font-semibold">{formattedRating}</span>
            {totalReviews !== undefined && (
                <span className="text-gray-500 font-normal text-xs ml-0.5">({totalReviews})</span>
            )}
        </div>
    );
};

export default StarRatingDisplay;
