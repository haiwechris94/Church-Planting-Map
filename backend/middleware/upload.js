/**
 * File Upload Middleware using Multer
 * Handles photo uploads for people groups and other entities
 */
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Ensure upload directories exist
const uploadDirs = ['uploads', 'uploads/photos', 'uploads/avatars', 'uploads/temp'];
uploadDirs.forEach(dir => {
  const fullPath = path.join(process.cwd(), dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

/**
 * Generate unique filename
 */
const generateFilename = (file) => {
  const uniqueSuffix = crypto.randomBytes(8).toString('hex');
  const ext = path.extname(file.originalname).toLowerCase();
  return `${Date.now()}-${uniqueSuffix}${ext}`;
};

/**
 * Storage configuration for photos
 */
const photoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(process.cwd(), 'uploads/photos'));
  },
  filename: (req, file, cb) => {
    cb(null, generateFilename(file));
  },
});

/**
 * Storage configuration for avatars
 */
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(process.cwd(), 'uploads/avatars'));
  },
  filename: (req, file, cb) => {
    cb(null, generateFilename(file));
  },
});

/**
 * File filter for images
 */
const imageFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'), false);
  }
};

/**
 * Photo upload middleware (multiple files)
 * Max 10 photos, 5MB each
 */
const uploadPhotos = multer({
  storage: photoStorage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 10,
  },
}).array('photos', 10);

/**
 * Single photo upload middleware
 * Max 5MB
 */
const uploadSinglePhoto = multer({
  storage: photoStorage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
}).single('photo');

/**
 * Avatar upload middleware
 * Max 2MB
 */
const uploadAvatar = multer({
  storage: avatarStorage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB
  },
}).single('avatar');

/**
 * Error handling wrapper for multer
 */
const handleUpload = (uploadMiddleware) => {
  return (req, res, next) => {
    uploadMiddleware(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        // Multer-specific errors
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            error: 'File too large',
            message: 'File size exceeds the maximum allowed limit',
          });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({
            error: 'Too many files',
            message: 'Maximum number of files exceeded',
          });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({
            error: 'Unexpected field',
            message: 'Unexpected file field in request',
          });
        }
        return res.status(400).json({
          error: 'Upload error',
          message: err.message,
        });
      } else if (err) {
        // Custom errors (like invalid file type)
        return res.status(400).json({
          error: 'Upload error',
          message: err.message,
        });
      }
      next();
    });
  };
};

/**
 * Process uploaded files and add URLs
 */
const processUploadedFiles = (req, res, next) => {
  if (req.file) {
    // Single file upload
    req.file.url = `/uploads/${req.file.destination.includes('avatars') ? 'avatars' : 'photos'}/${req.file.filename}`;
  }
  
  if (req.files && Array.isArray(req.files)) {
    // Multiple files upload
    req.files = req.files.map(file => ({
      ...file,
      url: `/uploads/photos/${file.filename}`,
    }));
  }
  
  next();
};

/**
 * Delete file utility
 */
const deleteFile = (filePath) => {
  return new Promise((resolve, reject) => {
    const fullPath = path.join(process.cwd(), filePath);
    fs.unlink(fullPath, (err) => {
      if (err && err.code !== 'ENOENT') {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

/**
 * Delete multiple files utility
 */
const deleteFiles = async (filePaths) => {
  const results = await Promise.allSettled(
    filePaths.map(filePath => deleteFile(filePath))
  );
  return results;
};

module.exports = {
  uploadPhotos: handleUpload(uploadPhotos),
  uploadSinglePhoto: handleUpload(uploadSinglePhoto),
  uploadAvatar: handleUpload(uploadAvatar),
  processUploadedFiles,
  deleteFile,
  deleteFiles,
  generateFilename,
};
