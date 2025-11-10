const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Generate JWT token
const generateToken = (userId) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  return jwt.sign({ userId }, secret, { expiresIn: '7d' });
};

// Enhanced Registration (supports multiple roles)
const registerUser = async (req, res) => {
  try {
    const { 
      username, email, password, firstName, lastName, phone, city,
      userType, isBuyer, isSeller, address, farmName, farmLocation 
    } = req.body;

    console.log(`[REGISTRATION ATTEMPT] Email: ${email}, Username: ${username}, UserType: ${userType || 'not specified'}`);

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ username }, { email }]
    });

    if (existingUser) {
      const isUsernameExists = existingUser.username === username;
      const isEmailExists = existingUser.email === email;
      
      console.log(`[REGISTRATION FAILED] ${isUsernameExists ? 'Username' : 'Email'} already exists: ${username || email}`);
      
      return res.status(400).json({
        success: false,
        message: isUsernameExists ? 'Username already exists' : 'Email already exists',
        field: isUsernameExists ? 'username' : 'email',
        suggestion: `This ${isUsernameExists ? 'username' : 'email'} is already registered. Please login instead.`,
        data: {
          user: null,
          token: null,
          userType: existingUser.userType
        }
      });
    }

    // Determine user type and flags
    let finalUserType;
    let finalIsBuyer;
    let finalIsSeller;

    if (userType) {
      // If userType is provided as string or array
      const types = Array.isArray(userType) ? userType : [userType];
      finalUserType = types;
      finalIsBuyer = types.includes('buyer');
      finalIsSeller = types.includes('seller');
    } else {
      // Use isBuyer and isSeller flags
      finalIsBuyer = isBuyer || false;
      finalIsSeller = isSeller || false;
      finalUserType = finalIsBuyer && finalIsSeller ? ['buyer', 'seller'] : 
                      finalIsBuyer ? ['buyer'] : ['seller'];
    }

    // Create new user with multiple roles support
    const userData = {
      username: username.trim(),
      email: email.toLowerCase().trim(),
      password,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
      city: city.trim(),
      userType: finalUserType,
      isBuyer: finalIsBuyer,
      isSeller: finalIsSeller
    };

    // Add role-specific fields
    if (finalIsBuyer && address) {
      userData.address = address.trim();
    }
    if (finalIsSeller && farmName && farmLocation) {
      userData.farmName = farmName.trim();
      userData.farmLocation = farmLocation.trim();
    }

    const user = new User(userData);
    await user.save();

    console.log(`[REGISTRATION SUCCESS] User: ${user.email}, Type: ${user.userType.join(', ')}`);

    // Generate token
    const token = generateToken(user._id);

    // Get user without password
    const userResponse = user.toJSON();

    const roleText = user.isBuyer && user.isSeller ? 'Buyer & Seller' : 
                    user.isBuyer ? 'Buyer' : 'Seller';

    res.status(201).json({
      success: true,
      message: `${roleText} account created successfully! Welcome to VegRuit!`,
      data: {
        user: userResponse,
        token,
        userType: user.userType
      }
    });
  } catch (error) {
    console.error('[REGISTRATION ERROR]', error);
    
    // Handle mongoose validation errors
    if (error.name === 'ValidationError') {
      const field = Object.keys(error.errors)[0];
      console.log(`[REGISTRATION FAILED] Validation error: ${field} - ${error.errors[field].message}`);
      return res.status(400).json({
        success: false,
        message: error.errors[field].message,
        field: field,
        data: {
          user: null,
          token: null,
          userType: null
        }
      });
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      console.log(`[REGISTRATION FAILED] Duplicate key: ${field}`);
      return res.status(400).json({
        success: false,
        message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`,
        field: field,
        data: {
          user: null,
          token: null,
          userType: null
        }
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error during registration. Please try again.',
      field: 'server',
      data: {
        user: null,
        token: null,
        userType: null
      }
    });

    res.status(500).json({
      success: false,
      message: 'Server error during registration. Please try again.',
      field: 'server'
    });
  }
};

// Legacy Buyer Registration (for backward compatibility)
const registerBuyer = async (req, res) => {
  const buyerData = {
    ...req.body,
    userType: ['buyer'],
    isBuyer: true,
    isSeller: false
  };
  req.body = buyerData;
  return registerUser(req, res);
};

// Legacy Seller Registration (for backward compatibility)
const registerSeller = async (req, res) => {
  const sellerData = {
    ...req.body,
    userType: ['seller'],
    isBuyer: false,
    isSeller: true
  };
  req.body = sellerData;
  return registerUser(req, res);
};

// Login (for both buyers and sellers)
const login = async (req, res) => {
  try {
    const { username, password, userType } = req.body;

    // Log login attempt (without password)
    console.log(`[LOGIN ATTEMPT] Username: ${username}, UserType: ${userType || 'any'}`);

    if (!username || !password) {
      console.log('[LOGIN FAILED] Missing credentials');
      return res.status(400).json({
        success: false,
        message: 'Username/email and password are required',
        field: 'credentials',
        data: {
          user: null,
          token: null,
          userType: null
        }
      });
    }

    // Find user by username or email
    const user = await User.findOne({
      $or: [
        { username: username.trim() }, 
        { email: username.toLowerCase().trim() }
      ]
    });

    if (!user) {
      console.log(`[LOGIN FAILED] User not found: ${username}`);
      return res.status(401).json({
        success: false,
        message: 'Incorrect username/email or password',
        suggestion: 'Please check your credentials and try again',
        field: 'username',
        data: {
          user: null,
          token: null,
          userType: null
        }
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact support.',
        field: 'account',
        data: {
          user: null,
          token: null,
          userType: null
        }
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      console.log(`[LOGIN FAILED] Invalid password for user: ${username}`);
      return res.status(401).json({
        success: false,
        message: 'Incorrect username/email or password',
        suggestion: 'Please check your credentials and try again',
        field: 'password',
        data: {
          user: null,
          token: null,
          userType: null
        }
      });
    }

    console.log(`[LOGIN SUCCESS] User: ${user.email}, Type: ${user.userType.join(', ')}`);

    // Check if user has the requested role (if specified)
    if (userType) {
      const userTypes = Array.isArray(user.userType) ? user.userType : [user.userType];
      if (!userTypes.includes(userType)) {
        return res.status(403).json({
          success: false,
          message: `This account is not registered as a ${userType}`,
          suggestion: `Please use the correct login page for your account type`,
          field: 'userType',
          data: {
            user: null,
            token: null,
            userType: user.userType
          }
        });
      }
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    // Get user without password
    const userResponse = user.toJSON();

    const roleText = user.isBuyer && user.isSeller ? 'Buyer & Seller' : 
                    user.isBuyer ? 'Buyer' : 'Seller';

    res.json({
      success: true,
      message: `Welcome back! ${roleText} login successful`,
      data: {
        user: userResponse,
        token,
        userType: user.userType
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login. Please try again.',
      field: 'server',
      data: {
        user: null,
        token: null,
        userType: null
      }
    });
  }
};

// Get current user profile
const getProfile = async (req, res) => {
  try {
    res.json({
      success: true,
      user: req.user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching profile'
    });
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, phone, address, city, farmName, farmLocation } = req.body;
    
    const updateData = { firstName, lastName, phone, city };
    
    // Add user type specific fields
    if (req.user.userType === 'buyer') {
      updateData.address = address;
    } else if (req.user.userType === 'seller') {
      updateData.farmName = farmName;
      updateData.farmLocation = farmLocation;
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating profile'
    });
  }
};

// Logout (client-side token removal)
const logout = async (req, res) => {
  try {
    // In a real application, you might want to blacklist the token
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during logout'
    });
  }
};

// Check if user exists and suggest user type
const checkUserExists = async (req, res) => {
  try {
    const { username, email } = req.query;
    
    if (!username && !email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide username or email'
      });
    }

    const user = await User.findOne({
      $or: [
        username ? { username } : {},
        email ? { email } : {}
      ]
    });

    if (user) {
      return res.json({
        success: true,
        exists: true,
        userType: user.userType,
        message: `This ${username ? 'username' : 'email'} is already registered as a ${user.userType}`,
        suggestion: user.userType === 'buyer' ? 
          'Please use the buyer login form.' : 
          'Please use the seller login form.'
      });
    } else {
      return res.json({
        success: true,
        exists: false,
        message: 'Username/email is available for registration'
      });
    }
  } catch (error) {
    console.error('Check user exists error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while checking user'
    });
  }
};

module.exports = {
  registerUser,
  registerBuyer,
  registerSeller,
  login,
  getProfile,
  updateProfile,
  logout,
  checkUserExists
};
