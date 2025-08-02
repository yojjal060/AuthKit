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

// Password reset form route
router.get("/reset-form", (req, res) => {
  const { token } = req.query;
  
  if (!token) {
    return res.status(400).send(`
      <html>
        <head>
          <title>Invalid Reset Link - AuthKit</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 400px; margin: 50px auto; padding: 20px; background: #f9f9f9; }
            .container { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h2 { color: #dc3545; text-align: center; }
            p { color: #666; text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>❌ Invalid Reset Link</h2>
            <p>No token provided. Please check your email for the correct reset link.</p>
          </div>
        </body>
      </html>
    `);
  }

  // Clean HTML with improved button design
  const htmlResponse = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Reset Password - AuthKit</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        * { box-sizing: border-box; }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          margin: 0;
          padding: 20px;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .container {
          background: white;
          max-width: 400px;
          width: 100%;
          padding: 40px;
          border-radius: 15px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }
        h2 { 
          color: #333;
          text-align: center;
          margin-bottom: 30px;
          font-size: 24px;
        }
        .form-group { 
          margin-bottom: 20px;
        }
        label { 
          display: block;
          margin-bottom: 8px;
          font-weight: 600;
          color: #555;
        }
        input { 
          width: 100%;
          padding: 12px 15px;
          border: 2px solid #e1e5e9;
          border-radius: 8px;
          font-size: 16px;
          transition: border-color 0.3s;
        }
        input:focus {
          outline: none;
          border-color: #667eea;
        }
        button { 
          background: #007bff;
          color: white;
          padding: 15px 20px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          width: 100%;
          font-size: 16px;
          font-weight: 600;
          transition: background-color 0.3s;
        }
        button:hover { 
          background: #0056b3;
        }
        button:disabled {
          background: #6c757d;
          cursor: not-allowed;
        }
        .message { 
          padding: 15px;
          margin: 15px 0;
          border-radius: 8px;
          font-weight: 500;
        }
        .success { 
          background: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }
        .error { 
          background: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        }
        .loading {
          display: none;
          text-align: center;
          margin: 10px 0;
        }
        .spinner {
          border: 3px solid #f3f3f3;
          border-top: 3px solid #007bff;
          border-radius: 50%;
          width: 30px;
          height: 30px;
          animation: spin 1s linear infinite;
          margin: 0 auto;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          color: #666;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="container" data-token="${token}">
        <h2>🔐 Reset Your Password</h2>
        
        <form id="resetForm">
          <div class="form-group">
            <label>New Password:</label>
            <input type="password" id="password" required minlength="6" placeholder="Enter new password (min 6 chars)">
          </div>
          <div class="form-group">
            <label>Confirm Password:</label>
            <input type="password" id="confirmPassword" required minlength="6" placeholder="Confirm new password">
          </div>
          <button type="submit" id="submitBtn">Reset Password</button>
        </form>
        
        <div class="loading" id="loading">
          <div class="spinner"></div>
          <p>Resetting your password...</p>
        </div>
        
        <div id="message"></div>
        
        <div class="footer">
          <p>Powered by AuthKit API</p>
        </div>
      </div>

      <script>
        const container = document.querySelector('.container');
        const resetToken = container.getAttribute('data-token');
        
        if (!resetToken || resetToken === 'undefined' || resetToken === 'null') {
          document.getElementById('message').innerHTML = '<div class="message error">❌ No valid token found. Please use the link from your email.</div>';
          document.getElementById('resetForm').style.display = 'none';
        }
        
        document.getElementById('resetForm').addEventListener('submit', async function(e) {
          e.preventDefault();
          
          if (!resetToken || resetToken === 'undefined' || resetToken === 'null') {
            document.getElementById('message').innerHTML = '<div class="message error">❌ Invalid token. Please use the link from your email.</div>';
            return;
          }
          
          const password = document.getElementById('password').value;
          const confirmPassword = document.getElementById('confirmPassword').value;
          const messageDiv = document.getElementById('message');
          const submitBtn = document.getElementById('submitBtn');
          const loading = document.getElementById('loading');
          const form = document.getElementById('resetForm');
          
          messageDiv.innerHTML = '';
          
          if (password !== confirmPassword) {
            messageDiv.innerHTML = '<div class="message error">❌ Passwords do not match!</div>';
            return;
          }
          
          if (password.length < 6) {
            messageDiv.innerHTML = '<div class="message error">❌ Password must be at least 6 characters!</div>';
            return;
          }
          
          submitBtn.disabled = true;
          submitBtn.textContent = 'Resetting...';
          loading.style.display = 'block';
          
          try {
            const response = await fetch('/api/auth/reset-password', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              },
              body: JSON.stringify({
                token: resetToken,
                password: password
              })
            });
            
            const data = await response.json();
            
            if (response.ok) {
              messageDiv.innerHTML = '<div class="message success">✅ Password reset successful! You can now login with your new password.</div>';
              form.style.display = 'none';
            } else {
              messageDiv.innerHTML = '<div class="message error">❌ ' + (data.message || 'Password reset failed') + '</div>';
              submitBtn.disabled = false;
              submitBtn.textContent = 'Reset Password';
            }
          } catch (error) {
            messageDiv.innerHTML = '<div class="message error">❌ Network error. Please try again.</div>';
            submitBtn.disabled = false;
            submitBtn.textContent = 'Reset Password';
          }
          
          loading.style.display = 'none';
        });
      </script>
    </body>
    </html>
  `;

  res.send(htmlResponse);
});

router.get("/me", authMiddleware, (req, res) => {
  res.json({
    message: "You are authorized",
    user: req.user,
  });
});

router.put("/me", authMiddleware, authController.updateProfile);

router.post("/logout", (req, res) => {
  res.json({
    message: "Logout successful. Please remove your token on client side.",
  });
});

router.get("/health", (req, res) => {
  res.json({ status: "ok", message: "AuthKit API is healthy." });
});

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