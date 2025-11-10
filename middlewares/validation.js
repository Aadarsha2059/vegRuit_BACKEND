const { body, validationResult } = require('express-validator');

// Middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const firstError = errors.array()[0];
    console.log(`[VALIDATION ERROR] Field: ${firstError.path}, Message: ${firstError.msg}`);
    return res.status(400).json({
      success: false,
      message: firstError.msg,
      field: firstError.path,
      errors: errors.array(),
      data: {
        user: null,
        token: null,
        userType: null
      }
    });
  }
  next();
};

// Validation rules for buyer registration
const validateBuyerRegistration = [
  body('username')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  
  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  
  body('phone')
    .trim()
    .matches(/^[\+]?[0-9\s\-\(\)]+$/)
    .withMessage('Please provide a valid phone number'),
  
  body('address')
    .trim()
    .isLength({ min: 10, max: 200 })
    .withMessage('Address must be between 10 and 200 characters'),
  
  body('city')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('City must be between 2 and 50 characters'),
  
  handleValidationErrors
];

// Validation rules for seller registration
const validateSellerRegistration = [
  body('username')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  
  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  
  body('phone')
    .trim()
    .matches(/^[\+]?[0-9\s\-\(\)]+$/)
    .withMessage('Please provide a valid phone number'),
  
  body('farmName')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Farm name must be between 3 and 100 characters'),
  
  body('farmLocation')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Farm location must be between 5 and 200 characters'),
  
  body('city')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('City must be between 2 and 50 characters'),
  
  handleValidationErrors
];

// Validation rules for login
const validateLogin = [
  body('username')
    .optional()
    .trim(),
  
  body('email')
    .optional()
    .trim(),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  
  (req, res, next) => {
    // Check if either username or email is provided
    if (!req.body.username && !req.body.email) {
      return res.status(400).json({
        success: false,
        message: 'Username or email is required',
        field: 'username'
      });
    }
    // If email is provided but not username, copy email to username field for controller
    if (req.body.email && !req.body.username) {
      req.body.username = req.body.email;
    }
    next();
  },
  
  handleValidationErrors
];

module.exports = {
  validateBuyerRegistration,
  validateSellerRegistration,
  validateLogin,
  handleValidationErrors
};
