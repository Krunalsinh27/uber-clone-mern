import React from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

export const CaptainLogout = () => {
    const token = localStorage.getItem('captain_token')
    const navigate = useNavigate()

    React.useEffect(() => {
        axios.get(`${import.meta.env.VITE_BASE_URL}/captains/logout`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }).then((response) => {
            if (response.status === 200) {
                localStorage.removeItem('captain_token')
                navigate('/captain-login')
            }
        }).catch(() => {
            localStorage.removeItem('captain_token')
            navigate('/captain-login')
        })
    }, [])

    return (
        <div>CaptainLogout</div>
    )
}

export default CaptainLogout