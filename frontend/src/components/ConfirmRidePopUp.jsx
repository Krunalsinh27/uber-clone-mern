import React, { useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

const ConfirmRidePopUp = (props) => {
    const [ otp, setOtp ] = useState('')
    const [ showCancelModal, setShowCancelModal ] = useState(false)
    const [ reason, setReason ] = useState('User not responding')
    const [ errorMsg, setErrorMsg ] = useState('')
    const navigate = useNavigate()

    const submitHander = async (e) => {
        e.preventDefault()
        setErrorMsg('')

        try {
            const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/rides/start-ride`, {
                params: {
                    rideId: props.ride._id,
                    otp: otp
                },
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('captain_token')}`
                }
            })

            if (response.status === 200) {
                props.setConfirmRidePopupPanel(false)
                props.setRidePopupPanel(false)
                navigate('/captain-riding', { state: { ride: props.ride } })
            }
        } catch (err) {
            setErrorMsg(err.response?.data?.message || 'Invalid OTP or failed to start ride')
        }
    }

    const handleCancelRide = async () => {
        setErrorMsg('')
        if (props.ride?._id) {
            try {
                const response = await axios.post(`${import.meta.env.VITE_BASE_URL}/rides/cancel-captain`, {
                    rideId: props.ride._id,
                    reason
                }, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('captain_token')}`
                    }
                })

                if (response.status === 200) {
                    setShowCancelModal(false)
                    props.setConfirmRidePopupPanel(false)
                    props.setRidePopupPanel(false)
                }
            } catch (err) {
                setErrorMsg(err.response?.data?.message || 'Failed to cancel ride')
            }
        } else {
            setShowCancelModal(false)
            props.setConfirmRidePopupPanel(false)
            props.setRidePopupPanel(false)
        }
    }

    return (
        <div>
            <h5 className='p-1 text-center w-[93%] absolute top-0' onClick={() => {
                props.setRidePopupPanel(false)
            }}><i className="text-3xl text-gray-200 ri-arrow-down-wide-line"></i></h5>
            <h3 className='text-2xl font-semibold mb-5'>Confirm this ride to Start</h3>
            
            {errorMsg && <div className='bg-red-100 text-red-700 p-2 rounded mb-3 text-sm'>{errorMsg}</div>}

            <div className='flex items-center justify-between p-3 border-2 border-yellow-400 rounded-lg mt-4'>
                <div className='flex items-center gap-3 '>
                    <img className='h-12 rounded-full object-cover w-12' src="https://i.pinimg.com/236x/af/26/28/af26280b0ca305be47df0b799ed1b12b.jpg" alt="" />
                    <h2 className='text-lg font-medium capitalize'>{props.ride?.user?.fullname?.firstname}</h2>
                </div>
                <h5 className='text-lg font-semibold'>2.2 KM</h5>
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

                <div className='mt-6 w-full'>
                    <form onSubmit={submitHander}>
                        <input value={otp} onChange={(e) => setOtp(e.target.value)} type="text" className='bg-[#eee] px-6 py-4 font-mono text-lg rounded-lg w-full mt-3' placeholder='Enter OTP' />

                        <button className='w-full mt-5 text-lg flex justify-center bg-green-600 text-white font-semibold p-3 rounded-lg'>Confirm & Start</button>
                        <button type="button" onClick={() => setShowCancelModal(true)} className='w-full mt-2 bg-red-600 text-lg text-white font-semibold p-3 rounded-lg'>Cancel Ride</button>
                    </form>
                </div>
            </div>

            {showCancelModal && (
                <div className='fixed inset-0 z-[600] bg-black bg-opacity-50 flex items-center justify-center p-4'>
                    <div className='bg-white rounded-xl p-6 w-full max-w-md shadow-2xl'>
                        <h3 className='text-xl font-bold mb-3'>Cancel Ride</h3>
                        <p className='text-gray-600 mb-3'>Please select a reason for cancellation:</p>
                        <select 
                            value={reason} 
                            onChange={(e) => setReason(e.target.value)}
                            className='w-full p-3 bg-gray-100 rounded-lg mb-6 border'
                        >
                            <option value="User not responding">User not responding</option>
                            <option value="Pickup location too far">Pickup location too far</option>
                            <option value="Vehicle issue">Vehicle issue</option>
                            <option value="User requested cancellation">User requested cancellation</option>
                        </select>
                        <div className='flex gap-3'>
                            <button 
                                onClick={handleCancelRide}
                                className='w-1/2 bg-red-600 text-white p-3 rounded-lg font-semibold'
                            >
                                Confirm Cancel
                            </button>
                            <button 
                                onClick={() => setShowCancelModal(false)}
                                className='w-1/2 bg-gray-200 text-gray-800 p-3 rounded-lg font-semibold'
                            >
                                Back
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default ConfirmRidePopUp