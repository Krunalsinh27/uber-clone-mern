import React, { useState } from 'react'
import axios from 'axios'

const WaitingForDriver = (props) => {
    const [ showCancelModal, setShowCancelModal ] = useState(false)
    const [ reason, setReason ] = useState('Driver taking too long')
    const [ errorMsg, setErrorMsg ] = useState('')

    const handleCancel = async () => {
        setErrorMsg('')
        if (props.ride?._id) {
            try {
                const response = await axios.post(`${import.meta.env.VITE_BASE_URL}/rides/cancel-user`, {
                    rideId: props.ride._id,
                    reason
                }, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`
                    }
                })
                if (response.status === 200) {
                    setShowCancelModal(false)
                    if (props.setWaitingForDriver) props.setWaitingForDriver(false)
                    if (props.setVehicleFound) props.setVehicleFound(false)
                }
            } catch (err) {
                setErrorMsg(err.response?.data?.message || 'Failed to cancel ride')
            }
        } else {
            setShowCancelModal(false)
            if (props.setWaitingForDriver) props.setWaitingForDriver(false)
        }
    }

    return (
        <div>
            <h5 className='p-1 text-center w-[93%] absolute top-0' onClick={() => {
                if (props.setWaitingForDriver) props.setWaitingForDriver(false)
            }}><i className="text-3xl text-gray-200 ri-arrow-down-wide-line"></i></h5>

            <div className='flex items-center justify-between'>
                <img className='h-12' src="https://swyft.pl/wp-content/uploads/2023/05/how-many-people-can-a-uberx-take.jpg" alt="" />
                <div className='text-right'>
                    <h2 className='text-lg font-medium capitalize'>{props.ride?.captain?.fullname?.firstname}</h2>
                    <h4 className='text-xl font-semibold -mt-1 -mb-1'>{props.ride?.captain?.vehicle?.plate}</h4>
                    <p className='text-sm text-gray-600'>Captain</p>
                    <h1 className='text-lg font-semibold'>OTP: {props.ride?.otp} </h1>
                </div>
            </div>

            <div className='flex gap-2 justify-between flex-col items-center'>
                <div className='w-full mt-5'>
                    <div className='flex items-center gap-5 p-3 border-b-2'>
                        <i className="ri-map-pin-user-fill"></i>
                        <div>
                            <h3 className='text-lg font-medium'>Pickup</h3>
                            <p className='text-sm -mt-1 text-gray-600'>{props.ride?.pickup}</p>
                        </div>
                    </div>
                    <div className='flex items-center gap-5 p-3 border-b-2'>
                        <i className="text-lg ri-map-pin-2-fill"></i>
                        <div>
                            <h3 className='text-lg font-medium'>Destination</h3>
                            <p className='text-sm -mt-1 text-gray-600'>{props.ride?.destination}</p>
                        </div>
                    </div>
                    <div className='flex items-center gap-5 p-3'>
                        <i className="ri-currency-line"></i>
                        <div>
                            <h3 className='text-lg font-medium'>₹{props.ride?.fare} </h3>
                            <p className='text-sm -mt-1 text-gray-600'>Cash Cash</p>
                        </div>
                    </div>
                </div>

                <button 
                    onClick={() => setShowCancelModal(true)} 
                    className='w-full mt-4 bg-red-600 text-white font-semibold p-3 rounded-lg text-lg'
                >
                    Cancel Ride
                </button>
            </div>

            {showCancelModal && (
                <div className='fixed inset-0 z-[600] bg-black bg-opacity-50 flex items-center justify-center p-4'>
                    <div className='bg-white rounded-xl p-6 w-full max-w-md shadow-2xl'>
                        <h3 className='text-xl font-bold mb-3'>Cancel Ride</h3>
                        {errorMsg && <div className='bg-red-100 text-red-700 p-2 rounded mb-3 text-sm'>{errorMsg}</div>}
                        <p className='text-gray-600 mb-3'>Please select a reason for cancellation:</p>
                        <select 
                            value={reason} 
                            onChange={(e) => setReason(e.target.value)}
                            className='w-full p-3 bg-gray-100 rounded-lg mb-6 border'
                        >
                            <option value="Driver taking too long">Driver taking too long</option>
                            <option value="Changed my mind">Changed my mind</option>
                            <option value="Driver requested cancellation">Driver requested cancellation</option>
                            <option value="Wrong pickup address">Wrong pickup address</option>
                        </select>
                        <div className='flex gap-3'>
                            <button 
                                onClick={handleCancel}
                                className='w-1/2 bg-red-600 text-white p-3 rounded-lg font-semibold'
                            >
                                Confirm Cancel
                            </button>
                            <button 
                                onClick={() => setShowCancelModal(false)}
                                className='w-1/2 bg-gray-200 text-gray-800 p-3 rounded-lg font-semibold'
                            >
                                Keep Ride
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default WaitingForDriver