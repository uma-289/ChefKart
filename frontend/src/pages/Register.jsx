import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const CUISINES = ['North Indian', 'South Indian', 'Continental', 'Chinese', 'Mughlai', 'Thai', 'Gujarati', 'Punjabi', 'Kerala', 'Rajasthani'];

export default function Register() {
  const [role, setRole] = useState('user');
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [chefApp, setChefApp] = useState({ bio: '', cuisines: [], experience: 0, hourlyRate: 500, location: '' });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const nav = useNavigate();

  const toggleCuisine = c => setChefApp(f => ({ ...f, cuisines: f.cuisines.includes(c) ? f.cuisines.filter(x => x !== c) : [...f.cuisines, c] }));

  const handleSubmit = async e => {
    e.preventDefault();
    if (form.password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    if (role === 'chef' && !chefApp.bio) { toast.error('Please fill in your bio'); return; }
    setLoading(true);
    try {
      const data = await register({ ...form, role, chefApplication: role === 'chef' ? chefApp : undefined });
      if (data.applicationPending) {
        toast.success('Application submitted! Admin will review and approve you.');
        nav('/pending');
      } else {
        toast.success(`Welcome, ${data.user.name}!`);
        nav('/dashboard');
      }
    } catch (err) {
      console.log("FULL ERROR:", err);
      if (!err.response) {
        toast.success("Account created! Please login.");
        return;
      }

      toast.error(err.response.data?.message || "Registration failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-left-c">
          <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>🍽️</div>
          <h1>Join ChefKart</h1>
          <p>Whether you love great food or love to cook — ChefKart is the perfect platform for you.</p>
          <div className="auth-feat">
            <div className="af"><div className="af-icon">🔒</div><div className="af-text">Secure & verified accounts</div></div>
            <div className="af"><div className="af-icon">💰</div><div className="af-text">Chefs: Earn flexible income cooking from home</div></div>
            <div className="af"><div className="af-icon">🏠</div><div className="af-text">Customers: Restaurant-quality meals at home</div></div>
            <div className="af"><div className="af-icon">🛡️</div><div className="af-text">Chef applications reviewed & approved by admin</div></div>
          </div>
        </div>
      </div>
      <div className="auth-right" style={{ overflow: 'auto' }}>
        <div className="auth-form" style={{ maxWidth: role === 'chef' ? 540 : 440 }}>
          <h2>Create Account</h2>
          <p className="auth-sub">Choose your role to get started</p>
          <div className="role-toggle">
            <button type="button" className={`rt-btn ${role === 'user' ? 'active' : ''}`} onClick={() => setRole('user')}>
              <div className="rt-icon">🧑</div><div className="rt-label">I want to hire a Chef</div>
            </button>
            <button type="button" className={`rt-btn ${role === 'chef' ? 'active' : ''}`} onClick={() => setRole('chef')}>
              <div className="rt-icon">👨‍🍳</div><div className="rt-label">I am a Chef</div>
            </button>
          </div>
          {role === 'chef' && (
            <div style={{ background: 'var(--orange-l)', border: '1px solid #FED7AA', borderRadius: 10, padding: '10px 14px', marginBottom: 20, fontSize: '.82rem', color: '#9A3412' }}>
              <strong>ℹ️ Chef Registration:</strong> Your application will be reviewed by our admin team. Once approved, you can start receiving bookings.
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
              <div className="form-group"><label>Full Name</label><input className="fc" required placeholder="John Doe" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div className="form-group"><label>Phone</label><input className="fc" type="tel" placeholder="9876543210" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
            </div>
            <div className="form-group"><label>Email Address</label><input type="email" className="fc" required placeholder="you@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div className="form-group"><label>Password</label><input type="password" className="fc" required placeholder="Min 6 characters" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} /></div>

            {role === 'chef' && (
              <>
                <div className="auth-divider" />
                <h4 style={{ marginBottom: 16, fontSize: '1rem' }}>🍳 Chef Application Details</h4>
                <div className="form-group"><label>Bio / About You *</label><textarea className="fc" rows={3} required placeholder="Describe your cooking style, background, and what makes you special..." value={chefApp.bio} onChange={e => setChefApp(f => ({ ...f, bio: e.target.value }))} /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 12px' }}>
                  <div className="form-group"><label>Experience (yrs)</label><input type="number" className="fc" min={0} value={chefApp.experience} onChange={e => setChefApp(f => ({ ...f, experience: +e.target.value }))} /></div>
                  <div className="form-group"><label>Hourly Rate (₹)</label><input type="number" className="fc" min={100} value={chefApp.hourlyRate} onChange={e => setChefApp(f => ({ ...f, hourlyRate: +e.target.value }))} /></div>
                  <div className="form-group"><label>City</label><input className="fc" placeholder="Bangalore" value={chefApp.location} onChange={e => setChefApp(f => ({ ...f, location: e.target.value }))} /></div>
                </div>
                <div className="form-group">
                  <label>Cuisines (select all that apply)</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                    {CUISINES.map(c => (
                      <button key={c} type="button" className={`chip ${chefApp.cuisines.includes(c) ? 'active' : ''}`} style={{ fontSize: '.76rem' }} onClick={() => toggleCuisine(c)}>{c}</button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 8, justifyContent: 'center' }} disabled={loading}>
              {loading ? 'Creating...' : role === 'chef' ? 'Submit Chef Application' : 'Create Account →'}
            </button>
          </form>
          <div className="auth-footer">Already have an account? <Link to="/login">Sign in</Link></div>
        </div>
      </div>
    </div>
  );
}
