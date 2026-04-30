import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { bookingAPI, paymentAPI, reviewAPI, notifAPI, userAPI, authAPI } from '../services/api';
import toast from 'react-hot-toast';

const TABS = [
  { key:'bookings', label:'My Bookings',      ico:'📅' },
  { key:'payments', label:'Payment History',  ico:'💳' },
  { key:'notifs',   label:'Notifications',    ico:'🔔' },
  { key:'profile',  label:'My Profile',       ico:'👤' },
  { key:'security', label:'Change Password',  ico:'🔐' },
];

const STATUS_LABEL = {
  pending:   '⏳ Pending Chef Confirmation',
  confirmed: '✅ Confirmed — Payment Due',
  rejected:  '❌ Declined by Chef',
  completed: '🎉 Completed',
  cancelled: '🚫 Cancelled'
};

// ─── RAZORPAY PAYMENT COMPONENT ────────────────────────────────────────────────
function PaymentModal({ booking, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const apiBase = import.meta.env.VITE_API_URL?.replace('/api','') || '';

  const handlePay = async () => {
    setLoading(true);
    try {
      const r = await paymentAPI.createOrder({ bookingId: booking._id });
      const { order, amount, key, mock, bookingId } = r.data;

      if (mock) {
        // Razorpay not configured — use mock payment
        toast('⚠️ Using test/mock payment (Razorpay not configured)', { icon:'ℹ️' });
        await paymentAPI.verify({ bookingId, mock: true });
        toast.success('✅ Mock payment successful! Booking confirmed.');
        onSuccess();
        return;
      }

      // Real Razorpay checkout
      const options = {
        key,
        amount: order.amount,
        currency: 'INR',
        name: 'ChefKart',
        description: `Booking with ${booking.chefId?.userId?.name}`,
        order_id: order.id,
        handler: async resp => {
          try {
            await paymentAPI.verify({
              razorpay_order_id:   resp.razorpay_order_id,
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature:  resp.razorpay_signature,
              bookingId
            });
            toast.success('✅ Payment successful! Booking confirmed.');
            onSuccess();
          } catch { toast.error('Payment verification failed. Contact support.'); }
        },
        prefill: { name: booking.userId?.name, email: booking.userId?.email },
        theme: { color: '#2E7D32' },
        modal: { ondismiss: () => setLoading(false) }
      };

      if (!window.Razorpay) {
        // Load Razorpay SDK dynamically
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => { const rz = new window.Razorpay(options); rz.open(); };
        document.body.appendChild(script);
      } else {
        const rz = new window.Razorpay(options);
        rz.open();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment initiation failed');
      setLoading(false);
    }
  };

  const chefName = booking.chefId?.userId?.name || 'Chef';
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', padding:20, backdropFilter:'blur(5px)' }} onClick={onClose}>
      <div style={{ background:'#fff', borderRadius:20, padding:36, width:'100%', maxWidth:460, boxShadow:'0 24px 60px rgba(0,0,0,.22)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
          <h3 style={{ fontFamily:'var(--fd)', fontSize:'1.3rem' }}>💳 Complete Payment</h3>
          <button onClick={onClose} style={{ background:'var(--g100)', border:'none', width:34, height:34, borderRadius:'50%', cursor:'pointer', fontSize:'1.1rem' }}>✕</button>
        </div>

        <div style={{ background:'var(--green-p)', borderRadius:12, padding:'16px 20px', marginBottom:20 }}>
          <div style={{ fontWeight:700, fontSize:'1rem', marginBottom:10, color:'var(--green-d)' }}>Booking Summary</div>
          {[
            ['Chef', chefName],
            ['Date', new Date(booking.date).toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' })],
            ['Time', booking.timeSlot],
            ['Duration', `${booking.duration} hour${booking.duration > 1 ? 's' : ''}`],
            ['Address', booking.address],
            booking.cuisine && ['Cuisine', booking.cuisine],
            booking.dishes?.length && ['Dishes', booking.dishes.join(', ')],
          ].filter(Boolean).map(([k,v]) => (
            <div key={k} style={{ display:'flex', justifyContent:'space-between', fontSize:'.87rem', marginBottom:5 }}>
              <span style={{ color:'var(--g600)' }}>{k}</span>
              <span style={{ fontWeight:600, maxWidth:260, textAlign:'right' }}>{v}</span>
            </div>
          ))}
          <div style={{ borderTop:'1px solid var(--green-l)', paddingTop:10, marginTop:8, display:'flex', justifyContent:'space-between', fontWeight:700, fontSize:'1.1rem', color:'var(--green-d)' }}>
            <span>Total Amount</span>
            <span>₹{booking.totalAmount}</span>
          </div>
        </div>

        <div style={{ background:'#FFF8E1', border:'1px solid #FFE082', borderRadius:10, padding:'10px 14px', marginBottom:20, fontSize:'.8rem', color:'#6D4C41' }}>
          <strong>🔒 Secure Payment via Razorpay</strong><br/>
          Your payment is encrypted and secured. Use UPI, Net Banking, Cards or Wallets.
          <br/><span style={{ color:'var(--orange)', fontWeight:600 }}>Test cards: 4111 1111 1111 1111, any future expiry, any CVV</span>
        </div>

        <button className="btn btn-orange btn-lg" style={{ width:'100%', justifyContent:'center' }} onClick={handlePay} disabled={loading}>
          {loading ? 'Processing...' : `Pay ₹${booking.totalAmount} Now →`}
        </button>
        <p style={{ textAlign:'center', fontSize:'.75rem', color:'var(--muted)', marginTop:10 }}>
          Powered by Razorpay · 100% Secure
        </p>
      </div>
    </div>
  );
}

// ─── MAIN DASHBOARD ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user, setUser, unread } = useAuth();
  const [tab, setTab]         = useState('bookings');
  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [notifs, setNotifs]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [payBooking, setPayBooking] = useState(null); // booking to pay
  const [reviewModal, setReviewModal] = useState(null);
  const [review, setReview]   = useState({ rating:5, comment:'' });
  const [profileForm, setProfileForm] = useState({ name:user?.name||'', phone:user?.phone||'', address:user?.address||'' });
  const [pwForm, setPwForm]   = useState({ currentPassword:'', newPassword:'', confirmPassword:'' });
  const [profileLoading, setProfileLoading] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  useEffect(() => {
    bookingAPI.getMine().then(r => setBookings(r.data.bookings||[])).finally(() => setLoading(false));
  }, []);

  const loadPayments = async () => {
    if (payments.length) return;
    try { const r = await paymentAPI.getMine(); setPayments(r.data.payments||[]); } catch {}
  };

  const loadNotifs = async () => {
    try { const r = await notifAPI.getAll(); setNotifs(r.data.notifications||[]); await notifAPI.readAll(); } catch {}
  };

  const switchTab = t => {
    setTab(t);
    if (t === 'payments') loadPayments();
    if (t === 'notifs')   loadNotifs();
  };

  const handleCancel = async id => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    try {
      await bookingAPI.cancel(id);
      setBookings(bs => bs.map(b => b._id === id ? { ...b, status:'cancelled' } : b));
      toast.success('Booking cancelled successfully');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to cancel'); }
  };

  const handlePaymentSuccess = () => {
    setPayBooking(null);
    setBookings(bs => bs.map(b => b._id === payBooking._id ? { ...b, paymentStatus:'paid' } : b));
    loadPayments();
  };

  const submitReview = async e => {
    e.preventDefault();
    try {
      await reviewAPI.create({ chefId: reviewModal.chefId._id, bookingId: reviewModal._id, ...review });
      toast.success('Review submitted! Thank you 🌟');
      setReviewModal(null);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to submit review'); }
  };

  const handleProfileSave = async e => {
    e.preventDefault();
    setProfileLoading(true);
    try {
      const r = await userAPI.updateProfile(profileForm);
      setUser(r.data.user);
      toast.success('Profile updated!');
    } catch { toast.error('Failed to update'); } finally { setProfileLoading(false); }
  };

  const handlePwChange = async e => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) { toast.error('Passwords do not match'); return; }
    if (pwForm.newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setPwLoading(true);
    try {
      await authAPI.updatePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      toast.success('Password changed successfully!');
      setPwForm({ currentPassword:'', newPassword:'', confirmPassword:'' });
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); } finally { setPwLoading(false); }
  };

  const sBadge = s => <span className={`badge status-${s}`} style={{ fontSize:'.78rem' }}>{STATUS_LABEL[s] || s}</span>;

  return (
    <>
      {payBooking && <PaymentModal booking={payBooking} onClose={() => setPayBooking(null)} onSuccess={handlePaymentSuccess} />}

      {reviewModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', padding:20, backdropFilter:'blur(4px)' }} onClick={() => setReviewModal(null)}>
          <div style={{ background:'#fff', borderRadius:20, padding:34, width:'100%', maxWidth:460, boxShadow:'var(--shx)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:22 }}>
              <h3 style={{ fontFamily:'var(--fd)', fontSize:'1.2rem' }}>⭐ Write a Review</h3>
              <button onClick={() => setReviewModal(null)} style={{ background:'var(--g100)', border:'none', width:34, height:34, borderRadius:'50%', cursor:'pointer' }}>✕</button>
            </div>
            <form onSubmit={submitReview}>
              <div className="form-group">
                <label>Your Rating</label>
                <div style={{ display:'flex', gap:10, marginTop:6 }}>
                  {[1,2,3,4,5].map(s => (
                    <span key={s} onClick={() => setReview(r => ({ ...r, rating:s }))}
                      style={{ fontSize:'2.2rem', cursor:'pointer', color: s <= review.rating ? '#F59E0B' : 'var(--g200)', transition:'.15s' }}>★</span>
                  ))}
                  <span style={{ alignSelf:'center', fontSize:'.85rem', color:'var(--muted)', marginLeft:4 }}>({review.rating}/5)</span>
                </div>
              </div>
              <div className="form-group">
                <label>Your Comment</label>
                <textarea className="fc" rows={4} required placeholder="Share your experience with this chef..." value={review.comment} onChange={e => setReview(r => ({ ...r, comment:e.target.value }))} />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width:'100%', justifyContent:'center' }}>Submit Review</button>
            </form>
          </div>
        </div>
      )}

      <div className="db-wrap">
        <div className="db-sidebar">
          <div className="db-profile">
            <div className="db-av">{user?.name?.charAt(0).toUpperCase()}</div>
            <div className="db-uname">{user?.name}</div>
            <span className="db-urole">Customer</span>
          </div>
          <div className="db-nav">
            {TABS.map(t => (
              <button key={t.key} className={`db-link ${tab === t.key ? 'active' : ''}`} onClick={() => switchTab(t.key)}>
                <span className="ico">{t.ico}</span> {t.label}
                {t.key === 'notifs' && unread > 0 && <span className="badge badge-red">{unread}</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="db-content">

          {/* ── BOOKINGS ── */}
          {tab === 'bookings' && (
            <div>
              <div className="db-title">My Bookings</div>
              <div className="db-sub">Track all your chef booking requests and their current status</div>
              {loading ? <div className="loader"><div className="spinner"/></div>
                : bookings.length === 0 ? (
                  <div className="empty">
                    <div className="empty-ico">📅</div>
                    <h3>No bookings yet</h3>
                    <p>Browse our chefs and make your first booking!</p>
                    <a href="/chefs" className="btn btn-primary">Find a Chef 🍳</a>
                  </div>
                ) : (
                  <div className="bk-list">
                    {bookings.map(b => {
                      const ch = b.chefId?.userId;
                      const needsPayment = b.status === 'confirmed' && b.paymentStatus !== 'paid';
                      return (
                        <div key={b._id} className="bk-card" style={{ flexDirection:'column', gap:12 }}>
                          <div style={{ display:'flex', gap:14, alignItems:'flex-start', width:'100%' }}>
                            <div className="bk-av" style={{ background:'var(--green-p)', color:'var(--green)', fontSize:'1.15rem', fontWeight:700 }}>
                              {ch?.name?.charAt(0) || '?'}
                            </div>
                            <div className="bk-body">
                              <div className="bk-name">Chef {ch?.name}</div>
                              <div className="bk-meta">
                                <span>📅 {new Date(b.date).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}</span>
                                <span>🕐 {b.timeSlot} · {b.duration}h</span>
                                <span>📍 {b.address?.substring(0,35)}{b.address?.length > 35 ? '...' : ''}</span>
                                {b.cuisine && <span>🍽️ {b.cuisine}</span>}
                                <span style={{ fontWeight:700, color:'var(--green)' }}>₹{b.totalAmount}</span>
                              </div>
                              <div style={{ display:'flex', gap:7, flexWrap:'wrap', alignItems:'center', marginTop:4 }}>
                                {sBadge(b.status)}
                                <span className={`badge ${b.paymentStatus === 'paid' ? 'badge-green' : 'badge-orange'}`}>
                                  {b.paymentStatus === 'paid' ? '💰 Paid' : '💳 Payment Pending'}
                                </span>
                              </div>
                              {b.status === 'rejected' && b.rejectionReason && (
                                <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:8, padding:'8px 12px', marginTop:8, fontSize:'.8rem', color:'var(--danger)' }}>
                                  <strong>Reason:</strong> {b.rejectionReason}
                                </div>
                              )}
                              {b.dishes?.length > 0 && (
                                <div style={{ fontSize:'.76rem', color:'var(--muted)', marginTop:4 }}>🍽️ Requested: {b.dishes.join(', ')}</div>
                              )}
                            </div>
                            <div className="bk-acts">
                              {['pending','confirmed'].includes(b.status) && (
                                <button className="btn btn-danger btn-sm" onClick={() => handleCancel(b._id)}>Cancel</button>
                              )}
                              {b.status === 'completed' && b.paymentStatus === 'paid' && (
                                <button className="btn btn-outline btn-sm" onClick={() => setReviewModal(b)}>⭐ Review</button>
                              )}
                            </div>
                          </div>

                          {/* Payment CTA — prominent when confirmed & unpaid */}
                          {needsPayment && (
                            <div style={{ background:'linear-gradient(135deg,#FFF3E0,#FFF8E1)', border:'2px solid #FFB74D', borderRadius:12, padding:'14px 18px', display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                              <div>
                                <div style={{ fontWeight:700, color:'#E65100', fontSize:'.92rem' }}>🎉 Chef confirmed your booking!</div>
                                <div style={{ fontSize:'.8rem', color:'#BF360C', marginTop:2 }}>Complete payment to secure your slot.</div>
                              </div>
                              <button className="btn btn-orange" onClick={() => setPayBooking(b)} style={{ flexShrink:0 }}>
                                💳 Pay ₹{b.totalAmount} Now
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
            </div>
          )}

          {/* ── PAYMENTS ── */}
          {tab === 'payments' && (
            <div>
              <div className="db-title">Payment History</div>
              <div className="db-sub">Complete record of all your transactions with Razorpay details</div>
              {payments.length === 0 ? (
                <div className="empty"><div className="empty-ico">💳</div><h3>No payments yet</h3><p>Your payment history will appear here once you pay for a booking</p></div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Chef</th><th>Booking Date</th><th>Amount</th><th>Status</th><th>Razorpay Payment ID</th><th>Paid On</th></tr></thead>
                    <tbody>
                      {payments.map(p => (
                        <tr key={p._id}>
                          <td><strong>{p.bookingId?.chefId?.userId?.name || '—'}</strong></td>
                          <td>{p.bookingId?.date ? new Date(p.bookingId.date).toLocaleDateString('en-IN') : '—'}</td>
                          <td style={{ fontWeight:700, color:'var(--green)' }}>₹{p.amount}</td>
                          <td><span className={`badge ${p.status === 'paid' ? 'badge-green' : p.status === 'failed' ? 'badge-red' : 'badge-orange'}`}>{p.status}</span></td>
                          <td style={{ fontFamily:'monospace', fontSize:'.77rem', color:'var(--muted)' }}>{p.razorpayPaymentId || '—'}</td>
                          <td>{new Date(p.createdAt).toLocaleDateString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── NOTIFICATIONS ── */}
          {tab === 'notifs' && (
            <div>
              <div className="db-title">Notifications</div>
              <div className="db-sub">Real-time updates about your bookings and payments</div>
              {notifs.length === 0 ? (
                <div className="empty"><div className="empty-ico">🔔</div><h3>No notifications yet</h3><p>You'll receive updates here when chefs respond to bookings</p></div>
              ) : (
                <div className="notif-list">
                  {notifs.map(n => (
                    <div key={n._id} className={`notif-item ${n.isRead ? '' : 'unread'}`}>
                      <div className="notif-ico">{n.title?.charAt(0)}</div>
                      <div className="notif-body">
                        <div className="notif-title">{n.title}</div>
                        <div className="notif-msg">{n.message}</div>
                        <div className="notif-time">{new Date(n.createdAt).toLocaleString('en-IN')}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── PROFILE ── */}
          {tab === 'profile' && (
            <div style={{ maxWidth:520 }}>
              <div className="db-title">My Profile</div>
              <div className="db-sub">Update your personal information</div>
              <div className="card card-body">
                <form onSubmit={handleProfileSave}>
                  <div className="form-group"><label>Full Name</label><input className="fc" value={profileForm.name} onChange={e => setProfileForm(f => ({ ...f, name:e.target.value }))} /></div>
                  <div className="form-group"><label>Email (cannot change)</label><input className="fc" value={user?.email} disabled style={{ opacity:.6 }} /></div>
                  <div className="form-group"><label>Phone</label><input className="fc" placeholder="+91 9876543210" value={profileForm.phone} onChange={e => setProfileForm(f => ({ ...f, phone:e.target.value }))} /></div>
                  <div className="form-group"><label>Default Address</label><input className="fc" placeholder="Your home address" value={profileForm.address} onChange={e => setProfileForm(f => ({ ...f, address:e.target.value }))} /></div>
                  <button type="submit" className="btn btn-primary" disabled={profileLoading}>{profileLoading ? 'Saving...' : 'Save Changes'}</button>
                </form>
              </div>
            </div>
          )}

          {/* ── SECURITY ── */}
          {tab === 'security' && (
            <div style={{ maxWidth:460 }}>
              <div className="db-title">Change Password</div>
              <div className="db-sub">Keep your account secure</div>
              <div className="card card-body">
                <form onSubmit={handlePwChange}>
                  <div className="form-group"><label>Current Password</label><input type="password" className="fc" required placeholder="••••••••" value={pwForm.currentPassword} onChange={e => setPwForm(f => ({ ...f, currentPassword:e.target.value }))} /></div>
                  <div className="form-group"><label>New Password</label><input type="password" className="fc" required placeholder="Min 6 characters" value={pwForm.newPassword} onChange={e => setPwForm(f => ({ ...f, newPassword:e.target.value }))} /></div>
                  <div className="form-group"><label>Confirm New Password</label><input type="password" className="fc" required placeholder="Repeat new password" value={pwForm.confirmPassword} onChange={e => setPwForm(f => ({ ...f, confirmPassword:e.target.value }))} /></div>
                  <button type="submit" className="btn btn-primary" disabled={pwLoading}>{pwLoading ? 'Changing...' : 'Change Password'}</button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
