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

// Forgot Password - Request password reset
const forgotPassword = async (req, res) => {
  try {
    console.log('[PASSWORD RESET] 📥 Request received');
    const { email } = req.body;

    if (!email) {
      console.log('[PASSWORD RESET] ❌ No email provided');
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    console.log(`[PASSWORD RESET] 🔍 Looking for user with email: ${email.toLowerCase().trim()}`);

    // Find user by email - must be registered as buyer or seller
    const user = await User.findOne({ 
      email: email.toLowerCase().trim(),
      $or: [
        { isBuyer: true },
        { isSeller: true }
      ]
    });

    if (!user) {
      // Email is not registered as buyer or seller
      console.log(`[PASSWORD RESET] ❌ User not found: ${email}`);
      return res.status(404).json({
        success: false,
        message: 'This email is not registered. Please enter a valid registered email address.'
      });
    }

    console.log(`[PASSWORD RESET] ✅ User found: ${user.email} (${user.firstName} ${user.lastName})`);

    // Generate reset token
    const crypto = require('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Hash token before saving to database
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    
    // Save hashed token and expiry to user
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // Create reset URL
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;

    // Check if email configuration is available
    const emailConfigured = process.env.EMAIL_USER && process.env.EMAIL_PASS;

    console.log(`[PASSWORD RESET] 📧 Email configuration check:`);
    console.log(`[PASSWORD RESET]   EMAIL_USER: ${process.env.EMAIL_USER ? '✅ Set' : '❌ Not set'}`);
    console.log(`[PASSWORD RESET]   EMAIL_PASS: ${process.env.EMAIL_PASS ? '✅ Set' : '❌ Not set'}`);

    if (!emailConfigured) {
      // Email not configured - return error
      console.log(`[PASSWORD RESET] ❌ Email not configured. Cannot send reset link to ${user.email}`);
      console.log('[PASSWORD RESET] Please configure EMAIL_USER and EMAIL_PASS in your .env file.');
      console.log('[PASSWORD RESET] For Gmail, use App Password: https://support.google.com/accounts/answer/185833');
      
      return res.status(500).json({
        success: false,
        message: 'Email service is not configured. Please contact support for password reset assistance.'
      });
    }

    // Send email (using nodemailer)
    try {
      console.log('[PASSWORD RESET] 📧 Initializing nodemailer...');
      const nodemailer = require('nodemailer');
      
      // Determine email provider and configure accordingly
      const emailHost = process.env.EMAIL_HOST || 'smtp.gmail.com';
      const emailPort = parseInt(process.env.EMAIL_PORT) || 587;
      const isGmail = emailHost.includes('gmail.com');
      
      console.log(`[PASSWORD RESET] 📧 Email provider: ${isGmail ? 'Gmail' : 'Custom SMTP'}`);
      
      // Create transporter with Gmail service (simplified and more reliable)
      let transporter;
      
      if (isGmail) {
        // Use Gmail service - this is the most reliable method
        console.log('[PASSWORD RESET] 📧 Creating Gmail transporter...');
        transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
          }
        });
        console.log('[PASSWORD RESET] ✅ Gmail transporter created');
      } else {
        // For other email providers
        console.log(`[PASSWORD RESET] 📧 Creating custom SMTP transporter (${emailHost}:${emailPort})...`);
        transporter = nodemailer.createTransport({
          host: emailHost,
          port: emailPort,
          secure: emailPort === 465,
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
          },
          tls: {
            rejectUnauthorized: false
          }
        });
        console.log('[PASSWORD RESET] ✅ Custom SMTP transporter created');
      }

      // Verify transporter configuration (optional - skip if it fails)
      try {
        await Promise.race([
          transporter.verify(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('SMTP verification timeout')), 10000))
        ]);
        console.log('[EMAIL] ✅ SMTP configuration verified successfully');
      } catch (verifyError) {
        console.warn('[EMAIL] ⚠️ SMTP verification failed or timed out:', verifyError.message);
        // Continue anyway - some SMTP servers don't support verify or are slow
        // This is not critical, we'll try to send anyway
      }

      // For testing: Send all emails to test address (remove this in production)
      const testEmailAddress = 'dhakalaadarshababu20590226@gmail.com';
      const recipientEmail = process.env.NODE_ENV === 'production' ? user.email : testEmailAddress;
      
      console.log(`[PASSWORD RESET] Sending email to: ${recipientEmail} (original: ${user.email})`);

      // Email content
      const mailOptions = {
        from: `"Vegruit Support" <${process.env.EMAIL_USER}>`,
        to: recipientEmail,
        subject: 'Password Reset Request - Vegruit',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #22c55e; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0;">Vegruit</h1>
            </div>
            <div style="background-color: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
              <h2 style="color: #1f2937; margin-top: 0;">Password Reset Request</h2>
              <p style="color: #4b5563; font-size: 16px;">Hello ${user.firstName},</p>
              <p style="color: #4b5563; font-size: 16px;">You requested to reset your password for your Vegruit account.</p>
              <p style="color: #4b5563; font-size: 16px;">Click the button below to reset your password:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" style="background-color: #22c55e; color: white; padding: 14px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; font-size: 16px;">Reset Password</a>
              </div>
              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">Or copy and paste this link into your browser:</p>
              <p style="color: #4b5563; word-break: break-all; font-size: 12px; background-color: #e5e7eb; padding: 10px; border-radius: 5px;">${resetUrl}</p>
              <p style="color: #dc2626; font-weight: bold; margin-top: 20px;"><strong>⚠️ This link will expire in 1 hour.</strong></p>
              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">If you didn't request this password reset, please ignore this email and your password will remain unchanged.</p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
              <p style="color: #9ca3af; font-size: 12px; text-align: center;">This is an automated email from Vegruit. Please do not reply to this email.</p>
            </div>
          </div>
        `,
        // Plain text version for email clients that don't support HTML
        text: `
Password Reset Request - Vegruit

Hello ${user.firstName},

You requested to reset your password for your Vegruit account.

Click the link below to reset your password:
${resetUrl}

This link will expire in 1 hour.

If you didn't request this password reset, please ignore this email and your password will remain unchanged.

This is an automated email from Vegruit. Please do not reply to this email.
        `
      };

      // Send email (with timeout - 30 seconds for slow connections)
      console.log(`[PASSWORD RESET] 📧 Attempting to send email...`);
      const info = await Promise.race([
        transporter.sendMail(mailOptions),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Email send timeout after 30 seconds')), 30000))
      ]);
      
      console.log(`[PASSWORD RESET] ✅ Email sent successfully!`);
      console.log(`[PASSWORD RESET] 📬 Sent to: ${recipientEmail}`);
      console.log(`[PASSWORD RESET] 📧 Message ID: ${info.messageId}`);
      console.log(`[PASSWORD RESET] ✅ Response: ${info.response}`);
      
      // Return success response - link sent via email only
      return res.json({
        success: true,
        message: 'Password reset link has been sent to your registered email address.'
      });
      
    } catch (emailError) {
      // Detailed error logging
      console.error('[PASSWORD RESET] ❌ Email send error occurred');
      console.error('[PASSWORD RESET] Error message:', emailError.message);
      console.error('[PASSWORD RESET] Error code:', emailError.code);
      console.error('[PASSWORD RESET] Error command:', emailError.command);
      console.error('[PASSWORD RESET] Error response:', emailError.response);
      
      // Check error message and response for Gmail limit (check both message and response)
      const errorMessageText = (emailError.message || '').toLowerCase();
      const errorResponseText = (emailError.response || '').toLowerCase();
      const combinedErrorText = errorMessageText + ' ' + errorResponseText;
      
      const isGmailLimitError = combinedErrorText.includes('daily user sending limit exceeded') ||
                                combinedErrorText.includes('sending limit exceeded') ||
                                combinedErrorText.includes('550-5.4.5') ||
                                combinedErrorText.includes('daily sending limit') ||
                                (errorResponseText.includes('550') && errorResponseText.includes('limit'));
      
      // Provide helpful error messages based on error type
      let errorMessage = 'Failed to send password reset email. Please try again later or contact support.';
      
      if (isGmailLimitError) {
        errorMessage = 'Gmail daily sending limit exceeded. Please try again tomorrow or contact support for assistance.';
        console.error('[PASSWORD RESET] 📧 Gmail daily sending limit exceeded');
        console.error('[PASSWORD RESET] 💡 Solution: Wait 24 hours or use a different email service');
      } else if (emailError.code === 'EAUTH') {
        errorMessage = 'Email authentication failed. Please check your email credentials.';
        console.error('[PASSWORD RESET] 🔐 Authentication failed - check EMAIL_USER and EMAIL_PASS in .env');
      } else if (emailError.code === 'ECONNECTION' || emailError.code === 'ETIMEDOUT') {
        errorMessage = 'Could not connect to email server. Please check your internet connection and try again.';
        console.error('[PASSWORD RESET] 🌐 Connection failed - check network and email server settings');
      } else if (emailError.message && emailError.message.includes('timeout')) {
        errorMessage = 'Email server connection timed out. Please try again later.';
        console.error('[PASSWORD RESET] ⏱️ Timeout occurred');
      } else if (emailError.code === 'EENVELOPE' && !isGmailLimitError) {
        errorMessage = 'Invalid email address. Please contact support.';
        console.error('[PASSWORD RESET] 📧 Invalid email address');
      } else {
        console.error('[PASSWORD RESET] ❓ Unknown error:', emailError);
        // Log the full response for debugging
        if (emailError.response) {
          console.error('[PASSWORD RESET] Full error response:', emailError.response);
        }
      }
      
      // Return error - email failed to send
      return res.status(500).json({
        success: false,
        message: errorMessage
      });
    }

  } catch (error) {
    console.error('[PASSWORD RESET] ❌❌❌ UNEXPECTED ERROR ❌❌❌');
    console.error('[PASSWORD RESET] Error type:', error.constructor.name);
    console.error('[PASSWORD RESET] Error message:', error.message);
    console.error('[PASSWORD RESET] Error stack:', error.stack);
    console.error('[PASSWORD RESET] Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Reset Password - Update password with token
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Token and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Hash the token to compare with database
    const crypto = require('crypto');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with valid reset token
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token. Please request a new password reset link.'
      });
    }

    // Update password
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    console.log(`[PASSWORD RESET] Password successfully reset for user: ${user.email}`);

    res.json({
      success: true,
      message: 'Password has been reset successfully. You can now login with your new password.'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
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
  checkUserExists,
  forgotPassword,
  resetPassword
};