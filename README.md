# AuthKit - Complete Authentication API

A production-ready Node.js authentication API with Express, MongoDB, JWT, email
verification, password reset, and comprehensive security features.

## Features

- 🔐 **User Authentication** - Register, login, logout
- 📧 **Email Verification** - Verify user emails during registration
- 🔑 **Password Reset** - Secure password reset via email
- 👤 **User Profile Management** - Update user profiles
- 🛡️ **Security Features** - Rate limiting, CORS, helmet, input validation
- 🚀 **Role-Based Access Control** - Admin and user roles
- 📝 **Logging** - Winston logging with file and console output
- ✅ **Comprehensive Testing** - Jest test suite with Supertest
- 📊 **Health Checks** - API health monitoring endpoints

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (JSON Web Tokens)
- **Email**: Nodemailer (configurable SMTP)
- **Validation**: Joi
- **Security**: Helmet, express-rate-limit, CORS
- **Logging**: Winston
- **Testing**: Jest, Supertest

## Quick Start

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
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_email@example.com
SMTP_PASS=your_email_password
SMTP_FROM=your_email@example.com
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
LOG_LEVEL=info
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

## API Endpoints

### Authentication

| Method | Endpoint             | Description         | Access  |
| ------ | -------------------- | ------------------- | ------- |
| POST   | `/api/auth/register` | Register new user   | Public  |
| POST   | `/api/auth/login`    | Login user          | Public  |
| POST   | `/api/auth/logout`   | Logout user         | Public  |
| GET    | `/api/auth/me`       | Get current user    | Private |
| PUT    | `/api/auth/me`       | Update user profile | Private |

### Email Verification

| Method | Endpoint                        | Description          | Access |
| ------ | ------------------------------- | -------------------- | ------ |
| GET    | `/api/auth/verify-email?token=` | Verify email address | Public |

### Password Reset

| Method | Endpoint                    | Description               | Access |
| ------ | --------------------------- | ------------------------- | ------ |
| POST   | `/api/auth/forgot-password` | Request password reset    | Public |
| POST   | `/api/auth/reset-password`  | Reset password with token | Public |

### Admin Routes

| Method | Endpoint          | Description     | Access     |
| ------ | ----------------- | --------------- | ---------- |
| GET    | `/api/auth/admin` | Admin dashboard | Admin Only |

### Health & Testing

| Method | Endpoint               | Description        | Access |
| ------ | ---------------------- | ------------------ | ------ |
| GET    | `/`                    | API status         | Public |
| GET    | `/api/auth/health`     | Health check       | Public |
| POST   | `/api/auth/test-email` | Test email sending | Public |

## Usage Examples

### Register a User

```javascript
const response = await fetch("http://localhost:5000/api/auth/register", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name: "John Doe",
    email: "john@example.com",
    password: "securepassword123",
  }),
});
```

### Login

```javascript
const response = await fetch("http://localhost:5000/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: "john@example.com",
    password: "securepassword123",
  }),
});

const { token } = await response.json();
```

### Access Protected Route

```javascript
const response = await fetch("http://localhost:5000/api/auth/me", {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});
```

### Update Profile

```javascript
const response = await fetch("http://localhost:5000/api/auth/me", {
  method: "PUT",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    name: "John Updated",
    avatarURL: "https://example.com/avatar.jpg",
  }),
});
```

## Security Features

- **Rate Limiting**: Prevents brute force attacks
- **Input Validation**: Joi schema validation
- **CORS Protection**: Configurable allowed origins
- **Helmet**: Security headers
- **JWT**: Secure token-based authentication
- **Password Hashing**: bcrypt with salt rounds
- **Email Verification**: Prevents fake accounts
- **Secure Password Reset**: Token-based reset flow

## Testing

Run the test suite:

```bash
npm test
```

The test suite includes:

- User registration tests
- Login authentication tests
- Protected route access tests
- Error handling tests
- Health check tests

## Deployment

### Environment Variables for Production

Ensure these are set in your production environment:

- `NODE_ENV=production`
- `MONGO_URI` - MongoDB connection string
- `JWT_SECRET` - Strong JWT secret key
- `SMTP_*` - Production email service credentials
- `ALLOWED_ORIGINS` - Your frontend domain(s)

### Recommended Production Services

- **Database**: MongoDB Atlas
- **Email**: SendGrid, Mailgun, or AWS SES
- **Hosting**: Railway, Render, Heroku, or AWS
- **Monitoring**: LogDNA, DataDog, or New Relic

## File Structure

```
AuthKit/
├── config/
│   └── db.config.js          # Database configuration
├── controllers/
│   └── auth.controller.js     # Authentication logic
├── middlewares/
│   ├── auth.middleware.js     # JWT authentication
│   ├── errorHandler.middleware.js  # Error handling
│   └── role.middleware.js     # Role-based access
├── models/
│   └── user.model.js          # User data model
├── routes/
│   └── auth.route.js          # API routes
├── test/
│   └── auth.test.js           # Test suite
├── utils/
│   ├── generateToken.util.js  # JWT token utility
│   ├── logger.util.js         # Logging utility
│   └── sendEmail.util.js      # Email utility
├── logs/                      # Log files
├── .env.example              # Environment template
└── server.js                 # Application entry point
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file
for details.

## Support

If you find this project helpful, please give it a ⭐ on GitHub!

For questions or support, please open an issue on GitHub.
