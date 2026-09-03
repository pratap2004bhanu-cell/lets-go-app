import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import "./Messages.css";

function getUserId(user) {
  if (!user) return null;

  if (typeof user === "object") {
    return user._id || user.id || user.userId || null;
  }

  return user;
}

function formatMessageTime(date) {
  if (!date) return "";

  const messageDate = new Date(date);

  if (Number.isNaN(messageDate.getTime())) {
    return "";
  }

  const now = new Date();

  const isToday =
    messageDate.toDateString() === now.toDateString();

  if (isToday) {
    return messageDate.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return messageDate.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
}

function Messages() {
  const navigate = useNavigate();

  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        setLoading(true);
        setError("");

        const token = localStorage.getItem("token");

        if (!token) {
          navigate("/login");
          return;
        }

        const response = await fetch(
          "https://lets-go-backend-p4ox.onrender.com/api/messages/conversations",
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        const data = await response.json();

        console.log(
          "💬 Conversations response:",
          response.status,
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
              "Unable to fetch conversations."
          );
        }

        setConversations(
          Array.isArray(data.conversations)
            ? data.conversations
            : []
        );
      } catch (error) {
        console.error(
          "❌ Fetch conversations error:",
          error
        );

        setError(
          error.message ||
            "Unable to load messages."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, [navigate]);

  const filteredConversations =
    conversations.filter((conversation) => {
      const name =
        conversation.user?.name || "";

      return name
        .toLowerCase()
        .includes(search.toLowerCase());
    });

  const openConversation = (userId) => {
    if (!userId) return;

    navigate(`/chat/${userId}`);
  };

  if (loading) {
    return (
      <div className="messages-page">
        <main className="messages-container">

          <Link
            to="/"
            className="messages-back"
          >
            ← Back to Home
          </Link>

          <div className="messages-card messages-loading">
            <div className="messages-big-icon">
              💬
            </div>

            <h1>Loading messages...</h1>

            <p>
              Checking your conversations.
            </p>
          </div>

        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="messages-page">
        <main className="messages-container">

          <Link
            to="/"
            className="messages-back"
          >
            ← Back to Home
          </Link>

          <div className="messages-card messages-error">

            <div className="messages-big-icon">
              ⚠️
            </div>

            <h1>
              Couldn't load messages
            </h1>

            <p>{error}</p>

            <button
              type="button"
              className="messages-primary-btn"
              onClick={() =>
                window.location.reload()
              }
            >
              Try Again →
            </button>

          </div>

        </main>
      </div>
    );
  }

  return (
    <div className="messages-page">

      <main className="messages-container">

        <Link
          to="/"
          className="messages-back"
        >
          ← Back to Home
        </Link>

        {/* HEADER */}

        <section className="messages-header">

          <div className="messages-header-icon">
            💬
          </div>

          <div>
            <span>
              YOUR CONVERSATIONS
            </span>

            <h1>
              Messages
            </h1>

            <p>
              Stay connected with your
              Let's Go people.
            </p>
          </div>

        </section>

        {/* SEARCH */}

        <section className="messages-search-section">

          <div className="messages-search">

            <span>🔍</span>

            <input
              type="text"
              placeholder="Search conversations..."
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />

            {search && (
              <button
                type="button"
                onClick={() =>
                  setSearch("")
                }
              >
                ×
              </button>
            )}

          </div>

        </section>

        {/* CONVERSATIONS */}

        <section className="messages-list">

          <div className="messages-list-heading">

            <div>
              <span>
                RECENT
              </span>

              <h2>
                Your Chats
              </h2>
            </div>

            <div className="messages-count">
              {conversations.length}
            </div>

          </div>

          {filteredConversations.length === 0 ? (

            <div className="messages-empty">

              <div className="messages-empty-icon">
                {search ? "🔍" : "💬"}
              </div>

              <h2>
                {search
                  ? "No conversations found"
                  : "No conversations yet"}
              </h2>

              <p>
                {search
                  ? "Try searching for another person."
                  : "Connect with someone and start a conversation."}
              </p>

              {!search && (
                <Link
                  to="/discover"
                  className="messages-primary-btn"
                >
                  Discover People →
                </Link>
              )}

            </div>

          ) : (

            filteredConversations.map(
              (conversation) => {

                const user =
                  conversation.user;

                const userId =
                  getUserId(user);

                const name =
                  user?.name ||
                  "Let's Go member";

                const initial =
                  name
                    .charAt(0)
                    .toUpperCase();

                const lastMessage =
                  conversation.lastMessage;

                const unreadCount =
                  conversation.unreadCount || 0;

                return (
                  <article
                    key={userId}
                    className={`conversation-item ${
                      unreadCount > 0
                        ? "conversation-unread"
                        : ""
                    }`}
                    onClick={() =>
                      openConversation(userId)
                    }
                  >

                    {/* AVATAR */}

                    <div className="conversation-avatar">
                      {initial}
                    </div>

                    {/* CONTENT */}

                    <div className="conversation-content">

                      <div className="conversation-top">

                        <h3>
                          {name}
                        </h3>

                        <span>
                          {formatMessageTime(
                            lastMessage?.createdAt
                          )}
                        </span>

                      </div>

                      <div className="conversation-bottom">

                        <p>
                          {lastMessage?.text ||
                            "Start a conversation"}
                        </p>

                        {unreadCount > 0 && (
                          <div className="conversation-unread-count">
                            {unreadCount}
                          </div>
                        )}

                      </div>

                    </div>

                    {/* ARROW */}

                    <div className="conversation-arrow">
                      →
                    </div>

                  </article>
                );
              }
            )

          )}

        </section>

      </main>

    </div>
  );
}

export default Messages;