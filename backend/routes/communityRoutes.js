const express = require("express");

const authenticateToken = require("../middleware/authMiddleware");

const {
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

} = require("../controllers/communityController");

const router = express.Router();

router.use(authenticateToken);

// User Search
router.get("/users/search", searchUsers);

// Friend Requests
router.post("/friends/request/:userId", sendFriendRequest);
router.get("/friends/requests/received", getReceivedFriendRequests);
router.get("/friends/requests/sent", getSentFriendRequests);

router.put(
    "/friends/requests/:requestId/accept",
    acceptFriendRequest
);

router.put(
    "/friends/requests/:requestId/reject",
    rejectFriendRequest
);

router.put(
    "/friends/requests/:requestId/cancel",
    cancelFriendRequest
);

// Friends
router.get("/friends", getFriends);
router.get("/friends/count", getFriendCount);

// Follow
router.post("/follow/:userId", followUser);
router.delete("/follow/:userId", unfollowUser);

router.get("/followers", getFollowers);
router.get("/following", getFollowing);

// Saved Posts

router.get("/posts/saved", getSavedPosts);

// =========================================================
// NOTIFICATIONS
// =========================================================

router.get("/notifications", getNotifications);
router.get(
    "/notifications/unread-count",
    getUnreadNotificationCount
);

router.put(
    "/notifications/:notificationId/read",
    markNotificationAsRead
);

router.put(
    "/notifications/read-all",
    markAllNotificationsAsRead
);

module.exports = router;