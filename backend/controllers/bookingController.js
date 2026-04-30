const { Booking, Chef, User } = require('../models/index');
const notify        = require('../utils/notify');
const { sendEmail } = require('../utils/email');

// ── POST /api/bookings ────────────────────────────────────────────────────────
exports.createBooking = async (req, res) => {
  try {
    const { chefId, date, timeSlot, duration, cuisine, dishes, specialRequests, address } = req.body;

    const chef = await Chef.findById(chefId).populate('userId', 'name email');
    if (!chef) return res.status(404).json({ success: false, message: 'Chef not found' });
    if (!chef.isAvailable)
      return res.status(400).json({ success: false, message: 'This chef is not accepting bookings right now' });

    // Conflict check
    const conflict = await Booking.findOne({
      chefId, date: new Date(date), timeSlot, status: { $in: ['pending','confirmed'] }
    });
    if (conflict)
      return res.status(409).json({
        success: false,
        message: `Chef is already booked at ${timeSlot} on ${new Date(date).toLocaleDateString('en-IN')}. Please choose a different time slot.`
      });

    const totalAmount = chef.pricing.hourly * (duration || 2);
    const booking = await Booking.create({
      userId: req.user._id, chefId, date: new Date(date),
      timeSlot, duration: duration || 2, cuisine, dishes: dishes || [],
      specialRequests, address, totalAmount
    });

    // Block this slot
    chef.bookedSlots.push({ date: new Date(date), timeSlot, bookingId: booking._id });
    await chef.save();

    await booking.populate([
      { path: 'chefId', populate: { path: 'userId', select: 'name avatar email' } },
      { path: 'userId', select: 'name email phone' }
    ]);

    // Notify chef
    const chefDate = new Date(date).toLocaleDateString('en-IN');
    await notify(chef.userId._id, 'booking_request',
      `📅 New Booking from ${req.user.name}`,
      `${req.user.name} wants you on ${chefDate} at ${timeSlot} for ${duration}h. Cuisine: ${cuisine || 'Not specified'}. Amount: ₹${totalAmount}. Accept or decline from your dashboard.`,
      { bookingId: booking._id, userName: req.user.name, date, timeSlot, amount: totalAmount }
    );

    res.status(201).json({ success: true, booking });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/bookings/my ─────────────────────────────────────────────────────
exports.getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.user._id })
      .populate({ path: 'chefId', populate: { path: 'userId', select: 'name avatar phone email' } })
      .sort({ createdAt: -1 });
    res.json({ success: true, bookings });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── GET /api/bookings/chef ───────────────────────────────────────────────────
exports.getChefBookings = async (req, res) => {
  try {
    const chef = await Chef.findOne({ userId: req.user._id });
    if (!chef) return res.status(404).json({ success: false, message: 'Chef profile not found' });
    const bookings = await Booking.find({ chefId: chef._id })
      .populate('userId', 'name email phone avatar address')
      .sort({ createdAt: -1 });
    res.json({ success: true, bookings });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── GET /api/bookings/slots?chefId=&date= ────────────────────────────────────
exports.getBookedSlots = async (req, res) => {
  try {
    const { chefId, date } = req.query;
    const bookings = await Booking.find({
      chefId, date: new Date(date), status: { $in: ['pending','confirmed'] }
    }).select('timeSlot');
    res.json({ success: true, bookedSlots: bookings.map(b => b.timeSlot) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── PUT /api/bookings/:id/status ─────────────────────────────────────────────
exports.updateBookingStatus = async (req, res) => {
  try {
    const { status, rejectionReason } = req.body;
    const booking = await Booking.findById(req.params.id)
      .populate('userId', 'name email')
      .populate({ path: 'chefId', populate: { path: 'userId', select: 'name email' } });
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    const chef = await Chef.findOne({ userId: req.user._id });
    if (req.user.role === 'chef' && (!chef || !chef._id.equals(booking.chefId._id)))
      return res.status(403).json({ success: false, message: 'Not authorized to update this booking' });

    booking.status = status;
    if (status === 'confirmed') booking.confirmedAt = new Date();
    if (status === 'completed') booking.completedAt = new Date();
    if (status === 'rejected') {
      booking.rejectionReason = rejectionReason || 'Chef is unavailable';
      await Chef.findByIdAndUpdate(booking.chefId._id, {
        $pull: { bookedSlots: { bookingId: booking._id } }
      });
    }
    await booking.save();

    const chefName  = booking.chefId.userId?.name || 'Chef';
    const userName  = booking.userId?.name || 'Customer';
    const bookDate  = new Date(booking.date).toLocaleDateString('en-IN');
    const userEmail = booking.userId?.email;

    if (status === 'confirmed') {
      // Email user
      if (userEmail) await sendEmail(userEmail, 'bookingConfirmed', userName, chefName, bookDate, booking.timeSlot, booking.totalAmount);
      await notify(booking.userId._id, 'booking_confirmed',
        '✅ Booking Confirmed!',
        `${chefName} confirmed your booking on ${bookDate} at ${booking.timeSlot}. Please complete payment of ₹${booking.totalAmount} from your dashboard.`,
        { bookingId: booking._id, chefName, amount: booking.totalAmount }
      );
    } else if (status === 'rejected') {
      await notify(booking.userId._id, 'booking_rejected',
        '❌ Booking Declined',
        `${chefName} declined your request for ${bookDate} at ${booking.timeSlot}. Reason: ${rejectionReason || 'Unavailable'}. The slot is now free — you can book another chef.`,
        { bookingId: booking._id, chefName, reason: rejectionReason }
      );
    } else if (status === 'completed') {
      await notify(booking.userId._id, 'booking_completed',
        '🎉 Service Completed!',
        `Your session with ${chefName} is complete. Hope you enjoyed the meal! Please leave a review from your dashboard.`,
        { bookingId: booking._id, chefName }
      );
    }

    res.json({ success: true, booking });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── PUT /api/bookings/:id/cancel ─────────────────────────────────────────────
exports.cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate({ path: 'chefId', populate: { path: 'userId', select: 'name _id' } });
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    if (booking.userId.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not your booking' });
    if (['completed','cancelled'].includes(booking.status))
      return res.status(400).json({ success: false, message: `Cannot cancel a ${booking.status} booking` });

    booking.status = 'cancelled';
    await booking.save();

    await Chef.findByIdAndUpdate(booking.chefId._id, {
      $pull: { bookedSlots: { bookingId: booking._id } }
    });

    const chefUserId = booking.chefId?.userId?._id;
    if (chefUserId) {
      await notify(chefUserId, 'booking_request',
        '🚫 Booking Cancelled',
        `${req.user.name} cancelled their booking for ${new Date(booking.date).toLocaleDateString('en-IN')} at ${booking.timeSlot}. That slot is now available.`,
        { bookingId: booking._id }
      );
    }
    res.json({ success: true, message: 'Booking cancelled successfully' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
