const path = require('path');
const dotenv = require('./node_modules/dotenv');
dotenv.config();

const mongoose = require('./node_modules/mongoose');
const axios = require('./node_modules/axios');

const BASE_URL = process.env.VITE_BASE_URL || 'http://localhost:4000';
const userModel = require('./models/user.model');
const captainModel = require('./models/captain.model');
const rideModel = require('./models/ride.model');

// Mock Google Maps API
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
    console.log(`[HISTORY TEST] ${testName}: ${status} ${reason ? '(' + reason + ')' : ''}`);
}

async function runHistorySuite() {
    try {
        console.log("=== STARTING RIDE HISTORY TEST SUITE ===");

        await mongoose.connect(process.env.DB_CONNECT || 'mongodb://127.0.0.1:27017/uber-clone');

        const user1_Email = `hist_user1_${Date.now()}@test.com`;
        const user2_Email = `hist_user2_${Date.now()}@test.com`;
        const captain1_Email = `hist_captain1_${Date.now()}@test.com`;

        // Register Test Users & Captain
        const resU1 = await axios.post(`${BASE_URL}/users/register`, {
            fullname: { firstname: 'User', lastname: 'One' },
            email: user1_Email,
            password: 'password123'
        });
        const user1Token = resU1.data.token;
        const user1Id = resU1.data.user._id;

        const resU2 = await axios.post(`${BASE_URL}/users/register`, {
            fullname: { firstname: 'User', lastname: 'Two' },
            email: user2_Email,
            password: 'password123'
        });
        const user2Token = resU2.data.token;

        const resCap1 = await axios.post(`${BASE_URL}/captains/register`, {
            fullname: { firstname: 'Captain', lastname: 'One' },
            email: captain1_Email,
            password: 'password123',
            vehicle: { color: 'Blue', plate: 'DL05HH1111', capacity: 4, vehicleType: 'car' }
        });
        const captain1Token = resCap1.data.token;
        const captain1Id = resCap1.data.captain._id;

        // Seed rides for User 1 & Captain 1
        // Ride 1: Completed (Fare ₹300)
        const ride1 = await rideModel.create({
            user: user1Id,
            captain: captain1Id,
            pickup: 'Connaught Place',
            destination: 'Airport T3',
            fare: 300,
            status: 'completed',
            otp: '111111'
        });

        // Ride 2: Cancelled (Fare ₹200)
        const ride2 = await rideModel.create({
            user: user1Id,
            captain: captain1Id,
            pickup: 'Hauz Khas',
            destination: 'Saket',
            fare: 200,
            status: 'cancelled',
            cancellationReason: 'Driver delayed',
            cancelledBy: 'user',
            cancelledAt: new Date(),
            otp: '222222'
        });

        // Ride 3: Completed (Fare ₹450)
        const ride3 = await rideModel.create({
            user: user1Id,
            captain: captain1Id,
            pickup: 'Gurugram Cyber Hub',
            destination: 'Noida Sector 62',
            fare: 450,
            status: 'completed',
            otp: '333333'
        });

        // 1. User Ride History API & Sorting
        try {
            const resHist = await axios.get(`${BASE_URL}/rides/user-history`, {
                headers: { Authorization: `Bearer ${user1Token}` }
            });

            if (resHist.status === 200 && 
                resHist.data.success && 
                Array.isArray(resHist.data.rides) && 
                resHist.data.totalRides === 3) {
                logResult('1. User ride history retrieval', 'PASS');
            } else {
                logResult('1. User ride history retrieval', 'FAIL', 'Unexpected response payload');
            }
        } catch (err) {
            logResult('1. User ride history retrieval', 'FAIL', err.response?.data?.message || err.message);
        }

        // 2. Status Filtering
        try {
            const resFilter = await axios.get(`${BASE_URL}/rides/user-history?status=completed`, {
                headers: { Authorization: `Bearer ${user1Token}` }
            });

            if (resFilter.status === 200 && 
                resFilter.data.rides.length === 2 && 
                resFilter.data.rides.every(r => r.status === 'completed')) {
                logResult('2. Status filtering', 'PASS');
            } else {
                logResult('2. Status filtering', 'FAIL', `Expected 2 completed rides, got ${resFilter.data?.rides?.length}`);
            }
        } catch (err) {
            logResult('2. Status filtering', 'FAIL', err.response?.data?.message || err.message);
        }

        // 3. Pagination
        try {
            const resPage = await axios.get(`${BASE_URL}/rides/user-history?page=1&limit=2`, {
                headers: { Authorization: `Bearer ${user1Token}` }
            });

            if (resPage.status === 200 && 
                resPage.data.rides.length === 2 && 
                resPage.data.totalPages === 2 && 
                resPage.data.totalRides === 3) {
                logResult('3. Pagination', 'PASS');
            } else {
                logResult('3. Pagination', 'FAIL', 'Pagination metadata incorrect');
            }
        } catch (err) {
            logResult('3. Pagination', 'FAIL', err.response?.data?.message || err.message);
        }

        // 4. Captain Ride History & Earnings Summary
        try {
            const resCapHist = await axios.get(`${BASE_URL}/rides/captain-history`, {
                headers: { Authorization: `Bearer ${captain1Token}` }
            });

            const summary = resCapHist.data.summary;
            if (resCapHist.status === 200 && 
                summary && 
                summary.totalEarnings === 750 && 
                summary.completedTrips === 2 && 
                summary.cancelledTrips === 1) {
                logResult('4. Captain history & earnings summary', 'PASS');
            } else {
                logResult('4. Captain history & earnings summary', 'FAIL', `Earnings sum mismatch: expected 750, got ${summary?.totalEarnings}`);
            }
        } catch (err) {
            logResult('4. Captain history & earnings summary', 'FAIL', err.response?.data?.message || err.message);
        }

        // 5. Unauthorized User Isolation
        try {
            const resU2Hist = await axios.get(`${BASE_URL}/rides/user-history`, {
                headers: { Authorization: `Bearer ${user2Token}` }
            });

            if (resU2Hist.status === 200 && resU2Hist.data.totalRides === 0) {
                logResult('5. Unauthorized data isolation', 'PASS');
            } else {
                logResult('5. Unauthorized data isolation', 'FAIL', 'User 2 accessed User 1 rides!');
            }
        } catch (err) {
            logResult('5. Unauthorized data isolation', 'FAIL', err.response?.data?.message || err.message);
        }

        // Clean up
        await userModel.deleteMany({ email: { $in: [ user1_Email, user2_Email ] } });
        await captainModel.deleteMany({ email: captain1_Email });
        await rideModel.deleteMany({ user: user1Id });
        await mongoose.disconnect();

        console.log("\n=== RIDE HISTORY SUITE FINAL SUMMARY ===");
        console.log(JSON.stringify(results, null, 2));

    } catch (err) {
        console.error("History Suite Error:", err);
    }
}

runHistorySuite();
