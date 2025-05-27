const express = require('express')
const authenticateToken = require('../middlewares/auth')
const { newPost, getAllPosts, getUserPostsOnly,addComment, getCommentsOfaPost, deletePost, addToBookMark, editPost, deleteComment, editComment, likePostdislikePost, getUserBookmarks, getPostById } = require('../controllers/postcontroller')
const upload = require('../middlewares/multer')
const route = express.Router()

route.post('/addpost', authenticateToken, upload.single('image'), newPost)
route.post('/editpost/:id', authenticateToken, editPost) ////////////
route.get('/all', authenticateToken, getAllPosts)
route.get('/all/post/user/:id', authenticateToken, getUserPostsOnly)
route.get('/postbyid/:id', authenticateToken, getPostById)
route.post('/likepostdislikepost/:id', authenticateToken, likePostdislikePost)
route.post('/addcomment/:id', authenticateToken, addComment)
route.delete('/deletecomment/:id', authenticateToken, deleteComment)
route.patch('/editcomment/:id', authenticateToken, editComment)
route.get('/getcommentsofapost/:id', authenticateToken, getCommentsOfaPost)
route.delete('/deletepost/:id', authenticateToken, deletePost)
route.post('/addoobookmark/:id', authenticateToken, addToBookMark)
route.get('/getuserbookmarks', authenticateToken, getUserBookmarks)

module.exports = route