# SmartGrocer Enhanced

A full-stack engineering-project MVP for a local grocery ordering system.

## Improvements
- 85+ grocery items across grains, pulses, spices, dairy, snacks, beverages, fruits, vegetables, personal care, household and baby care.
- Search and category filters.
- Enhanced responsive UI.
- Customer registration and login.
- Passwords are salted and hashed with bcrypt (12 rounds); plaintext passwords are never stored.
- Signed JWT login sessions.
- Separate owner role/dashboard.
- SQLite persistence for users and orders, requiring no separate database installation for the demo.
- Cart quantity editing, checkout, pickup/home delivery and order saving.

## Run in VS Code
1. Install Node.js 20+.
2. Extract the ZIP and open the folder in VS Code.
3. Copy `.env.example` to `.env.local`.
4. Change `JWT_SECRET` in `.env.local` to a long random string.
5. Open Terminal and run:
   npm install
6. Then:
   npm run dev
7. Open http://localhost:3000

## Owner demo login
Email: owner@smartgrocer.local
Password: Owner@123

The owner is created automatically the first time the app starts. Change this seeded credential before deploying publicly.

## Security note
Passwords are one-way hashed (not reversibly encrypted), which is the correct approach for password storage. JWTs are signed. For a real production deployment, use secure HttpOnly cookies, CSRF protections, rate limiting, email verification, password reset, HTTPS, a managed database, and a real payment provider.

## Product imagery
This version uses clear grocery emoji illustrations so it runs without broken/hotlinked images. For a real store, replace them with licensed/store-owned product photographs and add an image field to the product catalog.

## Payment note
COD / Pay at Store work as order selections. UPI is a demo selection only and does not charge money.
