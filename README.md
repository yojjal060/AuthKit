# AuthKit - Complete Multi-Tenant Authentication API

A production-ready Node.js authentication API with Express, MongoDB, JWT, email verification, password reset, multi-tenant support, and comprehensive security features.

## 🚀 Features

- 🔐 **User Authentication** - Register, login, logout with JWT
- 🏢 **Multi-Tenant Support** - Isolate users by application/tenant
- 📧 **Email Verification** - Beautiful responsive email templates
- 🔑 **Password Reset** - Secure token-based password reset
- 👤 **User Profile Management** - Update user profiles and avatars
- 🛡️ **Enterprise Security** - Rate limiting, CORS, helmet, input validation
- 🚀 **Role-Based Access Control** - Admin and user roles
- 📝 **Winston Logging** - Comprehensive logging with file rotation
- ✅ **Testing Suite** - Jest tests with Supertest
- 📊 **Health Monitoring** - API health check endpoints

## 🏢 Multi-Tenant Architecture

AuthKit supports multiple applications with completely isolated user bases:

- **Same email** can exist in different tenants without conflicts
- **Separate user databases** per tenant while sharing the same API
- **Tenant-specific** authentication and authorization
- **Isolated data** - users from one app cannot access another app's data

### Usage Example:
```javascript
// App A: Chat Application
fetch('/api/auth/register', {
  headers: { 'X-Tenant-ID': 'johns-chat-app' },
  // ... user: alice@example.com
});

// App B: E-commerce (Different app, same email allowed)
fetch('/api/auth/register', {
  headers: { 'X-Tenant-ID': 'marys-shop' },
  // ... user: alice@example.com (separate from App A)
});
```

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (JSON Web Tokens)
- **Email**: Nodemailer (SMTP configurable)
- **Validation**: Joi schema validation
- **Security**: Helmet, express-rate-limit, CORS
- **Logging**: Winston with file rotation
- **Testing**: Jest, Supertest

## ⚡ Quick Start

### Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or cloud)
- SMTP email service (Gmail, SendGrid, etc.)

### Installation

```bash
# Clone the repository
git clone https://github.com/yojjal060/AuthKit.git
cd AuthKit

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
```

### Environment Setup

Update `.env` with your configuration:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/AuthKit
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=1d
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=your_email@gmail.com
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
LOG_LEVEL=info
CLIENT_URL=http://localhost:5000
```

### Running the Application

```bash
# Development mode
npm run dev

# Production mode
npm start

# Run tests
npm test
```

## 📡 API Endpoints

### 🔓 Public Endpoints

| Method | Endpoint | Description | Headers Required |
|--------|----------|-------------|------------------|
| `GET` | `/` | API documentation homepage | None |
| `GET` | `/api/auth/health` | Health check | `X-Tenant-ID` (optional) |
| `GET` | `/api/auth/verify-email?token=` | Email verification | None |
| `GET` | `/api/auth/reset-form?token=` | Password reset form | None |

### 🔐 Authentication Endpoints

| Method | Endpoint | Description | Headers | Body |
|--------|----------|-------------|---------|------|
| `POST` | `/api/auth/register` | Register new user | `X-Tenant-ID`<br>`Content-Type` | `{name, email, password}` |
| `POST` | `/api/auth/login` | Login user | `X-Tenant-ID`<br>`Content-Type` | `{email, password}` |
| `POST` | `/api/auth/logout` | Logout user | `X-Tenant-ID` | None |

### 🔑 Password Management

| Method | Endpoint | Description | Headers | Body |
|--------|----------|-------------|---------|------|
| `POST` | `/api/auth/forgot-password` | Request password reset | `X-Tenant-ID`<br>`Content-Type` | `{email}` |
| `POST` | `/api/auth/reset-password` | Reset password | `X-Tenant-ID`<br>`Content-Type` | `{token, password}` |

### 📧 Email Management

| Method | Endpoint | Description | Headers | Body |
|--------|----------|-------------|---------|------|
| `POST` | `/api/auth/resend-verification` | Resend verification email | `X-Tenant-ID`<br>`Content-Type` | `{email}` |

### 🛡️ Protected Endpoints

| Method | Endpoint | Description | Headers | Body |
|--------|----------|-------------|---------|------|
| `GET` | `/api/auth/me` | Get current user | `Authorization: Bearer <token>`<br>`X-Tenant-ID` | None |
| `PUT` | `/api/auth/me` | Update user profile | `Authorization: Bearer <token>`<br>`X-Tenant-ID`<br>`Content-Type` | `{name, avatarURL}` |

### 👑 Admin Endpoints

| Method | Endpoint | Description | Headers | Body |
|--------|----------|-------------|---------|------|
| `GET` | `/api/auth/admin` | Admin panel access | `Authorization: Bearer <token>`<br>`X-Tenant-ID` | None |

## 💻 Usage Examples

### Multi-Tenant Registration

```javascript
// Register user for Chat App
const response = await fetch('http://localhost:5000/api/auth/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Tenant-ID': 'johns-chat-app'
  },
  body: JSON.stringify({
    name: 'Alice Johnson',
    email: 'alice@example.com',
    password: 'securepass123'
  })
});
```

### Multi-Tenant Login

```javascript
// Login to specific tenant
const response = await fetch('http://localhost:5000/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Tenant-ID': 'johns-chat-app'
  },
  body: JSON.stringify({
    email: 'alice@example.com',
    password: 'securepass123'
  })
});

const { token, user } = await response.json();
```

### Access Protected Routes

```javascript
const response = await fetch('http://localhost:5000/api/auth/me', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'X-Tenant-ID': 'johns-chat-app'
  }
});
```

### Update Profile

```javascript
const response = await fetch('http://localhost:5000/api/auth/me', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'X-Tenant-ID': 'johns-chat-app'
  },
  body: JSON.stringify({
    name: 'Alice Smith',
    avatarURL: 'https://example.com/avatar.jpg'
  })
});
```

### Password Reset Flow

```javascript
// Step 1: Request password reset
await fetch('http://localhost:5000/api/auth/forgot-password', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Tenant-ID': 'johns-chat-app'
  },
  body: JSON.stringify({
    email: 'alice@example.com'
  })
});

// Step 2: User receives email and clicks reset link
// Step 3: User submits new password (handled by reset form)
```

## 🛡️ Security Features

- **Multi-Tenant Isolation**: Complete data separation between tenants
- **Rate Limiting**: Prevents brute force attacks (50 auth requests/15min)
- **Input Validation**: Joi schema validation on all inputs
- **CORS Protection**: Configurable allowed origins
- **Security Headers**: Helmet middleware for security headers
- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt with salt rounds
- **Email Verification**: Prevents fake account creation
- **Token Expiration**: Configurable JWT and reset token expiration

## 🧪 Testing

Run the comprehensive test suite:

```bash
npm test
```

Test coverage includes:
- Multi-tenant user registration
- Authentication and authorization
- Email verification flow
- Password reset functionality
- Protected route access
- Error handling scenarios
- Health check endpoints

## 🚀 Deployment

### Environment Variables for Production

```env
NODE_ENV=production
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/authkit
JWT_SECRET=your_super_secure_jwt_secret_key
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your_sendgrid_api_key
SMTP_FROM=noreply@yourdomain.com
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
CLIENT_URL=https://authkit-api.yourdomain.com
```

### Recommended Production Services

- **Database**: MongoDB Atlas
- **Email**: SendGrid, Mailgun, or AWS SES
- **Hosting**: Railway, Render, Heroku, or AWS
- **Monitoring**: LogDNA, DataDog, or New Relic
- **SSL**: Cloudflare or Let's Encrypt

## 📁 File Structure

```
AuthKit/
├── config/
│   └── db.config.js          # Database configuration
├── controllers/
│   └── auth.controller.js     # Authentication logic
├── middlewares/
│   ├── auth.middleware.js     # JWT authentication
│   ├── tenant.middleware.js   # Multi-tenant support
│   ├── errorHandler.middleware.js  # Error handling
│   └── role.middleware.js     # Role-based access
├── models/
│   └── user.model.js          # User data model with tenant support
├── public/
│   ├── index.html            # API documentation homepage
│   ├── reset-password.html   # Password reset form
│   ├── css/styles.css        # Styling
│   └── js/reset-form.js      # Reset form logic
├── routes/
│   └── auth.route.js          # API routes
├── test/
│   └── auth.test.js           # Test suite
├── utils/
│   ├── generateToken.util.js  # JWT token utility
│   ├── logger.util.js         # Winston logging
│   └── sendEmail.util.js      # Email utility
├── logs/                      # Log files (auto-generated)
├── .env.example              # Environment template
├── .github/workflows/        # GitHub Actions
└── server.js                 # Application entry point
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Create a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Support

If you find this project helpful, please give it a ⭐ on GitHub!

For questions or support, please open an issue on GitHub.

---

**AuthKit** - Complete Multi-Tenant Authentication API for Modern Applications 🚀