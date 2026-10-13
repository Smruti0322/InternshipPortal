import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Bell,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  Flag,
  Send,
  Image,
  Video,
  Search,
  UserPlus,
  UserCheck,
  Users,
  X,
  MoreHorizontal,
  LoaderCircle,
  Trash2,
} from "lucide-react";

import "./Community.css";

const API_BASE_URL = "http://localhost:5000";

function Community() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  // =========================================================
  // POSTS
  // =========================================================

  const [posts, setPosts] = useState([]);
  const [savedPosts, setSavedPosts] = useState([]);
  const [showSavedPosts, setShowSavedPosts] = useState(false);
  const [loadingSavedPosts, setLoadingSavedPosts] = useState(false);

  const [content, setContent] = useState("");
  const [privacy, setPrivacy] = useState("public");
  const [selectedFiles, setSelectedFiles] = useState([]);

  const [loading, setLoading] = useState(true);
  const [creatingPost, setCreatingPost] = useState(false);

  const [postingLimit, setPostingLimit] = useState({
    friendCount: 0,
    dailyLimit: 0,
    postsToday: 0,
    remainingPosts: 0,
    canPost: false,
  });

  // =========================================================
  // USER SEARCH
  // =========================================================

  const [searchText, setSearchText] = useState("");
  const [users, setUsers] = useState([]);
  const [searchingUsers, setSearchingUsers] = useState(false);

  const searchRequestRef = useRef(0);

  // =========================================================
  // MENTION
  // =========================================================

  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionUsers, setMentionUsers] = useState([]);
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);

  const mentionRequestRef = useRef(0);

  // =========================================================
  // COMMENTS
  // =========================================================

  const [comments, setComments] = useState({});
  const [commentText, setCommentText] = useState({});
  const [openComments, setOpenComments] = useState({});

  // =========================================================
  // FRIENDS
  // =========================================================

  const [friendRequests, setFriendRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [friends, setFriends] = useState([]);
  const [friendSection, setFriendSection] = useState(null);

  // =========================================================
  // FOLLOWERS & FOLLOWING
  // =========================================================

  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);

  const [peopleSection, setPeopleSection] = useState(null);

  const [followersLoading, setFollowersLoading] = useState(false);

  const [followingLoading, setFollowingLoading] = useState(false);

  // POST MENU / DELETE
  const [openPostMenu, setOpenPostMenu] = useState(null);
  const [deletePostId, setDeletePostId] = useState(null);
  const [deletingPost, setDeletingPost] = useState(false);

  // =========================================================
  // REPORT
  // =========================================================

  const [showReport, setShowReport] = useState(null);
  const [reportReason, setReportReason] = useState("spam");
  const [reportDescription, setReportDescription] = useState("");

  // =========================================================
  // MESSAGE
  // =========================================================

  const [actionMessage, setActionMessage] = useState("");

  const fileInputRef = useRef(null);

  // =========================================================
  // TOKEN
  // =========================================================

  const getToken = () => {
    return localStorage.getItem("token");
  };

  const getCurrentUserId = () => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "null");

      return user?.id || user?.user_id || null;
    } catch (error) {
      console.error("Get Current User Error:", error);
      return null;
    }
  };

  const currentUserId = getCurrentUserId();

  // =========================================================
  // MESSAGE HELPER
  // =========================================================

  const showMessage = (message) => {
    setActionMessage(message);

    setTimeout(() => {
      setActionMessage("");
    }, 3000);
  };

  // =========================================================
  // UNAUTHORIZED
  // =========================================================

  const handleUnauthorized = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    window.location.href = "/login";
  };

  // =========================================================
  // SAFE JSON RESPONSE
  // =========================================================

  const getResponseData = async (response) => {
    const contentType = response.headers.get("content-type") || "";

    if (!contentType.toLowerCase().includes("application/json")) {
      const text = await response.text();

      console.error("Expected JSON but received:", text.substring(0, 300));

      return {
        success: false,
        message: t("community.serverUnavailable"),
      };
    }

    try {
      return await response.json();
    } catch (error) {
      console.error("JSON Parse Error:", error);

      return {
        success: false,
        message: t("community.unableReadResponse"),
      };
    }
  };

  // =========================================================
  // AUTH HEADERS
  // =========================================================

  const getAuthHeaders = () => {
    const token = getToken();

    return {
      Authorization: token ? `Bearer ${token}` : "",
    };
  };

  // =========================================================
  // NOTIFICATIONS
  // =========================================================

  const [notifications, setNotifications] = useState([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  const loadNotifications = async () => {
    try {
      const token = getToken();

      if (!token) {
        handleUnauthorized();
        return;
      }

      setNotificationsLoading(true);

      const response = await fetch(
        `${API_BASE_URL}/api/community/notifications`,
        {
          headers: getAuthHeaders(),
        },
      );

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await getResponseData(response);

      if (!response.ok || !data.success) {
        throw new Error(data.message || t("community.unableLoadNotifications"));
      }

      setNotifications(
        Array.isArray(data.notifications) ? data.notifications : [],
      );
    } catch (error) {
      console.error("Load Notifications Error:", error);
    } finally {
      setNotificationsLoading(false);
    }
  };

  const loadUnreadNotificationCount = async () => {
    try {
      const token = getToken();

      if (!token) {
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/api/community/notifications/unread-count`,
        {
          headers: getAuthHeaders(),
        },
      );

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await getResponseData(response);

      if (!response.ok || !data.success) {
        return;
      }

      setUnreadNotificationCount(Number(data.unread_count) || 0);
    } catch (error) {
      console.error("Load Unread Notification Count Error:", error);
    }
  };

  const markNotificationAsRead = async (notificationId) => {
    try {
      const token = getToken();

      if (!token) {
        handleUnauthorized();
        return;
      }

      const notification = notifications.find(
        (item) => Number(item.id) === Number(notificationId),
      );

      const wasUnread = notification && Number(notification.is_read) === 0;

      const response = await fetch(
        `${API_BASE_URL}/api/community/notifications/${notificationId}/read`,
        {
          method: "PUT",
          headers: getAuthHeaders(),
        },
      );

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await getResponseData(response);

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || t("community.unableMarkNotificationRead"),
        );
      }

      setNotifications((prev) =>
        prev.map((item) =>
          Number(item.id) === Number(notificationId)
            ? {
                ...item,
                is_read: 1,
              }
            : item,
        ),
      );

      if (wasUnread) {
        setUnreadNotificationCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Mark Notification As Read Error:", error);
    }
  };

  const markAllNotificationsAsRead = async () => {
    try {
      const token = getToken();

      if (!token) {
        handleUnauthorized();
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/api/community/notifications/read-all`,
        {
          method: "PUT",
          headers: getAuthHeaders(),
        },
      );

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await getResponseData(response);

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || t("community.unableMarkNotificationsRead"),
        );
      }

      setNotifications((prev) =>
        prev.map((notification) => ({
          ...notification,
          is_read: 1,
        })),
      );

      setUnreadNotificationCount(0);
    } catch (error) {
      console.error("Mark All Notifications As Read Error:", error);
    }
  };

  // =========================================================
  // LOAD POSTS
  // =========================================================

  const loadPosts = async () => {
    try {
      setLoading(true);

      const token = getToken();

      if (!token) {
        setPosts([]);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/posts`, {
        headers: getAuthHeaders(),
      });

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await getResponseData(response);

      if (response.ok) {
        setPosts(Array.isArray(data.posts) ? data.posts : []);
      } else {
        console.error(data.message);
      }
    } catch (error) {
      console.error("Load Posts Error:", error);
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // LOAD POSTING LIMIT
  // =========================================================

  const loadPostingLimit = async () => {
    try {
      const token = getToken();

      if (!token) {
        setPostingLimit({
          friendCount: 0,
          dailyLimit: 0,
          postsToday: 0,
          remainingPosts: 0,
          canPost: false,
        });
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/posts/posting-limit`, {
        headers: getAuthHeaders(),
      });

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await getResponseData(response);

      if (!response.ok) {
        console.error("Posting Limit Error:", data.message);
        return;
      }

      setPostingLimit({
        friendCount: Number(data.friend_count || 0),

        dailyLimit:
          data.daily_limit === null ? null : Number(data.daily_limit || 0),

        postsToday: Number(data.posts_today || 0),

        remainingPosts:
          data.remaining_posts === null
            ? null
            : Number(data.remaining_posts || 0),

        canPost: Boolean(data.can_post),
      });
    } catch (error) {
      console.error("Load Posting Limit Error:", error);
    }
  };

  // =========================================================
  // HASHTAG FILTER
  // =========================================================

  const handleHashtagClick = async (hashtag) => {
    try {
      const cleanHashtag = String(hashtag || "")
        .replace(/^#/, "")
        .trim();

      if (!cleanHashtag) {
        return;
      }

      setLoading(true);

      const token = getToken();

      if (!token) {
        handleUnauthorized();
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/api/posts?hashtag=${encodeURIComponent(cleanHashtag)}`,
        {
          headers: getAuthHeaders(),
        },
      );

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await getResponseData(response);

      if (response.ok) {
        setPosts(Array.isArray(data.posts) ? data.posts : []);
      } else {
        showMessage(data.message || t("community.unableLoadHashtag"));
      }
    } catch (error) {
      console.error("Hashtag Filter Error:", error);

      showMessage(t("community.unableLoadHashtag"));
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // LOAD SAVED POSTS
  // =========================================================

  const loadSavedPosts = async () => {
    try {
      setLoadingSavedPosts(true);

      const token = getToken();

      if (!token) {
        handleUnauthorized();
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/api/community/posts/saved`,
        {
          headers: getAuthHeaders(),
        },
      );

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await getResponseData(response);

      console.log("SAVED POSTS API RESPONSE:", data);

      if (!response.ok) {
        console.error("Saved Posts API Error:", data);
        return;
      }

      setSavedPosts(data?.posts || []);
    } catch (error) {
      console.error("Load Saved Posts Error:", error);
    } finally {
      setLoadingSavedPosts(false);
    }
  };

  // =========================================================
  // LOAD RECEIVED FRIEND REQUESTS
  // =========================================================

  const loadFriendRequests = async () => {
    try {
      const token = getToken();

      if (!token) return;

      const response = await fetch(
        `${API_BASE_URL}/api/community/friends/requests/received`,
        {
          headers: getAuthHeaders(),
        },
      );

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await getResponseData(response);

      if (response.ok) {
        setFriendRequests(data.requests || []);
      } else {
        console.error("Friend Request Error:", data.message);
      }
    } catch (error) {
      console.error("Load Friend Requests Error:", error);
    }
  };

  // =========================================================
  // LOAD SENT FRIEND REQUESTS
  // =========================================================

  const loadSentRequests = async () => {
    try {
      const token = getToken();

      if (!token) return;

      const response = await fetch(
        `${API_BASE_URL}/api/community/friends/requests/sent`,
        {
          headers: getAuthHeaders(),
        },
      );

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await getResponseData(response);

      if (response.ok) {
        setSentRequests(data.requests || []);
      } else {
        console.error("Sent Request Error:", data.message);
      }
    } catch (error) {
      console.error("Load Sent Requests Error:", error);
    }
  };

  // =========================================================
  // LOAD FRIENDS
  // =========================================================

  const loadFriends = async () => {
    try {
      const token = getToken();

      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/api/community/friends`, {
        headers: getAuthHeaders(),
      });

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await getResponseData(response);

      if (response.ok) {
        setFriends(data.friends || []);
      } else {
        console.error("Friends Error:", data.message);
      }
    } catch (error) {
      console.error("Load Friends Error:", error);
    }
  };

  // =========================================================
  // LOAD FOLLOWERS
  // =========================================================

  const loadFollowers = async () => {
    try {
      const token = getToken();

      if (!token) {
        handleUnauthorized();
        return;
      }

      setFollowersLoading(true);

      const response = await fetch(`${API_BASE_URL}/api/community/followers`, {
        headers: getAuthHeaders(),
      });

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await getResponseData(response);

      if (response.ok && data.success) {
        setFollowers(Array.isArray(data.followers) ? data.followers : []);
      } else {
        console.error("Followers Error:", data.message);
      }
    } catch (error) {
      console.error("Load Followers Error:", error);
    } finally {
      setFollowersLoading(false);
    }
  };

  // =========================================================
  // LOAD FOLLOWING
  // =========================================================

  const loadFollowing = async () => {
    try {
      const token = getToken();

      if (!token) {
        handleUnauthorized();
        return;
      }

      setFollowingLoading(true);

      const response = await fetch(`${API_BASE_URL}/api/community/following`, {
        headers: getAuthHeaders(),
      });

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await getResponseData(response);

      if (response.ok && data.success) {
        setFollowing(Array.isArray(data.following) ? data.following : []);
      } else {
        console.error("Following Error:", data.message);
      }
    } catch (error) {
      console.error("Load Following Error:", error);
    } finally {
      setFollowingLoading(false);
    }
  };

  // =========================================================
  // INITIAL LOAD
  // =========================================================

  useEffect(() => {
    loadPosts();
    loadPostingLimit();
    loadFriendRequests();
    loadSentRequests();
    loadFriends();
    loadFollowers();
    loadFollowing();
    loadUnreadNotificationCount();

    const interval = setInterval(() => {
      loadUnreadNotificationCount();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // =========================================================
  // AUTOMATIC USER SEARCH
  // =========================================================

  useEffect(() => {
    const query = searchText.trim();

    if (!query) {
      searchRequestRef.current += 1;
      setUsers([]);
      setSearchingUsers(false);
      return;
    }

    const timer = setTimeout(() => {
      handleUserSearch(query);
    }, 400);

    return () => {
      clearTimeout(timer);
    };
  }, [searchText]);

  // =========================================================
  // HANDLE POST CONTENT CHANGE
  // =========================================================

  const handlePostContentChange = (event) => {
    const value = event.target.value;

    setContent(value);

    const cursorPosition = event.target.selectionStart;

    const textBeforeCursor = value.slice(0, cursorPosition);

    const match = textBeforeCursor.match(/(?:^|\s)@([a-zA-Z0-9_.-]*)$/);

    if (!match) {
      setMentionQuery("");
      setMentionUsers([]);
      setShowMentionSuggestions(false);
      return;
    }

    const query = match[1];

    setMentionQuery(query);

    if (!query) {
      setMentionUsers([]);
      setShowMentionSuggestions(false);
      return;
    }

    handleMentionSearch(query);
  };

  // =========================================================
  // SELECT @MENTION USER
  // =========================================================

  const handleSelectMention = (user) => {
    const textarea = document.getElementById("community-post-content");

    if (!textarea) {
      return;
    }

    const cursorPosition = textarea.selectionStart;

    const textBeforeCursor = content.slice(0, cursorPosition);

    const textAfterCursor = content.slice(cursorPosition);

    const match = textBeforeCursor.match(/(?:^|\s)@([a-zA-Z0-9_.-]*)$/);

    if (!match) {
      return;
    }

    const mentionStart = textBeforeCursor.lastIndexOf(`@${match[1]}`);

    const username = user.username || user.user_name || user.name;

    if (!username) {
      return;
    }

    const newBeforeCursor = textBeforeCursor.slice(0, mentionStart);

    const newContent = `${newBeforeCursor}@${username} ${textAfterCursor}`;

    setContent(newContent);

    setMentionQuery("");
    setMentionUsers([]);
    setShowMentionSuggestions(false);

    setTimeout(() => {
      textarea.focus();

      const newCursorPosition = newBeforeCursor.length + username.length + 2;

      textarea.setSelectionRange(newCursorPosition, newCursorPosition);
    }, 0);
  };

  // =========================================================
  // CREATE POST
  // =========================================================

  const handleCreatePost = async (event) => {
    event.preventDefault();

    if (!content.trim() && selectedFiles.length === 0) {
      showMessage(t("community.writeOrSelect"));
      return;
    }

    if (!postingLimit.canPost) {
      if (postingLimit.dailyLimit === 0) {
        showMessage(t("community.needFriendToast"));
      } else {
        showMessage(t("community.dailyLimitToast"));
      }

      return;
    }

    try {
      setCreatingPost(true);

      const token = getToken();

      if (!token) {
        handleUnauthorized();
        return;
      }

      const formData = new FormData();

      formData.append("content", content.trim());

      formData.append("privacy", privacy);

      selectedFiles.forEach((file) => {
        formData.append("media", file);
      });

      const response = await fetch(`${API_BASE_URL}/api/posts`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: formData,
      });

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await getResponseData(response);

      if (!response.ok) {
        showMessage(data.message || t("community.unableCreate"));
        return;
      }

      setContent("");
      setSelectedFiles([]);
      setPrivacy("public");

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      if (data.remaining_posts !== null && data.remaining_posts !== undefined) {
        if (data.remaining_posts === 0) {
          showMessage(t("community.publishedLimit"));
        } else {
          showMessage(
            `${t("community.published")} ${data.remaining_posts} ${
              data.remaining_posts === 1
                ? t("community.posts")
                : t("community.postsPlural")
            } ${t("community.availableToday")}.`,
          );
        }
      } else {
        showMessage(t("community.postCreated"));
      }

      await loadPosts();
      await loadPostingLimit();
    } catch (error) {
      console.error("Create Post Error:", error);

      showMessage(t("community.unableCreate"));
    } finally {
      setCreatingPost(false);
    }
  };

  // =========================================================
  // FILE SELECT
  // =========================================================

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files || []);

    if (files.length > 10) {
      showMessage(t("community.maxFiles"));

      event.target.value = "";
      return;
    }

    setSelectedFiles(files);
  };

  // =========================================================
  // LIKE
  // =========================================================

  const handleLike = async (post) => {
    try {
      const token = getToken();

      if (!token) {
        handleUnauthorized();
        return;
      }

      const method = post.is_liked ? "DELETE" : "POST";

      const response = await fetch(
        `${API_BASE_URL}/api/posts/${post.id}/like`,
        {
          method,
          headers: getAuthHeaders(),
        },
      );

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (response.ok) {
        setPosts((currentPosts) =>
          currentPosts.map((item) =>
            Number(item.id) === Number(post.id)
              ? {
                  ...item,
                  is_liked: !item.is_liked,
                  likes_count: item.is_liked
                    ? Math.max(Number(item.likes_count) - 1, 0)
                    : Number(item.likes_count) + 1,
                }
              : item,
          ),
        );

        loadUnreadNotificationCount();
      }
    } catch (error) {
      console.error("Like Error:", error);
    }
  };

  // =========================================================
  // SAVE
  // =========================================================

  const handleSave = async (post) => {
    try {
      const token = getToken();

      if (!token) {
        handleUnauthorized();
        return false;
      }

      const method = post.is_saved ? "DELETE" : "POST";

      const response = await fetch(
        `${API_BASE_URL}/api/posts/${post.id}/save`,
        {
          method,
          headers: getAuthHeaders(),
        },
      );

      if (response.status === 401) {
        handleUnauthorized();
        return false;
      }

      if (response.ok) {
        setPosts((currentPosts) =>
          currentPosts.map((item) =>
            Number(item.id) === Number(post.id)
              ? {
                  ...item,
                  is_saved: !item.is_saved,
                  saves_count: item.is_saved
                    ? Math.max(Number(item.saves_count) - 1, 0)
                    : Number(item.saves_count) + 1,
                }
              : item,
          ),
        );

        return true;
      }

      return false;
    } catch (error) {
      console.error("Save Error:", error);

      return false;
    }
  };

  // =========================================================
  // COMMENTS
  // =========================================================

  const loadComments = async (postId) => {
    try {
      const token = getToken();

      if (!token) {
        handleUnauthorized();
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/api/posts/${postId}/comments`,
        {
          headers: getAuthHeaders(),
        },
      );

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await getResponseData(response);

      if (!response.ok) {
        console.error(
          "Load Comments Error:",
          data?.message || t("community.unableComment"),
        );
        return;
      }

      const loadedComments = Array.isArray(data.comments) ? data.comments : [];

      setComments((current) => ({
        ...current,
        [postId]: loadedComments,
      }));

      setPosts((currentPosts) =>
        currentPosts.map((post) =>
          Number(post.id) === Number(postId)
            ? {
                ...post,
                comments_count: loadedComments.length,
              }
            : post,
        ),
      );
    } catch (error) {
      console.error("Load Comments Error:", error);
    }
  };

  const toggleComments = async (postId) => {
    const isOpen = openComments[postId];

    setOpenComments((current) => ({
      ...current,
      [postId]: !isOpen,
    }));

    if (!isOpen) {
      await loadComments(postId);
    }
  };

  const handleComment = async (postId) => {
    const text = commentText[postId]?.trim();

    if (!text) return;

    try {
      const token = getToken();

      if (!token) {
        handleUnauthorized();
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/api/posts/${postId}/comments`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
          body: JSON.stringify({
            content: text,
          }),
        },
      );

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await getResponseData(response);

      if (!response.ok) {
        showMessage(data?.message || t("community.unableComment"));
        return;
      }

      setCommentText((current) => ({
        ...current,
        [postId]: "",
      }));

      await loadComments(postId);
      await loadUnreadNotificationCount();
    } catch (error) {
      console.error("Comment Error:", error);

      showMessage(error.message || t("community.unableComment"));
    }
  };

  // =========================================================
  // DELETE COMMENT
  // =========================================================

  const handleDeleteComment = async (postId, commentId) => {
    try {
      const token = getToken();

      if (!token) {
        handleUnauthorized();
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/api/posts/${postId}/comments/${commentId}`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        },
      );

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await getResponseData(response);

      if (!response.ok) {
        throw new Error(data?.message || t("community.unableDeleteComment"));
      }

      setComments((current) => ({
        ...current,
        [postId]: (current[postId] || []).filter(
          (comment) => Number(comment.id) !== Number(commentId),
        ),
      }));

      setPosts((currentPosts) =>
        currentPosts.map((post) =>
          Number(post.id) === Number(postId)
            ? {
                ...post,
                comments_count: Math.max(
                  Number(post.comments_count || 0) - 1,
                  0,
                ),
              }
            : post,
        ),
      );

      showMessage(t("community.commentDeleted"));
    } catch (error) {
      console.error("Delete Comment Error:", error);

      showMessage(error.message || t("community.unableDeleteComment"));
    }
  };

  // =========================================================
  // SHARE
  // =========================================================

  const handleShare = async (post) => {
    try {
      const token = getToken();

      if (!token) {
        handleUnauthorized();
        return;
      }

      const shareUrl = `${window.location.origin}/community?post=${post.id}`;

      let shareCompleted = false;

      if (navigator.share && typeof navigator.share === "function") {
        try {
          await navigator.share({
            title: t("community.shareTitle"),
            text: post.content || t("community.shareText"),
            url: shareUrl,
          });

          shareCompleted = true;
        } catch (shareError) {
          if (shareError?.name === "AbortError") {
            return;
          }

          console.error("Native Share Error:", shareError);
        }
      }

      if (!shareCompleted) {
        if (
          navigator.clipboard &&
          typeof navigator.clipboard.writeText === "function"
        ) {
          try {
            await navigator.clipboard.writeText(shareUrl);

            shareCompleted = true;

            showMessage(t("community.copied"));
          } catch (clipboardError) {
            console.error("Clipboard Error:", clipboardError);
          }
        }
      }

      if (!shareCompleted) {
        window.prompt(t("community.copyLink"), shareUrl);

        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/api/posts/${post.id}/share`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
          body: JSON.stringify({
            share_type: "external",
          }),
        },
      );

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await getResponseData(response);

      if (!response.ok) {
        showMessage(data?.message || t("community.unableShareCount"));
        return;
      }

      setPosts((currentPosts) =>
        currentPosts.map((item) =>
          Number(item.id) === Number(post.id)
            ? {
                ...item,
                shares_count: Number(
                  data.shares_count ?? item.shares_count ?? 0,
                ),
              }
            : item,
        ),
      );

      await loadUnreadNotificationCount();

      showMessage(t("community.shared"));
    } catch (error) {
      console.error("Share Error:", error);

      showMessage(t("community.unableShare"));
    }
  };

  // =========================================================
  // REPORT
  // =========================================================

  const handleReport = async () => {
    if (!showReport) return;

    try {
      const token = getToken();

      if (!token) {
        handleUnauthorized();
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/api/posts/${showReport}/report`,
        {
          method: "POST",
          headers: {
            ...getAuthHeaders(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reason: reportReason || "other",
            description: reportDescription.trim(),
          }),
        },
      );

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await getResponseData(response);

      if (!response.ok) {
        console.error("Report API Error:", data);

        showMessage(
          data.message || `${t("community.unableReport")} (${response.status})`,
        );

        return;
      }

      setShowReport(null);
      setReportDescription("");
      setReportReason("spam");

      showMessage(data.message || t("community.reported"));
    } catch (error) {
      console.error("Report Error:", error);

      showMessage(t("community.unableReport"));
    }
  };

  // =========================================================
  // DELETE POST
  // =========================================================

  const handleDeletePost = async (postId) => {
    try {
      const token = getToken();

      if (!token) {
        handleUnauthorized();
        return;
      }

      setDeletingPost(true);

      const response = await fetch(`${API_BASE_URL}/api/posts/${postId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await getResponseData(response);

      if (response.ok) {
        setPosts((currentPosts) =>
          currentPosts.filter((post) => Number(post.id) !== Number(postId)),
        );

        setSavedPosts((currentPosts) =>
          currentPosts.filter((post) => Number(post.id) !== Number(postId)),
        );

        setOpenPostMenu(null);
        setDeletePostId(null);

        await loadPostingLimit();

        showMessage(t("community.postDeleted"));
      } else {
        showMessage(data.message || t("community.unableDelete"));
      }
    } catch (error) {
      console.error("Delete Post Error:", error);

      showMessage(t("community.unableDelete"));
    } finally {
      setDeletingPost(false);
    }
  };

  // =========================================================
  // SEARCH USERS
  // =========================================================

  const handleUserSearch = async (query = searchText) => {
    const searchQuery = query.trim();

    const requestId = ++searchRequestRef.current;

    if (!searchQuery) {
      setUsers([]);
      setSearchingUsers(false);
      return;
    }

    try {
      setSearchingUsers(true);

      const token = getToken();

      if (!token) {
        handleUnauthorized();
        return;
      }

      const url = `${API_BASE_URL}/api/community/users/search?search=${encodeURIComponent(
        searchQuery,
      )}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          ...getAuthHeaders(),
        },
      });

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await getResponseData(response);

      if (requestId !== searchRequestRef.current) {
        return;
      }

      if (response.ok) {
        setUsers(Array.isArray(data.users) ? data.users : []);
      } else {
        setUsers([]);

        console.error("User Search Error:", data.message);
      }
    } catch (error) {
      if (requestId === searchRequestRef.current) {
        console.error("User Search Error:", error);

        setUsers([]);
      }
    } finally {
      if (requestId === searchRequestRef.current) {
        setSearchingUsers(false);
      }
    }
  };

  // =========================================================
  // SEARCH USERS FOR @MENTION
  // =========================================================

  const handleMentionSearch = async (query) => {
    const searchQuery = query.trim();

    const requestId = ++mentionRequestRef.current;

    if (!searchQuery) {
      setMentionUsers([]);
      setShowMentionSuggestions(false);
      return;
    }

    try {
      const token = getToken();

      if (!token) {
        handleUnauthorized();
        return;
      }

      setShowMentionSuggestions(true);

      const response = await fetch(
        `${API_BASE_URL}/api/community/users/search?search=${encodeURIComponent(
          searchQuery,
        )}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            ...getAuthHeaders(),
          },
        },
      );

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await getResponseData(response);

      if (requestId !== mentionRequestRef.current) {
        return;
      }

      if (response.ok) {
        setMentionUsers(
          Array.isArray(data.users) ? data.users.slice(0, 5) : [],
        );
      } else {
        setMentionUsers([]);
      }
    } catch (error) {
      if (requestId === mentionRequestRef.current) {
        console.error("Mention Search Error:", error);

        setMentionUsers([]);
      }
    }
  };

  // =========================================================
  // GET USER FRIEND STATUS
  // =========================================================

  const getFriendStatus = (userId) => {
    const numericId = Number(userId);

    const isFriend = friends.some((friend) => Number(friend.id) === numericId);

    if (isFriend) {
      return "friends";
    }

    const receivedRequest = friendRequests.some(
      (request) =>
        Number(request.sender_id) === numericId && request.status === "pending",
    );

    if (receivedRequest) {
      return "received";
    }

    const sentRequest = sentRequests.find(
      (request) =>
        Number(request.receiver_id) === numericId &&
        request.status === "pending",
    );

    if (sentRequest) {
      return "sent";
    }

    return "none";
  };

  // =========================================================
  // GET FOLLOW STATUS
  // =========================================================

  const isFollowingUser = (userId) => {
    return following.some((item) => Number(item.id) === Number(userId));
  };

  // =========================================================
  // SEND FRIEND REQUEST
  // =========================================================

  const sendFriendRequest = async (userId) => {
    try {
      const receiverId = Number(userId);

      if (!receiverId) {
        showMessage(t("community.invalidUser"));
        return;
      }

      const token = getToken();

      if (!token) {
        handleUnauthorized();
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/api/community/friends/request/${receiverId}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        },
      );

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await getResponseData(response);

      if (response.ok) {
        showMessage(data.message || t("community.friendRequestSent"));

        await Promise.all([
          loadFriendRequests(),
          loadSentRequests(),
          loadFriends(),
        ]);

        await loadUnreadNotificationCount();

        await handleUserSearchIfNeeded();
      } else {
        showMessage(data.message || t("community.unableFriendRequest"));
      }
    } catch (error) {
      console.error("Send Friend Request Error:", error);

      showMessage(t("community.serverUnavailable"));
    }
  };

  // =========================================================
  // ACCEPT REQUEST
  // =========================================================

  const acceptRequest = async (requestId) => {
    try {
      const token = getToken();

      if (!token) {
        handleUnauthorized();
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/api/community/friends/requests/${requestId}/accept`,
        {
          method: "PUT",
          headers: getAuthHeaders(),
        },
      );

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await getResponseData(response);

      if (!response.ok) {
        showMessage(data.message || t("community.unableAccept"));
        return;
      }

      showMessage(t("community.friendAccepted"));

      await Promise.all([
        loadFriendRequests(),
        loadSentRequests(),
        loadFriends(),
      ]);

      await loadPostingLimit();
      await loadUnreadNotificationCount();

      await handleUserSearchIfNeeded();
    } catch (error) {
      console.error("Accept Request Error:", error);

      showMessage(t("community.unableAccept"));
    }
  };

  // =========================================================
  // REJECT REQUEST
  // =========================================================

  const rejectRequest = async (requestId) => {
    try {
      const token = getToken();

      if (!token) {
        handleUnauthorized();
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/api/community/friends/requests/${requestId}/reject`,
        {
          method: "PUT",
          headers: getAuthHeaders(),
        },
      );

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await getResponseData(response);

      if (!response.ok) {
        showMessage(data.message || t("community.unableReject"));
        return;
      }

      showMessage(t("community.friendRejected"));

      await loadFriendRequests();
      await handleUserSearchIfNeeded();
    } catch (error) {
      console.error("Reject Request Error:", error);

      showMessage(t("community.unableReject"));
    }
  };

  // =========================================================
  // CANCEL SENT REQUEST
  // =========================================================

  const cancelRequest = async (requestId) => {
    try {
      const token = getToken();

      if (!token) {
        handleUnauthorized();
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/api/community/friends/requests/${requestId}/cancel`,
        {
          method: "PUT",
          headers: getAuthHeaders(),
        },
      );

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await getResponseData(response);

      if (!response.ok) {
        showMessage(data.message || t("community.unableCancel"));
        return;
      }

      showMessage(t("community.friendCancelled"));

      await loadSentRequests();
      await handleUserSearchIfNeeded();
    } catch (error) {
      console.error("Cancel Request Error:", error);

      showMessage(t("community.unableCancel"));
    }
  };

  // =========================================================
  // REFRESH SEARCH RESULTS
  // =========================================================

  const handleUserSearchIfNeeded = async () => {
    if (searchText.trim()) {
      await handleUserSearch(searchText);
    }
  };

  // =========================================================
  // FOLLOW
  // =========================================================

  const handleFollow = async (userId) => {
    try {
      const token = getToken();

      if (!token) {
        handleUnauthorized();
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/api/community/follow/${userId}`,
        {
          method: "POST",
          headers: getAuthHeaders(),
        },
      );

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await getResponseData(response);

      if (!response.ok) {
        showMessage(data.message || t("community.unableFollow"));
        return;
      }

      showMessage(t("community.nowFollowing"));

      await loadFollowing();
      await loadUnreadNotificationCount();

      setUsers((currentUsers) =>
        currentUsers.map((user) =>
          Number(user.id) === Number(userId)
            ? {
                ...user,
                isFollowing: true,
              }
            : user,
        ),
      );
    } catch (error) {
      console.error("Follow Error:", error);

      showMessage(t("community.unableFollow"));
    }
  };

  // =========================================================
  // UNFOLLOW
  // =========================================================

  const handleUnfollow = async (userId) => {
    try {
      const token = getToken();

      if (!token) {
        handleUnauthorized();
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/api/community/follow/${userId}`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        },
      );

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await getResponseData(response);

      if (!response.ok) {
        showMessage(data.message || t("community.unableUnfollow"));
        return;
      }

      showMessage(t("community.userUnfollowed"));

      await loadFollowing();

      setUsers((currentUsers) =>
        currentUsers.map((user) =>
          Number(user.id) === Number(userId)
            ? {
                ...user,
                isFollowing: false,
              }
            : user,
        ),
      );
    } catch (error) {
      console.error("Unfollow Error:", error);

      showMessage(t("community.unableUnfollow"));
    }
  };

  // =========================================================
  // TOGGLE FRIEND SECTION
  // =========================================================

  const toggleFriendSection = async (section) => {
    if (friendSection === section) {
      setFriendSection(null);
      return;
    }

    setFriendSection(section);
    setPeopleSection(null);
    setShowSavedPosts(false);

    if (section === "friends") {
      await loadFriends();
    }

    if (section === "requests") {
      await loadFriendRequests();
    }
  };

  // =========================================================
  // TOGGLE FOLLOWERS / FOLLOWING SECTION
  // =========================================================

  const togglePeopleSection = async (section) => {
    if (peopleSection === section) {
      setPeopleSection(null);
      return;
    }

    setFriendSection(null);
    setShowSavedPosts(false);

    setPeopleSection(section);

    if (section === "followers") {
      await loadFollowers();
    }

    if (section === "following") {
      await loadFollowing();
    }
  };

  // =========================================================
  // NOTIFICATION HELPERS
  // =========================================================

  const getNotificationIcon = (type) => {
    switch (type) {
      case "friend_request":
        return <UserPlus size={18} />;

      case "friend_accepted":
        return <UserCheck size={18} />;

      case "like":
        return <Heart size={18} />;

      case "comment":
      case "reply":
        return <MessageCircle size={18} />;

      case "share":
        return <Share2 size={18} />;

      case "follow":
        return <Users size={18} />;

      case "mention":
        return <MessageCircle size={18} />;

      default:
        return <Bell size={18} />;
    }
  };

  const getNotificationText = (notification) => {
    const senderName = notification.sender_name || t("community.user");

    switch (notification.type) {
      case "friend_request":
        return t("community.friendRequestNotification", { senderName });

      case "friend_accepted":
        return t("community.friendAcceptedNotification", { senderName });

      case "like":
        return t("community.likeNotification", { senderName });

      case "comment":
        return t("community.commentNotification", { senderName });

      case "reply":
        return t("community.replyNotification", { senderName });

      case "share":
        return t("community.shareNotification", { senderName });

      case "follow":
        return t("community.followNotification", { senderName });

      case "mention":
        return t("community.mentionNotification", { senderName });

      case "system":
        return notification.message || t("community.newNotification");

      default:
        return notification.message || t("community.newNotification");
    }
  };

  // =========================================================
  // NOTIFICATION CLICK ACTION
  // =========================================================

  const handleNotificationClick = async (notification) => {
    try {
      if (Number(notification.is_read) === 0) {
        await markNotificationAsRead(notification.id);
      }

      const type = notification.type;

      if (type === "friend_request") {
        setShowNotifications(false);
        setPeopleSection(null);
        setFriendSection("requests");

        await loadFriendRequests();
        return;
      }

      if (type === "friend_accepted") {
        setShowNotifications(false);
        setPeopleSection(null);
        setFriendSection("friends");

        await loadFriends();
        return;
      }

      if (
        type === "like" ||
        type === "comment" ||
        type === "reply" ||
        type === "share" ||
        type === "mention"
      ) {
        if (notification.post_id) {
          setShowNotifications(false);

          await loadPosts();

          setTimeout(() => {
            const postElement = document.getElementById(
              `community-post-${notification.post_id}`,
            );

            if (postElement) {
              postElement.scrollIntoView({
                behavior: "smooth",
                block: "center",
              });

              postElement.classList.add("notification-post-highlight");

              setTimeout(() => {
                postElement.classList.remove("notification-post-highlight");
              }, 2000);
            }
          }, 150);

          if (type === "comment" || type === "reply") {
            setOpenComments((current) => ({
              ...current,
              [notification.post_id]: true,
            }));

            await loadComments(notification.post_id);
          }
        }

        return;
      }

      if (type === "follow") {
        setShowNotifications(false);
        return;
      }

      if (type === "system") {
        setShowNotifications(false);
      }
    } catch (error) {
      console.error("Notification Click Error:", error);
    }
  };

  // =========================================================
  // FORMAT DATE
  // =========================================================

  const formatDate = (date) => {
    if (!date) return "";

    return new Date(date).toLocaleString();
  };

  // =========================================================
  // RENDER
  // =========================================================

  const friendCount = friends.length;

  return (
    <div className="community-page">
      {/* BACK TO HOME */}

      <div className="community-top-bar">
        <button
          type="button"
          className="back-home-btn"
          onClick={() => navigate("/")}
        >
          {t("community.backHome")}
        </button>
      </div>

      {/* ACTION MESSAGE */}

      {actionMessage && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            zIndex: 9999,
            padding: "12px 18px",
            borderRadius: "10px",
            background: "#1f2937",
            color: "#ffffff",
            boxShadow: "0 8px 25px rgba(0,0,0,0.18)",
            fontSize: "14px",
            maxWidth: "360px",
          }}
        >
          {actionMessage}
        </div>
      )}

      {/* HEADER */}

      <header className="community-header">
        <div>
          <h1>{t("community.publicSpace")}</h1>

          <p>{t("community.communityDescription")}</p>
        </div>

        <div className="community-header-stats">
          {/* NOTIFICATIONS */}

          <div className="notification-wrapper">
            <button
              type="button"
              className={`community-stat notification-button ${
                showNotifications ? "stat-active" : ""
              }`}
              onClick={() => {
                const nextState = !showNotifications;

                setShowNotifications(nextState);

                if (nextState) {
                  loadNotifications();
                }
              }}
              title={t("community.notifications")}
            >
              <Bell size={18} />

              <span>{t("community.notifications")}</span>

              {unreadNotificationCount > 0 && (
                <span className="notification-badge">
                  {unreadNotificationCount > 99
                    ? "99+"
                    : unreadNotificationCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="notification-panel">
                <div className="notification-panel-header">
                  <div>
                    <h3>{t("community.notifications")}</h3>

                    <span>
                      {unreadNotificationCount > 0
                        ? `${unreadNotificationCount} ${t("community.unread")}`
                        : t("community.caughtUp")}
                    </span>
                  </div>

                  <div className="notification-header-actions">
                    {unreadNotificationCount > 0 && (
                      <button
                        type="button"
                        className="mark-all-read-button"
                        onClick={markAllNotificationsAsRead}
                      >
                        {t("community.markAllRead")}
                      </button>
                    )}

                    <button
                      type="button"
                      className="close-button"
                      onClick={() => setShowNotifications(false)}
                      aria-label={t("community.closeNotifications")}
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>

                {notificationsLoading ? (
                  <div className="notification-empty">
                    <LoaderCircle size={25} className="spin" />

                    <p>{t("community.loadingNotifications")}</p>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="notification-empty">
                    <Bell size={32} />

                    <h4>{t("community.noNotifications")}</h4>

                    <p>{t("community.newNotification")}</p>
                  </div>
                ) : (
                  <div className="notification-list">
                    {notifications.map((notification) => (
                      <button
                        type="button"
                        key={notification.id}
                        className={`notification-item ${
                          Number(notification.is_read) === 0
                            ? "notification-unread"
                            : ""
                        }`}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="notification-icon">
                          {getNotificationIcon(notification.type)}
                        </div>

                        <div className="notification-content">
                          <strong>
                            {notification.sender_name || "Internship Portal"}
                          </strong>

                          <p>{getNotificationText(notification)}</p>

                          <span>{formatDate(notification.created_at)}</span>
                        </div>

                        {Number(notification.is_read) === 0 && (
                          <span className="notification-unread-dot" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* FRIENDS */}

          <button
            type="button"
            className={`community-stat ${
              friendSection === "friends" ? "stat-active" : ""
            }`}
            onClick={() => toggleFriendSection("friends")}
          >
            <Users size={18} />

            <span>
              {friendCount} {t("community.friends")}
            </span>
          </button>

          {/* REQUESTS */}

          <button
            type="button"
            className={`community-stat ${
              friendSection === "requests" ? "stat-active" : ""
            }`}
            onClick={() => toggleFriendSection("requests")}
          >
            <UserPlus size={18} />

            <span>
              {friendRequests.length} {t("community.friendRequests")}
            </span>
          </button>

          {/* FOLLOWERS */}

          <button
            type="button"
            className={`community-stat ${
              peopleSection === "followers" ? "stat-active" : ""
            }`}
            onClick={() => togglePeopleSection("followers")}
          >
            <Users size={18} />

            <span>
              {followers.length} {t("community.followersLabel")}
            </span>
          </button>

          {/* FOLLOWING */}

          <button
            type="button"
            className={`community-stat ${
              peopleSection === "following" ? "stat-active" : ""
            }`}
            onClick={() => togglePeopleSection("following")}
          >
            <UserCheck size={18} />

            <span>
              {following.length} {t("community.following")}
            </span>
          </button>

          {/* SAVED */}

          <button
            type="button"
            className={`community-stat ${showSavedPosts ? "stat-active" : ""}`}
            onClick={() => {
              const nextState = !showSavedPosts;

              setShowSavedPosts(nextState);

              if (nextState) {
                setFriendSection(null);
                setPeopleSection(null);
                loadSavedPosts();
              }
            }}
          >
            <Bookmark size={18} />

            <span>{t("community.savedPosts")}</span>
          </button>
        </div>
      </header>

      {/* FRIEND POPUP PANEL */}

      {friendSection && (
        <div className="friend-panel">
          <div className="friend-panel-header">
            <div>
              <h3>
                {friendSection === "friends"
                  ? t("community.myFriends")
                  : t("community.friendRequests")}
              </h3>

              <span>
                {friendSection === "friends"
                  ? `${friendCount} ${t("community.friends")}`
                  : `${friendRequests.length} ${t("community.friendRequests")}`}
              </span>
            </div>

            <button
              type="button"
              className="close-button"
              onClick={() => setFriendSection(null)}
              aria-label={t("community.close")}
            >
              <X size={18} />
            </button>
          </div>

          {/* FRIENDS */}

          {friendSection === "friends" &&
            (friends.length === 0 ? (
              <div className="friend-panel-empty">
                <Users size={30} />

                <p>{t("community.noFriendsYet")}</p>

                <small>{t("community.friendSearchHint")}</small>
              </div>
            ) : (
              <div className="friend-panel-list">
                {friends.map((friend) => (
                  <div className="friend-panel-item" key={friend.id}>
                    <div className="user-avatar">
                      {friend.name?.charAt(0)?.toUpperCase()}
                    </div>

                    <div>
                      <strong>{friend.name}</strong>

                      <span>{friend.email}</span>
                    </div>

                    <UserCheck size={20} className="friend-check-icon" />
                  </div>
                ))}
              </div>
            ))}

          {/* REQUESTS */}

          {friendSection === "requests" &&
            (friendRequests.length === 0 ? (
              <div className="friend-panel-empty">
                <UserPlus size={30} />

                <p>{t("community.noPendingRequests")}</p>

                <small>{t("community.newRequestsAppear")}</small>
              </div>
            ) : (
              <div className="friend-panel-list">
                {friendRequests.map((request) => (
                  <div
                    className="friend-panel-item request-panel-item"
                    key={request.id}
                  >
                    <div className="user-avatar">
                      {request.sender_name?.charAt(0)?.toUpperCase()}
                    </div>

                    <div className="friend-panel-user">
                      <strong>{request.sender_name}</strong>

                      <span>{request.sender_email}</span>

                      <div className="panel-request-actions">
                        <button
                          type="button"
                          className="small-primary"
                          onClick={() => acceptRequest(request.id)}
                        >
                          {t("community.accept")}
                        </button>

                        <button
                          type="button"
                          className="small-secondary"
                          onClick={() => rejectRequest(request.id)}
                        >
                          {t("community.reject")}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
        </div>
      )}

      {/* FOLLOWERS / FOLLOWING PANEL */}

      {peopleSection && (
        <div className="friend-panel community-people-panel">
          <div className="friend-panel-header">
            <div>
              <h3>
                {peopleSection === "followers"
                  ? t("community.followersLabel")
                  : t("community.following")}
              </h3>

              <span>
                {peopleSection === "followers"
                  ? `${followers.length} ${t("community.followersLabel")}`
                  : `${following.length} ${t("community.following")}`}
              </span>
            </div>

            <button
              type="button"
              className="close-button"
              onClick={() => setPeopleSection(null)}
              aria-label={t("community.close")}
            >
              <X size={18} />
            </button>
          </div>

          {/* FOLLOWERS */}

          {peopleSection === "followers" &&
            (followersLoading ? (
              <div className="friend-panel-empty">
                <LoaderCircle size={28} className="spin" />

                <p>{t("community.loadingFollowers")}</p>
              </div>
            ) : followers.length === 0 ? (
              <div className="friend-panel-empty">
                <Users size={30} />

                <p>{t("community.noFollowers")}</p>

                <small>{t("community.followersAppear")}</small>
              </div>
            ) : (
              <div className="friend-panel-list">
                {followers.map((follower) => (
                  <div
                    className="friend-panel-item community-person-item"
                    key={follower.id}
                  >
                    <div className="user-avatar">
                      {follower.name?.charAt(0)?.toUpperCase() || "U"}
                    </div>

                    <div className="friend-panel-user">
                      <strong>{follower.name}</strong>

                      <span>{follower.email}</span>
                    </div>

                    {Number(follower.id) !== Number(currentUserId) &&
                      (isFollowingUser(follower.id) ? (
                        <button
                          type="button"
                          className="user-status-button following-status"
                          onClick={() => handleUnfollow(follower.id)}
                          title={t("community.unfollow")}
                        >
                          <UserCheck size={17} />

                          <span>{t("community.following")}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="user-status-button follow-status"
                          onClick={() => handleFollow(follower.id)}
                          title={t("community.follow")}
                        >
                          <UserPlus size={17} />

                          <span>{t("community.follow")}</span>
                        </button>
                      ))}
                  </div>
                ))}
              </div>
            ))}

          {/* FOLLOWING */}

          {peopleSection === "following" &&
            (followingLoading ? (
              <div className="friend-panel-empty">
                <LoaderCircle size={28} className="spin" />

                <p>{t("community.loadingFollowing")}</p>
              </div>
            ) : following.length === 0 ? (
              <div className="friend-panel-empty">
                <UserCheck size={30} />

                <p>{t("community.notFollowing")}</p>

                <small>{t("community.followSearchHint")}</small>
              </div>
            ) : (
              <div className="friend-panel-list">
                {following.map((user) => (
                  <div
                    className="friend-panel-item community-person-item"
                    key={user.id}
                  >
                    <div className="user-avatar">
                      {user.name?.charAt(0)?.toUpperCase() || "U"}
                    </div>

                    <div className="friend-panel-user">
                      <strong>{user.name}</strong>

                      <span>{user.email}</span>
                    </div>

                    {Number(user.id) !== Number(currentUserId) && (
                      <button
                        type="button"
                        className="user-status-button following-status"
                        onClick={() => handleUnfollow(user.id)}
                        title={t("community.unfollow")}
                      >
                        <UserCheck size={17} />

                        <span>{t("community.following")}</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ))}
        </div>
      )}

      {/* MAIN LAYOUT */}

      <div className="community-layout">
        {/* LEFT SIDEBAR */}

        <aside className="community-sidebar">
          {/* COMMUNITY CARD */}

          <div className="community-card">
            <h3>{t("community.title")}</h3>

            <p>{t("community.communitySubtitle")}</p>
          </div>

          {/* POSTING ACCESS */}

          <div className="community-card">
            <div className="card-title-row">
              <h3>{t("community.postingAccess")}</h3>

              <span
                className="count-badge"
                title={t("community.acceptedFriends")}
              >
                {postingLimit.friendCount}
              </span>
            </div>

            {postingLimit.dailyLimit === 0 ? (
              <p className="empty-text">{t("community.needFriendToPost")}</p>
            ) : postingLimit.dailyLimit === null ? (
              <p className="empty-text">✓ {t("community.unlimitedPosts")}</p>
            ) : (
              <p className="empty-text">
                {postingLimit.remainingPosts}{" "}
                {postingLimit.remainingPosts === 1
                  ? t("community.posts")
                  : t("community.postsPlural")}{" "}
                {t("community.remainingToday")}
              </p>
            )}
          </div>

          {/* FRIEND REQUESTS */}

          <div className="community-card">
            <div className="card-title-row">
              <h3>{t("community.friendRequests")}</h3>

              <span className="count-badge">{friendRequests.length}</span>
            </div>

            {friendRequests.length === 0 ? (
              <p className="empty-text">{t("community.noPendingRequests")}</p>
            ) : (
              <div className="request-list">
                {friendRequests.map((request) => (
                  <div className="request-item" key={request.id}>
                    <div className="user-avatar">
                      {request.sender_name?.charAt(0)?.toUpperCase()}
                    </div>

                    <div className="request-info">
                      <strong>{request.sender_name}</strong>

                      <div className="request-actions">
                        <button
                          type="button"
                          className="small-primary"
                          onClick={() => acceptRequest(request.id)}
                        >
                          {t("community.accept")}
                        </button>

                        <button
                          type="button"
                          className="small-secondary"
                          onClick={() => rejectRequest(request.id)}
                        >
                          {t("community.reject")}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* FIND PEOPLE */}

          <div className="community-card">
            <h3>{t("community.findPeople")}</h3>

            <div className="search-box">
              <Search size={18} />

              <input
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();

                    handleUserSearch();
                  }
                }}
                placeholder={t("community.searchPeople")}
              />

              {searchingUsers && <LoaderCircle size={17} className="spin" />}
            </div>

            {users.length > 0 && (
              <div className="search-results">
                {users.map((user) => {
                  const status = getFriendStatus(user.id);

                  const followingUser = isFollowingUser(user.id);

                  return (
                    <div className="search-user" key={user.id}>
                      <div className="user-avatar">
                        {user.name?.charAt(0)?.toUpperCase()}
                      </div>

                      <div className="search-user-info">
                        <strong>{user.name}</strong>

                        <span>{user.email}</span>
                      </div>

                      {/* FRIEND STATUS */}

                      {status === "friends" && (
                        <button
                          type="button"
                          className="user-status-button friends-status"
                          title={t("community.alreadyFriends")}
                          disabled
                        >
                          <UserCheck size={17} />

                          <span>{t("community.friends")}</span>
                        </button>
                      )}

                      {status === "sent" && (
                        <button
                          type="button"
                          className="user-status-button sent-status"
                          title={t("community.cancelFriendRequest")}
                          onClick={() => {
                            const request = sentRequests.find(
                              (item) =>
                                Number(item.receiver_id) === Number(user.id) &&
                                item.status === "pending",
                            );

                            if (request) {
                              cancelRequest(request.id);
                            }
                          }}
                        >
                          <UserCheck size={17} />

                          <span>{t("community.requestSent")}</span>
                        </button>
                      )}

                      {status === "received" && (
                        <button
                          type="button"
                          className="user-status-button add-friend-status"
                          onClick={() => {
                            const request = friendRequests.find(
                              (item) =>
                                Number(item.sender_id) === Number(user.id),
                            );

                            if (request) {
                              acceptRequest(request.id);
                            }
                          }}
                        >
                          <UserCheck size={17} />

                          <span>{t("community.accept")}</span>
                        </button>
                      )}

                      {status === "none" && (
                        <button
                          type="button"
                          className="user-status-button add-friend-status"
                          title={t("community.sendFriendRequest")}
                          onClick={() => sendFriendRequest(user.id)}
                        >
                          <UserPlus size={17} />

                          <span>{t("community.add")}</span>
                        </button>
                      )}

                      {/* FOLLOW */}

                      {followingUser ? (
                        <button
                          type="button"
                          className="user-status-button following-status"
                          title={t("community.unfollow")}
                          onClick={() => handleUnfollow(user.id)}
                        >
                          <UserCheck size={17} />

                          <span>{t("community.following")}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="user-status-button follow-status"
                          title={t("community.follow")}
                          onClick={() => handleFollow(user.id)}
                        >
                          <UserPlus size={17} />

                          <span>{t("community.follow")}</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {searchText.trim() && !searchingUsers && users.length === 0 && (
              <p className="empty-text search-empty">
                {t("community.noUsersFound")}
              </p>
            )}
          </div>

          {/* MY FRIENDS */}

          <div className="community-card">
            <div className="card-title-row">
              <h3>{t("community.myFriends")}</h3>

              <span className="count-badge">{friendCount}</span>
            </div>

            {friends.length === 0 ? (
              <p className="empty-text">{t("community.noFriendsYet")}</p>
            ) : (
              <div className="mini-friends-list">
                {friends.slice(0, 5).map((friend) => (
                  <div className="mini-friend" key={friend.id}>
                    <div className="user-avatar small">
                      {friend.name?.charAt(0)?.toUpperCase()}
                    </div>

                    <div>
                      <strong>{friend.name}</strong>

                      <span>{t("community.friend")}</span>
                    </div>
                  </div>
                ))}

                {friends.length > 5 && (
                  <button
                    type="button"
                    className="view-friends-button"
                    onClick={() => toggleFriendSection("friends")}
                  >
                    {t("community.viewAllFriends")}
                  </button>
                )}
              </div>
            )}
          </div>
        </aside>

        {/* FEED */}

        <main className="community-feed">
          {/* CREATE POST */}

          <form className="create-post-card" onSubmit={handleCreatePost}>
            <div className="create-post-header">
              <div className="user-avatar large">
                {JSON.parse(localStorage.getItem("user") || "null")
                  ?.name?.charAt(0)
                  ?.toUpperCase() || "U"}
              </div>

              <div>
                <h3>{t("community.createPost")}</h3>

                <span>{t("community.shareWithCommunity")}</span>
              </div>
            </div>

            {/* POSTING LIMIT STATUS */}

            {postingLimit.dailyLimit === 0 ? (
              <div
                style={{
                  padding: "12px 14px",
                  marginBottom: "12px",
                  borderRadius: "10px",
                  background: "#fff7ed",
                  border: "1px solid #fed7aa",
                  color: "#9a3412",
                  fontSize: "14px",
                  lineHeight: "1.5",
                }}
              >
                <strong>{t("community.postingLocked")}</strong>{" "}
                {t("community.needFriendToPost")}
                <br />
                <span>
                  {t("community.youCurrentlyHave")}{" "}
                  <strong>{postingLimit.friendCount}</strong>{" "}
                  {postingLimit.friendCount === 1
                    ? t("community.acceptedFriend")
                    : t("community.acceptedFriends")}
                  .
                </span>
              </div>
            ) : postingLimit.dailyLimit !== null &&
              postingLimit.remainingPosts === 0 ? (
              <div
                style={{
                  padding: "12px 14px",
                  marginBottom: "12px",
                  borderRadius: "10px",
                  background: "#fff7ed",
                  border: "1px solid #fed7aa",
                  color: "#9a3412",
                  fontSize: "14px",
                  lineHeight: "1.5",
                }}
              >
                <strong>{t("community.dailyLimitReached")}</strong>
                <br />
                {t("community.usedAll")}{" "}
                <strong>{postingLimit.dailyLimit}</strong>{" "}
                {postingLimit.dailyLimit === 1
                  ? t("community.posts")
                  : t("community.postsPlural")}{" "}
                {t("community.availableToday")}.
                <br />
                <span>{t("community.resetTomorrow")}</span>
              </div>
            ) : postingLimit.dailyLimit === null ? (
              <div
                style={{
                  padding: "10px 14px",
                  marginBottom: "12px",
                  borderRadius: "10px",
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  color: "#166534",
                  fontSize: "13px",
                }}
              >
                ✓ {t("community.youCurrentlyHave")}{" "}
                <strong>{postingLimit.friendCount}</strong>{" "}
                {postingLimit.friendCount === 1
                  ? t("community.acceptedFriend")
                  : t("community.acceptedFriends")}
                .
                <br />
                <strong>{t("community.unlimitedPosts")}</strong>{" "}
                {t("community.areAvailableToYou")}.
              </div>
            ) : (
              <div
                style={{
                  padding: "10px 14px",
                  marginBottom: "12px",
                  borderRadius: "10px",
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  color: "#166534",
                  fontSize: "13px",
                }}
              >
                ✓ {t("community.youCurrentlyHave")}{" "}
                <strong>{postingLimit.friendCount}</strong>{" "}
                {postingLimit.friendCount === 1
                  ? t("community.acceptedFriend")
                  : t("community.acceptedFriends")}
                .
                <br />
                <strong>{postingLimit.remainingPosts}</strong>{" "}
                {postingLimit.remainingPosts === 1
                  ? t("community.posts")
                  : t("community.postsPlural")}{" "}
                {t("community.remainingToday")}.
              </div>
            )}

            {/* CONTENT */}

            <textarea
              id="community-post-content"
              value={content}
              onChange={handlePostContentChange}
              placeholder={
                postingLimit.canPost
                  ? t("community.whatsOnYourMind")
                  : t("community.postingUnavailable")
              }
              rows={4}
              disabled={!postingLimit.canPost || creatingPost}
            />

            {/* @MENTION SUGGESTIONS */}

            {showMentionSuggestions && mentionUsers.length > 0 && (
              <div className="mention-suggestions">
                {mentionUsers.map((user) => (
                  <button
                    type="button"
                    className="mention-suggestion"
                    key={user.id}
                    onMouseDown={(event) => {
                      event.preventDefault();

                      handleSelectMention(user);
                    }}
                  >
                    <div className="mention-avatar">
                      {(user.name || user.username || user.user_name || "U")
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    <div className="mention-user-info">
                      <strong>
                        {user.name ||
                          user.username ||
                          user.user_name ||
                          t("community.user")}
                      </strong>

                      {(user.username || user.user_name) && (
                        <span>@{user.username || user.user_name}</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* SELECTED FILES */}

            {selectedFiles.length > 0 && (
              <div className="selected-files">
                {selectedFiles.map((file, index) => (
                  <div className="selected-file" key={`${file.name}-${index}`}>
                    {file.type.startsWith("image/") ? (
                      <Image size={18} />
                    ) : (
                      <Video size={18} />
                    )}

                    <span>{file.name}</span>

                    <button
                      type="button"
                      onClick={() =>
                        setSelectedFiles((current) =>
                          current.filter((_, i) => i !== index),
                        )
                      }
                      disabled={creatingPost}
                    >
                      <X size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* FOOTER */}

            <div className="create-post-footer">
              <div className="post-tools">
                <button
                  type="button"
                  className="post-tool"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!postingLimit.canPost || creatingPost}
                >
                  <Image size={19} />
                  {t("community.photoVideo")}
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  hidden
                  multiple
                  accept="image/*,video/*"
                  onChange={handleFileSelect}
                  disabled={!postingLimit.canPost || creatingPost}
                />

                <select
                  value={privacy}
                  onChange={(event) => setPrivacy(event.target.value)}
                  className="privacy-select"
                  disabled={!postingLimit.canPost || creatingPost}
                >
                  <option value="public">{t("community.public")}</option>

                  <option value="friends">{t("community.friends")}</option>
                </select>
              </div>

              <button
                className="publish-button"
                type="submit"
                disabled={creatingPost || !postingLimit.canPost}
              >
                {creatingPost ? (
                  <>
                    <LoaderCircle size={18} className="spin" />

                    {t("community.posting")}
                  </>
                ) : (
                  <>
                    <Send size={18} />

                    {t("community.post")}
                  </>
                )}
              </button>
            </div>
          </form>

          {/* SAVED POSTS */}

          {showSavedPosts && (
            <section className="saved-posts-section">
              <div className="saved-posts-header">
                <div>
                  <h2>{t("community.savedPosts")}</h2>

                  <p>{t("community.savedPostsSubtitle")}</p>
                </div>

                <button
                  type="button"
                  className="close-saved-btn"
                  onClick={() => setShowSavedPosts(false)}
                >
                  <X size={18} />
                </button>
              </div>

              {loadingSavedPosts ? (
                <div className="saved-posts-loading">
                  <LoaderCircle size={22} className="spin" />

                  <span>{t("community.loadingSavedPosts")}</span>
                </div>
              ) : savedPosts.length === 0 ? (
                <div className="saved-posts-empty">
                  <Bookmark size={32} />

                  <h3>{t("community.noSavedPosts")}</h3>

                  <p>{t("community.savedPostsAppear")}</p>
                </div>
              ) : (
                <div className="saved-posts-list">
                  {savedPosts.map((post) => (
                    <article key={post.id} className="saved-post-card">
                      <div className="saved-post-user">
                        <div className="saved-post-avatar">
                          {post.user_name?.charAt(0)?.toUpperCase() || "U"}
                        </div>

                        <div>
                          <strong>
                            {post.user_name || t("community.user")}
                          </strong>

                          <span>
                            {post.created_at
                              ? new Date(post.created_at).toLocaleString()
                              : ""}
                          </span>
                        </div>
                      </div>

                      {post.content && (
                        <p className="saved-post-content">{post.content}</p>
                      )}

                      {post.media?.length > 0 && (
                        <div
                          className={`post-media-grid media-${Math.min(
                            post.media.length,
                            4,
                          )}`}
                        >
                          {post.media.map((media) => (
                            <div className="media-item" key={media.id}>
                              {media.media_type === "image" ? (
                                <img
                                  src={`${API_BASE_URL}${media.media_url}`}
                                  alt={
                                    media.original_name ||
                                    t("community.savedPostMedia")
                                  }
                                />
                              ) : (
                                <video
                                  src={`${API_BASE_URL}${media.media_url}`}
                                  controls
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="saved-post-stats">
                        <span>
                          {Number(post.likes_count || 0)} {t("community.likes")}
                        </span>

                        <span>
                          {Number(post.comments_count || 0)}{" "}
                          {t("community.comments")}
                        </span>

                        <span>
                          {Number(post.saves_count || 0)} {t("community.saves")}
                        </span>
                      </div>

                      <div className="saved-post-footer">
                        <button
                          type="button"
                          className="post-action active"
                          onClick={async () => {
                            const success = await handleSave(post);

                            if (success) {
                              setSavedPosts((current) =>
                                current.filter(
                                  (item) => Number(item.id) !== Number(post.id),
                                ),
                              );
                            }
                          }}
                        >
                          <Bookmark size={18} fill="currentColor" />

                          {t("community.unsave")}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* NORMAL POSTS */}

          {!showSavedPosts && (
            <>
              {loading ? (
                <div className="feed-loading">
                  <LoaderCircle size={30} className="spin" />

                  <p>{t("community.loadingPosts")}</p>
                </div>
              ) : posts.length === 0 ? (
                <div className="empty-feed">
                  <div className="empty-icon">
                    <MessageCircle size={32} />
                  </div>

                  <h3>{t("community.noPosts")}</h3>

                  <p>
                    {postingLimit.dailyLimit === 0
                      ? t("community.needFriendToPost")
                      : postingLimit.dailyLimit !== null &&
                          postingLimit.remainingPosts === 0
                        ? t("community.dailyLimitReached")
                        : t("community.newActivity")}
                  </p>
                </div>
              ) : (
                <div className="posts-list">
                  {posts.map((post) => (
                    <article
                      className="post-card"
                      id={`community-post-${post.id}`}
                      key={post.id}
                    >
                      {/* POST HEADER */}

                      <div className="post-header">
                        <div className="post-user">
                          <div className="user-avatar">
                            {post.user_name?.charAt(0)?.toUpperCase()}
                          </div>

                          <div>
                            <strong>{post.user_name}</strong>

                            <span>{formatDate(post.created_at)}</span>
                          </div>
                        </div>

                        <div className="post-menu">
                          <button
                            type="button"
                            className="icon-action"
                            title={t("community.reportPostMenu")}
                            onClick={() => setShowReport(post.id)}
                          >
                            <Flag size={18} />
                          </button>

                          {Number(post.user_id) === Number(currentUserId) && (
                            <div className="post-menu-wrapper">
                              <button
                                type="button"
                                className="icon-action"
                                title={t("community.moreOptions")}
                                onClick={() =>
                                  setOpenPostMenu((current) =>
                                    Number(current) === Number(post.id)
                                      ? null
                                      : post.id,
                                  )
                                }
                              >
                                <MoreHorizontal size={19} />
                              </button>

                              {Number(openPostMenu) === Number(post.id) && (
                                <div className="post-menu-dropdown">
                                  {Number(post.user_id) ===
                                  Number(currentUserId) ? (
                                    <button
                                      type="button"
                                      className="post-menu-item delete-item"
                                      onClick={() => {
                                        setOpenPostMenu(null);
                                        setDeletePostId(post.id);
                                      }}
                                    >
                                      <Trash2 size={16} />
                                      <span>{t("community.deletePost")}</span>
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      className="post-menu-item report-item"
                                      onClick={() => {
                                        setOpenPostMenu(null);
                                        setShowReport(post.id);
                                        setReportReason("spam");
                                        setReportDescription("");
                                      }}
                                    >
                                      <Flag size={16} />
                                      <span>
                                        {t("community.reportPostMenu")}
                                      </span>
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* POST CONTENT */}

                      {post.content && (
                        <div className="post-content">
                          <p>{post.content}</p>

                          {/* FIXED HASHTAGS */}

                          {Array.isArray(post.hashtags) &&
                            post.hashtags.length > 0 && (
                              <div className="post-hashtags">
                                {post.hashtags.map((hashtag) => {
                                  const hashtagName =
                                    typeof hashtag === "string"
                                      ? hashtag
                                      : hashtag?.name;

                                  if (!hashtagName) {
                                    return null;
                                  }

                                  const hashtagKey =
                                    typeof hashtag === "string"
                                      ? hashtagName
                                      : hashtag?.id || hashtagName;

                                  return (
                                    <button
                                      type="button"
                                      key={hashtagKey}
                                      className="post-hashtag"
                                      onClick={() =>
                                        handleHashtagClick(hashtagName)
                                      }
                                    >
                                      #{hashtagName}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                        </div>
                      )}

                      {/* MEDIA */}

                      {post.media?.length > 0 && (
                        <div
                          className={`post-media-grid media-${Math.min(
                            post.media.length,
                            4,
                          )}`}
                        >
                          {post.media.map((media) => (
                            <div className="media-item" key={media.id}>
                              {media.media_type === "image" ? (
                                <img
                                  src={`${API_BASE_URL}${media.media_url}`}
                                  alt={
                                    media.original_name ||
                                    t("community.postMedia")
                                  }
                                />
                              ) : (
                                <video
                                  src={`${API_BASE_URL}${media.media_url}`}
                                  controls
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* POST STATS */}

                      <div className="post-stats">
                        <span>
                          {Number(post.likes_count || 0)} {t("community.likes")}
                        </span>

                        <span>
                          {Number(post.comments_count || 0)}{" "}
                          {t("community.comments")}
                        </span>

                        <span>
                          {Number(post.shares_count || 0)}{" "}
                          {t("community.shares")}
                        </span>
                      </div>

                      {/* ACTIONS */}

                      <div className="post-actions">
                        <button
                          type="button"
                          className={
                            post.is_liked ? "post-action active" : "post-action"
                          }
                          onClick={() => handleLike(post)}
                        >
                          <Heart
                            size={19}
                            fill={post.is_liked ? "currentColor" : "none"}
                          />

                          {post.is_liked
                            ? t("community.unlike")
                            : t("community.like")}
                        </button>

                        <button
                          type="button"
                          className="post-action"
                          onClick={() => toggleComments(post.id)}
                        >
                          <MessageCircle size={19} />

                          {t("community.comment")}
                        </button>

                        <button
                          type="button"
                          className="post-action"
                          onClick={() => handleShare(post)}
                        >
                          <Share2 size={19} />

                          {t("community.share")}
                        </button>

                        <button
                          type="button"
                          className={
                            post.is_saved ? "post-action active" : "post-action"
                          }
                          onClick={() => handleSave(post)}
                        >
                          <Bookmark
                            size={19}
                            fill={post.is_saved ? "currentColor" : "none"}
                          />

                          {post.is_saved
                            ? t("community.unsave")
                            : t("community.save")}
                        </button>
                      </div>

                      {/* COMMENTS */}

                      {openComments[post.id] && (
                        <div className="comments-section">
                          <div className="comment-input">
                            <input
                              value={commentText[post.id] || ""}
                              onChange={(event) =>
                                setCommentText((current) => ({
                                  ...current,
                                  [post.id]: event.target.value,
                                }))
                              }
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  event.preventDefault();

                                  handleComment(post.id);
                                }
                              }}
                              placeholder={t("community.writeComment")}
                            />

                            <button
                              type="button"
                              onClick={() => handleComment(post.id)}
                            >
                              <Send size={18} />
                            </button>
                          </div>

                          <div className="comments-list">
                            {comments[post.id]?.length === 0 ? (
                              <p className="empty-text">
                                {t("community.noComments")}
                              </p>
                            ) : (
                              comments[post.id]?.map((comment) => (
                                <div className="comment-item" key={comment.id}>
                                  <div className="user-avatar small">
                                    {comment.user_name
                                      ?.charAt(0)
                                      ?.toUpperCase()}
                                  </div>

                                  <div className="comment-bubble">
                                    <div className="comment-header">
                                      <strong>{comment.user_name}</strong>

                                      <div className="comment-header-actions">
                                        <span>
                                          {formatDate(comment.created_at)}
                                        </span>

                                        {Number(comment.user_id) ===
                                          Number(currentUserId) && (
                                          <button
                                            type="button"
                                            className="comment-delete-btn"
                                            onClick={() =>
                                              handleDeleteComment(
                                                post.id,
                                                comment.id,
                                              )
                                            }
                                            title={t("community.deleteComment")}
                                            aria-label={t(
                                              "community.deleteComment",
                                            )}
                                          >
                                            <Trash2 size={15} />
                                          </button>
                                        )}
                                      </div>
                                    </div>

                                    <p>{comment.content}</p>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* REPORT MODAL */}

      {showReport && (
        <div className="modal-overlay">
          <div className="report-modal">
            <div className="modal-header">
              <div>
                <h3>{t("community.reportPost")}</h3>

                <p>{t("community.reportReasonText")}</p>
              </div>

              <button
                type="button"
                className="close-button"
                onClick={() => setShowReport(null)}
              >
                <X size={20} />
              </button>
            </div>

            <label>{t("community.reason")}</label>

            <select
              value={reportReason}
              onChange={(event) => setReportReason(event.target.value)}
            >
              <option value="spam">{t("community.spam")}</option>

              <option value="harassment">{t("community.harassment")}</option>

              <option value="inappropriate">
                {t("community.inappropriate")}
              </option>

              <option value="misinformation">
                {t("community.misinformation")}
              </option>

              <option value="copyright">{t("community.copyright")}</option>

              <option value="other">{t("community.other")}</option>
            </select>

            <label>{t("community.additionalDetails")}</label>

            <textarea
              value={reportDescription}
              onChange={(event) => setReportDescription(event.target.value)}
              placeholder={t("community.optionalDetails")}
              rows={4}
            />

            <div className="modal-actions">
              <button
                type="button"
                className="cancel-button"
                onClick={() => setShowReport(null)}
              >
                {t("community.cancel")}
              </button>

              <button
                type="button"
                className="report-button"
                onClick={handleReport}
              >
                <Flag size={17} />

                {t("community.reportPost")}
              </button>
            </div>
          </div>
        </div>
      )}

      {deletePostId !== null && (
        <div
          className="delete-confirm-overlay"
          onMouseDown={() => {
            if (!deletingPost) {
              setDeletePostId(null);
            }
          }}
        >
          <div
            className="delete-confirm-modal"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="delete-confirm-icon">
              <Trash2 size={22} />
            </div>

            <h3>{t("community.deletePostQuestion")}</h3>

            <p>{t("community.deletePostDescription")}</p>

            <div className="delete-confirm-actions">
              <button
                type="button"
                className="delete-cancel-button"
                disabled={deletingPost}
                onClick={() => setDeletePostId(null)}
              >
                {t("community.cancel")}
              </button>

              <button
                type="button"
                className="delete-confirm-button"
                disabled={deletingPost}
                onClick={() => handleDeletePost(deletePostId)}
              >
                {deletingPost ? (
                  <>
                    <LoaderCircle size={16} className="button-spinner" />
                    {t("community.deleting")}
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    {t("community.delete")}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Community;
