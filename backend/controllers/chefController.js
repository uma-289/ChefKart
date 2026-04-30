const { Chef, User, Review } = require('../models/index');
const path = require('path');
const fs   = require('fs');

// ── GET /api/chefs  — list all chefs with filters ────────────────────────────
exports.getAllChefs = async (req, res) => {
  try {
    const { cuisine, minRating, maxPrice, location, search, page = 1, limit = 9 } = req.query;
    let chefQuery = {};
    if (cuisine)   chefQuery.cuisines            = { $in: [new RegExp(cuisine, 'i')] };
    if (minRating) chefQuery.rating              = { $gte: parseFloat(minRating) };
    if (maxPrice)  chefQuery['pricing.hourly']   = { $lte: parseFloat(maxPrice) };
    if (location)  chefQuery.location            = new RegExp(location, 'i');

    if (search) {
      const users = await User.find({ name: new RegExp(search, 'i'), role: 'chef' }).select('_id');
      chefQuery.userId = { $in: users.map(u => u._id) };
    }

    const total = await Chef.countDocuments(chefQuery);
    const chefs = await Chef.find(chefQuery)
      .populate('userId', 'name avatar email phone isActive')
      .skip((page - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .sort({ rating: -1, createdAt: -1 });

    // Only return chefs whose user account is still active
    const activeChefs = chefs.filter(c => c.userId?.isActive !== false);

    res.json({
      success: true,
      chefs: activeChefs,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/chefs/:id  — single chef profile ─────────────────────────────────
exports.getChefById = async (req, res) => {
  try {
    const chef = await Chef.findById(req.params.id)
      .populate('userId', 'name avatar email phone');
    if (!chef) return res.status(404).json({ success: false, message: 'Chef not found' });

    const reviews = await Review.find({ chefId: chef._id })
      .populate('userId', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({ success: true, chef, reviews });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/chefs/profile/me  — logged-in chef's own profile ────────────────
exports.getMyChefProfile = async (req, res) => {
  try {
    const chef = await Chef.findOne({ userId: req.user._id })
      .populate('userId', 'name avatar email phone');
    if (!chef) return res.status(404).json({ success: false, message: 'Chef profile not found' });
    res.json({ success: true, chef });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── PUT /api/chefs/profile  — update chef profile fields ─────────────────────
exports.updateChefProfile = async (req, res) => {
  try {
    let chef = await Chef.findOne({ userId: req.user._id });
    if (!chef) chef = new Chef({ userId: req.user._id });

    const allowed = [
      'bio', 'cuisines', 'specialties', 'dishes',
      'experience', 'pricing', 'availability',
      'location', 'isAvailable'
    ];
    allowed.forEach(key => {
      if (req.body[key] !== undefined) chef[key] = req.body[key];
    });

    await chef.save();
    res.json({ success: true, chef });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/chefs/dish-image  — upload one dish photo via Multer ────────────
// LOCAL DEV:  file saved to uploads/dishes/ → req.file.filename = "dish_xxx.jpg"
// PRODUCTION: file uploaded to Cloudinary  → req.file.path = "https://res.cloudinary.com/..."
// Frontend stores the URL in dish.image field in MongoDB
// Image shown with: <img src={dish.image} />
exports.uploadDishImage = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No image file uploaded' });
  }

  // Cloudinary returns full URL in req.file.path
  // Local disk returns just filename in req.file.filename
  const isCloudinary = !!(req.file.path && req.file.path.startsWith('http'));

  // For local: build full URL to the static file served by Express
  // Uses PORT env var (default 5000) — NOT CLIENT_URL which is the frontend port
  const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
  const url      = isCloudinary
    ? req.file.path                                     // https://res.cloudinary.com/...
    : `${backendUrl}/uploads/dishes/${req.file.filename}`;

  const filename = isCloudinary
    ? req.file.path   // store full URL when using Cloudinary
    : req.file.filename;

  console.log(`📸 Dish image uploaded (${isCloudinary ? 'Cloudinary' : 'local'}): ${filename}`);

  res.json({
    success:  true,
    filename,   // stored in MongoDB dish.image — either filename or full Cloudinary URL
    url,        // full URL to display the image
    originalName: req.file.originalname,
  });
};

// ── DELETE /api/chefs/dish-image/:filename  — delete a dish photo ────────────
exports.deleteDishImage = (req, res) => {
  try {
    const { filename } = req.params;
    // Security: prevent path traversal attacks
    if (filename.includes('/') || filename.includes('..')) {
      return res.status(400).json({ success: false, message: 'Invalid filename' });
    }

    const filepath = path.join(__dirname, '..', 'uploads', 'dishes', filename);

    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      console.log(`🗑️  Dish image deleted: ${filename}`);
      res.json({ success: true, message: 'Image deleted' });
    } else {
      res.status(404).json({ success: false, message: 'Image not found' });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
