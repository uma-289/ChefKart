const express = require('express');
const r = express.Router();
const c = require('../controllers/bookingController');
const { protect, authorize } = require('../middleware/auth');
r.post('/',              protect, authorize('user'), c.createBooking);
r.get('/my',             protect, c.getMyBookings);
r.get('/chef',           protect, authorize('chef'), c.getChefBookings);
r.get('/slots',          c.getBookedSlots);  // public: ?chefId=&date=
r.put('/:id/status',     protect, authorize('chef','admin'), c.updateBookingStatus);
r.put('/:id/cancel',     protect, c.cancelBooking);
module.exports = r;
