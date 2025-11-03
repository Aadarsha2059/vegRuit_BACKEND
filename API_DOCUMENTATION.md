# TarkariShop API Documentation

## Base URL
```
http://localhost:50011/api
```

## Authentication
Most endpoints require JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

## Sample Login Credentials
- **Seller 1**: ram@example.com / password123
- **Seller 2**: sita@example.com / password123  
- **Buyer**: john@example.com / password123

## API Endpoints

### Authentication

#### POST /auth/login
Login user (buyer or seller)
```json
{
  "username": "john@example.com",
  "password": "password123"
}
```

#### POST /auth/register
Register new user
```json
{
  "username": "newuser",
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "9841234567",
  "city": "Kathmandu",
  "userType": ["buyer"],
  "isBuyer": true,
  "address": "Thamel, Kathmandu"
}
```

### Categories

#### GET /categories/public
Get all public categories (no auth required)

#### GET /categories
Get seller's categories (auth required)

#### POST /categories
Create new category (seller auth required)
```json
{
  "name": "Vegetables",
  "description": "Fresh vegetables",
  "icon": "🥬",
  "color": "#10B981"
}
```

### Products

#### GET /products/public
Get all public products (no auth required)
Query parameters:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 12)
- `category`: Filter by category ID
- `search`: Search term
- `minPrice`: Minimum price
- `maxPrice`: Maximum price
- `organic`: true/false
- `featured`: true/false
- `sortBy`: Field to sort by (default: createdAt)
- `sortOrder`: asc/desc (default: desc)

#### GET /products/featured
Get featured products (no auth required)

#### GET /products/:id
Get single product details (no auth required)

#### GET /products/seller/all
Get seller's products (seller auth required)

#### POST /products
Create new product (seller auth required)
```json
{
  "name": "Fresh Spinach",
  "description": "Organic spinach leaves",
  "price": 80,
  "unit": "kg",
  "stock": 50,
  "category": "category_id",
  "organic": true,
  "tags": ["organic", "leafy"]
}
```

### Cart

#### GET /cart
Get user's cart (buyer auth required)

#### POST /cart/add
Add item to cart (buyer auth required)
```json
{
  "productId": "product_id",
  "quantity": 2
}
```

#### PUT /cart/item/:productId
Update cart item quantity (buyer auth required)
```json
{
  "quantity": 3
}
```

#### DELETE /cart/item/:productId
Remove item from cart (buyer auth required)

#### DELETE /cart/clear
Clear entire cart (buyer auth required)

#### GET /cart/count
Get cart item count (buyer auth required)

### Orders

#### POST /orders
Create order from cart (buyer auth required)
```json
{
  "deliveryAddress": {
    "street": "Thamel Street, Ward 26",
    "city": "Kathmandu",
    "state": "Bagmati",
    "postalCode": "44600",
    "country": "Nepal",
    "landmark": "Near Garden of Dreams",
    "instructions": "Call before delivery"
  },
  "deliveryTimeSlot": "morning",
  "deliveryInstructions": "Handle with care",
  "paymentMethod": "cod",
  "notes": "First order"
}
```

#### GET /orders/buyer
Get buyer's orders (buyer auth required)
Query parameters:
- `page`: Page number
- `limit`: Items per page
- `status`: Filter by status

#### GET /orders/seller
Get seller's orders (seller auth required)
Query parameters:
- `page`: Page number
- `limit`: Items per page
- `status`: Filter by status

#### GET /orders/:id
Get single order details (auth required)

#### PUT /orders/:id/accept
Accept order (seller auth required)

#### PUT /orders/:id/reject
Reject order (seller auth required)
```json
{
  "reason": "Out of stock"
}
```

#### PUT /orders/:id/status
Update order status (seller auth required)
```json
{
  "status": "processing",
  "reason": "Optional reason"
}
```

#### PUT /orders/:id/cancel
Cancel order (buyer auth required)
```json
{
  "reason": "Changed mind"
}
```

#### GET /orders/stats
Get order statistics (auth required)

## Order Status Flow
1. **pending** - Order placed, waiting for seller approval
2. **approved** - Seller accepted the order
3. **rejected** - Seller rejected the order
4. **confirmed** - Order confirmed and being prepared
5. **processing** - Order is being processed
6. **shipped** - Order has been shipped
7. **delivered** - Order delivered successfully
8. **cancelled** - Order cancelled by buyer
9. **refunded** - Order refunded

## Payment Methods
- `cod` - Cash on Delivery
- `khalti` - Khalti Digital Wallet
- `esewa` - eSewa Digital Wallet
- `bank_transfer` - Bank Transfer

## Response Format
All API responses follow this format:
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    // Response data
  }
}
```

Error responses:
```json
{
  "success": false,
  "message": "Error message",
  "field": "field_name",
  "errors": [
    // Validation errors if any
  ]
}
```

## File Uploads
- Category images: `/uploads/categories/`
- Product images: `/uploads/products/`

## Database Collections
- **users** - User accounts (buyers and sellers)
- **categories** - Product categories
- **products** - Product listings
- **carts** - Shopping carts
- **orders** - Order records

## Testing
Run the test script to verify all endpoints:
```bash
node testAPI.js
```

This will test the complete flow:
1. Get public categories and products
2. Login as buyer
3. Add items to cart
4. Create order
5. Retrieve orders

## Sample Data
The database is seeded with:
- 3 users (2 sellers, 1 buyer)
- 4 categories (Leafy Vegetables, Root Vegetables, Fruits, Herbs & Spices)
- 10 products across all categories

All sample users use password: `password123`