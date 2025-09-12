# TarkariShop Backend

A MERN stack backend for the TarkariShop application, providing authentication and user management for both buyers and sellers.

## Features

- **User Authentication**: Login and registration for buyers and sellers
- **JWT Token Management**: Secure authentication with JSON Web Tokens
- **Input Validation**: Comprehensive validation using express-validator
- **Password Hashing**: Secure password storage using bcryptjs
- **MongoDB Integration**: Data persistence with Mongoose ODM
- **Role-based Access**: Separate endpoints and validation for buyers and sellers

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (running locally or cloud instance)
- npm or yarn package manager

## Installation

1. Clone the repository and navigate to the backend directory:
```bash
cd tarkarishop_backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:
```env
MONGODB_URI=mongodb://localhost:27017/tarkarishop
JWT_SECRET=your_super_secret_jwt_key_here_change_in_production
PORT=5000
NODE_ENV=development
```

4. Start the development server:
```bash
npm run dev
```

## API Endpoints

### Authentication Routes

#### Buyer Registration
- **POST** `/api/auth/buyer/register`
- **Body**: 
```json
{
  "username": "string",
  "email": "string",
  "password": "string",
  "firstName": "string",
  "lastName": "string",
  "phone": "string",
  "address": "string",
  "city": "string"
}
```

#### Seller Registration
- **POST** `/api/auth/seller/register`
- **Body**:
```json
{
  "username": "string",
  "email": "string",
  "password": "string",
  "firstName": "string",
  "lastName": "string",
  "phone": "string",
  "farmName": "string",
  "farmLocation": "string",
  "city": "string"
}
```

#### Login (Both Buyers and Sellers)
- **POST** `/api/auth/login`
- **Body**:
```json
{
  "username": "string",
  "password": "string"
}
```

#### Get Profile (Protected)
- **GET** `/api/auth/profile`
- **Headers**: `Authorization: Bearer <token>`

#### Update Profile (Protected)
- **PUT** `/api/auth/profile`
- **Headers**: `Authorization: Bearer <token>`
- **Body**: Fields to update

#### Logout (Protected)
- **POST** `/api/auth/logout`
- **Headers**: `Authorization: Bearer <token>`

## Project Structure

```
tarkarishop_backend/
├── config/           # Configuration files
├── controllers/      # Route controllers
│   └── authController.js
├── middlewares/      # Custom middleware
│   ├── auth.js       # Authentication middleware
│   └── validation.js # Input validation
├── models/           # Database models
│   └── User.js       # User model
├── routes/           # API routes
│   └── auth.js       # Authentication routes
├── utils/            # Utility functions
├── .env              # Environment variables
├── index.js          # Main server file
├── package.json      # Dependencies
└── README.md         # This file
```

## Database Schema

### User Model
- `username`: Unique username (3-30 characters)
- `email`: Unique email address
- `password`: Hashed password (min 6 characters)
- `firstName`: First name (2-50 characters)
- `lastName`: Last name (2-50 characters)
- `phone`: Phone number
- `userType`: Either 'buyer' or 'seller'
- `address`: Delivery address (buyers only)
- `farmName`: Farm name (sellers only)
- `farmLocation`: Farm location (sellers only)
- `city`: City name
- `isActive`: Account status
- `avatar`: Profile picture URL
- `createdAt`: Account creation timestamp
- `lastLogin`: Last login timestamp

## Security Features

- **Password Hashing**: Passwords are hashed using bcryptjs
- **JWT Tokens**: Secure authentication with configurable expiration
- **Input Validation**: Comprehensive validation for all inputs
- **CORS**: Cross-origin resource sharing configuration
- **Environment Variables**: Sensitive data stored in .env file

## Development

### Running in Development Mode
```bash
npm run dev
```

### Running in Production Mode
```bash
npm start
```

### Environment Variables

- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT token signing
- `PORT`: Server port (default: 5000)
- `NODE_ENV`: Environment (development/production)

## Testing

The backend is ready for testing with tools like:
- Postman
- Insomnia
- curl commands
- Frontend integration

## Deployment

1. Set `NODE_ENV=production` in your production environment
2. Use a strong, unique `JWT_SECRET`
3. Ensure MongoDB is accessible from your production server
4. Use a process manager like PM2 for production deployment

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the ISC License.
