import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Chefs from './pages/Chefs';
import ChefDetail from './pages/ChefDetail';
import Dashboard from './pages/Dashboard';
import ChefDashboard from './pages/ChefDashboard';
import AdminDashboard from './pages/AdminDashboard';

function Protected({ children, roles }) {
  const { user, loading, applicationPending } = useAuth();
  if (loading) return <div className="loader"><div className="spinner"/></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (applicationPending && user.role !== 'chef') return <Navigate to="/pending" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function PendingPage() {
  const { logout } = useAuth();
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--off)' }}>
      <div style={{ textAlign: 'center', maxWidth: 480, padding: 40 }}>
        <div style={{ fontSize: '4rem', marginBottom: 20 }}>⏳</div>
        <h2 style={{ marginBottom: 12 }}>Application Under Review</h2>
        <p style={{ color: 'var(--muted)', lineHeight: 1.8, marginBottom: 28 }}>
          Your chef application has been submitted successfully. Our admin team will review your profile and approve it shortly. You'll receive a notification once approved.
        </p>
        <button className="btn btn-primary" onClick={logout}>Logout</button>
      </div>
    </div>
  );
}

function AppRoutes() {
  const { user } = useAuth();
  const dashLink = user?.role === 'admin' ? '/admin' : user?.role === 'chef' ? '/chef-dashboard' : '/dashboard';
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={user ? <Navigate to={dashLink} /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to={dashLink} /> : <Register />} />
        <Route path="/chefs" element={<Chefs />} />
        <Route path="/chefs/:id" element={<ChefDetail />} />
        <Route path="/pending" element={<PendingPage />} />
        <Route path="/dashboard" element={<Protected roles={['user']}><Dashboard /></Protected>} />
        <Route path="/chef-dashboard" element={<Protected roles={['chef']}><ChefDashboard /></Protected>} />
        <Route path="/admin" element={<Protected roles={['admin']}><AdminDashboard /></Protected>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{
          style: { fontFamily: 'DM Sans,sans-serif', borderRadius: '11px', fontSize: '.88rem' },
          success: { iconTheme: { primary: '#2E7D32', secondary: '#fff' } },
          error: { iconTheme: { primary: '#DC2626', secondary: '#fff' } }
        }} />
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
