const express = require("express");
const jwt = require("jsonwebtoken");

const Activity = require("../models/Activity");
const ActivityMessage = require("../models/ActivityMessage");

const router = express.Router();

// ========================================
// AUTHENTICATION
// ========================================

const authenticateUser = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
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
      "❌ Activity chat authentication error:",
      error.message
    );

    return res.status(401).json({
      message: "Invalid or expired token.",
    });
  }
};

// ========================================
// ACTIVITY MEMBERSHIP
// ========================================

const getActivityForMember = async (
  activityId,
  userId
) => {
  const activity = await Activity.findById(activityId)
    .populate("creatorId", "name email")
    .populate("joinedUsers.userId", "name email");

  if (!activity) {
    return {
      activity: null,
      allowed: false,
    };
  }

  const isCreator =
    String(
      activity.creatorId?._id ||
      activity.creatorId
    ) === String(userId);

  const isJoined =
    (activity.joinedUsers || []).some(
      (member) =>
        String(
          member?.userId?._id ||
          member?.userId
        ) === String(userId)
    );

  return {
    activity,
    allowed: isCreator || isJoined,
  };
};

// ========================================
// GET ACTIVITY GROUP MESSAGES
// ========================================

router.get(
  "/:activityId",
  authenticateUser,
  async (req, res) => {
    try {
      const { activityId } = req.params;

      const {
        activity,
        allowed,
      } = await getActivityForMember(
        activityId,
        req.userId
      );

      if (!activity) {
        return res.status(404).json({
          message: "Activity not found.",
        });
      }

      if (!allowed) {
        return res.status(403).json({
          message:
            "Only activity members can access this group chat.",
        });
      }

      const messages =
        await ActivityMessage.find({
          activity: activityId,
        })
          .sort({ createdAt: 1 })
          .populate(
            "sender",
            "name email"
          );

      res.set(
        "Cache-Control",
        "no-store"
      );

      return res.status(200).json({
        activity: {
          _id: activity._id,
          title: activity.title,
          category: activity.category,
          creatorId: activity.creatorId,
          creatorName: activity.creatorName,
          joinedUsers:
            activity.joinedUsers || [],
        },
        messages,
      });
    } catch (error) {
      console.error(
        "❌ Fetch activity group messages error:",
        error
      );

      return res.status(500).json({
        message:
          "Unable to load activity group chat.",
      });
    }
  }
);

// ========================================
// SEND ACTIVITY GROUP MESSAGE
// ========================================

router.post(
  "/:activityId",
  authenticateUser,
  async (req, res) => {
    try {
      const { activityId } = req.params;

      const text =
        typeof req.body?.text === "string"
          ? req.body.text.trim()
          : "";

      if (!text) {
        return res.status(400).json({
          message:
            "Message cannot be empty.",
        });
      }

      if (text.length > 2000) {
        return res.status(400).json({
          message:
            "Message cannot be longer than 2000 characters.",
        });
      }

      const {
        activity,
        allowed,
      } = await getActivityForMember(
        activityId,
        req.userId
      );

      if (!activity) {
        return res.status(404).json({
          message: "Activity not found.",
        });
      }

      if (!allowed) {
        return res.status(403).json({
          message:
            "Only activity members can send messages.",
        });
      }

      const newMessage =
        await ActivityMessage.create({
          activity: activityId,
          sender: req.userId,
          text,
        });

      const populatedMessage =
        await ActivityMessage.findById(
          newMessage._id
        ).populate(
          "sender",
          "name email"
        );

      const io = req.app.get("io");

      if (io) {
        io.to(
          `activity-${activityId}`
        ).emit(
          "activity-new-message",
          populatedMessage
        );
      }

      return res.status(201).json({
        message: populatedMessage,
      });
    } catch (error) {
      console.error(
        "❌ Send activity group message error:",
        error
      );

      return res.status(500).json({
        message:
          "Unable to send activity group message.",
      });
    }
  }
);

module.exports = router;