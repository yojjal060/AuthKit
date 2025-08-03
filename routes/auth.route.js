import express from "express";
import authController from "../controllers/auth.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import requireRole from "../middlewares/role.middleware.js";
import tenantMiddleware from "../middlewares/tenant.middleware.js";
import sendEmail from "../utils/sendEmail.util.js";
import crypto from 'crypto';
import User from '../models/user.model.js';

const router = express.Router();

// Routes that don't need tenant middleware
router.get("/verify-email", authController.verifyEmail);

router.get("/reset-form", (req, res) => {
  const { token } = req.query;
  
  if (!token) {
    return res.status(400).send(`
      <html>
        <head><title>Invalid Reset Link</title></head>
        <body style="font-family: Arial; text-align: center; padding: 50px;">
          <h2>❌ Invalid Reset Link</h2>
          <p>No token provided. Please check your email for the correct reset link.</p>
        </body>
      </html>
    `);
  }

  // Redirect to static HTML page with token
  res.redirect(`/reset-password.html?token=${token}`);
});

// Apply tenant middleware to all other routes
router.use(tenantMiddleware);

// Authentication routes
router.post("/register", authController.registerUser);
router.post("/login", authController.loginUser);
router.post("/logout", (req, res) => {
  res.json({
    message: "Logout successful. Please remove your token on client side.",
  });
});

// Password reset routes
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);

// Protected routes
router.get("/me", authMiddleware, (req, res) => {
  res.json({
    message: "You are authorized",
    user: req.user,
  });
});

router.put("/me", authMiddleware, authController.updateProfile);

// Admin routes
router.get("/admin", authMiddleware, requireRole("admin"), (req, res) => {
  res.json({
    message: "Welcome to admin panel",
    user: req.user,
  });
});

// Utility routes
router.get("/health", (req, res) => {
  res.json({ 
    status: "ok", 
    message: "AuthKit API is healthy.",
    timestamp: new Date().toISOString(),
    tenant: req.tenantId || 'default'
  });
});

// Resend verification email
router.post("/resend-verification", async (req, res) => {
  try {
    const { email } = req.body;
    const tenantId = req.tenantId || 'default';
    
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ 
      email: email.toLowerCase().trim(), 
      tenantId, 
      isVerified: false 
    });
    
    if (!user) {
      return res.status(404).json({ message: "User not found or already verified" });
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    user.verificationToken = verificationToken;
    user.tokenExpires = tokenExpires;
    await user.save();

    // Generate verification URL
    const isLocalhost = req.get('host').includes('localhost');
    const baseUrl = isLocalhost 
      ? `${req.protocol}://${req.get('host')}` 
      : process.env.CLIENT_URL;
    const verificationUrl = `${baseUrl}/api/auth/verify-email?token=${verificationToken}`;
    
    await sendEmail({
      to: email,
      subject: "Verify your email - AuthKit",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e2e8f0; }
            .button { display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
            .footer { color: #64748b; font-size: 14px; margin-top: 30px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📧 Verify Your Email</h1>
            </div>
            <div class="content">
              <p>Hello <strong>${user.name}</strong>!</p>
              <p>Please verify your email address by clicking the button below:</p>
              
              <div style="text-align: center;">
                <a href="${verificationUrl}" class="button">
                  Verify My Email
                </a>
              </div>
              
              <p>Or copy and paste this link in your browser:</p>
              <p style="background: white; padding: 15px; border-radius: 8px; word-break: break-all; font-family: monospace;">
                ${verificationUrl}
              </p>
              
              <div class="footer">
                <p>⏰ This link will expire in 24 hours.</p>
                <p>Application: ${tenantId}</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    });

    res.json({ message: "Verification email sent successfully" });
  } catch (error) {
    console.error("Resend verification error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Test email functionality (only in development)
if (process.env.NODE_ENV !== 'production') {
  router.post("/test-email", async (req, res) => {
    try {
      await sendEmail({
        to: req.body.to,
        subject: "Test Email from AuthKit",
        text: "This is a test email from AuthKit.",
        html: "<b>This is a test email from AuthKit.</b>",
      });
      res.json({ message: "Email sent!" });
    } catch (error) {
      res.status(500).json({ message: "Email failed", error: error.message });
    }
  });
}

export default router;