import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import authRoutes from "./routes/auth.route.js";

dotenv.config();

const app = express();

// Add trust proxy for Render
app.set('trust proxy', 1);

// Modified Helmet configuration to allow inline scripts for reset form
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'", 
        "'unsafe-inline'", // Allow inline scripts
        "'unsafe-eval'"    // Allow eval (for fetch API)
      ],
      styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"], //  Allow API calls to same origin
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests, please try again later.",
});
app.use(limiter);

// Stricter rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Increased for testing
  message: "Too many authentication attempts, please try again later.",
});

//middleware
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [
  "http://localhost:3000",
];
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
app.use(express.json());

//Routes
app.get("/", (req, res) => {
  res.json({
    message: "AuthKit API is running",
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});
app.use("/api/auth", authLimiter, authRoutes);

import connectDB from "./config/db.config.js";
import errorHandler from "./middlewares/errorHandler.middleware.js";

// Error handler middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  connectDB();
  console.log(`Server running on port ${PORT}`);
});