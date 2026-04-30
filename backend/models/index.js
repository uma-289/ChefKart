const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

// ─── USER ─────────────────────────────────────────────────────────────────────
const userSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },
  email:    { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, minlength: 6, select: false },
  role:     { type: String, enum: ['user','chef','admin'], default: 'user' },
  phone:    String,
  address:  String,
  avatar:   { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  chefApplicationStatus: { type: String, enum: ['none','pending','approved','rejected'], default: 'none' },
  chefApplicationData:   { type: Object, default: null },
  resetOtp:        String,
  resetOtpExpires: Date,
}, { timestamps: true });

userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});
userSchema.methods.comparePassword = async function(p) { return bcrypt.compare(p, this.password); };
userSchema.methods.toJSON = function() { const o = this.toObject(); delete o.password; delete o.resetOtp; return o; };
const User = mongoose.model('User', userSchema);

// ─── CHEF ──────────────────────────────────────────────────────────────────────
const dishSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  description: String,
  price:       { type: Number, default: 0 },
  prepTime:    String,
  isVeg:       { type: Boolean, default: true },
  image:       { type: String, default: '' }
}, { _id: true });

const chefSchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  bio:         { type: String, default: '' },
  cuisines:    [String],
  specialties: [String],
  dishes:      [dishSchema],
  experience:  { type: Number, default: 0 },
  pricing:     { hourly: { type: Number, default: 500 }, daily: { type: Number, default: 0 } },
  availability: [{
    day:  { type: String, enum: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'] },
    from: String,
    to:   String
  }],
  bookedSlots: [{
    date:      Date,
    timeSlot:  String,
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' }
  }],
  location:     { type: String, default: '' },
  rating:       { type: Number, default: 0 },
  totalReviews: { type: Number, default: 0 },
  isVerified:   { type: Boolean, default: false },
  isAvailable:  { type: Boolean, default: true },
}, { timestamps: true });
const Chef = mongoose.model('Chef', chefSchema);

// ─── BOOKING ───────────────────────────────────────────────────────────────────
const bookingSchema = new mongoose.Schema({
  userId:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  chefId:          { type: mongoose.Schema.Types.ObjectId, ref: 'Chef', required: true },
  date:            { type: Date, required: true },
  timeSlot:        { type: String, required: true },
  duration:        { type: Number, required: true, default: 2 },
  cuisine:         String,
  dishes:          [String],
  specialRequests: String,
  address:         { type: String, required: true },
  status:          { type: String, enum: ['pending','confirmed','rejected','completed','cancelled'], default: 'pending' },
  totalAmount:     { type: Number, required: true },
  paymentStatus:   { type: String, enum: ['pending','paid','refunded'], default: 'pending' },
  paymentId:       String,
  razorpayOrderId: String,
  rejectionReason: String,
  confirmedAt:     Date,
  completedAt:     Date,
}, { timestamps: true });
const Booking = mongoose.model('Booking', bookingSchema);

// ─── REVIEW ───────────────────────────────────────────────────────────────────
const reviewSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  chefId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Chef', required: true },
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, unique: true },
  rating:    { type: Number, required: true, min: 1, max: 5 },
  comment:   { type: String, required: true },
}, { timestamps: true });
const Review = mongoose.model('Review', reviewSchema);

// ─── PAYMENT ──────────────────────────────────────────────────────────────────
const paymentSchema = new mongoose.Schema({
  bookingId:         { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  userId:            { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount:            { type: Number, required: true },
  currency:          { type: String, default: 'INR' },
  status:            { type: String, enum: ['created','paid','failed'], default: 'created' },
  razorpayOrderId:   String,
  razorpayPaymentId: String,
  razorpaySignature: String,
}, { timestamps: true });
const Payment = mongoose.model('Payment', paymentSchema);

// ─── NOTIFICATION ─────────────────────────────────────────────────────────────
const notificationSchema = new mongoose.Schema({
  userId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type:    { type: String, required: true },
  title:   String,
  message: String,
  isRead:  { type: Boolean, default: false },
  meta:    { type: Object, default: {} },
}, { timestamps: true });
const Notification = mongoose.model('Notification', notificationSchema);

module.exports = { User, Chef, Booking, Review, Payment, Notification };
