const sharp = require("sharp")
const getDataUri = require("../config/datauri")
const cloudinary = require("../config/cloudinary")
const postSchema = require("../models/postmodel")
const userSchema = require("../models/usermodel")
const commentsSchema = require("../models/commentsmodel")

exports.newPost = async (req, res) => {
    try {
        const { caption } = req.body;
        const image = req.file;
        const userId = req.user.id;
        let cloudresponse;

        if (!image) {
            return res.status(400).json({ message: "Image is required" });
        }

        const optimizedImageBuffer = await sharp(image.buffer)
            .resize({ width: 800, height: 800, fit: "inside" })
            .toFormat("jpeg", { quality: 80 })
            .toBuffer();

        const filePath = await getDataUri({
            originalname: "optimized.jpg",
            buffer: optimizedImageBuffer
        });

        cloudresponse = await cloudinary.uploader.upload(filePath);

        if (!cloudresponse || !cloudresponse.secure_url) {
            return res.status(500).json({ message: "Image upload failed" });
        }

        const post = new postSchema({
            caption,
            image: cloudresponse.secure_url,
            userId
        });

        await post.save()

        const user = await userSchema.findById(userId);
        if (user) {
            user.posts.push(post._id);
            await user.save();
        }

        const populatedPost = await post.populate({ path: "userId", select: "-password" });

        return res.status(200).json({
            message: "New post added",
            success: true,
            post: populatedPost
        });
    } catch (error) {
        return res.status(500).json({ message: "Server error", error: error.message });
    }
};

exports.editPost = async (req, res) => {
    try {
        const { caption } = req.body
        const postId = req.params.id
        const userId = req.user.id

        const post = await postSchema.findById(postId)

        if (!post) {
            return res.status(404).json({
                message: "post not found!",
                success: false,
            })
        }
        if (!caption) {
            return res.status(404).json({
                message: "caption not found!",
                success: false,
            })
        }

        if (post.userId.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized to edit this post",
            });
        }

        post.caption = caption
        await post.save()

        return res.status(200).json({
            success: true,
            message: "Post edited successfully",
            post,
        });

    } catch (error) {
        return res.status(500).json({ message: "Server error", error: error.message });
    }
}

exports.getAllPosts = async (req, res) => {
    try {
        const posts = await postSchema
            .find()
            .sort({ createdAt: -1 })
            .populate({ path: "userId", select: "userName profilePicture" })
            .populate({
                path: "comments",
                options: { sort: { createdAt: 1 } },
                populate: {
                    path: "userId",
                    select: "userName profilePicture"
                },
            });

        return res.status(200).json({
            success: true,
            posts,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message,
        });
    }
};

exports.getUserPostsOnly = async (req, res) => {
    try {
        const id = req.params.id
        const posts = await postSchema.find({ userId: id }).sort({ createdAt: -1 }).populate({
            path: "userId",
            select: "userName profilePicture",
        }).populate({
            path: "comments",
            sort: { createdAt: -1 },
            populate: {
                path: "userId",
                select: 'userName profilePicture'
            }
        })
        return res.status(200).json({
            success: true,
            post: posts
        })
    } catch (error) {
        return res.status(500).json({ message: "Server error", error: error.message });
    }
}

exports.getPostById = async (req, res) => {
    try {
        const id = req.params.id

        const post = await postSchema.findById(id)

        if (!post) {
            return res.status(401).json({
                success: true,
                message: "post not found"
            })
        }

        return res.status(200).json({ post: post, success: true })

    } catch (error) {
        return res.status(500).json({ message: "Server error", error: error.message });
    }
}

exports.likePostdislikePost = async (req, res) => {
    try {
        const userId = req.user.id;
        const postId = req.params.id;

        const post = await postSchema.findById(postId);

        if (!post) {
            return res.status(404).json({
                success: false,
                message: "Post not found!"
            });
        }

        const isLiked = post.likes.includes(userId);

        if (isLiked) {
            // Remove userId from likes
            await post.updateOne({ $pull: { likes: userId } });
            await post.save();
            return res.status(200).json({ message: "Post unliked successfully" });
        } else {
            // Add userId to likes
            await post.updateOne({ $addToSet: { likes: userId } });
            await post.save();
            return res.status(200).json({ message: "Post liked successfully" });
        }

    } catch (error) {
        return res.status(500).json({ message: "Something went wrong", error: error.message });
    }
}

exports.addComment = async (req, res) => {
    try {
        const { text } = req.body;
        const { id: postId } = req.params;
        const userId = req.user.id;

        const comment = await commentsSchema.create({
            text,
            userId,
            post: postId
        });

        await userSchema.findByIdAndUpdate(userId, {
            $push: { comments: comment._id }
        });

        await postSchema.findByIdAndUpdate(postId, {
            $push: { comments: comment._id }
        });

        const populatedComment = await commentsSchema.findById(comment._id)
            .populate('userId', 'name email')
            .populate('post');

        res.status(201).json({
            success: true,
            comment: populatedComment
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.deleteComment = async (req, res) => {
    try {
        const commentId = req.params.id
        const userId = req.user.id

        const comment = await commentsSchema.findById(commentId)

        if (!comment) {
            return res.status(404).json({
                message: "comment not found!",
                success: false
            })
        }

        if (comment.userId.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized to delete this comment",
            });
        }

        await commentsSchema.findByIdAndDelete(commentId)

        await postSchema.updateOne({ _id: comment.post }, { $pull: { comments: commentId } })

        return res.status(200).json({
            success: true,
            message: "Comment deleted successfully",
        });

    } catch (error) {
        return res.status(500).json({ message: "Server error", error: error.message });
    }
}

exports.editComment = async (req, res) => {
    try {
        const commentId = req.params.id
        const userId = req.user.id
        const { text } = req.body
        console.log(commentId);
        if (!text) {
            return res.status(404).json({
                message: "text not found!",
                success: false
            })
        }

        const comment = await commentsSchema.findById(commentId)


        if (!comment) {
            return res.status(404).json({
                success: false,
                message: "Comment not found",
            });
        }


        if (comment?.userId?.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized to edit this comment",
            });
        }

        comment.text = text
        await comment.save()

        return res.status(200).json({
            success: true,
            message: "Comment updated successfully",
            comment,
        });

    } catch (error) {
        return res.status(500).json({ message: "Server error", error: error.message });
    }
}

exports.getCommentsOfaPost = async (req, res) => {
    try {
        const postId = req.params.id
        const comment = await commentsSchema.find({ post: postId }).populate('userId', 'userName profilePicture')

        if (!comment) {
            return res.status(404).json({
                message: 'no comment found for this post',
                success: false
            })
        }

        return res.status(200).json({
            success: true,
            comment: comment
        })
    } catch (error) {
        return res.status(500).json({ message: "Server error", error: error.message });
    }
}

exports.deletePost = async (req, res) => {
    try {
        const postId = req.params.id;
        const userId = req.user.id;

        const post = await postSchema.findById(postId);
        if (!post) {
            return res.status(404).json({
                success: false,
                message: "Post not found!"
            });
        }

        if (post.userId.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized to delete this post"
            });
        }

        await postSchema.findByIdAndDelete(postId);

        // Remove post from user's post list
        const user = await userSchema.findById(userId);
        if (user) {
            user.posts = user.posts.filter(id => id.toString() !== postId);
            await user.save();
        }

        // Delete related comments
        await commentsSchema.deleteMany({ post: postId });


        return res.status(200).json({
            success: true,
            message: "Post deleted successfully."
        });

    } catch (error) {
        console.error("deletePost error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
};

exports.addToBookMark = async (req, res) => {
    try {
        const postId = req.params.id
        const userId = req.user.id

        if (!userId) {
            return res.status(404).json({ success: false, message: "unauthorize" })
        }
        const post = await postSchema.findById(postId)
        if (!post) return res.status(404).json({ success: false, message: "post not found!" })
        const user = await userSchema.findById(userId)
        if (!user) return res.status(404).json({ success: false, message: "user not found!" })

        if (user.bookmarks.includes(post._id)) {
            //remove from bookmark list
            await user.updateOne({ $pull: { bookmarks: post._id } })
            await user.save()
            res.status(200).json({ type: 'unsaved', message: 'post removed from bookmark', success: true })
        } else {
            //add to bookmark list
            await user.updateOne({ $addToSet: { bookmarks: post._id } })
            await user.save()
            res.status(200).json({ type: 'saved', message: 'post bookmarked', success: true })
        }
    } catch (error) {
        return res.status(500).json({ message: "Server error", error: error.message });
    }
}

exports.getUserBookmarks = async (req, res) => {
    try {
        const userId = req.user.id;

        const user = await userSchema.findById(userId)
            .populate({
                path: 'bookmarks',
                populate: [
                    {
                        path: 'userId',
                        select: 'userName name profilePicture'
                    },
                    {
                        path: 'comments',
                        populate: {
                            path: 'userId',
                            select: 'userName profilePicture'
                        }
                    },
                    {
                        path: 'likes',
                        select: 'userName profilePicture'
                    }
                ]
            });

        if (!user) {
            return res.status(401).json({ success: false, message: "User not found!" });
        }

        const bookmarksPosts = user.bookmarks;

        return res.status(200).json({ success: true, bookmarksPosts });

    } catch (error) {
        console.error("getUserBookmarks error:", error);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};
