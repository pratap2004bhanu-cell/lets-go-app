const express = require("express");
const mongoose = require("mongoose");
const Notification = require("../models/Notification");
const authMiddleware = require("./middleware/authMiddleware");

const router = express.Router();

console.log("✅ Notifications routes loaded");

// ========================================
// GET ALL NOTIFICATIONS
// ========================================

router.get(
  "/",
  authMiddleware,
  async (req, res) => {
    try {
      console.log("🔔 GET ALL NOTIFICATIONS");
      console.log("👤 USER ID:", req.userId);

      const notifications = await Notification.find({
        recipient: req.userId,
      })
        .populate("sender", "name email")
        .populate("activity", "title category")
        .populate(
          "connection",
          "sender receiver status"
        )
        .sort({ createdAt: -1 });

      return res.status(200).json({
        notifications,
      });
    } catch (error) {
      console.error(
        "❌ GET NOTIFICATIONS ERROR:",
        error
      );

      return res.status(500).json({
        message: "Unable to fetch notifications.",
        error: error.message,
      });
    }
  }
);

// ========================================
// GET UNREAD NOTIFICATION COUNT
// IMPORTANT:
// This MUST come BEFORE /:userId
// ========================================

router.get(
  "/unread-count",
  authMiddleware,
  async (req, res) => {
    try {
      console.log("🔔 UNREAD COUNT ROUTE HIT");
      console.log("👤 USER ID:", req.userId);

      const count = await Notification.countDocuments({
        recipient: req.userId,
        isRead: false,
      });

      console.log("🔔 UNREAD COUNT:", count);

      return res.status(200).json({
        count,
      });
    } catch (error) {
      console.error(
        "❌ UNREAD COUNT ERROR:",
        error
      );

      return res.status(500).json({
        message:
          "Unable to fetch unread notification count.",
        error: error.message,
      });
    }
  }
);

// ========================================
// GET NOTIFICATIONS BY USER ID
//
// Example:
// /api/notifications/64abc123...
//
// IMPORTANT:
// This route MUST come AFTER /unread-count
// ========================================

router.get(
  "/:userId",
  authMiddleware,
  async (req, res) => {
    try {
      const { userId } = req.params;

      console.log(
        "🔔 GET USER NOTIFICATIONS:",
        userId
      );

      // Validate MongoDB ObjectId
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({
          message: "Invalid user ID.",
        });
      }

      // User can only access their own notifications
      if (userId !== req.userId) {
        return res.status(403).json({
          message:
            "You are not allowed to view these notifications.",
        });
      }

      const notifications =
        await Notification.find({
          recipient: req.userId,
        })
          .populate("sender", "name email")
          .populate("activity", "title category")
          .populate(
            "connection",
            "sender receiver status"
          )
          .sort({ createdAt: -1 });

      return res.status(200).json({
        notifications,
      });
    } catch (error) {
      console.error(
        "❌ GET USER NOTIFICATIONS ERROR:",
        error
      );

      return res.status(500).json({
        message: "Unable to fetch notifications.",
        error: error.message,
      });
    }
  }
);

// ========================================
// MARK ONE NOTIFICATION AS READ
// ========================================

router.put(
  "/:notificationId/read",
  authMiddleware,
  async (req, res) => {
    try {
      const { notificationId } = req.params;

      console.log(
        "📖 MARK NOTIFICATION AS READ:",
        notificationId
      );

      // Validate notification ID
      if (
        !mongoose.Types.ObjectId.isValid(
          notificationId
        )
      ) {
        return res.status(400).json({
          message: "Invalid notification ID.",
        });
      }

      const notification =
        await Notification.findOneAndUpdate(
          {
            _id: notificationId,
            recipient: req.userId,
          },
          {
            isRead: true,
          },
          {
            new: true,
          }
        );

      if (!notification) {
        return res.status(404).json({
          message: "Notification not found.",
        });
      }

      return res.status(200).json({
        message:
          "Notification marked as read.",
        notification,
      });
    } catch (error) {
      console.error(
        "❌ MARK NOTIFICATION READ ERROR:",
        error
      );

      return res.status(500).json({
        message:
          "Unable to update notification.",
        error: error.message,
      });
    }
  }
);

// ========================================
// MARK ALL NOTIFICATIONS AS READ
// ========================================

router.put(
  "/read-all",
  authMiddleware,
  async (req, res) => {
    try {
      console.log(
        "📖 MARK ALL NOTIFICATIONS AS READ"
      );

      await Notification.updateMany(
        {
          recipient: req.userId,
          isRead: false,
        },
        {
          isRead: true,
        }
      );

      return res.status(200).json({
        message:
          "All notifications marked as read.",
      });
    } catch (error) {
      console.error(
        "❌ MARK ALL READ ERROR:",
        error
      );

      return res.status(500).json({
        message:
          "Unable to mark notifications as read.",
        error: error.message,
      });
    }
  }
);

// ========================================
// DELETE NOTIFICATION
// ========================================

router.delete(
  "/:notificationId",
  authMiddleware,
  async (req, res) => {
    try {
      const { notificationId } = req.params;

      console.log(
        "🗑️ DELETE NOTIFICATION:",
        notificationId
      );

      // Validate notification ID
      if (
        !mongoose.Types.ObjectId.isValid(
          notificationId
        )
      ) {
        return res.status(400).json({
          message: "Invalid notification ID.",
        });
      }

      const notification =
        await Notification.findOneAndDelete({
          _id: notificationId,
          recipient: req.userId,
        });

      if (!notification) {
        return res.status(404).json({
          message: "Notification not found.",
        });
      }

      return res.status(200).json({
        message:
          "Notification deleted successfully.",
      });
    } catch (error) {
      console.error(
        "❌ DELETE NOTIFICATION ERROR:",
        error
      );

      return res.status(500).json({
        message:
          "Unable to delete notification.",
        error: error.message,
      });
    }
  }
);

// ========================================
// EXPORT ROUTER
// ========================================

module.exports = router;