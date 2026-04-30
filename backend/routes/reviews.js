// routes/reviews.js
const express = require('express');
const r = express.Router();
const c = require('../controllers/reviewController');
const { protect, authorize } = require('../middleware/auth');
r.post('/',                protect, authorize('user'), c.createReview);
r.get('/chef/:chefId',     c.getChefReviews);
module.exports = r;
