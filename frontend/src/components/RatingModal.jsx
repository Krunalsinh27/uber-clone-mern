import React, { useState } from 'react';
import axios from 'axios';
import StarRatingInput from './StarRatingInput';

const RatingModal = ({ ride, isOpen, onClose, userRole = 'user', onRatingSubmitted }) => {
    const [rating, setRating] = useState(5);
    const [review, setReview] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    if (!isOpen || !ride) return null;

    const targetName = userRole === 'user'
        ? (ride.captain?.fullname?.firstname ? `${ride.captain.fullname.firstname} ${ride.captain.fullname.lastname || ''}` : 'Captain')
        : (ride.user?.fullname?.firstname ? `${ride.user.fullname.firstname} ${ride.user.fullname.lastname || ''}` : 'Passenger');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (rating < 1 || rating > 5) {
            setError('Please select a rating between 1 and 5 stars');
            return;
        }

        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const isUser = userRole === 'user';
            const endpoint = isUser
                ? `${import.meta.env.VITE_BASE_URL}/ratings/user-rate-captain`
                : `${import.meta.env.VITE_BASE_URL}/ratings/captain-rate-user`;
            
            const token = isUser
                ? localStorage.getItem('token')
                : localStorage.getItem('captain_token');

            const res = await axios.post(
                endpoint,
                {
                    rideId: ride._id,
                    rating,
                    review
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            if (res.data.success) {
                setSuccess('Thank you! Your review has been submitted.');
                if (onRatingSubmitted) {
                    onRatingSubmitted(res.data.rating);
                }
                setTimeout(() => {
                    onClose();
                    setSuccess('');
                }, 1500);
            }
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Failed to submit rating');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[800] bg-black bg-opacity-60 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
                <button
                    onClick={onClose}
                    disabled={loading}
                    className="absolute right-4 top-4 text-gray-400 hover:text-gray-700 h-8 w-8 rounded-full flex items-center justify-center bg-gray-100"
                >
                    <i className="ri-close-line text-xl"></i>
                </button>

                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-3">
                        <i className="ri-star-smile-line text-3xl"></i>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">
                        Rate Your Experience
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                        How was your trip with <span className="font-semibold text-gray-800">{targetName}</span>?
                    </p>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-xl mb-4 text-center">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="bg-green-50 border border-green-200 text-green-700 text-sm p-3 rounded-xl mb-4 text-center font-medium">
                        {success}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="flex flex-col items-center justify-center bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Select Rating</p>
                        <StarRatingInput rating={rating} setRating={setRating} size="text-4xl" />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">
                            Write a Review (Optional)
                        </label>
                        <textarea
                            value={review}
                            onChange={(e) => setReview(e.target.value)}
                            placeholder="Share details about your trip, driver behavior, cleanliness, etc."
                            rows={3}
                            className="w-full border rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-black resize-none"
                            maxLength={300}
                        />
                    </div>

                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="w-1/2 py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 text-sm"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-1/2 py-3 bg-black text-white font-semibold rounded-xl hover:bg-gray-800 text-sm flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <span>Submitting...</span>
                            ) : (
                                <>
                                    <span>Submit Rating</span>
                                    <i className="ri-send-plane-fill"></i>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RatingModal;
