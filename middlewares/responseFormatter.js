// Middleware to ensure consistent response format
const formatResponse = (req, res, next) => {
  // Store original json method
  const originalJson = res.json;

  // Override json method
  res.json = function(data) {
    // Ensure data object exists
    if (!data) {
      data = {};
    }

    // Ensure success field exists
    if (data.success === undefined) {
      data.success = res.statusCode >= 200 && res.statusCode < 300;
    }

    // Ensure data field exists for consistency
    if (!data.data) {
      data.data = {
        user: null,
        token: null,
        userType: null
      };
    }

    // Ensure message exists
    if (!data.message) {
      data.message = data.success ? 'Success' : 'Error occurred';
    }

    // Log the response for debugging
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - Status: ${res.statusCode}`);
    if (!data.success) {
      console.log('Error Response:', JSON.stringify(data, null, 2));
    }

    // Call original json method
    return originalJson.call(this, data);
  };

  next();
};

module.exports = formatResponse;
