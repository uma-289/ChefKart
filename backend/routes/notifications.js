const express = require('express');
const r = express.Router();
const { Notification } = require('../models');
const { protect } = require('../middleware/auth');

r.get('/', protect, async (req, res) => {
  const notifs = await Notification.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(30);
  const unread  = await Notification.countDocuments({ userId: req.user._id, isRead: false });
  res.json({ success: true, notifications: notifs, unread });
});

r.put('/read-all', protect, async (req, res) => {
  await Notification.updateMany({ userId: req.user._id, isRead: false }, { isRead: true });
  res.json({ success: true });
});

r.put('/:id/read', protect, async (req, res) => {
  await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
  res.json({ success: true });
});

module.exports = r;
