# 🍳 A's Kitchen — Website Setup Guide

## Overview
A's Kitchen is a complete home-delivery kitchen website with:
- **Customer-facing homepage** with menu and order form
- **Password-protected admin dashboard** to manage orders
- **Email alert system** (simulation + integration guide)
- Weekend-only ordering (Sat & Sun) with 3-hour advance rule

---

## Files Structure
```
aks-kitchen/
├── index.html          ← Customer website (homepage + order form)
├── admin/
│   └── index.html      ← Admin dashboard (password protected)
└── README.md           ← This file
```

---

## How to Run

### Option 1: Just open in browser (quickest)
1. Extract the zip file
2. Open `index.html` in any modern browser
3. To access admin: go to `admin/index.html` or click "Admin" in the footer

### Option 2: Local web server (recommended)
Using Python:
```bash
cd aks-kitchen
python -m http.server 8080
# Open http://localhost:8080
```

Using Node.js:
```bash
npx serve .
```

---

## Admin Panel

- **URL:** `admin/index.html` (or click "Admin" in footer)
- **Default Password:** `admin123`
- **Change password:** Edit `ADMIN_PASSWORD` in `admin/index.html` line ~230

### Features:
- View all orders in real-time
- Filter by status (New / Confirmed / Ready / Delivered / Cancelled)
- Search orders by name, email, or order ID
- Update order status with one click
- View full order details
- Send email alerts to customers
- Live stats dashboard

---

## Email Alerts Setup (Real Emails)

Orders currently simulate email sending (logged to browser console).
To enable real emails, choose one option:

### Option A: EmailJS (Free, no backend needed)
1. Sign up at https://emailjs.com
2. Connect your Gmail/Outlook account
3. Create an email template
4. Add to `admin/index.html` before `</body>`:
   ```html
   <script src="https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js"></script>
   <script>emailjs.init('YOUR_PUBLIC_KEY');</script>
   ```
5. In the `sendEmail()` function, replace `console.log(...)` with:
   ```javascript
   emailjs.send('YOUR_SERVICE_ID', 'YOUR_TEMPLATE_ID', {
     to_email: to,
     subject: subject,
     message: body
   });
   ```

### Option B: Backend (Node.js + Nodemailer)
```javascript
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: 'your@gmail.com', pass: 'app-password' }
});
```

---

## Ordering Rules (Built-in)
- ✅ Orders only accepted on **Saturdays and Sundays**
- ✅ Orders must be placed **at least 3 hours** before desired delivery time
- ✅ Form validation prevents invalid dates/times

---

## Customisation

### Change Menu Items
Edit the `MENU` array in `index.html` (around line 380):
```javascript
{ id:13, name:"Your Dish", desc:"Description", price:9.99, emoji:"🍜", cat:"mains", tag:"veg" }
```
Categories: `mains`, `rice`, `sides`, `desserts`
Tags: `veg`, `non-veg`

### Change Kitchen Name
Search and replace `A's Kitchen` throughout both HTML files.

### Change Opening Hours
Currently Saturday & Sunday. To change days, edit `isWeekend()` in `index.html`:
```javascript
function isWeekend(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.getDay() === 0 || d.getDay() === 6; // 0=Sun, 6=Sat
}
```

### Change Advance Notice (3 hours)
In `index.html`, find `3 * 60 * 60 * 1000` and change `3` to your desired hours.

---

## Production Deployment

For free hosting, use:
- **Netlify**: drag & drop the folder at netlify.com
- **GitHub Pages**: push to a repo and enable Pages
- **Vercel**: `vercel --prod`

For real orders with a database, consider adding a small Node.js/Express backend with MongoDB or Firebase.

---

Made with ❤️ for A's Kitchen
