const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Auth middleware
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access denied. No token provided.',
        data: {
          user: null,
          token: null,
          userType: null
        }
      });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({ 
        success: false, 
        message: 'Server configuration error.',
        data: {
          user: null,
          token: null,
          userType: null
        }
      });
    }
    const decoded = jwt.verify(token, secret);
    const user = await User.findById(decoded.userId);
    
    if (!user || !user.isActive) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token or user not found.',
        data: {
          user: null,
          token: null,
          userType: null
        }
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token.',
        data: {
          user: null,
          token: null,
          userType: null
        }
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token expired.',
        data: {
          user: null,
          token: null,
          userType: null
        }
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Server error.',
      data: {
        user: null,
        token: null,
        userType: null
      }
    });
  }
};

// Middleware to check user type (role-based access)
const requireUserType = (userType) => {
  return (req, res, next) => {
    const userTypes = Array.isArray(req.user.userType) ? req.user.userType : [req.user.userType];
    
    if (!userTypes.includes(userType)) {
      return res.status(403).json({ 
        success: false, 
        message: `Access denied. ${userType} role required.`,
        data: {
          user: null,
          token: null,
          userType: req.user.userType
        }
      });
    }
    next();
  };
};

module.exports = { auth, requireUserType };
