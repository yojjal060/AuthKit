import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import generateToken from "../utils/generateToken.util.js";
import Joi from "joi";
import crypto from "crypto";
import logger from "../utils/logger.util.js";
import sendEmail from "../utils/sendEmail.util.js";

// Joi schemas
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

const registerUser = async (req, res) => {
  const { error } = registerSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }
  const { name, email, password } = req.body;
  try {
    // check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "Email already in use" });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");

    // create new user
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      resetToken: verificationToken,
    });
    await newUser.save();

    // Send verification email
    try {
      await sendEmail({
        to: email,
        subject: "Verify your email",
        html: `<p>Please verify your email by clicking the link below:</p>
               <a href="${
                 process.env.CLIENT_URL || "http://localhost:3000"
               }/verify-email?token=${verificationToken}">Verify Email</a>`,
      });
    } catch (emailError) {
      logger.error("Email sending failed:", emailError);
    }

    res.status(201).json({
      message:
        "User registered successfully. Please check your email to verify your account.",
    });
  } catch (error) {
    logger.error("Registration error: ", error);
    res.status(500).json({ message: "Server error." });
  }
};

const loginUser = async (req, res) => {
  const { error } = loginSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }
  const { email, password } = req.body;
  try {
    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials." });
    }
    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials." });
    }
    // Create JWT token
    const payload = {
      userId: user._id,
      email: user.email,
      role: user.role,
    };
    const token = generateToken(payload);
    res.status(200).json({ token });
  } catch (error) {
    logger.error("Login error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

// Profile update controller
const updateProfile = async (req, res) => {
  const userId = req.user.userId;
  const { name, avatarURL } = req.body;
  try {
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { name, avatarURL },
      { new: true, runValidators: true }
    );
    res.json({ message: "Profile updated", user: updatedUser });
  } catch (error) {
    logger.error("Profile update error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

// Email verification controller
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res
        .status(400)
        .json({ message: "Verification token is required" });
    }

    const user = await User.findOne({ resetToken: token });
    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    user.isVerified = true;
    user.resetToken = null;
    await user.save();

    res.json({ message: "Email verified successfully!" });
  } catch (error) {
    logger.error("Email verification error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

// Forgot password controller
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "No user found with this email" });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetToken = resetToken;
    await user.save();

    try {
      await sendEmail({
        to: email,
        subject: "Reset your password",
        html: `<p>You requested a password reset. Click the link below to reset your password:</p>
               <a href="${
                 process.env.CLIENT_URL || "http://localhost:3000"
               }/reset-password?token=${resetToken}">Reset Password</a>
               <p>If you didn't request this, please ignore this email.</p>`,
      });
    } catch (emailError) {
      logger.error("Password reset email failed:", emailError);
      return res.status(500).json({ message: "Could not send reset email" });
    }

    res.json({ message: "Password reset email sent" });
  } catch (error) {
    logger.error("Forgot password error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

// Reset password controller
const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res
        .status(400)
        .json({ message: "Token and password are required" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }

    const user = await User.findOne({ resetToken: token });
    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    user.resetToken = null;
    await user.save();

    res.json({ message: "Password reset successful" });
  } catch (error) {
    logger.error("Reset password error:", error);
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
