/* eslint-disable no-undef */
const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/User");
const Activity = require("../models/Activity");
const authMiddleware = require("./middleware/authMiddleware");

const multer = require("multer");
const cloudinary = require("../cloudinary");

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      "image/jpeg",
      "image/jpg",
      "image/heic",
      "image/heif",
    ];

    const allowedExtensions = [
      ".jpg",
      ".jpeg",
      ".heic",
      ".heif",
    ];

    const extension = require("path")
      .extname(file.originalname)
      .toLowerCase();

    if (
      allowedMimeTypes.includes(file.mimetype) &&
      allowedExtensions.includes(extension)
    ) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Only JPG, JPEG, and HEIC photos are allowed."
        )
      );
    }
  },
});

const router = express.Router();

// ========================================
// TEST ROUTE
// ========================================

router.get("/test", (req, res) => {
  res.json({
    message: "Users route is working 🚀",
  });
});

// ========================================
// GET LOGGED-IN USER PROFILE
// ========================================

router.get(
  "/profile",
  authMiddleware,
  async (req, res) => {
    try {
      const user =
        await User.findById(
          req.userId
        ).select("-password");

      if (!user) {
        return res.status(404).json({
          message: "User not found.",
        });
      }

      res.json({
        user,
      });
    } catch (error) {
      console.error(
        "GET PROFILE ERROR:",
        error
      );

      res.status(500).json({
        message:
          "Unable to fetch profile.",
        error: error.message,
      });
    }
  }
);

// ========================================
// UPDATE LOGGED-IN USER PROFILE
// ========================================

router.put(
  "/profile",
  authMiddleware,
  async (req, res) => {
    try {
      const { name } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({
          message:
            "Name cannot be empty.",
        });
      }

      const user =
        await User.findByIdAndUpdate(
          req.userId,
          {
            name: name.trim(),
          },
          {
            new: true,
            runValidators: true,
          }
        ).select("-password");

      if (!user) {
        return res.status(404).json({
          message:
            "User not found.",
        });
      }

      res.json({
        message:
          "Profile updated successfully.",
        user,
      });
    } catch (error) {
      console.error(
        "UPDATE PROFILE ERROR:",
        error
      );

      res.status(500).json({
        message:
          "Unable to update profile.",
        error: error.message,
      });
    }
  }
);

// ========================================
// GET USER PREFERENCES
// ========================================

router.get(
  "/preferences",
  authMiddleware,
  async (req, res) => {
    try {
      const user =
        await User.findById(
          req.userId
        ).select(
          "name email interests location bio avatar"
        );

      if (!user) {
        return res.status(404).json({
          message:
            "User not found.",
        });
      }

      res.status(200).json({
        preferences: {
          interests:
            user.interests || [],

          location:
            user.location || "",

          bio:
            user.bio || "",

          avatar:
            user.avatar || "",
        },
      });
    } catch (error) {
      console.error(
        "GET PREFERENCES ERROR:",
        error
      );

      res.status(500).json({
        message:
          "Unable to fetch preferences.",
        error: error.message,
      });
    }
  }
);

// ========================================
// UPDATE USER PREFERENCES
// ========================================

router.put(
  "/preferences",
  authMiddleware,
  async (req, res) => {
    try {
      const {
        interests,
        location,
        bio,
        avatar,
      } = req.body;

      // ========================================
      // VALIDATE INTERESTS
      // ========================================

      if (
        interests !== undefined &&
        !Array.isArray(interests)
      ) {
        return res.status(400).json({
          message:
            "Interests must be an array.",
        });
      }

      // ========================================
      // CLEAN INTERESTS
      // ========================================

      let cleanedInterests =
        undefined;

      if (
        Array.isArray(interests)
      ) {
        cleanedInterests = [
          ...new Set(
            interests
              .filter(
                (interest) =>
                  typeof interest ===
                  "string"
              )
              .map(
                (interest) =>
                  interest.trim()
              )
              .filter(Boolean)
          ),
        ];
      }

      // ========================================
      // BUILD UPDATE
      // ========================================

      const updateData = {};

      if (
        cleanedInterests !==
        undefined
      ) {
        updateData.interests =
          cleanedInterests;
      }

      if (
        location !== undefined
      ) {
        updateData.location =
          String(location).trim();
      }

      if (bio !== undefined) {
        updateData.bio =
          String(bio).trim();
      }

      if (avatar !== undefined) {
        updateData.avatar =
          String(avatar).trim();
      }

      // ========================================
      // UPDATE USER
      // ========================================

      const user =
        await User.findByIdAndUpdate(
          req.userId,
          updateData,
          {
            new: true,
            runValidators: true,
          }
        ).select("-password");

      if (!user) {
        return res.status(404).json({
          message:
            "User not found.",
        });
      }

      // ========================================
      // RESPONSE
      // ========================================

      res.status(200).json({
        message:
          "Preferences updated successfully.",

        preferences: {
          interests:
            user.interests || [],

          location:
            user.location || "",

          bio:
            user.bio || "",

          avatar:
            user.avatar || "",
        },

        user,
      });
    } catch (error) {
      console.error(
        "UPDATE PREFERENCES ERROR:",
        error
      );

      res.status(500).json({
        message:
          "Unable to update preferences.",
        error: error.message,
      });
    }
  }
);

// ========================================
// UPLOAD PROFILE PHOTO
// ========================================

router.post(
  "/profile/avatar",
  authMiddleware,
  upload.single("avatar"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          message: "Please select an image.",
        });
      }

      console.log("CLOUDINARY OBJECT:", !!cloudinary);
      console.log("CLOUDINARY UPLOADER:", !!cloudinary?.uploader);
      
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "lets-go/profile-photos",
          resource_type: "image",
        },
        async (error, result) => {
          if (error) {
            console.error(
              "CLOUDINARY UPLOAD ERROR:",
              error
            );

            return res.status(500).json({
             message: error.message || "Unable to upload profile photo.",
              error: error.message,
            });
          }

          try {
            const user =
              await User.findByIdAndUpdate(
                req.userId,
                {
                  avatar: result.secure_url,
                },
                {
                  new: true,
                  runValidators: true,
                }
              ).select("-password");

            if (!user) {
              return res.status(404).json({
                message: "User not found.",
              });
            }

            res.status(200).json({
              message:
                "Profile photo uploaded successfully.",
              avatar: result.secure_url,
              user,
            });
          } catch (dbError) {
            console.error(
              "PROFILE PHOTO DATABASE ERROR:",
              dbError
            );

            res.status(500).json({
              message:
                "Photo uploaded, but profile could not be updated.",
              error: dbError.message,
            });
          }
        }
      );

      uploadStream.end(req.file.buffer);
    } catch (error) {
      console.error(
        "PROFILE PHOTO ERROR:",
        error
      );

      res.status(500).json({
        message: "Unable to upload profile photo.",
        error: error.message,
      });
    }
  }
);

// ========================================
// GET ACTIVITIES CREATED BY LOGGED-IN USER
// ========================================

router.get(
  "/created-activities",
  authMiddleware,
  async (req, res) => {
    try {
      const activities =
        await Activity.find({
          creatorId: req.userId,
        }).sort({
          createdAt: -1,
        });

      res.json({
        activities,
      });
    } catch (error) {
      console.error(
        "CREATED ACTIVITIES ERROR:",
        error
      );

      res.status(500).json({
        message:
          "Unable to fetch created activities.",
        error: error.message,
      });
    }
  }
);

// ========================================
// GET USER BY ID
// ========================================

router.get(
  "/:id",
  async (req, res) => {
    try {
      const { id } =
        req.params;

      // Check if ID is a valid
      // MongoDB ObjectId
      if (
        !mongoose.Types.ObjectId.isValid(
          id
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid user ID.",
        });
      }

      const user =
        await User.findById(
          id
        ).select("-password");

      if (!user) {
        return res.status(404).json({
          message:
            "User not found",
        });
      }

      res.json({
        user,
      });
    } catch (error) {
      console.error(
        "USER ERROR:",
        error
      );

      res.status(500).json({
        message:
          "Unable to fetch user",
        error: error.message,
      });
    }
  }
);

// ========================================
// EXPORT ROUTER
// ========================================

module.exports = router;