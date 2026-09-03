/* eslint-disable no-undef */

const express = require("express");
const mongoose = require("mongoose");
const Activity = require("../models/Activity");
const User = require("../models/User");
const Notification = require("../models/Notification");
const authMiddleware = require("./middleware/authMiddleware");
const Report = require("../models/Report");
const ActivityMemory = require("../models/ActivityMemory");
const multer = require("multer");
const cloudinary = require("../cloudinary");

const router = express.Router();

// ========================================
// ACTIVITY MEMORY IMAGE UPLOAD
// ========================================

const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      "image/jpeg",
      "image/jpg",
      "image/heic",
      "image/heif",
      "image/png",
      "image/webp",
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Only image files (JPG, JPEG, HEIC, PNG, WEBP) are allowed."
        )
      );
    }
  },
});

const handleMemoryUpload = (req, res, next) => {
  memoryUpload.single("image")(req, res, (error) => {
    if (error) {
      console.error(
        "ACTIVITY MEMORY UPLOAD ERROR:",
        error
      );

      return res.status(400).json({
        message:
          error.message ||
          "Unable to process the selected image.",
      });
    }

    next();
  });
};


// ========================================
// GET ALL ACTIVITIES
// ========================================

router.get("/", async (req, res) => {
  try {
    const activities = await Activity.find().sort({
      createdAt: -1,
    });

    res.status(200).json(activities);
  } catch (error) {
    console.error("GET ACTIVITIES ERROR:", error);

    res.status(500).json({
      message: "Unable to fetch activities.",
      error: error.message,
    });
  }
});

// ========================================
// GET SINGLE ACTIVITY
// ========================================

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid activity ID.",
      });
    }

    const activity = await Activity.findById(id);

    if (!activity) {
      return res.status(404).json({
        message: "Activity not found.",
      });
    }

    // Always return the latest activity state.
    res.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate"
    );
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");

    res.status(200).json(activity);
  } catch (error) {
    console.error("GET ACTIVITY ERROR:", error);

    res.status(500).json({
      message: "Unable to fetch activity.",
      error: error.message,
    });
  }
});

// ========================================
// CREATE ACTIVITY
// ========================================

router.post("/", authMiddleware, async (req, res) => {
  try {
    const {
      title,
      category,
      location,
      date,
      time,
      maxPeople,
      description,
      latitude,
      longitude,
    } = req.body;

    // ----------------------------------------
    // VALIDATE REQUIRED FIELDS
    // ----------------------------------------

    if (
      !title ||
      !title.trim() ||
      !category ||
      !location ||
      !location.trim() ||
      !date ||
      !time ||
      !maxPeople
    ) {
      return res.status(400).json({
        message: "Please fill in all required fields.",
      });
    }

    const peopleLimit = Number(maxPeople);

    if (
      Number.isNaN(peopleLimit) ||
      peopleLimit < 2 ||
      peopleLimit > 100
    ) {
      return res.status(400).json({
        message: "Maximum people must be between 2 and 100.",
      });
    }

    // ----------------------------------------
    // FIND CREATOR
    // ----------------------------------------

    const creator = await User.findById(req.userId);

    if (!creator) {
      return res.status(401).json({
        message: "User not found.",
      });
    }

    // ----------------------------------------
    // CREATE ACTIVITY
    // ----------------------------------------

    const activity = await Activity.create({
      title: title.trim(),
      category,
      location: location.trim(),

      latitude:
        typeof latitude === "number" &&
        Number.isFinite(latitude)
          ? latitude
          : null,

      longitude:
        typeof longitude === "number" &&
        Number.isFinite(longitude)
          ? longitude
          : null,

      date,
      time,
      maxPeople: peopleLimit,

      description: description
        ? description.trim()
        : "",

      creatorId: creator._id,
      creatorName: creator.name,

      // Creator automatically becomes first member
      joinedUsers: [
        {
          userId: creator._id,
          name: creator.name,
        },
      ],
    });

    res.status(201).json({
      message: "Activity created successfully 🎉",
      activity,
    });
  } catch (error) {
    console.error("CREATE ACTIVITY ERROR:", error);

    res.status(500).json({
      message: "Unable to create activity.",
      error: error.message,
    });
  }
});

// ========================================
// INVITE USER TO ACTIVITY
// ========================================

router.post(
  "/:id/invite",
  authMiddleware,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { recipientId } = req.body;

      console.log("📨 ACTIVITY INVITATION");
      console.log("Activity:", id);
      console.log("Sender:", req.userId);
      console.log("Recipient:", recipientId);

      // ----------------------------------------
      // VALIDATE RECIPIENT
      // ----------------------------------------

      if (!recipientId) {
        return res.status(400).json({
          message: "Recipient is required.",
        });
      }

      if (
        !mongoose.Types.ObjectId.isValid(id) ||
        !mongoose.Types.ObjectId.isValid(recipientId)
      ) {
        return res.status(400).json({
          message: "Invalid activity or user ID.",
        });
      }

      // ----------------------------------------
      // FIND ACTIVITY
      // ----------------------------------------

      const activity = await Activity.findById(id);

      if (!activity) {
        return res.status(404).json({
          message: "Activity not found.",
        });
      }

      // ----------------------------------------
      // ONLY CREATOR CAN INVITE
      // ----------------------------------------

      if (
        String(activity.creatorId) !==
        String(req.userId)
      ) {
        return res.status(403).json({
          message:
            "Only the activity creator can invite people.",
        });
      }

      // ----------------------------------------
      // CANNOT INVITE YOURSELF
      // ----------------------------------------

      if (
        String(recipientId) ===
        String(req.userId)
      ) {
        return res.status(400).json({
          message:
            "You cannot invite yourself.",
        });
      }

      // ----------------------------------------
      // CHECK IF ALREADY JOINED
      // ----------------------------------------

      const alreadyJoined =
        activity.joinedUsers?.some(
          (person) =>
            String(person.userId) ===
            String(recipientId)
        );

      if (alreadyJoined) {
        return res.status(400).json({
          message:
            "This person has already joined the activity.",
        });
      }

      // ----------------------------------------
      // CHECK ACTIVITY CAPACITY
      // ----------------------------------------

      const playerCount =
        activity.joinedUsers?.length || 0;

      const maxPeople =
        Number(activity.maxPeople) || 0;

      if (
        maxPeople > 0 &&
        playerCount >= maxPeople
      ) {
        return res.status(400).json({
          message:
            "This activity is already full.",
        });
      }

      // ----------------------------------------
      // FIND SENDER
      // ----------------------------------------

      const sender =
        await User.findById(req.userId);

      if (!sender) {
        return res.status(401).json({
          message: "User not found.",
        });
      }

      // ----------------------------------------
      // FIND RECIPIENT
      // ----------------------------------------

      const recipient =
        await User.findById(recipientId);

      if (!recipient) {
        return res.status(404).json({
          message: "Recipient not found.",
        });
      }

      // ----------------------------------------
      // PREVENT DUPLICATE INVITATIONS
      // ----------------------------------------

      const existingInvitation =
        await Notification.findOne({
          recipient: recipient._id,
          sender: sender._id,
          activity: activity._id,
          type: "activity_invitation",
        });

      if (existingInvitation) {
        return res.status(400).json({
          message:
            "You have already invited this person.",
        });
      }

      // ----------------------------------------
      // CREATE NOTIFICATION
      // ----------------------------------------

      const notification =
        await Notification.create({
          recipient: recipient._id,
          sender: sender._id,
          type: "activity_invitation",
          message:
            `${sender.name} invited you to join "${activity.title}". 📅`,
          activity: activity._id,
        });

      // ----------------------------------------
      // REAL-TIME SOCKET NOTIFICATION
      // ----------------------------------------

      const io = req.app.get("io");

      if (io) {
        io.to(`user-${recipient._id}`).emit(
          "new-notification",
          {
            _id: notification._id,
            type: notification.type,
            message: notification.message,

            activity: {
              _id: activity._id,
              title: activity.title,
              category: activity.category,
            },

            sender: {
              _id: sender._id,
              name: sender.name,
              email: sender.email,
            },

            createdAt:
              notification.createdAt,

            isRead: false,
          }
        );
      }

      // ----------------------------------------
      // RESPONSE
      // ----------------------------------------

      return res.status(201).json({
        message:
          "Invitation sent successfully! 📅",
        notification,
      });
    } catch (error) {
      console.error(
        "❌ ACTIVITY INVITATION ERROR:",
        error
      );

      return res.status(500).json({
        message:
          "Unable to send activity invitation.",
        error: error.message,
      });
    }
  }
);

// ========================================
// EDIT ACTIVITY
// ========================================

router.put(
  "/:id",
  authMiddleware,
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          message: "Invalid activity ID.",
        });
      }

      const activity =
        await Activity.findById(id);

      if (!activity) {
        return res.status(404).json({
          message: "Activity not found.",
        });
      }

      // ----------------------------------------
      // ONLY CREATOR CAN EDIT
      // ----------------------------------------

      if (
        String(activity.creatorId) !==
        String(req.userId)
      ) {
        return res.status(403).json({
          message:
            "You are not allowed to edit this activity.",
        });
      }

      const {
        title,
        category,
        location,
        date,
        time,
        maxPeople,
        description,
        latitude,
        longitude,
      } = req.body;

      // ----------------------------------------
      // VALIDATE REQUIRED FIELDS
      // ----------------------------------------

      if (
        !title ||
        !title.trim() ||
        !category ||
        !location ||
        !location.trim() ||
        !date ||
        !time ||
        maxPeople === undefined ||
        maxPeople === null
      ) {
        return res.status(400).json({
          message:
            "Please fill in all required fields.",
        });
      }

      const peopleLimit =
        Number(maxPeople);

      if (
        Number.isNaN(peopleLimit) ||
        peopleLimit < 2 ||
        peopleLimit > 100
      ) {
        return res.status(400).json({
          message:
            "Maximum people must be between 2 and 100.",
        });
      }

      // ----------------------------------------
      // DON'T REDUCE BELOW CURRENT PLAYERS
      // ----------------------------------------

      if (
        peopleLimit <
        activity.joinedUsers.length
      ) {
        return res.status(400).json({
          message:
            `Maximum people cannot be less than the current number of players (${activity.joinedUsers.length}).`,
        });
      }

      // ----------------------------------------
      // UPDATE ACTIVITY
      // ----------------------------------------

      activity.title = title.trim();
      activity.category = category;
      activity.location = location.trim();
      activity.date = date;
      activity.time = time;
      activity.maxPeople = peopleLimit;

      activity.description =
        description
          ? description.trim()
          : "";

      // ----------------------------------------
      // UPDATE MAP COORDINATES
      // ----------------------------------------

      if (
        typeof latitude === "number" &&
        Number.isFinite(latitude)
      ) {
        activity.latitude = latitude;
      } else {
        activity.latitude = null;
      }

      if (
        typeof longitude === "number" &&
        Number.isFinite(longitude)
      ) {
        activity.longitude = longitude;
      } else {
        activity.longitude = null;
      }

      await activity.save();

      // ========================================
      // CREATE NOTIFICATIONS FOR JOINED USERS
      // ========================================

      const io = req.app.get("io");

      const creator =
        await User.findById(req.userId).select(
          "name email"
        );

      const joinedUsers =
        Array.isArray(activity.joinedUsers)
          ? activity.joinedUsers
          : [];

      for (const joinedUser of joinedUsers) {
        const joinedUserId =
          joinedUser.userId;

        // Don't notify the creator
        if (
          String(joinedUserId) ===
          String(req.userId)
        ) {
          continue;
        }

        const notification =
          await Notification.create({
            recipient: joinedUserId,
            sender: req.userId,
            type: "activity_updated",
            message:
              `${creator?.name || "The activity creator"} updated the activity "${activity.title}". ✏️`,
            activity: activity._id,
          });

        // ========================================
        // REAL-TIME NOTIFICATION
        // ========================================

        if (io) {
          io.to(
            `user-${joinedUserId}`
          ).emit(
            "new-notification",
            {
              _id: notification._id,
              type: notification.type,
              message:
                notification.message,
              activity: activity._id,

              sender: {
                _id:
                  creator?._id ||
                  req.userId,

                name:
                  creator?.name ||
                  "Let's Go member",

                email:
                  creator?.email ||
                  "",
              },

              createdAt:
                notification.createdAt,
            }
          );
        }
      }

      // ========================================
      // RESPONSE
      // ========================================

      res.status(200).json({
        message:
          "Activity updated successfully 🎉",
        activity,
      });
    } catch (error) {
      console.error(
        "UPDATE ACTIVITY ERROR:",
        error
      );

      res.status(500).json({
        message:
          "Unable to update activity.",
        error: error.message,
      });
    }
  }
);

// ========================================
// REQUEST TO JOIN ACTIVITY
// ========================================

router.post(
  "/:id/request-join",
  authMiddleware,
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          message: "Invalid activity ID.",
        });
      }

      const activity =
        await Activity.findById(id);

      if (!activity) {
        return res.status(404).json({
          message: "Activity not found.",
        });
      }

      // ----------------------------------------
      // CREATOR DOES NOT NEED TO REQUEST
      // ----------------------------------------

      if (
        String(activity.creatorId) ===
        String(req.userId)
      ) {
        return res.status(400).json({
          message:
            "You are the creator of this activity.",
        });
      }

      // ----------------------------------------
      // FIND USER
      // ----------------------------------------

      const user =
        await User.findById(req.userId);

      if (!user) {
        return res.status(401).json({
          message: "User not found.",
        });
      }

      // ----------------------------------------
      // CHECK IF ALREADY JOINED
      // ----------------------------------------

      const alreadyJoined =
        activity.joinedUsers?.some(
          (member) =>
            String(member.userId) ===
            String(req.userId)
        );

      if (alreadyJoined) {
        return res.status(400).json({
          message:
            "You have already joined this activity.",
        });
      }

      // ----------------------------------------
      // CHECK CAPACITY
      // ----------------------------------------

      const maxPeople =
        Number(activity.maxPeople) || 0;

      if (
        maxPeople > 0 &&
        activity.joinedUsers.length >=
          maxPeople
      ) {
        return res.status(400).json({
          message:
            "This activity is already full.",
        });
      }

      // ----------------------------------------
      // CHECK EXISTING PENDING REQUEST
      // ----------------------------------------

      const existingRequest =
        activity.joinRequests?.find(
          (request) =>
            String(request.userId) ===
              String(req.userId) &&
            request.status === "pending"
        );

      if (existingRequest) {
        return res.status(400).json({
          message:
            "You have already requested to join this activity.",
        });
      }

      // ----------------------------------------
      // CREATE JOIN REQUEST
      // ----------------------------------------

      if (
        !Array.isArray(activity.joinRequests)
      ) {
        activity.joinRequests = [];
      }

      activity.joinRequests.push({
        userId: user._id,
        name: user.name,
        status: "pending",
      });

      await activity.save();

      // ----------------------------------------
      // NOTIFY ACTIVITY CREATOR
      // ----------------------------------------

      const notification =
        await Notification.create({
          recipient: activity.creatorId,
          sender: req.userId,
          type: "activity_join_request",
          message:
            `${user.name} requested to join your activity "${activity.title}". 👋`,
          activity: activity._id,
        });

      // ----------------------------------------
      // REAL-TIME SOCKET NOTIFICATION
      // ----------------------------------------

      const io = req.app.get("io");

      if (io) {
        io.to(
          `user-${activity.creatorId}`
        ).emit(
          "new-notification",
          {
            _id: notification._id,
            type: notification.type,
            message: notification.message,

            activity: {
              _id: activity._id,
              title: activity.title,
              category: activity.category,
            },

            sender: {
              _id: user._id,
              name: user.name,
              email: user.email,
            },

            createdAt:
              notification.createdAt,

            isRead: false,
          }
        );
      }

      return res.status(201).json({
        message:
          "Join request sent successfully! 👋",
        activity,
      });
    } catch (error) {
      console.error(
        "REQUEST TO JOIN ERROR:",
        error
      );

      return res.status(500).json({
        message:
          "Unable to send join request.",
        error: error.message,
      });
    }
  }
);

// ========================================
// GET PENDING JOIN REQUESTS
// ========================================

router.get(
  "/:id/join-requests",
  authMiddleware,
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          message: "Invalid activity ID.",
        });
      }

      const activity =
        await Activity.findById(id);

      if (!activity) {
        return res.status(404).json({
          message: "Activity not found.",
        });
      }

      // ----------------------------------------
      // ONLY CREATOR CAN VIEW REQUESTS
      // ----------------------------------------

      if (
        String(activity.creatorId) !==
        String(req.userId)
      ) {
        return res.status(403).json({
          message:
            "Only the activity creator can view join requests.",
        });
      }

      const pendingRequests =
        (activity.joinRequests || []).filter(
          (request) =>
            request.status === "pending"
        );

      // Always return the latest request state.
      res.set(
        "Cache-Control",
        "no-store, no-cache, must-revalidate, proxy-revalidate"
      );
      res.set("Pragma", "no-cache");
      res.set("Expires", "0");

      return res.status(200).json({
        requests: pendingRequests,
      });
    } catch (error) {
      console.error(
        "GET JOIN REQUESTS ERROR:",
        error
      );

      return res.status(500).json({
        message:
          "Unable to fetch join requests.",
        error: error.message,
      });
    }
  }
);

// ========================================
// ACCEPT JOIN REQUEST
// ========================================

router.post(
  "/:id/join-requests/:userId/accept",
  authMiddleware,
  async (req, res) => {
    try {
      const { id, userId } = req.params;

      if (
        !mongoose.Types.ObjectId.isValid(id) ||
        !mongoose.Types.ObjectId.isValid(userId)
      ) {
        return res.status(400).json({
          message:
            "Invalid activity or user ID.",
        });
      }

      const activity =
        await Activity.findById(id);

      if (!activity) {
        return res.status(404).json({
          message: "Activity not found.",
        });
      }

      // ----------------------------------------
      // ONLY CREATOR CAN ACCEPT
      // ----------------------------------------

      if (
        String(activity.creatorId) !==
        String(req.userId)
      ) {
        return res.status(403).json({
          message:
            "Only the activity creator can accept join requests.",
        });
      }

      // ----------------------------------------
      // FIND REQUEST
      // ----------------------------------------

      const request =
        activity.joinRequests?.find(
          (item) =>
            String(item.userId) ===
              String(userId) &&
            item.status === "pending"
        );

      if (!request) {
        return res.status(404).json({
          message:
            "Pending join request not found.",
        });
      }

      // ----------------------------------------
      // CHECK IF ALREADY JOINED
      // ----------------------------------------

      const alreadyJoined =
        activity.joinedUsers?.some(
          (member) =>
            String(member.userId) ===
            String(userId)
        );

      if (alreadyJoined) {
        request.status = "accepted";

        await activity.save();

        return res.status(200).json({
          message:
            "This user is already part of the activity.",
          activity,
        });
      }

      // ----------------------------------------
      // CHECK CAPACITY
      // ----------------------------------------

      const maxPeople =
        Number(activity.maxPeople) || 0;

      if (
        maxPeople > 0 &&
        activity.joinedUsers.length >=
          maxPeople
      ) {
        return res.status(400).json({
          message:
            "This activity is already full.",
        });
      }

      // ----------------------------------------
      // ADD USER TO ACTIVITY
      // ----------------------------------------

      const requestedUser =
        await User.findById(userId);

      if (!requestedUser) {
        return res.status(404).json({
          message: "User not found.",
        });
      }

      activity.joinedUsers.push({
        userId: requestedUser._id,
        name: requestedUser.name,
      });

      request.status = "accepted";

      await activity.save();

      // ----------------------------------------
      // NOTIFY REQUESTER
      // ----------------------------------------

      const creator =
        await User.findById(
          activity.creatorId
        ).select("name email");

      const notification =
        await Notification.create({
          recipient: requestedUser._id,
          sender: activity.creatorId,
          type: "activity_join_request_accepted",
          message:
            `${creator?.name || "The activity creator"} accepted your request to join "${activity.title}". 🎉`,
          activity: activity._id,
        });

      // ----------------------------------------
      // REAL-TIME SOCKET NOTIFICATION
      // ----------------------------------------

      const io = req.app.get("io");

      if (io) {
        io.to(
          `user-${requestedUser._id}`
        ).emit(
          "new-notification",
          {
            _id: notification._id,
            type: notification.type,
            message: notification.message,

            activity: {
              _id: activity._id,
              title: activity.title,
              category: activity.category,
            },

            sender: {
              _id:
                creator?._id ||
                activity.creatorId,

              name:
                creator?.name ||
                "Let's Go member",

              email:
                creator?.email || "",
            },

            createdAt:
              notification.createdAt,

            isRead: false,
          }
        );
      }

      return res.status(200).json({
        message:
          "Join request accepted successfully. 🎉",
        activity,
      });
    } catch (error) {
      console.error(
        "ACCEPT JOIN REQUEST ERROR:",
        error
      );

      return res.status(500).json({
        message:
          "Unable to accept join request.",
        error: error.message,
      });
    }
  }
);

// ========================================
// REJECT JOIN REQUEST
// ========================================

router.post(
  "/:id/join-requests/:userId/reject",
  authMiddleware,
  async (req, res) => {
    try {
      const { id, userId } = req.params;

      if (
        !mongoose.Types.ObjectId.isValid(id) ||
        !mongoose.Types.ObjectId.isValid(userId)
      ) {
        return res.status(400).json({
          message:
            "Invalid activity or user ID.",
        });
      }

      const activity =
        await Activity.findById(id);

      if (!activity) {
        return res.status(404).json({
          message: "Activity not found.",
        });
      }

      // ----------------------------------------
      // ONLY CREATOR CAN REJECT
      // ----------------------------------------

      if (
        String(activity.creatorId) !==
        String(req.userId)
      ) {
        return res.status(403).json({
          message:
            "Only the activity creator can reject join requests.",
        });
      }

      // ----------------------------------------
      // FIND REQUEST
      // ----------------------------------------

      const request =
        activity.joinRequests?.find(
          (item) =>
            String(item.userId) ===
              String(userId) &&
            item.status === "pending"
        );

      if (!request) {
        return res.status(404).json({
          message:
            "Pending join request not found.",
        });
      }

      request.status = "rejected";

      await activity.save();

      // ----------------------------------------
      // NOTIFY REQUESTER
      // ----------------------------------------

      const creator =
        await User.findById(
          activity.creatorId
        ).select("name email");

      const requestedUser =
        await User.findById(userId);

      if (requestedUser) {
        const notification =
          await Notification.create({
            recipient: requestedUser._id,
            sender: activity.creatorId,
            type: "activity_join_request_rejected",
            message:
              `${creator?.name || "The activity creator"} rejected your request to join "${activity.title}".`,
            activity: activity._id,
          });

        // ----------------------------------------
        // REAL-TIME SOCKET NOTIFICATION
        // ----------------------------------------

        const io = req.app.get("io");

        if (io) {
          io.to(
            `user-${requestedUser._id}`
          ).emit(
            "new-notification",
            {
              _id: notification._id,
              type: notification.type,
              message: notification.message,

              activity: {
                _id: activity._id,
                title: activity.title,
                category: activity.category,
              },

              sender: {
                _id:
                  creator?._id ||
                  activity.creatorId,

                name:
                  creator?.name ||
                  "Let's Go member",

                email:
                  creator?.email || "",
              },

              createdAt:
                notification.createdAt,

              isRead: false,
            }
          );
        }
      }

      return res.status(200).json({
        message:
          "Join request rejected.",
        activity,
      });
    } catch (error) {
      console.error(
        "REJECT JOIN REQUEST ERROR:",
        error
      );

      return res.status(500).json({
        message:
          "Unable to reject join request.",
        error: error.message,
      });
    }
  }
);

// ========================================
// JOIN ACTIVITY
// ========================================

router.post(
  "/:id/join",
  authMiddleware,
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          message: "Invalid activity ID.",
        });
      }

      const activity =
        await Activity.findById(id);

      if (!activity) {
        return res.status(404).json({
          message: "Activity not found.",
        });
      }

      // ----------------------------------------
      // FIND USER
      // ----------------------------------------

      const user =
        await User.findById(req.userId);

      if (!user) {
        return res.status(401).json({
          message: "User not found.",
        });
      }

      // ----------------------------------------
      // CHECK IF ALREADY JOINED
      // ----------------------------------------

      const alreadyJoined =
        activity.joinedUsers?.some(
          (member) =>
            String(member.userId) ===
            String(req.userId)
        );

      if (alreadyJoined) {
        return res.status(400).json({
          message:
            "You have already joined this activity.",
        });
      }

      // ----------------------------------------
      // CHECK CAPACITY
      // ----------------------------------------

      const maxPeople =
        Number(activity.maxPeople) || 0;

      if (
        maxPeople > 0 &&
        activity.joinedUsers.length >=
          maxPeople
      ) {
        return res.status(400).json({
          message:
            "This activity is already full.",
        });
      }

      // ----------------------------------------
      // JOIN
      // ----------------------------------------

      activity.joinedUsers.push({
        userId: user._id,
        name: user.name,
      });

      await activity.save();

      // ========================================
      // NOTIFICATION
      // ========================================

      const notification =
        await Notification.create({
          recipient:
            activity.creatorId,
          sender: req.userId,
          type: "activity_joined",
          message:
            `${user.name} joined your activity "${activity.title}". 🎉`,
          activity: activity._id,
        });

      const io = req.app.get("io");

      if (io) {
        io.to(
          `user-${activity.creatorId}`
        ).emit(
          "new-notification",
          {
            _id: notification._id,
            type: notification.type,
            message: notification.message,
            activity: activity._id,

            sender: {
              _id: user._id,
              name: user.name,
              email: user.email,
            },

            createdAt:
              notification.createdAt,
          }
        );
      }

      res.status(200).json({
        message:
          "You joined the activity 🎉",
        activity,
      });
    } catch (error) {
      console.error(
        "JOIN ACTIVITY ERROR:",
        error
      );

      res.status(500).json({
        message:
          "Unable to join activity.",
        error: error.message,
      });
    }
  }
);

// ========================================
// LEAVE ACTIVITY
// ========================================

router.delete(
  "/:id/leave",
  authMiddleware,
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          message: "Invalid activity ID.",
        });
      }

      const activity =
        await Activity.findById(id);

      if (!activity) {
        return res.status(404).json({
          message: "Activity not found.",
        });
      }

      // ----------------------------------------
      // CREATOR CANNOT LEAVE
      // ----------------------------------------

      if (
        String(activity.creatorId) ===
        String(req.userId)
      ) {
        return res.status(400).json({
          message:
            "The creator cannot leave their own activity.",
        });
      }

      // ----------------------------------------
      // FIND USER
      // ----------------------------------------

      const joinedIndex =
        activity.joinedUsers.findIndex(
          (member) =>
            String(member.userId) ===
            String(req.userId)
        );

      if (joinedIndex === -1) {
        return res.status(400).json({
          message:
            "You have not joined this activity.",
        });
      }

      // ----------------------------------------
      // REMOVE USER
      // ----------------------------------------

      activity.joinedUsers.splice(
        joinedIndex,
        1
      );

      await activity.save();

      res.status(200).json({
        message:
          "You left the activity successfully.",
        activity,
      });
    } catch (error) {
      console.error(
        "LEAVE ACTIVITY ERROR:",
        error
      );

      res.status(500).json({
        message:
          "Unable to leave activity.",
        error: error.message,
      });
    }
  }
);

// ========================================
// DELETE / CANCEL ACTIVITY
// ========================================

router.delete(
  "/:id",
  authMiddleware,
  async (req, res) => {
    try {
      const { id } = req.params;

      // ----------------------------------------
      // VALIDATE ACTIVITY ID
      // ----------------------------------------

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          message: "Invalid activity ID.",
        });
      }

      // ----------------------------------------
      // FIND ACTIVITY
      // ----------------------------------------

      const activity =
        await Activity.findById(id);

      if (!activity) {
        return res.status(404).json({
          message: "Activity not found.",
        });
      }

      // ----------------------------------------
      // ONLY CREATOR CAN DELETE
      // ----------------------------------------

      if (
        String(activity.creatorId) !==
        String(req.userId)
      ) {
        return res.status(403).json({
          message:
            "You are not allowed to delete this activity.",
        });
      }

      // ----------------------------------------
      // GET CREATOR
      // ----------------------------------------

      const creator =
        await User.findById(
          req.userId
        ).select("name email");

      // ----------------------------------------
      // SOCKET.IO
      // ----------------------------------------

      const io = req.app.get("io");

      // ----------------------------------------
      // NOTIFY ALL JOINED USERS
      // ----------------------------------------

      const joinedUsers =
        Array.isArray(
          activity.joinedUsers
        )
          ? activity.joinedUsers
          : [];

      for (const joinedUser of joinedUsers) {
        const recipientId =
          joinedUser.userId;

        if (!recipientId) {
          continue;
        }

        const notification =
          await Notification.create({
            recipient: recipientId,
            sender: req.userId,
            type: "activity_cancelled",
            message:
              `${creator?.name || "The activity creator"} cancelled the activity "${activity.title}". 🚫`,
            activity: activity._id,
          });

        // ----------------------------------------
        // REAL-TIME NOTIFICATION
        // ----------------------------------------

        if (io) {
          io.to(
            `user-${recipientId}`
          ).emit(
            "new-notification",
            {
              _id: notification._id,
              type: notification.type,
              message:
                notification.message,
              activity:
                activity._id,

              sender: {
                _id:
                  creator?._id ||
                  req.userId,

                name:
                  creator?.name ||
                  "Let's Go member",

                email:
                  creator?.email ||
                  "",
              },

              createdAt:
                notification.createdAt,
            }
          );
        }
      }

      // ----------------------------------------
      // DELETE ACTIVITY
      // ----------------------------------------

      await Activity.findByIdAndDelete(id);

      // ----------------------------------------
      // RESPONSE
      // ----------------------------------------

      res.status(200).json({
        message:
          "Activity cancelled and deleted successfully.",
      });
    } catch (error) {
      console.error(
        "DELETE ACTIVITY ERROR:",
        error
      );

      res.status(500).json({
        message:
          "Unable to delete activity.",
        error: error.message,
      });
    }
  }
);

// ========================================
// REMOVE MEMBER FROM ACTIVITY
// ========================================

router.delete(
  "/:id/members/:userId",
  authMiddleware,
  async (req, res) => {
    try {
      const { id, userId } = req.params;

      // ----------------------------------------
      // VALIDATE IDS
      // ----------------------------------------

      if (
        !mongoose.Types.ObjectId.isValid(id) ||
        !mongoose.Types.ObjectId.isValid(userId)
      ) {
        return res.status(400).json({
          message: "Invalid activity or user ID.",
        });
      }

      // ----------------------------------------
      // FIND ACTIVITY
      // ----------------------------------------

      const activity =
        await Activity.findById(id);

      if (!activity) {
        return res.status(404).json({
          message: "Activity not found.",
        });
      }

      // ----------------------------------------
      // ONLY CREATOR CAN REMOVE MEMBERS
      // ----------------------------------------

      if (
        String(activity.creatorId) !==
        String(req.userId)
      ) {
        return res.status(403).json({
          message:
            "Only the activity creator can remove members.",
        });
      }

      // ----------------------------------------
      // CREATOR CANNOT REMOVE THEMSELVES
      // ----------------------------------------

      if (
        String(activity.creatorId) ===
        String(userId)
      ) {
        return res.status(400).json({
          message:
            "The activity creator cannot be removed.",
        });
      }

      // ----------------------------------------
      // FIND MEMBER
      // ----------------------------------------

      const memberIndex =
        activity.joinedUsers.findIndex(
          (member) =>
            String(member.userId) ===
            String(userId)
        );

      if (memberIndex === -1) {
        return res.status(404).json({
          message:
            "This user is not a member of the activity.",
        });
      }

      const removedMember =
        activity.joinedUsers[memberIndex];

      // ----------------------------------------
      // REMOVE MEMBER
      // ----------------------------------------

      activity.joinedUsers.splice(
        memberIndex,
        1
      );

      await activity.save();

      // ----------------------------------------
      // REAL-TIME MEMBER REMOVAL
      // ----------------------------------------

      const io = req.app.get("io");

      if (io) {
        io.to(`user-${userId}`).emit(
          "activity-member-removed",
          {
            activityId: activity._id,
            message:
              "You have been removed from this activity by the host.",
          }
        );
      }

      // ----------------------------------------
      // RESPONSE
      // ----------------------------------------

      res.status(200).json({
        message:
          `${removedMember?.name || "Member"} was removed from the activity.`,
        activity,
      });
    } catch (error) {
      console.error(
        "REMOVE ACTIVITY MEMBER ERROR:",
        error
      );

      res.status(500).json({
        message:
          "Unable to remove activity member.",
        error: error.message,
      });
    }
  }
);


// ========================================
// REPORT ACTIVITY
// ========================================

router.post(
  "/:id/report",
  authMiddleware,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { reason, description } =
        req.body;

      // ----------------------------------------
      // VALIDATE ACTIVITY ID
      // ----------------------------------------

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          message: "Invalid activity ID.",
        });
      }

      // ----------------------------------------
      // VALIDATE REASON
      // ----------------------------------------

      const validReasons = [
        "Spam",
        "Inappropriate content",
        "Fake activity",
        "Harassment",
        "Other",
      ];

      if (
        !reason ||
        !validReasons.includes(reason)
      ) {
        return res.status(400).json({
          message:
            "Please select a valid report reason.",
        });
      }

      // ----------------------------------------
      // FIND ACTIVITY
      // ----------------------------------------

      const activity =
        await Activity.findById(id);

      if (!activity) {
        return res.status(404).json({
          message: "Activity not found.",
        });
      }

      // ----------------------------------------
      // PREVENT REPORTING YOUR OWN ACTIVITY
      // ----------------------------------------

      if (
        String(activity.creatorId) ===
        String(req.userId)
      ) {
        return res.status(400).json({
          message:
            "You cannot report your own activity.",
        });
      }

      // ----------------------------------------
      // CHECK FOR EXISTING REPORT
      // ----------------------------------------

      const existingReport =
        await Report.findOne({
          reporterId: req.userId,
          activityId: activity._id,
          status: "pending",
        });

      if (existingReport) {
        return res.status(400).json({
          message:
            "You have already reported this activity.",
        });
      }

      // ----------------------------------------
      // CREATE REPORT
      // ----------------------------------------

      const report =
        await Report.create({
          reporterId: req.userId,
          activityId: activity._id,
          reportedUserId:
            activity.creatorId,

          reason,

          description:
            typeof description === "string"
              ? description.trim()
              : "",
        });

      // ----------------------------------------
      // RESPONSE
      // ----------------------------------------

      res.status(201).json({
        message:
          "Activity reported successfully. Thank you for helping keep Let's Go safe.",
        report,
      });
    } catch (error) {
      console.error(
        "REPORT ACTIVITY ERROR:",
        error
      );

      res.status(500).json({
        message:
          "Unable to report activity.",
        error: error.message,
      });
    }
  }
);

// ========================================
// CONFIRM ATTENDANCE
// ========================================

router.post(
  "/:id/attendance",
  authMiddleware,
  async (req, res) => {
    try {
      const { id } = req.params;

      // ----------------------------------------
      // VALIDATE ACTIVITY ID
      // ----------------------------------------

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          message: "Invalid activity ID.",
        });
      }

      // ----------------------------------------
      // FIND ACTIVITY
      // ----------------------------------------

      const activity = await Activity.findById(id);

      if (!activity) {
        return res.status(404).json({
          message: "Activity not found.",
        });
      }

      // ----------------------------------------
      // CHECK USER
      // ----------------------------------------

      const user = await User.findById(req.userId);

      if (!user) {
        return res.status(401).json({
          message: "User not found.",
        });
      }

      // ----------------------------------------
      // CHECK IF USER IS A MEMBER
      // ----------------------------------------

      const isMember = activity.joinedUsers?.some(
        (member) =>
          String(member.userId) ===
          String(req.userId)
      );

      if (!isMember) {
        return res.status(403).json({
          message:
            "Only activity members can confirm attendance.",
        });
      }

      // ----------------------------------------
      // CHECK IF ALREADY CONFIRMED
      // ----------------------------------------

      if (!Array.isArray(activity.attendance)) {
        activity.attendance = [];
      }

      const existingAttendance =
        activity.attendance.find(
          (entry) =>
            String(entry.userId) ===
            String(req.userId)
        );

      if (existingAttendance) {
        existingAttendance.confirmed = true;
        existingAttendance.confirmedAt = new Date();
      } else {
        activity.attendance.push({
          userId: user._id,
          name: user.name,
          confirmed: true,
          confirmedAt: new Date(),
        });
      }

      await activity.save();

      // ----------------------------------------
      // RESPONSE
      // ----------------------------------------

      return res.status(200).json({
        message: "Attendance confirmed successfully. ✓",
        attendance: activity.attendance,
      });
    } catch (error) {
      console.error(
        "CONFIRM ATTENDANCE ERROR:",
        error
      );

      return res.status(500).json({
        message:
          "Unable to confirm attendance.",
        error: error.message,
      });
    }
  }
);

// ========================================
// GET ACTIVITY ATTENDANCE
// ========================================

router.get(
  "/:id/attendance",
  authMiddleware,
  async (req, res) => {
    try {
      const { id } = req.params;

      // ----------------------------------------
      // VALIDATE ACTIVITY ID
      // ----------------------------------------

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          message: "Invalid activity ID.",
        });
      }

      // ----------------------------------------
      // FIND ACTIVITY
      // ----------------------------------------

      const activity = await Activity.findById(id);

      if (!activity) {
        return res.status(404).json({
          message: "Activity not found.",
        });
      }

      // ----------------------------------------
      // CHECK USER ACCESS
      // ----------------------------------------

      const isMember = activity.joinedUsers?.some(
        (member) =>
          String(member.userId) ===
          String(req.userId)
      );

      if (!isMember) {
        return res.status(403).json({
          message:
            "Only activity members can view attendance.",
        });
      }

      // ----------------------------------------
      // RESPONSE
      // ----------------------------------------

      return res.status(200).json({
        attendance:
          activity.attendance || [],
      });
    } catch (error) {
      console.error(
        "GET ATTENDANCE ERROR:",
        error
      );

      return res.status(500).json({
        message:
          "Unable to fetch attendance.",
        error: error.message,
      });
    }
  }
);

// ========================================
// ACTIVITY MEMORIES
// ========================================

// ----------------------------------------
// ADD ACTIVITY MEMORY
// ----------------------------------------

router.post(
  "/:id/memories",
  authMiddleware,
  handleMemoryUpload,
  async (req, res) => {
    try {
      const { id } = req.params;

      const caption =
        typeof req.body?.caption === "string"
          ? req.body.caption.trim()
          : "";

      // ----------------------------------------
      // VALIDATE ACTIVITY ID
      // ----------------------------------------

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          message: "Invalid activity ID.",
        });
      }

      // ----------------------------------------
      // VALIDATE UPLOADED IMAGE
      // ----------------------------------------

      if (!req.file) {
        return res.status(400).json({
          message: "Please select a photo.",
        });
      }

      // ----------------------------------------
      // FIND ACTIVITY
      // ----------------------------------------

      const activity = await Activity.findById(id);

      if (!activity) {
        return res.status(404).json({
          message: "Activity not found.",
        });
      }

      // ----------------------------------------
      // CHECK ACTIVITY IS COMPLETED
      // ----------------------------------------

      const activityDateTime = new Date(
        `${activity.date} ${activity.time}`
      );

      if (Number.isNaN(activityDateTime.getTime())) {
        return res.status(400).json({
          message:
            "Unable to determine activity completion time.",
        });
      }

      const activityEndTime = new Date(
        activityDateTime.getTime() +
          2 * 60 * 60 * 1000
      );

      if (new Date() < activityEndTime) {
        return res.status(400).json({
          message:
            "Memories can only be added after the activity is completed.",
        });
      }

      // ----------------------------------------
      // CHECK USER
      // ----------------------------------------

      const user = await User.findById(req.userId);

      if (!user) {
        return res.status(401).json({
          message: "User not found.",
        });
      }

      // ----------------------------------------
      // CHECK MEMBERSHIP
      // ----------------------------------------

      const isMember =
        activity.joinedUsers?.some(
          (member) =>
            String(member.userId) ===
            String(req.userId)
        );

      if (!isMember) {
        return res.status(403).json({
          message:
            "Only activity members can add memories.",
        });
      }

      // ----------------------------------------
      // UPLOAD IMAGE TO CLOUDINARY
      // ----------------------------------------

      const imageUrl = await new Promise(
        (resolve, reject) => {
          const uploadStream =
            cloudinary.uploader.upload_stream(
              {
                folder: "lets-go/activity-memories",
                resource_type: "image",
              },
              (error, result) => {
                if (error) {
                  console.error(
                    "ACTIVITY MEMORY CLOUDINARY ERROR:",
                    error
                  );

                  return reject(error);
                }

                if (!result?.secure_url) {
                  return reject(
                    new Error(
                      "Cloudinary did not return an image URL."
                    )
                  );
                }

                resolve(result.secure_url);
              }
            );

          uploadStream.end(req.file.buffer);
        }
      );

      // ----------------------------------------
      // CREATE MEMORY
      // ----------------------------------------

      const memory =
        await ActivityMemory.create({
          activityId: activity._id,
          userId: user._id,
          userName: user.name,
          imageUrl,
          caption,
        });

      // ----------------------------------------
      // RESPONSE
      // ----------------------------------------

      return res.status(201).json({
        message:
          "Activity memory added successfully. 📸",
        memory,
      });
    } catch (error) {
      console.error(
        "ADD ACTIVITY MEMORY ERROR:",
        error
      );

      return res.status(500).json({
        message:
          "Unable to add activity memory.",
        error: error.message,
      });
    }
  }
);


// ----------------------------------------
// GET ACTIVITY MEMORIES
// ----------------------------------------

router.get(
  "/:id/memories",
  authMiddleware,
  async (req, res) => {
    try {
      const { id } = req.params;

      // ----------------------------------------
      // VALIDATE ACTIVITY ID
      // ----------------------------------------

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          message: "Invalid activity ID.",
        });
      }

      // ----------------------------------------
      // FIND ACTIVITY
      // ----------------------------------------

      const activity =
        await Activity.findById(id);

      if (!activity) {
        return res.status(404).json({
          message: "Activity not found.",
        });
      }

      // ----------------------------------------
      // CHECK MEMBERSHIP
      // ----------------------------------------

      const isMember =
        activity.joinedUsers?.some(
          (member) =>
            String(member.userId) ===
            String(req.userId)
        );

      if (!isMember) {
        return res.status(403).json({
          message:
            "Only activity members can view memories.",
        });
      }

      // ----------------------------------------
      // GET MEMORIES
      // ----------------------------------------

      const memories =
        await ActivityMemory.find({
          activityId: activity._id,
        }).sort({
          createdAt: -1,
        });

      // ----------------------------------------
      // RESPONSE
      // ----------------------------------------

      return res.status(200).json({
        memories,
      });
    } catch (error) {
      console.error(
        "GET ACTIVITY MEMORIES ERROR:",
        error
      );

      return res.status(500).json({
        message:
          "Unable to fetch activity memories.",
        error: error.message,
      });
    }
  }
);

// ========================================
// EXPORT ROUTER
// ========================================

module.exports = router;