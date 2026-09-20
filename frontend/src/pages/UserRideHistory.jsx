import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import RideHistoryCard from '../components/RideHistoryCard'
import RideDetailModal from '../components/RideDetailModal'

const UserRideHistory = () => {
    const [ rides, setRides ] = useState([])
    const [ loading, setLoading ] = useState(true)
    const [ error, setError ] = useState('')
    const [ filterStatus, setFilterStatus ] = useState('all')
    const [ currentPage, setCurrentPage ] = useState(1)
    const [ totalPages, setTotalPages ] = useState(1)
    const [ totalRides, setTotalRides ] = useState(0)
    const [ selectedRide, setSelectedRide ] = useState(null)

    const fetchHistory = async () => {
        setLoading(true)
        setError('')
        try {
            const token = localStorage.getItem('token')
            const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/rides/user-history`, {
                params: {
                    page: currentPage,
                    limit: 5,
                    status: filterStatus
                },
                headers: {
                    Authorization: `Bearer ${token}`
                }
            })

            if (response.data?.success) {
                setRides(response.data.rides || [])
                setTotalPages(response.data.totalPages || 1)
                setTotalRides(response.data.totalRides || 0)
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch ride history')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchHistory()
    }, [ filterStatus, currentPage ])

    const handleFilterChange = (status) => {
        setFilterStatus(status)
        setCurrentPage(1)
    }

    return (
        <div className='min-h-screen bg-gray-50 flex flex-col'>
            {/* Header */}
            <div className='bg-white border-b px-4 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm'>
                <div className='flex items-center gap-3'>
                    <Link to='/home' className='h-9 w-9 bg-gray-100 rounded-full flex items-center justify-center text-gray-700 hover:bg-gray-200'>
                        <i className="ri-arrow-left-line text-lg"></i>
                    </Link>
                    <h1 className='text-xl font-bold text-gray-900'>Your Trips</h1>
                </div>
                <span className='text-xs font-semibold bg-gray-100 text-gray-700 px-3 py-1 rounded-full'>
                    {totalRides} {totalRides === 1 ? 'Trip' : 'Trips'}
                </span>
            </div>

            {/* Content Container */}
            <div className='flex-1 max-w-2xl w-full mx-auto p-4 flex flex-col'>
                {/* Filter Tabs */}
                <div className='flex gap-2 overflow-x-auto pb-3 mb-3 scrollbar-none'>
                    {['all', 'completed', 'cancelled', 'pending', 'ongoing'].map((status) => (
                        <button
                            key={status}
                            onClick={() => handleFilterChange(status)}
                            className={`px-4 py-2 rounded-full text-xs font-semibold capitalize whitespace-nowrap transition-colors ${
                                filterStatus === status
                                    ? 'bg-black text-white'
                                    : 'bg-white border text-gray-600 hover:bg-gray-100'
                            }`}
                        >
                            {status}
                        </button>
                    ))}
                </div>

                {/* Error Banner */}
                {error && (
                    <div className='bg-red-100 text-red-700 p-3 rounded-xl mb-4 text-sm font-medium'>
                        {error}
                    </div>
                )}

                {/* Loading Skeleton */}
                {loading && (
                    <div className='space-y-3'>
                        {[1, 2, 3].map((n) => (
                            <div key={n} className='bg-white border rounded-xl p-4 animate-pulse space-y-3'>
                                <div className='h-4 bg-gray-200 rounded w-1/3'></div>
                                <div className='h-4 bg-gray-200 rounded w-2/3'></div>
                                <div className='h-4 bg-gray-200 rounded w-1/2'></div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Empty State */}
                {!loading && rides.length === 0 && (
                    <div className='flex-1 flex flex-col items-center justify-center py-12 text-center'>
                        <div className='h-20 w-20 bg-gray-200 rounded-full flex items-center justify-center mb-4 text-gray-400 text-3xl'>
                            <i className="ri-car-line"></i>
                        </div>
                        <h3 className='text-lg font-bold text-gray-800 mb-1'>No rides found</h3>
                        <p className='text-sm text-gray-500 max-w-xs mb-6'>
                            {filterStatus === 'all' 
                                ? "You haven't taken any rides yet. Book a trip to get started!" 
                                : `No rides found matching '${filterStatus}' status.`}
                        </p>
                        <Link to='/home' className='bg-black text-white px-6 py-2.5 rounded-xl font-semibold text-sm'>
                            Book a Ride
                        </Link>
                    </div>
                )}

                {/* Rides List */}
                {!loading && rides.length > 0 && (
                    <div className='flex-1'>
                        {rides.map((ride) => (
                            <RideHistoryCard
                                key={ride._id}
                                ride={ride}
                                userRole='user'
                                onSelect={(r) => setSelectedRide(r)}
                            />
                        ))}
                    </div>
                )}

                {/* Pagination Controls */}
                {!loading && totalPages > 1 && (
                    <div className='flex items-center justify-between pt-4 mt-auto border-t'>
                        <button
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            className='px-4 py-2 border rounded-lg text-sm font-semibold disabled:opacity-40 bg-white hover:bg-gray-100'
                        >
                            Previous
                        </button>
                        <span className='text-xs font-semibold text-gray-600'>
                            Page {currentPage} of {totalPages}
                        </span>
                        <button
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            className='px-4 py-2 border rounded-lg text-sm font-semibold disabled:opacity-40 bg-white hover:bg-gray-100'
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {selectedRide && (
                <RideDetailModal
                    ride={selectedRide}
                    userRole='user'
                    onClose={() => setSelectedRide(null)}
                />
            )}
        </div>
    )
}

export default UserRideHistory
