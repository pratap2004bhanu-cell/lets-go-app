import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import { io } from "socket.io-client";


function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const notificationRef = useRef(null);
  const profileMenuRef = useRef(null);
  const messageSocketRef = useRef(null);

  // ========================================
  // LOGIN
  // ========================================

  const [loggedIn, setLoggedIn] =
    useState(
      Boolean(
        localStorage.getItem("token")
      )
    );

  // ========================================
  // NOTIFICATION COUNT
  // ========================================

  const [unreadCount, setUnreadCount] =
    useState(0);

  // ========================================
  // MESSAGE COUNT
  // ========================================

  const [unreadMessageCount, setUnreadMessageCount] =
    useState(0);

  // ========================================
  // CONNECTION REQUEST COUNT
  // ========================================

  const [requestCount, setRequestCount] =
    useState(0);

  const [notifications, setNotifications] =
    useState([]);

  const [notificationOpen, setNotificationOpen] =
    useState(false);

  const [notificationsLoading, setNotificationsLoading] =
    useState(false);

  const [mobileMenuOpen, setMobileMenuOpen] =
    useState(false);

  const [profileMenuOpen, setProfileMenuOpen] =
    useState(false);

  const [currentUserName, setCurrentUserName] =
    useState("Profile");

  // ========================================
  // GET CURRENT USER ID
  // ========================================

  const getCurrentUserId = () => {
    try {
      const currentUser =
        localStorage.getItem(
          "currentUser"
        );

      if (!currentUser) {
        return null;
      }

      const user =
        JSON.parse(currentUser);

      return (
        user?._id ||
        user?.id ||
        user?.userId ||
        null
      );
    } catch (error) {
      console.error(
        "❌ Unable to read current user:",
        error
      );

      return null;
    }
  };

  // ========================================
  // GET CURRENT USER NAME
  // ========================================

  useEffect(() => {
    try {
      const currentUser = localStorage.getItem("currentUser");

      if (!currentUser) {
        setCurrentUserName("Profile");
        return;
      }

      const user = JSON.parse(currentUser);

      setCurrentUserName(
        user?.name ||
        user?.fullName ||
        user?.username ||
        "Profile"
      );
    } catch (error) {
      console.error("❌ Unable to read current user name:", error);
      setCurrentUserName("Profile");
    }
  }, [loggedIn, location.pathname]);

  // ========================================
  // CHECK LOGIN STATUS
  // ========================================

  useEffect(() => {
  const token = localStorage.getItem("token");

  const timer = setTimeout(() => {
    setLoggedIn(Boolean(token));
  }, 0);

  return () => clearTimeout(timer);
}, [location.pathname]);
  // ========================================
  // FETCH UNREAD NOTIFICATION COUNT
  // ========================================

  const fetchUnreadCount =
    async () => {
      const token =
        localStorage.getItem("token");

      if (!token) {
        setUnreadCount(0);
        return;
      }

      try {
        const response =
          await fetch(
            "http://localhost:5001/api/notifications/unread-count",
            {
              method: "GET",

              headers: {
                Authorization:
                  `Bearer ${token}`,

                "Content-Type":
                  "application/json",
              },
            }
          );

        if (
          response.status === 401 ||
          response.status === 403
        ) {
          setUnreadCount(0);
          return;
        }

        const data =
          await response.json();

        if (!response.ok) {
          setUnreadCount(0);
          return;
        }

        setUnreadCount(
          Number(data.count) || 0
        );
      } catch (error) {
        console.error(
          "❌ Notification count error:",
          error
        );

        setUnreadCount(0);
      }
    };

  // ========================================
  // FETCH UNREAD MESSAGE COUNT
  // ========================================

  const fetchUnreadMessageCount =
    async () => {
      const token =
        localStorage.getItem("token");

      if (!token) {
        setUnreadMessageCount(0);
        return;
      }

      try {
        const response =
          await fetch(
            "http://localhost:5001/api/messages/unread/count",
            {
              method: "GET",

              headers: {
                Authorization:
                  `Bearer ${token}`,

                "Content-Type":
                  "application/json",
              },
            }
          );

        if (
          response.status === 401 ||
          response.status === 403
        ) {
          setUnreadMessageCount(0);
          return;
        }

        const data =
          await response.json();

        if (!response.ok) {
          setUnreadMessageCount(0);
          return;
        }

        setUnreadMessageCount(
          Number(data.unreadCount) || 0
        );
      } catch (error) {
        console.error(
          "❌ Message count error:",
          error
        );

        setUnreadMessageCount(0);
      }
    };

  // ========================================
  // FETCH CONNECTION REQUEST COUNT
  // ========================================

  const fetchRequestCount =
    async () => {
      const token =
        localStorage.getItem("token");

      if (!token) {
        setRequestCount(0);
        return;
      }

      try {
        const response =
          await fetch(
            "http://localhost:5001/api/connections/requests",
            {
              method: "GET",

              headers: {
                Authorization:
                  `Bearer ${token}`,

                "Content-Type":
                  "application/json",
              },
            }
          );

        if (
          response.status === 401 ||
          response.status === 403
        ) {
          setRequestCount(0);
          return;
        }

        const data =
          await response.json();

        if (!response.ok) {
          setRequestCount(0);
          return;
        }

        const requests =
          Array.isArray(data)
            ? data
            : data.requests ||
              data.connections ||
              [];

        setRequestCount(
          requests.length
        );
      } catch (error) {
        console.error(
          "❌ Connection request count error:",
          error
        );

        setRequestCount(0);
      }
    };

  // ========================================
  // FETCH RECENT NOTIFICATIONS
  // ========================================

  const fetchNotifications =
    async () => {
      const token =
        localStorage.getItem("token");

      if (!token) {
        setNotifications([]);
        return;
      }

      try {
        setNotificationsLoading(true);

        const response =
          await fetch(
            "http://localhost:5001/api/notifications",
            {
              method: "GET",

              headers: {
                Authorization:
                  `Bearer ${token}`,

                "Content-Type":
                  "application/json",
              },
            }
          );

        const data =
          await response.json();

        if (
          response.status === 401 ||
          response.status === 403
        ) {
          setNotifications([]);
          setUnreadCount(0);
          return;
        }

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Unable to fetch notifications."
          );
        }

        const notificationList =
          Array.isArray(data)
            ? data
            : data.notifications ||
              [];

        setNotifications(
          notificationList.slice(
            0,
            5
          )
        );

        const unread =
          notificationList.filter(
            (notification) =>
              !notification.isRead
          ).length;

        setUnreadCount(unread);
      } catch (error) {
        console.error(
          "❌ Fetch notifications error:",
          error
        );
      } finally {
        setNotificationsLoading(
          false
        );
      }
    };

// ========================================
// INITIAL LOAD
// ========================================

useEffect(() => {
  if (!loggedIn) {
    return;
  }

  const timer = setTimeout(() => {
    fetchUnreadCount();
    fetchUnreadMessageCount();
    fetchNotifications();
    fetchRequestCount();
  }, 0);

  return () => clearTimeout(timer);
}, [loggedIn]);
  // ========================================
// REFRESH BADGES WHEN NAVIGATING
// ========================================

useEffect(() => {
  if (!loggedIn) {
    return;
  }

  const timer = setTimeout(() => {
    fetchUnreadCount();
    fetchUnreadMessageCount();
    fetchRequestCount();
  }, 0);

  return () => clearTimeout(timer);
}, [
  location.pathname,
  loggedIn,
]);

  // ========================================
  // PERIODIC BADGE REFRESH
  // ========================================

  useEffect(() => {
    if (!loggedIn) {
      return;
    }

    const interval =
      setInterval(() => {
        fetchUnreadCount();
        fetchUnreadMessageCount();
        fetchRequestCount();
      }, 30000);

    return () => {
      clearInterval(interval);
    };
  }, [loggedIn]);

  // ========================================
  // SOCKET.IO REAL-TIME NOTIFICATIONS
  // ========================================

  useEffect(() => {
    const token =
      localStorage.getItem("token");

    if (!token) {
      return;
    }

    const userId =
      getCurrentUserId();

    if (!userId) {
      console.error(
        "❌ User ID not found for Socket.IO."
      );

      return;
    }

    console.log(
      `🔌 Starting notification socket for user: ${userId}`
    );

    const socket = io(
      "http://localhost:5001",
      {
        transports: [
          "websocket",
          "polling",
        ],
      }
    );

    // ========================================
    // CONNECT
    // ========================================

    socket.on(
      "connect",
      () => {
        console.log(
          "⚡ Connected to real-time notifications:",
          socket.id
        );

        socket.emit(
          "join-user-room",
          userId
        );
      }
    );

    // ========================================
    // NEW NOTIFICATION
    // ========================================

    socket.on(
      "new-notification",
      (notification) => {
        console.log(
          "🔔 NEW NOTIFICATION:",
          notification
        );

        setNotifications(
          (previous) => [
            notification,
            ...previous,
          ].slice(0, 5)
        );

        setUnreadCount(
          (previous) =>
            previous + 1
        );

        if (
          notification?.type ===
          "connection_request"
        ) {
          setRequestCount(
            (previous) =>
              previous + 1
          );
        }
      }
    );

    // ========================================
    // CONNECTION UPDATED
    // ========================================

    socket.on(
      "connection-updated",
      () => {
        fetchRequestCount();
      }
    );

    // ========================================
    // DISCONNECT
    // ========================================

    socket.on(
      "disconnect",
      (reason) => {
        console.log(
          "🔌 Notification socket disconnected:",
          reason
        );
      }
    );

    // ========================================
    // SOCKET ERROR
    // ========================================

    socket.on(
      "connect_error",
      (error) => {
        console.error(
          "❌ Socket connection error:",
          error.message
        );
      }
    );

    // ========================================
    // CLEANUP
    // ========================================

    return () => {
      console.log(
        "🧹 Closing notification socket"
      );

      socket.disconnect();
    };
  }, []);

  // ========================================
  // REAL-TIME MESSAGE SOCKET
  // ========================================

  useEffect(() => {
    if (!loggedIn) {
      return;
    }

    const userId =
      getCurrentUserId();

    if (!userId) {
      return;
    }

    console.log(
      `💬 Starting message badge socket for user: ${userId}`
    );

    const socket = io(
      "http://localhost:5001",
      {
        transports: [
          "websocket",
          "polling",
        ],
      }
    );

    messageSocketRef.current = socket;

    // ========================================
    // CONNECT
    // ========================================

    socket.on(
      "connect",
      () => {
        console.log(
          "🟢 Message badge socket connected:",
          socket.id
        );

        socket.emit(
          "join-user-room",
          userId
        );
      }
    );

    // ========================================
    // NEW MESSAGE
    // ========================================

    socket.on(
      "new-message",
      (message) => {
        console.log(
          "💬 NEW MESSAGE FOR NAVBAR:",
          message
        );

        if (!message) {
          return;
        }

        const receiverId =
          message.receiver?._id ||
          message.receiver?.id ||
          message.receiver;

        // Only count messages
        // actually received by this user
        if (
          String(receiverId) !==
          String(userId)
        ) {
          return;
        }

        setUnreadMessageCount(
          (previous) =>
            previous + 1
        );
      }
    );

    // ========================================
    // MESSAGES READ
    // ========================================

    socket.on(
      "messages-read",
      () => {
        fetchUnreadMessageCount();
      }
    );

    // ========================================
    // DISCONNECT
    // ========================================

    socket.on(
      "disconnect",
      (reason) => {
        console.log(
          "💬 Message badge socket disconnected:",
          reason
        );
      }
    );

    // ========================================
    // ERROR
    // ========================================

    socket.on(
      "connect_error",
      (error) => {
        console.error(
          "❌ Message badge socket error:",
          error.message
        );
      }
    );

    // ========================================
    // CLEANUP
    // ========================================

    return () => {
      console.log(
        "🧹 Closing message badge socket"
      );

      socket.off("connect");
      socket.off("new-message");
      socket.off("messages-read");
      socket.off("disconnect");
      socket.off("connect_error");

      socket.disconnect();

      messageSocketRef.current = null;
    };
  }, [loggedIn]);

  // ========================================
  // CLOSE DROPDOWN OUTSIDE CLICK
  // ========================================

  useEffect(() => {
    const handleOutsideClick =
      (event) => {
        if (
          notificationRef.current &&
          !notificationRef.current.contains(
            event.target
          )
        ) {
          setNotificationOpen(
            false
          );
        }
      };

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, []);

  // ========================================
  // CLOSE PROFILE MENU OUTSIDE CLICK
  // ========================================

  useEffect(() => {
    const handleProfileOutsideClick = (event) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target)
      ) {
        setProfileMenuOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleProfileOutsideClick
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleProfileOutsideClick
      );
    };
  }, []);

  // ========================================
  // MARK ONE NOTIFICATION READ
  // ========================================

  const markNotificationAsRead =
    async (notificationId) => {
      try {
        const token =
          localStorage.getItem(
            "token"
          );

        if (!token) {
          return;
        }

        const notification =
          notifications.find(
            (item) =>
              item._id ===
              notificationId
          );

        if (
          !notification ||
          notification.isRead
        ) {
          return;
        }

        const response =
          await fetch(
            `http://localhost:5001/api/notifications/${notificationId}/read`,
            {
              method: "PUT",

              headers: {
                Authorization:
                  `Bearer ${token}`,

                "Content-Type":
                  "application/json",
              },
            }
          );

        if (!response.ok) {
          return;
        }

        setNotifications(
          (previous) =>
            previous.map(
              (notification) =>
                notification._id ===
                notificationId
                  ? {
                      ...notification,
                      isRead: true,
                    }
                  : notification
            )
        );

        setUnreadCount(
          (previous) =>
            Math.max(
              0,
              previous - 1
            )
        );
      } catch (error) {
        console.error(
          "❌ Mark notification read error:",
          error
        );
      }
    };

  // ========================================
  // MARK ALL READ
  // ========================================

  const markAllAsRead =
    async () => {
      try {
        const token =
          localStorage.getItem(
            "token"
          );

        if (!token) {
          return;
        }

        const response =
          await fetch(
            "http://localhost:5001/api/notifications/read-all",
            {
              method: "PUT",

              headers: {
                Authorization:
                  `Bearer ${token}`,

                "Content-Type":
                  "application/json",
              },
            }
          );

        if (!response.ok) {
          return;
        }

        setNotifications(
          (previous) =>
            previous.map(
              (notification) => ({
                ...notification,
                isRead: true,
              })
            )
        );

        setUnreadCount(0);
      } catch (error) {
        console.error(
          "❌ Mark all read error:",
          error
        );
      }
    };

  // ========================================
  // FORMAT TIME
  // ========================================

  const formatNotificationTime =
    (date) => {
      if (!date) {
        return "";
      }

      const notificationDate =
        new Date(date);

      if (
        Number.isNaN(
          notificationDate.getTime()
        )
      ) {
        return "";
      }

      const now =
        new Date();

      const difference =
        now.getTime() -
        notificationDate.getTime();

      const seconds =
        Math.floor(
          difference / 1000
        );

      const minutes =
        Math.floor(
          seconds / 60
        );

      const hours =
        Math.floor(
          minutes / 60
        );

      const days =
        Math.floor(
          hours / 24
        );

      if (seconds < 60) {
        return "Just now";
      }

      if (minutes < 60) {
        return `${minutes}m ago`;
      }

      if (hours < 24) {
        return `${hours}h ago`;
      }

      if (days < 7) {
        return `${days}d ago`;
      }

      return notificationDate.toLocaleDateString(
        "en-IN",
        {
          day: "numeric",
          month: "short",
        }
      );
    };

  // ========================================
  // NOTIFICATION ICON
  // ========================================

  const getNotificationIcon =
    (type) => {
      switch (type) {
        case "connection_request":
          return "🤝";

        case "connection_accepted":
          return "🎉";

        case "connection_rejected":
          return "❌";

        case "activity_invitation":
          return "📅";

        case "activity_join_request":
          return "👋";

        case "activity_join_request_accepted":
          return "🎉";

        case "activity_join_request_rejected":
          return "❌";

        case "activity_joined":
          return "🙌";

        case "activity_updated":
          return "✏️";

        case "activity_cancelled":
          return "🚫";

        default:
          return "🔔";
      }
    };

  // ========================================
  // HANDLE NOTIFICATION CLICK
  // ========================================

  const handleNotificationClick =
    (notification) => {

      setNotificationOpen(false);

      if (
        notification.type ===
        "connection_request"
      ) {
        navigate("/connections");
        return;
      }

      if (
        notification.type ===
          "activity_invitation" ||
        notification.type ===
          "activity_join_request" ||
        notification.type ===
          "activity_join_request_accepted" ||
        notification.type ===
          "activity_join_request_rejected" ||
        notification.type ===
          "activity_joined" ||
        notification.type ===
          "activity_updated"
      ) {
        const activityId =
          notification?.activity?._id ||
          notification?.activity?.id ||
          notification?.activity;

        if (activityId) {
          navigate(`/activity/${activityId}`);
        } else {
          navigate("/discover");
        }

        if (!notification.isRead) {
          markNotificationAsRead(
            notification._id
          );
        }

        return;
      }

      navigate("/notifications");

      if (!notification.isRead) {
        markNotificationAsRead(
          notification._id
        );
      }
    };

  // ========================================
  // LOGOUT
  // ========================================

  const handleLogout = () => {
    localStorage.removeItem(
      "token"
    );

    localStorage.removeItem(
      "currentUser"
    );

    localStorage.removeItem(
      "rememberMe"
    );

    localStorage.removeItem(
      "userId"
    );

    setLoggedIn(false);
    setUnreadCount(0);
    setUnreadMessageCount(0);
    setRequestCount(0);
    setNotifications([]);
    setNotificationOpen(false);

    navigate("/login");
  };

  // ========================================
  // RENDER
  // ========================================

  return (
    <nav className="navbar">

      {/* ========================================
          LOGO
      ======================================== */}

      <Link
        to="/"
        className="logo"
      >
        Let's <span>Go</span>
      </Link>

      {/* ========================================
          MOBILE MENU
      ======================================== */}

      <button
        type="button"
        className="mobile-menu-btn"
        onClick={() =>
          setMobileMenuOpen(
            (previous) =>
              !previous
          )
        }
        aria-label="Toggle navigation menu"
        aria-expanded={
          mobileMenuOpen
        }
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      {/* ========================================
          NAVIGATION
      ======================================== */}

      <div
  className={`nav-links ${
    mobileMenuOpen
      ? "mobile-menu-open"
      : "mobile-menu-closed"
  }`}
>

        <Link
          to="/"
          onClick={() =>
            setMobileMenuOpen(false)
          }
        >
          Home
        </Link>

        <Link
          to="/discover"
          onClick={() =>
            setMobileMenuOpen(false)
          }
        >
          Discover
        </Link>

        <Link
          to="/create-activity"
          className="nav-create-activity"
          onClick={() =>
            setMobileMenuOpen(false)
          }
        >
          <span className="nav-create-icon">＋</span>
          <span>Create Activity</span>
        </Link>

        {/* ========================================
            CONNECTIONS
        ======================================== */}

        <Link
          to="/connections"
          onClick={() =>
            setMobileMenuOpen(false)
          }
          className="nav-link-with-badge"
        >
          <span>
            Connections
          </span>

          {loggedIn &&
            requestCount > 0 && (
              <span className="nav-badge">
                {requestCount > 99
                  ? "99+"
                  : requestCount}
              </span>
            )}
        </Link>

        {/* ========================================
    MESSAGES
======================================== */}

{loggedIn && (
  <button
    type="button"
    className={`messages-nav-button ${
      location.pathname.startsWith("/messages") ||
      location.pathname.startsWith("/chat/")
        ? "messages-nav-button-active"
        : ""
    }`}
    onClick={() => {
      setMobileMenuOpen(false);
      navigate("/messages");
    }}
    aria-label="Messages"
  >
    <span className="messages-nav-icon">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M20 11.5C20 15.642 16.418 19 12 19C10.839 19 9.74 18.768 8.764 18.352L4 20L5.545 15.855C4.576 14.645 4 13.126 4 11.5C4 7.358 7.582 4 12 4C16.418 4 20 7.358 20 11.5Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <path
          d="M9 11.5H9.01"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />

        <path
          d="M12 11.5H12.01"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />

        <path
          d="M15 11.5H15.01"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </span>

    <span className="messages-nav-text">
      Messages
    </span>

    {unreadMessageCount > 0 && (
      <span className="messages-nav-badge">
        {unreadMessageCount > 99
          ? "99+"
          : unreadMessageCount}
      </span>
    )}
  </button>
)}

        {/* ========================================
            NOTIFICATIONS
        ======================================== */}

        {loggedIn && (
          <div
            className="notification-wrapper"
            ref={
              notificationRef
            }
          >

            <button
              type="button"
              className={`notification-button ${
                notificationOpen
                  ? "notification-button-active"
                  : ""
              }`}
              aria-label="Notifications"
              aria-expanded={
                notificationOpen
              }
              onMouseDown={(event) => {
                event.stopPropagation();
              }}
              onTouchStart={(event) => {
                event.stopPropagation();
              }}
              onClick={(event) => {
                event.stopPropagation();

                const next = !notificationOpen;

                setNotificationOpen(next);

                // Refresh whenever dropdown opens
                if (next) {
                  fetchNotifications();
                  fetchUnreadCount();
                }
              }}
            >

              <svg
                className="notification-bell"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >

                <path
                  d="M18 8C18 4.686 15.314 2 12 2C8.686 2 6 4.686 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                <path
                  d="M10 21H14"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />

              </svg>

              {unreadCount > 0 && (
                <span className="notification-badge">
                  {unreadCount > 99
                    ? "99+"
                    : unreadCount}
                </span>
              )}

            </button>

            {/* ========================================
                DROPDOWN
            ======================================== */}

            {notificationOpen && (
              <div className="notification-dropdown">

                <div className="notification-dropdown-header">

                  <div>

                    <span className="notification-dropdown-label">
                      YOUR UPDATES
                    </span>

                    <h3>
                      Notifications
                    </h3>

                  </div>

                  {unreadCount > 0 && (
                    <span className="notification-dropdown-count">
                      {unreadCount} new
                    </span>
                  )}

                </div>

                <div className="notification-dropdown-body">

                  {notificationsLoading ? (

                    <div className="notification-dropdown-empty">

                      <div className="notification-loading-icon">
                        ⏳
                      </div>

                      <p>
                        Loading notifications...
                      </p>

                    </div>

                  ) : notifications.length ===
                    0 ? (

                    <div className="notification-dropdown-empty">

                      <div className="notification-empty-icon">
                        ✨
                      </div>

                      <h4>
                        You're all caught up
                      </h4>

                      <p>
                        New updates will
                        appear here.
                      </p>

                    </div>

                  ) : (

                    notifications.map(
                      (
                        notification
                      ) => (

                        <button
                          type="button"
                          key={
                            notification._id
                          }
                          className={`notification-dropdown-item ${
                            !notification.isRead
                              ? "notification-dropdown-item-unread"
                              : ""
                          }`}
                          onClick={() =>
                            handleNotificationClick(
                              notification
                            )
                          }
                        >

                          <div className="notification-dropdown-icon">

                            {getNotificationIcon(
                              notification.type
                            )}

                          </div>

                          <div className="notification-dropdown-content">

                            <p>
                              {notification.message ||
                                "You have a new notification."}
                            </p>

                            {notification
                              .sender
                              ?.name && (

                              <span>
                                From{" "}
                                {
                                  notification
                                    .sender
                                    .name
                                }
                              </span>

                            )}

                            <small>
                              {formatNotificationTime(
                                notification.createdAt
                              )}
                            </small>

                          </div>

                          {!notification.isRead && (
                            <span className="notification-unread-dot" />
                          )}

                        </button>

                      )
                    )

                  )}

                </div>

                <div className="notification-dropdown-footer">

                  {unreadCount > 0 && (

                    <button
                      type="button"
                      className="notification-mark-read"
                      onClick={
                        markAllAsRead
                      }
                    >
                      ✓ Mark all as read
                    </button>

                  )}

                  <Link
                    to="/notifications"
                    className="notification-view-all"
                    onClick={() =>
                      setNotificationOpen(
                        false
                      )
                    }
                  >
                    View all notifications
                    <span>
                      →
                    </span>
                  </Link>

                </div>

              </div>
            )}

          </div>
        )}

        {/* ========================================
            PROFILE
        ======================================== */}

        {loggedIn ? (
          <div
            className={`profile-nav-wrapper ${
              profileMenuOpen
                ? "profile-nav-wrapper-open"
                : ""
            }`}
            ref={profileMenuRef}
          >
            <button
              type="button"
              className={`profile-nav-button ${
                profileMenuOpen
                  ? "profile-nav-button-active"
                  : ""
              }`}
              onClick={() =>
                setProfileMenuOpen(
                  (previous) => !previous
                )
              }
              aria-label="Open profile menu"
              aria-expanded={profileMenuOpen}
            >
              <span className="profile-nav-avatar">
                {(currentUserName || "P").charAt(0).toUpperCase()}
              </span>

              <span className="profile-nav-name">
                {currentUserName}
              </span>

              <svg
                className="profile-nav-chevron"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M7 10L12 15L17 10"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {profileMenuOpen && (
              <div className="profile-nav-dropdown">

                <div className="profile-nav-dropdown-head">
                  <span className="profile-nav-dropdown-eyebrow">
                    ACCOUNT
                  </span>

                  <strong>
                    {currentUserName}
                  </strong>

                  <span>
                    Your Let's Go profile
                  </span>
                </div>

                <Link
                  to="/profile"
                  className="profile-nav-dropdown-item"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    setMobileMenuOpen(false);
                  }}
                >
                  <span className="profile-nav-dropdown-icon">
                    ◉
                  </span>

                  <span className="profile-nav-dropdown-copy">
                    <strong>My Profile</strong>
                    <small>View your profile</small>
                  </span>

                  <span className="profile-nav-dropdown-arrow">
                    →
                  </span>
                </Link>

                <Link
                  to="/connections"
                  className="profile-nav-dropdown-item"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    setMobileMenuOpen(false);
                  }}
                >
                  <span className="profile-nav-dropdown-icon">
                    ◎
                  </span>

                  <span className="profile-nav-dropdown-copy">
                    <strong>Connections</strong>
                    <small>Manage your network</small>
                  </span>

                  <span className="profile-nav-dropdown-arrow">
                    →
                  </span>
                </Link>

                <Link
                  to="/preferences"
                  className="profile-nav-dropdown-item"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    setMobileMenuOpen(false);
                  }}
                >
                  <span className="profile-nav-dropdown-icon">
                    ⚙
                  </span>

                  <span className="profile-nav-dropdown-copy">
                    <strong>Preferences</strong>
                    <small>Customize your experience</small>
                  </span>

                  <span className="profile-nav-dropdown-arrow">
                    →
                  </span>
                </Link>

                <div className="profile-nav-dropdown-divider" />

                <button
                  type="button"
                  className="profile-nav-logout"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                >
                  <span className="profile-nav-logout-icon">
                    ↪
                  </span>

                  <span>Logout</span>
                </button>

              </div>
            )}
          </div>
        ) : (

          <Link
            to="/login"
            className="nav-login"
            onClick={() =>
              setMobileMenuOpen(false)
            }
          >
            Login
          </Link>

        )}

      </div>
    </nav>
  );
}

export default Navbar;