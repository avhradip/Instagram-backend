const conversationSchema = require("../models/conversationmodel")
const messageSchema = require("../models/messagemodel")

// for chating
exports.sendMessage = async (req, res) => {
    try {
        const senderId = req.user.id
        const receiverId = req.params.id
        const { message } = req.body
        let conversation = await conversationSchema.findOne({
            participants: { $all: [senderId, receiverId] }
        })

        //start conversation if it's not started

        if (!conversation) {
            conversation = await conversationSchema.create({
                participants: [senderId, receiverId]
            })
        }

        const nweMessage = await messageSchema.create({
            senderId,
            receiverId,
            message
        })

        if (nweMessage) {
            conversation.message.push(nweMessage._id)
        }

        await Promise.all([conversation.save(), nweMessage.save()])

        //implement socket io for realtime data transfer
        return res.status(200).json({
            sucess: true,
            message: nweMessage
        })
    } catch (error) {
        return res.status(500).json({ message: "Server error", error: error.message });
    }
}

exports.getMessage = async (req, res) => {
    try {
        const senderId = req.user.id
        const receiverId = req.params.id

        const conversation = await conversationSchema.find({
            participants: [{ $all: { senderId, receiverId } }]
        })

        if (!conversation) return res.status(404).json({ sucess: false, message: [] })

        return res.status(200).json({ sucess: true, message: conversation?.message })

    } catch (error) {
        return res.status(500).json({ message: "Server error", error: error.message });
    }
}