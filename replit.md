# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## TraclyTag Admin Panel

Role-based serial-tracking admin for FMCG / pharma. Three roles: `master`, `client_admin`, `operator`.

**Demo accounts** (created by `pnpm --filter @workspace/api-server exec tsx src/seed.ts`):
- `master` / `master123`
- `demo_admin` / `admin123`
- `demo_op` / `op123`

**Modules**: Companies, Users, Products (with GS1 GTIN, L1/L2/Shipper hierarchy), Locations, Batches, Code Generation (unit/l1/l2/shipper/pallet, GS1 DataMatrix raw strings with FNC1=ASCII 232, SSCC for shipper/pallet), Stock Report, Product Report, Shipper/Pallet Summary, Marked-By log, Dashboard.

**Backend mounts** routes at `/api`, e.g. `POST /api/auth/login`. Session cookies via `express-session`. Frontend uses generated React Query hooks from `@workspace/api-client-react`.

**Reports**: `/api/reports/{stock,product,shipper-summary,pallet-summary}` accept optional `from`/`to` (YYYY-MM-DD) query params filtering on `codes.created_at`. All four pages have CSV export. Stock also has product filter.

**GS1**: Unit/L1/L2 raw string `01<14gtin>17<YYMMDD>10<batch><FNC1>21<serial>` (FNC1 = ASCII 232). Shipper/Pallet use SSCC `00 + 18 digits` (extension digit + 7-digit company prefix + 9 cryptographically random digits + Mod-10 check digit) — uniqueness preserved by avoiding hex-to-zero collapse.

**Companies**: GSTIN is optional per spec.

**Codegen note**: `pnpm --filter @workspace/api-spec run codegen` overwrites `lib/api-zod/src/index.ts` to a single `export * from "./generated/api"` line; the `generated/types/` barrel is intentionally not re-exported to avoid value/type name collisions with the zod body schemas.

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
