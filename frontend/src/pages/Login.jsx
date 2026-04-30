import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

// ─── FORGOT PASSWORD MODAL ────────────────────────────────────────────────────
function ForgotModal({ onClose }) {
  const [step, setStep]     = useState(1); // 1=email, 2=otp+newpass
  const [email, setEmail]   = useState('');
  const [otp, setOtp]       = useState('');
  const [pass, setPass]     = useState('');
  const [loading, setLoading] = useState(false);

  const sendOtp = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await authAPI.forgotPassword({ email });
      toast.success(r.data.message);
      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send OTP');
    } finally { setLoading(false); }
  };

  const resetPass = async e => {
    e.preventDefault();
    if (pass.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      await authAPI.resetPassword({ email, otp, newPassword: pass });
      toast.success('Password reset successfully! Please login.');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid OTP or expired');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', padding:20, backdropFilter:'blur(4px)' }} onClick={onClose}>
      <div style={{ background:'#fff', borderRadius:18, padding:36, width:'100%', maxWidth:420, boxShadow:'0 20px 60px rgba(0,0,0,.2)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <h3 style={{ fontFamily:'var(--fd)', fontSize:'1.3rem' }}>
            {step === 1 ? '🔐 Forgot Password' : '✉️ Enter OTP'}
          </h3>
          <button onClick={onClose} style={{ background:'var(--g100)', border:'none', width:34, height:34, borderRadius:'50%', cursor:'pointer', fontSize:'1.1rem' }}>✕</button>
        </div>

        {step === 1 ? (
          <form onSubmit={sendOtp}>
            <p style={{ color:'var(--muted)', fontSize:'.88rem', marginBottom:20, lineHeight:1.6 }}>
              Enter your registered email. We'll send a 6-digit OTP to reset your password.
              <br/><span style={{ color:'var(--orange)', fontWeight:600 }}>📺 Check your terminal</span> if you haven't configured SMTP email — the OTP will be printed there.
            </p>
            <div className="form-group">
              <label>Email Address</label>
              <input type="email" className="fc" required placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} autoFocus />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width:'100%', justifyContent:'center' }} disabled={loading}>
              {loading ? 'Sending OTP...' : 'Send OTP →'}
            </button>
          </form>
        ) : (
          <form onSubmit={resetPass}>
            <div style={{ background:'var(--green-p)', border:'1px solid var(--green-l)', borderRadius:10, padding:'12px 16px', marginBottom:20, fontSize:'.85rem', color:'var(--green-d)' }}>
              <strong>OTP sent to {email}</strong><br/>
              If SMTP is not configured, check the <strong>backend terminal</strong> for the 6-digit OTP.
            </div>
            <div className="form-group">
              <label>6-Digit OTP</label>
              <input className="fc" required placeholder="123456" maxLength={6} value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g,''))} style={{ fontSize:'1.4rem', letterSpacing:6, textAlign:'center' }} autoFocus />
            </div>
            <div className="form-group">
              <label>New Password</label>
              <input type="password" className="fc" required placeholder="Min 6 characters" value={pass} onChange={e => setPass(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width:'100%', justifyContent:'center' }} disabled={loading}>
              {loading ? 'Resetting...' : 'Reset Password →'}
            </button>
            <button type="button" onClick={() => setStep(1)} style={{ width:'100%', marginTop:10, background:'none', border:'none', color:'var(--green)', fontWeight:600, fontSize:'.86rem', cursor:'pointer', textDecoration:'underline' }}>
              ← Send OTP to different email
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── MAIN LOGIN PAGE ──────────────────────────────────────────────────────────
export default function Login() {
  const [form, setForm]     = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const { login } = useAuth();
  const nav = useNavigate();

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await login(form.email, form.password);
      toast.success(`Welcome back, ${data.user.name}! 👋`);
      if (data.applicationPending) { nav('/pending'); return; }
      if (data.user.role === 'admin') nav('/admin');
      else if (data.user.role === 'chef') nav('/chef-dashboard');
      else nav('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed. Check credentials.');
    } finally { setLoading(false); }
  };

  return (
    <>
      {showForgot && <ForgotModal onClose={() => setShowForgot(false)} />}
      <div className="auth-page">
        <div className="auth-left">
          <div className="auth-left-c">
            <div style={{ fontSize:'2.5rem', marginBottom:10 }}>🍳</div>
            <h1>Welcome Back!</h1>
            <p>Sign in to book skilled home chefs or manage your cooking profile and bookings.</p>
            <div className="auth-feat">
              <div className="af"><div className="af-icon">👨‍🍳</div><div className="af-text">500+ verified home chefs across India</div></div>
              <div className="af"><div className="af-icon">📅</div><div className="af-text">Real-time booking with instant notifications</div></div>
              <div className="af"><div className="af-icon">🔔</div><div className="af-text">Get notified the moment chef confirms</div></div>
              <div className="af"><div className="af-icon">💳</div><div className="af-text">Secure Razorpay payments</div></div>
            </div>
          </div>
        </div>
        <div className="auth-right">
          <div className="auth-form">
            <h2>Sign In</h2>
            <p className="auth-sub">Enter your credentials to continue</p>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Email Address</label>
                <input type="email" className="fc" required placeholder="you@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input type="password" className="fc" required placeholder="••••••••" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
                <button type="button" onClick={() => setShowForgot(true)} style={{ background:'none', border:'none', color:'var(--green)', fontSize:'.8rem', fontWeight:600, cursor:'pointer', textAlign:'right', marginTop:4, padding:0 }}>
                  Forgot password?
                </button>
              </div>
              <button type="submit" className="btn btn-primary" style={{ width:'100%', justifyContent:'center', marginTop:4 }} disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In →'}
              </button>
            </form>
            <div className="auth-divider" />
            
            <div className="auth-footer">
              Don't have an account? <Link to="/register">Sign up free</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
