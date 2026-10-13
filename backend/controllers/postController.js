const db = require("../config/db");

// =========================================================
// HELPERS
// =========================================================

const getUserId = (req) => {
    return req.user.id;
};

const normalizeHashtag = (tag) => {
    return tag
        .replace(/^#/, "")
        .trim()
        .toLowerCase()
        .replace(/[^\p{L}\p{N}_]/gu, "");
};

const extractHashtags = (text = "") => {
    const matches =
        text.match(/#[\p{L}\p{N}_]+/gu) || [];

    return [
        ...new Set(
            matches
                .map(normalizeHashtag)
                .filter(Boolean)
        ),
    ];
};

const extractMentions = (text = "") => {
    const matches =
        text.match(/@[\p{L}\p{N}_.-]+/gu) || [];

    return [
        ...new Set(
            matches
                .map((mention) =>
                    mention.substring(1).trim()
                )
                .filter(Boolean)
        ),
    ];
};

// =========================================================
// CHECK POSTING PERMISSION + DAILY POST LIMIT
// =========================================================

const checkPostingPermission = async (userId) => {
    const [result] = await db.query(
        `
        SELECT COUNT(*) AS friend_count
        FROM friendships
        WHERE user_id = ?
        `,
        [userId]
    );

    const friendCount = Number(
        result[0]?.friend_count || 0
    );

    // =====================================================
    // POSTING LIMIT RULES
    //
    // 0 friends    -> 0 posts/day
    // 1 friend     -> 1 post/day
    // 2-5 friends  -> 2 posts/day
    // 6-10 friends -> 5 posts/day
    // 11+ friends  -> Unlimited
    // =====================================================

    let dailyLimit;

    if (friendCount === 0) {
        dailyLimit = 0;
    } else if (friendCount === 1) {
        dailyLimit = 1;
    } else if (
        friendCount >= 2 &&
        friendCount <= 5
    ) {
        dailyLimit = 2;
    } else if (
        friendCount >= 6 &&
        friendCount <= 10
    ) {
        dailyLimit = 5;
    } else {
        dailyLimit = null;
    }

    // =====================================================
    // COUNT TODAY'S POSTS
    // =====================================================

    const [postCountResult] = await db.query(
        `
        SELECT COUNT(*) AS posts_today
        FROM posts
        WHERE user_id = ?
          AND deleted_at IS NULL
          AND DATE(created_at) = CURDATE()
        `,
        [userId]
    );

    const postsToday = Number(
        postCountResult[0]?.posts_today || 0
    );

    // Unlimited
    if (dailyLimit === null) {
        return {
            allowed: true,
            friendCount,
            dailyLimit: null,
            postsToday,
            remainingPosts: null,
        };
    }

    // No posting allowed
    if (dailyLimit === 0) {
        return {
            allowed: false,
            friendCount,
            dailyLimit: 0,
            postsToday,
            remainingPosts: 0,
        };
    }

    // Daily limit reached
    if (postsToday >= dailyLimit) {
        return {
            allowed: false,
            friendCount,
            dailyLimit,
            postsToday,
            remainingPosts: 0,
        };
    }

    return {
        allowed: true,
        friendCount,
        dailyLimit,
        postsToday,
        remainingPosts:
            dailyLimit - postsToday,
    };
};

// =========================================================
// GET POSTING LIMIT
// =========================================================

const getPostingLimit = async (req, res) => {
    try {
        const userId = getUserId(req);

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized.",
            });
        }

        const permission =
            await checkPostingPermission(userId);

        return res.status(200).json({
            success: true,
            friend_count:
                permission.friendCount,
            daily_limit:
                permission.dailyLimit,
            posts_today:
                permission.postsToday,
            remaining_posts:
                permission.remainingPosts,
            can_post:
                permission.allowed,
        });
    } catch (error) {
        console.error(
            "Get Posting Limit Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to get posting limit.",
        });
    }
};

// =========================================================
// CREATE POST
// =========================================================

const createPost = async (req, res) => {
    const connection = await db.getConnection();

    let transactionStarted = false;

    try {
        const userId = getUserId(req);

        const content = (
            req.body.content || ""
        ).trim();

        const privacy =
            req.body.privacy === "friends"
                ? "friends"
                : "public";

        const permission =
            await checkPostingPermission(userId);

        // =================================================
        // CHECK POSTING PERMISSION
        // =================================================

        if (!permission.allowed) {
            connection.release();

            let message;

            if (permission.dailyLimit === 0) {
                message =
                    "You need at least 1 accepted friend to create a post.";
            } else {
                message =
                    `You have reached your daily posting limit of ${permission.dailyLimit} post${permission.dailyLimit === 1 ? "" : "s"}.`;
            }

            return res.status(403).json({
                success: false,
                message,
                friend_count:
                    permission.friendCount,
                daily_limit:
                    permission.dailyLimit,
                posts_today:
                    permission.postsToday,
                remaining_posts:
                    permission.remainingPosts,
            });
        }

        // =================================================
        // MEDIA
        // =================================================

        const files = req.files || [];

        if (!content && files.length === 0) {
            connection.release();

            return res.status(400).json({
                success: false,
                message:
                    "Post must contain text, photo, or video.",
            });
        }

        if (files.length > 10) {
            connection.release();

            return res.status(400).json({
                success: false,
                message:
                    "You can upload a maximum of 10 media files.",
            });
        }

        const mediaTypes = files.map((file) =>
            file.mimetype.startsWith("image/")
                ? "image"
                : "video"
        );

        const hasImage =
            mediaTypes.includes("image");

        const hasVideo =
            mediaTypes.includes("video");

        let mediaType = "text";

        if (hasImage && hasVideo) {
            mediaType = "mixed";
        } else if (hasImage) {
            mediaType = "image";
        } else if (hasVideo) {
            mediaType = "video";
        }

        // =================================================
        // TRANSACTION
        // =================================================

        await connection.beginTransaction();
        transactionStarted = true;

        // =================================================
        // CREATE POST
        // =================================================

        const [postResult] =
            await connection.query(
                `
                INSERT INTO posts
                (
                    user_id,
                    content,
                    media_type,
                    privacy,
                    friend_count_at_posting
                )
                VALUES (?, ?, ?, ?, ?)
                `,
                [
                    userId,
                    content || null,
                    mediaType,
                    privacy,
                    permission.friendCount,
                ]
            );

        const postId =
            postResult.insertId;

        // =================================================
        // SAVE MEDIA
        // =================================================

        for (
            let index = 0;
            index < files.length;
            index++
        ) {
            const file = files[index];

            const fileType =
                file.mimetype.startsWith("image/")
                    ? "image"
                    : "video";

            const mediaUrl =
                `/uploads/community/${file.filename}`;

            await connection.query(
                `
                INSERT INTO post_media
                (
                    post_id,
                    media_type,
                    media_url,
                    original_name,
                    file_size,
                    mime_type,
                    media_order
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
                `,
                [
                    postId,
                    fileType,
                    mediaUrl,
                    file.originalname,
                    file.size,
                    file.mimetype,
                    index,
                ]
            );
        }

        // =================================================
        // HASHTAGS
        // =================================================

        const hashtags =
            extractHashtags(content);

        for (const hashtag of hashtags) {
            const [hashtagResult] =
                await connection.query(
                    `
                    INSERT INTO hashtags
                    (name, posts_count)
                    VALUES (?, 1)
                    ON DUPLICATE KEY UPDATE
                    posts_count =
                        posts_count + 1
                    `,
                    [hashtag]
                );

            let hashtagId;

            if (hashtagResult.insertId) {
                hashtagId =
                    hashtagResult.insertId;
            } else {
                const [existing] =
                    await connection.query(
                        `
                        SELECT id
                        FROM hashtags
                        WHERE name = ?
                        LIMIT 1
                        `,
                        [hashtag]
                    );

                hashtagId =
                    existing[0]?.id;
            }

            if (hashtagId) {
                await connection.query(
                    `
                    INSERT IGNORE INTO post_hashtags
                    (post_id, hashtag_id)
                    VALUES (?, ?)
                    `,
                    [
                        postId,
                        hashtagId,
                    ]
                );
            }
        }

        // =================================================
        // MENTIONS
        // =================================================

        const mentions =
            extractMentions(content);

        for (const username of mentions) {
            /*
             * Current users table has no username column.
             * Therefore this searches by name/email.
             *
             * True @username support can be enabled
             * after adding a unique username field.
             */

            const [mentionedUsers] =
                await connection.query(
                    `
                    SELECT id, name
                    FROM users
                    WHERE
                        LOWER(name) = LOWER(?)
                        OR LOWER(email) = LOWER(?)
                    LIMIT 1
                    `,
                    [
                        username,
                        username,
                    ]
                );

            if (mentionedUsers.length > 0) {
                const mentionedUser =
                    mentionedUsers[0];

                await connection.query(
                    `
                    INSERT INTO post_mentions
                    (
                        post_id,
                        mentioned_user_id,
                        mentioned_text
                    )
                    VALUES (?, ?, ?)
                    `,
                    [
                        postId,
                        mentionedUser.id,
                        `@${username}`,
                    ]
                );

                if (
                    Number(
                        mentionedUser.id
                    ) !== Number(userId)
                ) {
                    await connection.query(
                        `
                        INSERT INTO notifications
                        (
                            user_id,
                            sender_id,
                            type,
                            post_id,
                            message
                        )
                        VALUES
                        (?, ?, 'mention', ?, ?)
                        `,
                        [
                            mentionedUser.id,
                            userId,
                            postId,
                            "You were mentioned in a post.",
                        ]
                    );
                }
            }
        }

        // =================================================
        // COMMIT
        // =================================================

        await connection.commit();
        transactionStarted = false;

        connection.release();

        return res.status(201).json({
            success: true,
            message:
                "Post created successfully.",
            postId,
            media_type: mediaType,
            privacy,
            friend_count:
                permission.friendCount,
            daily_limit:
                permission.dailyLimit,
            posts_today:
                permission.postsToday + 1,
            remaining_posts:
                permission.dailyLimit === null
                    ? null
                    : Math.max(
                        permission.dailyLimit -
                        (permission.postsToday + 1),
                        0
                    ),
        });
    } catch (error) {
        if (transactionStarted) {
            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error(
                    "Rollback Error:",
                    rollbackError
                );
            }
        }

        connection.release();

        console.error(
            "Create Post Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to create post.",
        });
    }
};

// =========================================================
// GET PUBLIC POSTS
// =========================================================

const getPosts = async (req, res) => {
    try {
        const userId =
            Number(getUserId(req));

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized.",
            });
        }

        const search =
            String(
                req.query.search || ""
            ).trim();

        const hashtag =
            String(
                req.query.hashtag || ""
            ).trim();

        const limit = Math.min(
            Math.max(
                Number(req.query.limit) || 20,
                1
            ),
            50
        );

        const offset = Math.max(
            Number(req.query.offset) || 0,
            0
        );

        /*
         * IMPORTANT:
         * Placeholder order must match SQL order.
         *
         * 1. is_liked user ID
         * 2. is_saved user ID
         * 3. own post user ID
         * 4. friendship user ID
         */

        const values = [
            userId,
            userId,
            userId,
            userId,
        ];

        let whereClause = `
            WHERE p.deleted_at IS NULL
            AND (
                p.privacy = 'public'
                OR p.user_id = ?
                OR EXISTS (
                    SELECT 1
                    FROM friendships f
                    WHERE f.user_id = ?
                      AND f.friend_id = p.user_id
                )
            )
        `;

        // =================================================
        // SEARCH
        // =================================================

        if (search) {
            whereClause += `
                AND (
                    p.content LIKE ?
                    OR u.name LIKE ?
                )
            `;

            const searchValue =
                `%${search}%`;

            values.push(
                searchValue,
                searchValue
            );
        }

        // =================================================
        // HASHTAG FILTER
        // =================================================

        if (hashtag) {
            const normalizedHashtag =
                hashtag
                    .replace(/^#/, "")
                    .trim()
                    .toLowerCase();

            if (normalizedHashtag) {
                whereClause += `
                    AND EXISTS (
                        SELECT 1
                        FROM post_hashtags ph
                        INNER JOIN hashtags h
                            ON h.id = ph.hashtag_id
                        WHERE ph.post_id = p.id
                          AND LOWER(h.name) = LOWER(?)
                    )
                `;

                values.push(
                    normalizedHashtag
                );
            }
        }

        // =================================================
        // GET POSTS
        // =================================================

        const [posts] = await db.query(
            `
            SELECT
                p.id,
                p.user_id,
                p.content,
                p.media_type,
                p.privacy,
                p.friend_count_at_posting,
                p.likes_count,

                (
                    SELECT COUNT(*)
                    FROM post_comments pc
                    WHERE pc.post_id = p.id
                      AND pc.deleted_at IS NULL
                ) AS comments_count,

                p.shares_count,
                p.saves_count,
                p.views_count,
                p.is_edited,
                p.created_at,
                p.updated_at,

                u.name AS user_name,
                u.email AS user_email,

                EXISTS (
                    SELECT 1
                    FROM post_likes pl
                    WHERE pl.post_id = p.id
                      AND pl.user_id = ?
                ) AS is_liked,

                EXISTS (
                    SELECT 1
                    FROM post_saves ps
                    WHERE ps.post_id = p.id
                      AND ps.user_id = ?
                ) AS is_saved

            FROM posts p

            INNER JOIN users u
                ON u.id = p.user_id

            ${whereClause}

            ORDER BY p.created_at DESC

            LIMIT ?

            OFFSET ?
            `,
            [
                ...values,
                limit,
                offset,
            ]
        );

        // =================================================
        // NO POSTS
        // =================================================

        if (posts.length === 0) {
            return res.status(200).json({
                success: true,
                posts: [],
                count: 0,
            });
        }

        const postIds =
            posts.map((post) =>
                Number(post.id)
            );

        // =================================================
        // MEDIA
        // =================================================

        const [mediaRows] =
            await db.query(
                `
                SELECT
                    id,
                    post_id,
                    media_url,
                    media_type
                FROM post_media
                WHERE post_id IN (?)
                ORDER BY id ASC
                `,
                [postIds]
            );

        // =================================================
        // HASHTAGS
        // =================================================

        const [hashtagRows] =
            await db.query(
                `
                SELECT
                    ph.post_id,
                    h.id,
                    h.name
                FROM post_hashtags ph
                INNER JOIN hashtags h
                    ON h.id = ph.hashtag_id
                WHERE ph.post_id IN (?)
                ORDER BY h.name ASC
                `,
                [postIds]
            );

        // =================================================
        // MAP MEDIA + HASHTAGS
        // =================================================

        const mediaMap = {};
        const hashtagMap = {};

        for (const media of mediaRows) {
            const postId =
                Number(media.post_id);

            if (!mediaMap[postId]) {
                mediaMap[postId] = [];
            }

            mediaMap[postId].push(media);
        }

        for (const hashtag of hashtagRows) {
            const postId =
                Number(hashtag.post_id);

            if (!hashtagMap[postId]) {
                hashtagMap[postId] = [];
            }

            hashtagMap[postId].push({
                id: hashtag.id,
                name: hashtag.name,
            });
        }

        // =================================================
        // FORMAT POSTS
        // =================================================

        const formattedPosts =
            posts.map((post) => ({
                ...post,

                id:
                    Number(post.id),

                user_id:
                    Number(post.user_id),

                likes_count:
                    Number(
                        post.likes_count || 0
                    ),

                comments_count:
                    Number(
                        post.comments_count || 0
                    ),

                shares_count:
                    Number(
                        post.shares_count || 0
                    ),

                saves_count:
                    Number(
                        post.saves_count || 0
                    ),

                views_count:
                    Number(
                        post.views_count || 0
                    ),

                is_liked:
                    Boolean(
                        post.is_liked
                    ),

                is_saved:
                    Boolean(
                        post.is_saved
                    ),

                media:
                    mediaMap[
                    Number(post.id)
                    ] || [],

                hashtags:
                    hashtagMap[
                    Number(post.id)
                    ] || [],
            }));

        return res.status(200).json({
            success: true,
            posts: formattedPosts,
            count: formattedPosts.length,
        });
    } catch (error) {
        console.error(
            "Get Posts Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to fetch posts.",
        });
    }
};

// =========================================================
// GET SINGLE POST
// =========================================================

const getPostById = async (req, res) => {
    try {
        const userId =
            getUserId(req);

        const postId =
            Number(req.params.postId);

        if (!postId) {
            return res.status(400).json({
                success: false,
                message:
                    "Valid post ID is required.",
            });
        }

        const [posts] =
            await db.query(
                `
                SELECT
                    p.*,
                    u.name AS user_name,
                    u.email AS user_email,

                    EXISTS (
                        SELECT 1
                        FROM post_likes pl
                        WHERE pl.post_id = p.id
                          AND pl.user_id = ?
                    ) AS is_liked,

                    EXISTS (
                        SELECT 1
                        FROM post_saves ps
                        WHERE ps.post_id = p.id
                          AND ps.user_id = ?
                    ) AS is_saved

                FROM posts p

                INNER JOIN users u
                    ON u.id = p.user_id

                WHERE p.id = ?
                  AND p.deleted_at IS NULL

                LIMIT 1
                `,
                [
                    userId,
                    userId,
                    postId,
                ]
            );

        if (posts.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Post not found.",
            });
        }

        const post = posts[0];

        const [media] =
            await db.query(
                `
                SELECT *
                FROM post_media
                WHERE post_id = ?
                ORDER BY media_order ASC
                `,
                [postId]
            );

        post.media = media;

        const [hashtags] =
            await db.query(
                `
                SELECT
                    h.id,
                    h.name
                FROM post_hashtags ph
                INNER JOIN hashtags h
                    ON h.id = ph.hashtag_id
                WHERE ph.post_id = ?
                `,
                [postId]
            );

        post.hashtags = hashtags;

        return res.status(200).json({
            success: true,
            post,
        });
    } catch (error) {
        console.error(
            "Get Post Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to load post.",
        });
    }
};

// =========================================================
// LIKE POST
// =========================================================

const likePost = async (req, res) => {
    try {
        const userId =
            getUserId(req);

        const postId =
            Number(req.params.postId);

        if (!postId) {
            return res.status(400).json({
                success: false,
                message:
                    "Valid post ID is required.",
            });
        }

        const [posts] =
            await db.query(
                `
                SELECT user_id
                FROM posts
                WHERE id = ?
                  AND deleted_at IS NULL
                LIMIT 1
                `,
                [postId]
            );

        if (posts.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Post not found.",
            });
        }

        const [existing] =
            await db.query(
                `
                SELECT id
                FROM post_likes
                WHERE post_id = ?
                  AND user_id = ?
                LIMIT 1
                `,
                [
                    postId,
                    userId,
                ]
            );

        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                message:
                    "Post already liked.",
            });
        }

        await db.query(
            `
            INSERT INTO post_likes
            (post_id, user_id)
            VALUES (?, ?)
            `,
            [
                postId,
                userId,
            ]
        );

        await db.query(
            `
            UPDATE posts
            SET likes_count =
                likes_count + 1
            WHERE id = ?
            `,
            [postId]
        );

        if (
            Number(posts[0].user_id) !==
            Number(userId)
        ) {
            await db.query(
                `
                INSERT INTO notifications
                (
                    user_id,
                    sender_id,
                    type,
                    post_id,
                    message
                )
                VALUES
                (?, ?, 'like', ?, ?)
                `,
                [
                    posts[0].user_id,
                    userId,
                    postId,
                    "Someone liked your post.",
                ]
            );
        }

        return res.status(201).json({
            success: true,
            message: "Post liked.",
        });
    } catch (error) {
        console.error(
            "Like Post Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to like post.",
        });
    }
};

// =========================================================
// UNLIKE POST
// =========================================================

const unlikePost = async (req, res) => {
    try {
        const userId =
            getUserId(req);

        const postId =
            Number(req.params.postId);

        if (!postId) {
            return res.status(400).json({
                success: false,
                message:
                    "Valid post ID is required.",
            });
        }

        const [result] =
            await db.query(
                `
                DELETE FROM post_likes
                WHERE post_id = ?
                  AND user_id = ?
                `,
                [
                    postId,
                    userId,
                ]
            );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message:
                    "Like not found.",
            });
        }

        await db.query(
            `
            UPDATE posts
            SET likes_count =
                GREATEST(
                    likes_count - 1,
                    0
                )
            WHERE id = ?
            `,
            [postId]
        );

        return res.status(200).json({
            success: true,
            message:
                "Post unliked.",
        });
    } catch (error) {
        console.error(
            "Unlike Post Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to unlike post.",
        });
    }
};

// =========================================================
// SAVE POST
// =========================================================

const savePost = async (req, res) => {
    try {
        const userId =
            getUserId(req);

        const postId =
            Number(req.params.postId);

        if (!postId) {
            return res.status(400).json({
                success: false,
                message:
                    "Valid post ID is required.",
            });
        }

        const [posts] =
            await db.query(
                `
                SELECT id
                FROM posts
                WHERE id = ?
                  AND deleted_at IS NULL
                LIMIT 1
                `,
                [postId]
            );

        if (posts.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Post not found.",
            });
        }

        const [existing] =
            await db.query(
                `
                SELECT id
                FROM post_saves
                WHERE post_id = ?
                  AND user_id = ?
                LIMIT 1
                `,
                [
                    postId,
                    userId,
                ]
            );

        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                message:
                    "Post already saved.",
            });
        }

        await db.query(
            `
            INSERT INTO post_saves
            (post_id, user_id)
            VALUES (?, ?)
            `,
            [
                postId,
                userId,
            ]
        );

        await db.query(
            `
            UPDATE posts
            SET saves_count =
                saves_count + 1
            WHERE id = ?
            `,
            [postId]
        );

        return res.status(201).json({
            success: true,
            message: "Post saved.",
        });
    } catch (error) {
        console.error(
            "Save Post Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to save post.",
        });
    }
};

// =========================================================
// UNSAVE POST
// =========================================================

const unsavePost = async (req, res) => {
    try {
        const userId =
            getUserId(req);

        const postId =
            Number(req.params.postId);

        if (!postId) {
            return res.status(400).json({
                success: false,
                message:
                    "Valid post ID is required.",
            });
        }

        const [result] =
            await db.query(
                `
                DELETE FROM post_saves
                WHERE post_id = ?
                  AND user_id = ?
                `,
                [
                    postId,
                    userId,
                ]
            );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message:
                    "Saved post not found.",
            });
        }

        await db.query(
            `
            UPDATE posts
            SET saves_count =
                GREATEST(
                    saves_count - 1,
                    0
                )
            WHERE id = ?
            `,
            [postId]
        );

        return res.status(200).json({
            success: true,
            message:
                "Post unsaved.",
        });
    } catch (error) {
        console.error(
            "Unsave Post Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to unsave post.",
        });
    }
};

// =========================================================
// ADD COMMENT
// =========================================================

const addComment = async (req, res) => {
    try {
        const userId =
            getUserId(req);

        const postId =
            Number(req.params.postId);

        const content = (
            req.body.content || ""
        ).trim();

        const parentCommentId =
            req.body.parent_comment_id
                ? Number(
                    req.body.parent_comment_id
                )
                : null;

        if (!postId || !content) {
            return res.status(400).json({
                success: false,
                message:
                    "Post ID and comment are required.",
            });
        }

        const [posts] =
            await db.query(
                `
                SELECT user_id
                FROM posts
                WHERE id = ?
                  AND deleted_at IS NULL
                LIMIT 1
                `,
                [postId]
            );

        if (posts.length === 0) {
            return res.status(404).json({
                success: false,
                message:
                    "Post not found.",
            });
        }

        if (parentCommentId) {
            const [parent] =
                await db.query(
                    `
                    SELECT id
                    FROM post_comments
                    WHERE id = ?
                      AND post_id = ?
                      AND deleted_at IS NULL
                    LIMIT 1
                    `,
                    [
                        parentCommentId,
                        postId,
                    ]
                );

            if (parent.length === 0) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Parent comment not found.",
                });
            }
        }

        const [result] =
            await db.query(
                `
                INSERT INTO post_comments
                (
                    post_id,
                    user_id,
                    parent_comment_id,
                    content
                )
                VALUES (?, ?, ?, ?)
                `,
                [
                    postId,
                    userId,
                    parentCommentId,
                    content,
                ]
            );

        await db.query(
            `
            UPDATE posts
            SET comments_count =
                comments_count + 1
            WHERE id = ?
            `,
            [postId]
        );

        if (
            Number(posts[0].user_id) !==
            Number(userId)
        ) {
            await db.query(
                `
                INSERT INTO notifications
                (
                    user_id,
                    sender_id,
                    type,
                    post_id,
                    comment_id,
                    message
                )
                VALUES
                (?, ?, 'comment', ?, ?, ?)
                `,
                [
                    posts[0].user_id,
                    userId,
                    postId,
                    result.insertId,
                    "Someone commented on your post.",
                ]
            );
        }

        return res.status(201).json({
            success: true,
            message:
                "Comment added.",
            commentId:
                result.insertId,
        });
    } catch (error) {
        console.error(
            "Add Comment Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to add comment.",
        });
    }
};

// =========================================================
// GET COMMENTS
// =========================================================

const getComments = async (req, res) => {
    try {
        const postId =
            Number(req.params.postId);

        if (!postId) {
            return res.status(400).json({
                success: false,
                message:
                    "Valid post ID is required.",
            });
        }

        const [comments] =
            await db.query(
                `
                SELECT
                    pc.id,
                    pc.post_id,
                    pc.user_id,
                    pc.parent_comment_id,
                    pc.content,
                    pc.is_edited,
                    pc.created_at,
                    pc.updated_at,
                    u.name AS user_name,
                    u.email AS user_email

                FROM post_comments pc

                INNER JOIN users u
                    ON u.id = pc.user_id

                WHERE pc.post_id = ?
                  AND pc.deleted_at IS NULL

                ORDER BY pc.created_at ASC
                `,
                [postId]
            );

        return res.status(200).json({
            success: true,
            comments,
            count: comments.length,
        });
    } catch (error) {
        console.error(
            "Get Comments Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to load comments.",
        });
    }
};

// =========================================================
// DELETE OWN COMMENT
// =========================================================

const deleteComment = async (req, res) => {
    try {
        const userId =
            Number(getUserId(req));

        const commentId =
            Number(req.params.commentId);

        if (!userId) {
            return res.status(401).json({
                success: false,
                message:
                    "Unauthorized.",
            });
        }

        if (!commentId) {
            return res.status(400).json({
                success: false,
                message:
                    "Valid comment ID is required.",
            });
        }

        const [comments] =
            await db.query(
                `
                SELECT
                    id,
                    post_id
                FROM post_comments
                WHERE id = ?
                  AND user_id = ?
                  AND deleted_at IS NULL
                LIMIT 1
                `,
                [
                    commentId,
                    userId,
                ]
            );

        if (comments.length === 0) {
            return res.status(404).json({
                success: false,
                message:
                    "Comment not found or you are not allowed to delete it.",
            });
        }

        const postId =
            Number(
                comments[0].post_id
            );

        const [deleteResult] =
            await db.query(
                `
                UPDATE post_comments
                SET deleted_at = NOW()
                WHERE id = ?
                  AND user_id = ?
                  AND deleted_at IS NULL
                `,
                [
                    commentId,
                    userId,
                ]
            );

        if (
            deleteResult.affectedRows === 0
        ) {
            return res.status(404).json({
                success: false,
                message:
                    "Comment not found or it has already been deleted.",
            });
        }

        await db.query(
            `
            UPDATE posts
            SET comments_count = (
                SELECT COUNT(*)
                FROM post_comments pc
                WHERE pc.post_id = ?
                  AND pc.deleted_at IS NULL
            )
            WHERE id = ?
            `,
            [
                postId,
                postId,
            ]
        );

        const [postRows] =
            await db.query(
                `
                SELECT comments_count
                FROM posts
                WHERE id = ?
                LIMIT 1
                `,
                [postId]
            );

        const commentsCount =
            postRows.length > 0
                ? Number(
                    postRows[0]
                        .comments_count || 0
                )
                : 0;

        return res.status(200).json({
            success: true,
            message:
                "Comment deleted successfully.",
            postId,
            commentId,
            comments_count:
                commentsCount,
        });
    } catch (error) {
        console.error(
            "Delete Comment Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to delete comment.",
        });
    }
};

// =========================================================
// SHARE POST
// =========================================================

const sharePost = async (req, res) => {
    try {
        const userId =
            Number(getUserId(req));

        const postId =
            Number(req.params.postId);

        if (!userId) {
            return res.status(401).json({
                success: false,
                message:
                    "Unauthorized.",
            });
        }

        if (!postId) {
            return res.status(400).json({
                success: false,
                message:
                    "Valid post ID is required.",
            });
        }

        const shareType =
            req.body?.share_type ===
                "external"
                ? "external"
                : "internal";

        const [posts] =
            await db.query(
                `
                SELECT
                    id,
                    user_id
                FROM posts
                WHERE id = ?
                  AND deleted_at IS NULL
                LIMIT 1
                `,
                [postId]
            );

        if (posts.length === 0) {
            return res.status(404).json({
                success: false,
                message:
                    "Post not found.",
            });
        }

        const postOwnerId =
            Number(posts[0].user_id);

        await db.query(
            `
            INSERT INTO post_shares
            (
                post_id,
                user_id,
                share_type
            )
            VALUES (?, ?, ?)
            `,
            [
                postId,
                userId,
                shareType,
            ]
        );

        await db.query(
            `
            UPDATE posts
            SET shares_count =
                GREATEST(
                    COALESCE(
                        shares_count,
                        0
                    ) + 1,
                    0
                )
            WHERE id = ?
            `,
            [postId]
        );

        if (postOwnerId !== userId) {
            await db.query(
                `
                INSERT INTO notifications
                (
                    user_id,
                    sender_id,
                    type,
                    post_id,
                    message
                )
                VALUES
                (?, ?, 'share', ?, ?)
                `,
                [
                    postOwnerId,
                    userId,
                    postId,
                    "Someone shared your post.",
                ]
            );
        }

        const [updatedPosts] =
            await db.query(
                `
                SELECT shares_count
                FROM posts
                WHERE id = ?
                LIMIT 1
                `,
                [postId]
            );

        const sharesCount =
            updatedPosts.length > 0
                ? Number(
                    updatedPosts[0]
                        .shares_count || 0
                )
                : 0;

        return res.status(201).json({
            success: true,
            message:
                "Post shared successfully.",
            postId,
            shares_count:
                sharesCount,
        });
    } catch (error) {
        console.error(
            "Share Post Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to share post.",
        });
    }
};

// =========================================================
// REPORT POST
// =========================================================

const reportPost = async (req, res) => {
    try {
        const userId =
            getUserId(req);

        const postId =
            Number(req.params.postId);

        const allowedReasons = [
            "spam",
            "harassment",
            "inappropriate",
            "misinformation",
            "copyright",
            "other",
        ];

        const reason =
            req.body.reason || "other";

        const description = (
            req.body.description || ""
        ).trim();

        if (!postId) {
            return res.status(400).json({
                success: false,
                message:
                    "Valid post ID is required.",
            });
        }

        if (
            !allowedReasons.includes(
                reason
            )
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid report reason.",
            });
        }

        const [posts] =
            await db.query(
                `
                SELECT id
                FROM posts
                WHERE id = ?
                  AND deleted_at IS NULL
                LIMIT 1
                `,
                [postId]
            );

        if (posts.length === 0) {
            return res.status(404).json({
                success: false,
                message:
                    "Post not found.",
            });
        }

        const [existing] =
            await db.query(
                `
                SELECT id
                FROM post_reports
                WHERE post_id = ?
                  AND reporter_id = ?
                  AND status IN
                      ('pending', 'reviewed')
                LIMIT 1
                `,
                [
                    postId,
                    userId,
                ]
            );

        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                message:
                    "You have already reported this post.",
            });
        }

        await db.query(
            `
            INSERT INTO post_reports
            (
                post_id,
                reporter_id,
                reason,
                description
            )
            VALUES (?, ?, ?, ?)
            `,
            [
                postId,
                userId,
                reason,
                description || null,
            ]
        );

        return res.status(201).json({
            success: true,
            message:
                "Post reported successfully.",
        });
    } catch (error) {
        console.error(
            "Report Post Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to report post.",
        });
    }
};

// =========================================================
// RECORD POST VIEW
// =========================================================

const recordPostView = async (req, res) => {
    try {
        const userId =
            getUserId(req);

        const postId =
            Number(req.params.postId);

        if (!postId) {
            return res.status(400).json({
                success: false,
                message:
                    "Valid post ID is required.",
            });
        }

        const [posts] =
            await db.query(
                `
                SELECT id
                FROM posts
                WHERE id = ?
                  AND deleted_at IS NULL
                LIMIT 1
                `,
                [postId]
            );

        if (posts.length === 0) {
            return res.status(404).json({
                success: false,
                message:
                    "Post not found.",
            });
        }

        const ipAddress =
            req.headers[
            "x-forwarded-for"
            ] ||
            req.socket.remoteAddress ||
            null;

        const userAgent =
            req.headers["user-agent"] ||
            null;

        await db.query(
            `
            INSERT INTO post_views
            (
                post_id,
                user_id,
                ip_address,
                user_agent
            )
            VALUES (?, ?, ?, ?)
            `,
            [
                postId,
                userId,
                ipAddress,
                userAgent,
            ]
        );

        await db.query(
            `
            UPDATE posts
            SET views_count =
                views_count + 1
            WHERE id = ?
            `,
            [postId]
        );

        return res.status(201).json({
            success: true,
            message:
                "Post view recorded.",
        });
    } catch (error) {
        console.error(
            "Record Post View Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to record post view.",
        });
    }
};

// =========================================================
// GET SAVED POSTS
// =========================================================

const getSavedPosts = async (req, res) => {
    try {
        const userId =
            Number(getUserId(req));

        if (!userId) {
            return res.status(401).json({
                success: false,
                message:
                    "Unauthorized.",
            });
        }

        const [posts] =
            await db.query(
                `
                SELECT
                    p.id,
                    p.user_id,
                    p.content,
                    p.media_type,
                    p.privacy,
                    p.likes_count,

                    (
                        SELECT COUNT(*)
                        FROM post_comments pc
                        WHERE pc.post_id = p.id
                          AND pc.deleted_at IS NULL
                    ) AS comments_count,

                    p.shares_count,
                    p.saves_count,
                    p.views_count,
                    p.created_at,

                    u.name AS user_name,
                    u.email AS user_email,

                    1 AS is_saved

                FROM post_saves ps

                INNER JOIN posts p
                    ON p.id = ps.post_id

                INNER JOIN users u
                    ON u.id = p.user_id

                WHERE ps.user_id = ?
                  AND p.deleted_at IS NULL

                ORDER BY ps.created_at DESC
                `,
                [userId]
            );

        if (posts.length === 0) {
            return res.status(200).json({
                success: true,
                posts: [],
                count: 0,
            });
        }

        const postIds =
            posts.map(
                (post) => post.id
            );

        const [mediaRows] =
            await db.query(
                `
                SELECT
                    id,
                    post_id,
                    media_url,
                    media_type
                FROM post_media
                WHERE post_id IN (?)
                ORDER BY id ASC
                `,
                [postIds]
            );

        const mediaMap = {};

        mediaRows.forEach((media) => {
            if (
                !mediaMap[media.post_id]
            ) {
                mediaMap[media.post_id] =
                    [];
            }

            mediaMap[
                media.post_id
            ].push(media);
        });

        const formattedPosts =
            posts.map((post) => ({
                ...post,

                likes_count:
                    Number(
                        post.likes_count || 0
                    ),

                comments_count:
                    Number(
                        post.comments_count || 0
                    ),

                shares_count:
                    Number(
                        post.shares_count || 0
                    ),

                saves_count:
                    Number(
                        post.saves_count || 0
                    ),

                views_count:
                    Number(
                        post.views_count || 0
                    ),

                is_saved: true,

                media:
                    mediaMap[post.id] ||
                    [],
            }));

        return res.status(200).json({
            success: true,
            posts: formattedPosts,
            count:
                formattedPosts.length,
        });
    } catch (error) {
        console.error(
            "Get Saved Posts Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to load saved posts.",
        });
    }
};

// =========================================================
// DELETE OWN POST
// =========================================================

const deletePost = async (req, res) => {
    try {
        const userId =
            getUserId(req);

        const postId =
            Number(req.params.postId);

        if (!postId) {
            return res.status(400).json({
                success: false,
                message:
                    "Valid post ID is required.",
            });
        }

        const [result] =
            await db.query(
                `
                UPDATE posts
                SET deleted_at = NOW()
                WHERE id = ?
                  AND user_id = ?
                  AND deleted_at IS NULL
                `,
                [
                    postId,
                    userId,
                ]
            );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message:
                    "Post not found or you are not allowed to delete it.",
            });
        }

        return res.status(200).json({
            success: true,
            message:
                "Post deleted successfully.",
        });
    } catch (error) {
        console.error(
            "Delete Post Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to delete post.",
        });
    }
};

// =========================================================
// EXPORTS
// =========================================================

module.exports = {
    createPost,
    getPosts,
    getPostById,
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
};