const { User, Chef, Booking, Payment, Notification } = require('../models/index');
const notify        = require('../utils/notify');
const { sendEmail } = require('../utils/email');

// ── GET /api/admin/stats ────────────────────────────────────────────────────────
exports.getDashboardStats = async (req, res) => {
  try {
    const [totalUsers, totalChefs, totalBookings, pendingBookings, pendingApplications] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      User.countDocuments({ role: 'chef' }),
      Booking.countDocuments(),
      Booking.countDocuments({ status: 'pending' }),
      User.countDocuments({ chefApplicationStatus: 'pending' })
    ]);
    const revenue = await Booking.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const recentBookings = await Booking.find()
      .populate('userId', 'name email')
      .populate({ path: 'chefId', populate: { path: 'userId', select: 'name' } })
      .sort({ createdAt: -1 }).limit(8);

    res.json({ success: true, stats: { totalUsers, totalChefs, totalBookings, pendingBookings, pendingApplications, totalRevenue: revenue[0]?.total || 0 }, recentBookings });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── GET /api/admin/applications ─────────────────────────────────────────────────
exports.getChefApplications = async (req, res) => {
  try {
    const apps = await User.find({ chefApplicationStatus: 'pending' }).sort({ createdAt: -1 });
    res.json({ success: true, applications: apps });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── PUT /api/admin/applications/:id/approve ─────────────────────────────────────
exports.approveChefApplication = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('+password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.chefApplicationStatus !== 'pending')
      return res.status(400).json({ success: false, message: 'No pending application' });

    // The plain password is NOT stored — generate a fresh temp password
    const tempPassword = `Chef@${Math.floor(1000 + Math.random() * 9000)}`;
    user.role                  = 'chef';
    user.chefApplicationStatus = 'approved';
    user.password              = tempPassword; // will be hashed by pre-save
    await user.save();

    // Create chef profile from application data
    const app = user.chefApplicationData || {};
    await Chef.create({
      userId:      user._id,
      bio:         app.bio || '',
      cuisines:    app.cuisines || [],
      specialties: app.specialties || [],
      experience:  app.experience || 0,
      pricing:     { hourly: app.hourlyRate || 500 },
      location:    app.location || '',
      isVerified:  true,
      isAvailable: true,
      availability: ['Mon','Tue','Wed','Thu','Fri'].map(day => ({ day, from: '09:00', to: '18:00' }))
    });

    // Email with new credentials
    await sendEmail(user.email, 'chefApplicationApproved', user.name, user.email, tempPassword);

    await notify(user._id, 'chef_application',
      '🎉 Application Approved!',
      `Congratulations! Your chef application is approved. Check your email for login credentials.`,
      { approved: true }
    );

    res.json({ success: true, message: `${user.name} approved. Login credentials sent to ${user.email}` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── PUT /api/admin/applications/:id/reject ──────────────────────────────────────
exports.rejectChefApplication = async (req, res) => {
  try {
    const { reason } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.chefApplicationStatus = 'rejected';
    await user.save();

    await notify(user._id, 'chef_application',
      '❌ Application Declined',
      `Your chef application was not approved. Reason: ${reason || 'Does not meet current requirements'}. You may reapply after improving your profile.`,
      { approved: false, reason }
    );
    res.json({ success: true, message: 'Application rejected and applicant notified' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── GET /api/admin/users ─────────────────────────────────────────────────────────
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ role: 'user' }).sort({ createdAt: -1 });
    res.json({ success: true, users });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── PUT /api/admin/users/:id/toggle ─────────────────────────────────────────────
exports.toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.isActive = !user.isActive;
    await user.save();
    res.json({ success: true, user, message: `User ${user.isActive ? 'unblocked' : 'blocked'} successfully` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── GET /api/admin/chefs ─────────────────────────────────────────────────────────
exports.getAllChefs = async (req, res) => {
  try {
    const chefs = await Chef.find().populate('userId', 'name email phone isActive createdAt').sort({ createdAt: -1 });
    res.json({ success: true, chefs });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── DELETE /api/admin/chefs/:id ──────────────────────────────────────────────────
exports.removeChef = async (req, res) => {
  try {
    const chef = await Chef.findById(req.params.id);
    if (!chef) return res.status(404).json({ success: false, message: 'Chef not found' });

    await Booking.updateMany(
      { chefId: chef._id, status: { $in: ['pending','confirmed'] } },
      { status: 'cancelled' }
    );

    const chefUser = await User.findById(chef.userId);
    if (chefUser) {
      chefUser.role = 'user';
      chefUser.chefApplicationStatus = 'rejected';
      await chefUser.save();
      await notify(chefUser._id, 'chef_application', 'Chef Profile Removed',
        'Your chef profile has been removed from ChefKart by the admin. Contact support if you believe this is an error.', {});
    }

    await Chef.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Chef removed successfully' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── PUT /api/admin/chefs/:id/toggle ─────────────────────────────────────────────
exports.toggleChefStatus = async (req, res) => {
  try {
    const chef = await Chef.findById(req.params.id);
    if (!chef) return res.status(404).json({ success: false, message: 'Chef not found' });
    chef.isAvailable = !chef.isAvailable;
    await chef.save();
    const u = await User.findById(chef.userId);
    if (u) { u.isActive = chef.isAvailable; await u.save(); }
    res.json({ success: true, chef });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── GET /api/admin/bookings ──────────────────────────────────────────────────────
exports.getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('userId', 'name email phone')
      .populate({ path: 'chefId', populate: { path: 'userId', select: 'name' } })
      .sort({ createdAt: -1 });
    res.json({ success: true, bookings });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── GET /api/admin/payments ──────────────────────────────────────────────────────
exports.getAllPayments = async (req, res) => {
  try {
    const payments = await Payment.find()
      .populate('userId', 'name email')
      .populate('bookingId')
      .sort({ createdAt: -1 });
    res.json({ success: true, payments });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
