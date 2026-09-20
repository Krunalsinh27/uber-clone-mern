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

// Mock Google Maps API responses to allow offline testing
const mapService = require('./services/maps.service');

mapService.getAddressCoordinate = async () => ({ ltd: 28.6139, lng: 77.2090 });
mapService.getDistanceTime = async () => ({
    distance: { text: '10 km', value: 10000 },
    duration: { text: '20 mins', value: 1200 },
    status: 'OK'
});

const results = {};

function logResult(testName, status, reason = '') {
    results[testName] = { status, reason };
    console.log(`[CANCELLATION TEST] ${testName}: ${status} ${reason ? '(' + reason + ')' : ''}`);
}

async function runCancellationSuite() {
    try {
        console.log("=== STARTING RIDE CANCELLATION TEST SUITE ===");

        await mongoose.connect(process.env.DB_CONNECT || 'mongodb://127.0.0.1:27017/uber-clone');

        const userA_Email = `usera_${Date.now()}@test.com`;
        const userB_Email = `userb_${Date.now()}@test.com`;
        const captainA_Email = `captaina_${Date.now()}@test.com`;

        let userA_Token, userA_Id, userA_Socket;
        let userB_Token, userB_Id;
        let captainA_Token, captainA_Id, captainA_Socket;

        // Register Users and Captain
        const resUA = await axios.post(`${BASE_URL}/users/register`, {
            fullname: { firstname: 'User', lastname: 'Alpha' },
            email: userA_Email,
            password: 'password123'
        });
        userA_Token = resUA.data.token;
        userA_Id = resUA.data.user._id;

        const resUB = await axios.post(`${BASE_URL}/users/register`, {
            fullname: { firstname: 'User', lastname: 'Beta' },
            email: userB_Email,
            password: 'password123'
        });
        userB_Token = resUB.data.token;
        userB_Id = resUB.data.user._id;

        const resCap = await axios.post(`${BASE_URL}/captains/register`, {
            fullname: { firstname: 'Captain', lastname: 'Alpha' },
            email: captainA_Email,
            password: 'password123',
            vehicle: { color: 'Red', plate: 'DL02XY9999', capacity: 4, vehicleType: 'car' }
        });
        captainA_Token = resCap.data.token;
        captainA_Id = resCap.data.captain._id;

        // Connect WebSockets
        userA_Socket = ioClient(BASE_URL, { auth: { token: userA_Token } });
        captainA_Socket = ioClient(BASE_URL, { auth: { token: captainA_Token } });

        await new Promise(resolve => {
            let connected = 0;
            userA_Socket.on('connect', () => {
                userA_Socket.emit('join', { userId: userA_Id, userType: 'user' });
                connected++;
                if (connected === 2) resolve();
            });
            captainA_Socket.on('connect', () => {
                captainA_Socket.emit('join', { userId: captainA_Id, userType: 'captain' });
                captainA_Socket.emit('update-location-captain', {
                    userId: captainA_Id,
                    location: { ltd: 28.6139, lng: 77.2090 }
                });
                connected++;
                if (connected === 2) resolve();
            });
        });

        await new Promise(r => setTimeout(r, 500));

        // 1. User cancels pending ride
        try {
            const resRide1 = await axios.post(`${BASE_URL}/rides/create`, {
                pickup: 'Delhi', destination: 'Noida', vehicleType: 'car'
            }, { headers: { Authorization: `Bearer ${userA_Token}` } });

            const ride1_Id = resRide1.data._id;

            const resCancel1 = await axios.post(`${BASE_URL}/rides/cancel-user`, {
                rideId: ride1_Id,
                reason: 'Changed my mind'
            }, { headers: { Authorization: `Bearer ${userA_Token}` } });

            if (resCancel1.status === 200 && 
                resCancel1.data.status === 'cancelled' && 
                resCancel1.data.cancelledBy === 'user' && 
                resCancel1.data.cancellationReason === 'Changed my mind') {
                logResult('1. User cancels pending ride', 'PASS');
            } else {
                logResult('1. User cancels pending ride', 'FAIL', 'Unexpected status or response');
            }
        } catch (err) {
            logResult('1. User cancels pending ride', 'FAIL', err.response?.data?.message || err.message);
        }

        // 2. User cancels accepted ride
        try {
            const resRide2 = await axios.post(`${BASE_URL}/rides/create`, {
                pickup: 'Delhi', destination: 'Noida', vehicleType: 'car'
            }, { headers: { Authorization: `Bearer ${userA_Token}` } });

            const ride2_Id = resRide2.data._id;

            // Captain accepts ride
            await axios.post(`${BASE_URL}/rides/confirm`, { rideId: ride2_Id }, {
                headers: { Authorization: `Bearer ${captainA_Token}` }
            });

            // Set up socket listener for captain
            let captainNotifiedPromise = new Promise(resolve => {
                const timer = setTimeout(() => resolve(null), 3000);
                captainA_Socket.on('ride-cancelled', (data) => {
                    clearTimeout(timer);
                    resolve(data);
                });
            });

            // User cancels accepted ride
            const resCancel2 = await axios.post(`${BASE_URL}/rides/cancel-user`, {
                rideId: ride2_Id,
                reason: 'Driver taking too long'
            }, { headers: { Authorization: `Bearer ${userA_Token}` } });

            const notifiedData = await captainNotifiedPromise;

            if (resCancel2.status === 200 && 
                resCancel2.data.status === 'cancelled' && 
                notifiedData && notifiedData._id === ride2_Id) {
                logResult('2. User cancels accepted ride', 'PASS');
            } else {
                logResult('2. User cancels accepted ride', 'FAIL', 'Socket notification or response invalid');
            }
        } catch (err) {
            logResult('2. User cancels accepted ride', 'FAIL', err.response?.data?.message || err.message);
        }

        // 3. Captain cancels accepted ride
        try {
            const resRide3 = await axios.post(`${BASE_URL}/rides/create`, {
                pickup: 'Delhi', destination: 'Gurugram', vehicleType: 'car'
            }, { headers: { Authorization: `Bearer ${userA_Token}` } });

            const ride3_Id = resRide3.data._id;

            // Captain accepts ride
            await axios.post(`${BASE_URL}/rides/confirm`, { rideId: ride3_Id }, {
                headers: { Authorization: `Bearer ${captainA_Token}` }
            });

            // Set up socket listener for user
            let userNotifiedPromise = new Promise(resolve => {
                const timer = setTimeout(() => resolve(null), 3000);
                userA_Socket.on('ride-cancelled', (data) => {
                    clearTimeout(timer);
                    resolve(data);
                });
            });

            // Captain cancels accepted ride
            const resCancel3 = await axios.post(`${BASE_URL}/rides/cancel-captain`, {
                rideId: ride3_Id,
                reason: 'User not responding'
            }, { headers: { Authorization: `Bearer ${captainA_Token}` } });

            const notifiedData = await userNotifiedPromise;

            if (resCancel3.status === 200 && 
                resCancel3.data.status === 'cancelled' && 
                resCancel3.data.cancelledBy === 'captain' && 
                notifiedData && notifiedData._id === ride3_Id) {
                logResult('3. Captain cancels accepted ride', 'PASS');
            } else {
                logResult('3. Captain cancels accepted ride', 'FAIL', 'Socket notification or response invalid');
            }
        } catch (err) {
            logResult('3. Captain cancels accepted ride', 'FAIL', err.response?.data?.message || err.message);
        }

        // 4. Completed ride cancellation is rejected
        try {
            const resRide4 = await axios.post(`${BASE_URL}/rides/create`, {
                pickup: 'Delhi', destination: 'Noida', vehicleType: 'car'
            }, { headers: { Authorization: `Bearer ${userA_Token}` } });

            const ride4_Id = resRide4.data._id;

            await axios.post(`${BASE_URL}/rides/confirm`, { rideId: ride4_Id }, {
                headers: { Authorization: `Bearer ${captainA_Token}` }
            });

            const ride4_Db = await rideModel.findById(ride4_Id).select('+otp');
            await axios.get(`${BASE_URL}/rides/start-ride`, {
                params: { rideId: ride4_Id, otp: ride4_Db.otp },
                headers: { Authorization: `Bearer ${captainA_Token}` }
            });

            await axios.post(`${BASE_URL}/rides/end-ride`, { rideId: ride4_Id }, {
                headers: { Authorization: `Bearer ${captainA_Token}` }
            });

            // Attempt user cancellation on completed ride
            await axios.post(`${BASE_URL}/rides/cancel-user`, {
                rideId: ride4_Id,
                reason: 'Cancel completed ride'
            }, { headers: { Authorization: `Bearer ${userA_Token}` } });

            logResult('4. Completed ride cancellation is rejected', 'FAIL', 'Completed ride cancellation succeeded');
        } catch (err) {
            if (err.response?.status === 400 && err.response?.data?.message?.includes('Cannot cancel ride with status')) {
                logResult('4. Completed ride cancellation is rejected', 'PASS');
            } else {
                logResult('4. Completed ride cancellation is rejected', 'FAIL', err.response?.data?.message || err.message);
            }
        }

        // 5. Unauthorized cancellation is rejected
        try {
            const resRide5 = await axios.post(`${BASE_URL}/rides/create`, {
                pickup: 'Delhi', destination: 'Noida', vehicleType: 'car'
            }, { headers: { Authorization: `Bearer ${userA_Token}` } });

            const ride5_Id = resRide5.data._id;

            // User B attempts to cancel User A's ride
            await axios.post(`${BASE_URL}/rides/cancel-user`, {
                rideId: ride5_Id,
                reason: 'Malicious cancel'
            }, { headers: { Authorization: `Bearer ${userB_Token}` } });

            logResult('5. Unauthorized cancellation is rejected', 'FAIL', 'Unauthorized user cancelled ride');
        } catch (err) {
            if (err.response?.status === 400 && err.response?.data?.message?.includes('unauthorized')) {
                logResult('5. Unauthorized cancellation is rejected', 'PASS');
            } else {
                logResult('5. Unauthorized cancellation is rejected', 'FAIL', err.response?.data?.message || err.message);
            }
        }

        // 6. Duplicate cancellation is rejected
        try {
            const resRide6 = await axios.post(`${BASE_URL}/rides/create`, {
                pickup: 'Delhi', destination: 'Noida', vehicleType: 'car'
            }, { headers: { Authorization: `Bearer ${userA_Token}` } });

            const ride6_Id = resRide6.data._id;

            // First cancellation
            await axios.post(`${BASE_URL}/rides/cancel-user`, {
                rideId: ride6_Id,
                reason: 'First cancel'
            }, { headers: { Authorization: `Bearer ${userA_Token}` } });

            // Second cancellation (Duplicate)
            await axios.post(`${BASE_URL}/rides/cancel-user`, {
                rideId: ride6_Id,
                reason: 'Second cancel'
            }, { headers: { Authorization: `Bearer ${userA_Token}` } });

            logResult('6. Duplicate cancellation is rejected', 'FAIL', 'Duplicate cancellation succeeded');
        } catch (err) {
            if (err.response?.status === 400 && err.response?.data?.message?.includes('Cannot cancel ride with status')) {
                logResult('6. Duplicate cancellation is rejected', 'PASS');
            } else {
                logResult('6. Duplicate cancellation is rejected', 'FAIL', err.response?.data?.message || err.message);
            }
        }

        // Clean up
        userA_Socket.disconnect();
        captainA_Socket.disconnect();
        await userModel.deleteMany({ email: { $in: [ userA_Email, userB_Email ] } });
        await captainModel.deleteMany({ email: captainA_Email });
        await rideModel.deleteMany({ user: { $in: [ userA_Id, userB_Id ] } });
        await mongoose.disconnect();

        console.log("\n=== CANCELLATION SUITE FINAL SUMMARY ===");
        console.log(JSON.stringify(results, null, 2));

    } catch (err) {
        console.error("Cancellation Suite Error:", err);
    }
}

runCancellationSuite();
