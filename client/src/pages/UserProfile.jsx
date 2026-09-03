import { useEffect, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";

import "./UserProfile.css";

const emojiMap = {
  Cricket: "🏏",
  Gym: "🏋️",
  Gaming: "🎮",
  Coffee: "☕",
  Study: "📚",
  Movies: "🎬",
  Walking: "🚶",
  Other: "✨",
};

function formatDate(date) {
  if (!date) return "Date not set";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return date;
  }

  return parsedDate.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

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
// GET CREATOR ID
// ========================================

function getCreatorId(creator) {
  if (!creator) return null;

  if (typeof creator === "object") {
    return (
      creator._id ||
      creator.id ||
      creator.userId ||
      null
    );
  }

  return creator;
}

function UserProfile() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [activities, setActivities] = useState([]);

  const [loading, setLoading] = useState(true);
  const [activitiesLoading, setActivitiesLoading] =
    useState(true);

  const [error, setError] = useState("");

  const [connectionStatus, setConnectionStatus] =
    useState("idle");

  const [connectionLoading, setConnectionLoading] =
    useState(false);

  const [connectionMessage, setConnectionMessage] =
    useState("");

  // ========================================
  // GET PROFILE + ACTIVITIES + CONNECTION STATUS
  // ========================================

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError("");

        // ========================================
        // GET USER PROFILE
        // ========================================

        const response = await fetch(
          `https://lets-go-backend-p4ox.onrender.com/api/users/${id}`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Unable to load user profile."
          );
        }

        const profileUser =
          data.user || data;

        setUser(profileUser);

        // ========================================
        // GET ALL ACTIVITIES
        // ========================================

        try {
          setActivitiesLoading(true);

          const activitiesResponse =
            await fetch(
              "https://lets-go-backend-p4ox.onrender.com/api/activities"
            );

          const activitiesData =
            await activitiesResponse.json();

          if (activitiesResponse.ok) {
            const allActivities =
              Array.isArray(
                activitiesData
              )
                ? activitiesData
                : activitiesData.activities ||
                  [];

            const userActivities =
              allActivities.filter(
                (activity) => {
                  const creatorId =
                    getCreatorId(
                      activity.creatorId
                    );

                  return (
                    creatorId &&
                    String(creatorId) ===
                      String(id)
                  );
                }
              );

            setActivities(
              userActivities
            );
          }
        } catch (activityError) {
          console.error(
            "Fetch user activities error:",
            activityError
          );

          setActivities([]);
        } finally {
          setActivitiesLoading(false);
        }

        // ========================================
        // CHECK CONNECTION STATUS
        // ========================================

        const token =
          localStorage.getItem("token");

        const storedUser =
          localStorage.getItem(
            "currentUser"
          );

        if (!token || !storedUser) {
          return;
        }

        let loggedInUser = null;

        try {
          loggedInUser =
            JSON.parse(storedUser);
        } catch (parseError) {
          console.error(
            "Unable to parse currentUser:",
            parseError
          );
        }

        const loggedInUserId =
          getUserId(loggedInUser);

        // Own profile
        if (
          loggedInUserId &&
          String(loggedInUserId) ===
            String(id)
        ) {
          setConnectionStatus(
            "self"
          );

          return;
        }

        // ========================================
        // CHECK ACCEPTED CONNECTIONS
        // ========================================

        try {
          const connectionsResponse =
            await fetch(
              "https://lets-go-backend-p4ox.onrender.com/api/connections",
              {
                headers: {
                  Authorization:
                    `Bearer ${token}`,
                },
              }
            );

          if (connectionsResponse.ok) {
            const connectionsData =
              await connectionsResponse.json();

            const connections =
              Array.isArray(
                connectionsData
              )
                ? connectionsData
                : connectionsData.connections ||
                  [];

            const alreadyConnected =
              connections.some(
                (connection) => {
                  const senderId =
                    getUserId(
                      connection.sender
                    );

                  const receiverId =
                    getUserId(
                      connection.receiver
                    );

                  return (
                    String(senderId) ===
                      String(id) ||
                    String(receiverId) ===
                      String(id)
                  );
                }
              );

            if (alreadyConnected) {
              setConnectionStatus(
                "connected"
              );

              return;
            }
          }
        } catch (connectionError) {
          console.error(
            "Check connections error:",
            connectionError
          );
        }

        // ========================================
        // CHECK SENT REQUESTS
        // ========================================

        try {
          const sentResponse =
            await fetch(
              "https://lets-go-backend-p4ox.onrender.com/api/connections/sent",
              {
                headers: {
                  Authorization:
                    `Bearer ${token}`,
                },
              }
            );

          if (sentResponse.ok) {
            const sentData =
              await sentResponse.json();

            const sentRequests =
              Array.isArray(
                sentData
              )
                ? sentData
                : sentData.connections ||
                  [];

            const requestSent =
              sentRequests.some(
                (connection) => {
                  const receiverId =
                    getUserId(
                      connection.receiver
                    );

                  return (
                    receiverId &&
                    String(receiverId) ===
                      String(id)
                  );
                }
              );

            if (requestSent) {
              setConnectionStatus(
                "sent"
              );
            }
          }
        } catch (sentError) {
          console.error(
            "Check sent requests error:",
            sentError
          );
        }
      } catch (error) {
        console.error(
          "Fetch user profile error:",
          error
        );

        setError(
          error.message ||
            "Unable to load user profile."
        );
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchProfile();
    }
  }, [id]);

  // ========================================
  // SEND CONNECTION REQUEST
  // ========================================

  const handleConnect = async () => {
    try {
      setConnectionLoading(true);
      setConnectionMessage("");

      const token =
        localStorage.getItem("token");

      const storedUser =
        localStorage.getItem(
          "currentUser"
        );

      if (!token || !storedUser) {
        setConnectionMessage(
          "Please login first to connect with people."
        );

        return;
      }

      let loggedInUser;

      try {
        loggedInUser =
          JSON.parse(storedUser);
      } catch {
        setConnectionMessage(
          "Unable to read your account. Please login again."
        );

        return;
      }

      const loggedInUserId =
        getUserId(loggedInUser);

      if (!loggedInUserId) {
        setConnectionMessage(
          "Unable to identify your account. Please login again."
        );

        return;
      }

      // ========================================
      // SELF CHECK
      // ========================================

      if (
        String(loggedInUserId) ===
        String(id)
      ) {
        setConnectionStatus(
          "self"
        );

        setConnectionMessage(
          "You cannot connect with yourself."
        );

        return;
      }

      // ========================================
      // ALREADY CONNECTED / SENT
      // ========================================

      if (
        connectionStatus ===
        "connected"
      ) {
        setConnectionMessage(
          "You are already connected with this person."
        );

        return;
      }

      if (
        connectionStatus ===
        "sent"
      ) {
        setConnectionMessage(
          "Connection request has already been sent."
        );

        return;
      }

      setConnectionStatus(
        "pending"
      );

      const response =
        await fetch(
          "https://lets-go-backend-p4ox.onrender.com/api/connections/send",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${token}`,
            },

            body: JSON.stringify({
              senderId:
                loggedInUserId,

              receiverId: id,
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to send connection request."
        );
      }

      setConnectionStatus(
        "sent"
      );

      setConnectionMessage(
        "Connection request sent successfully! 🤝"
      );
    } catch (error) {
      console.error(
        "Connection request error:",
        error
      );

      setConnectionStatus(
        "idle"
      );

      setConnectionMessage(
        error.message ||
          "Unable to send connection request."
      );
    } finally {
      setConnectionLoading(false);
    }
  };

  // ========================================
// OPEN MESSAGE
// ========================================

const handleMessage = () => {
  const token =
    localStorage.getItem("token");

  const storedUser =
    localStorage.getItem("currentUser");

  if (!token || !storedUser) {
    setConnectionMessage(
      "Please login first to message people."
    );

    return;
  }

  let loggedInUser = null;

  try {
    loggedInUser =
      JSON.parse(storedUser);
  } catch (error) {
    console.error(
      "Unable to parse current user:",
      error
    );

    setConnectionMessage(
      "Unable to read your account. Please login again."
    );

    return;
  }

  const loggedInUserId =
    getUserId(loggedInUser);

  if (!loggedInUserId) {
    setConnectionMessage(
      "Unable to identify your account. Please login again."
    );

    return;
  }

  // Prevent messaging yourself
  if (
    String(loggedInUserId) ===
    String(id)
  ) {
    setConnectionMessage(
      "You cannot message yourself."
    );

    return;
  }

  // Open existing messages page
  navigate(`/chat/${id}`);
};

  // ========================================
  // LOADING
  // ========================================

  if (loading) {
    return (
      <div className="user-profile-page">

        <div className="user-profile-container">

          <Link
            to="/discover"
            className="user-profile-back"
          >
            ← Back
          </Link>

          <div className="user-profile-card profile-loading">

            <div className="profile-loading-icon">
              ⏳
            </div>

            <h1>
              Loading profile...
            </h1>

            <p>
              Please wait while we load this
              user's profile.
            </p>

          </div>

        </div>

      </div>
    );
  }

  // ========================================
  // ERROR
  // ========================================

  if (error || !user) {
    return (
      <div className="user-profile-page">

        <div className="user-profile-container">

          <Link
            to="/discover"
            className="user-profile-back"
          >
            ← Back
          </Link>

          <div className="user-profile-card profile-error">

            <div className="profile-error-icon">
              👤
            </div>

            <h1>
              Profile unavailable
            </h1>

            <p>
              {error ||
                "This user profile could not be found."}
            </p>

            <Link
              to="/discover"
              className="profile-primary-btn"
            >
              Explore Activities →
            </Link>

          </div>

        </div>

      </div>
    );
  }

  // ========================================
  // PROFILE DATA
  // ========================================

  const name =
    user.name || "User";

  const initials =
    name
      .trim()
      .split(/\s+/)
      .map(
        (part) => part[0]
      )
      .join("")
      .slice(0, 2)
      .toUpperCase();

  let loggedInUser = null;

  try {
    const storedUser =
      localStorage.getItem(
        "currentUser"
      );

    if (storedUser) {
      loggedInUser =
        JSON.parse(storedUser);
    }
  } catch (error) {
    console.error(
      "Unable to read current user:",
      error
    );
  }

  const loggedInUserId =
    getUserId(loggedInUser);

  const isOwnProfile =
    loggedInUserId &&
    String(loggedInUserId) ===
      String(id);

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className="user-profile-page">

      <div className="user-profile-container">

        {/* BACK */}

        <Link
          to="/discover"
          className="user-profile-back"
        >
          ← Back to Discover
        </Link>

        {/* PROFILE CARD */}

        <div className="user-profile-card">

          {/* ========================================
              PROFILE HERO
          ======================================== */}

          <div className="profile-hero">

            <div className="profile-avatar">
              {initials}
            </div>

            <div className="profile-identity">

              <span className="profile-label">
                LET'S GO MEMBER
              </span>

              <h1>
                {name}
              </h1>

              <p>
                Member of the Let's Go community
              </p>

            </div>

          </div>

          {/* ========================================
              PROFILE INFO
          ======================================== */}

          <div className="profile-info-grid">

  <div className="profile-info-item">
    <span className="profile-info-icon">
      👤
    </span>

    <div>
      <small>NAME</small>

      <strong>
        {name}
      </strong>
    </div>
  </div>

  <div className="profile-info-item">
    <span className="profile-info-icon">
      ✉️
    </span>

    <div>
      <small>EMAIL</small>

      <strong>
        {user.email || "Not available"}
      </strong>
    </div>
  </div>

  <div className="profile-info-item">
    <span className="profile-info-icon">
      📍
    </span>

    <div>
      <small>LOCATION</small>

      <strong>
        {user.location || "Not specified"}
      </strong>
    </div>
  </div>

  <div className="profile-info-item">
    <span className="profile-info-icon">
      🎯
    </span>

    <div>
      <small>INTERESTS</small>

      <strong>
        {Array.isArray(user.interests) &&
        user.interests.length > 0
          ? user.interests.join(", ")
          : "Not specified"}
      </strong>
    </div>
  </div>

</div>

          {/* ========================================
              ACTIVITY STATS
          ======================================== */}

          <div
            className="profile-info-grid"
            style={{
              marginTop: "14px",
            }}
          >

            <div className="profile-info-item">

              <span className="profile-info-icon">
                🚀
              </span>

              <div>

                <small>
                  ACTIVITIES
                </small>

                <strong>
                  {activities.length}
                </strong>

              </div>

            </div>

            <div className="profile-info-item">

              <span className="profile-info-icon">
                🤝
              </span>

              <div>

                <small>
                  STATUS
                </small>

                <strong>
                  {isOwnProfile
                    ? "Your Profile"
                    : connectionStatus ===
                      "connected"
                    ? "Connected"
                    : connectionStatus ===
                      "sent"
                    ? "Request Sent"
                    : "Available"}
                </strong>

              </div>

            </div>

          </div>

          {/* ========================================
              ABOUT
          ======================================== */}

          <div className="profile-interests">

  <div className="profile-section-heading">
    <span>✦</span>

    <h2>
      About {name}
    </h2>
  </div>

  <p>
    {user.bio?.trim()
      ? user.bio
      : `${name} is part of the Let's Go community and can join activities with people who share similar interests.`}
  </p>

</div>

<div className="profile-interests">

  <div className="profile-section-heading">
    <span>✦</span>

    <h2>
      Interests
    </h2>
  </div>

  {Array.isArray(user.interests) &&
  user.interests.length > 0 ? (

    <div className="public-interest-list">

      {user.interests.map(
        (interest, index) => (
          <span
            key={`${interest}-${index}`}
            className="public-interest-chip"
          >
            {emojiMap[interest] || "✨"}{" "}
            {interest}
          </span>
        )
      )}

    </div>

  ) : (

    <p>
      No interests added yet.
    </p>

  )}

</div>
          {/* ========================================
              ACTIVITIES CREATED
          ======================================== */}

          <div className="profile-interests">

            <div className="profile-section-heading">

              <span>
                ✦
              </span>

              <h2>
                Activities by {name}
              </h2>

            </div>

            {activitiesLoading ? (

              <p>
                Loading activities...
              </p>

            ) : activities.length === 0 ? (

              <p>
                {name} hasn't created any
                activities yet.
              </p>

            ) : (

              <div
                style={{
                  display: "grid",
                  gap: "12px",
                  marginTop: "14px",
                }}
              >

                {activities.map(
                  (activity) => (

                    <Link
                      key={activity._id}
                      to={`/activity/${activity._id}`}
                      style={{
                        textDecoration:
                          "none",
                        color: "inherit",
                        display: "block",
                        padding: "16px",
                        border:
                          "1px solid rgba(148, 163, 184, 0.12)",
                        borderRadius: "16px",
                        background:
                          "rgba(15, 23, 42, 0.55)",
                        transition:
                          "transform 0.2s ease, border-color 0.2s ease",
                      }}
                    >

                      <div
                        style={{
                          display: "flex",
                          alignItems:
                            "flex-start",
                          gap: "12px",
                        }}
                      >

                        <div
                          style={{
                            width: "46px",
                            height: "46px",
                            flexShrink: 0,
                            display: "grid",
                            placeItems:
                              "center",
                            borderRadius:
                              "13px",
                            background:
                              "rgba(124, 58, 237, 0.14)",
                            fontSize: "22px",
                          }}
                        >
                          {emojiMap[
                            activity.category
                          ] || "✨"}
                        </div>

                        <div
                          style={{
                            minWidth: 0,
                            flex: 1,
                          }}
                        >

                          <small
                            style={{
                              color:
                                "#a78bfa",
                              fontSize:
                                "10px",
                              fontWeight:
                                800,
                              letterSpacing:
                                "1px",
                            }}
                          >
                            {activity.category}
                          </small>

                          <h3
                            style={{
                              margin:
                                "4px 0",
                              fontSize:
                                "16px",
                            }}
                          >
                            {activity.title}
                          </h3>

                          <p
                            style={{
                              margin:
                                "5px 0 0",
                              color:
                                "#78839f",
                              fontSize:
                                "12px",
                            }}
                          >
                            📍{" "}
                            {activity.location}
                            {" • "}
                            📅{" "}
                            {formatDate(
                              activity.date
                            )}
                            {" • "}
                            ◷{" "}
                            {activity.time ||
                              "Flexible"}
                          </p>

                        </div>

                        <span
                          style={{
                            color:
                              "#a78bfa",
                            fontWeight:
                              700,
                            fontSize:
                              "13px",
                          }}
                        >
                          →
                        </span>

                      </div>

                    </Link>

                  )
                )}

              </div>

            )}

          </div>

           {/* ========================================
              CONNECTION + MESSAGE
          ======================================== */}

          <div className="profile-actions">

            {isOwnProfile ? (
              <button
                type="button"
                className="profile-connect-btn"
                disabled
              >
                👤 This is your profile
              </button>
            ) : (
              <>
                {/* MESSAGE BUTTON */}
                <button
                  type="button"
                  className="profile-message-btn"
                  onClick={handleMessage}
                >
                  💬 Message
                </button>

                {/* CONNECTION BUTTON */}
                {connectionStatus === "connected" ? (
                  <button
                    type="button"
                    className="profile-connect-btn connection-sent"
                    disabled
                  >
                    ✓ Connected
                  </button>
                ) : connectionStatus === "sent" ? (
                  <button
                    type="button"
                    className="profile-connect-btn connection-sent"
                    disabled
                  >
                    ✓ Request Sent
                  </button>
                ) : connectionStatus === "pending" ? (
                  <button
                    type="button"
                    className="profile-connect-btn connection-sent"
                    disabled
                  >
                    Sending...
                  </button>
                ) : (
                  <button
                    type="button"
                    className="profile-connect-btn"
                    onClick={handleConnect}
                    disabled={connectionLoading}
                  >
                    {connectionLoading
                      ? "Sending..."
                      : "🤝 Connect"}
                  </button>
                )}
              </>
            )}

            {connectionMessage && (
              <p className="connection-message">
                {connectionMessage}
              </p>
            )}

          </div>

        </div>

      </div>

    </div>
  );
}

export default UserProfile;