const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    // ========================================
    // BASIC INFORMATION
    // ========================================

    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
    },

    // ========================================
    // USER INTERESTS
    // ========================================

    interests: {
      type: [String],
      default: [],
    },

    // ========================================
    // LOCATION
    // ========================================

    location: {
      type: String,
      trim: true,
      default: "",
    },

    // ========================================
    // BIO
    // ========================================

    bio: {
      type: String,
      trim: true,
      maxlength: 300,
      default: "",
    },

    // ========================================
    // PROFILE AVATAR
    // ========================================

    avatar: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "User",
  userSchema
);