export const getImageUrl = (image) => {
  if (!image) return null;

  if (image.startsWith('http')) return image;

  const base = import.meta.env.VITE_API_URL.replace('/api', '');
  return `${base}/uploads/dishes/${image}`;
};