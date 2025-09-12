const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || process.env.SECRET, { expiresIn: '7d' });
};

// Buyer Registration
const registerBuyer = async (req, res) => {
  try {
    const { username, email, password, firstName, lastName, phone, address, city } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ username }, { email }]
    });

    if (existingUser) {
      const isUsernameExists = existingUser.username === username;
      const isEmailExists = existingUser.email === email;
      
      return res.status(400).json({
        success: false,
        message: isUsernameExists ? 'Username already exists' : 'Email already exists',
        field: isUsernameExists ? 'username' : 'email',
        suggestion: existingUser.userType === 'seller' ? 
          `This ${isUsernameExists ? 'username' : 'email'} is registered as a seller. Please use the seller login.` : 
          `This ${isUsernameExists ? 'username' : 'email'} is already registered. Please login instead.`,
        existingUserType: existingUser.userType
      });
    }

    // Create new buyer
    const buyer = new User({
      username: username.trim(),
      email: email.toLowerCase().trim(),
      password,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
      address: address.trim(),
      city: city.trim(),
      userType: 'buyer'
    });

    await buyer.save();

    // Generate token
    const token = generateToken(buyer._id);

    // Get user without password
    const userResponse = buyer.toJSON();

    res.status(201).json({
      success: true,
      message: 'Buyer account created successfully! Welcome to VegRuit!',
      user: userResponse,
      token,
      userType: buyer.userType
    });
  } catch (error) {
    console.error('Buyer registration error:', error);
    
    // Handle mongoose validation errors
    if (error.name === 'ValidationError') {
      const field = Object.keys(error.errors)[0];
      return res.status(400).json({
        success: false,
        message: error.errors[field].message,
        field: field
      });
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`,
        field: field
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error during registration. Please try again.',
      field: 'server'
    });
  }
};

// Seller Registration
const registerSeller = async (req, res) => {
  try {
    const { username, email, password, firstName, lastName, phone, farmName, farmLocation, city } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ username }, { email }]
    });

    if (existingUser) {
      const isUsernameExists = existingUser.username === username;
      const isEmailExists = existingUser.email === email;
      
      return res.status(400).json({
        success: false,
        message: isUsernameExists ? 'Username already exists' : 'Email already exists',
        field: isUsernameExists ? 'username' : 'email',
        suggestion: existingUser.userType === 'buyer' ? 
          `This ${isUsernameExists ? 'username' : 'email'} is registered as a buyer. Please use the buyer login.` : 
          `This ${isUsernameExists ? 'username' : 'email'} is already registered. Please login instead.`,
        existingUserType: existingUser.userType
      });
    }

    // Create new seller
    const seller = new User({
      username: username.trim(),
      email: email.toLowerCase().trim(),
      password,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
      farmName: farmName.trim(),
      farmLocation: farmLocation.trim(),
      city: city.trim(),
      userType: 'seller'
    });

    await seller.save();

    // Generate token
    const token = generateToken(seller._id);

    // Get user without password
    const userResponse = seller.toJSON();

    res.status(201).json({
      success: true,
      message: 'Seller account created successfully! Welcome to VegRuit!',
      user: userResponse,
      token,
      userType: seller.userType
    });
  } catch (error) {
    console.error('Seller registration error:', error);
    
    // Handle mongoose validation errors
    if (error.name === 'ValidationError') {
      const field = Object.keys(error.errors)[0];
      return res.status(400).json({
        success: false,
        message: error.errors[field].message,
        field: field
      });
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`,
        field: field
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error during registration. Please try again.',
      field: 'server'
    });
  }
};

// Login (for both buyers and sellers)
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find user by username or email
    const user = await User.findOne({
      $or: [{ username: username.trim() }, { email: username.toLowerCase().trim() }]
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'No account found with this username/email',
        suggestion: 'Please check your credentials or create a new account',
        field: 'username'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact support.',
        field: 'account'
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect password',
        suggestion: 'Please check your password and try again',
        field: 'password'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    // Get user without password
    const userResponse = user.toJSON();

    res.json({
      success: true,
      message: `Welcome back! ${user.userType === 'buyer' ? 'Buyer' : 'Seller'} login successful`,
      user: userResponse,
      token,
      userType: user.userType
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login. Please try again.',
      field: 'server'
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
  registerBuyer,
  registerSeller,
  login,
  getProfile,
  updateProfile,
  logout,
  checkUserExists
};
