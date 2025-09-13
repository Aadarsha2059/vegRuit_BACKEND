const Product = require('../models/Product');
const Category = require('../models/Category');
const path = require('path');
const fs = require('fs');

// Get all products for a seller
const getSellerProducts = async (req, res) => {
  try {
    const { page = 1, limit = 10, category, status, search } = req.query;
    const query = { seller: req.user.id };

    if (category) query.category = category;
    if (status) {
      if (status === 'active') query.isActive = true;
      if (status === 'inactive') query.isActive = false;
    }
    if (search) {
      query.$text = { $search: search };
    }

    const products = await Product.find(query)
      .populate('category', 'name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Product.countDocuments(query);

    res.json({
      success: true,
      products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching seller products:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching products'
    });
  }
};

// Get all products for buyers (public)
const getProducts = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 12, 
      category, 
      search, 
      minPrice, 
      maxPrice, 
      sortBy = 'createdAt',
      sortOrder = 'desc',
      featured
    } = req.query;

    const query = { isActive: true };

    if (category) query.category = category;
    if (featured === 'true') query.isFeatured = true;
    if (search) {
      query.$text = { $search: search };
    }
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const products = await Product.find(query)
      .populate('category', 'name')
      .populate('seller', 'username farmLocation')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Product.countDocuments(query);

    res.json({
      success: true,
      products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching products'
    });
  }
};

// Get single product
const getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('category', 'name description')
      .populate('seller', 'username farmLocation');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Increment views if not the seller viewing their own product
    if (!req.user || req.user.id !== product.seller._id.toString()) {
      await product.incrementViews();
    }

    res.json({
      success: true,
      product
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching product'
    });
  }
};

// Create new product
const createProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      originalPrice,
      unit,
      stock,
      minOrderQuantity,
      maxOrderQuantity,
      category,
      tags,
      harvestDate,
      expiryDate,
      farmLocation,
      isOrganic,
      isFeatured,
      nutritionInfo
    } = req.body;

    // Validate category exists and belongs to seller
    const categoryDoc = await Category.findOne({
      _id: category,
      seller: req.user.id,
      isActive: true
    });

    if (!categoryDoc) {
      // Delete uploaded files if category validation fails
      if (req.files) {
        req.files.forEach(file => {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
      }
      return res.status(400).json({
        success: false,
        message: 'Invalid category selected'
      });
    }

    // Process uploaded images
    const images = req.files ? req.files.map(file => `/uploads/products/${file.filename}`) : [];

    if (images.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one product image is required'
      });
    }

    const productData = {
      name: name.trim(),
      description: description.trim(),
      price: parseFloat(price),
      unit,
      stock: parseInt(stock),
      category,
      seller: req.user.id,
      images
    };

    // Optional fields
    if (originalPrice) productData.originalPrice = parseFloat(originalPrice);
    if (minOrderQuantity) productData.minOrderQuantity = parseInt(minOrderQuantity);
    if (maxOrderQuantity) productData.maxOrderQuantity = parseInt(maxOrderQuantity);
    if (tags) productData.tags = JSON.parse(tags);
    if (harvestDate) productData.harvestDate = new Date(harvestDate);
    if (expiryDate) productData.expiryDate = new Date(expiryDate);
    if (farmLocation) productData.farmLocation = farmLocation.trim();
    if (isOrganic !== undefined) productData.isOrganic = isOrganic === 'true';
    if (isFeatured !== undefined) productData.isFeatured = isFeatured === 'true';
    if (nutritionInfo) productData.nutritionInfo = JSON.parse(nutritionInfo);

    const product = new Product(productData);
    await product.save();

    // Populate the response
    await product.populate('category', 'name');

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      product
    });
  } catch (error) {
    console.error('Error creating product:', error);
    
    // Delete uploaded files if error occurs
    if (req.files) {
      req.files.forEach(file => {
        try {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        } catch (deleteError) {
          console.error('Error deleting uploaded file:', deleteError);
        }
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error creating product'
    });
  }
};

// Update product
const updateProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const product = await Product.findOne({
      _id: productId,
      seller: req.user.id
    });

    if (!product) {
      // Delete uploaded files if product not found
      if (req.files) {
        req.files.forEach(file => {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
      }
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const {
      name,
      description,
      price,
      originalPrice,
      unit,
      stock,
      minOrderQuantity,
      maxOrderQuantity,
      category,
      tags,
      harvestDate,
      expiryDate,
      farmLocation,
      isOrganic,
      isFeatured,
      isActive,
      nutritionInfo
    } = req.body;

    // Validate category if changed
    if (category && category !== product.category.toString()) {
      const categoryDoc = await Category.findOne({
        _id: category,
        seller: req.user.id,
        isActive: true
      });

      if (!categoryDoc) {
        if (req.files) {
          req.files.forEach(file => {
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
          });
        }
        return res.status(400).json({
          success: false,
          message: 'Invalid category selected'
        });
      }
    }

    // Update fields
    if (name) product.name = name.trim();
    if (description) product.description = description.trim();
    if (price) product.price = parseFloat(price);
    if (originalPrice !== undefined) product.originalPrice = originalPrice ? parseFloat(originalPrice) : null;
    if (unit) product.unit = unit;
    if (stock !== undefined) product.stock = parseInt(stock);
    if (minOrderQuantity) product.minOrderQuantity = parseInt(minOrderQuantity);
    if (maxOrderQuantity) product.maxOrderQuantity = parseInt(maxOrderQuantity);
    if (category) product.category = category;
    if (tags) product.tags = JSON.parse(tags);
    if (harvestDate) product.harvestDate = new Date(harvestDate);
    if (expiryDate) product.expiryDate = new Date(expiryDate);
    if (farmLocation) product.farmLocation = farmLocation.trim();
    if (isOrganic !== undefined) product.isOrganic = isOrganic === 'true';
    if (isFeatured !== undefined) product.isFeatured = isFeatured === 'true';
    if (isActive !== undefined) product.isActive = isActive === 'true';
    if (nutritionInfo) product.nutritionInfo = JSON.parse(nutritionInfo);

    // Handle image updates
    if (req.files && req.files.length > 0) {
      // Delete old images
      product.images.forEach(imagePath => {
        const fullPath = path.join(__dirname, '..', imagePath);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      });
      
      // Set new images
      product.images = req.files.map(file => `/uploads/products/${file.filename}`);
    }

    await product.save();
    await product.populate('category', 'name');

    res.json({
      success: true,
      message: 'Product updated successfully',
      product
    });
  } catch (error) {
    console.error('Error updating product:', error);
    
    // Delete uploaded files if error occurs
    if (req.files) {
      req.files.forEach(file => {
        try {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        } catch (deleteError) {
          console.error('Error deleting uploaded file:', deleteError);
        }
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error updating product'
    });
  }
};

// Delete product
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      seller: req.user.id
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Delete product images
    product.images.forEach(imagePath => {
      const fullPath = path.join(__dirname, '..', imagePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    });

    // Update category product count
    await Category.findByIdAndUpdate(product.category, { $inc: { productCount: -1 } });

    await Product.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting product'
    });
  }
};

// Get product statistics for seller
const getProductStats = async (req, res) => {
  try {
    const sellerId = req.user.id;
    
    const stats = await Product.aggregate([
      { $match: { seller: sellerId } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: ['$isActive', 1, 0] } },
          inactive: { $sum: { $cond: ['$isActive', 0, 1] } },
          lowStock: { $sum: { $cond: [{ $lte: ['$stock', 5] }, 1, 0] } },
          outOfStock: { $sum: { $cond: [{ $eq: ['$stock', 0] }, 1, 0] } },
          totalViews: { $sum: '$totalViews' },
          totalSold: { $sum: '$totalSold' },
          averageRating: { $avg: '$rating.average' }
        }
      }
    ]);

    const result = stats[0] || {
      total: 0,
      active: 0,
      inactive: 0,
      lowStock: 0,
      outOfStock: 0,
      totalViews: 0,
      totalSold: 0,
      averageRating: 0
    };

    res.json({
      success: true,
      stats: result
    });
  } catch (error) {
    console.error('Error fetching product stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching product statistics'
    });
  }
};

// Get featured products
const getFeaturedProducts = async (req, res) => {
  try {
    const { limit = 8 } = req.query;
    
    const products = await Product.find({ 
      isActive: true, 
      isFeatured: true 
    })
      .populate('category', 'name')
      .populate('seller', 'username farmLocation')
      .sort({ totalSold: -1, rating: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      products
    });
  } catch (error) {
    console.error('Error fetching featured products:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching featured products'
    });
  }
};

module.exports = {
  getSellerProducts,
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductStats,
  getFeaturedProducts
};
