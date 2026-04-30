const Razorpay  = require('razorpay');
const crypto    = require('crypto');
const { Booking, Payment } = require('../models');
const notify        = require('../utils/notify');

const getRazorpay = () => new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// ── POST /api/payments/create-order ─────────────────────────────────────────
exports.createOrder = async (req, res) => {
  try {
    const { bookingId } = req.body;
    const booking = await Booking.findById(bookingId)
      .populate({ path: 'chefId', populate: { path: 'userId', select: 'name' } });
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    if (booking.userId.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not your booking' });
    if (booking.status !== 'confirmed')
      return res.status(400).json({ success: false, message: 'Booking must be confirmed by chef before payment' });
    if (booking.paymentStatus === 'paid')
      return res.status(400).json({ success: false, message: 'Already paid' });

    // If Razorpay keys not configured, return mock order
    if (!process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID.includes('your_key')) {
      console.log('\n💳 MOCK PAYMENT ORDER CREATED (Razorpay not configured)');
      console.log(`   Booking: ${bookingId}`);
      console.log(`   Amount:  ₹${booking.totalAmount}`);
      console.log(`   Chef:    ${booking.chefId?.userId?.name}\n`);
      return res.json({
        success: true,
        mock: true,
        order: { id: `mock_order_${Date.now()}`, amount: booking.totalAmount * 100, currency: 'INR' },
        amount: booking.totalAmount,
        key: 'mock_key',
        bookingId
      });
    }

    const razorpay = getRazorpay();
    const order = await razorpay.orders.create({
      amount:   booking.totalAmount * 100,
      currency: 'INR',
      receipt:  bookingId
    });

    booking.razorpayOrderId = order.id;
    await booking.save();

    await Payment.create({ bookingId, userId: req.user._id, amount: booking.totalAmount, razorpayOrderId: order.id });

    res.json({ success: true, order, amount: booking.totalAmount, key: process.env.RAZORPAY_KEY_ID, bookingId });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── POST /api/payments/verify ────────────────────────────────────────────────
exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId, mock } = req.body;

    // Mock payment (when Razorpay not configured)
    if (mock) {
      const booking = await Booking.findByIdAndUpdate(bookingId, { paymentStatus: 'paid', paymentId: `mock_pay_${Date.now()}` }, { new: true });
      console.log(`\n✅ MOCK PAYMENT VERIFIED for booking ${bookingId} — ₹${booking.totalAmount}\n`);
      await notify(req.user._id, 'payment_success', '✅ Payment Confirmed (Test)',
        `Test payment of ₹${booking.totalAmount} processed for your booking.`, { bookingId });
      return res.json({ success: true, message: 'Mock payment verified successfully!' });
    }

    // Real Razorpay verification
    const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`).digest('hex');
    if (expected !== razorpay_signature)
      return res.status(400).json({ success: false, message: 'Payment verification failed — invalid signature' });

    const booking = await Booking.findByIdAndUpdate(bookingId,
      { paymentStatus: 'paid', paymentId: razorpay_payment_id }, { new: true });

    await Payment.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id },
      { status: 'paid', razorpayPaymentId: razorpay_payment_id, razorpaySignature: razorpay_signature }
    );

    await notify(req.user._id, 'payment_success', '✅ Payment Successful!',
      `₹${booking.totalAmount} paid successfully! Razorpay ID: ${razorpay_payment_id}. Your chef will arrive as scheduled.`,
      { bookingId, amount: booking.totalAmount, paymentId: razorpay_payment_id }
    );

    res.json({ success: true, message: 'Payment verified and confirmed!' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── GET /api/payments/my ─────────────────────────────────────────────────────
exports.getMyPayments = async (req, res) => {
  try {
    const payments = await Payment.find({ userId: req.user._id })
      .populate({ path: 'bookingId', populate: { path: 'chefId', populate: { path: 'userId', select: 'name' } } })
      .sort({ createdAt: -1 });
    res.json({ success: true, payments });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
