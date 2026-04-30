import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { chefAPI, bookingAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { getImageUrl } from '../utils/getImageUrl';

const ALL_SLOTS = [
  '07:00 AM', '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
  '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM', '06:00 PM',
  '07:00 PM', '08:00 PM'
];

const BG_COLORS = [
  '#E8F5E9', '#FFF3E0', '#FCE4EC', '#E3F2FD',
  '#F3E5F5', '#FFF8E1', '#E0F2F1', '#FBE9E7'
];

// Base URL for local development image serving
const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '');

/**
 * getDishImageUrl — builds the correct image URL from what's stored in MongoDB
 *
 * In production (Cloudinary):  dish.image = "https://res.cloudinary.com/..."
 *   → use as-is
 *
 * In local development:  dish.image = "dish_1712345_938201.jpg"
 *   → build full URL: http://localhost:5000/uploads/dishes/dish_xxx.jpg
 */
// This handles Cloudinary URLs (https://...) and local filenames
const getDishImageUrl = (image) => {
  if (!image) return null;
  // Cloudinary or any full URL — use directly
  if (image.startsWith('http')) return image;
  // Local filename fallback
  const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '');
  return `${API_BASE}/uploads/dishes/${image}`;
};

function Stars({ rating, count }) {
  const full = Math.round(rating || 0);
  return (
    <span>
      <span className="stars">{'★'.repeat(full)}{'☆'.repeat(5 - full)}</span>
      {count !== undefined && (
        <span style={{ fontSize: '.82rem', color: 'var(--muted)', marginLeft: 5 }}>({count} reviews)</span>
      )}
    </span>
  );
}

export default function ChefDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [chef, setChef] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [bookedSlots, setBookedSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    date: '', timeSlot: '', duration: 2, cuisine: '', dishes: [], specialRequests: '', address: ''
  });

  useEffect(() => {
    chefAPI.getById(id)
      .then(r => { setChef(r.data.chef); setReviews(r.data.reviews || []); })
      .catch(() => nav('/chefs'))
      .finally(() => setLoading(false));
  }, [id]);

  const fetchSlots = async (date) => {
    if (!date) return;
    setSlotsLoading(true);
    try {
      const r = await bookingAPI.getSlots({ chefId: id, date });
      setBookedSlots(r.data.bookedSlots || []);
    } catch { }
    finally { setSlotsLoading(false); }
  };

  const handleDateChange = e => {
    const date = e.target.value;
    setForm(f => ({ ...f, date, timeSlot: '' }));
    fetchSlots(date);
  };

  const toggleDish = (dishName) => {
    setForm(f => ({
      ...f,
      dishes: f.dishes.includes(dishName)
        ? f.dishes.filter(x => x !== dishName)
        : [...f.dishes, dishName]
    }));
  };

  const handleBook = async (e) => {
    e.preventDefault();
    if (!user) { toast.error('Please login to book a chef'); nav('/login'); return; }
    if (user.role !== 'user') { toast.error('Only customers can book chefs'); return; }
    if (!form.timeSlot) { toast.error('Please select a time slot'); return; }
    if (!form.address.trim()) { toast.error('Please enter your home address'); return; }
    setSubmitting(true);
    try {
      await bookingAPI.create({ chefId: chef._id, ...form });
      toast.success('🎉 Booking request sent! You\'ll get a notification when the chef responds.');
      setShowModal(false);
      nav('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Booking failed. Please try again.');
    } finally { setSubmitting(false); }
  };

  if (loading) return <div className="loader"><div className="spinner" /></div>;
  if (!chef) return null;

  const chefUser = chef.userId;
  const initials = chefUser?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';
  const totalAmount = chef.pricing?.hourly * form.duration;
  const today = new Date().toISOString().split('T')[0];

  return (
    <div style={{ background: 'var(--off)', minHeight: '100vh' }}>

      {/* ── Chef Header ─────────────────────────────────────────────────────── */}
      <div style={{ background: '#fff', borderBottom: '1px solid var(--g100)', padding: '44px 0' }}>
        <div className="container">
          <button onClick={() => nav(-1)}
            style={{ background: 'var(--g50)', border: '1px solid var(--g200)', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontSize: '.83rem', fontWeight: 600, marginBottom: 22, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--g700)' }}>
            ← Back
          </button>

          <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {/* Avatar */}
            <div style={{ width: 110, height: 110, borderRadius: '50%', background: BG_COLORS[0], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.4rem', fontWeight: 700, color: 'var(--green)', border: '4px solid var(--green-l)', flexShrink: 0, fontSize: '2rem' }}>
              {initials}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 240 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
                <h2 style={{ fontFamily: 'var(--fd)', fontSize: '2rem', margin: 0 }}>{chefUser?.name}</h2>
                {chef.isVerified && <span className="badge badge-green">✓ Verified</span>}
              </div>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: '.87rem', color: 'var(--muted)', marginBottom: 10 }}>
                <Stars rating={chef.rating} count={chef.totalReviews} />
                <span>📍 {chef.location}</span>
                <span>🕐 {chef.experience} yrs experience</span>
                {chefUser?.phone && <span>📞 {chefUser.phone}</span>}
              </div>
              <p style={{ color: 'var(--muted)', lineHeight: 1.75, maxWidth: 600, margin: 0 }}>{chef.bio}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                {chef.cuisines?.map(c => <span key={c} className="ctag" style={{ fontSize: '.8rem' }}>{c}</span>)}
              </div>
            </div>

            {/* Price + Book */}
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontFamily: 'var(--fd)', fontSize: '2rem', fontWeight: 700, color: 'var(--green)', lineHeight: 1 }}>
                ₹{chef.pricing?.hourly}
              </div>
              <div style={{ fontSize: '.83rem', color: 'var(--muted)', marginBottom: 16 }}>per hour</div>
              <button className="btn btn-primary btn-lg" onClick={() => {
                if (!user) { toast.error('Please login first'); nav('/login'); return; }
                if (user.role !== 'user') { toast.error('Only customers can book chefs'); return; }
                setShowModal(true);
              }}>
                📅 Book Chef
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container" style={{ paddingTop: 36, paddingBottom: 60 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 28, alignItems: 'start' }}>

          {/* ── Left column ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* ════ SIGNATURE DISHES ════════════════════════════════════════════
                This section shows the chef's dishes with their uploaded photos.
                Images are fetched from: GET /uploads/dishes/<filename>
                served by Express static middleware in server.js           */}
            {chef.dishes?.length > 0 && (
              <div className="card card-body">
                <h3 style={{ marginBottom: 6 }}>🍽️ Signature Dishes</h3>
                <p style={{ fontSize: '.83rem', color: 'var(--muted)', marginBottom: 18 }}>
                  Click dishes you'd like the chef to prepare when booking
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 14 }}>
                  {chef.dishes.map((dish, i) => {
                    const imgUrl = getDishImageUrl(dish.image);
                    const selected = form.dishes.includes(dish.name);
                    return (
                      <div key={i}
                        onClick={() => toggleDish(dish.name)}
                        style={{
                          border: `2px solid ${selected ? 'var(--green)' : 'var(--g100)'}`,
                          borderRadius: 12,
                          overflow: 'hidden',
                          cursor: 'pointer',
                          background: '#fff',
                          boxShadow: selected ? '0 0 0 3px rgba(46,125,50,.15)' : 'var(--sh)',
                          transition: 'all .2s',
                          transform: selected ? 'scale(1.02)' : 'scale(1)'
                        }}>

                        {/* ── Dish image ── */}
                        <div style={{ width: '100%', height: 130, background: BG_COLORS[i % BG_COLORS.length], position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {/* Emoji fallback — always underneath */}
                          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 0 }}>
                            <span style={{ fontSize: '2.8rem' }}>🍽️</span>
                          </div>
                          {/* Real photo — overlays emoji, hidden on 404 */}
                          {imgUrl && (
                            <img
                              src={imgUrl}
                              alt={dish.name}
                              style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0, zIndex: 1 }}
                              onError={e => { e.target.style.display = 'none'; }}
                            />
                          )}

                          {/* Veg / Non-veg indicator (top-left corner) */}
                          <div style={{ position: 'absolute', top: 8, left: 8, width: 16, height: 16, borderRadius: 3, border: `2px solid ${dish.isVeg ? '#16A34A' : '#DC2626'}`, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ width: 7, height: 7, borderRadius: '50%', background: dish.isVeg ? '#16A34A' : '#DC2626' }} />
                          </div>

                          {/* Selected checkmark */}
                          {selected && (
                            <div style={{ position: 'absolute', top: 8, right: 8, width: 22, height: 22, borderRadius: '50%', background: 'var(--green)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.75rem', fontWeight: 700 }}>
                              ✓
                            </div>
                          )}
                        </div>

                        {/* ── Dish info ── */}
                        <div style={{ padding: '10px 12px' }}>
                          <div style={{ fontWeight: 700, fontSize: '.88rem', marginBottom: 3 }}>{dish.name}</div>
                          {dish.description && (
                            <div style={{ fontSize: '.74rem', color: 'var(--muted)', marginBottom: 7, lineHeight: 1.4 }}>{dish.description}</div>
                          )}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 700, color: 'var(--green)', fontSize: '.88rem' }}>₹{dish.price}</span>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                              {dish.prepTime && <span style={{ fontSize: '.7rem', color: 'var(--muted)' }}>⏱ {dish.prepTime}</span>}
                              <span style={{ fontSize: '.7rem', color: dish.isVeg ? '#16A34A' : '#DC2626', fontWeight: 600 }}>
                                {dish.isVeg ? 'VEG' : 'NON-VEG'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {form.dishes.length > 0 && (
                  <div style={{ marginTop: 14, background: 'var(--green-p)', borderRadius: 10, padding: '10px 14px', fontSize: '.83rem', color: 'var(--green-d)', fontWeight: 600 }}>
                    ✓ Selected: {form.dishes.join(', ')}
                  </div>
                )}
              </div>
            )}

            {/* ── Specialties ── */}
            <div className="card card-body">
              <h3 style={{ marginBottom: 14 }}>✦ Specialties</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {chef.specialties?.length > 0
                  ? chef.specialties.map(s => <span key={s} className="badge badge-green" style={{ fontSize: '.82rem' }}>✦ {s}</span>)
                  : <p style={{ color: 'var(--muted)', fontSize: '.88rem' }}>Not specified yet</p>
                }
              </div>
            </div>

            {/* ── Reviews ── */}
            <div className="card card-body">
              <h3 style={{ marginBottom: 20 }}>Customer Reviews ({reviews.length})</h3>
              {reviews.length === 0 ? (
                <div className="empty" style={{ padding: '32px 0' }}>
                  <div className="empty-ico">⭐</div>
                  <p>No reviews yet — be the first!</p>
                </div>
              ) : (
                <div>
                  {reviews.map(r => (
                    <div key={r._id} style={{ padding: '16px 0', borderBottom: '1px solid var(--g100)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                        <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--green-p)', color: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '.9rem' }}>
                          {r.userId?.name?.charAt(0)}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: '.88rem' }}>{r.userId?.name}</div>
                          <span className="stars sm">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                        </div>
                        <div style={{ fontSize: '.75rem', color: 'var(--muted)' }}>
                          {new Date(r.createdAt).toLocaleDateString('en-IN')}
                        </div>
                      </div>
                      <p style={{ fontSize: '.86rem', color: 'var(--g700)', lineHeight: 1.6, paddingLeft: 50 }}>{r.comment}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Right column — Availability + Book ── */}
          <div className="card card-body" style={{ position: 'sticky', top: 90 }}>
            <h3 style={{ marginBottom: 16 }}>📅 Availability</h3>
            {chef.availability?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {chef.availability.map((a, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--g50)', borderRadius: 9, fontSize: '.85rem' }}>
                    <span style={{ fontWeight: 700 }}>{a.day}</span>
                    <span style={{ color: 'var(--muted)' }}>{a.from} – {a.to}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--muted)', fontSize: '.88rem' }}>Contact chef for availability</p>
            )}
            <button className="btn btn-primary" style={{ width: '100%', marginTop: 18, justifyContent: 'center' }}
              onClick={() => {
                if (!user) { toast.error('Please login first'); nav('/login'); return; }
                if (user.role !== 'user') { toast.error('Only customers can book chefs'); return; }
                setShowModal(true);
              }}>
              📅 Book This Chef
            </button>
          </div>
        </div>
      </div>

      {/* ── Booking Modal ──────────────────────────────────────────────────── */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(5px)', animation: 'fIn .15s ease' }}
          onClick={() => setShowModal(false)}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 32, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,.22)', animation: 'sUp .2s ease' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
              <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1.3rem' }}>📅 Book {chefUser?.name}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'var(--g100)', border: 'none', width: 34, height: 34, borderRadius: '50%', cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
            </div>

            <form onSubmit={handleBook}>
              {/* Date */}
              <div className="form-group">
                <label>Date *</label>
                <input type="date" className="fc" required min={today} value={form.date} onChange={handleDateChange} />
              </div>

              {/* Time slots — shown after date selected */}
              {form.date && (
                <div className="form-group">
                  <label>
                    Time Slot *
                    {slotsLoading && <span style={{ color: 'var(--muted)', fontWeight: 400, marginLeft: 8, fontSize: '.75rem' }}>Loading availability...</span>}
                  </label>
                  <div className="slots-grid">
                    {ALL_SLOTS.map(slot => {
                      const taken = bookedSlots.includes(slot);
                      const selected = form.timeSlot === slot;
                      return (
                        <button key={slot} type="button"
                          className={`slot-btn ${taken ? 'taken' : ''} ${selected && !taken ? 'selected' : ''}`}
                          onClick={() => !taken && setForm(f => ({ ...f, timeSlot: slot }))}>
                          {taken ? `${slot} ✗` : slot}
                        </button>
                      );
                    })}
                  </div>
                  {bookedSlots.length > 0 && (
                    <p style={{ fontSize: '.73rem', color: 'var(--danger)', marginTop: 6 }}>
                      ✗ = Already booked — choose a different time
                    </p>
                  )}
                </div>
              )}

              {/* Duration */}
              <div className="form-group">
                <label>Duration *</label>
                <select className="fc" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: +e.target.value }))}>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(h => <option key={h} value={h}>{h} hour{h > 1 ? 's' : ''}</option>)}
                </select>
              </div>

              {/* Dish selection (only if chef has dishes) */}
              {chef.dishes?.length > 0 && (
                <div className="form-group">
                  <label>Request Specific Dishes (optional)</label>
                  <p style={{ fontSize: '.74rem', color: 'var(--muted)', marginBottom: 8 }}>Select dishes you'd like the chef to prepare</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                    {chef.dishes.map((d, i) => {
                      const imgUrl = getDishImageUrl(d.image);
                      return (
                        <button key={i} type="button"
                          onClick={() => toggleDish(d.name)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 7,
                            padding: '5px 10px 5px 5px',
                            borderRadius: 8,
                            border: `1.5px solid ${form.dishes.includes(d.name) ? 'var(--green)' : 'var(--g200)'}`,
                            background: form.dishes.includes(d.name) ? 'var(--green-p)' : '#fff',
                            cursor: 'pointer',
                            transition: '.15s',
                            fontFamily: 'var(--fb)'
                          }}
                        >
                          {imgUrl ? (
                            <img
                              src={imgUrl}
                              alt={d.name}
                              style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover' }}
                              onError={e => { e.target.style.display = 'none'; }}
                            />
                          ) : (
                            <span style={{ fontSize: '1.1rem' }}>🍽️</span>
                          )}

                          <span style={{
                            fontSize: '.78rem',
                            fontWeight: 600,
                            color: form.dishes.includes(d.name) ? 'var(--green-d)' : 'var(--g700)'
                          }}>
                            {d.name} · ₹{d.price}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Cuisine */}
              <div className="form-group">
                <label>Cuisine Preference</label>
                <select className="fc" value={form.cuisine} onChange={e => setForm(f => ({ ...f, cuisine: e.target.value }))}>
                  <option value="">Select cuisine...</option>
                  {chef.cuisines?.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>

              {/* Address */}
              <div className="form-group">
                <label>Your Home Address *</label>
                <input type="text" className="fc" required placeholder="Full address where chef should come" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
              </div>

              {/* Special requests */}
              <div className="form-group">
                <label>Special Requests</label>
                <textarea className="fc" placeholder="Dietary restrictions, occasion, preferences..." value={form.specialRequests} onChange={e => setForm(f => ({ ...f, specialRequests: e.target.value }))} />
              </div>

              {/* Price summary */}
              <div className="price-summary">
                <div className="ps-row">
                  <span>₹{chef.pricing?.hourly}/hr × {form.duration} hr{form.duration > 1 ? 's' : ''}</span>
                  <span>₹{totalAmount}</span>
                </div>
                {form.dishes.length > 0 && (
                  <div className="ps-row"><span>📝 Dishes: {form.dishes.join(', ')}</span></div>
                )}
                <div className="ps-total">
                  <span>Total Amount</span>
                  <span>₹{totalAmount}</span>
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}
                disabled={submitting || !form.timeSlot || !form.date}>
                {submitting ? '⏳ Sending Request...' : '📅 Send Booking Request'}
              </button>
              <p style={{ textAlign: 'center', fontSize: '.74rem', color: 'var(--muted)', marginTop: 10, lineHeight: 1.5 }}>
                ℹ️ You pay only after the chef confirms your booking.<br />
                You'll receive a notification instantly when the chef responds.
              </p>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
