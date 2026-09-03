import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";

import "./MessagePopup.css";

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
// MESSAGE POPUP
// ========================================

function MessagePopup() {
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState(null);
  const [newMessage, setNewMessage] = useState(null);
  const [visible, setVisible] = useState(false);

  const socketRef = useRef(null);
  const timeoutRef = useRef(null);

  // ========================================
  // GET CURRENT USER
  // ========================================

  useEffect(() => {
    let timer;

    try {
      const storedUser = localStorage.getItem("currentUser");

      if (!storedUser) return;

      const parsedUser = JSON.parse(storedUser);

      timer = setTimeout(() => {
        setCurrentUser(parsedUser);
      }, 0);
    } catch (error) {
      console.error("❌ Message popup user error:", error);
    }

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, []);

  // ========================================
  // SOCKET.IO
  // ========================================

  useEffect(() => {
    if (!currentUser) return;

    const currentUserId = getUserId(currentUser);

    if (!currentUserId) return;

    console.log(
      "💬 Starting message popup socket for:",
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
        "🟢 Message popup connected:",
        socket.id
      );

      socket.emit("join-user-room", currentUserId);
    });

    // ========================================
    // NEW MESSAGE
    // ========================================

    socket.on("new-message", (message) => {
      console.log(
        "📩 Popup received message:",
        message
      );

      if (!message) return;

      const senderId = getUserId(message.sender);
      const receiverId = getUserId(message.receiver);

      // Ignore own messages
      if (
        String(senderId) ===
        String(currentUserId)
      ) {
        return;
      }

      // Make sure message belongs to current user
      if (
        String(receiverId) !==
        String(currentUserId)
      ) {
        return;
      }

      // Show popup
      setNewMessage(message);
      setVisible(true);

      // Clear previous timer
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Hide after 7 seconds
      timeoutRef.current = setTimeout(() => {
        setVisible(false);
      }, 7000);
    });

    // ========================================
    // SOCKET ERROR
    // ========================================

    socket.on("connect_error", (error) => {
      console.error(
        "❌ Message popup socket error:",
        error.message
      );
    });

    // ========================================
    // CLEANUP
    // ========================================

    return () => {
      console.log(
        "🔌 Closing message popup socket"
      );

      socket.off("connect");
      socket.off("new-message");
      socket.off("connect_error");

      socket.disconnect();

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      socketRef.current = null;
    };
  }, [currentUser]);

  // ========================================
  // OPEN CHAT
  // ========================================

  const openChat = () => {
    if (!newMessage) return;

    const senderId = getUserId(newMessage.sender);

    if (!senderId) return;

    setVisible(false);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    navigate(`/chat/${senderId}`);
  };

  // ========================================
  // CLOSE POPUP
  // ========================================

  const closePopup = (event) => {
    event.stopPropagation();

    setVisible(false);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  // ========================================
  // DON'T RENDER
  // ========================================

  if (!visible || !newMessage) {
    return null;
  }

  // ========================================
  // MESSAGE DATA
  // ========================================

  const sender = newMessage.sender;

  const senderName =
    sender?.name || "Let's Go member";

  const senderInitial = senderName
    .charAt(0)
    .toUpperCase();

  const messageText =
    newMessage.text ||
    "You received a new message.";

  // ========================================
  // UI
  // ========================================

  return (
    <div
      className="message-popup"
      onClick={openChat}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          openChat();
        }
      }}
    >
      {/* TOP ACCENT */}
      <div className="message-popup-accent" />

      {/* CLOSE */}
      <button
        type="button"
        className="message-popup-close"
        onClick={closePopup}
        aria-label="Close message"
      >
        ×
      </button>

      {/* HEADER */}
      <div className="message-popup-header">
        <div className="message-popup-header-icon">
          <span>💬</span>
        </div>

        <div className="message-popup-header-text">
          <span className="message-popup-label">
            NEW MESSAGE
          </span>

          <h3>
            You have a new message
          </h3>
        </div>

        <div className="message-popup-live">
          <span />
          LIVE
        </div>
      </div>

      {/* MESSAGE */}
      <div className="message-popup-message">
        {/* AVATAR */}
        <div className="message-popup-avatar-wrapper">
          <div className="message-popup-avatar">
            {senderInitial}
          </div>

          <span className="message-popup-online" />
        </div>

        {/* CONTENT */}
        <div className="message-popup-content">
          <div className="message-popup-name-row">
            <strong>
              {senderName}
            </strong>

            <span className="message-popup-time">
              Now
            </span>
          </div>

          <p>{messageText}</p>
        </div>
      </div>

      {/* ACTION */}
      <div className="message-popup-footer">
        <span className="message-popup-open-text">
          Open conversation
        </span>

        <div className="message-popup-arrow">
          →
        </div>
      </div>

      {/* PROGRESS */}
      <div className="message-popup-progress">
        <span />
      </div>
    </div>
  );
}

export default MessagePopup;