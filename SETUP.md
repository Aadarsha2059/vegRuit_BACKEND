# TarkariShop Backend Setup Guide

## Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or Atlas)
- npm or yarn

## Initial Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Create a `.env` file in the root directory with the following variables:

```env
# Server Configuration
PORT=5001
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/tarkarishop
# Or for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/tarkarishop

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Email Configuration (optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

### 3. Seed the Database
Run this command to populate the database with sample data:

```bash
npm run seed
```

This will create:
- Sample buyer account: `buyer@example.com` / `password123`
- Sample seller account: `seller@example.com` / `password123`
- Sample categories (Vegetables, Fruits, Leafy Greens, Root Vegetables)
- Sample products (Tomatoes, Spinach, Apples, Carrots, etc.)

### 4. Start the Server

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

The server will start on `http://localhost:5001`

### 5. Run Tests
```bash
npm test
```

All 25 tests should pass.

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user (buyer)
- `POST /api/auth/buyer/register` - Register buyer
- `POST /api/auth/seller/register` - Register seller
- `POST /api/auth/login` - Login
- `GET /api/auth/profile` - Get user profile (protected)
- `PUT /api/auth/profile` - Update profile (protected)

### Products
- `GET /api/products` - Get all products
- `GET /api/products/public` - Get all products (backward compatibility)
- `GET /api/products