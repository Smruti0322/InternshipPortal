const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const authenticateToken = require("../middleware/authMiddleware");

const {
    createPost,
    getPosts,
    getPostById,

    // Posting limit
    getPostingLimit,

    likePost,
    unlikePost,

    savePost,
    unsavePost,

    addComment,
    getComments,
    deleteComment,

    sharePost,
    reportPost,

    recordPostView,

    getSavedPosts,

    deletePost,
} = require("../controllers/postController");

const router = express.Router();


// =========================================================
// UPLOAD DIRECTORY
// =========================================================

const uploadDirectory = path.join(
    __dirname,
    "..",
    "uploads",
    "community"
);

if (!fs.existsSync(uploadDirectory)) {
    fs.mkdirSync(
        uploadDirectory,
        {
            recursive: true,
        }
    );
}


// =========================================================
// MULTER STORAGE
// =========================================================

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDirectory);
    },

    filename: (req, file, cb) => {
        const extension =
            path.extname(file.originalname);

        const baseName =
            path
                .basename(
                    file.originalname,
                    extension
                )
                .replace(
                    /[^a-zA-Z0-9-_]/g,
                    "-"
                );

        const uniqueName =
            `${ Date.now() } -${
    Math.round(
        Math.random() * 1e9
    )
} -${ baseName }${ extension } `;

        cb(null, uniqueName);
    },
});


// =========================================================
// FILE FILTER
// =========================================================

const fileFilter = (
    req,
    file,
    cb
) => {
    const allowedImages = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
    ];

    const allowedVideos = [
        "video/mp4",
        "video/webm",
        "video/quicktime",
        "video/x-msvideo",
    ];

    if (
        allowedImages.includes(
            file.mimetype
        ) ||
        allowedVideos.includes(
            file.mimetype
        )
    ) {
        cb(null, true);
    } else {
        cb(
            new Error(
                "Only image and video files are allowed."
            ),
            false
        );
    }
};


// =========================================================
// MULTER
// =========================================================

const upload = multer({
    storage,
    fileFilter,

    limits: {
        files: 10,

        // 50 MB per file
        fileSize:
            50 * 1024 * 1024,
    },
});


// =========================================================
// AUTHENTICATION
// =========================================================

router.use(authenticateToken);


// =========================================================
// POSTING LIMIT
// =========================================================

// Get current user's posting limit
//
// IMPORTANT:
// This route must be BEFORE "/:postId"
// so "posting-limit" is not treated as a post ID.

router.get(
    "/posting-limit",
    getPostingLimit
);


// =========================================================
// POSTS
// =========================================================

// Create post
router.post(
    "/",
    upload.array("media", 10),
    createPost
);

// Get feed
router.get(
    "/",
    getPosts
);

// Get single post
router.get(
    "/:postId",
    getPostById
);

// Delete own post
router.delete(
    "/:postId",
    deletePost
);


// =========================================================
// LIKE
// =========================================================

router.post(
    "/:postId/like",
    likePost
);

router.delete(
    "/:postId/like",
    unlikePost
);


// =========================================================
// SAVE
// =========================================================

router.post(
    "/:postId/save",
    savePost
);

router.delete(
    "/:postId/save",
    unsavePost
);


// =========================================================
// COMMENTS
// =========================================================

router.post(
    "/:postId/comments",
    addComment
);

router.get(
    "/:postId/comments",
    getComments
);

router.delete(
    "/:postId/comments/:commentId",
    deleteComment
);


// =========================================================
// SHARE
// =========================================================

router.post(
    "/:postId/share",
    sharePost
);


// =========================================================
// REPORT
// =========================================================

router.post(
    "/:postId/report",
    reportPost
);


// =========================================================
// VIEW
// =========================================================

router.post(
    "/:postId/view",
    recordPostView
);


// =========================================================
// SAVED POSTS
// =========================================================

router.get(
    "/saved/list",
    getSavedPosts
);


// =========================================================
// MULTER ERROR HANDLER
// =========================================================

router.use(
    (error, req, res, next) => {
        if (
            error instanceof
            multer.MulterError
        ) {
            return res.status(400).json({
                success: false,
                message:
                    error.code ===
                        "LIMIT_FILE_SIZE"
                        ? "Each file must be 50 MB or smaller."
                        : error.message,
            });
        }

        if (error) {
            return res.status(400).json({
                success: false,
                message: error.message,
            });
        }

        next();
    }
);


module.exports = router;
