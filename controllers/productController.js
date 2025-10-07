const Product = require('../models/Product');
const Category = require('../models/Category');

// Get all products for a seller
const getSellerProducts = async (req, res) => {
  try {
    const { page = 1, limit = 10, category, status, search } = req.query;
    const skip = (page - 1) * limit;

    let query = { seller: req.user._id };

    if (category) {
      query.category = category;
    }

    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const products = await Product.find(query)
      .populate('category', 'name icon color')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Product.countDocuments(query);

    res.json({
      success: true,
      data: {
        products,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total,
          limit: parseInt(limit)
        }
      },
      message: 'Products retrieved successfully'
    });
  } catch (error) {
    console.error('Get seller products error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching products'
    });
  }
};

// Get all public products (for buyers)
const getPublicProducts = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 12, 
      category, 
      seller, 
      search, 
      minPrice, 
      maxPrice,
      organic,
      featured,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    const skip = (page - 1) * limit;

    let query = { 
      isActive: true, 
      status: 'active',
      stock: { $gt: 0 }
    };

    if (category) {
      query.category = category;
    }

    if (seller) {
      query.seller = seller;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }

    if (organic !== undefined) {
      query.organic = organic === 'true';
    }

    if (featured !== undefined) {
      query.isFeatured = featured === 'true';
    }

    let sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const products = await Product.find(query)
      .populate('category', 'name icon color')
      .populate('seller', 'firstName lastName farmName city')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Product.countDocuments(query);

    res.json({
      success: true,
      data: {
        products,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total,
          limit: parseInt(limit)
        }
      },
      message: 'Products retrieved successfully'
    });
  } catch (error) {
    console.error('Get public products error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching products'
    });
  }
};

// Get featured products
const getFeaturedProducts = async (req, res) => {
  try {
    const { limit = 8 } = req.query;

    const products = await Product.find({
      isActive: true,
      status: 'active',
      isFeatured: true,
      stock: { $gt: 0 }
    })
    .populate('category', 'name icon color')
    .populate('seller', 'firstName lastName farmName city')
    .sort({ averageRating: -1, totalOrders: -1 })
    .limit(parseInt(limit));

    res.json({
      success: true,
      data: { products },
      message: 'Featured products retrieved successfully'
    });
  } catch (error) {
    console.error('Get featured products error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching featured products'
    });
  }
};

// Get single product
const getProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id)
      .populate('category', 'name icon color')
      .populate('seller', 'firstName lastName farmName city phone');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      data: { product },
      message: 'Product retrieved successfully'
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching product'
    });
  }
};

// Create a new product
const createProduct = async (req, res) => {
  try {
    const {
      name, description, price, unit, stock, minOrder, maxOrder,
      category, images, organic, fresh, origin, harvestDate,
      expiryDate, tags, searchKeywords, isFeatured
    } = req.body;

    // Verify category belongs to seller
    const categoryDoc = await Category.findOne({
      _id: category,
      seller: req.user._id
    });

    if (!categoryDoc) {
      return res.status(400).json({
        success: false,
        message: 'Category not found or does not belong to you'
      });
    }

    const product = new Product({
      name: name.trim(),
      description: description?.trim() || '',
      price: parseFloat(price),
      unit: unit || 'kg',
      stock: parseInt(stock) || 0,
      minOrder: parseInt(minOrder) || 1,
      maxOrder: parseInt(maxOrder) || 100,
      category: category,
      seller: req.user._id,
      images: images || [],
      organic: organic || false,
      fresh: fresh !== undefined ? fresh : true,
      origin: origin || 'Local',
      harvestDate: harvestDate ? new Date(harvestDate) : undefined,
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      tags: tags || [],
      searchKeywords: searchKeywords || [],
      isFeatured: isFeatured || false
    });

    await product.save();

    // Update category product count
    await Category.findByIdAndUpdate(category, {
      $inc: { productCount: 1 }
    });

    res.status(201).json({
      success: true,
      data: { product },
      message: 'Product created successfully'
    });
  } catch (error) {
    console.error('Create product error:', error);
    
    if (error.name === 'ValidationError') {
      const field = Object.keys(error.errors)[0];
      return res.status(400).json({
        success: false,
        message: error.errors[field].message,
        field: field
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while creating product'
    });
  }
};

// Update a product
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const product = await Product.findOne({
      _id: id,
      seller: req.user._id
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // If category is being changed, verify it belongs to seller
    if (updateData.category && updateData.category !== product.category.toString()) {
      const categoryDoc = await Category.findOne({
        _id: updateData.category,
        seller: req.user._id
      });

      if (!categoryDoc) {
        return res.status(400).json({
          success: false,
          message: 'Category not found or does not belong to you'
        });
      }

      // Update category product counts
      await Category.findByIdAndUpdate(product.category, {
        $inc: { productCount: -1 }
      });
      await Category.findByIdAndUpdate(updateData.category, {
        $inc: { productCount: 1 }
      });
    }

    // Update product fields
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        product[key] = updateData[key];
      }
    });

    await product.save();

    res.json({
      success: true,
      data: { product },
      message: 'Product updated successfully'
    });
  } catch (error) {
    console.error('Update product error:', error);
    
    if (error.name === 'ValidationError') {
      const field = Object.keys(error.errors)[0];
      return res.status(400).json({
        success: false,
        message: error.errors[field].message,
        field: field
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while updating product'
    });
  }
};

// Delete a product
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findOne({
      _id: id,
      seller: req.user._id
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Update category product count
    await Category.findByIdAndUpdate(product.category, {
      $inc: { productCount: -1 }
    });

    await Product.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting product'
    });
  }
};

// Get product statistics
const getProductStats = async (req, res) => {
  try {
    const totalProducts = await Product.countDocuments({ seller: req.user._id });
    const activeProducts = await Product.countDocuments({ 
      seller: req.user._id, 
      isActive: true, 
      status: 'active' 
    });
    const outOfStockProducts = await Product.countDocuments({ 
      seller: req.user._id, 
      status: 'out-of-stock' 
    });
    const featuredProducts = await Product.countDocuments({ 
      seller: req.user._id, 
      isFeatured: true 
    });

    const topProducts = await Product.find({ seller: req.user._id })
      .sort({ totalOrders: -1, averageRating: -1 })
      .limit(5)
      .select('name totalOrders averageRating price');

    res.json({
      success: true,
      data: {
        totalProducts,
        activeProducts,
        outOfStockProducts,
        featuredProducts,
        topProducts
      },
      message: 'Product statistics retrieved successfully'
    });
  } catch (error) {
    console.error('Get product stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching product statistics'
    });
  }
};

module.exports = {
  getSellerProducts,
  getPublicProducts,
  getFeaturedProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductStats
};