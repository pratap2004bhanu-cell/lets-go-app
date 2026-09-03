const express = require("express");
const jwt = require("jsonwebtoken");
const Message = require("../models/Message");

const router = express.Router();

// ========================================
// AUTHENTICATION
// ========================================

const authenticateUser = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (
      !authHeader ||
      !authHeader.startsWith("Bearer ")
    ) {
      return res.status(401).json({
        message: "Authentication required.",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    req.userId =
      decoded.userId ||
      decoded.id ||
      decoded._id;

    if (!req.userId) {
      return res.status(401).json({
        message: "Invalid token.",
      });
    }

    next();
  } catch (error) {
    console.error(
      "❌ Authentication error:",
      error.message
    );

    return res.status(401).json({
      message: "Invalid or expired token.",
    });
  }
};

// ========================================
// GET ALL CONVERSATIONS
// ========================================

router.get(
  "/conversations",
  authenticateUser,
  async (req, res) => {
    try {
      const currentUserId = req.userId;

      // Find all messages where current user
      // is either sender or receiver
      const messages = await Message.find({
        $or: [
          {
            sender: currentUserId,
          },
          {
            receiver: currentUserId,
          },
        ],
      })
        .sort({ createdAt: -1 })
        .populate("sender", "name email")
        .populate("receiver", "name email");

      // ========================================
      // BUILD CONVERSATIONS
      // ========================================

      const conversations = new Map();

      for (const message of messages) {
        const senderId = String(
          message.sender?._id
        );

        const receiverId = String(
          message.receiver?._id
        );

        // Find the person we're talking to
        const otherUserId =
          senderId === String(currentUserId)
            ? receiverId
            : senderId;

        // Skip invalid messages
        if (
          !otherUserId ||
          otherUserId === "undefined"
        ) {
          continue;
        }

        // Since messages are sorted newest first,
        // the first message is the latest message
        if (!conversations.has(otherUserId)) {
          const otherUser =
            senderId === String(currentUserId)
              ? message.receiver
              : message.sender;

          // Count unread messages from this user
          const unreadCount =
            await Message.countDocuments({
              sender: otherUserId,
              receiver: currentUserId,
              isRead: false,
            });

          conversations.set(
            otherUserId,
            {
              user: otherUser,

              lastMessage: {
                _id: message._id,
                text: message.text,
                createdAt: message.createdAt,
                isRead: message.isRead,
              },

              unreadCount,
            }
          );
        }
      }

      res.status(200).json({
        conversations: Array.from(
          conversations.values()
        ),
      });
    } catch (error) {
      console.error(
        "❌ Fetch conversations error:",
        error
      );

      res.status(500).json({
        message:
          "Unable to fetch conversations.",
      });
    }
  }
);

// ========================================
// GET TOTAL UNREAD MESSAGE COUNT
// ========================================

router.get(
  "/unread/count",
  authenticateUser,
  async (req, res) => {
    try {
      const currentUserId = req.userId;

      const unreadCount =
        await Message.countDocuments({
          receiver: currentUserId,
          isRead: false,
        });

      res.status(200).json({
        unreadCount,
      });
    } catch (error) {
      console.error(
        "❌ Unread message count error:",
        error
      );

      res.status(500).json({
        message:
          "Unable to fetch unread message count.",
      });
    }
  }
);

// ========================================
// GET MESSAGES BETWEEN TWO USERS
// ========================================

router.get(
  "/:userId",
  authenticateUser,
  async (req, res) => {
    try {
      const currentUserId = req.userId;
      const otherUserId = req.params.userId;

      const messages = await Message.find({
        $or: [
          {
            sender: currentUserId,
            receiver: otherUserId,
          },
          {
            sender: otherUserId,
            receiver: currentUserId,
          },
        ],
      })
        .sort({ createdAt: 1 })
        .populate("sender", "name email")
        .populate("receiver", "name email");

      res.status(200).json({
        messages,
      });
    } catch (error) {
      console.error(
        "❌ Fetch messages error:",
        error
      );

      res.status(500).json({
        message:
          "Unable to fetch messages.",
      });
    }
  }
);

// ========================================
// SEND MESSAGE
// ========================================

router.post(
  "/:userId",
  authenticateUser,
  async (req, res) => {
    try {
      const currentUserId = req.userId;
      const receiverId = req.params.userId;
      const { text } = req.body;

      // Validate message
      if (!text || !text.trim()) {
        return res.status(400).json({
          message:
            "Message cannot be empty.",
        });
      }

      // ========================================
      // CREATE MESSAGE
      // ========================================

      const newMessage =
        await Message.create({
          sender: currentUserId,
          receiver: receiverId,
          text: text.trim(),
        });

      // ========================================
      // POPULATE MESSAGE
      // ========================================

      const populatedMessage =
        await Message.findById(
          newMessage._id
        )
          .populate(
            "sender",
            "name email"
          )
          .populate(
            "receiver",
            "name email"
          );

      // ========================================
      // REAL-TIME MESSAGE
      // ========================================

      const io = req.app.get("io");

      if (io) {
        // Send message to receiver
        io.to(
          `user-${receiverId}`
        ).emit(
          "new-message",
          populatedMessage
        );

        // Send message back to sender
        io.to(
          `user-${currentUserId}`
        ).emit(
          "message-sent",
          populatedMessage
        );
      }

      // ========================================
      // RESPONSE
      // ========================================

      res.status(201).json({
        message:
          populatedMessage,
      });
    } catch (error) {
      console.error(
        "❌ Send message error:",
        error
      );

      res.status(500).json({
        message:
          "Unable to send message.",
      });
    }
  }
);

// ========================================
// MARK MESSAGES AS READ
// ========================================

router.put(
  "/:userId/read",
  authenticateUser,
  async (req, res) => {
    try {
      const currentUserId = req.userId;
      const otherUserId = req.params.userId;

      await Message.updateMany(
        {
          sender: otherUserId,
          receiver: currentUserId,
          isRead: false,
        },
        {
          $set: {
            isRead: true,
          },
        }
      );

      // ========================================
      // REAL-TIME READ UPDATE
      // ========================================

      const io = req.app.get("io");

      if (io) {
        io.to(
          `user-${currentUserId}`
        ).emit(
          "messages-read",
          {
            userId: otherUserId,
          }
        );
      }

      res.status(200).json({
        message:
          "Messages marked as read.",
      });
    } catch (error) {
      console.error(
        "❌ Mark messages read error:",
        error
      );

      res.status(500).json({
        message:
          "Unable to mark messages as read.",
      });
    }
  }
);

// ========================================
// EXPORT ROUTER
// ========================================

module.exports = router;