import express from "express";
import authController from "../controllers/auth.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import requireRole from "../middlewares/role.middleware.js";
import sendEmail from "../utils/sendEmail.util.js";

const router = express.Router();

router.post("/register", authController.registerUser);
router.post("/login", authController.loginUser);

// Email verification and password reset routes
router.get("/verify-email", authController.verifyEmail);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);

router.get("/me", authMiddleware, (req, res) => {
  res.json({
    message: "You are authorized",
    user: req.user,
  });
});

// Update profile route
router.put("/me", authMiddleware, authController.updateProfile);

// @route   POST /api/auth/logout
// @desc    Logout user (JWT is stateless, so just instruct client to delete token)
// @access  Public
router.post("/logout", (req, res) => {
  // Instruct client to remove token
  res.json({
    message: "Logout successful. Please remove your token on client side.",
  });
});

// Health check route
router.get("/health", (req, res) => {
  res.json({ status: "ok", message: "AuthKit API is healthy." });
});

// Admin only route example
router.get("/admin", authMiddleware, requireRole("admin"), (req, res) => {
  res.json({
    message: "Welcome to admin panel",
    user: req.user,
  });
});

router.post("/test-email", async (req, res) => {
  try {
    await sendEmail({
      to: req.body.to,
      subject: "Live Email",
      text: "This is a live email from AuthKit.",
      html: "<b>This is a live email from AuthKit.</b>",
    });
    res.json({ message: "Email sent!" });
  } catch (error) {
    res.status(500).json({ message: "Email failed", error: error.message });
  }
});

export default router;
