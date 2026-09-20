import React, { useState, useEffect } from 'react';
import axios from 'axios';
import StarRatingDisplay from './StarRatingDisplay';
import RatingModal from './RatingModal';

const RideDetailModal = ({ ride, onClose, userRole = 'user' }) => {
    const [existingRating, setExistingRating] = useState(null);
    const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
    const [fetchingRating, setFetchingRating] = useState(false);

    useEffect(() => {
        if (ride && ride.status === 'completed') {
            fetchExistingRating();
        } else {
            setExistingRating(null);
        }
    }, [ride]);

    const fetchExistingRating = async () => {
        setFetchingRating(true);
        try {
            const token = userRole === 'user'
                ? localStorage.getItem('token')
                : localStorage.getItem('captain_token');

            if (!token) return;

            const res = await axios.get(`${import.meta.env.VITE_BASE_URL}/ratings/ride/${ride._id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data.success && res.data.rating) {
                setExistingRating(res.data.rating);
            }
        } catch (err) {
            console.error('Failed to fetch rating for ride:', err);
        } finally {
            setFetchingRating(false);
        }
    };

    if (!ride) return null;

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleString('en-US', {
            dateStyle: 'medium',
            timeStyle: 'short'
        });
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'completed': return 'bg-green-100 text-green-800';
            case 'cancelled': return 'bg-red-100 text-red-800';
            case 'ongoing': return 'bg-blue-100 text-blue-800';
            default: return 'bg-yellow-100 text-yellow-800';
        }
    };

    return (
        <>
            <div className='fixed inset-0 z-[700] bg-black bg-opacity-60 flex items-center justify-center p-4'>
                <div className='bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl relative max-h-[90vh] overflow-y-auto'>
                    <button 
                        onClick={onClose}
                        className='absolute right-4 top-4 text-gray-400 hover:text-gray-700 h-8 w-8 rounded-full flex items-center justify-center bg-gray-100'
                    >
                        <i className="ri-close-line text-xl"></i>
                    </button>

                    <div className='flex items-center gap-3 mb-4'>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${getStatusStyle(ride.status)}`}>
                            {ride.status}
                        </span>
                        <span className='text-xs text-gray-500 font-mono'>
                            {formatDate(ride.createdAt)}
                        </span>
                    </div>

                    <h2 className='text-2xl font-bold mb-4'>Ride Details</h2>

                    <div className='bg-gray-50 p-4 rounded-xl mb-4 space-y-3 border'>
                        <div className='flex items-start gap-3'>
                            <i className="ri-record-circle-fill text-green-600 mt-1 text-lg"></i>
                            <div>
                                <p className='text-xs text-gray-500 font-semibold uppercase'>Pickup Location</p>
                                <p className='text-sm text-gray-800 font-medium'>{ride.pickup}</p>
                            </div>
                        </div>

                        <div className='border-l-2 border-dashed border-gray-300 ml-2 h-3'></div>

                        <div className='flex items-start gap-3'>
                            <i className="ri-map-pin-2-fill text-red-600 mt-1 text-lg"></i>
                            <div>
                                <p className='text-xs text-gray-500 font-semibold uppercase'>Destination Location</p>
                                <p className='text-sm text-gray-800 font-medium'>{ride.destination}</p>
                            </div>
                        </div>
                    </div>

                    <div className='grid grid-cols-2 gap-3 mb-4'>
                        <div className='bg-gray-50 p-3 rounded-xl border flex flex-col justify-between'>
                            <div>
                                <p className='text-xs text-gray-500 font-semibold uppercase'>Fare Amount</p>
                                <p className='text-xl font-bold text-gray-900'>₹{ride.fare}</p>
                            </div>
                            <div className='mt-1 flex items-center gap-1.5'>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                                    ride.paymentStatus === 'paid' ? 'bg-green-100 text-green-800 border border-green-300' :
                                    ride.paymentStatus === 'failed' ? 'bg-red-100 text-red-800 border border-red-300' :
                                    'bg-yellow-100 text-yellow-800 border border-yellow-300'
                                }`}>
                                    Payment: {ride.paymentStatus || 'pending'}
                                </span>
                            </div>
                        </div>

                        <div className='bg-gray-50 p-3 rounded-xl border'>
                            <p className='text-xs text-gray-500 font-semibold uppercase'>Vehicle Type</p>
                            <p className='text-base font-bold capitalize text-gray-800'>{ride.vehicleType || 'Car'}</p>
                            {ride.captain?.vehicle && (
                                <p className='text-[10px] text-gray-500'>{ride.captain.vehicle.color} • {ride.captain.vehicle.plate}</p>
                            )}
                        </div>
                    </div>


                    {userRole === 'user' && ride.captain && (
                        <div className='bg-gray-50 p-3 rounded-xl border mb-4 flex items-center gap-3'>
                            <div className='h-10 w-10 bg-yellow-400 rounded-full flex items-center justify-center font-bold text-gray-800'>
                                {ride.captain.fullname?.firstname?.[0] || 'C'}
                            </div>
                            <div>
                                <p className='text-xs text-gray-500 font-semibold uppercase'>Captain</p>
                                <p className='text-sm font-bold text-gray-900'>{ride.captain.fullname?.firstname} {ride.captain.fullname?.lastname}</p>
                            </div>
                        </div>
                    )}

                    {userRole === 'captain' && ride.user && (
                        <div className='bg-gray-50 p-3 rounded-xl border mb-4 flex items-center gap-3'>
                            <div className='h-10 w-10 bg-black text-white rounded-full flex items-center justify-center font-bold'>
                                {ride.user.fullname?.firstname?.[0] || 'U'}
                            </div>
                            <div>
                                <p className='text-xs text-gray-500 font-semibold uppercase'>Passenger</p>
                                <p className='text-sm font-bold text-gray-900'>{ride.user.fullname?.firstname} {ride.user.fullname?.lastname}</p>
                            </div>
                        </div>
                    )}

                    {/* RATING SECTION FOR COMPLETED RIDES */}
                    {ride.status === 'completed' && (
                        <div className='bg-amber-50/70 border border-amber-200 p-4 rounded-xl mb-4'>
                            <p className='text-xs font-bold text-amber-800 uppercase mb-2'>
                                {userRole === 'user' ? 'Your Review for Captain' : 'Your Review for Passenger'}
                            </p>
                            {existingRating ? (
                                <div>
                                    <StarRatingDisplay rating={existingRating.rating} size="text-lg" />
                                    {existingRating.review && (
                                        <p className='text-xs text-gray-700 italic mt-1 bg-white/80 p-2 rounded border border-amber-100'>
                                            "{existingRating.review}"
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <div className='flex items-center justify-between'>
                                    <p className='text-xs text-amber-700 font-medium'>You haven't rated this trip yet.</p>
                                    <button
                                        onClick={() => setIsRatingModalOpen(true)}
                                        className='bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-1 transition-colors'
                                    >
                                        <i className="ri-star-fill"></i>
                                        <span>Rate Now</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {ride.status === 'cancelled' && (
                        <div className='bg-red-50 border border-red-200 p-3 rounded-xl mb-4 text-xs text-red-800'>
                            <p className='font-bold uppercase mb-1'>Cancellation Info</p>
                            <p><span className='font-medium'>Cancelled By:</span> <span className='capitalize font-bold'>{ride.cancelledBy || 'N/A'}</span></p>
                            <p><span className='font-medium'>Reason:</span> {ride.cancellationReason || 'No reason provided'}</p>
                            {ride.cancelledAt && <p><span className='font-medium'>Date:</span> {formatDate(ride.cancelledAt)}</p>}
                        </div>
                    )}

                    <button 
                        onClick={onClose}
                        className='w-full bg-black text-white font-semibold py-3 rounded-xl text-sm'
                    >
                        Close
                    </button>
                </div>
            </div>

            {/* Rating Modal */}
            <RatingModal
                ride={ride}
                isOpen={isRatingModalOpen}
                onClose={() => setIsRatingModalOpen(false)}
                userRole={userRole}
                onRatingSubmitted={(newRatingDoc) => {
                    setExistingRating(newRatingDoc);
                }}
            />
        </>
    );
};

export default RideDetailModal;
