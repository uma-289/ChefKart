const express = require('express');
const r = express.Router();
const c = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');
r.post('/create-order', protect, c.createOrder);
r.post('/verify',       protect, c.verifyPayment);
r.get('/my',            protect, c.getMyPayments);
module.exports = r;
