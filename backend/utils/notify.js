const { Notification } = require('../models');

const notify = async (userId, type, title, message, meta = {}) => {
  try {
    await Notification.create({ userId, type, title, message, meta });
  } catch (e) {
    console.error('Notification error:', e.message);
  }
};

module.exports = notify;
