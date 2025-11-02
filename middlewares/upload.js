const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create upload directories if they don't exist
const createUploadDirs = () => {
    const dirs = [
        './public/uploads',
        './public/uploads/categories',
        './public/uploads/products',
        './public/uploads/temp'
    ];
    
    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });
};

createUploadDirs();

// Storage config for categories
const categoryStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/categories/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'category-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// Storage config for products
const productStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/products/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'product-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// File filter for images
const imageFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed!'), false);
    }
};

// Upload configurations
const categoryUpload = multer({
    storage: categoryStorage,
    limits: { fileSize: 1024 * 1024 * 2 }, // 2MB for categories
    fileFilter: imageFilter
});

const productUpload = multer({
    storage: productStorage,
    limits: { fileSize: 1024 * 1024 * 5 }, // 5MB for products
    fileFilter: imageFilter
});

// Wrapper functions
const uploadCategoryImage = categoryUpload.single('image');
const uploadProductImages = productUpload.array('images', 5); // Max 5 images
const uploadSingleProductImage = productUpload.single('image');

// Generic upload for backward compatibility
const genericStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const genericUpload = multer({
    storage: genericStorage,
    limits: { fileSize: 1024 * 1024 * 5 }, // 5MB
    fileFilter: imageFilter
});

const uploadSingle = (fieldName) => genericUpload.single(fieldName);

module.exports = { 
    uploadSingle,
    uploadCategoryImage,
    uploadProductImages,
    uploadSingleProductImage
};
