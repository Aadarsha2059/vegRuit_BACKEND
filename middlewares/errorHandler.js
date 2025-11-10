// Global error handler middleware
const errorHandler = (err, req, res, next) => {
  console.error('[ERROR HANDLER]', err);

  // Default error
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors)[0].message;
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyPattern)[0];
    message = `${field} already exists`;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  // Always return consistent structure
  res.status(statusCode).json({
    success: false,
    message: message,
    field: err.field || 'error',
    data: {
      user: null,
      token: null,
      userType: null
    },
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

// 404 handler
const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    field: 'route',
    data: {
      user: null,
      token: null,
      userType: null
    }
  });
};

module.exports = {
  errorHandler,
  notFoundHandler
};
