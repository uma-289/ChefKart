import { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';
import toast from 'react-hot-toast';

const TABS = [
  { key:'overview',      label:'Overview',          ico:'📊' },
  { key:'applications',  label:'Chef Applications', ico:'📝' },
  { key:'users',         label:'Customers',         ico:'👥' },
  { key:'chefs',         label:'Chefs',             ico:'👨‍🍳' },
  { key:'bookings',      label:'Bookings',          ico:'📅' },
  { key:'payments',      label:'Payments',          ico:'💳' },
];

export default function AdminDashboard() {
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [recentBookings, setRecentBookings] = useState([]);
  const [apps, setApps] = useState([]);
  const [users, setUsers] = useState([]);
  const [chefs, setChefs] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => { loadOverview(); }, []);

  const loadOverview = async () => {
    setLoading(true);
    try {
      const r = await adminAPI.getStats();
      setStats(r.data.stats);
      setRecentBookings(r.data.recentBookings||[]);
    } finally { setLoading(false); }
  };

  const switchTab = async t => {
    setTab(t);
    setLoading(true);
    try {
      if (t==='applications') { const r=await adminAPI.getApplications(); setApps(r.data.applications||[]); }
      if (t==='users') { const r=await adminAPI.getUsers(); setUsers(r.data.users||[]); }
      if (t==='chefs') { const r=await adminAPI.getChefs(); setChefs(r.data.chefs||[]); }
      if (t==='bookings') { const r=await adminAPI.getBookings(); setBookings(r.data.bookings||[]); }
      if (t==='payments') { const r=await adminAPI.getPayments(); setPayments(r.data.payments||[]); }
    } finally { setLoading(false); }
  };

  const approveApp = async id => {
    try {
      await adminAPI.approveApplication(id);
      setApps(a => a.filter(x=>x._id!==id));
      setStats(s => s ? {...s, pendingApplications:(s.pendingApplications||1)-1, totalChefs:s.totalChefs+1} : s);
      toast.success('Chef approved! They can now log in as a chef.');
    } catch (err) { toast.error(err.response?.data?.message||'Failed'); }
  };

  const rejectApp = async () => {
    try {
      await adminAPI.rejectApplication(rejectModal, { reason: rejectReason });
      setApps(a => a.filter(x=>x._id!==rejectModal));
      setRejectModal(null); setRejectReason('');
      toast.success('Application rejected');
    } catch { toast.error('Failed'); }
  };

  const toggleUser = async id => {
    try {
      const r = await adminAPI.toggleUser(id);
      setUsers(us => us.map(u => u._id===id ? r.data.user : u));
      toast.success(r.data.message);
    } catch { toast.error('Failed'); }
  };

  const removeChef = async (id, name) => {
    if (!confirm(`Remove chef ${name}? This will cancel their active bookings.`)) return;
    try {
      await adminAPI.removeChef(id);
      setChefs(cs => cs.filter(c=>c._id!==id));
      toast.success(`Chef ${name} removed`);
    } catch { toast.error('Failed'); }
  };

  const toggleChef = async id => {
    try {
      await adminAPI.toggleChef(id);
      setChefs(cs => cs.map(c => c._id===id ? {...c, isAvailable:!c.isAvailable} : c));
      toast.success('Chef status updated');
    } catch { toast.error('Failed'); }
  };

  const sBadge = s => <span className={`badge status-${s}`}>{s}</span>;

  return (
    <div className="db-wrap">
      <div className="db-sidebar">
        <div className="db-profile">
          <div className="db-av" style={{background:'var(--orange)'}}>A</div>
          <div className="db-uname">Administrator</div>
          <span className="db-urole" style={{color:'var(--orange)'}}>Admin</span>
        </div>
        <div className="db-nav">
          {TABS.map(t=>(
            <button key={t.key} className={`db-link ${tab===t.key?'active':''}`} onClick={()=>switchTab(t.key)}>
              <span className="ico">{t.ico}</span> {t.label}
              {t.key==='applications' && stats?.pendingApplications>0 && <span className="badge badge-red">{stats.pendingApplications}</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="db-content">
        {loading && <div className="loader"><div className="spinner"/></div>}
        {!loading && (
          <>
            {/* OVERVIEW */}
            {tab==='overview' && stats && (
              <div>
                <div className="db-title">Platform Overview</div>
                <div className="db-sub">Real-time metrics across ChefKart</div>
                <div className="stat-row">
                  <div className="sc green"><div className="sc-icon">👤</div><div className="sc-num">{stats.totalUsers}</div><div className="sc-lbl">Customers</div></div>
                  <div className="sc green"><div className="sc-icon">👨‍🍳</div><div className="sc-num">{stats.totalChefs}</div><div className="sc-lbl">Active Chefs</div></div>
                  <div className="sc blue"><div className="sc-icon">📅</div><div className="sc-num">{stats.totalBookings}</div><div className="sc-lbl">Total Bookings</div></div>
                  <div className="sc orange"><div className="sc-icon">⏳</div><div className="sc-num">{stats.pendingBookings}</div><div className="sc-lbl">Pending</div></div>
                  <div className="sc orange"><div className="sc-icon">📝</div><div className="sc-num">{stats.pendingApplications}</div><div className="sc-lbl">Applications</div></div>
                  <div className="sc green"><div className="sc-icon">💰</div><div className="sc-num">₹{(stats.totalRevenue/100000).toFixed(1)}L</div><div className="sc-lbl">Revenue</div></div>
                </div>
                {stats.pendingApplications>0 && (
                  <div style={{background:'#FFFBEB',border:'1px solid #FED7AA',borderRadius:12,padding:'14px 20px',marginBottom:24,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <div><strong style={{color:'#92400E'}}>⚠️ {stats.pendingApplications} Chef Application(s) Pending Review</strong><p style={{fontSize:'.83rem',color:'#B45309',marginTop:2}}>Review and approve new chef applications</p></div>
                    <button className="btn btn-orange btn-sm" onClick={()=>switchTab('applications')}>Review Now →</button>
                  </div>
                )}
                <div className="table-wrap">
                  <div className="tw-head"><h3>Recent Bookings</h3></div>
                  <table>
                    <thead><tr><th>Customer</th><th>Chef</th><th>Date</th><th>Amount</th><th>Payment</th><th>Status</th></tr></thead>
                    <tbody>
                      {recentBookings.map(b=>(
                        <tr key={b._id}>
                          <td><strong>{b.userId?.name}</strong></td>
                          <td>{b.chefId?.userId?.name||'—'}</td>
                          <td>{new Date(b.date).toLocaleDateString('en-IN')}</td>
                          <td style={{fontWeight:700,color:'var(--green)'}}>₹{b.totalAmount}</td>
                          <td><span className={`badge ${b.paymentStatus==='paid'?'badge-green':'badge-orange'}`}>{b.paymentStatus}</span></td>
                          <td>{sBadge(b.status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* APPLICATIONS */}
            {tab==='applications' && (
              <div>
                <div className="db-title">Chef Applications</div>
                <div className="db-sub">Review and approve/reject chef registration requests</div>
                {apps.length===0 ? <div className="empty"><div className="empty-ico">📝</div><h3>No pending applications</h3><p>All caught up!</p></div>
                  : (
                    <div style={{display:'flex',flexDirection:'column',gap:16}}>
                      {apps.map(a=>(
                        <div key={a._id} className="card card-body">
                          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:16,flexWrap:'wrap'}}>
                            <div style={{flex:1}}>
                              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
                                <div style={{width:44,height:44,borderRadius:'50%',background:'var(--orange-l)',color:'var(--orange)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:'1.1rem'}}>{a.name?.charAt(0)}</div>
                                <div><div style={{fontWeight:700,fontSize:1+'rem'}}>{a.name}</div><div style={{fontSize:'.8rem',color:'var(--muted)'}}>{a.email} · {a.phone}</div></div>
                              </div>
                              {a.chefApplicationData && (
                                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:10,marginTop:10}}>
                                  {[
                                    ['📝 Bio', a.chefApplicationData.bio],
                                    ['📍 Location', a.chefApplicationData.location],
                                    ['🕐 Experience', `${a.chefApplicationData.experience} years`],
                                    ['💰 Hourly Rate', `₹${a.chefApplicationData.hourlyRate}/hr`],
                                    ['🍽️ Cuisines', (a.chefApplicationData.cuisines||[]).join(', ')],
                                  ].map(([label,val])=>val && (
                                    <div key={label} style={{background:'var(--g50)',borderRadius:8,padding:'8px 12px'}}>
                                      <div style={{fontSize:'.73rem',color:'var(--muted)',marginBottom:2}}>{label}</div>
                                      <div style={{fontSize:'.85rem',fontWeight:600,color:'var(--text)'}}>{val}</div>
                                    </div>
                                  ))}
                                </div>
                              )}
                              <div style={{fontSize:'.75rem',color:'var(--g400)',marginTop:10}}>Applied: {new Date(a.createdAt).toLocaleString('en-IN')}</div>
                            </div>
                            <div style={{display:'flex',gap:8,flexShrink:0}}>
                              <button className="btn btn-primary btn-sm" onClick={()=>approveApp(a._id)}>✓ Approve</button>
                              <button className="btn btn-danger btn-sm" onClick={()=>{setRejectModal(a._id);setRejectReason('');}}>✕ Reject</button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
              </div>
            )}

            {/* USERS */}
            {tab==='users' && (
              <div>
                <div className="db-title">Manage Customers</div>
                <div className="db-sub">{users.length} registered customers</div>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Joined</th><th>Status</th><th>Action</th></tr></thead>
                    <tbody>
                      {users.map(u=>(
                        <tr key={u._id}>
                          <td><strong>{u.name}</strong></td>
                          <td style={{color:'var(--muted)',fontSize:'.82rem'}}>{u.email}</td>
                          <td>{u.phone||'—'}</td>
                          <td>{new Date(u.createdAt).toLocaleDateString('en-IN')}</td>
                          <td><span className={`badge ${u.isActive?'badge-green':'badge-red'}`}>{u.isActive?'Active':'Blocked'}</span></td>
                          <td><button className={`btn btn-sm ${u.isActive?'btn-danger':'btn-primary'}`} onClick={()=>toggleUser(u._id)}>{u.isActive?'Block':'Unblock'}</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* CHEFS */}
            {tab==='chefs' && (
              <div>
                <div className="db-title">Manage Chefs</div>
                <div className="db-sub">{chefs.length} active chefs — you can remove or suspend chefs</div>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Chef</th><th>Email</th><th>Location</th><th>Rating</th><th>Price/hr</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>
                      {chefs.map(c=>(
                        <tr key={c._id}>
                          <td><strong>{c.userId?.name}</strong></td>
                          <td style={{fontSize:'.8rem',color:'var(--muted)'}}>{c.userId?.email}</td>
                          <td>{c.location||'—'}</td>
                          <td><span style={{color:'#F59E0B',fontWeight:700}}>★ {c.rating||'—'}</span></td>
                          <td style={{fontWeight:700,color:'var(--green)'}}>₹{c.pricing?.hourly}</td>
                          <td><span className={`badge ${c.isAvailable?'badge-green':'badge-gray'}`}>{c.isAvailable?'Available':'Suspended'}</span></td>
                          <td>
                            <div style={{display:'flex',gap:6}}>
                              <button className={`btn btn-sm ${c.isAvailable?'btn-outline':'btn-primary'}`} onClick={()=>toggleChef(c._id)}>{c.isAvailable?'Suspend':'Activate'}</button>
                              <button className="btn btn-danger btn-sm" onClick={()=>removeChef(c._id,c.userId?.name)}>Remove</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* BOOKINGS */}
            {tab==='bookings' && (
              <div>
                <div className="db-title">All Bookings</div>
                <div className="db-sub">{bookings.length} total bookings</div>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Customer</th><th>Chef</th><th>Date</th><th>Time</th><th>Dur</th><th>Amount</th><th>Payment</th><th>Status</th></tr></thead>
                    <tbody>
                      {bookings.map(b=>(
                        <tr key={b._id}>
                          <td><strong>{b.userId?.name}</strong><div style={{fontSize:'.74rem',color:'var(--muted)'}}>{b.userId?.email}</div></td>
                          <td>{b.chefId?.userId?.name||'—'}</td>
                          <td>{new Date(b.date).toLocaleDateString('en-IN')}</td>
                          <td style={{fontSize:'.82rem'}}>{b.timeSlot}</td>
                          <td>{b.duration}h</td>
                          <td style={{fontWeight:700,color:'var(--green)'}}>₹{b.totalAmount}</td>
                          <td><span className={`badge ${b.paymentStatus==='paid'?'badge-green':'badge-orange'}`}>{b.paymentStatus}</span></td>
                          <td>{sBadge(b.status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* PAYMENTS */}
            {tab==='payments' && (
              <div>
                <div className="db-title">Payment Records</div>
                <div className="db-sub">{payments.length} payment transactions</div>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Customer</th><th>Amount</th><th>Status</th><th>Razorpay Order ID</th><th>Payment ID</th><th>Date</th></tr></thead>
                    <tbody>
                      {payments.map(p=>(
                        <tr key={p._id}>
                          <td><strong>{p.userId?.name}</strong><div style={{fontSize:'.74rem',color:'var(--muted)'}}>{p.userId?.email}</div></td>
                          <td style={{fontWeight:700,color:'var(--green)'}}>₹{p.amount}</td>
                          <td><span className={`badge ${p.status==='paid'?'badge-green':p.status==='failed'?'badge-red':'badge-orange'}`}>{p.status}</span></td>
                          <td style={{fontFamily:'monospace',fontSize:'.74rem',color:'var(--muted)'}}>{p.razorpayOrderId||'—'}</td>
                          <td style={{fontFamily:'monospace',fontSize:'.74rem',color:'var(--muted)'}}>{p.razorpayPaymentId||'—'}</td>
                          <td>{new Date(p.createdAt).toLocaleDateString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Reject Application Modal */}
      {rejectModal && (
        <div className="modal-ov" onClick={()=>setRejectModal(null)}>
          <div className="modal" style={{maxWidth:380}} onClick={e=>e.stopPropagation()}>
            <div className="modal-head"><h3>Reject Application</h3><button className="close-btn" onClick={()=>setRejectModal(null)}>✕</button></div>
            <div className="form-group"><label>Reason for Rejection</label><textarea className="fc" rows={3} placeholder="e.g. Insufficient experience, incomplete profile..." value={rejectReason} onChange={e=>setRejectReason(e.target.value)}/></div>
            <div style={{display:'flex',gap:10}}>
              <button className="btn btn-danger" style={{flex:1}} onClick={rejectApp} disabled={!rejectReason}>Reject Application</button>
              <button className="btn btn-outline" onClick={()=>setRejectModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
