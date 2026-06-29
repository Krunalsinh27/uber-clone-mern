import React, { useState } from "react";
import uberLogo from "../assets/Uber-Logo.wine.png";
import { Link } from "react-router-dom";

const UserSignup = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [userData, setUserData] = useState({})

    const submitHandler = (e) => {
        e.preventDefault()
        setUserData({
            fullName:{
                firstName:firstName,
                lastName:lastName
            },
            email:email,
            password:password
        })
        console.log(userData);        
        setEmail('')
        setPassword('')
        setFirstName('')
        setLastName('')
    }
    return (
        <div className="p-7 h-screen flex flex-col justify-between">
            <div>
                <img src={uberLogo} alt="Uber Logo" className="w-16 mb-10" />
                <form onSubmit={(e) => {
                    submitHandler(e)
                }}>
                    <h3 className="text-lg font-medium mb-2">What's your name</h3>
                    <div className="flex gap-4 mb-6">
                        <input
                            required
                            className="bg-[#eeeeee] w-1/2 rounded px-4 py-2 border text-lg placeholder:text-base"
                            type="text"
                            placeholder="First name"
                            value={firstName}
                            onChange={(e)=>{
                                setFirstName(e.target.value)
                            }}
                        />
                        <input
                            required
                            className="bg-[#eeeeee] w-1/2 rounded px-4 py-2 border text-lg placeholder:text-base"
                            type="text"
                            placeholder="Last name"
                            value={lastName}
                            onChange={(e)=>{
                                setLastName(e.target.value)
                            }}
                        />
                    </div>
                    <h3 className="text-lg font-medium mb-2">What's your email</h3>
                    <input
                        required
                        className="bg-[#eeeeee] mb-6 rounded px-4 py-2 border w-full text-lg placeholder:text-base"
                        type="email"
                        placeholder="email@example.com"
                        value={email}
                        onChange={(e)=>{
                            setEmail(e.target.value)
                        }}
                    />

                    <h3 className="text-lg font-medium mb-2">Enter Password</h3>

                    <input
                        className="bg-[#eeeeee] mb-6 rounded px-4 py-2 border w-full text-base placeholder:text-sm"
                        type="password"
                        placeholder="password"
                        value={password}
                        onChange={(e)=>{
                            setPassword(e.target.value)
                        }}
                    />

                    <button
                        className="bg-[#111] text-white font-semibold mb-3 rounded px-4 py-2 w-full text-base placeholder:text-sm"
                    >Login</button>

                </form>
                <p className="text-center">Already have a account?<Link to='/login' className="text-blue-600">Login here</Link></p>
            </div>

            <div>
                <p className="text-[10px] leading-tight">This site is protected by reCAPTCHA and the <span className="underline">Google policy</span> and <span className="underline">Terms of Service apply</span></p> 
            </div>

        </div>
    )
}

export default UserSignup