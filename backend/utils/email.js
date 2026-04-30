/**
 * ChefKart Email Utility
 * ──────────────────────────────────────────────────────────────
 * Uses Gmail SMTP — 100% FREE, no paid service needed.
 * Works both locally and on deployed Render server.
 *
 * If Gmail not configured → OTPs and emails are printed to
 * the terminal/server logs (visible in Render dashboard logs).
 *
 * Setup (one-time, takes 2 minutes):
 *   1. Enable 2FA on your Gmail account
 *   2. Go to: myaccount.google.com/apppasswords
 *   3. Create App Password → name it "ChefKart"
 *   4. Copy the 16-character password
 *   5. Add to .env:
 *        EMAIL_USER=your@gmail.com
 *        EMAIL_PASS=abcd efgh ijkl mnop   (the 16-char password)
 * ──────────────────────────────────────────────────────────────
 */

const nodemailer = require('nodemailer');

// ── Build transporter (Gmail or null for terminal-only mode) ──────────────────
const getTransporter = () => {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  // Check if real credentials are provided
  if (
    user && pass &&
    user.includes('@') &&
    !pass.includes('your_') &&
    pass.length > 8
  ) {
    return nodemailer.createTransport({
      host:   'smtp.gmail.com',
      port:   587,
      secure: false,
      auth:   { user, pass },
      tls:    { rejectUnauthorized: false }
    });
  }

  return null; // terminal-only mode
};

// ── HTML email templates ───────────────────────────────────────────────────────
const templates = {

  welcome: (name, role, email, password) => ({
    subject: `🍳 Welcome to ChefKart, ${name}!`,
    html: `
<div style="font-family:Arial,sans-serif;max-width:540px;margin:0 auto;border-radius:14px;overflow:hidden;border:1px solid #e0e0e0">
  <div style="background:linear-gradient(135deg,#1B5E20,#2E7D32);padding:28px;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:1.8rem">🍳 ChefKart</h1>
    <p style="color:rgba(255,255,255,.8);margin:6px 0 0;font-size:.9rem">Home Chef Booking Platform</p>
  </div>
  <div style="padding:32px;background:#fff">
    <h2 style="color:#1A1A2E;margin-top:0">Welcome, ${name}! 🎉</h2>
    <p style="color:#555;line-height:1.7">Your ChefKart account is ready. Here are your login details:</p>
    <div style="background:#F1F8E9;border:1px solid #A5D6A7;border-radius:10px;padding:18px;margin:18px 0">
      <div style="margin-bottom:8px"><strong style="color:#555">Role:</strong> <span style="color:#2E7D32;font-weight:700;text-transform:capitalize">${role}</span></div>
      <div style="margin-bottom:8px"><strong style="color:#555">Email:</strong> <span style="color:#333">${email}</span></div>
      <div><strong style="color:#555">Password:</strong> <code style="background:#fff;padding:3px 8px;border-radius:5px;border:1px solid #ddd;font-size:1rem">${password}</code></div>
    </div>
    <p style="color:#E65100;font-size:.85rem;font-weight:600">⚠️ Please change your password after your first login.</p>
    <div style="text-align:center;margin-top:24px">
      <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/login"
         style="background:#2E7D32;color:#fff;padding:13px 30px;border-radius:10px;text-decoration:none;font-weight:700;font-size:.95rem">
        Login to ChefKart →
      </a>
    </div>
  </div>
  <div style="background:#f5f5f5;padding:14px;text-align:center;color:#999;font-size:.78rem">
    © ${new Date().getFullYear()} ChefKart · Home Chef Booking Platform
  </div>
</div>`
  }),

  passwordReset: (name, otp) => ({
    subject: '🔐 Your ChefKart Password Reset OTP',
    html: `
<div style="font-family:Arial,sans-serif;max-width:540px;margin:0 auto;border-radius:14px;overflow:hidden;border:1px solid #e0e0e0">
  <div style="background:linear-gradient(135deg,#1B5E20,#2E7D32);padding:28px;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:1.8rem">🔐 Password Reset</h1>
    <p style="color:rgba(255,255,255,.8);margin:6px 0 0">ChefKart Security</p>
  </div>
  <div style="padding:32px;background:#fff">
    <p style="color:#333;font-size:1rem">Hi <strong>${name}</strong>,</p>
    <p style="color:#555;line-height:1.7">We received a password reset request for your ChefKart account. Use the OTP below:</p>
    <div style="text-align:center;margin:28px 0">
      <div style="display:inline-block;background:#1B5E20;color:#fff;font-size:2.4rem;font-weight:700;padding:16px 36px;border-radius:12px;letter-spacing:12px;font-family:monospace">
        ${otp}
      </div>
    </div>
    <div style="background:#FFF8E1;border:1px solid #FFE082;border-radius:9px;padding:12px 16px;font-size:.85rem;color:#6D4C41">
      ⏱️ This OTP expires in <strong>10 minutes</strong>.<br>
      🔒 If you didn't request this, you can safely ignore this email.
    </div>
  </div>
  <div style="background:#f5f5f5;padding:14px;text-align:center;color:#999;font-size:.78rem">
    © ${new Date().getFullYear()} ChefKart · Do not reply to this email
  </div>
</div>`
  }),

  bookingConfirmed: (userName, chefName, date, timeSlot, amount) => ({
    subject: `✅ Booking Confirmed — Chef ${chefName}`,
    html: `
<div style="font-family:Arial,sans-serif;max-width:540px;margin:0 auto;border-radius:14px;overflow:hidden;border:1px solid #e0e0e0">
  <div style="background:#2E7D32;padding:24px;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:1.5rem">✅ Booking Confirmed!</h1>
  </div>
  <div style="padding:28px;background:#fff">
    <p>Hi <strong>${userName}</strong>,</p>
    <p style="color:#555">Great news! <strong>Chef ${chefName}</strong> has accepted your booking.</p>
    <div style="background:#E8F5E9;border-radius:10px;padding:18px;margin:18px 0">
      <div style="margin-bottom:7px">📅 <strong>Date:</strong> ${date}</div>
      <div style="margin-bottom:7px">🕐 <strong>Time:</strong> ${timeSlot}</div>
      <div>💰 <strong>Amount:</strong> ₹${amount}</div>
    </div>
    <p style="color:#E65100;font-weight:600;font-size:.9rem">⚡ Complete your payment to secure the slot!</p>
    <div style="text-align:center;margin-top:22px">
      <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/dashboard"
         style="background:#F57C00;color:#fff;padding:13px 28px;border-radius:10px;text-decoration:none;font-weight:700">
        Go to Dashboard & Pay →
      </a>
    </div>
  </div>
  <div style="background:#f5f5f5;padding:14px;text-align:center;color:#999;font-size:.78rem">
    © ${new Date().getFullYear()} ChefKart
  </div>
</div>`
  }),

  chefApplicationApproved: (name, email, password) => ({
    subject: '🎉 Your Chef Application is Approved — ChefKart',
    html: `
<div style="font-family:Arial,sans-serif;max-width:540px;margin:0 auto;border-radius:14px;overflow:hidden;border:1px solid #e0e0e0">
  <div style="background:linear-gradient(135deg,#E65100,#F57C00);padding:28px;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:1.8rem">🎉 You're Approved!</h1>
    <p style="color:rgba(255,255,255,.85);margin:6px 0 0">Welcome to the ChefKart Family</p>
  </div>
  <div style="padding:32px;background:#fff">
    <h2 style="margin-top:0;color:#1A1A2E">Congratulations, ${name}!</h2>
    <p style="color:#555;line-height:1.7">Your chef application has been <strong style="color:#2E7D32">approved</strong> by our admin team. Here are your login credentials:</p>
    <div style="background:#FFF3E0;border:1px solid #FFCC80;border-radius:10px;padding:18px;margin:18px 0">
      <div style="margin-bottom:8px"><strong style="color:#555">Email:</strong> <span style="color:#333">${email}</span></div>
      <div><strong style="color:#555">Password:</strong> <code style="background:#fff;padding:3px 8px;border-radius:5px;border:1px solid #ddd;font-size:1rem">${password}</code></div>
    </div>
    <p style="color:#E65100;font-size:.85rem;font-weight:600">⚠️ Change your password immediately after logging in!</p>
    <p style="color:#555;font-size:.88rem;margin-top:16px"><strong>Next steps after login:</strong></p>
    <ol style="color:#555;font-size:.87rem;line-height:2">
      <li>Complete your profile (bio, specialties, availability)</li>
      <li>Add your signature dishes with photos and prices</li>
      <li>Set your weekly schedule</li>
      <li>Start receiving booking requests!</li>
    </ol>
    <div style="text-align:center;margin-top:24px">
      <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/login"
         style="background:#2E7D32;color:#fff;padding:13px 30px;border-radius:10px;text-decoration:none;font-weight:700">
        Login as Chef →
      </a>
    </div>
  </div>
  <div style="background:#f5f5f5;padding:14px;text-align:center;color:#999;font-size:.78rem">
    © ${new Date().getFullYear()} ChefKart
  </div>
</div>`
  })

};

// ── Main sendEmail function ────────────────────────────────────────────────────
const sendEmail = async (to, templateName, ...args) => {
  const tmpl   = templates[templateName](...args);
  const from   = process.env.EMAIL_FROM || `ChefKart <${process.env.EMAIL_USER || 'noreply@chefkart.com'}>`;

  // ── Always log to console (visible in terminal locally + Render logs) ───────
  console.log('\n' + '═'.repeat(62));
  console.log('📧  EMAIL TRIGGERED');
  console.log('═'.repeat(62));
  console.log(`  TO      : ${to}`);
  console.log(`  SUBJECT : ${tmpl.subject}`);
  console.log(`  TYPE    : ${templateName}`);
  console.log(`  TIME    : ${new Date().toLocaleString('en-IN')}`);

  // Extract OTP from subject/args if it's a reset email — show in logs
  if (templateName === 'passwordReset' && args[1]) {
    console.log(`  OTP     : ${args[1]}   ← USE THIS if email not received`);
  }
  // Show temp password for chef approval
  if (templateName === 'chefApplicationApproved' && args[2]) {
    console.log(`  PASSWORD: ${args[2]}   ← Chef's login password`);
  }
  console.log('═'.repeat(62) + '\n');

  // ── Try sending via Gmail SMTP ────────────────────────────────────────────
  const transporter = getTransporter();

  if (!transporter) {
    console.log('  ℹ️  Gmail SMTP not configured.');
    console.log('  ℹ️  Email content shown above in terminal/Render logs.');
    console.log('  ℹ️  To enable real emails: see EMAIL SETUP in COMPLETE_GUIDE.md\n');
    return;
  }

  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject: tmpl.subject,
      html:    tmpl.html
    });
    console.log(`  ✅ Email sent successfully! Message ID: ${info.messageId}\n`);
  } catch (err) {
    // Don't crash the app if email fails — just log it
    console.error(`  ❌ Email sending failed: ${err.message}`);
    console.log('  ℹ️  The OTP/password above is still valid — user can use it.\n');
  }
};

module.exports = { sendEmail };
