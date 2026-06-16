# Algorithm Arena V2

MERN Stack for Algorithm-Arena

# PROJECT_OVERVIEW.md

## Executive Summary
Algorithm-Arena-V2 is a MERN-based internal platform for **GDGoC ITER** to run and manage its **DSA event/series workflow** in a more structured way. The product is intended to help **members and leads** operate a cleaner submission-review process for coding challenges, while keeping the participant experience simple and trackable.

The current implementation supports a workflow where **DSA event participants** can register, join a clan, browse algorithmic challenges, submit solutions, and track review outcomes. The broader business goal is to evolve this into a **GDG ITER workplace for DSA series and future initiatives**, while keeping the current release focused on challenge management, manual review, permissions, and operational control.

## Business Logic
The platform is designed around a **challenge -> submission -> review -> scoring** lifecycle.

- Participants sign up, authenticate, and join a clan before entering the main coding workflow.
- Participants browse published challenges and submit either pasted code or a repository URL.
- Each submission is stored with a review status: `Pending`, `Accepted`, or `Rejected`.
- Reviews are currently **manual**, not auto-judged.
- Clan-based ownership is built into the workflow:
  - members belong to a clan,
  - clan chiefs review submissions from their own clan,
  - leads/mods/global reviewers can review across clans.
- Accepted submissions contribute to participant stats and leaderboard ranking.
- Admin/control-plane users can manage clans, roles, permissions, challenges, settings, review queues, and audit history from the UI.

## High-Level Architecture
The codebase is implemented as a **single React SPA + Express API + MongoDB** system.

### Frontend
- React 19 SPA bootstrapped with Vite.
- Route-driven UX with protected routes for authenticated users and separate gates for clan-required flows and admin/control-plane access.
- Main participant views:
  - Home
  - Login / Register
  - Bootstrap Admin Setup
  - Clan Selection
  - Dashboard
  - Challenge Details
  - Submission Details
  - Leaderboard
  - Profile
- Admin UI is organized into guided workspaces instead of one monolithic page:
  - Overview
  - People
  - Clans
  - Reviews
  - Challenges
  - Roles & Permissions
  - Platform Settings
  - Audit & History

### Backend
- Express application with middleware for:
  - auth
  - request context
  - validation
  - cookies
  - CORS
  - rate limiting
  - logging
  - secure headers
- REST APIs are grouped by business area:
  - `/api/auth`
  - `/api/challenges`
  - `/api/submissions`
  - `/api/dashboard`
  - `/api/profile`
  - `/api/clans`
  - `/api/admin/*`
- The server also serves the built frontend in production.

### Domain Structure
The backend is partially modularized into domain services:
- `access-control`: role templates, permission registry, effective access resolution
- `platform-settings`: typed live settings and restore snapshots
- `bootstrap`: seeded system roles/clans and first super-admin setup

## Tech Stack
### Frontend
- React 19
- React Router
- TanStack React Query
- Axios
- Tailwind CSS
- Framer Motion
- React Hot Toast
- React Icons

### Backend
- Node.js
- Express 5
- MongoDB
- Mongoose
- Zod for request/env validation
- JSON Web Tokens for access auth
- Refresh-token cookie flow
- Morgan, Helmet, express-rate-limit

### Dev / Ops
- Vite for frontend build
- Nodemon for local backend development
- Node test runner + Supertest
- Dockerfile for single-service deployment

### Keepalive
- `GET /ping` is a lightweight health endpoint used for Render keepalive checks.
- The route is intentionally registered before the backend middleware stack so it returns immediately without auth, rate limiting, request logging, or request-body parsing.
- GitHub Actions keepalive automation lives at `.github/workflows/render-keepalive.yml` and pings `https://algorithm-arena-v2.onrender.com/ping` every 10 minutes with `workflow_dispatch` enabled for manual testing.

### SPA Routing
- The frontend uses `BrowserRouter`, so direct requests to routes like `/dashboard` or `/profile` require the host to return the SPA entrypoint instead of a raw 404.
- `client/public/404.html` now captures deep-link refreshes on static hosts and redirects them back into the React app.
- For a Render Static Site, also configure a rewrite rule in the Render Dashboard so client-side routes resolve to `/index.html`. Render documents static-site rewrites here: `https://render.com/docs/redirects-rewrites`.

## Core Data Model And Public Interfaces
### Primary Data Models
- `User`: identity, legacy role, clan membership, role assignments, permission overrides
- `Challenge`: title, description, difficulty, category, points
- `Submission`: challenge reference, user reference, code/repository submission, status, review metadata, clan snapshot
- `Clan`: clan code/display name/status/chief
- `Role`: editable permission bundles with global or clan scope
- `AppSetting`: live platform configuration values
- `SettingSnapshot`: restore points for settings
- `AuditLog`: operational trace of admin actions
- `RefreshToken`: session persistence and rotation

### Public API Surface
- Auth/session:
  - register, login, refresh, logout, logout-all, current user, clan selection, first super-admin bootstrap
- Participant APIs:
  - challenge list/detail
  - submit code
  - my submissions
  - leaderboard
  - dashboard summary
  - profile stats
- Admin/control APIs:
  - overview
  - user access updates
  - clan management
  - role/permission management
  - review queue and review actions
  - challenge ops
  - settings and snapshot restore
  - audit history

## Current Functional Scope
### Built Today
- Email/password authentication with refresh-token session flow
- First-run super-admin bootstrap
- Clan membership selection and gated participant flow
- Challenge browsing and details
- Solution submission via pasted code or repository URL
- Manual review workflow with reviewer notes
- Clan-scoped and global reviewer permissions
- Leaderboard, dashboard summary, and profile statistics
- Admin control plane for operational management
- Live settings with snapshot restore
- Audit logging for control-plane mutations

### Important Current Characteristics
- Review is **manual**; there is no automated code execution or sandboxed judging in the current codebase.
- Challenge management exists both in classic admin-protected routes and in the new control-plane workspace model.
- The platform is already shaped for production deployment as a single service serving both API and frontend.

## Verification And Operational Readiness
- Integration tests cover:
  - auth lifecycle
  - bootstrap flow
  - clan selection
  - challenge/submission flow
  - clan-scoped review authorization
  - settings snapshot restore
- A smoke script validates end-to-end control-plane behavior:
  - bootstrap
  - role assignment
  - clan review flow
  - settings restore
- Deployment support exists via Docker and production static serving.

## Future Scope
The following items were mentioned in product context but are **not implemented in the current codebase** and should be treated as future scope:

- Notice board
- Team dashboard
- Broader GDG ITER workplace modules beyond the current DSA-series workflow

## Assumptions / Notes
- Primary audience today is **DSA event participants**, with leads/admins acting as operational users.
- The platform currently seeds **10 clans (`0` to `9`)** and supports clan-chief / lead / mod / super-admin style access.
- The present release is best understood as a **workflow and review management platform** for coding events, not yet a full competitive programming judge or wider workplace suite.

# DSA

## V2 Enhancements & Bug Fixes

### 1. Clan Chat (Uplink) Removal
- Removed the deprecated Clan Chat ("Uplink") feature from both client and server to declutter the codebase.
- Cleaned up related tabs in `Clans.jsx` and removed socket events `join_clan`/`leave_clan` in `socket.js`.

### 2. Question Set Visibility & Multi-Set Display
- Updated `Dashboard.jsx` to render all currently active question sets instead of just the first one.
- Gated Missions page title and filter header to display active Question Set metadata when `setId` is active.
- Prevented mock/placeholder challenges from displaying on the Missions page when a specific `setId` query filter is active, rendering a clean empty state instead.

### 3. Database Auto-Wipe Protection
- Added a safety check in `seed.js` to query the `User` collection. If users exist in the database, the automated seeding process is skipped.
- This prevents the local development server (running nodemon) from wiping and re-seeding the shared MongoDB Atlas database upon every source code save or restart.
- Standard manual seeding (`npm run seed`) still clears and re-seeds the database as intended.

### 4. Submission & Profile Endpoint Fixes
- Resolved `404 (Not Found)` error on `/api/submissions/user/:username` by implementing `getSubmissionsByUsername` query matching on the backend.
- Fixed `400 (Bad Request)` error on the Missions page by updating the client query to `/api/submissions/my-submissions` and adding a `/my` alias on the backend.

### 5. Client Lint & Profile Saving Fixes
- Fixed client build and ESLint warnings in `button.jsx` (Fast Refresh component-only exports) and `QuestionSetsTab.jsx` (empty catch statement).
- Resolved profile card updating failures by correcting backend validator `updateMeSchema` (added string support for study years, allowed username-only social handles instead of raw URLs, and increased profile picture limit to 4MB to support base64 image data URIs).
- Synced client-side `formData` in `Settings.jsx` to upload changed avatars/presets to the backend on clicking "Save Changes".

### 6. WebSocket Connection URL Fix
- Updated the client-side socket initialization in `useSocket.js` to check `VITE_API_BASE_URL` if `VITE_API_URL` is not provided.
- This ensures that when built and hosted on a static provider (like Vercel at `www.algorithm-arena.one`), the socket connection correctly targets the Render backend host (`algorithm-arena-v2.onrender.com`) instead of attempting to connect to the frontend domain itself.

### 7. Mock Data Fallbacks Removed
- Removed fallback logic that injected mock challenges and mock members when backend requests returned empty results or failed.
- The website now cleanly renders standard empty state pages instead of displaying local mock data.
- Cleared all unused mock imports to maintain a 100% clean linter and production build.

### 8. Firebase Google Authentication & Admin Restriction
- Migrated authentication from password login to Firebase Google Sign-In with backend verification of Google `idToken`.
- Automatically links existing local email accounts to Google login upon first sign-in.
- Restricts the Admin Panel (`admin-client`) access strictly to users with `admin` and `superAdmin` roles.
- Prevents `admin` and `superAdmin` users from logging in or registering on the participant website.
- Removed the inline dropdown role-promotion buttons from the members table; elevation to the Admin role is strictly pre-authorized via Gmail address addition.

### 9. Hardened Onboarding Security & Audit Log
- Added a sparse unique index on `regNo` in MongoDB to enforce strict registration number uniqueness.
- Differentiated backend conflict error responses to return specific `"Registration number is already registered"` errors instead of unified `"Username or registration number is already taken"` messages, preventing frontend UI lockouts.
- Upgraded the username availability check to decode JWT headers and exclude the authenticated user themselves from lookup, allowing migrated users to claim their own existing codename.
- Enforced a 5-minute Google re-authentication window for sensitive administrator actions (such as role modifications).
- Created an immutable `AuditLog` collection to store and track admin operations (warnings, bans, role updates, and pre-authorizations) with strict database pre-hooks preventing modifications or deletions.

## Production Environment Variables Guide

### Backend Server (Render)
Pasted into **Render Web Service** Environment configuration:
```env
NODE_ENV=production
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mdgjeuk.mongodb.net/test?appName=Cluster0
JWT_SECRET=<your-secure-jwt-secret-key>
BOOTSTRAP_ADMIN_KEY=<your-secure-bootstrap-key>
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL_DAYS=14
REFRESH_COOKIE_SAMESITE=none
COOKIE_SECURE=true
SUPER_ADMIN_EMAIL=<your-super-admin-email@gmail.com>
CORS_ORIGINS=http://localhost:3000,http://localhost:3001,https://your-participant-site.vercel.app,https://your-admin-site.vercel.app
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"your-firebase-project", ... }
```

### Participant Client & Admin Client (Vercel)
Pasted into **Vercel Project Settings** under Environment Variables:
```env
VITE_FIREBASE_API_KEY=<your-firebase-api-key>
VITE_FIREBASE_AUTH_DOMAIN=<your-firebase-project-id>.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=<your-firebase-project-id>
VITE_FIREBASE_STORAGE_BUCKET=<your-firebase-project-id>.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=<your-firebase-messaging-sender-id>
VITE_FIREBASE_APP_ID=<your-firebase-app-id>
VITE_API_BASE_URL=https://your-backend-app.onrender.com
```
