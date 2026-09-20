import React, { useState } from 'react';

const StarRatingInput = ({ rating = 0, setRating, readOnly = false, size = 'text-3xl' }) => {
    const [hover, setHover] = useState(0);

    return (
        <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => {
                const isFilled = star <= (hover || rating);
                return (
                    <button
                        key={star}
                        type="button"
                        disabled={readOnly}
                        onClick={() => setRating && setRating(star)}
                        onMouseEnter={() => !readOnly && setHover(star)}
                        onMouseLeave={() => !readOnly && setHover(0)}
                        className={`${size} focus:outline-none transition-colors ${
                            readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110 transform transition-transform'
                        } ${isFilled ? 'text-amber-400' : 'text-gray-300'}`}
                    >
                        <i className={isFilled ? 'ri-star-fill' : 'ri-star-line'}></i>
                    </button>
                );
            })}
        </div>
    );
};

export default StarRatingInput;
