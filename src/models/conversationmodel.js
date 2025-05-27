const mongoose = require('mongoose')
const messageModel = require('./message.model')

const conversationSchema = new mongoose.Schema({
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user'
    }],
    message: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'message'
    }]
})

module.exports = mongoose.model('conversation', conversationSchema)