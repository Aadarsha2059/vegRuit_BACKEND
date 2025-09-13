const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, unique: true },
  description: { type: String, trim: true },
  image: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  productCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update the updatedAt field before saving
categorySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtuals
categorySchema.virtual('formattedCreatedAt').get(function() {
  return this.createdAt.toLocaleDateString();
});

categorySchema.virtual('status').get(function() {
  return this.isActive ? 'Active' : 'Inactive';
});

// Ensure virtuals are serialized
categorySchema.set('toJSON', { virtuals: true });

// Method to update product count
categorySchema.methods.updateProductCount = async function(ProductModel) {
  this.productCount = await ProductModel.countDocuments({ category: this._id });
  await this.save();
};

module.exports = mongoose.model('Category', categorySchema);
