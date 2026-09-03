const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    // User who should receive the notification
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // User who caused the notification
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Type of notification
    type: {
      type: String,
      required: true,
      enum: [
        "connection_request",
        "connection_accepted",
        "connection_rejected",
        "activity_invitation",
        "activity_joined",
        "activity_updated",
        "activity_cancelled",
      ],
    },

    // Notification message
    message: {
      type: String,
      required: true,
      trim: true,
    },

    // Optional reference to an activity
    activity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Activity",
      default: null,
    },

    // Optional reference to a connection
    connection: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Connection",
      default: null,
    },

    // Has the user seen/read it?
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "Notification",
  notificationSchema
);