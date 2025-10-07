const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Auth middleware
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access denied. No token provided.' 
      });
    }

    const secret = process.env.JWT_SECRET || process.env.SECRET || 'your_super_secret_jwt_key_here_make_it_long_and_secure_12345';
    const decoded = jwt.verify(token, secret);
    const user = await User.findById(decoded.userId);
    
    if (!user || !user.isActive) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token or user not found.' 
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token.' 
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token expired.' 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Server error.' 
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
        message: `Access denied. ${userType} role required.` 
      });
    }
    next();
  };
};

module.exports = { auth, requireUserType };
