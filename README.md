# TarkariShop Backend API

Backend API for TarkariShop - A fresh produce e-commerce platform connecting farmers with buyers.

## Features

- User authentication (Buyers & Sellers)
- Product management
- Category management
- Shopping cart
- Order management
- Reviews and ratings
- JWT-based authentication

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or Atlas)
- npm or yarn

## Installation

1. Clone the repository
```bash
cd tarkarishop_backend
```

2. Install dependencies
```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:
```env
PORT=5001
MONGODB_URI=mongodb://localhost:27017/tarkarishop
JWT_SECRET=your_jwt_secret_key_here_make_it_long_and_secure
NODE_ENV=development
```

## Database Setup

### Seed the Database

To populate the database with sample data (users, categories, and products):

```bash
npm run seed
```

This will create:
- **Sample Buyer**: 
  - Email: `buyer@example.com`
  - Password: `password123`
  
- **Sample Seller**: 
  - Email: `seller@example.com`
  - Password: `password123`

- **4 Categories**: Vegetables, Fruits, Leafy Greens, Root Vegetables
- **8 Sample Products**: Tomatoes, Spinach, Apples, Carrots, etc.

## Running the Application

### Development Mode (with auto-reload)
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will start on `http://localhost:5001`

## Testing

Run all tests:
```bash
npm test
```

The test suite includes:
- Authentication tests (8 tests)
- Product tests (7 tests)
- Cart tests (6 tests)
- Order tests (4 tests)

**Total: 25 tests** ✅

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user (buyer/seller)
- `POST /api/auth/buyer/register` - Register buyer
- `POST /api/auth/seller/register` - Register seller
- `POST /api/auth/login` - Login
- `GET /api/auth/profile` - Get user profile (protected)
- `PUT /api/auth/profile` - Update profile (protected)

### Products
- `GET /api/products` - Get all products (public)
- `GET /api/products/public` - Get all products (backward compatibility)
- `GET /api/products/featured` - Get featured products
- `GET /api/products/:id` - Get single product
- `POST /api/products` - Create product (seller only)
- `PUT /api/products/:id` - Update product (seller only)
- `DELETE /api/products/:id` - Delete product (seller only)

### Categories
- `GET /api/categories` - Get all categories
- `POST /api/categories` - Create category (seller only)
- `PUT /api/categories/:id` - Update category (seller only)
- `DELETE /api/categories/:id` - Delete category (seller only)

### Cart
- `GET /api/cart` - Get user cart
- `POST /api/cart/add` - Add item to cart
- `PUT /api/cart/item/:productId` - Update cart item quantity
- `DELETE /api/cart/item/:productId` - Remove item from cart
- `DELETE /api/cart/clear` - Clear entire cart

### Orders
- `POST /api/orders` - Create order from cart
- `GET /api/orders/buyer` - Get buyer orders
- `GET /api/orders/seller` - Get seller orders
- `GET /api/orders/:id` - Get single order
- `PUT /api/orders/:id/status` - Update order status (seller)
- `PUT /api/orders/:id/cancel` - Cancel order

## Project Structure

```
tarkarishop_backend/
├── controllers/        # Request handlers
├── models/            # Mongoose models
├── routes/            # API routes
├── middlewares/       # Custom middleware (auth, validation, upload)
├── scripts/           # Utility scripts (seed.js)
├── backend_test/      # Test files
├── public/            # Static files (uploads)
├── index.js           # Application entry point
└── package.json       # Dependencies and scripts
```

## Error Handling

All API responses follow a consistent format:

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    "user": {...},
    "token": "jwt_token_here",
    "userType": ["buyer"]
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "field": "field_name",
  "data": {
    "user": null,
    "token": null,
    "userType": null
  }
}
```

## Common Issues & Solutions

### Issue: Login returns 401 error
**Solution**: Make sure you've run `npm run seed` to create sample users, or register a new user first.

### Issue: Products endpoint returns 500 error
**Solution**: Run `npm run seed` to populate the database with sample products and categories.

### Issue: MongoDB connection error
**Solution**: 
1. Make sure MongoDB is running locally, or
2. Update `MONGODB_URI` in `.env` to point to your MongoDB Atlas cluster

### Issue: Tests failing
**Solution**: 
1. Make sure MongoDB is running
2. Tests use an in-memory MongoDB, so no setup needed
3. Run `npm test` again

## Restarting the Project

When restarting the project after a break:

1. **Start MongoDB** (if using local MongoDB)
   ```bash
   # Windows
   net start MongoDB
   
   # Mac/Linux
   sudo systemctl start mongod
   ```

2. **Seed the database** (if database is empty)
   ```bash
   npm run seed
   ```

3. **Start the server**
   ```bash
   npm run dev
   ```

4. **Verify everything works**
   ```bash
   npm test
   ```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 5001 |
| MONGODB_URI | MongoDB connection string | mongodb://localhost:27017/tarkarishop |
| JWT_SECRET | Secret key for JWT tokens | (required) |
| NODE_ENV | Environment mode | development |

## Contributing

1. Create a new branch for your feature
2. Make your changes
3. Run tests: `npm test`
4. Commit your changes
5. Push to the branch
6. Create a Pull Request

## License

ISC

## Support

For issues or questions, please create an issue in the repository.
