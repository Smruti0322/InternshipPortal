const db = require("../config/db");

// =========================================================
// HELPER: GET LOGGED-IN USER ID
// =========================================================

const getUserId = (req) => {
    return Number(req.user.id);
};


// =========================================================
// USER SEARCH
// =========================================================

const searchUsers = async (req, res) => {
    try {
        const userId = getUserId(req);
        const search = (req.query.search || "").trim();

        if (!search) {
            return res.status(400).json({
                success: false,
                message: "Search text is required.",
            });
        }

        const [users] = await db.query(
            `
            SELECT
                id,
                name,
                email
            FROM users
            WHERE id != ?
              AND (
                    name LIKE ?
                    OR email LIKE ?
              )
            ORDER BY name ASC
            LIMIT 20
            `,
            [
                userId,
                `%${search}%`,
                `%${search}%`,
            ]
        );

        return res.status(200).json({
            success: true,
            users,
        });

    } catch (error) {
        console.error("Search Users Error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to search users.",
        });
    }
};


// =========================================================
// SEND FRIEND REQUEST
// =========================================================

const sendFriendRequest = async (req, res) => {
    try {
        const senderId = getUserId(req);
        const receiverId = Number(req.params.userId);

        console.log("SEND FRIEND REQUEST:", {
            senderId,
            receiverId,
        });

        // -----------------------------------------------------
        // Validate receiver ID
        // -----------------------------------------------------

        if (!receiverId || Number.isNaN(receiverId)) {
            return res.status(400).json({
                success: false,
                message: "Valid user ID is required.",
            });
        }

        // -----------------------------------------------------
        // Prevent self request
        // -----------------------------------------------------

        if (senderId === receiverId) {
            return res.status(400).json({
                success: false,
                message: "You cannot send a friend request to yourself.",
            });
        }

        // -----------------------------------------------------
        // Check receiver exists
        // -----------------------------------------------------

        const [users] = await db.query(
            `
            SELECT id
            FROM users
            WHERE id = ?
            LIMIT 1
            `,
            [receiverId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found.",
            });
        }

        // -----------------------------------------------------
        // Check existing friendship
        // -----------------------------------------------------

        const [friendship] = await db.query(
            `
            SELECT id
            FROM friendships
            WHERE
                (
                    user_id = ?
                    AND friend_id = ?
                )
                OR
                (
                    user_id = ?
                    AND friend_id = ?
                )
            LIMIT 1
            `,
            [
                senderId,
                receiverId,
                receiverId,
                senderId,
            ]
        );

        if (friendship.length > 0) {
            return res.status(400).json({
                success: false,
                code: "ALREADY_FRIENDS",
                message: "You are already friends with this user.",
            });
        }

        // -----------------------------------------------------
        // Check pending request in BOTH directions
        // -----------------------------------------------------

        const [existingRequest] = await db.query(
            `
            SELECT
                id,
                sender_id,
                receiver_id,
                status
            FROM friend_requests
            WHERE
                (
                    (sender_id = ? AND receiver_id = ?)
                    OR
                    (sender_id = ? AND receiver_id = ?)
                )
                AND status = 'pending'
            ORDER BY id DESC
            LIMIT 1
            `,
            [
                senderId,
                receiverId,
                receiverId,
                senderId,
            ]
        );

        if (existingRequest.length > 0) {
            const request = existingRequest[0];

            // -------------------------------------------------
            // Other user already sent request to logged user
            // -------------------------------------------------

            if (
                Number(request.sender_id) === receiverId &&
                Number(request.receiver_id) === senderId
            ) {
                return res.status(400).json({
                    success: false,
                    code: "REQUEST_RECEIVED",
                    message:
                        "This user has already sent you a friend request. Please accept it.",
                });
            }

            // -------------------------------------------------
            // Logged user already sent request
            // -------------------------------------------------

            return res.status(400).json({
                success: false,
                code: "REQUEST_ALREADY_SENT",
                message: "Friend request already sent.",
            });
        }

        // -----------------------------------------------------
        // Create new friend request
        // -----------------------------------------------------

        const [result] = await db.query(
            `
            INSERT INTO friend_requests
            (
                sender_id,
                receiver_id,
                status
            )
            VALUES (?, ?, 'pending')
            `,
            [
                senderId,
                receiverId,
            ]
        );

        // -----------------------------------------------------
        // Create notification
        // -----------------------------------------------------

        try {
            await db.query(
                `
                INSERT INTO notifications
                (
                    user_id,
                    sender_id,
                    type,
                    friend_request_id,
                    message
                )
                VALUES (?, ?, 'friend_request', ?, ?)
                `,
                [
                    receiverId,
                    senderId,
                    result.insertId,
                    "You received a new friend request.",
                ]
            );
        } catch (notificationError) {
            // Friend request should not fail just because
            // notification creation has a schema problem.
            console.error(
                "Friend Request Notification Error:",
                notificationError
            );
        }

        return res.status(201).json({
            success: true,
            message: "Friend request sent successfully.",
            requestId: result.insertId,
        });

    } catch (error) {
        console.error("Send Friend Request Error:", error);

        // Handle duplicate database constraint safely
        if (
            error.code === "ER_DUP_ENTRY" ||
            error.code === "ER_DUP_ENTRY_WITH_KEY_NAME"
        ) {
            return res.status(400).json({
                success: false,
                code: "REQUEST_ALREADY_EXISTS",
                message: "Friend request already exists.",
            });
        }

        return res.status(500).json({
            success: false,
            message: "Unable to send friend request.",
        });
    }
};


// =========================================================
// GET RECEIVED FRIEND REQUESTS
// =========================================================

const getReceivedFriendRequests = async (req, res) => {
    try {
        const userId = getUserId(req);

        const [requests] = await db.query(
            `
            SELECT
                fr.id,
                fr.sender_id,
                fr.receiver_id,
                fr.status,
                fr.created_at,

                u.name AS sender_name,
                u.email AS sender_email

            FROM friend_requests fr

            INNER JOIN users u
                ON u.id = fr.sender_id

            WHERE fr.receiver_id = ?
              AND fr.status = 'pending'

            ORDER BY fr.created_at DESC
            `,
            [userId]
        );

        return res.status(200).json({
            success: true,
            requests,
        });

    } catch (error) {
        console.error(
            "Get Received Friend Requests Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Unable to load friend requests.",
        });
    }
};


// =========================================================
// GET SENT FRIEND REQUESTS
// =========================================================

const getSentFriendRequests = async (req, res) => {
    try {
        const userId = getUserId(req);

        const [requests] = await db.query(
            `
            SELECT
                fr.id,
                fr.sender_id,
                fr.receiver_id,
                fr.status,
                fr.created_at,

                u.name AS receiver_name,
                u.email AS receiver_email

            FROM friend_requests fr

            INNER JOIN users u
                ON u.id = fr.receiver_id

            WHERE fr.sender_id = ?

            ORDER BY fr.created_at DESC
            `,
            [userId]
        );

        return res.status(200).json({
            success: true,
            requests,
        });

    } catch (error) {
        console.error(
            "Get Sent Friend Requests Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Unable to load sent requests.",
        });
    }
};


// =========================================================
// ACCEPT FRIEND REQUEST
// =========================================================

const acceptFriendRequest = async (req, res) => {
    const connection = await db.getConnection();

    try {
        const userId = getUserId(req);
        const requestId = Number(req.params.requestId);

        if (!requestId || Number.isNaN(requestId)) {
            connection.release();

            return res.status(400).json({
                success: false,
                message: "Valid request ID is required.",
            });
        }

        await connection.beginTransaction();

        const [requests] = await connection.query(
            `
            SELECT
                id,
                sender_id,
                receiver_id,
                status
            FROM friend_requests
            WHERE id = ?
              AND receiver_id = ?
            LIMIT 1
            FOR UPDATE
            `,
            [
                requestId,
                userId,
            ]
        );

        if (requests.length === 0) {
            await connection.rollback();
            connection.release();

            return res.status(404).json({
                success: false,
                message: "Friend request not found.",
            });
        }

        const request = requests[0];

        if (request.status !== "pending") {
            await connection.rollback();
            connection.release();

            return res.status(400).json({
                success: false,
                message: "This friend request is no longer pending.",
            });
        }

        const senderId = Number(request.sender_id);

        // Update request
        await connection.query(
            `
            UPDATE friend_requests
            SET status = 'accepted'
            WHERE id = ?
            `,
            [requestId]
        );

        // Create friendship in both directions
        await connection.query(
            `
            INSERT IGNORE INTO friendships
            (
                user_id,
                friend_id
            )
            VALUES
            (?, ?),
            (?, ?)
            `,
            [
                senderId,
                userId,
                userId,
                senderId,
            ]
        );

        // Notification for sender
        try {
            await connection.query(
                `
                INSERT INTO notifications
                (
                    user_id,
                    sender_id,
                    type,
                    friend_request_id,
                    message
                )
                VALUES (?, ?, 'friend_accepted', ?, ?)
                `,
                [
                    senderId,
                    userId,
                    requestId,
                    "Your friend request was accepted.",
                ]
            );
        } catch (notificationError) {
            console.error(
                "Friend Accepted Notification Error:",
                notificationError
            );
        }

        await connection.commit();
        connection.release();

        return res.status(200).json({
            success: true,
            message: "Friend request accepted.",
        });

    } catch (error) {
        await connection.rollback();
        connection.release();

        console.error(
            "Accept Friend Request Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Unable to accept friend request.",
        });
    }
};


// =========================================================
// REJECT FRIEND REQUEST
// =========================================================

const rejectFriendRequest = async (req, res) => {
    try {
        const userId = getUserId(req);
        const requestId = Number(req.params.requestId);

        if (!requestId || Number.isNaN(requestId)) {
            return res.status(400).json({
                success: false,
                message: "Valid request ID is required.",
            });
        }

        const [result] = await db.query(
            `
            UPDATE friend_requests
            SET status = 'rejected'
            WHERE id = ?
              AND receiver_id = ?
              AND status = 'pending'
            `,
            [
                requestId,
                userId,
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Pending friend request not found.",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Friend request rejected.",
        });

    } catch (error) {
        console.error(
            "Reject Friend Request Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Unable to reject friend request.",
        });
    }
};


// =========================================================
// CANCEL SENT FRIEND REQUEST
// =========================================================

const cancelFriendRequest = async (req, res) => {
    try {
        const userId = getUserId(req);
        const requestId = Number(req.params.requestId);

        if (!requestId || Number.isNaN(requestId)) {
            return res.status(400).json({
                success: false,
                message: "Valid request ID is required.",
            });
        }

        const [result] = await db.query(
            `
            UPDATE friend_requests
            SET status = 'cancelled'
            WHERE id = ?
              AND sender_id = ?
              AND status = 'pending'
            `,
            [
                requestId,
                userId,
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Pending friend request not found.",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Friend request cancelled.",
        });

    } catch (error) {
        console.error(
            "Cancel Friend Request Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Unable to cancel friend request.",
        });
    }
};


// =========================================================
// GET FRIENDS
// =========================================================

const getFriends = async (req, res) => {
    try {
        const userId = Number(req.user.id);

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Invalid user.",
            });
        }

        const [friends] = await db.query(
            `
            SELECT
                u.id,
                u.name,
                u.email,
                f.created_at AS friendship_created_at
            FROM friendships f
            INNER JOIN users u
                ON u.id = f.friend_id
            WHERE f.user_id = ?
            ORDER BY u.name ASC
            `,
            [userId]
        );

        console.log("GET FRIENDS:", {
            userId,
            friends,
        });

        return res.status(200).json({
            success: true,
            friends,
            count: friends.length,
        });

    } catch (error) {
        console.error("Get Friends Error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to load friends.",
        });
    }
};


// =========================================================
// GET FRIEND COUNT
// =========================================================

const getFriendCount = async (req, res) => {
    try {
        const userId = getUserId(req);

        const [result] = await db.query(
            `
            SELECT COUNT(*) AS friend_count
            FROM friendships
            WHERE user_id = ?
            `,
            [userId]
        );

        return res.status(200).json({
            success: true,
            friend_count: Number(result[0].friend_count),
        });

    } catch (error) {
        console.error("Get Friend Count Error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to get friend count.",
        });
    }
};


// =========================================================
// FOLLOW USER
// =========================================================

const followUser = async (req, res) => {
    try {
        const followerId = getUserId(req);
        const followingId = Number(req.params.userId);

        if (!followingId || Number.isNaN(followingId)) {
            return res.status(400).json({
                success: false,
                message: "Valid user ID is required.",
            });
        }

        if (followerId === followingId) {
            return res.status(400).json({
                success: false,
                message: "You cannot follow yourself.",
            });
        }

        const [users] = await db.query(
            `
            SELECT id
            FROM users
            WHERE id = ?
            LIMIT 1
            `,
            [followingId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found.",
            });
        }

        const [existing] = await db.query(
            `
            SELECT id
            FROM follows
            WHERE follower_id = ?
              AND following_id = ?
            LIMIT 1
            `,
            [
                followerId,
                followingId,
            ]
        );

        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                message: "You are already following this user.",
            });
        }

        await db.query(
            `
            INSERT INTO follows
            (
                follower_id,
                following_id
            )
            VALUES (?, ?)
            `,
            [
                followerId,
                followingId,
            ]
        );

        try {
            await db.query(
                `
                INSERT INTO notifications
                (
                    user_id,
                    sender_id,
                    type,
                    message
                )
                VALUES (?, ?, 'follow', ?)
                `,
                [
                    followingId,
                    followerId,
                    "Someone started following you.",
                ]
            );
        } catch (notificationError) {
            console.error(
                "Follow Notification Error:",
                notificationError
            );
        }

        return res.status(201).json({
            success: true,
            message: "User followed successfully.",
        });

    } catch (error) {
        console.error("Follow User Error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to follow user.",
        });
    }
};


// =========================================================
// UNFOLLOW USER
// =========================================================

const unfollowUser = async (req, res) => {
    try {
        const followerId = getUserId(req);
        const followingId = Number(req.params.userId);

        if (!followingId || Number.isNaN(followingId)) {
            return res.status(400).json({
                success: false,
                message: "Valid user ID is required.",
            });
        }

        const [result] = await db.query(
            `
            DELETE FROM follows
            WHERE follower_id = ?
              AND following_id = ?
            `,
            [
                followerId,
                followingId,
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "You are not following this user.",
            });
        }

        return res.status(200).json({
            success: true,
            message: "User unfollowed successfully.",
        });

    } catch (error) {
        console.error("Unfollow User Error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to unfollow user.",
        });
    }
};


// =========================================================
// GET FOLLOWERS
// =========================================================

const getFollowers = async (req, res) => {
    try {
        const userId = getUserId(req);

        const [followers] = await db.query(
            `
            SELECT
                u.id,
                u.name,
                u.email,
                f.created_at AS followed_at

            FROM follows f

            INNER JOIN users u
                ON u.id = f.follower_id

            WHERE f.following_id = ?

            ORDER BY f.created_at DESC
            `,
            [userId]
        );

        return res.status(200).json({
            success: true,
            followers,
            count: followers.length,
        });

    } catch (error) {
        console.error("Get Followers Error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to load followers.",
        });
    }
};


// =========================================================
// GET FOLLOWING
// =========================================================

const getFollowing = async (req, res) => {
    try {
        const userId = getUserId(req);

        const [following] = await db.query(
            `
            SELECT
                u.id,
                u.name,
                u.email,
                f.created_at AS followed_at

            FROM follows f

            INNER JOIN users u
                ON u.id = f.following_id

            WHERE f.follower_id = ?

            ORDER BY f.created_at DESC
            `,
            [userId]
        );

        return res.status(200).json({
            success: true,
            following,
            count: following.length,
        });

    } catch (error) {
        console.error("Get Following Error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to load following list.",
        });
    }
};

// =========================================================
// GET SAVED POSTS
// =========================================================

const getSavedPosts = async (req, res) => {
    try {
        const userId = Number(getUserId(req));

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized.",
            });
        }

        const [posts] = await db.query(
            `
            SELECT
                p.id,
                p.user_id,
                p.content,
                p.media_type,
                p.privacy,
                p.created_at,

                u.name AS user_name,
                u.email AS user_email,

                COUNT(DISTINCT pl.id) AS likes_count,

                COUNT(
                    DISTINCT CASE
                        WHEN pc.deleted_at IS NULL
                        THEN pc.id
                    END
                ) AS comments_count,

                COUNT(DISTINCT ps2.id) AS shares_count,
                COUNT(DISTINCT psv.id) AS saves_count,

                TRUE AS is_saved,

                EXISTS (
                    SELECT 1
                    FROM post_likes pl2
                    WHERE pl2.post_id = p.id
                      AND pl2.user_id = ?
                ) AS is_liked

            FROM post_saves ps

            INNER JOIN posts p
                ON p.id = ps.post_id

            INNER JOIN users u
                ON u.id = p.user_id

            LEFT JOIN post_likes pl
                ON pl.post_id = p.id

            LEFT JOIN post_comments pc
                ON pc.post_id = p.id

            LEFT JOIN post_shares ps2
                ON ps2.post_id = p.id

            LEFT JOIN post_saves psv
                ON psv.post_id = p.id

            WHERE ps.user_id = ?
              AND p.deleted_at IS NULL

            GROUP BY
                p.id,
                p.user_id,
                p.content,
                p.media_type,
                p.privacy,
                p.created_at,
                u.name,
                u.email,
                ps.created_at

            ORDER BY ps.created_at DESC
            `,
            [
                userId,
                userId,
            ]
        );

        // Get media for saved posts
        if (posts.length > 0) {
            const postIds = posts.map(
                (post) => post.id
            );

            const [mediaRows] = await db.query(
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
                if (!mediaMap[media.post_id]) {
                    mediaMap[media.post_id] = [];
                }

                mediaMap[media.post_id].push(media);
            });

            posts.forEach((post) => {
                post.media =
                    mediaMap[post.id] || [];

                post.likes_count = Number(
                    post.likes_count || 0
                );

                post.comments_count = Number(
                    post.comments_count || 0
                );

                post.shares_count = Number(
                    post.shares_count || 0
                );

                post.saves_count = Number(
                    post.saves_count || 0
                );

                post.is_saved = true;
                post.is_liked =
                    Boolean(post.is_liked);
            });
        }

        return res.status(200).json({
            success: true,
            posts,
            count: posts.length,
        });

    } catch (error) {
        console.error(
            "Get Saved Posts Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Unable to load saved posts.",
        });
    }
};

// =========================================================
// GET NOTIFICATIONS
// =========================================================

const getNotifications = async (req, res) => {
    try {
        const userId = getUserId(req);

        const [notifications] = await db.query(
            `
            SELECT
                n.id,
                n.user_id,
                n.sender_id,
                n.type,
                n.post_id,
                n.comment_id,
                n.friend_request_id,
                n.message,
                n.is_read,
                n.created_at,

                u.name AS sender_name,
                u.email AS sender_email

            FROM notifications n

            LEFT JOIN users u
                ON u.id = n.sender_id

            WHERE n.user_id = ?

            ORDER BY n.created_at DESC
            LIMIT 50
            `,
            [userId]
        );

        return res.status(200).json({
            success: true,
            notifications,
            count: notifications.length,
        });

    } catch (error) {
        console.error("Get Notifications Error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to load notifications.",
        });
    }
};


// =========================================================
// GET UNREAD NOTIFICATION COUNT
// =========================================================

const getUnreadNotificationCount = async (req, res) => {
    try {
        const userId = getUserId(req);

        const [result] = await db.query(
            `
            SELECT COUNT(*) AS unread_count
            FROM notifications
            WHERE user_id = ?
              AND is_read = 0
            `,
            [userId]
        );

        return res.status(200).json({
            success: true,
            unread_count: Number(result[0].unread_count),
        });

    } catch (error) {
        console.error(
            "Get Unread Notification Count Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Unable to get unread notification count.",
        });
    }
};


// =========================================================
// MARK NOTIFICATION AS READ
// =========================================================

const markNotificationAsRead = async (req, res) => {
    try {
        const userId = getUserId(req);
        const notificationId = Number(req.params.notificationId);

        if (!notificationId || Number.isNaN(notificationId)) {
            return res.status(400).json({
                success: false,
                message: "Valid notification ID is required.",
            });
        }

        const [result] = await db.query(
            `
            UPDATE notifications
            SET is_read = 1
            WHERE id = ?
              AND user_id = ?
            `,
            [
                notificationId,
                userId,
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Notification not found.",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Notification marked as read.",
        });

    } catch (error) {
        console.error(
            "Mark Notification As Read Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Unable to mark notification as read.",
        });
    }
};


// =========================================================
// MARK ALL NOTIFICATIONS AS READ
// =========================================================

const markAllNotificationsAsRead = async (req, res) => {
    try {
        const userId = getUserId(req);

        const [result] = await db.query(
            `
            UPDATE notifications
            SET is_read = 1
            WHERE user_id = ?
              AND is_read = 0
            `,
            [userId]
        );

        return res.status(200).json({
            success: true,
            message: "All notifications marked as read.",
            updated: result.affectedRows,
        });

    } catch (error) {
        console.error(
            "Mark All Notifications As Read Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Unable to mark all notifications as read.",
        });
    }
};

// =========================================================
// EXPORTS
// =========================================================

module.exports = {
    searchUsers,

    sendFriendRequest,
    getReceivedFriendRequests,
    getSentFriendRequests,
    acceptFriendRequest,
    rejectFriendRequest,
    cancelFriendRequest,

    getFriends,
    getFriendCount,

    followUser,
    unfollowUser,
    getFollowers,
    getFollowing,

    getSavedPosts,

    getNotifications,
    getUnreadNotificationCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
};