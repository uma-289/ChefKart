# 🍳 ChefKart — Home Chef Booking Platform
### Complete MERN Stack Application

---

## 📁 Final Project Structure

```
chefkart/
├── backend/
│   ├── config/
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── bookingController.js
│   │   ├── chefController.js
│   │   ├── reviewController.js
│   │   ├── paymentController.js
│   │   └── adminController.js
│   ├── middleware/
│   │   └── auth.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Chef.js
│   │   ├── Booking.js
│   │   └── Review.js        (also exports Payment model)
│   ├── routes/
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── chefs.js
│   │   ├── bookings.js
│   │   ├── reviews.js
│   │   ├── payments.js
│   │   └── admin.js
│   ├── .env                 ← CREATE THIS (copy from .env.example)
│   ├── .env.example
│   ├── package.json
│   ├── seed.js
│   └── server.js
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── Navbar.jsx
    │   │   ├── Footer.jsx
    │   │   └── StarRating.jsx
    │   ├── context/
    │   │   └── AuthContext.jsx
    │   ├── pages/
    │   │   ├── Home.jsx
    │   │   ├── Chefs.jsx
    │   │   ├── ChefDetail.jsx
    │   │   ├── Login.jsx
    │   │   ├── Register.jsx
    │   │   ├── Dashboard.jsx         (Customer)
    │   │   ├── ChefDashboard.jsx     (Chef)
    │   │   └── AdminDashboard.jsx
    │   ├── services/
    │   │   └── api.js
    │   ├── App.jsx
    │   ├── index.css
    │   └── main.jsx
    ├── index.html
    ├── package.json
    └── vite.config.js
```

---

## 🚀 STEP-BY-STEP SETUP

### Step 1 — Install Prerequisites
- **Node.js v18+** → https://nodejs.org/en/download
- **MongoDB Community** → https://www.mongodb.com/try/download/community
- **Git** → https://git-scm.com/downloads

Verify:
```bash
node -v       # should show v18+
npm -v        # should show 9+
mongod --version
```

---

### Step 2 — Clone / Download the Project
If using git:
```bash
git clone <your-repo-url>
cd chefkart
```
Or just extract the zip file.

---

### Step 3 — Setup Backend

```bash
cd backend
npm install
```

Create your `.env` file:
```bash
cp .env.example .env
```

Edit `backend/.env`:
```
PORT=5000
MONGO_URI=mongodb://localhost:27017/chefkart
JWT_SECRET=chefkart_super_secret_key_2024_change_me
JWT_EXPIRE=7d
RAZORPAY_KEY_ID=rzp_test_your_key_here
RAZORPAY_KEY_SECRET=your_razorpay_secret_here
CLIENT_URL=http://localhost:5173
```

> **Razorpay Setup (for payments):**
> 1. Go to https://razorpay.com → Sign up free
> 2. Go to Settings → API Keys → Generate Test Key
> 3. Copy Key ID and Key Secret into .env

---

### Step 4 — Start MongoDB

**Option A — Local MongoDB:**
```bash
# Windows
net start MongoDB

# Mac/Linux
sudo systemctl start mongod
# OR
mongod --dbpath /data/db
```

**Option B — MongoDB Atlas (Cloud, recommended for production):**
1. Go to https://cloud.mongodb.com → Create free cluster
2. Get connection string: `mongodb+srv://user:password@cluster.mongodb.net/chefkart`
3. Replace `MONGO_URI` in `.env`

---

### Step 5 — Seed the Database

```bash
cd backend
node seed.js
```

This creates:
- **Admin:** admin@chefkart.com / Admin@123
- **User:** user@chefkart.com / User@123
- **6 sample chefs** (priya@chefkart.com / Chef@123, rahul@chefkart.com / Chef@123, etc.)

---

### Step 6 — Setup Frontend

```bash
cd ../frontend
npm install
```

Create `frontend/.env`:
```
VITE_API_URL=http://localhost:5000/api
VITE_RAZORPAY_KEY=rzp_test_your_key_here
```

---

### Step 7 — Run the Application

Open **2 terminals:**

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
```
✅ Should show: `✅ MongoDB connected` and `🚀 Server running on port 5000`

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```
✅ Should show: `➜  Local: http://localhost:5173/`

Open browser → http://localhost:5173

---

## 🔑 Demo Login Credentials

| Role  | Email                  | Password  |
|-------|------------------------|-----------|
| Admin | admin@chefkart.com     | Admin@123 |
| User  | user@chefkart.com      | User@123  |
| Chef  | priya@chefkart.com     | Chef@123  |
| Chef  | rahul@chefkart.com     | Chef@123  |
| Chef  | anita@chefkart.com     | Chef@123  |

---

## 📱 Application Pages

| Page              | URL                    | Access        |
|-------------------|------------------------|---------------|
| Home              | /                      | Public        |
| Find Chefs        | /chefs                 | Public        |
| Chef Profile      | /chefs/:id             | Public        |
| Login             | /login                 | Public        |
| Register          | /register              | Public        |
| Customer Dashboard| /dashboard             | User only     |
| Chef Dashboard    | /chef-dashboard        | Chef only     |
| Admin Panel       | /admin                 | Admin only    |

---

## 🌐 API Endpoints

### Auth
```
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me           (protected)
PUT    /api/auth/updatepassword (protected)
```

### Chefs
```
GET    /api/chefs             (public — supports ?search, ?cuisine, ?minRating, ?maxPrice, ?location, ?page, ?limit)
GET    /api/chefs/:id         (public)
GET    /api/chefs/profile/me  (chef only)
PUT    /api/chefs/profile     (chef only)
```

### Bookings
```
POST   /api/bookings          (user only)
GET    /api/bookings/my       (user — own bookings)
GET    /api/bookings/chef     (chef — received bookings)
PUT    /api/bookings/:id/status (chef/admin)
PUT    /api/bookings/:id/cancel (user)
```

### Reviews
```
POST   /api/reviews           (user only)
GET    /api/reviews/chef/:id  (public)
```

### Payments
```
POST   /api/payments/create-order  (protected)
POST   /api/payments/verify        (protected)
```

### Admin (admin only)
```
GET    /api/admin/stats
GET    /api/admin/users
PUT    /api/admin/users/:id/toggle
GET    /api/admin/chefs
PUT    /api/admin/chefs/:id/verify
GET    /api/admin/bookings
```

---

## 🚀 DEPLOYMENT

### Deploy Backend → Render.com (Free)

1. Push project to GitHub
2. Go to https://render.com → New → Web Service
3. Connect your GitHub repo
4. Settings:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
5. Add Environment Variables (all from .env)
6. Change `MONGO_URI` to your MongoDB Atlas URL
7. Deploy → Copy your Render URL (e.g. `https://chefkart-api.onrender.com`)

### Deploy Frontend → Vercel.com (Free)

1. Go to https://vercel.com → New Project
2. Import your GitHub repo
3. Settings:
   - **Root Directory:** `frontend`
   - **Framework Preset:** Vite
4. Add Environment Variables:
   - `VITE_API_URL` = `https://chefkart-api.onrender.com/api`
   - `VITE_RAZORPAY_KEY` = your razorpay key
5. Deploy!

### Update CORS
In `backend/.env`, update:
```
CLIENT_URL=https://your-vercel-app.vercel.app
```

---

## 🛠️ Tech Stack

| Layer       | Technology                    |
|-------------|-------------------------------|
| Frontend    | React 18, Vite, React Router  |
| Styling     | Pure CSS (custom design system) |
| HTTP Client | Axios                         |
| Backend     | Node.js, Express.js           |
| Database    | MongoDB, Mongoose             |
| Auth        | JWT + bcryptjs                |
| Payments    | Razorpay                      |
| Icons       | React Icons                   |
| Toasts      | React Hot Toast               |
| Deployment  | Render (backend), Vercel (frontend) |

---

## ✅ Features Checklist

- [x] User Registration & Login (JWT)
- [x] Role-based access (User / Chef / Admin)  
- [x] Browse & filter chefs by cuisine, rating, price, location
- [x] Chef profile pages with availability
- [x] Booking system with date/time/duration selection
- [x] Chef accepts/rejects bookings
- [x] Rating & reviews system
- [x] Razorpay payment integration
- [x] Customer dashboard with booking management
- [x] Chef dashboard with profile editor
- [x] Admin dashboard with stats, user/chef management
- [x] Fully responsive design (mobile-friendly)
- [x] Database seeding with sample data

---

## ❓ Troubleshooting

**MongoDB won't connect:**
```bash
# Check if MongoDB is running
sudo service mongod status
# Start it
sudo service mongod start
```

**Port already in use:**
```bash
# Kill process on port 5000
npx kill-port 5000
```

**CORS errors:**
- Make sure `CLIENT_URL` in backend `.env` matches your frontend URL exactly (no trailing slash)

**Login not working:**
- Run `node seed.js` again to reset demo data
- Check MongoDB connection in terminal

---

*Built with ❤️ using MERN Stack*
