const express  = require('express');
const r        = express.Router();
const c        = require('../controllers/chefController');
const { protect, authorize } = require('../middleware/auth');
const upload   = require('../middleware/upload');

r.get('/',           c.getAllChefs);
r.get('/profile/me', protect, authorize('chef'), c.getMyChefProfile);
r.put('/profile',    protect, authorize('chef'), c.updateChefProfile);

// Upload dish image: POST /api/chefs/dish-image (form-data field: image)
r.post('/dish-image', protect, authorize('chef'), upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
  // Cloudinary storage sets req.file.path to the permanent CDN URL.
  // Local disk storage uses req.file.filename, so we build the relative URL.
  const url = req.file.path || `/uploads/dishes/${req.file.filename}`;
  res.json({ success: true, filename: req.file.filename || req.file.originalname, url });
});

r.get('/:id',        c.getChefById);
module.exports = r;
