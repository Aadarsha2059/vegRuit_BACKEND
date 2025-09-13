const Category = require('../models/Category');
const Product = require('../models/Product');
const { getFileUrl, deleteFile } = require('../middlewares/upload');
const path = require('path');

// --- Public Routes ---
const getPublicCategories = async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true }).sort({ name: 1 });
    res.json({ success: true, data: { categories } });
  } catch (error) {
    console.error('Get public categories error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch categories' });
  }
};

const getPublicCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
    res.json({ success: true, data: { category } });
  } catch (error) {
    console.error('Get public category by ID error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch category' });
  }
};

// --- Protected Routes ---
const getCategories = async (req, res) => {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const query = includeInactive ? {} : { isActive: true };
    const categories = await Category.find(query)
      .populate('seller', 'firstName lastName')
      .sort({ name: 1 });
    res.json({ success: true, data: { categories } });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch categories' });
  }
};

const getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
    res.json({ success: true, data: { category } });
  } catch (error) {
    console.error('Get category by ID error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch category' });
  }
};

const createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Category name is required' });

    const existingCategory = await Category.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (existingCategory) return res.status(400).json({ success: false, message: 'Category already exists' });

    let imageUrl = '';
    if (req.file) imageUrl = getFileUrl(req, `categories/${req.file.filename}`);

    const newCategory = new Category({
      name: name.trim(),
      description: description?.trim() || '',
      image: imageUrl,
      seller: req.user._id
    });

    await newCategory.save();
    await newCategory.populate('seller', 'firstName lastName');

    res.status(201).json({ success: true, message: 'Category created successfully', data: { category: newCategory } });
  } catch (error) {
    console.error('Create category error:', error);
    if (req.file) deleteFile(req.file.path);
    res.status(500).json({ success: false, message: 'Failed to create category' });
  }
};

const updateCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });

    const { name, description, isActive } = req.body;
    if (name) category.name = name.trim();
    if (description !== undefined) category.description = description.trim();
    if (isActive !== undefined) category.isActive = isActive;

    if (req.file) {
      if (category.image) {
        const oldImagePath = category.image.replace(getFileUrl(req, ''), '');
        deleteFile(path.join(__dirname, '..', 'uploads', oldImagePath));
      }
      category.image = getFileUrl(req, `categories/${req.file.filename}`);
    }

    await category.save();
    await category.populate('seller', 'firstName lastName');

    res.json({ success: true, message: 'Category updated successfully', data: { category } });
  } catch (error) {
    console.error('Update category error:', error);
    if (req.file) deleteFile(req.file.path);
    res.status(500).json({ success: false, message: 'Failed to update category' });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });

    const productCount = await Product.countDocuments({ category: category._id });
    if (productCount > 0) return res.status(400).json({ success: false, message: `Cannot delete category. ${productCount} products are using this category.` });

    if (category.image) {
      const imagePath = category.image.replace(getFileUrl(req, ''), '');
      deleteFile(path.join(__dirname, '..', 'uploads', imagePath));
    }

    await Category.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete category' });
  }
};

const getCategoryStats = async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true });
    const stats = {
      totalCategories: categories.length,
      categoriesWithProducts: categories.filter(c => c.productCount > 0).length,
      topCategories: categories.sort((a, b) => b.productCount - a.productCount).slice(0, 5)
        .map(c => ({ name: c.name, productCount: c.productCount }))
    };
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Get category stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch category statistics' });
  }
};

module.exports = {
  getPublicCategories,
  getPublicCategoryById,
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryStats
};
