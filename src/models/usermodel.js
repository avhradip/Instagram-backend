const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
    userName: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true,
    },
    profilePicture: {
        type: String,
        default: ''
    },
    bio: {
        type: String,
        default: ''
    },
    gender: {
        type: String, enum: ['male', 'female']
    },
    followers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "user"
    }],
    following: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "user"
    }],
    bookmarks: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "post"
    }],
    posts: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "post"
    }],
    date: {
        type: String,
        default: Date.now()
    }
})

module.exports = mongoose.model("user", userSchema)