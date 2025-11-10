# Quick Start Guide

Get TarkariShop Backend up and running in 5 minutes!

## Prerequisites

- Node.js installed (v14+)
- MongoDB installed and running

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Setup Configuration

```bash
npm run setup
```

This creates:
- `.env` file with default configuration
- `public/uploads` directory for file uploads

## Step 3: Seed the Database

```bash
npm run seed
```

This creates:
- Sample buyer account: `buyer@example.com` / `password123`
- Sample seller account: `seller@example.com` / `password123`
- 4 categories
- 8 sample products

## Step 4: Start the Server

```bash
npm run dev
```

Server will start on: http://localhost:5001

## Step 5: Verify Everything Works

```bash
npm test
```

You should see:
```
Test Suites: 4 passed, 4 total
Tests:       25 passed, 25 total
```

## You're Ready! 🎉

### Test the API

**Login as Buyer:**
```bash
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "buyer@example.com",
    "password": "password123"
  }'
```

**Get Products:**
```bash
curl http://localhost:5001/api/products
```

**Get Featured Products:**
```bash
curl http://localhost:5001/api/products/featured
```

### Sample Credentials

**Buyer Account:**
- Email: `buyer@example.com`
- Password: `password123`
- Use for: Shopping, cart, orders

**Seller Account:**
- Email: `seller@example.com`
- Password: `password123`
- Use for: Product management, order fulfillment

## Next Steps

- Read [README.md](README.md) for detailed documentation
- Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md) if you encounter issues
- Explore the API endpoints in the README

## Common Commands

```bash
# Start development server
npm run dev

# Start production server
npm start

# Run tests
npm test

# Seed database
npm run seed

# Setup configuration
npm run setup
```

## Need Help?

- Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for common issues
- Review error messages in the console
- Make sure MongoDB is running
- Verify `.env` file exists and is configured correctly

Happy coding! 🚀
