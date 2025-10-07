const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create public/uploads directory if it doesn't exist
const dir = './public/uploads';
if (!fs.existsSync(dir)){
    fs.mkdirSync(dir, { recursive: true });
}

// Storage config
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 1024 * 1024 * 5 } // 5MB
});

// Wrapper for single file upload
const uploadSingle = (fieldName) => upload.single(fieldName);

// Export the function
module.exports = { uploadSingle };
