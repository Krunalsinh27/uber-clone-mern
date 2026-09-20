import React, { useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import uberCaptain from "../assets/uber_captain_logo.svg";
import axios from "axios";
import { CaptainDataContext } from "../context/CaptainContext";

const CaptainSignup = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    
    const [vehicleColor, setVehicleColor] = useState('');
    const [vehiclePlate, setVehiclePlate] = useState('');
    const [vehicleCapacity, setVehicleCapacity] = useState('');
    const [vehicleType, setVehicleType] = useState('car');

    const { setCaptain } = useContext(CaptainDataContext);
    const navigate = useNavigate();

    const submitHandler = async (e) => {
        e.preventDefault();
        const captainData = {
            fullname: {
                firstname: firstName,
                lastname: lastName
            },
            email: email,
            password: password,
            vehicle: {
                color: vehicleColor,
                plate: vehiclePlate,
                capacity: parseInt(vehicleCapacity, 10),
                vehicleType: vehicleType
            }
        };

        try {
            const response = await axios.post(`${import.meta.env.VITE_BASE_URL}/captains/register`, captainData);

            if (response.status === 201) {
                const data = response.data;
                setCaptain(data.captain);
                localStorage.setItem('captain_token', data.token);
                navigate('/captain-home');
            }
        } catch (error) {
            console.error(error);
            alert(error.response?.data?.message || 'Captain registration failed');
        }

        setEmail('');
        setPassword('');
        setFirstName('');
        setLastName('');
        setVehicleColor('');
        setVehiclePlate('');
        setVehicleCapacity('');
        setVehicleType('car');
    };

    return (
        <div className="py-5 px-5 h-screen flex flex-col justify-between overflow-y-auto">
            <div>
                <img src={uberCaptain} alt="Uber Logo" className="w-20 mb-3" />
                <form onSubmit={submitHandler}>
                    <h3 className="text-lg w-full font-medium mb-2">What's our Captain's name</h3>
                    <div className="flex gap-4 mb-4">
                        <input
                            required
                            className="bg-[#eeeeee] w-1/2 rounded px-4 py-2 border text-lg placeholder:text-base"
                            type="text"
                            placeholder="First name"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                        />
                        <input
                            required
                            className="bg-[#eeeeee] w-1/2 rounded px-4 py-2 border text-lg placeholder:text-base"
                            type="text"
                            placeholder="Last name"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                        />
                    </div>
                    
                    <h3 className="text-lg font-medium mb-2">What's our Captain's email</h3>
                    <input
                        required
                        className="bg-[#eeeeee] mb-4 rounded px-4 py-2 border w-full text-lg placeholder:text-base"
                        type="email"
                        placeholder="email@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />

                    <h3 className="text-lg font-medium mb-2">Enter Password</h3>
                    <input
                        required
                        className="bg-[#eeeeee] mb-4 rounded px-4 py-2 border w-full text-base placeholder:text-sm"
                        type="password"
                        placeholder="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />

                    <h3 className="text-lg font-medium mb-2">Vehicle Information</h3>
                    <div className="flex gap-4 mb-4">
                        <input
                            required
                            className="bg-[#eeeeee] w-1/2 rounded px-4 py-2 border text-base placeholder:text-sm"
                            type="text"
                            placeholder="Vehicle Color"
                            value={vehicleColor}
                            onChange={(e) => setVehicleColor(e.target.value)}
                        />
                        <input
                            required
                            className="bg-[#eeeeee] w-1/2 rounded px-4 py-2 border text-base placeholder:text-sm"
                            type="text"
                            placeholder="Vehicle Plate"
                            value={vehiclePlate}
                            onChange={(e) => setVehiclePlate(e.target.value)}
                        />
                    </div>

                    <div className="flex gap-4 mb-6">
                        <input
                            required
                            className="bg-[#eeeeee] w-1/2 rounded px-4 py-2 border text-base placeholder:text-sm"
                            type="number"
                            min="1"
                            placeholder="Capacity"
                            value={vehicleCapacity}
                            onChange={(e) => setVehicleCapacity(e.target.value)}
                        />
                        <select
                            required
                            className="bg-[#eeeeee] w-1/2 rounded px-4 py-2 border text-base"
                            value={vehicleType}
                            onChange={(e) => setVehicleType(e.target.value)}
                        >
                            <option value="car">Car</option>
                            <option value="auto">Auto</option>
                            <option value="moto">Moto</option>
                        </select>
                    </div>

                    <button
                        type="submit"
                        className="bg-[#111] text-white font-semibold mb-3 rounded px-4 py-2 w-full text-base placeholder:text-sm"
                    >Register as Captain</button>
                </form>
                <p className="text-center">Already have an account? <Link to='/captain-login' className="text-blue-600">Login here</Link></p>
            </div>

            <div className="mt-4">
                <p className="text-[10px] leading-tight">This site is protected by reCAPTCHA and the <span className="underline">Google policy</span> and <span className="underline">Terms of Service apply</span></p>
            </div>
        </div>
    );
};

export default CaptainSignup;