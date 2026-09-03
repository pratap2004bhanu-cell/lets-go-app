import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import "./Notifications.css";

// ========================================
// GET USER ID SAFELY
// ========================================

function getUserId(user) {
  if (!user) return null;

  if (typeof user === "object") {
    return (
      user._id ||
      user.id ||
      user.userId ||
      null
    );
  }

  return user;
}

// ========================================
// GET ACTIVITY ID SAFELY
// ========================================

function getActivityId(activity) {
  if (!activity) return null;

  if (typeof activity === "object") {
    return (
      activity._id ||
      activity.id ||
      activity.activityId ||
      null
    );
  }

  return activity;
}

function Notifications() {
  const navigate = useNavigate();

  const [notifications, setNotifications] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [markingAll, setMarkingAll] =
    useState(false);

  // ========================================
  // FETCH NOTIFICATIONS
  // ========================================

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError("");

      const token =
        localStorage.getItem("token");

      if (!token) {
        setError(
          "Please login first."
        );

        setLoading(false);
        return;
      }

      const response = await fetch(
        "https://lets-go-backend-p4ox.onrender.com/api/notifications",
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

      console.log(
        "📬 Notifications response:",
        response.status,
        data
      );

      // ========================================
      // AUTH ERROR
      // ========================================

      if (
        response.status === 401 ||
        response.status === 403
      ) {
        localStorage.removeItem(
          "token"
        );

        localStorage.removeItem(
          "currentUser"
        );

        navigate("/login");

        return;
      }

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to fetch notifications."
        );
      }

      setNotifications(
        Array.isArray(data)
          ? data
          : data.notifications || []
      );
    } catch (error) {
      console.error(
        "❌ Fetch notifications error:",
        error
      );

      setError(
        error.message ||
          "Unable to load notifications."
      );
    } finally {
      setLoading(false);
    }
  };

  // ========================================
  // LOAD NOTIFICATIONS
  // ========================================

  useEffect(() => {
    fetchNotifications();
  }, []);

  // ========================================
  // MARK ONE AS READ
  // ========================================

  const markAsRead = async (
    notificationId
  ) => {
    try {
      const token =
        localStorage.getItem("token");

      if (!token) {
        navigate("/login");
        return;
      }

      const response =
        await fetch(
          `https://lets-go-backend-p4ox.onrender.com/api/notifications/${notificationId}/read`,
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

      const data =
        await response.json();

      if (
        response.status === 401 ||
        response.status === 403
      ) {
        localStorage.removeItem(
          "token"
        );

        localStorage.removeItem(
          "currentUser"
        );

        navigate("/login");

        return;
      }

      if (!response.ok) {
        console.error(
          "❌ Mark as read failed:",
          data
        );

        return;
      }

      setNotifications(
        (previousNotifications) =>
          previousNotifications.map(
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

      console.log(
        "✅ Notification marked as read"
      );
    } catch (error) {
      console.error(
        "❌ Mark notification read error:",
        error
      );
    }
  };

  // ========================================
  // MARK ALL AS READ
  // ========================================

  const markAllAsRead = async () => {
    try {
      const token =
        localStorage.getItem("token");

      if (!token) {
        navigate("/login");
        return;
      }

      setMarkingAll(true);

      const response =
        await fetch(
          "https://lets-go-backend-p4ox.onrender.com/api/notifications/read-all",
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

      const data =
        await response.json();

      if (
        response.status === 401 ||
        response.status === 403
      ) {
        localStorage.removeItem(
          "token"
        );

        localStorage.removeItem(
          "currentUser"
        );

        navigate("/login");

        return;
      }

      if (!response.ok) {
        console.error(
          "❌ Mark all as read failed:",
          data
        );

        return;
      }

      setNotifications(
        (previousNotifications) =>
          previousNotifications.map(
            (notification) => ({
              ...notification,
              isRead: true,
            })
          )
      );

      console.log(
        "✅ All notifications marked as read"
      );
    } catch (error) {
      console.error(
        "❌ Mark all read error:",
        error
      );
    } finally {
      setMarkingAll(false);
    }
  };

  // ========================================
  // FORMAT DATE
  // ========================================

  const formatDate = (date) => {
    if (!date) return "";

    const notificationDate =
      new Date(date);

    if (
      Number.isNaN(
        notificationDate.getTime()
      )
    ) {
      return "";
    }

    return notificationDate.toLocaleString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  };

  // ========================================
  // ICON
  // ========================================

  const getNotificationIcon = (
    type
  ) => {
    switch (type) {
      case "connection_request":
        return "🤝";

      case "connection_accepted":
        return "🎉";

      case "connection_rejected":
        return "❌";

      case "activity_invitation":
        return "📅";

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
  // NOTIFICATION DESTINATION
  // ========================================

  const getNotificationDestination = (
    notification
  ) => {
    const senderId = getUserId(
      notification?.sender
    );

    const activityId =
      getActivityId(
        notification?.activity
      );

    switch (
      notification?.type
    ) {
      case "connection_request":
        return "/connections";

      case "connection_accepted":
      case "connection_rejected":
        return senderId
          ? `/user/${senderId}`
          : "/connections";

      case "activity_invitation":
      case "activity_joined":
      case "activity_updated":
      case "activity_cancelled":
        return activityId
          ? `/activity/${activityId}`
          : "/discover";

      default:
        return null;
    }
  };

  // ========================================
  // HANDLE NOTIFICATION CLICK
  // ========================================

  const handleNotificationClick = (
    notification
  ) => {
    if (!notification.isRead) {
      markAsRead(
        notification._id
      );
    }

    const destination =
      getNotificationDestination(
        notification
      );

    if (destination) {
      navigate(destination);
    }
  };

  // ========================================
  // LOADING
  // ========================================

  if (loading) {
    return (
      <div className="notifications-page">

        <main className="notifications-container">

          <Link
            to="/discover"
            className="notifications-back"
          >
            ← Back to Discover
          </Link>

          <div className="notifications-card notifications-loading">

            <div className="notifications-big-icon">
              🔔
            </div>

            <h1>
              Loading notifications...
            </h1>

            <p>
              Checking what's new for you.
            </p>

          </div>

        </main>

      </div>
    );
  }

  // ========================================
  // ERROR
  // ========================================

  if (error) {
    return (
      <div className="notifications-page">

        <main className="notifications-container">

          <Link
            to="/discover"
            className="notifications-back"
          >
            ← Back to Discover
          </Link>

          <div className="notifications-card notifications-error">

            <div className="notifications-big-icon">
              ⚠️
            </div>

            <h1>
              Couldn't load notifications
            </h1>

            <p>
              {error}
            </p>

            <button
              type="button"
              className="notifications-primary-btn"
              onClick={fetchNotifications}
            >
              Try Again →
            </button>

          </div>

        </main>

      </div>
    );
  }

  // ========================================
  // EMPTY
  // ========================================

  if (
    notifications.length === 0
  ) {
    return (
      <div className="notifications-page">

        <main className="notifications-container">

          <Link
            to="/discover"
            className="notifications-back"
          >
            ← Back to Discover
          </Link>

          <div className="notifications-header">

            <div className="notifications-header-icon">
              🔔
            </div>

            <div>

              <span>
                YOUR UPDATES
              </span>

              <h1>
                Notifications
              </h1>

              <p>
                Stay updated with your
                connections and activities.
              </p>

            </div>

          </div>

          <div className="notifications-card notifications-empty">

            <div className="notifications-big-icon">
              📨
            </div>

            <h2>
              You're all caught up
            </h2>

            <p>
              New connection requests and
              updates will appear here.
            </p>

            <Link
              to="/discover"
              className="notifications-primary-btn"
            >
              Discover People →
            </Link>

          </div>

        </main>

      </div>
    );
  }

  // ========================================
  // UNREAD COUNT
  // ========================================

  const unreadCount =
    notifications.filter(
      (notification) =>
        !notification.isRead
    ).length;

  // ========================================
  // MAIN PAGE
  // ========================================

  return (
    <div className="notifications-page">

      <main className="notifications-container">

        {/* BACK */}

        <Link
          to="/discover"
          className="notifications-back"
        >
          ← Back to Discover
        </Link>

        {/* HEADER */}

        <div className="notifications-header">

          <div className="notifications-header-icon">
            🔔
          </div>

          <div>

            <span>
              YOUR UPDATES
            </span>

            <h1>
              Notifications
            </h1>

            <p>
              Stay updated with your
              connections and activities.
            </p>

          </div>

        </div>

        {/* NOTIFICATION LIST */}

        <section className="notifications-list">

          <div className="notifications-list-heading">

            <div>

              <span>
                RECENT
              </span>

              <h2>
                Your Notifications
              </h2>

            </div>

            <div className="notifications-heading-actions">

              <div className="notifications-count">
                {unreadCount}
              </div>

              {unreadCount > 0 && (

                <button
                  type="button"
                  className="mark-all-read-btn"
                  onClick={markAllAsRead}
                  disabled={markingAll}
                >
                  {markingAll
                    ? "Marking..."
                    : "Mark all as read"}
                </button>

              )}

            </div>

          </div>

          {/* ========================================
              NOTIFICATION ITEMS
          ======================================== */}

          {notifications.map(
            (notification) => {

              const sender =
                notification.sender;

              const senderId =
                getUserId(sender);

              const senderName =
                sender?.name ||
                "Let's Go member";

              const activity =
                notification.activity;

              const activityId =
                getActivityId(
                  activity
                );

              const isUnread =
                !notification.isRead;

              return (
                <article
                  key={
                    notification._id
                  }
                  className={`notification-item ${
                    isUnread
                      ? "notification-unread"
                      : ""
                  }`}
                  onClick={() =>
                    handleNotificationClick(
                      notification
                    )
                  }
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (
                      event.key ===
                        "Enter" ||
                      event.key ===
                        " "
                    ) {
                      event.preventDefault();

                      handleNotificationClick(
                        notification
                      );
                    }
                  }}
                >

                  {/* ========================================
                      ICON
                  ======================================== */}

                  <div className="notification-icon">

                    {getNotificationIcon(
                      notification.type
                    )}

                  </div>

                  {/* ========================================
                      CONTENT
                  ======================================== */}

                  <div className="notification-content">

                    <div className="notification-top">

                      <h3>
                        {notification.message ||
                          "You have a new notification."}
                      </h3>

                      {isUnread && (

                        <span className="notification-dot">
                          NEW
                        </span>

                      )}

                    </div>

                    {/* ========================================
                        SENDER
                    ======================================== */}

                    {sender && (

                      <div className="notification-sender">

                        <span>
                          From
                        </span>

                        {senderId ? (

                          <Link
                            to={`/user/${senderId}`}
                            onClick={(event) => {
                              event.stopPropagation();

                              if (isUnread) {
                                markAsRead(
                                  notification._id
                                );
                              }
                            }}
                            className="notification-sender-link"
                          >
                            {senderName}
                          </Link>

                        ) : (

                          <strong>
                            {senderName}
                          </strong>

                        )}

                      </div>

                    )}

                    {/* ========================================
                        ACTIVITY
                    ======================================== */}

                    {activity && (

                      <div className="notification-meta">

                        <span>
                          📅
                        </span>

                        {activityId ? (

                          <Link
                            to={`/activity/${activityId}`}
                            onClick={(event) => {
                              event.stopPropagation();

                              if (isUnread) {
                                markAsRead(
                                  notification._id
                                );
                              }
                            }}
                            className="notification-activity-link"
                          >
                            {activity.title ||
                              "View activity"}
                          </Link>

                        ) : (

                          <span>
                            {activity.title ||
                              "Activity update"}
                          </span>

                        )}

                      </div>

                    )}

                    <small>
                      {formatDate(
                        notification.createdAt
                      )}
                    </small>

                  </div>

                  {/* ========================================
                      ACTION
                  ======================================== */}

                  <div
                    className="notification-action-wrapper"
                    onClick={(event) =>
                      event.stopPropagation()
                    }
                  >

                    {notification.type ===
                      "connection_request" && (

                      <Link
                        to="/connections"
                        className="notification-action"
                        onClick={() => {
                          if (isUnread) {
                            markAsRead(
                              notification._id
                            );
                          }
                        }}
                      >
                        View Request →
                      </Link>

                    )}

                    {(
                      notification.type ===
                        "connection_accepted" ||
                      notification.type ===
                        "connection_rejected"
                    ) &&
                      senderId && (

                        <Link
                          to={`/user/${senderId}`}
                          className="notification-action"
                          onClick={() => {
                            if (isUnread) {
                              markAsRead(
                                notification._id
                              );
                            }
                          }}
                        >
                          View Profile →
                        </Link>

                      )}

                    {(
                      notification.type ===
                        "activity_invitation" ||
                      notification.type ===
                        "activity_joined" ||
                      notification.type ===
                        "activity_updated" ||
                      notification.type ===
                        "activity_cancelled"
                    ) &&
                      activityId && (

                        <Link
                          to={`/activity/${activityId}`}
                          className="notification-action"
                          onClick={() => {
                            if (isUnread) {
                              markAsRead(
                                notification._id
                              );
                            }
                          }}
                        >
                          View Activity →
                        </Link>

                      )}

                  </div>

                </article>
              );
            }
          )}

        </section>

      </main>

    </div>
  );
}

export default Notifications;