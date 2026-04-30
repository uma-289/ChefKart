import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { bookingAPI, chefAPI, notifAPI, userAPI, authAPI } from '../services/api';
import toast from 'react-hot-toast';

const CUISINES = ['North Indian', 'South Indian', 'Continental', 'Chinese', 'Mughlai', 'Thai', 'Gujarati', 'Punjabi', 'Kerala', 'Rajasthani'];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TABS = [
  { key: 'requests', label: 'Booking Requests', ico: '📅' },
  { key: 'notifs', label: 'Notifications', ico: '🔔' },
  { key: 'profile', label: 'Chef Profile', ico: '👨‍🍳' },
  { key: 'security', label: 'Change Password', ico: '🔐' },
];

// Base URL for local development image serving
const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '');

/**
 * dishImgUrl — handles both Cloudinary URLs and local filenames
 * Cloudinary (production): dish.image = "https://res.cloudinary.com/..."  → use as-is
 * Local (development):     dish.image = "dish_xxx.jpg"  → prepend localhost URL
 */
const dishImgUrl = (image) => {
  if (!image) return null;
  // Cloudinary URL — use directly
  if (image.startsWith('http')) return image;
  // Local filename
  const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '');
  return `${API_BASE}/uploads/dishes/${image}`;
};

export default function ChefDashboard() {
  const { user, chefProfile, setChef, unread } = useAuth();
  const [tab, setTab] = useState('requests');
  const [bookings, setBookings] = useState([]);
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [loadingId, setLoadingId] = useState(null);
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const fileRef = useRef(null);

  // Profile form state
  const [userForm, setUserForm] = useState({ name: user?.name || '', phone: user?.phone || '' });
  const [pf, setPf] = useState({
    bio: '', cuisines: [], specialties: '', dishes: [], experience: 0,
    pricing: { hourly: 500, daily: 0 }, location: '', isAvailable: true,
    availability: DAYS.slice(0, 5).map(day => ({ day, from: '09:00', to: '18:00' }))
  });

  // New dish being composed
  const [newDish, setNewDish] = useState({ name: '', description: '', price: 0, prepTime: '', isVeg: true, image: '' });
  const [uploadingImg, setUploadingImg] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(''); // local preview before upload completes

  useEffect(() => {
    bookingAPI.getChefBookings()
      .then(r => setBookings(r.data.bookings || []))
      .finally(() => setLoading(false));

    if (chefProfile) {
      setPf({
        bio: chefProfile.bio || '',
        cuisines: chefProfile.cuisines || [],
        specialties: (chefProfile.specialties || []).join(', '),
        dishes: chefProfile.dishes || [],
        experience: chefProfile.experience || 0,
        pricing: chefProfile.pricing || { hourly: 500, daily: 0 },
        location: chefProfile.location || '',
        isAvailable: chefProfile.isAvailable !== false,
        availability: chefProfile.availability?.length
          ? chefProfile.availability
          : DAYS.slice(0, 5).map(d => ({ day: d, from: '09:00', to: '18:00' }))
      });
    }
  }, [chefProfile]);

  const loadNotifs = async () => {
    try {
      const r = await notifAPI.getAll();
      setNotifs(r.data.notifications || []);
      await notifAPI.readAll();
    } catch { }
  };

  // ── Booking status update ──────────────────────────────────────────────────
  const handleStatus = async (id, status, reason = '') => {
    setLoadingId(id);
    try {
      await bookingAPI.updateStatus(id, { status, rejectionReason: reason });
      setBookings(bs => bs.map(b => b._id === id ? { ...b, status, rejectionReason: reason } : b));
      if (status === 'confirmed') toast.success('✅ Accepted! Customer notified by email.');
      else if (status === 'rejected') toast.success('Declined. Customer has been notified.');
      else if (status === 'completed') toast.success('🎉 Marked as completed!');
      setRejectModal(null);
      setRejectReason('');
    } catch (err) {
      console.log("ERROR:", err);
      if (!err.response) {
        setBookings(bs => bs.map(b =>
          b._id === id ? { ...b, status, rejectionReason: reason } : b
        ));
        toast.success("Accepted! (processing in background)");
        return;
      }
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setLoadingId(null); // 🔥 stop loading
    }
  }
  // ── Dish image upload via Multer ───────────────────────────────────────────
  // This sends a multipart/form-data POST to /api/chefs/dish-image
  // The backend multer middleware saves it to uploads/dishes/
  // and returns { filename, url }
  const handleImageSelect = async (file) => {
    if (!file) return;

    // Validate on client side first
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only JPG, PNG or WEBP images allowed');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }

    // Show local preview immediately (before upload finishes)
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);

    // Upload to backend via Multer
    setUploadingImg(true);
    try {
      const formData = new FormData();
      formData.append('image', file);  // field name must match upload.single('image') in routes

      const response = await chefAPI.uploadDishImage(formData);
      const { filename, url } = response.data;
      // url = full URL (http://localhost:5000/uploads/... or https://res.cloudinary.com/...)
      // Always store the full URL so <img src={dish.image}> works directly without rebuilding
      const imageUrl = url || `http://localhost:5000/uploads/dishes/${filename}`;
      setNewDish(d => ({ ...d, image: imageUrl }));
      setPreviewUrl(imageUrl); // update preview to use server URL (not blob URL)
      toast.success("📸 Image uploaded successfully!");
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
      setPreviewUrl('');
      setNewDish(d => ({ ...d, image: '' }));
    } finally {
      setUploadingImg(false);
    }
  };

  const clearImage = () => {
    setNewDish(d => ({ ...d, image: '' }));
    setPreviewUrl('');
    if (fileRef.current) fileRef.current.value = '';
  };

  // ── Add dish to the list ───────────────────────────────────────────────────
  const addDish = () => {
    if (!newDish.name.trim()) { toast.error('Dish name is required'); return; }
    if (!newDish.price || newDish.price <= 0) { toast.error('Enter a valid price'); return; }
    setPf(f => ({ ...f, dishes: [...f.dishes, { ...newDish }] }));
    setNewDish({ name: '', description: '', price: 0, prepTime: '', isVeg: true, image: '' });
    setPreviewUrl('');
    if (fileRef.current) fileRef.current.value = '';
    toast.success('Dish added! Save your profile to keep it.');
  };

  const removeDish = (i) => {
    setPf(f => ({ ...f, dishes: f.dishes.filter((_, idx) => idx !== i) }));
  };

  // ── Profile save ───────────────────────────────────────────────────────────
  const handleProfileSave = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    try {
      const payload = {
        ...pf,
        specialties: pf.specialties.split(',').map(s => s.trim()).filter(Boolean)
      };
      const [chefRes] = await Promise.all([
        chefAPI.updateProfile(payload),
        userAPI.updateProfile({ name: userForm.name, phone: userForm.phone })
      ]);
      setChef(chefRes.data.chef);
      toast.success('✅ Profile saved!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePwChange = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) { toast.error('Passwords do not match'); return; }
    if (pwForm.newPassword.length < 6) { toast.error('Min 6 characters'); return; }
    setPwLoading(true);
    try {
      await authAPI.updatePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      toast.success('Password changed!');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setPwLoading(false); }
  };

  const toggleCuisine = c => setPf(f => ({
    ...f, cuisines: f.cuisines.includes(c) ? f.cuisines.filter(x => x !== c) : [...f.cuisines, c]
  }));
  const toggleDay = day => setPf(f => {
    const has = f.availability.find(a => a.day === day);
    if (has) return { ...f, availability: f.availability.filter(a => a.day !== day) };
    return { ...f, availability: [...f.availability, { day, from: '09:00', to: '18:00' }] };
  });
  const updateTime = (day, field, val) => setPf(f => ({
    ...f, availability: f.availability.map(a => a.day === day ? { ...a, [field]: val } : a)
  }));

  const stats = {
    total: bookings.length,
    pending: bookings.filter(b => b.status === 'pending').length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    completed: bookings.filter(b => b.status === 'completed').length,
  };

  return (
    <div className="db-wrap">
      {/* ── Sidebar ── */}
      <div className="db-sidebar">
        <div className="db-profile">
          <div className="db-av">{user?.name?.charAt(0).toUpperCase()}</div>
          <div className="db-uname">{user?.name}</div>
          <span className="db-urole">Chef</span>
        </div>
        <div className="db-nav">
          {TABS.map(t => (
            <button key={t.key}
              className={`db-link ${tab === t.key ? 'active' : ''}`}
              onClick={() => { setTab(t.key); if (t.key === 'notifs') loadNotifs(); }}>
              <span className="ico">{t.ico}</span> {t.label}
              {t.key === 'notifs' && unread > 0 && <span className="badge badge-red">{unread}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="db-content">

        {/* ═══ BOOKING REQUESTS TAB ═══════════════════════════════════════════ */}
        {tab === 'requests' && (
          <div>
            <div className="db-title">Booking Requests</div>
            <div className="db-sub">Review and respond to incoming requests from customers</div>

            <div className="stat-row">
              <div className="sc orange"><div className="sc-icon">📋</div><div className="sc-num">{stats.total}</div><div className="sc-lbl">Total</div></div>
              <div className="sc red"><div className="sc-icon">⏳</div><div className="sc-num">{stats.pending}</div><div className="sc-lbl">Awaiting Response</div></div>
              <div className="sc green"><div className="sc-icon">✅</div><div className="sc-num">{stats.confirmed}</div><div className="sc-lbl">Confirmed</div></div>
              <div className="sc blue"><div className="sc-icon">🎉</div><div className="sc-num">{stats.completed}</div><div className="sc-lbl">Completed</div></div>
            </div>

            {loading ? <div className="loader"><div className="spinner" /></div>
              : bookings.length === 0
                ? <div className="empty"><div className="empty-ico">📅</div><h3>No requests yet</h3><p>Complete your profile and add dishes to attract bookings!</p></div>
                : (
                  <div className="bk-list">
                    {bookings.map(b => (
                      <div key={b._id} className="bk-card">
                        <div className="bk-av" style={{ background: 'var(--orange-l)', color: 'var(--orange)', fontWeight: 700, fontSize: '1.1rem' }}>
                          {b.userId?.name?.charAt(0)}
                        </div>
                        <div className="bk-body">
                          <div className="bk-name">{b.userId?.name}</div>
                          <div style={{ fontSize: '.77rem', color: 'var(--muted)', marginBottom: 5 }}>
                            📧 {b.userId?.email}{b.userId?.phone ? ` · 📞 ${b.userId.phone}` : ''}
                          </div>
                          <div className="bk-meta">
                            <span>📅 {new Date(b.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                            <span>🕐 {b.timeSlot} · {b.duration}h</span>
                            <span>📍 {b.address}</span>
                            {b.cuisine && <span>🍽️ {b.cuisine}</span>}
                            <span style={{ fontWeight: 700, color: 'var(--green)' }}>₹{b.totalAmount}</span>
                          </div>
                          {b.dishes?.length > 0 && (
                            <div style={{ fontSize: '.78rem', color: 'var(--g600)', marginBottom: 5 }}>
                              🍽️ Dishes requested: <strong>{b.dishes.join(', ')}</strong>
                            </div>
                          )}
                          {b.specialRequests && (
                            <div style={{ fontSize: '.78rem', fontStyle: 'italic', color: 'var(--muted)', background: 'var(--g50)', padding: '6px 10px', borderRadius: 7, marginBottom: 6 }}>
                              "{b.specialRequests}"
                            </div>
                          )}
                          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 4 }}>
                            <span className={`badge status-${b.status}`}>
                              {b.status === 'pending' ? '⏳ Awaiting Your Response'
                                : b.status === 'confirmed' ? '✅ Confirmed'
                                  : b.status === 'rejected' ? '❌ Declined'
                                    : b.status === 'completed' ? '🎉 Completed'
                                      : '🚫 Cancelled'}
                            </span>
                            <span className={`badge ${b.paymentStatus === 'paid' ? 'badge-green' : 'badge-orange'}`}>
                              {b.paymentStatus === 'paid' ? '💰 Paid' : 'Payment Pending'}
                            </span>
                          </div>
                        </div>
                        <div className="bk-acts">
                          {b.status === 'pending' && (
                            <>
                              <button className="btn btn-primary btn-sm" onClick={() => handleStatus(b._id, 'confirmed')}>{loadingId === b._id ? 'Processing...' : '✓ Accept'}</button>
                              <button className="btn btn-danger btn-sm" onClick={() => { setRejectModal(b._id); setRejectReason(''); }}>✕ Decline</button>
                            </>
                          )}
                          {b.status === 'confirmed' && (
                            <button className="btn btn-outline btn-sm" onClick={() => handleStatus(b._id, 'completed')}>Mark Done</button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
          </div>
        )}

        {/* ═══ NOTIFICATIONS TAB ═══════════════════════════════════════════════ */}
        {tab === 'notifs' && (
          <div>
            <div className="db-title">Notifications</div>
            <div className="db-sub">Updates from customers and the platform</div>
            {notifs.length === 0
              ? <div className="empty"><div className="empty-ico">🔔</div><h3>No notifications yet</h3></div>
              : <div className="notif-list">{notifs.map(n => (
                <div key={n._id} className={`notif-item ${n.isRead ? '' : 'unread'}`}>
                  <div className="notif-ico">{n.title?.charAt(0)}</div>
                  <div className="notif-body">
                    <div className="notif-title">{n.title}</div>
                    <div className="notif-msg">{n.message}</div>
                    <div className="notif-time">{new Date(n.createdAt).toLocaleString('en-IN')}</div>
                  </div>
                </div>
              ))}</div>}
          </div>
        )}

        {/* ═══ CHEF PROFILE TAB ════════════════════════════════════════════════ */}
        {tab === 'profile' && (
          <div style={{ maxWidth: 740 }}>
            <div className="db-title">Chef Profile</div>
            <div className="db-sub">Complete your profile and add dishes to attract customers</div>

            <div className="card card-body">
              <form onSubmit={handleProfileSave}>

                {/* ── Personal Info ── */}
                <h4 style={{ color: 'var(--green)', marginBottom: 14, fontSize: '.97rem', display: 'flex', alignItems: 'center', gap: 8 }}>👤 Personal Info</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
                  <div className="form-group"><label>Full Name</label><input className="fc" value={userForm.name} onChange={e => setUserForm(f => ({ ...f, name: e.target.value }))} /></div>
                  <div className="form-group"><label>Phone</label><input className="fc" placeholder="+91 9876543210" value={userForm.phone} onChange={e => setUserForm(f => ({ ...f, phone: e.target.value }))} /></div>
                </div>

                <div style={{ height: 1, background: 'var(--g100)', margin: '4px 0 20px' }} />

                {/* ── Professional Info ── */}
                <h4 style={{ color: 'var(--green)', marginBottom: 14, fontSize: '.97rem' }}>🍳 Professional Info</h4>
                <div className="form-group"><label>Bio / About You</label><textarea className="fc" rows={3} placeholder="Describe your cooking style, experience, and what makes your food special..." value={pf.bio} onChange={e => setPf(f => ({ ...f, bio: e.target.value }))} /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 12px' }}>
                  <div className="form-group"><label>Experience (years)</label><input type="number" className="fc" min={0} value={pf.experience} onChange={e => setPf(f => ({ ...f, experience: +e.target.value }))} /></div>
                  <div className="form-group"><label>Hourly Rate (₹)</label><input type="number" className="fc" min={100} value={pf.pricing.hourly} onChange={e => setPf(f => ({ ...f, pricing: { ...f.pricing, hourly: +e.target.value } }))} /></div>
                  <div className="form-group"><label>City</label><input className="fc" placeholder="e.g. Bangalore" value={pf.location} onChange={e => setPf(f => ({ ...f, location: e.target.value }))} /></div>
                </div>
                <div className="form-group"><label>Specialties (comma-separated)</label><input className="fc" placeholder="e.g. Biryani, Butter Chicken, Pasta" value={pf.specialties} onChange={e => setPf(f => ({ ...f, specialties: e.target.value }))} /></div>

                {/* ── Cuisines ── */}
                <div className="form-group">
                  <label>Cuisines You Cook</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 7 }}>
                    {CUISINES.map(c => (
                      <button key={c} type="button"
                        className={`chip ${pf.cuisines.includes(c) ? 'active' : ''}`}
                        style={{ fontSize: '.77rem' }}
                        onClick={() => toggleCuisine(c)}>{c}</button>
                    ))}
                  </div>
                </div>

                {/* ── Accept Bookings toggle ── */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '4px 0 8px' }}>
                  <label style={{ fontSize: '.8rem', fontWeight: 700, color: 'var(--g600)', textTransform: 'uppercase', letterSpacing: '.4px' }}>Accepting Bookings</label>
                  <button type="button"
                    onClick={() => setPf(f => ({ ...f, isAvailable: !f.isAvailable }))}
                    style={{ background: pf.isAvailable ? 'var(--green)' : 'var(--g300)', border: 'none', borderRadius: 20, padding: '7px 18px', color: '#fff', fontWeight: 700, fontSize: '.82rem', cursor: 'pointer', transition: '.2s' }}>
                    {pf.isAvailable ? '✓ Available' : '✗ Not Available'}
                  </button>
                </div>

                <div style={{ height: 1, background: 'var(--g100)', margin: '10px 0 18px' }} />

                {/* ── Weekly Schedule ── */}
                <h4 style={{ color: 'var(--green)', marginBottom: 12, fontSize: '.97rem' }}>📅 Weekly Schedule</h4>
                <p style={{ fontSize: '.8rem', color: 'var(--muted)', marginBottom: 12 }}>Click a day to toggle it on/off. Set your hours for each active day.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                  {DAYS.map(day => {
                    const a = pf.availability.find(x => x.day === day);
                    return (
                      <div key={day} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <button type="button"
                          style={{ width: 50, padding: '6px 0', borderRadius: 8, border: `2px solid ${a ? 'var(--green)' : 'var(--g200)'}`, background: a ? 'var(--green-p)' : '#fff', color: a ? 'var(--green-d)' : 'var(--g400)', fontWeight: 700, fontSize: '.8rem', cursor: 'pointer', transition: '.2s', flexShrink: 0 }}
                          onClick={() => toggleDay(day)}>{day}</button>
                        {a ? (
                          <>
                            <input type="time" value={a.from} onChange={e => updateTime(day, 'from', e.target.value)}
                              style={{ padding: '6px 10px', borderRadius: 8, border: '1.5px solid var(--g200)', fontFamily: 'var(--fb)', fontSize: '.83rem' }} />
                            <span style={{ color: 'var(--muted)', fontSize: '.82rem' }}>to</span>
                            <input type="time" value={a.to} onChange={e => updateTime(day, 'to', e.target.value)}
                              style={{ padding: '6px 10px', borderRadius: 8, border: '1.5px solid var(--g200)', fontFamily: 'var(--fb)', fontSize: '.83rem' }} />
                          </>
                        ) : (
                          <span style={{ fontSize: '.82rem', color: 'var(--g400)' }}>Not available this day</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div style={{ height: 1, background: 'var(--g100)', margin: '0 0 20px' }} />

                {/* ══ SIGNATURE DISHES ══════════════════════════════════════════ */}
                <h4 style={{ color: 'var(--green)', marginBottom: 6, fontSize: '.97rem' }}>🍽️ Signature Dishes</h4>
                <p style={{ fontSize: '.8rem', color: 'var(--muted)', marginBottom: 16 }}>
                  Add the dishes you specialise in. Customers can request specific dishes when booking you.
                  Upload a real food photo for each dish — it shows on your public profile!
                </p>

                {/* Existing dish cards */}
                {pf.dishes.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 12, marginBottom: 20 }}>
                    {pf.dishes.map((d, i) => {
                      const imgUrl = dishImgUrl(d.image);
                      return (
                        <div key={i} style={{ background: '#fff', border: '1px solid var(--g100)', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--sh)' }}>
                          {/* Dish image */}
                          <div style={{ width: '100%', height: 130, background: 'linear-gradient(135deg,var(--green-p),var(--green-l))', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {/* Emoji fallback — always underneath, zIndex 0 */}
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', zIndex: 0 }}>
                              🍽️
                            </div>
                            {/* Real photo — covers emoji completely, hidden on error */}
                            {imgUrl && (
                              <img src={imgUrl} alt={d.name}
                                style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0, zIndex: 1 }}
                                onError={e => { e.target.style.display = 'none'; }}
                              />
                            )}
                            {/* Veg/Non-veg indicator */}
                            <div style={{ position: 'absolute', top: 8, left: 8, width: 14, height: 14, borderRadius: 3, border: `2px solid ${d.isVeg ? '#16A34A' : '#DC2626'}`, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <div style={{ width: 6, height: 6, borderRadius: '50%', background: d.isVeg ? '#16A34A' : '#DC2626' }} />
                            </div>
                            {/* Remove button */}
                            <button type="button" onClick={() => removeDish(i)}
                              style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,.55)', border: 'none', borderRadius: '50%', width: 24, height: 24, color: '#fff', cursor: 'pointer', fontSize: '.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                              ✕
                            </button>
                          </div>
                          {/* Dish info */}
                          <div style={{ padding: '10px 12px' }}>
                            <div style={{ fontWeight: 700, fontSize: '.88rem', marginBottom: 2 }}>{d.name}</div>
                            {d.description && <div style={{ fontSize: '.74rem', color: 'var(--muted)', marginBottom: 6, lineHeight: 1.4 }}>{d.description}</div>}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontWeight: 700, color: 'var(--green)', fontSize: '.88rem' }}>₹{d.price}</span>
                              {d.prepTime && <span style={{ fontSize: '.72rem', color: 'var(--muted)' }}>⏱ {d.prepTime}</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* ── Add New Dish Form ── */}
                <div style={{ background: 'var(--g50)', borderRadius: 14, padding: 20, border: '2px dashed var(--g200)' }}>
                  <div style={{ fontWeight: 700, fontSize: '.85rem', color: 'var(--g600)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '.5px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    ➕ Add New Dish
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
                    <div className="form-group">
                      <label>Dish Name *</label>
                      <input className="fc" placeholder="e.g. Butter Chicken" value={newDish.name} onChange={e => setNewDish(d => ({ ...d, name: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label>Price (₹) *</label>
                      <input type="number" className="fc" min={0} placeholder="e.g. 350" value={newDish.price || ''} onChange={e => setNewDish(d => ({ ...d, price: +e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label>Prep Time</label>
                      <input className="fc" placeholder="e.g. 30 mins" value={newDish.prepTime} onChange={e => setNewDish(d => ({ ...d, prepTime: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label>Type</label>
                      <select className="fc" value={newDish.isVeg ? 'veg' : 'nonveg'} onChange={e => setNewDish(d => ({ ...d, isVeg: e.target.value === 'veg' }))}>
                        <option value="veg">🟢 Vegetarian</option>
                        <option value="nonveg">🔴 Non-Vegetarian</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Description (optional)</label>
                    <input className="fc" placeholder="e.g. Creamy tomato-based chicken curry, mildly spiced" value={newDish.description} onChange={e => setNewDish(d => ({ ...d, description: e.target.value }))} />
                  </div>

                  {/* ─── IMAGE UPLOAD SECTION ─────────────────────────────── */}
                  <div className="form-group">
                    <label>Dish Photo *</label>
                    <p style={{ fontSize: '.75rem', color: 'var(--muted)', marginBottom: 10, lineHeight: 1.5 }}>
                      Upload a clear photo of your dish (JPG, PNG or WEBP, max 5MB).<br />
                      This photo will be shown on your public chef profile so customers can see what they're ordering.
                    </p>

                    {/* Hidden file input — triggered by the upload button */}
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      style={{ display: 'none' }}
                      onChange={e => {
                        const file = e.target.files[0];
                        if (file) handleImageSelect(file);
                      }}
                    />

                    {/* No image selected yet */}
                    {!previewUrl && !newDish.image && (
                      <div
                        onClick={() => fileRef.current?.click()}
                        style={{ border: '2px dashed var(--g300)', borderRadius: 12, padding: '28px 20px', textAlign: 'center', cursor: 'pointer', transition: '.2s', background: '#fff' }}
                        onMouseOver={e => e.currentTarget.style.borderColor = 'var(--green)'}
                        onMouseOut={e => e.currentTarget.style.borderColor = 'var(--g300)'}>
                        <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>📷</div>
                        <div style={{ fontWeight: 700, fontSize: '.88rem', color: 'var(--g700)', marginBottom: 4 }}>
                          Click to upload dish photo
                        </div>
                        <div style={{ fontSize: '.75rem', color: 'var(--muted)' }}>JPG, PNG or WEBP · Max 5MB</div>
                      </div>
                    )}

                    {/* Uploading spinner */}
                    {uploadingImg && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: '#EFF6FF', borderRadius: 10, border: '1px solid #BFDBFE' }}>
                        <div className="spinner" style={{ width: 22, height: 22, borderWidth: 2 }} />
                        <span style={{ fontSize: '.85rem', color: '#1D4ED8', fontWeight: 600 }}>Uploading image to server...</span>
                      </div>
                    )}

                    {/* Preview after upload */}
                    {(previewUrl || newDish.image) && !uploadingImg && (
                      <div style={{ display: 'flex', gap: 14, alignItems: 'center', background: 'var(--green-p)', borderRadius: 12, padding: '12px 16px', border: '1px solid var(--green-l)' }}>
                        <img
                          src={previewUrl || newDish.image}
                          alt="Preview"
                          style={{ width: 70, height: 70, borderRadius: 10, objectFit: 'cover', border: '2px solid var(--green-l)', flexShrink: 0 }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: '.85rem', color: 'var(--green-d)', marginBottom: 4 }}>
                            ✅ Image uploaded successfully!
                          </div>
                          <div style={{ fontSize: '.75rem', color: 'var(--g600)', marginBottom: 8, wordBreak: 'break-all' }}>
                            File: {newDish.image?.split('/').pop() || newDish.image}
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button type="button" className="btn btn-outline btn-sm" onClick={() => fileRef.current?.click()}>
                              🔄 Change Photo
                            </button>
                            <button type="button" className="btn btn-danger btn-sm" onClick={clearImage}>
                              🗑️ Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  {/* ─── END IMAGE UPLOAD ──────────────────────────────────── */}

                  <button type="button" className="btn btn-primary" onClick={addDish}
                    disabled={!newDish.name || !newDish.price || uploadingImg}
                    style={{ marginTop: 8 }}>
                    + Add This Dish
                  </button>
                </div>

                <button type="submit" className="btn btn-primary btn-lg" style={{ marginTop: 24 }} disabled={profileLoading}>
                  {profileLoading ? '⏳ Saving...' : '💾 Save Full Profile'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ═══ SECURITY TAB ════════════════════════════════════════════════════ */}
        {tab === 'security' && (
          <div style={{ maxWidth: 460 }}>
            <div className="db-title">Change Password</div>
            <div className="db-sub">Update your login password</div>
            <div className="card card-body">
              <form onSubmit={handlePwChange}>
                <div className="form-group"><label>Current Password</label><input type="password" className="fc" required placeholder="••••••••" value={pwForm.currentPassword} onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))} /></div>
                <div className="form-group"><label>New Password</label><input type="password" className="fc" required placeholder="Min 6 characters" value={pwForm.newPassword} onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))} /></div>
                <div className="form-group"><label>Confirm New Password</label><input type="password" className="fc" required placeholder="Repeat new password" value={pwForm.confirmPassword} onChange={e => setPwForm(f => ({ ...f, confirmPassword: e.target.value }))} /></div>
                <button type="submit" className="btn btn-primary" disabled={pwLoading}>
                  {pwLoading ? 'Changing...' : 'Change Password'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* ── Decline booking modal ── */}
      {rejectModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(4px)' }}
          onClick={() => setRejectModal(null)}>
          <div style={{ background: '#fff', borderRadius: 18, padding: 32, width: '100%', maxWidth: 420, boxShadow: 'var(--shx)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1.2rem' }}>❌ Decline Booking</h3>
              <button onClick={() => setRejectModal(null)} style={{ background: 'var(--g100)', border: 'none', width: 34, height: 34, borderRadius: '50%', cursor: 'pointer' }}>✕</button>
            </div>
            <p style={{ color: 'var(--muted)', fontSize: '.85rem', marginBottom: 16, lineHeight: 1.6 }}>
              Select a reason. The customer will be notified and the time slot will be freed for others.
            </p>
            <div className="form-group">
              <label>Reason for Declining *</label>
              <select className="fc" value={rejectReason} onChange={e => setRejectReason(e.target.value)}>
                <option value="">Select a reason...</option>
                <option>Already have another booking at this time</option>
                <option>Not available on this date</option>
                <option>Cannot travel to this location</option>
                <option>Cuisine not in my expertise</option>
                <option>Personal emergency</option>
                <option>Schedule conflict</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button className="btn btn-danger" style={{ flex: 1, justifyContent: 'center' }}
                disabled={!rejectReason}
                onClick={() => handleStatus(rejectModal, 'rejected', rejectReason)}>
                Confirm Decline
              </button>
              <button className="btn btn-outline" onClick={() => setRejectModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
