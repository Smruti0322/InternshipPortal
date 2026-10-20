# Internship Portal

Full-stack internship application portal with React/Vite, an Express API, MySQL, Razorpay, email OTP flows, resume tools, subscriptions, and community features.

## Requirements

- Node.js and npm compatible with the versions in the lockfiles.
- MySQL Community Server 8.0.16 or later (InnoDB and enforced CHECK constraints).
- SMTP credentials for email verification and recovery.
- Razorpay test credentials for payment-flow testing.

## Local setup

1. Install dependencies with `npm ci` in `backend/` and `frontend/`.
2. Copy `backend/.env.example` to `backend/.env` and configure the database, JWT, SMTP, Razorpay, CORS, and proxy settings. Never commit `.env` files.
3. Copy `frontend/.env.example` to `frontend/.env` if the API is not at the Vite development default. Set `VITE_API_URL` to the API origin without a trailing slash.
4. For a new, empty development database, run `mysql -u <dev-user> -p < backend/database/initial_schema.sql`. It creates only `internship_portal_dev` and seeds the four required subscription plans. Set `DB_NAME=internship_portal_dev` in `backend/.env`; configure a local MySQL account with access to this development database. The script has no DROP statements and fails on pre-existing tables, so it will not replace data. Do not point it at a production or existing database. Existing installations need an inspected, additive migration tailored to their schema. The two historical migrations are not needed for a fresh database because the initial schema already includes those fields and tables.
5. Start the API with `npm start` from `backend/` and the frontend with `npm run dev` from `frontend/`.

## Environment variables

The backend variable names are listed in `backend/.env.example`: `PORT`, `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `CORS_ORIGINS`, and `TRUST_PROXY_HOPS`. The frontend uses `VITE_API_URL` from `frontend/.env.example`. This documentation lists names only; never place secret values in source control.

Use a long random JWT secret. Configure SMTP and Razorpay credentials through local environment files or the hosting provider's secret store. Use Razorpay test mode in development; no real payments are part of the automated checks. The database connection is created from environment variables and the app does not initialize the schema automatically.

## Checks

Run from the repository root:

```sh
cd backend && npm test
node check-translations.js
cd ../frontend && npm run build
npm run lint
```

The backend Node test suite includes a static schema contract check. To verify an initialized disposable development database, run `mysql -u <dev-user> -p internship_portal_dev < backend/database/verify_schema.sql`; the script checks required tables, columns, foreign keys, and plan rows without writing data. A live server is required for this command. Date/time columns use `DATETIME`; the application mixes `NOW()`, `UTC_TIMESTAMP()`, and `CURDATE()`, so set the MySQL server/session timezone to UTC and interpret listing deadline dates consistently. Payment creation and capture, OTP state changes, resume version/download writes, and subscription activation use explicit transactions in the application; retain InnoDB. The translation checker reports key gaps without modifying files. The frontend build and ESLint commands run from `frontend/`.

## Deployment

- **Current status: NOT READY.** There is no hosting configuration, public API/database, persistent upload storage setup, or verified production build configuration. Live MySQL integration and provider checks remain outstanding.
- Create a MySQL 8.0.16+ database on a private, supported host. Review the existing database schema and prepare additive migrations; never use `initial_schema.sql` for an existing database. Set backend environment-variable names from `backend/.env.example` in the API host's secret settings.
- Deploy `backend/` as a Node service with `npm ci` and `npm start`; configure `PORT`, database access, `JWT_SECRET`, SMTP, Razorpay, exact `CORS_ORIGINS`, and the actual `TRUST_PROXY_HOPS` value. Configure persistent/object storage for community media before using an ephemeral application host; uploads currently use local disk.
- In Vercel, set the project Root Directory to `frontend`, framework to Vite, Build Command to `npm run build`, and Output Directory to `dist`. Set `VITE_API_URL` to the deployed API origin at build time. Configure SPA fallback to `index.html` if needed; this repository does not include `vercel.json` or another hosting manifest.
- Set backend `CORS_ORIGINS` to the exact deployed frontend origin. If using one origin and a reverse proxy, route `/api/*` and `/uploads/community/*` to the API and configure `TRUST_PROXY_HOPS` for the real proxy chain.
- Before public use, verify database setup and query compatibility, SMTP using a controlled test inbox, Razorpay test-mode checkout, payment and invoice flows, session revocation, CORS, upload persistence, and hosting health/restart behavior. Do not switch to real payments before those checks pass.

## Manual release checks

1. Register and sign in; verify the Chrome/new-device OTP flow, login history, active sessions, session revocation, and mobile login window using controlled test accounts and device emulation.
2. Switch through English, Spanish, Hindi, Portuguese, and Chinese. Request French and confirm the interface changes only after successful email OTP verification; check reload persistence.
3. Create, edit, view, and save a resume. Request its download OTP, verify it, complete a Razorpay test payment, and confirm a failed or fabricated callback cannot unlock the PDF.
4. Exercise forgot-password OTP expiry, invalid attempts, forced password change, and the once-per-day limit. Email recovery is implemented; mobile recovery requires an SMS provider and is unavailable.
5. Exercise community friend tiers at 0, 1, 2, 5, 6, 10, and 11 friends, including concurrent post requests, and check feed privacy, comments, notifications, and uploads.
6. Check internship applications against Free/Bronze/Silver/Gold quotas and billing-cycle boundaries. Use Razorpay test mode to confirm a plan is activated only after verified capture; check that order initiation is allowed from 5:00 AM through 11:45 PM IST. Confirm cancellation immediately ends paid access.
7. Check each primary route at mobile, tablet, and desktop widths; inspect browser console and network responses for failures.

## Demo video checklist and script (2–5 minutes)

- Record a 2–5 minute MP4, WebM, or MOV file under 100 MB. Use test accounts and test payment mode; do not show credentials, private user data, or real payment details.
- 0:00–0:25: introduce the portal and internship search.
- 0:25–1:00: show language switching and French OTP verification with a test inbox.
- 1:00–1:40: create or edit a resume and show the OTP-gated premium download/payment sequence in test mode.
- 1:40–2:20: show internship application quota and subscription plan descriptions.
- 2:20–3:00: show community interactions and login/session history.
- End with the deployment URL only after a public deployment has been verified.

## Known limitations to resolve before submission

- Live MySQL schema integration has not been exercised in this environment; run the disposable development setup and verification before relying on it.
- Backend development-only audit reports `braces` through Nodemon 3.1.14 → Chokidar 3.6.0 → `braces` 3.0.3. The registry offers no patched braces 3.x release, and forcing Chokidar 4 violates Nodemon's declared `^3.5.2` dependency range. npm's proposed fix downgrades Nodemon to 1.14.10, which is incompatible with the stated constraint. Keep Nodemon restricted to local development and do not watch attacker-controlled paths; revisit when an in-range upstream fix is published.
- Email delivery and Razorpay require external credentials and were not exercised against live services.
- Mobile password recovery is unavailable until an SMS provider is integrated.
- No public deployment or demo video is included or verified here.
- Subscription cancellation currently ends paid access immediately; confirm this behavior matches the original assignment's expected policy if it becomes available.
