const express = require('express')
const authenticateToken = require('../middlewares/auth')
const { sendMessage, getMessage } = require('../controllers/messagecontroller')
const router = express.Router()

router.post('/send/:id', authenticateToken, sendMessage)
router.get('/getmessage/:id', authenticateToken, getMessage)

module.exports = router