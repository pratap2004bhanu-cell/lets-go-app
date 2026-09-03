/* eslint-disable no-undef */

const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const authMiddleware = (req, res, next) => {
  try {
    // ========================================
    // GET AUTHORIZATION HEADER
    // ========================================

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Authentication required.",
      });
    }

    // ========================================
    // GET TOKEN
    // ========================================

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        message: "Authentication token is missing.",
      });
    }

    // ========================================
    // VERIFY TOKEN
    // ========================================

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    console.log("🔐 JWT decoded:", decoded);

    // ========================================
    // GET USER ID
    // ========================================

    const userId =
      decoded.userId ||
      decoded.id ||
      decoded._id;

    if (!userId) {
      console.error(
        "❌ JWT does not contain a user ID:",
        decoded
      );

      return res.status(401).json({
        message: "Invalid authentication token.",
      });
    }

    // ========================================
    // VALIDATE USER ID
    // ========================================

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.error(
        "❌ Invalid user ID from JWT:",
        userId
      );

      return res.status(401).json({
        message: "Invalid user ID.",
      });
    }

    // ========================================
    // ATTACH USER ID TO REQUEST
    // ========================================

    req.userId = userId;

    console.log(
      `👤 Authenticated user: ${req.userId}`
    );

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

module.exports = authMiddleware;