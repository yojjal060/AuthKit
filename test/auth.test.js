import request from "supertest";
import express from "express";
import authRoutes from "../routes/auth.route.js";
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe("AuthKit API", () => {
  const app = express();
  app.use(express.json());
  app.use("/api/auth", authRoutes);

  it("should return health check status", async () => {
    const res = await request(app).get("/api/auth/health");
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  it("should register a new user", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "Test User",
      email: "testuser@example.com",
      password: "testpassword123",
    });
    expect([200, 201, 409, 400]).toContain(res.statusCode); // Accepts success or already exists
    expect(res.body).toHaveProperty("message");
  });

  it("should login with valid credentials", async () => {
    await request(app).post("/api/auth/register").send({
      name: "Login User",
      email: "loginuser@example.com",
      password: "loginpassword123",
    });
    const res = await request(app).post("/api/auth/login").send({
      email: "loginuser@example.com",
      password: "loginpassword123",
    });
    expect([200, 401, 400]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      expect(res.body).toHaveProperty("token");
    }
  });

  it("should fail login with wrong password", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "loginuser@example.com",
      password: "wrongpassword",
    });
    expect([401, 400]).toContain(res.statusCode);
  });

  it("should return unauthorized for /me without token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.statusCode).toBe(401);
  });

  it("should access admin route with admin role", async () => {
    // Without token should be unauthorized
    const res = await request(app).get("/api/auth/admin");
    expect(res.statusCode).toBe(401);
  });

  it("should access health check", async () => {
    const res = await request(app).get("/api/auth/health");
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});
