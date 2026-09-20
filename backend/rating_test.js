const axios = require('axios');
const mongoose = require('mongoose');
const http = require('http');
const dotenv = require('dotenv');
dotenv.config();

const app = require('./app');

const PORT = 4000;
const BASE_URL = `http://localhost:${PORT}`;
const MONGO_URI = process.env.DB_CONNECT || 'mongodb://127.0.0.1:27017/uber-clone';

async function runTests() {
    console.log('--- STARTING RATING & REVIEWS SYSTEM INTEGRATION TESTS ---\n');

    let server;
    let userToken, captainToken, otherUserToken, otherCaptainToken;
    let userId, captainId, otherUserId, otherCaptainId;
    let completedRideId, cancelledRideId, ongoingRideId, otherUserRideId;

    try {
        // Start HTTP Server
        server = http.createServer(app);
        await new Promise((resolve) => server.listen(PORT, resolve));
        console.log(`✓ Express Test Server running on port ${PORT}`);

        // Connect to Mongo to prepare test data directly in database
        await mongoose.connect(MONGO_URI);
        console.log('✓ Connected to MongoDB');


        // Helper for unique email creation
        const ts = Date.now();

        // 1. Register User 1
        const u1Res = await axios.post(`${BASE_URL}/users/register`, {
            fullname: { firstname: 'User', lastname: 'Tester' },
            email: `user.rating.${ts}@test.com`,
            password: 'Password123!'
        });
        userToken = u1Res.data.token;
        userId = u1Res.data.user._id;
        console.log('✓ Registered User 1:', userId);

        // 2. Register User 2 (Other User)
        const u2Res = await axios.post(`${BASE_URL}/users/register`, {
            fullname: { firstname: 'Other', lastname: 'User' },
            email: `other.user.rating.${ts}@test.com`,
            password: 'Password123!'
        });
        otherUserToken = u2Res.data.token;
        otherUserId = u2Res.data.user._id;
        console.log('✓ Registered User 2 (Other User):', otherUserId);

        // 3. Register Captain 1
        const c1Res = await axios.post(`${BASE_URL}/captains/register`, {
            fullname: { firstname: 'Captain', lastname: 'Tester' },
            email: `captain.rating.${ts}@test.com`,
            password: 'Password123!',
            vehicle: { color: 'Blue', plate: 'RAT-100', capacity: 4, vehicleType: 'car' }
        });
        captainToken = c1Res.data.token;
        captainId = c1Res.data.captain._id;
        console.log('✓ Registered Captain 1:', captainId);

        // 4. Register Captain 2 (Other Captain)
        const c2Res = await axios.post(`${BASE_URL}/captains/register`, {
            fullname: { firstname: 'Other', lastname: 'Captain' },
            email: `other.captain.rating.${ts}@test.com`,
            password: 'Password123!',
            vehicle: { color: 'Red', plate: 'RAT-200', capacity: 4, vehicleType: 'car' }
        });
        otherCaptainToken = c2Res.data.token;
        otherCaptainId = c2Res.data.captain._id;
        console.log('✓ Registered Captain 2 (Other Captain):', otherCaptainId);

        // Access raw MongoDB collection for setup
        const ridesCol = mongoose.connection.collection('rides');

        // Insert Completed Ride (User 1 & Captain 1)
        const completedRide = await ridesCol.insertOne({
            user: new mongoose.Types.ObjectId(userId),
            captain: new mongoose.Types.ObjectId(captainId),
            pickup: '123 Main St',
            destination: '456 Market St',
            fare: 250,
            status: 'completed',
            otp: '1234',
            createdAt: new Date(),
            updatedAt: new Date()
        });
        completedRideId = completedRide.insertedId.toString();
        console.log('✓ Created Completed Ride:', completedRideId);

        // Insert Cancelled Ride (User 1 & Captain 1)
        const cancelledRide = await ridesCol.insertOne({
            user: new mongoose.Types.ObjectId(userId),
            captain: new mongoose.Types.ObjectId(captainId),
            pickup: '789 Elm St',
            destination: '012 Oak St',
            fare: 180,
            status: 'cancelled',
            cancelledBy: 'user',
            cancellationReason: 'Driver took too long',
            createdAt: new Date(),
            updatedAt: new Date()
        });
        cancelledRideId = cancelledRide.insertedId.toString();
        console.log('✓ Created Cancelled Ride:', cancelledRideId);

        // Insert Ongoing Ride (User 1 & Captain 1)
        const ongoingRide = await ridesCol.insertOne({
            user: new mongoose.Types.ObjectId(userId),
            captain: new mongoose.Types.ObjectId(captainId),
            pickup: 'Pine St',
            destination: 'Maple St',
            fare: 150,
            status: 'ongoing',
            createdAt: new Date(),
            updatedAt: new Date()
        });
        ongoingRideId = ongoingRide.insertedId.toString();
        console.log('✓ Created Ongoing Ride:', ongoingRideId);

        // Insert Completed Ride for Other User (User 2 & Captain 2)
        const otherUserRide = await ridesCol.insertOne({
            user: new mongoose.Types.ObjectId(otherUserId),
            captain: new mongoose.Types.ObjectId(otherCaptainId),
            pickup: 'Broadway',
            destination: '5th Ave',
            fare: 300,
            status: 'completed',
            createdAt: new Date(),
            updatedAt: new Date()
        });
        otherUserRideId = otherUserRide.insertedId.toString();
        console.log('✓ Created Completed Ride for Other User:', otherUserRideId);

        console.log('\n--- EXECUTING RATING TEST CASES ---\n');

        // Test 1: User rates completed ride -> EXPECT PASS
        try {
            const res = await axios.post(
                `${BASE_URL}/ratings/user-rate-captain`,
                { rideId: completedRideId, rating: 5, review: 'Excellent driving!' },
                { headers: { Authorization: `Bearer ${userToken}` } }
            );
            if (res.status === 201 && res.data.rating.rating === 5) {
                console.log('PASS [1/7]: User rated completed ride successfully');
            } else {
                console.error('FAIL [1/7]: Unexpected response:', res.data);
            }
        } catch (err) {
            console.error('FAIL [1/7]: User rate completed ride error:', err.response?.data || err.message);
        }

        // Test 2: User rates cancelled ride -> EXPECT FAIL (400)
        try {
            await axios.post(
                `${BASE_URL}/ratings/user-rate-captain`,
                { rideId: cancelledRideId, rating: 4, review: 'Tripped cancelled' },
                { headers: { Authorization: `Bearer ${userToken}` } }
            );
            console.error('FAIL [2/7]: User rating cancelled ride should have failed!');
        } catch (err) {
            if (err.response?.status === 400 && err.response?.data?.message?.includes('completed')) {
                console.log('PASS [2/7]: Prevented user rating cancelled ride (400 Bad Request)');
            } else {
                console.error('FAIL [2/7]: Unexpected error response:', err.response?.data || err.message);
            }
        }

        // Test 3: User rates another user's ride -> EXPECT FAIL (400/403)
        try {
            await axios.post(
                `${BASE_URL}/ratings/user-rate-captain`,
                { rideId: otherUserRideId, rating: 5, review: 'Not my ride' },
                { headers: { Authorization: `Bearer ${userToken}` } }
            );
            console.error('FAIL [3/7]: User rating unauthorized ride should have failed!');
        } catch (err) {
            if (err.response?.status === 400 && err.response?.data?.message?.includes('not found')) {
                console.log('PASS [3/7]: Prevented user rating unauthorized ride (Ride not found or unauthorized)');
            } else {
                console.error('FAIL [3/7]: Unexpected error response:', err.response?.data || err.message);
            }
        }

        // Test 4: User rates the same ride twice -> EXPECT FAIL (400)
        try {
            await axios.post(
                `${BASE_URL}/ratings/user-rate-captain`,
                { rideId: completedRideId, rating: 4, review: 'Second rating attempt' },
                { headers: { Authorization: `Bearer ${userToken}` } }
            );
            console.error('FAIL [4/7]: Duplicate user rating should have failed!');
        } catch (err) {
            if (err.response?.status === 400 && err.response?.data?.message?.includes('already rated')) {
                console.log('PASS [4/7]: Prevented duplicate rating submission (You have already rated this ride)');
            } else {
                console.error('FAIL [4/7]: Unexpected error response:', err.response?.data || err.message);
            }
        }

        // Test 5: Captain rates user for completed ride -> EXPECT PASS
        try {
            const res = await axios.post(
                `${BASE_URL}/ratings/captain-rate-user`,
                { rideId: completedRideId, rating: 5, review: 'Polite passenger!' },
                { headers: { Authorization: `Bearer ${captainToken}` } }
            );
            if (res.status === 201 && res.data.rating.rating === 5) {
                console.log('PASS [5/7]: Captain rated passenger successfully');
            } else {
                console.error('FAIL [5/7]: Unexpected response:', res.data);
            }
        } catch (err) {
            console.error('FAIL [5/7]: Captain rate user error:', err.response?.data || err.message);
        }

        // Test 6: Captain rates unassigned ride -> EXPECT FAIL (400)
        try {
            await axios.post(
                `${BASE_URL}/ratings/captain-rate-user`,
                { rideId: otherUserRideId, rating: 5, review: 'Unassigned ride' },
                { headers: { Authorization: `Bearer ${captainToken}` } }
            );
            console.error('FAIL [6/7]: Captain rating unassigned ride should have failed!');
        } catch (err) {
            if (err.response?.status === 400 && err.response?.data?.message?.includes('not found')) {
                console.log('PASS [6/7]: Prevented captain rating unassigned ride');
            } else {
                console.error('FAIL [6/7]: Unexpected error response:', err.response?.data || err.message);
            }
        }

        // Test 7: GET average ratings for Captain and User -> EXPECT PASS
        try {
            const captainRatingRes = await axios.get(`${BASE_URL}/ratings/captain/${captainId}`);
            const userRatingRes = await axios.get(`${BASE_URL}/ratings/user/${userId}`);

            const cRating = captainRatingRes.data;
            const uRating = userRatingRes.data;

            if (cRating.success && cRating.averageRating === 5 && cRating.totalReviews === 1 &&
                uRating.success && uRating.averageRating === 5 && uRating.totalReviews === 1) {
                console.log(`PASS [7/7]: Correctly retrieved average ratings (Captain: ${cRating.averageRating}★ [${cRating.totalReviews} review], User: ${uRating.averageRating}★ [${uRating.totalReviews} review])`);
            } else {
                console.error('FAIL [7/7]: Rating stats mismatch:', { cRating, uRating });
            }
        } catch (err) {
            console.error('FAIL [7/7]: Error fetching average ratings:', err.response?.data || err.message);
        }

    } catch (err) {
        console.error('Fatal test error:', err);
    } finally {
        if (server) server.close();
        await mongoose.disconnect();
        console.log('\n--- RATING TEST SUITE COMPLETE ---');
    }
}

runTests();

