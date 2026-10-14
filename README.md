# 🛒 ShopKart: Full-Stack E-Commerce (Labs 01–06)

A MERN-stack shop: customer authentication (JWT in an HttpOnly cookie), product catalogue with search/filter/sort, a persistent wishlist, a persistent cart with shared React Context state, and checkout with **Razorpay Test Mode** payments, server-side signature verification and order history.

## Contents
1. [Features](#features) · 2. [Stack](#stack) · 3. [Structure](#structure) · 4. [Setup](#setup) · 5. [Run](#run) · 6. [Razorpay test mode](#razorpay-test-mode) · 7. [Complete purchase journey](#complete-purchase-journey) · 8. [API reference](#api-reference) · 9. [Auth & cookies](#auth--cookies) · 10. [Design decisions](#design-decisions) · 11. [Automated checks](#automated-checks) · 12. [Postman / manual checklist](#postman--manual-checklist) · 13. [Lab requirement map](#lab-requirement-map) · 14. [Known limitations](#known-limitations) · 15. [Troubleshooting](#troubleshooting)

## Features
- **Auth:** register / login / `GET /customers/me` / logout, bcrypt hashes, JWT in an HttpOnly cookie, generic "Invalid credentials".
- **Catalogue:** create/list/get products; case-insensitive name search, category filter, both combined, price sort; invalid-id and not-found handling.
- **Wishlist:** stored as Product ObjectId references on the customer; duplicate-proof; populated on read.
- **Cart:** `{product, quantity}` rows in MongoDB; stock-validated add/update; latest price/stock always read from `Product`; one React Context drives Navbar count, cards, cart page and checkout.
- **Checkout & payments:** server recomputes the total from DB prices, re-checks stock, snapshots items into a pending order, creates a Razorpay order in paise, verifies the HMAC-SHA256 signature **and** confirms the payment with Razorpay's API before marking `PAID`/`PLACED`, then (and only then) clears the cart.
- **Orders:** history + detail showing saved snapshots; ownership enforced (other users get 404).
- **UI:** responsive, accessible labels, loading / empty / error / retry states everywhere.

## Stack
React 19 + Vite, React Router, Axios, Context API · Node 18+, Express 5, MongoDB + Mongoose, bcrypt, jsonwebtoken, cookie-parser, dotenv, Razorpay Node SDK. No auth frameworks, no Redux.

## Structure
```text
shopkart/
├── backend/
│   ├── config/        db.js, razorpay.js
│   ├── controllers/   customer, product, wishlist, cart, order
│   ├── middlewares/   auth.middleware.js, error.middleware.js
│   ├── models/        customer, product, order
│   ├── routes/        customer, product, wishlist, cart, order
│   ├── scripts/       seed.js
│   ├── tests/         unit + API integration tests, browser E2E, fake-Razorpay helper
│   ├── utils/         generateToken.js, razorpaySignature.js, helpers.js
│   ├── app.js         Express app factory (used by index.js and tests)
│   ├── index.js       entry point
│   └── .env.example
├── frontend/
│   ├── src/ components/ context/ hooks/ pages/ services/ utils/ App.jsx main.jsx index.css
│   └── .env.example
├── README.md
└── .gitignore
```

## Setup
**Prerequisites:** Node.js ≥ 18, npm, and MongoDB (local or Atlas).

### MongoDB
- **macOS (Homebrew):** `brew tap mongodb/brew && brew install mongodb-community && brew services start mongodb-community`
- **Ubuntu/Debian:** follow MongoDB's official install guide, then `sudo systemctl start mongod`
- **Windows:** install MongoDB Community Server (runs as a service), or use Docker: `docker run -d -p 27017:27017 --name mongo mongo:7`
- **Atlas:** create a free cluster and use its connection string as `MONGODB_URI`.

### Install (two terminals; the commands are identical on macOS/Linux/Windows)
```bash
# Terminal 1: backend
cd shopkart/backend
npm install
cp .env.example .env        # Windows (cmd): copy .env.example .env   | PowerShell: Copy-Item .env.example .env

# Terminal 2: frontend
cd shopkart/frontend
npm install
cp .env.example .env        # same Windows alternatives as above
```
Edit **`backend/.env`** (`MONGODB_URI`, a long random `JWT_SECRET`, Razorpay test keys) and **`frontend/.env`** (`VITE_API_URL`, `VITE_RAZORPAY_KEY_ID`). Generate a secret with:
`node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

## Run
```bash
# Terminal 1 (backend/)
npm run seed        # inserts 18 products; safe to re-run (upserts by name, keeps current stock)
npm run dev         # API on http://localhost:5000   (npm start for plain node)

# Terminal 2 (frontend/)
npm run dev         # app on http://localhost:5173
```
`npm run seed:reset-stock` additionally resets every product's stock to its seed value. No orders or payments are ever seeded.
Open **http://localhost:5173** (use `localhost` for both apps, not `127.0.0.1`, so the cookie and CORS origin match).

## Razorpay test mode
1. Create/log in to a Razorpay account → Dashboard → switch the toggle to **Test Mode**.
2. *Account & Settings → API Keys → Generate Test Key*. Copy **Key ID** (`rzp_test_…`) and **Key Secret** (shown once).
3. `backend/.env`: `RAZORPAY_KEY_ID=…` and `RAZORPAY_KEY_SECRET=…`. `frontend/.env`: `VITE_RAZORPAY_KEY_ID=…` (ID only; **never** put the secret in the frontend). Restart both servers.
4. Keep payment **auto-capture** enabled (Settings → Payment Capture) so test payments don't stay "authorized".
5. In the Razorpay popup use test credentials from Razorpay's docs (e.g. a test card, or "Success"/"Failure" on the test UPI/netbanking screens). No real money moves.

Without keys the server still starts; checkout returns `503 Razorpay is not configured`.

## Complete purchase journey
Register → Login → **Products** (search "keyboard", filter Books, sort by price) → ♡ Wishlist a product → **Wishlist** page → Add to Cart (Navbar shows `Cart (n)`) → **Cart** (±, remove, subtotal) → Proceed to Checkout → fill shipping (try a 5-digit pincode: the form blocks it without calling the API) → Place Order → Razorpay test payment → **Order success** (`Cart (0)`) → **Orders** → View Details. Also try *Close the popup* and *failed payment*: the cart is preserved and a message explains.

## API reference
All JSON. Protected = needs the auth cookie (or `Authorization: Bearer <jwt>`, handy in Postman). Errors: `{ "success": false, "message": "…", "errors"?: {field: msg} }`.

| Method | Path | Auth | Success | Notable failures |
|---|---|:-:|---|---|
| POST | `/customers/register` | | 201 `{success,message,customer}` | 400 missing/invalid/pw<6 · 409 duplicate email |
| POST | `/customers/login` | | 200 `{success,message,customer}` + cookie | 401 `Invalid credentials` (never says which part) |
| GET | `/customers/me` | ✅ | 200 `{_id,fullName,email,phone}` | 401 |
| POST | `/customers/logout` | ✅ | 200 `{success,message}`, cookie cleared | 401 |
| POST | `/products` | | 201 `{success,product}` | 400 missing field / price ≤ 0 / stock < 0 |
| GET | `/products?search=&category=&sort=` | | 200 `{success,count,products}` (`sort`: `price_asc`, `price_desc`, `newest`) | |
| GET | `/products/:id` | | 200 `{success,product}` | 400 bad id · 404 |
| POST | `/wishlist/:productId` | ✅ | 201 `{success,message}` | 400 · 404 · 409 already saved · 401 |
| GET | `/wishlist` | ✅ | 200 `{success,count,wishlist:[product…]}` | 401 |
| DELETE | `/wishlist/:productId` | ✅ | 200 `{success,message}` | 400 · 404 not in wishlist |
| POST | `/cart/:productId` | ✅ | 200 `{success,message,cart}` (adds 1) | 400 bad id / out of stock / exceeds stock · 404 |
| GET | `/cart` | ✅ | 200 `{success,cart:[{product,quantity}]}` | 401 |
| PATCH | `/cart/:productId` body `{"quantity":3}` | ✅ | 200 `{success,message,cart}` | 400 not a whole number / < 1 / > stock · 404 product or not in cart |
| DELETE | `/cart/:productId` | ✅ | 200 `{success,message,cart}` | 400 · 404 not in cart |
| POST | `/orders/create-payment-order` body `{"shippingAddress":{fullName,phone,addressLine1,city,state,pincode}}` | ✅ | 201 `{success,shopKartOrderId,razorpayOrderId,amount(paise),currency,key}` (200 + same order when an identical pending one exists) | 400 empty cart / invalid address / insufficient stock / deleted product · 502 Razorpay error · 503 not configured |
| POST | `/orders/verify-payment` body `{shopKartOrderId,razorpay_order_id,razorpay_payment_id,razorpay_signature}` | ✅ | 200 `{success,message,order}` | 400 invalid signature / mismatch / bad status · 404 not your order · 409 already paid with another payment, or stock lost after payment · 502 |
| GET | `/orders` | ✅ | 200 `{success,count,orders}` newest first; **paid orders only** (`?includePending=true` also lists unpaid attempts) | |
| GET | `/orders/:id` | ✅ | 200 `{success,order}` | 400 · 404 (also for other users' orders) |

## Auth & cookies
JWT (default 7 days) is set in cookie `shopkart_token` with `HttpOnly`. JavaScript can't read it, so the SPA asks `GET /customers/me` on load, which also keeps you logged in across refreshes. Axios uses `withCredentials: true`; the server enables CORS for `FRONTEND_URL` with `credentials: true`.

| Environment | Cookie flags |
|---|---|
| Local dev (`NODE_ENV` ≠ production, http) | `HttpOnly; SameSite=Lax` (not Secure: `localhost:5173` → `localhost:5000` is same-site) |
| Production over HTTPS, separate frontend/API domains | `NODE_ENV=production` ⇒ `HttpOnly; Secure; SameSite=None`; set `FRONTEND_URL` to the exact frontend origin(s) (comma-separated). Behind a proxy you may also need `app.set("trust proxy", 1)`. |

Logout clears the cookie with the same flags it was set with.

## Design decisions
- **One identity.** The Lab 01 `Customer` model is the "User" of Labs 04–06: `wishlist` and `cart` live on it, orders reference `Customer`.
- **Server owns money.** Request bodies never supply prices/totals. Totals use current DB prices; the order stores a name/price/image snapshot.
- **Verification (all must pass before `PAID`):** browser's order id equals the stored one → HMAC-SHA256 of `storedRazorpayOrderId|paymentId` (constant-time compare) → Razorpay API confirms the payment's order, amount, currency and `captured`/`authorized` → atomic `PENDING→PAID` claim (repeat/concurrent requests are safe, no double stock decrement) → atomic per-item stock decrement (never below 0) → cart cleared.
- **Stock** is re-checked at order creation and decremented atomically at verified payment (not reserved at creation, so abandoned checkouts can't lock stock).
- **No duplicate orders:** an identical cart+address+prices re-uses the existing pending order/Razorpay order.
- **Failed/cancelled payment:** the pending order and the cart are kept; retrying reuses the order.
- **Cart writes** use version-checked `save()`; wishlist uses atomic `$push`/`$pull`.
- Cart/Wishlist endpoints are protected; `POST /products` stays open per Lab 03 (admin auth is a later lab).

## Automated checks
```bash
cd backend && npm test        # 14 tests: signature maths, validation, full API incl. checkout/verify/ownership
cd frontend && npm test       # 6 tests: shipping/register/login validation, formatters
cd frontend && npm run build  # production build
```
Backend integration tests need a MongoDB at `mongodb://127.0.0.1:27017` (or set `MONGODB_URI_TEST`); they use the throw-away database `shopkart_test` and **drop it** at start and end. Razorpay's network API is replaced by a fake client, with signatures made by the real HMAC code and a test secret.
Browser E2E (optional, Python Playwright): `backend/tests/e2e/browser_e2e.py` (start MongoDB, `MONGODB_URI=… node backend/tests/helpers/e2e-server.js`, `npm run dev` in frontend, then `python3 backend/tests/e2e/browser_e2e.py`). It substitutes a stand-in for Razorpay's hosted checkout script.
**None of these automated checks talk to Razorpay.** Run the real test-mode payment yourself (see above).

## Postman / manual checklist
Create a Postman environment `base=http://localhost:5000`. Postman keeps cookies per domain automatically after login.
1. `POST {{base}}/customers/register` (JSON body from Lab 01) → 201; repeat → 409; `password:"123"` → 400.
2. `POST /customers/login` → 200 + `Set-Cookie … HttpOnly`; wrong password → 401. `GET /customers/me` → 200; after `POST /customers/logout` → 401.
3. `POST /products` (valid → 201; `price:0` → 400). `GET /products?search=KEY&category=electronics`.
4. Copy a product `_id`: `POST /wishlist/:id` → 201, again → 409; `GET /wishlist` populated; `DELETE` → 200, again → 404. Call without cookie → 401.
5. `POST /cart/:id` twice → quantity 2; `PATCH` `{"quantity":999}` → 400; `GET /cart`; `DELETE`.
6. Empty cart → `POST /orders/create-payment-order` → 400. With items + `{"shippingAddress":{…},"totalAmount":1}` → amount is still the real total in paise; `GET /cart` still has items.
7. `POST /orders/verify-payment` with a fake signature → 400, order not paid, cart intact.
8. Pay in the browser, then `GET /orders` / `GET /cart` (empty). With a second customer's cookie, `GET /orders/:id` → 404.

## Lab requirement map
| Lab | Requirement | Where |
|---|---|---|
| 01 | Customer model, register/login/me/logout, bcrypt, JWT cookie, middleware | `models/customer.model.js`, `controllers/customer.controller.js`, `routes/customer.routes.js`, `middlewares/auth.middleware.js`, `utils/generateToken.js` |
| 02 | Register / Login / protected Home / Navbar logout | `pages/Register|Login|Home.jsx`, `components/Navbar.jsx|ProtectedRoute.jsx`, `context/AuthContext.jsx`, `services/api.js` |
| 03 | Product model + 3 endpoints + search/category/sort (bonus) | `models/product.model.js`, `controllers/product.controller.js` |
| 03 | Listing, search bar, category dropdown, details, loading/error/empty | `pages/Products|ProductDetails.jsx`, `components/ProductCard|SearchBar|StateViews.jsx` |
| 04 | Wishlist refs on customer, add/get/remove, populate, 401/400/404/409 | `controllers/wishlist.controller.js`, `routes/wishlist.routes.js` |
| 04 | Card ♡ states, `/wishlist`, Navbar link, states (no global state) | `hooks/useWishlistIds.js`, `pages/Wishlist.jsx`, `components/WishlistCard.jsx` |
| 05 | Cart schema + 4 endpoints + stock rules | `models/customer.model.js`, `controllers/cart.controller.js` |
| 05 | Context state, cart page, quantity controls, derived totals, Navbar count | `context/CartContext.jsx`, `pages/Cart.jsx`, `components/CartItem.jsx|OrderSummary.jsx` |
| 06 | Order model + snapshots | `models/order.model.js` |
| 06 | create-payment-order, verify-payment, orders APIs | `controllers/order.controller.js`, `utils/razorpaySignature.js`, `config/razorpay.js` |
| 06 | Checkout form + validation, Razorpay popup, success/orders pages | `pages/Checkout|OrderSuccess|Orders|OrderDetails.jsx`, `utils/validation.js`, `utils/razorpay.js` |
| – | Seed script, env templates, `.gitignore` | `backend/scripts/seed.js`, `*/.env.example`, `.gitignore` |
| Bonus | Lab 03 sorting; Lab 04 toggle (via existing POST/DELETE) | `product.controller.js`, `ProductCard.jsx` |

Not implemented: Lab 04 wishlist-count-in-navbar bonus (it would need global wishlist state, which Lab 04 forbids for the core feature), Lab 01 change-password bonus, Lab 06 order-status-progression bonus.

## Known limitations
- **No Razorpay webhook.** If a customer pays but closes the tab before the browser callback reaches `/orders/verify-payment`, the order stays pending although money was captured. A production system should add a verified webhook (`payment.captured`) to reconcile. 
- If a product sells out *between* payment and verification, the server rolls back, returns 409 and asks the customer to contact support for a refund (no automatic refund call is made).
- `POST /products` is unauthenticated (per Lab 03). Don't deploy as-is.
- Seed images are labelled placeholders from `placehold.co` (needs internet); the UI falls back to a grey "Image unavailable" tile if an image fails. Replace the URLs in `seed.js` with real ones as you like.

## Troubleshooting
| Symptom | Fix |
|---|---|
| `Missing required environment variable` on start | Create `backend/.env` from `.env.example`. |
| `MongooseServerSelectionError` | MongoDB isn't running / wrong `MONGODB_URI`. |
| Login works but you're logged out on refresh, or CORS errors | Use `http://localhost:5173` consistently; `FRONTEND_URL` must equal the browser origin exactly; restart backend after editing `.env`. |
| `503 Razorpay is not configured` | Set both Razorpay keys in `backend/.env`, restart. |
| `Could not load the payment gateway` | The browser can't reach `checkout.razorpay.com` (offline / blocked by an ad-blocker). |
| `Invalid payment signature` in real use | `RAZORPAY_KEY_SECRET` doesn't match the Key ID's account/mode, or you mixed live/test keys. |
| Port in use | Change `PORT` (backend) and `VITE_API_URL`, or stop the other process. |
| Cookie missing in production | Serve both over HTTPS, `NODE_ENV=production`, correct `FRONTEND_URL`. |
