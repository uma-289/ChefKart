import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { chefAPI } from '../services/api';
import Footer from '../components/Footer';

const BG = ['#E8F5E9','#FFF3E0','#FCE4EC','#E3F2FD','#F3E5F5','#FFF8E1'];
const CUISINES = ['North Indian','South Indian','Continental','Chinese','Mughlai','Thai','Gujarati','Punjabi','Kerala','Rajasthani'];

function Stars({ r, count }) {
  return <span><span className="stars sm">{'★'.repeat(Math.round(r||0))}{'☆'.repeat(5-Math.round(r||0))}</span>{count!==undefined && <span style={{fontSize:'.74rem',color:'var(--muted)',marginLeft:4}}>({count})</span>}</span>;
}

export default function Chefs() {
  const [chefs, setChefs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const nav = useNavigate();
  const [filters, setFilters] = useState({
    search: searchParams.get('search')||'',
    cuisine: searchParams.get('cuisine')||'',
    minRating:'', maxPrice:'', location:''
  });

  const load = async (p=1) => {
    setLoading(true);
    try {
      const params = { page:p, limit:9 };
      Object.entries(filters).forEach(([k,v]) => { if (v) params[k]=v; });
      const r = await chefAPI.getAll(params);
      setChefs(r.data.chefs||[]);
      setTotal(r.data.total||0);
      setPages(r.data.pages||1);
      setPage(p);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(1); }, []);

  return (
    <div>
      <div className="page-header"><div className="container"><h1>Find Your Chef</h1><p>Browse {total}+ skilled home chefs</p></div></div>
      <div className="container" style={{paddingTop:28,paddingBottom:60}}>
        {/* Filters */}
        <div style={{background:'#fff',borderRadius:14,padding:'18px 22px',boxShadow:'var(--sh)',display:'flex',flexWrap:'wrap',gap:14,alignItems:'flex-end',marginBottom:28,border:'1px solid var(--g100)'}}>
          <div style={{flex:'1 1 140px'}}><div style={{fontSize:'.77rem',fontWeight:700,color:'var(--g500)',marginBottom:5}}>SEARCH</div><input className="fc" placeholder="Chef name..." value={filters.search} onChange={e=>setFilters(f=>({...f,search:e.target.value}))}/></div>
          <div style={{flex:'1 1 140px'}}><div style={{fontSize:'.77rem',fontWeight:700,color:'var(--g500)',marginBottom:5}}>CUISINE</div>
            <select className="fc" value={filters.cuisine} onChange={e=>setFilters(f=>({...f,cuisine:e.target.value}))}>
              <option value="">All Cuisines</option>{CUISINES.map(c=><option key={c}>{c}</option>)}
            </select>
          </div>
          <div style={{flex:'1 1 120px'}}><div style={{fontSize:'.77rem',fontWeight:700,color:'var(--g500)',marginBottom:5}}>MIN RATING</div>
            <select className="fc" value={filters.minRating} onChange={e=>setFilters(f=>({...f,minRating:e.target.value}))}>
              <option value="">Any</option><option value="3">3+</option><option value="4">4+</option><option value="4.5">4.5+</option>
            </select>
          </div>
          <div style={{flex:'1 1 120px'}}><div style={{fontSize:'.77rem',fontWeight:700,color:'var(--g500)',marginBottom:5}}>MAX PRICE</div>
            <select className="fc" value={filters.maxPrice} onChange={e=>setFilters(f=>({...f,maxPrice:e.target.value}))}>
              <option value="">Any</option><option value="500">Under ₹500</option><option value="750">Under ₹750</option><option value="1000">Under ₹1000</option>
            </select>
          </div>
          <div style={{flex:'1 1 130px'}}><div style={{fontSize:'.77rem',fontWeight:700,color:'var(--g500)',marginBottom:5}}>LOCATION</div><input className="fc" placeholder="City..." value={filters.location} onChange={e=>setFilters(f=>({...f,location:e.target.value}))}/></div>
          <button className="btn btn-orange" style={{alignSelf:'flex-end'}} onClick={()=>load(1)}>Find My Chef 🍳</button>
        </div>

        {loading ? <div className="loader"><div className="spinner"/></div>
          : chefs.length===0 ? (
            <div className="empty"><div className="empty-ico">👨‍🍳</div><h3>No chefs found</h3><p>Try adjusting your filters</p><button className="btn btn-primary" onClick={()=>{setFilters({search:'',cuisine:'',minRating:'',maxPrice:'',location:''});load(1);}}>Clear Filters</button></div>
          ) : (
            <>
              <p style={{color:'var(--muted)',marginBottom:20,fontSize:'.86rem'}}>Showing {chefs.length} of {total} chefs</p>
              <div className="chef-grid">
                {chefs.map((ch,i) => {
                  const u = ch.userId;
                  return (
                    <div key={ch._id} className="ccard" onClick={()=>nav(`/chefs/${ch._id}`)}>
                      <div className="ccard-img" style={{background:BG[i%BG.length]}}>
                        <div className="ccard-av">{u?.name?.split(' ').map(n=>n[0]).join('').slice(0,2)}</div>
                        {ch.isVerified && <div className="ccard-verified">✓ Verified</div>}
                      </div>
                      <div className="ccard-body">
                        <div className="ccard-name">{u?.name}</div>
                        <div className="ccard-meta"><Stars r={ch.rating} count={ch.totalReviews}/><span>📍 {ch.location}</span></div>
                        <div className="ccard-cuisines">{ch.cuisines?.slice(0,2).map(c=><span key={c} className="ctag">{c}</span>)}</div>
                        <div className="ccard-foot">
                          <div><div className="ccard-price">₹{ch.pricing?.hourly}<small>/hr</small></div><div className="ccard-exp">{ch.experience} yrs exp</div></div>
                          <button className="btn btn-primary btn-sm" onClick={e=>{e.stopPropagation();nav(`/chefs/${ch._id}`);}}>Book Now</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {pages>1 && (
                <div style={{display:'flex',gap:7,justifyContent:'center',marginTop:36}}>
                  <button style={{width:36,height:36,borderRadius:8,border:'1.5px solid var(--g200)',background:'#fff',cursor:'pointer'}} disabled={page===1} onClick={()=>load(page-1)}>‹</button>
                  {Array.from({length:pages},(_,i)=>i+1).map(p=>(
                    <button key={p} style={{width:36,height:36,borderRadius:8,border:`1.5px solid ${p===page?'var(--green)':'var(--g200)'}`,background:p===page?'var(--green)':'#fff',color:p===page?'#fff':'inherit',cursor:'pointer',fontWeight:p===page?700:400}} onClick={()=>load(p)}>{p}</button>
                  ))}
                  <button style={{width:36,height:36,borderRadius:8,border:'1.5px solid var(--g200)',background:'#fff',cursor:'pointer'}} disabled={page===pages} onClick={()=>load(page+1)}>›</button>
                </div>
              )}
            </>
          )}
      </div>
      <Footer />
    </div>
  );
}
