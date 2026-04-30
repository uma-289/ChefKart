// routes/users.js
const express = require('express');
const r = express.Router();
const { User } = require('../models');
const { protect } = require('../middleware/auth');
r.get('/profile', protect, async (req,res) => {
  const user = await User.findById(req.user._id);
  res.json({ success: true, user });
});
r.put('/profile', protect, async (req,res) => {
  const { name, phone, address } = req.body;
  const user = await User.findByIdAndUpdate(req.user._id, { name, phone, address }, { new: true });
  res.json({ success: true, user });
});
module.exports = r;
