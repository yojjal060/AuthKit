import express from 'express'
import authController from '../controllers/auth.controller.js'
import authMiddleware from '../middlewares/auth.middleware.js'
import sendEmail from '../utils/sendEmail.util.js'

const router = express.Router();

router.post('/register', authController.registerUser);
router.post('/login', authController.loginUser);


router.get('/me', authMiddleware, (req, res) => {
  res.json({
    message: 'You are authorized',
    user: req.user
  });
});

// @route   POST /api/auth/logout
// @desc    Placeholder for logout
// @access  Public (handled on client-side)
router.post('/logout', (req, res) => {
  return res.json({ message: "Logout successful on client. Token removed." });
});

router.post('/test-email', async (req, res) => {
  try {
    await sendEmail({
      to: req.body.to,
      subject: 'Live Email',
      text: 'This is a live email from AuthKit.',
      html: '<b>This is a live email from AuthKit.</b>',
    });
    res.json({ message: 'Email sent!' });
  } catch (error) {
    res.status(500).json({ message: 'Email failed', error: error.message });
  }
});

export default router;