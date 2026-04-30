const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { User, Chef } = require('../models/index');
const notify = require('../utils/notify');
const { sendEmail } = require('../utils/email');

const signToken = id => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });

// ── POST /api/auth/register ────────────────────────────────────────────────────
exports.register = async (req, res) => {
  try {
    console.log("REGISTER BODY:", req.body);

    const { name, email, password, role, phone, chefApplication } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "All fields required" });
    }

    if (await User.findOne({ email }))
      return res.status(400).json({ success: false, message: 'Email already registered' });

    const isChefApply = role === 'chef';
    const actualRole = isChefApply ? 'user' : (role || 'user');
    const appStatus = isChefApply ? 'pending' : 'none';

    const user = await User.create({
      name, email, password, phone,
      role: actualRole,
      chefApplicationStatus: appStatus,
      chefApplicationData: isChefApply ? (chefApplication || {}) : null
    });

    if (process.env.EMAIL_USER) {
      sendEmail(email, 'welcome', name, isChefApply ? 'chef applicant' : actualRole, email, password)
        .catch(() => console.log("Email failed"));
    }

    if (isChefApply) {
      const admins = await User.find({ role: 'admin' });
      admins.forEach(admin => {
        notify(
          admin._id,
          'chef_application',
          `📝 New Chef Application from ${name}`,
          `${name} (${email}) applied`,
          { applicantId: user._id, applicantEmail: email, ...(chefApplication || {}) }
        ).catch(() => { });
      });

      return res.status(201).json({
        success: true,
        applicationPending: true,
        token: signToken(user._id),
        user
      });
    }

    res.status(201).json({ success: true, token: signToken(user._id), user });

  } catch (err) {
    console.error(err); // VERY IMPORTANT
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/auth/login ────────────────────────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Email and password required' });

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    if (!user.isActive)
      return res.status(403).json({ success: false, message: 'Account has been deactivated by admin' });

    let chefProfile = null;
    if (user.role === 'chef') chefProfile = await Chef.findOne({ userId: user._id });

    res.json({
      success: true, token: signToken(user._id), user, chefProfile,
      applicationPending: user.chefApplicationStatus === 'pending'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/auth/me ────────────────────────────────────────────────────────────
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    let chefProfile = null;
    if (user.role === 'chef') chefProfile = await Chef.findOne({ userId: user._id });
    res.json({ success: true, user, chefProfile, applicationPending: user.chefApplicationStatus === 'pending' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/auth/forgot-password ─────────────────────────────────────────────
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: 'No account found with this email' });

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetOtp = await require('bcryptjs').hash(otp, 8);
    user.resetOtpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
    await user.save({ validateBeforeSave: false });

    await sendEmail(email, 'passwordReset', user.name, otp);

    res.json({ success: true, message: `OTP sent to ${email}. Check your email (or terminal if SMTP not configured).` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/auth/reset-password ──────────────────────────────────────────────
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword)
      return res.status(400).json({ success: false, message: 'Email, OTP and new password required' });
    if (newPassword.length < 6)
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });

    const user = await User.findOne({ email }).select('+resetOtp +resetOtpExpires');
    if (!user || !user.resetOtp)
      return res.status(400).json({ success: false, message: 'No reset request found. Please request OTP again.' });
    if (user.resetOtpExpires < new Date())
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });

    const valid = await require('bcryptjs').compare(otp, user.resetOtp);
    if (!valid) return res.status(400).json({ success: false, message: 'Invalid OTP' });

    user.password = newPassword;
    user.resetOtp = undefined;
    user.resetOtpExpires = undefined;
    await user.save();

    res.json({ success: true, message: 'Password reset successfully! You can now login.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── PUT /api/auth/updatepassword ────────────────────────────────────────────────
exports.updatePassword = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('+password');
    if (!(await user.comparePassword(req.body.currentPassword)))
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    user.password = req.body.newPassword;
    await user.save();
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
