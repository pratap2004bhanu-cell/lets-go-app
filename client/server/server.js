const express = require("express");

const cors = require("cors");

const mongoose = require("mongoose");

const http = require("http");

const { Server } = require("socket.io");

const jwt = require("jsonwebtoken");

const Activity = require("./models/Activity");

require("dotenv").config();

// ========================================
// ROUTES
// ========================================

const authRoutes = require("./routes/auth");

const activityRoutes = require("./routes/activities");

const userRoutes = require("./routes/users");

const connectionRoutes = require("./routes/connections");

const notificationRoutes = require("./routes/notifications");

const messageRoutes = require("./routes/messages");

const activityMessageRoutes =
  require("./routes/activityMessages");

  const ratingRoutes =
  require("./routes/ratings");

// ========================================
// APP
// ========================================

const app = express();

const PORT = process.env.PORT || 5001;

// ========================================
// HTTP SERVER
// ========================================

const server = http.createServer(app);

// ========================================
// SOCKET.IO
// ========================================

const io = new Server(server, {

  cors: {

    origin: "http://localhost:5173",

    methods: ["GET", "POST", "PUT", "DELETE"],

  },

});

app.set("io", io);

// ========================================
// SOCKET CONNECTIONS
// ========================================

io.on("connection", (socket) => {

  console.log(
    "🔌 Socket connected:",
    socket.id
  );

  // ========================================
  // USER JOINS PERSONAL ROOM
  // ========================================

  socket.on(
    "join-user-room",
    (userId) => {

      if (!userId) return;

      socket.join(
        `user-${userId}`
      );

      console.log(
        `👤 User ${userId} joined notification room`
      );

    }
  );

  // ========================================
  // JOIN CHAT ROOM
  // ========================================

  socket.on(
    "join-chat-room",
    (userId) => {

      if (!userId) return;

      socket.join(
        `user-${userId}`
      );

      console.log(
        `💬 User ${userId} joined chat room`
      );

    }
  );

  // ========================================
  // JOIN ACTIVITY GROUP CHAT
  // ========================================

  socket.on(
    "join-activity-room",
    async (activityId) => {

      try {

        if (!activityId) {
          return;
        }

        // ========================================
        // GET TOKEN FROM SOCKET
        // ========================================

        const authHeader =
  socket.handshake.headers?.authorization;

const token =
  socket.handshake.auth?.token ||
  (
    authHeader &&
    authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null
  );

        if (!token) {

          socket.emit(
            "activity-chat-error",
            "Authentication required."
          );

          return;

        }

        // ========================================
        // VERIFY TOKEN
        // ========================================

        const decoded =
          jwt.verify(
            token,
            process.env.JWT_SECRET
          );

        const userId =
          decoded.userId ||
          decoded.id ||
          decoded._id;

        if (!userId) {

          socket.emit(
            "activity-chat-error",
            "Invalid authentication."
          );

          return;

        }

        // ========================================
        // FIND ACTIVITY
        // ========================================

        const activity =
          await Activity.findById(
            activityId
          );

        if (!activity) {

          socket.emit(
            "activity-chat-error",
            "Activity not found."
          );

          return;

        }

        // ========================================
        // CHECK ACTIVITY CREATOR
        // ========================================

        const isCreator =
          String(
            activity.creatorId
          ) ===
          String(userId);

        // ========================================
        // CHECK ACTIVITY MEMBER
        // ========================================

        const isJoined =
          (
            activity.joinedUsers ||
            []
          ).some(
            (member) =>
              String(
                member?.userId
              ) ===
              String(userId)
          );

        // ========================================
        // SECURITY CHECK
        // ========================================

        if (
          !isCreator &&
          !isJoined
        ) {

          socket.emit(
            "activity-chat-error",
            "Only activity members can access this group chat."
          );

          return;

        }

        // ========================================
        // JOIN ACTIVITY ROOM
        // ========================================

        socket.join(
          `activity-${activityId}`
        );

        console.log(
          `💬 User ${userId} joined activity room ${activityId}`
        );

      } catch (error) {

        console.error(
          "❌ Activity room join error:",
          error.message
        );

        socket.emit(
          "activity-chat-error",
          "Unable to join activity chat."
        );

      }

    }
  );

  // ========================================
  // LEAVE ACTIVITY GROUP CHAT
  // ========================================

  socket.on(
    "leave-activity-room",
    (activityId) => {

      if (!activityId) {
        return;
      }

      socket.leave(
        `activity-${activityId}`
      );

      console.log(
        `💬 Socket ${socket.id} left activity room ${activityId}`
      );

    }
  );

  // ========================================
  // DISCONNECT
  // ========================================

  socket.on(
    "disconnect",
    () => {

      console.log(
        "🔌 Socket disconnected:",
        socket.id
      );

    }
  );

});

// Make Socket.IO available to routes

app.set("io", io);

// ========================================
// MIDDLEWARE
// ========================================

app.use(cors());

app.use(express.json({ limit: "10mb" }));

// ========================================
// API ROUTES
// ========================================

app.use(
  "/api/auth",
  authRoutes
);

app.use(
  "/api/activities",
  activityRoutes
);

app.use(
  "/api/users",
  userRoutes
);

app.use(
  "/api/connections",
  connectionRoutes
);

app.use(
  "/api/notifications",
  notificationRoutes
);

app.use(
  "/api/messages",
  messageRoutes
);

// ========================================
// ACTIVITY GROUP CHAT ROUTES
// ========================================

app.use(
  "/api/activity-messages",
  activityMessageRoutes
);

// ========================================
// ACTIVITY RATING ROUTES
// ========================================

app.use(
  "/api/ratings",
  ratingRoutes
);

// ========================================
// TEST ROUTE
// ========================================

app.get(
  "/",
  (req, res) => {

    res.json({

      message:
        "Let's Go API is running 🚀",

    });

  }
);

// ========================================
// MONGODB CONNECTION
// ========================================

mongoose

  .connect(
    process.env.MONGO_URI
  )

  .then(() => {

    console.log(
      "MongoDB connected successfully 🚀"
    );

  })

  .catch((error) => {

    console.error(
      "MongoDB connection failed:",
      error.message
    );

  });

// ========================================
// START SERVER
// ========================================

server.listen(
  PORT,
  () => {

    console.log(
      `Let's Go server running on http://localhost:${PORT}`
    );

    console.log(
      "⚡ Real-time notifications enabled"
    );

  }
);