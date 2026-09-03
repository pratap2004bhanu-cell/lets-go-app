import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";

import { io } from "socket.io-client";

import "./ActivityChat.css";

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
// ACTIVITY GROUP CHAT
// ========================================

function ActivityChat() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [currentUser] = useState(() => {
    try {
      const storedUser =
        localStorage.getItem("currentUser");

      if (!storedUser) return null;

      return JSON.parse(storedUser);
    } catch (error) {
      console.error(
        "❌ Current user error:",
        error
      );

      return null;
    }
  });

  const [activity, setActivity] =
    useState(null);

  const [messages, setMessages] =
    useState([]);

  const [text, setText] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [sending, setSending] =
    useState(false);

  const [error, setError] =
    useState("");

  const socketRef =
    useRef(null);

  const messagesEndRef =
    useRef(null);

  // ========================================
  // LOGIN CHECK
  // ========================================

  useEffect(() => {
    if (!currentUser) {
      navigate("/login");
    }
  }, [
    currentUser,
    navigate,
  ]);

  // ========================================
  // FETCH CHAT
  // ========================================

  const fetchChat =
    useCallback(async () => {
      try {
        const token =
          localStorage.getItem("token");

        if (!token) {
          navigate("/login");
          return;
        }

        setLoading(true);
        setError("");

        const response =
          await fetch(
            `http://localhost:5001/api/activity-messages/${id}?_=${Date.now()}`,
            {
              method: "GET",
              cache: "no-store",
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
          if (
            response.status === 401
          ) {
            localStorage.removeItem(
              "token"
            );

            localStorage.removeItem(
              "currentUser"
            );

            navigate("/login");
          } else {
            setError(
              data.message ||
                "You are not a member of this activity."
            );
          }

          return;
        }

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Unable to load activity chat."
          );
        }

        setActivity(
          data.activity || null
        );

        setMessages(
          Array.isArray(
            data.messages
          )
            ? data.messages
            : []
        );
      } catch (error) {
        console.error(
          "❌ Activity chat fetch error:",
          error
        );

        setError(
          error.message ||
            "Unable to load activity chat."
        );
      } finally {
        setLoading(false);
      }
    }, [
      id,
      navigate,
    ]);

  useEffect(() => {
    if (id) {
      fetchChat();
    }
  }, [
    id,
    fetchChat,
  ]);

  // ========================================
  // SOCKET.IO ACTIVITY ROOM
  // ========================================

  useEffect(() => {
    if (
      !currentUser ||
      !id
    ) {
      return;
    }

    const token =
      localStorage.getItem("token");

    if (!token) return;

    const socket =
      io(
        "http://localhost:5001",
        {
          transports: [
            "websocket",
            "polling",
          ],

          auth: {
            token,
          },
        }
      );

      const currentUserId = getUserId(currentUser);

if (currentUserId) {
  socket.emit("join-user-room", currentUserId);
}

    socketRef.current =
      socket;

    socket.on(
      "connect",
      () => {
        console.log(
          "🟢 Activity chat socket connected:",
          socket.id
        );

        socket.emit(
          "join-activity-room",
          id
        );
      }
    );

    socket.on(
      "activity-new-message",
      (newMessage) => {
        if (!newMessage) return;

        const messageActivityId =
          newMessage.activity?._id ||
          newMessage.activity;

        if (
          String(
            messageActivityId
          ) !== String(id)
        ) {
          return;
        }

        setMessages(
          (previousMessages) => {
            const alreadyExists =
              previousMessages.some(
                (message) =>
                  String(
                    message._id
                  ) ===
                  String(
                    newMessage._id
                  )
              );

            if (
              alreadyExists
            ) {
              return previousMessages;
            }

            return [
              ...previousMessages,
              newMessage,
            ];
          }
        );
      }
    );

    socket.on(
      "activity-chat-error",
      (message) => {
        console.error(
          "❌ Activity chat socket error:",
          message
        );

        setError(
          message ||
            "Unable to join activity chat."
        );
      }
    );

    socket.on("activity-member-removed", (data) => {
  if (String(data.activityId) !== String(id)) {
    return;
  }

  setError(
    data.message ||
      "You have been removed from this activity."
  );

  setTimeout(() => {
    navigate(`/activity/${id}`);
  }, 1500);
});

    socket.on(
      "connect_error",
      (socketError) => {
        console.error(
          "❌ Activity chat socket error:",
          socketError.message
        );
      }
    );

    return () => {
      socket.emit(
        "leave-activity-room",
        id
      );

      socket.off(
        "connect"
      );

      socket.off(
        "activity-new-message"
      );

      socket.off(
        "activity-chat-error"
      );

      socket.off(
        "connect_error"
      );

      socket.disconnect();

      socketRef.current =
        null;
    };
  }, [
    currentUser,
    id,
  ]);

  // ========================================
  // AUTO SCROLL
  // ========================================

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView(
      {
        behavior: "smooth",
      }
    );
  }, [messages]);

  // ========================================
  // SEND MESSAGE
  // ========================================

  const sendMessage =
    async (event) => {
      event.preventDefault();

      if (
        !text.trim() ||
        sending
      ) {
        return;
      }

      try {
        const token =
          localStorage.getItem(
            "token"
          );

        if (!token) {
          navigate("/login");
          return;
        }

        setSending(true);
        setError("");

        const response =
          await fetch(
            `http://localhost:5001/api/activity-messages/${id}`,
            {
              method: "POST",

              headers: {
                Authorization:
                  `Bearer ${token}`,
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                text: text.trim(),
              }),
            }
          );

        const data =
          await response.json();

        if (
          response.status === 401 ||
          response.status === 403
        ) {
          if (
            response.status === 401
          ) {
            localStorage.removeItem(
              "token"
            );

            localStorage.removeItem(
              "currentUser"
            );

            navigate("/login");
          } else {
            setError(
              data.message ||
                "You are not allowed to send messages."
            );
          }

          return;
        }

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Unable to send message."
          );
        }

        const sentMessage =
          data.message;

        if (sentMessage) {
          setMessages(
            (previousMessages) => {
              const alreadyExists =
                previousMessages.some(
                  (message) =>
                    String(
                      message._id
                    ) ===
                    String(
                      sentMessage._id
                    )
                );

              if (
                alreadyExists
              ) {
                return previousMessages;
              }

              return [
                ...previousMessages,
                sentMessage,
              ];
            }
          );
        }

        setText("");
      } catch (error) {
        console.error(
          "❌ Activity message send error:",
          error
        );

        setError(
          error.message ||
            "Unable to send message."
        );
      } finally {
        setSending(false);
      }
    };

  // ========================================
  // ENTER KEY
  // ========================================

  const handleKeyDown =
    (event) => {
      if (
        event.key === "Enter" &&
        !event.shiftKey
      ) {
        event.preventDefault();

        sendMessage(event);
      }
    };

  // ========================================
  // USER INFO
  // ========================================

  const currentUserId =
    getUserId(
      currentUser
    );

  const memberCount =
    (activity?.joinedUsers
      ?.length || 0) + 1;

  // ========================================
  // LOADING
  // ========================================

  if (loading) {
    return (
      <div className="activity-chat-page">
        <main className="activity-chat-container">
          <div className="activity-chat-loading">
            <div className="activity-chat-loading-icon">
              💬
            </div>

            <h1>
              Loading group chat...
            </h1>

            <p>
              Getting your activity conversation ready.
            </p>
          </div>
        </main>
      </div>
    );
  }

  // ========================================
  // ERROR
  // ========================================

  if (
    error &&
    !activity
  ) {
    return (
      <div className="activity-chat-page">
        <main className="activity-chat-container">
          <Link
            to={`/activity/${id}`}
            className="activity-chat-back"
          >
            ← Back to Activity
          </Link>

          <div className="activity-chat-error-card">
            <div className="activity-chat-big-icon">
              🔒
            </div>

            <h1>
              Group chat unavailable
            </h1>

            <p>
              {error}
            </p>

            <Link
              to={`/activity/${id}`}
              className="activity-chat-primary-btn"
            >
              Back to Activity →
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="activity-chat-page">
      <main className="activity-chat-container">
        <Link
          to={`/activity/${id}`}
          className="activity-chat-back"
        >
          ← Back to Activity
        </Link>

        <section className="activity-chat-header">
          <div className="activity-chat-header-icon">
            💬
          </div>

          <div className="activity-chat-header-info">
            <span>
              ACTIVITY GROUP CHAT
            </span>

            <h1>
              {activity?.title ||
                "Let's Go Activity"}
            </h1>

            <p>
              {activity?.category ||
                "Activity"}{" "}
              • {memberCount}{" "}
              {memberCount === 1
                ? "member"
                : "members"}
            </p>
          </div>
        </section>

        {error && (
          <div className="activity-chat-error">
            ⚠ {error}
          </div>
        )}

        <section className="activity-chat-messages">
          {messages.length === 0 ? (
            <div className="activity-chat-empty">
              <div className="activity-chat-empty-icon">
                👋
              </div>

              <h2>
                Start the group conversation
              </h2>

              <p>
                Say hello and start making plans
                with your activity members.
              </p>
            </div>
          ) : (
            messages.map(
              (message) => {
                const senderId =
                  getUserId(
                    message.sender
                  );

                const isMine =
                  String(
                    senderId
                  ) ===
                  String(
                    currentUserId
                  );

                const senderName =
                  message.sender
                    ?.name ||
                  "Let's Go member";

                return (
                  <div
                    key={
                      message._id
                    }
                    className={`activity-chat-message-row ${
                      isMine
                        ? "activity-chat-message-row-mine"
                        : "activity-chat-message-row-other"
                    }`}
                  >
                    {!isMine && (
                      <div className="activity-chat-sender-name">
                        {senderName}
                      </div>
                    )}

                    <div
                      className={`activity-chat-message ${
                        isMine
                          ? "activity-chat-message-mine"
                          : "activity-chat-message-other"
                      }`}
                    >
                      <p>
                        {message.text}
                      </p>

                      <small>
                        {message.createdAt
                          ? new Date(
                              message.createdAt
                            ).toLocaleTimeString(
                              "en-IN",
                              {
                                hour:
                                  "2-digit",
                                minute:
                                  "2-digit",
                              }
                            )
                          : ""}
                      </small>
                    </div>
                  </div>
                );
              }
            )
          )}

          <div
            ref={
              messagesEndRef
            }
          />
        </section>

        <form
          className="activity-chat-input-area"
          onSubmit={
            sendMessage
          }
        >
          <textarea
            value={text}
            onChange={(
              event
            ) =>
              setText(
                event.target
                  .value
              )
            }
            onKeyDown={
              handleKeyDown
            }
            placeholder="Message the activity group..."
            rows="1"
            disabled={
              sending
            }
          />

          <button
            type="submit"
            disabled={
              sending ||
              !text.trim()
            }
          >
            {sending
              ? "Sending..."
              : "Send →"}
          </button>
        </form>
      </main>
    </div>
  );
}

export default ActivityChat;