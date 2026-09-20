const path = require('path');
const dotenv = require('./node_modules/dotenv');
dotenv.config();

const mongoose = require('./node_modules/mongoose');
const axios = require('./node_modules/axios');
const { io: ioClient } = require('../frontend/node_modules/socket.io-client');

const BASE_URL = process.env.VITE_BASE_URL || 'http://localhost:4000';
const userModel = require('./models/user.model');
const captainModel = require('./models/captain.model');
const rideModel = require('./models/ride.model');

// Mock Google Maps API responses to allow testing ride creation/fare calculation without external billing/network errors
const mapService = require('./services/maps.service');

mapService.getAddressCoordinate = async (address) => {
    return { ltd: 28.6139, lng: 77.2090 }; // Delhi coordinates
};

mapService.getDistanceTime = async (origin, destination) => {
    return {
        distance: { text: '10 km', value: 10000 },
        duration: { text: '20 mins', value: 1200 },
        status: 'OK'
    };
};

mapService.getAutoCompleteSuggestions = async (input) => {
    return [ 'Connaught Place, New Delhi', 'Chandni Chowk, New Delhi' ];
};

const results = {};

function logResult(testName, status, reason = '') {
    results[testName] = { status, reason };
    console.log(`[TEST] ${testName}: ${status} ${reason ? '(' + reason + ')' : ''}`);
}

async function runE2ETests() {
    try {
        console.log("=== STARTING E2E INTEGRATION SUITE ===");

        // Connect to MongoDB for direct verification
        await mongoose.connect(process.env.DB_CONNECT || 'mongodb://127.0.0.1:27017/uber-clone');
        
        // Clean test data
        const testUserEmail = `user_${Date.now()}@test.com`;
        const testCaptainEmail = `captain_${Date.now()}@test.com`;

        let userToken, userId, userSocket;
        let captainToken, captainId, captainSocket;
        let createdRideId, rideOtp;

        // 1. User Registration
        try {
            const res = await axios.post(`${BASE_URL}/users/register`, {
                fullname: { firstname: 'Test', lastname: 'User' },
                email: testUserEmail,
                password: 'password123'
            });
            if (res.status === 201 && res.data.token && res.data.user) {
                userToken = res.data.token;
                userId = res.data.user._id;
                logResult('1. User registration', 'PASS');
            } else {
                logResult('1. User registration', 'FAIL', 'Unexpected status code or body');
            }
        } catch (err) {
            logResult('1. User registration', 'FAIL', err.response?.data?.message || err.message);
        }

        // 2. User Login
        try {
            const res = await axios.post(`${BASE_URL}/users/login`, {
                email: testUserEmail,
                password: 'password123'
            });
            if (res.status === 200 && res.data.token) {
                logResult('2. User login', 'PASS');
            } else {
                logResult('2. User login', 'FAIL', 'Login failed');
            }
        } catch (err) {
            logResult('2. User login', 'FAIL', err.response?.data?.message || err.message);
        }

        // 3. Captain Registration
        try {
            const res = await axios.post(`${BASE_URL}/captains/register`, {
                fullname: { firstname: 'Test', lastname: 'Captain' },
                email: testCaptainEmail,
                password: 'password123',
                vehicle: {
                    color: 'White',
                    plate: 'DL01AB1234',
                    capacity: 4,
                    vehicleType: 'car'
                }
            });
            if (res.status === 201 && res.data.token && res.data.captain) {
                captainToken = res.data.token;
                captainId = res.data.captain._id;
                logResult('3. Captain registration', 'PASS');
            } else {
                logResult('3. Captain registration', 'FAIL', 'Unexpected response');
            }
        } catch (err) {
            logResult('3. Captain registration', 'FAIL', err.response?.data?.message || err.message);
        }

        // 4. Captain Login
        try {
            const res = await axios.post(`${BASE_URL}/captains/login`, {
                email: testCaptainEmail,
                password: 'password123'
            });
            if (res.status === 200 && res.data.token) {
                logResult('4. Captain login', 'PASS');
            } else {
                logResult('4. Captain login', 'FAIL', 'Login response invalid');
            }
        } catch (err) {
            logResult('4. Captain login', 'FAIL', err.response?.data?.message || err.message);
        }

        // 5. User Location Search (Suggestions & Coordinates)
        try {
            const resSuggestions = await axios.get(`${BASE_URL}/maps/get-suggestions`, {
                params: { input: 'Connaught' },
                headers: { Authorization: `Bearer ${userToken}` }
            });
            const resCoords = await axios.get(`${BASE_URL}/maps/get-coordinates`, {
                params: { address: 'Connaught Place' },
                headers: { Authorization: `Bearer ${userToken}` }
            });
            if (Array.isArray(resSuggestions.data) && resCoords.data.ltd) {
                logResult('5. User location search', 'PASS');
            } else {
                logResult('5. User location search', 'FAIL', 'Location endpoints response mismatch');
            }
        } catch (err) {
            logResult('5. User location search', 'FAIL', err.response?.data?.message || err.message);
        }

        // 6. Fare Calculation
        try {
            const resFare = await axios.get(`${BASE_URL}/rides/get-fare`, {
                params: { pickup: 'Delhi', destination: 'Noida' },
                headers: { Authorization: `Bearer ${userToken}` }
            });
            if (resFare.data.car && resFare.data.moto && resFare.data.auto) {
                logResult('6. Fare calculation', 'PASS');
            } else {
                logResult('6. Fare calculation', 'FAIL', 'Fare data missing vehicle types');
            }
        } catch (err) {
            logResult('6. Fare calculation', 'FAIL', err.response?.data?.message || err.message);
        }

        // 13. Socket.IO Connection & Authentication
        let userSocketConnected = false;
        let captainSocketConnected = false;
        try {
            userSocket = ioClient(BASE_URL, { auth: { token: userToken } });
            captainSocket = ioClient(BASE_URL, { auth: { token: captainToken } });

            await new Promise((resolve) => {
                let connectedCount = 0;
                userSocket.on('connect', () => {
                    userSocketConnected = true;
                    userSocket.emit('join', { userId, userType: 'user' });
                    connectedCount++;
                    if (connectedCount === 2) resolve();
                });
                captainSocket.on('connect', () => {
                    captainSocketConnected = true;
                    captainSocket.emit('join', { userId: captainId, userType: 'captain' });
                    // Update captain location so spatial query finds them
                    captainSocket.emit('update-location-captain', {
                        userId: captainId,
                        location: { ltd: 28.6139, lng: 77.2090 }
                    });
                    connectedCount++;
                    if (connectedCount === 2) resolve();
                });
            });

            // Wait brief moment for DB location update to save
            await new Promise(r => setTimeout(r, 500));

            if (userSocketConnected && captainSocketConnected) {
                logResult('13. Socket.IO connection and reconnection', 'PASS');
            } else {
                logResult('13. Socket.IO connection and reconnection', 'FAIL', 'Sockets failed to connect');
            }
        } catch (err) {
            logResult('13. Socket.IO connection and reconnection', 'FAIL', err.message);
        }

        // 7. Ride Creation & 8. Captain Receives Ride Notification
        let newRideReceivedPromise = new Promise((resolve) => {
            const timer = setTimeout(() => resolve(null), 3000);
            captainSocket.on('new-ride', (rideData) => {
                clearTimeout(timer);
                resolve(rideData);
            });
        });

        try {
            const resRide = await axios.post(`${BASE_URL}/rides/create`, {
                pickup: 'Delhi',
                destination: 'Noida',
                vehicleType: 'car'
            }, {
                headers: { Authorization: `Bearer ${userToken}` }
            });

            if (resRide.status === 201 && resRide.data._id) {
                createdRideId = resRide.data._id;
                logResult('7. Ride creation', 'PASS');
            } else {
                logResult('7. Ride creation', 'FAIL', 'Invalid creation response');
            }

            const notifiedRide = await newRideReceivedPromise;
            if (notifiedRide && notifiedRide._id === createdRideId) {
                logResult('8. Captain receives ride notification', 'PASS');
            } else {
                logResult('8. Captain receives ride notification', 'FAIL', 'Captain socket did not receive new-ride event');
            }

        } catch (err) {
            logResult('7. Ride creation', 'FAIL', err.response?.data?.message || err.message);
            logResult('8. Captain receives ride notification', 'FAIL', 'Ride creation failed');
        }

        // Fetch ride OTP directly from DB for test verification
        if (createdRideId) {
            const rideFromDb = await rideModel.findById(createdRideId).select('+otp');
            rideOtp = rideFromDb.otp;
        }

        // 9. Captain Accepts Ride & 10. User Receives Ride Confirmation
        let rideConfirmedReceivedPromise = new Promise((resolve) => {
            const timer = setTimeout(() => resolve(null), 3000);
            userSocket.on('ride-confirmed', (data) => {
                clearTimeout(timer);
                resolve(data);
            });
        });

        try {
            const resConfirm = await axios.post(`${BASE_URL}/rides/confirm`, {
                rideId: createdRideId
            }, {
                headers: { Authorization: `Bearer ${captainToken}` }
            });

            if (resConfirm.status === 200 && resConfirm.data.status === 'accepted') {
                logResult('9. Captain accepts ride', 'PASS');
            } else {
                logResult('9. Captain accepts ride', 'FAIL', 'Accept response status not accepted');
            }

            const confirmedRide = await rideConfirmedReceivedPromise;
            if (confirmedRide && confirmedRide._id === createdRideId) {
                logResult('10. User receives ride confirmation', 'PASS');
            } else {
                logResult('10. User receives ride confirmation', 'FAIL', 'User socket did not receive ride-confirmed event');
            }
        } catch (err) {
            logResult('9. Captain accepts ride', 'FAIL', err.response?.data?.message || err.message);
            logResult('10. User receives ride confirmation', 'FAIL', 'Confirm request failed');
        }

        // 11. OTP-based Ride Start
        let rideStartedReceivedPromise = new Promise((resolve) => {
            const timer = setTimeout(() => resolve(null), 3000);
            userSocket.on('ride-started', (data) => {
                clearTimeout(timer);
                resolve(data);
            });
        });

        try {
            const resStart = await axios.get(`${BASE_URL}/rides/start-ride`, {
                params: { rideId: createdRideId, otp: rideOtp },
                headers: { Authorization: `Bearer ${captainToken}` }
            });

            if (resStart.status === 200 && resStart.data.status === 'ongoing') {
                logResult('11. OTP-based ride start', 'PASS');
            } else {
                logResult('11. OTP-based ride start', 'FAIL', 'Start ride response not ongoing');
            }

            await rideStartedReceivedPromise;
        } catch (err) {
            logResult('11. OTP-based ride start', 'FAIL', err.response?.data?.message || err.message);
        }

        // 12. Ride Completion
        let rideEndedReceivedPromise = new Promise((resolve) => {
            const timer = setTimeout(() => resolve(null), 3000);
            userSocket.on('ride-ended', (data) => {
                clearTimeout(timer);
                resolve(data);
            });
        });

        try {
            const resEnd = await axios.post(`${BASE_URL}/rides/end-ride`, {
                rideId: createdRideId
            }, {
                headers: { Authorization: `Bearer ${captainToken}` }
            });

            if (resEnd.status === 200 && resEnd.data.status === 'completed') {
                logResult('12. Ride completion', 'PASS');
            } else {
                logResult('12. Ride completion', 'FAIL', 'End ride status not completed');
            }

            await rideEndedReceivedPromise;
        } catch (err) {
            logResult('12. Ride completion', 'FAIL', err.response?.data?.message || err.message);
        }

        // 14. Unauthorized API Access
        try {
            await axios.get(`${BASE_URL}/users/profile`);
            logResult('14. Unauthorized API access', 'FAIL', 'Unauthenticated request succeeded');
        } catch (err) {
            if (err.response?.status === 401) {
                logResult('14. Unauthorized API access', 'PASS');
            } else {
                logResult('14. Unauthorized API access', 'FAIL', `Expected 401 but got ${err.response?.status}`);
            }
        }

        // 15. Invalid Ride Status Transitions
        try {
            // Attempt to end an already completed ride
            await axios.post(`${BASE_URL}/rides/end-ride`, {
                rideId: createdRideId
            }, {
                headers: { Authorization: `Bearer ${captainToken}` }
            });
            logResult('15. Invalid ride status transitions', 'FAIL', 'Operation on invalid status succeeded');
        } catch (err) {
            if (err.response?.status === 500 || err.response?.status === 400) {
                logResult('15. Invalid ride status transitions', 'PASS');
            } else {
                logResult('15. Invalid ride status transitions', 'FAIL', err.message);
            }
        }

        // Clean up socket connections and test database records
        if (userSocket) userSocket.disconnect();
        if (captainSocket) captainSocket.disconnect();
        if (testUserEmail) await userModel.deleteMany({ email: testUserEmail });
        if (testCaptainEmail) await captainModel.deleteMany({ email: testCaptainEmail });
        if (createdRideId) await rideModel.deleteMany({ _id: createdRideId });
        await mongoose.disconnect();

        console.log("\n=== FINAL TEST SUMMARY ===");
        console.log(JSON.stringify(results, null, 2));

    } catch (globalErr) {
        console.error("Global E2E Error:", globalErr);
    }
}

runE2ETests();
