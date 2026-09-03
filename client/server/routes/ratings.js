const express = require("express");
const mongoose = require("mongoose");

const Activity = require("../models/Activity");
const Rating = require("../models/Rating");
const authMiddleware = require("./middleware/authMiddleware");

const router = express.Router();

// ========================================
// HELPER: CHECK IF ACTIVITY IS FINISHED
// ========================================

const isActivityFinished = (activity) => {
  if (!activity?.date) {
    return false;
  }

  const dateString = String(activity.date).trim();
  const timeString = String(activity.time || "").trim();

  let year;
  let month;
  let day;

  // Supports YYYY-MM-DD
  const isoMatch = dateString.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/
  );

  if (isoMatch) {
    year = Number(isoMatch[1]);
    month = Number(isoMatch[2]);
    day = Number(isoMatch[3]);
  } else {
    // Supports DD/MM/YYYY
    const dmyMatch = dateString.match(
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
    );

    if (dmyMatch) {
      day = Number(dmyMatch[1]);
      month = Number(dmyMatch[2]);
      year = Number(dmyMatch[3]);
    } else {
      // Supports MM/DD/YYYY
      const mdyMatch = dateString.match(
        /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
      );

      if (mdyMatch) {
        month = Number(mdyMatch[1]);
        day = Number(mdyMatch[2]);
        year = Number(mdyMatch[3]);
      } else {
        return false;
      }
    }
  }

  let hours = 23;
  let minutes = 59;

  // 24-hour format: HH:MM
  const twentyFourHourMatch = timeString.match(
    /^(\d{1,2}):(\d{2})$/
  );

  if (twentyFourHourMatch) {
    hours = Number(twentyFourHourMatch[1]);
    minutes = Number(twentyFourHourMatch[2]);
  } else {
    // 12-hour format: H:MM AM/PM
    const twelveHourMatch = timeString.match(
      /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i
    );

    if (twelveHourMatch) {
      hours = Number(twelveHourMatch[1]);
      minutes = Number(twelveHourMatch[2]);

      const period = twelveHourMatch[3].toUpperCase();

      if (period === "AM" && hours === 12) {
        hours = 0;
      }

      if (period === "PM" && hours !== 12) {
        hours += 12;
      }
    }
  }

  const activityDateTime = new Date(
    year,
    month - 1,
    day,
    hours,
    minutes,
    0,
    0
  );

  if (Number.isNaN(activityDateTime.getTime())) {
    return false;
  }

  return activityDateTime < new Date();
};

// ========================================
// SUBMIT ACTIVITY RATING
// ========================================

router.post(
  "/:activityId",
  authMiddleware,
  async (req, res) => {
    try {
      const { activityId } = req.params;
      const { rating, review } = req.body;

      const userId = req.userId;

      // ========================================
      // VALIDATE ACTIVITY ID
      // ========================================

      if (
        !mongoose.Types.ObjectId.isValid(activityId)
      ) {
        return res.status(400).json({
          message: "Invalid activity ID.",
        });
      }

      // ========================================
      // VALIDATE USER
      // ========================================

      if (!userId) {
        return res.status(401).json({
          message: "Authentication required.",
        });
      }

      // ========================================
      // VALIDATE RATING
      // ========================================

      const numericRating = Number(rating);

      if (
        !Number.isInteger(numericRating) ||
        numericRating < 1 ||
        numericRating > 5
      ) {
        return res.status(400).json({
          message: "Rating must be between 1 and 5.",
        });
      }

      // ========================================
      // FIND ACTIVITY
      // ========================================

      const activity = await Activity.findById(
        activityId
      );

      if (!activity) {
        return res.status(404).json({
          message: "Activity not found.",
        });
      }

      // ========================================
      // CHECK ACTIVITY COMPLETION
      // ========================================

      if (!isActivityFinished(activity)) {
        return res.status(400).json({
          message:
            "You can rate this activity only after it has finished.",
        });
      }

      // ========================================
      // CHECK PARTICIPATION
      // ========================================

      const isCreator =
        String(activity.creatorId) ===
        String(userId);

      const isJoined = (
        activity.joinedUsers || []
      ).some(
        (member) =>
          String(member?.userId) ===
          String(userId)
      );

      if (!isCreator && !isJoined) {
        return res.status(403).json({
          message:
            "Only activity participants can submit a rating.",
        });
      }

      // ========================================
      // CHECK DUPLICATE RATING
      // ========================================

      const existingRating =
        await Rating.findOne({
          activityId,
          reviewerId: userId,
        });

      if (existingRating) {
        return res.status(409).json({
          message:
            "You have already rated this activity.",
        });
      }

      // ========================================
      // CREATE RATING
      // ========================================

      const newRating = await Rating.create({
        activityId,
        reviewerId: userId,
        rating: numericRating,
        review:
          typeof review === "string"
            ? review.trim()
            : "",
      });

      return res.status(201).json({
        message:
          "Rating submitted successfully.",
        rating: newRating,
      });
    } catch (error) {
      console.error(
        "❌ Submit rating error:",
        error.message
      );

      // Handles duplicate index race condition
      if (error.code === 11000) {
        return res.status(409).json({
          message:
            "You have already rated this activity.",
        });
      }

      return res.status(500).json({
        message: "Unable to submit rating.",
      });
    }
  }
);

// ========================================
// CHECK CURRENT USER'S RATING
// IMPORTANT: THIS MUST COME BEFORE
// /:activityId
// ========================================

router.get(
  "/:activityId/my-rating",
  authMiddleware,
  async (req, res) => {
    try {
      const { activityId } = req.params;

      const userId = req.userId;

      // ========================================
      // VALIDATE ACTIVITY ID
      // ========================================

      if (
        !mongoose.Types.ObjectId.isValid(
          activityId
        )
      ) {
        return res.status(400).json({
          message: "Invalid activity ID.",
        });
      }

      // ========================================
      // VALIDATE USER
      // ========================================

      if (!userId) {
        return res.status(401).json({
          message: "Authentication required.",
        });
      }

      // ========================================
      // FIND CURRENT USER'S RATING
      // ========================================

      const existingRating =
        await Rating.findOne({
          activityId,
          reviewerId: userId,
        });

      return res.json({
        rated: Boolean(existingRating),
        rating: existingRating || null,
      });
    } catch (error) {
      console.error(
        "❌ Get my rating error:",
        error.message
      );

      return res.status(500).json({
        message:
          "Unable to check your rating.",
      });
    }
  }
);

// ========================================
// GET USER HOST REPUTATION
// ========================================

router.get(
  "/host/:userId",
  async (req, res) => {
    try {
      const { userId } = req.params;

      // ========================================
      // VALIDATE USER ID
      // ========================================

      if (
        !mongoose.Types.ObjectId.isValid(userId)
      ) {
        return res.status(400).json({
          message: "Invalid user ID.",
        });
      }

      // ========================================
      // FIND ACTIVITIES CREATED BY USER
      // ========================================

      const activities = await Activity.find({
        creatorId: userId,
      }).select("_id");

      const activityIds = activities.map(
        (activity) => activity._id
      );

      // ========================================
      // NO ACTIVITIES / NO RATINGS
      // ========================================

      if (activityIds.length === 0) {
        return res.json({
          userId,
          averageRating: 0,
          totalRatings: 0,
        });
      }

      // ========================================
      // FIND RATINGS FOR USER'S ACTIVITIES
      // ========================================

      const ratings = await Rating.find({
        activityId: {
          $in: activityIds,
        },
      }).select("rating");

      // ========================================
      // CALCULATE REPUTATION
      // ========================================

      const totalRatings = ratings.length;

      const averageRating =
        totalRatings > 0
          ? Number(
              (
                ratings.reduce(
                  (sum, item) =>
                    sum + item.rating,
                  0
                ) / totalRatings
              ).toFixed(1)
            )
          : 0;

      // ========================================
      // RESPONSE
      // ========================================

      return res.json({
        userId,
        averageRating,
        totalRatings,
      });
    } catch (error) {
      console.error(
        "❌ Get host reputation error:",
        error.message
      );

      return res.status(500).json({
        message:
          "Unable to fetch host reputation.",
      });
    }
  }
);


// ========================================
// GET ACTIVITY RATINGS
// ========================================

router.get(
  "/:activityId",
  async (req, res) => {
    try {
      const { activityId } = req.params;

      // ========================================
      // VALIDATE ACTIVITY ID
      // ========================================

      if (
        !mongoose.Types.ObjectId.isValid(
          activityId
        )
      ) {
        return res.status(400).json({
          message: "Invalid activity ID.",
        });
      }

      // ========================================
      // FIND ACTIVITY
      // ========================================

      const activity =
        await Activity.findById(activityId);

      if (!activity) {
        return res.status(404).json({
          message: "Activity not found.",
        });
      }

      // ========================================
      // FIND RATINGS
      // ========================================

      const ratings = await Rating.find({
        activityId,
      })
        .populate(
          "reviewerId",
          "name avatar"
        )
        .sort({
          createdAt: -1,
        });

      // ========================================
      // CALCULATE RATING SUMMARY
      // ========================================

      const totalRatings = ratings.length;

      const averageRating =
        totalRatings > 0
          ? (
              ratings.reduce(
                (sum, item) =>
                  sum + item.rating,
                0
              ) / totalRatings
            ).toFixed(1)
          : "0.0";

      // ========================================
      // RESPONSE
      // ========================================

      return res.json({
        activityId,
        averageRating:
          Number(averageRating),
        totalRatings,
        ratings,
      });
    } catch (error) {
      console.error(
        "❌ Get ratings error:",
        error.message
      );

      return res.status(500).json({
        message:
          "Unable to fetch ratings.",
      });
    }
  }
);

console.log("✅ RATINGS ROUTES LOADED");

module.exports = router;