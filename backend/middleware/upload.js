/**
 * upload.js — Multer File Upload Middleware
 * ─────────────────────────────────────────────────────────────────
 * Uses multer with TWO storage backends:
 *
 *   LOCAL DEV   → saves to backend/uploads/dishes/ on your computer
 *   PRODUCTION  → uploads to Cloudinary (permanent cloud storage)
 *
 * Which one is used depends on whether CLOUDINARY_CLOUD_NAME
 * is set in your .env file.
 *
 * WHY CLOUDINARY:
 *   Render.com (free tier) deletes local files on every redeploy.
 *   Cloudinary stores images permanently — free up to 25GB.
 *
 * HOW IT WORKS:
 *   1. Chef selects a photo in the dashboard
 *   2. Frontend sends POST /api/chefs/dish-image (multipart/form-data)
 *   3. Multer reads the file + passes it to the storage engine
 *   4. LOCAL:  file saved to uploads/dishes/dish_xxx.jpg
 *      CLOUD:  file uploaded to Cloudinary → returns a permanent URL
 *   5. Controller returns { filename, url } to the frontend
 *   6. Frontend stores url in MongoDB (dish.image field)
 *   7. Image shown via <img src={dish.image} />
 *
 * ─────────────────────────────────────────────────────────────────
 */

const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');

// ── Detect which environment we're in ─────────────────────────────────────────
const useCloudinary = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET &&
  !process.env.CLOUDINARY_CLOUD_NAME.includes('your_')
);

console.log(`📸 Image storage: ${useCloudinary ? '☁️  Cloudinary (production)' : '💾 Local disk (development)'}`);

// ── FILE FILTER — same for both storage types ─────────────────────────────────
const fileFilter = (req, file, cb) => {
  const allowedExt  = ['.jpg', '.jpeg', '.png', '.webp'];
  const allowedMime = ['image/jpeg', 'image/png', 'image/webp'];
  const ext  = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype;

  if (allowedExt.includes(ext) && allowedMime.includes(mime)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPG, PNG, and WEBP image files are allowed'), false);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// OPTION A — CLOUDINARY STORAGE (used when deployed on Render)
// ─────────────────────────────────────────────────────────────────────────────
let upload;

if (useCloudinary) {
  const cloudinary               = require('cloudinary').v2;
  const { CloudinaryStorage }    = require('multer-storage-cloudinary');

  // Configure Cloudinary with your credentials from .env
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  // Cloudinary storage — images go to a "chefkart/dishes" folder in your Cloudinary account
  const storage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder:         'chefkart/dishes',    // folder in your Cloudinary account
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      transformation: [{ width: 800, height: 600, crop: 'limit', quality: 'auto' }],
      // ↑ auto-resize large images to save space
    },
  });

  upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

// ─────────────────────────────────────────────────────────────────────────────
// OPTION B — LOCAL DISK STORAGE (used on your computer during development)
// ─────────────────────────────────────────────────────────────────────────────
} else {
  const uploadDir = path.join(__dirname, '..', 'uploads', 'dishes');

  // Create the folder if it doesn't exist
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log('📁 Created uploads/dishes/ directory');
  }

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename:    (req, file, cb) => {
      const ext       = path.extname(file.originalname).toLowerCase();
      const timestamp = Date.now();
      const random    = Math.round(Math.random() * 1_000_000);
      cb(null, `dish_${timestamp}_${random}${ext}`);
    }
  });

  upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });
}

module.exports = upload;
