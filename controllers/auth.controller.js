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

// Helper function to generate reset URLs properly (fixes the double token issue)
const generateResetUrl = (req, token) => {
  const isLocalhost = req.get('host').includes('localhost') || req.get('host').includes('127.0.0.1');
  
  if (isLocalhost) {
    return `${req.protocol}://${req.get('host')}/api/auth/reset-form?token=${token}`;
  } else {
    return `${process.env.CLIENT_URL || req.protocol + '://' + req.get('host')}/api/auth/reset-form?token=${token}`;
  }
};

// Email template generator matching your root page design
const generateEmailTemplate = (title, content, tenantId) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
          margin: 0; 
          padding: 0; 
          background: #f8fafc;
          min-height: 100vh; 
          color: #334155;
          line-height: 1.6;
        }
        .container { 
          max-width: 600px; 
          margin: 0 auto; 
          padding: 40px 20px; 
        }
        .header { 
          text-align: center; 
          margin-bottom: 40px;
          background: white;
          padding: 40px;
          border-radius: 20px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          border: 1px solid #e2e8f0;
        }
        .header h1 { 
          font-size: 2.5rem; 
          margin-bottom: 10px;
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          font-weight: 700;
        }
        .header p { 
          color: #64748b; 
          margin: 0;
          font-size: 1.1rem;
        }
        .content { 
          background: white;
          padding: 40px; 
          border-radius: 20px; 
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          border: 1px solid #e2e8f0;
          margin-bottom: 20px;
        }
        .content p {
          color: #64748b;
          margin-bottom: 20px;
          font-size: 16px;
        }
        .content strong {
          color: #1e293b;
        }
        .button { 
          display: inline-block;
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          color: white !important;
          padding: 16px 32px;
          text-decoration: none;
          border-radius: 12px;
          font-weight: 600;
          font-size: 16px;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
          transition: all 0.2s ease;
        }
        .button:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
        }
        .link-box {
          background: #f1f5f9;
          padding: 20px;
          border-radius: 12px;
          word-break: break-all;
          font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
          font-size: 14px;
          border: 1px solid #e2e8f0;
          margin: 20px 0;
          color: #334155;
        }
        .footer { 
          text-align: center; 
          margin-top: 30px;
          padding: 30px;
          background: white;
          border-radius: 20px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          border: 1px solid #e2e8f0;
          color: #64748b;
          font-size: 14px;
        }
        .tenant-badge {
          display: inline-block;
          background: #f1f5f9;
          color: #475569;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          border: 1px solid #e2e8f0;
          margin-bottom: 15px;
        }
        .warning-text {
          color: #94a3b8;
          font-size: 14px;
          font-style: italic;
        }
        @media (max-width: 600px) {
          .container {
            padding: 20px 10px;
          }
          .header, .content, .footer {
            padding: 20px;
          }
          .header h1 {
            font-size: 2rem;
          }
          .button {
            padding: 14px 24px;
            font-size: 15px;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 ${title}</h1>
          <p>AuthKit Authentication Service</p>
        </div>
        <div class="content">
          ${content}
        </div>
        <div class="footer">
          <div class="tenant-badge">App: ${tenantId}</div>
          <p>© 2025 AuthKit API - Production Ready Authentication Service</p>
          <p style="margin-top: 15px; font-size: 12px; color: #94a3b8;">
            This email was sent automatically. Please do not reply to this email.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
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
    const tokenExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

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

    // Send verification email with new template
    try {
      const verificationUrl = generateVerificationUrl(req, verificationToken);
      
      const emailContent = `
        <p>Hello <strong>${name}</strong>!</p>
        <p>Thank you for registering with AuthKit. To complete your registration and secure your account, please verify your email address by clicking the button below:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" class="button">
            ✅ Verify My Email Address
          </a>
        </div>
        
        <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
        <div class="link-box">
          ${verificationUrl}
        </div>
        
        <p class="warning-text">
          ⏰ <strong>Important:</strong> This verification link will expire in 24 hours for security reasons.<br>
          🔒 If you didn't create this account, please ignore this email and your email address will not be used.
        </p>
        
        <p style="margin-top: 25px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
          <strong>What happens after verification?</strong><br>
          • You'll be able to sign in to your account<br>
          • Your account will be fully activated<br>
          • You'll receive important updates about your account
        </p>
      `;
      
      await sendEmail({
        to: email,
        subject: `Welcome to AuthKit! Please verify your email`,
        html: generateEmailTemplate("Welcome to AuthKit!", emailContent, tenantId)
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
        <!DOCTYPE html>
        <html>
        <head>
          <title>Email Verification Failed</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
              margin: 0; padding: 0; background: #f8fafc; min-height: 100vh; 
              display: flex; align-items: center; justify-content: center;
            }
            .container { 
              max-width: 500px; background: white; padding: 40px; 
              border-radius: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); 
              text-align: center; border: 1px solid #e2e8f0;
            }
            h2 { color: #ef4444; font-size: 1.5rem; margin-bottom: 20px; }
            p { color: #64748b; margin-bottom: 25px; }
            .button { 
              background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); 
              color: white; padding: 12px 24px; text-decoration: none; 
              border-radius: 8px; font-weight: 600;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>❌ Email Verification Failed</h2>
            <p>Verification token is required. Please use the link from your email.</p>
            <a href="/" class="button">Go to Homepage</a>
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
        <!DOCTYPE html>
        <html>
        <head>
          <title>Email Verification Failed</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
              margin: 0; padding: 0; background: #f8fafc; min-height: 100vh; 
              display: flex; align-items: center; justify-content: center;
            }
            .container { 
              max-width: 600px; background: white; padding: 40px; 
              border-radius: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); 
              text-align: center; border: 1px solid #e2e8f0;
            }
            h2 { color: #ef4444; font-size: 1.5rem; margin-bottom: 20px; }
            p { color: #64748b; margin-bottom: 20px; }
            .button { 
              background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); 
              color: white; padding: 12px 24px; text-decoration: none; 
              border-radius: 8px; font-weight: 600; margin: 5px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>❌ Email Verification Failed</h2>
            <p>${expiredUser ? 'Your verification link has expired.' : 'Invalid verification link.'}</p>
            <p>Please request a new verification email or contact support if you need assistance.</p>
            <a href="/" class="button">Go to Homepage</a>
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
      <!DOCTYPE html>
      <html>
      <head>
        <title>Email Verified Successfully</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
            margin: 0; padding: 0; background: #f8fafc; min-height: 100vh; 
            display: flex; align-items: center; justify-content: center;
          }
          .container { 
            max-width: 500px; background: white; padding: 40px; 
            border-radius: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); 
            text-align: center; border: 1px solid #e2e8f0;
          }
          h2 { color: #10b981; font-size: 1.5rem; margin-bottom: 20px; }
          p { color: #64748b; margin-bottom: 15px; }
          .button { 
            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); 
            color: white; padding: 12px 24px; text-decoration: none; 
            border-radius: 8px; font-weight: 600; margin-top: 20px; display: inline-block;
          }
          .success-badge {
            background: #f0fdf4; color: #166534; padding: 8px 16px;
            border-radius: 8px; font-size: 14px; margin: 10px 0;
            border: 1px solid #bbf7d0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>✅ Email Verified Successfully!</h2>
          <p>Congratulations! Your email has been verified and your account is now fully activated.</p>
          <div class="success-badge">
            <strong>User:</strong> ${user.name}<br>
            <strong>Email:</strong> ${user.email}<br>
            <strong>App:</strong> ${user.tenantId}
          </div>
          <p>You can now sign in to your account and start using all features.</p>
          <a href="/" class="button">Go to API Documentation</a>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    logger.error("Email verification error:", error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Server Error</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
            margin: 0; padding: 0; background: #f8fafc; min-height: 100vh; 
            display: flex; align-items: center; justify-content: center;
          }
          .container { 
            max-width: 500px; background: white; padding: 40px; 
            border-radius: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); 
            text-align: center; border: 1px solid #e2e8f0;
          }
          h2 { color: #ef4444; font-size: 1.5rem; margin-bottom: 20px; }
          p { color: #64748b; margin-bottom: 25px; }
          .button { 
            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); 
            color: white; padding: 12px 24px; text-decoration: none; 
            border-radius: 8px; font-weight: 600;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>❌ Server Error</h2>
          <p>Something went wrong while verifying your email. Please try again later or contact support.</p>
          <a href="/" class="button">Go to Homepage</a>
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
    const tokenExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    
    user.resetToken = resetToken;
    user.tokenExpires = tokenExpires;
    await user.save();

    try {
      const resetUrl = generateResetUrl(req, resetToken);
      
      const emailContent = `
        <p>Hello <strong>${user.name}</strong>!</p>
        <p>We received a request to reset the password for your account. If you made this request, click the button below to securely reset your password:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" class="button">
            🔐 Reset My Password
          </a>
        </div>
        
        <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
        <div class="link-box">
          ${resetUrl}
        </div>
        
        <p class="warning-text">
          ⏰ <strong>Important:</strong> This password reset link will expire in 15 minutes for security reasons.<br>
          🛡️ If you didn't request this password reset, please ignore this email. Your account remains secure.
        </p>
        
        <p style="margin-top: 25px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
          <strong>Security Tips:</strong><br>
          • Never share your password with anyone<br>
          • Use a strong, unique password<br>
          • Enable two-factor authentication when available
        </p>
      `;
      
      await sendEmail({
        to: email,
        subject: `Reset your password - ${tenantId === 'default' ? 'AuthKit' : tenantId}`,
        html: generateEmailTemplate("Password Reset Request", emailContent, tenantId)
      });
      
      logger.info(`Password reset email sent to ${email} for tenant ${tenantId}`);
    } catch (emailError) {
      logger.error("Password reset email failed:", emailError);
      return res.status(500).json({ message: "Could not send reset email" });
    }

    res.json({ 
      message: "Password reset email sent successfully! Check your email for the reset link.",
      note: "The reset link will expire in 15 minutes"
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