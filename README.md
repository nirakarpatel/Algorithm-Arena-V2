Website:- https://algorithm-arena.one

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
