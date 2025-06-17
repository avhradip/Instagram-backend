require('dotenv').config()
const express = require('express')
const cors = require('cors')
const connectDB = require('./src/config/DB')
const authRouter = require('./src/routes/userroute')
const postRouter = require('./src/routes/postroute')
const messageRouter = require('./src/models/messagemodel')

const app = express()
const PORT = process.env.PORT || 3000
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
connectDB()

app.use('/api/v1/user', authRouter)
app.use('/api/v1/post', postRouter)
app.use('/api/v1/message', messageRouter)

app.get('/', (req, res) => {
    res.json({ message: "surver is runing..." })
})

app.listen(PORT, () => {
    console.log(`surver is runing at ${PORT}`);

})