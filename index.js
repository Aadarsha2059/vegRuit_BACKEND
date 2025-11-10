const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const path = require("path");

dotenv.config(); 

const app = express();

// Middleware
app.use(express.json());
app.use(cors({
  origin: [
    'http://localhost:5173', 
    'http://localhost:3000', 
    'http://localhost:5174', 
    'http://localhost:5175', 
    'http://localhost:5176',
    'http://localhost:5177',
    'http://localhost:5178',
    'http://localhost:5179'
  ],
  credentials: true
}));

// Serve static files from public directory
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Routes
const authRoutes = require('./routes/auth');
const categoryRoutes = require('./routes/category');
const productRoutes = require('./routes/products');
const cartRoutes = require('./routes/cart');
const orderRoutes = require('./routes/order');
const reviewRoutes = require('./routes/review');
const feedbackRoutes = require('./routes/feedback');
const favoriteRoutes = require('./routes/favorite');

app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/feedbacks', feedbackRoutes);
app.use('/api/favorites', favoriteRoutes);

// Simple route
app.get("/", (req, res) => {
  res.send("TarkariShop Backend is running 🚀");
});

// Import error handlers
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');

// 404 handler (must be before error handler)
app.use('*', notFoundHandler);

// Global error handling middleware (must be last)
app.use(errorHandler);

// Only start server if this file is run directly (not required by tests)
if (require.main === module) {
  // MongoDB connection (removed deprecated options)
  mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => console.log("✅ MongoDB Connected"))
    .catch((err) => console.error("❌ MongoDB connection error:", err));

  // Use port 5001 as default instead of 5000 to avoid conflicts
  const PORT = process.env.PORT || 5001;

  // Global error handlers
  process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
    console.log('🔄 Server will continue running...');
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    console.log('🔄 Server will continue running...');
  });

  // Start the server with robust error handling
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📋 API Documentation: http://localhost:${PORT}/api`);
    console.log(`🔗 Frontend should connect to: http://localhost:${PORT}`);
    console.log(`⏰ Started at: ${new Date().toLocaleString()}`);
    console.log(`🔄 Server will auto-restart on crashes`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} is already in use!`);
      console.error(`💡 Please stop any other process using port ${PORT} or change the PORT in .env file`);
      console.error(`🔧 Run: taskkill /f /im node.exe`);
      process.exit(1);
    } else {
      console.error("❌ Server error:", err);
      console.log("🔄 Attempting to restart...");
      setTimeout(() => {
        server.close(() => {
          app.listen(PORT, '0.0.0.0');
        });
      }, 1000);
    }
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, shutting down gracefully');
    server.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('🛑 SIGINT received, shutting down gracefully');
    server.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
    });
  });
}

// Export app for testing
module.exports = app;
