/* eslint-disable no-undef */

const mongoose = require("mongoose");

const ratingSchema = new mongoose.Schema(
  {
    activityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Activity",
      required: true,
    },

    reviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },

    review: {
      type: String,
      trim: true,
      default: "",
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  }
);

// One person can rate an activity only once
ratingSchema.index(
  { activityId: 1, reviewerId: 1 },
  { unique: true }
);

module.exports = mongoose.model("Rating", ratingSchema);