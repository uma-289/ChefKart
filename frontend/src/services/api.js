import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "https://chefkart-api-90wb.onrender.com/api",
  timeout: 60000
});
console.log(import.meta.env.VITE_API_URL);

API.interceptors.request.use(cfg => {
  const t = localStorage.getItem('ck_token');
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});
API.interceptors.response.use(r => r, err => {
  if (err.response?.status === 401) { localStorage.removeItem('ck_token'); window.location.href = '/login'; }
  return Promise.reject(err);
});

export const authAPI = {
  register:       d => API.post('/auth/register', d),
  login:          d => API.post('/auth/login', d),
  me:             ()=> API.get('/auth/me'),
  updatePassword: d => API.put('/auth/updatepassword', d),
  forgotPassword: d => API.post('/auth/forgot-password', d),
  resetPassword:  d => API.post('/auth/reset-password', d),
};
export const userAPI = {
  getProfile:    ()=> API.get('/users/profile'),
  updateProfile: d => API.put('/users/profile', d),
};
export const chefAPI = {
  getAll:        p => API.get('/chefs', { params: p }),
  getById:       id=> API.get(`/chefs/${id}`),
  getMyProfile:  ()=> API.get('/chefs/profile/me'),
  updateProfile: d => API.put('/chefs/profile', d),
  uploadDishImage: formData => API.post('/chefs/dish-image', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
};
export const bookingAPI = {
  create:          d  => API.post('/bookings', d),
  getMine:         ()=> API.get('/bookings/my'),
  getChefBookings: ()=> API.get('/bookings/chef'),
  getSlots:        p  => API.get('/bookings/slots', { params: p }),
  updateStatus:    (id,d)=> API.put(`/bookings/${id}/status`, d),
  cancel:          id => API.put(`/bookings/${id}/cancel`),
};
export const reviewAPI = {
  create:     d  => API.post('/reviews', d),
  getForChef: id => API.get(`/reviews/chef/${id}`),
};
export const paymentAPI = {
  createOrder: d => API.post('/payments/create-order', d),
  verify:      d => API.post('/payments/verify', d),
  getMine:     ()=> API.get('/payments/my'),
};
export const notifAPI = {
  getAll:  ()=> API.get('/notifications'),
  readAll: ()=> API.put('/notifications/read-all'),
};
export const adminAPI = {
  getStats:           ()=> API.get('/admin/stats'),
  getApplications:    ()=> API.get('/admin/applications'),
  approveApplication: id=> API.put(`/admin/applications/${id}/approve`),
  rejectApplication:  (id,d)=> API.put(`/admin/applications/${id}/reject`, d),
  getUsers:           ()=> API.get('/admin/users'),
  toggleUser:         id=> API.put(`/admin/users/${id}/toggle`),
  getChefs:           ()=> API.get('/admin/chefs'),
  removeChef:         id=> API.delete(`/admin/chefs/${id}`),
  toggleChef:         id=> API.put(`/admin/chefs/${id}/toggle`),
  getBookings:        ()=> API.get('/admin/bookings'),
  getPayments:        ()=> API.get('/admin/payments'),
};
export default API;
