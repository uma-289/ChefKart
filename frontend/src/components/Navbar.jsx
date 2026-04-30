import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { notifAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function Navbar() {
  const { user, logout, unread, setUnread } = useAuth();
  const loc = useLocation();
  const nav = useNavigate();
  const [notifs, setNotifs] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const ref = useRef();

  const dashLink = user?.role === 'admin' ? '/admin' : user?.role === 'chef' ? '/chef-dashboard' : '/dashboard';

  useEffect(() => {
    const close = e => { if (ref.current && !ref.current.contains(e.target)) { setShowNotifs(false); setShowMenu(false); } };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const openNotifs = async () => {
    if (!showNotifs) {
      try {
        const r = await notifAPI.getAll();
        setNotifs(r.data.notifications || []);
        if (unread > 0) { await notifAPI.readAll(); setUnread(0); }
      } catch {}
    }
    setShowNotifs(v => !v);
    setShowMenu(false);
  };

  const handleLogout = () => { logout(); toast.success('Logged out'); nav('/'); };
  const active = p => loc.pathname === p;

  return (
    <nav className="navbar">
      <div className="container">
        <Link to="/" className="nav-logo">
          <div className="nav-logo-icon">🍳</div>
          Chef<span className="dot">Kart</span>
        </Link>
        <div className="nav-links">
          <button className={`nav-link ${active('/') ? 'active' : ''}`} onClick={() => nav('/')}>Home</button>
          <button className={`nav-link ${active('/chefs') ? 'active' : ''}`} onClick={() => nav('/chefs')}>Find Chefs</button>
          {user && <button className={`nav-link ${active(dashLink) ? 'active' : ''}`} onClick={() => nav(dashLink)}>Dashboard</button>}
        </div>
        <div className="nav-right" ref={ref}>
          {user ? (
            <>
              <div style={{ position: 'relative' }}>
                <button className="notif-btn" onClick={openNotifs} title="Notifications">
                  🔔
                  {unread > 0 && <span className="notif-dot"/>}
                </button>
                {showNotifs && (
                  <div style={{ position: 'absolute', right: 0, top: 46, width: 340, background: '#fff', borderRadius: 14, boxShadow: 'var(--shx)', border: '1px solid var(--g100)', zIndex: 9999, maxHeight: 440, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--g100)', fontWeight: 700, fontSize: '.9rem' }}>Notifications</div>
                    <div style={{ overflowY: 'auto', flex: 1 }}>
                      {notifs.length === 0 ? (
                        <div style={{ padding: 28, textAlign: 'center', color: 'var(--muted)', fontSize: '.85rem' }}>No notifications yet</div>
                      ) : notifs.map(n => (
                        <div key={n._id} style={{ padding: '12px 16px', borderBottom: '1px solid var(--g100)', background: n.isRead ? '#fff' : 'var(--green-p)', cursor: 'default' }}>
                          <div style={{ fontWeight: 700, fontSize: '.83rem', marginBottom: 3 }}>{n.title}</div>
                          <div style={{ fontSize: '.78rem', color: 'var(--muted)', lineHeight: 1.5 }}>{n.message}</div>
                          <div style={{ fontSize: '.7rem', color: 'var(--g400)', marginTop: 4 }}>{new Date(n.createdAt).toLocaleString('en-IN')}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <div className="user-chip" onClick={() => { setShowMenu(v => !v); setShowNotifs(false); }}>
                  <div className="user-av">{user.name?.charAt(0).toUpperCase()}</div>
                  <span className="user-chip-name">{user.name?.split(' ')[0]}</span>
                  <span style={{ fontSize: '.7rem', color: 'var(--g400)' }}>▾</span>
                </div>
                {showMenu && (
                  <div style={{ position: 'absolute', right: 0, top: 46, background: '#fff', borderRadius: 12, boxShadow: 'var(--shx)', border: '1px solid var(--g100)', zIndex: 9999, minWidth: 180, overflow: 'hidden' }}>
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--g100)' }}>
                      <div style={{ fontWeight: 700, fontSize: '.88rem' }}>{user.name}</div>
                      <div style={{ fontSize: '.75rem', color: 'var(--muted)', marginTop: 2 }}>{user.email}</div>
                      <span className="badge badge-green" style={{ marginTop: 5 }}>{user.role}</span>
                    </div>
                    <button onClick={() => { nav(dashLink); setShowMenu(false); }} style={{ width: '100%', padding: '11px 16px', border: 'none', background: 'transparent', textAlign: 'left', fontSize: '.86rem', cursor: 'pointer', display: 'flex', gap: 8, alignItems: 'center' }}>
                      📊 Dashboard
                    </button>
                    <button onClick={handleLogout} style={{ width: '100%', padding: '11px 16px', border: 'none', background: 'transparent', textAlign: 'left', fontSize: '.86rem', cursor: 'pointer', color: 'var(--danger)', display: 'flex', gap: 8, alignItems: 'center', borderTop: '1px solid var(--g100)' }}>
                      🚪 Logout
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-outline btn-sm">Login</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Sign Up</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
