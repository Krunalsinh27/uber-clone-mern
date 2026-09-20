import React, { useState, useEffect, useContext } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { SocketContext } from '../context/SocketContext'
import LiveTracking from '../components/LiveTracking'

const Riding = () => {
    const location = useLocation()
    const { ride } = location.state || {}
    const { socket } = useContext(SocketContext)
    const navigate = useNavigate()

    const [loadingPayment, setLoadingPayment] = useState(false)
    const [paymentStatus, setPaymentStatus] = useState(ride?.paymentStatus || 'pending')
    const [paymentMessage, setPaymentMessage] = useState('')

    useEffect(() => {
        const handleRideEnded = () => {
            navigate('/home')
        }

        const handleRideCancelled = (data) => {
            alert(`Ride was cancelled by captain: ${data?.cancellationReason || 'No reason provided'}`)
            navigate('/home')
        }

        socket.on("ride-ended", handleRideEnded)
        socket.on("ride-cancelled", handleRideCancelled)

        return () => {
            socket.off("ride-ended", handleRideEnded)
            socket.off("ride-cancelled", handleRideCancelled)
        }
    }, [ socket, navigate ])

    const loadRazorpayScript = () => {
        return new Promise((resolve) => {
            if (window.Razorpay) {
                resolve(true)
                return
            }
            const script = document.createElement('script')
            script.src = 'https://checkout.razorpay.com/v1/checkout.js'
            script.onload = () => resolve(true)
            script.onerror = () => resolve(false)
            document.body.appendChild(script)
        })
    }

    const handleMakePayment = async () => {
        if (!ride || !ride._id) return

        setLoadingPayment(true)
        setPaymentMessage('')

        try {
            const res = await axios.post(`${import.meta.env.VITE_BASE_URL}/payment/create-order`, {
                rideId: ride._id
            }, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                }
            })

            const { orderId, amount, currency, key_id } = res.data

            const sdkLoaded = await loadRazorpayScript()
            if (!sdkLoaded || !window.Razorpay) {
                // Fallback test mode simulation if Razorpay script is unavailable
                const confirmMock = window.confirm(`[Razorpay Test Mode] Simulate test payment for ₹${ride.fare}?`)
                if (confirmMock) {
                    const mockPaymentId = `pay_test_${Date.now()}`
                    const mockSig = `test_sig_${orderId}_${mockPaymentId}`
                    await verifyPaymentOnServer(orderId, mockPaymentId, mockSig)
                } else {
                    await handlePaymentFailureOnServer('User cancelled test checkout')
                }
                setLoadingPayment(false)
                return
            }

            const options = {
                key: key_id,
                amount: amount,
                currency: currency,
                name: 'Uber Clone Payment',
                description: `Payment for trip to ${ride.destination}`,
                order_id: orderId,
                handler: async function (response) {
                    await verifyPaymentOnServer(
                        response.razorpay_order_id,
                        response.razorpay_payment_id,
                        response.razorpay_signature
                    )
                },
                modal: {
                    ondismiss: async function () {
                        await handlePaymentFailureOnServer('Payment checkout dismissed')
                    }
                },
                prefill: {
                    name: ride?.user?.fullname ? `${ride.user.fullname.firstname} ${ride.user.fullname.lastname}` : 'Rider',
                    email: ride?.user?.email || 'rider@example.com'
                },
                theme: {
                    color: '#16a34a'
                }
            }

            const rzp = new window.Razorpay(options)
            rzp.on('payment.failed', async function (response) {
                await handlePaymentFailureOnServer(response.error.description || 'Payment failed')
            })
            rzp.open()
        } catch (err) {
            setPaymentMessage(err.response?.data?.message || err.message || 'Payment initiation failed')
        } finally {
            setLoadingPayment(false)
        }
    }

    const verifyPaymentOnServer = async (orderId, paymentId, signature) => {
        try {
            const res = await axios.post(`${import.meta.env.VITE_BASE_URL}/payment/verify-payment`, {
                rideId: ride._id,
                razorpay_order_id: orderId,
                razorpay_payment_id: paymentId,
                razorpay_signature: signature
            }, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                }
            })

            if (res.data.success) {
                setPaymentStatus('paid')
                setPaymentMessage('Payment Successful! Thank you.')
            }
        } catch (err) {
            setPaymentMessage(err.response?.data?.message || 'Payment verification failed')
            setPaymentStatus('failed')
        }
    }

    const handlePaymentFailureOnServer = async (reason) => {
        try {
            await axios.post(`${import.meta.env.VITE_BASE_URL}/payment/payment-failed`, {
                rideId: ride._id,
                reason
            }, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                }
            })
            setPaymentStatus('failed')
            setPaymentMessage(`Payment status: Failed (${reason})`)
        } catch (err) {
            console.error('Failure notification error:', err)
        }
    }

    return (
        <div className='h-screen'>
            <Link to='/home' className='fixed right-2 top-2 h-10 w-10 bg-white flex items-center justify-center rounded-full z-10 shadow-md'>
                <i className="text-lg font-medium ri-home-5-line"></i>
            </Link>
            <div className='h-1/2'>
                <LiveTracking />
            </div>
            <div className='h-1/2 p-4 flex flex-col justify-between bg-white rounded-t-3xl shadow-xl -mt-6 z-10 relative'>
                <div>
                    <div className='flex items-center justify-between border-b pb-3'>
                        <img className='h-12' src="https://swyft.pl/wp-content/uploads/2023/05/how-many-people-can-a-uberx-take.jpg" alt="" />
                        <div className='text-right'>
                            <h2 className='text-lg font-medium capitalize'>{ride?.captain?.fullname?.firstname}</h2>
                            <h4 className='text-xl font-semibold -mt-1 -mb-1'>{ride?.captain?.vehicle?.plate}</h4>
                            <p className='text-sm text-gray-600'>Vehicle: {ride?.vehicleType || 'Car'}</p>
                        </div>
                    </div>

                    <div className='flex gap-2 justify-between flex-col items-center mt-3'>
                        <div className='w-full'>
                            <div className='flex items-center gap-5 p-3 border-b'>
                                <i className="text-lg ri-map-pin-2-fill text-red-600"></i>
                                <div>
                                    <h3 className='text-xs text-gray-500 font-semibold uppercase'>Destination</h3>
                                    <p className='text-sm font-medium text-gray-800'>{ride?.destination}</p>
                                </div>
                            </div>
                            <div className='flex items-center gap-5 p-3 border-b'>
                                <i className="ri-currency-line text-green-600 text-lg"></i>
                                <div className='flex-1 flex justify-between items-center'>
                                    <div>
                                        <h3 className='text-xs text-gray-500 font-semibold uppercase'>Fare Amount</h3>
                                        <p className='text-lg font-bold text-gray-900'>₹{ride?.fare}</p>
                                    </div>
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                                        paymentStatus === 'paid' ? 'bg-green-100 text-green-800 border border-green-300' :
                                        paymentStatus === 'failed' ? 'bg-red-100 text-red-800 border border-red-300' :
                                        'bg-yellow-100 text-yellow-800 border border-yellow-300'
                                    }`}>
                                        {paymentStatus}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {paymentMessage && (
                    <div className={`p-3 rounded-xl text-xs text-center font-semibold ${
                        paymentStatus === 'paid' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                        {paymentMessage}
                    </div>
                )}

                <div>
                    {paymentStatus === 'paid' ? (
                        <div className='w-full bg-green-600 text-white text-center font-bold py-3 rounded-xl flex items-center justify-center gap-2'>
                            <i className="ri-checkbox-circle-fill text-xl"></i>
                            <span>Paid via Razorpay</span>
                        </div>
                    ) : (
                        <button
                            onClick={handleMakePayment}
                            disabled={loadingPayment}
                            className='w-full bg-green-600 hover:bg-green-700 text-white font-semibold p-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 text-base'
                        >
                            {loadingPayment ? (
                                <span>Initiating Razorpay...</span>
                            ) : (
                                <>
                                    <i className="ri-secure-payment-line text-xl"></i>
                                    <span>Pay ₹{ride?.fare} with Razorpay</span>
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

export default Riding