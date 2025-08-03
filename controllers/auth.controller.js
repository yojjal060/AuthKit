import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import generateToken from "../utils/generateToken.util.js";
import Joi from "joi";
import crypto from "crypto";
import logger from "../utils/logger.util.js";
import sendEmail from "../utils/sendEmail.util.js";

// Joi validation schemas
const registerSchema = Joi.object({
  name: Joi.string().trim().required().messages({
    "string.empty": "Name is required",
  }),
  email: Joi.string().email().trim().required().messages({
    "string.empty": "Email is required",
    "string.email": "Email must be valid",
  }),
  password: Joi.string().min(6).required().messages({
    "string.empty": "Password is required",
    "string.min": "Password must be at least 6 characters",
  }),
});

const loginSchema = Joi.object({
  email: Joi.string().email().trim().required().messages({
    "string.empty": "Email is required",
    "string.email": "Email must be valid",
  }),
  password: Joi.string().required().messages({
    "string.empty": "Password is required",
  }),
});

// Helper function to generate dynamic URLs for different environments
const generateVerificationUrl = (req, token) => {
  const isLocalhost = req.get('host').includes('localhost') || req.get('host').includes('127.0.0.1');
  
  if (isLocalhost) {
    return `${req.protocol}://${req.get('host')}/api/auth/verify-email?token=${token}`;
  } else {
    return `${process.env.CLIENT_URL || req.protocol + '://' + req.get('host')}/api/auth/verify-email?token=${token}`;
  }
};

const registerUser = async (req, res) => {
  const { error } = registerSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }
  
  const { name, password } = req.body;
  let { email } = req.body;
  
  // Clean and normalize email
  email = email.trim().toLowerCase();
  const tenantId = req.tenantId || 'default';
  
  try {
    // Check if user already exists within this tenant
    const existingUser = await User.findOne({ email, tenantId });
    if (existingUser) {
      return res.status(409).json({ message: "Email already in use in this application" });
    }
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create new user with tenant support
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      tenantId,
      verificationToken,
      tokenExpires,
    });
    await newUser.save();

    // Send verification email
    try {
      const verificationUrl = generateVerificationUrl(req, verificationToken);
      
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
                <h1>📧 Welcome to AuthKit!</h1>
              </div>
              <div class="content">
                <p>Hello <strong>${name}</strong>!</p>
                <p>Thank you for registering with AuthKit. Please verify your email address to complete your registration.</p>
                
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
                  <p>If you didn't create an account, please ignore this email.</p>
                  <p>Application: ${tenantId}</p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `,
      });
      
      logger.info(`Verification email sent to ${email} for tenant ${tenantId}`);
    } catch (emailError) {
      logger.error("Email sending failed:", emailError);
      // Don't fail registration if email fails
    }

    res.status(201).json({
      message: "User registered successfully. Please check your email to verify your account.",
      tenantId: tenantId
    });
  } catch (error) {
    logger.error("Registration error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

const loginUser = async (req, res) => {
  const { error } = loginSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }
  
  const { email, password } = req.body;
  const tenantId = req.tenantId || 'default';
  
  try {
    // Check if user exists within this tenant
    const user = await User.findOne({ email: email.toLowerCase().trim(), tenantId });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials." });
    }
    
    // Check if email is verified
    if (!user.isVerified) {
      return res.status(401).json({ 
        message: "Please verify your email before logging in.",
        needsVerification: true 
      });
    }
    
    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials." });
    }
    
    // Create JWT token with tenant info
    const payload = {
      userId: user._id,
      email: user.email,
      role: user.role,
      tenantId: tenantId
    };
    const token = generateToken(payload);
    
    logger.info(`User ${email} logged in successfully for tenant ${tenantId}`);
    
    res.status(200).json({ 
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: tenantId
      }
    });
  } catch (error) {
    logger.error("Login error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;
    
    if (!token) {
      return res.status(400).send(`
        <html>
          <head><title>Email Verification Failed</title></head>
          <body style="font-family: Arial; text-align: center; padding: 50px; background: #f8fafc;">
            <div style="max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
              <h2 style="color: #ef4444;">❌ Email Verification Failed</h2>
              <p>Verification token is required.</p>
              <a href="/" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">Go to Homepage</a>
            </div>
          </body>
        </html>
      `);
    }

    // Find user by verification token across all tenants
    const user = await User.findOne({ 
      verificationToken: token,
      tokenExpires: { $gt: new Date() }
    });
    
    if (!user) {
      // Check if token exists but expired
      const expiredUser = await User.findOne({ verificationToken: token });
      
      return res.status(400).send(`
        <html>
          <head><title>Email Verification Failed</title></head>
          <body style="font-family: Arial; text-align: center; padding: 50px; background: #f8fafc;">
            <div style="max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
              <h2 style="color: #ef4444;">❌ Email Verification Failed</h2>
              <p>${expiredUser ? 'Verification token has expired.' : 'Invalid verification token.'}</p>
              <p>Please request a new verification email or contact support.</p>
              <a href="/" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 20px; display: inline-block;">Go to Homepage</a>
            </div>
          </body>
        </html>
      `);
    }

    // Mark user as verified and clear verification token
    user.isVerified = true;
    user.verificationToken = null;
    user.tokenExpires = null;
    await user.save();
    
    logger.info(`Email verified successfully for user ${user.email} in tenant ${user.tenantId}`);

    res.send(`
      <html>
        <head>
          <title>Email Verified Successfully</title>
          <style>
            body { font-family: Arial; text-align: center; padding: 50px; background: #f8fafc; }
            .container { max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
            .success { color: #10b981; }
            .button { background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 20px; display: inline-block; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2 class="success">✅ Email Verified Successfully!</h2>
            <p>Your email has been verified. You can now login to your account.</p>
            <p><strong>User:</strong> ${user.name}</p>
            <p><strong>Email:</strong> ${user.email}</p>
            <a href="/" class="button">Go to API Documentation</a>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    logger.error("Email verification error:", error);
    res.status(500).send(`
      <html>
        <head><title>Server Error</title></head>
        <body style="font-family: Arial; text-align: center; padding: 50px; background: #f8fafc;">
          <div style="max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px;">
            <h2 style="color: #ef4444;">❌ Server Error</h2>
            <p>Something went wrong. Please try again later.</p>
          </div>
        </body>
      </html>
    `);
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const tenantId = req.tenantId || 'default';
    
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Find user within tenant
    const user = await User.findOne({ email: email.toLowerCase().trim(), tenantId });
    if (!user) {
      return res.status(404).json({ message: "No user found with this email in this application" });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    user.resetToken = resetToken;
    user.tokenExpires = tokenExpires;
    await user.save();

    try {
      const resetUrl = generateVerificationUrl(req, '').replace('/verify-email', `/reset-form`) + `?token=${resetToken}`;
      
      await sendEmail({
        to: email,
        subject: `Reset your password - ${tenantId === 'default' ? 'AuthKit' : tenantId}`,
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
                <h1>🔐 Password Reset Request</h1>
              </div>
              <div class="content">
                <p>Hello <strong>${user.name}</strong>!</p>
                <p>You requested a password reset for your account.</p>
                
                <div style="text-align: center;">
                  <a href="${resetUrl}" class="button">
                    Reset My Password
                  </a>
                </div>
                
                <p>Or copy and paste this link in your browser:</p>
                <p style="background: white; padding: 15px; border-radius: 8px; word-break: break-all; font-family: monospace;">
                  ${resetUrl}
                </p>
                
                <div class="footer">
                  <p>⏰ This link will expire in 24 hours.</p>
                  <p>If you didn't request this password reset, please ignore this email.</p>
                  <p>Application: ${tenantId}</p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `,
      });
      
      logger.info(`Password reset email sent to ${email} for tenant ${tenantId}`);
    } catch (emailError) {
      logger.error("Password reset email failed:", emailError);
      return res.status(500).json({ message: "Could not send reset email" });
    }

    res.json({ 
      message: "Password reset email sent successfully! Check your email for the reset link.",
      note: "The reset link will expire in 24 hours"
    });
  } catch (error) {
    logger.error("Forgot password error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ message: "Token and password are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    // Find user with valid reset token
    const user = await User.findOne({ 
      resetToken: token,
      tokenExpires: { $gt: new Date() }
    });
    
    if (!user) {
      return res.status(400).json({ message: "Invalid or expired reset token" });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    user.resetToken = null;
    user.tokenExpires = null;
    await user.save();

    logger.info(`Password reset successful for user ${user.email} in tenant ${user.tenantId}`);
    res.json({ message: "Password reset successful" });
  } catch (error) {
    logger.error("Reset password error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

const updateProfile = async (req, res) => {
  const userId = req.user.userId;
  const tenantId = req.user.tenantId || req.tenantId || 'default';
  const { name, avatarURL } = req.body;
  
  try {
    const updatedUser = await User.findOneAndUpdate(
      { _id: userId, tenantId },
      { name, avatarURL },
      { new: true, runValidators: true }
    ).select('-password -resetToken -verificationToken');
    
    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }
    
    logger.info(`Profile updated for user ${updatedUser.email} in tenant ${tenantId}`);
    res.json({ message: "Profile updated", user: updatedUser });
  } catch (error) {
    logger.error("Profile update error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

export default {
  registerUser,
  loginUser,
  updateProfile,
  verifyEmail,
  forgotPassword,
  resetPassword,
};