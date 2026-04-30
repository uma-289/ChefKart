import { Link } from 'react-router-dom';
export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div><div className="f-logo">Chef<span className="dot">Kart</span></div><p>Connecting you with skilled home chefs for an unforgettable dining experience every day.</p></div>
          <div className="f-col"><h4>Platform</h4><Link to="/chefs">Find Chefs</Link><Link to="/register">Become a Chef</Link><Link to="/login">Login</Link></div>
          <div className="f-col"><h4>Cuisines</h4><a href="#">North Indian</a><a href="#">South Indian</a><a href="#">Continental</a><a href="#">Chinese</a></div>
          <div className="f-col"><h4>Company</h4><a href="#">About Us</a><a href="#">Contact</a><a href="#">Privacy Policy</a><a href="#">Terms</a></div>
        </div>
        <div className="f-bottom">© {new Date().getFullYear()} ChefKart · Built with MERN Stack</div>
      </div>
    </footer>
  );
}
