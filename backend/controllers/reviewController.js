// reviewController.js
const { Review, Chef, Booking } = require('../models');
const notify = require('../utils/notify');

exports.createReview = async (req, res) => {
  try {
    const { chefId, bookingId, rating, comment } = req.body;
    const booking = await Booking.findById(bookingId);
    if (!booking || booking.userId.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not authorized' });
    if (booking.status !== 'completed')
      return res.status(400).json({ success: false, message: 'Can only review completed bookings' });
    if (await Review.findOne({ bookingId }))
      return res.status(400).json({ success: false, message: 'Already reviewed this booking' });

    const review = await Review.create({ userId: req.user._id, chefId, bookingId, rating, comment });
    const all = await Review.find({ chefId });
    const avg = all.reduce((s, r) => s + r.rating, 0) / all.length;
    await Chef.findByIdAndUpdate(chefId, { rating: +avg.toFixed(1), totalReviews: all.length });

    // Notify chef
    const chef = await Chef.findById(chefId);
    if (chef) {
      await notify(chef.userId, 'booking_completed',
        '⭐ New Review',
        `${req.user.name} gave you ${rating} stars: "${comment}"`,
        { bookingId, rating }
      );
    }
    res.status(201).json({ success: true, review });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getChefReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ chefId: req.params.chefId })
      .populate('userId', 'name avatar').sort({ createdAt: -1 });
    res.json({ success: true, reviews });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
