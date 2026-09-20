const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const userModel = require('./models/user.model');
const captainModel = require('./models/captain.model');

let io;

function initializeSocket(server) {
    io = socketIo(server, {
        cors: {
            origin: '*',
            methods: [ 'GET', 'POST' ]
        }
    });

    io.use(async (socket, next) => {
        const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
        if (!token) {
            // Allow unauthenticated connection fallback if token not yet provided, but mark as unauthenticated
            return next();
        }
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            let user = await userModel.findById(decoded._id);
            if (user) {
                socket.user = user;
                socket.userType = 'user';
                return next();
            }
            let captain = await captainModel.findById(decoded._id);
            if (captain) {
                socket.captain = captain;
                socket.userType = 'captain';
                return next();
            }
            return next();
        } catch (err) {
            return next();
        }
    });

    io.on('connection', (socket) => {
        console.log(`Client connected: ${socket.id}`);


        socket.on('join', async (data) => {
            const { userId, userType } = data;
            const targetId = socket.user?._id || socket.captain?._id || userId;
            const targetType = socket.userType || userType;

            if (targetType === 'user' && targetId) {
                await userModel.findByIdAndUpdate(targetId, { socketId: socket.id });
            } else if (targetType === 'captain' && targetId) {
                await captainModel.findByIdAndUpdate(targetId, { socketId: socket.id });
            }
        });


        socket.on('update-location-captain', async (data) => {
            const { userId, location } = data;
            const captainId = socket.captain?._id || userId;

            if (!location || location.ltd === undefined || location.lng === undefined) {
                return socket.emit('error', { message: 'Invalid location data' });
            }

            if (captainId) {
                await captainModel.findByIdAndUpdate(captainId, {
                    location: {
                        type: 'Point',
                        coordinates: [ location.lng, location.ltd ]
                    }
                });
            }
        });

        socket.on('disconnect', () => {
            console.log(`Client disconnected: ${socket.id}`);
        });
    });
}

const sendMessageToSocketId = (socketId, messageObject) => {

console.log(messageObject);

    if (io) {
        io.to(socketId).emit(messageObject.event, messageObject.data);
    } else {
        console.log('Socket.io not initialized.');
    }
}

module.exports = { initializeSocket, sendMessageToSocketId };