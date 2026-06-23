// const mongoose = require('mongoose');

// function connectToDb(){
//     mongoose.connect(process.env.DB_CONNECT, { useNewUrlParser: true,
//         console.log('Connected to DB');
//     }).catch(err => console.log(err));
// }

// module.exports = connectToDb;

const mongoose = require('mongoose');

async function connectToDb(params) {
    try {
        await mongoose.connect(process.env.DB_CONNECT);
        console.log("Connected to MongoDb");
    } catch (error) {
        console.log("MongoDb connection error", error);
    }
}

module.exports = connectToDb;