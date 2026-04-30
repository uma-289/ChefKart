import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { chefAPI } from '../services/api';
import Footer from '../components/Footer';
import { getImageUrl } from '../utils/getImageUrl';

const BG_COLORS = ['#E8F5E9', '#FFF3E0', '#FCE4EC', '#E3F2FD', '#F3E5F5', '#FFF8E1'];
// Base URL to load images from backend static folder
// In production: images come from Cloudinary (full https:// URL stored in DB)
// In development: images served from localhost:5000/uploads/dishes/
const IMG = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '');

// Edit the "image" field to match your actual filename in backend/uploads/dishes/
// If a file doesn't exist, the card shows a coloured emoji fallback automatically
const DISHES = [
  { name: 'Butter Chicken', image: 'butter-chicken.jpg', emoji: '🍛', price: '₹250–₹350', chefs: '12 Chefs Available' },
  { name: 'Hakka Noodles', image: 'hakka-noodles.jpg', emoji: '🍜', price: '₹180–₹250', chefs: '18 Chefs Available' },
  { name: 'Chicken Biryani', image: 'chicken-biryani.jpg', emoji: '🍚', price: '₹280–₹400', chefs: '15 Chefs Available' },
  { name: 'Masala Dosa', image: 'masala-dosa.jpg', emoji: '🥞', price: '₹80–₹150', chefs: '22 Chefs Available' },
  { name: 'Paneer Butter Masala', image: 'paneer-butter-masala.jpg', emoji: '🧀', price: '₹200–₹320', chefs: '10 Chefs Available' },
];

function Stars({ r, count }) {
  return <span><span className="stars sm">{'★'.repeat(Math.round(r))}{'☆'.repeat(5 - Math.round(r))}</span>{count !== undefined && <span style={{ fontSize: '.76rem', color: 'var(--muted)', marginLeft: 4 }}>({count})</span>}</span>;
}

export default function Home() {
  const [search, setSearch] = useState('');
  const [cuisine, setCuisine] = useState('');
  const [chefs, setChefs] = useState([]);
  const [trendingDishes, setTrendingDishes] = useState([]);
  const nav = useNavigate();

  console.log("Home page")
  useEffect(() => {
    // Fetch real dishes from your chefs in the database
    chefAPI.getAll({ limit: 6 }).then(r => {
      const chefs = r.data.chefs || [];
      setChefs(chefs);
      // Collect all dishes from all chefs that have images
      const dishes = [];
      chefs.forEach(chef => {
        (chef.dishes || []).forEach(d => {
          if (d.image && dishes.length < 5) {
            dishes.push({
              name: d.name,
              price: d.price,
              image: d.image,
              chefName: chef.userId?.name
            });
          }
        });
      });
      setTrendingDishes(dishes.slice(0, 6));
    }).catch(() => { });
  }, []);

  const handleSearch = e => {
    e.preventDefault();
    nav(`/chefs?search=${search}&cuisine=${cuisine}`);
  };

  return (
    <div>
      {/* ── HERO ── */}
      <section className="hero">
        <div className="hero-pattern" />
        <div className="hero-glow" />
        <div className="container">
          <div className="hero-inner">
            <div>
              <div className="hero-tag">🏆 India's #1 Home Chef Platform</div>
              <h1>Bringing<br /><span className="accent">Restaurant-Quality</span><br />Food to Your Home</h1>
              <p>Discover <strong style={{ color: '#A5D6A7' }}>verified</strong> home chefs near you. Choose your cuisine, book instantly, and enjoy authentic meals cooked fresh in your kitchen.</p>
              <div className="hero-cta">
                <button className="btn btn-orange btn-xl" onClick={() => nav('/chefs')}>🍽️ Explore Chefs</button>
                <button className="btn btn-ghost btn-xl" onClick={() => nav('/register')}>🔥 View Popular Dishes</button>
              </div>
              <div className="hero-trust">
                <div className="htrust"><div className="htrust-icon">✅</div><div className="htrust-text"><strong>Verified Chefs</strong>Background Checked</div></div>
                <div className="htrust"><div className="htrust-icon">🥗</div><div className="htrust-text"><strong>Hygienic Cooking</strong>Health & Safety First</div></div>
                <div className="htrust"><div className="htrust-icon">⏰</div><div className="htrust-text"><strong>On-Time Service</strong>Punctual & Reliable</div></div>
              </div>
            </div>

            {/* Hero card */}
            <div className="hero-card">
              <div className="hc-title">🔍 Find your perfect chef</div>
              <div className="search-row">
                <span style={{ color: 'var(--g400)', fontSize: '1rem' }}>🔍</span>
                <input placeholder="Biryani, Pasta, Chef name..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch(e)} />
              </div>
              <div className="chip-row">
                {['All', 'North Indian', 'South Indian', 'Chinese', 'Continental'].map(c => (
                  <button key={c} className={`chip ${cuisine === (c === 'All' ? '' : c) ? 'active' : ''}`} onClick={() => setCuisine(c === 'All' ? '' : c)}>{c}</button>
                ))}
              </div>
              <div className="mini-list">
                {chefs.slice(0, 3).map((ch, i) => {
                  const u = ch.userId;
                  return (
                    <div key={ch._id} className="mini-item" onClick={() => nav(`/chefs/${ch._id}`)}>
                      <div className="mi-av" style={{ background: BG_COLORS[i], color: 'var(--green)' }}>
                        {u?.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div className="mi-name">{u?.name}</div>
                        <div className="mi-sub">{ch.cuisines?.slice(0, 2).join(' · ')} · {ch.location}</div>
                      </div>
                      <div>
                        <div className="mi-price">₹{ch.pricing?.hourly}/hr</div>
                        <div style={{ fontSize: '.7rem', color: '#F59E0B', textAlign: 'right' }}>{'★'.repeat(Math.round(ch.rating))}</div>
                      </div>
                    </div>
                  );
                })}
                <button className="btn btn-primary" style={{ width: '100%', marginTop: 4, justifyContent: 'center' }} onClick={() => nav(`/chefs?search=${search}&cuisine=${cuisine}`)}>
                  Find My Chef 🍳
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Orange banner ── */}
      <div className="banner-strip">
        <div className="container">
          <div className="banner-inner">
            <div className="bs-item"><span className="bs-icon">👨‍🍳</span> <span>500+ Verified Chefs</span></div>
            <div className="bs-item"><span className="bs-icon">📍</span> <span>Available in 50+ Cities</span></div>
            <div className="bs-item"><span className="bs-icon">⭐</span> <span>10,000+ 5-Star Reviews</span></div>
            <div className="bs-item"><span className="bs-icon">💳</span> <span>Secure Razorpay Payments</span></div>
          </div>
        </div>
      </div>

      {/* ── Search bar ── */}
      <section className="search-section">
        <div className="container">
          <form onSubmit={handleSearch}>
            <div className="search-bar">
              <div className="sb-field">
                <div><div className="sb-label">Search</div><input className="sb-input" placeholder="Biryani, Pasta, Chef name..." value={search} onChange={e => setSearch(e.target.value)} /></div>
              </div>
              <div className="sb-field">
                <div><div className="sb-label">Cuisine</div>
                  <select className="sb-select" value={cuisine} onChange={e => setCuisine(e.target.value)}>
                    <option value="">All Cuisines</option>
                    {['North Indian', 'South Indian', 'Continental', 'Chinese', 'Mughlai', 'Thai', 'Gujarati', 'Punjabi', 'Kerala'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="sb-field">
                <div><div className="sb-label">Min Rating</div>
                  <select className="sb-select"><option>4+ Stars</option><option>3+ Stars</option><option>Any</option></select>
                </div>
              </div>
              <div className="sb-field">
                <div><div className="sb-label">Price Range</div>
                  <select className="sb-select"><option>₹100–₹1000</option><option>Under ₹500</option><option>Under ₹750</option></select>
                </div>
              </div>
              <button type="submit" className="sb-btn">Find My Chef 🍳</button>
            </div>
          </form>
        </div>
      </section>

      {/* ── Trending Dishes ── */}
      <section className="section" style={{ paddingBottom: 0, background: '#fff' }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 20 }}>
            <div><h2 style={{ fontSize: '1.6rem' }}>🔥 Trending Dishes</h2><p style={{ fontSize: '.85rem' }}>Explore what everyone is craving</p></div>
            <button className="btn btn-outline btn-sm" onClick={() => nav('/chefs')}>View all dishes →</button>
          </div>
          {trendingDishes.length > 0 ? (
            <div className="dish-scroll">
              {trendingDishes.map((d, i) => {
                const imgUrl = getImageUrl(d.image);
                console.log("Dish:", d);
                console.log("Image:", d.image);
                return (
                  <div className="dish-card">
                    <div className="dish-img">
                      <img
                        src={d.image}
                        alt={d.name}
                        style={{
                          width: '100%',
                          height: '180px',
                          objectFit: 'cover',
                          borderTopLeftRadius: '12px',
                          borderTopRightRadius: '12px'
                        }}
                      />
                    </div>

                    <div className="dish-info">
                      <div className="dish-name">{d.name}</div>
                      <div className="dish-price">₹{d.price}</div>
                      <div className="dish-chef">{d.chefName}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            // Fallback when no dishes have images yet
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted)' }}>
              <div style={{ fontSize: '3rem', marginBottom: 12 }}>🍽️</div>
              <p>Chefs are adding their dishes — check back soon!</p>
              <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => nav('/chefs')}>
                Browse Chefs →
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ── Top Chefs ── */}
      <section className="section" style={{ background: '#fff' }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 28 }}>
            <div><h2 style={{ fontSize: '1.6rem' }}>Top Chefs Near You</h2><p style={{ fontSize: '.85rem' }}>Handpicked professional chefs for you</p></div>
            <button className="btn btn-outline btn-sm" onClick={() => nav('/chefs')}>View all chefs →</button>
          </div>
          <div className="chef-grid">
            {chefs.map((ch, i) => {
              const u = ch.userId;
              return (
                <div key={ch._id} className="ccard" onClick={() => nav(`/chefs/${ch._id}`)}>
                  <div className="ccard-img" style={{ background: BG_COLORS[i % BG_COLORS.length] }}>
                    <div className="ccard-av">{u?.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}</div>
                    {ch.isVerified && <div className="ccard-verified">✓ Verified</div>}
                    <div className="ccard-tag">Top Rated</div>
                  </div>
                  <div className="ccard-body">
                    <div className="ccard-name">{u?.name}</div>
                    <div className="ccard-meta">
                      <Stars r={ch.rating} count={ch.totalReviews} />
                      <span>📍 {ch.location}</span>
                    </div>
                    <div className="ccard-cuisines">{ch.cuisines?.slice(0, 2).map(c => <span key={c} className="ctag">{c}</span>)}</div>
                    <div className="ccard-foot">
                      <div><div className="ccard-price">₹{ch.pricing?.hourly}<small>/hr</small></div><div className="ccard-exp">{ch.experience} yrs exp</div></div>
                      <button className="btn btn-primary btn-sm" onClick={e => { e.stopPropagation(); nav(`/chefs/${ch._id}`); }}>Book Now</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Why ── */}
      <section className="section" style={{ background: 'var(--off)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2>Why Choose <span style={{ color: 'var(--green)' }}>Chef</span><span style={{ color: 'var(--orange)' }}>Kart</span>?</h2>
          </div>
          <div className="why-grid">
            <div className="why-card"><div className="why-icon green">🏠</div><h4>Home-cooked Hygienic Food</h4><p>Fresh, safe & prepared in clean kitchens with quality ingredients</p></div>
            <div className="why-card"><div className="why-icon green">✅</div><h4>Verified Professional Chefs</h4><p>Experienced, skilled & background checked for your safety</p></div>
            <div className="why-card"><div className="why-icon orange">⚡</div><h4>Instant Booking</h4><p>Book in minutes & get a chef at your doorstep, same day possible</p></div>
            <div className="why-card"><div className="why-icon orange">₹</div><h4>Affordable Pricing</h4><p>Great food at prices that fit your budget, starting from ₹300/hr</p></div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="cta-banner">
        <div className="container">
          <div className="cta-inner">
            <p style={{ color: '#FFB74D', fontWeight: 700, fontSize: '1rem', marginBottom: 8 }}>Craving something delicious?</p>
            <h2>Book your personal chef in seconds</h2>
            <p>Join thousands of happy families enjoying restaurant-quality food at home</p>
            <div className="cta-btns">
              <button className="btn btn-orange btn-xl" onClick={() => nav('/chefs')}>Get Started 🍳</button>
              <button className="btn btn-ghost btn-xl" onClick={() => nav('/register')}>Become a Chef</button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
