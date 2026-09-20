import React from 'react'

const RideHistoryCard = ({ ride, onSelect, userRole = 'user' }) => {
    const getStatusStyle = (status) => {
        switch (status) {
            case 'completed':
                return 'bg-green-100 text-green-800 border-green-300';
            case 'cancelled':
                return 'bg-red-100 text-red-800 border-red-300';
            case 'ongoing':
                return 'bg-blue-100 text-blue-800 border-blue-300';
            case 'accepted':
                return 'bg-yellow-100 text-yellow-800 border-yellow-300';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-300';
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Date N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const otherPartyName = userRole === 'user'
        ? (ride.captain?.fullname?.firstname ? `${ride.captain.fullname.firstname} ${ride.captain.fullname.lastname || ''}` : 'Captain Pending')
        : (ride.user?.fullname?.firstname ? `${ride.user.fullname.firstname} ${ride.user.fullname.lastname || ''}` : 'Passenger');

    return (
        <div className='bg-white border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow mb-3'>
            <div className='flex items-center justify-between pb-3 border-b'>
                <div className='flex items-center gap-2'>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize border ${getStatusStyle(ride.status)}`}>
                        {ride.status}
                    </span>
                    <span className='text-xs text-gray-500 font-mono'>
                        {formatDate(ride.createdAt || ride.cancelledAt)}
                    </span>
                </div>
                <h4 className='text-lg font-bold text-gray-900'>₹{ride.fare}</h4>
            </div>

            <div className='py-3 space-y-2'>
                <div className='flex items-start gap-3'>
                    <i className="ri-record-circle-line text-green-600 mt-1"></i>
                    <div className='flex-1'>
                        <p className='text-xs text-gray-500 font-medium'>Pickup</p>
                        <p className='text-sm text-gray-800 font-medium truncate'>{ride.pickup}</p>
                    </div>
                </div>

                <div className='flex items-start gap-3'>
                    <i className="ri-map-pin-2-line text-red-600 mt-1"></i>
                    <div className='flex-1'>
                        <p className='text-xs text-gray-500 font-medium'>Destination</p>
                        <p className='text-sm text-gray-800 font-medium truncate'>{ride.destination}</p>
                    </div>
                </div>
            </div>

            <div className='flex items-center justify-between pt-3 border-t text-xs text-gray-600'>
                <div className='flex items-center gap-2 capitalize'>
                    <i className="ri-user-line text-gray-500"></i>
                    <span>{otherPartyName}</span>
                </div>
                <button
                    onClick={() => onSelect(ride)}
                    className='bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1'
                >
                    <span>Details</span>
                    <i className="ri-arrow-right-s-line"></i>
                </button>
            </div>
        </div>
    );
};

export default RideHistoryCard;
