const Category = require('../models/Category');
const Product = require('../models/Product');

// Get all categories for a seller
const getSellerCategories = async (req, res) => {
  try {
    const categories = await Category.find({ 
      seller: req.user._id,
      isActive: true 
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: { categories },
      message: 'Categories retrieved successfully'
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching categories'
    });
  }
};

// Get all public categories (for buyers)
const getPublicCategories = async (req, res) => {
  try {
    const categories = await Category.find({ 
      isActive: true 
    })
    .populate('seller', 'firstName lastName farmName')
    .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: { categories },
      message: 'Categories retrieved successfully'
    });
  } catch (error) {
    console.error('Get public categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching categories'
    });
  }
};

// Create a new category
const createCategory = async (req, res) => {
  try {
    const { name, description, image, icon, color } = req.body;

    // Check if category name already exists for this seller
    const existingCategory = await Category.findOne({
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      seller: req.user._id
    });

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: 'Category with this name already exists'
      });
    }

    const category = new Category({
      name: name.trim(),
      description: description?.trim() || '',
      image: image || '',
      icon: icon || '📦',
      color: color || '#059669',
      seller: req.user._id
    });

    await category.save();

    res.status(201).json({
      success: true,
      data: { category },
      message: 'Category created successfully'
    });
  } catch (error) {
    console.error('Create category error:', error);
    
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
      message: 'Server error while creating category'
    });
  }
};

// Update a category
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, image, icon, color, isActive } = req.body;

    const category = await Category.findOne({
      _id: id,
      seller: req.user._id
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Check if new name conflicts with existing category
    if (name && name !== category.name) {
      const existingCategory = await Category.findOne({
        name: { $regex: new RegExp(`^${name}$`, 'i') },
        seller: req.user._id,
        _id: { $ne: id }
      });

      if (existingCategory) {
        return res.status(400).json({
          success: false,
          message: 'Category with this name already exists'
        });
      }
    }

    // Update category fields
    if (name) category.name = name.trim();
    if (description !== undefined) category.description = description.trim();
    if (image !== undefined) category.image = image;
    if (icon !== undefined) category.icon = icon;
    if (color !== undefined) category.color = color;
    if (isActive !== undefined) category.isActive = isActive;

    await category.save();

    res.json({
      success: true,
      data: { category },
      message: 'Category updated successfully'
    });
  } catch (error) {
    console.error('Update category error:', error);
    
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
      message: 'Server error while updating category'
    });
  }
};

// Delete a category
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findOne({
      _id: id,
      seller: req.user._id
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Check if category has products
    const productCount = await Product.countDocuments({ category: id });
    
    if (productCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category. It has ${productCount} products. Please move or delete the products first.`
      });
    }

    await Category.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting category'
    });
  }
};

// Get category statistics
const getCategoryStats = async (req, res) => {
  try {
    const totalCategories = await Category.countDocuments({ 
      seller: req.user._id,
      isActive: true 
    });

    const categoriesWithProducts = await Category.aggregate([
      {
        $match: {
          seller: req.user._id,
          isActive: true
        }
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: 'category',
          as: 'products'
        }
      },
      {
        $match: {
          'products.0': { $exists: true }
        }
      },
      {
        $count: 'count'
      }
    ]);

    const topCategories = await Category.aggregate([
      {
        $match: {
          seller: req.user._id,
          isActive: true
        }
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: 'category',
          as: 'products'
        }
      },
      {
        $addFields: {
          productCount: { $size: '$products' }
        }
      },
      {
        $sort: { productCount: -1 }
      },
      {
        $limit: 5
      },
      {
        $project: {
          name: 1,
          productCount: 1,
          icon: 1,
          color: 1
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        totalCategories,
        categoriesWithProducts: categoriesWithProducts[0]?.count || 0,
        topCategories
      },
      message: 'Category statistics retrieved successfully'
    });
  } catch (error) {
    console.error('Get category stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching category statistics'
    });
  }
};

module.exports = {
  getSellerCategories,
  getPublicCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryStats
};