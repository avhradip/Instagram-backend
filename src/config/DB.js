const mongoose = require('mongoose')

const connectDB = async () => {
    try {
        await mongoose.connect(`${process.env.MONGO_URI}/instagram`)
        console.log('connected DB');
    } catch (error) {
        console.log('failed to connectDB', error);
    }
}

module.exports=connectDB