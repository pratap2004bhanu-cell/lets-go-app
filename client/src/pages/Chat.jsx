import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { io } from "socket.io-client";

import "./Chat.css";

// ========================================
// GET USER ID SAFELY
// ========================================

function getUserId(user) {
  if (!user) return null;

  if (typeof user === "object") {
    return user._id || user.id || user.userId || null;
  }

  return user;
}

// ========================================
// CHAT
// ========================================

function Chat() {
  const { userId } = useParams();
  const navigate = useNavigate();

  const [currentUser] = useState(() => {
    try {
      const storedUser = localStorage.getItem("currentUser");

      if (!storedUser) {
        return null;
      }

      return JSON.parse(storedUser);
    } catch (error) {
      console.error("❌ Current user error:", error);
      return null;
    }
  });
  const [otherUser, setOtherUser] = useState(null);

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  // ========================================
  // GET CURRENT USER
  // ========================================

  useEffect(() => {
    if (!currentUser) {
      navigate("/login");
    }
  }, [currentUser, navigate]);

  // ========================================
  // FETCH OTHER USER
  // ========================================

  useEffect(() => {
    const fetchOtherUser = async () => {
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          navigate("/login");
          return;
        }

        const response = await fetch(
          `https://lets-go-backend-p4ox.onrender.com/api/users/${userId}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        const data = await response.json();

        console.log("👤 Other user response:", data);

        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem("token");
          localStorage.removeItem("currentUser");
          navigate("/login");
          return;
        }

        if (!response.ok) {
          throw new Error(
            data.message || "Unable to load user."
          );
        }

        setOtherUser(data.user || data);
      } catch (error) {
        console.error("❌ Fetch user error:", error);

        setError(
          error.message || "Unable to load user."
        );
      }
    };

    if (userId) {
      fetchOtherUser();
    }
  }, [userId, navigate]);

  // ========================================
  // FETCH MESSAGES
  // ========================================

  const fetchMessages = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/login");
        return;
      }

      setLoading(true);
      setError("");

      const response = await fetch(
        `https://lets-go-backend-p4ox.onrender.com/api/messages/${userId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      console.log("💬 Messages response:", data);

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem("token");
        localStorage.removeItem("currentUser");

        navigate("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to fetch messages."
        );
      }

      setMessages(
        Array.isArray(data)
          ? data
          : data.messages || []
      );
    } catch (error) {
      console.error("❌ Fetch messages error:", error);

      setError(
        error.message || "Unable to load messages."
      );
    } finally {
      setLoading(false);
    }
  }, [navigate, userId]);

  // ========================================
  // LOAD MESSAGES
  // ========================================

  useEffect(() => {
    if (!userId) return;

    const timer = setTimeout(() => {
      fetchMessages();
    }, 0);

    return () => clearTimeout(timer);
  }, [userId, fetchMessages]);

  // ========================================
  // MARK MESSAGES AS READ
  // ========================================

  const markMessagesAsRead = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");

      if (!token) return;

      await fetch(
        `https://lets-go-backend-p4ox.onrender.com/api/messages/${userId}/read`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
    } catch (error) {
      console.error(
        "❌ Mark messages read error:",
        error
      );
    }
  }, [userId]);

  // ========================================
  // MARK MESSAGES READ WHEN CHAT OPENS
  // ========================================

  useEffect(() => {
    if (userId) {
      markMessagesAsRead();
    }
  }, [markMessagesAsRead]);

  // ========================================
  // SOCKET.IO REAL-TIME CHAT
  // ========================================

  useEffect(() => {
    if (!currentUser || !userId) return;

    const currentUserId = getUserId(currentUser);

    if (!currentUserId) {
      console.error("❌ Current user ID not found.");
      return;
    }

    console.log(
      "🔌 Starting chat socket for user:",
      currentUserId
    );

    const socket = io("https://lets-go-backend-p4ox.onrender.com", {
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    // ========================================
    // SOCKET CONNECTED
    // ========================================

    socket.on("connect", () => {
      console.log(
        "🟢 Chat socket connected:",
        socket.id
      );

      // Join personal notification/chat room
      socket.emit(
        "join-user-room",
        currentUserId
      );

      // Join chat room
      socket.emit(
        "join-chat-room",
        currentUserId
      );

      console.log(
        "👤 Joined chat room:",
        currentUserId
      );
    });

    // ========================================
    // RECEIVE NEW MESSAGE
    // ========================================

    socket.on("new-message", (newMessage) => {
      console.log(
        "📩 New real-time message received:",
        newMessage
      );

      if (!newMessage) return;

      const senderId = getUserId(
        newMessage.sender
      );

      const receiverId = getUserId(
        newMessage.receiver
      );

      // Only add messages belonging to this conversation
      const belongsToConversation =
        String(senderId) === String(userId) ||
        String(receiverId) === String(userId);

      if (!belongsToConversation) {
        return;
      }

      setMessages((previousMessages) => {
        // Prevent duplicate message
        const alreadyExists =
          previousMessages.some(
            (message) =>
              String(message._id) ===
              String(newMessage._id)
          );

        if (alreadyExists) {
          return previousMessages;
        }

        return [
          ...previousMessages,
          newMessage,
        ];
      });

      // If we're currently viewing the chat,
      // mark incoming messages as read.
      markMessagesAsRead();
    });

    // ========================================
    // MESSAGE SENT BY CURRENT USER
    // ========================================

    socket.on("message-sent", (newMessage) => {
      console.log(
        "📤 Message sent confirmation:",
        newMessage
      );

      if (!newMessage) return;

      setMessages((previousMessages) => {
        const alreadyExists =
          previousMessages.some(
            (message) =>
              String(message._id) ===
              String(newMessage._id)
          );

        if (alreadyExists) {
          return previousMessages;
        }

        return [
          ...previousMessages,
          newMessage,
        ];
      });
    });

    // ========================================
    // SOCKET ERROR
    // ========================================

    socket.on("connect_error", (error) => {
      console.error(
        "❌ Chat socket connection error:",
        error.message
      );
    });

    // ========================================
    // DISCONNECT
    // ========================================

    socket.on("disconnect", (reason) => {
      console.log(
        "🔴 Chat socket disconnected:",
        reason
      );
    });

    // ========================================
    // CLEANUP
    // ========================================

    return () => {
      console.log(
        "🔌 Closing chat socket"
      );

      socket.off("connect");
      socket.off("new-message");
      socket.off("message-sent");
      socket.off("connect_error");
      socket.off("disconnect");

      socket.disconnect();

      socketRef.current = null;
    };
  }, [currentUser, userId, markMessagesAsRead]);

  // ========================================
  // AUTO SCROLL
  // ========================================

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  // ========================================
  // SEND MESSAGE
  // ========================================

  const sendMessage = async (event) => {
    event.preventDefault();

    if (!text.trim() || sending) {
      return;
    }

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/login");
        return;
      }

      setSending(true);

      const messageText = text.trim();

      const response = await fetch(
        `https://lets-go-backend-p4ox.onrender.com/api/messages/${userId}`,
        {
          method: "POST",

          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            text: messageText,
          }),
        }
      );

      const data = await response.json();

      console.log(
        "📤 Send message response:",
        data
      );

      if (
        response.status === 401 ||
        response.status === 403
      ) {
        localStorage.removeItem("token");
        localStorage.removeItem("currentUser");

        navigate("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to send message."
        );
      }

      const sentMessage = data.message;

      // Add immediately if socket confirmation
      // has not already added it.
      if (sentMessage) {
        setMessages((previousMessages) => {
          const alreadyExists =
            previousMessages.some(
              (message) =>
                String(message._id) ===
                String(sentMessage._id)
            );

          if (alreadyExists) {
            return previousMessages;
          }

          return [
            ...previousMessages,
            sentMessage,
          ];
        });
      }

      setText("");
    } catch (error) {
      console.error(
        "❌ Send message error:",
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

  const handleKeyDown = (event) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();

      sendMessage(event);
    }
  };

  // ========================================
  // USER NAME
  // ========================================

  const otherUserName =
    otherUser?.name ||
    "Let's Go member";

  const currentUserId =
    getUserId(currentUser);

  // ========================================
  // LOADING
  // ========================================

  if (loading) {
    return (
      <div className="chat-page">
        <main className="chat-container">

          <div className="chat-loading">

            <div className="chat-loading-icon">
              💬
            </div>

            <h1>
              Loading conversation...
            </h1>

            <p>
              Getting your messages ready.
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
    <div className="chat-page">

      <main className="chat-container">

        {/* BACK */}

        <Link
          to="/connections"
          className="chat-back"
        >
          ← Back to Connections
        </Link>

        {/* CHAT HEADER */}

        <section className="chat-header">

          <div className="chat-user-avatar">
            {otherUserName
              .charAt(0)
              .toUpperCase()}
          </div>

          <div className="chat-user-info">

            <span>
              LET'S GO MEMBER
            </span>

            <h1>
              {otherUserName}
            </h1>

            <p>
              Send a message and make
              plans together.
            </p>

          </div>

        </section>

        {/* ERROR */}

        {error && (
          <div className="chat-error">
            ⚠ {error}
          </div>
        )}

        {/* MESSAGES */}

        <section className="chat-messages">

          {messages.length === 0 ? (

            <div className="chat-empty">

              <div className="chat-empty-icon">
                👋
              </div>

              <h2>
                Start the conversation
              </h2>

              <p>
                Say hello to{" "}
                {otherUserName}.
              </p>

            </div>

          ) : (

            messages.map((message) => {

              const senderId =
                getUserId(
                  message.sender
                );

              const isMine =
                String(senderId) ===
                String(currentUserId);

              return (
                <div
                  key={message._id}
                  className={`chat-message-row ${
                    isMine
                      ? "chat-message-row-mine"
                      : "chat-message-row-other"
                  }`}
                >

                  <div
                    className={`chat-message ${
                      isMine
                        ? "chat-message-mine"
                        : "chat-message-other"
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
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )
                        : ""}
                    </small>

                  </div>

                </div>
              );
            })

          )}

          <div ref={messagesEndRef} />

        </section>

        {/* MESSAGE INPUT */}

        <form
          className="chat-input-area"
          onSubmit={sendMessage}
        >

          <textarea
            value={text}
            onChange={(event) =>
              setText(event.target.value)
            }
            onKeyDown={handleKeyDown}
            placeholder={`Message ${otherUserName}...`}
            rows="1"
            disabled={sending}
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

export default Chat;