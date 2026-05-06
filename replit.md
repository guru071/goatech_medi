# MediBook Pro

India's full-stack clinic/hospital booking platform — patients find and book verified clinics, clinic owners manage appointments and revenue, admins oversee the platform.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — API server (port 8080, path `/api`)
- `pnpm --filter @workspace/medibook-pro run dev` — React+Vite frontend
- `pnpm --filter @workspace/scripts run seed` — seed DB with demo data
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL`, `SESSION_SECRET`
- Optional env: `VITE_FIREBASE_*` (Google login), `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` (payments)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Wouter + TanStack Query + Tailwind + shadcn/ui + Three.js + Recharts + socket.io-client
- API: Express 5 + Socket.io (real-time chat)
- DB: PostgreSQL + Drizzle ORM (`lib/db`)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- Auth: JWT + bcryptjs + Firebase Google Login
- Payments: Razorpay (falls back to demo mode if no keys)
- API codegen: Orval (from `lib/api-spec`)

## Where things live

- `artifacts/api-server/src/routes/` — all backend routes (auth, clinics, doctors, appointments, reviews, subscriptions, payments, chats, admin, analytics)
- `artifacts/api-server/src/index.ts` — Express + Socket.io server setup (port from `$PORT` || 8080)
- `artifacts/medibook-pro/src/App.tsx` — all frontend routes (public, clinic owner, admin)
- `artifacts/medibook-pro/src/pages/` — all page components
- `artifacts/medibook-pro/src/components/` — Layout, ClinicCard, StarRating
- `artifacts/medibook-pro/src/contexts/AuthContext.tsx` — JWT auth context
- `artifacts/medibook-pro/src/lib/firebase.ts` — Firebase config (graceful fallback if no keys)
- `lib/db/src/schema/` — Drizzle table definitions (source of truth)
- `lib/api-spec/` — OpenAPI spec (source of truth for API contract)
- `lib/api-client-react/src/generated/api.ts` — generated React Query hooks

## Architecture decisions

- Contract-first API: OpenAPI spec → Orval codegen → typed React Query hooks used throughout the frontend
- JWT stored in localStorage; `AuthContext` decodes token and persists user state
- Socket.io path `/api/socket.io` shares the same Express HTTP server; rooms are per chat room ID
- Razorpay falls back to demo mode when `RAZORPAY_KEY_ID` is not set — payment flow is exercised without real money
- Firebase auth is optional: `firebase.ts` exports mock auth objects if `VITE_FIREBASE_API_KEY` is absent, so the app works with email/password only
- Clinic status must be `approved` to appear in patient search; admin approves/rejects from admin panel

## Product

- **Patient**: Search clinics by specialty/city/subscription tier, AI symptom suggestion, book appointments with token system, track appointments, real-time chat with clinic, download receipts, view 3D dental model
- **Clinic Owner**: Register clinic (multi-step wizard), manage doctors, view live token queue, track revenue with charts, chat with patients
- **Admin**: Approve/reject clinics, manage users, view platform revenue, handle complaints, booking analytics

## User preferences

- Deep teal (#0d9488) + navy theme using CSS variables
- All pages use the shared `Layout` component with role-aware navigation
- Demo credentials: admin@medibook.pro / owner@medibook.pro / patient@medibook.pro (all: password123)

## Gotchas

- Clinic `clinicId` on clinic owner user is hardcoded fallback `|| 1` — needs proper auth wiring from JWT claim in production
- Always run `pnpm --filter @workspace/db run push` before `seed` if schema has changed
- `pnpm --filter @workspace/api-spec run codegen` must be re-run after any OpenAPI spec changes
- Do NOT run `pnpm dev` at workspace root — use workflow restart instead

## Pointers

- See `pnpm-workspace` skill for workspace structure details
- See `lib/api-spec/` for OpenAPI contract
- See `.local/skills/pnpm-workspace/references/` for server, DB, and OpenAPI reference guides
