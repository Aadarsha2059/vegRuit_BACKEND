const Favorite = require('../models/Favorite');
const Product = require('../models/Product');

// Add product to favorites
const addToFavorites = async (req, res) => {
  try {
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required'
      });
    }

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if already favorited
    const existingFavorite = await Favorite.findOne({
      user: req.user._id,
      product: productId
    });

    if (existingFavorite) {
      return res.status(400).json({
        success: false,
        message: 'Product already in favorites'
      });
    }

    // Create favorite
    const favorite = new Favorite({
      user: req.user._id,
      product: productId
    });

    await favorite.save();

    res.status(201).json({
      success: true,
      data: { favorite },
      message: 'Product added to favorites'
    });
  } catch (error) {
    console.error('Add to favorites error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add product to favorites'
    });
  }
};

// Remove product from favorites
const removeFromFavorites = async (req, res) => {
  try {
    const { productId } = req.params;

    const favorite = await Favorite.findOneAndDelete({
      user: req.user._id,
      product: productId
    });

    if (!favorite) {
      return res.status(404).json({
        success: false,
        message: 'Favorite not found'
      });
    }

    res.json({
      success: true,
      message: 'Product removed from favorites'
    });
  } catch (error) {
    console.error('Remove from favorites error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove product from favorites'
    });
  }
};

// Get user's favorites
const getUserFavorites = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const favorites = await Favorite.find({ user: req.user._id })
      .populate({
        path: 'product',
        select: 'name description price unit images category seller stock isActive',
        populate: [
          { path: 'category', select: 'name icon' },
          { path: 'seller', select: 'firstName lastName farmName' }
        ]
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Filter out favorites where product no longer exists
    const validFavorites = favorites.filter(fav => fav.product);

    const total = await Favorite.countDocuments({ user: req.user._id });

    res.json({
      success: true,
      data: {
        favorites: validFavorites,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          total,
          limit: parseInt(limit)
        }
      },
      message: 'Favorites retrieved successfully'
    });
  } catch (error) {
    console.error('Get favorites error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch favorites'
    });
  }
};

// Check if product is favorited
const checkFavorite = async (req, res) => {
  try {
    const { productId } = req.params;

    const favorite = await Favorite.findOne({
      user: req.user._id,
      product: productId
    });

    res.json({
      success: true,
      data: {
        isFavorite: !!favorite
      }
    });
  } catch (error) {
    console.error('Check favorite error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check favorite status'
    });
  }
};

// Get favorite count
const getFavoriteCount = async (req, res) => {
  try {
    const count = await Favorite.countDocuments({ user: req.user._id });

    res.json({
      success: true,
      data: { count },
      message: 'Favorite count retrieved successfully'
    });
  } catch (error) {
    console.error('Get favorite count error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get favorite count'
    });
  }
};

module.exports = {
  addToFavorites,
  removeFromFavorites,
  getUserFavorites,
  checkFavorite,
  getFavoriteCount
};
