export default function StarRating({ rating, size = '0.95rem', showCount, count }) {
  const stars = [1, 2, 3, 4, 5];
  return (
    <div className="stars" style={{ fontSize: size, alignItems: 'center', gap: 2 }}>
      {stars.map(s => (
        <span key={s} className={`star ${s <= Math.round(rating) ? '' : 'empty'}`}>★</span>
      ))}
      {showCount && <span style={{ fontSize: '0.8rem', color: '#6B7280', marginLeft: 4 }}>({count || 0})</span>}
    </div>
  );
}
