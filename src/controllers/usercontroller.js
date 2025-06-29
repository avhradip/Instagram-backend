const bcrypt = require('bcrypt')
const userModel = require("../models/usermodel")
const jwt = require('jsonwebtoken');
const getDataUri = require('../config/datauri')
const cloudinary = require('../config/cloudinary');
const { Promise } = require('mongoose');
const postSchema = require('../models/postmodel');
const { post } = require('../routes/postroute');
const nodemailer = require("nodemailer");
const JWT_SECRET = process.env.JWT_SECRET

exports.register = async (req, res) => {
    try {
        const { userName, email, password } = req.body

        if (!userName || !email || !password) {
            return res.status(400).json({ message: "Somthing is missing plese check.", sucess: false })
        }

        const exist = await userModel.findOne({ email: email })

        if (exist) {
            return res.status(400).json({ message: "User already exists!", sucess: false });
        }

        const hashPassword = await bcrypt.hash(password, 10)

        const newUser = new userModel({
            userName, email, password: hashPassword
        })

        await newUser.save()

        return res.status(200).json({ user: newUser, message: "Acount created sucessfully.", sucess: true })

    } catch (error) {
        return res.status(500).json({ message: "surver error", error: error })
    }
}

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email or password is missing.", success: false });
        }

        const user = await userModel.findOne({ email });

        if (!user) {
            return res.status(400).json({ message: "User does not exist.", success: false });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({ message: "Incorrect email or password.", success: false });
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });

        const populatedPosts = [];

        for (const postId of user.posts) {
            const post = await postSchema.findById(postId);
            if (post && post.userId && post.userId.equals(user._id)) {
                populatedPosts.push(post);
            }
        }

        const User = {
            _id: user._id,
            userName: user.userName,
            email: user.email,
            profilePicture: user.profilePicture,
            bio: user.bio,
            followers: user.followers,
            following: user.following,
            posts: populatedPosts
        };

        return res.status(200).json({
            user: User,
            message: "Login successful.",
            success: true,
            token
        });

    } catch (error) {
        console.error("Login error stack:", error.stack);
        return res.status(500).json({
            message: "Server error",
            success: false,
            error: error.message
        });
    }
};


exports.forgotPassword = async (req,res) => {
    try {
        const { email } = req.body
        
        if (!email) return res.status(500).json({ message: "email not found" })
        
        const user = userModel.findOne({ email })
        
        if (!user) return res.status(500).json({ message: "wrong email" })
        
        const token = jwt.sign({ id: user?._id }, process.env.JWT_SECRET, { expiresIn: "15m" })
        
        const resetUrl = `https://idyllic-torte-b75560.netlify.app/reset-password/${token}`

        var transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'abirghosh102@gmail.com',
                pass: 'qbii tjjm ktdr paxm'
            }
        });

        var mailOptions = {
            from: 'abirghosh102@gmail.com',
            to: email,
            subject: 'Password reset',
            text: resetUrl
        };

        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                console.log(error);
            } else {
                console.log('Email sent: ' + info.response);
            }
        });
        res.status(200).json({ message: "Reset link sent to your email", success: true });
    } catch (error) {
        return res.status(500).json({ message: "surver error", error: error.message })
    }
}

exports.resetPassword = async (req, res) => {
    try {
        const userId = req.user.id
        const { newPassword, conformPassword } = req.body;

        if (!newPassword || !conformPassword) {
            return res.status(400).json({ message: "newPassword and conformPassword not found..!" })
        }

        if (newPassword !== conformPassword) {
            return res.status(400).json({ message: "Passwords do not match" });
        }

        const hashPassword = await bcrypt.hash(newPassword, 10)

        await userModel.findByIdAndUpdate(userId, { password: hashPassword })

        res.status(200).json({ message: "Password reset successful" });
    } catch (error) {
        console.error("Reset Password Error:", error);
        res.status(500).json({ message: "Invalid or expired token" });
    }
};

exports.getUserProfile = async (req, res) => {
    try {
        const userId = req.user.id
        const user = await userModel.findOne({ _id: userId }).select('-password')

        if (!user) {
            return res.status(400).json({ message: "User not exists!", sucess: false });
        }

        return res.status(200).json({
            user: user,
            sucess: true,
        })

    } catch (error) {
        return res.status(500).json({ message: "surver error", error: error })
    }
}

exports.getProfile = async (req, res) => {
    try {
        const { id } = req.params
        const user = await userModel.findOne({ _id: id }).select('-password').populate({ path: "posts", select: "image", options: { sort: { createdAt: -1 }, limit: 3 } })

        if (!user) {
            return res.status(400).json({ message: "User not exists!", sucess: false });
        }

        return res.status(200).json({
            user: user,
            sucess: true,
        })

    } catch (error) {
        return res.status(500).json({ message: "surver error", error: error })
    }
}

exports.editProfile = async (req, res) => {
    try {
        const userName = req.body?.userName;
        const name = req.body?.name;
        const bio = req.body?.bio;
        const gender = req.body?.gender;
        const id = req.user.id;
        const profilePicture = req.file;

        let cloudresponse;

        // Check if user exists
        const user = await userModel.findById(id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Upload profile picture if provided
        if (profilePicture) {
            const filePath = getDataUri(profilePicture);
            cloudresponse = await cloudinary.uploader.upload(filePath);
        }

        const updateFields = {};
        if (bio) updateFields.bio = bio;
        if (name) updateFields.name = name;
        if (userName) updateFields.userName = userName;
        if (gender) updateFields.gender = gender;
        if (cloudresponse) updateFields.profilePicture = cloudresponse.secure_url;

        // Update user
        const updatedProfile = await userModel.findByIdAndUpdate(id, updateFields, {
            new: true
        }).select('-password');

        if (!updatedProfile) {
            return res.status(500).json({ message: "Failed to update user" });
        }

        res.status(200).json({
            message: "User updated successfully",
            user: updatedProfile
        });

    } catch (error) {
        console.error("editProfile error:", error);
        return res.status(500).json({ message: "Server error", error: error.message });
    }
}

exports.getSuggestedUsers = async (req, res) => {
    try {
        const SuggestedUsers = await userModel.find({ _id: { $ne: req.user.id } }).select("-password").populate({ path: "posts", select: "image", options: { sort: { createdAt: -1 }, limit: 3 } })

        if (!SuggestedUsers || SuggestedUsers.length === 0) {
            return res.status(400).json({ message: "do not have any users." })
        }
        return res.status(200).json({ sucess: true, SuggestedUsers: SuggestedUsers })
    } catch (error) {
        console.error("SuggestedUsers error:", error);
    }
}

exports.followOrUnfollow = async (req, res) => {
    try {
        const userId = req.user.id
        const otherUserId = req.params.id

        if (userId === otherUserId) {
            return res.status(400).json({
                sucess: false,
                message: "you cannot follow or unfollow yourself"
            })
        }

        const user = await userModel.findById({ _id: userId })
        const otherUser = await userModel.findById({ _id: otherUserId })

        if (!user || !otherUser) {
            return res.status(400).json({
                sucess: false,
                message: "user not found"
            })
        }

        const isFollowing = user.following.includes(otherUserId)


        if (isFollowing) {

            await userModel.updateOne({ _id: userId }, { $pull: { following: otherUserId } }),
                await userModel.updateOne({ _id: otherUserId }, { $pull: { followers: userId } })

            res.status(200).json({
                message: "unfollowed",
                sucess: true
            })
        } else {

            await userModel.updateOne({ _id: userId }, { $push: { following: otherUserId } })
            await userModel.updateOne({ _id: otherUserId }, { $push: { followers: userId } })

            res.status(200).json({
                message: "followed",
                sucess: true
            })
        }
    } catch (error) {
        console.log('followOrUnfollow', error);

    }
}

exports.getFollowers = async (req, res) => {
    try {
        const userId = req.params.id

        const user = await userModel.findById(userId).populate({
            path: "followers",
            select: "-password -bookmarks -gender -email"
        })

        if (!user) {
            return res.status(401).json({ success: false, message: "user not found!" })
        }

        res.status(200).json(user)

    } catch (error) {
        console.log('getFollowers', error);
        res.status(500).json({ success: false, message: "surver error", error: error })
    }
}

exports.getFollowing = async (req, res) => {
    try {
        const userId = req.params.id

        const user = await userModel.findById(userId).populate({
            path: "following",
            select: "-password -bookmarks -gender -email"
        })

        if (!user) {
            return res.status(401).json({ success: false, message: "user not found!" })
        }

        res.status(200).json(user)

    } catch (error) {
        console.log('getFollowing', error);
        res.status(500).json({ success: false, message: "surver error", error: error })
    }
}

exports.removeFollower = async (req, res) => {
    try {
        const userId = req.user.id
        const followerId = req.params.id

        const user = userModel.findById(userId)

        if (!user) {
            return res.status(401).json({ success: false, message: "user not found!" })
        }

        if (!followerId) {
            return res.status(401).json({ success: false, message: "follower id not found!" })
        } else {
            await userModel.updateOne({ _id: userId }, { $pull: { followers: followerId } })
            await userModel.updateOne({ _id: followerId }, { $pull: { following: userId } })

            res.status(200).json({
                message: "removed",
                sucess: true
            })
        }

    } catch (error) {
        console.log("removeFollower", error);

    }
}