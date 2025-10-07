# VegRuit Authentication System Guide

## 🚀 Quick Start

### 1. Environment Setup
Create a `.env` file in the backend root directory:

```env
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/tarkarishop

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_secure_12345
SECRET=your_super_secret_jwt_key_here_make_it_long_and_secure_12345

# Server Configuration
PORT=5000
NODE_ENV=development
```

### 2. Start the Backend Server
```bash
cd tarkarishop_backend
npm install
npm start
```

### 3. Start the Frontend
```bash
cd tarkarishop_frontend/tarkari_shop
npm install
npm run dev
```

## 🔐 Authentication Features

### ✅ What's Working

1. **Multi-Role Support**
   - Users can be buyers, sellers, or both
   - Role-based access control
   - Dynamic dashboard routing

2. **Secure Authentication**
   - JWT token-based authentication
   - Password hashing with bcrypt
   - Token expiration (7 days)

3. **User Registration**
   - Username and email validation
   - Duplicate account detection
   - Role-specific field requirements
   - Form validation with error messages

4. **User Login**
   - Login with username OR email
   - Secure password verification
   - Proper error handling for incorrect credentials
   - Account status checking

5. **Attractive UI**
   - Beautiful login/signup pages using provided assets
   - Icons in input fields
   - Responsive design
   - Smooth animations and transitions

## 📋 API Endpoints

### Authentication Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user (supports multiple roles) |
| POST | `/api/auth/buyer/register` | Register buyer only |
| POST | `/api/auth/seller/register` | Register seller only |
| POST | `/api/auth/login` | Login with username/email and password |
| GET | `/api/auth/profile` | Get user profile (requires token) |
| PUT | `/api/auth/profile` | Update user profile (requires token) |
| POST | `/api/auth/logout` | Logout (client-side token removal) |
| GET | `/api/auth/check-user` | Check if username/email exists |

### Request/Response Examples

#### Registration
```javascript
// POST /api/auth/register
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "1234567890",
  "city": "Kathmandu",
  "userType": ["buyer"],
  "isBuyer": true,
  "isSeller": false,
  "address": "123 Main St"
}

// Response
{
  "success": true,
  "message": "Buyer account created successfully! Welcome to VegRuit!",
  "user": { /* user object without password */ },
  "token": "jwt_token_here",
  "userType": ["buyer"]
}
```

#### Login
```javascript
// POST /api/auth/login
{
  "username": "john_doe", // or email
  "password": "password123"
}

// Response
{
  "success": true,
  "message": "Welcome back! Buyer login successful",
  "user": { /* user object without password */ },
  "token": "jwt_token_here",
  "userType": ["buyer"]
}
```

## 🎨 Frontend Components

### AttractiveAuth Component
- **Location**: `src/components/auth/AttractiveAuth.jsx`
- **Features**:
  - Beautiful background images from assets
  - Role selection (Buyer/Seller/Both)
  - Form validation with real-time error display
  - Icons in input fields
  - Responsive design
  - Smooth animations

### Key Features:
1. **Dynamic Background Images**
   - Uses provided login/signup images
   - Changes based on user type and form mode

2. **Role Selection**
   - Visual role cards with icons
   - Dynamic form fields based on selection
   - Clear role descriptions

3. **Form Validation**
   - Real-time validation
   - Specific error messages
   - Field-specific error highlighting

4. **User Experience**
   - Smooth transitions
   - Loading states
   - Success/error notifications
   - Accessible design

## 🔧 Error Handling

### Common Error Responses

#### Registration Errors
```javascript
// Username already exists
{
  "success": false,
  "message": "Username already exists",
  "field": "username",
  "suggestion": "This username is already registered. Please login instead."
}

// Email already exists
{
  "success": false,
  "message": "Email already exists",
  "field": "email",
  "suggestion": "This email is already registered. Please login instead."
}
```

#### Login Errors
```javascript
// Incorrect credentials
{
  "success": false,
  "message": "Incorrect username/email or password",
  "suggestion": "Please check your credentials and try again",
  "field": "username"
}

// Account deactivated
{
  "success": false,
  "message": "Account is deactivated. Please contact support.",
  "field": "account"
}
```

## 🧪 Testing

### Run Authentication Tests
```bash
cd tarkarishop_backend
node test-auth.js
```

### Manual Testing Steps
1. Open the application in browser
2. Click "Login" or "Sign Up" button
3. Test registration with different roles
4. Test login with username and email
5. Test error handling with incorrect credentials
6. Verify dashboard routing based on user type

## 🚨 Troubleshooting

### Common Issues

1. **500 Internal Server Error**
   - Check if MongoDB is running
   - Verify JWT_SECRET is set
   - Check server logs for detailed errors

2. **Authentication Failed**
   - Verify username/email exists
   - Check password is correct
   - Ensure account is active

3. **Token Issues**
   - Check token expiration
   - Verify JWT_SECRET consistency
   - Clear browser storage and retry

4. **CORS Errors**
   - Ensure frontend URL is in CORS configuration
   - Check if both servers are running

### Server Logs
Check the console for detailed error messages:
```bash
# Backend logs
cd tarkarishop_backend
npm start

# Frontend logs
cd tarkarishop_frontend/tarkari_shop
npm run dev
```

## 📱 Mobile Responsiveness

The authentication system is fully responsive:
- **Desktop**: Full-width layout with side-by-side image and form
- **Tablet**: Stacked layout with image on top
- **Mobile**: Optimized form layout with touch-friendly inputs

## 🔒 Security Features

1. **Password Security**
   - Minimum 6 characters
   - Bcrypt hashing with salt rounds
   - Password not returned in API responses

2. **Token Security**
   - JWT tokens with expiration
   - Secure secret key
   - Token validation middleware

3. **Input Validation**
   - Server-side validation
   - SQL injection prevention
   - XSS protection

4. **Account Security**
   - Account status checking
   - Last login tracking
   - Secure logout

## 🎯 Next Steps

1. **Email Verification** (Future Enhancement)
2. **Password Reset** (Future Enhancement)
3. **Two-Factor Authentication** (Future Enhancement)
4. **Social Login** (Future Enhancement)

## 📞 Support

If you encounter any issues:
1. Check the server logs
2. Verify environment configuration
3. Test with the provided test script
4. Check browser console for frontend errors

---

**VegRuit Authentication System** - Secure, Beautiful, and User-Friendly! 🌱
