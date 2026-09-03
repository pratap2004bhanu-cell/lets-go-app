import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import "./Connections.css";

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
// GET USER INITIALS
// ========================================

function getInitials(name) {
  if (!name) return "?";

  return name
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function Connections() {
  const navigate = useNavigate();

  const [requests, setRequests] = useState([]);
  const [connections, setConnections] = useState([]);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] =
    useState(null);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // ========================================
  // GET TOKEN
  // ========================================

  const getToken = () => {
    return localStorage.getItem("token");
  };

  // ========================================
  // FETCH REQUESTS + CONNECTIONS
  // ========================================

  const fetchConnections = async () => {
    try {
      setLoading(true);
      setError("");

      const token = getToken();

      if (!token) {
        navigate("/login");
        return;
      }

      // ========================================
      // PENDING REQUESTS
      // ========================================

      const requestsResponse =
        await fetch(
          "http://localhost:5001/api/connections/requests",
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

      const requestsData =
        await requestsResponse.json();

      if (
        requestsResponse.status === 401 ||
        requestsResponse.status === 403
      ) {
        localStorage.removeItem("token");
        localStorage.removeItem(
          "currentUser"
        );

        navigate("/login");
        return;
      }

      if (!requestsResponse.ok) {
        throw new Error(
          requestsData.message ||
            "Unable to fetch requests."
        );
      }

      // ========================================
      // MY CONNECTIONS
      // ========================================

      const connectionsResponse =
        await fetch(
          "http://localhost:5001/api/connections",
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

      const connectionsData =
        await connectionsResponse.json();

      if (
        connectionsResponse.status === 401 ||
        connectionsResponse.status === 403
      ) {
        localStorage.removeItem("token");
        localStorage.removeItem(
          "currentUser"
        );

        navigate("/login");
        return;
      }

      if (!connectionsResponse.ok) {
        throw new Error(
          connectionsData.message ||
            "Unable to fetch connections."
        );
      }

      // ========================================
      // HANDLE DIFFERENT RESPONSE SHAPES
      // ========================================

      const pendingRequests =
        Array.isArray(requestsData)
          ? requestsData
          : requestsData.requests ||
            requestsData.connections ||
            [];

      const myConnections =
        Array.isArray(connectionsData)
          ? connectionsData
          : connectionsData.connections ||
            [];

      setRequests(
        pendingRequests
      );

      setConnections(
        myConnections
      );
    } catch (error) {
      console.error(
        "Fetch connections error:",
        error
      );

      setError(
        error.message ||
          "Unable to load connections."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConnections();
  }, []);

  // ========================================
  // ACCEPT REQUEST
  // ========================================

  const handleAccept = async (
    connectionId
  ) => {
    try {
      setActionLoading(
        connectionId
      );

      setError("");
      setMessage("");

      const token = getToken();

      if (!token) {
        navigate("/login");
        return;
      }

      const response =
        await fetch(
          `http://localhost:5001/api/connections/${connectionId}/accept`,
          {
            method: "PUT",
            headers: {
              Authorization:
                `Bearer ${token}`,
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
        throw new Error(
          data.message ||
            "Unable to accept request."
        );
      }

      setMessage(
        "Connection accepted successfully! 🎉"
      );

      await fetchConnections();
    } catch (error) {
      console.error(
        "Accept request error:",
        error
      );

      setError(
        error.message ||
          "Unable to accept request."
      );
    } finally {
      setActionLoading(null);
    }
  };

  // ========================================
  // REJECT REQUEST
  // ========================================

  const handleReject = async (
    connectionId
  ) => {
    try {
      setActionLoading(
        connectionId
      );

      setError("");
      setMessage("");

      const token = getToken();

      if (!token) {
        navigate("/login");
        return;
      }

      const response =
        await fetch(
          `http://localhost:5001/api/connections/${connectionId}/reject`,
          {
            method: "PUT",
            headers: {
              Authorization:
                `Bearer ${token}`,
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
        throw new Error(
          data.message ||
            "Unable to reject request."
        );
      }

      setMessage(
        "Connection request rejected."
      );

      await fetchConnections();
    } catch (error) {
      console.error(
        "Reject request error:",
        error
      );

      setError(
        error.message ||
          "Unable to reject request."
      );
    } finally {
      setActionLoading(null);
    }
  };

  // ========================================
  // GET OTHER USER FROM CONNECTION
  // ========================================

  const getOtherUser = (
    connection
  ) => {
    try {
      const storedUser =
        localStorage.getItem(
          "currentUser"
        );

      if (!storedUser) {
        return null;
      }

      const loggedInUser =
        JSON.parse(storedUser);

      const loggedInId =
        getUserId(
          loggedInUser
        );

      const sender =
        connection?.sender;

      const receiver =
        connection?.receiver;

      const senderId =
        getUserId(sender);

      const receiverId =
        getUserId(receiver);

      if (
        senderId &&
        String(senderId) ===
          String(loggedInId)
      ) {
        return receiver;
      }

      if (
        receiverId &&
        String(receiverId) ===
          String(loggedInId)
      ) {
        return sender;
      }

      return receiver || sender;
    } catch (error) {
      console.error(
        "Get other user error:",
        error
      );

      return null;
    }
  };

  // ========================================
  // LOADING
  // ========================================

  if (loading) {
    return (
      <div className="connections-page">

        <main className="connections-container">

          <div className="connections-loading">

            <div className="connections-loading-icon">
              ⏳
            </div>

            <h1>
              Loading connections...
            </h1>

            <p>
              Finding your people.
            </p>

          </div>

        </main>

      </div>
    );
  }

  // ========================================
  // PAGE
  // ========================================

  return (
    <div className="connections-page">

      <main className="connections-container">

        {/* ========================================
            BACK
        ======================================== */}

        <Link
          to="/discover"
          className="connections-back"
        >
          ← Back to Discover
        </Link>

        {/* ========================================
            HERO
        ======================================== */}

        <section className="connections-hero">

          <div className="connections-hero-icon">
            🤝
          </div>

          <div>

            <span>
              YOUR NETWORK
            </span>

            <h1>
              Connections
            </h1>

            <p>
              Meet people, build connections,
              and make plans together.
            </p>

          </div>

        </section>

        {/* ========================================
            MESSAGE
        ======================================== */}

        {message && (
          <div className="connections-success">
            ✓ {message}
          </div>
        )}

        {/* ========================================
            ERROR
        ======================================== */}

        {error && (
          <div className="connections-error">
            ⚠ {error}
          </div>
        )}

        {/* ========================================
            CONNECTION REQUESTS
        ======================================== */}

        <section className="connections-section">

          <div className="connections-section-heading">

            <div>

              <span>
                PENDING
              </span>

              <h2>
                Connection Requests
              </h2>

            </div>

            <div className="connections-count">
              {requests.length}
            </div>

          </div>

          {requests.length === 0 ? (

            <div className="connections-empty">

              <div className="connections-empty-icon">
                📨
              </div>

              <h3>
                No pending requests
              </h3>

              <p>
                New connection requests will
                appear here.
              </p>

            </div>

          ) : (

            <div className="request-list">

              {requests.map(
                (request) => {

                  const sender =
                    request?.sender;

                  const senderId =
                    getUserId(sender);

                  const senderName =
                    sender?.name ||
                    "Unknown User";

                  return (
                    <article
                      className="request-card"
                      key={request._id}
                    >

                      {/* USER */}

                      {senderId ? (

                        <Link
                          to={`/user/${senderId}`}
                          className="request-user-link"
                        >

                          <div className="request-avatar">
                            {getInitials(
                              senderName
                            )}
                          </div>

                          <div className="request-info">

                            <h3>
                              {senderName}
                            </h3>

                            <p>
                              wants to connect
                              with you
                            </p>

                          </div>

                        </Link>

                      ) : (

                        <div className="request-user-link">

                          <div className="request-avatar">
                            {getInitials(
                              senderName
                            )}
                          </div>

                          <div className="request-info">

                            <h3>
                              {senderName}
                            </h3>

                            <p>
                              wants to connect
                              with you
                            </p>

                          </div>

                        </div>

                      )}

                      {/* ACTIONS */}

                      <div className="request-actions">

                        <button
                          type="button"
                          className="accept-btn"
                          onClick={() =>
                            handleAccept(
                              request._id
                            )
                          }
                          disabled={
                            actionLoading ===
                            request._id
                          }
                        >
                          {actionLoading ===
                          request._id
                            ? "..."
                            : "✓ Accept"}
                        </button>

                        <button
                          type="button"
                          className="reject-btn"
                          onClick={() =>
                            handleReject(
                              request._id
                            )
                          }
                          disabled={
                            actionLoading ===
                            request._id
                          }
                        >
                          {actionLoading ===
                          request._id
                            ? "..."
                            : "✕ Reject"}
                        </button>

                      </div>

                    </article>
                  );
                }
              )}

            </div>

          )}

        </section>

        {/* ========================================
            MY CONNECTIONS
        ======================================== */}

        <section className="connections-section">

          <div className="connections-section-heading">

            <div>

              <span>
                YOUR PEOPLE
              </span>

              <h2>
                My Connections
              </h2>

            </div>

            <div className="connections-count">
              {connections.length}
            </div>

          </div>

          {connections.length === 0 ? (

            <div className="connections-empty">

              <div className="connections-empty-icon">
                🤝
              </div>

              <h3>
                No connections yet
              </h3>

              <p>
                Discover activities and connect
                with people who share your interests.
              </p>

              <Link
                to="/discover"
                className="connections-discover-btn"
              >
                Discover People →
              </Link>

            </div>

          ) : (

            <div className="connection-grid">

              {connections.map(
                (connection) => {

                  const person =
                    getOtherUser(
                      connection
                    );

                  if (!person) {
                    return null;
                  }

                  const personId =
                    getUserId(
                      person
                    );

                  const personName =
                    person.name ||
                    "User";

                  const initials =
                    getInitials(
                      personName
                    );

                  return (
                    <article
                      className="connection-card"
                      key={connection._id}
                    >

                      {/* AVATAR */}

                      {personId ? (

                        <Link
                          to={`/user/${personId}`}
                          className="connection-person-link"
                        >

                          <div className="connection-avatar">
                            {initials}
                          </div>

                          <div className="connection-info">

                            <span>
                              CONNECTED
                            </span>

                            <h3>
                              {personName}
                            </h3>

                            <p>
                              {person.email ||
                                "Let's Go member"}
                            </p>

                          </div>

                        </Link>

                      ) : (

                        <div className="connection-person-link">

                          <div className="connection-avatar">
                            {initials}
                          </div>

                          <div className="connection-info">

                            <span>
                              CONNECTED
                            </span>

                            <h3>
                              {personName}
                            </h3>

                            <p>
                              {person.email ||
                                "Let's Go member"}
                            </p>

                          </div>

                        </div>

                      )}

                      {/* ========================================
                          CONNECTION ACTIONS
                      ======================================== */}

                      {personId && (
  <div className="connection-actions">

                          <Link
                            to={`/user/${personId}`}
                            className="connection-view-btn"
                          >
                            View Profile →
                          </Link>

                         <Link
  to={`/chat/${personId}`}
  className="message-button"
>
  <span className="message-button-icon">
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M20 11.5C20 15.6421 16.1944 19 11.5 19C10.2737 19 9.11162 18.7739 8.06623 18.367L4 20L5.31662 16.6221C4.48825 15.2255 4 13.6204 4 11.5C4 7.35786 7.80558 4 12.5 4C17.1944 4 20 7.35786 20 11.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.5 11.5H8.51"
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
        d="M15.5 11.5H15.51"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  </span>

  <span className="message-button-text">
    Message
  </span>

  <span className="message-button-arrow">
    →
  </span>
</Link>

                        </div>
                      )}

                    </article>
                  );
                }
              )}

            </div>

          )}

        </section>

      </main>

    </div>
  );
}

export default Connections;