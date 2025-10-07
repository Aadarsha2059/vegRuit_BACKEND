const Cart = require('../models/Cart');
const Product = require('../models/Product');

// Get user's cart
const getCart = async (req, res) => {
  try {
    let cart = await Cart.findOne({ buyer: req.user._id })
      .populate('items.product');

    if (!cart) {
      cart = new Cart({ buyer: req.user._id, items: [] });
      await cart.save();
    }

    const summary = await cart.getSummary();

    res.json({
      success: true,
      data: { cart: summary },
      message: 'Cart retrieved successfully'
    });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching cart'
    });
  }
};

// Add item to cart
const addToCart = async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;

    // Verify product exists and is available
    const product = await Product.findOne({
      _id: productId,
      isActive: true,
      status: 'active',
      stock: { $gte: quantity }
    });

    if (!product) {
      return res.status(400).json({
        success: false,
        message: 'Product not available or insufficient stock'
      });
    }

    let cart = await Cart.findOne({ buyer: req.user._id });

    if (!cart) {
      cart = new Cart({ buyer: req.user._id, items: [] });
    }

    // Check if item already exists in cart
    const existingItem = cart.items.find(item => 
      item.product.toString() === productId.toString()
    );

    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;
      
      if (newQuantity > product.stock) {
        return res.status(400).json({
          success: false,
          message: `Only ${product.stock} ${product.unit} available in stock`
        });
      }
      
      existingItem.quantity = newQuantity;
    } else {
      cart.items.push({ product: productId, quantity });
    }

    await cart.save();

    const summary = await cart.getSummary();

    res.json({
      success: true,
      data: { cart: summary },
      message: 'Item added to cart successfully'
    });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while adding item to cart'
    });
  }
};

// Update cart item quantity
const updateCartItem = async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;

    if (quantity < 0) {
      return res.status(400).json({
        success: false,
        message: 'Quantity cannot be negative'
      });
    }

    const cart = await Cart.findOne({ buyer: req.user._id });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    // Verify product exists and is available
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(400).json({
        success: false,
        message: 'Product not found'
      });
    }

    if (quantity > product.stock) {
      return res.status(400).json({
        success: false,
        message: `Only ${product.stock} ${product.unit} available in stock`
      });
    }

    await cart.updateQuantity(productId, quantity);

    const summary = await cart.getSummary();

    res.json({
      success: true,
      data: { cart: summary },
      message: 'Cart item updated successfully'
    });
  } catch (error) {
    console.error('Update cart item error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating cart item'
    });
  }
};

// Remove item from cart
const removeFromCart = async (req, res) => {
  try {
    const { productId } = req.params;

    const cart = await Cart.findOne({ buyer: req.user._id });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    await cart.removeItem(productId);

    const summary = await cart.getSummary();

    res.json({
      success: true,
      data: { cart: summary },
      message: 'Item removed from cart successfully'
    });
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while removing item from cart'
    });
  }
};

// Clear cart
const clearCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ buyer: req.user._id });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    await cart.clear();

    res.json({
      success: true,
      data: { cart: { totalItems: 0, totalValue: 0, items: [] } },
      message: 'Cart cleared successfully'
    });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while clearing cart'
    });
  }
};

// Get cart count
const getCartCount = async (req, res) => {
  try {
    const cart = await Cart.findOne({ buyer: req.user._id });

    const count = cart ? cart.totalItems : 0;

    res.json({
      success: true,
      data: { count },
      message: 'Cart count retrieved successfully'
    });
  } catch (error) {
    console.error('Get cart count error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching cart count'
    });
  }
};

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  getCartCount
};
