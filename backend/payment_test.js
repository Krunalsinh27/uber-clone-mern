const axios = require('axios');
const mongoose = require('mongoose');
const http = require('http');
const crypto = require('crypto');
const dotenv = require('dotenv');
dotenv.config();

const app = require('./app');

const PORT = 4001;
const BASE_URL = `http://localhost:${PORT}`;
const MONGO_URI = process.env.DB_CONNECT || 'mongodb://127.0.0.1:27017/uber-clone';

async function runTests() {
    console.log('--- STARTING RAZORPAY PAYMENT GATEWAY INTEGRATION TESTS ---\n');

    let server;
    let userToken, otherUserToken, captainToken;
    let userId, otherUserId, captainId;
    let validRideId, cancelledRideId, otherUserRideId;
    let createdOrderId;

    try {
        // Start HTTP server on port 4001
        server = http.createServer(app);
        await new Promise((resolve) => server.listen(PORT, resolve));
        console.log(`✓ Express Test Server running on port ${PORT}`);

        // Connect to MongoDB
        await mongoose.connect(MONGO_URI);
        console.log('✓ Connected to MongoDB');

        const ts = Date.now();

        // 1. Register User 1
        const u1Res = await axios.post(`${BASE_URL}/users/register`, {
            fullname: { firstname: 'Payer', lastname: 'User' },
            email: `payer.user.${ts}@test.com`,
            password: 'Password123!'
        });
        userToken = u1Res.data.token;
        userId = u1Res.data.user._id;
        console.log('✓ Registered User 1:', userId);

        // 2. Register User 2 (Other User)
        const u2Res = await axios.post(`${BASE_URL}/users/register`, {
            fullname: { firstname: 'Other', lastname: 'User' },
            email: `other.payer.${ts}@test.com`,
            password: 'Password123!'
        });
        otherUserToken = u2Res.data.token;
        otherUserId = u2Res.data.user._id;
        console.log('✓ Registered User 2 (Other User):', otherUserId);

        // 3. Register Captain 1
        const c1Res = await axios.post(`${BASE_URL}/captains/register`, {
            fullname: { firstname: 'PayCaptain', lastname: 'Tester' },
            email: `pay.captain.${ts}@test.com`,
            password: 'Password123!',
            vehicle: { color: 'Black', plate: 'PAY-888', capacity: 4, vehicleType: 'car' }
        });
        captainToken = c1Res.data.token;
        captainId = c1Res.data.captain._id;
        console.log('✓ Registered Captain 1:', captainId);

        // Insert Rides in MongoDB
        const ridesCol = mongoose.connection.collection('rides');

        // Valid Completed Ride (User 1 & Captain 1, Fare = 350)
        const validRide = await ridesCol.insertOne({
            user: new mongoose.Types.ObjectId(userId),
            captain: new mongoose.Types.ObjectId(captainId),
            pickup: '100 Payment Way',
            destination: '200 Checkout Blvd',
            fare: 350,
            status: 'completed',
            paymentStatus: 'pending',
            otp: '654321',
            createdAt: new Date(),
            updatedAt: new Date()
        });
        validRideId = validRide.insertedId.toString();
        console.log('✓ Created Valid Completed Ride (Fare = ₹350):', validRideId);

        // Cancelled Ride
        const cancelledRide = await ridesCol.insertOne({
            user: new mongoose.Types.ObjectId(userId),
            captain: new mongoose.Types.ObjectId(captainId),
            pickup: '300 Cancelled St',
            destination: '400 Abort Ave',
            fare: 200,
            status: 'cancelled',
            paymentStatus: 'pending',
            createdAt: new Date(),
            updatedAt: new Date()
        });
        cancelledRideId = cancelledRide.insertedId.toString();
        console.log('✓ Created Cancelled Ride:', cancelledRideId);

        // Other User's Ride
        const otherUserRide = await ridesCol.insertOne({
            user: new mongoose.Types.ObjectId(otherUserId),
            captain: new mongoose.Types.ObjectId(captainId),
            pickup: '500 Private Rd',
            destination: '600 Secret St',
            fare: 500,
            status: 'completed',
            paymentStatus: 'pending',
            createdAt: new Date(),
            updatedAt: new Date()
        });
        otherUserRideId = otherUserRide.insertedId.toString();
        console.log('✓ Created Other User Ride:', otherUserRideId);

        console.log('\n--- EXECUTING PAYMENT GATEWAY TEST CASES ---\n');

        // Test 1: Valid payment order creation -> EXPECT PASS
        try {
            const res = await axios.post(
                `${BASE_URL}/payment/create-order`,
                { rideId: validRideId },
                { headers: { Authorization: `Bearer ${userToken}` } }
            );

            if (res.status === 200 && res.data.success && res.data.orderId && res.data.amount === 35000) {
                createdOrderId = res.data.orderId;
                console.log(`PASS [1/7]: Created payment order successfully (Order ID: ${createdOrderId}, Amount: ${res.data.amount} paisa)`);
            } else {
                console.error('FAIL [1/7]: Unexpected response:', res.data);
            }
        } catch (err) {
            console.error('FAIL [1/7]: Order creation failed:', err.response?.data || err.message);
        }

        // Test 2: Unauthorized payment request (User 2 requesting User 1's ride) -> EXPECT FAIL (400)
        try {
            await axios.post(
                `${BASE_URL}/payment/create-order`,
                { rideId: validRideId },
                { headers: { Authorization: `Bearer ${otherUserToken}` } }
            );
            console.error('FAIL [2/7]: Unauthorized order creation should have failed!');
        } catch (err) {
            if (err.response?.status === 400 && err.response?.data?.message?.includes('unauthorized')) {
                console.log('PASS [2/7]: Prevented unauthorized payment order request');
            } else {
                console.error('FAIL [2/7]: Unexpected error response:', err.response?.data || err.message);
            }
        }

        // Test 3: Invalid ride ID -> EXPECT FAIL (400)
        try {
            await axios.post(
                `${BASE_URL}/payment/create-order`,
                { rideId: '507f1f77bcf86cd799439011' },
                { headers: { Authorization: `Bearer ${userToken}` } }
            );
            console.error('FAIL [3/7]: Order creation for non-existent ride should have failed!');
        } catch (err) {
            if (err.response?.status === 400) {
                console.log('PASS [3/7]: Rejected invalid/non-existent ride ID');
            } else {
                console.error('FAIL [3/7]: Unexpected error response:', err.response?.data || err.message);
            }
        }

        // Test 4: Invalid signature verification -> EXPECT FAIL (400)
        try {
            await axios.post(
                `${BASE_URL}/payment/verify-payment`,
                {
                    rideId: validRideId,
                    razorpay_order_id: createdOrderId,
                    razorpay_payment_id: 'pay_test_12345',
                    razorpay_signature: 'invalid_forged_signature_string'
                },
                { headers: { Authorization: `Bearer ${userToken}` } }
            );
            console.error('FAIL [4/7]: Forged payment signature should have failed!');
        } catch (err) {
            if (err.response?.status === 400 && err.response?.data?.message?.includes('signature')) {
                console.log('PASS [4/7]: Prevented invalid payment signature verification');
            } else {
                console.error('FAIL [4/7]: Unexpected error response:', err.response?.data || err.message);
            }
        }

        // Test 5: Successful signature verification & paymentStatus update to 'paid' -> EXPECT PASS
        const paymentId = `pay_test_${Date.now()}`;
        const secret = process.env.RAZORPAY_KEY_SECRET || 'test_secret';
        const validSignature = crypto
            .createHmac('sha256', secret)
            .update(`${createdOrderId}|${paymentId}`)
            .digest('hex');

        try {
            const res = await axios.post(
                `${BASE_URL}/payment/verify-payment`,
                {
                    rideId: validRideId,
                    razorpay_order_id: createdOrderId,
                    razorpay_payment_id: paymentId,
                    razorpay_signature: validSignature
                },
                { headers: { Authorization: `Bearer ${userToken}` } }
            );

            if (res.status === 200 && res.data.success && res.data.ride.paymentStatus === 'paid') {
                console.log('PASS [5/7]: Verified payment signature & updated ride paymentStatus to "paid"');
            } else {
                console.error('FAIL [5/7]: Verification response mismatch:', res.data);
            }
        } catch (err) {
            console.error('FAIL [5/7]: Payment verification error:', err.response?.data || err.message);
        }

        // Test 6: Duplicate payment verification on already paid ride -> EXPECT FAIL (400)
        try {
            await axios.post(
                `${BASE_URL}/payment/verify-payment`,
                {
                    rideId: validRideId,
                    razorpay_order_id: createdOrderId,
                    razorpay_payment_id: paymentId,
                    razorpay_signature: validSignature
                },
                { headers: { Authorization: `Bearer ${userToken}` } }
            );
            console.error('FAIL [6/7]: Duplicate payment verification should have failed!');
        } catch (err) {
            if (err.response?.status === 400 && err.response?.data?.message?.includes('already completed')) {
                console.log('PASS [6/7]: Prevented duplicate payment processing');
            } else {
                console.error('FAIL [6/7]: Unexpected error response:', err.response?.data || err.message);
            }
        }

        // Test 7: Payment failure handler updating status to 'failed' -> EXPECT PASS
        try {
            const failRes = await axios.post(
                `${BASE_URL}/payment/payment-failed`,
                {
                    rideId: otherUserRideId,
                    reason: 'Card declined during checkout'
                },
                { headers: { Authorization: `Bearer ${otherUserToken}` } }
            );

            if (failRes.status === 200 && failRes.data.ride.paymentStatus === 'failed') {
                console.log('PASS [7/7]: Correctly updated paymentStatus to "failed" on payment failure');
            } else {
                console.error('FAIL [7/7]: Payment failure response mismatch:', failRes.data);
            }
        } catch (err) {
            console.error('FAIL [7/7]: Payment failure handler error:', err.response?.data || err.message);
        }

    } catch (err) {
        console.error('Fatal test execution error:', err);
    } finally {
        if (server) server.close();
        await mongoose.disconnect();
        console.log('\n--- RAZORPAY PAYMENT TEST SUITE COMPLETE ---');
    }
}

runTests();
