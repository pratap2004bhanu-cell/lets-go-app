const express = require("express");
const mongoose = require("mongoose");

const Connection = require("../models/Connection");
const User = require("../models/User");
const Notification = require("../models/Notification");

const authMiddleware = require("./middleware/authMiddleware");

const router = express.Router();

// ========================================
// SEND CONNECTION REQUEST
// ========================================

router.post(
  "/send",
  authMiddleware,
  async (req, res) => {
    try {
      const senderId = req.userId;
      const { receiverId } = req.body;

      // ------------------------------------
      // VALIDATE RECEIVER
      // ------------------------------------

      if (!receiverId) {
        return res.status(400).json({
          message: "Receiver is required.",
        });
      }

      if (
        !mongoose.Types.ObjectId.isValid(
          receiverId
        )
      ) {
        return res.status(400).json({
          message: "Invalid receiver ID.",
        });
      }

      // ------------------------------------
      // CANNOT CONNECT WITH YOURSELF
      // ------------------------------------

      if (
        String(senderId) ===
        String(receiverId)
      ) {
        return res.status(400).json({
          message:
            "You cannot connect with yourself.",
        });
      }

      // ------------------------------------
      // FIND USERS
      // ------------------------------------

      const sender =
        await User.findById(senderId);

      const receiver =
        await User.findById(receiverId);

      if (!sender || !receiver) {
        return res.status(404).json({
          message: "User not found.",
        });
      }

      // ------------------------------------
      // CHECK EXISTING CONNECTION
      // ------------------------------------

      const existingConnection =
        await Connection.findOne({
          $or: [
            {
              sender: senderId,
              receiver: receiverId,
            },
            {
              sender: receiverId,
              receiver: senderId,
            },
          ],
        });

      if (existingConnection) {
        return res.status(400).json({
          message:
            `Connection already exists with status: ${existingConnection.status}`,
        });
      }

      // ------------------------------------
      // CREATE CONNECTION
      // ------------------------------------

      const connection =
        await Connection.create({
          sender: senderId,
          receiver: receiverId,
          status: "pending",
        });

      // ------------------------------------
      // CREATE NOTIFICATION
      // ------------------------------------

      const notification =
        await Notification.create({
          recipient: receiverId,
          sender: senderId,
          type: "connection_request",
          message:
            `${sender.name} sent you a connection request 🤝`,
          connection: connection._id,
        });

      // ------------------------------------
      // REAL-TIME NOTIFICATION
      // ------------------------------------

      const io = req.app.get("io");

      if (io) {
        io.to(`user-${receiverId}`).emit(
          "new-notification",
          {
            _id: notification._id,
            type: notification.type,
            message: notification.message,

            sender: {
              _id: sender._id,
              name: sender.name,
              email: sender.email,
            },

            connection: connection._id,

            isRead: false,

            createdAt:
              notification.createdAt,
          }
        );

        console.log(
          `🔔 Real-time connection request sent to user-${receiverId}`
        );
      }

      // ------------------------------------
      // RESPONSE
      // ------------------------------------

      return res.status(201).json({
        message:
          "Connection request sent successfully! 🤝",
        connection,
      });

    } catch (error) {
      console.error(
        "❌ SEND CONNECTION ERROR:",
        error
      );

      return res.status(500).json({
        message:
          "Unable to send connection request.",
        error: error.message,
      });
    }
  }
);

// ========================================
// GET RECEIVED PENDING REQUESTS
// ========================================

router.get(
  "/requests",
  authMiddleware,
  async (req, res) => {
    try {
      const userId = req.userId;

      const connections =
        await Connection.find({
          receiver: userId,
          status: "pending",
        })
          .populate(
            "sender",
            "name email"
          )
          .populate(
            "receiver",
            "name email"
          )
          .sort({ createdAt: -1 });

      return res.status(200).json(
        connections
      );

    } catch (error) {
      console.error(
        "❌ GET CONNECTION REQUESTS ERROR:",
        error
      );

      return res.status(500).json({
        message:
          "Unable to fetch connection requests.",
        error: error.message,
      });
    }
  }
);

// ========================================
// GET ACCEPTED CONNECTIONS
// ========================================

router.get(
  "/",
  authMiddleware,
  async (req, res) => {
    try {
      const userId = req.userId;

      const connections =
        await Connection.find({
          $or: [
            {
              sender: userId,
            },
            {
              receiver: userId,
            },
          ],
          status: "accepted",
        })
          .populate(
            "sender",
            "name email"
          )
          .populate(
            "receiver",
            "name email"
          )
          .sort({ updatedAt: -1 });

      return res.status(200).json(
        connections
      );

    } catch (error) {
      console.error(
        "❌ GET MY CONNECTIONS ERROR:",
        error
      );

      return res.status(500).json({
        message:
          "Unable to fetch connections.",
        error: error.message,
      });
    }
  }
);

// ========================================
// GET SENT REQUESTS
// ========================================

router.get(
  "/sent",
  authMiddleware,
  async (req, res) => {
    try {
      const userId = req.userId;

      const connections =
        await Connection.find({
          sender: userId,
          status: "pending",
        })
          .populate(
            "receiver",
            "name email"
          )
          .sort({ createdAt: -1 });

      return res.status(200).json(
        connections
      );

    } catch (error) {
      console.error(
        "❌ GET SENT CONNECTION ERROR:",
        error
      );

      return res.status(500).json({
        message:
          "Unable to fetch sent requests.",
        error: error.message,
      });
    }
  }
);

// ========================================
// ACCEPT CONNECTION
// ========================================

router.put(
  "/:connectionId/accept",
  authMiddleware,
  async (req, res) => {
    try {
      const { connectionId } =
        req.params;

      const userId = req.userId;

      // ------------------------------------
      // VALIDATE CONNECTION ID
      // ------------------------------------

      if (
        !mongoose.Types.ObjectId.isValid(
          connectionId
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid connection ID.",
        });
      }

      // ------------------------------------
      // FIND REQUEST
      // ------------------------------------

      const connection =
        await Connection.findOne({
          _id: connectionId,
          receiver: userId,
          status: "pending",
        });

      if (!connection) {
        return res.status(404).json({
          message:
            "Connection request not found.",
        });
      }

      // ------------------------------------
      // ACCEPT
      // ------------------------------------

      connection.status = "accepted";

      await connection.save();

      // ------------------------------------
      // FIND ACCEPTOR
      // ------------------------------------

      const accepter =
        await User.findById(userId);

      if (!accepter) {
        return res.status(404).json({
          message:
            "Accepting user not found.",
        });
      }

      // ------------------------------------
      // CREATE NOTIFICATION
      // ------------------------------------

      const notification =
        await Notification.create({
          recipient:
            connection.sender,

          sender: userId,

          type:
            "connection_accepted",

          message:
            `${accepter.name} accepted your connection request! 🎉`,

          connection:
            connection._id,
        });

      // ------------------------------------
      // REAL-TIME ACCEPT NOTIFICATION
      // ------------------------------------

      const io = req.app.get("io");

      if (io) {
        io.to(
          `user-${connection.sender}`
        ).emit(
          "new-notification",
          {
            _id:
              notification._id,

            type:
              notification.type,

            message:
              notification.message,

            sender: {
              _id:
                accepter._id,

              name:
                accepter.name,

              email:
                accepter.email,
            },

            connection:
              connection._id,

            isRead: false,

            createdAt:
              notification.createdAt,
          }
        );

        console.log(
          `🎉 Real-time acceptance notification sent to user-${connection.sender}`
        );
      }

      // ------------------------------------
      // POPULATE CONNECTION
      // ------------------------------------

      await connection.populate([
        {
          path: "sender",
          select:
            "name email",
        },

        {
          path: "receiver",
          select:
            "name email",
        },
      ]);

      // ------------------------------------
      // RESPONSE
      // ------------------------------------

      return res.status(200).json({
        message:
          "Connection accepted! 🎉",

        connection,
      });

    } catch (error) {
      console.error(
        "❌ ACCEPT CONNECTION ERROR:",
        error
      );

      return res.status(500).json({
        message:
          "Unable to accept connection.",
        error: error.message,
      });
    }
  }
);

// ========================================
// REJECT CONNECTION
// ========================================

router.put(
  "/:connectionId/reject",
  authMiddleware,
  async (req, res) => {
    try {
      const { connectionId } =
        req.params;

      const userId = req.userId;

      // ------------------------------------
      // VALIDATE ID
      // ------------------------------------

      if (
        !mongoose.Types.ObjectId.isValid(
          connectionId
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid connection ID.",
        });
      }

      // ------------------------------------
      // FIND REQUEST
      // ------------------------------------

      const connection =
        await Connection.findOne({
          _id: connectionId,
          receiver: userId,
          status: "pending",
        });

      if (!connection) {
        return res.status(404).json({
          message:
            "Connection request not found.",
        });
      }

      // ------------------------------------
      // REJECT
      // ------------------------------------

      connection.status = "rejected";

      await connection.save();

      // ------------------------------------
      // RESPONSE
      // ------------------------------------

      return res.status(200).json({
        message:
          "Connection request rejected.",

        connection,
      });

    } catch (error) {
      console.error(
        "❌ REJECT CONNECTION ERROR:",
        error
      );

      return res.status(500).json({
        message:
          "Unable to reject connection.",
        error: error.message,
      });
    }
  }
);

// ========================================
// EXPORT
// ========================================

module.exports = router;